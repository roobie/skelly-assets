local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'abandoned_pickup.spec.libsonnet';
{
  title: 'Abandoned pickup',
  sites: [
    one('front_axle', 'abandoned_pickup_axle', [s.frontAxle, s.axleY, 0]),
    one('rear_axle', 'abandoned_pickup_axle', [s.rearAxle, s.axleY, 0]),
    one('frame', 'abandoned_pickup_frame'),
    one('cab', 'abandoned_pickup_cab'),
    one('bed', 'abandoned_pickup_bed'),
    one('bonnet', 'abandoned_pickup_bonnet'),
    one('door', 'abandoned_pickup_door'),
    one('bench_frame', 'abandoned_pickup_bench_frame', [0.42, s.floor, 0]),
  ]
  + pair('front_stack', 'abandoned_pickup_block_stack', [s.frontAxle, 0, s.stackZ])
  + pair('rear_stack', 'abandoned_pickup_block_stack', [s.rearAxle, 0, s.stackZ]),
  unjudged: [
    site.unjudged('cab', 'door', 0.063,
      'The sill_box_far piece of abandoned_pickup_cab runs into the skin_2_0 piece of abandoned_pickup_door.'),
  ],
}
