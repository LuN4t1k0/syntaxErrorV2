import type { NextConfig } from "next";

const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";
const socketOrigins = socketUrl
  ? [socketUrl, socketUrl.replace(/^http/, "ws")].join(" ")
  : "";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Content-Security-Policy",
        value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${socketOrigins}; frame-ancestors 'none'`,
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
