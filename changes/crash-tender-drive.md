---
type: breaking
---
The airport crash tender drives its front axle, `drive_axle_wide` in place of `steered_axle_wide`, through new parts
`airport_crash_tender_transfer_case`, `airport_crash_tender_front_shaft` and `airport_crash_tender_rear_shaft`. It rides
higher on lugged tyres, its engine's manifolds sit between its frame rails, and its engine is fitted as an assembly
whose air box hangs under the near rail at its own `low_air_box` site.

Upgrade:
- Apply `renames.json`; `steered_axle_wide` maps to `drive_axle_wide`.
