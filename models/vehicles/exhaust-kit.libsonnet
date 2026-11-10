// An exhaust as its pipes and its class's catalytic converter and muffler (`exhaust-classes.libsonnet`), and the two
// ways a vehicle fits it: one fused model, or each part at its own site, so each is its own loot. Both are drawn from
// the same pieces and weigh the same. The pipes are cut where the converter and the muffler sit in the run: the front
// pipe up to the converter, the mid pipe between it and the muffler, and the tailpipe behind the muffler with its tip.
// An exhaust's frame is its `route`'s, `exhausts.libsonnet`.
local k = import 'kit.libsonnet';
local classes = import 'exhaust-classes.libsonnet';
local exhausts = import 'exhausts.libsonnet';
local round(piece) = piece + { sides: 12 };
local axes = ['x', 'y', 'z'];
local axisIndex = { x: 0, y: 1, z: 2 };
local plus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
local minus(a, b) = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// A route's legs, each with the axis it runs along and its distance from the route's start.
local legs(name, route) =
  local leg(i) =
    local a = route[i];
    local b = route[i + 1];
    local changed = [j for j in [0, 1, 2] if a[j] != b[j]];
    assert std.length(changed) == 1 : name + "'s leg " + i + ' changes ' + std.length(changed) + ' axes, not one';
    { from: a, to: b, axis: changed[0], length: std.abs(b[changed[0]] - a[changed[0]]) };
  local each = [leg(i) for i in std.range(0, std.length(route) - 2)];
  [each[i] { start: std.sum([each[j].length for j in std.range(0, i - 1)]) } for i in std.range(0, std.length(each) - 1)];
local runLength(legs) = std.sum([leg.length for leg in legs]);
// The point `d` along a leg, and the leg that holds the whole stretch from `d - half` to `d + half`.
local pointOn(leg, d) =
  local t = (d - leg.start) / leg.length;
  [leg.from[j] + (leg.to[j] - leg.from[j]) * t for j in [0, 1, 2]];
// The point `d` along the run.
local pointAt(legs, d) =
  local reached = [leg for leg in legs if leg.start <= d];
  pointOn(reached[std.length(reached) - 1], d);
local legHolding(name, legs, d, half, part) =
  local holding = [leg for leg in legs if leg.start <= d - half && d + half <= leg.start + leg.length];
  assert std.length(holding) == 1 : name + "'s " + part + ' does not sit on one straight leg';
  holding[0];

// A straight pipe of `radius` from point a to point b along `axis`, a turned piece whose origin is on the line.
local tube(id, slot, axis, radius, a, b) =
  local j = axisIndex[axis];
  local origin = [if i == j then 0 else a[i] for i in [0, 1, 2]];
  round(k.turned(id, slot, axis, k.disc(radius, std.min(a[j], b[j]), std.max(a[j], b[j])), origin));
// The pipe from `from` to `to` along the run, one tube per leg it crosses. A tube runs on past a bend by the pipe's
// radius, so the two legs meet in a solid elbow, but stops flush at the run's ends and at a part's face.
local pipe(legs, from, to, radius, slot) =
  local total = runLength(legs);
  local tubeOn(i) =
    local leg = legs[i];
    local a = std.max(from, leg.start);
    local b = std.min(to, leg.start + leg.length);
    local bendBefore = a == leg.start && leg.start > 0;
    local bendAfter = b == leg.start + leg.length && b < total;
    local dir = if leg.to[leg.axis] > leg.from[leg.axis] then 1 else -1;
    local stretch(p, by) = [if j == leg.axis then p[j] + dir * by else p[j] for j in [0, 1, 2]];
    tube(slot + '_' + i, slot, axes[leg.axis], radius,
         stretch(pointOn(leg, a), if bendBefore then -radius else 0),
         stretch(pointOn(leg, b), if bendAfter then radius else 0));
  [tubeOn(i) for i in std.range(0, std.length(legs) - 1) if std.max(from, legs[i].start) < std.min(to, legs[i].start + legs[i].length)];

