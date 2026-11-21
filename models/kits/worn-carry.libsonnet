// Shared under-layer measures keep outer shells snug without burying them; straps clear the vest and its pouches.
local carry(overJacket, suffix) =
local bust = import 'models/measures/bust.libsonnet';
local jacket = import 'models/measures/jacket.libsonnet';
local wornFit = import 'packages/thing-authoring-tool/worn-fit.libsonnet';
local bags = import 'models/measures/bags.libsonnet';
local worn = import 'packages/thing-authoring-tool/worn-taxonomy.libsonnet';
// The ground rows these shells reuse the titles of.
local ground = import 'models/catalogue/sets/clothing-bags.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local box(id, slot, min, max) = { id: id, kind: 'box', slot: slot, min: min, max: max };
local mirrored(id, slot, xs, ys, zs) = [
  box('%s_left' % id, slot, [xs[0], ys[0], zs[0]], [xs[1], ys[1], zs[1]]),
  box('%s_right' % id, slot, [-xs[1], ys[0], zs[0]], [-xs[0], ys[1], zs[1]]),
];
// `mirrored` for a strap lying over the trapezius between its slope set out by `rises[0]` and `rises[1]`, and for one
// hanging from the slope set out by `rise` down to `foot`.
local sloped(id, slot, xs, zs, rises) = [
  wornFit.slopeBand('%s_left' % id, slot, xs, zs, rises),
  wornFit.slopeBand('%s_right' % id, slot, [-xs[1], -xs[0]], zs, rises),
];
local slopedHung(id, slot, xs, zs, foot, rise) = [
  wornFit.slopeHung('%s_left' % id, slot, xs, zs, foot, rise),
  wornFit.slopeHung('%s_right' % id, slot, [-xs[1], -xs[0]], zs, foot, rise),
];

local level(bottom, height, width, depth, chamfer) = {
  y: [bottom, bottom + height], step: bottom, hx: width / 2, hz: depth / 2, c: chamfer / 2,
};
local shell = wornFit.torsoLevels(jacket.layer);
// `step` is where a level stands out of the one below it, which on a shell is the foot it laps down to.
local shellLevel(l) = { y: l.y, step: std.get(l, 'foot', l.y[0]), hx: l.width / 2, hz: l.depth / 2, c: l.chamfer };
local torso = if overJacket then {
  pelvis: shellLevel(shell.pelvis),
  waist: shellLevel(shell.waist),
  ribs: shellLevel(shell.ribs),
  chest: shellLevel(shell.chest),
} else {
  pelvis: level(0, bust.pelvisHeight, bust.pelvisWidth, bust.pelvisDepth, bust.torsoChamfer),
  waist: level(self.pelvis.y[1], bust.waistHeight, bust.waistWidth, bust.waistDepth, bust.torsoChamfer),
  ribs: level(self.waist.y[1], bust.ribHeight, bust.ribWidth, bust.ribDepth, bust.torsoChamfer),
  chest: level(self.ribs.y[1], bust.chestHeight, bust.chestWidth, bust.chestDepth, bust.chestChamfer),
};
// How far the shoulders gear lies on stand off the body's: over the jacket, its shell's top.
local rise = if overJacket then shell.chest.rise else 0;
local grain = 0.004;
// A sample just below the garment's outward step can fill a cell above it, and the body draws its own step on its own
// coarser voxels, so a step out, from the narrow waist to the ribs and from the ribs to the chest, lies on a voxel face
// at or below both, and below where the level above steps out.
local onGrain(y, g) = std.floor(y / g) * g;
local stepAt(y) = onGrain(onGrain(y, bust.voxelGrain), grain);
local waistTop = stepAt(torso.ribs.step);
local ribsTop = stepAt(torso.chest.step);

// Worn on the player body, over the jacket in the `_jacket` variants. A worn item's title is its garment's or bag's,
// with the variant's own label after it.
local variantLabel = if overJacket then 'over jacket' else 'worn';
local variantTitle(title) = title + ', ' + variantLabel;
local tag(category, slot, material) = {
  category: category,
  tags: { slot: [slot], material: [material], setting: ['modern'], fit: [if overJacket then 'over-jacket' else 'worn'] },
};

