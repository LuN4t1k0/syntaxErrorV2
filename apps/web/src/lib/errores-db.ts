// Postgres responde 23505 cuando un INSERT o UPDATE choca con un índice único.
export function esViolacionUnica(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}
