local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local wield = import 'models/measures/wield.libsonnet';

local grain = 0.002;

// Stations along x are measured from the blade-side face of the cross, so the blade's lengths read as a smith
// quotes them and the hilt runs negative.
local bladeLength = 1.27;
local pointLength = 0.11;
local baseWidth = 0.045;
local tipWidth = 0.03;
local ridgeThickness = 0.006;
// The sharpened blade starts a little inside the ricasso so no seam opens at the shoulder.
local shoulderOverlap = 0.01;

local ricasso = { length: 0.25, width: 0.036, thickness: 0.007 };
// The leather stops short of the cross and of the lugs, where a half-sword hand does not reach.
local wrap = { fromCross: 0.02, shortOfShoulder: 0.05, thickness: 0.0015 };

// A parierhaken: a flame-shaped lug swept towards the point, rooted across the ricasso's shoulder so it also hides
// the step up to the blade's full width. Its root, elbow and tip are placed from the shoulder along the blade and from
// the centreline across it, and it narrows from one to the next.
local lug = {
  reach: 0.045,
  rootBack: 0.012,
  rootOut: 0.008,
  elbowBack: 0.007,
  elbowShare: 0.6,
  tipForward: 0.006,
  widths: [0.046, 0.024, 0.004],
};

local cross = { thickness: 0.024, span: 0.45, blockHalfWidth: 0.028, blockHalfThickness: 0.014 };
local ring = { radius: 0.04, bar: 0.007, steps: 8 };

local gripLength = 0.39;
local collarLength = 0.008;
local swellLength = 0.012;
local pommelLength = 0.065;
local peenLength = 0.006;
// The grip is waisted toward both ends from its swell, and each metal band stands proud of the leather it bounds.
local radius = { collar: 0.0175, foreTop: 0.015, atSwell: 0.018, swell: 0.0205, aftEnd: 0.0135, ferrule: 0.016 };
// The leather bulges between its ends so it reads as stuffed, and a band's rims are eased so it reads as rounded.
local gripBelly = 0.001;
local bandRimShare = 0.9;

local crossMid = -cross.thickness / 2;
local gripTop = -cross.thickness;
local gripEnd = gripTop - gripLength;
local swellMid = (gripTop + gripEnd) / 2;
local pommelEnd = gripEnd - pommelLength;
local foreStart = swellMid + swellLength / 2;
local foreEnd = gripTop - collarLength;

// The two-hand wield seats the trailing hand on the grip point and the leading hand a set way toward the working end.
// The pair is centred on the fore grip so each palm keeps the same margin of leather before it meets a band.
local leadSeat = wield.twoHand.leadSeat;
local gripPoint = (foreStart + foreEnd - leadSeat) / 2;
local palmMargin = std.min(gripPoint - arm.palmWidth / 2 - foreStart, foreEnd - (gripPoint + leadSeat + arm.palmWidth / 2));
// A margin under a voxel could be drawn as the band, and a hand would then close on steel.
assert palmMargin >= grain : 'the fore grip leaves a palm %g m of leather, under a voxel' % palmMargin;

local bladeStart = ricasso.length - shoulderOverlap;
local taperEnd = bladeLength - pointLength;
local halfWidthAt(x) = baseWidth / 2 - (baseWidth - tipWidth) / 2 * (x - bladeStart) / (taperEnd - bladeStart);

// Compound prisms are constant sections, so the diamond section is stacked from plan outlines, each layer nearer the
// ridge narrower and thicker. A layer's point stops only a little short of the one below, because a forged point
// carries its ridge almost to the tip; shortening it by its width's share would leave the last of the blade a flat
// strip.
local sectionLayers = 3;
local ridgeRunout = 0.012;
local bladeLayer(i) =
  local k = 1 - i / sectionLayers, z = ridgeThickness / 2 * (i + 1) / sectionLayers;
  h.prism('blade-%d' % i, 'blade', 'z', [
    [bladeStart, -k * halfWidthAt(bladeStart)],
    [taperEnd, -k * halfWidthAt(taperEnd)],
    [bladeLength - i * ridgeRunout, 0],
    [taperEnd, k * halfWidthAt(taperEnd)],
    [bladeStart, k * halfWidthAt(bladeStart)],
  ], -z, z);

// The edge is marked on the taper, where a cut lands and the edge's line across the outer layer is known.
local edgeShare = 0.4;
local edgeAt = bladeStart + edgeShare * (bladeLength - bladeStart);
assert edgeAt <= taperEnd : 'the edge anchor at %g m lies on the point, past the taper' % edgeAt;
local edgeFraction = [edgeShare, 0.5 + halfWidthAt(edgeAt) / baseWidth, 0.5];

local lugPieces(name, side) =
  local reach = ricasso.width / 2 + lug.reach;
  h.bend('lug-' + name, 'blade', [
    [ricasso.length - lug.rootBack, side * lug.rootOut],
    [ricasso.length - lug.elbowBack, side * reach * lug.elbowShare],
    [ricasso.length + lug.tipForward, side * reach],
  ], lug.widths, -ridgeThickness / 2, ridgeThickness / 2);

