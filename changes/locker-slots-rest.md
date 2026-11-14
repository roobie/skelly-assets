---
type: breaking
---
The airport crash tender's and rescue truck's locker kit, and the rescue truck's rear compartment kit, are catalogue
items in stowage slots, as on the fire engine; new fire, rescue and generic items fill them, and the chainsaw,
cut-off saw and pike pole can be stowed. Only kit that only fire and rescue crews carry has the `firefighting` keyword.

Upgrade:
- Load `skelly.melee` with `skelly.ground-vehicles`, which now depends on it for the crash tender's pike pole.
- For each crash tender and rescue truck site with `stowed`, place each named item in its slot as for the fire engine;
  their stowage parts no longer draw the kit.
