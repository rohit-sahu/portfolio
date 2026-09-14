import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the Auth.js config: no providers (Credentials + bcrypt
// + fs live only in auth.ts, which is never imported by proxy.ts). Keeping
// this split is what stops Node-only code from getting bundled into the
// edge-runtime proxy — see proxy.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
};
