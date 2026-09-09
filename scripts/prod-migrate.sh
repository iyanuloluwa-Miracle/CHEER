#!/usr/bin/env bash
# Safe production migration helper — never use `prisma migrate dev` here.
set -euo pipefail
cd "$(dirname "$0")/.."
npx prisma migrate deploy
