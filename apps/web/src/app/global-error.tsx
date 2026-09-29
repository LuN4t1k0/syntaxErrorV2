"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", padding: "3rem", background: "#0a0a0a", color: "#fafafa" }}>
        <h1>syntaxError: algo se rompió</h1>
        <p>Recarga la página. Si el problema sigue, vuelve a intentarlo en unos minutos.</p>
        <button type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
