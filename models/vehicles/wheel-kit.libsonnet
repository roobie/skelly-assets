// A wheel as a tyre on a rim (`wheels.libsonnet`) with a brake of its class (`wheel-classes.libsonnet`), a disc or a
// drum as the vehicle chooses. A vehicle fits the wheel as one model, because a game turns the wheel's site and a
// placement cannot carry a part along with another's site; the tyre and the rim are rows of their own too, drawn from
// the same pieces, so a game can yield them from a salvaged wheel. A brake's two parts always have sites of their own:
// they stay on the hub when the wheel comes off, and a caliper or backing plate must not turn with the wheel. A drum
// brake's backing plate is fitted with its shoes and wheel cylinder as one model, as a caliper carries its pads, since
// they come off the hub together; they are rows of their own too, so a game can yield them from a salvaged one.
// A wheel's frame is the hub's centre with the axle along z, +z outboard.
local k = import 'kit.libsonnet';
local classes = import 'wheel-classes.libsonnet';
local wheels = import 'wheels.libsonnet';
// A turned row's eight default flats read as an octagon at the vehicle grain, so round parts take more.
local round(piece) = piece + { sides: 24 };

// Each part in its own frame, as its comment says, with the finish of each slot it draws.
// The tyre in the wheel's frame, its bead on the rim's barrel.
local tyre(w) = {
  local t = w.tyre,
  pieces: [round(k.turned('tyre', 'tyre', 'z', k.tyreProfile(t.width, w.rim.radius, t.outer, 0.1)))],
  finish: { tyre: 'rubber-black' },
};
// The rim in the wheel's frame: a barrel the tyre seats on, and spokes from the hub out to it on the face.
local rim(w) = {
  local r = w.rim,
  local face = [r.face, r.face + r.faceThickness],
  local inside = r.radius - r.wall,
  local at(radius, degrees) = [radius * std.cos(k.rad(degrees)), radius * std.sin(k.rad(degrees))],
  pieces: [
    round(k.turned('barrel', 'rim', 'z', k.annulus(inside, r.radius, -r.width / 2, r.width / 2))),
    round(k.turned('hub', 'rim', 'z', k.disc(r.hub, face[0], face[1]))),
    round(k.turned('cap', 'cap', 'z', k.disc(r.hub * 0.5, face[1], face[1] + 0.016))),
  ] + [
    local degrees = 90 + 360 * i / r.spokes;
    k.bar('spoke_' + i, 'rim', at(r.hub * 0.8, degrees), at(inside, degrees), r.spokeWidth, face)
    for i in std.range(0, r.spokes - 1)
  ],
  finish: { rim: r.finish, cap: 'paint-charcoal' },
};
// The origin is the centre of the hat's face that bolts against the rim, and the disc stands inboard along -z.
local disc(b) = {
  local d = b.disc,
  pieces: [
    round(k.turned('hat', 'hat', 'z', k.disc(d.hub, -d.hat, 0))),
    round(k.turned('ring', 'ring', 'z', k.annulus(d.hub, d.radius, -d.hat - d.thickness, -d.hat))),
  ],
  finish: d.finish,
};
// The origin is on the axis in the disc ring's middle plane. The caliper wraps the ring's edge behind the hub: the
// housing inboard of the ring, the jaw outboard, and a bridge over the edge that clears the round ring.
local caliper(b) = {
  local p = b.caliper,
  local half = b.disc.thickness / 2,
  local from = 180 - p.span / 2,
  local to = 180 + p.span / 2,
  local steps = std.max(1, std.ceil(p.span / 15)),
  local clear = b.disc.radius / std.cos(k.rad(p.span / steps / 2)),
  pieces: k.arc('housing', 'body', 0, 0, p.inner, p.outer, from, to, steps, [-half - p.housing, -half])
          + k.arc('jaw', 'body', 0, 0, p.inner, p.outer, from + p.span * 0.15, to - p.span * 0.15, steps, [half, half + p.jaw])
          + k.arc('bridge', 'body', 0, 0, clear, p.outer, from, to, steps, [-half, half]),
  finish: { body: p.finish },
};
// The origin is the centre of the face that bolts against the rim, and the barrel runs inboard along -z.
local drum(b) = {
  local d = b.drum,
  local outer = d.radius + d.wall,
  pieces: [
    round(k.turned('face', 'drum', 'z', k.disc(outer, -d.face, 0))),
    round(k.turned('barrel', 'drum', 'z', k.annulus(d.radius, outer, -d.depth, -d.face))),
  ],
  finish: { drum: d.finish },
};
// The rest of a drum brake, each in one frame: the centre of the backing plate's outboard face, where it closes the
// drum's open end, with the shoes and wheel cylinder standing outboard of it inside the drum.
local backingPlate(b) = {
  local p = b.backingPlate,
  pieces: [round(k.turned('plate', 'plate', 'z', k.disc(b.drum.radius + b.drum.wall + p.lip, -p.thickness, 0)))],
  finish: { plate: p.finish },
};
// The shoes just clear the drum's bore: one either side, apart at the top where the cylinder spreads them and at the
// bottom where they pivot.
local shoeOuter(b) = b.drum.radius - 0.002;
local shoes(b) = {
  local s = b.shoes,
  local outer = shoeOuter(b),
  local span = 180 - s.gap,
  local steps = std.ceil(span / 15),
  local shoe(id, from) = k.arc(id, 'shoe', 0, 0, outer - s.thickness, outer, from, from + span, steps, [0, s.width]),
  pieces: shoe('leading', 90 + s.gap / 2) + shoe('trailing', 270 + s.gap / 2),
  finish: { shoe: s.finish },
};
// Across the gap at the top, just inside the shoes so its corners never meet them.
local wheelCylinder(b) = {
  local c = b.wheelCylinder,
  local inside = shoeOuter(b) - b.shoes.thickness - 0.002,
  local at = std.sqrt(inside * inside - c.length * c.length / 4) - c.body / 2,
  pieces: [k.bar('cylinder', 'cylinder', [-c.length / 2, at], [c.length / 2, at], c.body, [0, c.body])],
  finish: { cylinder: c.finish },
};
local shoeAssembly(b) = {
  local parts = [backingPlate(b), shoes(b), wheelCylinder(b)],
  pieces: std.flattenArrays([p.pieces for p in parts]),
  finish: std.foldl(function(all, p) all + p.finish, parts, {}),
};

