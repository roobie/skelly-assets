// Two things lying on their back, each with a head piece at the end its row names.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local finish = { body: 'paint-charcoal' };
local lying(id, head, foot, helper) = h.compound(id, 1, [
  h.box('head', 'body', head[0], head[1]),
  h.box('foot', 'body', foot[0], foot[1]),
], finish) + helper + {
  anchors: {
    head: { part: id, solid: 'head', fraction: [0.5, 0.5, 0.5] },
    foot: { part: id, solid: 'foot', fraction: [0.5, 0.5, 0.5] },
  },
};
{
  units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
  facets: 12,
  defaultMaterial: 'paint-charcoal',
  items: [
    lying('head_on_plus_z', [[-0.1, 0, 0.3], [0.1, 0.02, 0.4]], [[-0.2, 0, -0.4], [0.2, 0.02, 0.3]], h.headEndOnPlusZ),
    lying('head_on_minus_x', [[-0.9, 0, -0.1], [-0.8, 0.02, 0.1]], [[-0.8, 0, -0.3], [0.9, 0.02, 0.3]], h.headEndOnMinusX),
    lying('head_on_plus_x', [[0.8, 0, -0.1], [0.9, 0.02, 0.1]], [[-0.9, 0, -0.3], [0.8, 0.02, 0.3]], h.headEndOnPlusX),
  ],
}
