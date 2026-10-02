import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CANTIDAD_ATENCIONES, ESPECIALIDAD_CON_INASISTENCIAS, generarClinicaCordilleraCentral, SEDE_SATURADA } from "./clinica-cordillera-central";
import { aCsv } from "./despachos-rapidos";

const DATOS = fileURLToPath(new URL("../../../../content/casos/clinica-cordillera-central/datos/", import.meta.url));

describe("generarClinicaCordilleraCentral", () => {
  const datos = generarClinicaCordilleraCentral();
  const urgencias = datos.atenciones.filter((atencion) => atencion.tipo === "urgencia");
  const consultas = datos.atenciones.filter((atencion) => atencion.tipo === "consulta");
  const promedio = (valores: number[]) => valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
  const esperaDe = (filtro: (atencion: Record<string, unknown>) => boolean) => promedio(urgencias.filter(filtro).map((atencion) => Number(atencion.espera_minutos)));

  it("genera siempre lo mismo", () => {
    expect(generarClinicaCordilleraCentral()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("las atenciones son coherentes y no tienen datos de pacientes", () => {
    expect(datos.atenciones).toHaveLength(CANTIDAD_ATENCIONES);
    expect(Object.keys(datos.atenciones[0])).toEqual(["id", "fecha", "sede_id", "especialidad_id", "tipo", "estado", "espera_minutos", "prevision"]);
    for (const atencion of urgencias) expect(Number(atencion.espera_minutos)).toBeGreaterThan(0);
    for (const atencion of consultas) {
      expect(atencion.espera_minutos).toBeNull();
      expect(atencion.estado).not.toBe("abandono");
    }
  });

  it("muestra lo que el dashboard tiene que contar: el invierno en Maipú y las inasistencias de Dermatología", () => {
    const deMes = (meses: string[]) => (atencion: Record<string, unknown>) => meses.some((mes) => String(atencion.fecha).startsWith(`2025-${mes}`));
    expect(esperaDe(deMes(["06"]))).toBeGreaterThan(esperaDe(deMes(["01"])) * 1.8);
    for (const sede of [1, 3, 4]) expect(esperaDe((atencion) => atencion.sede_id === SEDE_SATURADA)).toBeGreaterThan(esperaDe((atencion) => atencion.sede_id === sede));
    const tasa = (especialidad: number) => {
      const deLaEspecialidad = consultas.filter((atencion) => atencion.especialidad_id === especialidad);
      return deLaEspecialidad.filter((atencion) => atencion.estado === "inasistencia").length / deLaEspecialidad.length;
    };
    for (const otra of [1, 2, 3, 5, 6, 7]) expect(tasa(ESPECIALIDAD_CON_INASISTENCIAS)).toBeGreaterThan(tasa(otra) * 1.5);
  });
});
