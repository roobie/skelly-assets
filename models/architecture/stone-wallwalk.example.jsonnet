// Two half-storey flights with a solid landing and upper-flight support, leading to a 3 m wall-walk.
local s = import 'stone.spec.libsonnet';
local q(deg) = [0, std.sin(deg * std.pi / 360), 0, std.cos(deg * std.pi / 360)];
local site(id, model, at, yaw=0) = { site: id, model: 'medieval_stone_' + model, at: at, turn: q(yaw) };
{
  id: 'medieval_stone_wallwalk_example',
  title: 'Medieval stone stair-accessed wall-walk example',
  sites: [
    site('approach', 'floor', [0, 0, -4]),
    site('lower-flight', 'stair', [0, 0, -2]),
    site('middle-landing', 'plinth', [0, 0, 0]),
    site('upper-flight-support', 'plinth', [0, 0, 2]),
    site('upper-flight', 'stair', [0, s.stair.rise, 2]),
  ] + [
    site('walk-floor-%d' % z, 'floor', [0, s.storey, z]) for z in [4, 6]
  ] + [
    // Wall and pier bases descend by the floor thickness: their caps meet the slab underside at y=2.8.
    site('pier-%d-%d' % [x, z], 'pier', [x, -s.floor, z]) for x in [-1, 1] for z in [3, 5, 7]
  ] + [
    site('wall-%d-%d' % [x, z], if z == 4 then 'slit_window' else 'wall', [x, -s.floor, z], x * 90)
    for x in [-1, 1] for z in [4, 6]
  ] + [
    site('parapet-%d-%d' % [x, z], 'battlement', [x, s.storey, z], x * 90)
    for x in [-1, 1] for z in [4, 6]
  ] + [
    site('end-wall', 'wall', [0, -s.floor, 7]),
    // The return abuts the side bays' end planes instead of overlapping their coplanar stone skins.
    site('end-parapet', 'battlement', [0, s.storey, 7 + s.wall / 2]),
  ],
}
