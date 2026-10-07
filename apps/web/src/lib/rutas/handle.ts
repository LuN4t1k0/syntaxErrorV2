// El nombre del prompt de la terminal de bienvenida: el usuario del portafolio, el primer nombre o lo que va antes de
// la @ del correo, en minúsculas y sin tildes. Lo usa el panel (servidor), por eso no vive en el componente.
export function handleBienvenida({ usuario, nombre, email }: { usuario?: string | null; nombre?: string | null; email?: string | null }): string {
  return limpiar(usuario) || limpiar(nombre?.split(/\s+/)[0]) || limpiar(email?.split("@")[0]) || "estudiante";
}

function limpiar(valor?: string | null): string {
  return (valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
