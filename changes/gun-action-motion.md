---
type: breaking
---
A gun's `gun.action.parts` each carry a `motion` (stages and stops, in the model file's axes and in metres, as a vehicle part's) instead of `axis`, `strokeMetres` and `turn`, and its `fire` and `hand` timelines name the stops they run through, as `legs`, instead of phase seconds. The glTF nodes no longer carry `extras.motion`; the sidecar is the one place a model's motion is read.

Upgrade:
- Pose an action part with `poseAt(part.motion, clock)` from `@skelly/motion/motion`, with the clock from the timeline: each leg of `fire` or `hand` runs the clock linearly from the stop the part is at (`rest` to begin) to the stop named by `to`, in `seconds`; a leg to the stop it is at holds; after the last leg the part stays at rest until `durationSimSeconds`.
- Read a part's travel as the shift of `poseAt(part.motion, 1)`, instead of `axis` times `strokeMetres`.
- Read a part's motion from the sidecar's `gun.action.parts[*].motion`, matched to its glTF node by `node`, instead of the node's `extras.motion`.
