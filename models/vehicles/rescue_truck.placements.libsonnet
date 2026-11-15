local site = import 'site.libsonnet';
local s = import 'rescue_truck.spec.libsonnet';
// The kit each locker carries, slot to catalogue item (rescue_truck.libsonnet, `stowage`): hydraulic rescue tools up
// front, lifting bags mid, cribbing over the wheel and power tools aft.
local loadOut = {
  fore: { floor_a: 'hydraulic_power_pack', floor_b: 'hydraulic_hose_reel', low_back: 'hydraulic_spreader', low_front: 'hydraulic_cutter', high: 'rescue_ram' },
  mid: { ['pad_%s_%d' % [stack, layer]]: 'lifting_bag' for stack in ['a', 'b'] for layer in std.range(0, 3) }
       + { case_0: 'small_plastic_case', case_1: 'first_aid_box', cylinder_0: 'breathing_air_cylinder', cylinder_1: 'breathing_air_cylinder' },
  wheel: { ['block_%d_%s_%d' % [i, row, layer]]: 'cribbing_block' for i in [0, 1] for row in ['back', 'front'] for layer in std.range(0, 3) }
         + { chock_0: 'step_chock', chock_1: 'step_chock', strut_back: 'rescue_strut', strut_front: 'rescue_strut' },
  aft: { floor_machine: 'inverter_generator', floor_case: 'toolbox', low_machine: 'chainsaw', high_machine: 'petrol_cut_off_saw', hook: 'sledgehammer' },
};
local rearLoadOut = {
  floor_0: 'toolbox', floor_1: 'small_plastic_case', floor_2: 'toolbox',
  low_case_a: 'first_aid_box', low_case_b: 'small_plastic_case', low_cone_a: 'traffic_cone', low_cone_b: 'traffic_cone',
} + { ['high_%d' % i]: 'rope_bag' for i in [0, 1, 2] };
{
  title: 'Rescue truck',
  // Racking and roof gear take the place of the fire engine's tank, ladder and pump.
  sites: site.adjust(
    (import 'fire_engine.placements.libsonnet').sites,
    // Its lockers hold rescue gear in place of the fire engine's load-outs, and its back opens on a rear compartment.
    over={
      ['locker_stowage_' + name + side]: { part: 'rescue_truck_locker_stowage_' + name, stowed: loadOut[name] }
      for name in std.objectFields(s.stowage)
      for side in ['_near', '_far']
    },
    drop=['water_tank', 'gantry', 'roof_ladder', 'pump_panel', 'hose_reel', 'rear_wall'],
    add=[
      site.one('racking', 'rescue_truck_racking'),
      site.one('marking', 'rescue_truck_marking'),
      site.one('rear_shutter_frame', 'rescue_truck_rear_shutter_frame'),
      site.one('rear_shutter', 'rescue_truck_rear_shutter'),
      site.one('rear_stowage', 'rescue_truck_rear_stowage', stowed=rearLoadOut, behind='rear_shutter'),
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
