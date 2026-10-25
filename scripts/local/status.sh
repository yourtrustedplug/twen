#!/usr/bin/env bash
# Show local Supabase URLs/keys.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

supabase status
