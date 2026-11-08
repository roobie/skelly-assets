---
read_if:
  - adding a model, choosing its content pack or consuming shared assets
  - understanding asset ownership, turned-piece appearance or actor clip contracts
---

# skelly-assets

3D game assets and the pipelines that build them: mobs with their animation clips, worn armour and clothing,
weapons, tools and other props. Every model is generated from source: models are Jsonnet rows and mobs are
seeded generator rows, and a build turns both into binary glTF (`.glb`).

The built files are committed, so you can use the assets without building anything.

**Browse them:** <https://roobie.github.io/skelly-assets/>: turn each model around, play the creatures' clips
and download any of them.

## Layout

A model either product uses is produced once in this repository, from one source row by one builder, and
emitted once at `built/<packId>/<logical path>`. Every consumer reads that same path. A product need not bundle
every pack: sharing is a capability, not an obligation to load the whole library. A product that wants a model
bundles its pack and reads the same bytes as every other consumer. Keep no hand copy beside a producer and give
models a producer rather than preserving unbuildable copies. These rules serve one shared asset database and
pipeline for a vast library of models and rigs, usable homogeneously by deadvox and arpg1.

### Choosing a pack and source

Every directory directly under `built/` is a content pack id, never a directory chosen merely for its reader.
A product-named home makes sharing require another product's name. Group one coherent kind of content per pack:
a modern carbine does not belong with sci-fi bolt guns, nor ordinary clothing with powered armour. Keep these
families separate even when the same tool builds them. Pack declarations and path boundaries are cued by
`tools/layout.mjs`, `declaredPacks` and `outputPath`.

For a new gun or thing, select its source in `models/recipes/<packId>.jsonnet`, choosing the pack by content,
not by which game requested it. Keep one recipe file per pack, with owning tool selected by each row's kind;
see `tools/recipes.mjs`, `readRecipes`, and `tools/build.mjs`, `partitionRecipe`. This lets a pack combine gun
and thing exports without giving a model two producers. The recipe schema and tool boundaries are in
`tools/packages/thing-export/src/recipe.ts`, `RowSchema`,
`tools/packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `GUN_KINDS`, and
`tools/packages/thing-authoring-tool/src/exports.ts`, `THING_KINDS`.

A thing recipe or roster row selects a catalogue row, not a second model source. Author thing sources in
`tools/packages/thing-authoring-tool/items.jsonnet`, `items`, including shared model files through
`models/index.libsonnet`. The roster filters that catalogue through
`tools/packages/thing-authoring-tool/exports/deadvox.jsonnet`, `roster`, using `models/export.json` as the
authority for which families use the roster; see `tools/layout.mjs`, `readRoster`, and `tools/build.mjs`,
`buildRoster`. Do not select those models again in a recipe. For guns, author the source named by the recipe
row's `source`; file-backed sources resolve relative to `tools/`, while other gun kinds select their source
through the owning exporter. See `tools/build.mjs`, `loadRecipeTools`, and
`tools/packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `loadExportRecipe`.
For a generated creature, author a row with its content pack in `models/mobs.json` instead of a gun/thing recipe;
see `tools/layout.mjs`, `readMobRows`, and `tools/mobs.mjs`, `exportMob`.

### Outputs and consumers

The no-id production run of `tools/build.mjs` is the roster and recipe entry point. Under `built/<packId>/`,
the roster supplies `assets/models/<id>.glb`; recipes supply the GLB alongside the owning tool's metadata in
`gungen/` or `things/`, with a thing index for consumer admission. Cue the output contract rather than maintaining
a second file list: `tools/build.mjs`, `exportRecipes` and `PRODUCTION_RECIPE_TOOLS`, and
`tools/packages/thing-export/src/files.ts`, `writeRecipeExports`.

Generated actors have a GLB plus a body and pose clips, not a second consumer-specific bake. The actor GLB's
logical path is under `assets/models/actors/`; its body and clips are under `actors/`. See `tools/layout.mjs`,
`readMobRows`, and `tools/actorBake.mjs`, `bakeActor`. Every consumer composes the one pose representation in
mobgen's rest frame: roots and quaternion rotations must agree, and consumer facing conventions must not become
a second baked rig. See `tools/actorCompose.mjs`, `decodeFrame` and `sampleClip`.

For arpg1, the roster packs `skelly.bolt-guns` and `skelly.armour` supply weapons and fitted armour, and
`skelly.bestiary` supplies creatures. Its other shared looks come from `skelly.body`, `skelly.wearables`,
`skelly.melee`, `skelly.hand-tools`, `skelly.materials`, `skelly.light-sources`, `skelly.containers`,
`skelly.structures`, `skelly.readables` and `skelly.arcana`. The arpg1 loader must use these pack paths, not
former flat paths, and read actor body/pose files without the former matrix encoding or baked facing flip.
These are consumer contracts, not alternate arpg1 exports.