// Each class part in its own frame, centred on its middle and running along its class's `axis`, with the finish of
// each slot it draws. The converter's ends taper down to the class's pipe.
local cat(c) = {
  local p = c.cat,
  local r = c.pipe.radius,
  local half = p.length / 2,
  pieces: [round(k.turned('can', 'converter', p.axis, [[-half, 0], [-half, r], [-half + p.taper, p.radius], [half - p.taper, p.radius], [half, r], [half, 0], [-half, 0]]))],
  finish: { converter: p.finish },
};
// An oval box, `section` its extents along the two axes across the run in a prism's profile order (`kit.libsonnet`),
// and a heat shield standing off its +z face when the class gives one.
local muffler(c) = {
  local m = c.muffler,
  local half = m.length / 2,
  local steps = 16,
  local oval = [
    local a = 2 * std.pi * i / steps;
    [m.section[0] / 2 * std.cos(a), m.section[1] / 2 * std.sin(a)]
    for i in std.range(0, steps - 1)
  ],
  local prism = { x: k.xPrism, y: k.yPrism }[m.axis],
  local shield = std.get(m, 'shield'),
  // A y prism's profile is (z, x), so an arc round +z starts from the profile's first axis.
  local shieldPieces = if shield == null then [] else
    assert m.axis == 'y' && m.section[0] == m.section[1] : 'a heat shield wraps an upright round muffler';
    local inner = m.section[0] / 2;
    local outer = inner + shield.thickness;
    local n = std.max(1, std.ceil(shield.span / 15));
    [
      local a0 = k.rad(-shield.span / 2 + shield.span * i / n);
      local a1 = k.rad(-shield.span / 2 + shield.span * (i + 1) / n);
      k.yPrism('shield_' + i, 'shield', [
        [inner * std.cos(a0), inner * std.sin(a0)],
        [outer * std.cos(a0), outer * std.sin(a0)],
        [outer * std.cos(a1), outer * std.sin(a1)],
        [inner * std.cos(a1), inner * std.sin(a1)],
      ], [-half * 0.9, half * 0.9])
      for i in std.range(0, n - 1)
    ],
  pieces: [prism('can', 'muffler', oval, [-half, half])] + shieldPieces,
  finish: { muffler: m.finish } + (if shield == null then {} else { shield: shield.finish }),
};

local fusedId(name) = name;
local pipeId(name, role) = name + '_' + role;
local classOf(name) = classes[exhausts[name].class];
local hasCat(name) = std.objectHas(classOf(name), 'cat');

// Where each part sits along the run: its centre in the exhaust's frame and the stretch of the run it fills. The
// pipes fill the stretches between, the tailpipe's last `tip.length` being its tip.
local layout(name) =
  local e = exhausts[name];
  local c = classOf(name);
  local run = legs(name, e.route);
  local total = runLength(run);
  local placed(key) =
    local d = total - e[key];
    local half = c[key].length / 2;
    local leg = legHolding(name, run, d, half, key);
    assert axes[leg.axis] == c[key].axis : name + "'s " + key + ' lies along ' + axes[leg.axis] + ', not its class axis ' + c[key].axis;
    { from: d - half, to: d + half, centre: pointOn(leg, d) };
  local m = placed('muffler');
  local parts = (if hasCat(name) then [{ role: 'cat' } + placed('cat')] else []) + [{ role: 'muffler' } + m];
  local cuts = [0] + std.flattenArrays([[p.from, p.to] for p in parts]) + [total];
  local roles = if hasCat(name) then ['front_pipe', 'mid_pipe', 'tailpipe'] else ['front_pipe', 'tailpipe'];
  assert std.all([cuts[i] < cuts[i + 1] for i in std.range(0, std.length(cuts) - 2)]) : name + "'s parts overlap or run off its route";
  assert total - m.to > c.tip.length : name + "'s tailpipe is shorter than its tip";
  {
    legs: run,
    parts: parts,
    pipes: [{ role: roles[i], from: cuts[2 * i], to: cuts[2 * i + 1], start: pointAt(run, cuts[2 * i]) } for i in std.range(0, std.length(roles) - 1)],
  };

