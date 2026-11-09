local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'burnt_out_bus.spec.libsonnet';
{
  sites: [
    one('floor', 'burnt_out_bus_floor'),
    one('near_side', 'burnt_out_bus_near_side'),
    one('far_side', 'burnt_out_bus_far_side'),
    one('front', 'burnt_out_bus_front'),
    one('rear', 'burnt_out_bus_rear'),
    one('roof', 'burnt_out_bus_roof'),
    one('roof_unit', 'burnt_out_bus_roof_unit'),
    one('engine', 'burnt_out_bus_engine'),
    one('hatch', 'burnt_out_bus_hatch'),
    one('bumper', 'burnt_out_bus_bumper'),
    one('mirror', 'burnt_out_bus_mirror'),
    one('stanchions', 'burnt_out_bus_stanchions'),
    one('dash', 'burnt_out_bus_dash'),
    one('driver_frame', 'burnt_out_bus_driver_frame', [s.driver.x, s.driver.y, s.driver.z]),
    one('sprung_door', 'burnt_out_bus_sprung_door'),
    one('fallen_door', 'burnt_out_bus_fallen_door'),
  ]
  + pair('front_rim', 'burnt_out_bus_rim', [s.frontAxle, s.hubY, s.wheelZ])
  + pair('rear_rim', 'burnt_out_bus_dual_rim', [s.rearAxle, s.hubY, s.wheelZ])
  + std.flattenArrays([
    pair('seat_' + i, 'burnt_out_bus_seat_frame', [s.seats[i].x, s.seats[i].y, 0.72])
    for i in std.range(0, std.length(s.seats) - 1)
  ]),
}
