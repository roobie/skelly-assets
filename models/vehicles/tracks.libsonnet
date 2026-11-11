// The tracks built as a band of links round their class's wheels; see `track-kit.libsonnet`. A track is keyed by the
// id of its fused row. Each wheel is its site and its class entry, at (x, y) in the track's frame: x forward, y up from
// the ground, the band centred across z with +z outboard. `loop` names the wheels the band wraps, counter-clockwise
// seen from the near side (rear to front along the ground, then back over the top); the other wheels stand on its
// runs. A machine's track frame is drawn with the band and weighs `frame.massKg`, in its `finish` when it names one;
// an armoured hull carries its own suspension arms, so its track has none.
{
  // A 14-tonne excavator's: 3.75 m long, its drive sprocket at the rear.
  excavator_track: {
    class: 'crawler_medium',
    frame: { massKg: 280, x: [-1.145, 1.145], y: [0.25, 0.55], halfWidth: 0.12 },
    wheels: [
      { site: 'sprocket', key: 'sprocket', at: [-1.465, 0.41] },
      { site: 'idler', key: 'idler', at: [1.465, 0.41] },
    ] + [
      { site: 'roller_' + i, key: 'roller', at: [-1.05 + 0.35 * i, 0.17] }
      for i in std.range(0, 6)
    ],
    loop: ['sprocket', 'idler'],
  },
  // A 20-tonne crawler dozer's: idlers at both ends of the ground run and the drive sprocket raised over the rear one,
  // out of the dirt and clear of the shocks the blade sends through the rollers, so the band runs as a triangle.
  bulldozer_track: {
    class: 'crawler_heavy',
    frame: { massKg: 600, x: [-1.1, 1.1], y: [0.38, 0.56], halfWidth: 0.16 },
    wheels: [
      { site: 'sprocket', key: 'sprocket', at: [-0.85, 1.0] },
      { site: 'idler_rear', key: 'idler', at: [-1.5, 0.49] },
      { site: 'idler_front', key: 'idler', at: [1.44, 0.49] },
    ] + [
      { site: 'roller_' + i, key: 'roller', at: [-0.96 + 0.32 * i, 0.27] }
      for i in std.range(0, 6)
    ],
    loop: ['idler_rear', 'idler_front', 'sprocket'],
  },
  // A 6-tonne trencher's rubber track: 2.5 m long, its drive sprocket at the rear.
  trencher_track: {
    class: 'rubber_compact',
    frame: { massKg: 30, x: [-0.69, 0.69], y: [0.2, 0.42], halfWidth: 0.085 },
    wheels: [
      { site: 'sprocket', key: 'sprocket', at: [-0.93, 0.32] },
      { site: 'idler', key: 'idler', at: [0.93, 0.32] },
    ] + [
      { site: 'roller_' + i, key: 'roller', at: [-0.6 + 0.4 * i, 0.14] }
      for i in std.range(0, 3)
    ],
    loop: ['sprocket', 'idler'],
  },
  // The CV9040's: seven road wheels a side between a raised drive sprocket at the front and an idler at the rear, and no
  // return rollers, so the top run spans from the sprocket to the idler. The wheels' spacing is read from side
  // drawings of the vehicle, not published.
  cv9040_track: {
    class: 'armoured_medium',
    wheels: [
      { site: 'sprocket', key: 'sprocket', at: [2.62, 0.84] },
      { site: 'idler', key: 'idler', at: [-2.78, 0.62] },
    ] + [
      { site: 'road_wheel_' + i, key: 'roadWheel', at: [-2.1 + 0.67 * i, 0.4] }
      for i in std.range(0, 6)
    ],
    loop: ['idler', 'road_wheel_0', 'road_wheel_6', 'sprocket'],
  },
  // The M3 half-track's rear bogie: a front drive sprocket off the rear axle, a rear idler, two volute-sprung bogies of
  // two wheels each and one return roller between them. Its frame stands in for the bogie's girder, painted with the
  // hull. The wheels' spacing is read from side drawings and the published 1.19 m ground contact.
  half_track_track: {
    class: 'band_light',
    frame: { massKg: 180, x: [-2.2, -0.82], y: [0.38, 0.52], halfWidth: 0.12, finish: 'paint-olive' },
    wheels: [
      { site: 'sprocket', key: 'sprocket', at: [-0.5, 0.52] },
      { site: 'idler', key: 'idler', at: [-2.52, 0.42] },
      { site: 'roller_0', key: 'roller', at: [-1.49, 0.641] },
    ] + [
      { site: 'road_wheel_' + i, key: 'roadWheel', at: [[-2.02, -1.68, -1.3, -0.96][i], 0.22] }
      for i in std.range(0, 3)
    ],
    loop: ['idler', 'road_wheel_0', 'road_wheel_3', 'sprocket'],
  },
}
