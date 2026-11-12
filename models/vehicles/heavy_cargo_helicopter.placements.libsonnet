local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'heavy_cargo_helicopter.spec.libsonnet';
local id = 'heavy_cargo_helicopter';
{
  title: 'Heavy cargo helicopter',
  sites: [
    one('belly', id + '_belly'),
    one('load_floor', id + '_load_floor'),
    one('cockpit_floor', id + '_cockpit_floor'),
    one('fuselage', id + '_fuselage'),
    one('tail_section', id + '_tail_section'),
    one('cockpit_bulkhead', id + '_cockpit_bulkhead'),
    one('ramp', id + '_ramp'),
    one('windscreen', id + '_windscreen'),
    one('front_pylon', id + '_front_pylon'),
    one('rear_pylon', id + '_rear_pylon'),
    one('front_gearbox', id + '_gearbox', [s.frontHub.x, s.frontMastFoot - 0.3, 0]),
    one('rear_gearbox', id + '_gearbox', [s.rearHub.x, s.rearMastFoot - 0.3, 0]),
    one('front_mast', id + '_mast', [s.frontHub.x, s.frontMastFoot, 0]),
    one('rear_mast', id + '_mast', [s.rearHub.x, s.rearMastFoot, 0]),
    one('front_rotor', id + '_front_rotor', [s.frontHub.x, s.frontHub.y, 0]),
    one('rear_rotor', id + '_rear_rotor', [s.rearHub.x, s.rearHub.y, 0]),
    one('front_gear', id + '_front_gear'),
    one('rear_gear', id + '_rear_gear'),
    one('console', id + '_console', [6.75, s.floorTop, 0]),
    one('beacon', 'helicopter_beacon_red', [-6.0, 5.1, 0.3]),
    one('landing_lamp', id + '_landing_lamp', [6.4, 0.53, 0]),
  ]
  + pair('crew_door', id + '_crew_door')
  + pair('cabin_windows', id + '_cabin_windows')
  + pair('sponson', id + '_sponson')
  + pair('fuel_tank', id + '_fuel_tank', [0, 0.72, 2.05])
  + pair('turbine', id + '_turbine', [s.engine.x, s.engine.y, s.engine.z])
  + pair('front_wheel', id + '_wheel', [s.frontGear.x, s.frontGear.radius, s.frontGear.z])
  + pair('rear_wheel', id + '_wheel', [s.rearGear.x, s.rearGear.radius, s.rearGear.z])
  + pair('crew_seat', id + '_crew_seat', [6.0, s.floorTop, 0.62])
  + pair('control_stick', 'control_stick', [6.35, s.floorTop, 0.62]),
  tags: { 'vehicle-role': ['military'] },
  overlaps: [
    site.overlap('sponson_far', 'fuel_tank_far', 0.4,
      'The sponson draws a tank block of its own, and the fuel tank sits inside it.'),
    site.overlap('sponson_near', 'fuel_tank_near', 0.4,
      'The sponson draws a tank block of its own, and the fuel tank sits inside it.'),
    site.overlap('windscreen', 'front_pylon', 0.074,
      'The front pylon fairing runs up into the windscreen frame.'),
  ],
  unjudged: [
    site.unjudged('cockpit_bulkhead', 'crew_door_far', 0.06,
      'The plate_0 piece of heavy_cargo_helicopter_cockpit_bulkhead runs into the lower_0_0_far piece of heavy_cargo_helicopter_crew_door.'),
    site.unjudged('cockpit_bulkhead', 'crew_door_near', 0.06,
      'The plate_0 piece of heavy_cargo_helicopter_cockpit_bulkhead runs into the lower_0_0 piece of heavy_cargo_helicopter_crew_door.'),
  ],
}
