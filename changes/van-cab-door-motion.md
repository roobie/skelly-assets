---
type: breaking
---
The cab doors of the vans built on the shared van body now export a hinge motion in place of their hinge anchors, as
the car doors do, so the showcase's Open view swings them and a game plays the same swing the build proved clear of the
wing. The security van's quarter-light plate is a part of its own, `security_van_quarter_plate`, since it stays shut
when the door opens; the riot and security vans' door grilles, door markings and cab plates ride the door.

Upgrade:
- Open each `<van>_front_door` by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`.
- Place `security_van_quarter_plate` once on each side, beside `security_van_cab_plate`, and have the door grilles,
  door markings and cab plates ride `front_door`, as the vehicles' placements do.
