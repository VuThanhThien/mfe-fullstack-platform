#!/bin/sh
set -eu

echo "[entrypoint] waiting for postgres (${DATABASE_HOST:-db}:${DATABASE_PORT:-5432})..."
i=0
until node -e "const n=require('net');const s=n.connect({host:process.env.DATABASE_HOST||'db',port:Number(process.env.DATABASE_PORT||5432)},()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[entrypoint] postgres not ready after 60s" >&2
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] waiting for redis (${REDIS_HOST:-redis}:${REDIS_PORT:-6379})..."
i=0
until node -e "const n=require('net');const s=n.connect({host:process.env.REDIS_HOST||'redis',port:Number(process.env.REDIS_PORT||6379)},()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[entrypoint] redis not ready after 60s" >&2
    exit 1
  fi
  sleep 1
done

# env-cmd requires a file; --no-override keeps Compose-injected DATABASE_HOST=db etc.
run_with_env() {
  pnpm exec env-cmd -f .env.example --no-override "$@"
}

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] running migrations..."
  run_with_env pnpm exec typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run
fi

if [ "${RUN_SEEDS:-true}" = "true" ]; then
  echo "[entrypoint] running seeds..."
  run_with_env pnpm exec ts-node ./node_modules/typeorm-extension/bin/cli.cjs seed:run
fi

echo "[entrypoint] starting: $*"
exec "$@"
