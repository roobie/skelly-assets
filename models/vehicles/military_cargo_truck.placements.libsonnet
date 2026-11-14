local site = import 'site.libsonnet';
local m = import 'military-kit.libsonnet';
local s = import 'military_cargo_truck.spec.libsonnet';
local id = 'military_cargo_truck';
{
  title: 'Military cargo truck',
  sites: m.truckFittings(site.kit, s) + [
    site.one('bed_floor', id + '_bed_floor'),
    site.one('bed', id + '_bed'),
    site.one('tailgate', id + '_tailgate'),
    site.one('tilt', id + '_tilt'),
  ],
  tags: { 'vehicle-role': ['military'] },
  overlaps: [
    site.overlap('cab', 'gearbox', 0.27,
      'The gearbox sits in the floor tunnel, which the cab part draws as a solid block around it.'),
  ],
  unjudged: [
    site.unjudged('chassis', 'engine', 0.087,
      '`crossmember_6` and `crossmember_7` run through the engine\'s sump.'),
    site.unjudged('chassis', 'gearbox', 0.087,
      '`crossmember_5` runs through the gearbox case.'),
  ],
}
