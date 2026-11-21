// The mannequin's trunk and leg joints in the families' terms, and the trunk's girths. The player's trunk and leg stand
// on them too (models/measures/bust.libsonnet, models/measures/leg.libsonnet), so one garment fits both dolls, and they
// stand apart from measures.libsonnet because that reads the player's measures.
local skeleton = import 'skeleton.libsonnet';
local head = skeleton.head;

// Where the bust's drawing frame stands in the doll frame: on the centre line at the hips' foot, where the pelvis is
// drawn up from. A height of the bust's measures is from there. The hips' foot is flesh, set by hand against the
// mannequin, as no joint marks it.
local bustBase = [0, 0.84, 0];
local inBust(bone) = [head(bone)[i] - bustBase[i] for i in [0, 1, 2]];
// The skeleton is symmetric across x, so the leg is measured on the left, the reference side. It hangs as the
// skeleton's does, so the right leg's delta is the left's mirrored.
local legDelta(from, to) = local d = skeleton.delta(from + '_l', to + '_l'); [-d[0], d[1], d[2]];
local knee = legDelta('thigh', 'calf');
{
  bustBase: bustBase,
  // In the bust's frame. The girths are flesh, set by hand against the mannequin.
  trunk: {
    spine:: inBust('spine_01'),
    neck:: inBust('neck_01'),
    head:: inBust('Head'),
    // The left shoulder joint; the right one mirrors it across x.
    shoulder:: inBust('upperarm_l'),
    // Where the spine bending in three cuts the chest from the ribs: the armpit.
    chestJoint:: inBust('spine_03')[1],
    waistWidth: 0.25, waistDepth: 0.205, waistHeight: 0.17,
    ribWidth: 0.31, ribDepth: 0.235, ribHeight: 0.06,
    chestWidth: 0.34, chestDepth: 0.28,
    // How far the girdle's top falls from the neck's foot to the chest's side, so the shoulders slope as the trapezius
    // does rather than stand square; worn shells over the shoulders follow it.
    trapeziusDrop: 0.02,
    deltoidCrown: 0.03,
    neckWidth: 0.12,
    // The neck runs from its joint to the chin, which no joint marks; the chin is in the doll's frame.
    chin:: 1.555,
    neckHeight: self.chin - head('neck_01')[1],
  },
  leg: {
    // The left hip joint in the bust's frame; the right one mirrors it across x.
    hip:: inBust('thigh_l'),
    origins: { thigh: [0, 0, 0], shin: knee, foot: legDelta('thigh', 'foot') },
    // The toes bend about ball's head, which the foot is cut across at.
    ballJoint: legDelta('thigh', 'ball'),
    length: head('thigh_l')[1],
    thighLength: -knee[1],
    shoeHeight: head('foot_l')[1],
  },
}
