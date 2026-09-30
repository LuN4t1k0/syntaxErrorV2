# syntaxError.cl v2

Academia gratuita para conseguir tu primer trabajo en tecnología. Spec: `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`.

## Requisitos

Solo Docker (con Compose v2.24+) y npm. Todo lo demás corre en contenedores.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta todo (Postgres, Redis, Mailpit, migraciones y seed, web y worker) y muestra los logs. Ctrl+C sale de los logs; los servicios siguen arriba |
| `npm run stop` | Baja todo y conserva los datos |
| `npm run reset` | Baja todo y borra los datos (base, `node_modules`) |
| `npm test` | Tests unitarios y de integración contra `postgres-test` |
| `npm run test:e2e` | Tests end-to-end con Playwright (requiere `npm run dev` arriba) |
| `npm run test:e2e:prod` | Compila `web` como en producción (CSP real, páginas estáticas) y corre los e2e contra ese build |
| `npm run sh` | Shell dentro del contenedor de herramientas (`pnpm`, `tsc`, etc.) |
| `npm run db:generate` | Genera una migración Drizzle a partir de `packages/db/src/schema.ts` |
| `npm run content:validate` | Valida `content/`: schemas, tareas prácticas, briefs, entregable declarado y que cada solución pase su motor |

## URLs locales

- Sitio: http://localhost:3000 (admin: `admin@local.test` / `admin123456`)
- Emails (Mailpit): http://localhost:8025
- Worker: http://localhost:4001/health

## Agregar un paquete al monorepo

Agrega su volumen `node_modules` en `x-node.volumes` de `docker-compose.yml` y en `volumes:`. Luego corre `docker compose run --rm tools pnpm install`.

## Escribir un caso

Un caso es contenido, no código:

```text
content/
  rutas/<ruta>.yaml
  casos/<caso>/
    caso.yaml
    datos/<tabla>.csv
    misiones/<mision>.mdx
```

Bloques disponibles: `Brief`, `Concepto`, `SqlEjemplo`, `PythonEjemplo`, `SqlTask`, `SheetTask`, `PythonTask`, `Decision` y `Debrief`. El caso `content/casos/demo-motor` usa todos.

- En desarrollo se ven también las rutas en `borrador` (`CONTENT_INCLUDE_DRAFTS=true`).
- `db-setup` sincroniza rutas y casos con la base en cada `npm run dev`.
- El build de `web` corre `content:validate` primero y falla si algo no cumple.
- El validador ejecuta soluciones de Python con Pyodide y descarga pandas desde jsDelivr la primera vez, así que necesita red.

## Emails, cuenta y certificados

- Los emails los manda el worker desde la cola `emails` (BullMQ). En local salen por SMTP a Mailpit: ábrelos en http://localhost:8025. En producción, con `RESEND_API_KEY`, salen por la API de Resend.
- Al registrarse llega un email para confirmar la cuenta. En `/perfil` se cambia el nombre, el email (con confirmación desde el correo nuevo) y la contraseña, se descargan los datos y se elimina la cuenta.
- Al completar un caso (todas sus misiones y el entregable) se emite su certificado; al completar todos los casos de una ruta, el de la ruta. Se ven en `/certificados/<código>`, se imprimen o guardan en PDF desde el navegador y cualquiera los verifica en `/verificar/<código>`, que también busca los certificados migrados de la v1.
- El portafolio público (`/p/<usuario>`) parte apagado. Cada alumna lo publica desde su perfil.
