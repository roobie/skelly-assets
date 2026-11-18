local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local wield = import 'models/measures/wield.libsonnet';

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
// The cutting part of the blade, measured back from the point.
local monouchiFromTip = 0.17;
local habaki = 0.03;
local habakiWall = 0.002;
// Share of the blade's width the habaki wraps past the mune and past the edge.
local habakiOverhang = 0.06;
local seppa = 0.002;
// The seppa stand proud of the fuchi all round so the tsuba seats on them and not on the fittings.
local seppaHeight = 0.039;
local seppaWidth = 0.029;
local tsubaThickness = 0.006;
// The tsuba's plate is thinner than its rim and its seppa-dai, so it reads as a forged guard and not a slab.
local tsubaPlate = tsubaThickness / 3;
local seppaDai = 0.003;
local tsubaHeight = 0.077;
local tsubaWidth = 0.072;
local mimi = 0.004;
local fuchi = 0.012;
local tsuka = 0.236;
local kashira = 0.014;
// The kashira's crowned end, narrower than its body so the ito knotted over it has a shoulder to sit on.
local kashiraCrown = 0.004;
local fittingChamfer = 0.005;
// The tsuka is taller spine to edge than across, so the hands feel which way the edge faces.
local tsukaHeight = 0.032;
local tsukaWidth = 0.024;
local tsukaChamfer = 0.003;
local ito = 0.002;
local diamonds = 10;
// Width of the ito where two turns cross between diamonds.
local crossing = 0.005;
// The menuki sit under the palms, so they are staggered between the faces, each under its own diamond.
local omoteMenuki = 6;
local uraMenuki = 3;
local mekugiRadius = 0.003;
local grain = 0.002;
// The two-hand wield seats the trailing hand on the grip point and the leading hand a set way toward the blade. The
// pair is centred on the tsuka so each palm keeps the same margin of wrap before it meets the fuchi or kashira.
local leadSeat = wield.twoHand.leadSeat;
local rearHand = (tsuka - leadSeat) / 2;
local palmMargin = rearHand - arm.palmWidth / 2;
assert palmMargin >= grain : 'the tsuka leaves a palm %g m of wrap, under a voxel' % palmMargin;
local ovalSteps = 32;

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
// The body station at or before s along the mune.
local stationAt(s) = std.floor(bodySteps * s / yokote);
// One band of the blade between two lines across its width, thickest bands on the mune side so the shinogi shows as a
// step. Prisms must be convex, so each band is a run of quads, closing in a triangle at the point.
local band(slot, from, to, thick, i) =
  local a = stations[i], b = stations[i + 1];
  h.prism('%s-%d' % [slot, i], slot, 'z',
          if i + 1 == last then [at(a, from(a)), at(b, 0), at(a, to(a))]
          else [at(a, from(a)), at(b, from(b)), at(b, to(b)), at(a, to(a))],
          -thick / 2, thick / 2);
local share(k) = function(s) k;
local blade = std.flattenArrays([
  // Past the yokote the shinogi runs out, so the back band thins to the ji's thickness.
  local back = if stations[i] < yokote then ['shinogi-ji', kasane] else ['kissaki', jiKasane];
  [
    band(back[0], share(0), share(shinogi), back[1], i),
    band('ji', share(shinogi), hamonAt, jiKasane, i),
    band('hamon', hamonAt, share(1), haKasane, i),
  ]
  for i in std.range(0, last - 1)
]);

