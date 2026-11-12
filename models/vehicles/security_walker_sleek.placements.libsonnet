// A separate body-kit derivative, not the schema's powertrain-only `parent` variant.
local site = import 'site.libsonnet';
local base = import 'security_walker.placements.libsonnet';
local s = import 'security_walker_sleek.spec.libsonnet';
{
  sites: site.adjust(base.sites,
    over={
      hull: { id: 'carrier', part: 'security_walker_sleek_carrier' },
      radiator: { at: [-1.2525, 2.85, 0] },
      battery_tray: { at: [0.45, 3.38, 0.55] },
      battery: { at: [0.45, 3.41, 0.55] },
    } + {
      [id]: { at: [p.at[0], p.at[1] + s.weaponLift, p.at[2]] }
      for id in s.weaponSites for p in base.sites if p.id == id
    },
    drop=['belly', 'face_guard', 'sensor_window', 'sensor_array', 'flank_armour_near', 'flank_armour_far', 'hatch', 'exhaust', 'beacon', 'smoke_launcher_near', 'smoke_launcher_far', 'work_lamp_near', 'work_lamp_far'],
    add=[
      site.one('hull', 'security_walker_sleek_hull'),
      site.one('rotor', 'security_walker_sleek_rotor'),
      site.one('cooling_pack', 'security_walker_sleek_cooling_pack'),
      site.one('roof_hatch', 'security_walker_sleek_roof_hatch'),
    ] + [site.one(o.id, o.part, o.at) + (if o.part == 'ifv_turret_periscope' then {} else { finish: s.paint }) for o in s.optics]
      + site.pair('terrain_camera', 'security_walker_sleek_terrain_camera', [0.90, 2.78, 0.60])
      + site.pair('smoke_launcher', 'smoke_launcher_81mm', [-0.63, 4.45, 0.45])
      + site.pair('work_lamp', 'work_lamp', [0.72, 4.30, 0.50])
      + site.pair('ammo_cassette', 'security_walker_sleek_ammo_cassette', [0, 0, 0])
      + site.pair('ammo_feed', 'security_walker_sleek_ammo_feed', [0, 0, 0])
      + site.pair('base_headlamp', 'headlamp_military', s.lights.baseHeadlamps)
      + site.pair('turret_headlamp', 'headlamp_military', s.lights.turretHeadlamps)
      + [site.one('floodlight', 'security_walker_sleek_floodlight', s.lights.floodlight)]
  ),
  tags: { 'vehicle-role': ['military'] },
}
