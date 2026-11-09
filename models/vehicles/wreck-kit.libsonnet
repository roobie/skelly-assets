// Helpers the wrecks share. Each family below keeps its own noise and panel cutting, so a wreck built on one keeps its
// look: the saloon's sine-hash fbm and cell plates, the van's two-octave noise and column sheets, and the bus's
// three-octave patch noise and tiled fields.
local k = import 'kit.libsonnet';
local charred =
  local frac(a) = a - std.floor(a);
  local hash(i, j, seed) = frac(std.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453);
  local smooth(t) = t * t * (3 - 2 * t);
  local value(a, b, seed) =
    local i = std.floor(a);
    local j = std.floor(b);
    local u = smooth(a - i);
    local v = smooth(b - j);
    local low = hash(i, j, seed) * (1 - u) + hash(i + 1, j, seed) * u;
    local high = hash(i, j + 1, seed) * (1 - u) + hash(i + 1, j + 1, seed) * u;
    low * (1 - v) + high * v;
  local fbm(a, b, seed) = 0.55 * value(a / 0.5, b / 0.5, seed) + 0.3 * value(a / 0.2, b / 0.2, seed + 1) + 0.15 * value(a / 0.09, b / 0.09, seed + 2);
  local fine(a, b, seed) = 0.45 * value(a / 0.3, b / 0.3, seed) + 0.35 * value(a / 0.13, b / 0.13, seed + 1) + 0.2 * value(a / 0.0625, b / 0.0625, seed + 2);
  local grain = 32;
  local snap(a) = std.round(a * grain) / grain;
  // One piece per run of cells that agree, so a patch's edge follows the noise and a large plain area stays cheap.
  local runs(cells) = std.foldl(
    function(acc, cell)
      local last = if std.length(acc) == 0 then null else acc[std.length(acc) - 1];
      if last != null && last.to == cell.j && last.slot == cell.slot && last.w == cell.w
      then acc[:std.length(acc) - 1] + [last { to: cell.j + 1 }]
      else acc + [{ from: cell.j, to: cell.j + 1, slot: cell.slot, w: cell.w }],
    cells,
    []
  );
  {
    fbm:: fbm,
    gauss(a):: std.exp(-a * a),
    // A plate one cell at a time: `axis` is its normal. For z, u is x and v is y; for y, u is x and v is z; for x, u is z and v is y.
    // `surf` gives its outer face and `thick` runs inward, negative for an outward face looking along minus the axis.
    plate(id, axis, u, v, surf, mask, slot, thick=0.0625, step=0.0625)::
      local nu = std.ceil((u[1] - u[0]) / step);
      local nv = std.ceil((v[1] - v[0]) / step);
      std.flattenArrays([
        local u0 = u[0] + i * step;
        local uc = u0 + step / 2;
        local row = runs([
          { j: j, slot: slot(uc, v[0] + (j + 0.5) * step), w: snap(surf(uc, v[0] + (j + 0.5) * step)) }
          for j in std.range(0, nv - 1)
          if mask(uc, v[0] + (j + 0.5) * step)
        ]);
        [
          local a = std.min(r.w, r.w - thick);
          local b = std.max(r.w, r.w - thick);
          local v0 = v[0] + r.from * step;
          local v1 = v[0] + r.to * step;
          local u1 = u0 + step;
          {
            id: id + '_' + i + '_' + r.from,
            kind: 'box',
            slot: r.slot,
          } + (
            if axis == 'z' then { min: [u0, v0, a], max: [u1, v1, b] }
            else if axis == 'y' then { min: [u0, a, v0], max: [u1, b, v1] }
            else { min: [a, v0, u0], max: [b, v1, u1] }
          )
          for r in row
        ]
        for i in std.range(0, nu - 1)
      ]),
    // A straight member in the side view from `a` to `b`, each (x, y), across `z`.
    bar(id, slot, a, b, width, z)::
      local dx = b[0] - a[0];
      local dy = b[1] - a[1];
      local length = std.sqrt(dx * dx + dy * dy);
      local nx = -dy * width / 2 / length;
      local ny = dx * width / 2 / length;
      { id: id, kind: 'prism', slot: slot, axis: 'z', profile: [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]], start: z[0], end: z[1] },
    // Soot and char with bare metal showing, rust breaking through in soft-edged islands: `rustBias` raises its share.
    burnt(a, b, seed, rustBias=0)::
      local m = fine(a, b, seed + 11) + rustBias;
      local n = fbm(a, b, seed);
      if m > 0.68 then 'rust'
      else if m > 0.64 then 'char'
      else if n < 0.5 then 'soot'
      else if n < 0.63 then 'char'
      else if n < 0.7 then 'ash'
      else 'bare',
    burntFinish:: { soot: 'steel-spall-black', char: 'plastic-scorched', ash: 'iron-cast', bare: 'iron-dull', rust: 'rust-red' },
  };
