import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { loadAdminUsers } from "@/lib/admin-users";
import { authConfig } from "@/auth.config";

// Valid bcrypt hash of an arbitrary value, never a real credential — used so
// bcrypt.compare always runs (even for an unknown email), keeping lookup
// time roughly constant instead of leaking which emails exist.
const DUMMY_HASH = "$2b$10$6RsZIH4Bivlsji2DmOXleuXvgG4boAFdvwWFBAR.i5pkffcNRRYpO";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const users = await loadAdminUsers();
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordMatches) return null;

        return { id: user.email, email: user.email, name: user.email };
      },
    }),
  ],
});
