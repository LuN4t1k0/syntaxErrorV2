import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { archivosPython, grillaDeHoja, paquetesPython, tablasSql } from "./datos";
import { casosSoloBeta, casosVisibles, estadoVigenteRuta, rutasVisibles, rutaUsable, tareasDeMision } from "./publicacion";
import type { Contenido } from "./tipos";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));
let contenido: Contenido;

beforeAll(async () => {
  contenido = await cargarContenido(FIXTURE);
});

describe("visibilidad", () => {
  it("muestra las rutas publicadas y sus casos", () => {
    expect(rutasVisibles(contenido, false).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(casosVisibles(contenido, false).map((caso) => caso.slug)).toEqual(["ventas"]);
  });

  it("oculta los borradores salvo que se pidan", () => {
    const conBorrador: Contenido = {
      ...contenido,
      rutas: contenido.rutas.map((ruta) => ({ ...ruta, estado: "borrador" as const })),
    };
    expect(casosVisibles(conBorrador, false)).toEqual([]);
    expect(casosVisibles(conBorrador, true).map((caso) => caso.slug)).toEqual(["ventas"]);
  });

  it("una ruta en beta se construye pero no se lista, y sus casos son solo para probadores", () => {
    const enBeta: Contenido = { ...contenido, rutas: contenido.rutas.map((ruta) => ({ ...ruta, estado: "beta" as const })) };
    expect(rutasVisibles(enBeta, false)).toEqual([]);
    expect(rutasVisibles(enBeta, false, { beta: true }).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(casosVisibles(enBeta, false, { beta: true }).map((caso) => caso.slug)).toEqual(["ventas"]);
    expect([...casosSoloBeta(enBeta, false)]).toEqual(["ventas"]);
    // Con los borradores a la vista (desarrollo y e2e) se ve todo y nada queda solo para probadores.
    expect(rutasVisibles(enBeta, true).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect([...casosSoloBeta(enBeta, true)]).toEqual([]);
    // Un caso que también está en una ruta publicada no es solo beta.
    const tambienPublicado: Contenido = { ...enBeta, rutas: [...enBeta.rutas, { ...contenido.rutas[0], slug: "otra", estado: "publicada" }] };
    expect([...casosSoloBeta(tambienPublicado, false)]).toEqual([]);
  });

  it("una ruta filtrada con casos se construye, para que el admin la pueda abrir sin deploy, pero no se lista", () => {
    const filtrada: Contenido = { ...contenido, rutas: contenido.rutas.map((ruta) => ({ ...ruta, estado: "filtrada" as const })) };
    expect(rutasVisibles(filtrada, false)).toEqual([]);
    expect(rutasVisibles(filtrada, false, { beta: true }).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(casosVisibles(filtrada, false, { beta: true }).map((caso) => caso.slug)).toEqual(["ventas"]);
  });

  it("tareasDeMision devuelve solo los bloques de tarea", () => {
    const ids = tareasDeMision(contenido.casos[0].misiones[0]).map((tarea) => tarea.props.id);
    expect(ids).toEqual(["fuera-de-santiago"]);
  });
});

describe("estado vigente de una ruta", () => {
  it("manda el admin, salvo en los borradores del repositorio", () => {
    expect(estadoVigenteRuta({ estado: "beta" })).toBe("beta");
    expect(estadoVigenteRuta({ estado: "beta", estadoAdmin: null })).toBe("beta");
    expect(estadoVigenteRuta({ estado: "beta", estadoAdmin: "publicada" })).toBe("publicada");
    expect(estadoVigenteRuta({ estado: "filtrada", estadoAdmin: "oculta" })).toBe("oculta");
    expect(estadoVigenteRuta({ estado: "borrador", estadoAdmin: "publicada" })).toBe("borrador");
  });

  it("solo se usa una ruta publicada, o en beta para probadores y admins", () => {
    expect(rutaUsable("publicada", false)).toBe(true);
    expect(rutaUsable("beta", false)).toBe(false);
    expect(rutaUsable("beta", true)).toBe(true);
    for (const estado of ["filtrada", "oculta", "borrador"] as const) expect(rutaUsable(estado, true)).toBe(false);
  });
});

describe("datos del caso", () => {
  it("arma tablas SQL, archivos Python y grillas desde los CSV", () => {
    const [caso] = contenido.casos;
    expect(Object.keys(tablasSql(caso))).toEqual(["clientes"]);
    expect(archivosPython(caso)[0].ruta).toBe("datos/clientes.csv");
    expect(archivosPython(caso)[0].contenido.startsWith("id,nombre,ciudad,monto")).toBe(true);
    expect(grillaDeHoja(caso, "clientes")[0]).toEqual(["id", "nombre", "ciudad", "monto"]);
    expect(() => grillaDeHoja(caso, "no-existe")).toThrow('El caso ventas no tiene la hoja "no-existe"');
    expect(paquetesPython(caso.misiones[2])).toEqual([]);
  });
});