// Clearances must exceed the under-layer's exported surface, including pockets and fasteners, not just its slab.
local fit = {
  vest: [0.012, 0.02],
  stabVest: [0.012, 0.024],
  vestWaist: self.vest,
  stabVestWaist: self.stabVest,
  belt: [0.012, 0.02],
  packStrap: [0.028, 0.036],
  // A pack strap runs over each shoulder in this lane, between the collar and the deltoid.
  packStrapLane: [wornFit.collarHalf + 0.015, wornFit.collarHalf + 0.045],
  // A pack's shoulder straps end at the front this height, below the ribs.
  packStrapBottom: torso.ribs.y[0] - 0.04,
  // A vest's shoulder straps, between the collar and the deltoid.
  vestStrapLane: [wornFit.collarHalf + 0.01, wornFit.deltoid.x - wornFit.deltoid.radius - 0.015],
  // A vest's hem clears the top of a fanny pack's pouch.
  vestBottom: self.fannyPackBottom + bags.fanny_pack.height + 0.01,
  // A belt rides on the pelvis, below the step in to the waist.
  beltBand: [bust.pelvisHeight - 0.03, bust.pelvisHeight - 0.005],
  fannyPackBottom: self.beltBand[0] - 0.05,
  // A vest's pouches: the low pair on the waist under the ribs, the chest pair just up the chest.
  pouchLow: [waistTop - 0.1, waistTop - 0.01],
  pouchChest: [torso.chest.y[0] + 0.01, torso.chest.y[0] + 0.1],
  // A stab vest's side straps close its flanks just under the ribs.
  sideStraps: [[waistTop - 0.09, waistTop - 0.06], [waistTop - 0.04, waistTop - 0.01]],
  slingClearance: 0.008,
  slingInset: 0.02,
} + if overJacket then {
  vest: [0.02, 0.028],
  stabVest: [0.02, 0.032],
  vestWaist: [0.03, 0.038],
  stabVestWaist: [0.03, 0.042],
  belt: [0.03, 0.038],
  packStrap: [0.04, 0.048],
} else {};

// The torso's plan outline at a level, set out by `o`; a y prism's profile is (z, x). Setting a chamfered corner out
// by `o` moves its cut back by `o (2 - sqrt 2)`, so the outline stays parallel.
local octagon(l, o) =
  local hx = l.hx + o;
  local hz = l.hz + o;
  local c = l.c + o * (2 - std.sqrt(2));
  [[-hz + c, -hx], [hz - c, -hx], [hz, -hx + c], [hz, hx - c], [hz - c, hx], [-hz + c, hx], [-hz, hx - c], [-hz, -hx + c]];
// The outline's sides, numbered from the wearer's right side: 0 right, 1 to 3 the front, 4 left, 5 to 7 the back.
local SIDES = { all: std.range(0, 7), front: [1, 2, 3], back: [5, 6, 7], open: [1, 2, 3, 5, 6, 7], flanks: [0, 4] };
local ring(id, slot, l, offsets, heights, sides) =
  local inner = octagon(l, offsets[0]);
  local outer = octagon(l, offsets[1]);
  [
    {
      id: '%s_%d' % [id, i], kind: 'prism', slot: slot, axis: 'y',
      profile: [inner[i], outer[i], outer[(i + 1) % 8], inner[(i + 1) % 8]],
      start: heights[0], end: heights[1],
    }
    for i in sides
  ];

// A vest's shell from its hem to over the shoulders. The arms hang close beside the ribs and chest, so the shell is
// open at the flanks there; `flanks` names the waist sides that close it below them.
local vestShell(id, slot, offsets, waistOffsets, bottom, flanks) =
  ring(id + '_waist', slot, torso.waist, waistOffsets, [bottom, waistTop], SIDES.open + flanks)
  + ring(id + '_ribs', slot, torso.ribs, offsets, [waistTop, ribsTop], SIDES.open)
  + [
    piece { clip: wornFit.trapezius(rise + offsets[1]) }
    for piece in ring(id + '_chest', slot, torso.chest, offsets, [ribsTop, torso.chest.y[1] + offsets[1]], SIDES.open)
  ]
  // Shoulder straps join the front and back panels over the trapezius, clear of the collar and the deltoids.
  + sloped(id + '_shoulder', slot, fit.vestStrapLane, [-(torso.chest.hz + offsets[1]), torso.chest.hz + offsets[1]],
           [rise + offsets[0], rise + offsets[1]]);

