---
read_if:
  - you author or export a non-gun item
  - you inspect the thing tool's viewer or its assembly boundary
  - you change a tool item's mass, finish or geometry
  - an export refuses a part's mass as implausible for its drawn voxels
  - you make part of an item glow or rename a glowing material
  - you mark which of a part's finish slots take paint
  - you make a worn shell hide the doll parts or regions under it
  - you give a doll's body more bones or joints off its centre line
  - you investigate skin authoring or voxel deformation topology
---

# Thing authoring tool

## Skinned export

Bind-space weighting keeps duplicated finish-boundary vertices deforming together. See
`src/skin.ts`, `authoredSkin`, and `tools/packages/thing-export/src/glb.ts`, `writeGlb`.

Meshing must preserve deformation samples without changing the rest silhouette, and skin
support must not inflate rigid exports. Blend extents and profiles belong to content rather
than anatomy-specific constants. See `tools/packages/thing-export/src/voxelize.ts`, `sliceMask`,
`tools/packages/thing-export/src/skin.ts`, `preserveSkinFace`, and `src/skin.ts`, `authoredSkin`.

Exporter proofs stay local so consumer tests need not import their producer.
Fixture exports share the production writer to avoid parallel formats while keeping
test content out of the catalogue. See `test/export-skin-fixture.ts`, `writeRecipeExports`,
and `test/skinExport.test.ts`, `exported`.

Consumers must isolate mutable skeletons and preserve full joint transforms and deformed
bounds: shared pose state couples figures, decomposition can lose shear, and rest bounds
can cull posed geometry. For the exported bind-frame contract, see
`tools/packages/thing-export/src/skin.ts`, `ExportSkin`.

## Authoring ownership

Each item has an authored row so mass has one home even when geometry builders are reused.
A single part takes the core wrapper and can gain parts without changing the export or
preview contract. See `src/catalogue.ts`, `buildItem`, and `models/index.libsonnet`.

Geometry and appearance are separate so changing a finish cannot change fit. Families
select mechanisms while content owns dimensions, material choices and authored masses;
unsupported selections are errors rather than substitutes. See `src/catalogue.ts`,
`loadCatalogue`, and `src/families/`.

Handling datums refer to a named solid rather than duplicate its dimensions, so resizing
a handle or moving its part also moves the hand. Pose corrections stay authored beside
the geometry because the consumer's held frame need not match the tool's upright frame.
See `src/catalogue.ts`, `buildItem`, and `packages.libsonnet`. Attachment datums, exported
as named anchors, use the same solid reference for the same reason: a vehicle part's mount
follows its geometry. See `models/kits/vehicle-parts.libsonnet`. A doll's joint anchor is
instead a point of its part's frame, since a skeleton's joint must land where the skeleton
has it, not on the nearest voxel of the flesh.

Equipment uses family-specific construction rather than a generic box so silhouettes and
exposed working parts remain useful identification cues at play distance. Repair trays show
their contents because a closed case would hide the distinction between metal repair and
clothing repair; folded continuous webbing keeps a sling's ground footprint practical without
making it look like a rigid rod. See `src/families/equipment.ts`, `repairKit`, `webbingSling`
and `pliers`, and `models/catalogue/sets/equipment.libsonnet`.

Jacks and the standalone hoist are ordinary carried tools: their jacking quality is authored
in deadvox content and their models say nothing about load, reach or supported groups, so
what a jack may lift stays a content and runtime decision. See `src/families/jacks.ts`,
`engineHoist`, and `models/catalogue/sets/jacks.libsonnet`.

A builder's starting sizes, finishes, taxonomy and hold are content a modder tunes, so they
live in `models/`, and the builder keeps only the rules that tie one part to another. A default
that scales with the item is stored as a share of the item's size, so the rule stays in the
builder and the share stays in the content. See `packages.libsonnet`, `carton`, and
`models/measures/packages.libsonnet`; for holds, `compound.libsonnet`, `gripStanding`, and
`models/measures/handling.libsonnet`.

