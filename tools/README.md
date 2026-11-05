# Model tool

Builds the GLB models whose sources are in `../../models/` (rows in Jsonnet) into `assets/own/skelly/`.
`tools/build_models.sh` is the one command; it installs from this folder's `package-lock.json` the first time
(`npm ci`), then runs `build.mjs`. `build.mjs --out dir [rowId ...]` builds to another folder or only some rows.
Node 26 or later runs the TypeScript directly. The first build downloads the pinned go-jsonnet (`jsonnet/runtime.json`,
sha256-checked) into `jsonnet/bin/`, ignored by git.

## Origin

Copied once from the owner's skelly repo at commit 56b9b69a6 (EUPL-1.2, same owner): `tools/model-look.mjs` (as
`build.mjs`), `tools/jsonnet`, and the packages `engine`, `thing-core`, `thing-export` and `thing-authoring-tool`
(`src/catalogue.ts`, `exports.ts`, `skin.ts`, the `compound` family, `compound.libsonnet`, `worn-fit.libsonnet` and the
bust, arm and leg measures). Trimmed to what these models need: no viewer, renders, reference checks, catalogue batches
or other families. This copy is the source of truth; nothing syncs with skelly. The `@skelly/` package names are kept
as copied.

The package `mobgen` was copied from the same commit later (`src/core` and `src/mob`; no viewer, cli, tests, docs, crowd
renderer, look-at or ragdoll). It has no npm dependencies. Its generated `*.json` beside the `.jsonnet` files are not kept:
they compile into `.build/` on every run, like the other Jsonnet. It needs no further change to the licence record (the
repo's EUPL-1.2 `LICENSE` here covers it; the shambler's manifest rows carry the attribution).

## Mobs

`tools/build_mobs.sh [--out dir] [mobId ...]` runs `mobs.mjs`, which builds a GLB and a clips JSON per row of
`../../models/mobs.json` (template, seed, lod divisor, walk and attack frames, output names) into `assets/own/skelly`.
A second mob is one more row; its template module must be among the imports at the top of `mobs.mjs` (the humanoid,
acid, amalgam, dog and skeleton templates are). The walk, attack and idle poses used are the humanoid ones, so the
non-humanoid templates (dog, acid) will need their own pose functions in `mobs.mjs` first. `sources.mjs` is the Jsonnet
compile step shared with `build.mjs`.

## Layout

- `models/*.libsonnet` (repo root): model sources, listed in `models/index.libsonnet`; `models/export.json` names the
  rows `build.mjs` installs by default.
- `packages/thing-authoring-tool/items.jsonnet` and `exports/deadvox.jsonnet`: the catalogue and recipe made from those
  sources. Their Jsonnet compiles into `.build/` (ignored) on every build.
- `.gdignore` keeps Godot from scanning this folder.
