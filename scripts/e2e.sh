#!/bin/sh
# Corre los e2e contra el build de producción (next build + next start), que es lo que se publica.
# Contra `next dev` la suite completa falla al azar: con muchas misiones, compilar al vuelo y 3 navegadores
# en paralelo satura el servidor (ECONNRESET, páginas que no responden). Para una prueba suelta en desarrollo
# está `npm run test:e2e:dev`.
#
# Al terminar deja `web` otra vez en modo desarrollo, para seguir trabajando con recarga en vivo.
# Los argumentos se pasan a Playwright: npm run test:e2e -- tests/despachos.spec.ts
set -u
BASE="${COMPOSE_FILE:-docker-compose.yml}"
PRODUCCION="$BASE:docker/compose.prod-check.yml"

COMPOSE_FILE="$PRODUCCION" docker compose up -d --force-recreate --wait web || exit 1
if [ "$#" -gt 0 ]; then
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e npx playwright test "$@"
else
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e
fi
estado=$?
COMPOSE_FILE="$BASE" docker compose up -d --force-recreate web >/dev/null 2>&1
exit $estado