local utilityVest =
  local front = torso.waist.hz + fit.vestWaist[1];
  local chestFront = torso.chest.hz + fit.vest[1];
  // A pouch with a flap over its top, standing out from the shell; the four pouches are the item's four pockets.
  local pouch(id, xs, ys, z, depth) =
    mirrored(id, 'trim', xs, ys, [z, z + depth])
    + mirrored(id + '_flap', 'body', [xs[0] - 0.003, xs[1] + 0.003], [ys[1] - 0.025, ys[1] + 0.004], [z + depth, z + depth + 0.004]);
  vestShell('vest', 'body', fit.vest, fit.vestWaist, fit.vestBottom, SIDES.flanks)
  // The pouches keep inside the pack straps' lane, so a pack worn over the vest clears them.
  + pouch('pouch_low', [0.015, fit.packStrapLane[0] - 0.01], fit.pouchLow, front + 0.001, 0.034)
  + pouch('pouch_chest', [0.03, fit.packStrapLane[0] - 0.01], fit.pouchChest, chestFront + 0.001, 0.024);

local stabVest =
  vestShell('panel', 'body', fit.stabVest, fit.stabVestWaist, fit.vestBottom, [])
  // Side straps close the open flanks at the waist, clear of the hanging arms.
  + ring('side_strap_low', 'trim', torso.waist, [fit.stabVestWaist[0], fit.stabVestWaist[0] + 0.006], fit.sideStraps[0], SIDES.flanks)
  + ring('side_strap_high', 'trim', torso.waist, [fit.stabVestWaist[0], fit.stabVestWaist[0] + 0.006], fit.sideStraps[1], SIDES.flanks);

// A pack's shoulder straps: down the front to their buckles, over each shoulder, and down the back to the pack.
local packStraps(backTo) =
  local o = fit.packStrap;
  local front = [torso.chest.hz + o[0], torso.chest.hz + o[1]];
  local back = [-(torso.chest.hz + o[1]), -(torso.chest.hz + o[0])];
  slopedHung('strap_front', 'strap', fit.packStrapLane, front, fit.packStrapBottom, rise + o[1])
  + sloped('strap_over', 'strap', fit.packStrapLane, [back[0], front[1]], [rise + o[0], rise + o[1]])
  + slopedHung('strap_back', 'strap', fit.packStrapLane, back, backTo, rise + o[1])
  + mirrored('buckle', 'trim', [fit.packStrapLane[0] - 0.004, fit.packStrapLane[1] + 0.004],
             [fit.packStrapBottom - 0.012, fit.packStrapBottom + 0.012], [front[1], front[1] + 0.008]);

// A bag hangs from a socket on the straps; its own model's back panel, with its straps, faces the wearer.
local bagSocket(pos, up) = { id: 'bag', mount: 'assembly-joint', gender: 'female', pos: pos, normal: [0, -1, 0], up: up, required: true };
local bagPin(up) = { id: 'bag', mount: 'assembly-joint', gender: 'male', pos: [0, 0, 0], normal: [0, 1, 0], up: up, required: true };
local backpack(id, massKg, bottom) =
  local d = bags[id];
  local panel = -(torso.chest.hz + fit.packStrap[1] + d.strapWidth / 2);
  {
    id: id + '_worn' + suffix,
    title: variantTitle(worn.groundTitle(ground, id)),
    exportMass: 'parts',
    voxelGrain: grain,
    taxonomy: tag('containers', 'back', 'fabric'),
    parts: [
      {
        id: 'straps', family: 'compound', massKg: 0.1,
        params: params({ pieces: packStraps(bottom + d.height * 0.6) }),
        finish: { strap: bags.finish[id].trim, trim: 'polymer-black' },
        ports: [bagSocket([0, bottom, panel - d.depth / 2], [0, 0, 1])],
      },
      { id: 'bag', family: 'bag', massKg: massKg, params: params(d), finish: bags.finish[id], ports: [bagPin([0, 0, 1])] },
    ],
    connections: [{ from: 'straps.bag', to: 'bag.bag' }],
  };

