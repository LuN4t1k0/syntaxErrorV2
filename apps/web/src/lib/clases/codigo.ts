import { randomInt } from "node:crypto";

// Sin 0/O, 1/I/L: el código se dicta en voz alta en la sala de clases.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LARGO = 6;

export function generarCodigo(): string {
  return Array.from({ length: LARGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export function normalizarCodigo(valor: string): string {
  return valor.toUpperCase().replace(/[\s-]/g, "");
}
