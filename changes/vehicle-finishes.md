---
type: breaking
---
Vehicle part rows that differed only in paint are merged: a taxi, a police car or a camper van now fits the shared
pressing, and the site that fits it names the paint in a new `finish`. Part models mark the materials that take paint,
as `paintable` slots in each part's `*.model.json` and `paintable` in each glTF material's extras. The release ships
the finish library as `finishes.json`, also the manifest's `finishes`: each finish's glTF material.

Upgrade:
- Apply `renames.json` to saved and authored part ids; the retired rows map to the shared pressing.
- Read `finish` from each site in `vehicles/<vehicle>.placements.json` and from fittings built on them, and when the
  vehicle is spawned put that finish's material from `finishes.json` in place of each material of that copy of the part
  marked `paintable`, never the rest of the part; a site without one keeps the part's own materials.
- Keep the paint with the copy of the part afterwards rather than with the vehicle or the model.
