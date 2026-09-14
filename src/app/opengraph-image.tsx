import { ImageResponse } from "next/og";
import { defaultResumeData, siteHost } from "@/data/resume";
import { getResumeData } from "@/lib/resume-data";

export const alt = `${defaultResumeData.profile.name} — ${defaultResumeData.profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { profile } = await getResumeData();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#030014",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(217,70,239,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(34,211,238,0.3), transparent 45%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: "9999px",
              fontSize: 30,
              fontWeight: 700,
              color: "#030014",
              backgroundImage: "linear-gradient(135deg, #d946ef, #22d3ee)",
            }}
          >
            RK
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#94a3b8", fontWeight: 500 }}>
            {siteHost}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.1,
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 42,
            fontWeight: 700,
            backgroundImage: "linear-gradient(90deg, #d946ef, #a855f7, #22d3ee)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {profile.role}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 26,
            color: "#cbd5e1",
            maxWidth: 900,
          }}
        >
          9+ years architecting secure, high-throughput enterprise systems with Java, Spring
          Boot &amp; React.
        </div>
      </div>
    ),
    { ...size }
  );
}
