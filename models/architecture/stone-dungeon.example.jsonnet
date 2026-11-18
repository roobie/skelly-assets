// Four by six metres on wall centre lines. A closed rear end, open arched front and removable vault bays.
local s = import 'stone.spec.libsonnet';
local q(deg) = [0, std.sin(deg * std.pi / 360), 0, std.cos(deg * std.pi / 360)];
local site(id, model, at, yaw=0) = { site: id, model: 'medieval_stone_' + model, at: at, turn: q(yaw) };
{
  id: 'medieval_stone_dungeon_example',
  title: 'Medieval stone vaulted dungeon passage example',
  sites: [
    site('floor-%d-%d' % [x, z], 'floor', [x, 0, z]) for x in [-1, 1] for z in [-2, 0, 2]
  ] + [
    site('pier-%d-%d' % [x, z], 'pier', [x, 0, z]) for x in [-2, 2] for z in [-3, -1, 1, 3]
  ] + [site('rear-pier', 'pier', [0, 0, -3])] + [
    site('side-%d-%d' % [x, z], if z == 0 then 'slit_window' else 'wall', [x, 0, z], if x > 0 then 90 else -90)
    for x in [-2, 2] for z in [-2, 0, 2]
  ] + [
    site('rear-%d' % x, if x < 0 then 'arch_doorway' else 'wall', [x, 0, -3], 180) for x in [-1, 1]
  ] + [
    site('vault-%d' % z, 'vault_4m', [0, s.storey, z]) for z in [-2, 0, 2]
  ] + [
    // These end pieces abut, rather than overlap, the vault's z=-3/+3 ends.
    site('front-arch', 'arch_4m', [0, s.storey, 3 + s.wall / 2]),
    site('rear-end-panel', 'vault_end_4m', [0, s.storey, -3 - s.wall / 2]),
  ] + [
    site('buttress-%d-%d' % [x, z], 'buttress', [x * (2 + s.wall / 2), 0, z], x * 90)
    for x in [-1, 1] for z in [-1, 1]
  ],
}
