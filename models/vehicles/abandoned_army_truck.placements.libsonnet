local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'abandoned_army_truck.spec.libsonnet';
local fixed(id) = one(id, 'abandoned_army_truck_' + id);
local wheel(id, x) = pair(id, 'abandoned_army_truck_wheel', [x, s.hubY, s.wheelZ]);
{
  title: 'Abandoned army truck',
  sites: [
    fixed('chassis'),
    fixed('engine'),
    fixed('bonnet'),
    fixed('bonnet_flap'),
    fixed('grille'),
    fixed('wings'),
    fixed('bumper'),
    fixed('near_side'),
    fixed('far_side'),
    fixed('cab_back'),
    fixed('screen_frame'),
    fixed('cab_roof'),
    fixed('near_door'),
    fixed('seat_frames'),
    fixed('dash'),
    fixed('bed_floor'),
    fixed('bed_near'),
    fixed('bed_far'),
    fixed('headboard'),
    fixed('tailgate'),
    fixed('hoops'),
    fixed('canvas'),
  ]
  + wheel('front_wheel', s.frontAxle)
  + wheel('middle_wheel', s.rearAxles[0])
  + wheel('rear_wheel', s.rearAxles[1]),
  tags: { 'vehicle-role': ['military'] },
  overlaps: [
    site.overlap('chassis', 'screen_frame', 0.06,
      'The skirt of the cab front wall below the floor stands into the chassis rails.'),
  ],
}
