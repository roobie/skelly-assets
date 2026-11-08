#!/bin/bash
# Rebuild the 3D mobs (a GLB and a clips JSON each) from the rows in models/mobs.json into built/, with the mobgen
# package in tools/packages. Needs node (26 or later) and, the first time, network access for `npm ci` (see
# tools/README.md).
# Usage: tools/build_mobs.sh [--out dir] [mobId ...]
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci --no-audit --no-fund
exec node mobs.mjs "$@"
