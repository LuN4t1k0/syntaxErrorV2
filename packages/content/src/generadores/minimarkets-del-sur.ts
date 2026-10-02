import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 2, "Minimarkets del Sur": una cadena de ocho minimarkets entre Talca y Puerto Montt,
// enero a marzo de 2025. Son inventados y están limpios: el caso se trata de preguntar, no de limpiar.
// La historia que esconden: en marzo, Osorno vende mucho menos (estuvo en remodelación). La misión sin guía
// lleva a encontrarlo.

export type DatosMinimarkets = { locales: FilaDato[]; productos: FilaDato[]; ventas: FilaDato[] };

export const SEMILLA_MINIMARKETS = 20250115;
export const CANTIDAD_VENTAS = 650;
export const LOCAL_EN_REMODELACION = 7;

export const LOCALES: FilaDato[] = [
  { id: 1, nombre: "Talca Centro", ciudad: "Talca", region: "Maule", metros2: 180 },
  { id: 2, nombre: "Chillán Viejo", ciudad: "Chillán", region: "Ñuble", metros2: 150 },
  { id: 3, nombre: "Concepción Barrio Universitario", ciudad: "Concepción", region: "Biobío", metros2: 220 },
  { id: 4, nombre: "Los Ángeles Plaza", ciudad: "Los Ángeles", region: "Biobío", metros2: 160 },
  { id: 5, nombre: "Temuco Avenida Alemania", ciudad: "Temuco", region: "La Araucanía", metros2: 200 },
  { id: 6, nombre: "Valdivia Costanera", ciudad: "Valdivia", region: "Los Ríos", metros2: 140 },
  { id: 7, nombre: "Osorno Centro", ciudad: "Osorno", region: "Los Lagos", metros2: 170 },
  { id: 8, nombre: "Puerto Montt Angelmó", ciudad: "Puerto Montt", region: "Los Lagos", metros2: 190 },
];

// Peso de cada local en las ventas: los de ciudades más grandes venden más.
const PESO_LOCAL: Record<number, number> = { 1: 4, 2: 3, 3: 6, 4: 3, 5: 5, 6: 3, 7: 4, 8: 5 };

export const PRODUCTOS: FilaDato[] = [
  { id: 101, nombre: "Leche entera 1 L", categoria: "Lácteos", precio: 1190, proveedor: "Lechería del Ñuble" },
  { id: 102, nombre: "Leche descremada 1 L", categoria: "Lácteos", precio: 1190, proveedor: "Lechería del Ñuble" },
  { id: 103, nombre: "Queso gauda 500 g", categoria: "Lácteos", precio: 5490, proveedor: "Quesería Llanquihue" },
  { id: 104, nombre: "Queso fresco 300 g", categoria: "Lácteos", precio: 2990, proveedor: "Quesería Llanquihue" },
  { id: 105, nombre: "Yogur natural 1 kg", categoria: "Lácteos", precio: 2290, proveedor: "Lechería del Ñuble" },
  { id: 106, nombre: "Mantequilla 250 g", categoria: "Lácteos", precio: 2690, proveedor: "Quesería Llanquihue" },
  { id: 201, nombre: "Pan amasado 1 kg", categoria: "Panadería", precio: 2290, proveedor: "Panificadora Austral" },
  { id: 202, nombre: "Hallulla 1 kg", categoria: "Panadería", precio: 2190, proveedor: "Panificadora Austral" },
  { id: 203, nombre: "Kuchen de murta", categoria: "Panadería", precio: 6990, proveedor: "Panificadora Austral" },
  { id: 204, nombre: "Pan integral molde", categoria: "Panadería", precio: 2890, proveedor: "Panificadora Austral" },
  { id: 301, nombre: "Arroz grado 1 1 kg", categoria: "Abarrotes", precio: 1690, proveedor: "Distribuidora Sur" },
  { id: 302, nombre: "Tallarines 400 g", categoria: "Abarrotes", precio: 990, proveedor: "Distribuidora Sur" },
  { id: 303, nombre: "Aceite vegetal 1 L", categoria: "Abarrotes", precio: 2790, proveedor: "Distribuidora Sur" },
  { id: 304, nombre: "Azúcar 1 kg", categoria: "Abarrotes", precio: 1290, proveedor: "Distribuidora Sur" },
  { id: 305, nombre: "Harina 1 kg", categoria: "Abarrotes", precio: 1190, proveedor: "Molino del Maule" },
  { id: 306, nombre: "Porotos 1 kg", categoria: "Abarrotes", precio: 2490, proveedor: "Molino del Maule" },
  { id: 401, nombre: "Agua mineral 1,5 L", categoria: "Bebidas", precio: 990, proveedor: "Aguas de la Cordillera" },
  { id: 402, nombre: "Bebida cola 2 L", categoria: "Bebidas", precio: 1990, proveedor: "Embotelladora Sur" },
  { id: 403, nombre: "Jugo de manzana 1 L", categoria: "Bebidas", precio: 1490, proveedor: "Embotelladora Sur" },
  { id: 404, nombre: "Café en grano 250 g", categoria: "Bebidas", precio: 5990, proveedor: "Tostaduría Valdivia" },
  { id: 405, nombre: "Té 100 bolsitas", categoria: "Bebidas", precio: 2990, proveedor: "Distribuidora Sur" },
  { id: 406, nombre: "Kombucha artesanal", categoria: "Bebidas", precio: 3490, proveedor: "Fermentos del Sur" },
  { id: 501, nombre: "Detergente 3 L", categoria: "Aseo", precio: 7990, proveedor: "Limpieza Total" },
  { id: 502, nombre: "Papel higiénico 12 rollos", categoria: "Aseo", precio: 6490, proveedor: "Limpieza Total" },
  { id: 503, nombre: "Lavalozas 750 ml", categoria: "Aseo", precio: 1890, proveedor: "Limpieza Total" },
  { id: 504, nombre: "Cloro 1 L", categoria: "Aseo", precio: 990, proveedor: "Limpieza Total" },
  { id: 601, nombre: "Papas fritas 250 g", categoria: "Snacks", precio: 2490, proveedor: "Snacks del Biobío" },
  { id: 602, nombre: "Galletas de avena", categoria: "Snacks", precio: 1290, proveedor: "Snacks del Biobío" },
  { id: 603, nombre: "Maní salado 200 g", categoria: "Snacks", precio: 1590, proveedor: "Snacks del Biobío" },
  { id: 604, nombre: "Chocolate de leche 100 g", categoria: "Snacks", precio: 1390, proveedor: "Snacks del Biobío" },
  { id: 701, nombre: "Manzanas 1 kg", categoria: "Frutas y verduras", precio: 1490, proveedor: "Huertos del Maule" },
  { id: 702, nombre: "Papas 2 kg", categoria: "Frutas y verduras", precio: 1990, proveedor: "Huertos del Maule" },
  { id: 703, nombre: "Tomates 1 kg", categoria: "Frutas y verduras", precio: 1790, proveedor: "Huertos del Maule" },
  { id: 704, nombre: "Paltas 1 kg", categoria: "Frutas y verduras", precio: 4990, proveedor: "Huertos del Maule" },
  { id: 801, nombre: "Hamburguesas congeladas 4 un", categoria: "Congelados", precio: 4490, proveedor: "Frigorífico Austral" },
  { id: 802, nombre: "Helado de vainilla 1 L", categoria: "Congelados", precio: 3990, proveedor: "Frigorífico Austral" },
];

