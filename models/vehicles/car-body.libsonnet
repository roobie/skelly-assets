// Welded-shell car panels from one measurement spec, so a new car body differs by its measures and each part
// stays pressed for its body and fitted at the vehicle origin. `s.boot` gives a fixed rear screen and a boot lid
// in place of a tailgate; `s.twoDoor` drops the rear doors, so a long front door and a fixed quarter light stand
// ahead of a solid rear quarter. `s.rearDoorFront` stops the rear door short of the B-pillar, for a stretch section
// its own vehicle presses between them. `s.slidingRearDoor` marks a rear door that slides on a track rather than swinging,
// so it carries no hinge pins and stays still until the staged door motions of roobie/skelly-assets#201 move it. `s.sideGlass` tints all but the windscreen. `s.open` leaves a windscreen and its header over a waist-high body, side glass wound down, for a hood its own vehicle presses. `s.cab` ends the body at a back wall at `s.tailWaist`, for a load bed that its
// own vehicle presses behind it. `s.lift` raises everything the measures do not name, for a tall body.
local k = import 'kit.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local carShape = import 'car-shape.libsonnet';
local pressings(id, title, s) = {
  // A compound row of this car, titled with the car's title and the part's `label`.
  local part(suffix, label, massKg, pieces, finish, anchors={}, motion=null) = k.compound(id + suffix, massKg, pieces, finish, anchors, motion) + { title: title + ' ' + label },
  // How far each opening panel opens, in degrees: the design stops a vehicle's swing is checked against.
  local opens = { door: 65, bonnet: 55, bootLid: 75, tailgate: 85 },
  local shape = carShape(s),
  local lean = shape.tumble,
  local grain = shape.grain,
  local continuousCabin = shape.continuousCabin,
  // A 2 mm glazing clearance, so no pane end face lies in the same plane as a frame face and the smooth copy does not
  // z-fight there. It is far below the grain, yet it still moves a few voxel cells where a boundary sat on a cell
  // centre: glass cells at the quarter light and the windscreen foot, and a few door cells. None of them opens a hole.
  local glazingEdgeGap = if continuousCabin then 0.002 else 0,
  local glazedTop = s.roof - glazingEdgeGap,
  local glazedRise = (glazedTop - s.waist) / (s.roof - s.waist),
  // These glazing quadrilaterals have a horizontal foot at the waist panel's top. Trim that contact too, sliding each
  // foot corner up its own sloped edge so moving the foot does not change the pane's rake. The foot is found, not
  // assumed, so the corners may come in any order.
  local clearWaist(profile) = if glazingEdgeGap == 0 then profile else
    local n = std.length(profile);
    local footY = std.foldl(std.min, [p[1] for p in profile], profile[0][1]);
    local onFoot(i) = profile[i % n][1] == footY;
    assert n == 4 && std.length([i for i in std.range(0, n - 1) if onFoot(i) && onFoot(i + 1)]) == 1
           && std.length([i for i in std.range(0, n - 1) if onFoot(i)]) == 2 :
           'a pane cleared off the waist must be a quadrilateral with one horizontal foot edge';
    local lift(a, b) = [a[0] + (b[0] - a[0]) * glazingEdgeGap / (b[1] - a[1]), a[1] + glazingEdgeGap];
    local edgeTop(i) = profile[if onFoot(i + 1) then (i + n - 1) % n else (i + 1) % n];
    [if onFoot(i) then lift(profile[i], edgeTop(i)) else profile[i] for i in std.range(0, n - 1)],
  local roofHalf = s.glassOut - 0.09 - lean,
  local hood(x) = s.hoodBack - (x - s.aPost) * s.hoodFall,
  local nose = s.front - 0.075,
  local bonnetThick = 0.0625,
  // One whole grain under the bonnet top: voxelised level with it, the two tops fight along the nose.
  local noseShut = (std.round(hood(nose) / grain) - 1) * grain,
  local roofRear = s.tailWaist + s.dLean,
  local roofFront = s.aPost - s.aLean,
  local roofThick = 0.04,
  local open = std.get(s, 'open', false),
  local windowTop = if open then s.waist + 0.06 else s.roof - 0.03,
  local pillarBack = if open then s.cowl - 0.04 else s.cowl - 0.14,
  local roofBack = if open then pillarBack - s.aLean else roofRear,
  local twoDoor = std.get(s, 'twoDoor', false),
  local boot = std.get(s, 'boot', false),
  local cab = std.get(s, 'cab', false),
  local slidingRearDoor = std.get(s, 'slidingRearDoor', false),
  local lift = std.get(s, 'lift', 0),
  local grille = std.get(s, 'grilleHalf', 0.42),
  // `s.blankNose` closes the grille in body paint for a car with no radiator to feed; `s.grilleShut` closes that fraction
  // of it from the top. `s.noseAccent` runs a coloured strip along where the closure meets the opening.
  local blankNose = std.get(s, 'blankNose', false),
  local accent = std.get(s, 'noseAccent', null),
  local grilleLow = std.get(s, 'grilleLow', 0.58 + lift),
  local grilleTop = noseShut,
  local grilleSplit = if blankNose then (grilleLow + grilleTop) / 2 else grilleTop - std.get(s, 'grilleShut', 0) * (grilleTop - grilleLow),
  local slam = std.get(s, 'slamHalf', 0.6),
  local slamTop = std.get(s, 'slamTop', 0.8 + lift),
  local rail = std.get(s, 'railHalf', 0.55),
  local bumperLow = std.get(s, 'bumperLow', 0.3) + lift,
  local bumperTop = std.get(s, 'bumperTop', 0.55) + lift,
  local tailTop = if boot then s.deck else s.waist,
  // A bumper in its own colour or in chrome takes its own slot, so a repaint of the body leaves it as authored.
  local bumperSlot = if std.objectHas(s, 'bumperPaint') then 'bumper' else 'paint',
  local barHalf = std.get(s, 'barHalf', s.side - 0.03),
  local doorPaint = std.get(s, 'doorPaint', s.paint),
  local stripe = std.get(s, 'stripe', null),
  local roofPaint = std.get(s, 'roofPaint', null),
  local rearDoorFront = std.get(s, 'rearDoorFront', s.bRear),
  local stripes(top, from, to) = if stripe == null then [] else [
    box('stripe_' + from, 'stripe', [from, top, 0.09], [to, top + 0.012, 0.27]),
    box('stripe_' + from + '_far', 'stripe', [from, top, -0.27], [to, top + 0.012, -0.09]),
  ],
  local sideGlass = std.get(s, 'sideGlass', 'glass-clear'),
  local paint = { paint: s.paint, trim: 'plastic-black', glass: sideGlass },
  local bumperFinish = paint + (if bumperSlot == 'bumper' then { bumper: s.bumperPaint } else {}),
  local doorFinish = paint + { paint: doorPaint },
  local rearPanelTop = s.rearSill,
  local floorBack = if boot then s.rear + 0.1 else s.tailWaist,
  // The inner face of the load bay's side trim, which the boot lid closes between.
  local loadSide = s.glassIn - 0.04,
  // `s.bootFloor` raises the floor behind the seats over an engine under it.
  local bootFloor = std.get(s, 'bootFloor', 0.48 + lift),
  // `s.engineBayBack` opens the floor behind the seats from its front back to there, over a mid-mounted engine and its
  // gearbox, which stand taller than the space under a floor.
  local bootFloorFront = std.get(s, 'engineBayBack', s.rearFloorFront),
  // `s.towerFront` stops the strut towers short of a nose too short for them.
  local towerFront = std.get(s, 'towerFront', s.frontAxle + 0.45),
  // The wheel well's inner side: the floors stop at it over each arch, so the wheel turns in an opening, not in them.
  local well = s.skin - 0.26,
  local linerTop = s.archTop - shape.chamfer + 0.0625,
  // Closes the arch fore and aft, because a look down past the wheel otherwise leaves through the open underside of the wing.
  local archEnds(name, axle) = [
    box(name + '_liner_fore', 'trim', [axle + s.arch, 0.2 + lift, well], [axle + s.arch + 0.04, linerTop, s.skin]),
    box(name + '_liner_aft', 'trim', [axle - s.arch - 0.04, 0.2 + lift, well], [axle - s.arch, linerTop, s.skin]),
  ],
  local archLiner(name, axle) = shape.liner(name + '_liner', 'trim', axle, 0.2 + lift, [well, s.skin], [well, well + 0.04]) + archEnds(name, axle),
  // Open under the tunnel (`car-shape.libsonnet`, `tunnel`), the floor pan and bulkhead stand either side of it.
  local tunnel =
    local t = shape.tunnel;
    local inner = t.half - t.wall;
    (if t.back > s.rearFloorFront then [
      box('floor_pan', 'pan', [s.rearFloorFront, 0.2 + lift, -s.skin], [t.back, s.floor, s.skin]),
      box('carpet', 'carpet', [s.rearFloorFront, s.floor, -s.skin + 0.04], [t.back, s.floor + 0.01, s.skin - 0.04]),
    ] else []) + [
      box('tunnel', 'carpet', [t.back, t.top - t.wall, -t.half], [s.cowl, t.top, t.half]),
      box('bulkhead_over_tunnel', 'paint', [s.cowl, t.top - t.wall, -t.half], [s.aPost, s.waist - 0.04, t.half]),
    ] + bothSides([
      box('floor_pan', 'pan', [t.back, 0.2 + lift, inner], [s.cowl, s.floor, s.skin]),
      box('carpet', 'carpet', [t.back, s.floor, t.half], [s.cowl, s.floor + 0.01, s.skin - 0.04]),
      box('tunnel_side', 'carpet', [t.back, s.floor, inner], [s.cowl, t.top - t.wall, t.half]),
      box('bulkhead', 'paint', [s.cowl, s.floor, t.half], [s.aPost, s.waist - 0.04, s.skin - 0.02]),
    ]),
  // A box of the body at the rear arch's side, from `from` to `to` along x, kept clear of the wheel: fore and aft of the
  // arch it stands whole, and over it only above the liner's crown.
  local aroundArch(id, slot, from, to, low, high, z) =
    local aft = s.rearAxle - s.arch;
    local fore = s.rearAxle + s.arch;
    local over = std.max(low, s.archTop + 0.0625);
    // An arch's edge can meet the box's end to within rounding, which would leave a sliver with no width.
    local beyond(a, b) = a - b > 1e-6;
    if !beyond(to, aft) || !beyond(fore, from) then [box(id, slot, [from, low, z[0]], [to, high, z[1]])]
    else (if beyond(aft, from) then [box(id + '_aft', slot, [from, low, z[0]], [aft, high, z[1]])] else [])
      + (if beyond(to, fore) then [box(id + '_fore', slot, [fore, low, z[0]], [to, high, z[1]])] else [])
      + (if high > over then [box(id + '_over', slot, [std.max(aft, from), over, z[0]], [std.min(fore, to), high, z[1]])] else []),
  // The floor behind the seats, whole between the wells and cut round the rear arch outside them.
  local rearFloor(low, high) =
    [box('rear_floor', 'pan', [floorBack, low, -well], [bootFloorFront, high, well])]
    + bothSides(aroundArch('rear_floor', 'pan', floorBack, bootFloorFront, low, high, [well, s.skin])),
  // Door and quarter glass stand two voxels thick: a thinner pane falls between cells where its bands step in.
  local paneZ = [s.skin + 0.01 - 2 * grain, s.skin + 0.01],
  // The rear arch's forward corner rides on the rear door wherever the door reaches over the arch.
  local hasDoorCorner = !twoDoor && s.rearDoor < s.rearDoorArch,
  local doorPins(front) = k.hingePins('hinge', 'y', [front, s.floor + 0.2 * (s.waist - s.floor), s.side], [front, s.floor + 0.8 * (s.waist - s.floor), s.side]),
  local bHeadOut = s.glassOut + 0.02,
  // A door's glass leans in with the tumble, inboard of its hinge pins, so opening first carries its trailing edge back
  // until it clears the outer face of the pillar behind it. The glass ends short of that pillar, `reach` behind the pins
  // with its outer face at `face`, by that travel. The pane's inner corner lies deepest, so it swings furthest back, and
  // the tumble sets both deepest at the top.
  local paneClear(reach, face) =
    local paneDepth = s.side - (paneZ[0] - lean);
    local faceDepth = s.side - (face - lean);
    std.max(0, reach - std.sqrt(std.max(0, reach * reach + faceDepth * faceDepth - paneDepth * paneDepth))),
  local frontGlassBack = s.bFront + paneClear(s.cowl - s.bFront, bHeadOut),
  // The C-pillar's leading edge at the top of the glass, where the rear door's glass is nearest its pins.
  local cPillarTop = s.cWaist + (windowTop - s.waist) * s.cLean / (s.roof - s.waist),
  local rearGlassClear = if slidingRearDoor then 0 else paneClear(rearDoorFront - cPillarTop, s.glassOut),
  local rows = [
    part('_shell', 'shell', s.shellMass, tunnel + (if cab then [] else rearFloor(bootFloor - 0.1, bootFloor)) + [
      box('slam_panel', 'paint', [nose - 0.05, 0.35 + lift, -slam], [nose, slamTop, slam]),
    ] + (if noseShut > slamTop then [
      box('slam_header', 'paint', [nose - 0.05, slamTop, -s.skin], [nose, noseShut, s.skin]),
    ] else []) + (if slam < s.skin then bothSides([
      // The wing nose is only a skin, so without this return the slot beside the slam panel shows daylight.
      box('nose_return', 'paint', [nose - 0.05, 0.35 + lift, slam], [nose, noseShut, s.skin]),
    ]) else []) + (if cab then [
      box('back_wall', 'paint', [s.tailWaist, s.floor - 0.1, -s.skin], [s.tailWaist + 0.05, s.waist, s.skin]),
    ] + shape.across('back_header', 'paint', [[s.tailWaist, s.roof - 0.1], [s.tailWaist + 0.05, s.roof - 0.1], [s.tailWaist + 0.05, s.roof], [s.tailWaist, s.roof]], s.skin) + shape.across('back_glass', 'glass', [[s.tailWaist + 0.01, s.waist], [s.tailWaist + 0.04, s.waist], [s.tailWaist + 0.04, s.roof - 0.1], [s.tailWaist + 0.01, s.roof - 0.1]], s.glassIn + 0.01) + [
    ] else [
      box('rear_panel', 'paint', [if boot then s.rear + 0.03 else s.rear + 0.02, 0.45 + lift, -s.skin], [floorBack, if boot then 0.62 + lift else rearPanelTop, s.skin]),
    ]) + [
      box('roof', if roofPaint == null then 'paint' else 'roof_paint', [roofBack, s.roof, -roofHalf], [roofFront, s.roof + roofThick, roofHalf]),
    ] + (if open then [] else [
      box('headliner', 'headliner', [roofRear + 0.1, s.roof - 0.02, -roofHalf + 0.02], [roofFront - 0.1, s.roof, roofHalf - 0.02]),
    ]) + stripes(s.roof + 0.03, roofBack, roofFront) + (if boot && !open then
      shape.across('rear_screen', 'glass', [[roofRear + grain + 0.08, s.roof], [roofRear + grain, s.roof], [s.deckFront + grain, s.waist], [s.deckFront + grain + 0.08, s.waist]], s.glassIn)
    else []) + bothSides([
      box('sill', 'paint', [s.rearDoorArch, s.sill, s.skin - 0.02], [s.aPost, s.floor, s.side]),
      box('chassis_leg', 'pan', [s.aPost, s.floor, rail], [nose, 0.42 + lift, std.get(s, 'legOuter', 0.62)]),
      box('strut_tower', 'paint', [s.aPost + 0.05, 0.42 + lift, rail], [towerFront, std.get(s, 'towerTop', s.waist - 0.12), std.get(s, 'towerOuter', 0.6)]),
      box('a_post', 'paint', [s.cowl, s.floor, s.skin - 0.02], [s.aPost, s.waist, s.side]),
      box('b_pillar', 'paint', [s.bRear, s.floor, s.skin - 0.02], [s.bFront, s.waist, s.glassOut + 0.02]),
    ] + shape.side('a_pillar', 'paint', [[pillarBack, s.waist], [s.aPost, s.waist], [s.aPost - s.aLean, s.roof], [pillarBack - s.aLean, s.roof]], [s.glassIn - 0.02, s.glassOut])
    + shape.side('b_pillar_head', 'paint', [[s.bRear, s.waist], [s.bFront, s.waist], [s.bFront, if open then windowTop else s.roof - 0.02], [s.bRear, if open then windowTop else s.roof - 0.02]], [s.skin - 0.02, bHeadOut])
    + (if open then [] else [
      box('cant_rail', 'paint', [roofRear, s.roof - 0.04, roofHalf - 0.01], [roofFront, s.roof + 0.02, s.glassOut - lean]),
    ]) + (if cab then [
      box('cab_corner', 'paint', [s.tailWaist, s.floor - 0.1, s.skin - 0.02], [s.rearDoorArch, s.waist, s.side]),
    ] + shape.side('c_pillar', 'paint', [[s.tailWaist, s.waist], [s.cWaist, s.waist], [s.cWaist + s.cLean, s.roof], [s.tailWaist, s.roof]], [s.glassIn, s.glassOut]) else (if s.rearAxle - s.arch > s.rear + 0.1 then [
      // A rear arch that reaches the tail's corner leaves no quarter panel behind it.
      box('quarter_rear', 'paint', [s.rear + 0.1, std.min(s.floor, bumperLow - 0.06), s.skin], [s.rearAxle - s.arch, tailTop, s.side]),
    ] else []) + [
      // The lamp's corner, closed round the lens, so the tail reads square from the side and from above.
      box('tail_over', 'paint', [s.rear + 0.04, s.lampTop, s.hatchSide], [if boot then s.rear + 0.1 else std.max(s.rear + 0.1, std.min(s.tailWaist, s.rear + 0.2)), if boot then s.deck - 0.03 else tailTop, s.side]),
    ] + (if boot then [
      box('tail_over_edge', 'paint', [s.rear + 0.04, s.deck - 0.03, loadSide], [s.rear + 0.1, s.deck, s.side]),
    ] else []) + [
      box('tail_out', 'paint', [s.rear + 0.04, 0.62 + lift, s.skin + 0.04], [s.rear + 0.1, s.lampTop, s.side]),
      box('tail_under', 'paint', [s.rear + 0.04, bumperTop, s.hatchSide], [s.rear + 0.1, 0.62 + lift, s.side]),
      box('quarter_arch', 'paint', [s.rearAxle - s.arch, s.archTop, s.skin], [s.rearDoor, s.waist, s.side]),
      shape.aftCorner('quarter_corner_aft', 'paint', s.rearAxle, [s.skin, s.side]),
    ] + aroundArch('boot_side', 'trim', floorBack, s.rearFloorFront, bootFloor, s.waist, [loadSide, s.skin])) + (if !cab && !hasDoorCorner then [
      shape.foreCorner('quarter_corner_fore', 'paint', s.rearAxle, [s.skin, s.side]),
    ] else []) + (if std.get(s, 'archLiner', false) then archLiner('front', s.frontAxle) + (if cab then [] else archLiner('rear', s.rearAxle)) else []) + (if twoDoor then [
      box('quarter_door', 'paint', [s.rearDoorArch, s.floor, s.skin], [s.bRear, s.waist, s.side]),
    ] + shape.side('quarter_light', 'glass', clearWaist([[s.cWaist + glazingEdgeGap, s.waist], [s.bRear - glazingEdgeGap, s.waist], [s.bRear - glazingEdgeGap, windowTop], [s.cWaist + (windowTop - s.waist) * s.cLean / (s.roof - s.waist) + glazingEdgeGap, windowTop]]), paneZ) else []) + (if cab then [] else if boot then (if open then [] else
      shape.side('c_pillar', 'paint', [[s.deckFront, s.waist], [s.cWaist, s.waist], [s.cWaist + s.cLean, s.roof], [roofRear, s.roof]], [s.glassIn, s.glassOut])
    ) + [
      box('deck_side', 'paint', [s.rear + 0.1, s.deck - 0.08, loadSide], [s.deckFront, s.deck, s.side]),
    ] else
      shape.side('c_pillar', 'paint', [[s.cWaist - s.cWidth, s.waist], [s.cWaist, s.waist], [s.cWaist + s.cLean, s.roof], [s.cWaist - s.cWidth + s.cLean, s.roof]], [s.glassIn, s.glassOut])
      + (if s.cWaist - s.cWidth > s.tailWaist + 0.08 then
        shape.side('rear_quarter_glass', 'glass', [[s.tailWaist + 0.08, s.waist], [s.cWaist - s.cWidth, s.waist], [s.cWaist - s.cWidth + s.cLean, s.roof], [s.tailWaist + 0.08 + s.dLean, s.roof]], [s.glassOut - 2 * grain, s.glassOut])
      else [])
      + shape.side('d_pillar', 'paint', [[s.tailWaist, s.waist], [s.tailWaist + 0.08, s.waist], [s.tailWaist + 0.08 + s.dLean, s.roof], [s.tailWaist + s.dLean, s.roof]], [s.hatchSide, s.glassOut])
    )), { pan: 'paint-charcoal', paint: s.paint, carpet: 'plastic-black', headliner: 'cloth-rag', trim: 'plastic-black', glass: sideGlass } + (if stripe == null then {} else { stripe: stripe }) + (if roofPaint == null then {} else { roof_paint: roofPaint })),
    // Side doors hinge on pins at the outer corner of their leading edge, with the handle near the trailing one.
    local door(suffix, label, massKg, lower, glass, paneProfile=null) = part(suffix, label, massKg, lower + [
      box('trim', 'trim', [glass[0][0] + 0.02, s.floor + 0.02, s.skin - 0.03], [glass[1][0] - 0.02, s.waist - 0.02, s.skin]),
    ] + shape.side('glass', 'glass', clearWaist(if paneProfile == null then glass else paneProfile), paneZ) + [
      box('handle', 'trim', [glass[0][0] + 0.08, s.waist - 0.11, s.side - 0.01], [glass[0][0] + 0.2, s.waist - 0.08, s.side + 0.002]),
    ] + doorPins(glass[1][0]), doorFinish, motion=k.motion.hinge(doorPins(glass[1][0]), 'near', opens.door));
    door('_front_door', 'front door', if twoDoor then 34 else 25, [
      box('skin', 'paint', [s.bFront, s.floor, s.skin], [s.cowl, s.waist, s.side]),
    ], [[frontGlassBack, s.waist], [s.cowl, s.waist], [s.cowl - (windowTop - s.waist) * s.aLean / (s.roof - s.waist), windowTop], [frontGlassBack, windowTop]],
    // The opening ends at the A-pillar's trailing edge, not at the cowl/hinge line. Keep the latter for trim and pins.
    paneProfile=if !continuousCabin then null else [
      [frontGlassBack, s.waist], [pillarBack - glazingEdgeGap, s.waist],
      [pillarBack - (windowTop - s.waist) * s.aLean / (s.roof - s.waist) - glazingEdgeGap, windowTop], [frontGlassBack, windowTop],
    ]),
    part('_windscreen', 'windscreen', 12, [
    ] + shape.across('glass', 'glass', [[s.cowl, s.waist], [s.cowl + 0.08, s.waist], [s.cowl + 0.08 - glazedRise * s.aLean, glazedTop], [s.cowl - glazedRise * s.aLean, glazedTop]], s.glassIn - 0.02 - glazingEdgeGap), { glass: 'glass-clear' }),
    // The bonnet hinges on its top rear edge, inboard of the wings: every other point of it then swings forward of the
    // cowl and A-posts as it lifts.
    local bonnetPins = k.hingePins('hinge', 'z', [s.aPost, hood(s.aPost), 0.7 * s.glassIn], [s.aPost, hood(s.aPost), -0.7 * s.glassIn]);
    part('_bonnet', 'bonnet', 13, [
      prism('skin', 'paint', [[s.aPost, hood(s.aPost) - bonnetThick], [nose, hood(nose) - bonnetThick], [nose, hood(nose)], [s.aPost, hood(s.aPost)]], [-s.skin, s.skin]),
    ] + bonnetPins + (if std.get(s, 'scoop', false) then [
      prism('scoop', 'paint', [[s.frontAxle - 0.45, hood(s.frontAxle - 0.45)], [s.frontAxle + 0.1, hood(s.frontAxle + 0.1)], [s.frontAxle + 0.1, hood(s.frontAxle + 0.1) + 0.08], [s.frontAxle - 0.45, hood(s.frontAxle - 0.45) + 0.05]], [-0.3, 0.3]),
      box('scoop_mouth', 'trim', [s.frontAxle + 0.09, hood(s.frontAxle + 0.1) + 0.015, -0.24], [s.frontAxle + 0.115, hood(s.frontAxle + 0.1) + 0.07, 0.24]),
    ] else []) + (if stripe == null then [] else [
      prism('stripe', 'stripe', [[s.aPost, hood(s.aPost) - 0.005], [nose, hood(nose) - 0.005], [nose, hood(nose) + 0.012], [s.aPost, hood(s.aPost) + 0.012]], [0.09, 0.27]),
      prism('stripe_far', 'stripe', [[s.aPost, hood(s.aPost) - 0.005], [nose, hood(nose) - 0.005], [nose, hood(nose) + 0.012], [s.aPost, hood(s.aPost) + 0.012]], [-0.27, -0.09]),
    ]), { paint: s.paint } + (if std.get(s, 'scoop', false) then { trim: 'plastic-black' } else {}) + (if stripe == null then {} else { stripe: stripe }), motion=k.motion.hinge(bonnetPins, 'up', opens.bonnet)),
    part('_front_wing', 'front wing', 4, [
      box('rear', 'paint', [s.aPost, s.sill, s.skin], [s.frontAxle - s.arch, hood(s.frontAxle - s.arch), s.side]),
      prism('arch', 'paint', [[s.frontAxle - s.arch, s.archTop], [s.frontAxle + s.arch, s.archTop], [s.frontAxle + s.arch, hood(s.frontAxle + s.arch)], [s.frontAxle - s.arch, hood(s.frontAxle - s.arch)]], [s.skin, s.side]),
      prism('nose', 'paint', [[s.frontAxle + s.arch, 0.35 + lift], [nose, 0.35 + lift], [nose, hood(nose)], [s.frontAxle + s.arch, hood(s.frontAxle + s.arch)]], [s.skin, s.side]),
      shape.aftCorner('corner_aft', 'paint', s.frontAxle, [s.skin, s.side]),
      shape.foreCorner('corner_fore', 'paint', s.frontAxle, [s.skin, s.side]),
    ], { paint: s.paint }),
    part('_front_bumper', 'front bumper', 7, [
      box('bar', bumperSlot, [nose - 0.05, bumperLow, -barHalf], [s.front, bumperTop, barHalf]),
    ] + (if blankNose then [
      box('closing', 'paint', [nose - 0.02, grilleLow, -grille], [nose + 0.03, grilleTop, grille]),
    ] else [
      box('grille', 'trim', [nose - 0.02, grilleLow, -grille], [nose + 0.03, grilleSplit, grille]),
    ]) + (if !blankNose && grilleSplit < grilleTop then [
      box('closing', 'paint', [nose - 0.02, grilleSplit, -grille], [nose + 0.03, grilleTop, grille]),
    ] else []) + (if accent == null then [] else [
      box('accent', 'accent', [nose + 0.03, grilleSplit - grain, -grille], [nose + 0.03 + grain, grilleSplit, grille]),
    ]) + (if std.get(s, 'grilleBars', false) then [
      box('rail_top', 'paint', [nose + 0.03, grilleTop - 0.0625, -grille], [nose + 0.06, grilleTop, grille]),
      box('rail_foot', 'paint', [nose + 0.03, grilleLow, -grille], [nose + 0.06, grilleLow + 0.0625, grille]),
    ] + [
      box('slat_' + i, 'paint', [nose + 0.03, grilleLow + 0.0625, -grille + i * 0.125], [nose + 0.06, grilleTop - 0.0625, -grille + i * 0.125 + 0.0625])
      for i in std.range(0, std.floor(2 * grille / 0.125))
    ] else []) + (if bumperTop - bumperLow < 0.2 then [] else [
      box('intake', 'trim', [s.front, bumperLow + 0.04, -grille], [s.front + 0.01, bumperLow + 0.14, grille]),
    ]), bumperFinish + (if accent == null then {} else { accent: accent })),
  ] + (if cab then [] else [
    part('_rear_bumper', 'rear bumper', 6, [
      box('bar', bumperSlot, [s.rear - std.get(s, 'rearBarProud', 0), bumperLow, -barHalf], [s.rear + 0.13, bumperTop, barHalf]),
    ], bumperFinish),
    part('_tail_lamp', 'tail lamp', 1, [
      box('lens', 'lens', [s.rear + 0.04, 0.62 + lift, s.hatchSide], [s.rear + 0.11, s.lampTop, s.skin + 0.04]),
    ], { lens: 'plastic-red' }),
  ]) + [
    part('_dashboard', 'dashboard', 15, [
      box('lower', 'trim', [s.cowl - 0.15, shape.tunnel.top, -s.skin + 0.06], [s.cowl, s.waist - 0.17, s.skin - 0.06]),
      box('top', 'trim', [s.cowl - 0.32, s.waist - 0.17, -s.skin + 0.06], [s.cowl, s.waist - 0.05, s.skin - 0.06]),
      box('console', 'trim', [s.cowl - 0.6, shape.tunnel.top, -0.1], [s.cowl - 0.15, shape.tunnel.consoleTop, 0.1]),
      box('column', 'trim', [s.cowl - 0.37, s.waist - 0.23, -0.41], [s.cowl - 0.15, s.waist - 0.15, -0.33]),
    ], { trim: 'plastic-black' }),
  ] + (if twoDoor then [] else [
    part('_rear_door', 'rear door', 21, [
      box('skin', 'paint', [s.rearDoorArch, s.floor, s.skin], [rearDoorFront, s.waist, s.side]),
    ] + (if hasDoorCorner then [
      box('skin_arch', 'paint', [s.rearDoor, s.archTop, s.skin], [s.rearDoorArch, s.waist, s.side]),
      shape.foreCorner('skin_corner', 'paint', s.rearAxle, [s.skin, s.side]),
    ] else []) + [
      box('trim', 'trim', [if std.get(s, 'archLiner', false) then s.rearDoorArch + 0.02 else s.cWaist + 0.02, s.floor + 0.02, s.skin - 0.03], [rearDoorFront - 0.02, s.waist - 0.02, s.skin]),
    ] + shape.side('glass', 'glass', [[s.cWaist + rearGlassClear, s.waist], [rearDoorFront, s.waist], [rearDoorFront, windowTop], [cPillarTop + rearGlassClear, windowTop]], paneZ) + [
      box('handle', 'trim', [s.cWaist + 0.08, s.waist - 0.11, s.side - 0.01], [s.cWaist + 0.2, s.waist - 0.08, s.side + 0.002]),
    ] + (if slidingRearDoor then [] else doorPins(rearDoorFront)), doorFinish,
    motion=if slidingRearDoor then null else k.motion.hinge(doorPins(rearDoorFront), 'near', opens.door)),
  ]) + (if cab then [] else if boot then [
    // The lid hinges on its top front edge, inboard of the gutters: every other point of it then rises behind the rear
    // screen and inside the load bay's sides.
    local lidTop = s.deck + 0.02;
    local bootLidPins = k.hingePins('hinge', 'z', [s.deckFront, lidTop, 0.7 * loadSide], [s.deckFront, lidTop, -0.7 * loadSide]);
    part('_boot_lid', 'boot lid', 12, [
      box('skin', 'paint', [s.rear + 0.04, s.deck - 0.02, -loadSide], [s.deckFront, lidTop, loadSide]),
      box('tail', 'paint', [s.rear + 0.02, 0.62 + lift, -s.hatchSide], [s.rear + 0.06, s.deck - 0.02, s.hatchSide]),
    ] + bootLidPins + (if stripe == null then [] else stripes(s.deck + 0.01, s.rear + 0.04, s.deckFront)), paint + (if stripe == null then {} else { stripe: stripe }), motion=k.motion.hinge(bootLidPins, 'up', opens.bootLid)),
  ] else [
    // The whole rear opening, glass and all, lifts as one about pins on the roof's top rear edge: every point of the
    // gate lies below and behind them, so it swings clear of the roof.
    local tailgatePins = k.hingePins('hinge', 'z', [roofRear, s.roof + roofThick, 0.7 * s.hatchSide], [roofRear, s.roof + roofThick, -0.7 * s.hatchSide]);
    part('_tailgate', 'tailgate', 18, [
      box('skin', 'paint', [s.rear + 0.05, 0.62 + lift, -s.hatchSide], [s.tailWaist, s.waist, s.hatchSide]),
      box('handle', 'trim', [s.rear + 0.04, s.rearSill + 0.13, -0.12], [s.rear + 0.05, s.rearSill + 0.18, 0.12]),
    ] + shape.across('glass', 'glass', clearWaist([[s.tailWaist - 0.01, s.waist], [s.tailWaist + 0.03, s.waist], [s.tailWaist + 0.03 + glazedRise * s.dLean, glazedTop], [s.tailWaist - 0.01 + glazedRise * s.dLean, glazedTop]]), s.hatchSide - 0.02) + tailgatePins, paint, motion=k.motion.hinge(tailgatePins, 'rear', opens.tailgate)),
  ]),
  pressings: rows,
}.pressings;
// `pressings` are every panel the spec presses; `rows` leave out those the car borrows.
{
  // Fittings read only a pressing's geometry and paint, so these carry no title.
  pressings(id, s): pressings(id, '', s),
  rows(id, title, s): k.unborrowed(id, s, pressings(id, title, s)),
}
