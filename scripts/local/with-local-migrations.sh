#!/usr/bin/env bash
# Run a command with the local-only bootstrap migrations present.
# The extra files live outside supabase/migrations so `supabase db push` can
# never see them. They are copied in for the duration of the command and removed
# on exit (including failures).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_MIGRATIONS="$ROOT/supabase/local/migrations"
MIGRATIONS="$ROOT/supabase/migrations"
copied=()

cleanup() {
  for file in "${copied[@]:-}"; do
    rm -f "$file"
  done
}
trap cleanup EXIT INT TERM

if [[ $# -eq 0 ]]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

shopt -s nullglob
for source in "$LOCAL_MIGRATIONS"/*.sql; do
  target="$MIGRATIONS/$(basename "$source")"
  if [[ -e "$target" ]]; then
    echo "Refusing to overwrite existing migration: $target" >&2
    exit 1
  fi
  cp "$source" "$target"
  copied+=("$target")
done

"$@"
