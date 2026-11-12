local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'abandoned_ambulance.spec.libsonnet';
{
  title: 'Abandoned ambulance',
  sites: [
    one('chassis', 'abandoned_ambulance_chassis'),
    one('cab', 'abandoned_ambulance_cab'),
    one('box', 'abandoned_ambulance_box'),
    one('bonnet', 'abandoned_ambulance_bonnet'),
    one('bumper', 'abandoned_ambulance_bumper'),
    one('lamp', 'abandoned_ambulance_lamp'),
    one('mirror', 'abandoned_ambulance_mirror'),
    one('engine', 'abandoned_ambulance_engine'),
    one('cab_door_near', 'abandoned_ambulance_cab_door'),
    one('cab_door_far', 'abandoned_ambulance_cab_door_ajar'),
    one('sliding_door', 'abandoned_ambulance_sliding_door'),
    one('rear_door_near', 'abandoned_ambulance_rear_door_near'),
    one('rear_door_far', 'abandoned_ambulance_rear_door_far'),
    one('stretcher', 'abandoned_ambulance_stretcher'),
    one('beacon_front_far', 'abandoned_ambulance_beacon', [-0.2, s.boxRoof, -0.75]),
    one('beacon_rear_near', 'abandoned_ambulance_beacon', [-2.75, s.boxRoof, 0.75]),
    one('beacon_rear_far', 'abandoned_ambulance_beacon', [-2.75, s.boxRoof, -0.75]),
  ]
  + pair('seat', 'abandoned_ambulance_seat', [0.75, s.floor, 0.5])
  + pair('wheel_front', 'abandoned_ambulance_wheel', [s.frontAxle, s.hubY, s.wheelZ])
  + pair('wheel_rear', 'abandoned_ambulance_wheel', [s.rearAxle, s.hubY, s.wheelZ]),
  tags: { 'vehicle-role': ['emergency'] },
}
