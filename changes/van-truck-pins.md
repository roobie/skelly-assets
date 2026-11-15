---
type: breaking
---
The vans' rear doors and hinged side doors, and the trucks' cab doors, crew doors and box rear doors, export a hinge
motion on drawn round pins in place of their hinge anchors, and the vans' bonnets open, so the showcase's Open view
swings them as a game will. None touches the body as it opens: each edge stands a swing gap off the sill and roof it
slides across, and each trailing edge stands off the post behind it by a tail gap wide enough for its inner corner to
circle the pins clear. A lip inside the post behind each hinged cab door and van side door keeps that
gap from showing through the body. The rear doors open square to the body, and kit on an opening part rides it.

Upgrade:
- Open each of these by playing its `motion`, not by swinging it on `hinge_a` and `hinge_b`: `<van>_rear_door`,
  `food_truck_side_door`, `ice_cream_van_side_door`, `<truck>_door`, `<truck>_crew_door` and `box_truck_rear_door`.
- Open `panel_van_bonnet` and `step_van_bonnet` by playing their `motion`.
- Have `animal_control_van_rear_hatches`, `ambulance_rear_markings`, `prisoner_van_rear_bars`, `riot_van_rear_grille`,
  `riot_van_rear_markings` and `security_van_rear_door_bars` ride `rear_door`, and `swat_truck_door_guard` ride `door`,
  as the vehicles' placements do.
- `fire_engine_cab_stripe` and `airport_crash_tender_cab_stripe` hold only the stripe between and ahead of the doors;
  place `<truck>_door_stripe` riding `door` and `<truck>_crew_door_stripe` riding `crew_door` for the rest, as the
  vehicles' placements do.
