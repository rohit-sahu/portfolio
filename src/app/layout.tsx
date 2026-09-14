import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { siteUrl } from "@/data/resume";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rohit Kumar | Lead Software Engineer",
    template: "%s | Rohit Kumar",
  },
  description:
    "Portfolio of Rohit Kumar, a Lead Software Engineer with 9+ years of experience in Java, Spring Boot, React.js, microservices, and cloud-native architecture.",
  keywords: [
    "Rohit Kumar",
    "Lead Software Engineer",
    "Java Developer",
    "Spring Boot",
    "React.js",
    "Portfolio",
  ],
  authors: [{ name: "Rohit Kumar" }],
  creator: "Rohit Kumar",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Rohit Kumar | Lead Software Engineer",
    description:
      "9+ years architecting secure, high-throughput enterprise systems with Java, Spring Boot & React.",
    url: siteUrl,
    siteName: "Rohit Kumar Portfolio",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rohit Kumar | Lead Software Engineer",
    description:
      "9+ years architecting secure, high-throughput enterprise systems with Java, Spring Boot & React.",
  },
};

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("portfolio-color-theme") || "aurora";
    var mode = localStorage.getItem("portfolio-mode") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="aurora"
      data-mode="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

