// Source-only composition: a 3 m-wide clear path along x=0, not a shipped terrain tile or engine scene.
local q(yaw) = [0, std.sin(yaw / 2), 0, std.cos(yaw / 2)];
local site(id, model, x, z, yaw=0) = { site: id, model: 'woodland_' + model, at: [x, 0, z], turn: q(yaw) };
{
  id: 'woodland_edge_example',
  sites: [
    site('tree-oak', 'oak_spreading', -5.5, -4, 0.2),
    site('tree-upright', 'oak_upright', 5, -5.5, 1.1),
    site('tree-birch', 'birch', -4.8, 5, -0.4),
    site('tree-pine', 'pine', 5.5, 4, 0.6),
    site('tree-scots-pine', 'scots_pine', 6, 11, -0.9),
    site('tree-spruce', 'spruce', -6, 11.5, 0.3),
    site('sapling-oak', 'oak_sapling', -2.9, -7, 0.7),
    site('sapling-pine', 'pine_sapling', 3, -3, -0.3),
    site('dead-snag', 'snag', 4, 8, 0.8),
    site('dead-stump', 'stump_cut', -3.3, -2, 0.4),
    site('dead-hollow', 'stump_hollow', 3, 6, -0.3),
    site('dead-log', 'fallen_log', -4.2, 1.5, 1),
    site('under-hazel', 'hazel', 3.8, 1, -0.5),
    site('under-shrub', 'shrub_low', -3.4, -7, 0.4),
    site('rock-broad', 'boulder_broad', -4, -0.5, 0.3),
    site('rock-upright', 'boulder_upright', 4, -1.5, 0.5),
    site('rock-low', 'boulder_low', -3.3, 3, -0.2),
  ] + [
    site('under-fern-%d' % i, 'fern', side * (2.6 + 0.3 * (i % 2)), -5 + i * 2.1, i * 0.7)
    for i in std.range(0, 4) for side in [if i % 2 == 0 then -1 else 1]
  ] + [
    site('under-grass-%d' % i, 'grass', side * (2.1 + 0.2 * (i % 3)), -7 + i * 1.4, i * 1.3)
    for i in std.range(0, 10) for side in [if i % 2 == 0 then 1 else -1]
  ],
}
