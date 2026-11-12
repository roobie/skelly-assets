// A fuel tank as an assembly (`assembly.libsonnet`): its body, its class's filler neck (`fuel-tank-classes.libsonnet`)
// and a pair of straps.
// A tank's frame is centred on x and z with its base at y = 0.
local k = import 'kit.libsonnet';
local assembly = import 'assembly.libsonnet';
local site = import 'site.libsonnet';
local classes = import 'fuel-tank-classes.libsonnet';
local tanks = import 'fuel-tanks.libsonnet';
local box = k.box;
local round(piece, sides=16) = piece + { sides: sides };
local capHeight = 0.03;

local classOf(name) = classes[tanks[name].class];

// Each part in its own frame, as its comment says, drawn as `assembly.libsonnet` takes a drawing.
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

local fusedId(name) = name;
local bodyId(name) = name + '_body';
local strapId(name) = name + '_strap';
// Each part as `assembly.libsonnet` fits it for a tank at site `id`, each site named after the tank's: the neck midway
// along the tank, between the straps, on a slab's +z side or a drum's top, and a strap a third of the tank's length
// either side of its middle.
local fittings(name, id) =
  local t = tanks[name];
  local c = classOf(name);
  local strapFitting = { id: strapId(name), massKg: t.strapKg, drawn: strap(t, c) };
  [
    {
      site: id + '_filler_neck',
      id: c.neck.id,
      massKg: c.neck.massKg,
      drawn: neck(c),
      at: if c.neck.mount == 'side' then [0, t.height / 2, t.width / 2] else [0, t.height, 0],
    },
    strapFitting { site: id + '_strap_front', at: [t.length / 3, 0, 0] },
    strapFitting { site: id + '_strap_rear', at: [-t.length / 3, 0, 0] },
  ];

{
  // Every class's neck row and every tank's strap, body and fused rows.
  rows: [assembly.row(c.neck.id, c.neck.title, c.neck.massKg, neck(c)) for c in std.objectValues(classes)]
        + std.flattenArrays([
          local t = tanks[name];
          [assembly.row(strapId(name), t.title + ' strap', t.strapKg, strap(t, classOf(name)))]
          + assembly.rows(fusedId(name), bodyId(name), t.title, t.title + ' body', t.massKg, body(t, classOf(name)), fittings(name, 'fuel_tank'))
          for name in std.objectFields(tanks)
        ]),
  // The tanks, by the names `sites` takes.
  names: std.objectFields(tanks),
  // Every site a tank fitted at site `id` can take, so a vehicle that loses its engine can drop them all.
  siteIds(id='fuel_tank'): assembly.siteIds(id, fittings(self.names[0], id)),
  // A vehicle's tank sites, the tank's frame placed at `at`, as `assembly.libsonnet`, `sites`, says, with the tank at
  // site `id`.
  sites(name, at, detail, id='fuel_tank', kit=site.kit, supportedBy=[]):
    assembly.sites(id, fusedId(name), bodyId(name), fittings(name, id), at, detail, kit, supportedBy),
}
