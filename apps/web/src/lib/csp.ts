const CDN_PYODIDE = "https://cdn.jsdelivr.net";

export function construirCsp({ motores, socket }: { motores: boolean; socket: string }): string {
  const script = ["'self'", "'unsafe-inline'"];
  const connect = ["'self'"];
  if (socket) connect.push(socket, socket.replace(/^http/, "ws"));
  if (motores) {
    script.push("'unsafe-eval'", "'wasm-unsafe-eval'", CDN_PYODIDE);
    connect.push(CDN_PYODIDE);
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}
