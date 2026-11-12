local site = import 'site.libsonnet';
local s = import 'crew_pickup.spec.libsonnet';
{
  title: 'Crew-cab pickup',
  sites: [
    site.one('shell', 'crew_pickup_shell'),
    site.one('windscreen', 'crew_pickup_windscreen'),
    site.one('bonnet', 'crew_pickup_bonnet'),
    site.one('front_bumper', 'crew_pickup_front_bumper'),
    site.one('dashboard', 'crew_pickup_dashboard'),
    site.one('engine', 'engine_i4_diesel', [1.47, 0.48, 0]),
    site.one('gearbox', 'gearbox_inline', [0.93, 0.45, 0]),
    site.one('rear_axle', 'beam_axle_light', [s.rearAxle, 0.032, 0]),
    site.one('prop_shaft', 'prop_shaft_short', [0, 0.42, 0]),
    site.one('radiator', 'radiator_van', [s.front - 0.3, 0.58, 0]),
    site.one('fuel_tank', 'fuel_tank_van', [-2.25, 0.38, -0.04]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.8, 0]),
    site.one('rear_bench', 'bench_seat_3', [-0.42, s.floor, 0]),
    site.one('frame', 'crew_pickup_frame'),
    site.one('bed_floor', 'crew_pickup_bed_floor'),
    site.one('bed_front', 'crew_pickup_bed_front'),
    site.one('bed_tailgate', 'crew_pickup_bed_tailgate'),
    site.one('rear_bumper', 'crew_pickup_rear_bumper'),
    site.one('rear_prop_shaft', 'prop_shaft_short', [-0.9, 0.42, 0]),
    site.one('exhaust', 'exhaust_long', [s.rear - 0.12 + 0.58, 0.4, 0.5]),
    site.one('tow_hitch', 'tow_hitch', [s.rear, 0.42, 0]),
    site.one('spare_wheel', 'spare_wheel_carrier', [s.bedFront - 0.04, s.bedFloorTop + 0.367, 0]),
  ]
  + site.pair('front_wing', 'crew_pickup_front_wing')
  + site.pair('front_door', 'crew_pickup_front_door')
  + site.pair('rear_door', 'crew_pickup_rear_door')
  + site.pair('bed_side', 'crew_pickup_bed_side')
  + site.pair('tail_lamp', 'tail_lamp_tall', [s.rear - 0.03, 0.78, 0.84])
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.366, s.side - 0.1325 - 0.05])
  + site.pair('front_wheel', 'wheel_265_75r16', [s.frontAxle, 0.402, s.side - 0.1325])
  + site.pair('rear_wheel', 'wheel_265_75r16', [s.rearAxle, 0.402, s.side - 0.1325])
  + site.pair('front_seat', 'front_seat', [0.3, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.97, 0.62)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.75, -0.44]),
}
