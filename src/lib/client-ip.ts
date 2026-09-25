// Edge-safe (no Node builtins) — used by both the edge middleware
// (src/proxy.ts) for IP-allowlisting and the Node runtime (src/auth.ts) for
// rate-limiting. Never trust these headers unless a reverse proxy you
// control (Caddy/nginx/Cloudflare) is guaranteed to be the only path to this
// server — see docker-compose.yml, which binds the app to 127.0.0.1 so it's
// never reachable except through that proxy.
export function getClientIp(headers: Headers): string | null {
  // Cloudflare (both proxied DNS and Tunnel/cloudflared) sets this at its
  // edge and strips/overwrites any client-supplied value — unlike
  // X-Forwarded-For, it can't be appended-to/spoofed by the client, so it's
  // preferred whenever present. This matters in particular for a Cloudflare
  // Tunnel deployment where cloudflared forwards straight to the app
  // container, bypassing nginx (and thus nginx's own X-Forwarded-For
  // handling) entirely.
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Left-most entry is the original client; further entries are
    // proxies/load balancers the request passed through. Only trust this
    // when the immediate reverse proxy overwrites (not appends to) any
    // client-supplied value — see the nginx config this app is deployed
    // behind (X-Forwarded-For set to $remote_addr, not
    // $proxy_add_x_forwarded_for).
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}
