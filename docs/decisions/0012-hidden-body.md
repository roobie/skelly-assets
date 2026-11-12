---
read_if:
  - a worn item shows the doll's skin through it in stripes, or a hidden region leaves a hole in the doll
  - declaring what of the doll a worn shell covers, or a build refuses a declaration as opening a gap
  - adding or moving a hideable region of the doll, or a garment that covers only part of a doll part
  - a game or a page draws the doll dressed and must decide which of its body to draw
---

# 12. A worn shell hides the doll regions it encloses

## Context

A worn shell fitted close to the doll lies on the doll's surface in places, and two coincident faces draw in stripes
as the depth test ties between them (`docs/decisions/0011-clearance-classified.md`, "Decision"). Fitting every shell
off the body by a margin would loosen every garment to fix a fault no player sees from outside. The usual fix in games
is to stop drawing body a garment fully covers. Hiding by slot, a torso garment hiding the torso, fails a partial
garment: a tank top covers the trunk but leaves the shoulders bare, so hiding the torso would show holes where the
shoulders should be.

## Decision

**Hide by region, not by slot.** The bust's torso is cut into regions along its own solids
(`tools/packages/thing-authoring-tool/src/families/bust.ts`, `bust`): the trunk below the armpit and the shoulders above
it. The cut follows existing solids, so it adds no geometry and moves no fit. The trunk stays inside the hanging
arm, so a sleeveless shell can enclose it with sides the arm never lies over. A garment that covers only part of a
region needs a finer cut, made when such a garment is added, not in advance.

**Each region is a closed surface.** The export keeps the faces where two regions meet
(`tools/packages/thing-export/src/glb.ts`, `voxelPrimitivesFor`), so hiding one region shows the other's closed face,
not a hole into the body. The faces this adds lie inside the doll and never show while both regions are drawn.

**Content declares, code verifies.** A shell names what it covers in `covers`, declared once for its row and its game
entries (`tools/packages/thing-authoring-tool/worn-fit.libsonnet`, `worn`), so the declaration is moddable. A name is
the doll part the shell is drawn on, which hides all of it, or a region of that part. The showcase build refuses a
declaration whose hidden surface is not enclosed at rest by the shell and the other pieces drawn on the same part copy
(`tools/dollRig.mjs`, `coverGaps`), using the clearance probe's test of enclosure. A hem, an armhole or a neckline that
stops short of a hidden region's edge would show the inside of the garment through a gap, so a declaration cannot hide
skin it leaves showing. Only pieces on the same part copy count, because only they ride the same bone and stay where
they were at rest in every pose. Shells placed by hand declare nothing: they only flicker, which hiding would not fix
without a check of their fit.

**One drawer rule.** The showcase, the pose page and the clearance sweep hide through one function
(`site/hiding.mjs`, `hideCovered`), and the pose page's surface leaves out what is hidden, so the sweep and the skin
check judge the doll as it is drawn.

**The game reads what the export already carries.** Each region is a primitive marked by its `piece` in the
primitive's extras, the shape a display piece already exports in, and `covers` rides in the model's sidecar and
manifest entry as `paintable` does (`tools/manifest.mjs`, `_doc`). A game hides a region primitive of the part copy a
worn model is attached to when that model's `covers` names it. The game's own figure entries keep naming whole parts,
since it reads them by hand; moving it to read `covers` and regions is its own change.

## Consequences

A garment that encloses a region only in some poses, such as a long hem a stride lifts, declares nothing for it and
still shows any flush faces; the sweep lists them. Every cut adds faces inside the body, drawn though never seen.
