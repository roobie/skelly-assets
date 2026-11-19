---
type: fixed
---
A melee clip's `held.at` now lands on the player arm's `grip` anchor, where a figure's fist holds an item, rather than
two centimetres off it, and `held.turn` is written unit length. The `onehand` and `twohand` guards hold the weapon
cocked back, loaded to swing, with the holding hands and the handle in a first-person view; the idle stays neutral. A
strike may name a `drawn` key its recovery passes through halfway back to the guard, and the `onehand` overhead does,
so its end still reaches farthest at the hit. The strikes keep their phases and hit timing.
