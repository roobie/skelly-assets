import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTHORED_LATERAL, MODEL_LATERAL, apply, motionAtSite, motionLayers, movingSites, poseAt, stowClips } from '../../site/motionPose.mjs';
import { isStowed, mirrorMotion, posePoint } from '../packages/thing-core/src/motion.ts';

const hinge = { kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 1, 0] }, angle: 90, share: 0.5 };
const shutter = { kind: 'slide', direction: [0, 1, 0], travel: 1, share: 0.5, stow: 1 };
const door = [hinge];
const roller = [shutter, { ...hinge, axis: { from: [0, 0, 0], to: [1, 0, 0] } }];
const close = (a, b) => a.forEach((value, i) => assert.ok(Math.abs(value - b[i]) < 1e-9, `${a} vs ${b}`));
// Points on a lattice around the part, so a plane is crossed from both sides.
const lattice = [-0.5, -0.1, 0.35, 0.9, 1.4].flatMap((x) => [-0.5, 0.2, 0.7, 1.3, 1.9].flatMap((y) => [-0.4, 0.15, 0.8].map((z) => [x, y, z])));

test('a part is posed where the game would pose it, whatever the site it sits at or its mirror', () => {
  const at = [0.5, 0.25, -0.75];
  for (const mirror of [false, true]) {
    const placed = motionAtSite(door, { at, mirror }, MODEL_LATERAL);
    const game = mirror ? mirrorMotion(door) : door;
    for (const clock of [0, 0.4, 1]) {
      for (const p of lattice) {
        const expected = posePoint(game, p, clock);
        close(apply(poseAt([placed], clock), p.map((v, i) => v + at[i]), [0, 0, 0]), expected.map((v, i) => v + at[i]));
      }
    }
  }
});

test('the authored frame reflects a far twin across z, the model frame across x', () => {
  const pinned = [{ ...hinge, axis: { from: [1, 0, 2], to: [1, 1, 2] } }];
  const [authored] = motionAtSite(pinned, { at: [0, 0, 0], mirror: true }, AUTHORED_LATERAL);
  const [model] = motionAtSite(pinned, { at: [0, 0, 0], mirror: true }, MODEL_LATERAL);
  assert.deepEqual(authored.axis.from, [1, 0, -2]);
  assert.deepEqual(model.axis.from, [-1, 0, 2]);
});

test('what a slide stows is hidden exactly where the game hides it, at the site, mirrored or not', () => {
  const at = [0.5, 0.25, -0.75];
  for (const mirror of [false, true]) {
    const placed = motionAtSite(roller, { at, mirror }, MODEL_LATERAL);
    const game = mirror ? mirrorMotion(roller) : roller;
    for (const clock of [0, 0.3, 0.6, 1]) {
      const clips = stowClips([placed], clock);
      assert.equal(clips.length, 1);
      const pose = poseAt([placed], clock);
      for (const p of lattice) {
        const world = apply(pose, p.map((v, i) => v + at[i]), [0, 0, 0]);
        const [{ normal, constant }] = clips;
        const shown = normal[0] * world[0] + normal[1] * world[1] + normal[2] * world[2] + constant;
        if (Math.abs(shown) < 1e-6) continue;
        assert.equal(shown < 0, isStowed(game, p, clock), `${p} at ${clock}`);
      }
    }
  }
});

const sites = [
  { site: 'body', model: 'shell', at: [0, 0, 0] },
  { site: 'door', model: 'panel', at: [1, 0, 0] },
  { site: 'glass', model: 'pane', at: [1, 0, 0], rides: 'door' },
  { site: 'flap', model: 'panel', at: [2, 0, 0], rides: 'glass' },
];
const motions = new Map([['panel', door]]);

test('a part that rides a moving carrier follows it, nested inside the carrier, and one that rides nothing moving stays', () => {
  const found = movingSites(sites, motions);
  assert.deepEqual(found.map(({ index }) => index), [1, 2, 3]);
  assert.equal(found[0].layers.length, 1);
  assert.equal(found[1].layers.length, 1, 'the pane has no motion of its own, so it takes the door\'s');
  assert.equal(found[2].layers.length, 2, 'the flap turns inside the door');
  assert.deepEqual(found[1].layers[0], found[0].layers[0]);
});

test('a vehicle whose models do not move has no site that moves, so nothing offers to open it', () => {
  assert.deepEqual(movingSites(sites, new Map()), []);
});

test('layers come outermost carrier first, and skip a carrier that does not move', () => {
  const byId = new Map(sites.map((site) => [site.site, site]));
  const own = (site) => (site.site === 'flap' ? [{ ...hinge, angle: 10 }] : site.site === 'door' ? door : null);
  assert.deepEqual(motionLayers(byId.get('flap'), byId, own).map(([stage]) => stage.angle), [90, 10]);
});
