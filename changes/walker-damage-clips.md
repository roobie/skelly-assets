---
type: added
---
The boss walker `mech_walker_mob_1` limps and flinches. Each foot is now a cut point (its body's `severableParts`
lists `foot.L` and `foot.R` under the leg regions), so a game hides a lost foot as it hides any cut part, and plays
`limping.walk.left` or `limping.walk.right`, by the side that lost it: a walk loop with its `strideMetres` in which the
stump bears on the ground where the heel stood. `standing.flinch` is a quick tilt back with its `peakAtSimSeconds`;
play it only on a hit by one of the rounds its `heavyRounds` names (today `round_50_h_bmg`, `round_40x365r` and
`round_120x570`, the heavy machine gun and anti-materiel round and heavier).
