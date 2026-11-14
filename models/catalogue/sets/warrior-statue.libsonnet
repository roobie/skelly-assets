// A stone statue of an armoured warrior on a plinth, larger than life: the right hand rests on the pommel of a sword
// planted point-down before him, the left holds a heater shield standing on its point at his side. The figure is
// the player's doll cut k times larger and dressed in the medieval plate harness a player can wear
// (models/plate.libsonnet), all in one stone, so the statue stands in the player's own proportions.
//
// The assembly check lets only parts joined to each other nest, so wherever plate covers the doll the plate stands
// in for that segment and carries a core where its lames part; the doll's own thighs and hands show between the
// plates. A compound assembly cannot mirror a part, so both sides take the doll's right limbs, as the mannequin does
// (models/catalogue/sets/batch-035.libsonnet); the shield hides the left hand. The pose names each part's turn in the
// world and every joint is worked out from those turns, so a pose reads as where the body points rather than as a
// chain of relative angles, and the sword and shield reach the plinth from wherever the pose puts the hands.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local band = import 'models/head-band.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
local hand = import 'models/measures/hand.libsonnet';
local plate = import 'models/plate.libsonnet';

// How much larger than life the figure is cut.
local k = 1.25;

// Metres. A stepped plinth: a base, a die with a raised blank panel on each face, and a cornice the figure stands on.
local plinth = {
  base: { width: 1.36, depth: 1.26, height: 0.12 },
  die: { width: 1.16, depth: 1.06, height: 0.38 },
  cornice: { width: 1.26, depth: 1.16, height: 0.08 },
  panel: { inset: 0.12, proud: 0.012 },
  // Mouldings between the steps, `proud` beyond the die.
  moulding: { height: 0.03, proud: 0.025 },
};
local plinthTop = plinth.base.height + plinth.die.height + plinth.cornice.height;

// Degrees, as turns in the world. The figure faces +z; its left is +x.
local pose = {
  // Each leg swings `stride` forward (left) or back (right) and `splay` out, and each foot turns `toeOut` out.
  stride: 6,
  splay: 7,
  toeOut: 12,
  // The helmeted head turns towards the shield and lifts its chin.
  head: { turn: 14, lift: 6 },
  // The sword arm hangs `forward` and `abduct` out; the hand lies flat on the pommel, fingers forward and turned
  // `inward`, the wrist bent back `wrist` so the forearm slopes down to it.
  sword: { abduct: 16, forward: 20, inward: 10, wrist: 35 },
  // The shield arm hangs `abduct` out, the palm flat to the shield's back; the shield turns `turn` to face out and
  // forward and leans its top `lean` in.
  shield: { abduct: 20, turn: 50, lean: 4 },
  // Each phalanx's curl, knuckle first, and the thumb's bones likewise: the sword hand's fingers droop over the
  // pommel, the shield hand's lie flat.
  swordFingers: [12, 10, 8],
  shieldFingers: [0, 0, 0],
  thumb: [0, 0, 0],
};

local stone = 'stone-grey';
local darkStone = 'stone-whet';
// The figure's stone: its skin and plate the one grey, the plate's rims and fittings the darker, so the harness reads.
local tone(slot) = if std.member(['trim', 'rivet', 'strap', 'collar', 'toe', 'hem', 'sole', 'laces', 'lens', 'ridge'], slot) then darkStone else stone;

// Rotations as 3x3 row-major matrices, in degrees.
local rad(d) = d * 3.141592653589793 / 180;
local rot = {
  x(d):: local c = std.cos(rad(d)), s = std.sin(rad(d)); [[1, 0, 0], [0, c, -s], [0, s, c]],
  y(d):: local c = std.cos(rad(d)), s = std.sin(rad(d)); [[c, 0, s], [0, 1, 0], [-s, 0, c]],
  z(d):: local c = std.cos(rad(d)), s = std.sin(rad(d)); [[c, -s, 0], [s, c, 0], [0, 0, 1]],
  id:: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  mul(a, b):: [[std.sum([a[i][n] * b[n][j] for n in [0, 1, 2]]) for j in [0, 1, 2]] for i in [0, 1, 2]],
  t(a):: [[a[j][i] for j in [0, 1, 2]] for i in [0, 1, 2]],
  apply(m, v):: [std.sum([m[i][n] * v[n] for n in [0, 1, 2]]) for i in [0, 1, 2]],
};
local add(a, b) = [a[i] + b[i] for i in [0, 1, 2]];
local sub(a, b) = [a[i] - b[i] for i in [0, 1, 2]];
local times(v, s) = [x * s for x in v];

