# skelly-assets

Voxel and Jsonnet-sourced 3D assets (mobs, avatar bust and limbs, worn armour, guns) and the pipelines that build them,
shared between the owner's games (arpg1, and possibly skelly/deadvox and others). Split out of arpg1 with its history.

- `models/`: the sources. `*.libsonnet` model rows (listed in `models/index.libsonnet`; `models/export.json` names the
  rows built by default) and `mobs.json`, the mob rows (mobgen template, seed, params, palette, parts).
- `tools/`: the pipelines (`build_models.sh`, `build_mobs.sh`), see `tools/README.md`.
- `built/`: the built GLBs and mob clips JSON, committed so a game can use them without node. Rebuild after changing a
  source and commit the result with it.

Games consume this repo as a git submodule and load from `built/`. Engine-specific sidecar files (Godot's `*.import`)
are ignored here; each game makes its own.

Licence, by BR: the models and built output (`models/`, `built/`) are CC BY-NC-SA 4.0, so they are free for
non-commercial use and commercial use needs a separate licence from the author; the pipelines (`tools/`) are EUPL-1.2.
See `LICENSE` and `REUSE.toml`.
