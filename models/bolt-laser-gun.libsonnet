local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's laser gun: the family's grip and stock kept, a battery pack for its feed, and a short receiver
// closed by a brass collar, out of which a triangular shroud runs on forward instead of a barrel: its sloped sides cut
// with slits the beam's light leaks from, coolant canisters piped up them and fins over its ridge, ending in a
// triangular emitter with a glowing lens. The shroud stands apex up so its underside stays flat for the off hand and
// its ridge carries the fins on from the receiver's own. Slot `glow` is the model's own light, red so the laser reads
// apart from the plasma caster's blue; the game may still recolour it.
// About 0.95 m long, a little longer than the plasma caster. Laid out with the muzzle at +x, the axis `gripOn` names,
// so the built model's muzzle faces +z.
// Hand-guard point (the off hand's hold): under the emitter's head, midway along it. The canisters, their straps and
// pipes all end behind the shroud's front band, so the hand there is clear of them.

local w = 0.07;  // half the receiver's width, and of the shroud's foot
local underside = 0.14;
local top = 0.35;  // the receiver's top, where the shroud's ridge is cut flat
local shroudFront = 0.44;  // where the shroud ends and the emitter begins
local bandLength = 0.03;  // the brass bands round either end of the shroud
local muzzleX = 0.56;
// The x of the `count` parts `length` long spread from `from` to `to`, each centred in an equal share.
local spread(count, from, to, length) =
  local pitch = (to - from) / count;
  [from + i * pitch + (pitch - length) / 2 for i in std.range(0, count - 1)];
// A section along x with a flat foot at `base` and sides sloping in to an `apex` above, the apex cut flat at `clip` and
// the foot's corners cut by `chamfer`; `half` is its foot's half width and `zAt(y)` how far its sides stand out at `y`.
local triangle(base, apex, half, clip, chamfer) = {
  zAt(y):: half * (apex - y) / (apex - base),
  outline: [
    [base, -half + chamfer],
    [base, half - chamfer],
    [base + chamfer, self.zAt(base + chamfer)],
    [clip, self.zAt(clip)],
    [clip, -self.zAt(clip)],
    [base + chamfer, -self.zAt(base + chamfer)],
  ],
};
// The convex [y, z] outline `pts` with each side moved out `by`, its corners mitred so every side stays parallel.
local grown(pts, by) =
  local n = std.length(pts);
  local area = std.sum([pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in std.range(0, n - 1)]);
  local turn = if area > 0 then 1 else -1;
  local normal(i) =
    local d0 = pts[(i + 1) % n][0] - pts[i][0], d1 = pts[(i + 1) % n][1] - pts[i][1], len = std.sqrt(d0 * d0 + d1 * d1);
    [turn * d1 / len, -turn * d0 / len];
  [
    local a = normal((i + n - 1) % n), b = normal(i), k = by / (1 + a[0] * b[0] + a[1] * b[1]);
    [pts[i][0] + (a[0] + b[0]) * k, pts[i][1] + (a[1] + b[1]) * k]
    for i in std.range(0, n - 1)
  ];
