local h = import 'packages/thing-authoring-tool/compound.libsonnet';
// A spherical cap of a ball of radius `r` centred at `c`, `depth` deep, facing `sign` along `axis`, lifted `lift`
// proud of the ball so its colour shows: a volleyball's panel groups.
local cap(id, slot, r, depth, axis, sign, c, lift=0.0015, steps=6) =
  local R = r + lift;
  local pts = [
    local t = R - depth * i / steps;
    [sign * t, std.sqrt(std.max(0, R * R - t * t))]
    for i in std.range(0, steps)
  ];
  h.turned(id, slot, axis, (if sign > 0 then std.reverse([[sign * R, 0]] + pts + [[sign * (R - depth), 0]]) else [[sign * R, 0]] + pts + [[sign * (R - depth), 0]]), c);
// An upright limb, tapering from r0 at y0 to r1 at y1.
local limbY(id, slot, r0, r1, y0, y1, x, z) = h.turned(id, slot, 'y', [[0, 0], [0, r0], [y1 - y0, r1], [y1 - y0, 0]], [x, y0, z]);
local dollFinish = { flesh: 'latex-pale', hair: 'leather-chestnut', dress: 'cloth-red', trim: 'lace-white', shoe: 'leather-patent', grille: 'plastic-charcoal', button: 'plastic-yellow', eye: 'gem-blue', mouth: 'paint-red' };
// A shop-window mannequin: the player's own bust, arms and legs in one white plastic, standing on a round steel
// stand whose pole rises behind the legs into the small of the back. Front on +z. Each part mates at the joint the
// player's figure poses it about, so the figure matches the player's. `doll` is a part held against the waist, its
// back on the belly, with the forearms bent forward and in under it; `masses` gives the stand's and the doll's mass.
local bust = import 'models/measures/bust.libsonnet';
local band = import 'models/head-band.libsonnet';
local bustMeasures = bust { hairRing: band.hairRing };
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
local plastic = 'plastic-gloss-white';
local socket(id, pos, normal=[0, -1, 0], up=[0, 0, 1]) = { id: id, mount: 'assembly-joint', gender: 'female', pos: pos, normal: normal, up: up, required: true };
local pin(id, normal=[0, 1, 0], up=[0, 0, 1], pos=[0, 0, 0]) = { id: id, mount: 'assembly-joint', gender: 'male', pos: pos, normal: normal, up: up, required: true };
local segment(id, family, measures, segment, massKg, slots, ports) = {
  id: id, family: family, massKg: massKg, ports: ports,
  params: { [k]: std.toString((measures { segment: segment })[k]) for k in std.objectFields(measures { segment: segment }) },
  finish: { [slot]: plastic for slot in slots },
};
local shoulderX = bust.chestWidth / 2 + bust.shoulderWidth / 2 - bust.deltoidInset;
local shoulderY = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight - bust.shoulderHeight / 2 - bust.deltoidDrop;
local hipX = bust.pelvisWidth / 4;
local hipY = bust.pelvisHeight * 0.12;
local plate = 0.012;
local mannequin(id, doll=null, dollMassKg=0, standMassKg=2) =
  local sides = [['left', 1], ['right', -1]];
  // Held, the forearm runs forward and in from the elbow, thumb up; hanging, it falls straight.
  local forearm(side) = if doll == null then {} else { normal: [-side * 0.35, 0, std.sqrt(1 - 0.35 * 0.35)], up: [0, 1, 0] };
  local backZ = -bust.pelvisDepth / 2;
  local stand = h.compound('stand', standMassKg, [
    h.disc('base', 'steel', 0.22, 0, plate),
    h.disc('pole', 'steel', 0.012, plate, plate + leg.length + 0.05, 0, backZ - 0.03),
    h.box('bracket', 'steel', [-0.02, plate + leg.length + 0.01, backZ - 0.04], [0.02, plate + leg.length + 0.05, backZ + 0.01]),
  ], {}).parts[0] + { id: 'stand', finish: { steel: 'steel-grey' }, ports: [socket('pelvis', [0, plate + leg.length - hipY, 0], [0, 1, 0])] };
  {
    id: id,
    exportMass: 'parts',
    parts: [
      stand,
      segment('pelvis', 'bust', bustMeasures, 'pelvis', 1.2, ['underwear'], [pin('stand', [0, -1, 0]), pin('pelvis')]
        + [socket('hip-' + s[0], [s[1] * hipX, hipY, 0]) for s in sides]),
      segment('torso', 'bust', bustMeasures, 'torso', 4, ['skin'], [socket('pelvis', [0, 0, 0]), socket('neck', [0, 0, 0])]
        + [socket('shoulder-' + s[0], [s[1] * shoulderX, shoulderY, 0]) for s in sides]
        + (if doll == null then [] else [socket('doll', [0, bust.pelvisHeight + 0.02, bust.waistDepth / 2], [0, 0, 1], [0, 1, 0])])),
      segment('neck', 'bust', bustMeasures, 'neck', 0.2, ['skin'], [pin('neck'), socket('head', [0, bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight + bust.neckHeight + bust.neckOverlap, 0], [0, 1, 0])]),
      // Faceless: the eyes, mouth and moulded hair are the same plastic as the rest.
      segment('head', 'bust', bustMeasures, 'head', 1, ['skin', 'hair', 'eye', 'white', 'mouth'], [pin('head', [0, -1, 0])]),
    ] + std.flattenArrays([[
      segment('upper-' + s[0], 'avatarArm', arm, 'upper', 0.45, ['skin'], [pin('shoulder'), socket('elbow', [0, -arm.upperLength, 0]) + forearm(s[1])]),
      segment('fore-' + s[0], 'avatarArm', arm, 'fore', 0.35, ['skin'], [pin('elbow'), socket('wrist', [0, -arm.foreLength, 0])]),
      segment('palm-' + s[0], 'avatarArm', arm, 'palm', 0.15, ['skin'], [pin('wrist'), socket('knuckles', [0, -arm.palmLength, 0]), socket('thumb', [0, -arm.palmLength * arm.thumbRootShare, arm.palmWidth / 2 - arm.thumbInset])]),
      segment('fingers-' + s[0], 'avatarArm', arm, 'fingers', 0.04, ['skin'], [pin('knuckles')]),
      segment('thumb-' + s[0], 'avatarArm', arm, 'thumb', 0.01, ['skin'], [pin('thumb')]),
      segment('thigh-' + s[0], 'avatarLeg', leg, 'thigh', 1, ['skin'], [pin('hip'), socket('knee', [0, -leg.thighLength, 0])]),
      segment('shin-' + s[0], 'avatarLeg', leg, 'shin', 0.6, ['skin'], [pin('knee'), socket('ankle', [0, leg.shoeHeight - leg.length + leg.thighLength, 0])]),
      segment('foot-' + s[0], 'avatarLeg', leg, 'foot', 0.2, ['skin'], [pin('ankle')]),
    ] for s in sides]) + (if doll == null then [] else [
      h.compound('doll', dollMassKg, doll, {}).parts[0] + { id: 'doll', finish: dollFinish, ports: [pin('back', [0, 0, -1], [0, 1, 0], [0, 0, -0.06])] },
    ]),
    connections: [
      { from: 'stand.pelvis', to: 'pelvis.stand' },
      { from: 'torso.pelvis', to: 'pelvis.pelvis' },
      { from: 'torso.neck', to: 'neck.neck' },
      { from: 'neck.head', to: 'head.head' },
    ] + std.flattenArrays([[
      { from: 'torso.shoulder-%s' % s[0], to: 'upper-%s.shoulder' % s[0] },
      { from: 'upper-%s.elbow' % s[0], to: 'fore-%s.elbow' % s[0] },
      { from: 'fore-%s.wrist' % s[0], to: 'palm-%s.wrist' % s[0] },
      { from: 'palm-%s.knuckles' % s[0], to: 'fingers-%s.knuckles' % s[0] },
      { from: 'palm-%s.thumb' % s[0], to: 'thumb-%s.thumb' % s[0] },
      { from: 'pelvis.hip-%s' % s[0], to: 'thigh-%s.hip' % s[0] },
      { from: 'thigh-%s.knee' % s[0], to: 'shin-%s.knee' % s[0] },
      { from: 'shin-%s.ankle' % s[0], to: 'foot-%s.ankle' % s[0] },
    ] for s in sides]) + (if doll == null then [] else [{ from: 'torso.doll', to: 'doll.back' }]),
    voxelGrain: 0.01,
  };
