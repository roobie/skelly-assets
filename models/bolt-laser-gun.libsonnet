local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's laser gun: the family's grip, stock and energy cell kept, and the receiver itself carried on
// forward as one chunky block instead of a barrel, its sides cut with slits the beam's light leaks from, coolant
// canisters piped up its flanks and fins along its top, ending in a squared emitter with a glowing lens. Slot `glow` is
// the model's own light: crystal-glow-blue is a stand-in colour, the game decides what colour the glow is. About 0.95 m
// long, a little longer than the plasma caster. Laid out with the muzzle at +x, the axis `gripOn` names, so the built
// model's muzzle faces +z.
// Hand-guard point (the off hand's hold under the body), in this layout's metres: [0.30, 0.14, 0].

local w = 0.07;  // half the receiver's width
local underside = 0.14;
local top = 0.35;  // the receiver's top
local bodyFront = 0.44;  // where the receiver's block ends and the emitter begins
local muzzleX = 0.56;
local beamY = (underside + top) / 2;  // the beam's axis, the emitter centred on it
// The light slits down each flank, `count` of them from `x0`, `pitch` apart, standing `y0` to `y1`.
local slits = { count: 6, x0: 0.17, pitch: 0.032, width: 0.01, y0: 0.225, y1: 0.31 };
// A coolant canister along each flank's foot, half sunk into the side, from `x0` to `x1`, piped up the flank at its
// front end.
local canister = { x0: 0.16, x1: 0.35, y: 0.19, r: 0.024, sink: 0.012, pipe: 0.022 };
local fins = { count: 7, x0: 0.17, pitch: 0.035, thick: 0.014, height: 0.03, halfWidth: 0.05 };
local emitter = { half: 0.06, lens: 0.04 };
// Which way each flank faces.
local sides = { l: -1, r: 1 };
// A box on the flank `s`, from `out0` to `out1` out from the receiver's side face.
local onFlank(id, slot, s, min, max, out0, out1) =
  local z0 = sides[s] * (w + out0), z1 = sides[s] * (w + out1);
  box(id, slot, min + [std.min(z0, z1)], max + [std.max(z0, z1)]);
[
  bolt.gun('bolt_laser_gun', 12.5, 'energy', bolt.receiver(bodyFront, underside, top, w, { front: 0.14, top: 0.37, halfWidth: 0.045 }) + [
    // The emitter: a brass band closing the block, a squared steel head with two dark cooling grooves, and the lens.
    bolt.band('front-band', 'trim', bodyFront - 0.03, bodyFront, underside, top, w, 0.018, 0.012),
    h.prism('emitter', 'metal', 'x', bolt.bevel(beamY - emitter.half, beamY + emitter.half, emitter.half, 0.02), bodyFront, muzzleX - 0.006),
    h.prism('lens', 'glow', 'x', bolt.bevel(beamY - emitter.lens, beamY + emitter.lens, emitter.lens, 0.012), muzzleX - 0.01, muzzleX),
  ] + [
    h.prism('emitter-groove-%d' % i, 'vent', 'x', bolt.bevel(beamY - emitter.half - 0.003, beamY + emitter.half + 0.003, emitter.half + 0.003, 0.021), bodyFront + 0.03 + i * 0.035, bodyFront + 0.04 + i * 0.035)
    for i in [0, 1]
  ] + [
    onFlank('slit-%d-%s' % [i, s], 'glow', s, [slits.x0 + i * slits.pitch, slits.y0], [slits.x0 + i * slits.pitch + slits.width, slits.y1], -0.001, 0.003)
    for i in std.range(0, slits.count - 1)
    for s in std.objectFields(sides)
  ] + [
    box('fin-%d' % i, 'metal', [fins.x0 + i * fins.pitch, top - 0.005, -fins.halfWidth], [fins.x0 + i * fins.pitch + fins.thick, top + fins.height, fins.halfWidth])
    for i in std.range(0, fins.count - 1)
  ] + std.flattenArrays([
    local z = sides[s] * (w + canister.sink);
    local riser = canister.x1 + 0.01;
    [
      h.turned('canister-%s' % s, 'metal', 'x', [[0, 0], [0, canister.r], [canister.x1 - canister.x0, canister.r], [canister.x1 - canister.x0, 0]], [canister.x0, canister.y, z]) + { sides: 8 },
      h.turned('canister-back-%s' % s, 'trim', 'x', [[0, 0], [0, canister.r * 0.8], [0.01, canister.r * 0.8], [0.01, 0]], [canister.x0 - 0.01, canister.y, z]) + { sides: 8 },
      h.turned('canister-front-%s' % s, 'trim', 'x', [[0, 0], [0, canister.r * 0.8], [0.01, canister.r * 0.8], [0.01, 0]], [canister.x1, canister.y, z]) + { sides: 8 },
      onFlank('strap-%s-a' % s, 'accent', s, [canister.x0 + 0.03, canister.y - canister.r - 0.003], [canister.x0 + 0.045, canister.y + canister.r + 0.003], -0.001, canister.sink + canister.r + 0.003),
      onFlank('strap-%s-b' % s, 'accent', s, [canister.x1 - 0.045, canister.y - canister.r - 0.003], [canister.x1 - 0.03, canister.y + canister.r + 0.003], -0.001, canister.sink + canister.r + 0.003),
      // The coolant line: out of the canister's front cap and up the flank into the block under the fins.
      onFlank('pipe-foot-%s' % s, 'metal', s, [canister.x1, canister.y - canister.pipe / 2], [riser + canister.pipe, canister.y + canister.pipe / 2], -0.001, canister.sink + canister.pipe / 2),
      onFlank('pipe-%s' % s, 'metal', s, [riser, canister.y - canister.pipe / 2], [riser + canister.pipe, top - 0.02], -0.001, canister.pipe),
    ]
    for s in std.objectFields(sides)
  ])
  + bolt.cell(0.15, underside) + bolt.grip(0.155) + bolt.stock(top, 0.05), { glow: 'crystal-glow-blue' }) + { title: 'Basic laser gun' },
]
