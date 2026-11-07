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
`readRoster`. It then runs the gun partition of every recipe file, which writes deadvox's gun roster from
`models/recipes/skelly.firearms.jsonnet` to `built/skelly.firearms/gungen/` and
`built/skelly.firearms/assets/models/`; see `tools/build.mjs`, `exportRecipes`. The thing partition of the recipe
files is exercised in temporary roots; see `tools/test/build.test.mjs` and
`tools/packages/thing-authoring-tool/test/modRecipes.test.ts`, `exportThingRecipes`. It emits into `built/` once
the production entry runs it there, not before.
The creature rows of `models/mobs.json` are written under `built/skelly.bestiary/`, and their clips
(`*_clips.json`) are the matrix representation while `tools/mobs.mjs`, `exportMob`, writes them; see
`models/pack-formats.json`, read by `tools/layout.mjs`, `readPackFormats`. A row whose pack's format is `pose`
bakes through `tools/actorBake.mjs`, `bakeActor`. arpg1 reads `skelly.bolt-guns`, `skelly.armour` and
`skelly.bestiary`; its loader repoints from the former flat roster and mob paths to these pack paths. The flat
files under `built/` are the hand copies `models/copied.json` lists, awaiting their producers;
`tools/check-built.mjs` holds each copy apart from the produced set, and a copy leaves when its producer emits.
The worn family fits the shared player body, not generated mobs.
Open gaps:

- `paper_sheet` and `folded_note` have no producer.
- Fitting worn garments over generated mob bodies requires its own development round.

| Path | Contents |
|---|---|
| `built/` | Ready-to-use `.glb` models, and a `*_clips.json` with the animation clips for each mob |
| `models/` | Jsonnet model rows, per-pack export recipes in `recipes/`, the roster in `export.json`, the hand-copy list in `copied.json`, the mob rows in `mobs.json` and each mob pack's clip representation in `pack-formats.json` |
| `tools/` | The build pipelines; see `tools/README.md` |
| `site/` | The showcase page, published to GitHub Pages by `.github/workflows/pages.yml` |

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
