local h = import '../compound.libsonnet';
local box = h.box;
local flat(id, slot, pts, y, t=0.004) = h.prism(id, slot, 'y', [[p[1], p[0]] for p in pts], y, y + t);
local rad(d) = d * std.pi / 180;

// A tapered strip lying on a top face at y from point a to point b ([x, z]), w0 wide at a and w1 at b: sleeves laid
// out flat, straps and long bones.
local taper(id, slot, a, b, w0, w1, y, t) =
  local dx = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dx * dx + dz * dz);
  local nx = -dz / len, nz = dx / len;
  flat(id, slot, [
    [a[0] + nx * w0 / 2, a[1] + nz * w0 / 2],
    [b[0] + nx * w1 / 2, b[1] + nz * w1 / 2],
    [b[0] - nx * w1 / 2, b[1] - nz * w1 / 2],
    [a[0] - nx * w0 / 2, a[1] - nz * w0 / 2],
  ], y, t);

// Round heads of rivets or bolts at each [x, z] in pts, on a face at y.
local rivets(prefix, slot, pts, y, r=0.005, t=0.004) = [
  h.disc('%s-%d' % [prefix, i], slot, r, y, y + t, pts[i][0], pts[i][1])
  for i in std.range(0, std.length(pts) - 1)
];

// A flat plate from x0..x1 by z0..z1 on a face at y, with a rivet near each corner.
local plate(id, x0, x1, z0, z1, y, t=0.004, inset=0.012, rivetSlot='rivet') =
  [box(id, 'plate', [x0, y, z0], [x1, y + t, z1])]
  + rivets(id + '-rivet', rivetSlot, [[x0 + inset, z0 + inset], [x1 - inset, z0 + inset], [x0 + inset, z1 - inset], [x1 - inset, z1 - inset]], y + t, 0.004, 0.003);

// A top laid out flat, front up, collar towards +z: a body `w` across and `l` long, `t` thick, its shoulders sloping
// in to a neck notch `neckW` wide and `neckD` deep where the back panel's inside shows (slot lining). A sleeveless
// top cuts armholes `armIn` in from each side and `armD` deep below the shoulder; optional sleeves { l, w0, w1, ang }
// lie angled `ang` degrees out from straight down, from the shoulder. Slots: cloth, lining, sleeve.
local flatTop(o) =
  local c = { w: 0.44, l: 0.6, t: 0.008, sh: 0.06, neckW: 0.075, neckD: 0.06, armIn: 0, armD: 0.16, sleeves: null } + o;
  local w = c.w, l = c.l, t = c.t, top = l / 2 - c.neckD, sw = w / 2 - c.armIn;
  [
    flat('body', 'cloth', [[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, top - c.armD], [-w / 2, top - c.armD]], 0, t),
    flat('chest', 'cloth', [[-sw, top - c.armD - 0.01], [sw, top - c.armD - 0.01], [sw, top], [-sw, top]], 0, t),
    flat('lining', 'lining', [[-c.neckW, top], [c.neckW, top], [c.neckW, l / 2 - 0.004], [-c.neckW, l / 2 - 0.004]], 0, t * 0.5),
  ] + [
    flat('shoulder-%d' % (s + 1), 'cloth', [[s * c.neckW, top], [s * sw, top], [s * (sw - 0.02), top + c.neckD - c.sh * 0.5], [s * (c.neckW + 0.02), l / 2], [s * c.neckW, l / 2]], 0, t)
    for s in [-1, 1]
  ] + (if c.armIn > 0 then [
         flat('armhole-%d' % (s + 1), 'cloth', [[s * sw, top - c.armD - 0.01], [s * (sw + c.armIn), top - c.armD - 0.01], [s * (sw + c.armIn), top - c.armD + 0.004], [s * sw, top - c.armD + c.armIn * 1.2]], 0, t)
         for s in [-1, 1]
       ] else [])
  + (if c.sleeves == null then [] else
       local sl = c.sleeves;
       [
         local a = [s * (w / 2 - 0.03), top - sl.w0 / 2 + 0.02];
         local b = [a[0] + s * sl.l * std.sin(rad(sl.ang)), a[1] - sl.l * std.cos(rad(sl.ang))];
         taper('sleeve-%d' % (s + 1), 'sleeve', a, b, sl.w0, sl.w1, 0, t)
         for s in [-1, 1]
       ]);
