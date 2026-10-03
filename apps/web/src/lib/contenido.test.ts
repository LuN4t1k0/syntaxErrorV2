import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const cargarContenido = vi.hoisted(() => vi.fn(async () => ({ rutas: [], casos: [] })));
vi.mock("@syntaxerror/content/cargar", () => ({ cargarContenido }));

import { obtenerContenido } from "./contenido";

describe("obtenerContenido fuera de producción", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "contenido-"));
  const anterior = process.env.CONTENT_DIR;
  beforeAll(() => {
    mkdirSync(path.join(dir, "casos"));
    writeFileSync(path.join(dir, "casos", "caso.yaml"), "titulo: Uno\n");
    process.env.CONTENT_DIR = dir;
  });
  afterAll(() => {
    process.env.CONTENT_DIR = anterior;
  });

  it("carga el contenido una vez y lo vuelve a cargar solo si cambia un archivo", async () => {
    await obtenerContenido();
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(1);

    const despues = new Date(Date.now() + 60_000);
    utimesSync(path.join(dir, "casos", "caso.yaml"), despues, despues);
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(2);

    writeFileSync(path.join(dir, "casos", "otro.yaml"), "titulo: Dos\n");
    utimesSync(path.join(dir, "casos", "otro.yaml"), new Date(0), new Date(0));
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(3);
    expect(cargarContenido).toHaveBeenLastCalledWith(dir);
  });
});
