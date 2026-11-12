// The engine sits under the boot floor over the rear axle, its gearbox beside it, as on the real car; a site cannot turn
// a part, so the engine lies along the car where the real one lies across it.
local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local wheel = import 'wheel-kit.libsonnet';
local cooling = import 'cooling-kit.libsonnet';
local tank = import 'fuel-tank-kit.libsonnet';
local exhaust = import 'exhaust-kit.libsonnet';
local s = import 'microcar.spec.libsonnet';
local front = { wheel: 'wheel_165_65r15', hub: 0.298, z: 0.7345 };
local rear = { wheel: 'wheel_185_60r15', hub: 0.3015, z: 0.715 };
{
  title: 'Microcar',
  sites: [
    site.one('shell', 'microcar_shell'),
    site.one('windscreen', 'microcar_windscreen'),
    site.one('tailgate', 'microcar_tailgate'),
    site.one('bonnet', 'microcar_bonnet'),
    site.one('front_bumper', 'microcar_front_bumper'),
    site.one('rear_bumper', 'microcar_rear_bumper'),
    site.one('dashboard', 'microcar_dashboard'),
  ] + engine.sites('i3_petrol', [-0.81, 0.36, 0], 'assembly') + [
    site.one('gearbox', 'gearbox_transaxle', [-0.75, 0.25, -0.41]),
  ] + cooling.sites(engine.radiator('i3_petrol'), [s.front - 0.18, 0.22, 0], 'assembly')
  + tank.sites('fuel_tank_car', [-0.2, s.sill, 0.15], 'assembly')
  + exhaust.sites('exhaust_microcar', [s.rear + 0.3, 0.17, 0], 'assembly') + [
    site.one('rear_axle', 'de_dion_axle_small', [s.rearAxle, 0, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
  ]
  + site.pair('front_wing', 'microcar_front_wing')
  + site.pair('front_door', 'microcar_front_door')
  + site.pair('tail_lamp', 'microcar_tail_lamp')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, front.hub - 0.036, front.z - 0.05])
  + wheel.pair(site.kit, 'front_wheel', front.wheel, [s.frontAxle, front.hub, front.z], 'disc')
  + wheel.pair(site.kit, 'rear_wheel', rear.wheel, [s.rearAxle, rear.hub, rear.z], 'drum')
  + site.pair('front_seat', 'front_seat', [-0.12, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.6, 0.5)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.45, -0.26]),
  unjudged: [
    site.unjudged('shell', 'air_box', 0.05,
      'The rear_liner_top_near piece of microcar_shell runs into the box piece of air_box_light.'),
  ],
}
