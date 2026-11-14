// A large van from one measurement spec: a short steep bonnet, a long raked screen and a tall flat-sided body on one cab.
// `cab` holds the cab's measures, which every van here shares, so a sibling states only its body.
// `s.box` puts a separate, wider box on the cab in place of the welded body. `s.bands` paints strips along the sides.
// `s.rearShutter` makes the rear opening one roll-up door. `s.rearWheel`, `s.rearWheelZ` and `s.rearTubIn` stand wider
// rear wheels under a box; `windowSill` raises a body's glass above its waist.
local k = import 'kit.libsonnet';
local box = k.box;
local prism = k.prism;
// Whole grains, because a thinner strip rounds to nothing on some walls and to a grain on others, and speckles.
local grain = 1 / 32;
// The closed wheel tub behind an arch cut: its inner wall and its roof follow the panel's five-sided opening, from
// `inner` out to the panel at `outer`.
local archLiner(tag, x0, x1, low, top, corner, inner, outer) = [
  prism(tag + '_side', 'pan', [[x0, low], [x1, low], [x1, top - corner], [x1 - corner, top], [x0 + corner, top], [x0, top - corner]], [inner, inner + 0.02]),
  box(tag + '_top', 'pan', [x0 + corner, top, inner], [x1 - corner, top + 0.02, outer]),
  prism(tag + '_slope_rear', 'pan', [[x0, top - corner], [x0 + corner, top], [x0 + corner, top + grain], [x0, top - corner + grain]], [inner, outer]),
  prism(tag + '_slope_front', 'pan', [[x1 - corner, top], [x1, top - corner], [x1, top - corner + grain], [x1 - corner, top + grain]], [inner, outer]),
];
local cab = {
  front: 2.7, side: 1.0, skin: 0.94, glassOut: 0.97, glassIn: 0.88, roofSide: 0.86,
  sill: 0.42, floor: 0.54, waist: 1.24, windowTop: 1.9, doorTop: 2.02, canton: 2.18, roof: 2.3, cabRoof: 2.3,
  frontAxle: 1.77, arch: 0.45, archTop: 0.84, archCorner: 0.24, wheelZ: 0.86, tubIn: 0.72,
  cowl: 1.22, aPost: 1.75, aLean: 0.9, bRear: 0, bFront: 0.1, hoodFall: 0.3, fire: 1.62, dash: 1.12,
  hatchSide: 0.84, rearSill: 0.62, slideRear: -1.04,
  // The side door plugs out this far before it rolls back, so its inner face clears the rear wall's skin and bands.
  slidePlug: 0.12, sideDoorSlides: true,
  windows: [], slideGlass: false, rearGlass: false, bulkhead: true, bands: [], bumper: 'plastic-black',
  wheel: 'wheel_225_75r16c', hub: 0.372, engine: 'engine_i4_diesel',
  // The driver sits on the far side, away from the kerb, as on the buses.
  driverZ: -0.5,
};
local tailOf(s) = s.rear + 0.08;
local noseOf(s) = s.front - 0.08;
// The rear edge of the A pillar at height y, and the height where it crosses x.
local pillarAtOf(s, y) = s.aPost - 0.1 - (y - s.waist) * s.aLean / (s.cabRoof - s.waist);
local pillarYOf(s, x) = s.waist + (s.aPost - 0.1 - x) * (s.cabRoof - s.waist) / s.aLean;
local windscreen(id, title, s) =
  local pillarAt(y) = pillarAtOf(s, y);
  local pillarY(x) = pillarYOf(s, x);
  k.compound(id + '_windscreen', 18, [
    // Stops inside the header: glass level with the roof blends over it as dashes.
    local screenTop = s.cabRoof - 0.05;
    local topLean = s.aLean * (screenTop - s.waist) / (s.cabRoof - s.waist);
    prism('glass', 'glass', [[s.aPost - 0.07, s.waist], [s.aPost - 0.02, s.waist], [s.aPost - 0.02 - topLean, screenTop], [s.aPost - 0.07 - topLean, screenTop]], [-s.glassIn, s.glassIn]),
  ] + k.bothSides([
    prism('quarter', 'glass', [[s.cowl, s.waist], [s.aPost - 0.1, s.waist]] + (if pillarY(s.cowl) > s.windowTop then [[pillarAt(s.windowTop), s.windowTop], [s.cowl, s.windowTop]] else [[s.cowl, pillarY(s.cowl)]]), [s.glassOut - 0.03, s.glassOut - 0.01]),
  ]), { glass: 'glass-clear' }) + { title: title + ' windscreen' };
local dashboard(id, title, s) =
  k.compound(id + '_dashboard', 25, [
    box('lower', 'trim', [s.dash, s.floor, -s.skin + 0.03], [s.frontAxle - s.arch, s.waist - 0.18, s.skin - 0.03]),
    box('lower_between_tubs', 'trim', [s.frontAxle - s.arch, s.floor, -s.tubIn], [s.fire - 0.05, s.waist - 0.18, s.tubIn]),
    box('upper_over_tubs', 'trim', [s.frontAxle - s.arch, s.archTop + 0.02, -s.skin + 0.03], [s.fire - 0.05, s.waist - 0.18, s.skin - 0.03]),
    box('top', 'trim', [s.dash - 0.2, s.waist - 0.18, -s.skin + 0.03], [s.fire - 0.05, s.waist - 0.04, s.skin - 0.03]),
    box('column', 'trim', [s.dash - 0.27, s.waist - 0.09, s.driverZ - 0.04], [s.dash - 0.16, s.waist - 0.01, s.driverZ + 0.04]),
  ], { trim: 'plastic-black' }) + { title: title + ' dashboard' };
