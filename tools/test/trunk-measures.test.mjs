import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const root = resolve(import.meta.dirname, '../..');
// The player's left shoulder joint as its girdle draws it, and UAL's upperarm_l, both in the bust's frame.
const { shoulder, ual } = JSON.parse(
  evaluateJsonnet(
    `
  local bust = import 'models/measures/bust.libsonnet';
  local girdle = (import 'models/girdle.libsonnet')(bust);
  {
    shoulder: [girdle.deltoid.x, girdle.deltoid.y, girdle.deltoid.z],
    ual: (import 'models/dolls/ual/joints.libsonnet').trunk.shoulder,
  }`,
    root,
  ),
);
// The bust's measures read UAL's joints, so the girdle's shoulder strays from UAL's by rounding alone.
const EXACT = 1e-12;

test("the player's arms hang from UAL's shoulder joints", () => {
  shoulder.forEach((v, i) =>
    assert.ok(Math.abs(v - ual[i]) <= EXACT, `left shoulder ${'xyz'[i]}: the girdle's ${v} m, UAL's ${ual[i]} m`),
  );
});
