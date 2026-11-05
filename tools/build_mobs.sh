#!/bin/bash
# Rebuild the 3D mobs of the --mobs-3d layer (a GLB and a clips JSON each) from the rows in models/mobs.json into
# assets/own/skelly, with the mobgen package copied into tools/model. Needs node (26 or later) and, the first time,
# network access for `npm ci` (see tools/model/README.md).
# Usage: tools/build_mobs.sh [--out dir] [mobId ...]. After a rebuild that changes a file, update its sha256 in
# assets/manifest.json.
set -e
cd "$(dirname "$0")/model"
[ -d node_modules ] || npm ci --no-audit --no-fund
exec node mobs.mjs "$@"
