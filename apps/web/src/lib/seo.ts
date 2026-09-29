export const siteConfig = {
  name: "syntaxError.cl",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://syntaxerror.cl").replace(
    /\/$/,
    ""
  ),
  title: "syntaxError.cl | Aprende practicando y consigue tu primer trabajo en tecnología",
  description:
    "Academia gratuita: resuelve casos de trabajo reales en tu navegador, arma tu portafolio y prepárate para tu primer empleo en datos, ciberseguridad, desarrollo o cloud.",
  image: {
    path: "/images/data-learning-hero.png",
    width: 2858,
    height: 1396,
    alt: "Vista de la plataforma syntaxError.cl con cursos y ejercicios interactivos",
  },
};

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const defaultOpenGraphImage = {
  url: siteConfig.image.path,
  width: siteConfig.image.width,
  height: siteConfig.image.height,
  alt: siteConfig.image.alt,
};

export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.image.path),
    sameAs: ["https://www.linkedin.com/in/cristian-venegas-595844a2/"],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "es-CL",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function courseJsonLd(course: {
  title: string;
  description: string;
  slug: string;
  level: string;
  lessonSlugs: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: absoluteUrl(`/cursos/${course.slug}`),
    inLanguage: "es-CL",
    educationalLevel: course.level,
    numberOfCredits: course.lessonSlugs.length,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      sameAs: siteConfig.url,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CLP",
      availability: "https://schema.org/InStock",
      category: "Free",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `P${Math.max(course.lessonSlugs.length, 1)}D`,
    },
  };
}

export function itemListJsonLd(
  name: string,
  items: Array<{ name: string; path: string; description?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(item.path),
      name: item.name,
      description: item.description,
    })),
  };
}
