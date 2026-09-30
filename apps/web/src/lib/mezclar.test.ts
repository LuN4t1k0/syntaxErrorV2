import { describe, expect, it } from "vitest";
import { mezclar } from "./mezclar";

describe("mezclar", () => {
  it("devuelve los mismos elementos sin tocar la lista original", () => {
    const original = [1, 2, 3, 4];
    const mezclada = mezclar(original);
    expect([...mezclada].sort()).toEqual([1, 2, 3, 4]);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it("usa la fuente de azar que recibe", () => {
    expect(mezclar([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
    expect(mezclar([1, 2, 3], () => 0.99)).toEqual([1, 2, 3]);
  });
});
