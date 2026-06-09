import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Augment Auth.js types with our custom session fields (active org + role).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string | null;
      role: Role | null;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId?: string | null;
    role?: Role | null;
  }
}

// JWT is declared in @auth/core/jwt and only re-exported by next-auth/jwt, so the
// augmentation must target the source module to merge with the original interface.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    organizationId: string | null;
    role: Role | null;
  }
}
