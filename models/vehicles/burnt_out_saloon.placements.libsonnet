local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'burnt_out_saloon.spec.libsonnet';
{
  sites: [
    one('shell', 'burnt_out_saloon_shell'),
    one('bonnet', 'burnt_out_saloon_bonnet'),
    one('boot_lid', 'burnt_out_saloon_boot_lid'),
    one('door', 'burnt_out_saloon_door'),
    one('front_bumper', 'burnt_out_saloon_front_bumper'),
    one('rear_bumper', 'burnt_out_saloon_rear_bumper'),
    one('dash_frame', 'burnt_out_saloon_dash_frame'),
    one('engine', 'burnt_out_saloon_engine', [s.frontAxle - 0.02, s.floor - 0.05, 0.02]),
    one('rear_bench', 'burnt_out_saloon_bench_frame', [-0.72, s.floor, 0]),
  ]
  + pair('front_seat_frame', 'burnt_out_saloon_seat_frame', [0.2, s.floor, 0.37])
  + pair('front_rim', 'burnt_out_saloon_rim', [s.frontAxle, s.axleY, s.wheelZ])
  + pair('rear_rim', 'burnt_out_saloon_rim', [s.rearAxle, s.axleY, s.wheelZ]),
}
