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

Copied into arpg1 from the owner's skelly repo at commit 56b9b69a6 (EUPL-1.2, same owner): `tools/model-look.mjs` (as
`build.mjs`), `tools/jsonnet`, and the package `thing-authoring-tool`
(`src/catalogue.ts`, `exports.ts`, `skin.ts`, the `compound` family, `compound.libsonnet`, `worn-fit.libsonnet` and the
bust, arm and leg measures). Trimmed to what these models need: no viewer, renders, reference checks, catalogue batches
or other families. Split out of arpg1 into this repo with its history; this is the source of truth, and nothing syncs with skelly. The `@skelly/` package names are kept
as copied.

`packages/mobgen` is reconciled from skelly commit `aee7ab265525f55247b88d9482e7109af44eaf42`,
retaining the assets-specific signature parts, budgets, idle stance and additional body plans. The viewer,
CLI, tests and docs come from that commit. Ragdoll physics remains game-owned, not part of this pipeline.
Package Jsonnet sources compile into git-ignored `.json` twins beside their sources before builds, tests and typechecks (where those scripts exist). Test fixtures are compiled by their tests, not by this step. Like the rest of `tools/`, mobgen is EUPL-1.2 (`../LICENSE`).

## Mobs

`tools/build_mobs.sh [--out dir] [mobId ...]` runs `mobs.mjs`, which builds a GLB and a clips JSON per row of
`../models/mobs.json` (template, seed, lod divisor, walk and attack frames, output names) into `built/`.
A row selects a registered template and body-plan pose mechanism; see `mobs.mjs`, `deriveTemplate` and
`exportMob`. `sources.mjs` is the Jsonnet compile step shared with `build.mjs`.

## Layout

- `../models/*.libsonnet`: model sources, listed in `models/index.libsonnet`; `models/export.json` names the
  rows `build.mjs` installs by default.
- `packages/thing-authoring-tool/items.jsonnet` and `exports/deadvox.jsonnet`: the catalogue and recipe made from those
  sources. Their Jsonnet compiles into ignored twins beside the sources on every build.
- `.gdignore` keeps Godot from scanning this folder.
