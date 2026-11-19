local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// An oversized bolt carbine, about 0.94 m long and deep for its length: a slab receiver, an armoured barrel shroud
// nearly as deep as the receiver, a fat barrel ending in a slotted muzzle brake, a magazine of rocket bolts ahead of
// the grip and the family's skeleton stock. It comes with a straight box magazine or a rotary drum. Laid out with the
// muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z; the side view shows its profile.

local w = 0.055;  // half the receiver's width
local underside = 0.15;  // the receiver's underside, where the magazine seats
local top = 0.33;  // the receiver's top
local barrelY = 0.245;
local sightTop = 0.375;  // the height both sights' tops share

// The rocket bolts lie along the bore, so a magazine is as deep fore and aft as a bolt is long plus its walls. Its
// magwell starts where the family's feeds do.
local roundLength = 0.11;
local wall = 0.011;
local collar = 0.006;  // the magwell's lip behind and ahead of the magazine
local magBack = bolt.feedBack + collar;
local magFront = magBack + roundLength + 2 * wall;
local magTop = underside;

// The metal magwell collar either magazine seats in.
local magwell = h.prism('magwell', 'metal', 'z', [
  [magBack - collar, magTop], [magBack - collar, 0.136], [magBack, 0.128], [magFront, 0.128], [magFront + collar, 0.136], [magFront + collar, magTop],
], -0.049, 0.049);

// A straight box magazine square to the bore, with a bevelled brass base plate and a narrow slot cut into its right
// side, through which the brass of the stacked bolts shows. The slot is built round rather than cut, since pieces only
// add: the body stops short of the right face, and a skin around the slot makes up the face. The slot's floor is dark
// and the bolts stand just off it, below the face, so they read as inside the magazine rather than laid on it.
local magHalf = 0.045;
local magFoot = 0.012;
local slot = { back: 0.079, front: 0.107, bottom: 0.032, top: 0.12, depth: 0.008 };
local slotFloor = magHalf - slot.depth;
local skinBack = slotFloor - 0.004;
local boxMagazine = [
  h.prism('magazine', 'body', 'z', [[magBack, magFoot], [magFront, magFoot], [magFront, magTop], [magBack, magTop]], -magHalf, skinBack),
  box('mag-skin-back', 'body', [magBack, magFoot, skinBack], [slot.back, magTop, magHalf]),
  box('mag-skin-front', 'body', [slot.front, magFoot, skinBack], [magFront, magTop, magHalf]),
  box('mag-skin-below', 'body', [slot.back, magFoot, skinBack], [slot.front, slot.bottom, magHalf]),
  box('mag-skin-above', 'body', [slot.back, slot.top, skinBack], [slot.front, magTop, magHalf]),
  box('mag-slot', 'vent', [slot.back, slot.bottom, skinBack], [slot.front, slot.top, slotFloor]),
  magwell,
  h.prism('mag-base', 'trim', 'z', [
    [magBack - 0.004, 0.004], [magBack, 0], [magFront, 0], [magFront + 0.004, 0.004], [magFront + 0.004, 0.014], [magBack - 0.004, 0.014],
  ], -0.049, 0.049),
] + [
  box('round-%d' % i, 'round', [slot.back, 0.028 + i * 0.02, slotFloor], [slot.front, 0.04 + i * 0.02, slotFloor + 0.004])
  for i in [0, 1, 2, 3, 4]
];

// A rotary drum, a revolver cylinder hung on a neck below the magwell: its chambers lie along the bore around its
// axle, so it is as long as a box magazine is deep and holds more bolts. It runs a little past the magwell's front so
// it reads as the heavier feed. Brass bands bind it. Its front face is a raised cover plate with the spring's winding
// key on a hub, sized in whole voxels so each layer reads at the gun's grain.
local drumRadius = 0.069;
local drumY = magTop - 0.022 - drumRadius;
local drumLength = 0.139;
local drumFront = magBack + drumLength;
local onFace(id, slot, profile) = h.turned(id, slot, 'x', profile, [drumFront, drumY, 0]) + { sides: 8 };
local drumMagazine = [
  magwell,
  box('drum-neck', 'body', [magBack + 0.012, drumY + drumRadius - 0.01, -0.035], [magFront - 0.012, magTop, 0.035]),
  h.turned('drum', 'body', 'x', [[0, 0], [0, drumRadius - 0.006], [0.006, drumRadius], [drumLength - 0.006, drumRadius], [drumLength, drumRadius - 0.006], [drumLength, 0]], [magBack, drumY, 0]) + { sides: 8 },
] + [
  local x = if end == 'back' then magBack + 0.014 else drumFront - 0.024;
  h.turned('drum-band-%s' % end, 'trim', 'x', [[0, 0], [0, drumRadius + 0.003], [0.01, drumRadius + 0.003], [0.01, 0]], [x, drumY, 0]) + { sides: 8 }
  for end in ['back', 'front']
] + [
  onFace('drum-cover', 'metal', [[0, 0], [0, drumRadius - 0.014], [0.004, drumRadius - 0.014], [0.004, 0]]),
  onFace('drum-hub', 'body', [[0, 0], [0, 0.024], [0.008, 0.024], [0.012, 0.02], [0.012, 0]]),
  box('drum-key', 'trim', [drumFront + 0.012, drumY - 0.04, -0.008], [drumFront + 0.024, drumY + 0.04, 0.008]),
  box('drum-key-boss', 'metal', [drumFront + 0.012, drumY - 0.012, -0.012], [drumFront + 0.028, drumY + 0.012, 0.012]),
];