// A part's frame in the world, and a point given life-size in that frame, in the world.
local frame(turn, origin) = { turn: turn, origin: origin };
local at(f, p) = add(f.origin, rot.apply(f.turn, times(p, k)));

// The doll's measures cut k times larger: every length scales, shares, powers and counts do not.
local isShare(field) = std.endsWith(field, 'Share') || std.endsWith(field, 'Shares') || std.endsWith(field, 'Power') || std.endsWith(field, 'Count') || field == 'armpit';
local scaledMeasures(m) = {
  [f]: local v = m[f];
    if std.type(v) == 'number' && !isShare(f) then v * k
    else if f == 'knuckleBack' then times(v, k)
    else v
  for f in std.objectFields(m)
};
local ring = band.hairRing;
local bustMeasures = scaledMeasures(bust) { hairRing: { bottom: ring.bottom * k, top: ring.top * k, rows: [times(row, k) for row in ring.rows] } };
local armMeasures = scaledMeasures(arm);
local legMeasures = scaledMeasures(leg);

// The doll's joints in its own frames, life-size (models/catalogue/sets/avatar.libsonnet).
local shoulderX = bust.chestWidth / 2 + bust.shoulderWidth / 2 - bust.deltoidInset;
local shoulderY = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight - bust.shoulderHeight / 2 - bust.deltoidDrop;
local chestTop = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight;
local hipX = bust.pelvisWidth / 4;
local hipY = bust.pelvisHeight * 0.12;
local ankleDrop = leg.length - leg.thighLength - leg.shoeHeight;
// The sabaton's sole lies under the bare foot, so the figure stands that much higher on the plinth.
local soleLift = [r for r in plate if r.id == 'sabaton_plate_worn_foot'][0].soleLift;
// The helmet's flange sits this far below the neck's top, so the armet's slit falls at the eyes.
local helmetDrop = 0.04;
// Where a flat hand meets what it rests on: the middle of the palm's face, a little to the little finger's side so
// the thumb runs clear.
local palmFace = [arm.palmThickness / 2, -arm.palmLength / 2, -0.01];

// The legs' turns; both swing the same angle, so the hips stand where both soles meet the plinth.
local legTurn(side) = rot.mul(rot.x(-side * pose.stride), rot.z(side * pose.splay));
local footTurn(side) = rot.y(side * pose.toeOut);
local legDrop = (leg.length - leg.shoeHeight) * rot.apply(legTurn(1), [0, 1, 0])[1];

// Each side's arm turns: upper arm, forearm and palm.
local armTurns = {
  right: {
    local s = pose.sword,
    // Palm down, fingers forward: the doll's palm faces +x with its fingers down.
    palm: rot.mul(rot.y(90 + s.inward), rot.z(-90)),
    fore: rot.mul(self.palm, rot.z(s.wrist)),
    upper: rot.mul(rot.z(-s.abduct), rot.x(-s.forward)),
  },
  left: {
    local s = pose.shield,
    palm: rot.mul(rot.y(-s.turn), rot.z(s.lean)),
    fore: self.palm,
    upper: rot.mul(rot.z(s.abduct), rot.y(-s.turn)),
  },
};

// Every part's frame in the world, worked out down the body from the harness.
local frames =
  local harness = frame(rot.id, [0, plinthTop + k * (leg.shoeHeight + soleLift + legDrop - hipY), 0]);
  local legFrames(name, side) =
    local thigh = frame(legTurn(side), at(harness, [side * hipX, hipY, 0]));
    local greave = frame(legTurn(side), at(thigh, [0, -leg.thighLength, 0]));
    {
      ['thigh-' + name]: thigh,
      ['greave-' + name]: greave,
      ['sabaton-' + name]: frame(footTurn(side), at(greave, [0, -ankleDrop, 0])),
    };
  local armFrames(name, side, curl) =
    local turns = armTurns[name];
    local pauldron = frame(turns.upper, at(harness, [side * shoulderX, shoulderY, 0]));
    local vambrace = frame(turns.fore, at(pauldron, [0, -arm.upperLength, 0]));
    local palm = frame(turns.palm, at(vambrace, [0, -arm.foreLength, 0]));
    // A digit's bones down from its root, each curled about its own joint.
    local digit(part, root, length, curls) =
      std.foldl(function(acc, b)
        local f = if b == 0 then frame(rot.mul(palm.turn, rot.z(curls[0])), at(palm, root))
          else local above = acc[part(b - 1) + '-' + name]; frame(rot.mul(above.turn, rot.z(curls[b])), at(above, [0, -length(b - 1), 0]));
        acc { [part(b) + '-' + name]: f }, std.range(0, std.length(curls) - 1), {});
    {
      ['pauldron-' + name]: pauldron,
      ['vambrace-' + name]: vambrace,
      ['palm-' + name]: palm,
    } + digit(hand.thumbPart, hand.thumbRoot, hand.thumbLength, pose.thumb)
    + std.foldl(function(acc, i) acc + digit(function(b) hand.part(hand.fingers[i], b), hand.knuckle(i), function(b) hand.length(i, b), curl),
                std.range(0, std.length(hand.fingers) - 1), {});
  local left = armFrames('left', 1, pose.shieldFingers), right = armFrames('right', -1, pose.swordFingers);
  local shieldPalm = left['palm-left'];
  {
    plinth: frame(rot.id, [0, 0, 0]),
    harness: harness,
    pelvis: harness,
    armet: frame(rot.mul(rot.y(pose.head.turn), rot.x(-pose.head.lift)), at(harness, [0, chestTop + bust.neckHeight - helmetDrop, 0])),
    // The blade's flat faces forward.
    sword: frame(rot.y(90 + pose.sword.inward), at(right['palm-right'], palmFace)),
    shield: frame(shieldPalm.turn, at(shieldPalm, palmFace)),
  } + legFrames('left', 1) + legFrames('right', -1) + left + right;

