local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'burnt_out_saloon.spec.libsonnet';
{
  title: 'Burnt-out saloon',
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
  unjudged: [
    site.unjudged('engine', 'shell', 0.166,
      'The engine\'s gearbox runs through the far front arch liner.'),
    site.unjudged('front_rim_far', 'shell', 0.136,
      'The bare front rims stand through the floor, deeper than a wheel in its arch: the wreck may be meant to have sunk onto them.'),
    site.unjudged('front_rim_near', 'shell', 0.136,
      'The bare front rims stand through the floor, deeper than a wheel in its arch: the wreck may be meant to have sunk onto them.'),
    site.unjudged('rear_rim_far', 'shell', 0.136,
      'The bare rear rims stand through the floor, deeper than a wheel in its arch: the wreck may be meant to have sunk onto them.'),
    site.unjudged('rear_rim_near', 'shell', 0.136,
      'The bare rear rims stand through the floor, deeper than a wheel in its arch: the wreck may be meant to have sunk onto them.'),
  ],
}
