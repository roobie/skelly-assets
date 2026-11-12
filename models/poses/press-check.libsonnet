// The press check: the doll carries the assault rifle at low ready, rolls it to look into the ejection port, draws and
// releases the charging handle and comes back to low ready, as key frames tools/press-check.mjs writes as pose files
// (models/poses/press-*.json). The stock stays in the right shoulder throughout and the bore points straight ahead,
// parallel to the figure's centre line and tipped down, so the muzzle never sweeps across the body; the rifle rolls
// about its own bore to show the port, as a shooter rolls it rather than turning it away.
//
// Points and sockets are in the rifle's frame (its bore along +z, the port side -x). A frame's `carry` turns the rifle
// (degrees: pitch tips the bore down, roll turns it about the bore), `look` is the rifle point the eyes turn to and
// `tilt` leans the head toward the figure's right. The left hand `hold`s a socket, may `pinch` named rifle points
// (moved with the charging handle's draw) and, with `close: false`, rests there open instead of gripping.
// The pose page plays the frames as a clip in their names' numbered order, so a frame's number is its place in the check.
//
// A frame's `into` is the seconds the move into it takes from the frame before, and `hold` the seconds it stays before
// the next move begins. The times are those of a practised hand: a reach of a forearm's length to a small target and a
// grasp take under half a second, a pull of a few centimetres a fifth, a look that sees and confirms the chamber about
// two eye fixations, and a spring-driven release a blink. So the check settles at low ready, rolls deliberately to the
// port, draws the handle briskly, pauses to look, and lets go, shuts the cover and comes back quickly, three and a half
// seconds in all. Each move eases out of rest and into rest, as a hand moving from one place to the next does.
// The left hand never takes the rifle in a power grip: it cradles, pinches and pushes with the fingers, so its sockets
// meet the palm square across the knuckle crease (`crease`), where the fingers' bases carry a handguard, not slanted
// deep in the palm.
local crease = { grip: 0.95, slant: 0 };
// The handguard's underside, palm up, the thumb along the bore. `beneath` keeps it below the bore however the rifle
// rolls, as a supporting hand stays under the handguard while the other hand rolls the rifle.
local support = { hold: crease { socket: { at: [0.013, -0.0225, 0.1], into: [-0.5, 0.866, 0], axis: [0.557, 0.321, 0.766] }, beneath: true, pole: [0, -1, 0] }, hands: 'support' };
// The thumb pad on the rear face of the T's left wing and the index pad on the latch's front face, the palm beside and
// behind the T; the other fingers close on the rifle by contact.
local pinch(drawn) = {
  hold: crease {
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
  // The right palm on the pistol grip in a power grip, so the thumb closes down the grip's left side rather than
  // lying where the hand at rest leaves it, across the grip's back; each frame gives the elbow's pole. The grip is
  // slanted across the palm a little less than a handle, since a raked pistol grip already bends the wrist toward the
  // thumb and the full slant would ask it past its limit.
  grip: { hold: { socket: { at: [-0.016, -0.09, -0.164], into: [0.781, 0.188, -0.596], axis: [0, 0.95, 0.3] }, slant: 15 }, hands: 'grip' },
  easing: 'minimum-jerk',
  frames: {
    'press-1-fire': ready { hold: 0.3 },
    'press-2-turned': turned { left: support, into: 0.5 },
    'press-3-handle': turned { left: pinch(0), into: 0.45 },
    'press-4-retracted': turned + retracted { left: pinch(1), into: 0.2 },
    // The pose of the frame before, held while the eyes find the round in the chamber.
    'press-5-inspect': turned + retracted { left: pinch(1), into: 0.6 },
    // The handle let go, the open hand beside the receiver's left side, palm toward it, not holding.
    'press-6-released': turned {
      into: 0.12,
      left: {
        hold: crease { socket: { at: [0.07, 0, -0.07], into: [-1, 0, 0], axis: [0, 1, 0] }, pole: [0.3, -1, 0], close: false },
        hands: { curl: 0.1, thumb: { across: 0.2, oppose: 0.4, lift: 0.2 } },
      },
    },
    // The left hand over the receiver's right side, its index pad pushing the port cover up shut; the cover is part of
    // the receiver mesh, so it has no motion.
    'press-7-cover': turned {
      into: 0.35,
      hold: 0.1,
      left: {
        hold: crease { socket: { at: [-0.022, 0.039, -0.07], into: [0.5, -0.866, 0], axis: [0, 0, -1] }, pole: [0.5, -0.87, 0], pinch: { index: [-0.026, -0.012, -0.1] } },
        hands: { curl: { middle: 0.8, ring: 0.9, little: 0.9 }, thumb: { across: 0.4, oppose: 0.6, lift: 0.3 } },
      },
    },
    'press-8-fire': ready { into: 0.5, hold: 0.4 },
  },
}