// A child's doll 0.32 m tall standing on its feet, front on +z, with a round speaker grille and a press button on
// its chest. `x`, `y`, `z` and `k` place and scale it, so the decoy's mannequin can carry one in its arms.
local doll(x=0, y=0, z=0, k=1) = h.scaled([
  h.box('shoe-l', 'shoe', [-0.045, 0, -0.025], [-0.01, 0.02, 0.035]),
  h.box('shoe-r', 'shoe', [0.01, 0, -0.025], [0.045, 0.02, 0.035]),
  limbY('leg-l', 'flesh', 0.014, 0.017, 0.02, 0.12, -0.028, 0),
  limbY('leg-r', 'flesh', 0.014, 0.017, 0.02, 0.12, 0.028, 0),
  h.turned('dress', 'dress', 'y', [[0, 0], [0, 0.075], [0.02, 0.07], [0.08, 0.045], [0.12, 0.042], [0.12, 0]], [0, 0.10, 0]),
  h.box('collar', 'trim', [-0.035, 0.212, -0.03], [0.035, 0.222, 0.035]),
  h.disc('grille', 'grille', 0.016, 0, 0.004, 0, 0) + { axis: 'z', profile: [[0, 0], [0, 0.016], [0.004, 0.016], [0.004, 0]], origin: [0, 0.18, 0.043] },
  h.disc('button', 'button', 0.006, 0, 0.003, 0, 0) + { axis: 'z', profile: [[0, 0], [0, 0.006], [0.004, 0.006], [0.004, 0]], origin: [0, 0.145, 0.058] },
  limbY('arm-l', 'flesh', 0.012, 0.014, 0.12, 0.215, -0.055, 0.005),
  limbY('arm-r', 'flesh', 0.012, 0.014, 0.12, 0.215, 0.055, 0.005),
  limbY('neck', 'flesh', 0.016, 0.016, 0.215, 0.235, 0, 0),
  h.ball('head', 'flesh', 0.05, 0, 0.27, 0.005),
  h.ball('hair', 'hair', 0.053, 0, 0.285, -0.008, 0.95),
  h.box('eye-l', 'eye', [-0.026, 0.272, 0.046], [-0.012, 0.284, 0.056]),
  h.box('eye-r', 'eye', [0.012, 0.272, 0.046], [0.026, 0.284, 0.056]),
  h.box('mouth', 'mouth', [-0.010, 0.246, 0.046], [0.010, 0.252, 0.054]),
], k);
[
  // A 42.7 mm golf ball: a white cover with its shallow dimples drawn as grey dots flush with the cover.
  h.compound('golf_ball', 0.043, [
    h.ball('ball', 'cover', 0.0214, 0, 0.0214, 0),
  ] + [
    local a = 2 * std.pi * (i + j / 2) / 10, e = j * 0.55, r = 0.0204;
    h.box('dimple-%d-%d' % [i, j], 'dimple', [r * std.cos(e) * std.sin(a) - 0.001, 0.0214 + r * std.sin(e) - 0.001, r * std.cos(e) * std.cos(a) - 0.001],
          [r * std.cos(e) * std.sin(a) + 0.001, 0.0214 + r * std.sin(e) + 0.001, r * std.cos(e) * std.cos(a) + 0.001])
    for i in std.range(0, 9)
    for j in [-2, -1, 0, 1, 2]
  ], { cover: 'plastic-gloss-white', dimple: 'plastic-grey' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'recreation', tags: { material: ['plastic'], setting: ['modern'] } } },
  // A 70 mm wooden tee lying along x: a cupped head 11 mm across, a 4 mm shank and a point.
  h.compound('golf_tee', 0.00095, [
    h.turned('tee', 'wood', 'x', [[0, 0], [0, 0.0055], [0.004, 0.0055], [0.010, 0.0022], [0.060, 0.0020], [0.070, 0]], [-0.035, 0.0055, 0]),
  ], { wood: 'wood-birch' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'recreation', tags: { material: ['wood'] } } },
  // An indoor volleyball 210 mm across, its 18 panels grouped by colour: blue at the poles, yellow at the sides,
  // white between.
  h.compound('indoor_volleyball', 0.25, [
    // Shallow caps on a many-sided ball, so the blue and yellow panels never meet and the outline stays round.
    h.ball('ball', 'white', 0.105, 0, 0.105, 0, steps=12) + { sides: 24 },
  ] + [
    cap('cap-%s' % c[0], c[1], 0.105, 0.028, c[2], c[3], [0, 0.105, 0], steps=8) + { sides: 24 }
    for c in [['top', 'blue', 'y', 1], ['bottom', 'blue', 'y', -1], ['right', 'yellow', 'x', 1], ['left', 'yellow', 'x', -1]]
  ], { white: 'plastic-gloss-white', blue: 'plastic-blue', yellow: 'plastic-yellow' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'recreation', tags: { material: ['plastic'], setting: ['modern'] } } },
  // A white shop-window mannequin of the player's build on a round steel stand.
  mannequin('mannequin', standMassKg=2) + { taxonomy: { category: 'household', tags: { material: ['plastic'], setting: ['modern'] } } },
  // The same mannequin holding a talking doll against its waist, wired to sound off.
  mannequin('mannequin_decoy', doll(), 0.48, 2.52) + { taxonomy: { category: 'household', tags: { material: ['plastic'], setting: ['modern'] } } },
  // A 76 mm by 25 mm vulcanised rubber puck with a grey printed disc on its face.
  h.compound('puck', 0.13, [
    h.disc('puck', 'rubber', 0.038, 0, 0.0254),
    h.disc('print', 'print', 0.02, 0.0254, 0.0262),
  ], { rubber: 'rubber-black', print: 'plastic-grey' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'recreation', tags: { material: ['rubber'], setting: ['modern'] } } },
  // A nylon shuttlecock 90 mm tall standing on its cork base: a 25 mm domed cork and a 66 mm flared skirt.
  h.compound('shuttlecock', 0.0092, [
    h.turned('cork', 'cork', 'y', [[0, 0], [0, 0.007], [0.004, 0.0115], [0.010, 0.0125], [0.020, 0.0125], [0.020, 0]]),
    h.turned('band', 'band', 'y', [[0, 0], [0, 0.0128], [0.006, 0.0128], [0.006, 0]], [0, 0.014, 0]),
    h.turned('skirt', 'skirt', 'y', [[0, 0.009], [0, 0.0115], [0.070, 0.033], [0.070, 0.030], [0, 0.009]], [0, 0.020, 0]),
    h.turned('ring-a', 'ring', 'y', [[0, 0.016], [0, 0.0175], [0.003, 0.0185], [0.003, 0.017], [0, 0.016]], [0, 0.040, 0]),
    h.turned('ring-b', 'ring', 'y', [[0, 0.020], [0, 0.0215], [0.003, 0.0225], [0.003, 0.021], [0, 0.020]], [0, 0.052, 0]),
  ], { cork: 'cork', band: 'leather-white', skirt: 'plastic-gloss-white', ring: 'plastic-blue' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'recreation', tags: { material: ['plastic'], setting: ['modern'] } } },
  // A 370 mm by 250 mm foam kickboard, 35 mm thick, with a rounded nose at +z and two hand slots near it.
  h.compound('swimming_kickboard', 0.13, [
    h.prism('board', 'foam', 'y', [
      [-0.185, -0.125], [-0.185, 0.125], [0.10, 0.125], [0.145, 0.11], [0.175, 0.07], [0.185, 0.025], [0.185, -0.025], [0.175, -0.07], [0.145, -0.11], [0.10, -0.125],
    ], 0, 0.035),
    h.box('slot-l', 'slot', [-0.085, -0.0005, 0.08], [-0.035, 0.0355, 0.13]),
    h.box('slot-r', 'slot', [0.035, -0.0005, 0.08], [0.085, 0.0355, 0.13]),
    h.box('stripe', 'stripe', [-0.11, 0.035, -0.17], [0.11, 0.037, -0.15]),
  ], { foam: 'foam-orange', slot: 'plastic-charcoal', stripe: 'plastic-white' }) + { voxelGrain: 0.004 } + { taxonomy: { category: 'recreation', tags: { material: ['plastic'], setting: ['modern'] } } },
  // A 320 mm talking doll in a red dress, a speaker grille and press button on its chest.
  h.compound('talking_doll', 0.48, doll(), dollFinish) + { voxelGrain: 0.004 } + { taxonomy: { category: 'recreation', tags: { material: ['plastic'], setting: ['modern'] } } },
]
