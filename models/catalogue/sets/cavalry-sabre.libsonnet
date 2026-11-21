local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local arm = import 'models/measures/arm.libsonnet';

local grain = 0.002;

// A US Model 1860 light cavalry sabre, the trooper's sword of the 1850s-60s cavalry, copied from the French light
// cavalry pattern of 1822. Its blade, mass and hilt length are a Mansfield & Lamb example's (34 1/2 in by 1 in, a wide
// fuller 26 1/2 in long), with the pattern's 2 lb 4 oz and an Ames example's 40 3/4 in overall less its 35 in blade
// (International Military Antiques' listings; Wikipedia, "Model 1860 Light Cavalry Saber"). The listings give no
// curvature, so the sagitta is the 38 mm a dealer measured on an 1822 blade, eased a little as the 1860 is the less
// curved. Its narrow back fuller, an eighth of an inch, is under two voxels and left out.
local bladeLength = 0.876;
local massKg = 1.02;
local hiltLength = 0.146;
local baseWidth = 0.0254;
local fullerLength = 0.673;
local sagitta = 0.035;
// The back rises as the cube of the way along, so the blade leaves the hilt nearly straight and bends most toward the
// point, as a cutting sabre does, rather than in the katana's even arc.
local curvePower = 3;
// The blade narrows to this just before the point, where the edge sweeps up to it.
local tipWidth = 0.019;
local pointLength = 0.06;
// How far below the back the point sits, the false edge's drop into it.
local tipDrop = 0.007;
// The back is sharpened this far from the point: the false edge.
local falseEdgeFromTip = 0.2;

// The section's bands across the width, as shares from the back to the edge: the rounded back, the broad fuller, the
// body between the fuller and the edge's bevel, and the bevel. Each band's half thickness is a whole number of voxels,
// so the fuller's floor stands a step below the lands either side of it, and the false edge a step below the back.
local fullerBack = 0.15;
local fullerFront = 0.6;
local bevelShare = 0.75;
local falseEdgeShare = 0.25;
local thick = { back: 4 * grain, fuller: 2 * grain, body: 4 * grain, edge: 2 * grain, falseEdge: 2 * grain };

// The hilt: a brass guard plate at the blade's shoulder, a grip canted toward the edge so the point lines up with the
// forearm in the thrust, a brass pommel cap with a backstrap down the grip's back, a knuckle bow from the plate to the
// cap and two branches sweeping out from the bow to the plate's outer side, the three bars of the pattern's guard.
local plateThickness = 0.005;
local capLength = 0.024;
local gripLength = hiltLength - plateThickness - capLength;
local gripCantDeg = 7;
// The grip is an oval of leather over wood, taller spine to edge than across, bound in twisted brass wire laid in its
// grooves so the wire's turns stand one voxel proud as ridges.
local grip = { halfHeight: 0.015, halfWidth: 0.012, chamfer: 0.006 };
local wire = { pitch: 0.008, width: 0.0025, proud: grain, slant: 0.004 };
local backstrap = { thickness: 0.003, halfWidth: 0.006 };
local cap = { proud: 0.002, crown: 0.4 };
// The plate's outline across the blade, [y, z]: narrow on the spine side where the quillon leaves it and broad on the
// edge side and outward (+z), where the bow and the branches spring from it.
local plateOutline = [[0.016, -0.009], [0.016, 0.009], [-0.012, 0.026], [-0.05, 0.024], [-0.058, 0.008], [-0.058, -0.007], [-0.046, -0.011]];
// The bow's line in the hilt's frame, [along the grip from the plate, out from its axis toward the spine], and its bar's
// width in its plane and thickness across it. It stands far enough off the grip for a closed hand inside it.
local bow = {
  line: [[0, -0.05], [0.012, -0.058], [0.04, -0.062], [0.075, -0.058], [0.1, -0.046], [0.114, -0.03], [0.118, -0.017]],
  width: 0.006,
  thickness: 0.008,
};
// Each branch from the plate's outer side, out round the outside of the hand to the bow, as [along, out, across] points
// in the hilt's frame.
local branches = [
  [[0.002, -0.016, 0.022], [0.018, -0.03, 0.034], [0.038, -0.048, 0.024], [0.05, -0.058, 0.004]],
  [[0.002, -0.036, 0.022], [0.03, -0.046, 0.032], [0.062, -0.056, 0.02], [0.08, -0.057, 0.003]],
];
local branchSize = { width: 0.005, thickness: 0.005 };
// The rear quillon curls back from the plate's spine side toward the hand, ending in a ball, as [x, y] points.
local quillon = { line: [[-0.0025, 0.012], [-0.006, 0.024], [-0.014, 0.031], [-0.024, 0.034]], width: 0.005, thickness: 0.008, finial: 0.004 };

