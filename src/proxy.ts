import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getClientIp } from "@/lib/client-ip";
import { isIpAllowed, parseIpAllowlist } from "@/lib/ip-allowlist";

// Built from the edge-safe config directly (not @/auth), so the Node-only
// Credentials provider (bcrypt + fs) never gets bundled into this proxy.
const { auth } = NextAuth(authConfig);

// Read once at module init (edge runtime reuses the module across requests
// within an isolate). Empty/unset ADMIN_IP_ALLOWLIST disables the check
// entirely — opt-in, so existing deployments are unaffected until set.
const ipAllowlist = parseIpAllowlist(process.env.ADMIN_IP_ALLOWLIST);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Gate every /admin/* request (including the login page itself) on the IP
  // allowlist first, before Auth.js/session logic runs — relies on the
  // reverse proxy in front of this app (see docker-compose.yml, which binds
  // to 127.0.0.1 only) to set X-Forwarded-For/X-Real-IP honestly. If this
  // app is ever exposed directly to the internet without such a proxy, this
  // check provides no protection (the header is attacker-controlled).
  if (ipAllowlist.length > 0) {
    const ip = getClientIp(req.headers);
    if (!ip || !isIpAllowed(ip, ipAllowlist)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

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
