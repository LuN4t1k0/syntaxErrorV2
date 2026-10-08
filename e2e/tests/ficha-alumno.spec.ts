import { expect, test } from "./fixtures";
import { esperarEmail, rutaDelEnlace } from "./mailpit";
import { MISIONES, registrarse } from "./progreso";
import { entrarComoAdmin } from "./revision";

const CASO = "herramientas-del-oficio";

test("el admin ve la traba de un alumno, le envía su avance y el alumno lo abre desde el email", async ({ page, ip, nuevaPagina }) => {
  const email = await registrarse(page, "Bruno Tapia");
  const [mision, tarea] = MISIONES[CASO][0];
  for (let intento = 0; intento < 5; intento += 1) {
    const respuesta = await page.request.post("/api/progreso", { headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip }, data: { caso: CASO, mision, tarea, aprobada: false } });
    expect(respuesta.ok()).toBe(true);
  }

  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await admin.goto(`/admin/usuarios?q=${encodeURIComponent(email)}`);
  await admin.getByRole("link", { name: email }).click();
  const trabas = admin.getByRole("region", { name: "Trabas" });
  await expect(trabas).toContainText("5 intentos fallidos");
  await admin.getByLabel("Nota (opcional)").fill("Prueba la pista 2.");
  await admin.getByRole("button", { name: "Enviar avance" }).click();
  await expect(admin.getByRole("status")).toHaveText("Avance enviado.");
  await admin.getByRole("button", { name: "Enviar avance" }).click();
  await expect(admin.getByRole("status")).toHaveText("Ya enviaste el avance hace menos de 10 minutos.");

  const recibido = await esperarEmail(email, "Tu avance en syntaxError.cl");
  expect(recibido.texto).toContain("Nota del equipo: Prueba la pista 2.");
  expect(recibido.texto).toContain("Llevas varios intentos");
  await page.goto(rutaDelEnlace(recibido.texto, "/dashboard/avance"));
  const siguiente = page.getByRole("region", { name: "Qué sigue" });
  await expect(siguiente).toContainText("Llevas varios intentos");
  await expect(page.locator("main")).not.toContainText("fallidos");
});
