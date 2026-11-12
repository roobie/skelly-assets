// A separate body-kit derivative, not the schema's powertrain-only `parent` variant.
local site = import 'site.libsonnet';
local base = import 'security_walker.placements.libsonnet';
local s = import 'security_walker_sleek.spec.libsonnet';
local baseSite(id) = [p for p in base.sites if p.id == id][0];
local lowered(id, y) = local at = baseSite(id).at; [at[0], y, at[2]];
{
  title: 'Sleek security walker',
  sites: site.adjust(base.sites,
    over={
      hull: { id: 'carrier', part: 'security_walker_sleek_carrier' },
    } + {
      [id]: { at: lowered(id, s.lowered[id]) }
      for id in std.objectFields(s.lowered)
    } + {
      [id]: { at: [p.at[0], p.at[1] + s.weaponLift, p.at[2]] }
      for id in s.weaponSites for p in base.sites if p.id == id
    },
    drop=s.dropped,
    add=[
      site.one('hull', 'security_walker_sleek_hull'),
      site.one('rotor', 'security_walker_sleek_rotor'),
      site.one('cooling_pack', 'security_walker_sleek_cooling_pack'),
      site.one('roof_hatch', 'security_walker_sleek_roof_hatch'),
    ] + [site.one(o.id, o.part, o.at) + (if o.part == 'ifv_turret_periscope' then {} else { finish: s.paint }) for o in s.optics]
      + site.pair('terrain_camera', 'security_walker_sleek_terrain_camera', [0.90, s.belly - 0.07, 0.60])
      + site.pair('smoke_launcher', 'smoke_launcher_81mm', [-0.63, s.hull.high, 0.45])
      + site.pair('work_lamp', 'work_lamp', [0.72, 4.30, 0.50])
      + site.pair('ammo_cassette', 'security_walker_sleek_ammo_cassette', [0, 0, 0])
      + site.pair('ammo_feed', 'security_walker_sleek_ammo_feed', [0, 0, 0])
      + site.pair('base_headlamp', 'headlamp_military', s.lights.baseHeadlamps)
      + site.pair('turret_headlamp', 'headlamp_military', s.lights.turretHeadlamps)
      + [site.one('floodlight', 'security_walker_sleek_floodlight', s.lights.floodlight)]
  ),
  tags: { 'vehicle-role': ['military'] },
  unjudged: [
    site.unjudged('carrier', 'radiator', 0.032,
      'The rear_bulkhead piece of security_walker_sleek_carrier runs into the cooling_fan_hub piece of radiator_truck.'),
  ],
}
