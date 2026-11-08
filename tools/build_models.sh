#!/bin/bash
# Rebuild the models that have a source in models/ into built/. Needs node (26 or later) and, the first time, network
# access for `npm ci` and the pinned jsonnet binary (see tools/README.md).
# Usage: tools/build_models.sh [--out dir] [rowId ...]
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci --no-audit --no-fund
exec node build.mjs "$@"
