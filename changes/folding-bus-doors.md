---
type: breaking
---
Every bus door leaf now folds in two: a jamb panel that turns out of the doorway and a free panel that rides it,
each exporting a hinge motion in place of the leaf's hinge anchors. A panel's origin lies on its hinge pins, not at its
centre, it is drawn on a finer grain than its vehicle, and its leaf stops clear of the other leaf of its doorway at every step of the fold. The prison bus's door bars ride the panels.

Upgrade:
- In place of each `<bus>_door`, `<bus>_door_fwd` and `<bus>_door_aft`, place its `_jamb` and `_free` panels, the free
  panel riding the jamb panel, as the vehicles' placements do; `models/renames.json` maps each old id to its jamb panel.
- Place `prison_bus_door_bars` once on each prison bus door panel, riding it.
