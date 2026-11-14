local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'technical.spec.libsonnet';
local wheel = 'wheel_235_75r15';
{
  title: 'Armed pickup truck',
  sites: [
    one('frame', 'technical_frame'),
    one('cab', 'technical_cab'),
    one('windows', 'technical_windows'),
    one('dashboard', 'technical_dashboard'),
    one('bonnet', 'technical_bonnet'),
    one('grille', 'technical_grille'),
    one('bull_bar', 'technical_bull_bar'),
    one('bed_floor', 'technical_bed_floor'),
    one('bed', 'technical_bed'),
    one('tailgate', 'technical_tailgate'),
    one('roll_hoop', 'technical_roll_hoop'),
    one('pedestal', 'technical_pedestal', [s.pedestalX, s.deckTop, 0]),
    one('steering_box', 'technical_steering_box'),
    one('front_axle', 'beam_axle_light', [s.frontAxle, s.hub - 0.37, 0]),
    one('rear_axle', 'beam_axle_light', [s.rearAxle, s.hub - 0.37, 0]),
  ] + engine.sites('i4_petrol_medium', [1.65, 0.38, 0], 'assembly') + [
    one('gearbox', 'gearbox_inline', [1.1, 0.44, 0]),
    one('prop_shaft', 'prop_shaft_long', [-0.1, 0.4, 0]),
    one('radiator', 'radiator_car', [2.32, 0.6, 0]),
    one('fuel_tank', 'fuel_tank_car', [-2.04, 0.42, 0]),
    one('exhaust', 'exhaust_rusted', [-1.92, 0.22, 0.44]),
    one('tow_hitch', 'tow_hitch', [s.rear - 0.06, 0.46, 0]),
    one('bench', 'bench_seat_3', [0.17, s.floor + 0.04, 0]),
    one('steering_wheel', 'steering_wheel', [s.cowl - 0.36, s.floor + 0.68, -0.38]),
    one('gear_lever', 'gear_lever', [0.5, s.floor + 0.18, 0]),
  ]
  + pair('front_wheel', wheel, [s.frontAxle, s.hub, s.wheelZ])
  + pair('rear_wheel', wheel, [s.rearAxle, s.hub, s.wheelZ])
  + pair('door', 'technical_door')
  + pair('wing', 'technical_wing')
  + pair('mirror', 'door_mirror', [0.62, s.waist + 0.12, s.skin])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.02, 1.0, 0.76])
  + pair('headlamp', 'car_headlamp', [s.nose + 0.05, 0.78, 0.62])
  + site.batteryBay('battery_tray', [2.0, 0.76, 0.42]),
  tags: { 'vehicle-role': ['military'] },
}
