import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const root = resolve(import.meta.dirname, '../..');

// The showcase's Open view and a game pose a door only from its exported motion, so a front door that keeps hinge
// anchors alone stays shut: it was the panel van's passenger door.
test('the front door of a van on the shared van body exports a hinge motion and no hinge anchors', () => {
  const doors = JSON.parse(
    evaluateJsonnet(
      `
    local van = import 'models/vehicles/van-body.libsonnet';
    local s = import 'models/vehicles/panel_van.spec.libsonnet';
    [row for row in van.rows('fixture_van', 'Fixture van', s) if row.id == 'fixture_van_front_door']`,
      root,
    ),
  );
  assert.equal(doors.length, 1);
  const [door] = doors;
  assert.ok(door.motion.stages.some(({ kind }) => kind === 'hinge'));
  assert.equal(door.anchors.hinge_a, undefined);
  assert.equal(door.anchors.hinge_b, undefined);
});
