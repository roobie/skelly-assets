local site = import 'site.libsonnet';
local s = import 'motorbike.spec.libsonnet';
{
  title: 'Motorbike',
  sites: [
    site.one('frame', 'motorbike_frame'),
    site.one('engine', 'motorbike_engine'),
    site.one('exhaust', 'motorbike_exhaust'),
    site.one('centre_stand', 'motorbike_centre_stand'),
    site.one('swingarm', 'motorbike_swingarm'),
    site.one('rear_wheel', 'motorbike_wheel', [s.rearAxle, s.hub, 0]),
    site.one('fork', 'motorbike_fork'),
    site.one('front_wheel', 'motorbike_wheel', [s.frontAxle, s.hub, 0]),
    site.one('front_mudguard', 'motorbike_front_mudguard'),
    site.one('headlamp', 'motorbike_headlamp'),
    site.one('handlebar', 'motorbike_handlebar'),
    site.one('tank', 'motorbike_tank'),
    site.one('seat', 'motorbike_seat'),
    site.one('rear_mudguard', 'motorbike_rear_mudguard'),
    site.one('tail_lamp', 'motorbike_tail_lamp'),
  ]
  + site.pair('footrest', 'motorbike_footrest')
  + site.pair('shock', 'motorbike_shock')
  + site.pair('side_cover', 'motorbike_side_cover'),
  unjudged: [
    site.unjudged('frame', 'headlamp', 0.054,
      'The head piece of motorbike_frame runs into the shell piece of motorbike_headlamp.'),
  ],
}
