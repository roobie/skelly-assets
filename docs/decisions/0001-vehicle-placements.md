---
read_if:
  - placing a vehicle's parts, or adding a vehicle
  - consuming vehicle placements, such as Deadvox's blueprints or the showcase
  - changing what the placements file of a built vehicle holds
---

# 1. Vehicle placements are model data

## Context

A vehicle is built as separate part models, so something has to say which part sits where and which near-side
parts are reflected to the far side. Deadvox's blueprints said it, mixed with gameplay: what holds each part up, how
long it takes to remove, where cargo goes. The showcase also needs to assemble vehicles, and a second copy of the
positions would drift from the first.

## Decision

Placements belong to the models, beside the rows they place: each vehicle has a placements file in
`models/vehicles/`, written with `models/vehicles/site.libsonnet`. A site names the part model at it, its position in
the vehicle frame, and whether it is a mirrored far-side twin. Gameplay stays in the game: supports, service, cargo
spaces and item names are not placements.

Sites carry no rotation, because every part is authored in the vehicle frame's orientation. A far-side twin is its
near-side part reflected across the part's own centre plane, so one model serves both sides and the two can never
differ. Site ids are the names Deadvox's fittings use, with `_near` and `_far` for twins, so a blueprint can attach
its gameplay to a site by id and read the position from here instead of restating it.

The build writes each vehicle's placements into the pack of its root part, its first site, and the manifest lists
them. The body decides where a vehicle ships, so no second list selects vehicles into packs. A site may name a shared
part from another pack; a consumer that bundles the vehicle's pack bundles that pack too.

The build checks that every site names exactly one built model, at a point, once per vehicle, because it already
holds every built model; a separate CI step would only add wall clock time. See `tools/placements.mjs`,
`placementProblems`.

## Consequences

Deadvox's blueprints can consume the built placements and keep only gameplay keyed by site id. Changing a part's
place is a change to the model, and the showcase shows it.
