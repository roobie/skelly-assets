import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain } from '@skelly/construct/assembly/schema.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { describe, expect, it } from 'vitest';
import type { GlbExportInput } from '../src/exportTypes.ts';
import { exportGlb, exportModelGlbs } from '../src/glb.ts';

interface Primitive {
  readonly attributes: { readonly POSITION: number };
  readonly material: number;
  readonly extras: {
    readonly solids?: readonly string[];
    readonly solid?: string;
    readonly piece?: string;
    readonly voxelGrain?: number;
  };
}
interface Json {
  readonly meshes: readonly { readonly primitives: readonly Primitive[] }[];
  readonly accessors: readonly {
    readonly count: number;
    readonly min?: readonly number[];
    readonly max?: readonly number[];
  }[];
}

const jsonOf = (glb: Uint8Array): Json => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  return JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + view.getUint32(12, true))));
};
const primitivesOf = (glb: Uint8Array) => jsonOf(glb).meshes.flatMap(({ primitives }) => primitives);

const box = (id: string, x: number, display: Solid['display'], slot?: string): Solid => ({
  id,
  kind: 'box',
  box: { center: [x, 0, 0], half: [0.5, 0.5, 0.5] },
  ...(display ? { display } : {}),
  ...(slot ? { slot } : {}),
});

/** One part of four boxes: two plain, one in another slot, one in another piece. */
const domain: Domain = {
  name: 'fixture',
  units: { metresPerUnit: 1, grid: 1, bevel: 0 },
  axisRules: [],
  families: {
    block: {
      name: 'block',
      params: {},
      build: () => ({
        family: 'block',
        keepOuts: [],
        axes: [],
        ports: [],
        solids: [
          box('a', 0, undefined),
          box('b', 1, undefined),
          box('c', 2, undefined, 'trim'),
          box('d', 3, { piece: 'lid' }),
        ],
      }),
    },
  },
};

const input: GlbExportInput = {
  resolved: resolve({ name: 'fixture', root: 'block', parts: { block: { family: 'block' } }, connections: [] }, domain),
  asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
  palette: {
    familyColors: {},
    specialColors: { trim: [0.9, 0.1, 0.1] },
    fallbackColor: [0.5, 0.5, 0.5],
    fallbackFinish: { metallic: 0, roughness: 0.5 },
  },
  voxelGrain: 0.25,
};

describe('a shipped model’s smooth copy', () => {
  const models = exportModelGlbs(input);
  if (!models.ok) {
    throw new Error(JSON.stringify(models.error));
  }

  it('keeps the file as asked beside it, byte for byte', () => {
    const file = exportGlb(input);
    expect(file.ok && Buffer.from(file.glb).equals(Buffer.from(models.glb))).toBe(true);
  });

  it('draws the authored meshes, one primitive per finish and piece', () => {
    const primitives = primitivesOf(models.smoothGlb);
    expect(primitives.map(({ extras }) => [extras.solids, extras.piece])).toEqual([
      [['a', 'b'], undefined],
      [['c'], undefined],
      [['d'], 'lid'],
    ]);
    expect(primitives.every(({ extras }) => extras.voxelGrain === undefined)).toBe(true);
    const { accessors } = jsonOf(models.smoothGlb);
    const plain = accessors[primitives[0]!.attributes.POSITION]!;
    expect([plain.min, plain.max]).toEqual([
      [-0.5, -0.5, -0.5],
      [1.5, 0.5, 0.5],
    ]);
  });

  it('leaves a smooth export a tool asks for one primitive per solid', () => {
    const { voxelGrain, ...smooth } = input;
    const file = exportGlb(smooth);
    expect(file.ok && primitivesOf(file.glb).map(({ extras }) => extras.solid)).toEqual(['a', 'b', 'c', 'd']);
  });
});
