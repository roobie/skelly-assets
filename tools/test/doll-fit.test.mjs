import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COINCIDENT, coveredSurface, PITCH, restClearance } from '../../site/clearance.mjs';
import { hides } from '../../site/hiding.mjs';
import { dot, length, normalize, scale, sub } from '../../site/kinematics.mjs';
import { compilePose, soleLift } from '../../site/poseFile.mjs';
import { CLOTHES, dollTree, shellsOf, WEAR, WORN } from './doll-tree.mjs';
import { CLEAN, counted } from './findings.mjs';

const { rig, sitesIn, restIn } = dollTree({ wears: WORN });
const rest = restIn(WEAR);

test('a jacket of boxes standing off the torso and arms is clean at rest', () => {
  // Each box is its part's bounds grown by a centimetre: convex, so it encloses its part whatever the part's shape.
  const EASE = 0.01;
  const boxAround = ({ positions }) => {
    const points = Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(i * 3, i * 3 + 3));
    const [min, max] = [Math.min, Math.max].map((pick, side) =>
      [0, 1, 2].map((a) => pick(...points.map((p) => p[a])) + (side ? EASE : -EASE)),
    );
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [0, 1, 2].map((a) => ((k >> a) & 1 ? max : min)[a]));
    const indices = [
      0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
    ];
    return { positions: corners.flat(), indices };
  };
  const pieces = rest.body
    .filter(({ bone }) => /^(spine|upperArm|forearm)/.test(bone))
    .map(({ bone, mesh }) => ({ piece: `box ${bone}`, bone, mesh: boxAround(mesh) }));
  const jacket = { body: rest.body, pieces };
  const surface = coveredSurface(rig, jacket);
  assert.ok(
    surface.some(({ samples }) => samples.some(({ cover }) => cover >= 0)),
    'the boxes cover the body',
  );
  assert.deepEqual(counted(restClearance(rig, jacket, surface)), CLEAN);
});

test('upper sleeves narrowed inside their arms let the upper arms poke through', () => {
  // Each upper sleeve shrunk about its bone's axis until its widest reach is half the arm's, which puts it inside the
  // arm's narrowest side however much ease the jacket gives: too tight for the arm it is drawn on.
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const radial = ({ head, tail }) => {
    const axis = normalize(sub(tail, head));
    return (p) => {
      const offset = sub(p, head);
      return sub(offset, scale(axis, dot(offset, axis)));
    };
  };
  const points = ({ positions }) =>
    Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(i * 3, i * 3 + 3));
  const girth = (mesh, bone) => Math.max(...points(mesh).map((p) => length(radial(bone)(p))));
  const narrowed = ({ mesh, bone: id }) => {
    const bone = bones.get(id),
      across = radial(bone);
    const arm = rest.body.find((part) => part.bone === id).mesh;
    const factor = (0.5 * girth(arm, bone)) / girth(mesh, bone);
    return { positions: points(mesh).flatMap((p) => sub(p, scale(across(p), 1 - factor))), indices: mesh.indices };
  };
  const pieces = rest.pieces.map((piece) =>
    piece.piece === `${WEAR}_worn_upper` ? { ...piece, mesh: narrowed(piece) } : piece,
  );
  assert.ok(
    pieces.some((piece, i) => piece !== rest.pieces[i]),
    'the jacket has upper sleeves to narrow',
  );
  const { pokes } = restClearance(rig, { ...rest, pieces });
  assert.ok(
    pokes.some(({ bone }) => bone.startsWith('upperArm.')),
    'an upper arm shows through',
  );
});

test('a grounded shod doll stands its boots on the ground and its bare feet a sole above it', () => {
  const lowest = ({ positions }) => Math.min(...positions.filter((_, i) => i % 3 === 1));
  const shod = WORN.filter((wear) => shellsOf(wear).some((id) => id.endsWith('_worn_foot')));
  assert.ok(shod.length > 0, 'no fitted footwear among the worn garments, so nothing was checked');
  for (const wear of shod) {
    const lift = soleLift(sitesIn(wear));
    assert.ok(lift > 0, `${wear} declares no sole lift`);
    // At rest the grounded pose only moves the root, so the rest meshes stand where it puts them, raised by its root.
    const {
      frame: {
        root: [, raised],
      },
    } = compilePose(rig, { rig: { id: rig.id, revision: rig.revision }, ground: true }, { soles: lift });
    const { body, pieces } = restIn(wear);
    const feet = pieces.filter(({ piece }) => piece.endsWith('_worn_foot'));
    const bare = Math.min(...body.map(({ mesh }) => lowest(mesh))) + raised;
    const soled = Math.min(...feet.map(({ mesh }) => lowest(mesh))) + raised;
    // Within a sampling pitch, too small to see: a voxelised sole's underside stands off its authored plane.
    assert.ok(Math.abs(soled) < PITCH, `${wear}: its soles stand ${(soled * 1000).toFixed(1)} mm off the ground`);
    assert.ok(
      Math.abs(bare - lift) < PITCH,
      `${wear}: the bare feet stand ${(bare * 1000).toFixed(1)} mm up, not on its ${(lift * 1000).toFixed(1)} mm soles`,
    );
  }
});

test('a garment that leaves regions of a part bare leaves none of their skin below the top of the regions it covers', () => {
  // A piece that declares what it covers is not meant to cover the other regions it passes beneath, so the rest probe
  // above cannot see their skin poke through its wall. Below the top of the regions it does cover, that skin lies where
  // the wall wraps the part, so it would.
  const axes = new Map(rig.bones.map(({ id, head, tail }) => [id, normalize(sub(tail, head))]));
  let checked = 0;
  for (const wear of CLOTHES) {
    const dressed = restIn(wear);
    const plain = dressed.pieces.map(({ covers, ...piece }) => piece);
    dressed.pieces.forEach(({ piece, bone, covers }, index) => {
      const body = dressed.body.find((entry) => entry.bone === bone);
      // Covering the whole part leaves no bare region to probe; only the cost of the probe is saved by skipping it.
      if (!covers || covers.includes(body.part)) return;
      const [declared] = coveredSurface(rig, { body: [body], pieces: dressed.pieces });
      const [undeclared] = coveredSurface(rig, { body: [body], pieces: plain });
      const height = ({ point }) => dot(point, axes.get(bone));
      const top = declared.samples.reduce(
        (most, sample) => (hides(covers, body.part, sample.region) ? Math.max(most, height(sample)) : most),
        -Infinity,
      );
      if (top === -Infinity) return;
      checked += 1;
      const bare = declared.samples.filter(({ cover }, i) => cover < 0 && undeclared.samples[i].cover === index);
      const below = bare.filter((sample) => height(sample) < top - COINCIDENT);
      assert.equal(below.length, 0, `${wear}: ${piece} passes beneath bare skin below the top of ${covers}`);
    });
  }
  assert.ok(checked > 0, 'no garment declares a region narrower than its part, so nothing was checked');
});
