---
read_if:
  - bark or leaves look flat, stretched, shimmering, or hide the player
  - adding or tuning a bark or leaf look, or a new kind of shader surface
  - a game draws exported trees, logs or foliage and must decide how far to honour a finish's surface
  - upgrading three, or changing how a game patches its materials' shaders
---

# 22. A shader surface declares its look and the game patches three's programs with it

## Context

Trunks, logs and foliage are voxel and low-poly meshes with no texture coordinates, like garments, so bark draws as
one flat brown and a canopy as a solid green block. A canopy is worse than flat: from the follow camera it hides
the player standing under or behind it.

Fabric solved the first half with one generic shader owned by the assets (`docs/decisions/0013-fabric-finishes.md`).
Bark and leaves need more: leaves cut holes, so they patch the shadow programs too, and their see-through depends on
where the game's own player and camera are, which no asset knows. A shader the assets own whole would have to own the
game's materials, their other patches and their program cache.

## Decision

**A look is content, a kind is code.** A finish's `surface` names a kind and every number its shader reads
(`tools/packages/surfaces/src/schema.ts`, `SurfaceSchema`; the finish binding in
`tools/packages/thing-core/src/materials.ts`). The looks, such as furrowed bark, birch and needles, are
`models/surfaces.libsonnet`, so tuning is a content edit and a mod adds a look without code. A finish takes a fabric
or a surface, never both, since each draws the whole surface.

**The package ships edits, not materials.** `@skelly/surfaces` gives a game GLSL to insert after named lines of
three's own sources, through the game's own replace function, and the uniforms to bind. The game keeps its compile
hook, the order of its other patches and its program cache. The package carries no runtime three, so it cannot drift
from the game's copy. Every edit's anchor is tested against three's real sources, so an upgrade that moves one fails
the tests, naming the line, rather than drawing a black surface.

**Numbers are uniforms, and a program is a kind and a pass.** Even a choice such as bark's grain direction or a
leaf's shape is a uniform, so every look of a kind shares one program per pass. A retune, a new look or a live slider
compiles nothing, and a game warms a handful of programs ahead of first draw instead of one per look.

**Bark is drawn in the model's axes and fades to its mottle.** Furrows and plates run along a grain axis from the look
(up a standing trunk, along a lying log's longest side), and an end face draws an unstretched ring of plates. Every
lightness term averages to the finish's own colour over a wide face, and the fine terms fade by screen footprint, so
a distant trunk keeps its finish's colour and only a slow mottle, and never shimmers.

**Leaves are cut by a fixed rank, so they open without popping.** Each leaf cell has a rank fixed by its position in
the world, and a fragment is cut when its cell's rank lies at or above the coverage in force. Lowering coverage only
removes leaves, highest rank first, so a canopy thins smoothly and the same leaves always go. Shading per leaf never
moves the cut.

**The local view opens leaves, shadows do not.** Inside a capsule from the camera to the local player, coverage falls
toward a near coverage the game picks, with a soft edge, so the player shows through a canopy. Those inputs reach the
lit pass only: the shadow passes cut at the look's own coverage, so one player's view never moves a shadow another
player sees, and the shipped looks are solid for everyone.

**The manifest names the contract.** `surfaceContract` in the manifest is the version of the surfaces the extras are
written for. A game whose shaders read another version knows the looks may not fit them, rather than drawing wrong.

## What a game does

It reads `extras.surface` beside `materialId` on each GLB material, and for each one: takes `surfaceUniforms` once
per material, calls `patchSurface` from its own compile hook with its own replace function, and adds `surfaceKey` to
its program cache key. For a kind that patches its shadow passes, it gives the mesh custom depth and distance
materials patched the same way and sharing the same uniforms. For leaves it keeps one set of `leafInputs`, shared by
every leaf material, and sets it each frame from its camera and local player. A game that skips all this still draws
the finish's flat colour and roughness.
