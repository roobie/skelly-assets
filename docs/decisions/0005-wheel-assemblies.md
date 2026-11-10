---
read_if:
  - adding or changing a wheel, tyre, rim, brake disc or caliper
  - choosing whether a vehicle fits its wheels fused or as an assembly, or with brakes
  - consuming a vehicle's wheel or brake sites, such as a game that spins wheels or loots them
  - adding a brake size class
---

# 5. A wheel is a tyre on a rim, with a brake in size classes on the hub

## Context

A wheel was one model, so a scavenger could take a whole wheel and nothing else. The parts a scavenger takes off a
corner, a tyre, a rim, a brake disc and a caliper, had no rows. Engines met the same need with a fused core and
salvageable accessories in size classes (`docs/decisions/0004-engine-assemblies.md`, "Decision"), and wheels follow
it so a game learns one pattern. Details thinner than the vehicle grain do not survive voxelizing: they thicken to a
voxel or close up, so lug nuts, tread and sidewall lettering wait for a finer grain.

## Decision

A wheel is a tyre and a rim, keyed by the id of its fused row, and a vehicle chooses per wheel pair whether to fit
the fused row or the rim and the tyre at sites of their own. Both are drawn from the same pieces and the fused row
weighs what its parts do, so the choice changes what can be looted, never how the vehicle drives. See
`models/vehicles/wheels.libsonnet` and `models/vehicles/wheel-kit.libsonnet`, `pair`.

A wheel's brake belongs to a size class, as an engine's accessories do, so a disc salvaged from one car fits another
of its size. See `models/vehicles/wheel-classes.libsonnet`. The disc and caliper always sit at sites of their own,
even beside a fused wheel, because a game turns a wheel's site as the vehicle rolls and a caliper turned with it
reads as broken; the brake also stays on the hub when the wheel comes off. A truck axle whose brakes are drums keeps
them in the axle's own model; an axle drawn for disc brakes leaves the drums out and its mass drops by the brakes'
mass, so the truck weighs the same either way.

## Consequences

A consumer that knows only the wheel site still gets a whole wheel from a fused fitting and a bare rim from an
assembled one; the tyre, disc and caliper sites are new fittings it has to learn, and only the wheel's site should
turn. A vehicle that gains brakes where its axle had none gains their mass. A test holds both fittings of every wheel
to the same mass and drawn pieces, and each part of an assembled corner to resting on another without cutting into
any, since a part that floats or clips reads as broken; see `tools/test/wheel-kit.test.mjs`.
