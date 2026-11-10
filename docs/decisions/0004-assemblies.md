---
read_if:
  - adding or changing an engine, a turret, a radiator or a fuel tank, or one of their fittings such as an
    alternator, a gun, a cooling fan or a filler neck
  - choosing whether a vehicle fits one of those parts fused or as an assembly
  - consuming a vehicle's engine, turret, radiator or fuel tank sites, such as Deadvox's salvage
  - adding a size class for one of those parts, or another part built as a core with fittings
---

# 4. Engines, turrets, radiators and fuel tanks are fused cores with salvageable fittings in size classes

## Context

An engine was one model, so scavenging a car yielded one heavy block and nothing smaller. The parts a scavenger
actually takes off an engine, the alternator, starter motor, air box, fuel pump and drive belt, had no rows, and a
game could not loot or swap them. A turret had the same problem: its guns, sight, periscopes, hatch and smoke
launchers are what a scavenger wants from it, and a gun is worth more as loot than any other part of a carrier.
A radiator and a fuel tank were each a block, though a scavenger takes the fan and hoses off one and the filler neck
and straps off the other.
Splitting every such part into its pieces costs models, sites and build time on every vehicle, while most vehicles
are scenery that is never taken apart.

## Decision

An engine, a turret, a radiator or a fuel tank is a core, what is only ever moved whole (the block and head; the
armoured shell, mask, mount and traverse gear; the radiator's core; the tank's body), plus fittings that are each a
row of their own. A fitting belongs to a size class, not to one
part, because the point of loot is that it fits elsewhere: every engine of one general size takes the same alternator,
so one salvaged from a saloon fits a jeep, and every turret of one class takes the same guns. A tank's straps hug
its own body, so they are rows of each tank rather than of its class. A class is content, so a larger class is an
entry beside the first rather than code. See `models/vehicles/engine-classes.libsonnet`,
`models/vehicles/turret-classes.libsonnet`, `models/vehicles/cooling-classes.libsonnet` and
`models/vehicles/fuel-tank-classes.libsonnet`, each beside the file of the parts it serves.

A fitting keeps the taxonomy of what it is once lifted off, not of the vehicle: a gun from a turret is a weapon, a
hatch is a vehicle part.

Each part also keeps a fused row, the core and its fittings drawn as one model, and a vehicle chooses per part which
to fit: fused at the core's site, or the core there and each fitting at its own site. The choice is a word in the
vehicle's placements, so a vehicle that matters for salvage gets the detail and the rest stay one model. The kits
share one way of building those rows and sites, so another kind of assembly is a drawing and a class, not new
fitting logic. See `models/vehicles/assembly.libsonnet`, `rows` and `sites`.

A vehicle that loses its engine to an electric drive loses every site the engine, radiator and tank kits can lay,
which each kit lists, so a new fitting cannot outlive the engine it serves. See
`models/vehicles/powertrain.libsonnet`.

Both choices are drawn from the same pieces, and the part's mass is the whole dressed part's, split so the core takes
what its fittings leave. A vehicle therefore looks and weighs the same either way, and switching its detail changes
what can be looted, never how it drives. The fittings are painted in the core's body paint, so a vehicle's paint
repaints the fused part and each salvaged fitting alike.

## Consequences

A consumer that knows only the `engine`, `turret`, `radiator` or `fuel_tank` site still gets a whole part from a fused vehicle and a bare core
from an assembled one; the fitting sites are new fittings it has to learn to offer them as loot. A test holds the
fused and assembled fittings of every kit's parts to the same mass and the same drawn pieces, and each fitting
to resting on the core without cutting into it or another fitting, since a part that floats or clips reads as broken;
see `tools/test/assembly-kits.test.mjs`. The vehicle grain closes gaps under a voxel and thickens thinner solids to
one, so a fitting such as a tank strap is drawn a voxel thick and against its core.
