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

## Layout

- `models/*.libsonnet` (repo root): model sources, listed in `models/index.libsonnet`; `models/export.json` names the
  rows `build.mjs` installs by default.
- `packages/thing-authoring-tool/items.jsonnet` and `exports/deadvox.jsonnet`: the catalogue and recipe made from those
  sources. Their Jsonnet compiles into `.build/` (ignored) on every build.
- `.gdignore` keeps Godot from scanning this folder.
