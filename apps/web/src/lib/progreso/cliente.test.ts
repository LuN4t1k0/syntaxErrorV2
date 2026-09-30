import { describe, expect, it } from "vitest";
import { cargarProgreso, leerPendientes, reportarTarea, sincronizarPendientes, type Almacen } from "./cliente";

function almacenEnMemoria(): Almacen {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  };
}

function fetchFalso(responder: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const llamadas: { url: string; cuerpo: unknown }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
    return responder(url, init);
  }) as unknown as typeof globalThis.fetch;
  return { fetch, llamadas };
}

const json = (status: number, cuerpo: unknown = {}) => new Response(JSON.stringify(cuerpo), { status });
const aprobado = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };

describe("reportarTarea", () => {
  it("con sesión lo guarda en el servidor", async () => {
    const almacen = almacenEnMemoria();
    const { fetch, llamadas } = fetchFalso(() => json(200));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("servidor");
    expect(llamadas[0]).toEqual({ url: "/api/progreso", cuerpo: aprobado });
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("sin sesión guarda la tarea aprobada una sola vez en localStorage", async () => {
    const almacen = almacenEnMemoria();
    const { fetch } = fetchFalso(() => json(401));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("local");
    await reportarTarea(aprobado, { fetch, almacen });
    expect(leerPendientes(almacen)).toEqual([{ caso: "ventas", mision: "m1", tarea: "t1" }]);
  });

  it("sin conexión también la guarda local", async () => {
    const almacen = almacenEnMemoria();
    const { fetch } = fetchFalso(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("local");
  });

  it("descarta los intentos fallidos y los rechazos del servidor", async () => {
    const almacen = almacenEnMemoria();
    expect(await reportarTarea({ ...aprobado, aprobada: false }, { fetch: fetchFalso(() => json(401)).fetch, almacen })).toBe(
      "descartado"
    );
    expect(await reportarTarea(aprobado, { fetch: fetchFalso(() => json(404)).fetch, almacen })).toBe("descartado");
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("funciona aunque no haya localStorage", async () => {
    expect(await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen: null })).toBe("local");
  });
});

describe("sincronizarPendientes", () => {
  it("sube lo pendiente y lo borra si el servidor responde bien", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const { fetch, llamadas } = fetchFalso(() => json(200, { aplicados: 1, rechazados: 0 }));
    expect(await sincronizarPendientes({ fetch, almacen })).toBe(1);
    expect(llamadas[0]).toEqual({ url: "/api/progreso/sync", cuerpo: { intentos: [aprobado] } });
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("sin sesión conserva lo pendiente", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    expect(await sincronizarPendientes({ fetch: fetchFalso(() => json(401)).fetch, almacen })).toBe(0);
    expect(leerPendientes(almacen)).toHaveLength(1);
  });
});

describe("cargarProgreso", () => {
  const tareasPorMision = { m1: ["t1", "t2"], m2: ["t3"] };

  it("une lo del servidor con lo pendiente en localStorage", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea({ ...aprobado, tarea: "t2" }, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const servidor = {
      misiones: { m1: { estado: "en_curso", tareasAprobadas: ["t1"] } },
      entregable: null,
      completo: false,
    };
    const progreso = await cargarProgreso("ventas", tareasPorMision, { fetch: fetchFalso(() => json(200, servidor)).fetch, almacen });
    expect(progreso).toEqual({
      sesion: true,
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"] } },
      entregable: null,
      completo: false,
    });
  });

  it("sin sesión usa solo localStorage", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea({ ...aprobado, mision: "m2", tarea: "t3" }, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const progreso = await cargarProgreso("ventas", tareasPorMision, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    expect(progreso).toEqual({
      sesion: false,
      misiones: { m2: { estado: "aprobada", tareasAprobadas: ["t3"] } },
      entregable: null,
      completo: false,
    });
  });
});
