#!/usr/bin/env bash
# Safe production migration helper — uses drizzle-kit against DATABASE_URL_UNPOOLED.
set -euo pipefail
cd "$(dirname "$0")/.."
npx drizzle-kit migrate
