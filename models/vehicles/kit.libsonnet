// Helpers for vehicle part rows, in the vehicle frame: x forward, y up, z toward the near side.
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local part(id, family, massKg, dimensions, finish, anchors, exportMass='parts') = {
  id: id,
  exportMass: exportMass,
  parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] }],
  connections: [],
  anchors: { [name]: { part: 'body', solid: anchors[name][0], fraction: anchors[name][1] } for name in std.objectFields(anchors) },
};
// A z prism's profile is (x, y), an x prism's (y, z), a y prism's (z, x); a turned profile is (axial, radial) and closes on itself.
local box(id, slot, min, max) = { id: id, kind: 'box', slot: slot, min: min, max: max };
local prism(id, slot, profile, z) = { id: id, kind: 'prism', slot: slot, axis: 'z', profile: profile, start: z[0], end: z[1] };
local xPrism(id, slot, profile, x) = { id: id, kind: 'prism', slot: slot, axis: 'x', profile: profile, start: x[0], end: x[1] };
local yPrism(id, slot, profile, y) = { id: id, kind: 'prism', slot: slot, axis: 'y', profile: profile, start: y[0], end: y[1] };
local turned(id, slot, axis, profile, origin=[0, 0, 0]) = { id: id, kind: 'turned', slot: slot, axis: axis, profile: profile, origin: origin };
local disc(radius, from, to) = [[from, 0], [from, radius], [to, radius], [to, 0], [from, 0]];
local annulus(inner, outer, from, to) = [[from, inner], [from, outer], [to, outer], [to, inner], [from, inner]];
// A tyre's turned section, its shoulders rounded off by `taper` of its width.
local tyreProfile(width, rim, outer, taper) = [[-width / 2, rim], [-width / 2, outer - width * taper], [-width * 0.42, outer], [width * 0.42, outer], [width / 2, outer - width * taper], [width / 2, rim], [-width / 2, rim]];
local rad(degrees) = degrees * std.pi / 180;
// Convex trapezoids around a centre, since a prism must be convex. Angles run counter-clockwise from +x.
local arc(id, slot, cx, cy, inner, outer, from, to, steps, z) = [
  local a0 = rad(from + (to - from) * i / steps);
  local a1 = rad(from + (to - from) * (i + 1) / steps);
  prism(id + '_' + i, slot, [
    [cx + inner * std.cos(a0), cy + inner * std.sin(a0)],
    [cx + outer * std.cos(a0), cy + outer * std.sin(a0)],
    [cx + outer * std.cos(a1), cy + outer * std.sin(a1)],
    [cx + inner * std.cos(a1), cy + inner * std.sin(a1)],
  ], z)
  for i in std.range(0, steps - 1)
];
local across(a, b, half) =
  local dx = b[0] - a[0];
  local dy = b[1] - a[1];
  local length = std.sqrt(dx * dx + dy * dy);
  [-dy / length * half, dx / length * half];
// A bar between two (x, y) points, tapering from `thick` at a to `thickB` at b.
local bar(id, slot, a, b, thick, z, thickB=null) =
  local na = across(a, b, thick / 2);
  local nb = across(a, b, (if thickB == null then thick else thickB) / 2);
  prism(id, slot, [[a[0] - na[0], a[1] - na[1]], [b[0] - nb[0], b[1] - nb[1]], [b[0] + nb[0], b[1] + nb[1]], [a[0] + na[0], a[1] + na[1]]], z);
local near(piece) = piece + { id: piece.id + '_near' };
local far(piece) = piece + { id: piece.id + '_far' } + (
  if piece.kind == 'box' then { min: [piece.min[0], piece.min[1], -piece.max[2]], max: [piece.max[0], piece.max[1], -piece.min[2]] }
  else if piece.kind == 'prism' && piece.axis == 'z' then { start: -piece.end, end: -piece.start }
  else if piece.kind == 'prism' && piece.axis == 'x' then { profile: std.reverse([[p[0], -p[1]] for p in piece.profile]) }
  else if piece.kind == 'prism' then { profile: std.reverse([[-p[0], p[1]] for p in piece.profile]) }
  else { origin: [piece.origin[0], piece.origin[1], -piece.origin[2]] } + (
    if piece.axis == 'z' then { profile: std.reverse([[-p[0], p[1]] for p in piece.profile]) } else {}
  )
);
{
  part: part,
  box: box,
  prism: prism,
  xPrism: xPrism,
  yPrism: yPrism,
  turned: turned,
  disc: disc,
  annulus: annulus,
  tyreProfile: tyreProfile,
  rad: rad,
  arc: arc,
  bar: bar,
  // The x of a fork raked back from its axle at (axle, hub), `rake` m for each metre it rises.
  forkX(axle, hub, rake): function(y) axle - (y - hub) * rake,
  compound(id, massKg, pieces, finish, anchors={}): part(id, 'compound', massKg, { pieces: pieces }, finish, anchors),
  // A welded part carries both sides: each near-side piece and its reflection across the centre plane.
  near: near,
  far: far,
  bothSides(pieces): std.map(near, pieces) + std.map(far, pieces),
}
