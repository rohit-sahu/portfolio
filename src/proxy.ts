import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Built from the edge-safe config directly (not @/auth), so the Node-only
// Credentials provider (bcrypt + fs) never gets bundled into this proxy.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") {
    if (isLoggedIn) {
      return Response.redirect(new URL("/admin", req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.nextUrl);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
