---
type: breaking
---
Vehicle part rows that differed only in paint are merged: a taxi, a police car or a camper van now fits the shared
pressing, and the site that fits it names the paint in a new `finish`. Part models mark the materials that take paint,
as `paintable` slots in the manifest and `paintable` in each glTF material's extras.

Upgrade:
- Apply `renames.json` to saved and authored part ids; the retired rows map to the shared pressing.
- Read `finish` from each site in `vehicles/<vehicle>.placements.json` and from fittings built on them, and give that
  copy of the part the finish library's material when the vehicle is spawned; a site without one keeps the part's own
  materials.
- Apply a finish only to materials marked `paintable`, never to the rest of the part, and keep the paint with the copy
  of the part afterwards rather than with the vehicle or the model.
