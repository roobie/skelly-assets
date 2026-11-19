---
type: breaking
---
The coach's door swings out on a pivot arm, as a touring coach's does, instead of folding: `coach_door_arm` turns out
on a column at the doorway's rear end and carries `coach_door_leaf`, which stays parallel to the body and stops beside
the doorway, behind it.

Upgrade:
- Place `coach_door_arm` where you placed `coach_door_jamb` and `coach_door_leaf` where you placed `coach_door_free`,
  the leaf riding the arm, at the coach's `door_arm_0` and `door_leaf_0` sites, and open them by playing their
  `motion`s on one clock.
