local site = import 'site.libsonnet';
local s = import 'rescue_truck.spec.libsonnet';
{
  title: 'Rescue truck',
  // Racking and roof gear take the place of the fire engine's tank, ladder and pump.
  sites: site.adjust(
    (import 'fire_engine.placements.libsonnet').sites,
    // Its lockers hold rescue gear built into their parts, so they drop the fire engine's load-outs, and its back opens
    // on a rear compartment.
    over={
      ['locker_stowage_' + name + side]: { part: 'rescue_truck_locker_stowage_' + name, stowed:: null }
      for name in std.objectFields(s.stowage)
      for side in ['_near', '_far']
    },
    drop=['water_tank', 'gantry', 'roof_ladder', 'pump_panel', 'hose_reel', 'rear_wall'],
    add=[
      site.one('racking', 'rescue_truck_racking'),
      site.one('marking', 'rescue_truck_marking'),
      site.one('rear_shutter_frame', 'rescue_truck_rear_shutter_frame'),
      site.one('rear_shutter', 'rescue_truck_rear_shutter'),
      site.one('rear_stowage', 'rescue_truck_rear_stowage'),
      site.one('roof_rack', 'rescue_truck_roof_rack'),
      site.one('roof_gear', 'rescue_truck_roof_gear'),
      site.one('light_mast', 'rescue_truck_light_mast'),
      site.one('winch', 'rescue_truck_winch'),
    ],
  ),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail.'),
  ],
}
