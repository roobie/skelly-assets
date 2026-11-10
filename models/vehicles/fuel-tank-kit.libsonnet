// A fuel tank as its body, its class's filler neck (`fuel-tank-classes.libsonnet`) and a pair of straps, and the two
// ways a vehicle fits it: one fused model, or each part at its own site, so each is its own loot. Both are drawn from
// the same pieces and weigh the same.
// A tank's frame is centred on x and z with its base at y = 0.
local k = import 'kit.libsonnet';
local classes = import 'fuel-tank-classes.libsonnet';
local tanks = import 'fuel-tanks.libsonnet';
local box = k.box;
local round(piece, sides=16) = piece + { sides: sides };
local capHeight = 0.03;

local classOf(name) = classes[tanks[name].class];

// Each part in its own frame, as its comment says, with the finish of each slot it draws.
// The body in the tank's frame: a slab chamfered along its lower edges, or a drum lying along x.
local body(t, c) = {
  local b = c.body,
  pieces: if b.shape == 'slab' then
    local ch = b.chamfer;
    local w = t.width / 2;
    [k.xPrism('body', 'body', [[0, -w + ch], [ch, -w], [t.height, -w], [t.height, w], [ch, w], [0, w - ch]], [-t.length / 2, t.length / 2])]
  else
    assert t.width == t.height : 'a drum tank is round, so its width is its height';
    [round(k.turned('body', 'body', 'x', k.disc(t.height / 2, -t.length / 2, t.length / 2), [0, t.height / 2, 0]), 24)],
  finish: { body: b.finish },
};
// The origin is where the neck leaves the tank's skin. A side neck runs out along +z and turns up; a top neck stands
// straight up. The cap closes its end.
local neck(c) = {
  local n = c.neck,
  local r = n.radius,
  local out = if n.reach > 0 then [round(k.turned('out', 'neck', 'z', k.disc(r, 0, n.reach + r)))] else [],
  local riseFrom = if n.reach > 0 then -r else 0,
  pieces: out + [
    round(k.turned('rise', 'neck', 'y', k.disc(r, riseFrom, n.rise), [0, 0, n.reach])),
    round(k.turned('cap', 'cap', 'y', k.disc(n.cap, n.rise, n.rise + capHeight), [0, 0, n.reach])),
  ],
  finish: { neck: n.finish, cap: 'plastic-black' },
};
// The origin is the middle of the strap's run under the tank, on the tank's base: a band under a slab that turns up
// its sides to the floor it hangs from, or a hoop round a drum.
local strap(t, c) = {
  local s = c.strap,
  local half = s.width / 2,
  pieces: if c.body.shape == 'slab' then [
    box('band', 'strap', [-half, -s.thickness, -t.width / 2 - s.thickness], [half, 0, t.width / 2 + s.thickness]),
  ] + k.bothSides([
    box('side', 'strap', [-half, 0, t.width / 2], [half, t.height, t.width / 2 + s.thickness]),
  ]) else [
    round(k.turned('hoop', 'strap', 'x', k.annulus(t.height / 2, t.height / 2 + s.thickness, -half, half), [0, t.height / 2, 0]), 24),
  ],
  finish: { strap: s.finish },
};

local bodyId(name) = name + '_body';
local strapId(name) = name + '_strap';
// Where each part's origin sits in the tank's frame: the neck midway along the tank, between the straps, on a slab's
// +z side or a drum's top, and a strap a third of the tank's length either side of its middle.
local mounts(name) =
  local t = tanks[name];
  {
    filler_neck: if classOf(name).neck.mount == 'side' then [0, t.height / 2, t.width / 2] else [0, t.height, 0],
    strap_front: [t.length / 3, 0, 0],
    strap_rear: [-t.length / 3, 0, 0],
  };
local parts(name) =
  local t = tanks[name];
  local c = classOf(name);
  {
    filler_neck: { draw: neck(c), id: c.neck.id, massKg: c.neck.massKg },
    strap_front: { draw: strap(t, c), id: strapId(name), massKg: t.strapKg },
    strap_rear: self.strap_front,
  };
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

local tankRows(name) =
  local t = tanks[name];
  local c = classOf(name);
  local drawn = body(t, c);
  local p = parts(name);
  local placed = [
    { id: role, pieces: [k.moved(piece, mounts(name)[role]) + { id: role + '_' + piece.id } for piece in p[role].draw.pieces], finish: p[role].draw.finish }
    for role in std.objectFields(p)
  ];
  local partMass = std.sum([p[role].massKg for role in std.objectFields(p)]);
  assert partMass < t.massKg : name + "'s neck and straps outweigh the whole tank";
  [
    k.compound(bodyId(name), t.massKg - partMass, drawn.pieces, drawn.finish),
    k.compound(strapId(name), t.strapKg, p.strap_front.draw.pieces, p.strap_front.draw.finish),
    k.compound(name, t.massKg, drawn.pieces + std.flattenArrays([q.pieces for q in placed]), std.foldl(function(all, q) all + q.finish, placed, drawn.finish)),
  ];

local neckRows(c) = local n = neck(c); [k.compound(c.neck.id, c.neck.massKg, n.pieces, n.finish)];

{
  // Every tank's body, strap and fused rows and every class's neck row.
  rows: std.flattenArrays([neckRows(classes[name]) for name in std.objectFields(classes)])
        + std.flattenArrays([tankRows(name) for name in std.objectFields(tanks)]),
  // Every site a tank fitted at site `id` can take, so a vehicle that loses its engine can drop them all.
  siteIds(id='fuel_tank'): [id] + [id + '_' + role for role in std.objectFields(parts(std.objectFields(tanks)[0]))],
  // A vehicle's tank sites through a vehicle kit (`site.libsonnet`, `kit`), the tank's frame placed at `at`. `detail`
  // is 'fused', one model at site `id`, or 'assembly', the body there and each part at a site named after it.
  sites(kit, name, at, detail, id='fuel_tank', supportedBy=[]):
    assert std.member(['fused', 'assembly'], detail) : 'a fuel tank is fused or an assembly, not ' + detail;
    if detail == 'fused' then [kit.fitting(id, name, at, supportedBy)]
    else
      local p = parts(name);
      [kit.fitting(id, bodyId(name), at, supportedBy)] + [
        kit.fitting(id + '_' + role, p[role].id, plus(at, mounts(name)[role]), supportedBy)
        for role in std.objectFields(p)
      ],
}