// The battery pack the gun feeds from, in place of the family's cell, so the laser reads as its own weapon: a long
// heavy steel slab leaning forward, its back square to the guard and its front raked back to its foot, flat bottomed on
// a rubber pad, seated into the receiver through a brass contact plate, with a latch and grip ridges on its raked front
// and a charge strip of glowing segments down each side. `half` is its half width; it seats `seat` up into the receiver
// so no seam shows.
local battery = {
  back: bolt.feedBack,
  front: self.back + 0.16,
  half: 0.06,
  bottom: 0.012,
  top: underside + self.seat,
  seat: 0.01,
  rake: 0.035,  // how far its front's foot stands back of its top
  pad: 0.01,  // the rubber pad's depth
  contact: 0.012,  // the contact plate's depth, below the receiver's underside
  // The charge strip: `count` segments in a dark window from `y0` to `y1`, the window inset `margin` inside the faces.
  // Its segments are two voxels wide with two between them, so each reads apart at the guns' grain.
  charge: { count: 6, y0: 0.06, y1: 0.095, margin: 0.012, segment: 0.008 },
  latch: { y0: 0.105, y1: 0.125, half: 0.03, proud: 0.012 },
  // Rubber ridges across the raked front, below the latch, where the off hand pulls the battery free.
  ridges: { count: 3, y0: 0.03, y1: 0.095, thick: 0.012, proud: 0.004 },
};
// The clearance kept between the shroud's fittings and what they stand beside, so each reads as its own part.
local gap = 0.02;
// The receiver stays square only as far as the battery it holds, a gap past it, where its brass collar hands on to the
// shroud.
local receiverFront = battery.front + gap;
// The shroud and the emitter's head and lens share one profile, each smaller in turn, so the front reads as one shape.
local shroud = triangle(underside, 0.41, w, top, 0.01);
local emitter = triangle(underside + 0.015, 0.375, 0.056, top - 0.03, 0.008);
local lens = triangle(underside + 0.045, 0.33, 0.035, 0.3, 0.006);
// The shroud's length that carries the fittings: from the collar to its front band.
local section = { back: receiverFront, front: shroudFront - bandLength };
// A coolant canister low along each of the shroud's sides, half sunk into it, its brass end caps `cap` long, the back
// one against the collar; `z` is how far its axis stands out. Its coolant line, `pipe` wide, rises up the side a gap
// behind the section's front to below the fins, and both the line's foot and its riser stand `reach` out from the side.
local canister = {
  cap: 0.01,
  y: 0.185,
  r: 0.024,
  sink: 0.012,
  z: shroud.zAt(self.y) + self.r - self.sink,
  pipe: 0.022,
  reach: self.sink + self.pipe / 2,
  inlet: 0.285,
  riser: section.front - gap - self.pipe,
  x0: section.back + self.cap,
  x1: self.riser - self.cap,
};
// The straps holding each canister to the shroud, `inset` in from either end.
local strap = { inset: 0.03, width: 0.015 };
// The light slits down each side between the canister and the fins, spread from the collar to a gap behind the risers.
local slits = { count: 6, width: 0.01, y0: 0.215, y1: 0.28, x: spread(self.count, section.back, canister.riser - gap, self.width) };
// The fins over the shroud's ridge, spread along the whole section: each a rib `height` proud of the shroud from `y`
// up over the ridge.
local fins = { count: 7, thick: 0.014, height: 0.02, y: 0.315, x: spread(self.count, section.back, section.front, self.thick) };
// The dark grooves round the emitter's head, the first `inset` ahead of the shroud.
local grooves = { count: 2, inset: 0.03, pitch: 0.035, width: 0.01 };
// Which way each side faces.
local sides = { l: -1, r: 1 };
// Side pieces are placed by how far they stand out from the side face, so one definition serves both sides: a box on
// side `s` from `out0` to `out1` out of a face standing `face` out. Pieces start `seat` inside the face so they weld
// to it.
local seat = 0.001;
local onSide(face, id, slot, s, min, max, out0, out1) =
  local z0 = sides[s] * (face + out0), z1 = sides[s] * (face + out1);
  box(id, slot, min + [std.min(z0, z1)], max + [std.max(z0, z1)]);
// A piece on the shroud's sloped side `s` from `x0` to `x1` and `y0` to `y1`, `out0` to `out1` out of it.
local onShroud(id, slot, s, x0, x1, y0, y1, out0, out1) =
  local z(y, out) = sides[s] * (shroud.zAt(y) + out);
  h.prism(id, slot, 'x', [[y0, z(y0, out0)], [y0, z(y0, out1)], [y1, z(y1, out1)], [y1, z(y1, out0)]], x0, x1);
local batteryPieces =
  local b = battery, c = battery.charge, foot = b.bottom + b.pad;
  local window = { x0: b.back + c.margin, x1: b.front - b.rake - c.margin };
  local segments = spread(c.count, window.x0, window.x1, c.segment);
  // The x of the raked front at height `y`.
  local frontAt(y) = b.front - b.rake * (b.top - y) / (b.top - foot);
  // A piece on the raked front from `y0` to `y1`, standing `proud` out of it, `half` its half width.
  local onFront(id, slot, y0, y1, proud, half) = h.prism(id, slot, 'z', [
    [frontAt(y0) - seat, y0], [frontAt(y0) + proud, y0], [frontAt(y1) + proud, y1], [frontAt(y1) - seat, y1],
  ], -half, half);
  local r = b.ridges, ridgeYs = spread(r.count, r.y0, r.y1, r.thick);
  [onFront('battery-ridge-%d' % i, 'grip', ridgeYs[i], ridgeYs[i] + r.thick, r.proud, b.half) for i in std.range(0, r.count - 1)] + [
    h.prism('battery', 'metal', 'z', [[b.back, b.top], [b.front, b.top], [b.front - b.rake, foot], [b.back, foot]], -b.half, b.half),
    box('battery-pad', 'grip', [b.back, b.bottom, -b.half - 0.002], [b.front - b.rake, foot, b.half + 0.002]),
    box('battery-contact', 'trim', [b.back - bolt.bandProud, underside - b.contact, -b.half - bolt.bandProud], [b.front + bolt.bandProud, underside, b.half + bolt.bandProud]),
    onFront('battery-latch', 'accent', b.latch.y0, b.latch.y1, b.latch.proud, b.latch.half),
  ] + std.flattenArrays([
    [onSide(b.half, 'battery-charge-%s' % s, 'vent', s, [window.x0, c.y0], [window.x1, c.y1], -seat, 0.002)] + [
      onSide(b.half, 'battery-charge-%d-%s' % [i, s], 'glow', s, [segments[i], c.y0 + 0.005], [segments[i] + c.segment, c.y1 - 0.005], 0, 0.003)
      for i in std.range(0, c.count - 1)
    ]
    for s in std.objectFields(sides)
  ]);