local oval(halfY, halfZ) = [
  [halfY * std.cos(2 * std.pi * i / ovalSteps), halfZ * std.sin(2 * std.pi * i / ovalSteps)]
  for i in std.range(0, ovalSteps - 1)
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
local kashiraBody = kashira - kashiraCrown;
local tsubaMiddle = -seppa - tsubaThickness / 2;

local mounts = [
  h.prism('habaki', 'habaki', 'z', [at(0, -habakiOverhang), at(habaki, -habakiOverhang), at(habaki, 1 + habakiOverhang), at(0, 1 + habakiOverhang)],
          -kasane / 2 - habakiWall, kasane / 2 + habakiWall),
  h.prism('seppa-front', 'seppa', 'x', oval(seppaHeight / 2, seppaWidth / 2), -seppa, 0),
  h.prism('tsuba', 'tsuba', 'x', oval(tsubaHeight / 2, tsubaWidth / 2), tsubaMiddle - tsubaPlate / 2, tsubaMiddle + tsubaPlate / 2),
  h.prism('seppa-dai', 'tsuba', 'x', oval(seppaHeight / 2 + seppaDai, seppaWidth / 2 + seppaDai), tsubaBack, -seppa),
  h.prism('seppa-back', 'seppa', 'x', oval(seppaHeight / 2, seppaWidth / 2), fuchiEnd, tsubaBack),
  h.prism('fuchi', 'fitting', 'x', octagon(halfY + ito * 2, halfZ + ito * 2, fittingChamfer), wrapFront, fuchiEnd),
  h.prism('same', 'same', 'x', octagon(halfY, halfZ, tsukaChamfer), wrapBack, wrapFront),
  h.prism('kashira', 'fitting', 'x', octagon(halfY + ito * 2, halfZ + ito * 2, fittingChamfer), wrapBack - kashiraBody, wrapBack),
  h.prism('kashira-crown', 'fitting', 'x', octagon(halfY, halfZ, fittingChamfer), wrapBack - kashira, wrapBack - kashiraBody),
] + [
  local a0 = 2 * std.pi * i / ovalSteps, a1 = 2 * std.pi * (i + 1) / ovalSteps, ry = tsubaHeight / 2, rz = tsubaWidth / 2;
  h.prism('mimi-%d' % i, 'tsuba', 'x', [
    [(ry - mimi) * std.cos(a0), (rz - mimi) * std.sin(a0)], [ry * std.cos(a0), rz * std.sin(a0)],
    [ry * std.cos(a1), rz * std.sin(a1)], [(ry - mimi) * std.cos(a1), (rz - mimi) * std.sin(a1)],
  ], tsubaBack, -seppa)
  for i in std.range(0, ovalSteps - 1)
];
local wrap = menuki('menuki-omote', omoteMenuki, 1) + menuki('menuki-ura', uraMenuki, -1) + [
  h.turned('mekugi', 'mekugi', 'z', [[0, 0], [0, mekugiRadius], [tsukaWidth + ito, mekugiRadius], [tsukaWidth + ito, 0]],
           [diamondAt(mekugiAt), 0, -halfZ - ito / 2]),
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
  knot('kashira-ito-%s' % s[0], wrapBack - kashiraBody / 2, s[1] * (halfY + ito * 2.5), 0, [kashiraBody / 2, ito / 2, halfZ * 0.35])
  for s in [['spine', 1], ['edge', -1]]
];

local hamonTip = 'hamon-%d' % (last - 1);
local monouchi = 'hamon-%d' % stationAt(nagasa - monouchiFromTip);
[
  // A katana: a curved shinogi-zukuri blade with a wavy hamon, mounted with a habaki, an oval iron tsuba between seppa,
  // and a two-handed tsuka of ray skin under black silk ito with gold menuki.
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
  }) + { title: 'Katana' } + h.gripOn('katana', 'same') + {
    // Held point ahead with the edge down, as the other blades are: gripOn's raised hold and quarter roll suit a tool
    // and would turn the edge to one side.
    handling+: { fraction: [rearHand / tsuka, 0.5, 0.5], hold: 'forward', roll: 0 },
    anchors: {
      strike: { part: 'katana', solid: hamonTip, fraction: [1, 1, 0.5] },
      edge: { part: 'katana', solid: monouchi, fraction: [0.5, 0, 0.5] },
    },
    voxelGrain: grain,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'], setting: ['medieval'] } },
  },
]
