import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultOpenGraphImage, jsonLd, organizationJsonLd, siteConfig, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: "%s | syntaxError.cl" },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [defaultOpenGraphImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-accent="platform" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd()) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
