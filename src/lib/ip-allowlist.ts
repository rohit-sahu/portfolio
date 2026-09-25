// Edge-safe (no Node builtins, pure BigInt/string math) IP allowlist matcher
// for ADMIN_IP_ALLOWLIST — a comma-separated list of exact IPs and/or CIDR
// ranges (IPv4 and IPv6), e.g. "203.0.113.10,198.51.100.0/24,2001:db8::/32".
// Used by src/proxy.ts to gate every /admin/* request at the edge, before
// Auth.js even runs.

type ParsedIp = { value: bigint; bits: 32 | 128 };

function parseIPv4(ip: string): ParsedIp | null {
  const octets = ip.split(".");
  if (octets.length !== 4) return null;

  let value = BigInt(0);
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const n = Number(octet);
    if (n < 0 || n > 255) return null;
    value = (value << BigInt(8)) | BigInt(n);
  }
  return { value, bits: 32 };
}

// Expands standard (optionally "::"-compressed) IPv6 notation into a 128-bit
// integer. Does not support embedded IPv4 tails (e.g. "::ffff:1.2.3.4") —
// not needed for an admin allowlist; such entries are simply ignored.
function parseIPv6(ip: string): ParsedIp | null {
  if (!ip.includes(":")) return null;

  const doubleColonParts = ip.split("::");
  if (doubleColonParts.length > 2) return null; // "::" may appear at most once

  const parseGroups = (part: string): string[] => (part.length === 0 ? [] : part.split(":"));

  let head: string[];
  let tail: string[];
  if (doubleColonParts.length === 2) {
    head = parseGroups(doubleColonParts[0]);
    tail = parseGroups(doubleColonParts[1]);
  } else {
    head = parseGroups(doubleColonParts[0]);
    tail = [];
  }

  const missing = 8 - (head.length + tail.length);
  if (doubleColonParts.length === 2) {
    if (missing < 0) return null;
  } else if (missing !== 0) {
    return null; // no "::" present, so all 8 groups must be given
  }

  const groups = [...head, ...Array(Math.max(missing, 0)).fill("0"), ...tail];
  if (groups.length !== 8) return null;

  let value = BigInt(0);
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << BigInt(16)) | BigInt(parseInt(group, 16));
  }
  return { value, bits: 128 };
}

function parseIp(ip: string): ParsedIp | null {
  return parseIPv4(ip) ?? parseIPv6(ip);
}

// Splits "ADMIN_IP_ALLOWLIST" env value into a clean list of entries. An
// empty/unset value means "allowlist disabled" (no restriction) — callers
// must check for an empty array themselves rather than treat it as "deny all".
export function parseIpAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function matchesEntry(ip: ParsedIp, entry: string): boolean {
  const slashIndex = entry.indexOf("/");
  if (slashIndex === -1) {
    const entryIp = parseIp(entry);
    return !!entryIp && entryIp.bits === ip.bits && entryIp.value === ip.value;
  }

  const base = parseIp(entry.slice(0, slashIndex));
  const prefixLenStr = entry.slice(slashIndex + 1);
  if (!base || !/^\d{1,3}$/.test(prefixLenStr)) return false;

  const prefixLen = Number(prefixLenStr);
  if (prefixLen < 0 || prefixLen > base.bits || base.bits !== ip.bits) return false;

  if (prefixLen === 0) return true; // 0.0.0.0/0 or ::/0 — matches everything of that family

  const shift = BigInt(base.bits - prefixLen);
  return (ip.value >> shift) === (base.value >> shift);
}

// Returns true if `ip` matches any entry in `allowlist`. An empty allowlist
// means the feature is disabled — callers should only invoke this after
// confirming allowlist.length > 0.
export function isIpAllowed(ip: string, allowlist: string[]): boolean {
  const parsed = parseIp(ip);
  if (!parsed) return false; // unparseable client IP — fail closed
  return allowlist.some((entry) => matchesEntry(parsed, entry));
}
