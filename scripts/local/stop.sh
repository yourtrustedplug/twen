#!/usr/bin/env bash
# Stop local Supabase. Keeps local data by default; use local:reset to wipe it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

supabase stop
