import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sweepTasks, sweepVehicle, swingReport } from '../swingClearance.mjs';
import { proposeFix } from '../swingPropose.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const pin = (id, z, y) => ({ id, kind: 'turned', slot: 'paint', axis: 'z', origin: [0, y, z], profile: [[-GRAIN, 0], [-GRAIN, GRAIN], [GRAIN, GRAIN], [GRAIN, 0], [-GRAIN, 0]] });
// A lid four grains thick, hinged along its x = 0 edge at the height of its underside and opening up.
const LIFT = 0.2;
const lid = {
  pieces: [box('skin', [0, LIFT, -0.125], [0.4, LIFT + 4 * GRAIN, 0.125]), pin('pin_a', 0.125, LIFT), pin('pin_b', -0.125, LIFT)],
  stages: [{ kind: 'hinge', pins: ['pin_a', 'pin_b'], open: 90, toward: 'up' }],
};
const placed = (id, pieces) => ({ id, part: id, at: [0, 0, 0], mirror: false, pieces });
const lidSite = placed('lid', lid.pieces);
// A lip behind the hinge that the lid's thick back edge sweeps through as it opens.
const lip = placed('lip', [box('edge', [-3 * GRAIN, LIFT, -0.125], [-2 * GRAIN, LIFT + 0.3, 0.125])]);
const vehicle = (sites, extra = {}) => ({ grain: GRAIN, motions: { lid }, vehicles: { v: { forward: '+x', sites, swingContacts: [], swingUnjudged: [], ...extra } } });

// What the lid does once an adjustment is applied, judged by the checker alone rather than by the proposer's own say.
const verdictAfter = (pieces, adjust) => {
  const result = sweepVehicle({ ...sweepTasks(pieces).v, adjust: { lid: adjust } });
  return swingReport(pieces, { v: result }).verdicts.v.lid;
};

test('a lid that hits a lip is given a hinge line that clears it, which the checker confirms', () => {
  const pieces = vehicle([lidSite, lip]);
  assert.equal(verdictAfter(pieces, {}).status, 'fails');
  const proposal = proposeFix(pieces, 'v', 'lid');
  assert.equal(proposal.status, 'moved');
  assert.notEqual(verdictAfter(pieces, { offset: proposal.offset }).status, 'fails');
});

test('a lid that clears already is left as it is', () => {
  assert.equal(proposeFix(vehicle([lidSite]), 'v', 'lid').status, 'ok');
});

test('a lid under a low ceiling that no hinge line within reach clears gets a shorter stop that does', () => {
  const ceiling = placed('ceiling', [box('slab', [-0.5, LIFT + 0.13, -0.2], [1, LIFT + 0.17, 0.2])]);
  const pieces = vehicle([lidSite, ceiling]);
  const proposal = proposeFix(pieces, 'v', 'lid');
  assert.equal(proposal.status, 'shortened');
  assert.ok(proposal.stop.value < proposal.stop.total);
  assert.notEqual(verdictAfter(pieces, { scale: proposal.stop.value / proposal.stop.total }).status, 'fails');
});

test('a contact an entry covers is a judged verdict, not a failing one', () => {
  const pieces = vehicle([lidSite, lip], { swingContacts: [{ sites: ['lid', 'lip'], depth: 0.5, why: 'a lid stop' }] });
  assert.equal(verdictAfter(pieces, {}).status, 'judged');
});