// The windscreen and dashboard depend only on cab measures, so they are pressed once from `cab` as the `van_` rows,
// which `panel_van` emits, and a van whose own pressing would equal them borrows them.
local cabPressings = { _windscreen: windscreen, _dashboard: dashboard };
local cabRows = [press('van', 'Van', cab) for press in std.objectValues(cabPressings)];
local withCab(s) = s + { borrow+: {
  [suffix]: 'van' + suffix
  for suffix in std.objectFields(cabPressings)
  if cabPressings[suffix]('van', 'Van', s) == cabPressings[suffix]('van', 'Van', cab)
} };
local pressings(id, title, s0) = {
  local s = withCab(s0),
  local isBox = std.objectHas(s, 'box'),
  local b = s + (if isBox then s.box else {}),
  local tail = tailOf(s),
  local nose = noseOf(s),
  local bodyFront = if isBox then s.box.front else s.bRear,
  local slideFront = if isBox then s.box.slideFront else s.bRear,
  local slideTravel = slideFront - s.slideRear,
  local rise = !isBox && s.cabRoof < s.roof,
  local bumperTop = 0.6,
  local hood(x) = s.waist - (x - s.aPost) * s.hoodFall,
  local roofFront = s.aPost - s.aLean,
  local pillarAt(y) = pillarAtOf(s, y),
  local pillarY(x) = pillarYOf(s, x),
  local pillarTop = if rise then s.cabRoof else s.canton,
  local bandFinishes = { ['band' + i]: s.bands[i].finish for i in std.range(0, std.length(s.bands) - 1) },
  local finish = bandFinishes + {
    paint: s.paint, pan: 'paint-charcoal', trim: 'plastic-black', glass: 'glass-clear', lining: 'plastic-grey',
    carpet: 'plastic-black', headliner: 'cloth-rag',
  },
  // Painted strips on one panel face; `overArch` keeps only those clear of a wheel arch.
  local bands(tag, x, z, overArch=false) = [
    box(tag + '_band' + i, 'band' + i, [x[0], s.bands[i].y[0], z], [x[1], s.bands[i].y[1], z + grain])
    for i in std.range(0, std.length(s.bands) - 1)
    if !overArch || s.bands[i].y[0] >= s.archTop
  ],
  local wall(tag, x, y) = box(tag, 'paint', [x[0], y[0], b.skin], [x[1], y[1], b.side]),
  // A wheel arch cut in a lower wall: the panel over it, chamfered corners and the closed wheel tub behind.
  local rearTubIn = std.get(s, 'rearTubIn', s.tubIn),
  local rearShutter = std.get(s, 'rearShutter', false),
  local windowSill = std.get(b, 'windowSill', b.waist),
  local archPieces(tag, axle, top) = [
    box(tag + '_over', 'paint', [axle - s.arch, s.archTop, b.skin], [axle + s.arch, top, b.side]),
    prism(tag + '_corner_rear', 'paint', [[axle - s.arch, s.archTop - s.archCorner], [axle - s.arch + s.archCorner, s.archTop], [axle - s.arch, s.archTop]], [b.skin, b.side]),
    prism(tag + '_corner_front', 'paint', [[axle + s.arch - s.archCorner, s.archTop], [axle + s.arch, s.archTop - s.archCorner], [axle + s.arch, s.archTop]], [b.skin, b.side]),
  ] + archLiner(tag + '_tub', axle - s.arch, axle + s.arch, b.sill, s.archTop, s.archCorner, rearTubIn, b.skin) + bands(tag, [axle - s.arch, axle + s.arch], b.side, true),
  // An upper wall from x0 to x1 with fixed windows, carrying its glass and the pillars between them.
  local upper(tag, x0, x1, windows) =
    if std.length(windows) == 0 then [box(tag, 'paint', [x0, b.waist, b.glassIn], [x1, b.canton, b.glassOut])]
    else
      local edges = [x0] + std.flattenArrays(windows) + [x1];
      [box(tag + '_top', 'paint', [x0, b.windowTop, b.glassIn], [x1, b.canton, b.glassOut])] + [
        box(tag + '_pillar' + i, 'paint', [edges[2 * i], windowSill, b.glassIn], [edges[2 * i + 1], b.windowTop, b.glassOut])
        for i in std.range(0, std.length(windows))
        if edges[2 * i + 1] > edges[2 * i]
      ] + [
        box(tag + '_glass' + i, 'glass', [windows[i][0], windowSill, b.glassOut - 0.03], [windows[i][1], b.windowTop, b.glassOut - 0.01])
        for i in std.range(0, std.length(windows) - 1)
      ] + (if windowSill > b.waist then [box(tag + '_below_sill', 'paint', [x0, b.waist, b.glassIn], [x1, windowSill, b.glassOut])] else []),
  local rearWindows = [w for w in b.windows if w[1] <= s.slideRear],
  local lowerToDoor = [
    wall('lower_rear', [tail, s.rearAxle - s.arch], [b.sill, b.waist]),
    wall('lower_mid', [s.rearAxle + s.arch, s.slideRear], [b.sill, b.waist]),
  ] + bands('lower_rear', [tail, s.rearAxle - s.arch], b.side) + bands('lower_mid', [s.rearAxle + s.arch, s.slideRear], b.side) + archPieces('rear_arch', s.rearAxle, b.waist),
  local section(low) = [[low, -b.glassOut], [b.canton, -b.glassOut], [b.roof, -b.roofSide], [b.roof, b.roofSide], [b.canton, b.glassOut], [low, b.glassOut]],
  local chassis = k.bothSides([
    box('frame_rail', 'pan', [tail + 0.1, 0.38, 0.42], [nose - 0.1, 0.52, 0.5]),
  ]),
  // A floor's 2 cm rounds to one vertex grain, so a pan closer than two grains would meet its top face and z-fight.
  local panTop = b.floor - 0.04,
  // Everything behind the cab: walls, floor, roof and rear frame, shared by a welded body and a separate box.
  local bodyPieces = [
    box('pan_front', 'pan', [s.rearAxle + s.arch, b.panLow, -b.skin], [bodyFront, panTop, b.skin]),
    box('pan_axle', 'pan', [s.rearAxle - s.arch, b.panLow, -rearTubIn], [s.rearAxle + s.arch, panTop, rearTubIn]),
    box('pan_rear', 'pan', [tail + 0.06, b.panLow, -b.skin], [s.rearAxle - s.arch, panTop, b.skin]),
    box('rear_sill', 'paint', [tail, b.sill, -b.skin], [tail + 0.06, b.rearSill, b.skin]),
    k.xPrism('rear_header', 'paint', section(b.doorTop), [tail, tail + 0.06]),
    box('roof', 'paint', [tail, b.roof - 0.04, -b.roofSide], [if rise || isBox then bodyFront else roofFront, b.roof, b.roofSide]),
  ] + k.bothSides(lowerToDoor + (if isBox then [] else [
    box('skirt', 'pan', [s.rearAxle + s.arch, 0.3, b.side - 0.06], [bodyFront, b.sill, b.side - 0.04]),
  ]) + [
    box('rear_post', 'paint', [tail, b.rearSill, b.hatchSide], [tail + 0.06, b.waist, b.side]),
  ] + [
    box('rear_post_band' + i, 'band' + i, [tail - grain, s.bands[i].y[0], b.hatchSide], [tail, s.bands[i].y[1], b.side])
    for i in std.range(0, std.length(s.bands) - 1)
    if s.bands[i].y[0] >= b.rearSill
  ] + [
    box('rear_post_upper', 'paint', [tail, b.waist, b.hatchSide], [tail + 0.06, b.doorTop, b.glassOut]),
    k.xPrism('cant', 'paint', [[b.canton, b.glassOut - 0.08], [b.roof - 0.04, b.roofSide - 0.1], [b.roof, b.roofSide], [b.canton, b.glassOut]], [tail, if rise || isBox then bodyFront else roofFront]),
  ]) + std.map(k.near, [
  ] + (if slideFront < bodyFront then [wall('front_lower', [slideFront, bodyFront], [b.sill, b.waist])] + bands('front_lower', [slideFront, bodyFront], b.side) else []))
  + std.map(k.near, upper('upper', tail, s.slideRear, rearWindows) + [
    box('over_door', 'paint', [s.slideRear, b.doorTop, b.glassIn], [bodyFront, b.canton, b.glassOut]),
  ] + (if s.sideDoorSlides then [box('slide_rail', 'pan', [s.slideRear - slideTravel, b.waist - 0.04, b.side], [s.slideRear, b.waist - 0.01, b.skin + s.slidePlug])] else [])
  + (if slideFront < bodyFront then [box('front_upper', 'paint', [slideFront, b.waist, b.glassIn], [bodyFront, b.doorTop, b.glassOut])] else []))
  + std.map(k.far, [wall('wall_mid', [s.slideRear, bodyFront], [b.sill, b.waist])]
    + bands('wall_mid', [s.slideRear, bodyFront], b.side)
    + upper('upper', tail, bodyFront, b.windows)),
  // Closes the cab's rear without passing the chamfered roof edge.
  local cabEnd = [[s.floor, -s.skin], [s.canton, -s.skin], [s.roof - 0.05, -s.roofSide], [s.roof - 0.05, s.roofSide], [s.canton, s.skin], [s.floor, s.skin]],
  // The cab: floor, firewall, pillars, roof over the seats, and the front arches' tubs.
  local cabPieces = [
    // Narrowed to the tubs ahead of the door, because the front tyres stand outside them.
    box('cab_pan', 'pan', [bodyFront, s.sill, -s.skin], [s.frontAxle - s.arch, s.floor - 0.04, s.skin]),
    box('cab_pan_tubs', 'pan', [s.frontAxle - s.arch, s.sill, -s.tubIn], [s.aPost, s.floor - 0.04, s.tubIn]),
    box('cab_floor', 'carpet', [bodyFront, s.floor - 0.02, -s.skin + 0.02], [s.frontAxle - s.arch, s.floor, s.skin - 0.02]),
    box('cab_floor_tubs', 'carpet', [s.frontAxle - s.arch, s.floor - 0.02, -s.tubIn], [s.aPost, s.floor, s.tubIn]),
    box('tunnel', 'carpet', [s.bFront, s.floor, -0.2], [s.fire - 0.05, 0.78, 0.2]),
    box('firewall_low', 'paint', [s.fire - 0.05, s.floor, -s.tubIn], [s.fire, s.archTop, s.tubIn]),
    box('firewall', 'paint', [s.fire - 0.05, s.archTop, -s.skin], [s.fire, s.waist, s.skin]),
    box('scuttle', 'paint', [s.fire, s.waist - 0.03, -s.skin], [s.aPost, s.waist, s.skin]),
    box('slam_panel', 'paint', [nose - 0.04, 0.58, -(s.side - 0.1)], [nose, hood(nose) - 0.03, s.side - 0.1]),
    box('front_tub_floor', 'pan', [s.frontAxle - s.arch, s.sill, -s.tubIn], [s.frontAxle + s.arch, 0.5, s.tubIn]),
    box('front_apron', 'pan', [s.frontAxle + s.arch, s.sill, -s.side + 0.1], [nose - 0.04, 0.6, s.side - 0.1]),
  ] + (if s.bulkhead then [k.xPrism('bulkhead', 'lining', cabEnd, [s.bRear - 0.04, s.bRear])] else [])
  + (if isBox then [
    box('cab_roof', 'paint', [s.bRear, s.roof - 0.04, -s.roofSide], [roofFront, s.roof, s.roofSide]),
    k.xPrism('cab_back', 'paint', cabEnd, [s.bRear, s.bRear + 0.04]),
  ] else if rise then [
    // A short steep fairing: a long shallow slope would show as a few metre-long steps at the vertex grain.
    prism('roof_rise', 'paint', [[s.bRear, s.canton - 0.02], [s.bRear + 0.24, s.cabRoof - 0.04], [s.bRear + 0.24, s.cabRoof], [s.bRear, s.roof]], [-s.roofSide, s.roofSide]),
    box('cab_roof', 'paint', [s.bRear + 0.24, s.cabRoof - 0.04, -s.roofSide], [roofFront, s.cabRoof, s.roofSide]),
  ] else [])
  // Square and proud of the screen, so it hides the glass's stepped top edge instead of stepping itself.
  + [box('header', 'paint', [roofFront - 0.1, s.cabRoof - 0.1, -s.roofSide], [roofFront + 0.08, s.cabRoof, s.roofSide])]
  + [box('headliner', 'headliner', [s.bFront, s.cabRoof - 0.06, -s.roofSide + 0.02], [roofFront - 0.02, s.cabRoof - 0.04, s.roofSide - 0.02])]
  + chassis
  + k.bothSides([
    box('cab_skirt', 'pan', [s.bRear, 0.3, s.side - 0.06], [s.frontAxle - s.arch, s.sill, s.side - 0.04]),
    prism('a_pillar', 'paint', [[s.aPost - 0.1, s.waist], [s.aPost, s.waist], [pillarAt(pillarTop) + 0.1, pillarTop], [pillarAt(pillarTop), pillarTop]], [s.glassIn, s.glassOut]),
    box('b_pillar_lower', 'paint', [s.bRear, s.sill, s.skin], [s.bFront, s.waist, s.side]),
    box('b_pillar_upper', 'paint', [s.bRear, s.waist, s.glassIn], [s.bFront, s.windowTop, s.glassOut]),
    prism('cab_rail', 'paint', [[s.bRear, s.windowTop], [pillarAt(s.windowTop), s.windowTop], [pillarAt(pillarTop), pillarTop], [s.bRear, s.canton]], [s.glassIn, s.glassOut]),
  ] + archLiner('front_tub', s.frontAxle - s.arch, s.frontAxle + s.arch, s.sill, s.archTop, s.archCorner, s.tubIn, s.side - 0.1) + (if !rise then [
    prism('a_pillar_top', 'paint', [[pillarAt(pillarTop), pillarTop], [pillarAt(pillarTop) + 0.1, pillarTop], [roofFront, s.cabRoof - 0.02], [roofFront - 0.1, s.cabRoof - 0.02]], [s.roofSide - 0.1, s.glassIn]),
  ] else []) + (if isBox then [
    k.xPrism('cab_cant', 'paint', [[s.canton, s.glassOut - 0.08], [s.roof - 0.04, s.roofSide - 0.1], [s.roof, s.roofSide], [s.canton, s.glassOut]], [s.bRear, roofFront]),
  ] else []) + bands('b_pillar', [s.bRear, s.bFront], s.side)),
  local doorAnchors = { hinge_a: ['skin', [1, 0.2, 1]], hinge_b: ['skin', [1, 0.8, 1]] },
  local winTop = s.windowTop,
  local rowsOut = [
    k.compound(id + '_shell', s.shellMass, cabPieces + (if isBox then [] else bodyPieces), finish) + { title: title + ' shell' },
    windscreen(id, title, s),
    k.compound(id + '_bonnet', 20, [
      prism('skin', 'paint', [[s.aPost, hood(s.aPost) - 0.03], [nose, hood(nose) - 0.03], [nose, hood(nose)], [s.aPost, hood(s.aPost)]], [-(s.side - 0.1), s.side - 0.1]),
    ], { paint: s.paint }) + { title: title + ' bonnet' },
    k.compound(id + '_front_wing', 8, [
      box('rear', 'paint', [s.cowl, s.sill, s.side - 0.1], [s.frontAxle - s.arch, s.waist, s.side]),
      prism('over_arch', 'paint', [[s.frontAxle - s.arch, s.archTop], [s.frontAxle + s.arch, s.archTop], [s.frontAxle + s.arch, hood(s.frontAxle + s.arch)], [s.aPost, s.waist], [s.frontAxle - s.arch, s.waist]], [s.side - 0.1, s.side]),
      prism('corner_rear', 'paint', [[s.frontAxle - s.arch, s.archTop - s.archCorner], [s.frontAxle - s.arch + s.archCorner, s.archTop], [s.frontAxle - s.arch, s.archTop]], [s.side - 0.1, s.side]),
      prism('corner_front', 'paint', [[s.frontAxle + s.arch - s.archCorner, s.archTop], [s.frontAxle + s.arch, s.archTop - s.archCorner], [s.frontAxle + s.arch, s.archTop]], [s.side - 0.1, s.side]),
      prism('nose', 'paint', [[s.frontAxle + s.arch, bumperTop], [nose - 0.2, bumperTop], [nose - 0.2, hood(nose - 0.2)], [s.frontAxle + s.arch, hood(s.frontAxle + s.arch)]], [s.side - 0.1, s.side]),
      k.yPrism('corner', 'paint', [[s.side - 0.1, nose - 0.2], [s.side, nose - 0.2], [s.side - 0.1, nose]], [bumperTop, hood(nose)]),
    ] + bands('rear', [s.cowl, s.frontAxle - s.arch], s.side, true)
    + bands('over_arch', [s.frontAxle - s.arch, s.frontAxle + s.arch], s.side, true)
    + bands('nose', [s.frontAxle + s.arch, nose - 0.2], s.side, true), finish) + { title: title + ' front wing' },
    k.compound(id + '_front_bumper', 14, [
      k.yPrism('bar', 'bumper', [[-(s.side - 0.02), s.frontAxle + s.arch], [s.side - 0.02, s.frontAxle + s.arch], [s.side - 0.02, nose - 0.12], [s.side - 0.2, s.front], [-(s.side - 0.2), s.front], [-(s.side - 0.02), nose - 0.12]], [0.3, bumperTop]),
      box('grille', 'trim', [nose, 0.66, -0.48], [nose + 0.03, 0.92, 0.48]),
      box('grille_bar', 'bumper', [nose + 0.03, 0.78, -0.48], [nose + 0.04, 0.82, 0.48]),
    ] + k.bothSides([
      box('lamp_bezel', 'trim', [nose, 0.74, 0.5], [nose + 0.015, 0.95, 0.86]),
    ]) + [
      box('intake', 'trim', [s.front, 0.34, -0.5], [s.front + 0.01, 0.46, 0.5]),
    ], finish + { bumper: s.bumper }) + { title: title + ' front bumper' },
    k.compound(id + '_rear_bumper', 10, [
      box('bar', 'bumper', [s.rear, 0.42, -(b.side - 0.03)], [tail + 0.08, 0.6, b.side - 0.03]),
    ], { bumper: s.bumper }) + { title: title + ' rear bumper' },
    dashboard(id, title, s),
    // Side doors hinge on their leading edge, with the handle near the trailing one.
    k.compound(id + '_front_door', 32, [
      box('skin', 'paint', [s.bFront, s.sill, s.skin], [s.cowl, s.waist, s.side]),
      box('trim', 'trim', [s.bFront + 0.02, s.sill + 0.02, s.skin - 0.03], [s.cowl - 0.02, s.waist - 0.02, s.skin]),
      box('stile', 'paint', [s.cowl - 0.04, s.waist, s.glassIn], [s.cowl, std.min(pillarY(s.cowl), winTop), s.glassOut]),
      prism('glass', 'glass', [[s.bFront, s.waist], [s.cowl - 0.04, s.waist]] + (if pillarY(s.cowl - 0.04) > winTop then [[s.cowl - 0.04, winTop]] else [[s.cowl - 0.04, pillarY(s.cowl - 0.04)], [pillarAt(winTop), winTop]]) + [[s.bFront, winTop]], [s.glassOut - 0.03, s.glassOut - 0.01]),
      box('handle', 'trim', [s.bFront + 0.05, s.waist - 0.13, s.side], [s.bFront + 0.21, s.waist - 0.09, s.side + 0.015]),
    ] + bands('skin', [s.bFront, s.cowl], s.side), finish, doorAnchors) + { title: title + ' front door' },
    // Plugs out, then rolls back along the rail on the rear wall; its leading edge is where it seals.
    k.compound(id + '_side_door', 40, [
      box('skin', 'paint', [s.slideRear, b.sill, b.skin], [slideFront, b.waist, b.side]),
      box('handle', 'trim', [slideFront - 0.2, b.waist - 0.15, b.side], [slideFront - 0.04, b.waist - 0.11, b.side + 0.015]),
    ] + (if s.slideGlass then [
      box('top', 'paint', [s.slideRear, b.windowTop, b.glassIn], [slideFront, b.doorTop, b.glassOut]),
      box('stile_rear', 'paint', [s.slideRear, b.waist, b.glassIn], [s.slideRear + 0.05, b.windowTop, b.glassOut]),
      box('stile_front', 'paint', [slideFront - 0.05, b.waist, b.glassIn], [slideFront, b.windowTop, b.glassOut]),
      box('glass', 'glass', [s.slideRear + 0.05, b.waist, b.glassOut - 0.03], [slideFront - 0.05, b.windowTop, b.glassOut - 0.01]),
    ] else [
      box('upper', 'paint', [s.slideRear, b.waist, b.glassIn], [slideFront, b.doorTop, b.glassOut]),
    ]) + bands('skin', [s.slideRear, slideFront], b.side), finish, if s.sideDoorSlides then {} else doorAnchors,
    if s.sideDoorSlides then k.motion.slide('near', s.slidePlug) + k.motion.slide('rear', slideTravel)) + { title: title + ' side door' },
    if rearShutter then
      // One curtain across the opening: flat slats in the door's own plane, so the side outline stays solid.
      local slat = 0.1875;
      local groove = grain * 2;
      local count = std.floor((b.doorTop - b.rearSill - groove) / slat);
      local curtainY(i) = b.rearSill + i * slat;
      local minus(spans, band) = std.flattenArrays([
        (if span[0] < band.y[0] then [[span[0], std.min(span[1], band.y[0])]] else [])
        + (if span[1] > band.y[1] then [[std.max(span[0], band.y[1]), span[1]]] else [])
        for span in spans
      ]);
      local strips(tag, slot, y0, y1) =
        local spans = std.foldl(minus, s.bands, [[y0, y1]]);
        [
          box(tag + '_' + j, slot, [tail - grain, spans[j][0], -b.hatchSide], [tail, spans[j][1], b.hatchSide])
          for j in std.range(0, std.length(spans) - 1)
        ];
      // Clear of the painted strips, which it would cut across.
      local grabY = std.foldl(function(y, band) std.max(y, band.y[1] + 0.04), s.bands, b.rearSill + 0.1);
      k.compound(id + '_rear_door', 40, [
        box('skin', 'paint', [tail, b.rearSill, -b.hatchSide], [tail + 0.05, b.doorTop, b.hatchSide]),
        box('grab', 'trim', [tail - grain * 2, grabY, -0.2], [tail - grain, grabY + 0.06, 0.2]),
      ] + std.flattenArrays([
        strips('slat' + i, 'paint', curtainY(i) + groove, std.min(curtainY(i) + slat, b.doorTop))
        + strips('groove' + i, 'rib', curtainY(i), curtainY(i) + groove)
        for i in std.range(0, count)
      ]) + [
        box('band' + i, 'band' + i, [tail - grain, s.bands[i].y[0], -b.hatchSide], [tail, s.bands[i].y[1], b.hatchSide])
        for i in std.range(0, std.length(s.bands) - 1)
      ], finish + { rib: 'plastic-grey' }, { hinge_a: ['skin', [0.5, 1, 0.1]], hinge_b: ['skin', [0.5, 1, 0.9]] }) + { title: title + ' rear shutter' }
    else
    // One leaf of the pair, hinged on the body's outer edge.
    k.compound(id + '_rear_door', 28, [
      box('skin', 'paint', [tail, b.rearSill, 0.005], [tail + 0.05, b.waist, b.hatchSide]),
      box('handle', 'trim', [tail - 0.015, b.waist - 0.2, 0.05], [tail, b.waist - 0.08, 0.1]),
    ] + (if s.rearGlass then [
      box('top', 'paint', [tail, b.windowTop, 0.005], [tail + 0.05, b.doorTop, b.hatchSide]),
      box('stile_in', 'paint', [tail, windowSill, 0.005], [tail + 0.05, b.windowTop, 0.08]),
      box('stile_out', 'paint', [tail, windowSill, b.hatchSide - 0.08], [tail + 0.05, b.windowTop, b.hatchSide]),
      box('glass', 'glass', [tail + 0.015, windowSill, 0.08], [tail + 0.035, b.windowTop, b.hatchSide - 0.08]),
    ] + (if windowSill > b.waist then [box('below_sill', 'paint', [tail, b.waist, 0.005], [tail + 0.05, windowSill, b.hatchSide])] else []) else [
      box('upper', 'paint', [tail, b.waist, 0.005], [tail + 0.05, b.doorTop, b.hatchSide]),
    ]) + [
      box('band' + i, 'band' + i, [tail - grain, s.bands[i].y[0], 0.005], [tail, s.bands[i].y[1], b.hatchSide])
      for i in std.range(0, std.length(s.bands) - 1)
      if s.bands[i].y[0] >= b.rearSill
    ], finish, { hinge_a: ['skin', [0.5, 0.2, 1]], hinge_b: ['skin', [0.5, 0.8, 1]] }) + { title: title + ' rear door' },
  ] + (if std.objectHas(s, 'floorPart') then [
    // A floor below the arch tops stops at the tubs, or it would cut the rear tyres; the deck between them stays one
    // solid because a cargo space's cells must each lie inside one.
    k.compound(id + s.floorPart.suffix, 45, if b.floor >= s.archTop then [
      box('deck', 'deck', [tail + 0.06, b.floor - 0.02, -b.skin], [bodyFront - 0.08, b.floor, b.skin]),
    ] else [
      box('deck', 'deck', [tail + 0.06, b.floor - 0.02, -s.tubIn], [bodyFront - 0.08, b.floor, s.tubIn]),
    ] + k.bothSides([
      box('deck_rear', 'deck', [tail + 0.06, b.floor - 0.02, s.tubIn], [s.rearAxle - s.arch, b.floor, b.skin]),
      box('deck_front', 'deck', [s.rearAxle + s.arch, b.floor - 0.02, s.tubIn], [bodyFront - 0.08, b.floor, b.skin]),
    ]), { deck: std.get(s, 'deck', 'plastic-charcoal') }) + { title: title + ' ' + s.floorPart.label },
  ] else []) + (if isBox then [
    k.compound(id + '_box', s.box.mass, bodyPieces + [
      k.xPrism('front_wall', 'paint', section(b.sill), [bodyFront - 0.08, bodyFront]),
    ] + k.bothSides([
      box('step_band' + i, 'band' + i, [bodyFront, s.bands[i].y[0], s.side], [bodyFront + grain, s.bands[i].y[1], b.side])
      for i in std.range(0, std.length(s.bands) - 1)
    ]), finish) + { title: title + ' box' },
  ] else []),
  out: rowsOut,
}.out;
local rows(id, title, s0) = k.unborrowed(id, withCab(s0), pressings(id, title, s0));
{
  cab: cab,
  // Mixed into a spec to floor its body: for loading, or for standing and fitting seats on.
  loadFloor: { floorPart: { suffix: '_load_floor', fitting: 'load_floor', label: 'load floor', capabilities: ['structure', 'load_floor'] } },
  saloonFloor: { floorPart: { suffix: '_floor', fitting: 'floor', label: 'floor', capabilities: ['structure'] } },
  rows: rows,
  tail: tailOf,
  nose: noseOf,
  pillarAt: pillarAtOf,
  pillarY: pillarYOf,
  // The rows `panel_van` emits for every van whose cab pressings equal them.
  cabRows: cabRows,
  // Deadvox's items for `rows`, built with Deadvox's vehicle kit as `kit`; `cabItems` are those for `cabRows`.
  items(kit, id, name, s0):
    local s = withCab(s0);
    local part(suffix, label, capabilities) = kit.part(id + suffix, name + ' ' + label, kit.pileSize, capabilities);
    local parts = [
      ['_shell', if std.objectHas(s, 'box') then 'cab shell' else 'body shell', ['structure', 'protection']],
      ['_windscreen', 'windscreen', ['glazing']],
      ['_bonnet', 'bonnet', ['protection']],
      ['_front_wing', 'front wing', ['protection']],
      ['_front_bumper', 'front bumper', ['protection']],
      ['_rear_bumper', 'rear bumper', ['protection']],
      ['_dashboard', 'dashboard', ['structure']],
      ['_front_door', 'front door', ['entry', 'glazing', 'protection']],
      ['_side_door', 'side door', ['entry', 'protection'] + (if s.slideGlass then ['glazing'] else [])],
      ['_rear_door', if std.get(s, 'rearShutter', false) then 'rear shutter' else 'rear door', ['entry', 'protection'] + (if s.rearGlass then ['glazing'] else [])],
    ]
    + (if std.objectHas(s, 'floorPart') then [[s.floorPart.suffix, s.floorPart.label, s.floorPart.capabilities]] else [])
    + (if std.objectHas(s, 'box') then [['_box', 'box body', ['structure', 'protection']]] else []);
    [part(p[0], p[1], p[2]) for p in parts if !k.borrows(s, p[0])],
  cabItems(kit): [
    kit.part('van_windscreen', 'van windscreen', kit.pileSize, ['glazing']) + { title: 'Van windscreen' },
    kit.part('van_dashboard', 'van dashboard', kit.pileSize, ['structure']) + { title: 'Van dashboard' },
  ],
  // A battery van on `base`: the motor drives the front wheels from the engine bay and the pack spans the wheelbase
  // under the floor pan, so the prop shaft goes and an undriven axle replaces the rear one. Nothing behind the nose
  // needs cooling air, so a plain panel closes the grille.
  grillePanel(s):
    local nose = noseOf(s);
    k.compound('electric_van_grille_panel', 3, [
      box('panel', 'panel', [nose + 0.04, 0.64, -0.5], [nose + 0.04 + grain, 0.94, 0.5]),
    ], { panel: 'plastic-gloss-white' }) + { title: 'Electric van grille panel' },
  electricDrive(s): {
    drop: ['engine', 'gearbox', 'radiator', 'fuel_tank', 'exhaust', 'prop_shaft'],
    motor: { part: 'traction_motor_large', at: [s.frontAxle + 0.18, 0.5, 0] },
    inverter: { part: 'inverter_large', at: [s.frontAxle + 0.42, 0.6, 0.51], on: ['motor'] },
    pack: { part: 'traction_pack_van', at: [(s.rearAxle + s.frontAxle) / 2, s.panLow - 0.16, 0] },
    port: { part: 'charge_port', at: [s.frontAxle + 0.1, 0.98, s.side], on: ['front_wing_near'] },
  },
  electricAxle: 'trailer_axle_van',
  electric(powertrain, base, s, id, name):
    local grilleFitting = { id: 'grille_panel', part: 'electric_van_grille_panel', at: [0, 0, 0], supportedBy: ['front_bumper'] };
    local derived = powertrain.electric(base, $.electricDrive(s) + { id: id, name: name });
    derived + {
      fittings: [
        if f.id == 'rear_axle' then f { part: $.electricAxle } else f
        for f in derived.fittings
      ] + [grilleFitting],
    },
  // The battery van's sites from `base`, its parent's.
  electricSites(base, s): (import 'powertrain.libsonnet').electric(base, $.electricDrive(s) + {
    over: { rear_axle: { part: $.electricAxle } },
    add: [(import 'site.libsonnet').one('grille_panel', 'electric_van_grille_panel')],
  }),
  // The fittings every van shares; a sibling adds its seats behind the cab, cargo and extras.
  // Fittings read only the pressings' geometry and paint, so they carry no title.
  fittings(kit, id, s0): k.painted(id, withCab(s0), pressings(id, '', s0), (
    local s = withCab(s0);
    local part(suffix) = k.partId(id, s, suffix);
    local fitting = kit.fitting;
    local pair = kit.pair;
    local on = kit.on;
    local origin = kit.origin;
    local isBox = std.objectHas(s, 'box');
    local rearBody = if isBox then 'box' else 'shell';
    local tail = tailOf(s);
    local nose = noseOf(s);
    local hub = s.hub;
    // Axles and struts are drawn for the van's own wheel, so a larger one lifts them with its hub.
    local lift = hub - cab.hub;
    // On a riser, so a van's driver sits up over the bonnet; a box's cab wall stands further forward.
    local seatX = std.get(s, 'frontSeatX', if isBox then 0.5 else 0.45);
    [
      fitting('shell', part('_shell'), origin),
      fitting('windscreen', part('_windscreen'), origin, ['shell']),
      fitting('bonnet', part('_bonnet'), origin, ['shell']),
      fitting('front_bumper', part('_front_bumper'), origin, ['shell']),
      fitting('rear_bumper', part('_rear_bumper'), origin, ['shell']),
      fitting('dashboard', part('_dashboard'), origin, ['shell']),
      fitting('side_door', part('_side_door'), origin, [rearBody]),
      fitting('engine', s.engine, [s.frontAxle + 0.13, 0.42, 0], ['shell']),
      fitting('gearbox', 'gearbox_inline', [s.frontAxle - 0.44, 0.4, 0], ['engine']),
      fitting('prop_shaft', 'prop_shaft_long', [(s.frontAxle - 0.76 + s.rearAxle) / 2, 0.34, 0], ['gearbox', 'rear_axle']),
      fitting('radiator', 'radiator_van', [nose - 0.12, 0.38, 0], ['shell']),
      fitting('fuel_tank', 'fuel_tank_van', [s.rearAxle + 1.0, if isBox then 0.3 else 0.2, -0.58], ['shell']),
      fitting('exhaust', 'exhaust_long', [s.frontAxle - 3.47, 0.19, 0.3], ['engine', 'shell']),
      fitting('rear_axle', 'beam_axle_van', [s.rearAxle, lift, 0], ['shell']),
      fitting('steering_wheel', 'steering_wheel', [s.dash - 0.3, s.waist - 0.05, s.driverZ], ['dashboard']),
      fitting('gear_lever', 'gear_lever', [s.dash - 0.15, s.waist - 0.42, 0], ['dashboard']),
    ]
    + (if isBox then [fitting('box', part('_box'), origin, ['shell'])] else [])
    + (if std.objectHas(s, 'floorPart') then [fitting(s.floorPart.fitting, part(s.floorPart.suffix), origin, [rearBody])] else [])
    + pair('front_wing', part('_front_wing'), origin, on(['shell']))
    + pair('front_door', part('_front_door'), origin, on(['shell']))
    + (if std.get(s, 'rearShutter', false) then [fitting('rear_door', part('_rear_door'), origin, [rearBody])] else pair('rear_door', part('_rear_door'), origin, on([rearBody])))
    + pair('tail_lamp', 'tail_lamp_tall', [tail - 0.03, 0.72, (if isBox then s.box.hatchSide else s.hatchSide) + 0.08], on([rearBody]))
    + pair('front_strut', 'front_strut', [s.frontAxle, 0.33 + lift, 0.8], on(['shell']))
    + pair('front_wheel', s.wheel, [s.frontAxle, hub, s.wheelZ], on(paired=['front_strut']))
    + pair('rear_wheel', std.get(s, 'rearWheel', s.wheel), [s.rearAxle, hub, std.get(s, 'rearWheelZ', s.wheelZ)], on(['rear_axle']))
    + pair('seat_riser', 'seat_riser', [seatX, s.floor, 0.5], on(['shell']))
    + pair('front_seat', 'front_seat', [seatX, s.floor + 0.2, 0.5], on(paired=['seat_riser']))
    + pair('door_mirror', if isBox then 'door_mirror_box' else 'door_mirror_large', [s.aPost - 0.27, s.waist + 0.04, std.min((if isBox then s.box.side else s.side) - 0.13, s.glassOut - 0.02)], on(['shell']))
    + pair('indicator', 'marker_lamp', [nose + 0.02, 0.6, 0.72], on(['front_bumper']))
    + pair('headlamp', 'headlamp_large', [nose, 0.74, 0.68], on(['front_bumper']))
    + kit.batteryBay('battery_tray', [s.aPost + 0.12, 0.8, -0.62], ['shell'])
  )),
}
