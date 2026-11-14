local site = import 'site.libsonnet';
{
  title: 'Rescue truck',
  // Racking and roof gear take the place of the fire engine's tank, ladder and pump.
  sites: site.adjust(
    (import 'fire_engine.placements.libsonnet').sites,
    drop=['water_tank', 'gantry', 'roof_ladder', 'pump_panel', 'hose_reel'],
    add=[
      site.one('racking', 'rescue_truck_racking'),
      site.one('marking', 'rescue_truck_marking'),
      site.one('rear_shutter', 'rescue_truck_rear_shutter'),
      site.one('roof_rack', 'rescue_truck_roof_rack'),
      site.one('roof_gear', 'rescue_truck_roof_gear'),
      site.one('light_mast', 'rescue_truck_light_mast'),
      site.one('winch', 'rescue_truck_winch'),
    ],
  ),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail: the rails sit too close together for it.'),
  ],
}
