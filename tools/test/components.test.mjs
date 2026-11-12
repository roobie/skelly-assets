import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formOf, modelComponents } from '../components.mjs';

// A GLB holding only its JSON chunk, which is all the reader looks at.
const glb = (gltf) => {
  const text = JSON.stringify(gltf);
  const json = Buffer.from(text.padEnd(Math.ceil(text.length / 4) * 4, ' '));
  const header = Buffer.alloc(20);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + json.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.write('JSON', 16);
  return Buffer.concat([header, json]);
};

// A root node over a frame part and a lid part, the lid mounted on the frame, each with a port node under it.
const mounted = (lid = { site: 'frame.top', interface: 'lid.bottom' }) => ({
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [
    { name: 'fixture_box', children: [1, 3] },
    { name: 'frame:fixture-frame', extras: { part: 'frame' }, children: [2] },
    { name: 'frame.top', extras: { port: { id: 'frame.top' } } },
    { name: 'lid:fixture-lid', extras: { part: 'lid', ...(lid ? { mount: lid } : {}) }, children: [4] },
    { name: 'lid.bottom', extras: { port: { id: 'lid.bottom' } } },
  ],
});

test('a model whose parts are mounted on each other comes apart into every part, the root among them', () => {
  assert.deepEqual(modelComponents(glb(mounted())), ['frame', 'lid']);
});

test('a model whose parts declare no mount does not come apart', () => {
  assert.equal(modelComponents(glb(mounted(null))), undefined);
});

test('a skinned model does not come apart, since moving a skinned part node moves none of its vertices', () => {
  assert.equal(modelComponents(glb({ ...mounted(), skins: [{ joints: [] }] })), undefined);
});

test('an entry placing models at sites, or with several components, is an assembly; any other is an atom', () => {
  assert.equal(formOf({ sites: [] }), 'assembly');
  assert.equal(formOf({ components: ['frame', 'lid'] }), 'assembly');
  assert.equal(formOf({ components: ['frame'] }), 'atom');
  assert.equal(formOf({}), 'atom');
});
