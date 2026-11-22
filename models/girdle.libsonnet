// The shoulder girdle drawn from the bust measured by `m`: the trapezius sloping off the neck's foot to the chest's
// side, and the deltoid spheroid on each side. The bust draws it and worn shells fit to it, so a shell over the
// shoulders cannot drift from the body under it.
function(m) {
  chestTop: m.pelvisHeight + m.waistHeight + m.ribHeight + m.chestHeight,
  neckFoot: m.neckWidth / 2,
  slopeRun: m.chestWidth / 2 - self.neckFoot,
  slopeLength: std.sqrt(self.slopeRun * self.slopeRun + m.trapeziusDrop * m.trapeziusDrop),
  // The deltoid on the figure's left (+x), its right the mirror: a spheroid upright about its centre, the shoulder
  // joint, `radius` round in plan and `halfHeight` from the centre to its crown. A body whose shoulder joints stand off
  // the trunk's centre line, front to back, gives `shoulderJointForward`; without it they lie on it.
  deltoid: {
    x: m.chestWidth / 2 + m.shoulderJointOut,
    y: $.chestTop - m.shoulderJointBelow,
    z: std.get(m, 'shoulderJointForward', 0),
    radius: m.deltoidRadius,
    halfHeight: $.chestTop - m.trapeziusDrop + m.deltoidCrown - self.y,
  },
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
  // The bust family's params: the measures, with the girdle's shape in place of those only it is drawn from, which are
  // hidden. What the measures hide stays hidden, so the family is not given it, and a caller giving one shows it with
  // `:::`, as the avatar does a clavicle's cut.
  bustParams::
    m {
      shoulderJointOut:: super.shoulderJointOut,
      shoulderJointBelow:: super.shoulderJointBelow,
      shoulderJointForward:: super.shoulderJointForward,
      deltoidRadius:: super.deltoidRadius,
      deltoidCrown:: super.deltoidCrown,
      trapeziusDrop:: super.trapeziusDrop,
      girdle: { trapezius: $.trapezius(0), deltoid: $.deltoid },
    },
}
