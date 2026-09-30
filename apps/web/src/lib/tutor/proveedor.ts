import { crearProveedorDesdeEntorno } from "@syntaxerror/ia/proveedor";
import type { ProveedorIA } from "@syntaxerror/ia/tutor";

const globalParaIA = globalThis as { __syntaxerrorProveedorIA?: ProveedorIA | null };

export function proveedorIA(): ProveedorIA | null {
  if (globalParaIA.__syntaxerrorProveedorIA === undefined) {
    globalParaIA.__syntaxerrorProveedorIA = crearProveedorDesdeEntorno();
  }
  return globalParaIA.__syntaxerrorProveedorIA;
}
