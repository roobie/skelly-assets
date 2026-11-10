---
read_if:
  - adding or changing an engine or a turret, or one of their fittings such as an alternator, a gun or a hatch
  - choosing whether a vehicle fits its engine or turret fused or as an assembly
  - consuming a vehicle's engine or turret sites, such as Deadvox's salvage
  - adding an engine or turret size class, or another part built as a core with fittings
---

# 4. Engines and turrets are fused cores with salvageable fittings in size classes

## Context

An engine was one model, so scavenging a car yielded one heavy block and nothing smaller. The parts a scavenger
actually takes off an engine, the alternator, starter motor, air box, fuel pump and drive belt, had no rows, and a
game could not loot or swap them. A turret had the same problem: its guns, sight, periscopes, hatch and smoke
launchers are what a scavenger wants from it, and a gun is worth more as loot than any other part of a carrier.
Splitting every such part into its pieces costs models, sites and build time on every vehicle, while most vehicles
are scenery that is never taken apart.

## Decision

An engine or a turret is a core, what is only ever moved whole (the block and head; the armoured shell, mask, mount
and traverse gear), plus fittings that are each a row of their own. A fitting belongs to a size class, not to one
part, because the point of loot is that it fits elsewhere: every engine of one general size takes the same alternator,
so one salvaged from a saloon fits a jeep, and every turret of one class takes the same guns. A class is content, so
a larger class is an entry beside the first rather than code. See `models/vehicles/engine-classes.libsonnet`,
`models/vehicles/engines.libsonnet`, `models/vehicles/turret-classes.libsonnet` and
`models/vehicles/turrets.libsonnet`.

A fitting keeps the taxonomy of what it is once lifted off, not of the vehicle: a gun from a turret is a weapon, a
hatch is a vehicle part.

Each part also keeps a fused row, the core and its fittings drawn as one model, and a vehicle chooses per part which
to fit: fused at the core's site, or the core there and each fitting at its own site. The choice is a word in the
vehicle's placements, so a vehicle that matters for salvage gets the detail and the rest stay one model. Both kits
share one way of building those rows and sites, so a third kind of assembly is a drawing and a class, not new
fitting logic. See `models/vehicles/assembly.libsonnet`, `rows` and `sites`.

Both choices are drawn from the same pieces, and the part's mass is the whole dressed part's, split so the core takes
what its fittings leave. A vehicle therefore looks and weighs the same either way, and switching its detail changes
what can be looted, never how it drives. The fittings are painted in the core's body paint, so a vehicle's paint
repaints the fused part and each salvaged fitting alike.

## Consequences

A consumer that knows only the `engine` or `turret` site still gets a whole part from a fused vehicle and a bare core
from an assembled one; the fitting sites are new fittings it has to learn to offer them as loot. A test holds the
fused and assembled fittings of every engine and turret to the same mass and the same drawn pieces, and each fitting
to resting on the core without cutting into it or another fitting, since a part that floats or clips reads as broken;
see `tools/test/assembly-kits.test.mjs`.
