import { describe, expect, it } from "vitest";
import { handleBienvenida } from "./handle";

describe("handleBienvenida", () => {
  it("usa el usuario del portafolio, después el primer nombre y después el correo", () => {
    expect(handleBienvenida({ usuario: "lun4t1k0", nombre: "Camila Rojas", email: "c@correo.cl" })).toBe("lun4t1k0");
    expect(handleBienvenida({ nombre: "José Ñancupil", email: "j@correo.cl" })).toBe("jose");
    expect(handleBienvenida({ nombre: "  ", email: "maria.paz@correo.cl" })).toBe("mariapaz");
    expect(handleBienvenida({ nombre: null, email: null })).toBe("estudiante");
    expect(handleBienvenida({ usuario: "", nombre: "Ñuñoa_99", email: null })).toBe("nunoa99");
  });
});
