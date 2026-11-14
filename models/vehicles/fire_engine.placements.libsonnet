local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'fire_engine.spec.libsonnet');
// The kit each locker carries, slot to catalogue item (fire_engine.libsonnet, `stowage`): breathing sets, sheets and
// boxes up front, hand tools on the mid board, hose over the wheel and the machines aft.
local loadOut = {
  fore: { ['cylinder_%d' % i]: 'breathing_air_cylinder' for i in std.range(0, 4) }
        + { ['sheet_%s_%d' % [shelf, layer]]: 'tarp' for shelf in ['a', 'b'] for layer in [0, 1] }
        + { low_a: 'toolbox', low_b: 'small_plastic_case', low_c: 'first_aid_box', high_c: 'small_fire_extinguisher' },
  mid: { hook_a: 'fire_ax', hook_b: 'halligan', hook_c: 'sledgehammer', hook_d: 'crowbar', floor_a: 'extinguisher', floor_b: 'extinguisher' },
  wheel: { ['roll_%d_%d' % [layer, i]]: 'fire_hose_roll' for layer in [0, 1] for i in [0, 1, 2] }
         + { roll_top_0: 'fire_hose_roll', roll_top_1: 'fire_hose_roll' }
         + { bar_back: 'standpipe', bar_fore: 'branch_nozzle', bar_front: 'branch_nozzle', bar_top: 'hydrant_key' },
  aft: { floor_machine: 'portable_fire_pump', floor_cone: 'traffic_cone', shelf_machine: 'ventilation_fan', shelf_case: 'toolbox' },
};
{
  title: 'Fire engine',
  sites: t.fittings(site.kit, 'fire_engine', s) + [
    site.one('body', 'fire_engine_body'),
    site.one('rear_wall', 'fire_engine_rear_wall'),
    site.one('cab_stripe', 'fire_engine_cab_stripe'),
    site.one('water_tank', 'fire_engine_water_tank'),
    site.one('gantry', 'fire_engine_gantry'),
    site.one('roof_ladder', 'fire_engine_roof_ladder'),
    site.one('pump_panel', 'fire_engine_pump_panel'),
    site.one('hose_reel', 'fire_engine_hose_reel'),
    site.one('rear_step', 'fire_engine_rear_step'),
    site.one('crew_bench', 'bench_seat_3', [1.32, s.floor, 0]),
  ]
  + std.flattenArrays([site.pair('locker_shutter_' + name, 'fire_engine_locker_shutter_' + name) for name in std.objectFields(s.lockers)])
  + std.flattenArrays([
    site.pair('locker_stowage_' + name, 'fire_engine_locker_stowage_' + name, stowed=loadOut[name], behind='locker_shutter_' + name)
    for name in std.objectFields(s.stowage)
  ])
  + site.pair('cab_beacon', 'beacon_blue', [s.face - s.lean - 0.45, s.roof + 0.11, 0.9])
  + site.pair('rear_beacon', 'beacon_blue', [s.bodyRear + 0.2, s.bodyTop, 0.95]),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail.'),
  ],
}
