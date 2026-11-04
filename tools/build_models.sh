#!/bin/bash
# Rebuild the models that have a source in models/ into assets/own/skelly. Needs node (26 or later) and, the first
# time, network access for `npm ci` and the pinned jsonnet binary (see tools/model/README.md).
# Usage: tools/build_models.sh [--out dir] [rowId ...]. After a rebuild that changes a GLB, update its sha256 in
# assets/manifest.json.
set -e
cd "$(dirname "$0")/model"
[ -d node_modules ] || npm ci --no-audit --no-fund
exec node build.mjs "$@"
