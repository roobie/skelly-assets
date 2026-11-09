local h = import '../compound.libsonnet';
local box = h.box;
local rad(d) = d * std.pi / 180;

// A closed ring turned about y from `y0` to `y0 + ht`, radii `r0` to `r1`, for hat bands and rolled brim edges.
local ring(id, slot, y0, ht, r0, r1, x=0, z=0) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [ht, r1], [ht, r0], [0, r0]], [x, y0, z]);
// A hollow shell turned about y from an outside path of [y, r] points running from the brim edge up to the crown
// (ending on the axis), returned down the inside `t` lower and in, so the hat stays open underneath.
local shell(id, slot, outside, t) =
  local n = std.length(outside);
  local inside = [[outside[n - 1 - i][0] - t, std.max(0, outside[n - 1 - i][1] - (if outside[n - 1 - i][1] == 0 then 0 else t))] for i in std.range(0, n - 1)];
  h.turned(id, slot, 'y', outside + inside + [outside[0]]);
// A five-pointed star `r` across its points, as convex pieces: a pentagon and five points. `pt(u, v)` maps the
// star's own plane onto the prism's profile plane.
local star(id, slot, axis, r, start, end, pt) =
  local inner = r * 0.42;
  local at(rr, k) = pt(rr * std.sin(rad(72 * k / 2)), rr * std.cos(rad(72 * k / 2)));
  [h.prism(id + '-c', slot, axis, [at(inner, 2 * k + 1) for k in std.range(0, 4)], start, end)]
  + [h.prism('%s-%d' % [id, k], slot, axis, [at(inner, 2 * k - 1), at(r, 2 * k), at(inner, 2 * k + 1)], start, end) for k in std.range(0, 4)];

// A strip from [z, x] point `a` to `b`, `t` thick toward the centre, standing on y from y0 to y1: hat walls.
local wall(id, slot, a, b, t, y0, y1) =
  local dz = b[0] - a[0], dx = b[1] - a[1], len = std.sqrt(dz * dz + dx * dx);
  local nz = dx / len * t, nx = -dz / len * t;
  h.prism(id, slot, 'y', [a, b, [b[0] + nz, b[1] + nx], [a[0] + nz, a[1] + nx]], y0, y1);

// A tricorne's brim corner at bearing `b` degrees from the front, as [z, x].
local corner(R, b) = [R * std.cos(rad(b)), R * std.sin(rad(b))];

// Turban wraps: a band of cloth wound round a centre in segments whose height climbs `rise` per turn from `y0`, `w`
// tall and standing `t` proud of radius `r`, over `turn` degrees from bearing `a0`.
local wrap(prefix, slot, r, t, w, a0, turn, y0, rise, steps) = std.flattenArrays([
  local y = y0 + rise * (i + 0.5) / steps;
  h.crescent('%s-%d' % [prefix, i], slot, r - 0.004, r + t, a0 + turn * i / steps, a0 + turn * (i + 1) / steps, 1, y, y + w)
  for i in std.range(0, steps - 1)
]);

// The radius of an outside path of [y, r] points at height y, by straight runs between its points.
local radiusAt(path, y) =
  local n = std.length(path);
  local seg = [i for i in std.range(0, n - 2) if path[i][0] <= y && y <= path[i + 1][0]];
  if std.length(seg) == 0 then (if y < path[0][0] then path[0][1] else path[n - 1][1])
  else
    local i = seg[0], a = path[i], b = path[i + 1];
    a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
local turbanPath = [[0, 0.104], [0.03, 0.11], [0.07, 0.111], [0.1, 0.1], [0.118, 0.08], [0.128, 0.05], [0.131, 0]];
// One turban wrap from the front round one side to the back, climbing as it goes, laid on the body at its height.
local turbanWrap(prefix, side, y0, rise, w, steps=12) = [
  local y = y0 + rise * (i + 0.5) / steps, r = radiusAt(turbanPath, y + w / 2);
  h.crescent('%s-%d' % [prefix, i], 'wrap', r - 0.006, r + 0.006, side * 180 * i / steps, side * 180 * (i + 1) / steps, 1, y, y + w)[0]
  for i in std.range(0, steps - 1)
];
local wizardPath = [[0.006, 0.105], [0.12, 0.07], [0.24, 0.035], [0.33, 0.008], [0.34, 0]];

[

  // A blue costume wizard hat standing on its brim, 380 mm across and 336 mm tall: a tall cone on a wide floppy
  // brim, a gold band round its foot and gold stars stitched over the cone and brim.
  local coneStar(id, x, y, r) = local z = std.sqrt(std.pow(radiusAt(wizardPath, y), 2) - x * x);
    star(id, 'star', 'z', r, z - 0.005, z + 0.002, function(u, v) [x + u, y + v]);
  local sideStar(id, side, z, y, r) = local x = std.sqrt(std.pow(radiusAt(wizardPath, y), 2) - z * z);
    star(id, 'star', 'x', r, side * x - 0.005, side * x + 0.002, function(u, v) [y + v, z + u]);
  local brimStar(id, x, z, r) = star(id, 'star', 'y', r, 0.004, 0.009, function(u, v) [z + v, x + u]);
  h.compound('wizard_hat_costume', 0.3,
             [
               shell('cone', 'cloth', wizardPath, 0.006),
               ring('brim', 'cloth', 0, 0.006, 0.098, 0.19),
               ring('band', 'band', 0.006, 0.022, 0.1, 0.108),
             ]
             + coneStar('star-a', 0, 0.075, 0.022) + coneStar('star-b', -0.025, 0.17, 0.016) + coneStar('star-c', 0.012, 0.25, 0.012)
             + sideStar('star-d', 1, 0.01, 0.11, 0.018) + sideStar('star-e', -1, -0.01, 0.15, 0.016) + sideStar('star-f', 1, -0.02, 0.21, 0.012)
             + brimStar('star-g', 0.0, 0.15, 0.02) + brimStar('star-h', 0.12, 0.09, 0.016) + brimStar('star-i', -0.12, 0.1, 0.016)
             + brimStar('star-j', -0.1, -0.12, 0.016),
             { cloth: 'cloth-blue', band: 'metal-gold', star: 'metal-gold' })
  + { voxelGrain: 0.004, taxonomy: { category: 'clothing', tags: { slot: ['head'], material: ['fabric'], setting: ['fantasy'] } } },
]
