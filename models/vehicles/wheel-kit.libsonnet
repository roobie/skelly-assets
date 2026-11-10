// A wheel as a tyre on a rim (`wheels.libsonnet`) with its class's brake (`wheel-classes.libsonnet`). A wheel with no
// class is braked by drums its axle draws, so no disc brake is claimed to fit a rim built only for drums. A vehicle fits
// the wheel as one model, because a game turns the wheel's site and a placement cannot carry a part along with another's
// site; the tyre and the rim are rows of their own too, drawn from the same pieces, so a game can yield them from a
// salvaged wheel. The brake disc and caliper always have sites of their own: they stay on the hub when the wheel comes
// off, and the caliper must not turn with the wheel.
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
local disc(c) = {
  local d = c.disc,
  pieces: [
    round(k.turned('hat', 'hat', 'z', k.disc(d.hub, -d.hat, 0))),
    round(k.turned('ring', 'ring', 'z', k.annulus(d.hub, d.radius, -d.hat - d.thickness, -d.hat))),
  ],
  finish: d.finish,
};
// The origin is on the axis in the disc ring's middle plane. The caliper wraps the ring's edge behind the hub: the
// housing inboard of the ring, the jaw outboard, and a bridge over the edge that clears the round ring.
local caliper(c) = {
  local p = c.caliper,
  local half = c.disc.thickness / 2,
  local from = 180 - p.span / 2,
  local to = 180 + p.span / 2,
  local steps = std.max(1, std.ceil(p.span / 15)),
  local clear = c.disc.radius / std.cos(k.rad(p.span / steps / 2)),
  pieces: k.arc('housing', 'body', 0, 0, p.inner, p.outer, from, to, steps, [-half - p.housing, -half])
          + k.arc('jaw', 'body', 0, 0, p.inner, p.outer, from + p.span * 0.15, to - p.span * 0.15, steps, [half, half + p.jaw])
          + k.arc('bridge', 'body', 0, 0, clear, p.outer, from, to, steps, [-half, half]),
  finish: { body: p.finish },
};

local braked(name) = std.objectHas(wheels[name], 'class');
local classOf(name) = classes[wheels[name].class];
// Where each brake part's origin sits in the wheel's frame: the disc's hat against the rim's face.
local discAt(name) = wheels[name].rim.face;
local caliperAt(name) = discAt(name) - classOf(name).disc.hat - classOf(name).disc.thickness / 2;
local anchored = { hub: ['barrel', [0.5, 0.5, 0.5]] };

local wheelRows(name) =
  local w = wheels[name];
  local t = tyre(w);
  local r = rim(w);
  assert !braked(name) || classOf(name).caliper.outer < w.rim.radius - w.rim.wall : name + "'s rim is too small for its class's caliper";
  [
    k.compound(name, w.tyre.massKg + w.rim.massKg, t.pieces + r.pieces, t.finish + r.finish, anchored),
    k.compound(w.tyre.id, w.tyre.massKg, t.pieces, t.finish, { hub: ['tyre', [0.5, 0.5, 0.5]] }),
    k.compound(w.rim.id, w.rim.massKg, r.pieces, r.finish, anchored),
  ];

local brakeRows(c) = [
  local d = disc(c);
  k.compound(c.disc.id, c.disc.massKg, d.pieces, d.finish),
  local p = caliper(c);
  k.compound(c.caliper.id, c.caliper.massKg, p.pieces, p.finish),
];

{
  // Whether wheel `name` carries a disc brake of its own; one without is braked by its axle's drums.
  braked: braked,
  // Every wheel's row, its tyre's and rim's, and every class's brake rows.
  rows: std.flattenArrays([brakeRows(classes[name]) for name in std.objectFields(classes)])
        + std.flattenArrays([wheelRows(name) for name in std.objectFields(wheels)]),
  // A near and far pair of wheel sites `id`, each wheel's frame placed at `at`, through a vehicle kit's `pair` (see
  // `site.libsonnet`, `kit`) so a game's kit can take them too. `brake` is false for the outer wheel of a twin, whose
  // brake sits on the shared hub behind the inner one, and for a wheel on an axle drawn with its drums, as every wheel
  // with no class is.
  pair(kit, id, name, at, supportedBy=null, brake=true):
    assert !brake || braked(name) : name + ' has no disc brake, so its axle draws drums and its pair takes brake=false';
    local axial(dz) = [at[0], at[1], at[2] + dz];
    kit.pair(id, name, at, supportedBy)
    + (if brake then kit.pair(id + '_brake_disc', classOf(name).disc.id, axial(discAt(name)), supportedBy)
                   + kit.pair(id + '_caliper', classOf(name).caliper.id, axial(caliperAt(name)), supportedBy) else []),
}
