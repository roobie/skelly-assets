local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'ambulance.spec.libsonnet';
local tail = van.tail(s);
{
  sites: van.fittings(site.kit, 'ambulance', s) + [
    site.one('locker', 'ambulance_locker'),
    site.one('stretcher', 'stretcher', [-1.8, s.box.floor, 0.1]),
    site.one('attendant_seat', 'attendant_seat', [-0.55, s.box.floor, -0.35]),
    site.one('light_bar', 'light_bar_blue', [0.3, s.roof, 0]),
    site.one('rear_step', 'rear_step_tread', [s.rear + 0.12, 0.6, 0]),
    site.one('markings', 'ambulance_markings'),
    site.one('door_markings', 'ambulance_door_markings'),
  ]
  + site.pair('rear_markings', 'ambulance_rear_markings')
  + site.pair('box_beacon_rear', 'beacon_blue', [tail + 0.25, s.box.roof, 0.75]),
  tags: { 'vehicle-role': ['emergency'] },
}