// The one-hand wield centres the palm on the grip, and each side keeps the same margin of wire before the plate and
// the cap.
local palmMargin = (gripLength - arm.palmWidth) / 2;
assert palmMargin >= grain : 'the grip leaves a palm %g m of wire, under a voxel' % palmMargin;
assert bladeLength - fullerLength > falseEdgeFromTip : 'the fuller runs into the false edge';

// ---- the blade ----

// Stations along x from the plate's blade-side face. The back's rise is set so its greatest depth below the chord from
// the shoulder to the point is the sagitta.
local peak = std.pow(1 / curvePower, 1 / (curvePower - 1));
local rise = sagitta / (peak - std.pow(peak, curvePower));
local backY(x) = baseWidth / 2 + rise * std.pow(x / bladeLength, curvePower);
local slope(x) = rise * curvePower * std.pow(x / bladeLength, curvePower - 1) / bladeLength;
// The unit normal from the back into the blade, toward the edge.
local inward(x) = local s = slope(x), n = std.sqrt(1 + s * s); [s / n, -1 / n];
local pointStart = bladeLength - pointLength;
local falseEdgeStart = bladeLength - falseEdgeFromTip;
// Depth below the back of the back's line and of the edge at x: in the point the back drops by the false edge and the
// edge sweeps up to meet it.
local backDepth(x) = if x <= pointStart then 0 else tipDrop * std.pow((x - pointStart) / pointLength, 2);
local edgeDepth(x) =
  if x <= pointStart then baseWidth + (tipWidth - baseWidth) * x / pointStart
  else tipDrop + (tipWidth - tipDrop) * (1 - std.pow((x - pointStart) / pointLength, 2));
local at(x, share) =
  local n = inward(x), d = backDepth(x) + share * (edgeDepth(x) - backDepth(x));
  [x + d * n[0], backY(x) + d * n[1]];
local bodySteps = 60;
local pointSteps = 8;
// The fuller's end and the false edge's start are stations, so each band changes at a segment's end.
local stations = std.set([pointStart * i / bodySteps for i in std.range(0, bodySteps)]
                         + [pointStart + pointLength * i / pointSteps for i in std.range(1, pointSteps)]
                         + [fullerLength, falseEdgeStart]);
local last = std.length(stations) - 1;
// The bands of the section a segment from x0 to x1 carries, as [slot, from share, to share, thickness].
local section(x0, x1) =
  local x = (x0 + x1) / 2;
  local backBands =
    if x < fullerLength then [['back', 0, fullerBack, thick.back], ['fuller', fullerBack, fullerFront, thick.fuller], ['body', fullerFront, bevelShare, thick.body]]
    else if x < falseEdgeStart then [['body', 0, bevelShare, thick.body]]
    else [['false-edge', 0, falseEdgeShare, thick.falseEdge], ['body', falseEdgeShare, bevelShare, thick.body]];
  backBands + [['edge', bevelShare, 1, thick.edge]];
// One band between two lines across the width. Prisms must be convex, so each is a quad, closing in a triangle at the
// point.
local band(b, i) =
  local x0 = stations[i], x1 = stations[i + 1];
  h.prism('%s-%d' % [b[0], i], b[0], 'z',
          if i + 1 == last then [at(x0, b[1]), at(x1, 0), at(x0, b[2])]
          else [at(x0, b[1]), at(x1, b[1]), at(x1, b[2]), at(x0, b[2])],
          -b[3] / 2, b[3] / 2);
local blade = std.flattenArrays([
  [band(b, i) for b in section(stations[i], stations[i + 1])]
  for i in std.range(0, last - 1)
]);
local stationAt(x) = std.length([s for s in stations if s <= x]) - 1;

// ---- the hilt ----

