"use client";

import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Minimarkets del Sur: ventas por ciudad con JOIN y GROUP BY. Los colores son los de las consolas (tok-*), con
// contraste en los dos temas.
const CONSULTA: { texto: string; clase?: string }[] = [
  { texto: "SELECT ", clase: "tok-keyword" },
  { texto: "l.ciudad, " },
  { texto: "SUM", clase: "tok-keyword" },
  { texto: "(v.monto) " },
  { texto: "AS ", clase: "tok-keyword" },
  { texto: "ventas", clase: "tok-definition" },
  { texto: "\nFROM ", clase: "tok-keyword" },
  { texto: "ventas ", clase: "tok-propertyName" },
  { texto: "v\n" },
  { texto: "JOIN ", clase: "tok-keyword" },
  { texto: "locales ", clase: "tok-propertyName" },
  { texto: "l " },
  { texto: "ON ", clase: "tok-keyword" },
  { texto: "v.local_id = l.id\n" },
  { texto: "GROUP BY ", clase: "tok-keyword" },
  { texto: "l.ciudad;" },
];
const FILAS = [
  ["Temuco", "1.284.500"],
  ["Valdivia", "968.200"],
  ["Osorno", "731.900"],
];

export function MaquetaSql() {
  const visibles = useEscritura(CONSULTA.length, 110);
  const listo = visibles >= CONSULTA.length;
  return (
    <VentanaMaqueta archivo="ventas.sql" lateral={{ titulo: "Clases de SQL", items: ["SELECT", "WHERE", "JOIN", "GROUP BY"], activo: 2 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Minimarkets del Sur</p>
      <p className="mt-1 font-black">Ventas por ciudad</p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {CONSULTA.slice(0, visibles).map((pieza, indice) => (
          <span key={indice} className={pieza.clase}>
            {pieza.texto}
          </span>
        ))}
        <Cursor listo={listo} />
      </pre>
      <div className={`mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-border text-sm transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>
        <span className="border-b border-r border-border bg-surface-raised px-3 py-1.5 font-bold">ciudad</span>
        <span className="border-b border-border bg-surface-raised px-3 py-1.5 font-bold">ventas</span>
        {FILAS.map(([ciudad, ventas]) => [
          <span key={ciudad} className="border-b border-r border-border px-3 py-1.5 last:border-b-0">
            {ciudad}
          </span>,
          <span key={`${ciudad}-v`} className="border-b border-border px-3 py-1.5 font-mono">
            {ventas}
          </span>,
        ])}
      </div>
      <p className={`mt-3 font-mono text-sm font-bold transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>✔ ¡Tarea aprobada!</p>
    </VentanaMaqueta>
  );
}
