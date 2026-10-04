import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { esperarEmail, rutaDelEnlace } from "./mailpit";
import { aprobarEntregable, entrarComoAdmin } from "./revision";

const CLAVE = "clave-segura-123";

function emailNuevo(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
}

async function registrarse(page: Page, email: string, nombre = "Josefa Morales") {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(CLAVE);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function entrar(page: Page, email: string, clave: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

function seccion(page: Page, titulo: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: titulo, exact: true }) });
}

test("al registrarse llega el email de confirmación y el enlace confirma la cuenta", async ({ page }) => {
  const email = emailNuevo("verifica");
  await registrarse(page, email);
  await expect(page.getByText("Confirma tu email:")).toBeVisible();

  const mensaje = await esperarEmail(email, "Confirma tu email");
  await page.goto(rutaDelEnlace(mensaje.texto, "/verificar-email"));
  await page.getByRole("button", { name: "Confirmar email" }).click();
  await expect(page.getByText("Tu email quedó confirmado.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Reenviar email" })).toHaveCount(0);
});

test("completar el caso emite el certificado, se verifica en público y aparece en el portafolio", async ({ page, ip, nuevaPagina }) => {
  const email = emailNuevo("certificado");
  await registrarse(page, email);

  const tareas = [
    ["01-clientes-de-regiones", "clientes-fuera-de-santiago"],
    ["02-total-de-ventas", "total-marzo"],
    ["03-ticket-promedio", "ticket-promedio"],
  ];
  for (const [mision, tarea] of tareas) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "demo-motor", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }

  await page.goto("/casos/demo-motor");
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/josefa/demo-motor");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);
  await page.reload();
  await page.getByRole("link", { name: /Ver certificado de caso/ }).click();
  await expect(page.getByText("Josefa Morales")).toBeVisible();
  const codigo = new URL(page.url()).pathname.split("/").pop();
  expect(codigo).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);

  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar PDF" }).click()]);
  expect(pdf.suggestedFilename()).toBe(`certificado-${codigo}.pdf`);
  const rutaPdf = await pdf.path();
  expect(rutaPdf).toBeTruthy();
  expect(readFileSync(rutaPdf!).subarray(0, 5).toString()).toBe("%PDF-");

  await page.goto(`/verificar/${codigo}`);
  await expect(page.getByRole("heading", { name: "Certificado válido" })).toBeVisible();
  await expect(page.getByText("Demo del motor: ventas de marzo", { exact: true })).toBeVisible();
  await esperarEmail(email, "Obtuviste un certificado");

  const usuario = `josefa-${Date.now()}`;
  await page.goto("/perfil");
  const portafolio = seccion(page, "Portafolio público");
  await portafolio.getByLabel("Hacer público mi portafolio").check();
  await portafolio.getByLabel("Tu usuario").fill(usuario);
  await portafolio.getByRole("button", { name: "Guardar portafolio" }).click();
  await expect(portafolio.getByText("Portafolio guardado.")).toBeVisible();

  await page.goto(`/p/${usuario}`);
  await expect(page.getByRole("heading", { name: "Josefa Morales" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver entregable" })).toHaveAttribute("href", "https://github.com/josefa/demo-motor");
});

test("cambiar el email pide confirmación desde el correo nuevo y avisa al anterior", async ({ page }) => {
  const email = emailNuevo("antes");
  const nuevo = emailNuevo("despues");
  await registrarse(page, email);

  await page.goto("/perfil");
  const cambio = seccion(page, "Cambiar email");
  await cambio.getByLabel("Nuevo email").fill(nuevo);
  await cambio.getByLabel("Contraseña actual").fill(CLAVE);
  await cambio.getByRole("button", { name: "Enviar confirmación" }).click();
  await expect(cambio.getByText(`Te enviamos un enlace a ${nuevo}.`, { exact: false })).toBeVisible();

  await esperarEmail(email, "Pidieron cambiar el email de tu cuenta");
  const confirmacion = await esperarEmail(nuevo, "Confirma tu nuevo email");
  await page.goto(rutaDelEnlace(confirmacion.texto, "/confirmar-email"));
  await page.getByRole("button", { name: "Confirmar nuevo email" }).click();
  await expect(page.getByText("Tu email cambió.", { exact: false })).toBeVisible();

  await page.context().clearCookies();
  await entrar(page, nuevo, CLAVE);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("cambiar la contraseña y después eliminar la cuenta", async ({ page }) => {
  const email = emailNuevo("borrar");
  await registrarse(page, email);

  await page.goto("/perfil");
  const clave = seccion(page, "Cambiar contraseña");
  await clave.getByLabel("Contraseña actual").fill(CLAVE);
  await clave.getByLabel("Contraseña nueva").fill("otra-clave-456");
  await clave.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(clave.getByText("Tu contraseña cambió.")).toBeVisible();
  await esperarEmail(email, "Tu contraseña fue actualizada");

  const eliminar = seccion(page, "Eliminar cuenta");
  await eliminar.getByLabel("Escribe tu contraseña para confirmar").fill("otra-clave-456");
  await eliminar.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await esperarEmail(email, "Tu cuenta fue eliminada");

  await entrar(page, email, "otra-clave-456");
  await expect(page.getByText("Email o password incorrectos.")).toBeVisible();
});

test("un código que no existe no se verifica", async ({ page }) => {
  await page.goto("/verificar/NoExiste2345");
  await expect(page.getByRole("heading", { name: "Código no encontrado" })).toBeVisible();
});

test("recuperar la contraseña desde el login", async ({ page }) => {
  const email = emailNuevo("olvido");
  await registrarse(page, email);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByText("Si hay una cuenta con ese email", { exact: false })).toBeVisible();

  const mensaje = await esperarEmail(email, "Restablece tu contraseña");
  await page.goto(rutaDelEnlace(mensaje.texto, "/restablecer-clave"));
  await page.getByLabel("Contraseña nueva").fill("recuperada-789");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Tu contraseña quedó guardada.")).toBeVisible();

  await entrar(page, email, "recuperada-789");
  await expect(page).toHaveURL(/\/dashboard/);
});
