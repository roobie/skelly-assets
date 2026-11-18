local h = import 'packages/thing-authoring-tool/compound.libsonnet';

local nagasa = 0.70;
local sori = 0.017;
local motohaba = 0.031;
local sakihaba = 0.022;
local kissaki = 0.035;
// How far the point sits below the mune line, so the fukura meets the back at a point rather than a corner.
local tipDrop = 0.003;
local kasane = 0.007;
local jiKasane = 0.004;
local haKasane = 0.0025;
// Share of the blade's width from the mune to the shinogi, and to the hamon's mean line with its wave.
local shinogi = 0.3;
local hamon = 0.66;
local hamonWave = 0.07;
local hamonPitch = 0.045;
local habaki = 0.03;
local seppa = 0.002;
local tsubaThickness = 0.006;
local tsubaHeight = 0.077;
local tsubaWidth = 0.072;
local mimi = 0.004;
local fuchi = 0.012;
local tsuka = 0.236;
local kashira = 0.014;
// The tsuka's oval section, spine to edge and across, with the ito wrap's thickness over it.
local tsukaHeight = 0.032;
local tsukaWidth = 0.024;
local tsukaChamfer = 0.003;
local ito = 0.002;
local diamonds = 10;
// Width of the ito where two turns cross between diamonds.
local crossing = 0.005;
// The leading hand's middle, back from the fuchi, and the rear hand's, forward of the kashira.
local leadingHand = 0.05;
local rearHand = 0.045;

// The blade's curve is a circular arc tangent to the tsuka at the tsuba, of radius set by its sagitta over its length.
local radius = nagasa * nagasa / (8 * sori);
local yokote = nagasa - kissaki;
local mune(s) = [radius * std.sin(s / radius), motohaba / 2 + radius * (1 - std.cos(s / radius))];
local inward(s) = [-std.sin(s / radius), std.cos(s / radius)];
// Depth below the mune of the back and of the edge at s: the body tapers in width, and in the kissaki the edge sweeps
// up in the fukura to meet the slightly dropped back at the point.
local back(s) = if s <= yokote then 0 else tipDrop * std.pow((s - yokote) / kissaki, 2);
local edge(s) =
  if s <= yokote then motohaba + (sakihaba - motohaba) * s / yokote
  else tipDrop + (sakihaba - tipDrop) * (1 - std.pow((s - yokote) / kissaki, 2));
local at(s, share) =
  local p = mune(s), n = inward(s), d = back(s) + share * (edge(s) - back(s));
  [p[0] - d * n[0], p[1] - d * n[1]];
local hamonAt(s) = hamon + hamonWave * std.sin(2 * std.pi * s / hamonPitch);
local bodySteps = 70;
local pointSteps = 8;
local stations = [yokote * i / bodySteps for i in std.range(0, bodySteps)]
                 + [yokote + kissaki * i / pointSteps for i in std.range(1, pointSteps)];
local last = std.length(stations) - 1;
// One band of the blade between two lines across its width, thickest bands on the mune side so the shinogi shows as a
// step. Prisms must be convex, so each band is a run of quads, closing in a triangle at the point.
local band(name, slot, from, to, thick, i) =
  local a = stations[i], b = stations[i + 1];
  h.prism('%s-%d' % [name, i], slot, 'z',
          if i + 1 == last then [at(a, from(a)), at(b, 0), at(a, to(a))]
          else [at(a, from(a)), at(b, from(b)), at(b, to(b)), at(a, to(a))],
          -thick / 2, thick / 2);
local share(k) = function(s) k;
local blade = std.flattenArrays([
  local inBody = stations[i] < yokote;
  [
    band(if inBody then 'shinogi-ji' else 'kissaki', if inBody then 'shinogi-ji' else 'kissaki', share(0), share(shinogi), if inBody then kasane else jiKasane, i),
    band('ji', 'ji', share(shinogi), hamonAt, jiKasane, i),
    band('hamon', 'hamon', hamonAt, share(1), haKasane, i),
  ]
  for i in std.range(0, last - 1)
]);

