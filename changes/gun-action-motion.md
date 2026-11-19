---
type: breaking
---
A gun's `gun.action.parts` each carry a `motion` (stages and stops, in the model file's axes and in metres, as a vehicle part's) instead of `axis`, `strokeMetres` and `turn`, and its `fire` and `hand` timelines name the stops they run through, as `legs`, instead of phase seconds. The glTF nodes no longer carry `extras.motion`; the sidecar is the one place a model's motion is read.

Upgrade:
- Pose an action part with `poseAt(part.motion, clock)` from `@skelly/motion/motion`, with the clock from the timeline: each leg of `fire` or `hand` runs the clock linearly from the stop the part is at (`rest` to begin) to the stop named by `to`, in `seconds`; a leg to the stop it is at holds; after the last leg the part stays at rest until `durationSimSeconds`.
- Find the clock of a stop by its name in `part.motion.stops` (`rest`, `open`, and `unlocked` on a part that turns free); never assume clock 1 is `open`. Read a part's slide as its slide stage's `direction` times `travel`, not as the shift of `poseAt(part.motion, 1)`, which a hinge's swing adds to.
- Derive the timings you read from the legs. The open time is the sum of the legs through the last leg to `open`. The reach is the legs before the first leg to `open`, and the case is ejected at the reach plus `ejectAt` of that leg's seconds (`ejectAt` is a fraction of the first leg to `open`). The forward sound is at the end of the last leg to `open`. A bolt gun is one whose parts have a hinge stage.
- Read a part's motion from the sidecar's `gun.action.parts[*].motion`, matched to its glTF node by `node` (`<part>:<family>`, which the node's `extras.part` and `extras.family` give, since a loader rewrites node names), instead of the node's `extras.motion`.
- An SMG's charging handle exports its slide and its turn into the notch, with the stops `rest`, `open` and `notched`.
