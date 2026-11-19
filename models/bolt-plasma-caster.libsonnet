local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's plasma caster: the family's grip and stock kept, a deeper receiver, a glowing coil core ringed with
// collars and ending in a blunt flared emitter with a glowing lens instead of the rifled barrel, and an energy cell with
// glowing windows instead of the magazine. Slot `glow` is the model's own light: crystal-glow-blue is a stand-in colour,
// the game decides what colour the glow is. About 0.9 m long.
// Laid out with the muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z.

local w = 0.07;  // half the receiver's width
local top = 0.35;  // the receiver's top
local coreY = 0.25;
local muzzleX = 0.49;
local emitterX = 0.40;  // the emitter's back
// The rails' faces, out from the core's axis: inside the collars' reach, so the collars clamp them.
local railInner = 0.06;
local railOuter = 0.08;
local cellBack = bolt.guard.front + 0.01;
local cellFront = 0.15;
// The energy cell's plan, `half` its half width from `x0` to `x1`, its corners cut by `cut`. On y, a prism's outline
// is [z, x].
local cellPlan(half, x0, x1, cut) = [
  [-half, x0 + cut], [-half + cut, x0], [half - cut, x0], [half, x0 + cut],
  [half, x1 - cut], [half - cut, x1], [-half + cut, x1], [-half, x1 - cut],
];
[
  // A deeper receiver than the carbine's.
  bolt.gun('bolt_plasma_caster', 12, 'energy', bolt.receiver(0.15, 0.14, top, w, { front: 0.14, top: 0.37, halfWidth: 0.045 }) + [
    // The coil: a glowing core with three collars round it, then the emitter cup and its lens.
    h.rod('core', 'glow', 0.045, 0.15, 0.47, coreY) + { sides: 16 },
    h.turned('collar-a', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.17, coreY, 0]) + { sides: 8 },
    h.turned('collar-b', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.25, coreY, 0]) + { sides: 8 },
    h.turned('collar-c', 'metal', 'x', [[0, 0], [0, 0.08], [0.03, 0.08], [0.03, 0]], [0.33, coreY, 0]) + { sides: 8 },
    h.turned('emitter', 'trim', 'x', [[0, 0], [0, 0.065], [0.05, 0.09], [0.08, 0.09], [0.08, 0]], [emitterX, coreY, 0]) + { sides: 8 },
    h.turned('lens', 'glow', 'x', [[0, 0], [0, 0.064], [muzzleX - 0.48, 0.06], [muzzleX - 0.48, 0]], [0.48, coreY, 0]) + { sides: 8 },
  ] + [
    // Rails above and below the coil tie the emitter to the receiver: each runs from inside the receiver's front,
    // through the collars, into the emitter's cone, and the fins stand on the top one.
    h.prism('rail-top', 'metal', 'x', bolt.bevel(coreY + railInner, coreY + railOuter, 0.015, 0.004), 0.13, emitterX + 0.03),
    h.prism('rail-bottom', 'metal', 'x', bolt.bevel(coreY - railOuter, coreY - railInner, 0.015, 0.004), 0.13, emitterX + 0.03),
  ] + [
    // Cooling fins along the top of the coil.
    box('fin-%d' % i, 'metal', [0.21 + i * 0.08, 0.325, -0.02], [0.225 + i * 0.08, 0.37, 0.02])
    for i in [0, 1, 2]
  ] + [
    // An energy cell hung under the receiver from just ahead of the trigger guard, with a glowing window on each side.
    h.prism('cell', 'body', 'y', cellPlan(0.055, cellBack, cellFront, 0.012), 0.02, 0.15),
    h.prism('cell-cap', 'trim', 'y', cellPlan(0.058, cellBack - 0.005, cellFront + 0.005, 0.014), 0.01, 0.03),
    box('cell-window-l', 'glow', [cellBack + 0.02, 0.05, -0.0575], [cellFront - 0.02, 0.12, -0.055]),
    box('cell-window-r', 'glow', [cellBack + 0.02, 0.05, 0.055], [cellFront - 0.02, 0.12, 0.0575]),
  ] + bolt.grip(0.155) + bolt.stock(top, 0.05), { glow: 'crystal-glow-blue' }) + { title: 'Basic plasma caster' },
]
