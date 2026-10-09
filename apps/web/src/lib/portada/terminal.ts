import type { Fila } from "@syntaxerror/engines/tipos";

export const CONSULTA_INICIAL =
  "SELECT comuna, SUM(monto) AS total FROM ventas GROUP BY comuna ORDER BY total DESC;";

export const VENTAS: Fila[] = [
  { comuna: "Temuco", producto: "notebook", monto: 420000 },
  { comuna: "Ñuñoa", producto: "monitor", monto: 180000 },
  { comuna: "Valparaíso", producto: "teclado", monto: 45000 },
  { comuna: "Antofagasta", producto: "notebook", monto: 510000 },
  { comuna: "Temuco", producto: "mouse", monto: 22000 },
  { comuna: "Ñuñoa", producto: "silla", monto: 135000 },
  { comuna: "Valparaíso", producto: "monitor", monto: 175000 },
  { comuna: "Antofagasta", producto: "audífonos", monto: 64000 },
];

export type RutaTerminalPortada = {
  slug: string;
  cargo: string;
  descripcion: string;
  teaser?: string | null;
  estadoVigente: "publicada" | "beta" | "filtrada" | "borrador" | "oculta";
  leak: string;
};

export type LineaPortada = { texto: string; tipo?: "error" | "muted" | "ok" };

export type AccionTerminalPortada =
  | { tipo: "sql"; consulta: string }
  | { tipo: "lineas"; lineas: LineaPortada[] }
  | { tipo: "navegar"; href: string }
  | { tipo: "clear" }
  | { tipo: "reset"; consulta: string; lineas: LineaPortada[] };

const AYUDA = [
  "comandos: help, ls rutas, cat <ruta>, ./start, clear, reset",
  "cualquier otra entrada se ejecuta como SQL sobre la tabla ventas",
];

export function interpretarTerminalPortada(entradaCruda: string, rutas: RutaTerminalPortada[]): AccionTerminalPortada {
  const entrada = entradaCruda.trim();
  if (!entrada) return { tipo: "lineas", lineas: [] };
  const [accion, ...resto] = entrada.split(/\s+/);
  const arg = resto.join(" ").replace(/\/$/, "");

  if (accion === "help" || accion === "ayuda") return { tipo: "lineas", lineas: AYUDA.map((texto) => ({ texto })) };
  if (accion === "ls" && (arg === "" || arg === "rutas")) return { tipo: "lineas", lineas: lineasRutas(rutas) };
  if (accion === "cat" && arg) return { tipo: "lineas", lineas: fichaRuta(arg, rutas) };
  if (accion === "./start" || accion === "start" || accion === "registro") return { tipo: "navegar", href: "/registro" };
  if (accion === "clear") return { tipo: "clear" };
  if (accion === "reset") {
    return {
      tipo: "reset",
      consulta: CONSULTA_INICIAL,
      lineas: [{ texto: "# tu primer reto: ¿cuánto vendió cada comuna?", tipo: "muted" }],
    };
  }
  return { tipo: "sql", consulta: entrada };
}

export function salidaSqlExitosa(filas: Fila[], yaInvito: boolean): LineaPortada[] {
  const lineas: LineaPortada[] = [{ texto: `[ok] ${filas.length} filas · lo resolviste en tu navegador`, tipo: "ok" }];
  if (!yaInvito) lineas.push({ texto: "> ./start para guardar tu avance y seguir con el reto 2", tipo: "ok" });
  return lineas;
}

function lineasRutas(rutas: RutaTerminalPortada[]): LineaPortada[] {
  const visibles = rutas.filter((ruta) => ruta.estadoVigente !== "oculta" && ruta.estadoVigente !== "borrador");
  if (visibles.length === 0) return [{ texto: "rutas/: compilando", tipo: "muted" }];
  return visibles.map((ruta) =>
    ruta.estadoVigente === "filtrada"
      ? { texto: `${ruta.slug}/ · ${ruta.leak} · compilando`, tipo: "muted" as const }
      : { texto: `${ruta.slug}/ · ${ruta.cargo} · [abierta]`, tipo: "ok" as const }
  );
}

function fichaRuta(slug: string, rutas: RutaTerminalPortada[]): LineaPortada[] {
  const ruta = rutas.find((candidata) => candidata.slug === slug);
  if (!ruta) return [{ texto: `cat: ${slug}: no existe`, tipo: "error" }];
  if (ruta.estadoVigente === "filtrada") {
    return [
      { texto: `${ruta.leak} · ${ruta.slug}/ · compilando`, tipo: "muted" },
      { texto: ruta.teaser ?? ruta.descripcion },
    ];
  }
  return [
    { texto: `${ruta.slug}/ · ${ruta.cargo}` },
    { texto: ruta.descripcion, tipo: "muted" },
  ];
}
