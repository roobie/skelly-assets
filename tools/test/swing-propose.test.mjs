import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sweepTasks, sweepVehicle, swingReport } from '../swingClearance.mjs';
import { proposeFix } from '../swingPropose.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const pin = (id, z, y, x = 0) => ({ id, kind: 'turned', slot: 'paint', axis: 'z', origin: [x, y, z], profile: [[-GRAIN, 0], [-GRAIN, GRAIN], [GRAIN, GRAIN], [GRAIN, 0], [-GRAIN, 0]] });
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

// A lid part of `width` along x with its pins drawn `shift` further along x and y, and the site that places it at `at`,
// reflected when `mirror`, as the placed pieces read.
const lidPart = (width, [dx, dy] = [0, 0]) => ({
  pieces: [box('skin', [0, LIFT, -0.125], [width, LIFT + GRAIN, 0.125]), pin('pin_a', 0.125, LIFT + dy, dx), pin('pin_b', -0.125, LIFT + dy, dx)],
  stages: [{ kind: 'hinge', pins: ['pin_a', 'pin_b'], open: 90, toward: 'up' }],
});
const atZ = (z, part) => part.pieces.map((piece) => (piece.kind === 'box'
  ? { ...piece, min: [piece.min[0], piece.min[1], piece.min[2] + z], max: [piece.max[0], piece.max[1], piece.max[2] + z] }
  : { ...piece, origin: [piece.origin[0], piece.origin[1], piece.origin[2] + z] }));
const lipAt = (id, z, [x0, x1] = [-0.04, -0.01]) => placed(id, [box('edge', [x0, LIFT + GRAIN, z - 0.125], [x1, LIFT + 0.3, z + 0.125])]);
// The problems the checker reports once the part is drawn as the proposal says, swept with no adjustment at all.
const problemsAfter = (width, proposal, sites) => {
  const part = lidPart(width, proposal.partOffset);
  const data = { grain: GRAIN, motions: { lid: part }, vehicles: { v: { forward: '+x', sites: sites(part), swingContacts: [], swingUnjudged: [] } } };
  return swingReport(data, { v: sweepVehicle(sweepTasks(data).v) }).problems;
};

test('a hinge line moved past the middle of a narrow lid is proposed as the build would resolve its pins', () => {
  const part = lidPart(0.1);
  const pieces = { grain: GRAIN, motions: { lid: part }, vehicles: { v: { forward: '+x', sites: [placed('lid', part.pieces), lipAt('lip', 0)], swingContacts: [], swingUnjudged: [] } } };
  const proposal = proposeFix(pieces, 'v', 'lid');
  assert.equal(proposal.status, 'moved');
  assert.deepEqual(problemsAfter(0.1, proposal, (drawn) => [placed('lid', drawn.pieces), lipAt('lip', 0)]), []);
});

test('a proposal for one of two twins of a part is checked on both, so the twin that needs more sets the move', () => {
  const near = (part) => ({ id: 'near', part: 'lid', at: [0, 0, 0.5], mirror: false, pieces: atZ(0.5, part) });
  const far = (part) => ({ id: 'far', part: 'lid', at: [0, 0, -0.5], mirror: true, pieces: atZ(-0.5, part) });
  const sites = (part) => [near(part), far(part), lipAt('near_lip', 0.5), lipAt('far_lip', -0.5, [-0.1, 0.02])];
  const part = lidPart(0.4);
  const pieces = { grain: GRAIN, motions: { lid: part }, vehicles: { v: { forward: '+x', sites: sites(part), swingContacts: [], swingUnjudged: [] } } };
  const proposal = proposeFix(pieces, 'v', 'near');
  assert.equal(proposal.status, 'moved');
  assert.deepEqual(problemsAfter(0.4, proposal, sites), []);
});

test('a stop is searched from the first contact nobody allows, so an allowed contact at the start of the swing does not end it', () => {
  const plate = placed('plate', [box('plate', [0.1, LIFT + GRAIN, -0.1], [0.3, LIFT + GRAIN + 0.06, 0.1])]);
  const ceiling = placed('ceiling', [box('slab', [-0.5, LIFT + 0.2, -0.2], [1, LIFT + 0.24, 0.2])]);
  const pieces = vehicle([placed('lid', lidPart(0.4).pieces), plate, ceiling], { swingContacts: [{ sites: ['lid', 'plate'], depth: 0.012, why: 'a lid stop' }] });
  pieces.motions = { lid: lidPart(0.4) };
  const proposal = proposeFix(pieces, 'v', 'lid');
  assert.equal(proposal.status, 'shortened');
  const fails = (value) => verdictAfter(pieces, { scale: value / proposal.stop.total }).status === 'fails';
  assert.deepEqual([fails(proposal.stop.value), fails(proposal.stop.value + 1)], [false, true]);
});
