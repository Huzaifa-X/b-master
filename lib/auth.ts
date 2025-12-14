import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google"; // COMMENTED OUT - Google provider disabled
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import { checkAndSendWelcomeNotification } from "@/app/actions/notification.action";

export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter is NOT compatible with CredentialsProvider
  // We'll manage sessions manually for credentials-based auth
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        // Check if user has a password (for credentials login)
        if (!user.password) {
          throw new Error("Please sign in with your social account");
        }

        // ✅ CHECK IF EMAIL IS VERIFIED
        if (!user.isEmailVerified) {
          throw new Error("Email not verified. Please verify your email first.");
        }

        // Verify password
        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Return user object
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }), // COMMENTED OUT - Google provider disabled
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign in, add user info to token and create DB session
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;

        // Create a session record in database for tracking
        try {
          const sessionToken = randomBytes(32).toString("hex");
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          await prisma.session.create({
            data: {
              sessionToken,
              userId: BigInt(user.id),
              expires,
            },
          });

          // Store session token in JWT for later reference
          token.sessionToken = sessionToken;

          // Check and send welcome notification for first-time users
          // Run this asynchronously to not block login
          checkAndSendWelcomeNotification(user.id).catch((error) => {
            console.error("Failed to send welcome notification:", error);
          });
        } catch (error) {
          console.error("Failed to create session record:", error);
        }
      }

      // Handle session updates (e.g., profile updates)
      if (trigger === "update" && session) {
        token.name = session.user?.name || token.name;
        token.email = session.user?.email || token.email;
        token.picture = session.user?.image || token.picture;
      }

      return token;
    },
    async session({ session, token }) {
      // Add user info from token to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      // Clean up database session on sign out
      if (token && token.sessionToken) {
        try {
          await prisma.session.delete({
            where: { sessionToken: token.sessionToken as string },
          }).catch(() => {
            // Session might already be deleted, ignore error
          });
        } catch (error) {
          console.error("Failed to delete session record:", error);
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};