The preview draws the same construct report the exporter consumes, so visual inspection is
not a second model implementation. See `src/main.ts` and `tools/packages/tool-ui/src/scene.ts`,
`buildLayers`. The page is `index.html`.

Authoring a row is a loop of edit and look, so the dev server (`npm run dev`, which listens on the LAN so another
machine's browser can watch) evaluates the row a page views when a Jsonnet source is saved, and the page redraws it in
place: the camera is what the author has just set, and a reload would throw it away. The row is in the address
(`?item=`) for the cases a reload happens anyway. Only viewed rows are evaluated because compiling every twin costs
seconds, while Jsonnet is lazy and one row costs about one evaluation. The page draws
a row only from its own evaluation, and a failed one is shown beside the old drawing, so a model is never silently
stale. A row's data is self-contained, so nothing else is evaluated with it. The list of rows and the settings come
from the manifest and the settings twin made when the server started. A row no recipe exports yet is drawn too, since a
row is authored before it is exported. A built page, which has no server to evaluate, fetches the row file of the row it
opens rather than carrying the catalogue, and the dev server does not watch those files, so a refresh that writes,
adds or sweeps a row reloads nothing. See `vite.config.ts`, `server/evaluateRow.ts`, `src/main.ts` and
`src/viewerContent.ts`.

Pack-owned recipes make consumption explicit rather than inferring targets from item
relationships. Shared validation and file writing prevent parallel formats. See
`tools/recipes.mjs`, `readRecipes`, `src/exports.ts`, `loadThingRecipe`, and
`src/cli/export.ts`, `exportThingRecipes`.

Inventory atoms may retain a runtime item weight rather than exported part masses:
a vessel containing a serving must not gain the serving's mass twice, and visual
primitives are not inventory parts. Every row authors its `exportMass` choice, with no
helper default, so copying a helper cannot silently switch which mass is the authority.
That choice follows each item into its recipe; disagreement is refused rather than silently choosing an
authority. Geometry and authoring-preview physical properties do not change with
that export choice. See `src/catalogue.ts`, `ItemSchema`, `src/exports.ts`,
`exportItem` and `loadThingRecipe`, and `models/catalogue/sets/cans.libsonnet`, `shellMassKg`.

An authored mass is free to drift from its geometry, and a part that silently carries another part's weight
misleads every consumer that strips or swaps parts. So a recipe row may bound its parts' drawn density, per material
where a material is lighter, and the export refuses a part whose mass its drawn voxels could not weigh. Drawn voxels,
not a solid's nominal volume, are what the consumer sees and collides with. The bounds are tuning content in the
pack that owns the rows, since only content knows what its parts are made of; material ids name appearance, not
substance, so a bound for one is a content choice rather than a physical fact the tool could hold. See
`src/density.ts`, `checkDrawnDensity`, and `models/measures/vehicle-part-density.libsonnet`.

Trap-state presentation needs a consumer-side model selection rule as well as geometry;
it does not belong in the geometry authoring tool. See `src/families/bearTrap.ts`, `bearTrap`.

## Glow

An item that lights names the finish slot that glows in its own row, as `glow`, and the
export writes that slot's material as the model entry's `emissiveMaterial`: the name of the
one glTF material it draws, its colour as `#rrggbb`. The tag says only which part glows; the
consumer owns the glow's colour, strength, switching and cast light. It is authored with
the asset because the asset owns its material names, so a material change and its glow tag
change together in one row rather than in a consumer's mapping. The glow slot needs a
material no other slot of the item uses, and the export refuses an item unless its GLB
names that material exactly once, so the tag never points at nothing or lights a second
part. See `src/catalogue.ts`, `glowMaterial`, `src/exports.ts`, `checkGlow`, and
`models/catalogue/sets/batch-060.libsonnet`, `road_flare`.

## Paint

A part names the finish slots that take a consumer's paint, as `paintable`, and the export
marks the glTF materials those slots draw. The mark sits on the material rather than on a
name a consumer must recognise, so renaming a material never loses its paint. A paintable
slot keeps a material of its own even where an unmarked slot shares its look, so painting
the body never recolours trim drawn in the same colour. The build refuses a paintable slot
that colours no solid, because its paint would land nowhere. Why a vehicle site seeds the
paint is in `docs/decisions/0003-vehicle-paint.md`. See `src/catalogue.ts`, `buildPart`, and
`tools/packages/thing-export/src/appearance.ts`, `resolveAppearance`.

## Covers

A worn shell's row names what of the doll it hides, as `covers`: doll parts, or pieces of
the part the shell is drawn on, and the model entry and manifest carry it to the consumer.
A shell lies flush on the skin it is fitted to, so skin left drawn beneath shows through it.
The row names what it covers because the shell's cut is authored there, and a consumer
holds no list of garments. The doll draws each region it may hide as its own piece, so a
garment that leaves the shoulders bare hides only the trunk, and a boot whose ankle cap
rises into a shaft hides only the sole. A shell declares only what it encloses at rest, so
hiding it never opens a hole; the build checks every declaring item for skin left outside
its shell. The regions, and so the names `covers` may use besides the part, those drawn as a piece of it, are
content in a doll's record, `models/dolls/<id>/doll.libsonnet`, `regions`. See `src/families/body.ts`, `region`,
`tools/dollRig.mjs`, `coverGaps`, and `tools/packages/thing-core/src/schema.ts`,
`NeutralModelSchema`.

## Body families

A doll's skeleton is not the player's: its joints may sit off the line a limb is drawn about, and its trunk and feet
may bend where the player's do not. So the body families take each joint's place and each extra bend as optional
content, and with none given they draw the player's parts unchanged, which keeps every existing doll's models as
they are.

A joint is given whole, as the doll's skeleton has it, and its height must be the one the measures lay the flesh out
from, or the part would turn about a point its flesh does not end at. A limb segment's flesh stands on the middle of
its bone, so a bone that runs off the centre line carries its flesh with it; the flesh is drawn upright rather than
leaning with the bone, because the voxel families draw no slanted solids. That serves a bone a few millimetres off
its line; a thumb, which leaves its hand at an angle, is a model of its own, drawn hanging straight and rested turned
on the hand (`../../README.md`, the doll), as a stair of upright steps reads as no thumb. The round cap that lets a joint bend sits
on the joint, and the part is handed over about its own joint, because that is the point its bone turns it about.
A bust cut into spine and clavicle parts, or a foot cut at its ball, shares one drawn mass among the parts rather
than drawing each anew, so the split body has the silhouette the whole one has; a spine's joints sit toward the back
of the trunk, so the trunk is not moved onto them. The ribs and the chest are cut where their joints stand, so the
cut and the joint cannot disagree. A region is then a union of whole parts, which needs no piece of its own: a shell
over such a part names the part in `covers`, since a consumer hides by the names a part's primitives carry. The
chest's joint must be the armpit, because a garment's trunk ends there and a region that ended elsewhere would hide
skin it does not enclose. A clavicle lifts only the girdle's slope; the girdle's top under the
neck stays on the chest, because the neck hangs from the chest and parts that are not joined may not overlap, so the
neck could stand on nothing else. A torso whose trunk stays whole but whose arms hang from clavicles, as the player's
do, is given the clavicles' cut alone, so the shoulder can come forward without the trunk turning. See
`src/families/body.ts`, `cut` and `translate`, `src/families/bust.ts`, `bust`, and `src/families/avatarLimbs.ts`.

A garment worn on such a body is cut where the body is, so each shell rides the bone whose flesh it encloses and
bends with it; a shell that spanned a bend would leave the flesh under it uncovered or pierce it. Halving a turned
piece would leave it open, so a cut refuses one it crosses unless the caller hands it whole to the side of the joint
holding its middle, as the boot's round toe is. See `worn-fit.libsonnet`,
the torso's `spine` and the feet's `ball`, and `compound.libsonnet`, `cut` and `moved`.
