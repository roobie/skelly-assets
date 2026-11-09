// A 20 litre pressed-steel jerry can. The welded seam flange, the X pressed into each face and the corner spout are what
// read as a jerry can rather than a plain box.
local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';

// 345 mm wide, 165 mm deep, 470 mm to the top of its three handles.
local handle(name, x) = [
  h.box(name, 'handle', [x - 0.009, 0.448, -0.060], [x + 0.009, 0.470, 0.060]),
  h.box(name + '-front', 'handle', [x - 0.009, 0.425, 0.042], [x + 0.009, 0.448, 0.060]),
  h.box(name + '-back', 'handle', [x - 0.009, 0.425, -0.060], [x + 0.009, 0.448, -0.042]),
];
local cross(side) =
  local start = if side == 'front' then 0.0825 else -0.0870, end = if side == 'front' then 0.0870 else -0.0825;
  [
    h.prism('x-rise-' + side, 'body', 'z', [[-0.1282, 0.0208], [0.1518, 0.3808], [0.1282, 0.3992], [-0.1518, 0.0392]], start, end),
    h.prism('x-fall-' + side, 'body', 'z', [[0.1518, 0.0392], [-0.1282, 0.3992], [-0.1518, 0.3808], [0.1282, 0.0208]], start, end),
  ];
[
  h.compound('jerry_can', 4.000, [
    h.prism('body', 'body', 'z', [[-0.1525, 0], [0.1525, 0], [0.1725, 0.020], [0.1725, 0.405], [0.1525, 0.425], [-0.1525, 0.425], [-0.1725, 0.405], [-0.1725, 0.020]], -0.0825, 0.0825),
    h.prism('seam', 'seam', 'z', [[-0.1545, -0.002], [0.1545, -0.002], [0.1765, 0.020], [0.1765, 0.407], [0.1545, 0.429], [-0.1545, 0.429], [-0.1765, 0.407], [-0.1765, 0.020]], -0.003, 0.003),
    h.turned('spout', 'spout', 'y', [[0, 0], [0, 0.030], [0.012, 0.030], [0.012, 0.021], [0.032, 0.021], [0.032, 0]], [-0.118, 0.425, 0.020]),
    h.turned('cap', 'cap', 'y', [[0.032, 0], [0.032, 0.026], [0.048, 0.026], [0.052, 0.020], [0.052, 0]], [-0.118, 0.425, 0.020]),
    h.box('cap-lever', 'cap', [-0.150, 0.468, 0.010], [-0.086, 0.477, 0.030]),
  ] + cross('front') + cross('back') + handle('handle-a', -0.040) + handle('handle-b', 0.040) + handle('handle-c', 0.120),
  { body: 'polymer-od-green', seam: 'polymer-od-green', handle: 'polymer-od-green', spout: 'steel-grey', cap: 'paint-charcoal' }) + {
    handling: { part: 'jerry_can', solid: 'handle-b', fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
    voxelGrain: 0.004,
  },
]
