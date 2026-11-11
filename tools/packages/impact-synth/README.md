---
read_if:
  - you add or tune an impact sound row, or a surface or object for one
  - you render impact samples from a consumer, or decide what the synth may depend on
  - you decide whether a sound belongs in this repository
---

# impact-synth

Synthesises the sound of one object dropped on one surface: bounces, a roll and the rocks that follow, as mono
samples. See `src/synth.ts`, `renderImpact`.

## Contract

- A render is a pure function of the row, the seed and the sample rate. A consumer that renders ahead of time and
  one that renders at load get the same samples, and a seed is a variant a player can hear again. So the core uses
  a seeded generator, never `Math.random`, and nothing of Web Audio; a consumer copies the samples into whatever
  buffer its audio API wants.
- Every tuning number is in a row, none in the code, so a mod or a new material is a content edit. Rows are
  `models/sounds/impacts.jsonnet`, validated on load by `src/schema.ts`, `ImpactRowSchema`, which rejects a
  setting out of range, so a bad row fails where it is written and not as silence or a hang at play time.
- The code keeps only what is the synth's own: the three kinds of event (bounce, roll, rock) and the -60 dB
  definition of a decay time.
- Only sounds the project owns are authored here. The reason is in `README.md`, "Sounds".

## Rows

A row's `object` is what falls and its `surface` is what it lands on. Each ring mode is a pitch, a time to fall
60 dB and a level. Glass reads as glass because its decay falls roughly as 1/f, every mode is one pure sine and
nearly all energy sits above 2.5 kHz; brass adds beating pairs, spin and a second strike that glass lacks.
