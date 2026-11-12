local site = import 'site.libsonnet';
local wheelKit = import 'wheel-kit.libsonnet';
local s = import 'apc_scifi_wheeled.spec.libsonnet';
local one(id, at=site.origin) = site.one(id, 'apc_scifi_wheeled_' + id, at);
local pair(id) = site.pair(id, 'apc_scifi_wheeled_' + id);
local b = s.body;
local w = s.wheel;
local l = s.lamps;
local floorTop = b.belly + b.wall;
local bench(id, x, z) = site.pair(id, 'apc_scifi_wheeled_bench', [x, floorTop, z]);
{
  title: 'Sci-fi wheeled carrier',
  sites: [one(id) for id in ['hull', 'roof', 'glacis', 'vision_block', 'ramp', 'side_door', 'driver_seat', 'controls', 'locker', 'rack', 'weapon_station', 'cannon', 'sights', 'periscopes']]
    + pair('grab_rail')
    + pair('launcher')
    // The near side has the side door between the arches, so the pannier and the bay's bench are fitted on the far side
    // alone.
    + [pair('pannier')[1]]
    + bench('rear_bench', s.benches.rearX, b.core - b.wall)
    + [bench('bay_bench', s.benches.bayX, b.half - b.wall)[1]]
    + std.flattenArrays([
      [site.one(name + '_axle', 'apc_scifi_wheeled_axle', [s.axles[i], w.radius, 0])]
      + wheelKit.pair(site.kit, name + '_wheel', w.name, [s.axles[i], w.radius, w.z], w.brake)
      for i in [0, 1] for name in [['front', 'rear'][i]]
    ])
    + [h + { finish: s.paint } for h in site.pair('hatch', 'apc_hatch', [s.hatches.x, b.top, s.hatches.z])]
    + [site.one('side_step', 'door_step_walk_in', [s.doors.side.x[0], 0.42, b.half])]
    + site.pair('headlamp', 'headlamp_large', [b.fender, l.y, l.z])
    + site.pair('tail_lamp', 'tail_lamp_small', [b.rear, l.tailY, l.tailZ]),
  tags: { 'vehicle-role': ['military'] },
}
