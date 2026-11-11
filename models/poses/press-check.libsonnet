// The press check: the doll carries the assault rifle at low ready, rolls it to look into the ejection port, draws and
// releases the charging handle and comes back to low ready, as key frames tools/press-check.mjs writes as pose files
// (models/poses/press-*.json). The stock stays in the right shoulder throughout and the bore points straight ahead,
// parallel to the figure's centre line and tipped down, so the muzzle never sweeps across the body; the rifle rolls
// about its own bore to show the port, as a shooter rolls it rather than turning it away.
//
// Points and sockets are in the rifle's frame (its bore along +z, the port side -x). A frame's `carry` turns the rifle
// (degrees: pitch tips the bore down, roll turns it about the bore), `look` is the rifle point the eyes turn to and
// `tilt` leans the head toward the figure's right. A left hand `hold`s a socket, may `pinch` named rifle points (moved
// with the charging handle's draw), or `reach`es a rifle point with its own wrist angles and hand shorthand where no
// socket fits.
// The handguard's underside, palm up, the thumb along the bore. `beneath` keeps it below the bore however the rifle
// rolls, as a supporting hand stays under the handguard while the other hand rolls the rifle.
local support = { hold: { socket: { at: [0.013, -0.0225, 0.1], into: [-0.5, 0.866, 0], axis: [0.557, 0.321, 0.766] }, beneath: true, pole: [0, -1, 0] }, hands: 'support' };
// The thumb pad on the rear face of the T's left wing and the index pad on the latch's front face, the palm beside and
// behind the T; the other fingers close on the rifle by contact.
local pinch(drawn) = {
  hold: {
    socket: { at: [0.062, 0.002, -0.161], into: [-0.75, -0.5, -0.433], axis: [-0.625, 0.75, 0.217] },
    pole: [0.483, -0.866, -0.129],
    pinch: { thumb: [0.02, 0.022, -0.196], index: [0.024, 0.022, -0.18] },
  },
  hands: 'pinch',
  drawn: drawn,
};
// Low ready: the bore tipped down ahead, the right elbow out and a little down. Turned: rolled to bring the port up
// toward the eyes, the right elbow lifted toward the shoulder as the grip hand rolls it, the head tilted over the
// rifle.
local ready = { carry: { pitch: 15, yaw: 0, roll: 0 }, gripPole: [-0.94, 0.342, 0], look: [0, 0, 3], left: support };
local turned = { carry: { pitch: 15, yaw: 0, roll: -45 }, gripPole: [-0.853, -0.174, 0.492], look: [-0.03, 0.005, -0.1], tilt: 20 };
local retracted = { moved: { 'charging-handle': 1, 'bolt-carrier': 1 } };
{
  rifle: 'rifle_assault',
  // Bladed, the left shoulder forward (negative spine twist turns the figure toward its right), leaning in.
  stance: { spine: [4, -15, 0], 'thigh.R': [5, 0, -3], 'thigh.L': [5, 0, 3] },
  // The eyes from the head's joint, in the head's frame.
  eye: [0, 0.11, 0.08],
  // The butt pad's middle, pressed into the pocket: a point in the torso's frame, from the right shoulder joint.
  butt: [0, -0.02, -0.38],
  pocket: [0.06, -0.11, 0.04],
  // The right palm on the pistol grip; each frame gives the elbow's pole.
  grip: { socket: { at: [-0.016, -0.09, -0.164], into: [0.781, 0.188, -0.596], axis: [0, 0.95, 0.3] } },
  frames: {
    'press-1-fire': ready,
    'press-2-turned': turned { left: support },
    'press-3-handle': turned { left: pinch(0) },
    'press-4-retracted': turned + retracted { left: pinch(1) },
    'press-5-inspect': turned + retracted { left: pinch(1) },
    // The handle let go, the hand open beside the receiver's left side.
    'press-6-released': turned { left: { reach: { at: [0.09, 0.03, -0.1], pole: [0.3, -1, 0], hand: [0, 0, 0] }, hands: { curl: 0.1, thumb: { across: 0.2, oppose: 0.4, lift: 0.2 } } } },
    // The left index pushes the port cover shut; the cover is part of the receiver mesh, so it has no motion.
    'press-7-cover': turned { left: { reach: { at: [-0.08, 0.055, -0.11], pole: [0.5, -0.87, 0], hand: [30, 0, 0] }, hands: { curl: { middle: 0.8, ring: 0.9, little: 0.9 }, thumb: { across: 0.4, oppose: 0.6, lift: 0.3 } } } },
    'press-8-fire': ready,
  },
}
