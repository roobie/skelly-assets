local site = import 'site.libsonnet';
local s = import 'caravan.spec.libsonnet';
local windowY = s.windowLow;
local sideZ = 0;
{
  title: 'Caravan',
  sites: [
    site.one('chassis', 'caravan_chassis'),
    site.one('floor', 'caravan_floor'),
    site.one('wall_door', 'caravan_wall_door'),
    site.one('wall_plain', 'caravan_wall_plain'),
    site.one('door', 'caravan_door'),
    site.one('roof', 'caravan_roof'),
    site.one('nose_cap', 'caravan_nose_cap'),
    site.one('tail_cap', 'caravan_tail_cap'),
    site.one('front_window', 'caravan_front_window'),
    site.one('rear_window', 'caravan_rear_window'),
    site.one('gas_locker', 'caravan_gas_locker'),
    site.one('furniture', 'caravan_furniture'),
    site.one('roof_vent', 'roof_vent', [0.6, s.roof, 0]),
    site.one('roof_vent_rear', 'roof_vent', [-1.4, s.roof, 0]),
    site.one('window_near_rear', 'caravan_window_small', [s.smallRear + s.smallWindow / 2, windowY, sideZ]),
    site.one('window_near_front', 'caravan_window_large', [s.largeFront + s.largeWindow / 2, windowY, sideZ]),
    site.one('window_far_rear', 'caravan_window_large', [s.farRear + s.largeWindow / 2, windowY, sideZ]) + { mirror: true },
    site.one('window_far_front', 'caravan_window_large', [s.largeFront + s.largeWindow / 2, windowY, sideZ]) + { mirror: true },
    site.one('axle', 'trailer_axle_van', [s.axle, s.hub - 0.37, 0]),
    site.one('coupling', 'trailer_coupling', [s.tip, s.drawLow, 0]),
    site.one('jockey_wheel', 'trailer_jockey_wheel', [s.tip - 0.42, 0, 0.17]),
  ]
  + site.pair('wheel', 'wheel_235_75r15', [s.axle, s.hub, s.wheelZ])
  + site.pair('steady_rear', 'caravan_steady', [s.rear + 0.25, 0, 0.6])
  + site.pair('steady_front', 'caravan_steady', [s.front + 0.1, 0, 0.6])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.17, 0.62, 0.86])
  + site.pair('rear_indicator', 'marker_lamp', [s.rear - 0.17, 0.78, 0.86])
  + site.pair('marker', 'marker_lamp', [s.front + 0.14, 2.14, 0.95]),
}
