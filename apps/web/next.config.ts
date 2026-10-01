import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs/config";
import { construirCsp } from "./src/lib/csp";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Solo en desarrollo: Next mantiene compiladas 5 páginas y descarta las inactivas al minuto. Con las pruebas
  // e2e en paralelo eso recompila sin parar y cada recompilación recarga páginas abiertas de otras pruebas.
  onDemandEntries: { maxInactiveAge: 60 * 60 * 1000, pagesBufferLength: 100 },
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines", "@syntaxerror/content", "@syntaxerror/queue", "@syntaxerror/ia"],
  // BullMQ lee sus scripts Lua desde disco con rutas relativas: no se puede empaquetar con webpack.
  serverExternalPackages: ["bullmq"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      alasql: path.join(process.cwd(), "../../packages/engines/node_modules/alasql/dist/alasql.min.js"),
      ...(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ? {} : { "@sentry/nextjs$": path.join(process.cwd(), "src/lib/sentry-apagado.ts") }),
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

// Con DSN, los errores del navegador viajan por /monitoring (mismo dominio): la CSP sigue con
// connect-src 'self'. Sin SENTRY_AUTH_TOKEN no se suben sourcemaps y el build no falla. Sin DSN
// (local y tests) no se aplica el plugin: en desarrollo inflaba la compilación hasta agotar la memoria.
const opcionesSentry = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ? withSentryConfig(nextConfig, opcionesSentry) : nextConfig;
