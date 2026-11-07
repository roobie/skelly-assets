# skelly-assets

3D game assets and the pipelines that build them: mobs with their animation clips, worn armour and clothing,
weapons, tools and other props. Every model is generated from source: models are Jsonnet rows and mobs are
seeded generator rows, and a build turns both into binary glTF (`.glb`).

The built files are committed, so you can use the assets without building anything.

**Browse them:** <https://roobie.github.io/skelly-assets/>: turn each model around, play the creatures' clips
and download any of them.

## Layout

| Path | Contents |
|---|---|
| `built/` | Ready-to-use `.glb` models, and a `*_clips.json` with the animation clips for each mob |
| `models/` | The sources: Jsonnet model rows (listed in `models/index.libsonnet`) and the mob rows in `mobs.json` |
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
