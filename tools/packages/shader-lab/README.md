---
read_if:
  - you tune a bark or leaf look, or judge one before it ships
  - a surface shader breaks or draws wrong and you want to see it outside skelly
---

# shader-lab

A look is numbers in `models/surfaces.libsonnet`, and numbers are judged by eye. The lab shows the built models
wearing their looks, voxel and smooth side by side, under a few lights and from the cameras a player has, and redraws
on every edit without a reload, so a tune is seen in the second it is made.

- It patches three's materials the way skelly does, so what draws here draws there, and a shader error is shown on
  the page with the surface edit and line it came from rather than as a black material in a game.
- It draws only what the assets decide. Skelly's fog, mood, auto-tone and sky are the game's, so a look is judged
  bare, and the page says so.
- The sliders span the schema's ranges, so no slider can write a look the build refuses, and the lab writes nothing:
  it hands back a `wear(...)` snippet to paste, so content stays the only place a look lives.
- Its stages, test pieces and camera settings are content too, in `models/shader-lab.jsonnet`.

Run it from here against a built tree (default the repo's `built/`, or `--built <dir>`, or `SHADER_LAB_BUILT`):

```sh
npm run dev
```

It serves on the LAN on port 5180.

The showcase site also serves the lab as one of its viewers, so a look can be judged and tuned without a checkout.
There it draws the site's own build, and its content is fixed when the site is built: the sliders still write a
snippet to paste, but an edit is seen only in the dev server.
