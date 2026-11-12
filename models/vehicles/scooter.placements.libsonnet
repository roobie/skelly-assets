local site = import 'site.libsonnet';
local s = import 'scooter.spec.libsonnet';
{
  title: 'Scooter',
  sites: [
    site.one('frame', 'scooter_frame'),
    site.one('floorboard', 'scooter_floorboard'),
    site.one('leg_shield', 'scooter_leg_shield'),
    site.one('cowl', 'scooter_cowl'),
    site.one('seat', 'scooter_seat'),
    site.one('fuel_tank', 'scooter_fuel_tank'),
    site.one('engine', 'scooter_engine'),
    site.one('exhaust', 'scooter_exhaust'),
    site.one('rear_wheel', 'scooter_wheel', [s.rearAxle, s.hub, 0]),
    site.one('fork', 'scooter_fork'),
    site.one('front_wheel', 'scooter_wheel', [s.frontAxle, s.hub, 0]),
    site.one('front_mudguard', 'scooter_front_mudguard'),
    site.one('handlebar', 'scooter_handlebar'),
    site.one('headlamp', 'scooter_headlamp'),
    site.one('centre_stand', 'motorbike_centre_stand', [0.125, 0, 0]),
    site.one('tail_lamp', 'tail_lamp_small', [-0.89, 0.53, 0]),
  ],
  overlaps: [
    site.overlap('leg_shield', 'fork', 0.05,
      'The horn cover of the leg shield is drawn solid around the top of the fork stem it covers.'),
  ],
}
