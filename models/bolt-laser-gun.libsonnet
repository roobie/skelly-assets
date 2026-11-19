local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's laser gun: the family's grip and stock kept, a battery pack for its feed, and the receiver itself
// carried on forward as one chunky block instead of a barrel, its sides cut with slits the beam's light leaks from,
// coolant canisters piped up its flanks and fins along its top, ending in a squared emitter with a glowing lens. Slot
// `glow` is the model's own light: crystal-glow-blue is a stand-in colour, the game decides what colour the glow is.
// About 0.95 m long, a little longer than the plasma caster. Laid out with the muzzle at +x, the axis `gripOn` names,
// so the built model's muzzle faces +z.
// Hand-guard point (the off hand's hold): under the emitter's head, midway along it. The canisters, their straps and
// pipes all end behind the block's front band, so the hand there is clear of them.

local w = 0.07;  // half the receiver's width
local underside = 0.14;
local top = 0.35;  // the receiver's top
local bodyFront = 0.44;  // where the receiver's block ends and the emitter begins
local bandLength = 0.03;  // the brass band closing the block
local muzzleX = 0.56;
local beamY = (underside + top) / 2;  // the beam's axis, the emitter centred on it
// The x of the `count` parts `length` long spread from `from` to `to`, each centred in an equal share.
local spread(count, from, to, length) =
  local pitch = (to - from) / count;
  [from + i * pitch + (pitch - length) / 2 for i in std.range(0, count - 1)];
// The battery pack the gun feeds from, in place of the family's cell, so the laser reads as its own weapon: a heavy
// steel slab, flat bottomed on a rubber pad with its back raked away from the guard, seated into the receiver through a
// brass contact plate, with a latch on its front and a charge strip of glowing segments down each side. `half` is its
// half width; it seats `seat` up into the receiver so no seam shows.
local battery = {
  back: bolt.feedBack,
  front: 0.15,
  half: 0.06,
  bottom: 0.012,
  top: underside + self.seat,
  seat: 0.01,
  rake: 0.035,  // how far its back's foot stands forward of its top
  pad: 0.01,  // the rubber pad's depth
  contact: 0.012,  // the contact plate's depth, below the receiver's underside
  // The charge strip: `count` segments in a dark window from `y0` to `y1`, the window inset `margin` inside the faces.
  // Its segments are two voxels wide with two between them, so each reads apart at the guns' grain.
  charge: { count: 4, y0: 0.06, y1: 0.095, margin: 0.012, segment: 0.008 },
  latch: { y0: 0.085, y1: 0.115, half: 0.03, depth: 0.014 },
  // Rubber ridges across the raked back, where the off hand pulls the battery free.
  ridges: { count: 3, y0: 0.04, y1: 0.12, thick: 0.012, proud: 0.004 },
};
// The clearance kept between the block's fittings and what they stand beside, so each reads as its own part.
local gap = 0.02;
// The block's forward section, which carries the fittings: from a gap ahead of the battery to the front band.
local section = { back: battery.front + gap, front: bodyFront - bandLength };
// A coolant canister along each flank's foot, half sunk into the side, its brass end caps `cap` long, the back one
// against the battery's front. Its coolant line, `pipe` wide, rises up the flank a gap behind the section's front, into
// the block under the fins, and both the line's foot and its riser stand `reach` out from the flank.
local canister = {
  cap: 0.01,
  y: 0.19,
  r: 0.024,
  sink: 0.012,
  pipe: 0.022,
  reach: self.sink + self.pipe / 2,
  inlet: top - 0.02,
  riser: section.front - gap - self.pipe,
  x0: battery.front + self.cap,
  x1: self.riser - self.cap,
};
// The straps holding each canister to the flank, `inset` in from either end.
local strap = { inset: 0.03, width: 0.015 };
// The light slits down each flank, standing `y0` to `y1`, spread from the section's back to a gap behind the risers.
local slits = { count: 6, width: 0.01, y0: 0.225, y1: 0.31, x: spread(self.count, section.back, canister.riser - gap, self.width) };
// The fins along the top, spread along the whole section, their roots `root` down into the block.
local fins = { count: 7, thick: 0.014, height: 0.03, halfWidth: 0.05, root: 0.005, x: spread(self.count, section.back, section.front, self.thick) };
local emitter = { half: 0.06, lens: 0.04 };
// The dark grooves round the emitter's head, the first `inset` ahead of the block.
local grooves = { count: 2, inset: 0.03, pitch: 0.035, width: 0.01 };
// Which way each flank faces.
local sides = { l: -1, r: 1 };
// Flank pieces are placed by how far they stand out from the side face, so one definition serves both flanks: a box on
// flank `s` from `out0` to `out1` out. Pieces start `seat` inside the face so they weld to it.
local seat = 0.001;
local onSide(face, id, slot, s, min, max, out0, out1) =
  local z0 = sides[s] * (face + out0), z1 = sides[s] * (face + out1);
  box(id, slot, min + [std.min(z0, z1)], max + [std.max(z0, z1)]);
