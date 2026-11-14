// Helpers for vehicle part rows, in the vehicle frame, frame.libsonnet.
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
// The `paint` slot is the body colour a fitting's finish repaints, so it is the part's paintable slot wherever a piece
// draws it with the slot's material. Trim, glass, tyres and chrome take other slots and keep their authored finish.
local paintable(dimensions, finish) =
  local pieces = std.get(dimensions, 'pieces', []);
  if std.objectHas(finish, 'paint') && std.any([std.get(p, 'slot') == 'paint' && !std.objectHas(p, 'material') for p in pieces])
  then { paintable: ['paint'] } else {};
// A part that moves turns on its drawn pins, so it carries no hinge anchors; docs/decisions/0015-motion-as-content.md.
local part(id, family, massKg, dimensions, finish, anchors, exportMass='parts', motion=null) =
  assert motion == null || !std.objectHas(anchors, 'hinge_a') && !std.objectHas(anchors, 'hinge_b')
         : id + ' has a motion, so its pins replace its hinge anchors';
  {
    id: id,
    exportMass: exportMass,
    parts: [{ id: 'body', family: family, massKg: massKg, params: params(dimensions), finish: finish, ports: [] } + paintable(dimensions, finish)],
    connections: [],
    anchors: { [name]: { part: 'body', solid: anchors[name][0], fraction: anchors[name][1] } for name in std.objectFields(anchors) },
  } + (if motion == null then {} else { motion: { part: 'body', stages: motion } });
local towards = ['up', 'down', 'fore', 'rear', 'near', 'far'];
local vehicleGrain = (import '../voxel-grains.libsonnet').classes.vehicle.grain;
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
local dot(a, b) = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
local beyond(cut) = { normal: [-x for x in cut.normal], offset: -cut.offset };
local inset(cut, depth) = cut { offset: cut.offset - depth * std.sqrt(dot(cut.normal, cut.normal)) };
// The plane through three (x, y, z) points, as a normal and its offset; which side it faces is left to the caller.
local planeThrough(a, b, c) =
  local u = [b[i] - a[i] for i in [0, 1, 2]];
  local v = [c[i] - a[i] for i in [0, 1, 2]];
  local n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  { normal: n, offset: dot(n, a) };
