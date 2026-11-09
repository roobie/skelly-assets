local site = import 'site.libsonnet';
local s = import 'chopper.spec.libsonnet';
{
  sites: [
    site.one('frame', 'chopper_frame'),
    site.one('engine', 'chopper_engine'),
    site.one('exhaust', 'chopper_exhaust'),
    site.one('centre_stand', 'motorbike_centre_stand'),
    site.one('rear_wheel', 'chopper_rear_wheel', [s.rearAxle, s.rearHub, 0]),
    site.one('fork', 'chopper_fork'),
    site.one('front_wheel', 'chopper_front_wheel', [s.frontAxle, s.frontHub, 0]),
    site.one('front_fender', 'chopper_front_fender'),
    site.one('rear_fender', 'chopper_rear_fender'),
    site.one('tank', 'chopper_tank'),
    site.one('saddle', 'chopper_saddle'),
    site.one('sissy_bar', 'chopper_sissy_bar'),
    site.one('handlebar', 'chopper_handlebar'),
    site.one('headlamp', 'chopper_headlamp'),
    site.one('tail_lamp', 'tail_lamp_small', [-1.27, 0.5, 0]),
  ]
  + site.pair('foot_peg', 'chopper_foot_peg'),
}
