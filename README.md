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
| `npm run sh` | Shell dentro del contenedor de herramientas (`pnpm`, `tsc`, etc.) |
| `npm run db:generate` | Genera una migración Drizzle a partir de `packages/db/src/schema.ts` |

## URLs locales

- Sitio: http://localhost:3000 (admin: `admin@local.test` / `admin123456`)
- Emails (Mailpit): http://localhost:8025
- Worker: http://localhost:4001/health

## Agregar un paquete al monorepo

Agrega su volumen `node_modules` en `x-node.volumes` de `docker-compose.yml` y en `volumes:`. Luego corre `docker compose run --rm tools pnpm install`.