Deadvox consumes the recipe packs it bundles; a standalone model does not require a playable item or placement.
The shared kind packs can therefore carry looks for arpg1 without inventing Deadvox gameplay. Its actor figures
belong to `skelly.deadvox.actors`, its player figure to `skelly.body`; those are distinct from the generated
bestiary. The `skelly.deadvox.*` packs are scoped to actor, site or scenario content, not reader-only homes;
see the selections in `models/recipes/`. Other recipe packs serve their declared content or scenario, not an
obligation for arpg1 to bundle them. The showcase consumes all manifest models, independent of product bundling.

Use `built/manifest.json` as the consumer-facing file authority, not a parallel list in documentation; see
`tools/manifest.mjs`, `buildManifest` and `mobManifest`. Credits come from `REUSE.toml` through
`tools/manifest.mjs`, `readCredits`. Nothing sits flat under `built/` except the manifest. The tracked and fresh
produced sets must match byte for byte, so a source change and its rebuilt output belong in the same commit;
see `tools/check-built.mjs` and `tools/manifest.mjs`, `treeDifferences`.

### Shared turned look and fit limits

Turned pieces inherit the catalogue's shared faceted default so both products render the library consistently.
Authored numeric side counts override it; a compound piece can explicitly choose round with `sides: null`.
A large side count is still a polygon, not the round mechanism. Keep the default in content, not a tool-code
number, so authors retain control without forking the builder. See
`tools/packages/thing-authoring-tool/items.jsonnet`, `turnedSides`,
`tools/packages/thing-authoring-tool/src/catalogue.ts`, `buildPart`, and
`tools/packages/thing-authoring-tool/src/families/compound.ts`, `compound`.

The worn family fits the shared player body, not generated mobs. Fitting garments over generated bodies requires
its own development round; sharing a model does not imply universal fit. `paper_sheet` and `folded_note` remain
outside the shared producer guarantee: they have no producer, and closing that gap requires its own ruling.

For pipeline ownership and authoring entry points, see `tools/README.md`.

## Using the assets

Load the `.glb` files from `built/` in any engine or tool that reads glTF 2.0. To use them in a game, add this
repository as a git submodule and load from `built/`. Engine-specific sidecar files, such as Godot's `*.import`, are
ignored here, so each game generates its own.

## Releases

Pushing a `v*` tag publishes a GitHub release with one archive per pack and `manifest.json`, so a consumer pins a
version and fetches only the packs it bundles. CI builds every release from source; see
`.github/workflows/assets.yml`, `release`, and `tools/pack-release.mjs`, `packRelease`. Binaries committed to git
grow its history with every rebuild, cannot be merged and can drift from their source; a release pins the bytes
immutably, with CI as their one producer. CI builds the tree twice and holds the builds to each other, so a
release is known to be reproducible from its tag.

Every push to main also replaces the `edge` pre-release with that commit's build, so the latest main stays
fetchable after CI's build artifacts expire. `edge` is unpinned and moves on every push; it is never marked
latest, and a consumer pins a `v*` release instead.

## Building

You need Node 26 or later.

```sh
tools/build_models.sh            # complete roster and recipe build
tools/build_models.sh <id> ...   # only some rows
tools/build_mobs.sh              # every mob in models/mobs.json
node tools/build-all.mjs --out <dir>   # the complete tree, as CI builds it
```

The first run installs the tools' npm dependencies and downloads a pinned, checksum-verified go-jsonnet. After
changing a source, rebuild and commit the source and its `built/` output together. More detail is in
`tools/README.md`.

To preview the showcase locally, run `node site/build.mjs` and serve `_site/` with any static file server.

### Showcase idle motion

The showcase shows a humanoid idle's rest pose rather than sway. The three sway oscillators in
`tools/packages/mobgen/src/mob/idle.ts`, `idleMotion`, only close a plain baked loop over a span too long for the
showcase; a short loop visibly jumps at its wrap. The showcase carries no composition logic, so it uses the rest pose.

## Licence

The licence depends on the path; [`REUSE.toml`](REUSE.toml) states it for each one.

- **Models, their sources and the built output** (`models/`, `built/`):
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may use, share and adapt them for
  non-commercial purposes, with attribution to Björn Roberg, and you must share adaptations under the same licence.
  For a commercial licence, contact the author.
- **The pipelines and the showcase page** (`tools/`, `site/`): [EUPL-1.2](LICENSES/EUPL-1.2.txt).

The full licence texts are in [`LICENSES/`](LICENSES).
