---
read_if:
  - adding or changing a wheel, tyre, rim or brake part
  - choosing whether a vehicle's wheels carry disc or drum brakes
  - consuming a vehicle's wheel or brake sites, such as a game that spins wheels or loots them
  - adding a brake size class
---

# 5. A wheel turns whole at its site, with a disc or drum brake in size classes on the hub

## Context

A wheel was one model, so a scavenger could take a whole wheel and nothing else. The parts a scavenger takes off a
corner, a tyre, a rim and the brake, had no rows. Engines met the same need with a core and salvageable
accessories in size classes (`docs/decisions/0004-assemblies.md`, "Decision"), and wheels follow it where they
can. A game turns a wheel's site as the vehicle rolls, and a placement has no parent, so a part at a site of its own
never turns with another site's part. Details thinner than the vehicle grain do not survive voxelizing: they thicken
to a voxel or close up, so lug nuts, tread and sidewall lettering wait for a finer grain.

## Decision

A wheel is a tyre on a rim, and a vehicle fits it as one model at its wheel site, so the tyre turns with the rim. The
tyre and the rim are rows of their own as well, drawn from the same pieces and together weighing what the wheel does,
so a game can yield them from a salvaged wheel. See `models/vehicles/wheels.libsonnet` and
`models/vehicles/wheel-kit.libsonnet`, `pair`.

A wheel's brake belongs to a size class, as an engine's accessories do, so a disc salvaged from one car fits another
of its size. See `models/vehicles/wheel-classes.libsonnet`. A class offers a disc brake, a drum brake or both, and each
vehicle chooses one per axle, because the same wheel is braked either way on different vehicles: a small car's rear
axle, a school bus, a trailer or a wartime truck runs drums where a modern saloon or coach runs discs. A class leaves
out a kind its wheels are not built for, so no disc is claimed to fit a wheel made only for drums.

Either kind is two parts at sites of their own, because a caliper or a backing plate turned with the wheel reads as
broken, and the brake stays on the hub when the wheel comes off. A drum brake's backing plate is fitted with its shoes
and wheel cylinder as one part, as a caliper carries its pads, since they come off the hub together; they are rows of
their own too, together weighing what it does, so a game can yield them from a salvaged one as from a wheel.

An axle whose wheels have no kit wheel keeps its drums in its own model. An axle under the kit's brakes is drawn
without them and is lighter by the kit's drums, so a vehicle braked by the kit's drums weighs what it did on drawn
ones.

## Consequences

A consumer keeps turning only the wheel site, and learns the brake's two sites to offer them as loot. A vehicle moved
from drawn drums to the kit's discs changes mass by the difference between the two. A test holds every fused part to
the rows a game yields from it, by mass and drawn pieces, each kind of brake to sites apart from the wheel's, and each
part of a corner to resting on another without cutting into any, since a part that floats or clips reads as broken;
see `tools/test/wheel-kit.test.mjs`.
