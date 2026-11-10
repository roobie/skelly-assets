---
type: breaking
---
Vehicle part masses are rebalanced so each part weighs what its geometry could: truck frames are lighter, engines,
axles, bodies and booms heavier, and heavy vehicles land in real curb-weight ranges. The bucket truck now fits
`box_truck_chassis` and a new `bucket_truck_hydraulics` part; `bucket_truck_chassis` is retired.

Upgrade:
- Apply `renames.json` to saved and authored part ids; `bucket_truck_chassis` maps to `box_truck_chassis`.
