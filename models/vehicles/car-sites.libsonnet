// The sites of a car pressed by `car-body.libsonnet`, laid out from its spec, so a car on that body names only what
// it changes; see `site.libsonnet`, `adjust`, for `o.over`, `o.drop` and `o.add`.
local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
// Hub height and width of each road wheel a spec's `tyre` may name, which set where the wheels and their axles sit.
local tyres = {
  wheel_205_55r16: { hub: 0.316, width: 0.21 },
  wheel_225_60r17: { hub: 0.351, width: 0.225 },
};
function(id, s, o={})
  local tyre = std.get(s, 'tyre', 'wheel_205_55r16');
  local hub = tyres[tyre].hub;
  local wheelZ = s.side - tyres[tyre].width / 2;
  local sites = [
    one('shell', id + '_shell'),
    one('windscreen', id + '_windscreen'),
    if std.get(s, 'boot', false) then one('boot_lid', id + '_boot_lid') else one('tailgate', id + '_tailgate'),
    one('bonnet', id + '_bonnet'),
    one('front_bumper', id + '_front_bumper'),
    one('rear_bumper', id + '_rear_bumper'),
    one('dashboard', id + '_dashboard'),
    one('engine', 'engine_i4_petrol', [s.frontAxle - 0.02, 0.28, 0]),
    one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.3, -0.36]),
    one('radiator', 'radiator_car', [s.front - 0.3, 0.32, 0]),
    one('fuel_tank', 'fuel_tank_car', [s.rearAxle + 0.65, s.sill, 0]),
    one('exhaust', 'exhaust_car', [s.rear + 0.46, 0.2, 0.42]),
    one('rear_axle', 'twist_beam', [s.rearAxle, hub - 0.316, 0]),
    one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    one('rear_bench', 'bench_seat_3', [-0.55, s.floor, 0]),
  ]
  + pair('front_wing', id + '_front_wing')
  + pair('front_door', id + '_front_door')
  + (if std.get(s, 'twoDoor', false) then [] else pair('rear_door', id + '_rear_door'))
  + pair('tail_lamp', id + '_tail_lamp')
  + pair('front_strut', 'front_strut', [s.frontAxle, hub - 0.036, wheelZ - 0.05])
  + pair('front_wheel', tyre, [s.frontAxle, hub, wheelZ])
  + pair('rear_wheel', tyre, [s.rearAxle, hub, wheelZ])
  + pair('front_seat', 'front_seat', [0.05, s.floor, 0.37])
  + pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.66, 0.62)
  + site.batteryBay('hatchback_battery_tray', [s.aPost + 0.25, 0.5, -0.44]);
  site.adjust(sites, std.get(o, 'over', {}), std.get(o, 'drop', []), std.get(o, 'add', []))
