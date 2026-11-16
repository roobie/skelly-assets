import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, Domain, PartDef, PortDef } from '@skelly/construct/assembly/schema.ts';
import { expect, it } from 'vitest';
import { exportGlb, SMOOTH } from '../src/glb.ts';

const GRAIN = 0.1;

const port = (id: string, gender: PortDef['gender'], pos: PortDef['pos'], normal: PortDef['normal']): PortDef => ({
  id,
  mount: 'fixture',
  gender,
  pos,
  normal,
  up: [1, 0, 0],
});

const part = (family: string, def: Omit<PartDef, 'family' | 'keepOuts' | 'axes'>) => ({
  name: family,
  params: {},
  build: (): PartDef => ({ family, keepOuts: [], axes: [], ...def }),
});

/** A smooth block standing on a host's top face, mounted by a port on its own bottom face. */
const domain: Domain = {
  name: 'fixture',
  units: { metresPerUnit: 1, grid: 1, bevel: 0 },
  axisRules: [],
  families: {
    host: part('host', {
      solids: [{ id: 'body', kind: 'box', box: { center: [0, 0, 0], half: [0.5, 0.5, 0.5] } }],
      ports: [port('top', 'female', [0, 0.5, 0], [0, 1, 0])],
    }),
    block: part('block', {
      solids: [{ id: 'base', kind: 'box', box: { center: [0, 0.1, 0], half: [0.2, 0.1, 0.2] } }],
      ports: [port('base', 'male', [0, 0, 0], [0, -1, 0])],
      tags: [SMOOTH],
    }),
  },
};

/** The lowest drawn point of the block, in its own frame, where its mount port lies at height 0. */
const blockBottom = (assembly: Assembly, rootMount?: string): number => {
  const result = exportGlb({
    resolved: resolve(assembly, domain),
    voxelGrain: GRAIN,
    ...(rootMount ? { rootMount } : {}),
    asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
    palette: {
      familyColors: {},
      specialColors: {},
      fallbackColor: [0.5, 0.5, 0.5],
      fallbackFinish: { metallic: 0, roughness: 0.5 },
    },
  });
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }
  const view = new DataView(result.glb.buffer, result.glb.byteOffset, result.glb.byteLength);
  const json = JSON.parse(new TextDecoder().decode(result.glb.subarray(20, 20 + view.getUint32(12, true))));
  const block = json.nodes.find((node: { extras?: { part?: string } }) => node.extras?.part === 'block');
  const [primitive] = json.meshes[block.mesh].primitives;
  return json.accessors[primitive.attributes.POSITION].min[1];
};

it('seats a smooth part one grain into the voxel host it mounts on, so the host snapping to its grid leaves no gap', () => {
  const fitted = blockBottom({
    name: 'fixture',
    root: 'host',
    parts: { host: { family: 'host' }, block: { family: 'block' } },
    connections: [{ from: 'host.top', to: 'block.base' }],
  });
  expect(fitted).toBeCloseTo(-GRAIN, 6);
});

it('seats a smooth part exported alone one grain through its root mount, as it is seated when drawn fitted', () => {
  const loose = blockBottom(
    { name: 'fixture', root: 'block', parts: { block: { family: 'block' } }, connections: [] },
    'base',
  );
  expect(loose).toBeCloseTo(-GRAIN, 6);
});
