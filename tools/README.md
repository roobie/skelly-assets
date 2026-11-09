---
read_if:
  - building models or adding source-backed per-pack export recipes
  - understanding package origin and the boundary between tools and game consumers
---

# Model tools

Build sources into `built/` to inspect them; commit only the sources, because CI builds, checks and releases the
output so consumers need no authoring environment. Use `build_models.sh` for roster and recipe exports, and
`build_mobs.sh` for generated actors. For the entry points and selection rules, see `build.mjs`, `main`, and
`mobs.mjs`, `main`.

The Node version in `.node-version` runs TypeScript directly; see `README.md`, "Node". Install the locked dependencies with `npm ci` in `tools/`;
`node tools/jsonnet/setup.mjs` and `node tools/sources.mjs`, run from the repository root, prepare the pinned
compiler and Jsonnet twins before parallel tests. Generated twins stay ignored so Jsonnet remains the source
of truth; see `sources.mjs`, `installJsonnetSources`. Every package pre-script asks for the twins, so a run whose
importable inputs hash the same as the last compile reuses them rather than paying for the whole catalogue again;
see `sources.mjs`, `refreshJsonnetTwins`. CI jobs start from fresh checkouts, so they share one compile through a
twin store keyed by that same digest rather than each paying for it. Jsonnet imports another source's `.jsonnet`, never its
twin, because all twins compile in one run and none exists in a fresh checkout until that run ends. The compiler is checksum-verified; transient release
hosting failures are retried rather than failing every Jsonnet build. See `jsonnet/setup.mjs`, `downloadWithRetry`.

## Origin

These packages are maintained here as the shared producer, not as game-local exporters. The origin reference
for each package is skelly commit `aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2), with the retained
content noted below. Shared package ownership avoids parallel game-local producers.

### construct

`packages/construct` originates at the reference commit, with its tests. Geometry mechanisms belong here rather
than in consumer-specific builders, so shared shapes have one mesh and collision contract.

### thing-core

`packages/thing-core` originates at the reference commit. Its material source retains the assets catalogue and
arpg1 materials, so adopting shared schemas does not discard authored finishes. Parameterised firearm and vehicle
schemas keep game-owned temporal brands outside the tool pipeline.

### thing-export

`packages/thing-export` originates at the reference commit, with its tests. Neutral export and file writing live
here so the authoring tools share an output contract rather than copying writers.

### tool-ui

`packages/tool-ui` originates at the reference commit, with its tests. Shared editor UI is tool-owned, not a
reason for authoring packages to depend on a game.

### gun-authoring-tool

`packages/gun-authoring-tool` originates at the reference commit, with its tests. Schema-based export tests
belong here; admission into a game's content registry remains the consumer's responsibility.

### vehicle-authoring-tool

`packages/vehicle-authoring-tool` originates at the reference commit, including the editor/schema tests and
blueprint authoring inputs from its ground-vehicle content. Validation here is schema-only: consumer admission
and runtime behaviour remain game-owned.

### thing-authoring-tool

`packages/thing-authoring-tool` originates at the reference commit, reconciled with the compound/worn-fit helpers
and selected catalogue content from skelly commit `56b9b69a6c1c965a31f4fbb66270e2ed0421cdc9`. The retained armour
needs `packages/thing-authoring-tool/worn-fit.libsonnet`, `oct`. Authored side counts and the catalogue default preserve authoring
control; see `../README.md`, "Shared turned look and fit limits". Container masses are tool-owned content so a
model build does not import a game's item rules. The viewer, fixture exporter and tests belong to this producer.

### mobgen

`packages/mobgen` originates at the reference commit, reconciled with the assets-specific signature parts,
budgets, idle stance and additional body plans. The viewer, CLI, tests and docs belong to the generator;
ragdoll physics belongs to the consuming game, not the asset bake.

## Layout

Choose pack ownership before choosing an exporter; the shared rule and consumer contracts are in
`../README.md`, "Layout". A pack's recipe is `../models/recipes/<packId>.jsonnet`. Discovery follows source
files, not stale JSON twins; see `recipes.mjs`, `readRecipes`. The common row schema is
`packages/thing-export/src/recipe.ts`, `RowSchema`.

Keep one recipe driver so tool ownership is checked before either loader runs. See `build.mjs`,
`partitionRecipe` and `exportRecipes`, for kind dispatch and duplicate-producer refusal; the owning boundaries
are `packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `GUN_KINDS`, and
`packages/thing-authoring-tool/src/exports.ts`, `THING_KINDS`. Gun source paths resolve against this tools
folder, not a game's checkout; see `build.mjs`, `loadRecipeTools`.

Use the production entry for the complete roster/recipe set, not a tool-local refresh into a consumer tree.
See `build.mjs`, `main`, `buildRoster` and `PRODUCTION_RECIPE_TOOLS`. Output paths and metadata/index writing
are owned by `packages/thing-export/src/files.ts`, `writeRecipeExports`; pack containment is owned by
`layout.mjs`, `outputPath`. For a thing-only recipe export into an alternate output root, see
`packages/thing-authoring-tool/src/cli/export.ts`, `exportThingRecipes`.

Generated actors are a separate source family, not another recipe partition. A mob row selects a registered
template and body-plan pose mechanism; see `mobs.mjs`, `deriveTemplate` and `exportMob`. The GLB, body and pose
clips form one consumer contract; see `layout.mjs`, `readMobRows`, and `actorBake.mjs`, `bakeActor`. Use this
same representation for every reader so changing a rig does not require parallel consumer-specific encodings.

The taxonomy is checked before anything is built, from the source rows rather than from the export tools, so
one report covers the roster, the recipes and the mob sheet alike, and the export tools only carry the field. See
`check-taxonomy.mjs`, `modelTaxonomies`, and `build.mjs`, `withTaxonomy`; the why is in `../models/TAXONOMY.md`.

Treat the manifest as the produced-file authority. See `manifest.mjs`, `buildManifest`, `mobManifest` and
`readCredits`, for model identity, actor companions and attribution. `check-built.mjs` holds a fresh build to the
manifest and the declared packs (`manifest.mjs`, `treeDifferences`), so no produced file goes unnamed and no
declared pack goes unbuilt. CI hands the check two independent builds from `build-all.mjs`, `buildAll`, and
requires them byte-equal (`check-built.mjs`, `treeMismatches`), so a release built from a tag is known to reproduce
rather than assumed to. A build given a cache folder reuses every export whose code and inputs are unchanged; see
`packages/thing-export/src/cache.ts`, `exportCache`. A key that leaves out something an export reads would serve
stale bytes, so a tool caches only rows that name their inputs, and an over-wide key costs only a miss. Release archives are byte-reproducible for the same reason; see `pack-release.mjs`,
`packRelease`. The showcase reads this authority rather than maintaining its own model selection; see
`../site/build.mjs`.

Keep engine import caches in consumers; `.gdignore` excludes the authoring tree from Godot scanning.