// One pipe's pieces in the exhaust's frame: its tubes, the tip on the tailpipe and the brackets welded to it.
local pipePieces(name, p) =
  local e = exhausts[name];
  local c = classOf(name);
  local l = layout(name);
  local isTail = p.role == 'tailpipe';
  local body = pipe(l.legs, p.from, if isTail then p.to - c.tip.length else p.to, c.pipe.radius, 'pipe');
  local tip = if isTail then pipe(l.legs, p.to - c.tip.length, p.to, c.tip.radius, 'tip') else [];
  local brackets = [b for b in std.get(e, 'brackets', []) if b.pipe == p.role];
  body + tip + [k.box('bracket_' + i, 'bracket', brackets[i].min, brackets[i].max) for i in std.range(0, std.length(brackets) - 1)];
local pipeFinish(c) = { pipe: c.pipe.finish, tip: c.tip.finish, bracket: c.pipe.bracket };
local drawn(c, role) = if role == 'cat' then cat(c) else muffler(c);

local exhaustRows(name) =
  local e = exhausts[name];
  local c = classOf(name);
  local l = layout(name);
  local partMass = std.sum([c[p.role].massKg for p in l.parts]);
  local pipeLength = std.sum([p.to - p.from for p in l.pipes]);
  assert partMass < e.massKg : name + "'s converter and muffler outweigh the whole exhaust";
  local pipes = [p { pieces: pipePieces(name, p), massKg: (e.massKg - partMass) * (p.to - p.from) / pipeLength } for p in l.pipes];
  local renamed(role, pieces) = [piece { id: role + '_' + piece.id } for piece in pieces];
  [
    k.compound(pipeId(name, p.role), p.massKg, [k.moved(piece, minus([0, 0, 0], p.start)) for piece in p.pieces], pipeFinish(c))
    for p in pipes
  ] + [
    k.compound(fusedId(name), e.massKg,
               std.flattenArrays([renamed(p.role, p.pieces) for p in pipes])
               + std.flattenArrays([renamed(p.role, [k.moved(piece, p.centre) for piece in drawn(c, p.role).pieces]) for p in l.parts]),
               std.foldl(function(all, p) all + drawn(c, p.role).finish, l.parts, pipeFinish(c))),
  ];

local partRows(c) = [
  local d = drawn(c, role);
  k.compound(c[role].id, c[role].massKg, d.pieces, d.finish)
  for role in ['cat', 'muffler']
  if std.objectHas(c, role)
];

// The site of each part in an assembly, by role.
local siteIds = { front_pipe: 'exhaust_front_pipe', cat: 'catalytic_converter', mid_pipe: 'exhaust_mid_pipe', muffler: 'muffler', tailpipe: 'exhaust_tailpipe' };

{
  // Every exhaust's fused and pipe rows and every class's converter and muffler rows.
  rows: std.flattenArrays([partRows(classes[name]) for name in std.objectFields(classes)])
        + std.flattenArrays([exhaustRows(name) for name in std.objectFields(exhausts)]),
  // Every site an exhaust can take, so a vehicle that loses its engine can drop them all.
  siteIds: ['exhaust'] + std.objectValues(siteIds),
  // A vehicle's exhaust sites through a vehicle kit (`site.libsonnet`, `kit`), the exhaust's frame placed at `at`.
  // `detail` is 'fused', one model at the `exhaust` site, or 'assembly', each part at its own site. `paired` fits a
  // near-side exhaust and its far-side reflection, each site's id taking the pair's suffixes.
  sites(kit, name, at, detail, paired=false, supportedBy=[]):
    assert std.member(['fused', 'assembly'], detail) : 'an exhaust is fused or an assembly, not ' + detail;
    local fit(id, part, offset) =
      if paired then kit.pair(id, part, plus(at, offset), supportedBy) else [kit.fitting(id, part, plus(at, offset), supportedBy)];
    if detail == 'fused' then fit('exhaust', fusedId(name), [0, 0, 0])
    else
      local l = layout(name);
      std.flattenArrays([fit(siteIds[p.role], pipeId(name, p.role), p.start) for p in l.pipes]
                        + [fit(siteIds[p.role], classOf(name)[p.role].id, p.centre) for p in l.parts]),
}