local fannyPack =
  local d = bags.fanny_pack;
  local beltOuter = torso.pelvis.hz + fit.belt[1];
  {
    id: 'fanny_pack_worn' + suffix,
    title: variantTitle(worn.groundTitle(ground, 'fanny_pack')),
    exportMass: 'parts',
    voxelGrain: grain,
    taxonomy: tag('containers', 'waist', 'fabric'),
    parts: [
      {
        id: 'belt', family: 'compound', massKg: 0.05,
        params: params({ pieces: ring('belt', 'strap', torso.pelvis, fit.belt, fit.beltBand, SIDES.all) }),
        finish: { strap: bags.finish.fanny_pack.trim },
        // Turned to face out from the belly, so the pouch's back panel lies on the belt.
        ports: [bagSocket([0, fit.fannyPackBottom, beltOuter + d.depth / 2], [0, 0, 1])],
      },
      { id: 'bag', family: 'bag', massKg: 0.15, params: params(d), finish: bags.finish.fanny_pack, ports: [bagPin([0, 0, -1])] },
    ],
    connections: [{ from: 'belt.bag', to: 'bag.bag' }],
  };

local wornAtom(id, title, massKg, pieces, finish, taxonomy=null) = {
  id: id + suffix,
  title: variantTitle(title),
  exportMass: 'parts',
  voxelGrain: grain,
  parts: [{ id: 'shell', family: 'compound', massKg: massKg, params: params({ pieces: pieces }), finish: finish, ports: [] }],
  connections: [],
} + (if taxonomy == null then {} else { taxonomy: taxonomy });

// The sling's strap over the right deltoid: a pad across its top, a short tab over its front, and a leg down its back
// to the slung gun's stock. Its foot meets the gun where
// https://github.com/roobie/skelly, `packages/deadvox/src/content/base/models-firearms.libsonnet`, `slung`, hangs it.
local sling =
  local deltoidX = if overJacket then torso.chest.hx - fit.slingInset else wornFit.deltoid.x;
  // Over the jacket the strap spans the shell's whole depth; on the body, the deltoid's.
  local mid = if overJacket then 0 else wornFit.deltoid.z;
  local half = if overJacket then torso.chest.hz + fit.slingClearance else wornFit.deltoid.radius;
  local xs = [-deltoidX - 0.012, -deltoidX + 0.012];
  local deltoidTop = wornFit.shoulderY(xs, rise) + (if overJacket then fit.slingClearance else 0);
  local pad = [deltoidTop + 0.004, deltoidTop + 0.012];
  [
    box('pad', 'strap', [xs[0], pad[0], mid - half - 0.014], [xs[1], pad[1], mid + half + 0.014]),
    // The tab stays above where a raised arm's top swings.
    box('front', 'strap', [xs[0], deltoidTop - 0.008, mid + half + 0.006], [xs[1], pad[1], mid + half + 0.014]),
    // The leg keeps behind the arm's backswing.
    box('back', 'strap', [xs[0], 0.44, mid - half - 0.024], [xs[1], pad[1], mid - half - 0.016]),
    box('foot', 'trim', [xs[0] + 0.004, 0.42, -0.19], [xs[1] - 0.004, 0.44, mid - half - 0.016]),
  ];

[
  wornAtom('utility_vest_worn', 'Utility vest', 0.9, utilityVest, { body: 'cloth-olive-drab', trim: 'cord-olive' }, tag('clothing', 'torso', 'fabric')),
  wornAtom('stab_vest_worn', 'Stab vest', 2.5, stabVest, { body: 'paint-police-blue', trim: 'polymer-black' }, tag('armour', 'torso', 'fabric')),
  backpack('school_backpack', 0.6, 0.15),
  backpack('hiking_backpack', 1.4, 0.06),
  fannyPack,
  wornAtom('weapon_sling_worn', 'Weapon sling', 0.15, sling, { strap: 'cord-olive', trim: 'steel-grey' }) + {
    taxonomy: { category: 'weapon-parts', tags: { slot: ['back'], fit: [if overJacket then 'over-jacket' else 'worn'] } },
  },
];
carry(false, '') + carry(true, '_jacket')
