---
read_if:
  - consuming shared models or understanding asset ownership and pipeline gaps
---

# skelly-assets

3D game assets and the pipelines that build them: mobs with their animation clips, worn armour and clothing,
weapons, tools and other props. Every model is generated from source: models are Jsonnet rows and mobs are
seeded generator rows, and a build turns both into binary glTF (`.glb`).

The built files are committed, so you can use the assets without building anything.

**Browse them:** <https://roobie.github.io/skelly-assets/>: turn each model around, play the creatures' clips
and download any of them.

## Layout

A model either product uses has one source row, one builder and one output in this repository at
`built/<packId>/<logical path>`, where `<packId>` is the id of the content pack that declares the file: a recipe
under `models/recipes/`, a roster pack in `models/export.json` or a mob row's `pack` in `models/mobs.json`. No
directory under `built/` is named for a product or exists because one product reads it: a pack named for its
reader can be read by nobody else without bundling another product's name, so a model filed there is shared in
name only. A pack groups one coherent kind of content, so the bolt guns are `skelly.bolt-guns` beside deadvox's
`skelly.firearms`, the armour is `skelly.armour` beside `skelly.wearables`, and the creatures are
`skelly.bestiary`: a sci-fi bolt gun and a modern carbine are different content even if both are guns, and one id
would mislabel both. A mob's clips are baked into one representation, which every consumer composes the same way:
a rig baked twice is one source with two outputs, which no two consumers read alike. Consumers that want a model
bundle its pack and read the same bytes; they need not bundle every pack. This serves one shared asset database
and pipeline for a vast library of models and rigs, so deadvox and arpg1 can use the same models homogeneously.
Keep no hand copy beside a producer.

A shared turned-piece default keeps both products' rendering consistent across the library, while per-piece
choices preserve authoring control. See `tools/packages/thing-authoring-tool/items.jsonnet`, `turnedSides`,
`tools/packages/thing-authoring-tool/src/families/compound.ts`, `compound`, and
`tools/packages/thing-authoring-tool/src/catalogue.ts`, `buildPart`.

The production entry builds the retained roster into its packs, `skelly.bolt-guns` and `skelly.armour`, at
`built/<packId>/assets/models/<id>.glb`; see `tools/build.mjs`, `buildRoster`, and `tools/layout.mjs`,
`readRoster`. It then runs the gun and thing partitions of every recipe file under `models/recipes/`, each into
its own pack: gun rows to `built/<packId>/gungen/` and `built/<packId>/assets/models/`, item rows to
`built/<packId>/things/` and `built/<packId>/assets/models/`; see `tools/build.mjs`, `exportRecipes` and
`PRODUCTION_RECIPE_TOOLS`. Last it writes `built/manifest.json`: every model by id, kind, pack, logical path, the
GLB's part node names from the resolved assembly and credits from `REUSE.toml`, and every produced file under its
pack; see `tools/manifest.mjs`, `buildManifest`.
The creature rows of `models/mobs.json` are written under their declared packs as actor GLBs with body and pose
clip files under `actors/`. One clip representation keeps every consumer in mobgen's rest frame, so roots and
quaternion rotations compose consistently. `tools/mobs.mjs`, `exportMob`, bakes them through
`tools/actorBake.mjs`, `bakeActor`, and their models and files are in the manifest.
arpg1 reads `skelly.body`, `skelly.wearables`, `skelly.melee`, `skelly.hand-tools`, `skelly.materials`,
`skelly.light-sources`, `skelly.containers`, `skelly.structures`, `skelly.readables`, `skelly.arcana`,
`skelly.bolt-guns`, `skelly.armour` and `skelly.bestiary`; its loader repoints from the former flat paths to these
pack paths. `skelly.deadvox.actors` and `skelly.body` hold the Deadvox actor figures and player figure for
Deadvox to read once its loader points at them. Nothing sits flat under `built/` but `manifest.json`;
`tools/check-built.mjs` rebuilds everything and holds the tracked set under `built/` equal to the fresh set,
byte for byte, with the manifest naming each file.
The worn family fits the shared player body, not generated mobs.
Open gaps:

- `paper_sheet` and `folded_note` have no producer.
- Fitting worn garments over generated mob bodies requires its own development round.

| Path | Contents |
|---|---|
| `built/` | One directory per pack: ready-to-use `.glb` models, their `*.model.json` entries where applicable, and body-backed pose clips for mobs; `manifest.json` lists them all |
| `models/` | Jsonnet model rows, per-pack export recipes in `recipes/`, the roster in `export.json`, and the mob rows in `mobs.json` |
| `tools/` | The build pipelines; see `tools/README.md` |
| `site/` | The showcase page; GitHub Pages also publishes the mobgen, gun, thing and vehicle authoring viewers from `tools/packages/` |

## Using the assets

Load the `.glb` files from `built/` in any engine or tool that reads glTF 2.0. To use them in a game, add this
repository as a git submodule and load from `built/`. Engine-specific sidecar files, such as Godot's `*.import`, are
ignored here, so each game generates its own.

## Building

You need Node 26 or later.

```sh
tools/build_models.sh            # every row named in models/export.json
tools/build_models.sh <id> ...   # only some rows
tools/build_mobs.sh              # every mob in models/mobs.json
```

The first run installs the tools' npm dependencies and downloads a pinned, checksum-verified go-jsonnet. After
changing a source, rebuild and commit the source and its `built/` output together. More detail is in
`tools/README.md`.

To preview the showcase locally, run `node site/build.mjs` and serve `_site/` with any static file server.

## Licence

The licence depends on the path; [`REUSE.toml`](REUSE.toml) states it for each one.

- **Models, their sources and the built output** (`models/`, `built/`):
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You may use, share and adapt them for
  non-commercial purposes, with attribution to Björn Roberg, and you must share adaptations under the same licence.
  For a commercial licence, contact the author.
- **The pipelines and the showcase page** (`tools/`, `site/`): [EUPL-1.2](LICENSES/EUPL-1.2.txt).

The full licence texts are in [`LICENSES/`](LICENSES).
