---
read_if:
  - a garment, hide or rubber part looks like plastic, or its grain shimmers, crawls or disappears
  - adding a finish for cloth, leather, felt, knit or rubber, or a new fabric look or kind
  - a game or a page draws exported models and must decide how far to honour a finish's fabric
  - changing how the export writes materials, their sheen or their extras
---

# 13. A fabric finish declares its look and the renderer draws its grain

## Context

Worn garments read as plastic: one flat colour, lit evenly smooth, often from a plastic or paint finish. Cloth reads
as cloth by three cues together: a fine grain of threads, loops or pores that tilts the light and varies the colour;
a soft, rough response with a sheen at grazing angles instead of a sharp highlight; and colour that darkens where
the cloth folds.

The exported models are voxel and low-poly meshes with no texture coordinates, and their greedy-meshed faces carry
no per-vertex cavity either. A garment's grain, at about two millimetres a thread, is far finer than any face.

## Decision

**A finish declares its fabric as data.** `fabric` on a finish names a kind of pattern and its numbers: grain size,
relief, lightness noise, crease darkening and fold size (`tools/packages/thing-core/src/materials.ts`,
`FabricSchema`). The looks a finish picks from, such as twill, knit or leather, are content
(`models/fabrics.libsonnet`, `looks`), so a mod adds a look or tunes one without code; only a new kind of pattern
needs code. A fabric finish must be non-metallic and sheened, because fibres scatter rather than mirror light. Metal,
glass and plastic finishes declare no fabric and draw as before.

**The export carries the look in standard form first.** The sheen goes out as glTF's `KHR_materials_sheen` and the
roughness as the core factor, so any glTF loader draws the soft response without knowing this project. The grain has
no glTF form; its numbers ride in the material's extras beside `materialId`, for a renderer that draws them
(`tools/packages/thing-export/src/glb.ts`, `gltfMaterial`). A loader that ignores the extras loses only the grain.

**The grain is drawn, not baked.** With no texture coordinates there is nothing to map a baked texture by, and
adding them to every voxel mesh would multiply the export for a detail most views never resolve. The pattern is
computed in the model's own axes instead, projected along each face's main axis, which is exact on a voxel face and
close on a low-poly one. One generic shader builds every kind (`site/fabric.mjs`, `wearFabric`); a finish only
chooses numbers.

**Folds are a field, not geometry.** The meshes carry no cavity, so crease darkening comes from a slow noise field
stretched downward as cloth hangs. It suggests folds without modelling them; true contact shadow in seams belongs to
the renderer's ambient occlusion, which sees the assembled figure.

**Grain finer than a pixel fades out.** At the game's follow distance a thread is a fraction of a pixel and would
shimmer, so the grain fades by its screen footprint and the slower lightness mottle outlasts it. Up close or in
first person the threads and pores read; at a distance the cloth keeps only its sheen, roughness and mottle.

**Garments use fabric finishes.** A garment drawn in a plastic or paint finish stays plastic whatever the renderer
does, so worn and loose garments name the cloth, leather, felt or rubber they are made of.

## What a game does

A game that reads finishes by `materialId` already gets the sheen and roughness. To draw the grain it ports
`site/fabric.mjs`, `wearFabric`, to its own material path, keyed on the finish's `fabric`, and compiles one program
variant per kind ahead of first draw. A game that skips this still draws cloth as soft and sheened, only without
threads.
