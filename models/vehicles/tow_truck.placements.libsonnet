local site = import 'site.libsonnet';
local s = (import 'truck-cab.libsonnet').spec(import 'tow_truck.spec.libsonnet');
{
  title: 'Tow truck',
  // The deck and boom take the place of the box truck's box.
  sites: site.adjust(
    (import 'box_truck.placements.libsonnet').sites,
    drop=['box_floor', 'box_front', 'box_roof', 'box_side_near', 'box_side_far', 'rear_door_near', 'rear_door_far'],
    add=[
      site.one('deck', 'tow_truck_deck'),
      site.one('cab_guard', 'tow_truck_cab_guard'),
      site.one('mast', 'tow_truck_mast'),
      site.one('boom', 'tow_truck_boom'),
      site.one('boom_stage', 'tow_truck_boom_stage'),
      site.one('boom_ram', 'tow_truck_boom_ram'),
      site.one('winch', 'tow_truck_winch'),
      site.one('line', 'tow_truck_line'),
      site.one('sling', 'tow_truck_sling'),
    ]
    + site.pair('locker', 'tow_truck_locker')
    + site.pair('stabiliser', 'tow_truck_stabiliser')
    + site.pair('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0.6]),
  ),
  tags: { 'vehicle-role': ['utility'] },
  unjudged: [
    site.unjudged('boom', 'line', 0.035,
      'The collar piece of tow_truck_boom runs into the run_out piece of tow_truck_line.'),
    site.unjudged('boom_stage', 'sling', 0.06,
      'The sheave piece of tow_truck_boom_stage runs into the fall piece of tow_truck_sling.'),
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of box_truck_dashboard runs into the core piece of radiator_truck.'),
  ],
}
