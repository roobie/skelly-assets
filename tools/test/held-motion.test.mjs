import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gunMovers, heldItem } from '../../site/heldMotion.mjs';
import { poseAt } from '../packages/motion/src/motion.ts';
import { dollTree, heldThings, repo } from './doll-tree.mjs';

// The pose page moves a held gun's parts by the motions its sidecar gives them, found through the nodes the glTF
// loader hands back, whose names it has rewritten: a part must still find its motion there.
const { built, manifest, thingOf } = dollTree({ held: true });
const { pressCheck } = heldThings();
const model = pressCheck.rifle;
const moved = JSON.parse(readFileSync(join(repo, 'models/poses/press-4-retracted.json'), 'utf8')).moved[model];

test('a moved pose stands each part it names at that clock of its motion', async () => {
  const { pack, path } = manifest.models.find(({ id }) => id === model);
  const bytes = readFileSync(join(built, pack, path));
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
  const movers = gunMovers(thingOf(model).gun);
  const { obj, move } = heldItem({ scene, movers }, model);
  const positionOf = (part) => {
    let found;
    obj.traverse((node) => {
      if (node.userData.part === part) found = node.position.clone();
    });
    return found;
  };
  const rest = Object.fromEntries(Object.keys(moved).map((part) => [part, positionOf(part)]));
  move(moved);
  for (const [part, clock] of Object.entries(moved)) {
    const { motion } = movers.find(({ node }) => node.split(':')[0] === part);
    const { rotation, shift } = poseAt(motion, clock);
    const want = new Vector3(
      ...rotation.map((row, i) => row[0] * rest[part].x + row[1] * rest[part].y + row[2] * rest[part].z + shift[i]),
    );
    assert.ok(want.distanceTo(rest[part]) > 0, `${part} moves`);
    assert.ok(
      positionOf(part).distanceTo(want) < 1e-6,
      `${part} stands at ${positionOf(part).toArray()}, wanted ${want.toArray()}`,
    );
  }
  move();
  for (const [part, at] of Object.entries(rest)) assert.ok(positionOf(part).distanceTo(at) < 1e-9, `${part} rests`);
});
