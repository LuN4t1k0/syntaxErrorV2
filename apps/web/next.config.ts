import type { NextConfig } from "next";
import path from "node:path";
import { construirCsp } from "./src/lib/csp";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines", "@syntaxerror/content", "@syntaxerror/queue"],
  // BullMQ lee sus scripts Lua desde disco con rutas relativas: no se puede empaquetar con webpack.
  serverExternalPackages: ["bullmq"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      alasql: path.join(process.cwd(), "../../packages/engines/node_modules/alasql/dist/alasql.min.js"),
    };
    return config;
  },
  async headers() {
    const reglas = [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
    if (process.env.NODE_ENV === "production") {
      const socket = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";
      reglas.push(
        {
          source: "/((?!_next/|casos/[^/]+/[^/]+).*)",
          headers: [{ key: "Content-Security-Policy", value: construirCsp({ motores: false, socket }) }],
        },
        {
          source: "/casos/:caso/:mision",
          headers: [{ key: "Content-Security-Policy", value: construirCsp({ motores: true, socket }) }],
        }
      );
    }
    return reglas;
  },
};

export default nextConfig;
