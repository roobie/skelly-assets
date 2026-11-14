import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { explodable, movers, siteNode, spread, swing } from '../../site/render.mjs';

const door = [{ kind: 'hinge', axis: { from: [1, 0, 0], to: [1, 1, 0] }, angle: 90, share: 1 }];
const placed = (name, at) => {
  const part = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
  part.name = name;
  part.position.fromArray(at);
  return part;
};

test('a part that opens still comes apart in the exploded view, whatever its pose', () => {
  const scene = new THREE.Group();
  const shell = placed('shell', [0, 0, 0]);
  const panel = placed('door', [1.5, 0, 0]);
  scene.add(siteNode(shell, false), siteNode(panel, true));
  const moving = movers(scene, { moving: [{ index: 1, layers: [door] }] });
  for (const clock of [0, 1]) {
    swing(moving, clock);
    const parts = explodable(scene, { sites: [] });
    const where = (share) => {
      spread(parts, share);
      scene.updateMatrixWorld(true);
      return panel.getWorldPosition(new THREE.Vector3());
    };
    const moved = where(1).sub(where(0));
    assert.ok(moved.length() > 0.01, `the door stays put when exploded at clock ${clock}`);
    assert.ok(moved.distanceTo(parts[1].offset) < 1e-9);
  }
});