// A panel's colour comes from a field cell by cell, so a burn has no edge of its own to read as a sticker.
local panels =
  local lerp(points, x) =
    local n = std.length(points);
    local span = [i for i in std.range(0, n - 2) if x <= points[i + 1][0]];
    if x <= points[0][0] then points[0][1]
    else if std.length(span) == 0 then points[n - 1][1]
    else
      local a = points[span[0]];
      local b = points[span[0] + 1];
      a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  local hash(a, b, seed) =
    local n = (a + 1000) * 3741 + (b + 1000) * 6682 + seed * 997;
    ((n % 65536) * (n % 65521) + n) % 65521 / 65521;
  local mix(a, b, t) = a + (b - a) * t * t * (3 - 2 * t);
  local noiseAt(seed, x, y, size) =
    local u = x / size;
    local v = y / size;
    local i = std.floor(u);
    local j = std.floor(v);
    mix(mix(hash(i, j, seed), hash(i + 1, j, seed), u - i), mix(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), u - i), v - j);
  local noise(seed, x, y) = 0.5 * noiseAt(seed, x, y, 0.4) + 0.5 * noiseAt(seed + 1, x, y, 0.14);
  local place(plane, id, slot, u, v, w) =
    if plane == 'z' then k.box(id, slot, [u[0], v[0], w[0]], [u[1], v[1], w[1]])
    else if plane == 'x' then k.box(id, slot, [w[0], v[0], u[0]], [w[1], v[1], u[1]])
    else k.box(id, slot, [u[0], w[0], v[0]], [u[1], w[1], v[1]]);
  // Cells run up each column of a panel with `slot(u, v)`, and null leaves a hole. Equal neighbours merge into one box.
  local sheet(tag, plane, u, bottom, top, w, slot, cell=0.125) =
    local columns = std.max(1, std.ceil((u[1] - u[0]) / cell));
    local width = (u[1] - u[0]) / columns;
    std.flattenArrays([
      local a = u[0] + i * width;
      local middle = a + width / 2;
      local low = bottom(middle);
      local high = top(middle);
      local rows = std.max(1, std.ceil((high - low) / cell));
      local height = (high - low) / rows;
      local runs = if high - low < 0.02 then [] else std.foldl(function(acc, j)
        local s = slot(middle, low + (j + 0.5) * height);
        local n = std.length(acc);
        if n > 0 && acc[n - 1].s == s && acc[n - 1].end == j then acc[:n - 1] + [acc[n - 1] { end: j + 1 }]
        else acc + [{ s: s, from: j, end: j + 1 }], std.range(0, rows - 1), []);
      [
        place(plane, tag + '_' + i + '_' + run.from, run.s, [a, a + width], [low + run.from * height, low + run.end * height], w(middle))
        for run in runs
        if run.s != null
      ]
      for i in std.range(0, columns - 1)
    ]);
  // A skin over x and z whose height `y(x, z)` may slope along x; it steps across z.
  local surface(tag, xs, zs, y, thick, slot) = std.flattenArrays([
    [
      local zm = (zs[j] + zs[j + 1]) / 2;
      k.prism(tag + '_' + i + '_' + j, slot((xs[i] + xs[i + 1]) / 2, zm), [
        [xs[i], y(xs[i], zm) - thick],
        [xs[i + 1], y(xs[i + 1], zm) - thick],
        [xs[i + 1], y(xs[i + 1], zm)],
        [xs[i], y(xs[i], zm)],
      ], [zs[j], zs[j + 1]])
      for j in std.range(0, std.length(zs) - 2)
      if slot((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2) != null
    ]
    for i in std.range(0, std.length(xs) - 2)
  ]);
  // A flat door or panel standing on edge, seen from above as a strip from `from` to `to`, both (z, x). It steps down along
  // its length, between `bottom(t)` and `top(t)`, so a door off its hinge can trail its free corner on the road.
  local swung(tag, from, to, thick, bottom, top, slot, cells=8) =
    local dz = to[0] - from[0];
    local dx = to[1] - from[1];
    local length = std.sqrt(dz * dz + dx * dx);
    local nz = -dx / length * thick;
    local nx = dz / length * thick;
    local at(t) = [from[0] + dz * t, from[1] + dx * t];
    std.flattenArrays([
      local a = at(i / cells);
      local b = at((i + 1) / cells);
      local t = (i + 0.5) / cells;
      local low = bottom(t);
      local high = top(t);
      local rows = std.max(1, std.ceil((high - low) / 0.14));
      [
        k.yPrism(tag + '_' + i + '_' + j, slot(t, low + (j + 0.5) * (high - low) / rows), [
          a,
          b,
          [b[0] + nz, b[1] + nx],
          [a[0] + nz, a[1] + nx],
        ], [low + j * (high - low) / rows, low + (j + 1) * (high - low) / rows])
        for j in std.range(0, rows - 1)
        if slot(t, low + (j + 0.5) * (high - low) / rows) != null
      ]
      for i in std.range(0, cells - 1)
    ]);
  // A wire-edged steel rim with no tyre, its dish a little dark, hub at the origin.
  local rim(id, massKg, radius, width, rust='scrap-rusted', dish='steel-spall-black') = k.compound(id, massKg, [
    k.turned('hoop', 'rust', 'z', k.annulus(radius - 0.035, radius, -width / 2, width / 2)) + { sides: 24 },
    k.turned('flange_out', 'rust', 'z', k.annulus(radius - 0.05, radius, width / 2 - 0.02, width / 2)) + { sides: 24 },
    k.turned('dish', 'dish', 'z', k.disc(radius - 0.03, -0.02, 0.03)) + { sides: 24 },
    k.turned('hub', 'rust', 'z', k.disc(radius * 0.32, 0.03, 0.06)) + { sides: 12 },
  ], { rust: rust, dish: dish });
  {
    lerpPoints:: lerp,
    panelNoise:: noise,
    columnSheet:: sheet,
    surface:: surface,
    swung:: swung,
    rim:: rim,
    // Picks the slot from `levels`, [[threshold, slot], ...] highest first.
    burnLevels(levels, fallback='paint'):: function(v)
      local hit = [level[1] for level in levels if v >= level[0]];
      if std.length(hit) > 0 then hit[0] else fallback,
  };
local tiles =
  local clamp(v, a, b) = std.max(a, std.min(b, v));
  local smooth(t0) = local t = clamp(t0, 0, 1); t * t * (3 - 2 * t);
  local lerp(a, b, t) = a + (b - a) * t;
  local hash(i, j, seed) =
    local v = std.mod((i + 4096) * 7919 + (j + 4096) * 104729 + seed * 1299709, 65521);
    local u = std.mod(v * v + 977, 65521);
    std.mod(u * u + 1, 65521) / 65521;
  local value(x, y, seed) =
    local i = std.floor(x);
    local j = std.floor(y);
    local fx = smooth(x - i);
    local fy = smooth(y - j);
    lerp(lerp(hash(i, j, seed), hash(i + 1, j, seed), fx), lerp(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), fx), fy);
  // About 0.5 with a spread reaching 0 and 1; its finest octave is what breaks up a patch's edge.
  local noise(x, y, seed) =
    clamp(0.5 + 2 * (0.55 * value(x / 2, y / 2, seed) + 0.32 * value(x / 0.75, y / 0.75, seed + 1) + 0.13 * value(x / 0.28, y / 0.28, seed + 2) - 0.5), 0, 1);
  local quantise(v, step) = std.floor(v / step + 0.5) * step;
  local boxOn(plane, id, slot, u, v, w) =
    if plane == 'z' then { id: id, kind: 'box', slot: slot, min: [u[0], v[0], w[0]], max: [u[1], v[1], w[1]] }
    else if plane == 'y' then { id: id, kind: 'box', slot: slot, min: [u[0], w[0], v[0]], max: [u[1], w[1], v[1]] }
    else { id: id, kind: 'box', slot: slot, min: [w[0], v[0], u[0]], max: [w[1], v[1], u[1]] };
  {
    clamp:: clamp,
    smooth:: smooth,
    lerp:: lerp,
    hash:: hash,
    patchNoise:: noise,
    quantise:: quantise,
    // A panel cut into tiles. `at(u, v)` gives each tile { slot, w: [low, high] } or null for a hole, so colour, rust-through
    // and crumple all come from one function and no patch has a straight edge. Equal neighbours along u merge into one piece.
    // A plane is named by its normal: 'z' lays (u, v) on (x, y), 'y' on (x, z) and 'x' on (z, y).
    field(id, plane, u, v, du, dv, at, emit=null)::
      local nu = std.ceil((u[1] - u[0]) / du - 1e-9);
      local nv = std.ceil((v[1] - v[0]) / dv - 1e-9);
      local place(pid, slot, a, b, c) = if emit == null then [boxOn(plane, pid, slot, a, b, c)] else emit(pid, plane, slot, a, b, c);
      std.flattenArrays([
        local v0 = v[0] + j * dv;
        local tiles = [at(u[0] + (i + 0.5) * du, v0 + 0.5 * dv) for i in std.range(0, nu - 1)];
        local runs = std.foldl(function(runs, i)
          local n = std.length(runs);
          local tile = tiles[i];
          if tile == null then runs
          else if n > 0 && runs[n - 1].end == i && runs[n - 1].slot == tile.slot && runs[n - 1].w == tile.w then
            runs[:n - 1] + [runs[n - 1] { end: i + 1 }]
          else runs + [{ start: i, end: i + 1, slot: tile.slot, w: tile.w }], std.range(0, nu - 1), []);
        std.flattenArrays([
          place(id + '_' + j + '_' + run.start, run.slot, [u[0] + run.start * du, u[0] + run.end * du], [v0, v0 + dv], run.w)
          for run in runs
        ])
        for j in std.range(0, nv - 1)
      ]),
    // The compound check takes counterclockwise outlines only.
    ccw(profile)::
      local n = std.length(profile);
      local area = std.sum([profile[i][0] * profile[(i + 1) % n][1] - profile[(i + 1) % n][0] * profile[i][1] for i in std.range(0, n - 1)]);
      if area > 0 then profile else std.reverse(profile),
    barProfile(a, b, thick)::
      local dx = b[0] - a[0];
      local dy = b[1] - a[1];
      local length = std.sqrt(dx * dx + dy * dy);
      local nx = -dy / length * thick / 2;
      local ny = dx / length * thick / 2;
      [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]],
    // The heat of the fire on a panel, from `heat` near 1 down to bare paint below 0.3.
    heatBurn(heat, base)::
      if heat > 0.8 then 'char'
      else if heat > 0.62 then 'soot'
      else if heat > 0.48 then 'ash'
      else if heat > 0.36 then 'rust'
      else if heat > 0.33 then 'rustRed'
      else base,
  };
charred + panels + tiles + {
  constant(v):: function(x) v,
  // A z range on the near side for `sign` above zero, mirrored to the far side otherwise.
  zr(sign, range):: if sign > 0 then range else [-range[1], -range[0]],
  grid(from, to, count):: [from + (to - from) * i / count for i in std.range(0, count)],
}
