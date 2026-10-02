import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 3, "Tienda Online Pewen": un e-commerce chileno de hogar y vestuario, julio a diciembre de 2025.
// Traen defectos para limpiar con pandas (misión 4): pedidos duplicados, cantidades vacías y regiones vacías.
// Y dos patrones para descubrir (misión 7): Vestuario se devuelve mucho más que el resto, y noviembre
// (Black Friday) vende más que cualquier otro mes.

export type DatosPewen = { clientes: FilaDato[]; productos: FilaDato[]; pedidos: FilaDato[] };

export const SEMILLA_PEWEN = 20250701;
export const CANTIDAD_CLIENTES = 90;
export const CANTIDAD_PEDIDOS = 420;
const PRIMER_PEDIDO = 5001;

export const PRODUCTOS_PEWEN: FilaDato[] = [
  { producto_id: "P01", nombre: "Juego de sábanas 2 plazas", categoria: "Hogar", precio: 24990 },
  { producto_id: "P02", nombre: "Toalla de baño", categoria: "Hogar", precio: 8990 },
  { producto_id: "P03", nombre: "Plumón nórdico", categoria: "Hogar", precio: 39990 },
  { producto_id: "P04", nombre: "Almohada viscoelástica", categoria: "Hogar", precio: 14990 },
  { producto_id: "P05", nombre: "Cortina blackout", categoria: "Hogar", precio: 19990 },
  { producto_id: "P06", nombre: "Manta de lana", categoria: "Hogar", precio: 22990 },
  { producto_id: "P07", nombre: "Sartén antiadherente", categoria: "Cocina", precio: 17990 },
  { producto_id: "P08", nombre: "Set de cuchillos", categoria: "Cocina", precio: 29990 },
  { producto_id: "P09", nombre: "Tetera eléctrica", categoria: "Cocina", precio: 21990 },
  { producto_id: "P10", nombre: "Juego de tazas", categoria: "Cocina", precio: 12990 },
  { producto_id: "P11", nombre: "Tabla de madera nativa", categoria: "Cocina", precio: 15990 },
  { producto_id: "P12", nombre: "Olla de greda", categoria: "Cocina", precio: 18990 },
  { producto_id: "P13", nombre: "Cojín de lino", categoria: "Decoración", precio: 11990 },
  { producto_id: "P14", nombre: "Lámpara de mimbre", categoria: "Decoración", precio: 34990 },
  { producto_id: "P15", nombre: "Florero de cerámica", categoria: "Decoración", precio: 13990 },
  { producto_id: "P16", nombre: "Cuadro de paisaje", categoria: "Decoración", precio: 27990 },
  { producto_id: "P17", nombre: "Vela aromática", categoria: "Decoración", precio: 7990 },
  { producto_id: "P18", nombre: "Polerón de algodón", categoria: "Vestuario", precio: 24990 },
  { producto_id: "P19", nombre: "Chaqueta impermeable", categoria: "Vestuario", precio: 49990 },
  { producto_id: "P20", nombre: "Pantalón de buzo", categoria: "Vestuario", precio: 19990 },
  { producto_id: "P21", nombre: "Polera básica", categoria: "Vestuario", precio: 9990 },
  { producto_id: "P22", nombre: "Calcetines de lana", categoria: "Vestuario", precio: 6990 },
  { producto_id: "P23", nombre: "Pijama polar", categoria: "Vestuario", precio: 21990 },
  { producto_id: "P24", nombre: "Gorro tejido", categoria: "Vestuario", precio: 8990 },
];

const REGIONES = [["Metropolitana", 9], ["Valparaíso", 3], ["Biobío", 3], ["La Araucanía", 2], ["Los Lagos", 2], ["Maule", 1], ["Coquimbo", 1]] as const;
const CANALES = [["instagram", 4], ["google", 3], ["recomendación", 2], ["tiktok", 2]] as const;
// En noviembre (Black Friday) se vende más del doble que en un mes normal.
const MESES = [[7, 2], [8, 2], [9, 2], [10, 2.2], [11, 5], [12, 3]] as const;
const DIAS_DEL_MES: Record<number, number> = { 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 };
// La ropa se devuelve más: tallas que no calzan.
const PROBABILIDAD_DEVOLUCION: Record<string, number> = { Vestuario: 0.22, Hogar: 0.05, Cocina: 0.04, Decoración: 0.06 };

// Los defectos, en posiciones fijas (índice de pedido, desde 0).
export const DEFECTOS_PEWEN = {
  cantidadVacia: [14, 77, 150, 233, 301],
  duplicados: [40, 120, 260, 380],
  regionVacia: [5, 22, 37, 58, 71, 84],
};

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

export function generarTiendaOnlinePewen(): DatosPewen {
  const aleatorio = crearAleatorio(SEMILLA_PEWEN);
  const clientes: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_CLIENTES; indice += 1) {
    clientes.push({
      cliente_id: `C${String(indice + 1).padStart(3, "0")}`,
      region: DEFECTOS_PEWEN.regionVacia.includes(indice) ? null : aleatorio.elegirConPeso(REGIONES),
      canal: aleatorio.elegirConPeso(CANALES),
      fecha_registro: `2025-${dosDigitos(aleatorio.entero(1, 6))}-${dosDigitos(aleatorio.entero(1, 28))}`,
    });
  }
  // Pocos clientes compran mucho y muchos compran una o dos veces, como en toda tienda.
  const pesosCliente = clientes.map((cliente, indice) => [cliente.cliente_id, indice % 9 === 0 ? 6 : indice % 3 === 0 ? 2 : 1] as const);
  const pesosProducto = PRODUCTOS_PEWEN.map((producto) => [producto, producto.categoria === "Vestuario" ? 4 : 3] as const);

  const pedidos: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_PEDIDOS; indice += 1) {
    const mes = aleatorio.elegirConPeso(MESES);
    const producto = aleatorio.elegirConPeso(pesosProducto);
    const azar = aleatorio.siguiente();
    const devolucion = PROBABILIDAD_DEVOLUCION[String(producto.categoria)];
    pedidos.push({
      fecha: `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS_DEL_MES[mes]))}`,
      cliente_id: aleatorio.elegirConPeso(pesosCliente),
      producto_id: producto.producto_id,
      cantidad: aleatorio.elegirConPeso([[1, 7], [2, 3], [3, 1], [4, 1]] as const),
      precio_unitario: producto.precio,
      estado: azar < devolucion ? "devuelto" : azar < devolucion + 0.03 ? "cancelado" : "entregado",
    });
  }
  pedidos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const conId = pedidos.map((pedido, indice) => ({
    pedido_id: PRIMER_PEDIDO + indice,
    ...pedido,
    cantidad: DEFECTOS_PEWEN.cantidadVacia.includes(indice) ? null : pedido.cantidad,
  }));
  for (const indice of DEFECTOS_PEWEN.duplicados) conId.push({ ...conId[indice] });
  return { clientes, productos: PRODUCTOS_PEWEN, pedidos: conId };
}
