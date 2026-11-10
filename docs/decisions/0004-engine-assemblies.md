---
read_if:
  - adding or changing an engine, or an engine accessory such as an alternator or starter motor
  - choosing whether a vehicle fits its engine fused or as an assembly
  - consuming a vehicle's engine sites, such as Deadvox's salvage
  - adding an engine size class
---

# 4. An engine is a fused core with salvageable accessories in size classes

## Context

An engine was one model, so scavenging a car yielded one heavy block and nothing smaller. The parts a scavenger
actually takes off an engine, the alternator, starter motor, air box, fuel pump and drive belt, had no rows, and a
game could not loot or swap them. Splitting every engine into its parts costs models, sites and build time on every
vehicle, while most vehicles are scenery that is never taken apart.

## Decision

An engine is a core, the block, head, sump and manifolds that are only ever moved whole, plus accessories that are
each a row of their own. An accessory belongs to a size class, not to an engine, because the point of loot is that it
fits elsewhere: every engine of one general size takes the same alternator, so one salvaged from a saloon fits a
jeep. A class also names its radiator, which was already a row. A class is content, so a larger class is an entry
beside the first rather than code. See `models/vehicles/engine-classes.libsonnet` and
`models/vehicles/engines.libsonnet`.

Each engine also keeps a fused row, the core and its accessories drawn as one model, and a vehicle chooses per engine
which to fit: fused at the `engine` site, or the core there and each accessory at its own site. The choice is a word
in the vehicle's placements, so a vehicle that matters for salvage gets the detail and the rest stay one model. See
`models/vehicles/engine-kit.libsonnet`, `sites`.

Both choices are drawn from the same pieces, and the engine's mass is the whole dressed engine's, split so the core
takes what its accessories leave. A vehicle therefore looks and weighs the same either way, and switching its detail
changes what can be looted, never how it drives.

## Consequences

A consumer that knows only the `engine` site still gets a whole engine from a fused vehicle and a bare core from an
assembled one; the accessory sites are new fittings it has to learn to offer them as loot. A test holds the fused and
assembled fittings of every engine to the same mass and the same drawn pieces; see `tools/test/engine-kit.test.mjs`.
