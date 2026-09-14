import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rohit Kumar — Lead Software Engineer",
    short_name: "Rohit Kumar",
    description:
      "Portfolio of Rohit Kumar, a Lead Software Engineer specializing in Java, Spring Boot, React.js, and cloud-native architecture.",
    start_url: "/",
    display: "standalone",
    background_color: "#030014",
    theme_color: "#030014",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
