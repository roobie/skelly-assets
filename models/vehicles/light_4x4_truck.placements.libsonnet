local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'light_4x4_truck.spec.libsonnet');
local id = 'light_4x4_truck';
local shaftRear = s.transferX - 0.2;
{
  title: 'Light 4x4 truck',
  // The engine is fitted as an assembly so each accessory is its own salvage, and the transfer case splits the drive:
  // the short shaft back to the rear axle and the front shaft forward under the engine.
  sites: site.adjust(
    t.fittings(site.kit, id, s),
    drop=['engine'],
    over={ prop_shaft_0: { part: 'prop_shaft_short', at: [shaftRear - 0.6, s.shaftY, 0] } },
    add=engine.sites('v8_petrol_medium', [s.engineX, s.engineY, 0], 'assembly') + [
      site.one('transfer_case', id + '_transfer_case', [s.transferX, s.transferY, 0]),
      site.one('front_shaft', id + '_front_shaft', [(s.transferX + 0.2 + s.frontAxle - 0.2) / 2, s.shaftY, 0]),
      site.one('fuel_tank_far', 'fuel_tank_truck', [s.tankX, s.tankY, -(s.side - 0.34)]),
      site.one('spare_wheel', id + '_spare_wheel', [s.cabBack - 0.01, s.railTop + s.r + 0.02, 0]),
      site.one('platform', id + '_platform'),
      site.one('tailgate', id + '_tailgate'),
    ] + site.pair('dropside', id + '_dropside'),
  ),
  overlaps: [
    site.overlap('cab', 'air_box', 0.123,
      'The air box sits in the cab well, which is drawn as a solid block around it.'),
  ],
  unjudged: [
    site.unjudged('chassis', 'alternator', 0.084,
      'The spring_0 piece of light_4x4_truck_chassis runs into the case piece of alternator_medium.'),
    site.unjudged('dashboard', 'radiator', 0.058,
      'The lower piece of light_4x4_truck_dashboard runs into the core piece of radiator_van.'),
    site.unjudged('engine', 'spare_wheel', 0.093,
      'The head piece of engine_v8_petrol_medium_core runs into the tyre piece of light_4x4_truck_spare_wheel.'),
    site.unjudged('fuel_pump', 'spare_wheel', 0.07,
      'The body piece of fuel_pump_medium runs into the tyre piece of light_4x4_truck_spare_wheel.'),
  ],
}