// The hilt's frame: `along` runs back down the grip from the plate's hilt-side face and `out` across it toward the
// spine, both turned by the cant so the pommel drops toward the edge.
local cant = gripCantDeg * std.pi / 180;
local origin = [-plateThickness, 0];
local alongDir = [-std.cos(cant), -std.sin(cant)];
local outDir = [-std.sin(cant), std.cos(cant)];
local hiltXY(p) = [origin[0] + p[0] * alongDir[0] + p[1] * outDir[0], origin[1] + p[0] * alongDir[1] + p[1] * outDir[1]];
local hiltXYZ(p) = hiltXY(p) + [p[2]];
// A block in the hilt's frame from `along` a0 to a1 and `out` o0 to o1, across z within halfZ, its four long edges
// chamfered by `chamfer` so its section is an octagon.
local hiltBlock(id, slot, a0, a1, o0, o1, halfZ, chamfer) =
  local mid = (o0 + o1) / 2, half = (o1 - o0) / 2;
  local centre = hiltXY([0, mid]);
  local offset = half + halfZ - chamfer;
  h.prism(id, slot, 'z', [hiltXY([a0, o0]), hiltXY([a1, o0]), hiltXY([a1, o1]), hiltXY([a0, o1])], -halfZ, halfZ) + {
    clip: [
      local n = [so * outDir[0], so * outDir[1], sz];
      { normal: n, offset: n[0] * centre[0] + n[1] * centre[1] + offset }
      for so in [1, -1]
      for sz in [1, -1]
    ],
  };

// A straight bar of rectangular section from p to q, its width lying across `normal`'s plane and its thickness along
// it, overrunning each end by half its width so a chain of them meets without a gap at a bend. A convex prism cannot
// lie askew, so it is the box round the bar cut down by the bar's six faces.
local sub(a, b) = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
local dot(a, b) = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
local cross(a, b) = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
local unit(a) = local l = std.sqrt(dot(a, a)); [a[0] / l, a[1] / l, a[2] / l];
local bar(id, slot, p, q, width, thickness, normal) =
  local d = sub(q, p), length = std.sqrt(dot(d, d));
  local along = unit(d), side = unit(cross(along, normal)), up = cross(side, along);
  local centre = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
  local faces = [[along, length / 2 + width / 2], [side, width / 2], [up, thickness / 2]];
  local corners = [
    [centre[k] + a * faces[0][0][k] * faces[0][1] + b * faces[1][0][k] * faces[1][1] + c * faces[2][0][k] * faces[2][1] for k in [0, 1, 2]]
    for a in [1, -1]
    for b in [1, -1]
    for c in [1, -1]
  ];
  local low = [std.minArray([c[k] for c in corners]) for k in [0, 1, 2]];
  local high = [std.maxArray([c[k] for c in corners]) for k in [0, 1, 2]];
  h.prism(id, slot, 'z', [[low[0], low[1]], [high[0], low[1]], [high[0], high[1]], [low[0], high[1]]], low[2], high[2]) + {
    clip: [
      local n = [s * f[0][k] for k in [0, 1, 2]];
      { normal: n, offset: dot(n, centre) + f[1] }
      for f in faces
      for s in [1, -1]
    ],
  };
// A bar bent along 3D points, one straight bar per run; the bend's plane at each run is the plane of the run and the
// next, so the width lies along the curve.
local bentBar(prefix, slot, points, width, thickness) =
  local n = std.length(points);
  [
    local a = points[std.max(i - 1, 0)], b = points[i], c = points[i + 1], e = points[std.min(i + 2, n - 1)];
    local plane = cross(sub(c, b), sub(if i + 2 < n then e else c, a));
    bar('%s-%d' % [prefix, i], slot, b, c, width, thickness, if dot(plane, plane) > 1e-12 then plane else [0, 0, 1])
    for i in std.range(0, n - 2)
  ];

