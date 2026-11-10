---
read_if:
  - adding or changing an exhaust or one of its parts, such as a catalytic converter or a muffler
  - choosing whether a vehicle fits its exhaust fused or as its parts
  - consuming a vehicle's exhaust sites, such as a game that loots them
  - adding an exhaust size class
---

# 7. An exhaust splits along its run into pipes and salvageable parts in size classes

## Context

After the wheels, an exhaust was among the most visible blocks left on an exploded vehicle: a pipe and a box. A
scavenger strips a catalytic converter for its metal and takes a muffler, and neither had a row. Engines, radiators
and fuel tanks meet the same need as a core with fittings (`docs/decisions/0004-assemblies.md`, "Decision"), but an
exhaust has no core: every part of it is a stretch of one run, and a pipe is only as long as its vehicle's run.

## Decision

An exhaust runs along axis-aligned legs from the engine's manifold to its tail, and is cut where its converter and
muffler sit: a front pipe up to the converter, a mid pipe to the muffler and a tailpipe behind it. The converter and
muffler belong to a size class, so one salvaged from a car fits another car but not a truck; the pipes follow their
own vehicle's run, so they are rows of each exhaust, and they take the mass the class's parts leave, spread by
length. A truck's class has no converter, since it burns diesel. See `models/vehicles/exhaust-classes.libsonnet`
and `models/vehicles/exhausts.libsonnet`.

A vehicle fits an exhaust fused, one model at its site, or as its parts, each at a site of its own, with the same
choice and the same guarantees as an assembly: both are drawn from the same pieces and weigh the same. A car's
exhaust is drawn for its car's engine bay, so one fitted fused to vehicles whose engines differ runs flat under the
floor instead. See `models/vehicles/exhaust-kit.libsonnet`, `sites`.

The vehicle grain closes gaps under a voxel and thickens thinner solids to one, so a heavy muffler's heat shield sits
against its can.

## Consequences

A consumer learns the new sites to offer the parts as loot; a vehicle fitted fused keeps its `exhaust` site. A test
holds every exhaust to the same mass and drawn pieces either way and its parts to meeting end to end along its run
without cutting into each other; see `tools/test/exhaust-kit.test.mjs`. A vehicle that loses its engine loses its
exhaust sites too; see `models/vehicles/powertrain.libsonnet`.