local classOf(name) = classes[wheels[name].class];
// Each kind of brake: whether it fits a rim, and its parts' sites about the wheel, each as the suffix of the wheel's
// site, the part and where its origin sits along the axle in the wheel's frame. Both kinds start at the rim's face: a
// disc's hat and a drum's face bolt against it.
local kinds = {
  disc: {
    mass(b): b.disc.massKg + b.caliper.massKg,
    fits(b, inside): b.caliper.outer < inside,
    sites(b, face): [
      { suffix: '_brake_disc', part: b.disc.id, dz: face },
      { suffix: '_caliper', part: b.caliper.id, dz: face - b.disc.hat - b.disc.thickness / 2 },
    ],
    rows(b): [
      local d = disc(b);
      k.compound(b.disc.id, b.disc.massKg, d.pieces, d.finish),
      local p = caliper(b);
      k.compound(b.caliper.id, b.caliper.massKg, p.pieces, p.finish),
    ],
  },
  drum: {
    mass(b): b.drum.massKg + b.backingPlate.massKg + b.shoes.massKg + b.wheelCylinder.massKg,
    fits(b, inside): b.drum.radius + b.drum.wall + b.backingPlate.lip < inside,
    sites(b, face): [
      { suffix: '_brake_drum', part: b.drum.id, dz: face },
      { suffix: '_brake_shoes', part: b.shoeAssembly, dz: face - b.drum.depth },
    ],
    rows(b): [
      local d = drum(b);
      k.compound(b.drum.id, b.drum.massKg, d.pieces, d.finish),
      local a = shoeAssembly(b);
      k.compound(b.shoeAssembly, self.mass(b) - b.drum.massKg, a.pieces, a.finish),
    ] + [
      local d = part[1](b);
      k.compound(b[part[0]].id, b[part[0]].massKg, d.pieces, d.finish)
      for part in [['backingPlate', backingPlate], ['shoes', shoes], ['wheelCylinder', wheelCylinder]]
    ],
  },
};
local anchored = { hub: ['barrel', [0.5, 0.5, 0.5]] };

local wheelRows(name) =
  local w = wheels[name];
  local t = tyre(w);
  local r = rim(w);
  local unfit = [kind for kind in std.objectFields(classOf(name)) if !kinds[kind].fits(classOf(name)[kind], w.rim.radius - w.rim.wall)];
  assert unfit == [] : name + "'s rim is too small for its class's " + std.join(' and ', unfit) + ' brake';
  [
    k.compound(name, w.tyre.massKg + w.rim.massKg, t.pieces + r.pieces, t.finish + r.finish, anchored),
    k.compound(w.tyre.id, w.tyre.massKg, t.pieces, t.finish, { hub: ['tyre', [0.5, 0.5, 0.5]] }),
    k.compound(w.rim.id, w.rim.massKg, r.pieces, r.finish, anchored),
  ];

{
  // The kinds of brake wheel `name`'s class offers.
  brakes(name): std.objectFields(classOf(name)),
  // What one wheel's `kind` of brake of `class` weighs, all its parts together.
  brakeMass(class, kind): kinds[kind].mass(classes[class][kind]),
  // Every wheel's row, its tyre's and rim's, and every class's brake rows.
  rows: std.flattenArrays([kinds[kind].rows(classes[c][kind]) for c in std.objectFields(classes) for kind in std.objectFields(classes[c])])
        + std.flattenArrays([wheelRows(name) for name in std.objectFields(wheels)]),
  // A near and far pair of wheel sites `id`, each wheel's frame placed at `at`, through a vehicle kit's `pair` (see
  // `site.libsonnet`, `kit`) so a game's kit can take them too, with the `brake` its vehicle chooses from its class's.
  // `brake` is null for the outer wheel of a twin, whose brake sits on the shared hub behind the inner one, and for a
  // wheel its axle brakes, which need not be one of `wheels.libsonnet`'s.
  pair(kit, id, name, at, brake, supportedBy=null):
    assert brake == null || std.member(self.brakes(name), brake) : name + "'s class offers no " + brake + ' brake';
    kit.pair(id, name, at, supportedBy)
    + (if brake == null then [] else std.flattenArrays([
         kit.pair(id + s.suffix, s.part, [at[0], at[1], at[2] + s.dz], supportedBy)
         for s in kinds[brake].sites(classOf(name)[brake], wheels[name].rim.face)
       ])),
  // The part an axle drawn with its drums is fitted as when its wheels carry the kit's brakes instead: a twin drawn
  // without them, which `shared.libsonnet` lays out for each such axle.
  axle(part, brake): if brake == null then part else part + '_bare',
}
