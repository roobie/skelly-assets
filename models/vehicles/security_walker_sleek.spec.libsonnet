// A shallow rotating upper body above the original security walker's fixed leg carrier.
// All measurements in metres in the vehicle source frame (+x forward, +y up, +z near).
local base = import 'security_walker.spec.libsonnet';
{
  base: base,
  paint: base.paint,
  frame: base.frame,
  trim: 'steel-grey',
  grain: 0.02,
  rotary: { centre: [0, 3.90, 0], inner: 0.60, outer: 0.90, floor: 3.97 },
  hull: {
    low: 3.97, high: 4.45, wall: 0.06, bands: 16,
    // Counter-clockwise in a y-prism's (z, x) plane. The roof pulls back from the low pointed nose.
    bottom: [[0.65, -1.30], [0.96, -0.65], [0.98, 0.65], [0.52, 1.50], [-0.52, 1.50], [-0.98, 0.65], [-0.96, -0.65], [-0.65, -1.30]],
    roof: [[0.48, -1.05], [0.60, -0.55], [0.61, 0.27], [0.37, 0.62], [-0.37, 0.62], [-0.61, 0.27], [-0.60, -0.55], [-0.48, -1.05]],
  },
  weaponLift: 0.35,
  weaponSites: ['pod_mount_near', 'pod_mount_far', 'weapon_pod_near', 'weapon_pod_far', 'pod_gun_near', 'pod_gun_far'],
  ammoSites: ['ammo_cassette_near', 'ammo_cassette_far', 'ammo_feed_near', 'ammo_feed_far'],
  weaponModuleSites: self.weaponSites + self.ammoSites,
  ammo: {
    // Near-side assembly-frame route below the pod, behind the gun cradle; the far module mirrors it.
    path: [[-0.07, 1.88], [0.08, 1.88], [0.24, 1.78], [0.36, 1.66], [0.36, 1.51]],
    centreY: 4.105,
  },
  lights: {
    baseHeadlamps: [1.49, 3.08, 0.65],
    turretHeadlamps: [0.90, 4.16, 1.00],
    floodlight: [1.44, 3.48, 0],
  },
  optics: [
    { id: 'gunner_sight', part: 'ifv_gunner_sight', at: [0.43, 4.45, -0.28] },
    { id: 'commander_sight', part: 'ifv_commander_sight', at: [-0.20, 4.45, 0.40] },
    { id: 'rear_periscope', part: 'ifv_turret_periscope', at: [-0.76, 4.45, 0] },
  ],
  // Review grouping only: no placement rotation, hierarchy or animation fields are exported.
  rotatingSites: ['hull', 'rotor', 'cooling_pack', 'roof_hatch', 'gunner_sight', 'commander_sight', 'rear_periscope', 'smoke_launcher_near', 'smoke_launcher_far', 'work_lamp_near', 'work_lamp_far', 'turret_headlamp_near', 'turret_headlamp_far'] + self.weaponModuleSites,
  // The static assembly's yaw sweep is NOT a gait or gun-elevation clearance guarantee.
  reviewYawDegrees: [45, 90, 180],
}
