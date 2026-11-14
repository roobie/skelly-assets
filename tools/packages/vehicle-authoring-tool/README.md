---
read_if:
  - you edit or save a vehicle blueprint in the vehicle authoring tool
  - you change what the tool checks before export
  - you read a vehicle's swing verdicts or use Solve in the Vehicles view
---

# Vehicle authoring tool

## Table first, 3D next

The editor is a table because the first iteration prioritises explicit fitting edits;
a later 3D view can reuse the operations in `src/editor.ts`.

## Save is a download to hand-merge

Authored sources can share values and build mirrored pairs, so a flat JSON download
cannot safely write back into Jsonnet. Save (`src/editor.ts`, `saveBlueprint`) is
for manual merging. Open accepts that saved row; the `blueprint` URL parameter names
a `.json` file in `models/vehicle-blueprints/`.

## Schema, not admission

`src/editor.ts`, `checkedExport`, checks the blueprint row against thing-core's
parameterised schema. The consuming game owns part references, support, placement
and metadata checks; a schema-valid export is not a promise of game admission.

## Pair choices are the author's

Nothing in a fitting identifies which supports or dependents change sides.
`src/editor.ts`, `pairChoicesFromForm`, therefore refuses unset choices rather
than guessing them.

## Vehicles view: the build's verdicts, read through the dev server

The Vehicles view lists every placement vehicle's moving sites with the verdict of the build's swing check, and its Solve
button asks for a proposal on a failing one. `server/vehicleApi.mjs` serves both from the dev server (`vite.config.ts`,
`vehicleEndpoints`), because the verdicts need Jsonnet evaluated in Node and the browser never does that. A published tool
therefore has no Vehicles data and says so. Solve proposes and downloads; it never edits content, for the reason in
`docs/decisions/0016-swing-check.md`, "A failing site gets a proposal, never an edit".
