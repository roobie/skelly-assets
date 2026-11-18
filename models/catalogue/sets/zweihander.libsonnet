local h = import 'packages/thing-authoring-tool/compound.libsonnet';

// Stations along x are measured from the blade-side face of the cross, so the blade's lengths read as a smith
// quotes them and the hilt runs negative.
local bladeLength = 1.27;
local ricassoLength = 0.25;
local pointLength = 0.11;
local baseWidth = 0.045;
local tipWidth = 0.03;
local ridgeThickness = 0.006;
local ricassoWidth = 0.036;
local ricassoThickness = 0.007;
local lugReach = 0.045;

local crossThickness = 0.024;
local crossSpan = 0.45;
local ringRadius = 0.04;
local ringBar = 0.007;

local gripLength = 0.39;
local collarLength = 0.008;
local swellLength = 0.012;
local pommelLength = 0.065;
local peenLength = 0.006;

local crossMid = -crossThickness / 2;
local gripTop = -crossThickness;
local gripEnd = gripTop - gripLength;
local swellMid = (gripTop + gripEnd) / 2;
local pommelEnd = gripEnd - pommelLength;

// The two-hand wield seats the trailing hand on the grip point and the leading hand a set way toward the working end,
// so the grip point sits that far, and half a palm more, behind the cross's collar: the leading hand then closes just
// under the cross and both stay on the leather.
local wield = (import 'models/poses/wields/twohand.libsonnet').weapon;
local palm = 0.09;
local foreStart = swellMid + swellLength / 2;
local foreEnd = gripTop - collarLength;
local gripPoint = foreEnd - palm / 2 - wield.hands[wield.lead].seat;

// The sharpened blade starts a little inside the ricasso so no seam opens at the shoulder.
local bladeStart = ricassoLength - 0.01;
local taperEnd = bladeLength - pointLength;

// Compound prisms are constant sections, so the diamond section is stacked from plan outlines: each layer nearer the
// ridge is narrower and thicker, and its point is shorter in the same share so the bevels stay parallel to the edge.
local sectionLayers = 3;
local bladeLayer(i) =
  local k = 1 - i / sectionLayers, z = ridgeThickness / 2 * (i + 1) / sectionLayers;
  h.prism('blade-%d' % i, 'blade', 'z', [
    [bladeStart, -k * baseWidth / 2],
    [taperEnd, -k * tipWidth / 2],
    [taperEnd + k * pointLength, 0],
    [taperEnd, k * tipWidth / 2],
    [bladeStart, k * baseWidth / 2],
  ], -z, z);

// Where the cutting edge sits across the outermost layer's bounds at a share `fx` of its length.
local edgeFraction(fx) =
  local x = bladeStart + fx * (bladeLength - bladeStart);
  local halfWidth = baseWidth / 2 - (baseWidth - tipWidth) / 2 * (x - bladeStart) / (taperEnd - bladeStart);
  [fx, 0.5 + halfWidth / baseWidth, 0.5];

// A parierhaken: a flame-shaped lug swept towards the point, rooted across the ricasso's shoulder so it also hides
// the step up to the blade's full width.
local lug(name, side) =
  local reach = ricassoWidth / 2 + lugReach;
  h.bend('lug-' + name, 'blade', [
    [ricassoLength - 0.012, side * 0.008],
    [ricassoLength - 0.007, side * reach * 0.6],
    [ricassoLength + 0.006, side * reach],
  ], [0.046, 0.024, 0.004], -ridgeThickness / 2, ridgeThickness / 2);

// One quillon's radii from its knobbed terminal in to the middle; the cross is turned as one bar from both.
local quillonHalf = [
  [0, 0],
  [0.003, 0.0075],
  [0.01, 0.011],
  [0.018, 0.0085],
  [0.023, 0.005],
  [0.032, 0.0055],
  [crossSpan / 2 - 0.03, 0.009],
  [crossSpan / 2, 0.0095],
];
local quillonProfile = quillonHalf + [[crossSpan - p[0], p[1]] for p in std.reverse(quillonHalf[:std.length(quillonHalf) - 1])];

