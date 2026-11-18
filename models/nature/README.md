# Temperate woodland starter kit

Static scenery models in `skelly.nature`, with the same authored shapes in `skelly.nature.smooth`. Existing small
nature props (`log`, `large_rock`, `field_stone`, gathered plants and curiosities) keep their ids and geometry. The
`woodland_` ids provide outdoor-scale silhouettes and a matching understorey, not a replacement inventory catalogue.

The trees and shrubs are grown (`grown.libsonnet`, `grown.species.libsonnet`): a species row names a habit and a
seed picks one tree of it, so a new tree is a new row rather than new geometry, and its branching reads as grown
rather than placed. Each grown model also ships thinned twins, one per look in the `thinned` list of
`woodland.spec.libsonnet`: the same trunk and limbs with fewer fine branches. The `_sparse` twin is for an open woodland
a player sees through and a scene of many trees that wants a cheaper draw; deadvox's woodland is to use it. The
`_sparser` twin is on trial, for a crown a player can still hide in and see out of. A species' own `density` sets its
look elsewhere.

## Placement and scale

Metres, +y up, in the [shared model frame](../../docs/decisions/0002-model-frame.md). Place the authored origin
at ground y=0; do **not** move the mesh so its bounding-box bottom or centre becomes the origin. Root skirts
penetrate the ground by approximately 3–10 cm in the smooth sources, and boulders by 16 cm. Voxel sampling
may expand a root skirt by up to one grain. Fern, grass and fallen-log bottoms sit at y=0.

Nominal sizes below are rounded **above-ground** heights and horizontal footprints. They are not exact snap,
clearance or navigation bounds. Crowns are deliberately asymmetric; rotating repeated instances helps reduce
obvious repetition. Source instances have no extra scale transform.

| Model id | Height | Approximate footprint / form |
| --- | --- | --- |
| `woodland_oak_spreading` | 8.5 m | 10.2 × 10.2 m, grown broad dome on a short bole |
| `woodland_oak_upright` | 12.9 m | 7.7 × 9 m, grown with a stronger leader, taller than it spreads |
| `woodland_birch` | 11.9 m | 5.8 × 6.2 m, grown slender leader and hanging laterals |
| `woodland_scots_pine` | 10.1 m | 4.4 × 4.7 m, grown whorled tiers shed below |
| `woodland_spruce` | 9.9 m | 5 × 6 m, grown dense cone kept to the ground |
| `woodland_pine` | 10.4 m | 4.3 × 4.3 m, eight drawn tapering foliage tiers |
| `woodland_oak_sapling` | 3.2 m | 2.3 × 2.1 m |
| `woodland_pine_sapling` | 3.2 m | 1.4 × 1.4 m |
| `woodland_snag` | 5.9 m | 2.7 × 1.9 m, broken leader and bare limbs |
| `woodland_stump_cut` | 0.6 m | 2.1 × 2 m root spread, cut face and growth ring |
| `woodland_stump_hollow` | 0.8 m | 2.1 × 2 m root spread, open cavity with recessed bed |
| `woodland_fallen_log` | 1.1 m | 3.8 × 0.8 m, along local x, with a broken branch stub |
| `woodland_hazel` | 1.8 m | 2.4 × 2.4 m, grown multi-stem tall shrub |
| `woodland_shrub_low` | 0.9 m | 1.6 × 1.7 m, grown mat of short stems |
| `woodland_<grown id>_sparse` | as its twin | its twin thinned; width may shrink with the twigs |
| `woodland_<grown id>_sparser` | up to its twin's | thinned further; limbs go too, so a crown of laterals loses some height |
| `woodland_fern` | 0.54 m | 1.6 × 1.65 m, seven fronds with finite-thickness leaflets |
| `woodland_grass` | 0.5 m | 0.75 × 0.75 m, twenty finite-thickness blades |
| `woodland_boulder_broad` | 2 m | 3.4 × 2.6 m |
| `woodland_boulder_upright` | 3 m | 1.7 × 1.7 m |
| `woodland_boulder_low` | 0.9 m | 2.7 × 2 m, disjoint stone and moss surface regions |

All foliage is opaque faceted geometry, not transparent cards. Smooth copies retain the facets instead of
pretending to be a different botanical representation. Authored masses are approximate static-scenery values;
opaque crown volumes are not a biomass, structural-strength or canopy-collision specification.

## Sources and examples

- `woodland.spec.libsonnet`: variation measures, roots/rock floors, asset identities, the grown rows' species,
  seeds and grain, and the thinned looks' densities.
- `grown.species.libsonnet`: the habits trees and shrubs grow from, and each one's finish; fields are documented in
  `tools/packages/thing-authoring-tool/src/growth/species.ts`.
- `woodland.libsonnet`: compound geometry and finish selection. Functions stay here; the catalogue set is plain data.
- `../catalogue/sets/woodland.libsonnet`: category-based registration into the existing nature production recipe.
- `woodland-edge.example.jsonnet`: the asset types in a small grove, with repeated ground cover and a central
  corridor free of scenery in the tested sample points below two metres. This demonstrates negative space,
  **not** certified actor clearance or walkability.
- `woodland-lineup.example.jsonnet`: every model at the same metre scale. Tree and understorey groupings make
  size variation visible without independently zooming each prop to fill the frame.

Examples use the existing source-only `{id, sites: [{site, model, at, turn}]}` composition format. They are not
shipped whole-forest meshes, terrain tiles or a game-specific scene. Their compiled JSON twins are ignored.
The wooded cottage comparison in the review combines the grove with the already accepted timber cottage at
its existing scale; it adds no new building geometry or building compatibility rules.

## Validation and limits

`tools/test/woodland.test.mjs` checks production recipe membership, titles/taxonomy, supported primitives,
independent size budgets, exported ground contact, voxel/smooth footprint drift, retained foliage materials,
fern leaflet/stalk contact and the hollow stump's exported cavity. Mesh ray probes sample the example's clear
central corridor. Existing catalogue/index, building and metadata regressions remain applicable.

Build through `node tools/build.mjs` (full production build), or select ids for a quick local review, for example:

```sh
node tools/build.mjs woodland_oak_spreading woodland_birch woodland_fern
node --test tools/test/woodland.test.mjs
```

A targeted build does not write a full pack index or release manifest. Review renders use a separate, narrowed
render-only tree; they do not replace production manifest validation. Commit Jsonnet sources, not generated
JSON, GLBs or screenshots.

This increment does not add terrain/cliffs/caves, biome or season variants, wind, LOD/billboards, a scatter editor,
or runtime navigation/collision policy. Marsh and magical vegetation can extend the visual vocabulary later;
no general-purpose vegetation schema is introduced pre-emptively.