local onFlank(id, slot, s, min, max, out0, out1) = onSide(w, id, slot, s, min, max, out0, out1);
local batteryPieces =
  local b = battery, c = battery.charge, foot = b.bottom + b.pad;
  local window = { x0: b.back + b.rake + c.margin, x1: b.front - c.margin };
  local segments = spread(c.count, window.x0, window.x1, c.segment);
  // The x of the raked back at height `y`.
  local backAt(y) = b.back + b.rake * (b.top - y) / (b.top - foot);
  local ridge(i, y) =
    local r = b.ridges, y1 = y + r.thick;
    h.prism('battery-ridge-%d' % i, 'grip', 'z', [
      [backAt(y) - r.proud, y], [backAt(y) + seat, y], [backAt(y1) + seat, y1], [backAt(y1) - r.proud, y1],
    ], -b.half, b.half);
  local ridgeYs = spread(b.ridges.count, b.ridges.y0, b.ridges.y1, b.ridges.thick);
  [ridge(i, ridgeYs[i]) for i in std.range(0, b.ridges.count - 1)] + [
    h.prism('battery', 'metal', 'z', [[b.back, b.top], [b.front, b.top], [b.front, foot], [b.back + b.rake, foot]], -b.half, b.half),
    box('battery-pad', 'grip', [b.back + b.rake, b.bottom, -b.half - 0.002], [b.front, foot, b.half + 0.002]),
    box('battery-contact', 'trim', [b.back - bolt.bandProud, underside - b.contact, -b.half - bolt.bandProud], [b.front + bolt.bandProud, underside, b.half + bolt.bandProud]),
    box('battery-latch', 'accent', [b.front, b.latch.y0, -b.latch.half], [b.front + b.latch.depth, b.latch.y1, b.latch.half]),
  ] + std.flattenArrays([
    [onSide(b.half, 'battery-charge-%s' % s, 'vent', s, [window.x0, c.y0], [window.x1, c.y1], -seat, 0.002)] + [
      onSide(b.half, 'battery-charge-%d-%s' % [i, s], 'glow', s, [segments[i], c.y0 + 0.005], [segments[i] + c.segment, c.y1 - 0.005], 0, 0.003)
      for i in std.range(0, c.count - 1)
    ]
    for s in std.objectFields(sides)
  ]);
local canisterPart(id, slot, x, length, r, z) =
  h.turned(id, slot, 'x', [[0, 0], [0, r], [length, r], [length, 0]], [x, canister.y, z]) + { sides: 8 };
[
  bolt.gun('bolt_laser_gun', 12.5, 'energy', bolt.receiver(bodyFront, underside, top, w, { front: 0.14, top: 0.37, halfWidth: 0.045 }) + [
    // The emitter: a brass band closing the block, a squared steel head with two dark cooling grooves, and the lens.
    bolt.band('front-band', 'trim', bodyFront - bandLength, bodyFront, underside, top, w, 0.018, 0.012),
    h.prism('emitter', 'metal', 'x', bolt.bevel(beamY - emitter.half, beamY + emitter.half, emitter.half, 0.02), bodyFront, muzzleX - 0.006),
    h.prism('lens', 'glow', 'x', bolt.bevel(beamY - emitter.lens, beamY + emitter.lens, emitter.lens, 0.012), muzzleX - 0.01, muzzleX),
  ] + [
    local x = bodyFront + grooves.inset + i * grooves.pitch;
    bolt.band('emitter-groove-%d' % i, 'vent', x, x + grooves.width, beamY - emitter.half, beamY + emitter.half, emitter.half, 0.021)
    for i in std.range(0, grooves.count - 1)
  ] + [
    onFlank('slit-%d-%s' % [i, s], 'glow', s, [slits.x[i], slits.y0], [slits.x[i] + slits.width, slits.y1], -seat, 0.003)
    for i in std.range(0, slits.count - 1)
    for s in std.objectFields(sides)
  ] + [
    box('fin-%d' % i, 'metal', [fins.x[i], top - fins.root, -fins.halfWidth], [fins.x[i] + fins.thick, top + fins.height, fins.halfWidth])
    for i in std.range(0, fins.count - 1)
  ] + std.flattenArrays([
    local z = sides[s] * (w + canister.sink);
    local strapAt(id, x) =
      onFlank(id, 'accent', s, [x, canister.y - canister.r - bolt.bandProud], [x + strap.width, canister.y + canister.r + bolt.bandProud], -seat, canister.sink + canister.r + bolt.bandProud);
    [
      canisterPart('canister-%s' % s, 'metal', canister.x0, canister.x1 - canister.x0, canister.r, z),
      canisterPart('canister-back-%s' % s, 'trim', canister.x0 - canister.cap, canister.cap, canister.r * 0.8, z),
      canisterPart('canister-front-%s' % s, 'trim', canister.x1, canister.cap, canister.r * 0.8, z),
      // Straps tie each canister to the flank, so it reads as held rather than stuck on.
      strapAt('strap-%s-a' % s, canister.x0 + strap.inset),
      strapAt('strap-%s-b' % s, canister.x1 - strap.inset - strap.width),
      // The coolant line runs from the canister into the block, so the canister reads as feeding the gun.
      onFlank('pipe-foot-%s' % s, 'metal', s, [canister.x1, canister.y - canister.pipe / 2], [canister.riser + canister.pipe, canister.y + canister.pipe / 2], -seat, canister.reach),
      onFlank('pipe-%s' % s, 'metal', s, [canister.riser, canister.y - canister.pipe / 2], [canister.riser + canister.pipe, canister.inlet], -seat, canister.reach),
    ]
    for s in std.objectFields(sides)
  ])
  + batteryPieces + bolt.grip(0.155) + bolt.stock(top, 0.05), { glow: 'crystal-glow-blue' }) + { title: 'Basic laser gun' },
]