local oval(halfY, halfZ, steps=32) = [
  [halfY * std.cos(2 * std.pi * i / steps), halfZ * std.sin(2 * std.pi * i / steps)]
  for i in std.range(0, steps - 1)
];
// An octagon across y and z with its corners cut back `c`, the tsuka's section and its fittings'.
local octagon(halfY, halfZ, c) = [
  [halfY, -halfZ + c], [halfY, halfZ - c], [halfY - c, halfZ], [-halfY + c, halfZ],
  [-halfY, halfZ - c], [-halfY, -halfZ + c], [-halfY + c, -halfZ], [halfY - c, -halfZ],
];
local tsubaBack = -seppa - tsubaThickness;
local fuchiEnd = tsubaBack - seppa;
local wrapFront = fuchiEnd - fuchi;
local wrapBack = wrapFront - tsuka;
local halfY = tsukaHeight / 2, halfZ = tsukaWidth / 2, flat = halfY - tsukaChamfer;
local pitch = tsuka / diamonds;
local diamondAt(k) = wrapBack + pitch * (k + 0.5);
local halfLong = pitch / 2 - crossing / 2;
local halfTall = flat * 0.9;
// The ito on one side face between diamond k - 1 and diamond k, split at the tsuka's middle line because prisms must
// be convex; the open diamonds between show the same and what lies under the wrap.
local sideIto(k, sign, z0, z1) =
  local left = if k == 0 then [[wrapBack, sign * flat], [wrapBack, 0]]
               else [[diamondAt(k - 1), sign * flat], [diamondAt(k - 1), sign * halfTall], [diamondAt(k - 1) + halfLong, 0]];
  local right = if k == diamonds then [[wrapFront, 0], [wrapFront, sign * flat]]
                else [[diamondAt(k) - halfLong, 0], [diamondAt(k), sign * halfTall], [diamondAt(k), sign * flat]];
  h.prism('ito-side-%d-%s-%s' % [k, if sign > 0 then 'up' else 'down', if z0 > 0 then 'omote' else 'ura'], 'ito', 'z', left + right, z0, z1);
local cap(sign) = [
  [sign * flat, -halfZ - ito], [sign * (flat + ito), -halfZ - ito], [sign * (halfY + ito), -halfZ + ito], [sign * (halfY + ito), halfZ - ito],
  [sign * (flat + ito), halfZ + ito], [sign * flat, halfZ + ito],
];
local knot(id, x, y, z, half) = h.box(id, 'ito', [x - half[0], y - half[1], z - half[2]], [x + half[0], y + half[1], z + half[2]]);
// A menuki lies under the ito across diamond k, its boss standing proud in the open diamond.
local menuki(id, k, sign) =
  local x = diamondAt(k), l = pitch * 0.7, t = halfTall * 0.5, bl = halfLong * 0.6, bt = halfTall * 0.45;
  local outline(a, b) = [[x - a, 0], [x - a * 0.6, -b], [x + a * 0.6, -b], [x + a, 0], [x + a * 0.6, b], [x - a * 0.6, b]];
  local span(z0, z1) = if sign > 0 then [z0, z1] else [-z1, -z0];
  local base = span(halfZ - ito, halfZ + ito / 2), boss = span(halfZ, halfZ + ito * 1.5);
  [
    h.prism(id, 'menuki', 'z', outline(l, t), base[0], base[1]),
    h.prism(id + '-boss', 'menuki', 'z', outline(bl, bt), boss[0], boss[1]),
  ];
local mekugiAt = diamonds - 1;
local tsubaPlate = tsubaThickness / 3;

