// A 4 by 6 m cottage on wall centre lines. The floor top is y=0; wall bases and door leaf sit on it.
// Sites use the showcase's existing composition shape, but this is an authoring example, not a vehicle or new model.
local s = import 'timber.spec.libsonnet';
local q(deg) = [0, std.sin(deg * std.pi / 360), 0, std.cos(deg * std.pi / 360)];
local site(id, model, at, yaw=0) = { site: id, model: model, at: at, turn: q(yaw) };
{
  id: 'medieval_timber_cottage_example',
  title: 'Medieval timber cottage example',
  sites: [
    site('floor-%d-%d' % [x, z], 'medieval_timber_floor', [x * s.bay / 2, 0, z * s.bay / 2])
    for x in [-1, 1] for z in [-2, 0, 2]
  ] + [
    site('post-%d-%d' % [x, z], 'medieval_timber_post', [x * s.bay / 2, 0, z * s.bay / 2])
    for x in [-2, 0, 2] for z in [-3, 3]
  ] + [
    site('side-post-%d-%d' % [x, z], 'medieval_timber_post', [x * s.bay / 2, 0, z * s.bay / 2])
    for x in [-2, 2] for z in [-1, 1]
  ] + [
    site('front-%d' % x, if x < 0 then 'medieval_timber_doorway' else 'medieval_timber_window', [x * s.bay / 2, 0, 3 * s.bay / 2])
    for x in [-1, 1]
  ] + [
    site('back-%d' % x, 'medieval_timber_braced_wall', [x * s.bay / 2, 0, -3 * s.bay / 2], 180)
    for x in [-1, 1]
  ] + [
    site('side-%d-%d' % [x, z], if z == 0 then 'medieval_timber_window' else 'medieval_timber_braced_wall', [x * s.bay / 2, 0, z * s.bay / 2], if x > 0 then 90 else -90)
    for x in [-2, 2] for z in [-2, 0, 2]
  ] + [site('door', 'medieval_plank_door', [-s.bay / 2, 0, 3 * s.bay / 2])]
  + [
    site('gable-%d' % side, 'medieval_timber_gable_4m', [0, s.storey, side * 3 * s.bay / 2], if side > 0 then 0 else 180)
    for side in [-1, 1]
  ] + [
    site('roof-%d' % z, 'medieval_tile_roof_4m', [0, s.storey, z * s.bay / 2])
    for z in [-2, 0, 2]
  ] + [
    site('verge-%d' % side, 'medieval_tile_verge_4m', [0, s.storey, side * 3 * s.bay / 2], if side > 0 then 0 else 180)
    for side in [-1, 1]
  ],
}
