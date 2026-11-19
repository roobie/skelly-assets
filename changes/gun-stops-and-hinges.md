---
type: breaking
---
A gun part's motion can name any number of stops, not only `rest`, `unlocked` and `open`, and `open` is no longer always the last one. The compact SMG's charging handle now exports its turn into the notch as a last stop, `notched` at clock 1, with `open` at the end of its stroke; the gun generator also has a `fal-folding` stock that turns from `open` to `folded`.

Upgrade:
- Read the SMG handle's `gun.action.parts[*].motion` as a slide then a hinge with the stops `rest`, `open` and `notched`. The timeline's legs are unchanged and never go to `notched`, so a handle posed from them plays as before; a reader that took clock 1 for `open` must look the stop up by name.