local mounts = [
  h.prism('habaki', 'habaki', 'z', [at(0, -0.06), at(habaki, -0.06), at(habaki, 1.06), at(0, 1.06)], -kasane / 2 - ito, kasane / 2 + ito),
  h.prism('seppa-front', 'seppa', 'x', oval(halfY + 0.0035, halfZ + 0.0025), -seppa, 0),
  h.prism('tsuba', 'tsuba', 'x', oval(tsubaHeight / 2, tsubaWidth / 2), -seppa - tsubaThickness / 2 - tsubaPlate / 2, -seppa - tsubaThickness / 2 + tsubaPlate / 2),
  h.prism('seppa-back', 'seppa', 'x', oval(halfY + 0.0035, halfZ + 0.0025), fuchiEnd, tsubaBack),
  h.prism('fuchi', 'fitting', 'x', octagon(halfY + ito * 2, halfZ + ito * 2, 0.005), wrapFront, fuchiEnd),
  h.prism('same', 'same', 'x', octagon(halfY, halfZ, tsukaChamfer), wrapBack, wrapFront),
  h.prism('kashira', 'fitting', 'x', octagon(halfY + ito * 2, halfZ + ito * 2, 0.005), wrapBack - kashira + 0.004, wrapBack),
  h.prism('kashira-crown', 'fitting', 'x', octagon(halfY, halfZ, 0.005), wrapBack - kashira, wrapBack - kashira + 0.004),
] + [
  local a0 = 2 * std.pi * i / 32, a1 = 2 * std.pi * (i + 1) / 32, ry = tsubaHeight / 2, rz = tsubaWidth / 2;
  h.prism('mimi-%d' % i, 'tsuba', 'x', [
    [(ry - mimi) * std.cos(a0), (rz - mimi) * std.sin(a0)], [ry * std.cos(a0), rz * std.sin(a0)],
    [ry * std.cos(a1), rz * std.sin(a1)], [(ry - mimi) * std.cos(a1), (rz - mimi) * std.sin(a1)],
  ], tsubaBack, -seppa)
  for i in std.range(0, 31)
];
local wrap = menuki('menuki-omote', 6, 1) + menuki('menuki-ura', 3, -1) + [
  { id: 'mekugi', slot: 'mekugi', kind: 'turned', axis: 'z', profile: [[0, 0], [0, 0.003], [tsukaWidth + ito, 0.003], [tsukaWidth + ito, 0]], origin: [diamondAt(mekugiAt), 0, -halfZ - ito / 2] },
] + [
  sideIto(k, sign, side[0], side[1])
  for k in std.range(0, diamonds)
  for sign in [1, -1]
  for side in [[halfZ, halfZ + ito], [-halfZ - ito, -halfZ]]
] + [
  h.prism('ito-cap-%s' % s[0], 'ito', 'x', cap(s[1]), wrapBack, wrapFront)
  for s in [['spine', 1], ['edge', -1]]
] + [
  // The ito crosses and twists on the side faces between diamonds, and over the spine and edge above each diamond.
  knot('ito-cross-%d-%s' % [k, s[0]], diamondAt(k) - pitch / 2, 0, s[1] * (halfZ + ito), [crossing / 2, crossing / 2, ito])
  for k in std.range(1, diamonds - 1)
  for s in [['omote', 1], ['ura', -1]]
] + [
  knot('ito-twist-%d-%s' % [k, s[0]], diamondAt(k), s[1] * (halfY + ito * 1.5), 0, [crossing / 2, ito, halfZ * 0.4])
  for k in std.range(0, diamonds - 1)
  for s in [['spine', 1], ['edge', -1]]
] + [
  knot('kashira-ito-%s' % s[0], wrapBack - kashira / 2 + 0.002, s[1] * (halfY + ito * 2.5), 0, [kashira / 2 - 0.002, ito / 2, halfZ * 0.35])
  for s in [['spine', 1], ['edge', -1]]
];

local hamonTip = 'hamon-%d' % (last - 1);
local monouchi = 'hamon-%d' % std.floor(bodySteps * (nagasa - 0.17) / yokote);
local handAt(x) = [(x - wrapBack) / tsuka, 0.5, 0.5];
[
  // A katana 0.97 m long: a 0.70 m curved shinogi-zukuri blade with a wavy hamon, a brass habaki, an oval iron tsuba
  // between seppa, and a 0.26 m tsuka of ray skin under black silk ito with gold menuki, iron fuchi and kashira.
  h.compound('katana', 1.1, blade + mounts + wrap, {
    'shinogi-ji': 'steel-mirror',
    kissaki: 'steel-mirror',
    ji: 'steel-hardened',
    hamon: 'steel-bright',
    habaki: 'brass-polished',
    seppa: 'brass-polished',
    tsuba: 'iron-dull',
    fitting: 'iron-dull',
    same: 'wax-ivory',
    ito: 'satin-black',
    menuki: 'metal-gold',
    mekugi: 'wood-birch',
  }) + h.gripOn('katana', 'same') + {
    handling+: { fraction: handAt(wrapFront - leadingHand) },
    anchors: {
      strike: { part: 'katana', solid: hamonTip, fraction: [1, 1, 0.5] },
      edge: { part: 'katana', solid: monouchi, fraction: [0.5, 0, 0.5] },
      // The rear hand of the two-handed grip, named as the guns name their second hand.
      support: { part: 'katana', solid: 'same', fraction: handAt(wrapBack + rearHand) },
    },
    voxelGrain: 0.002,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'], setting: ['medieval'] } },
  },
]
