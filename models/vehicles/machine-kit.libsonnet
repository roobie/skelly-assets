// Pressings the machines share: rows stay per-vehicle because each is pressed for its own machine.
local k = import 'kit.libsonnet';
local box = k.box;
local prism = k.prism;
local polar(cx, cy, r, degrees) = [cx + r * std.cos(k.rad(degrees)), cy + r * std.sin(k.rad(degrees))];
// A disc lying across the vehicle at (x, y).
local axleDisc(id, slot, x, y, radius, z, sides=24) =
  local half = (z[1] - z[0]) / 2;
  k.turned(id, slot, 'z', k.disc(radius, -half, half), [x, y, (z[0] + z[1]) / 2]) + { sides: sides };
{
  axleDisc: axleDisc,
  // A driven axle in `beamAxle`'s frame (`shared.libsonnet`), its housing and drums sized for the drawn steel to carry
  // an all-wheel-drive truck's axle weight; a steered one adds the knuckles its front wheels turn on. Its spring seats
  // span `seatZ`, under the springs of the chassis it hangs from. Without `drums` it leaves them to wheels that carry
  // the wheel kit's (`wheel-kit.libsonnet`).
  driveAxle(id, massKg, halfTrack, steered, seatZ=[halfTrack - 0.36, halfTrack - 0.22], drums=true)::
    k.compound(id, massKg, [
      k.turned('beam', 'steel', 'z', k.disc(0.09, -halfTrack, halfTrack), [0, 0.52, 0]) + { sides: 12 },
      box('diff', 'steel', [-0.2, 0.33, -0.19], [0.2, 0.71, 0.19]),
    ] + k.bothSides([
      box('spring_seat', 'steel', [-0.09, 0.6, seatZ[0]], [0.09, 0.64, seatZ[1]]),
    ] + (if drums then [
      k.turned('drum', 'steel', 'z', k.disc(0.21, halfTrack - 0.14, halfTrack), [0, 0.52, 0]) + { sides: 12 },
    ] else []) + (if steered then [box('knuckle', 'steel', [-0.12, 0.36, halfTrack - 0.3], [0.12, 0.68, halfTrack - 0.14])] else [])), { steel: 'steel-grey' }),
  // A tyre on its hub at the origin, lugged when `lugs` is above zero so it reads as off-road.
  wheel(id, massKg, width, rim, outer, lugs=0, lug=0.025, hub='steel-grey')::
    local body = outer - (if lugs > 0 then lug else 0);
    k.compound(id, massKg, [
      k.turned('tyre', 'tyre', 'z', k.tyreProfile(width, rim, body, 0.08)) + { sides: 24 },
      k.turned('rim', 'rim', 'z', k.disc(rim, -width * 0.36, width * 0.36)) + { sides: 24 },
      k.turned('cap', 'cap', 'z', k.disc(rim * 0.4, width * 0.3, width * 0.42)) + { sides: 12 },
    ] + (if lugs > 0 then std.flattenArrays([
      local at = 360 * i / lugs;
      k.arc('lug_' + i, 'tyre', 0, 0, body - 0.01, outer, at, at + 180 / lugs, 1, [-width / 2, width / 2])
      for i in std.range(0, lugs - 1)
    ]) else []), { tyre: 'rubber-black', rim: hub, cap: 'paint-charcoal' }, { hub: ['rim', [0.5, 0.5, 0.5]] }),
  // A curved dig bucket: a shell around (cx, cy) from `from` to `to` degrees, side plates and teeth at the `from` lip.
  bucket(cx, cy, radius, from, to, halfWidth, thick=0.05, teeth=5, tooth=0.14)::
    local z = [-halfWidth, halfWidth];
    local lip = polar(cx, cy, radius - thick / 2, from);
    local steps = 8;
    local side = [polar(cx, cy, radius, from + (to - from) * i / steps) for i in std.range(0, steps)];
    local tip = polar(lip[0], lip[1], tooth, from - 90);
    local plate(near) =
      local range = if near then [halfWidth - 0.05, halfWidth] else [-halfWidth, -halfWidth + 0.05];
      prism(if near then 'side_near' else 'side_far', 'shell', side, range);
    k.arc('shell', 'shell', cx, cy, radius - thick, radius, from, to, steps, z)
    + [plate(true), plate(false)]
    + [
      local at = -halfWidth + (2 * halfWidth) * (i + 0.5) / teeth;
      k.bar('tooth_' + i, 'tooth', lip, tip, 0.05, [at - 0.04, at + 0.04], 0.03)
      for i in std.range(0, teeth - 1)
    ],
  // A folding step with a grab rail is how an open machine is entered: its hinge runs along the tread's rear edge.
  step(id, massKg, x, y, z, finish='paint-charcoal', rail=null):: k.compound(id, massKg, [
    box('tread', 'tread', [x[0], y - 0.06, z[0]], [x[1], y, z[1]]),
  ] + (if rail == null then [] else [
    box('hanger_a', 'tread', [x[0] + 0.02, y, z[0]], [x[0] + 0.06, rail, z[0] + 0.04]),
    box('hanger_b', 'tread', [x[1] - 0.06, y, z[0]], [x[1] - 0.02, rail, z[0] + 0.04]),
    box('rail', 'tread', [x[0] + 0.02, rail - 0.04, z[0]], [x[1] - 0.02, rail, z[0] + 0.04]),
  ]), { tread: finish }, {
    hinge_a: ['tread', [0, 0.5, 0]],
    hinge_b: ['tread', [1, 0.5, 0]],
  }),
}
