local frame = import 'frame.libsonnet';
local k = import 'kit.libsonnet';
local box = k.box;
local prism = k.prism;
local s = import 'hearse.spec.libsonnet';
local vehicle = import 'hearse.placements.libsonnet';
local shape = (import 'car-shape.libsonnet')(s);
local lean = shape.tumble;
local deckTop = 0.6;
local deckFront = s.bRear - 0.18;
local deckRear = s.tailWaist;
local windowTop = s.roof - 0.03;
local coachTop = s.roof + 0.26;
local panelIn = s.glassOut - 0.03;
local panelOut = s.glassOut + 0.02;
// The tailgate's rake, followed by every piece stacked on the tail.
local rake(y) = s.tailWaist + s.dLean * (y - s.waist) / (s.roof - s.waist);
local hoodNose = shape.hood(shape.nose);
local grilleTop = hoodNose + 0.02;
// The grille stands clear of the bonnet's nose as it lifts.
local grilleBack = shape.nose + shape.bonnetSweep(grilleTop);
local vane = 0.0625;
local pleat = 0.0625;
// The drapes hang against the side glass's inner face (`car-body.libsonnet`, `paneZ`) and step in with it.
local glassIn = s.skin + 0.01 - 2 * shape.grain;
local hang(id, slot, x, y, depth) = shape.side(id, slot, [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]], [glassIn - depth, glassIn]);
local drape(id, from, count) = std.flattenArrays([
  hang(id + '_' + i, if i % 2 == 0 then 'cloth' else 'fold', [from + i * pleat, from + (i + 1) * pleat], [s.waist, windowTop], 0.03 + (i % 2) * 0.03)
  for i in std.range(0, count - 1)
]);
// The coffin deck lies between the rear arch liners (`car-body.libsonnet`, `archLiner`).
local deckHalf = 0.6;
// The partition stands over the floor's tunnel (`car-body.libsonnet`, `tunnel`).
local tunnelHalf = 0.12;
local tunnelTop = 0.45;
local landauX(t) = -2.42 + t * 0.96;
local landauY(t) = 1.25 + 0.14 * std.sin(t * 2 * std.pi);
local landauSteps = 8;
local landauOut(y) = panelOut - shape.inset(y);
local tailProfile(low, high) = [[rake(low), low], [rake(low) + 0.03, low], [rake(high) + 0.03, high], [rake(high), high]];
local tailPanel(id, slot, low, high, half) = shape.across(id, slot, tailProfile(low, high), half);
local glassLow = s.waist + 0.06;
local glassHigh = s.roof - 0.06;
local glassHalf = 0.26;
// A real hearse opens by the whole tail, so it lifts on pins at its head. The tail's sides step in a voxel at each band
// of the shell's tumble, beside pillars that step with them, so a point at a step's top that rose would cross into the
// pillar above. The pins therefore stand a millimetre behind the rake at the lowest step, where every point of the tail
// at or above a step lies forward of them and only sinks or falls back as it lifts. That is behind the shell roof's rear
// edge, so they hang from a brow on the coach roof, and arms carry the tail's head back to them.
local pinX = rake(shape.bandFoot(1)) - k.swingGap;
// The coach roof's foot, on top of the shell roof.
local brow = s.roof + 0.04;
local pinY = brow - k.grain - k.swingGap;
local pinZ = 0.7 * s.hatchSide;
// The tail's sides and foot slide past the shell's tail corners and over its rear panel as it lifts, and its skin's top
// reaches under the lowest pillar band, so they stand a millimetre off them: well under half a grain, so no cell between
// them empties.
local tailHalf = s.hatchSide - k.swingGap;
local tailFoot = s.rearSill + k.swingGap;
local skinTop = s.waist - k.swingGap;
frame.vehicleRows({ tags: { 'vehicle-body': ['car'] } }, std.filter(function(row) row.id != 'hearse_tailgate', (import 'car-body.libsonnet').rows('hearse', vehicle.title, s)) + [
  // The narrow rear glass, in a blind tail.
  local tailgatePins = k.hingePins('hinge', 'z', [pinX, pinY, pinZ], [pinX, pinY, -pinZ], 'bright');
  k.compound('hearse_tailgate', 22, [
    box('skin', 'paint', [s.rear + 0.05, tailFoot, -tailHalf], [s.tailWaist, skinTop, tailHalf]),
    box('handle', 'bright', [s.rear + 0.03, s.rearSill + 0.13, -0.16], [s.rear + 0.05, s.rearSill + 0.18, 0.16]),
  ] + tailPanel('foot', 'paint', s.waist, glassLow, s.hatchSide - 0.02)
  // The head drops away from the roof's underside as the gate lifts, so it stands a millimetre below it: well under half
  // a grain, so no cell between them empties.
  + tailPanel('head', 'paint', glassHigh, s.roof - k.swingGap, s.hatchSide - 0.02)
  + [prism('glass', 'glass', tailProfile(glassLow, glassHigh), [-glassHalf, glassHalf])]
  + k.bothSides(
    // Each band of the blind reaches under the pillar band above it, so it stops a millimetre short of that band's foot.
    shape.band('blind', 'paint', tailProfile(glassLow, glassHigh), function(inset) [glassHalf + 0.03, s.hatchSide - 0.02 - inset], gap=k.swingGap)
    + [
      prism('frame', 'bright', tailProfile(glassLow, glassHigh), [glassHalf, glassHalf + 0.03]),
      box('hinge_arm', 'bright', [pinX, glassHigh, pinZ - k.grain / 2], [rake(glassHigh) + 0.01, s.roof - k.swingGap, pinZ + k.grain / 2]),
    ]
  ) + tailgatePins, { paint: s.paint, glass: 'glass-clear', bright: 'steel-bright' }, motion=k.motion.hinge(tailgatePins, 'rear', s.tailgateOpen)) + { title: 'Hearse tailgate' },
  // The raised blind rear body: a roof that steps up behind the cab, solid quarters over the shell's glass and the bars across them.
  k.compound('hearse_coach', 90, [
    prism('roof', 'cover', [[rake(s.roof + 0.04), s.roof + 0.04], [0.14, s.roof + 0.04], [-0.26, coachTop], [rake(coachTop), coachTop]], [lean - panelOut, panelOut - lean]),
    box('brow', 'cover', [pinX - k.grain - 0.01, brow, lean - panelOut], [rake(brow) + 0.01, brow + 0.04, panelOut - lean]),
  ] + k.bothSides(
    shape.side('quarter', 'cover', [[rake(s.waist) + 0.08, s.waist], [s.cWaist, s.waist], [s.cWaist, windowTop], [rake(windowTop) + 0.08, windowTop]], [panelIn, panelOut])
    + shape.side('cantle', 'cover', [[rake(windowTop), windowTop], [s.bRear, windowTop], [s.bRear, s.roof + 0.04], [rake(s.roof + 0.04), s.roof + 0.04]], [panelIn, panelOut])
    + shape.side('window_post', 'bright', [[s.cWaist - 0.03, s.waist], [s.cWaist, s.waist], [s.cWaist, windowTop], [s.cWaist - 0.03, windowTop]], [panelOut, panelOut + 0.02])
    + [
      box('drip', 'bright', [rake(windowTop), windowTop - 0.03, panelOut - lean], [s.bRear, windowTop, panelOut + 0.02 - lean]),
      box('landau_foot', 'bright', [landauX(0) - 0.04, landauY(0) - 0.04, landauOut(landauY(0))], [landauX(0) + 0.04, landauY(0) + 0.04, landauOut(landauY(0)) + 0.025]),
      box('landau_head', 'bright', [landauX(1) - 0.04, landauY(1) - 0.04, landauOut(landauY(1))], [landauX(1) + 0.04, landauY(1) + 0.04, landauOut(landauY(1)) + 0.025]),
    ] + [
      k.bar('landau_' + i, 'bright', [landauX(i / landauSteps), landauY(i / landauSteps)], [landauX((i + 1) / landauSteps), landauY((i + 1) / landauSteps)], 0.0625, [landauOut(landauY(i / landauSteps)), landauOut(landauY(i / landauSteps)) + 0.025])
      for i in std.range(0, landauSteps - 1)
    ]
  ), { cover: 'vinyl-black', bright: 'steel-bright' }) + { title: 'Hearse coach' },
  k.compound('hearse_curtains', 8, k.bothSides(
    // The drapes and valance stop at the partition, which stands across the window.
    drape('rear_drape', s.cWaist, 5) + drape('front_drape', deckFront - 5 * pleat, 5)
    + hang('valance', 'cloth', [s.cWaist, deckFront], [windowTop - 0.1, windowTop], 0.04)
  ), { cloth: 'cloth-cream', fold: 'cloth-heather-grey' }) + { title: 'Hearse curtains' },
  k.compound('hearse_grille', 9, [
    box('head', 'bright', [grilleBack, hoodNose - 0.03, -0.42], [grilleBack + 0.075, grilleTop, 0.42]),
    box('foot', 'bright', [grilleBack, 0.53, -0.42], [grilleBack + 0.075, 0.57, 0.42]),
    box('backing', 'dark', [grilleBack, 0.57, -0.38], [grilleBack + 0.05, hoodNose - 0.03, 0.38]),
  ] + k.bothSides([
    box('cheek', 'bright', [grilleBack, 0.53, 0.38], [grilleBack + 0.075, grilleTop, 0.42]),
  ]) + [
    box('vane_' + i, 'bright', [grilleBack + 0.04, 0.57, -0.375 + 2 * i * vane], [grilleBack + 0.07, hoodNose - 0.03, -0.375 + (2 * i + 1) * vane])
    for i in std.range(0, 6)
  ], { bright: 'steel-bright', dark: 'plastic-black' }) + { title: 'Hearse grille' },
  // A load floor's cargo face is its highest point, so the slats and rollers finish level and the rails stand in their own part.
  k.compound('hearse_deck', 45, [
    box('bed', 'deck', [deckRear, 0.48, -deckHalf], [deckFront, deckTop - 0.03, deckHalf]),
    box('slat_tail', 'deck', [deckRear, deckTop - 0.03, -deckHalf], [deckRear + 0.2, deckTop, deckHalf]),
  ] + [
    box('roller_' + i, 'rail', [deckRear + 0.2 + i * 0.4, deckTop - 0.03, -deckHalf], [deckRear + 0.26 + i * 0.4, deckTop, deckHalf])
    for i in std.range(0, 4)
  ] + [
    box('slat_' + i, 'deck', [deckRear + 0.26 + i * 0.4, deckTop - 0.03, -deckHalf], [std.min(deckRear + 0.6 + i * 0.4, deckFront), deckTop, deckHalf])
    for i in std.range(0, 4)
  ] + [
    box('slat_front', 'deck', [deckRear + 2.26, deckTop - 0.03, -deckHalf], [deckFront, deckTop, deckHalf]),
  ], { deck: 'plastic-black', rail: 'steel-stainless' }) + { title: 'Hearse deck' },
  k.compound('hearse_partition', 30, [
    box('partition_top', 'wall', [deckFront, tunnelTop, -tunnelHalf], [deckFront + 0.05, s.waist, tunnelHalf]),
  ] + k.bothSides([
    box('partition', 'wall', [deckFront, s.floor, tunnelHalf], [deckFront + 0.05, s.waist, s.skin - 0.04]),
  ]) + shape.across('partition_head', 'wall', [[deckFront, s.waist], [deckFront + 0.05, s.waist], [deckFront + 0.05, s.roof - 0.02], [deckFront, s.roof - 0.02]], s.skin - 0.04) + k.bothSides([
    box('rail', 'rail', [deckRear + 0.05, deckTop, 0.3], [deckFront - 0.08, deckTop + 0.06, 0.36]),
    box('stop', 'rail', [deckFront - 0.08, deckTop, 0.24], [deckFront - 0.04, deckTop + 0.1, 0.38]),
  ]), { wall: 'plastic-black', rail: 'steel-stainless' }) + { title: 'Hearse partition' },
  k.compound('hearse_brightwork', 2, k.bothSides([
    box('rear_belt', 'bright', [s.rear + 0.12, s.waist - 0.03, s.side - 0.02], [s.bRear, s.waist, s.side + 0.03]),
  ]), { bright: 'steel-bright' }) + { title: 'Hearse brightwork' },
  // The front belt lies along the door's skin, so it rides the door.
  k.compound('hearse_front_door_brightwork', 1, [
    box('belt', 'bright', [s.bFront, s.waist - 0.03, s.side - 0.02], [s.cowl, s.waist, s.side + 0.03]),
  ], { bright: 'steel-bright' }) + { title: 'Hearse front door brightwork' },
])
