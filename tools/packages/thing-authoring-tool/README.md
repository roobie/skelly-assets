---
read_if:
  - you author or export a non-gun item
  - you inspect the thing tool's viewer or its assembly boundary
  - you change a tool item's mass, finish or geometry
  - you investigate skin authoring or voxel deformation topology
---

# Thing authoring tool

## Skinned export

Bind-space weighting keeps duplicated finish-boundary vertices deforming together. See
`src/skin.ts`, `authoredSkin`, and `tools/packages/thing-export/src/glb.ts`, `writeGlb`.

Meshing must preserve deformation samples without changing the rest silhouette, and skin
support must not inflate rigid exports. Blend extents and profiles belong to content rather
than anatomy-specific constants. See `tools/packages/thing-export/src/voxelize.ts`, `sliceMask`,
`tools/packages/thing-export/src/skin.ts`, `preserveSkinFace`, and `src/skin.ts`, `authoredSkin`.

Exporter proofs stay local so consumer tests need not import their producer.
Fixture exports share the production writer to avoid parallel formats while keeping
test content out of the catalogue. See `test/export-skin-fixture.ts`, `writeRecipeExports`,
and `test/skinExport.test.ts`, `exported`.

Consumers must isolate mutable skeletons and preserve full joint transforms and deformed
bounds: shared pose state couples figures, decomposition can lose shear, and rest bounds
can cull posed geometry. For the exported bind-frame contract, see
`tools/packages/thing-export/src/skin.ts`, `ExportSkin`.

## Authoring ownership

Each item has an authored row so mass has one home even when geometry builders are reused.
A single part takes the core wrapper and can gain parts without changing the export or
preview contract. See `src/catalogue.ts`, `buildItem`, and `items.jsonnet`.

Geometry and appearance are separate so changing a finish cannot change fit. Families
select mechanisms while content owns dimensions, material choices and authored masses;
unsupported selections are errors rather than substitutes. See `src/catalogue.ts`,
`loadCatalogue`, and `src/families/`.

Handling datums refer to a named solid rather than duplicate its dimensions, so resizing
a handle or moving its part also moves the hand. Pose corrections stay authored beside
the geometry because the consumer's held frame need not match the tool's upright frame.
See `src/catalogue.ts`, `buildItem`, and `packages.libsonnet`. Attachment datums, exported
as named anchors, use the same solid reference for the same reason: a vehicle part's mount
follows its geometry. See `models/vehicle-parts.libsonnet`.

Equipment uses family-specific construction rather than a generic box so silhouettes and
exposed working parts remain useful identification cues at play distance. Repair trays show
their contents because a closed case would hide the distinction between metal repair and
clothing repair; folded continuous webbing keeps a sling's ground footprint practical without
making it look like a rigid rod. See `src/families/equipment.ts`, `repairKit`, `webbingSling`
and `pliers`, and `equipment.libsonnet`.

Jacks and the standalone hoist are ordinary carried tools: their jacking quality is authored
in deadvox content and their models say nothing about load, reach or supported groups, so
what a jack may lift stays a content and runtime decision. See `src/families/jacks.ts`,
`engineHoist`, and `jacks.libsonnet`.

The preview draws the same construct report the exporter consumes, so visual inspection is
not a second model implementation. See `src/main.ts` and `tools/packages/tool-ui/src/scene.ts`,
`buildLayers`. The page is `index.html`.

Pack-owned recipes make consumption explicit rather than inferring targets from item
relationships. Shared validation and file writing prevent parallel formats. See
`tools/recipes.mjs`, `readRecipes`, `src/exports.ts`, `loadThingRecipe`, and
`src/cli/export.ts`, `exportThingRecipes`.

Inventory atoms may retain a runtime item weight rather than exported part masses:
a vessel containing a serving must not gain the serving's mass twice, and visual
primitives are not inventory parts. Every row authors its `exportMass` choice, with no
helper default, so copying a helper cannot silently switch which mass is the authority.
That choice follows each item into its recipe; disagreement is refused rather than silently choosing an
authority. Geometry and authoring-preview physical properties do not change with
that export choice. See `src/catalogue.ts`, `ItemSchema`, `src/exports.ts`,
`exportItem` and `loadThingRecipe`, and `cans.libsonnet`, `shellMassKg` and `items`.

Trap-state presentation needs a consumer-side model selection rule as well as geometry;
it does not belong in the geometry authoring tool. See `src/families/bearTrap.ts`, `bearTrap`.
