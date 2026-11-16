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
// An off-road tyre's bar lugs about z, from its body at `base` out to `outer`: each a slab on one shoulder, alternating
// sides, crossing the crown a little so the tread reads as one.
local shoulderLugs(width, base, outer, count) = [
  local a = 2 * std.pi * i / count;
  local d = 0.045 / outer;
  local at(r, t) = [r * std.cos(t), r * std.sin(t)];
  prism('lug_' + i, 'tyre', [at(base, a - d), at(outer, a - d), at(outer, a + d), at(base, a + d)], if i % 2 == 0 then [-0.01, width / 2] else [-width / 2, 0.01])
  for i in std.range(0, count - 1)
];
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
// A convex polygon without repeated or collinear corners, which a prism's profile must not have; empty when no area is left.
local tidy(polygon) =
  local n = std.length(polygon);
  local apart(p, q) = std.abs(p[0] - q[0]) + std.abs(p[1] - q[1]) > 1e-9;
  local distinct = [polygon[i] for i in std.range(0, n - 1) if apart(polygon[i], polygon[(i + 1) % n])];
  local m = std.length(distinct);
  local turns(a, b, c) = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 1e-12;
  local corners = [distinct[i] for i in std.range(0, m - 1) if turns(distinct[(i + m - 1) % m], distinct[i], distinct[(i + 1) % m])];
  if std.length(corners) < 3 then [] else corners;
// A convex polygon cut to the side of a line where dot(normal, point) <= offset.
local keep(polygon, normal, offset) =
  local n = std.length(polygon);
  local side(p) = offset - normal[0] * p[0] - normal[1] * p[1];
  tidy(std.flattenArrays([
    local p = polygon[i];
    local q = polygon[(i + 1) % n];
    local a = side(p);
    local b = side(q);
    (if a >= 0 then [p] else [])
    + (if a * b < 0 then [[p[0] + (q[0] - p[0]) * a / (a - b), p[1] + (q[1] - p[1]) * a / (a - b)]] else [])
    for i in std.range(0, n - 1)
  ]));
