---
type: breaking
---
`rifle_assault` is now built from the modular free-float AR-15 carbine. The carbine has a 16 inch barrel, a free-floating railed handguard, rail front and rear sights and a collapsible stock. Its sidecar adds a `charging_handle` anchor at the middle of the T's rear face. Its `grip`, `support` and `butt` come from the new grip, handguard and stock, and the stock rests extended. Its nodes are now named for the `ar15-*` parts: `bolt-carrier:ar15-bolt-carrier` and `charging-handle:ar15-charging-handle` in `gun.action`, plus `port-cover:ar15-port-cover` (hinge) and `stock:ar15-stock` (slide) in `gun.moving`. The loose AR parts it shipped are gone: `receiver_ar`, `charging_handle_ar`, `bolt_carrier_ar`, `lower_ar`, `barrel_ar_medium`, `handguard_ar_clamped`, `grip_standard`, `stock_m4_medium` and `front_sight_ar`. Its parts now ship as `ar15_lower`, `ar15_upper_flattop`, `ar15_barrel_16_mid`, `ar15_gas_block_low`, `ar15_rear_sight`, `ar15_rail_front_sight`, `ar15_handguard_free_float`, `ar15_flash_hider`, `ar15_tube_carbine`, `ar15_stock_collapsible`, `ar15_grip`, `ar15_bolt_carrier`, `ar15_charging_handle` and `ar15_port_cover`.

Upgrade:
- Re-place anything attached to `rifle_assault` using its new anchors. The support and butt anchors are further from the grip than before.
- Look up the carrier and handle by their new node names, and drive the port cover and stock from `gun.moving`.
- Replace the removed loose AR parts with their `ar15_*` counterparts. The pistol grip `grip_standard` becomes `ar15_grip`.
