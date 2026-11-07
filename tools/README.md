---
read_if:
  - building models or adding source-backed per-pack export recipes
---

# Model tool

Builds the GLB models whose sources are in `../models/` (rows in Jsonnet) into `../built/`.
`tools/build_models.sh` is the one command; it installs from this folder's `package-lock.json` the first time
(`npm ci`), then runs `build.mjs`. `build.mjs --out dir [rowId ...]` builds to another folder or only some rows.
Node 26 or later runs the TypeScript directly. The first build downloads the pinned go-jsonnet (`jsonnet/runtime.json`,
sha256-checked) into `jsonnet/bin/`, ignored by git.

## Origin

`packages/construct`, `packages/thing-core` and `packages/thing-export` are copied with tests from skelly commit
`aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2). Thing-core retains this repository's
`materials.jsonnet` whole, including the catalogue-breadth and arpg1 materials; `materials.json` is regenerated.

`packages/tool-ui` is copied with tests from the same skelly commit `aee7ab265525f55247b88d9482e7109af44eaf42`
(EUPL-1.2). Its `vite.config.ts` imports this folder's `testPool.ts`, which the copy places one level up from the
package exactly where the import looks for it.

`packages/gun-authoring-tool` is copied with tests from skelly commit
`aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2). Its generated Jsonnet twins are not tracked;
its registry-based export tests use thing-core's parameterised firearm schema instead. The firearm schema
closure in `packages/thing-core/src/firearmModelSchema.ts` comes from that commit's deadvox model schema;
callers supply temporal primitives so game-owned brands need not enter the tool pipeline. The skelly-only
refresh command is omitted.

`packages/vehicle-authoring-tool` is copied with its editor/schema tests from skelly commit
`aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2), with schema-only validation.
Its `blueprints/*.json` authoring inputs are the blueprint rows from that commit's
`packages/mods/skelly.ground-vehicles/vehicles.json`. Consumer admission tests remain skelly-owned.
The shared vehicle schema factories in thing-core originate in that commit's deadvox schema.

`packages/thing-authoring-tool` is reconciled from skelly commit
`aee7ab265525f55247b88d9482e7109af44eaf42` (EUPL-1.2), retaining the compound and worn-fit helpers and selected
catalogue rows from `56b9b69a6c1c965a31f4fbb66270e2ed0421cdc9`. The retained armour's `oct` exposure and authored
piece side counts are kept; omitted side counts inherit the catalogue's content default, never a code number.
Compound pieces can opt into round geometry with `sides: null`; see the root README's Layout rule. Container masses live in tool-owned content
rather than importing game inventory. The viewer, fixture exporter and tests are tool-owned. This repository is the
source of truth; nothing syncs back to skelly. The `@skelly/` package names are kept.

`packages/mobgen` is reconciled from skelly commit `aee7ab265525f55247b88d9482e7109af44eaf42`,
retaining the assets-specific signature parts, budgets, idle stance and additional body plans. The viewer,
CLI, tests and docs come from that commit. Ragdoll physics remains game-owned, not part of this pipeline.
Package Jsonnet sources compile into git-ignored `.json` twins beside their sources before builds, tests and typechecks (where those scripts exist). Test fixtures are compiled by their tests, not by this step. Like the rest of `tools/`, mobgen is EUPL-1.2 (`../LICENSE`).

## Mobs

`tools/build_mobs.sh [--out dir] [mobId ...]` runs `mobs.mjs`, which builds a GLB and a clips JSON per row of
`../models/mobs.json` (template, seed, lod divisor, walk and attack frames, output names) into `built/<pack>/`,
the row's `pack`.
A row selects a registered template and body-plan pose mechanism; see `mobs.mjs`, `deriveTemplate` and
`exportMob`. `sources.mjs` is the Jsonnet compile step shared with `build.mjs`.

## Layout

- `../models/*.libsonnet`: model sources, listed in `models/index.libsonnet`; `models/export.json` maps each
  roster pack id to the rows `build.mjs` installs by default, at `built/<packId>/assets/models/<id>.glb`.
- `../models/recipes/<packId>.jsonnet`: source-backed per-pack export recipes, compiled into ignored JSON twins by
  `sources.mjs`. Source-backed discovery avoids stale generated recipes; see `recipes.mjs`, `readRecipes`.
  A recipe file is one array of rows; each row's `kind` picks its tool. The gun tool owns `design`, `cartridge`,
  `attachment`, `magazine` and `part` (`packages/gun-authoring-tool/src/cli/exportRecipe.ts`, `GUN_KINDS`), the
  thing tool owns `item` (`packages/thing-authoring-tool/src/exports.ts`, `THING_KINDS`). The gun roster sits in
  `../models/recipes/skelly.firearms.jsonnet`, which joins the mod's item rows with
  `packages/gun-authoring-tool/exports/deadvox.jsonnet`; gun rows' `source` paths are relative to this folder.
- `build.mjs`, `exportRecipes`, is the one recipe driver: it splits each recipe file by owning tool before any
  loader runs, refuses a kind no tool owns and an id two tools would both export, and writes each tool's outputs
  under `<out>/<packId>/`: gun rows as `gungen/<id>.model.json` and `assets/models/<id>.glb`, no index; item rows
  as `things/<id>.model.json`, `things/index.json` and `assets/models/<id>.glb`. The production entry (`build.mjs`
  with no row ids) runs the roster, then the gun tool over every recipe file into `built/`; see
  `PRODUCTION_RECIPE_TOOLS`.
  `layout.mjs` keeps logical paths inside their owning pack; both builders, `check-built.mjs` and the showcase
  find pack paths through it. `../models/pack-formats.json` names each mob pack's clip representation, read by
  `layout.mjs`, `readPackFormats`.
- `packages/thing-authoring-tool/items.jsonnet`: the catalogue, including retained roster content and the ported
  catalogue-only sources. `exports/deadvox.jsonnet` selects the retained roster for `build.mjs`.
- `packages/thing-authoring-tool/src/cli/export.ts <repository root> <output root>`: runs the driver's thing tool
  over the recipe files into `<output root>/<packId>/things/` and `<output root>/<packId>/assets/models/`. Run
  with Node from `tools/`. This step is exercised into temporary roots; the production entry does not run it, so
  no `things/` output lands in `built/`.
- Catalogue-only ported sources have no recipe until their placement is settled. No output for them lands here.
- `.gdignore` keeps Godot from scanning this folder.

The ownership rule and remaining shared-pipeline gaps are in the root README's Layout section.