local keepAll(polygon, lines) = std.foldl(function(p, l) keep(p, l[0], l[1]), lines, polygon);
// A level plate as a y prism's plan, (z, x) points counter-clockwise, its heights and the cuts bounding it, so a box or
// a z prism can be redrawn as y prisms: a z prism's sides become cuts, each facing out of its counter-clockwise profile.
local slabOf(piece) =
  if piece.kind == 'box' then {
    outline: [[piece.min[2], piece.min[0]], [piece.max[2], piece.min[0]], [piece.max[2], piece.max[0]], [piece.min[2], piece.max[0]]],
    y: [piece.min[1], piece.max[1]],
    cuts: [],
  }
  else if piece.kind == 'prism' && piece.axis == 'y' then { outline: piece.profile, y: [piece.start, piece.end], cuts: std.get(piece, 'clip', []) }
  else if piece.kind == 'prism' && piece.axis == 'z' then
    local p = piece.profile;
    local n = std.length(p);
    local xs = [q[0] for q in p];
    local x = [std.foldl(std.min, xs, xs[0]), std.foldl(std.max, xs, xs[0])];
    local ys = [q[1] for q in p];
    {
      outline: [[piece.start, x[0]], [piece.end, x[0]], [piece.end, x[1]], [piece.start, x[1]]],
      y: [std.foldl(std.min, ys, ys[0]), std.foldl(std.max, ys, ys[0])],
      cuts: [
        local a = p[i];
        local d = [p[(i + 1) % n][0] - a[0], p[(i + 1) % n][1] - a[1]];
        { normal: [d[1], -d[0], 0], offset: d[1] * a[0] - d[0] * a[1] }
        for i in std.range(0, n - 1)
      ] + std.get(piece, 'clip', []),
    }
  else error piece.id + ' is not a box, a y prism or a z prism, so it cannot be holed';
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
  shoulderLugs: shoulderLugs,
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
  // A roller shutter in a locker wall, from `z[0]` to `z[1]`, as a part of its own: horizontal slats in alternating
  // `alu` and `steel` above a grab bar in `dark` along its foot. It rolls up into the drum behind the wall's head and
  // leaves its bar under the lintel.
  shutter(id, massKg, x0, x1, y0, y1, z, finish):
    local bar = 0.08;
    local pitch = self.slatPitch;
    self.compound(id, massKg, [
      box('bar', 'dark', [x0, y0, z[0]], [x1, y0 + bar, z[1]]),
    ] + [
      box('slat_' + i, if i % 2 == 0 then 'alu' else 'steel', [x0, y0 + bar + i * pitch, z[0]], [x1, std.min(y0 + bar + (i + 1) * pitch, y1), z[1]])
      for i in std.range(0, std.ceil((y1 - y0 - bar) / pitch) - 1)
    ], finish, motion=self.motion.slide('up', y1 - y0 - bar, stow=true)),
  // The height of one roller-shutter slat.
  slatPitch: 0.09,
  // A locker wall's roller shutters, one `shutter` part each from `y0` to `y1`: `spans` gives each locker its `[x0, x1]`
  // along the body and `titles` its part's title. Each part weighs its share of `massKg` by its width.
  lockerShutters(idPrefix, massKg, spans, titles, y0, y1, z, finish):
    assert std.objectFields(spans) == std.objectFields(titles) : idPrefix + ' lockers need a span and a title each';
    local width(name) = spans[name][1] - spans[name][0];
    local total = std.foldl(function(sum, name) sum + width(name), std.objectFields(spans), 0);
    [
      self.shutter(idPrefix + name, std.round(massKg * width(name) / total), spans[name][0], spans[name][1], y0, y1, z, finish)
      + { title: titles[name] }
      for name in std.objectFields(spans)
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
  grain: vehicleGrain,
  // A pair of round pins along `axis`, centred on `a` and `b`, which must lie on a line along that axis: round so a pin
  // turning in its socket keeps the same depth all through the swing. A pin one grain of its part in radius whose centre
  // lies on a neighbour's face sinks at most that grain into it, which the overlap check of
  // docs/decisions/0014-site-overlap.md counts as contact; a part drawn finer than the vehicle passes its own grain. Pins
  // take the part's `paint` slot unless `slot` names another, so by default they read as part of the panel they carry
  // rather than as fittings of their own.
  hingePins(name, axis, a, b, slot='paint', radius=vehicleGrain, length=2 * vehicleGrain):
    local along = { x: 0, y: 1, z: 2 }[axis];
    assert std.all([i == along || a[i] == b[i] for i in [0, 1, 2]]) : name + ' pins must lie on one line along ' + axis;
    assert a[along] != b[along] : name + ' pins must not coincide';
    [turned(name + '_' + end[0], slot, axis, disc(radius, -length / 2, length / 2), end[1]) for end in [['a', a], ['b', b]]],
  // How far the frame facing a hinged part's free edge stands back from it, for an edge `reach` from the hinge axis
  // along the part and an axis `depth` outboard of the part's inner face. The free inner corner swings on a circle
  // sqrt(reach² + depth²) from the axis, wider than the frame's edge `reach` away, so a flush frame would be cut early
  // in the swing; the frame stands off that circle by 2 mm, a real clearance rather than a graze. The gap stays under
  // half a `grain`, so off a free edge drawn on a cell boundary it takes no cell centre and the frame shows no slot.
  swingStandOff(reach, depth, grain=vehicleGrain):
    local gap = std.sqrt(reach * reach + depth * depth) - reach + 0.002;
    assert gap < grain / 2 : 'a ' + gap + ' m stand-off would open a slot at a ' + grain + ' m grain';
    gap,
  // A level plate, a box or a y or z prism, with a hole straight down through it at each of `holes`: a round one, an
  // { x, z, radius } whose outline is a `sides`-gon, or a rectangular one, an { x: [from, to], z: [from, to] }. A prism
  // must be convex, so the plate is cut into strips along x round a rectangular cell about each hole, and a round
  // hole's cell into sectors of the ring between the hole and the cell's edge. A hole may reach past the plate's edge,
  // so a hole across a joint is cut by each plate it crosses, and a plate no hole reaches is left whole.
  holed(piece, holes, sides=16):
    local slab = slabOf(piece);
    local zs = [p[0] for p in slab.outline];
    local xs = [p[1] for p in slab.outline];
    local round(h) = std.objectHas(h, 'radius');
    local cell(h) =
      if round(h) then { hole: h, z: [h.z - h.radius, h.z + h.radius], x: [h.x - h.radius, h.x + h.radius] }
      else { hole: h, z: h.z, x: h.x };
    local reaches(c) = c.z[1] > std.foldl(std.min, zs, zs[0]) && c.z[0] < std.foldl(std.max, zs, zs[0])
                       && c.x[1] > std.foldl(std.min, xs, xs[0]) && c.x[0] < std.foldl(std.max, xs, xs[0]);
    local cells = std.sort([cell(h) for h in holes if reaches(cell(h))], function(c) c.z[0]);
    // The strips between successive cell edges along x; an end strip's open side is null.
    local edges = [null] + std.set(std.flattenArrays([c.x for c in cells])) + [null];
    local strip(i) =
      local lo = edges[i];
      local hi = edges[i + 1];
      local across = [c for c in cells if lo != null && hi != null && c.x[0] <= lo && c.x[1] >= hi];
      local gaps = [null] + std.flattenArrays([c.z for c in across]) + [null];
      assert std.all([gaps[j] <= gaps[j + 1] for j in std.range(1, std.length(gaps) - 3)]) : piece.id + "'s holes overlap";
      [
        keepAll(slab.outline, (if lo == null then [] else [[[0, -1], -lo]]) + (if hi == null then [] else [[[0, 1], hi]])
                              + (if gaps[2 * j] == null then [] else [[[-1, 0], -gaps[2 * j]]])
                              + (if gaps[2 * j + 1] == null then [] else [[[1, 0], gaps[2 * j + 1]]]))
        for j in std.range(0, std.length(across))
      ];
    // The part of a hole's cell between two rays from its centre, outside the hole's edge between them.
    local sector(c, i) =
      local h = c.hole;
      local at(j) = [std.cos(2 * std.pi * j / sides), std.sin(2 * std.pi * j / sides)];
      local a = at(i);
      local b = at(i + 1);
      local mid = at(i + 0.5);
      local centre = [h.z, h.x];
      local through(n) = n[0] * centre[0] + n[1] * centre[1];
      keepAll(slab.outline, [
        [[-1, 0], -c.z[0]], [[1, 0], c.z[1]], [[0, -1], -c.x[0]], [[0, 1], c.x[1]],
        [[a[1], -a[0]], through([a[1], -a[0]])],
        [[-b[1], b[0]], through([-b[1], b[0]])],
        [[-mid[0], -mid[1]], through([-mid[0], -mid[1]]) - h.radius * std.cos(std.pi / sides)],
      ]);
    local plans = std.flattenArrays([strip(i) for i in std.range(0, std.length(edges) - 2)])
                  + [sector(c, i) for c in cells if round(c.hole) for i in std.range(0, sides - 1)];
    // A cut that keeps all of a piece is left off it, and a piece a cut leaves nothing of is dropped.
    local drawn(n, plan) =
      local corners = [[p[1], y, p[0]] for p in plan for y in slab.y];
      local over(cut) = [dot(cut.normal, q) - cut.offset for q in corners];
      local cuts = [cut for cut in slab.cuts if std.any([v > 1e-9 for v in over(cut)])];
      if std.any([std.all([v >= -1e-9 for v in over(cut)]) for cut in cuts]) then []
      else [yPrism(piece.id + '_' + n, piece.slot, plan, slab.y) + (if cuts == [] then {} else { clip: cuts })];
    if cells == [] then [piece]
    else std.flattenArrays([drawn(n, plans[n]) for n in std.range(0, std.length(plans) - 1) if plans[n] != []]),
  // A hatch: a `lid` `thickness` thick, its origin under the lid's centre, reaching `rear` m back from it, on a hinge
  // at its rear whose pins stand `pinZ` either side of the centre line. The pins stand at the hinge's top rear corner,
  // so the whole lid lies ahead of and below them and never dips under the roof as it swings up `open` degrees. Its
  // `reach` is how far it stands from the lid's axis in plan, at a pin's outer corner or the lid's own `corner` reach,
  // whichever is further. A lid opened past upright leans back beyond that, but only above the pins' axis, `pinHeight`
  // over the roof, so a fitting `reach` off and no taller than `pinHeight` clears it at any facing.
  hingedLid(lid, rear, corner, thickness, open, pinZ):
    local back = -rear - 0.04;
    local top = thickness + 0.03;
    local pins = self.hingePins('hinge_pin', 'z', [back, top, -pinZ], [back, top, pinZ], 'steel');
    local motion = self.motion.hinge(pins, 'up', open);
    {
      pieces: [
        lid,
        box('hinge', 'steel', [back, 0, -pinZ], [-rear + 0.02, top, pinZ]),
        box('handle', 'steel', [rear * 0.3, thickness, -0.06], [rear * 0.3 + 0.03, thickness + 0.03, 0.06]),
      ] + pins,
      motion: motion,
      reach: std.max(corner, std.sqrt(std.pow(back - vehicleGrain, 2) + std.pow(pinZ + vehicleGrain, 2))),
      pinHeight: top,
    },
  // A round hatch, its lid `radius` m across.
  hatch(radius, thickness, open): self.hingedLid(self.hatchLid(radius, thickness), radius, radius, thickness, open, 0.1),
  hatchLid(radius, thickness): turned('lid', 'paint', 'y', disc(radius, 0, thickness)) + { sides: 12 },
  // The hole under a hatch's lid of `lidRadius` centred at (x, z), for `holed`. The lid laps it by two grains all round,
  // so its twelve-sided edge still covers the hole wherever the voxel lattice falls.
  hatchHole(x, z, lidRadius): { x: x, z: z, radius: lidRadius - 2 * vehicleGrain },
  // A rectangular hatch, its lid `length` m along x and `width` m across, hinged along its rear edge with a pin at each
  // end of the hinge, a grain inside the lid's sides, so a wide lid hangs on its whole width.
  panelHatch(length, width, thickness, open):
    local lid = box('lid', 'paint', [-length / 2, 0, -width / 2], [length / 2, thickness, width / 2]);
    self.hingedLid(lid, length / 2, std.sqrt(length * length + width * width) / 2, thickness, open, width / 2 - vehicleGrain),
  // The hole under a `panelHatch`'s lid centred at (x, z), for `holed`. The lid laps it by two grains all round, as a
  // round lid does, so its edge covers the hole wherever the lid's own lattice falls against the plate's.
  panelHatchHole(x, z, length, width):
    local lap = 2 * vehicleGrain;
    { x: [x - length / 2 + lap, x + length / 2 - lap], z: [z - width / 2 + lap, z + width / 2 - lap] },
  // The hole inside a turret ring on the centre line at `x`, for `holed`: as wide as the ring's bore, so the ring stands
  // on the plate round it.
  ringHole(x, inner): { x: x, z: 0, radius: inner },
  // A welded part carries both sides: each near-side piece and its reflection across the centre plane.
  near: near,
  far: far,
  bothSides(pieces): std.map(near, pieces) + std.map(far, pieces),
  // How far a hinged part's face stands off a neighbour it slides across as it swings: enough that the two never
  // touch, and well under a grain, so it opens no empty cell.
  swingGap: 0.001,
  // How far a side-hung door's trailing edge stands off the post behind it, for a door `length` from its pins to that
  // edge whose inner face lies `depth` inside them. Its inner corner swings back across the post as it opens, at most
  // by how much further that corner lies from the pins than the edge's length.
  doorTailGap(length, depth): std.sqrt(length * length + depth * depth) - length + self.swingGap,
  // A lip inside the post behind a side-hung door's trailing edge, over heights `y` and a swing gap inside the face
  // `face` the door closes against, so the gap the door needs to swing clear of the post is not a slot through the body.
  doorJamb(name, rear, y, face): box(name, 'paint', [rear - 0.02, y[0], face - self.jambDepth], [rear + 0.02, y[1], face - self.swingGap]),
  // How far a `doorJamb` reaches in from the face, so whatever stands inside the opening can stop short of it.
  jambDepth: 0.03,
  // The middles along x, back to front, of a ladder frame's `count` crossmembers, each `half` long either side: all
  // but the front one spread from the middle `rear` to the back of the gearbox, `gearboxBack`, so none passes through
  // the gearbox or the engine ahead of it, and the front one closes the rails' ends at `front`, ahead of the engine.
  crossmemberXs(rear, gearboxBack, front, count, half):
    local last = gearboxBack - half;
    assert (last - rear) / (count - 2) >= 2 * half : 'the crossmembers behind the gearbox must not meet';
    [rear + i * (last - rear) / (count - 2) for i in std.range(0, count - 2)] + [front - half],
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