// The cross is turned as one bar, so one quillon's radii from its knobbed terminal in to the middle are mirrored.
local quillonHalf = [
  [0, 0],
  [0.003, 0.0075],
  [0.01, 0.011],
  [0.018, 0.0085],
  [0.023, 0.005],
  [0.032, 0.0055],
  [cross.span / 2 - 0.03, 0.009],
  [cross.span / 2, 0.0095],
];
local quillonProfile = quillonHalf + [[cross.span - p[0], p[1]] for p in std.reverse(quillonHalf[:std.length(quillonHalf) - 1])];

// A side ring arches from quillon to quillon over one flat of the blade, guarding the hand's back.
local ringPieces(name, from) =
  h.crescent('ring-' + name, 'guard', ring.radius - ring.bar / 2, ring.radius + ring.bar / 2, from, from + 180, ring.steps,
             crossMid - ring.bar / 2, crossMid + ring.bar / 2, axis='x');

local gripHalf(id, x0, x1, r0, r1) =
  local l = x1 - x0;
  h.turned(id, 'grip', 'x', [[0, 0], [0, r0], [l / 2, (r0 + r1) / 2 + gripBelly], [l, r1], [l, 0]], [x0, 0, 0]);
local band(id, x0, x1, r) =
  local l = x1 - x0;
  h.turned(id, 'band', 'x', [[0, 0], [0, r * bandRimShare], [l / 2, r], [l, r * bandRimShare], [l, 0]], [x0, 0, 0]);

[
  // A Landsknecht two-handed greatsword: a diamond-section blade whose leather-wrapped ricasso ends in a pair of
  // parierhaken, a wide cross with knobbed quillons and two side rings, and a long two-hand grip under a faceted pear
  // pommel.
  h.compound('zweihander', 3.2,
    [bladeLayer(i) for i in std.range(0, sectionLayers - 1)]
    + [
      h.box('ricasso', 'blade', [crossMid, -ricasso.width / 2, -ricasso.thickness / 2], [ricasso.length, ricasso.width / 2, ricasso.thickness / 2]),
      h.box('ricasso-wrap', 'wrap',
            [wrap.fromCross, -ricasso.width / 2 - wrap.thickness, -ricasso.thickness / 2 - wrap.thickness],
            [ricasso.length - wrap.shortOfShoulder, ricasso.width / 2 + wrap.thickness, ricasso.thickness / 2 + wrap.thickness]),
    ]
    + lugPieces('a', 1) + lugPieces('b', -1)
    + [
      h.turned('quillons', 'guard', 'y', quillonProfile, [crossMid, -cross.span / 2, 0]),
      h.box('cross-block', 'guard', [-cross.thickness, -cross.blockHalfWidth, -cross.blockHalfThickness], [0, cross.blockHalfWidth, cross.blockHalfThickness]),
    ]
    + ringPieces('a', 0) + ringPieces('b', 180)
    + [
      band('grip-collar', gripTop - collarLength, gripTop, radius.collar),
      gripHalf('grip-fore', foreStart, foreEnd, radius.atSwell, radius.foreTop),
      band('grip-swell', swellMid - swellLength / 2, swellMid + swellLength / 2, radius.swell),
      gripHalf('grip-aft', gripEnd + collarLength, swellMid - swellLength / 2, radius.aftEnd, radius.atSwell),
      band('grip-ferrule', gripEnd, gripEnd + collarLength, radius.ferrule),
      // Eight sides, because Landsknecht pommels were filed to facets rather than left round.
      h.turned('pommel', 'guard', 'x', [[0, 0], [0, 0.013], [0.01, 0.023], [0.024, 0.0275], [0.04, 0.023], [0.058, 0.0135], [pommelLength, 0.0125], [pommelLength, 0]], [pommelEnd, 0, 0]) + { sides: 8 },
      h.turned('peen', 'guard', 'x', [[0, 0], [0, 0.004], [peenLength * 0.6, 0.006], [peenLength, 0.006], [peenLength, 0]], [pommelEnd - peenLength, 0, 0]),
    ],
    { blade: 'steel-bright', wrap: 'leather-brown', guard: 'steel-grey', band: 'steel-grey', grip: 'leather-black' })
  + h.gripOn('zweihander', 'grip-fore') + {
    // A tool's quarter roll would turn the edges sideways, and a blade threatens with its point, so it holds as the
    // other blades do: unrolled, its edges up and down, its point ahead.
    handling+: { fraction: [(gripPoint - foreStart) / (foreEnd - foreStart), 0.5, 0.5], hold: 'forward', roll: 0 },
    title: 'Zweihänder',
    voxelGrain: grain,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'], setting: ['medieval'] } },
    anchors: {
      local at(solid, fraction) = { part: 'zweihander', solid: solid, fraction: fraction },
      strike: at('blade-0', [1, 0.5, 0.5]),
      edge: at('blade-0', edgeFraction),
      // The wield class places both hands from the one grip point, so only the half-sword hand needs an anchor of its
      // own.
      ricasso: at('ricasso-wrap', [0.5, 0.5, 0.5]),
    },
  },
]
