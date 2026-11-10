---
type: breaking
---
Wheels can carry drum brakes: a drum and a shoe assembly at sites of their own, with backing plate, shoes and wheel
cylinder as salvage rows. Trucks, buses, the half-track and the microcar's rear wheels choose disc or drum per axle,
so some vehicles' brake parts, sites and masses change, and wheel assemblies are named for their brake.

Upgrade:
- Apply `renames.json`; axles drawn without their brakes now end in `_bare`.
- Offer the `<wheel>_brake_drum` and `<wheel>_brake_shoes` sites as loot alongside the disc brake's; keep turning only
  the wheel site.
- Read wheel assemblies as `<wheel>_disc_assembly` or `<wheel>_drum_assembly` in place of `<wheel>_assembly`.
