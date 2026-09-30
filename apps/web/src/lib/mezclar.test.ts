import { describe, expect, it } from "vitest";
import { mezclar } from "./mezclar";

describe("mezclar", () => {
  it("no muta la lista original", () => {
    const original = [1, 2, 3];
    expect([...mezclar(original)].sort()).toEqual([1, 2, 3]);
    expect(original).toEqual([1, 2, 3]);
  });
});
