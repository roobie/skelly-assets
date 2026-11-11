import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain } from '@skelly/construct/assembly/schema.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { expect, it } from 'vitest';
import type { SrgbColor } from '../src/exportTypes.ts';
import { exportGlb } from '../src/glb.ts';

interface GlbPrimitive {
  readonly attributes: { readonly POSITION: number };
  readonly indices: number;
  readonly extras?: { readonly piece?: string };
}

interface GlbJson {
  readonly meshes: readonly { readonly primitives: readonly GlbPrimitive[] }[];
  readonly accessors: readonly { readonly bufferView: number; readonly count: number; readonly byteOffset?: number }[];
  readonly bufferViews: readonly { readonly byteOffset?: number }[];
}

interface Glb {
  readonly json: GlbJson;
  readonly bin: Uint8Array;
}

const parseGlb = (bytes: Uint8Array): Glb => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  const binStart = 20 + jsonLength + 8;
  return {
    json: JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength))),
    bin: bytes.slice(binStart, binStart + view.getUint32(20 + jsonLength, true)),
  };
};

const accessorArray = <T extends Float32Array | Uint32Array>(
  { json, bin }: Glb,
  index: number,
  Kind: new (buffer: ArrayBuffer, offset: number, length: number) => T,
  width: number,
): T => {
  const accessor = json.accessors[index]!;
  const offset = (json.bufferViews[accessor.bufferView]!.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Kind(bin.buffer as ArrayBuffer, offset, accessor.count * width);
};

/** Whether the triangles form a closed, consistently wound surface: every edge, by position, runs once each way. */
const isClosed = (glb: Glb, primitives: readonly GlbPrimitive[]): boolean => {
  const edges = new Map<string, number>();
  for (const primitive of primitives) {
    const positions = accessorArray(glb, primitive.attributes.POSITION, Float32Array, 3);
    const indices = accessorArray(glb, primitive.indices, Uint32Array, 1);
    const at = (i: number) => [...positions.subarray(indices[i]! * 3, indices[i]! * 3 + 3)].map((c) => c.toFixed(5)).join();
    for (let t = 0; t < indices.length; t += 3) {
      for (let k = 0; k < 3; k += 1) {
        const from = at(t + k);
        const to = at(t + ((k + 1) % 3));
        edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
      }
    }
  }
  return [...edges].every(([edge, count]) => {
    const [from, to] = edge.split('>');
    return count === 1 && edges.get(`${to}>${from}`) === 1;
  });
};

/** Two unit boxes touching across x = 0.5, one solid each. */
const exportBoxes = (
  pieces: readonly [string, string],
  options: { voxelGrain?: number | undefined; specialColors?: Readonly<Record<string, SrgbColor>> } = {},
): Glb => {
  const solids: Solid[] = pieces.map((piece, i) => ({
    id: `box-${i}`,
    kind: 'box',
    box: { center: [i, 0, 0], half: [0.5, 0.5, 0.5] },
    display: { mergeGroup: 'shared', piece },
  }));
  const domain: Domain = {
    name: 'fixture',
    units: { metresPerUnit: 1, grid: 1, bevel: 0 },
    axisRules: [],
    families: {
      shape: {
        name: 'shape',
        params: {},
        build: () => ({ family: 'shape', solids, ports: [], keepOuts: [], axes: [] }),
      },
    },
  };
  const resolved = resolve(
    { name: 'fixture', root: 'body', parts: { body: { family: 'shape' } }, connections: [] },
    domain,
  );
  const result = exportGlb({
    resolved,
    ...(options.voxelGrain === undefined ? {} : { voxelGrain: options.voxelGrain }),
    asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
    palette: {
      familyColors: {},
      specialColors: options.specialColors ?? {},
      fallbackColor: [0.5, 0.5, 0.5],
      fallbackFinish: { metallic: 0, roughness: 0.5 },
    },
  });
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }
  return parseGlb(result.glb);
};

const primitivesOf = (glb: Glb): GlbPrimitive[] => glb.json.meshes.flatMap((mesh) => mesh.primitives);

it.each([
  ['smooth', undefined],
  ['voxel', 0.1],
])('keeps each piece its own primitive inside one same-finish merge group (%s export)', (_mode, voxelGrain) => {
  const pieces = primitivesOf(exportBoxes(['fixed', 'detachable'], { voxelGrain })).map((p) => p.extras?.piece);
  expect(pieces.toSorted()).toEqual(['detachable', 'fixed']);
});

it('closes each voxel piece where it touches another, so hiding one leaves no hole in the rest', () => {
  const glb = exportBoxes(['fixed', 'detachable'], { voxelGrain: 0.1 });
  const primitives = primitivesOf(glb);
  expect(primitives).toHaveLength(2);
  for (const primitive of primitives) {
    expect(isClosed(glb, [primitive]), primitive.extras?.piece).toBe(true);
  }
});

it('draws no face between touching finishes of one voxel piece', () => {
  const glb = exportBoxes(['whole', 'whole'], {
    voxelGrain: 0.1,
    specialColors: { 'box-0': [1, 0, 0], 'box-1': [0, 0, 1] },
  });
  const primitives = primitivesOf(glb);
  expect(primitives).toHaveLength(2);
  expect(primitives.map((primitive) => isClosed(glb, [primitive]))).toEqual([false, false]);
  expect(isClosed(glb, primitives)).toBe(true);
});
