import type { MetadataRoute } from "next";
import { reglasRobots } from "@/lib/seo-rutas";

export default function robots(): MetadataRoute.Robots {
  return reglasRobots();
}
