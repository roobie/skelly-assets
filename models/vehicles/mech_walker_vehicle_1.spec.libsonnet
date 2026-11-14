// An armoured security walker on two reverse-knee legs, its boxy torso slung between the hips. Each leg's joints are
// points in the side view (x, y), the pivots its parts turn about: the hip on the torso's flank, the knee ahead of it,
// the ankle behind and above the foot, and the foot's own pivot over its instep.
{
  // The torso's side profile, counter-clockwise from its rear belly: belly, lower glacis, the sensor face, upper glacis,
  // roof and the bevelled rear.
  torso: {
    profile: [[-1.3, 2.85], [0.95, 2.85], [1.55, 3.2], [1.55, 3.85], [0.9, 4.35], [-1.2, 4.35], [-1.5, 4.1], [-1.5, 3.05]],
    half: 1.0,
    plate: 0.06,
  },
  // The sensor window across the face.
  window: { low: 3.5, high: 3.78, half: 0.75 },
  legZ: 1.54,
  hip: [0, 3.35],
  knee: [0.8, 2.4],
  ankle: [-0.55, 1.15],
  foot: [0.05, 0.42],
  // The weapon pod's elevation trunnion on the torso's flank.
  trunnion: [0.2, 4.0],
  paint: 'steel-gunmetal',
  frame: 'paint-charcoal',
  stripe: 'paint-signal-yellow',
  stripeDark: 'paint-graphite',
}
