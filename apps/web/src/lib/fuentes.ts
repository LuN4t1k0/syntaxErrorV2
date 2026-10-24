import { Geist, JetBrains_Mono } from "next/font/google";

// Tipografías de la identidad Obsidian Syntax (Stitch): la portada y el panel las comparten.
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const clasesFuentes = `${geist.variable} ${jetbrains.variable}`;
