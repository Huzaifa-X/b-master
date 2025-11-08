import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string; // String because we convert BigInt to string
        } & DefaultSession["user"];
    }

    interface User {
        id: string; // String in session
        email: string;
        name?: string | null;
        image?: string | null;
        password?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
    }
}