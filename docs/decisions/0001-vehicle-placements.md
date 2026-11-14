---
read_if:
  - placing a vehicle's parts, or adding a vehicle
  - consuming vehicle placements, such as Deadvox's blueprints or the showcase
  - changing what the placements file of a built vehicle holds
  - placing a part from another pack, or declaring a pack's dependencies
  - tagging a vehicle
  - adding an electric, hybrid or other powertrain variant of a vehicle
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
the vehicle, and whether it is a mirrored far-side twin. Gameplay stays in the game: supports, service, cargo
spaces and item names are not placements.

A part that moves with another part, such as the free panel of a folding door, names the carrier's site as `rides`;
see `docs/decisions/0015-motion-as-content.md`.

Sites carry no rotation, because every part is authored in its vehicle's orientation, and the build turns a
vehicle's sites by the same turn as its parts; see `docs/decisions/0002-model-frame.md`. A far-side twin is its
near-side part reflected across the part's own centre plane, so one model serves both sides and the two can never
differ. Site ids are the names Deadvox's fittings use, with `_near` and `_far` for twins, so a blueprint can attach
its gameplay to a site by id and read the position from here instead of restating it.

A vehicle's placements belong to the vehicle, so they ship in the vehicle's own pack: the pack that builds the rows
of its own file. A body can serve vehicles in several packs, and following the body would drag every vehicle built on
it into the body's pack; following the vehicle keeps a shared body correct. See `tools/placements.mjs`,
`exportPlacements`.

A powertrain variant, such as the electric or hybrid build of a vehicle, shares its parent's build: the few parts of
its own are pressed in the parent's file and every other part is the parent's. So it shares its parent's pack and
sites. Its placements file names the parent and states only the sites its powertrain changes, the way Deadvox derives
the variant's blueprint from the parent's, and it carries the parent's tags; restating the parent's sites would let
the two drift apart. A variant whose parent is unknown would have nowhere to ship, so the build refuses it. See
`models/vehicles/site.libsonnet`, `variants`, and `tools/placements.mjs`, `parentProblems`.

A vehicle may place a part from another pack only when its pack declares a dependency on that pack in
`models/packs.json`; parts are never copied between packs. A copy drifts from its source without anyone noticing,
while a declared dependency fails loudly: the build refuses a reference its pack does not declare, a dependency on a
pack that does not exist and a dependency cycle. The manifest carries each pack's dependencies, so a consumer such as
Deadvox can refuse to load a pack without them. See `tools/packs.mjs`, `dependencyProblems`.

A vehicle's tags are its body's tags with any the vehicle adds, each term once. One body serves several roles, such as
a van that is also an ambulance, so the body's tags cannot say everything a vehicle is. The added tags are held to the
taxonomy vocabulary like any model's.

The build checks all of this, and that every site names exactly one built model, at a point, once per vehicle, because
it already holds every built model; a separate CI step would only add wall clock time. See `tools/placements.mjs`,
`placementProblems`.

## Consequences

Deadvox's blueprints can consume the built placements and keep only gameplay keyed by site id. Changing a part's
place is a change to the model, and the showcase shows it.
