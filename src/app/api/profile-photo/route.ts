import { NextResponse } from "next/server";
import { readCachedPhoto } from "@/lib/photo-cache";

export async function GET() {
  const cached = await readCachedPhoto();
  if (!cached) {
    return NextResponse.json({ error: "No cached photo" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(cached.bytes), {
    headers: {
      "Content-Type": cached.contentType,
      // Query string (see Hero.tsx) changes whenever the source URL does,
      // so this can be cached aggressively without ever serving stale bytes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
