// Every model at the same authored metre scale; separate hero renders otherwise hide size differences.
local q(yaw) = [0, std.sin(yaw / 2), 0, std.cos(yaw / 2)];
local site(id, model, x, z, yaw=0) = { site: id, model: 'woodland_' + model, at: [x, 0, z], turn: q(yaw) };
{
  id: 'woodland_lineup_example',
  sites: [
    site('tree-oak', 'oak_spreading', -20, -7),
    site('tree-upright', 'oak_upright', -10, -7),
    site('tree-birch', 'birch', -2, -7),
    site('tree-scots-pine', 'scots_pine', 4, -7),
    site('tree-spruce', 'spruce', 10, -7),
    site('tree-pine', 'pine', 16, -7),
  ] + [
    // Each grown model's sparse twin behind it, so the two densities compare at one scale.
    site('sparse-' + model[0], model[0] + '_sparse', model[1], -19)
    for model in [['oak_spreading', -20], ['oak_upright', -10], ['birch', -2], ['scots_pine', 4], ['spruce', 10], ['hazel', 16], ['shrub_low', 20]]
  ] + [
    site('sapling-oak', 'oak_sapling', -10, 2),
    site('sapling-pine', 'pine_sapling', -6, 2),
    site('dead-snag', 'snag', -1, 2),
    site('dead-stump', 'stump_cut', 3, 2),
    site('dead-hollow', 'stump_hollow', 5.6, 2),
    site('dead-log', 'fallen_log', 10, 2, std.pi / 2),
    site('under-hazel', 'hazel', -10, 7),
    site('under-shrub', 'shrub_low', -6, 7),
    site('under-fern', 'fern', -3, 7),
    site('under-grass', 'grass', -1, 7),
    site('rock-broad', 'boulder_broad', 2, 7),
    site('rock-upright', 'boulder_upright', 6, 7),
    site('rock-low', 'boulder_low', 10, 7),
  ],
}
