// The mannequin's leg joints in the families' terms. The player's leg stands on them too
// (models/measures/leg.libsonnet), so one garment fits both dolls, and they stand apart from measures.libsonnet because
// that reads the player's measures.
local skeleton = import 'skeleton.libsonnet';
local head = skeleton.head;

// Where the bust's drawing frame stands in the doll frame: on the centre line at the hips' foot, where the pelvis is
// drawn up from. A height of the bust's measures is from there. The hips' foot is flesh, set by hand against the
// mannequin, as no joint marks it.
local bustBase = [0, 0.84, 0];
// The skeleton is symmetric across x, so the leg is measured on the left, the reference side. It hangs as the
// skeleton's does, so the right leg's delta is the left's mirrored.
local legDelta(from, to) = local d = skeleton.delta(from + '_l', to + '_l'); [-d[0], d[1], d[2]];
local knee = legDelta('thigh', 'calf');
{
  bustBase: bustBase,
  leg: {
    // The left hip joint in the bust's frame; the right one mirrors it across x.
    hip:: [head('thigh_l')[i] - bustBase[i] for i in [0, 1, 2]],
    origins: { thigh: [0, 0, 0], shin: knee, foot: legDelta('thigh', 'foot') },
    // The toes bend about ball's head, which the foot is cut across at.
    ballJoint: legDelta('thigh', 'ball'),
    length: head('thigh_l')[1],
    thighLength: -knee[1],
    shoeHeight: head('foot_l')[1],
  },
}
