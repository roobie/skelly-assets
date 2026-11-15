---
read_if:
  - you add or tune an impact sound row, or a surface or object for one
  - you render or bake impact samples, or decide what the synth may depend on
  - you decide whether a sound belongs in this repository
---

# impact-synth

Synthesises the sound of one object dropped on one surface: bounces, a roll and the rocks that follow, as mono
samples. See `src/synth.ts`, `renderImpact`.

## Contract

- A render is a pure function of the row, the seed and the sample rate, so a baked take can be rendered again from
  the row the release ships beside it, and a build bakes the same files on any machine. So the core uses a seeded
  generator, never `Math.random`, and nothing of Web Audio. Games play the baked takes and never call the synth; the
  reason is in `README.md`, "Sounds".
- Every tuning number is in a row, none in the code (the code keeps only unit conversions and the scale of its noise
  draw), so a mod or a new material is a content edit. Each pack's rows are `models/sounds/<pack>.jsonnet`, built from
  the objects and surfaces in `models/sounds/impacts.libsonnet`, and validated on load by `src/schema.ts`,
  `ImpactRowsSchema`, which rejects a setting out of range, so a bad row fails where it is written and not as silence
  or a hang at play time.
- The code keeps only what is the synth's own: the three kinds of event (bounce, roll, rock) and the -60 dB
  definition of a decay time.
- Only sounds the project owns are authored here; the reason is in `README.md`, "Sounds".

## Rows

A row's `object` is what falls and its `surface` is what it lands on, each named by its id. The landing surface picks
the sound, so a pack has one row per object and surface. A row's `seeds` are its takes: a build bakes each to its
own file (`tools/sounds.mjs`, `bakeSounds`), and a game picks among them so repeated landings do not sound
identical. Each ring mode is a pitch, a time to fall 60 dB and a level. Glass reads as glass because its decay falls
roughly as 1/f, every mode is one pure sine and nearly all energy sits above 2.5 kHz; brass adds beating pairs, spin
and a second strike that glass lacks.
