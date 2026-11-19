import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain, PartDef } from '@skelly/construct/assembly/schema.ts';
import { expect, it } from 'vitest';
import { drawnGeometry } from '../src/drawn.ts';
import { exportGlb } from '../src/glb.ts';

const GRAIN = 0.1;

/** A voxel body with a smooth cap standing on its top face and a smooth prism hanging from its bottom face. */
const host: PartDef = {
  family: 'host',
  ports: [],
  keepOuts: [],
  axes: [],
  solids: [
    { id: 'body', kind: 'box', box: { center: [0, 0, 0], half: [0.5, 0.5, 0.5] } },
    {
      id: 'cap',
      kind: 'box',
      box: { center: [0, 0.7, 0], half: [0.1, 0.2, 0.1] },
      display: { smooth: { seat: [0, -1, 0] } },
    },
    {
      id: 'hang',
      kind: 'extruded-polygon',
      profile: [
        [-0.1, -0.9],
        [0.1, -0.9],
        [0.1, -0.5],
        [-0.1, -0.5],
      ],
      z: [-0.1, 0.1],
      display: { smooth: { seat: [0, 1, 0] } },
    },
  ],
};

const domain: Domain = {
  name: 'fixture',
  units: { metresPerUnit: 1, grid: 1, bevel: 0 },
  axisRules: [],
  families: { host: { name: 'host', params: {}, build: () => host } },
};

const resolved = resolve(
  { name: 'fixture', root: 'host', parts: { host: { family: 'host' } }, connections: [] },
  domain,
);

type Primitive = {
  attributes: { POSITION: number };
  extras: { solid?: string; solids?: string[]; voxelGrain?: number };
};

const exported = (drawnVoxels?: ReturnType<typeof drawnGeometry>['voxels']) => {
  const result = exportGlb({
    resolved,
    voxelGrain: GRAIN,
    ...(drawnVoxels ? { drawnVoxels } : {}),
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
  const nodes = json.nodes.filter((node: { extras?: { part?: string } }) => node.extras?.part === 'host');
  const primitives: Primitive[] = json.meshes[nodes[0].mesh].primitives;
  const bounds = (primitive: Primitive): { min: number[]; max: number[] } =>
    json.accessors[primitive.attributes.POSITION];
  return { nodes, primitives, bounds };
};

const expectNear = (actual: readonly number[], expected: readonly number[]): void =>
  expected.forEach((value, axis) => expect(actual[axis]).toBeCloseTo(value, 6));

it("draws a part's smooth pieces as authored meshes in its own node, and its voxels without them", () => {
  const { nodes, primitives, bounds } = exported();
  expect(nodes).toHaveLength(1);
  const voxels = primitives.filter(({ extras }) => extras.voxelGrain === GRAIN);
  expect(voxels.map(({ extras }) => extras.solids)).toEqual([['body']]);
  // The body is whole: its voxels fill its box, with no hole where the pieces stand.
  expectNear(bounds(voxels[0]!).min, [-0.5, -0.5, -0.5]);
  expectNear(bounds(voxels[0]!).max, [0.5, 0.5, 0.5]);
  const smooth = primitives.filter(({ extras }) => extras.voxelGrain === undefined).map(({ extras }) => extras.solid);
  expect(smooth).toEqual(['cap', 'hang']);
});

it('seats each smooth piece one grain into its part through the face it stands on', () => {
  const { primitives, bounds } = exported();
  const pieceOf = (id: string) => bounds(primitives.find(({ extras }) => extras.solid === id)!);
  expect(pieceOf('cap').min[1]).toBeCloseTo(0.5 - GRAIN, 6);
  expect(pieceOf('cap').max[1]).toBeCloseTo(0.9, 6);
  expect(pieceOf('hang').max[1]).toBeCloseTo(-0.5 + GRAIN, 6);
  expect(pieceOf('hang').min[1]).toBeCloseTo(-0.9, 6);
});

it('reads datums off the voxels the file draws, and a smooth piece off its authored solid', () => {
  const drawn = drawnGeometry(resolved, { voxelGrain: GRAIN });
  expect(exported(drawn.voxels).primitives).toEqual(exported().primitives);
  const cap = host.solids[1]!;
  expectNear(drawn.measure('host', cap).min, [-0.1, 0.5, -0.1]);
  expectNear(drawn.measure('host', cap).max, [0.1, 0.9, 0.1]);
});
