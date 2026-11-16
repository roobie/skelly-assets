local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local cooling = import 'cooling-kit.libsonnet';
local s = import 'skid_steer.spec.libsonnet';
local block = (import 'engines.libsonnet')[s.engine.name];
// The engine and radiator are fitted as assemblies, so the open tail door shows an engine room of salvageable parts.
// A site cannot turn its part, so the engine's pulleys face the cab and the radiator's fan faces the tail door, a
// pusher blowing out through its grille. The kit's radiator hoses would run out through that door, and the kit's air
// box beside the block would stand in the lift-arm tower, so each takes the skid steer's own part or site: the kit's
// sites promise the kit's layout. The air box sits on the valve cover's rear half, reflected so its duct faces the
// intake side.
local engineSites =
  local kitSites = engine.sites(s.engine.name, s.engine.at, 'assembly');
  local airBox = [x for x in kitSites if x.id == 'air_box'][0];
  site.adjust(kitSites, drop=['air_box'], add=[
    site.one('cover_air_box', airBox.part, [s.engine.at[0] - block.length / 4, s.engine.at[1] + block.height, 0]) + { mirror: true },
  ]);
local radiatorSites = site.adjust(cooling.sites(s.radiator.name, s.radiator.at, 'assembly'),
                                  drop=['radiator_hose_upper', 'radiator_hose_lower']);
{
  title: 'Skid-steer loader',
  sites: [
    site.one('frame', 'skid_steer_frame'),
    site.one('cage', 'skid_steer_cage'),
    site.one('door', 'skid_steer_door'),
    site.one('engine_cover', 'skid_steer_engine_cover'),
    site.one('tail_door', 'skid_steer_tail_door'),
    site.one('lift_arms', 'skid_steer_lift_arms'),
    site.one('bucket', 'skid_steer_bucket'),
  ] + engineSites + radiatorSites + [
    site.one('coolant_hoses', 'skid_steer_coolant_hoses'),
    site.one('oil_cooler', 'skid_steer_oil_cooler'),
    site.one('hydraulic_tank', 'skid_steer_hydraulic_tank'),
    site.one('hydraulic_hoses', 'skid_steer_hydraulic_hoses'),
    site.one('fuel_tank', 'fuel_tank_car', [-0.1, 0.42, 0]),
    site.one('exhaust', 'skid_steer_exhaust', [s.engine.at[0], 1.42, -0.25]),
    site.one('seat', 'pan_seat', [0.0, s.floor + 0.2, 0]),
    site.one('beacon', 'beacon_amber', [-0.1, s.roof + 0.05, 0]),
  ]
  + site.pair('chain_case', 'skid_steer_chain_case')
  + site.pair('front_wheel', 'wheel_265_75r16', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'wheel_265_75r16', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('lift_ram', 'skid_steer_lift_ram')
  + site.pair('tilt_ram', 'skid_steer_tilt_ram')
  + site.pair('control', 'gear_lever', [0.34, s.floor + 0.34, 0.33])
  + site.pair('work_lamp', 'work_lamp', [s.cageFront + 0.04, s.roof + 0.05, 0.34])
  + [lamp { rides: 'tail_door' } for lamp in site.pair('tail_lamp', 'tail_lamp_small', [s.tailDoor + 0.02, 1.06, 0.38])]
  + site.batteryBay('battery_tray', s.batteryAt),
  tags: { 'vehicle-role': ['construction'] },
}