// The cuff end of a flatTop sleeve: [x, z] at share k of its length and the sleeve direction.
local alongSleeve(c, s, k) =
  local w = c.w, l = c.l, top = l / 2 - c.neckD, sl = c.sleeves;
  local a = [s * (w / 2 - 0.03), top - sl.w0 / 2 + 0.02];
  [a[0] + s * k * sl.l * std.sin(rad(sl.ang)), a[1] - k * sl.l * std.cos(rad(sl.ang))];

// Mirror armour laid out as a set: the front and back panels side by side at the top, each a leather backing with a
// domed round mirror in its middle and steel plates round it, and the two side panels below them, joined by
// buckled leather straps. `style` sets the plates: 'squares' (crude square plates in a grid), 'bars' (rectangular
// plates in rows) or 'framed' (one well-formed plate with a beaded border). Slots: leather, plate, mirror, rivet,
// strap, buckle.
local mirrorArmor(id, mass, style) =
  local pw = 0.22, pl = 0.27, pz = 0.07, sw = 0.18, sl = 0.2, sz = -0.19, y = 0.004, pt = 0.004;
  local panel(p, cx, cz, w, l, disc) =
    [box(p + '-leather', 'leather', [cx - w / 2, 0, cz - l / 2], [cx + w / 2, y, cz + l / 2])]
    + (if style == 'squares' then
         local n = 4, m = 5, gap = 0.006, s = (w - 0.016 - (n - 1) * gap) / n, sz2 = (l - 0.016 - (m - 1) * gap) / m;
         std.flattenArrays([
           local x0 = cx - w / 2 + 0.008 + i * (s + gap), z0 = cz - l / 2 + 0.008 + j * (sz2 + gap);
           if disc && std.abs(x0 + s / 2 - cx) < 0.06 && std.abs(z0 + sz2 / 2 - cz) < 0.06 then []
           else plate('%s-sq-%d-%d' % [p, i, j], x0, x0 + s, z0, z0 + sz2, y, pt, 0.008)
           for i in std.range(0, n - 1)
           for j in std.range(0, m - 1)
         ])
       else if style == 'bars' then
         local m = 6, gap = 0.006, bl = (l - 0.016 - (m - 1) * gap) / m;
         std.flattenArrays([
           local z0 = cz - l / 2 + 0.008 + j * (bl + gap);
           if disc && std.abs(z0 + bl / 2 - cz) < 0.06 then
             plate('%s-bar-%d-l' % [p, j], cx - w / 2 + 0.008, cx - 0.072, z0, z0 + bl, y, pt, 0.008)
             + plate('%s-bar-%d-r' % [p, j], cx + 0.072, cx + w / 2 - 0.008, z0, z0 + bl, y, pt, 0.008)
           else plate('%s-bar-%d' % [p, j], cx - w / 2 + 0.008, cx + w / 2 - 0.008, z0, z0 + bl, y, pt, 0.008)
           for j in std.range(0, m - 1)
         ])
       else
         [box(p + '-plate', 'plate', [cx - w / 2 + 0.008, y, cz - l / 2 + 0.008], [cx + w / 2 - 0.008, y + pt, cz + l / 2 - 0.008])]
         + [
           box(p + '-bead-%d' % i, 'mirror', [cx + e[0] - e[2], y + pt, cz + e[1] - e[3]], [cx + e[0] + e[2], y + pt + 0.003, cz + e[1] + e[3]])
           for i in [0, 1, 2, 3]
           for e in [[[0, l / 2 - 0.016, w / 2 - 0.012, 0.003], [0, -l / 2 + 0.016, w / 2 - 0.012, 0.003], [w / 2 - 0.016, 0, 0.003, l / 2 - 0.012], [-w / 2 + 0.016, 0, 0.003, l / 2 - 0.012]][i]]
         ]
         + rivets(p + '-rivet', 'rivet', [[cx + sx * (w / 2 - 0.024), cz + sz3 * (l / 2 - 0.024)] for sx in [-1, 1] for sz3 in [-1, 1]], y + pt, 0.005, 0.003))
    + (if disc then [
         h.disc(p + '-disc-rim', 'plate', 0.068, y, y + pt + 0.002, cx, cz),
         h.dome(p + '-disc', 'mirror', 0.06, 0.014, 0.004, 'y', [cx, y + pt + 0.002, cz]),
       ] else []);
  h.compound(id, mass,
             panel('front', -0.13, pz, pw, pl, true)
             + panel('back', 0.13, pz, pw, pl, true)
             + panel('side-l', -0.13, sz, sw, sl, false)
             + panel('side-r', 0.13, sz, sw, sl, false)
             + std.flattenArrays([
               [
                 box('shoulder-%d-%d' % [i, k], 'strap', [x - 0.015, y, pz + pl / 2 - 0.02], [x + 0.015, y + 0.004, pz + pl / 2 + 0.06]),
                 box('shoulder-buckle-%d-%d' % [i, k], 'buckle', [x - 0.019, y + 0.004, pz + pl / 2 + 0.03], [x + 0.019, y + 0.008, pz + pl / 2 + 0.05]),
               ]
               for i in [0, 1]
               for k in [0, 1]
               for x in [[-0.13, 0.13][i] + [-0.06, 0.06][k]]
             ])
             + std.flattenArrays([
               [
                 box('side-strap-%d-%d' % [i, k], 'strap', [x - 0.012, y, sz + sl / 2 - 0.02], [x + 0.012, y + 0.004, pz - pl / 2 + 0.02]),
                 box('side-buckle-%d-%d' % [i, k], 'buckle', [x - 0.016, y + 0.004, sz + sl / 2 + 0.002], [x + 0.016, y + 0.008, pz - pl / 2 - 0.002]),
               ]
               for i in [0, 1]
               for k in [0, 1]
               for x in [[-0.13, 0.13][i] + [-0.05, 0.05][k]]
             ])
             + [box('join', 'strap', [-0.02, y, pz - 0.08], [0.02, y + 0.004, pz + 0.08])],
             {
               leather: 'leather-brown',
               plate: if style == 'squares' then 'steel-bright' else if style == 'bars' then 'steel-grey' else 'steel-blued',
               mirror: if style == 'framed' then 'mirror-silver' else if style == 'bars' then 'steel-grey' else 'steel-bright',
               rivet: 'steel',
               strap: 'leather-tan',
               buckle: 'brass-dull',
             })
  + { voxelGrain: 0.004 };

