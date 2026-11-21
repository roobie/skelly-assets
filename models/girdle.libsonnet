// The shoulder girdle drawn from the bust measured by `m`: the trapezius sloping off the neck's foot to the chest's
// side, and the deltoid spheroid on each side. The bust draws it and worn shells fit to it, so a shell over the
// shoulders cannot drift from the body under it.
function(m) {
  chestTop: m.pelvisHeight + m.waistHeight + m.ribHeight + m.chestHeight,
  neckFoot: m.neckWidth / 2,
  slopeRun: m.chestWidth / 2 - self.neckFoot,
  slopeLength: std.sqrt(self.slopeRun * self.slopeRun + m.trapeziusDrop * m.trapeziusDrop),
  // The deltoid on the figure's left (+x), its right the mirror: a spheroid upright about its centre, the shoulder
  // joint, `radius` round in plan and `halfHeight` from the centre to its crown.
  deltoid: {
    x: m.chestWidth / 2 + m.shoulderJointOut,
    y: $.chestTop - m.shoulderJointBelow,
    radius: m.deltoidRadius,
    halfHeight: $.chestTop - m.trapeziusDrop + m.deltoidCrown - self.y,
  },
  // The rig pivots the arm on the middle of the deltoid's voxels, which lies on the joint only when the joint lies on
  // a voxel's middle or edge; a set scaling the measures draws at its own grain and leaves the grain out.
  local onGrain(v) = local steps = v / (m.voxelGrain / 2); std.abs(steps - std.round(steps)) < 1e-9,
  assert !std.objectHasAll(m, 'voxelGrain') || (onGrain(self.deltoid.x) && onGrain(self.deltoid.y)) :
         'the shoulder joint (%g, %g) lies off the half-voxel grid, so the arm would pivot off it' % [self.deltoid.x, self.deltoid.y],
  // The clip planes that cut a piece to the slope set out `rise` square to it, one per side.
  trapezius(rise):: [
    { normal: [side * m.trapeziusDrop / $.slopeLength, $.slopeRun / $.slopeLength, 0],
      offset: (m.trapeziusDrop * $.neckFoot + $.slopeRun * $.chestTop) / $.slopeLength + rise }
    for side in [1, -1]
  ],
  // The slope's height set out by `rise` at `x`, which must lie past the neck's foot, where the slope is straight.
  slopeY(x, rise)::
    assert std.abs(x) >= $.neckFoot - 1e-9 : 'x %g lies over the neck, off the slope' % x;
    $.chestTop - m.trapeziusDrop * (std.abs(x) - $.neckFoot) / $.slopeRun + rise * $.slopeLength / $.slopeRun,
  // The deltoid's top set out by `rise` at `x`, or null past its reach.
  deltoidY(x, rise)::
    local a = $.deltoid.radius + rise, u = (std.abs(x) - $.deltoid.x) / a;
    if std.abs(u) >= 1 then null else $.deltoid.y + ($.deltoid.halfHeight + rise) * std.sqrt(1 - u * u),
  // The bust family's params: the measures, with the girdle's shape in place of those only it is drawn from.
  bustParams::
    local drawnFrom = ['shoulderJointOut', 'shoulderJointBelow', 'deltoidRadius', 'deltoidCrown', 'trapeziusDrop'];
    std.foldl(std.objectRemoveKey, drawnFrom, m) + { girdle: { trapezius: $.trapezius(0), deltoid: $.deltoid } },
}
