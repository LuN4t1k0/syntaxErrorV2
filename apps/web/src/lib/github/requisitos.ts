import { problemasMarkdown } from "@syntaxerror/engines/markdown";

export { describirRequisito, PATRON_USUARIO } from "./descripcion";

// Lo que la revisión necesita saber de un repositorio, ya leído desde la API de GitHub.
export type DatosRepositorio = { publico: boolean; rutas: string[]; readme: string | null; mensajes: string[] };

// Mensajes que GitHub escribe solo al crear, editar o subir desde la web: no cuentan como mensajes propios.
const MENSAJE_AUTOMATICO = /^(initial commit|add files via upload|(create|update|delete|rename) \S+( to \S+)?)$/i;
const SEGMENTO_LIMPIO = /^[A-Za-z0-9._-]+$/;
const README = /^readme(\.[a-z0-9]+)?$/i;

export function esMensajePropio(mensaje: string): boolean {
  const titulo = mensaje.split("\n")[0].trim();
  return titulo.length > 0 && !MENSAJE_AUTOMATICO.test(titulo);
}

export function problemasRepositorio(datos: DatosRepositorio, requisitos: string[]): string[] {
  const problemas = new Set<string>();
  const sinReadme = "Falta el README en la carpeta principal del repositorio.";
  for (const requisito of requisitos) {
    const [tipo, valor] = requisito.split(/:(.*)/s);
    if (tipo === "publico" && !datos.publico) {
      problemas.add("El repositorio es privado: hazlo público en Settings → General → Danger Zone → Change visibility.");
    } else if (tipo === "readme" && !valor && !datos.rutas.some((ruta) => README.test(ruta))) {
      problemas.add(sinReadme);
    } else if (tipo === "readme" && valor) {
      if (datos.readme === null) problemas.add(sinReadme);
      else for (const problema of problemasMarkdown(datos.readme, [valor])) problemas.add(`En el README: ${problema}`);
    } else if (tipo === "commits") {
      const propios = datos.mensajes.filter(esMensajePropio).length;
      const necesarios = Number(valor);
      if (propios < necesarios) {
        problemas.add(
          `Encontramos ${propios} ${propios === 1 ? "commit" : "commits"} con mensaje escrito por ti y se necesitan ${necesarios}. Los mensajes automáticos de GitHub, como «Update README.md» o «Add files via upload», no cuentan: al guardar, escribe qué cambiaste.`
        );
      }
    } else if (tipo === "carpeta" && !datos.rutas.some((ruta) => ruta.startsWith(`${valor}/`))) {
      problemas.add(`Falta la carpeta «${valor}». En GitHub se crea al nombrar un archivo como «${valor}/nombre-del-archivo».`);
    } else if (tipo === "extension" && !datos.rutas.some((ruta) => ruta.toLowerCase().endsWith(valor))) {
      problemas.add(`Falta al menos un archivo ${valor}.`);
    } else if (tipo === "nombres-limpios") {
      const malos = datos.rutas.filter((ruta) => ruta.split("/").some((segmento) => !SEGMENTO_LIMPIO.test(segmento)));
      if (malos.length > 0) {
        problemas.add(
          `Estos nombres tienen espacios, tildes u otros caracteres que conviene evitar: ${malos.slice(0, 3).map((ruta) => `«${ruta}»`).join(", ")}. Usa minúsculas, números y guiones, como «ventas-marzo.csv».`
        );
      }
    }
  }
  return [...problemas];
}
