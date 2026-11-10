---
read_if:
  - adding or changing an exhaust, fuel tank or radiator, or one of their parts
  - choosing whether a vehicle fits its exhaust, fuel tank and radiator fused or as assemblies
  - consuming a vehicle's exhaust, fuel tank or cooling sites, such as a game that loots them
  - adding an exhaust, fuel tank or cooling size class
---

# 6. An exhaust, a fuel tank and a radiator split into salvageable parts in size classes

## Context

After the wheels, an exhaust, a fuel tank and a radiator were the most visible blocks left on an exploded vehicle:
a pipe and a box, a box, and a slab. A scavenger strips a converter for its metal, a muffler, a filler neck, a fan
and hoses, and none had a row. Engines and wheels met the same need with salvageable parts in size classes
(`docs/decisions/0004-engine-assemblies.md`, "Decision"), and these follow them. None of these parts moves, so each
can sit at a plain site. The vehicle grain closes gaps under a voxel and thickens thinner solids to one, so a strap is
a voxel thick and a heat shield sits against its muffler.

## Decision

Each is drawn by a kit from its own data and its class's parts, and a vehicle fits it fused, one model at its site,
or as an assembly, each part at a site of its own. Both are drawn from the same pieces and weigh the same, so a
vehicle picks the detail without changing what it is. See `models/vehicles/exhaust-kit.libsonnet`,
`models/vehicles/fuel-tank-kit.libsonnet` and `models/vehicles/cooling-kit.libsonnet`, each one's `sites`.

The parts that fit any vehicle of a size, the converter, muffler, filler neck, fan and hose, belong to a size class,
so one salvaged from a car fits another car but not a truck. A pipe follows its own vehicle's run and a strap hugs
its own tank, so those are rows of each exhaust or tank. A truck's class has no converter, since it burns diesel.

An exhaust runs along axis-aligned legs from the engine's manifold to its tail, so a car's exhaust is drawn for its
car's engine bay; one fitted fused to vehicles whose engines differ runs flat under the floor instead. The pipes are
cut where the converter and the muffler sit, and their mass is what the exhaust's total leaves, spread by length.

A vehicle that loses its engine to an electric drive loses every site these kits and the engine kit can lay, which
each kit lists, so a new part cannot outlive the engine it serves. See `models/vehicles/powertrain.libsonnet`.

## Consequences

A consumer learns the new sites to offer the parts as loot; a vehicle fitted fused keeps one site for each. A test
holds every exhaust, tank and radiator to the same mass and drawn pieces either way, an exhaust's parts to meeting
end to end along its run and a tank's or radiator's parts to resting on its body, none cutting into another; see
`tools/test/running-gear-kits.test.mjs`.