// La kombucha llegó al catálogo pero nunca se vendió: aparece al cruzar productos con ventas.
const SIN_VENTAS = new Set([406]);
// Lo que más se vende en un minimarket: lo de todos los días.
const PESO_CATEGORIA: Record<string, number> = { Lácteos: 6, Panadería: 6, Abarrotes: 5, Bebidas: 5, "Frutas y verduras": 4, Snacks: 3, Aseo: 2, Congelados: 2 };

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");
const DIAS_POR_MES = [31, 28, 31];

export function generarMinimarketsDelSur(): DatosMinimarkets {
  const aleatorio = crearAleatorio(SEMILLA_MINIMARKETS);
  const vendibles = PRODUCTOS.filter((producto) => !SIN_VENTAS.has(Number(producto.id)));
  const pesosProducto = vendibles.map((producto) => [producto, PESO_CATEGORIA[String(producto.categoria)]] as const);
  const ventas: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_VENTAS; indice += 1) {
    const mes = aleatorio.elegirConPeso([[1, 1], [2, 1], [3, 1]] as const);
    // En marzo, Osorno estuvo en remodelación y vendió cerca de un tercio de lo normal.
    const pesosLocal = LOCALES.map((local) => {
      const id = Number(local.id);
      const peso = PESO_LOCAL[id] * (mes === 3 && id === LOCAL_EN_REMODELACION ? 0.3 : 1);
      return [id, peso] as const;
    });
    const local = aleatorio.elegirConPeso(pesosLocal);
    const producto = aleatorio.elegirConPeso(pesosProducto);
    const cantidad = aleatorio.elegirConPeso([[1, 6], [2, 4], [3, 2], [4, 1], [6, 1]] as const);
    ventas.push({
      id: indice + 1,
      fecha: `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS_POR_MES[mes - 1]))}`,
      local_id: local,
      producto_id: producto.id,
      cantidad,
      monto: Number(producto.precio) * cantidad,
      medio_pago: aleatorio.elegirConPeso([["débito", 5], ["efectivo", 3], ["crédito", 2]] as const),
    });
  }
  ventas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || Number(a.id) - Number(b.id));
  ventas.forEach((venta, indice) => (venta.id = indice + 1));
  return { locales: LOCALES, productos: PRODUCTOS, ventas };
}