// A cut reflected across the centre plane, onto the far side.
local farCut(cut) = cut { normal: [cut.normal[0], cut.normal[1], -cut.normal[2]] };
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
  if std.objectHas(piece, 'clip') then { clip: [farCut(c) for c in piece.clip] } else {}
) + (
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
  // The plane through three (x, y, z) points as a cut that keeps the side holding `inside`, so an armour plate is
  // authored by its corners rather than by a normal worked out by hand.
  plate(a, b, c, inside):
    local plane = planeThrough(a, b, c);
    local side = dot(plane.normal, inside) - plane.offset;
    assert side != 0 : 'a plate must not pass through the point it keeps';
    if side > 0 then { normal: [-x for x in plane.normal], offset: -plane.offset } else plane,
  farCut: farCut,
  // A plate's cut moved `depth` m inward, and the cut keeping the far side of a plane.
  inset: inset,
  beyond: beyond,
  // The cuts bounding a skin `depth` m thick behind a plate, so a hollow hull's armour is a wall, not a solid block.
  skin(cut, depth): [cut, beyond(inset(cut, depth))],
  // The cut that bevels the edge where two cuts' planes meet, `leg` m back from the edge across each face, so a joint
  // between plates is a flat chamfer rather than a sharp corner.
  chamfer(a, b, leg):
    local unit(n) = [x / std.sqrt(dot(n, n)) for x in n];
    local na = unit(a.normal);
    local nb = unit(b.normal);
    {
      normal: [na[i] + nb[i] for i in [0, 1, 2]],
      offset: a.offset / std.sqrt(dot(a.normal, a.normal)) + b.offset / std.sqrt(dot(b.normal, b.normal))
              - leg * std.sqrt(1 - std.pow(dot(na, nb), 2)),
    },
  // A prism cut by the planes `plates` lists, each from `plate`: a convex solid whose faces need not lie along an axis.
  clipped(piece, plates):
    assert piece.kind == 'prism' : piece.id + ' is not a prism, so it cannot be cut';
    piece { clip: plates },
  // A roller shutter in a locker wall, from `z[0]` to `z[1]`: horizontal slats in alternating `alu` and `steel`, with a
  // grab bar in `dark` along its foot.
  shutter(name, x0, x1, y0, y1, z): [
    box(name + '_bar', 'dark', [x0, y0, z[0]], [x1, y0 + 0.08, z[1]]),
  ] + [
    box(name + '_slat_' + i, if i % 2 == 0 then 'alu' else 'steel', [x0, y0 + 0.08 + i * 0.09, z[0]], [x1, std.min(y0 + 0.08 + (i + 1) * 0.09, y1), z[1]])
    for i in std.range(0, std.ceil((y1 - y0 - 0.08) / 0.09) - 1)
  ],
  // The x of a fork raked back from its axle at (axle, hub), `rake` m for each metre it rises.
  forkX(axle, hub, rake): function(y) axle - (y - hub) * rake,
  compound(id, massKg, pieces, finish, anchors={}, motion=null): part(id, 'compound', massKg, { pieces: pieces }, finish, anchors, motion=motion),
  // How a part moves, for `compound`'s `motion`: a list of stages run one after another, so motions join with `+`.
  // Each is a hinge turning on its drawn pins, given as pieces or their ids, and opening `open` degrees toward one of
  // `towards`; or a slide `travel` m toward one, which with `stow` hides whatever it carries past the part's rest
  // bounds on the side it moves toward, so a curtain rises into its head. A direction is read in the part's model frame
  // at rest, near being the side fore × up points to, wherever the part is drawn: a later stage's direction turns with
  // the stages before it, and a mirrored placement turns near into far.
  motion: {
    hinge(pins, toward, open):
      assert std.isArray(pins) && std.length(pins) > 0 : 'a hinge needs its pins';
      assert std.member(towards, toward) : 'a hinge opens toward one of ' + std.join(' ', towards) + ', not ' + toward;
      assert std.isNumber(open) && open > 0 && open <= 180 : 'a hinge opens more than 0 and at most 180 degrees';
      [{ kind: 'hinge', pins: [if std.isString(pin) then pin else pin.id for pin in pins], toward: toward, open: open }],
    slide(toward, travel, stow=false):
      assert std.member(towards, toward) : 'a slide moves toward one of ' + std.join(' ', towards) + ', not ' + toward;
      assert std.isNumber(travel) && travel > 0 : 'a slide travels a positive distance';
      assert std.isBoolean(stow) : 'a slide stows or it does not';
      [{ kind: 'slide', toward: toward, travel: travel } + (if stow then { stow: true } else {})],
  },
  // A pair of round pins along `axis`, centred on `a` and `b`, which must lie on a line along that axis: round so a pin
  // turning in its socket keeps the same depth all through the swing. A pin one grain in radius whose centre lies on a
  // neighbour's face sinks at most a grain into it, which the overlap check of docs/decisions/0014-site-overlap.md
  // counts as contact. Pins take the part's `paint` slot unless `slot` names another, so by default they read as part of
  // the panel they carry rather than as fittings of their own.
  hingePins(name, axis, a, b, slot='paint', radius=vehicleGrain, length=2 * vehicleGrain):
    local along = { x: 0, y: 1, z: 2 }[axis];
    assert std.all([i == along || a[i] == b[i] for i in [0, 1, 2]]) : name + ' pins must lie on one line along ' + axis;
    assert a[along] != b[along] : name + ' pins must not coincide';
    [turned(name + '_' + end[0], slot, axis, disc(radius, -length / 2, length / 2), end[1]) for end in [['a', a], ['b', b]]],
  // A welded part carries both sides: each near-side piece and its reflection across the centre plane.
  near: near,
  far: far,
  bothSides(pieces): std.map(near, pieces) + std.map(far, pieces),
  // A piece moved by `by`, an [x, y, z] offset, so one part's pieces can be drawn inside another.
  moved(piece, by):
    local shift(profile, a, b) = [[p[0] + by[a], p[1] + by[b]] for p in profile];
    local cut = if std.objectHas(piece, 'clip') then { clip: [c { offset: c.offset + dot(c.normal, by) } for c in piece.clip] } else {};
    (if piece.kind == 'box' then piece { min: [piece.min[i] + by[i] for i in [0, 1, 2]], max: [piece.max[i] + by[i] for i in [0, 1, 2]] }
     else if piece.kind == 'turned' then piece { origin: [piece.origin[i] + by[i] for i in [0, 1, 2]] }
     else
       local along = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] }[piece.axis];
       piece { profile: shift(piece.profile, along[1], along[2]), start: piece.start + by[along[0]], end: piece.end + by[along[0]] })
    + cut,
  // A z prism turned `degrees` counter-clockwise about the z axis, so one part's pieces can be laid round a loop.
  rolled(piece, degrees):
    assert piece.kind == 'prism' && piece.axis == 'z' : piece.id + ' is not a z prism, so it cannot roll about z';
    assert !std.objectHas(piece, 'clip') : piece.id + ' is cut by planes, which rolling would leave behind';
    local a = rad(degrees);
    piece { profile: [[p[0] * std.cos(a) - p[1] * std.sin(a), p[0] * std.sin(a) + p[1] * std.cos(a)] for p in piece.profile] },
  // A vehicle whose pressing would be identical to a sibling's fits the sibling's row instead, so a shared part is one
  // row, item and model. A spec's `borrow` maps each such pressing's suffix to the row it fits; `borrows` tells whether a
  // pressing is borrowed, `partId` names the row a fitting takes and `unborrowed` drops the borrowed pressings from a kit's rows.
  borrows(s, suffix): std.objectHas(std.get(s, 'borrow', {}), suffix),
  partId(id, s, suffix): std.get(std.get(s, 'borrow', {}), suffix, id + suffix),
  unborrowed(id, s, rows):
    local borrowed = [id + suffix for suffix in std.objectFields(std.get(s, 'borrow', {}))];
    [row for row in rows if !std.member(borrowed, row.id)],
  // A borrowed pressing may differ from the lender's row in its paint, so each fitting of the lender's row carries the
  // paint of the vehicle's own pressing as its finish. `pressings` are the kit's rows before `unborrowed`.
  painted(id, s, pressings, fittings):
    local borrow = std.get(s, 'borrow', {});
    local own = { [row.id]: row.parts[0] for row in pressings };
    local paintOf(suffix) =
      local body = own[id + suffix];
      local paints = std.set([body.finish[slot] for slot in std.get(body, 'paintable', [])]);
      assert std.length(paints) <= 1 : id + suffix + ' paints its slots in ' + std.join(' ', paints) + ', not one finish';
      paints;
    local finish = {
      [borrow[suffix]]: paintOf(suffix)[0]
      for suffix in std.objectFields(borrow)
      if std.objectHas(own, id + suffix) && std.length(paintOf(suffix)) == 1
    };
    [fitting + (if std.objectHas(finish, fitting.part) then { finish: finish[fitting.part] } else {}) for fitting in fittings],
}
