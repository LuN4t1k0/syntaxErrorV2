import { describe, expect, it } from "vitest";
import { describirRequisito, esMensajePropio, problemasRepositorio, type DatosRepositorio } from "./requisitos";

const README = "# Ana Pérez\n\n## Sobre mí\n\n- Analista en formación\n\n[LinkedIn](https://linkedin.com/in/ana)";
const completo: DatosRepositorio = {
  publico: true,
  rutas: ["README.md", "datos/despachos-marzo.csv", "resultados/resumen.md"],
  readme: README,
  mensajes: ["Agrega los despachos de marzo", "Explica los resultados en el README", "Ordena las carpetas", "Update README.md"],
};

describe("esMensajePropio", () => {
  it("descarta los mensajes que GitHub escribe solo", () => {
    for (const mensaje of ["Initial commit", "Create README.md", "Update README.md", "Add files via upload", "Delete datos.csv", "Rename a.csv to b.csv", "update datos/x.csv"]) {
      expect(esMensajePropio(mensaje), mensaje).toBe(false);
    }
  });

  it("acepta los escritos por la persona, aunque empiecen con un verbo en inglés", () => {
    expect(esMensajePropio("Agrega los despachos de marzo\n\nDetalle en el README")).toBe(true);
    expect(esMensajePropio("Update the README with the results")).toBe(true);
    expect(esMensajePropio("   ")).toBe(false);
  });
});

describe("describirRequisito", () => {
  it("explica cada requisito en español", () => {
    expect(["publico", "readme", "commits:3", "carpeta:datos", "extension:.csv", "nombres-limpios", "readme:subtitulos:2"].map(describirRequisito)).toEqual([
      "El repositorio es público.",
      "Tiene un README en la carpeta principal.",
      "Tiene al menos 3 commits con mensajes escritos por ti.",
      "Tiene una carpeta «datos».",
      "Tiene al menos un archivo .csv.",
      "Los nombres de carpetas y archivos no tienen espacios ni tildes.",
      "El README tiene al menos 2 subtítulos.",
    ]);
    expect(() => describirRequisito("estrellas:5")).toThrow("Requisito de GitHub desconocido: estrellas:5");
  });
});

describe("problemasRepositorio", () => {
  const todos = ["publico", "readme", "commits:3", "carpeta:datos", "extension:.csv", "nombres-limpios", "readme:titulo", "readme:lista", "readme:enlace"];

  it("aprueba un repositorio que cumple todo", () => {
    expect(problemasRepositorio(completo, todos)).toEqual([]);
  });

  it("explica lo que falta, sin repetir", () => {
    const vacio: DatosRepositorio = { publico: false, rutas: ["Datos Marzo/Despachos Ñuñoa.csv"], readme: null, mensajes: ["Initial commit", "Agrega datos"] };
    expect(problemasRepositorio(vacio, todos)).toEqual([
      "El repositorio es privado: hazlo público en Settings → General → Danger Zone → Change visibility.",
      "Falta el README en la carpeta principal del repositorio.",
      "Encontramos 1 commit con mensaje escrito por ti y se necesitan 3. Los mensajes automáticos de GitHub, como «Update README.md» o «Add files via upload», no cuentan: al guardar, escribe qué cambiaste.",
      "Falta la carpeta «datos». En GitHub se crea al nombrar un archivo como «datos/nombre-del-archivo».",
      "Estos nombres tienen espacios, tildes u otros caracteres que conviene evitar: «Datos Marzo/Despachos Ñuñoa.csv». Usa minúsculas, números y guiones, como «ventas-marzo.csv».",
    ]);
  });

  it("revisa el Markdown del README", () => {
    expect(problemasRepositorio({ ...completo, readme: "#Ana" }, ["readme:titulo", "readme:tabla"])).toEqual([
      "En el README: Después de los # va un espacio: escribe «# Título», no «#Título». Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos».",
      "En el README: Falta una tabla: una fila de encabezados, una línea de separación como «| --- | --- |» y al menos una fila de datos.",
    ]);
  });
});
