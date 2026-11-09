---
read_if:
  - painting a vehicle, or giving a vehicle site a finish
  - consuming vehicle placements or part models and applying their paint
  - adding a vehicle part that is painted, or one that should never be
  - adding a vehicle row that differs from another only in its colour
---

# 3. A vehicle site seeds its part's paint, and the part holds it

## Context

Vehicles that share a pressing, such as a taxi built on a saloon, each had their own row of it so each could have its
own colour. The rows drew the same shape and differed only in paint, so every colour cost another model in the packs,
and a game could not tell that a taxi's door and a saloon's door are the same part. A part moved from one vehicle to
another, such as a door salvaged from a wreck, also has to keep its colour: the colour belongs to that copy of the part,
not to the vehicle it came from or to the model.

## Decision

The site that fits a part may name a finish: the paint that copy of the part starts with when its vehicle is spawned.
From then on the copy owns its paint, so a door moved to another vehicle keeps the colour it had, and repainting one
copy changes no other. The site is a starting point and not a binding, because a binding would recolour the door to its
new vehicle's paint, and a per-model colour would paint every vehicle's copy alike. A site without a finish leaves the
part in its own authored materials, so a vehicle can still be modelled in its colours without placements.

Only materials that the part model marks as paintable take the finish. The mark is authored with the part, by whoever
knows which surfaces are body paint, and it is exported with the model, so a consumer never has to guess from material
names. Tyres, glass and chrome are never marked, because a body colour on them would be wrong on every vehicle. Paint is
cosmetic only: it changes no mass, strength or collision, so swapping a finish can never change how a vehicle behaves.
See `tools/packages/thing-authoring-tool/src/catalogue.ts`, `buildPart`, and `models/vehicles/kit.libsonnet`,
`paintable`.

A finish names an entry in the finish library, the same library every model's materials come from, so a mod adds a
paint by adding a library entry and the build refuses a name that has none. See `tools/placements.mjs`,
`siteProblems`.

Rows that differ only in paint are merged into one, and the vehicles that used them borrow it with their colour moved
onto their sites. The vehicle's own former paint stays in its spec, so the borrowing vehicle still states its colour in
one place, and the borrowing fittings take it from there. See `models/vehicles/kit.libsonnet`, `painted`. Each retired
id goes into the rename map so a consumer can follow it; see `changes/README.md`.

## Consequences

A consumer reads a site's finish and applies it only to the marked materials of that copy of the part, then keeps the
paint with the copy. Placing the same part in another colour costs a site line, not a model. Vehicles specified with
borrowing switched off must look the same as the merged ones, and a test holds the two to that; see
`tools/test/vehicle-paint.test.mjs`.
