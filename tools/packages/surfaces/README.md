---
read_if:
  - you add or tune a bark or leaf look, or a new kind of shader surface
  - a game patches its materials with a surface, or its shader errors name a surface anchor
  - you upgrade three and a surface test fails on an anchor
---

# surfaces

Shader-drawn surfaces, such as bark and leaves, as GLSL edits a game applies to three's own programs. The why is in
`docs/decisions/0022-surface-shaders.md`.

## Contract

- A look is content and a kind is code. Every number a kind's shader reads is a field of its look
  (`src/schema.ts`, `SurfaceSchema`) with a range a slider can span, so tuning bark is an edit to
  `models/surfaces.libsonnet` and only a new kind of surface needs code here.
- The package carries no runtime three and owns no material, so a game keeps its own compile hook, patch order and
  program cache, and drops these edits into them beside its others.
- A program is keyed by kind and pass alone, never by a look's numbers, which are uniforms, so a retune or a new look
  of a kind compiles nothing and a game warms one program per kind and pass ahead of first draw.
- Every edit names the three source line it follows, and the tests hold each against three's real sources, so an
  upgrade that moves a line fails here, naming it, and not as a black surface in a game.
- What a game knows and the assets cannot, such as where its local player stands, comes in as inputs, kept apart
  from a look so a shared look never carries one player's view, and read in the lit pass alone so the local view
  never moves a shadow.