// Each joint, host first, at its point in the world. The plinth holds the right sole and the left stands on it.
local links =
  local legLinks(name) = [
    ['pelvis', 'thigh-' + name, frames['thigh-' + name].origin],
    ['thigh-' + name, 'greave-' + name, frames['greave-' + name].origin],
    ['greave-' + name, 'sabaton-' + name, frames['sabaton-' + name].origin],
  ];
  local armLinks(name) = [
    ['harness', 'pauldron-' + name, frames['pauldron-' + name].origin],
    ['pauldron-' + name, 'vambrace-' + name, frames['vambrace-' + name].origin],
    ['vambrace-' + name, 'palm-' + name, frames['palm-' + name].origin],
  ] + [
    local part(b) = hand.thumbPart(b);
    [if b == 0 then 'palm-' + name else part(b - 1) + '-' + name, part(b) + '-' + name, frames[part(b) + '-' + name].origin]
    for b in std.range(0, hand.thumbBones - 1)
  ] + [
    local part(b) = hand.part(hand.fingers[i], b);
    [if b == 0 then 'palm-' + name else part(b - 1) + '-' + name, part(b) + '-' + name, frames[part(b) + '-' + name].origin]
    for i in std.range(0, std.length(hand.fingers) - 1)
    for b in std.range(0, hand.phalanges - 1)
  ];
  [
    ['plinth', 'sabaton-right', at(frames['sabaton-right'], [0, -leg.shoeHeight - soleLift, 0])],
    ['harness', 'pelvis', frames.pelvis.origin],
    ['harness', 'armet', frames.armet.origin],
    ['palm-right', 'sword', frames.sword.origin],
    ['palm-left', 'shield', frames.shield.origin],
  ] + legLinks('left') + legLinks('right') + armLinks('left') + armLinks('right');

// A part's joints: on the host a socket turned from the host to the part it holds, on the held part a pin, both at
// the joint's point in their own frames.
local inFrame(f, p) = rot.apply(rot.t(f.turn), sub(p, f.origin));
local portsOf(id) =
  local f = frames[id];
  [
    local held = frames[l[1]], turn = rot.mul(rot.t(f.turn), held.turn);
    { id: l[1], mount: 'assembly-joint', gender: 'female', pos: inFrame(f, l[2]), normal: rot.apply(turn, [0, -1, 0]), up: rot.apply(turn, [0, 0, 1]), required: true }
    for l in links
    if l[0] == id
  ] + [
    { id: l[0], mount: 'assembly-joint', gender: 'male', pos: inFrame(f, l[2]), normal: [0, 1, 0], up: [0, 0, 1], required: true }
    for l in links
    if l[1] == id
  ];

// Stone is about 2.6 times as heavy as flesh and the figure k³ times the doll's bulk; each part's share of a 75 kg
// body.
local figureKg = 75 * 2.6 * k * k * k;
local segment(id, family, measures, values, share) = {
  local all = measures + values,
  id: id, family: family, massKg: figureKg * share, ports: portsOf(id),
  params: { [f]: std.toString(all[f]) for f in std.objectFields(all) },
  finish: { [slot]: stone for slot in ['skin', 'underwear', 'hair', 'eye', 'white', 'mouth'] },
};
// A compound part in stone, its rims darker.
local carved(id, massKg, pieces) =
  h.compound(id, massKg, pieces, {}).parts[0] + { id: id, ports: portsOf(id), finish: { [slot]: tone(slot) for slot in std.set([p.slot for p in pieces]) } };
