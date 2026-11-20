import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { Box3, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gunMovers, heldItem } from '../../site/heldMotion.mjs';
import { dollTree, heldThings, repo } from './doll-tree.mjs';

// The pose page moves a held gun's parts by the motions its sidecar gives them, found through the nodes the glTF
// loader hands back, whose names it has rewritten: a part must still find its motion there. An action part must slide
// its whole stroke, its slide's direction times its travel, by the clock, as the press check's hand on the handle
// follows it; a part moving outside the action, such as the port cover, turns its hinge's angle by the clock.
const partStrokes = (entry) =>
  Object.fromEntries(
    Object.values(entry.gun.action.parts).map(({ node, motion }) => {
      const { direction, travel } = motion.stages.find(({ kind }) => kind === 'slide');
      return [node.split(':')[0], direction.map((x) => x * travel)];
    }),
  );
const { built, manifest, thingOf } = dollTree({ held: true });
const { pressCheck } = heldThings();
const model = pressCheck.rifle;
const moved = JSON.parse(readFileSync(join(repo, 'models/poses/press-4-retracted.json'), 'utf8')).moved[model];

test('a moved pose slides each action part along its stroke and stands each other part at its clock', async () => {
  const { pack, path } = manifest.models.find(({ id }) => id === model);
  const bytes = readFileSync(join(built, pack, path));
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
  const movers = gunMovers(thingOf(model).gun);
  const { obj, move } = heldItem({ scene, movers }, model);
  const strokes = partStrokes(thingOf(model));
  const nodeOf = (part) => {
    let found;
    obj.traverse((node) => {
      if (node.userData.part === part) found = node;
    });
    return found;
  };
  // A part's own point, its mesh's centre, where the part now holds it: a hinge may turn about the part's origin,
  // which then stays put while the rest of the part swings.
  const centres = Object.fromEntries(
    Object.keys(moved).map((part) => {
      const node = nodeOf(part);
      node.updateMatrixWorld(true);
      const box = new Box3().setFromObject(node);
      return [part, box.getCenter(new Vector3()).applyMatrix4(node.matrixWorld.clone().invert())];
    }),
  );
  const pointOf = (part) => {
    const node = nodeOf(part);
    return centres[part].clone().applyMatrix4(new Matrix4().compose(node.position, node.quaternion, node.scale));
  };
  // Turned by hand about the sidecar's own hinge, so the check does not lean on the motion package it checks.
  const hinged = (part, clock) => {
    const { stages } = movers.find(({ node }) => node.split(':')[0] === part).motion;
    assert.deepEqual(
      stages.map(({ kind }) => kind),
      ['hinge'],
      `${part} turns on one hinge`,
    );
    const [{ axis, angle }] = stages;
    const pivot = new Vector3(...axis.from);
    const along = new Vector3(...axis.to).sub(pivot).normalize();
    return rest[part]
      .clone()
      .sub(pivot)
      .applyAxisAngle(along, (angle * clock * Math.PI) / 180)
      .add(pivot);
  };
  const rest = Object.fromEntries(Object.keys(moved).map((part) => [part, pointOf(part)]));
  assert.ok(
    Object.keys(moved).some((part) => Object.hasOwn(strokes, part)),
    'the pose moves an action part',
  );
  move(moved);
  for (const [part, clock] of Object.entries(moved)) {
    const want = Object.hasOwn(strokes, part)
      ? rest[part].clone().add(new Vector3(...strokes[part]).multiplyScalar(clock))
      : hinged(part, clock);
    assert.ok(want.distanceTo(rest[part]) > 1e-3, `${part} moves`);
    assert.ok(
      pointOf(part).distanceTo(want) < 1e-6,
      `${part} stands at ${pointOf(part).toArray()}, wanted ${want.toArray()}`,
    );
  }
  move();
  for (const [part, at] of Object.entries(rest)) assert.ok(pointOf(part).distanceTo(at) < 1e-9, `${part} rests`);
});
