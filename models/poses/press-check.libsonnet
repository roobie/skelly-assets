// The press check: the doll holds the assault rifle at unsighted fire, rolls it to look into the ejection port, draws
// the charging handle just far enough to see brass in the chamber, releases it and comes back to unsighted fire, as
// key frames tools/press-check.mjs writes as pose files (models/poses/press-*.json). The stock stays in the right
// shoulder throughout and the bore points straight ahead, parallel to the figure's centre line, level at fire and
// tipped down while rolled, so the muzzle never sweeps across the body; the rifle rolls about its own bore to show the
// port, as a shooter rolls it rather than turning it away.
//
// A point of the rifle is one its export names (`from`: one of its anchors, or `grip`), moved by `offset` in the
// rifle's frame (its bore along +z, up +y, the port side -x), so a reshaped rifle carries the hands and eyes with it.
// A point `on` one of the rifle's moving parts is the part's point at rest, carried wherever the frame's `moved` stands
// the part, so a hand on a drawn handle or an open cover stays on it.
// A frame's `carry` turns the rifle (degrees: pitch tips the bore down, roll turns it about the bore), `look` is the
// rifle point the eyes turn to and `tilt` leans the head toward the figure's right. The left hand `hold`s a socket,
// may `pinch` named rifle points and, with `close: false`, rests there open instead of gripping.
// The pose page plays the frames as a clip in their names' numbered order, so a frame's number is its place in the check.
//
// A frame's `into` is the seconds the move into it takes from the frame before, and `hold` the seconds it stays before
// the next move begins. The times are those of a practised hand: a reach of a forearm's length to a small target and a
// grasp take under half a second, a pull of a few centimetres a fifth, a look that sees and confirms the chamber about
// two eye fixations, and a spring-driven release a blink. So the check settles at unsighted fire, rolls deliberately
// to the port, draws the handle briskly, pauses to look, and lets go, reaches the open cover, flicks it shut and comes
// back quickly, under four seconds in all. Each move eases out of rest and into rest, as a hand moving from one place
// to the next does.
// The hands meet the rifle as every held rifle_assault does (models/poses/guns/sockets.libsonnet): a frame's left hand
// holding `socket: 'support'` takes that row's support socket.
local sockets = (import 'guns/sockets.libsonnet').rifle_assault;
// The left hand never takes the rifle in a power grip: it cradles, pinches and pushes with the fingers, so its sockets
// meet the palm square across the knuckle crease (`crease`), where the fingers' bases carry a handguard, not slanted
// deep in the palm.
local crease = { grip: sockets.support.grip, slant: sockets.support.slant };
// `beneath` keeps the support hand below the bore however the rifle rolls, as a supporting hand stays under the
// handguard while the other hand rolls the rifle.
local support = { hold: crease { socket: 'support', beneath: true, pole: [0, -1, 0] }, hands: sockets.support.hands };
// The thumb pad on the T's rear face left of the middle and the index pad on its left end, the palm beside and behind
// the T; the other fingers close on the rifle by contact. The T's anchor is the middle of its rear face.
local handle(offset) = { from: 'charging_handle', offset: offset, on: 'charging-handle' };
local pinch = {
  hold: crease {
    socket: { at: handle([0.051, -0.02, 0.03]), into: [-0.75, -0.5, -0.433], axis: [-0.625, 0.75, 0.217] },
    pole: [0.483, -0.866, -0.129],
    pinch: { thumb: handle([0.009, 0, -0.005]), index: handle([0.0195, 0, 0.003]) },
  },
  hands: 'pinch',
};
// Unsighted fire: the bore level ahead with the stock in the shoulder, the eyes over the rifle rather than on its
// sights, the right elbow out to the side, since a lower elbow bends the wrist on the raked grip past its limit; the
// check starts and ends where a shooter fires from. Turned: rolled to bring the port up toward the eyes, the right
// elbow lifted toward the shoulder as the grip hand rolls it, the head tilted over the rifle.
// The ejection port's anchor is the middle of the port's opening.
local port(offset) = { from: 'ejection', offset: offset };
local ready = { carry: { pitch: 0, yaw: 0, roll: 0 }, gripPole: [-0.94, 0, 0], look: { from: 'muzzle', offset: [0, 0, 3] }, left: support };
local turned = { carry: { pitch: 15, yaw: 0, roll: -45 }, gripPole: [-0.853, -0.174, 0.492], look: port([-0.01, 0.01, 0]), tilt: 20 };
// A press check draws the carrier only far enough to show the case head in the chamber, a short pull, not the full
// stroke a rack takes, so the round stays in the chamber. The carrier's first movement springs the port cover open,
// and it stays open until the hand shuts it.
local pull = 0.3;
local coverOpen = { 'port-cover': 1 };
// A point of the cover, given where it stands shut.
local cover(offset) = port(offset) { on: 'port-cover' };
// The hand that shuts the cover: the index reaching, the other fingers curled out of its way.
local coverHand = {
  hold: crease { pole: [0.5, -0.87, 0] },
  hands: { curl: { middle: 0.8, ring: 0.9, little: 0.9 }, thumb: { across: 0.4, oppose: 0.6, lift: 0.3 } },
};
local retracted = { moved: coverOpen { 'charging-handle': pull, 'bolt-carrier': pull } };
{
  rifle: 'rifle_assault',
  // Bladed, the left shoulder forward (negative spine twist turns the figure toward its right), leaning in.
  stance: { spine: [4, -20, 0], 'thigh.R': [5, 0, -3], 'thigh.L': [5, 0, 3] },
  // The butt pad's middle and the pocket it stands in: a point in the torso's frame, from the right shoulder joint. The
  // pocket is ahead of the shoulder joint, on the flat of the chest just inside the arm, so the stock bears on the chest
  // by its inner edge however the rifle rolls, rather than lying along the slope where the chest turns toward the arm.
  butt: { from: 'butt' },
  pocket: [0.015, -0.11, 0.07],
  // The right palm on the pistol grip, each frame giving the elbow's pole.
  sockets: sockets,
  easing: 'minimum-jerk',
  frames: {
    'press-1-fire': ready { hold: 0.3 },
    'press-2-turned': turned { left: support, into: 0.5 },
    'press-3-handle': turned { left: pinch, into: 0.45 },
    'press-4-retracted': turned + retracted { left: pinch, into: 0.2 },
    // The pose of the frame before, held while the eyes find the round in the chamber.
    'press-5-inspect': turned + retracted { left: pinch, into: 0.6 },
    // The handle let go, the open hand beside the receiver's left side, palm toward it, not holding.
    'press-6-released': turned {
      into: 0.12,
      moved: coverOpen,
      left: {
        hold: crease { socket: { at: port([0.078, 0.009, -0.021]), into: [-1, 0, 0], axis: [0, 1, 0] }, pole: [0.2, -1, -0.4], close: false },
        hands: { curl: 0.1, thumb: { across: 0.2, oppose: 0.4, lift: 0.2 } },
      },
    },
    // The left hand over the receiver's right side, its index pad under the open cover's free edge, on the face that
    // closes the port, before it lifts the cover.
    'press-7-cover-open': turned {
      into: 0.35,
      moved: coverOpen,
      left: coverHand { hold+: { socket: { at: port([-0.004, 0.019, -0.004]), into: [0.5, -0.866, 0], axis: [-0.224, -0.129, -0.966] }, pinch: { index: cover([0.011, 0.0085, -0.03]) } } },
    },
    // The index pad on the shut cover's outer face below the port's middle, having swung it up shut.
    'press-8-cover-shut': turned {
      into: 0.15,
      hold: 0.1,
      left: coverHand { hold+: { socket: { at: port([-0.002, 0.045, -0.004]), into: [0.5, -0.866, 0], axis: [-0.224, -0.129, -0.966] }, pinch: { index: port([-0.006, -0.006, -0.03]) } } },
    },
    'press-9-fire': ready { into: 0.5, hold: 0.4 },
  },
}
