local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local arm = import 'models/measures/arm.libsonnet';

local grain = 0.002;

// An Oakeshott type XII: the blade tapers evenly to an acute point and its fuller stops two-thirds to three-quarters of
// the way down. The measures are Albion's "Knight", a type XII Peter Johnsson drew from surviving swords (myArmoury's
// review); the fuller's run is the type's (Oakeshott, by myArmoury's type XII spotlight).
local overallLength = 0.968;
local massKg = 1.19;
local bladeLength = 0.797;
local baseWidth = 0.051;
local crossSpan = 0.165;
local gripLength = 0.108;
local fullerShare = 0.7;
// A fuller is about a third of the blade's width below the hilt and narrows with the blade.
local fullerWidth = 0.017;
local pommelDiameter = 0.048;

// Stations along x are measured from the blade-side face of the cross, so the blade's lengths read as a smith quotes
// them and the hilt runs negative.
local pointLength = 0.09;
local tipWidth = 0.028;
// The point's ogive is drawn through one shoulder, a share of the way along the point and of the tip's half-width.
local pointShoulder = { along: 0.5, across: 0.75 };
// How far the fuller's rounded end reaches past its run, toward the hilt.
local fullerNose = 0.012;

local cross = { thickness: 0.012, blockHalfWidth: 0.017, blockHalfThickness: 0.01 };
// A straight bar of octagonal section, thinning from the block to just short of the ends, which swell a little and are
// chamfered down to a flat end face.
local quillon = { waist: 0.0048, end: 0.0058, endLength: 0.01, endChamfer: 0.002, endFaceRadius: 0.0046 };
local wheel = {
  thickness: 0.026, rimThickness: 0.009, faceRadius: 0.015,
  bossRadius: 0.009, bossCrownRadius: 0.0072, bossProud: 0.002,
};
// The tang's end hammered over the pommel, spreading from its foot to its head.
local peen = { length: 0.003, radius: 0.004, footRadius: 0.0028 };
// The leather over the wooden core swells a little at its middle; a cord riser under it stands proud at each end.
local grip = { endRadius: 0.012, bellyRadius: 0.0135, riserRadius: 0.0145, riserLength: 0.006 };

local crossMid = -cross.thickness / 2;
local gripTop = -cross.thickness;
local gripEnd = gripTop - gripLength;
local wheelCentre = gripEnd - pommelDiameter / 2;
local pommelEnd = gripEnd - pommelDiameter;
assert std.abs(bladeLength - (pommelEnd - peen.length) - overallLength) < grain
       : 'the sword measures %g m overall, not the %g m of its reference' % [bladeLength - (pommelEnd - peen.length), overallLength];

// The one-hand wield centres the palm on the grip point, so it is the grip's middle, and each side keeps the same
// margin of leather before the cross and the pommel.
local palmMargin = (gripLength - arm.palmWidth) / 2;
// A margin under a voxel could be drawn as the cross or the pommel, and the hand would then close on steel.
assert palmMargin >= grain : 'the grip leaves a palm %g m of leather, under a voxel' % palmMargin;

// The blade runs into the cross so no seam opens at its shoulder.
local bladeStart = crossMid;
local taperEnd = bladeLength - pointLength;
local halfWidthAt(x) = baseWidth / 2 - (baseWidth - tipWidth) / 2 * (x - bladeStart) / (taperEnd - bladeStart);
local fullerEnd = fullerShare * bladeLength;
local fullerHalfAt(x) = fullerWidth / 2 * halfWidthAt(x) / halfWidthAt(bladeStart);

// Compound prisms are constant sections, so the lens section is stacked from plan outlines, each layer nearer the
// ridge narrower and thicker. A layer's point stops only a little short of the one below, because a forged point
// carries its ridge almost to the tip; shortening it by its width's share would leave the last of the blade a flat
// strip. Each layer stands one voxel prouder than the one below: the lattice is anchored on the blade's midplane, so a
// step finer than a grain falls into the same voxels as its neighbour and the fuller's walls vanish with it.
local sectionLayers = 2;
local ridgeRunout = 0.01;
local layerShare(i) = 1 - i / sectionLayers;
local layerHalfThickness(i) = (i + 1) * grain;
// A layer's outline from `from` to its tip, one side's edge then the other's.
local layerOutline(i, from) =
  local k = layerShare(i), half = k * tipWidth / 2;
  local side(s) = [
    [from, s * k * halfWidthAt(from)],
    [taperEnd, s * half],
    [taperEnd + pointShoulder.along * pointLength, s * half * pointShoulder.across],
  ];
  side(-1) + [[bladeLength - i * ridgeRunout, 0]] + std.reverse(side(1));
local layer(id, i, outline) = h.prism(id, 'blade', 'z', outline, -layerHalfThickness(i), layerHalfThickness(i));

// The fuller is a groove down the flats, which a convex prism cannot carve, so the layers above the fuller's floor
// stand either side of it along its run and close over it only past its rounded end. A layer no wider than the
// fuller has nothing beside it, and lies only past it. The fuller narrows with the blade, so a layer's land beside it
// is the same share of the blade all along the run.
local fullerLayers = 1;
local floorLayer = sectionLayers - fullerLayers - 1;
local landShare(i) = layerShare(i) - fullerWidth / baseWidth;
local fullerSide(i, s) =
  local k = layerShare(i), land = landShare(i) * halfWidthAt(fullerEnd);
  // A land under a voxel wide would be drawn into the fuller or lost, and the groove's wall with it.
  assert land >= grain : 'layer %d leaves a land of %g m beside the fuller, under a voxel' % [i, land];
  layer('blade-%d-%s' % [i, if s > 0 then 'a' else 'b'], i, [
    [bladeStart, s * fullerHalfAt(bladeStart)],
    [bladeStart, s * k * halfWidthAt(bladeStart)],
    [fullerEnd, s * k * halfWidthAt(fullerEnd)],
    [fullerEnd, s * fullerHalfAt(fullerEnd)],
  ]);
