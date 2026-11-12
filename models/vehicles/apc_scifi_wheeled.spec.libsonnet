// A wheeled sci-fi armoured carrier: a low, bullet-shaped hull slung between four large wheels,
// entered by a rear ramp, with one remote weapon station on the roof. Metres in the vehicle frame (+x forward, +y up,
// +z near).
local wheels = import 'wheels.libsonnet';
local wheel = 'wheel_385_95r25';
local radius = wheels[wheel].tyre.outer;
// A superellipse's unit curve: 1 at its middle, 0 at its end.
local curve(p, t) = std.pow(1 - std.pow(std.min(std.abs(t), 1), p), 1 / p);
{
  local s = self,
  paint: 'paint-sand',
  frame: 'paint-charcoal',
  trim: 'steel-grey',
  grain: 0.02,
  // The flotation tyre is the kit's largest, so the wheels stand above the hull's widest line and the
  // hull reads as slung between them.
  wheel: { name: wheel, radius: radius, z: 1.30, brake: 'disc' },
  axles: [2.0, -2.0],
  // The air every arch keeps round its tyre.
  archGap: 0.07,
  // The hull is a superellipsoid cut flat at the tail for the ramp. Its section, side view and plan each have an
  // exponent: a low one gives the pointed nose and a high one the blunt tail, so the body reads as a bullet.
  body: {
    centre: [-0.05, 1.12],
    top: 1.80,
    belly: 0.38,
    // Reaches from the centre, up and down; each is past the hull's top or belly so the roof and belly stay broad.
    up: 0.75,
    down: 0.85,
    half: 1.42,
    nose: 3.35,
    tail: 3.5,
    section: 3,
    noseSide: 2.2,
    tailSide: 4,
    nosePlan: 2.5,
    tailPlan: 5,
    rearFace: -3.30,
    bands: 34,
    // The half-width of the core between the wheels: the arches' inboard wall.
    core: 1.03,
    steps: 12,
  },
  ramp: { low: 0.62, high: 1.55, half: 0.75 },
  rails: { z: 0.82, from: -2.55, to: 0.95, posts: [-2.40, -0.80, 0.80], height: 0.12, bar: 0.04 },
  weaponStation: { x: -0.60, ring: 0.60, dome: 0.55, gunY: 2.20, muzzle: 1.20 },
  canopy: { x: 1.10, half: 0.55, front: 0.42, back: 0.62, height: 0.27, bands: 6, visor: [2, 4] },
  pannier: { x: [-1.15, 1.15], y: [0.62, 1.15], z: [1.30, 1.50] },
  hatches: { x: -1.90, z: 0.42 },
  lamps: { y: 0.85, z: 0.62, tailY: 1.30, tailZ: 0.95 },

  // The hull's half-width, nose and tail at height y.
  local b = s.body,
  local t(y) = (y - b.centre[1]) / (if y > b.centre[1] then b.up else b.down),
  halfAt(y):: b.half * curve(b.section, t(y)),
  noseAt(y):: b.centre[0] + b.nose * curve(b.noseSide, t(y)),
  tailAt(y):: b.centre[0] - b.tail * curve(b.tailSide, t(y)),
  // A convex, counter-clockwise outline in a y prism's (z, x) plane round `x`, `half` wide, reaching `front` ahead and
  // `back` behind, each half a superellipse of its own exponent.
  outline(x, half, front, back, nf, nb, steps)::
    local quarter(n, sx, sz, i) = local a = std.pi / 2 * i / steps;
      [sz * half * std.pow(std.cos(a), 2 / n), x + sx * std.pow(std.sin(a), 2 / n) * (if sx > 0 then front else back)];
    [quarter(nf, 1, 1, i) for i in std.range(0, steps - 1)]
    + [quarter(nf, 1, -1, steps - i) for i in std.range(0, steps - 1)]
    + [quarter(nb, -1, -1, i) for i in std.range(0, steps - 1)]
    + [quarter(nb, -1, 1, steps - i) for i in std.range(0, steps - 1)],
  // The hull's plan at height y.
  planAt(y):: s.outline(b.centre[0], s.halfAt(y), s.noseAt(y) - b.centre[0], b.centre[0] - s.tailAt(y), b.nosePlan, b.tailPlan, b.steps),
  // How far the hull's nose reaches at height y and side offset z, for fittings on its curve.
  noseXAt(y, z):: b.centre[0] + (s.noseAt(y) - b.centre[0]) * curve(b.nosePlan, z / s.halfAt(y)),
  // How far along x an arch reaches either side of its axle within the band from y0 to y1, or null above it.
  archAt(y0, y1)::
    local hub = s.wheel.radius;
    local reach = s.wheel.radius + s.archGap;
    local y = std.max(y0, std.min(hub, y1));
    if y <= hub then reach else if y - hub < reach then std.sqrt(reach * reach - (y - hub) * (y - hub)) else null,
}
