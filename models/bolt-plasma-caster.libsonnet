local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's plasma caster: the family's grip and stock kept, a deeper receiver, a glowing coil core ringed
// with collars and ending in a blunt flared emitter with a glowing lens instead of the rifled barrel, and an energy
// cell with glowing windows instead of the magazine. Slot `glow` is the model's own light: crystal-glow-blue is a
// stand-in colour, the game decides what colour the glow is. About 0.9 m long.
// Laid out with the muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z.

local w = 0.07;  // half the receiver's width
local underside = 0.14;
local top = 0.35;  // the receiver's top
local receiverFront = 0.15;
local ridge = { front: 0.14, top: 0.37, halfWidth: 0.045 };
local coreY = 0.25;
local muzzleX = 0.49;
local emitterX = 0.40;  // the emitter's back
local emitterFlare = 0.05;  // how far the emitter's cone runs from its back before it reaches full width
local emitterLength = 0.08;
local lensX = emitterX + emitterLength;  // the lens's back, set in the emitter's mouth
// The collars, `count` of them `pitch` apart from `x0`, each `length` long. Their radius is where an eight-sided turned
// shape has its flats. The fins stand between them, half a pitch on from each.
local collars = { count: 3, x0: 0.17, pitch: 0.08, length: 0.03, radius: 0.08 };
local collar(i) =
  local profile = [[0, 0], [0, collars.radius], [collars.length, collars.radius], [collars.length, 0]];
  h.turned('collar-%d' % i, 'metal', 'x', profile, [collars.x0 + i * collars.pitch, coreY, 0]) + { sides: 8 };
// Rails above and below the coil tie the emitter to the receiver, and the fins stand on the top one. Their outer
// faces sit inside the collars' flats, so the collars wrap them. Each rail starts buried in the receiver's front and
// ends where the emitter's cone has reached full width, so its end is buried in the cone. Rails and fins share one
// half width, so the fins read as rising out of the rail.
local railHalf = 0.02;
local railOuter = collars.radius - 0.008;
local railInner = railOuter - 0.02;
local railStart = receiverFront - 0.02;
local railEnd = emitterX + emitterFlare;
local finLength = 0.015;
[
  // A deeper receiver than the carbine's.
  bolt.gun('bolt_plasma_caster', 12, 'energy', bolt.receiver(receiverFront, underside, top, w, ridge) + [
    // The coil: a glowing core with collars round it, then the emitter cup and its lens.
    h.rod('core', 'glow', 0.045, receiverFront, 0.47, coreY) + { sides: 16 },
    h.turned('emitter', 'trim', 'x', [[0, 0], [0, 0.065], [emitterFlare, 0.09], [emitterLength, 0.09], [emitterLength, 0]], [emitterX, coreY, 0]) + { sides: 8 },
    h.turned('lens', 'glow', 'x', [[0, 0], [0, 0.064], [muzzleX - lensX, 0.06], [muzzleX - lensX, 0]], [lensX, coreY, 0]) + { sides: 8 },
    h.prism('rail-top', 'metal', 'x', bolt.bevel(coreY + railInner, coreY + railOuter, railHalf, 0.004), railStart, railEnd),
    h.prism('rail-bottom', 'metal', 'x', bolt.bevel(coreY - railOuter, coreY - railInner, railHalf, 0.004), railStart, railEnd),
  ] + [
    collar(i)
    for i in std.range(0, collars.count - 1)
  ] + [
    // Cooling fins along the top of the coil, standing as high as the ridge.
    local x = collars.x0 + (i + 0.5) * collars.pitch;
    box('fin-%d' % i, 'metal', [x, coreY + railOuter, -railHalf], [x + finLength, ridge.top, railHalf])
    for i in std.range(0, collars.count - 1)
  ]
  + bolt.cell(receiverFront, underside) + bolt.grip(0.155) + bolt.stock(top, 0.05), { glow: 'crystal-glow-blue' }) + { title: 'Basic plasma caster' },
]
