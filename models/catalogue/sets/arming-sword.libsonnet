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
// How far back from the fuller's end its rounded tip begins, where the groove's walls start to close.
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
// The wooden core is split around the flat tang and bound in leather, so its section is an oval, broad across the
// edges and narrow across the flats, which tells the hand where the edge is. A cord riser under the leather stands a
// voxel proud at each end. A belly swelling under a voxel would only step, so the grip runs straight.
local grip = { halfWidth: 0.014, halfThickness: 0.011, riserProud: 0.002, riserLength: 0.006 };

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

// Compound prisms are constant sections, so the lens is stacked from two plan outlines: the bevels, the whole blade's
// width at its edges' thickness, and the flats over them, a share of the width at the ridge's. The fuller is the
// floor of bevel steel left between the flats down its run.
// Each side of the midplane, the flats stand one step proud of the bevels and the bevels one step proud of the
// midplane. A step finer than a grain falls into its neighbour's voxels and the fuller's walls vanish with it, so at
// a 2 mm grain the ridge is 8 mm, though the Knight's is 4.9.
local ridgeThickness = 0.008;
local sectionStep = ridgeThickness / 4;
assert sectionStep >= grain && std.abs(sectionStep / grain - std.round(sectionStep / grain)) < 1e-6
       : 'the section steps %g m, not a whole number of %g m voxels' % [sectionStep, grain];
// Broad flats leave lands either side of the fuller wide enough to read as a groove, not as ribs either side of one.
local flatsShare = 0.7;
local bevels(id, outline) = h.prism(id, 'blade', 'z', outline, -sectionStep, sectionStep);
local flats(id, outline) = h.prism(id, 'blade', 'z', outline, -2 * sectionStep, 2 * sectionStep);
// The blade's plan, one edge then the other, from the cross through the end of the taper and the point's shoulder.
local bevelOutline =
  local side(s) = [
    [bladeStart, s * halfWidthAt(bladeStart)],
    [taperEnd, s * tipWidth / 2],
    [taperEnd + pointShoulder.along * pointLength, s * tipWidth / 2 * pointShoulder.across],
  ];
  side(-1) + [[bladeLength, 0]] + std.reverse(side(1));
// A blade thins toward its point as well as narrowing, so the flats close to their own point from the end of the
// taper, and the last of the point is bevels alone. They reach most of the way into it, so a ridge still runs down
// the point rather than the blade ending in a flat strip.
local ridgeReach = 0.75;
local flatsOutline(from) =
  local side(s) = [[from, s * flatsShare * halfWidthAt(from)], [taperEnd, s * flatsShare * tipWidth / 2]];
  side(-1) + [[taperEnd + ridgeReach * pointLength, 0]] + std.reverse(side(1));

// The fuller is a groove down the flats, which a convex prism cannot carve, so the flats stand either side of it
// along its run and close over it only past its end. The fuller narrows with the blade until its tip, where its walls
// hold their width and close in a U whose middle reaches furthest toward the point.
local noseStart = fullerEnd - fullerNose;
local noseHalf = fullerHalfAt(noseStart);
local land(s) =
  local width = flatsShare * halfWidthAt(fullerEnd) - noseHalf;
  // A land under a voxel wide would be drawn into the fuller or lost, and the groove's wall with it.
  assert width >= grain : 'the flats leave a land of %g m beside the fuller, under a voxel' % width;
  flats('blade-land-%s' % (if s > 0 then 'a' else 'b'), [
    [bladeStart, s * fullerHalfAt(bladeStart)],
    [bladeStart, s * flatsShare * halfWidthAt(bladeStart)],
    [fullerEnd, s * flatsShare * halfWidthAt(fullerEnd)],
    [fullerEnd, s * noseHalf],
    [noseStart, s * noseHalf],
  ]);
// The flats between the U and the fuller's end, one strip per step of the arc, each running from the arc to the end
// so it is convex. The strips either side of the U's middle meet the end there and are triangles.
local noseSteps = 4;
local arc(j) = local t = std.pi * j / noseSteps; [noseStart + fullerNose * std.sin(t), -noseHalf * std.cos(t)];
local noseStrip(j) =
  local corners = [arc(j), arc(j + 1), [fullerEnd, arc(j + 1)[1]], [fullerEnd, arc(j)[1]]];
  local distinct = [
    corners[i]
    for i in std.range(0, 3)
    if std.abs(corners[i][0] - corners[(i + 1) % 4][0]) + std.abs(corners[i][1] - corners[(i + 1) % 4][1]) > 1e-9
  ];
  flats('blade-nose-%d' % j, distinct);
local bladePieces = [
  bevels('blade', bevelOutline),
  land(1),
  land(-1),
  flats('blade-tail', flatsOutline(fullerEnd)),
] + [noseStrip(j) for j in std.range(0, noseSteps - 1)];

// The edge is marked on the taper, where a cut lands and the edge's line across the bevels is known.
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

// An oval about the grip's line, its points [y, z] as a prism along x takes them.
local ovalSteps = 16;
local oval(halfWidth, halfThickness) = [
  local t = 2 * std.pi * j / ovalSteps;
  [halfWidth * std.cos(t), halfThickness * std.sin(t)]
  for j in std.range(0, ovalSteps - 1)
];
local gripSection(id, x0, x1, proud) =
  h.prism(id, 'grip', 'x', oval(grip.halfWidth + proud, grip.halfThickness + proud), x0, x1);
local riser(id, x0) = gripSection(id, x0, x0 + grip.riserLength, grip.riserProud);

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
    bladePieces + [
      h.turned('cross', 'guard', 'y', quillonProfile, [crossMid, -crossSpan / 2, 0]) + { sides: 8 },
      h.box('cross-block', 'guard', [gripTop, -cross.blockHalfWidth, -cross.blockHalfThickness], [0, cross.blockHalfWidth, cross.blockHalfThickness]),
      riser('riser-cross', gripTop - grip.riserLength),
      gripSection('grip', gripEnd + grip.riserLength, gripTop - grip.riserLength, 0),
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
      strike: at('blade', [1, 0.5, 0.5]),
      edge: at('blade', edgeFraction),
    },
  },
]