// A plate row's pieces at the statue's size, in the frame of the segment it was fitted to.
local platePieces(row) = h.scaled(std.parseJson([r for r in plate if r.id == row][0].parts[0].params.pieces), k);
// A core along a limb's axis, life-size, filling where the plate's lames part over the missing segment.
local core(id, radius, top, bottom) = h.turned(id, 'core', 'y', [[0, 0], [0, radius * k], [(top - bottom) * k, radius * k], [(top - bottom) * k, 0]], [0, bottom * k, 0]);

// The sword hangs from the palm, its pommel's top under the hand and its point on the plinth; its blade's flat lies
// across x.
local sword =
  local below = frames.sword.origin[1] - plinthTop;
  local pommel = 0.03 * k, hilt = 0.11 * k, guard = 0.03 * k, guardHalf = 0.13 * k, half = 0.034 * k, edge = 0.009 * k, point = 0.16 * k;
  local hiltTop = -pommel * 1.8, guardTop = hiltTop - hilt, bladeTop = guardTop - guard;
  [
    h.ball('pommel', 'trim', pommel, 0, -pommel, 0),
    h.turned('grip', 'hilt', 'y', [[0, 0], [0, 0.016 * k], [hilt + pommel, 0.016 * k], [hilt + pommel, 0]], [0, guardTop, 0]),
    h.box('guard', 'trim', [-0.02 * k, bladeTop, -guardHalf], [0.02 * k, guardTop, guardHalf]),
    h.prism('blade', 'blade', 'x', [[bladeTop, -half], [bladeTop, half], [-below + point, half * 0.75], [-below, 0], [-below + point, -half * 0.75]], -edge, edge),
    h.prism('fuller', 'trim', 'x', [[bladeTop - 0.02, -half * 0.22], [bladeTop - 0.02, half * 0.22], [-below + point * 1.6, half * 0.12], [-below + point * 1.6, -half * 0.12]], -edge - 0.003, edge + 0.003),
  ];

// The heater shield, its back `standoff` off the palm on a grip block so the arm's plate clears it, its face out on
// +x and its point on the plinth.
local shield =
  local standoff = (0.105 - arm.palmThickness / 2) * k, thick = 0.035 * k, rim = 0.045 * k, proud = 0.012 * k;
  local above = 0.24 * k, half = 0.3 * k;
  local lean = rot.apply(frames.shield.turn, [1, 0, 0])[1];
  local below = (frames.shield.origin[1] - plinthTop + standoff * lean) / rot.apply(frames.shield.turn, [0, 1, 0])[1];
  local shoulderDrop = 0.42;
  // The outline in the shield's face, as [height, across]: a flat top, straight sides, then arcs to the point.
  local arc(i, side) =
    local a = i / 6;
    [above - (above + below) * (shoulderDrop + (1 - shoulderDrop) * a), side * half * std.cos(a * 3.141592653589793 / 2)];
  local outline = [[above, half], [above, -half]] + [arc(i, -1) for i in std.range(0, 5)] + [[-below, 0]] + [arc(i, 1) for i in std.reverse(std.range(0, 5))];
  local n = std.length(outline);
  local centre = [above - (above + below) * 0.4, 0];
  local inner(p) = [centre[0] + (p[0] - centre[0]) * (1 - rim / half), centre[1] + (p[1] - centre[1]) * (1 - rim / half)];
  local face = standoff + thick;
  [
    h.box('grip-block', 'strap', [0, -0.03 * k, -0.03 * k], [standoff, 0.03 * k, 0.03 * k]),
    h.prism('board', 'face', 'x', outline, standoff, face),
  ] + [
    // The rim, one raised strip along each edge.
    h.prism('rim-%d' % i, 'trim', 'x', [outline[i], outline[(i + 1) % n], inner(outline[(i + 1) % n]), inner(outline[i])], face - 0.002, face + proud)
    for i in std.range(0, n - 1)
  ] + [
    // A raised chevron across the field, its arms meeting at the top.
    local apex = above - 0.1 * k, foot = above - 0.44 * k, w = 0.07 * k;
    h.prism('chevron-%d' % side, 'trim', 'x', [[apex, 0], [apex - w, 0], [foot - w, side * (half - rim)], [foot, side * (half - rim)]], face - 0.002, face + proud)
    for side in [-1, 1]
  ];

