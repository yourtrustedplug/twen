#!/usr/bin/env bash
# Start the local Supabase stack (Colima-backed if Docker Desktop is absent).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return
  fi
  if command -v colima >/dev/null 2>&1; then
    echo "Docker is not running; starting Colima..."
    colima start --cpu 2 --memory 4 --disk 20
  else
    echo "Docker is not running and Colima is not installed." >&2
    echo "Install Docker Desktop or run: brew install colima docker" >&2
    exit 1
  fi
}

ensure_docker

if ! supabase status >/dev/null 2>&1; then
  echo "Starting local Supabase (first boot applies the migration chain)..."
  # Start from a clean volume if a previous interrupted boot left a half schema.
  supabase stop --no-backup >/dev/null 2>&1 || true
  # Colima cannot mount its host docker.sock into Supabase's vector container.
  # Vector/logflare only collect local logs; auth, REST, storage, and edge
  # functions are unaffected, so exclude them for this harness.
  ./scripts/local/with-local-migrations.sh supabase start -x vector -x logflare --ignore-health-check
else
  echo "Local Supabase is already running."
fi

node scripts/local/write-env.mjs
node scripts/local/seed.mjs
