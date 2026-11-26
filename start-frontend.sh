#!/usr/bin/env bash
# Runs the React development server on http://localhost:5173 (proxies /api to :8080).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
exec npm run dev
