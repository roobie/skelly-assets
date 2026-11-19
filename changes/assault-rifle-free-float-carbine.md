---
type: breaking
---
`rifle_assault` is now built from the modular free-float AR-15 carbine. The carbine has a 16 inch barrel, a free-floating railed handguard, rail front and rear sights and a collapsible stock. Its sidecar adds a `charging_handle` anchor at the middle of the T's rear face. Its `grip`, `support` and `butt` come from the new grip, handguard and stock, and the stock rests extended. Its nodes are now named for the `ar15-*` parts: `bolt-carrier:ar15-bolt-carrier` and `charging-handle:ar15-charging-handle` in `gun.action`, plus `port-cover:ar15-port-cover` (hinge) and `stock:ar15-stock` (slide) in `gun.moving`. Its parts ship as `ar15_lower`, `ar15_upper_flattop`, `ar15_barrel_16_mid`, `ar15_gas_block_low`, `ar15_rear_sight`, `ar15_rail_front_sight`, `ar15_handguard_free_float`, `ar15_flash_hider`, `ar15_tube_carbine`, `ar15_stock_collapsible`, `ar15_grip`, `ar15_bolt_carrier`, `ar15_charging_handle` and `ar15_port_cover`, and the loose AR parts it shipped before are renamed to them.

Upgrade:
- Re-place anything attached to `rifle_assault` using its new anchors. The support and butt anchors are further from the grip than before.
- Look up the carrier and handle by their new node names, and drive the port cover and stock from `gun.moving`.
- Drop `front_sight_ar`, the front sight block on the barrel, and `handguard_ar_clamped`, the handguard clamped between the receiver and that block: the carbine's rail sight and free-float handguard mount elsewhere, and no exported part replaces them. Apply `renames.json` for the other loose AR parts.
