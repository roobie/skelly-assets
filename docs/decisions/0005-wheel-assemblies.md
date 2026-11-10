---
read_if:
  - adding or changing a wheel, tyre, rim, brake disc or caliper
  - choosing whether a vehicle fits its wheels with brakes
  - consuming a vehicle's wheel or brake sites, such as a game that spins wheels or loots them
  - adding a brake size class
---

# 5. A wheel turns whole at its site, with a brake in size classes on the hub

## Context

A wheel was one model, so a scavenger could take a whole wheel and nothing else. The parts a scavenger takes off a
corner, a tyre, a rim, a brake disc and a caliper, had no rows. Engines met the same need with a core and salvageable
accessories in size classes (`docs/decisions/0004-engine-assemblies.md`, "Decision"), and wheels follow it where they
can. A game turns a wheel's site as the vehicle rolls, and a placement has no parent, so a part at a site of its own
never turns with another site's part. Details thinner than the vehicle grain do not survive voxelizing: they thicken
to a voxel or close up, so lug nuts, tread and sidewall lettering wait for a finer grain.

## Decision

A wheel is a tyre on a rim, and a vehicle fits it as one model at its wheel site, so the tyre turns with the rim. The
tyre and the rim are rows of their own as well, drawn from the same pieces and together weighing what the wheel does,
so a game can yield them from a salvaged wheel. See `models/vehicles/wheels.libsonnet` and
`models/vehicles/wheel-kit.libsonnet`, `pair`.

A wheel's brake belongs to a size class, as an engine's accessories do, so a disc salvaged from one car fits another
of its size. See `models/vehicles/wheel-classes.libsonnet`. The disc and caliper sit at sites of their own, because a
caliper turned with the wheel reads as broken, and the brake stays on the hub when the wheel comes off. A truck axle
whose brakes are drums keeps them in the axle's own model; an axle drawn for disc brakes leaves the drums out and its
mass drops by the brakes' mass, so the truck weighs the same either way.

## Consequences

A consumer keeps turning only the wheel site, and learns the disc and caliper sites to offer them as loot. A vehicle
that gains brakes where its axle had none gains their mass. A test holds every wheel to its tyre's and rim's mass and
drawn pieces, the brake to sites apart from the wheel's, and each part of a corner to resting on another without
cutting into any, since a part that floats or clips reads as broken; see `tools/test/wheel-kit.test.mjs`.
