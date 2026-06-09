#!/usr/bin/env bash
# SessionStart hook: make a fresh web/CI session immediately able to run tests
# and linters. Idempotent and fast on warm checkouts.
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ ! -d node_modules ]; then
  echo "[session-start] installing dependencies…"
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

# Generate the Prisma client so typecheck/tests resolve @prisma/client.
npx prisma generate >/dev/null 2>&1 || true

echo "[session-start] ready. Run: npm run typecheck && npm run test"
