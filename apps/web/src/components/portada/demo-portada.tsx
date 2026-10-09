"use client";

import Link from "next/link";
import { useState } from "react";
import { VENTAS } from "@/lib/portada/terminal";

// El ejemplo guiado agrupa los datos existentes; no carga un editor ni un motor SQL.
const totales = new Map<string, number>();
for (const venta of VENTAS) {
  const comuna = String(venta.comuna);
  totales.set(comuna, (totales.get(comuna) ?? 0) + Number(venta.monto));
}
const filas = Array.from(totales, ([comuna, total]) => ({ comuna, total }));
const ordenadas = [...filas].sort((a, b) => b.total - a.total);
const mayor = ordenadas[0];
const pesos = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function DemoPortada({ textoRegistro }: { textoRegistro: string }) {
  const [resuelto, setResuelto] = useState(false);

  return (
    <div className="demo-wrap" id="demo">
      <section className="terminal" aria-labelledby="demo-title">
        <div className="terminal-bar">
          <i className="dot" aria-hidden="true" />
          <i className="dot" aria-hidden="true" />
          <i className="dot" aria-hidden="true" />
          <span className="path">tu-primer-hallazgo.sql</span>
          <span className="status">[demo]</span>
        </div>
        <div className="terminal-body">
          <div className="eyebrow">Una pequeña prueba. Sin cuenta.</div>
          <h2 id="demo-title">
            Los datos cuentan algo.
            <br />
            Descúbrelo.
          </h2>
          <p className="intro">
            Una tienda vende en cuatro comunas.
            <br />
            ¿En cuál vendió más? Vamos a averiguarlo.
          </p>
          <ul className="data-list" aria-label="Ventas totales por comuna">
            {(resuelto ? ordenadas : filas).map(({ comuna, total }) => (
              <li className="data-row" key={comuna}>
                <span>{comuna}</span>
                <div className="bar-track" aria-hidden="true">
                  <div
                    className="bar"
                    style={{ width: `${(total / mayor.total) * 100}%` }}
                  />
                </div>
                <span className="amount">{pesos.format(total)}</span>
              </li>
            ))}
          </ul>
          <button
            className="run"
            type="button"
            disabled={resuelto}
            onClick={() => setResuelto(true)}
          >
            {resuelto ? "✓ Respuesta encontrada" : "▶ Descubrir la respuesta"}
          </button>
          <div role="status" aria-live="polite" aria-atomic="true">
            {resuelto ? (
              <div className="result">
                <strong>
                  [ok] {mayor.comuna} vendió más: {pesos.format(mayor.total)}.
                </strong>
                <p>
                  Sumaste las ventas y encontraste una respuesta. En la ruta
                  aprenderás a hacerlo paso a paso.
                </p>
                <Link href="/registro">{textoRegistro} ↗</Link>
              </div>
            ) : null}
          </div>
          <noscript>
            <p>
              Para descubrir la respuesta con el botón, activa JavaScript.
              También puedes comparar los montos de arriba y explorar la
              explicación SQL.
            </p>
          </noscript>
          <details className="code">
            <summary>Ver cómo se hace con SQL</summary>
            <pre>
              {
                "SELECT comuna, SUM(monto) AS total\nFROM ventas\nGROUP BY comuna\nORDER BY total DESC;"
              }
            </pre>
            <span>
              Agrupamos las ventas por comuna, sumamos sus montos y ordenamos de
              mayor a menor.
            </span>
          </details>
        </div>
      </section>
      <p className="caption">
        No necesitas entender el código para empezar.
        <br />
        Eso lo aprendemos paso a paso.
      </p>
    </div>
  );
}