[

  // A sabre fencing jacket lying flat, front up: silvery woven metal cloth 400 mm across and 480 mm long, cut
  // straight at the waist, its sleeves laid out to the sides, 560 mm long, with a stand collar, white cuffs and the
  // body-wire clip at the hip.
  local o = { w: 0.4, l: 0.48, t: 0.006, neckW: 0.07, neckD: 0.06, sleeves: { l: 0.56, w0: 0.15, w1: 0.09, ang: 35 } };
  h.compound('lame_saber', 1.043, flatTop(o) + [
    box('collar', 'binding', [-0.08, 0.0, 0.176], [0.08, 0.012, 0.19]),
    box('collar-l', 'binding', [-0.092, 0.0, 0.18], [-0.07, 0.012, 0.24]),
    box('collar-r', 'binding', [0.07, 0.0, 0.18], [0.092, 0.012, 0.24]),
    box('clip-tab', 'binding', [0.15, 0.006, -0.23], [0.18, 0.01, -0.18]),
    box('clip', 'clip', [0.155, 0.01, -0.22], [0.175, 0.016, -0.195]),
  ] + [
    taper('cuff-%d' % (s + 1), 'binding', alongSleeve(o, s, 0.93), alongSleeve(o, s, 1.0), 0.094, 0.094, 0.0, 0.008)
    for s in [-1, 1]
  ], { cloth: 'cloth-shimmer', sleeve: 'cloth-shimmer', lining: 'cloth-shimmer', binding: 'cloth-cream', clip: 'steel-bright' })
  + { voxelGrain: 0.004 },
]
