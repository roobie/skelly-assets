---
read_if:
  - you audition or add a Faust sound patch, or render a batch to listen to
  - you decide whether procedural sound from Faust is worth building on
---

# faust-sfx

A spike: it asks whether describing sound families in Faust, and drawing random settings from them, finds sounds
worth keeping faster than hand-writing a synth per sound the way `../impact-synth` does.

- Patches are content, in `../../../models/sounds/patches/`, beside the project's other sound rows: a family is one
  `.dsp` file, and its sliders' declared ranges are the whole space a batch draws from, so widening a family is a
  patch edit, never a code one. The batch settings are `explore.json` there.
- Faust compiles in WebAssembly through `@grame/faustwasm`, so no system compiler is needed, and the pin is exact
  because the compiler and its standard library decide the samples.
- A sound is named by its patch and seed alone, because the listener reports back by file name and that name must be
  enough to render the same sound again: `node tools/explore_sounds.mjs --out <dir> --patch <patch> --seed <seed> --count 1`.
- Every render gets a fresh instance, so a render's noise restarts and the same seed gives the same samples. The
  noise itself is seeded by a slider `sfx.lib` gives every patch, drawn like any other, because noises.lib alone
  starts every instance on the one stream and every seed of a family would share its noise.
