// Kit stowed in a vehicle's lockers and load space, drawn as pieces of a part in the vehicle frame. Each piece is laid
// out on the near side, its front toward +z, so a pair's far twin mirrors it. A locker's stowage is one part, so a
// game can take it out or leave it with the shutter that covers it.
local k = import 'kit.libsonnet';
local box = k.box;
local round(piece) = piece + { sides: 16 };
{
  // The materials stowed kit draws unless a vehicle's finish names its own.
  finish: {
    shelf: 'alu-bare',
    board: 'alu-bare',
    hose: 'cloth-cream',
    coupling: 'alu-bare',
    cylinder: 'plastic-yellow',
    valve: 'steel-stainless',
    lid: 'plastic-black',
    strap: 'webbing-black',
    haft: 'wood-oak',
    steel: 'steel-grey',
    engine: 'plastic-black',
    cone: 'plastic-orange',
    cone_band: 'reflective-yellow',
    timber: 'wood-pine',
  },
  // A shelf whose top is at `y`, from `x[0]` to `x[1]` and `z[0]` to `z[1]`.
  shelf(id, x, y, z): box(id, 'shelf', [x[0], y - 0.03, z[0]], [x[1], y, z[1]]),
  // A board on a locker's back wall, from `z` out one grain, that tools hang on.
  board(id, x, y, z): box(id, 'board', [x[0], y[0], z], [x[1], y[1], z + 0.03125]),
  // A rolled length of hose standing on edge with its face out, from `z[0]` to `z[1]`, its coupling at the centre.
  hoseRoll(id, x, y0, z, r): [
    round(k.turned(id, 'hose', 'z', k.disc(r, z[0], z[1] - 0.03125), [x, y0 + r, 0])),
    round(k.turned(id + '_coupling', 'coupling', 'z', k.disc(r * 0.3, z[0], z[1]), [x, y0 + r, 0])),
  ],
  // A gas cylinder standing at `x`, `z` on `y0`, its valve on top.
  cylinder(id, x, y0, z, r, h, slot='cylinder'): [
    round(k.turned(id, slot, 'y', k.disc(r, y0, y0 + h), [x, 0, z])),
    round(k.turned(id + '_valve', 'valve', 'y', k.disc(r * 0.4, y0 + h, y0 + h + 0.0625), [x, 0, z])),
  ],
  // A case from `min` to `max`, its lid band on top and a handle on its front face.
  case(id, slot, min, max): [
    box(id, slot, min, [max[0], max[1] - 0.03125, max[2]]),
    box(id + '_lid', 'lid', [min[0], max[1] - 0.03125, min[2]], max),
    box(id + '_handle', 'lid', [(min[0] + max[0]) / 2 - 0.08, (min[1] + max[1]) / 2 - 0.02, max[2]], [(min[0] + max[0]) / 2 + 0.08, (min[1] + max[1]) / 2 + 0.02, max[2] + 0.03125]),
  ],
  // A strap across kit at `y`, on its front face at `z`.
  strap(id, x, y, z): box(id, 'strap', [x[0], y, z], [x[1], y + 0.05, z + 0.03125]),
  // A long-handled tool hanging head up on a board at `z`: its haft from `y0` and its head `head` tall and wide.
  hungTool(id, x, y0, length, head, z, headSlot='steel', haftSlot='haft'): [
    box(id + '_haft', haftSlot,[x - 0.02, y0, z], [x + 0.02, y0 + length, z + 0.04]),
    box(id + '_head', headSlot, [x - head[0] / 2, y0 + length - head[1], z], [x + head[0] / 2, y0 + length, z + 0.05]),
  ],
  // A traffic cone standing at `x`, `z` on `y0`.
  cone(id, x, y0, z): [
    box(id + '_base', 'cone', [x - 0.15, y0, z - 0.15], [x + 0.15, y0 + 0.03125, z + 0.15]),
    round(k.turned(id, 'cone', 'y', [[0, 0], [0, 0.12], [0.45, 0.03], [0.45, 0], [0, 0]], [x, y0, z])),
    round(k.turned(id + '_band', 'cone_band', 'y', k.annulus(0.05, 0.085, 0.2, 0.3), [x, y0, z])),
  ],
  // Timber cribbing blocks stacked end out from `x0`, `count` across and `layers` high, a grain apart so each reads.
  cribbing(id, x0, y0, z, count, layers, block=0.1): [
    box(id + '_' + layer + '_' + i, 'timber', [x0 + i * (block + 0.03125), y0 + layer * block, z[0]], [x0 + i * (block + 0.03125) + block, y0 + (layer + 1) * block, z[1]])
    for layer in std.range(0, layers - 1)
    for i in std.range(0, count - 1)
  ],
}
