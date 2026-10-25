#!/usr/bin/env bash
# Build the extension, rebuild on change, and run it in Microsoft Edge with auto-reload.
# Extra arguments go to web-ext, e.g. `pnpm dev:edge --start-url https://example.com`.
set -euo pipefail

cd "$(dirname "$0")/.."

EDGE_BINARY="${EDGE_BINARY:-/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge}"
# Dedicated profile: keeps extension settings between runs and doesn't clash with your normal Edge window
PROFILE_DIR="${EDGE_PROFILE_DIR:-.edge-dev-profile}"

if [[ ! -x "$EDGE_BINARY" ]]; then
  echo "Microsoft Edge not found at: $EDGE_BINARY (set EDGE_BINARY to override)" >&2
  exit 1
fi

# Full build first so Edge starts with a complete dist/
pnpm run build

# Stop the watchers when Edge closes or on Ctrl+C
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

pnpm exec vite build --watch --mode development --logLevel warn &
pnpm exec vite build -c vite.config.content.ts --watch --mode development --logLevel warn &

mkdir -p "$PROFILE_DIR"
pnpm exec web-ext run \
  --source-dir dist \
  --target chromium \
  --chromium-binary "$EDGE_BINARY" \
  --chromium-profile "$PROFILE_DIR" \
  --keep-profile-changes \
  "$@"
