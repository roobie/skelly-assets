// Head gear in the worn frame: origin at the centre of deadvox's head region, y up, the face toward +z, the wearer's
// left at +x. Clearances are measured against the player bust's head (`avatar.libsonnet`, `bust`).
local band = import 'models/head-band.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local fit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
// The riot helmet's origin is the head frame, so it is seated that far above the top of the neck.
local head = fit.headroom(bust.headFrameRise);
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local box(id, slot, min, max) = { id: id, kind: 'box', slot: slot, min: min, max: max };
local turned(id, slot, axis, profile, origin) = { id: id, kind: 'turned', slot: slot, axis: axis, profile: profile, origin: origin };
local disc(radius, length) = [[0, 0], [0, radius], [length, radius], [length, 0], [0, 0]];
// A ring sector between two bearings, in degrees from the face toward the left, as y prisms; a y prism's profile is
// (z, x), so a point at bearing b and radius r is [r cos b, r sin b] and rising bearings wind counterclockwise.
local rad(degrees) = degrees * std.pi / 180;
local at(r, b, z0) = [z0 + r * std.cos(rad(b)), r * std.sin(rad(b))];
local arc(id, slot, radii, bearings, step, heights, z0) = [
  {
    id: '%s_%d' % [id, i],
    kind: 'prism',
    slot: slot,
    axis: 'y',
    profile: [at(radii[1], a, z0), at(radii[1], a + step, z0), at(radii[0], a + step, z0), at(radii[0], a, z0)],
    start: heights[0],
    end: heights[1],
  }
  for i in std.range(0, std.floor((bearings[1] - bearings[0]) / step) - 1)
  for a in [bearings[0] + i * step]
];

local h = {
  back: 0,
  // The grain the helmet is drawn at. Drawing moves a surface up to half a voxel, so the helmet keeps its room off the
  // head after half of its voxel and half of the bust's.
  grain: 0.01,
  slack: (self.grain + bust.voxelGrain) / 2,
  // The padding's room between the hair and the shell.
  room: 0.01 + self.slack,
  inner: head.reach + self.room,
  outer: self.inner + 0.013,
  // The face opening's top edge sits above the eyes.
  brow: head.eyes + 0.02,
  // The dome rises from the hairline, where the hair begins to round over.
  domeBase: head.brow,
  // The dome stands high enough to keep the padding's room over the hair's top and round each of its layers.
  crownInner: std.foldl(std.max, [
    (layer.top - self.domeBase) / std.pow(1 - std.pow((layer.reach + self.room) / self.inner, 4), 1 / 4)
    for layer in head.hair
  ], head.top + self.room - self.domeBase),
  crownOuter: self.crownInner + 0.013,
  skirtBottom: -0.03,
  // The face opening's half-width, in degrees either side of the face.
  opening: 70,
  pivotBearing: 100,
  pivotHeight: 0.038,
  // The visor clears the band it hinges from.
  visorInner: self.outer + 0.009,
  visorOuter: self.visorInner + 0.006,
  cupTop: head.chin - self.slack,
  cupBottom: self.cupTop - 0.013,
  // The visor reaches below the chin, so a blow from the front meets it rather than the jaw.
  visorBottom: -0.13,
  visorTop: 0.042,
};
// A squared dome, a superellipse of exponent four: a round dome low enough to look right would cut the hair's crown.
local dome(steps) =
  local point(r, height, i) = [height * std.sqrt(std.sin(rad(90 * i / steps))), r * std.sqrt(std.cos(rad(90 * i / steps)))];
  // Material lies left of travel: in along the rim, up the inside, then down the outside.
  [point(h.inner, h.crownInner, i) for i in std.range(0, steps)]
  + [point(h.outer, h.crownOuter, steps - i) for i in std.range(0, steps)]
  + [point(h.inner, h.crownInner, 0)];
