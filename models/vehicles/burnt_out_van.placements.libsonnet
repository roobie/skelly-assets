local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'burnt_out_van.spec.libsonnet';
{
  sites: [
    one('chassis', 'burnt_out_van_chassis'),
    one('shell', 'burnt_out_van_shell'),
    one('bonnet', 'burnt_out_van_bonnet'),
    one('cab_door_near', 'burnt_out_van_cab_door_hanging'),
    one('cab_door_far', 'burnt_out_van_cab_door'),
    one('sliding_door', 'burnt_out_van_sliding_door'),
    one('rear_door_far', 'burnt_out_van_rear_door'),
    one('rear_door_near', 'burnt_out_van_rear_door_hanging'),
    one('bumper', 'burnt_out_van_bumper'),
    one('engine', 'burnt_out_van_engine'),
    one('dash', 'burnt_out_van_dash'),
  ]
  + pair('seat_frame', 'burnt_out_van_seat_frame', [0.75, s.floor, 0.5])
  + pair('rim_front', 'burnt_out_van_rim', [s.frontAxle, s.rimRadius, s.wheelZ])
  + pair('rim_rear', 'burnt_out_van_rim', [s.rearAxle, s.rimRadius, s.wheelZ]),
}
