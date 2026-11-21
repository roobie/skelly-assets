import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const root = resolve(import.meta.dirname, '../..');
// The player's trunk beside UAL's skeleton, both in the bust's frame, above the hips' foot: the player's joints, its
// left shoulder joint as its girdle draws it, the armpit, and UAL's bones there.
const { player, shoulder, armpit, ual } = JSON.parse(
  evaluateJsonnet(
    `
  local bust = import 'models/measures/bust.libsonnet';
  local girdle = (import 'models/girdle.libsonnet')(bust);
  local base = (import 'models/dolls/ual/measures.libsonnet').bust.base;
  local skeleton = import 'models/dolls/ual/skeleton.libsonnet';
  local at(bone) = [skeleton.head(bone)[i] - base[i] for i in [0, 1, 2]];
  {
    player: bust.joints,
    shoulder: [girdle.deltoid.x, girdle.deltoid.y, girdle.deltoid.z],
    armpit: bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.armpit * bust.chestHeight,
    ual: { spine: at('spine_01'), chest: at('spine_03'), neck: at('neck_01'), head: at('Head'), shoulder: at('upperarm_l') },
  }`,
    root,
  ),
);
// Joints are held to a millimetre; a girth is the player's own within the eye's error.
const MM = 1e-3;
const nearPoint = (actual, expected, what) =>
  actual.forEach((v, i) =>
    assert.ok(Math.abs(v - expected[i]) <= MM, `${what} ${'xyz'[i]}: the player's ${v} m, UAL's ${expected[i]} m`),
  );

test("the player's spine, neck and head turn about UAL's joints", () => {
  nearPoint(player.spine, ual.spine, 'spine');
  nearPoint(player.neck, ual.neck, 'neck');
  nearPoint(player.head, ual.head, 'head');
});

test("the player's arms hang from UAL's shoulder joints", () => {
  nearPoint(shoulder, ual.shoulder, 'left shoulder');
});

test("the player's armpit lies where UAL's spine cuts its chest from its ribs", () => {
  assert.ok(Math.abs(armpit - ual.chest[1]) <= MM, `armpit: the player's ${armpit} m, UAL's ${ual.chest[1]} m`);
});
