// Sin imports: este módulo corre en el navegador.
export type EntradaBusqueda = {
  tipo: "ruta" | "caso" | "mision";
  titulo: string;
  contexto: string;
  href: string;
  texto: string;
};

const PRIORIDAD: Record<EntradaBusqueda["tipo"], number> = { ruta: 3, caso: 2, mision: 1 };

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buscar(indice: EntradaBusqueda[], consulta: string, limite = 20): EntradaBusqueda[] {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  if (palabras.length === 0) return [];

  const encontradas: { entrada: EntradaBusqueda; puntaje: number; orden: number }[] = [];
  indice.forEach((entrada, orden) => {
    const titulo = normalizar(entrada.titulo);
    const resto = `${normalizar(entrada.contexto)} ${entrada.texto}`;
    if (!palabras.every((palabra) => titulo.includes(palabra) || resto.includes(palabra))) return;
    const enTitulo = palabras.filter((palabra) => titulo.includes(palabra)).length;
    encontradas.push({ entrada, puntaje: enTitulo * 10 + PRIORIDAD[entrada.tipo], orden });
  });

  return encontradas
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
    .slice(0, limite)
    .map((resultado) => resultado.entrada);
}
