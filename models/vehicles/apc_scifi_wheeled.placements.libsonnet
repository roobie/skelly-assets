local site = import 'site.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local s = import 'apc_scifi_wheeled.spec.libsonnet';
local one(id, at=site.origin) = site.one(id, 'apc_scifi_wheeled_' + id, at);
local pair(id) = site.pair(id, 'apc_scifi_wheeled_' + id);
local w = s.wheel;
local l = s.lamps;
{
  sites: [one(id) for id in ['hull', 'canopy', 'visor', 'weapon_station', 'cannon', 'ramp']]
    + pair('flank')
    + pair('pannier')
    + pair('roof_rail')
    + std.flattenArrays([
      [site.one(name + '_axle', 'apc_scifi_wheeled_axle', [s.axles[i], w.radius, 0])]
      + wheelKit.pair(site.kit, name + '_wheel', w.name, [s.axles[i], w.radius, w.z], w.brake)
      for i in [0, 1] for name in [['front', 'rear'][i]]
    ])
    + [h + { finish: s.paint } for h in site.pair('hatch', 'apc_hatch', [s.hatches.x, s.body.top, s.hatches.z])]
    // The lamps sit in the nose's curve with their bowls let into it.
    + site.pair('headlamp', 'headlamp_military', [s.noseXAt(l.y + 0.125, l.z), l.y, l.z])
    + site.pair('tail_lamp', 'tail_lamp_small', [s.body.rearFace, l.tailY, l.tailZ]),
  tags: { 'vehicle-role': ['military'] },
}
