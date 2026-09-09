#!/usr/bin/env sh
# Safe production migration — never runs reset/dev.
set -eu
cd "$(dirname "$0")/../apps/api"
echo "Running prisma migrate deploy (non-destructive)…"
npx prisma migrate deploy
echo "Migrations complete."