local carbine(id, massKg, magazine) =
  bolt.gun(id, massKg, 'rifle', bolt.receiver(0.17, underside, top, w, { front: 0.15, top: 0.35, halfWidth: 0.038 }) + [
    // Barrel shroud, an octagonal slab with vents along both sides and a brass band at its mouth.
    h.prism('shroud', 'body', 'x', [[0.17, -0.045], [0.17, 0.045], [0.19, 0.062], [0.30, 0.062], [0.32, 0.045], [0.32, -0.045], [0.30, -0.062], [0.19, -0.062]], 0.17, 0.38),
    h.prism('shroud-band', 'trim', 'x', [[0.165, -0.049], [0.165, 0.049], [0.187, 0.067], [0.303, 0.067], [0.325, 0.049], [0.325, -0.049], [0.303, -0.067], [0.187, -0.067]], 0.36, 0.38),
  ] + [
    box('vent-%d-%s' % [i, s], 'vent', [0.20 + i * 0.075, 0.215, if s == 'r' then 0.061 else -0.064], [0.25 + i * 0.075, 0.285, if s == 'r' then 0.064 else -0.061])
    for i in [0, 1]
    for s in ['l', 'r']
  ] + [
    // A fat barrel and a muzzle brake with three side ports and a dark bore.
    h.rod('barrel', 'metal', 0.03, 0.38, 0.43, barrelY) + { sides: 48 },  // round, as at the commit this was authored on; turned shapes default to eight sides
    h.prism('brake', 'metal', 'x', bolt.bevel(barrelY - 0.042, barrelY + 0.042, 0.046, 0.012), 0.43, 0.51),
    h.prism('brake-cap', 'metal', 'x', bolt.bevel(barrelY - 0.035, barrelY + 0.035, 0.04, 0.01), 0.51, 0.522),
  ] + [
    box('port-%d' % i, 'vent', [0.442 + i * 0.022, barrelY - 0.03, -0.0475], [0.456 + i * 0.022, barrelY + 0.03, 0.0475])
    for i in [0, 1, 2]
  ] + [
    box('bore', 'vent', [0.522, barrelY - 0.017, -0.017], [0.524, barrelY + 0.017, 0.017]),
  ] + magazine + bolt.grip(0.155) + bolt.stock(top, 0.045) + [
    // Sights: a rear block on the ridge and a front post over the shroud, a fin tapering from a broad foot to a narrow
    // tip level with the rear block's top, so the two line up.
    box('rear-sight', 'metal', [-0.12, 0.35, -0.02], [-0.07, sightTop, 0.02]),
    box('rear-notch', 'vent', [-0.11, 0.365, -0.004], [-0.08, sightTop + 0.0005, 0.004]),
    h.prism('front-post', 'metal', 'z', [[0.32, 0.316], [0.36, 0.316], [0.349, sightTop], [0.341, sightTop]], -0.01, 0.01),
    // Ejection port on the right side, with a chunky charging lever standing out of the bolt at its back end.
    box('ejection', 'vent', [0.03, 0.25, w], [0.12, 0.29, w + 0.002]),
    box('lever', 'metal', [0.03, 0.26, w], [0.07, 0.28, w + 0.03]),
    box('lever-knob', 'metal', [0.02, 0.253, w + 0.022], [0.08, 0.287, w + 0.036]),
  ] + [
    box('rivet-%d-%s' % [p[0], s], 'trim', [p[1] - 0.007, p[2] - 0.007, if s == 'r' then w else -w - 0.003], [p[1] + 0.007, p[2] + 0.007, if s == 'r' then w + 0.003 else -w])
    for p in [[0, -0.15, 0.18], [1, -0.15, 0.30], [2, 0.14, 0.18], [3, 0.14, 0.30]]
    for s in ['l', 'r']
  ], { round: 'brass' });

[
  carbine('bolt_carbine', 11.5, boxMagazine) + { title: 'Bolt carbine' },
  carbine('bolt_carbine_drum', 12.5, drumMagazine) + { title: 'Drum-fed bolt carbine' },
]
