local site = import 'site.libsonnet';
local s = import 'touring_bike.spec.libsonnet';
{
  title: 'Touring bike',
  sites: [
    site.one('frame', 'touring_bike_frame'),
    site.one('engine', 'touring_bike_engine'),
    site.one('centre_stand', 'touring_bike_centre_stand'),
    site.one('swingarm', 'touring_bike_swingarm'),
    site.one('shock', 'touring_bike_shock'),
    site.one('rear_wheel', 'touring_bike_wheel', [s.rearAxle, s.hub, 0]),
    site.one('fork', 'touring_bike_fork'),
    site.one('front_wheel', 'touring_bike_wheel', [s.frontAxle, s.hub, 0]),
    site.one('front_mudguard', 'touring_bike_front_mudguard'),
    site.one('handlebar', 'touring_bike_handlebar'),
    site.one('tank', 'touring_bike_tank'),
    site.one('seat', 'touring_bike_seat'),
    site.one('rear_mudguard', 'touring_bike_rear_mudguard'),
    site.one('tail_lamp', 'touring_bike_tail_lamp'),
    site.one('fairing', 'touring_bike_fairing'),
    site.one('headlamp', 'touring_bike_headlamp'),
    site.one('windscreen', 'touring_bike_windscreen'),
    site.one('top_rack', 'touring_bike_top_rack'),
    site.one('top_box', 'touring_bike_top_box'),
  ]
  + site.pair('exhaust', 'touring_bike_exhaust')
  + site.pair('footrest', 'touring_bike_footrest')
  + site.pair('pillion_footrest', 'touring_bike_pillion_footrest')
  + site.pair('side_cover', 'touring_bike_side_cover')
  + site.pair('lower_fairing', 'touring_bike_lower_fairing')
  + site.pair('pannier_rack', 'touring_bike_pannier_rack')
  + site.pair('pannier', 'touring_bike_pannier'),
}
