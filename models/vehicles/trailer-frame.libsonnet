// Pressings the trailers and the tractor share: rows stay per-vehicle because each is pressed for its own body.
local k = import 'kit.libsonnet';
local box = k.box;
local rail(id, slot, xBack, zBack, xTip, zTip, width, tipWidth, y) = [
  k.yPrism(id + '_near', slot, [[zBack - width, xBack], [zBack, xBack], [zTip + tipWidth, xTip], [zTip, xTip]], y),
  k.yPrism(id + '_far', slot, [[-zBack, xBack], [-zBack + width, xBack], [-zTip, xTip], [-zTip - tipWidth, xTip]], y),
];
{
  // The drawbar's two rails meet on `xTip`, where a blueprint fits `trailer_coupling`.
  drawbar(xBack, zBack, xTip, y, width=0.08, tipWidth=width):: rail('drawbar', 'frame', xBack, zBack, xTip, 0.0, width, tipWidth, y),
  // Boxes filling a wall panel in x and y around rectangular openings, each opening [xFrom, xTo, yFrom, yTo], sorted by x.
  wall(id, slot, x, y, z, openings)::
    local n = std.length(openings);
    local columnEdges = [x[0]] + std.flattenArrays([[o[0], o[1]] for o in openings]) + [x[1]];
    [box(id + '_pier_' + i, slot, [columnEdges[2 * i], y[0], z[0]], [columnEdges[2 * i + 1], y[1], z[1]])
     for i in std.range(0, n) if columnEdges[2 * i + 1] > columnEdges[2 * i]]
    + std.flattenArrays([
      local o = openings[i];
      (if o[2] > y[0] then [box(id + '_sill_' + i, slot, [o[0], y[0], z[0]], [o[1], o[2], z[1]])] else [])
      + (if o[3] < y[1] then [box(id + '_head_' + i, slot, [o[0], o[3], z[0]], [o[1], y[1], z[1]])] else [])
      for i in std.range(0, n - 1)
    ]),
  // A near-side guard over a wheel of the hub at (x, y); the far side is its mirror.
  mudguard(id, massKg, x, y, inner, outer, z, finish, from=6, to=174, steps=8)::
    k.compound(id, massKg, k.arc('arc', 'paint', x, y, inner, outer, from, to, steps, z), { paint: finish }),
  // A wind-down resting leg with its foot on the ground, centred on x and z.
  leg(id, massKg, height, foot, finish):: k.compound(id, massKg, [
    k.turned('tube', 'tube', 'y', k.disc(0.045, 0.04, height)),
    box('foot', 'foot', [-foot, 0, -foot], [foot, 0.04, foot]),
    box('collar', 'tube', [-0.07, height - 0.14, -0.07], [0.07, height, 0.07]),
  ], { tube: finish, foot: 'paint-charcoal' }),
}