local canisterPart(id, slot, x, length, r, z) =
  h.turned(id, slot, 'x', [[0, 0], [0, r], [length, r], [length, 0]], [x, canister.y, z]) + { sides: 8 };
// The fins' rib: the shroud's outline above `fins.y`, grown out by their height.
local finOutline = grown([[fins.y, -shroud.zAt(fins.y)], [fins.y, shroud.zAt(fins.y)], [top, shroud.zAt(top)], [top, -shroud.zAt(top)]], fins.height);
[
  bolt.gun('bolt_laser_gun', 12.5, 'energy', bolt.receiver(receiverFront, underside, top, w, { front: receiverFront - bandLength, top: 0.37, halfWidth: 0.045 }) + [
    // The collar closing the receiver, its front face the step down to the shroud.
    bolt.band('collar', 'trim', receiverFront - bandLength, receiverFront, underside, top, w, 0.018, 0.012),
    h.prism('shroud', 'body', 'x', shroud.outline, receiverFront, shroudFront),
    h.prism('front-band', 'trim', 'x', grown(shroud.outline, bolt.bandProud), shroudFront - bandLength, shroudFront),
    // The emitter: a steel head with two dark cooling grooves, and the lens.
    h.prism('emitter', 'metal', 'x', emitter.outline, shroudFront, muzzleX - 0.006),
    h.prism('lens', 'glow', 'x', lens.outline, muzzleX - 0.01, muzzleX),
  ] + [
    local x = shroudFront + grooves.inset + i * grooves.pitch;
    h.prism('emitter-groove-%d' % i, 'vent', 'x', grown(emitter.outline, bolt.bandProud), x, x + grooves.width)
    for i in std.range(0, grooves.count - 1)
  ] + [
    onShroud('slit-%d-%s' % [i, s], 'glow', s, slits.x[i], slits.x[i] + slits.width, slits.y0, slits.y1, -seat, 0.003)
    for i in std.range(0, slits.count - 1)
    for s in std.objectFields(sides)
  ] + [
    h.prism('fin-%d' % i, 'metal', 'x', finOutline, fins.x[i], fins.x[i] + fins.thick)
    for i in std.range(0, fins.count - 1)
  ] + std.flattenArrays([
    local z = sides[s] * canister.z, low = canister.y - canister.pipe / 2;
    // A strap reaches in to where the side stands at its top, so it meets the slope all the way up.
    local strapTop = canister.y + canister.r + bolt.bandProud, strapFace = shroud.zAt(strapTop);
    local strapAt(id, x) =
      onSide(strapFace, id, 'accent', s, [x, canister.y - canister.r - bolt.bandProud], [x + strap.width, strapTop], -seat, canister.z + canister.r + bolt.bandProud - strapFace);
    [
      canisterPart('canister-%s' % s, 'metal', canister.x0, canister.x1 - canister.x0, canister.r, z),
      canisterPart('canister-back-%s' % s, 'trim', canister.x0 - canister.cap, canister.cap, canister.r * 0.8, z),
      canisterPart('canister-front-%s' % s, 'trim', canister.x1, canister.cap, canister.r * 0.8, z),
      // Straps tie each canister to the shroud, so it reads as held rather than stuck on.
      strapAt('strap-%s-a' % s, canister.x0 + strap.inset),
      strapAt('strap-%s-b' % s, canister.x1 - strap.inset - strap.width),
      // The coolant line runs from the canister into the shroud, so the canister reads as feeding the gun.
      onShroud('pipe-foot-%s' % s, 'metal', s, canister.x1, canister.riser + canister.pipe, low, low + canister.pipe, -seat, canister.reach),
      onShroud('pipe-%s' % s, 'metal', s, canister.riser, canister.riser + canister.pipe, low, canister.inlet, -seat, canister.reach),
    ]
    for s in std.objectFields(sides)
  ])
  + batteryPieces + bolt.grip(0.155) + bolt.stock(top, 0.05), { glow: 'crystal-glow-red' }) + { title: 'Basic laser gun' },
]
