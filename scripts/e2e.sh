#!/bin/sh
# Corre los e2e contra las imágenes de producción (docker/compose.prod.yml), que son las que se publican.
# Contra `next dev` la suite completa falla al azar: con muchas misiones, compilar al vuelo y 3 navegadores
# en paralelo satura el servidor (ECONNRESET, páginas que no responden). Para una prueba suelta en desarrollo
# está `npm run test:e2e:dev`.
#
# Al terminar deja `web` y `worker` otra vez en modo desarrollo, para seguir trabajando con recarga en vivo.
# Los argumentos se pasan a Playwright: npm run test:e2e -- tests/despachos.spec.ts
set -u
BASE="${COMPOSE_FILE:-docker-compose.yml}"
PRODUCCION="$BASE:docker/compose.prod.yml"

COMPOSE_FILE="$PRODUCCION" docker compose up -d --build --force-recreate --wait web worker || exit 1
if [ "$#" -gt 0 ]; then
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e npx playwright test "$@"
else
  COMPOSE_FILE="$PRODUCCION" docker compose --profile e2e run --rm e2e
fi
estado=$?
COMPOSE_FILE="$BASE" docker compose up -d --force-recreate web worker >/dev/null 2>&1
exit $estado