local capStart = gripLength;
local capEnd = gripLength + capLength;
local strapTop = grip.halfHeight + backstrap.thickness;
local capBottom = -grip.halfHeight - cap.proud;
local capHalfZ = grip.halfWidth + cap.proud;
// The cap's side outline in the hilt's frame: a flat run over the backstrap, crowned down to the end and rounded under
// toward the edge, where the bow meets it.
local capOutline = [
  [capStart, capBottom],
  [capStart + capLength * 0.8, capBottom],
  [capEnd, capBottom + (strapTop - capBottom) * 0.25],
  [capEnd, strapTop - (strapTop - capBottom) * cap.crown],
  [capStart + capLength * 0.6, strapTop],
  [capStart, strapTop],
];
local capCentre = hiltXY([0, (strapTop + capBottom) / 2]);
local turns = std.floor(gripLength / wire.pitch);
local wireOffset = (gripLength - (turns - 1) * wire.pitch - wire.width - wire.slant) / 2;
// One turn of wire round the grip, slanting along it from the edge side to the spine as a wrap does.
local wireTurn(k) =
  local a = wireOffset + k * wire.pitch, half = grip.halfHeight + wire.proud, halfZ = grip.halfWidth + wire.proud;
  local centre = hiltXY([0, 0]), offset = grip.halfHeight + grip.halfWidth - grip.chamfer + wire.proud;
  h.prism('wire-%d' % k, 'wire', 'z',
          [hiltXY([a, -half]), hiltXY([a + wire.width, -half]), hiltXY([a + wire.width + wire.slant, half]), hiltXY([a + wire.slant, half])],
          -halfZ, halfZ) + {
    clip: [
      local n = [so * outDir[0], so * outDir[1], sz];
      { normal: n, offset: n[0] * centre[0] + n[1] * centre[1] + offset }
      for so in [1, -1]
      for sz in [1, -1]
    ],
  };

local hilt = [
  h.prism('plate', 'guard', 'x', plateOutline, -plateThickness, 0),
  hiltBlock('grip', 'grip', 0, gripLength, -grip.halfHeight, grip.halfHeight, grip.halfWidth, grip.chamfer),
  h.prism('backstrap', 'guard', 'z',
          [hiltXY([0, grip.halfHeight - grain]), hiltXY([capStart, grip.halfHeight - grain]), hiltXY([capStart, strapTop]), hiltXY([0, strapTop])],
          -backstrap.halfWidth, backstrap.halfWidth),
  h.prism('cap', 'guard', 'z', [hiltXY(p) for p in capOutline], -capHalfZ, capHalfZ) + {
    clip: [
      local n = [so * outDir[0], so * outDir[1], sz];
      { normal: n, offset: n[0] * capCentre[0] + n[1] * capCentre[1] + (strapTop - capBottom) / 2 + capHalfZ - grip.chamfer }
      for so in [1, -1]
      for sz in [1, -1]
    ],
  },
  h.ball('quillon-finial', 'guard', quillon.finial, quillon.line[3][0], quillon.line[3][1], 0),
] + [wireTurn(k) for k in std.range(0, turns - 1)]
+ h.bend('bow', 'guard', [hiltXY(p) for p in bow.line], bow.width, -bow.thickness / 2, bow.thickness / 2)
+ h.bend('quillon', 'guard', quillon.line, quillon.width, -quillon.thickness / 2, quillon.thickness / 2)
+ std.flattenArrays([
  bentBar('branch-%d' % i, 'guard', [hiltXYZ(p) for p in branches[i]], branchSize.width, branchSize.thickness)
  for i in std.range(0, std.length(branches) - 1)
]);

// The edge is marked where a cut lands, a third of the way back from the point.
local edgeAt = stationAt(bladeLength * 2 / 3);
[
  // A light cavalry trooper's sabre of the mid nineteenth century: a slim blade curving most toward its point, with a
  // broad fuller and a false edge, under a brass three-bar guard and a canted grip of leather bound in brass wire.
  h.compound('cavalry_sabre', massKg, blade + hilt, {
    back: 'steel-bright',
    fuller: 'steel-bright',
    body: 'steel-bright',
    'false-edge': 'steel-mirror',
    edge: 'steel-mirror',
    guard: 'brass-polished',
    grip: 'leather-black',
    wire: 'brass-dull',
  }) + h.gripOn('cavalry_sabre', 'grip') + {
    // Held as the other blades are, unrolled with its edge down and its point ahead: a tool's quarter roll would turn
    // the edge to one side. The palm centres on the grip, between the plate and the cap.
    handling+: { fraction: [0.5, 0.5, 0.5], hold: 'forward', roll: 0 },
    title: 'Cavalry sabre',
    voxelGrain: grain,
    taxonomy: { category: 'weapons', tags: { weapon: ['blade'], material: ['metal'] }, keywords: ['sword', 'melee', 'military'] },
    anchors: {
      local at(solid, fraction) = { part: 'cavalry_sabre', solid: solid, fraction: fraction },
      strike: at('edge-%d' % (last - 1), [1, 1, 0.5]),
      edge: at('edge-%d' % edgeAt, [0.5, 0, 0.5]),
    },
  },
]
