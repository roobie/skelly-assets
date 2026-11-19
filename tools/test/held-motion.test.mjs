import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { heldItem } from '../../site/heldMotion.mjs';
import { partStrokes } from '../press-check.mjs';
import { dollTree, heldThings, repo } from './doll-tree.mjs';

// The pose page moves a held gun's parts by the motions its sidecar gives them, found through the nodes the glTF
// loader hands back, whose names it has rewritten: a part must still find its motion there.
const { built, manifest, thingOf } = dollTree({ held: true });
const { pressCheck } = heldThings();
const model = pressCheck.rifle;
const moved = JSON.parse(readFileSync(join(repo, 'models/poses/press-4-retracted.json'), 'utf8')).moved[model];

test('a moved pose draws each part along its stroke by the share of the clock it names', async () => {
  const { pack, path } = manifest.models.find(({ id }) => id === model);
  const bytes = readFileSync(join(built, pack, path));
  const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
  const { obj, move } = heldItem({ scene, action: thingOf(model).gun.action }, model);
  const strokes = partStrokes(thingOf(model));
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
    const slid = positionOf(part).sub(rest[part]);
    const want = new Vector3(...strokes[part]).multiplyScalar(clock);
    assert.ok(want.length() > 0, `${part} has a stroke`);
    assert.ok(slid.distanceTo(want) < 1e-6, `${part} slid ${slid.toArray()}, wanted ${want.toArray()}`);
  }
  move();
  for (const [part, at] of Object.entries(rest)) assert.ok(positionOf(part).distanceTo(at) < 1e-9, `${part} rests`);
});
