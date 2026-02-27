import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string; // String because we convert BigInt to string
            hasCompletedOnboarding?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string; // String in session
        email: string;
        name?: string | null;
        image?: string | null;
        password?: string | null;
        hasCompletedOnboarding?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        hasCompletedOnboarding?: boolean;
    }
}