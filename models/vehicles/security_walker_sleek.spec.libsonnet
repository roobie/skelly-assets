// A shallow rotating upper body above the original security walker's fixed leg carrier.
// All measurements in metres in the vehicle source frame (+x forward, +y up, +z near).
local base = import 'security_walker.spec.libsonnet';
local high = 4.45;
{
  base: base,
  paint: base.paint,
  frame: base.frame,
  trim: 'steel-grey',
  grain: 0.02,
  rotary: { centre: [0, 3.90, 0], inner: 0.60, outer: 0.90 },
  hull: {
    low: 3.97, high: high, wall: 0.06, bands: 16,
    // Counter-clockwise in a y-prism's (z, x) plane. The roof pulls back from the low pointed nose.
    bottom: [[0.65, -1.30], [0.96, -0.65], [0.98, 0.65], [0.52, 1.50], [-0.52, 1.50], [-0.98, 0.65], [-0.96, -0.65], [-0.65, -1.30]],
    roof: [[0.48, -1.05], [0.60, -0.55], [0.61, 0.27], [0.37, 0.62], [-0.37, 0.62], [-0.61, 0.27], [-0.60, -0.55], [-0.48, -1.05]],
  },
  weaponLift: 0.35,
  weaponSites: ['pod_mount_near', 'pod_mount_far', 'weapon_pod_near', 'weapon_pod_far', 'pod_gun_near', 'pod_gun_far'],
  ammo: {
    // Heights are on the unlifted pod; the far module mirrors the near one.
    path: [[-0.07, 1.88], [0.08, 1.88], [0.24, 1.78], [0.36, 1.66], [0.36, 1.51]],
    centreY: 3.755,
  },
  lights: {
    baseHeadlamps: [1.49, 3.08, 0.65],
    turretHeadlamps: [0.90, 4.16, 1.00],
    floodlight: [1.44, 3.48, 0],
  },
  optics: [
    { id: 'gunner_sight', part: 'ifv_gunner_sight', at: [0.43, high, -0.28] },
    { id: 'commander_sight', part: 'ifv_commander_sight', at: [-0.20, high, 0.40] },
    { id: 'rear_periscope', part: 'ifv_turret_periscope', at: [-0.76, high, 0] },
  ],
  // The smallest vertical gap between the fixed and the turning fittings, so the upper body clears at every yaw.
  yawClearance: 0.04,
}