local noseSteps = 4;
local fullerNosePiece(i) =
  local f = fullerHalfAt(fullerEnd);
  layer('blade-%d-nose' % i, i, [
    local t = std.pi * j / noseSteps;
    [fullerEnd - fullerNose * std.sin(t), -f * std.cos(t)]
    for j in std.range(0, noseSteps)
  ]);
local bladePieces(i) =
  if i <= floorLayer then [layer('blade-%d' % i, i, layerOutline(i, bladeStart))]
  else (if landShare(i) > 0 then [fullerSide(i, 1), fullerSide(i, -1)] else [])
       + [layer('blade-%d-tail' % i, i, layerOutline(i, fullerEnd)), fullerNosePiece(i)];

// The edge is marked on the taper, where a cut lands and the edge's line across the outer layer is known.
local edgeShare = 0.6;
local edgeAt = bladeStart + edgeShare * (bladeLength - bladeStart);
assert edgeAt <= taperEnd : 'the edge anchor at %g m lies on the point, past the taper' % edgeAt;
local edgeFraction = [edgeShare, 0.5 + halfWidthAt(edgeAt) / baseWidth, 0.5];

// The cross is turned as one bar, so one quillon's radii from its end in to the block are mirrored. At the block the
// bar is as thick as the cross.
local quillonHalf = [
  [0, 0],
  [0, quillon.endFaceRadius],
  [quillon.endChamfer, quillon.end],
  [quillon.endLength, quillon.waist],
  [crossSpan / 2 - cross.blockHalfWidth, cross.thickness / 2],
];
local quillonProfile = quillonHalf + [[crossSpan - p[0], p[1]] for p in std.reverse(quillonHalf[:std.length(quillonHalf) - 1])];

local gripCore = gripLength - 2 * grip.riserLength;
local riser(id, x0) =
  local l = grip.riserLength, r = grip.riserRadius;
  h.turned(id, 'grip', 'x', [[0, 0], [0, grip.endRadius], [l / 2, r], [l, grip.endRadius], [l, 0]], [x0, 0, 0]);

// A type I wheel: a thick disc whose rim is bevelled down to flat faces, each with a low boss over the tang's line.
local wheelProfile = [
  [0, 0],
  [0, wheel.faceRadius],
  [(wheel.thickness - wheel.rimThickness) / 2, pommelDiameter / 2],
  [(wheel.thickness + wheel.rimThickness) / 2, pommelDiameter / 2],
  [wheel.thickness, wheel.faceRadius],
  [wheel.thickness, 0],
];
// A boss on the face toward `side` along z, eased from its foot on the face to its crown.
local boss(id, side) =
  local foot = wheel.bossRadius, crown = wheel.bossCrownRadius;
  local radii = if side > 0 then [foot, crown] else [crown, foot];
  h.turned(id, 'guard', 'z', [[0, 0], [0, radii[0]], [wheel.bossProud, radii[1]], [wheel.bossProud, 0]],
           [wheelCentre, 0, if side > 0 then wheel.thickness / 2 else -wheel.thickness / 2 - wheel.bossProud]);

[
  // A knightly arming sword of the thirteenth century: a lens-section blade tapering evenly to its point with a fuller
  // down its first two-thirds, a straight cross, a leather grip over cord risers and a wheel pommel.
  h.compound('arming_sword', massKg,
    std.flattenArrays([bladePieces(i) for i in std.range(0, sectionLayers - 1)])
    + [
      h.turned('cross', 'guard', 'y', quillonProfile, [crossMid, -crossSpan / 2, 0]) + { sides: 8 },
      h.box('cross-block', 'guard', [gripTop, -cross.blockHalfWidth, -cross.blockHalfThickness], [0, cross.blockHalfWidth, cross.blockHalfThickness]),
      riser('riser-cross', gripTop - grip.riserLength),
      h.turned('grip', 'grip', 'x',
               [[0, 0], [0, grip.endRadius], [gripCore / 2, grip.bellyRadius], [gripCore, grip.endRadius], [gripCore, 0]],
               [gripEnd + grip.riserLength, 0, 0]),
      riser('riser-pommel', gripEnd),
      h.turned('pommel', 'guard', 'z', wheelProfile, [wheelCentre, 0, -wheel.thickness / 2]),
      boss('pommel-boss-a', 1),
      boss('pommel-boss-b', -1),
      h.turned('peen', 'guard', 'x', [[0, 0], [0, peen.footRadius], [peen.length, peen.radius], [peen.length, 0]], [pommelEnd - peen.length, 0, 0]),
    ],
    { blade: 'steel-bright', guard: 'steel-grey', grip: 'leather-brown' })
  + h.gripOn('arming_sword', 'grip') + {
    // A tool's quarter roll would turn the edges sideways, and a blade threatens with its point, so it holds as the
    // other blades do: unrolled, its edges up and down, its point ahead.
    // The risers stand alike at both ends, so the middle of the leather between them is the grip's.
    handling+: { fraction: [0.5, 0.5, 0.5], hold: 'forward', roll: 0 },
    title: 'Arming sword',
    voxelGrain: grain,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'], setting: ['medieval'] }, keywords: ['sword', 'melee'] },
    anchors: {
      local at(solid, fraction) = { part: 'arming_sword', solid: solid, fraction: fraction },
      strike: at('blade-0', [1, 0.5, 0.5]),
      edge: at('blade-0', edgeFraction),
    },
  },
]
