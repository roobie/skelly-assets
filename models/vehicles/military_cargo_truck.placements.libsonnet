local site = import 'site.libsonnet';
local m = import 'military-kit.libsonnet';
local s = import 'military_cargo_truck.spec.libsonnet';
local id = 'military_cargo_truck';
{
  sites: m.truckFittings(site.kit, s) + [
    site.one('bed_floor', id + '_bed_floor'),
    site.one('bed', id + '_bed'),
    site.one('tailgate', id + '_tailgate'),
    site.one('tilt', id + '_tilt'),
  ],
  tags: { 'vehicle-role': ['military'] },
}
