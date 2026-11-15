---
type: breaking
---
The animal control van's cage hatches open: each is a part of its own, hung on drawn round pins at its leading edge as
the cab doors are, so the wind shuts one left unlatched, and its vent grille and latch swing with it. An open hatch
shows its cage's barred gate, which now faces the hatch. Its side door is hung rather than sliding, because an open
hatch stands in the sliding door's path. Every van's hung side door, the food truck's and the ice cream van's too, now
stands its leading edge off the frame, so it no longer rubs the wall ahead as it swings.

Upgrade:
- Place `animal_control_van_hatch` at each `hatch<n>_near` and `hatch<n>_far` site in place of
  `animal_control_van_hatches`, and open it by playing its `motion`. `renames.json` maps the retired id to it.
- Open `animal_control_van_side_door` by playing its hinge `motion`, which no longer slides.
