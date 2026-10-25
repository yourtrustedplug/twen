#!/usr/bin/env bash
# Wipe and rebuild only the local Supabase database, then seed test accounts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

./scripts/local/start.sh

echo "Resetting local database from migrations..."
./scripts/local/with-local-migrations.sh supabase db reset --local --yes
node scripts/local/write-env.mjs
node scripts/local/seed.mjs
