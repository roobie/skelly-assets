// Conventions every body plan, voxelizer and mesher is authored against.

import type { Vec3 } from './math.ts';

/**
 * Generator frame. Right-handed, Y up, metres.
 *   +X  the figure's right (so the figure's left is -X)
 *   +Y  up
 *   +Z  the figure's back; figures face -Z
 * Ground is at y = 0.
 *
 * Every body plan, pose and clip is authored in this frame, so their signs (a forward swing is +rotX for a
 * hanging limb, forward is -Z) stay as authored. Model files face +z instead (docs/decisions/0002-model-frame.md):
 * the export turns each value once, by TO_MODEL_FRAME; see tools/actorFrame.mjs.
 */
export const UP: Vec3 = [0, 1, 0];
export const RIGHT: Vec3 = [1, 0, 0];

/**
 * The half turn about +Y that carries the generator frame onto the model frame, as the sign it gives each axis:
 * a point or direction scales by it per axis, and so do a rotation's quaternion vector part and its angles about
 * those axes, since the turn negates X and Z alike and keeps handedness.
 */
export const TO_MODEL_FRAME: Vec3 = [-1, 1, -1];
