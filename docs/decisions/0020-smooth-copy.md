---
read_if:
  - a consumer wants to draw a model smooth rather than in voxels
  - adding a model kind, a pack or a tool that writes models
  - a datum, mass or fit reads wrong on a smooth copy
  - deciding whether a smooth fit finding should fail the build
---

# 20. Every model ships a smooth copy beside its voxel file, sharing its sidecar

## Context

The build draws every model in voxels, and a consumer that wants the authored shapes instead had no way to get
them, though the writer already draws them when a model names no grain. A survey of the build found the smooth export
cheap beside the voxel one and its files about a third of the size, but with about ten times as many primitives, and a
set of fit checks (head-gear straps, rigid head shells, worn-piece covers) tuned to the voxel lattice.

## Decision

Each model pack has a parallel `<pack>.smooth` pack holding the same model drawn smooth at the same logical path, and
each manifest entry names it under `smooth`. A separate pack keeps the voxel archives as they are, so a consumer that
draws voxels loads nothing more; an entry of its own would give one model two ids, and break renames, history and
placements, which all key by id. See `tools/layout.mjs`, `smoothPack`, and `tools/manifest.mjs`, `buildManifest`.

The smooth copy has no sidecar of its own: its mass, volume, anchors, grips, collision and every other datum are the
voxel build's. One set of datums cannot drift from a second, and the smooth surface is the same assembly, so each
datum lies within half the model's voxel grain of it. The smooth pack depends on its voxel pack for that reason. See
`tools/packs.mjs`, `readDependencies`.

Both files come from one export of one resolved assembly, so the copy is the build the datums were read off and the
export cache keeps both or neither. See `tools/packages/thing-export/src/glb.ts`, `exportModelGlbs`.

The copy merges its primitives per finish and piece, as the voxel file does, because a consumer pays a draw call for
each, while a tool inspecting a single solid still asks for one primitive per solid.

Mobs and severed parts have no copy: mobgen draws them from per-bone fields, with no authored mesh to write, and meshing
the voxels would not be smooth.

The fit checks run on the smooth copies as a report and fail nothing. They were tuned to what voxelizing closes, so
a smooth finding is a refit to weigh rather than a model that is broken where it ships today; content authored on the
lattice, such as the bust's head band and vehicle fittings that meet only at the grain, is accepted as it looks smooth.
See `tools/smooth-fit.mjs`.

Smooth ships in every release, so a consumer never finds a model's copy missing from the release it pins.

## Consequences

A release holds a smooth archive beside each model pack's, and every model's history marks it updated once, since a
model's hash now covers its copy; a model without a copy keeps its hash (`tools/model-history.mjs`, `hashModels`).

A smooth consumer places held, worn and fitted things by the voxel datums, so a fit that must be exact on the smooth
surface, such as a strap snug on a head, can be off by up to half a grain until it is refitted.