local pivotX = (h.visorInner - 0.01) * std.sin(rad(h.pivotBearing));
local pivotZ = h.back + (h.visorInner - 0.01) * std.cos(rad(h.pivotBearing));
local pivot(side) = [
  turned('pivot_%s' % side, 'shell', 'x', disc(0.022, 0.022), [if side == 'left' then h.outer - 0.004 else -(h.outer - 0.004) - 0.022, h.pivotHeight, pivotZ]),
  turned('pivot_knob_%s' % side, 'metal', 'x', disc(0.009, 0.008), [if side == 'left' then h.outer + 0.018 else -(h.outer + 0.018) - 0.008, h.pivotHeight, pivotZ]),
];
local strap(sign) = [
  box('chin_strap_%d' % (if sign > 0 then 1 else 2), 'strap', [std.min(sign * 0.088, sign * 0.098), h.cupBottom, -0.005], [std.max(sign * 0.088, sign * 0.098), -0.025, 0.015]),
  box('strap_tab_%d' % (if sign > 0 then 1 else 2), 'strap', [std.min(sign * 0.088, sign * (h.inner + 0.005)), -0.035, -0.005], [std.max(sign * 0.088, sign * (h.inner + 0.005)), -0.02, 0.015]),
];
local pieces =
  [turned('dome', 'shell', 'y', dome(8), [0, h.domeBase, h.back])]
  + arc('skirt', 'shell', [h.inner, h.outer], [h.opening, 360 - h.opening], 10, [h.skirtBottom, h.domeBase], h.back)
  + arc('forehead', 'shell', [h.inner, h.outer], [-h.opening, h.opening], 10, [h.brow, h.domeBase], h.back)
  // The rubber edge runs along the shell's front, from one side of the face opening to the other.
  + arc('edge', 'trim', [h.outer - 0.004, h.outer + 0.006], [-h.opening, h.opening], 10, [h.brow - 0.005, h.brow + 0.007], h.back)
  // The visor's frame band crosses the brow from pivot to pivot.
  + arc('band', 'shell', [h.outer + 0.004, h.visorInner], [-h.pivotBearing, h.pivotBearing], 10, [h.pivotHeight - 0.014, h.brow], h.back)
  + arc('visor', 'visor', [h.visorInner, h.visorOuter], [-90, 90], 10, [h.visorBottom, h.visorTop], h.back)
  // The curtain hangs from the skirt round the back and flares as it falls, to keep a blow off the neck.
  + arc('curtain_upper', 'curtain', [h.inner + 0.005, h.outer + 0.004], [h.pivotBearing, 360 - h.pivotBearing], 20, [-0.075, h.skirtBottom + 0.005], h.back)
  + arc('curtain_lower', 'curtain', [h.outer - 0.002, h.outer + 0.012], [h.pivotBearing, 360 - h.pivotBearing], 20, [-0.125, -0.075], h.back)
  + pivot('left') + pivot('right')
  + strap(1) + strap(-1)
  + [box('chin_cup', 'strap', [-0.098, h.cupBottom, -0.005], [0.098, h.cupTop, 0.06])];
local g = {
  eyeSpacing: 0.076,
  tubeRadius: 0.023,
  tubeBack: 0.102,
  tubeFront: 0.178,
  lensDepth: 0.004,
  strapWall: 0.004,
  voxelGrain: 0.002,
};
local goggleStrap = band.strap('night_vision_goggles', g.voxelGrain, g.strapWall);
local optic(side) = [
  turned('tube_%s' % side, 'body', 'z', disc(g.tubeRadius, g.tubeFront - g.tubeBack),
         [if side == 'left' then g.eyeSpacing / 2 else -g.eyeSpacing / 2, 0, g.tubeBack]),
  turned('lens_%s' % side, 'lens', 'z', disc(g.tubeRadius * 0.85, g.lensDepth),
         [if side == 'left' then g.eyeSpacing / 2 else -g.eyeSpacing / 2, 0, g.tubeFront]),
];
local goggleAnchor(solid, fraction) = { part: 'goggles', solid: solid, fraction: fraction };
[
  {
    id: 'riot_helmet',
    title: 'Riot helmet',
    exportMass: 'parts',
    voxelGrain: h.grain,
    taxonomy: { category: 'armour', keywords: ['police'], tags: { slot: ['head', 'face'], material: ['plastic'], setting: ['modern'] } },
    parts: [{
      id: 'helmet',
      family: 'compound',
      massKg: 1.4,
      params: params({ pieces: pieces }),
      finish: { shell: 'paint-police-blue', trim: 'rubber-black', visor: 'glass-clear', curtain: 'polymer-black', strap: 'polymer-black', metal: 'steel-grey' },
      ports: [],
    }],
    connections: [],
    handling: { part: 'helmet', solid: 'dome', fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
    anchors: { brow: fit.browAnchor('helmet', 'dome', [-h.outer, h.domeBase, h.back - h.outer], [h.outer, h.domeBase + h.crownOuter, h.back + h.outer], head.brow) },
  },
  {
    id: 'night_vision_goggles',
    title: 'Night vision goggles',
    exportMass: 'parts',
    voxelGrain: g.voxelGrain,
    parts: [{
      id: 'goggles', family: 'compound', massKg: 0.55,
      params: params({ pieces: [box(piece.id, 'strap', piece.min, piece.max) for piece in goggleStrap.pieces] + optic('left') + optic('right') + [
        box('bridge', 'body', [-0.064, 0.014, 0.103], [0.064, 0.034, 0.125]),
      ] }),
      finish: { body: 'polymer-od-green', strap: 'rubber-black', lens: 'glass-lens-green' },
      ports: [],
    }],
    connections: [],
    handling: { part: 'goggles', solid: 'bridge', fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
    anchors: {
      eye_left: goggleAnchor('tube_left', [0.5, 0.5, 0]),
      eye_right: goggleAnchor('tube_right', [0.5, 0.5, 0]),
      lens_left: goggleAnchor('lens_left', [0.5, 0.5, 1]),
      lens_right: goggleAnchor('lens_right', [0.5, 0.5, 1]),
      lens_left_edge: goggleAnchor('lens_left', [1, 0.5, 1]),
      lens_right_edge: goggleAnchor('lens_right', [1, 0.5, 1]),
    } + { [name]: { part: 'goggles' } + goggleStrap.anchors[name] for name in std.objectFields(goggleStrap.anchors) },
  } + { taxonomy: { category: 'electrical', tags: { slot: ['face'] } } },
]
