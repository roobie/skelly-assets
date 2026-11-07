local h = import '../compound.libsonnet';
local box = h.box;
// A ring on y between radii r0 and r1 from y0 to y1.
local ring(id, slot, r0, r1, y0, y1) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [0, y0, 0]);
// A circlet standing on its lower edge, front on +z: a wooden band of radius r and height ht, metal bands round both
// edges, metal studs round it and a pointed metal plaque at the front. Slots: band, trim.
local circlet(r, ht) =
  [
    ring('band', 'band', r - 0.006, r, 0, ht),
    ring('rim-low', 'trim', r - 0.006, r + 0.002, 0, 0.004),
    ring('rim-high', 'trim', r - 0.006, r + 0.002, ht - 0.004, ht),
    h.prism('plaque', 'trim', 'z', [[-0.022, 0], [0.022, 0], [0.022, ht], [0, ht + 0.03], [-0.022, ht]], r - 0.002, r + 0.003),
    h.prism('plaque-inset', 'band', 'z', [[-0.01, 0.008], [0.01, 0.008], [0.01, ht], [0, ht + 0.016], [-0.01, ht]], r + 0.003, r + 0.005),
  ] + [
    local a = std.pi * 2 * i / 12;
    box('stud-%d' % i, 'trim', [r * std.sin(a) - 0.004, ht / 2 - 0.004, r * std.cos(a) - 0.004], [r * std.sin(a) + 0.004, ht / 2 + 0.004, r * std.cos(a) + 0.004])
    for i in std.range(1, 11)
  ];
[
  // A circlet 170 mm across and 25 mm tall: a band of dark wood with copper bands round both edges, copper studs
  // and a pointed copper plaque at the brow.
  h.compound('copper_circlet', 0.7, circlet(0.085, 0.025), { band: 'wood-oak', trim: 'copper' })
  + { voxelGrain: 0.002 },
]