// A side ring arched from quillon to quillon over one flat of the blade. Prisms must be convex, so the arc is cut
// into quads.
local ring(name, side, steps=8) =
  local pt(r, i) = local a = std.pi * i / steps; [r * std.cos(a), side * r * std.sin(a)];
  local inner = ringRadius - ringBar / 2, outer = ringRadius + ringBar / 2;
  [
    h.prism('ring-%s-%d' % [name, i], 'guard', 'x', [pt(outer, i), pt(outer, i + 1), pt(inner, i + 1), pt(inner, i)], crossMid - ringBar / 2, crossMid + ringBar / 2)
    for i in std.range(0, steps - 1)
  ];

// Half of the grip, swelling from `r0` at x0 to `r1` at x1 with a slight belly so the leather reads as stuffed.
local gripHalf(id, x0, x1, r0, r1) =
  local l = x1 - x0;
  h.turned(id, 'grip', 'x', [[0, 0], [0, r0], [l * 0.5, (r0 + r1) / 2 + 0.001], [l, r1], [l, 0]], [x0, 0, 0]);
local band(id, x0, x1, r) = h.turned(id, 'band', 'x', [[0, 0], [0, r * 0.9], [(x1 - x0) / 2, r], [x1 - x0, r * 0.9], [x1 - x0, 0]], [x0, 0, 0]);

[
  // A Landsknecht two-handed greatsword 1.76 m long: a 1.27 m diamond-section blade whose leather-wrapped ricasso
  // ends in a pair of parierhaken, a 0.45 m cross with knobbed quillons and two side rings, and a long two-hand grip
  // under a faceted pear pommel.
  h.compound('zweihander', 3.2,
    [bladeLayer(i) for i in std.range(0, sectionLayers - 1)]
    + [
      h.box('ricasso', 'blade', [-crossThickness / 2, -ricassoWidth / 2, -ricassoThickness / 2], [ricassoLength, ricassoWidth / 2, ricassoThickness / 2]),
      h.box('ricasso-wrap', 'wrap', [0.02, -ricassoWidth / 2 - 0.0015, -ricassoThickness / 2 - 0.0015], [ricassoLength - 0.05, ricassoWidth / 2 + 0.0015, ricassoThickness / 2 + 0.0015]),
    ]
    + lug('a', 1) + lug('b', -1)
    + [
      h.turned('quillons', 'guard', 'y', quillonProfile, [crossMid, -crossSpan / 2, 0]),
      h.box('cross-block', 'guard', [-crossThickness, -0.028, -0.014], [0, 0.028, 0.014]),
    ]
    + ring('a', 1) + ring('b', -1)
    + [
      band('grip-collar', gripTop - collarLength, gripTop, 0.0175),
      gripHalf('grip-fore', foreStart, foreEnd, 0.018, 0.015),
      band('grip-swell', swellMid - swellLength / 2, swellMid + swellLength / 2, 0.0205),
      gripHalf('grip-aft', gripEnd + collarLength, swellMid - swellLength / 2, 0.0135, 0.018),
      band('grip-ferrule', gripEnd, gripEnd + collarLength, 0.016),
      // Eight sides, because Landsknecht pommels were filed to facets rather than left round.
      h.turned('pommel', 'guard', 'x', [[0, 0], [0, 0.013], [0.01, 0.023], [0.024, 0.0275], [0.04, 0.023], [0.058, 0.0135], [pommelLength, 0.0125], [pommelLength, 0]], [pommelEnd, 0, 0]) + { sides: 8 },
      h.turned('peen', 'guard', 'x', [[0, 0], [0, 0.004], [peenLength * 0.6, 0.006], [peenLength, 0.006], [peenLength, 0]], [pommelEnd - peenLength, 0, 0]),
    ],
    { blade: 'steel-bright', wrap: 'leather-brown', guard: 'steel-grey', band: 'steel-grey', grip: 'leather-black' })
  // The wield class places both hands from the one grip point, so only the half-sword hand needs an anchor of its own.
  + h.gripOn('zweihander', 'grip-fore') + {
    handling+: { fraction: [(gripPoint - foreStart) / (foreEnd - foreStart), 0.5, 0.5] },
    title: 'Zweihander',
    voxelGrain: 0.002,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'], setting: ['medieval'] } },
    anchors: {
      local at(solid, fraction) = { part: 'zweihander', solid: solid, fraction: fraction },
      strike: at('blade-0', [1, 0.5, 0.5]),
      edge: at('blade-0', edgeFraction(0.4)),
      ricasso: at('ricasso-wrap', [0.5, 0.5, 0.5]),    },
  },
]