// The plinth, its front on +z.
local plinthPieces =
  local step(id, slot, s, y0) = h.box(id, slot, [-s.width / 2, y0, -s.depth / 2], [s.width / 2, y0 + s.height, s.depth / 2]);
  local m = plinth.moulding, d = plinth.die, p = plinth.panel;
  local dieTop = plinth.base.height + d.height;
  [
    step('base', 'plinth', plinth.base, 0),
    step('die', 'plinth', d, plinth.base.height),
    step('cornice', 'plinth', plinth.cornice, dieTop),
    h.box('plinth-foot', 'moulding', [-d.width / 2 - m.proud, plinth.base.height, -d.depth / 2 - m.proud], [d.width / 2 + m.proud, plinth.base.height + m.height, d.depth / 2 + m.proud]),
    h.box('plinth-neck', 'moulding', [-d.width / 2 - m.proud, dieTop - m.height, -d.depth / 2 - m.proud], [d.width / 2 + m.proud, dieTop, d.depth / 2 + m.proud]),
  ] + [
    // A raised blank panel on each face, left for a name.
    local y0 = plinth.base.height + m.height + p.inset * 0.5, y1 = dieTop - m.height - p.inset * 0.5;
    local out = if face == 0 || face == 2 then 1 else -1;
    if face < 2 then
      local z = out * d.depth / 2;
      h.box('panel-%d' % face, 'moulding', [-d.width / 2 + p.inset, y0, std.min(z, z + out * p.proud)], [d.width / 2 - p.inset, y1, std.max(z, z + out * p.proud)])
    else
      local x = out * d.width / 2;
      h.box('panel-%d' % face, 'moulding', [std.min(x, x + out * p.proud), y0, -d.depth / 2 + p.inset], [std.max(x, x + out * p.proud), y1, d.depth / 2 - p.inset])
    for face in [0, 1, 2, 3]
  ];
local plinthKg =
  local volume(s) = s.width * s.depth * s.height;
  2400 * (volume(plinth.base) + volume(plinth.die) + volume(plinth.cornice));

// One side's arm: the pauldron, vambrace and the doll's bare hand.
local armParts(name) = [
  carved('pauldron-' + name, figureKg * 0.03, platePieces('armor_plate_worn_upper') + [core('core', 0.06, -0.12, -0.2)]),
  carved('vambrace-' + name, figureKg * 0.02, platePieces('armor_plate_worn_fore') + [core('core', 0.028, -0.2, -arm.foreLength - 0.005)]),
  segment('palm-' + name, 'avatarArm', armMeasures, { segment: 'palm' }, 0.006),
] + [
  segment(hand.thumbPart(b) + '-' + name, 'avatarArm', armMeasures, { segment: 'thumb', phalanx: b }, 0.0005)
  for b in std.range(0, hand.thumbBones - 1)
] + [
  segment(hand.part(hand.fingers[i], b) + '-' + name, 'avatarArm', armMeasures, { segment: 'finger', finger: hand.fingers[i], phalanx: b }, 0.0002)
  for i in std.range(0, std.length(hand.fingers) - 1)
  for b in std.range(0, hand.phalanges - 1)
];

// One side's leg: the doll's thigh, the greave with the sabaton's shaft, and the sabaton.
local legParts(name) = [
  segment('thigh-' + name, 'avatarLeg', legMeasures, { segment: 'thigh' }, 0.1),
  carved('greave-' + name, figureKg * 0.05, platePieces('legguard_plate_worn_shin') + [p { id: 'shaft-' + p.id } for p in platePieces('sabaton_plate_worn_shaft')]),
  carved('sabaton-' + name, figureKg * 0.02, platePieces('sabaton_plate_worn_foot')),
];

[
  {
    id: 'warrior_statue',
    title: 'Warrior statue',
    exportMass: 'parts',
    parts: [
      carved('plinth', plinthKg, plinthPieces) + { finish: { plinth: darkStone, moulding: stone } },
      carved('harness', figureKg * 0.5, platePieces('armor_plate_worn_body')),
      segment('pelvis', 'bust', bustMeasures, { segment: 'pelvis' }, 0.14),
      carved('armet', figureKg * 0.03, platePieces('helmet_plate_armet')),
      carved('sword', 60, sword),
      carved('shield', 140, shield),
    ] + armParts('left') + armParts('right') + legParts('left') + legParts('right'),
    connections: [{ from: '%s.%s' % [l[0], l[1]], to: '%s.%s' % [l[1], l[0]] } for l in links],
    voxelGrain: 0.01,
    taxonomy: { category: 'structures', tags: { material: ['stone'], setting: ['medieval', 'fantasy'] }, keywords: ['statue', 'monument'] },
  },
]
