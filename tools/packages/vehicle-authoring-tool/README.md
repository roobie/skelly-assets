# Vehicle authoring tool

## Table first, 3D next

The editor is a table because the first iteration prioritises explicit fitting edits;
a later 3D view can reuse the operations in `src/editor.ts`.

## Save is a download to hand-merge

Authored sources can share values and build mirrored pairs, so a flat JSON download
cannot safely write back into Jsonnet. Save (`src/editor.ts`, `saveBlueprint`) is
for manual merging. Open accepts that saved row; the `blueprint` URL parameter names
a `.json` file in `blueprints/`.

## Schema, not admission

`src/editor.ts`, `checkedExport`, checks the blueprint row against thing-core's
parameterised schema. The consuming game owns part references, support, placement
and metadata checks; a schema-valid export is not a promise of game admission.

## Pair choices are the author's

Nothing in a fitting identifies which supports or dependents change sides.
`src/editor.ts`, `pairChoicesFromForm`, therefore refuses unset choices rather
than guessing them.
