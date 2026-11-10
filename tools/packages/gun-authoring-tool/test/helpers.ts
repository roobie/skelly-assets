import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAssemblyOrThrow } from '@skelly/construct/assembly/parseAssembly.ts';
import type { Assembly } from '@skelly/construct/assembly/schema.ts';
import type { TriangleMesh } from '@skelly/construct/shapes/shapeTypes.ts';
import { CARTRIDGES, DESIGNS } from '../src/cli/content.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import type { GltfJson, readGlb } from './glbReader.ts';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

/** A design file's text, as the export reads it. */
export const designText = (name: string): string => readFileSync(join(DESIGNS, `${name}.json`), 'utf8');
/** A cartridge data file's text, by its id. */
export const cartridgeText = (id: string): string => readFileSync(join(CARTRIDGES, `${id}.json`), 'utf8');

export const expectWatertightMesh = (mesh: TriangleMesh, label = 'mesh'): number => {
  const weld = (index: number): string =>
    [0, 1, 2].map((axis) => (Math.round(mesh.positions[index * 3 + axis]! * 100_000) / 100_000).toFixed(5)).join(',');
  const directed = new Map<string, number>();
  const faces = new Set<string>();
  let signedVolume = 0;
  for (let offset = 0; offset < mesh.indices.length; offset += 3) {
    const points = [0, 1, 2].map((corner) => {
      const index = mesh.indices[offset + corner]! * 3;
      return [mesh.positions[index]!, mesh.positions[index + 1]!, mesh.positions[index + 2]!] as const;
    });
    const [a, b, c] = points as [
      readonly [number, number, number],
      readonly [number, number, number],
      readonly [number, number, number],
    ];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const area2 = Math.hypot(
      ab[1]! * ac[2]! - ab[2]! * ac[1]!,
      ab[2]! * ac[0]! - ab[0]! * ac[2]!,
      ab[0]! * ac[1]! - ab[1]! * ac[0]!,
    );
    if (!(area2 > 1e-10)) {
      throw new Error(`${label}: degenerate triangle at index ${offset / 3}`);
    }
    const keys = [0, 1, 2].map((corner) => weld(mesh.indices[offset + corner]!));
    const faceKey = [...keys].sort().join('|');
    if (faces.has(faceKey)) {
      throw new Error(`${label}: duplicate face ${faceKey}`);
    }
    faces.add(faceKey);
    for (let edge = 0; edge < 3; edge++) {
      const from = keys[edge]!;
      const to = keys[(edge + 1) % 3]!;
      const key = `${from}>${to}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
    signedVolume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  }
  if (mesh.triangleCount <= 0) {
    throw new Error(`${label}: empty mesh`);
  }
  for (const [edge, count] of directed) {
    const [from, to] = edge.split('>');
    if (count !== (directed.get(`${to}>${from}`) ?? 0)) {
      throw new Error(`${label}: unmatched directed edge ${edge}`);
    }
  }
  if (signedVolume <= 0) {
    throw new Error(`${label}: non-positive signed volume`);
  }
  return signedVolume;
};

export const loadFixtures = (): Assembly[] =>
  readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => parseAssemblyOrThrow(readFileSync(join(FIXTURES, f), 'utf8'), f));

export const loadFixture = (name: string): Assembly =>
  parseAssemblyOrThrow(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'), `${name}.json`);

/** A deep-cloned fixture with an edit applied. */
export const variant = (name: string, edit: (a: MutableAssembly) => void): Assembly => {
  const a = structuredClone(loadFixture(name)) as MutableAssembly;
  edit(a);
  return a;
};

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
export type MutableAssembly = Mutable<Assembly>;

export interface CorpusEntry {
  label: string;
  assembly: Assembly;
}

/** A design file's loaded assembly, with its item references expanded into the parts they name. */
export const loadDesignAssembly = (name: string): MutableAssembly => {
  const result = loadGunDesign(readFileSync(join(DESIGNS, `${name}.json`), 'utf8'));
  if (!result.ok) {
    throw new Error(`${name}.json: ${result.error.code}: ${result.error.message}`);
  }
  return structuredClone(result.design.assembly) as MutableAssembly;
};

/** Every published design, as loaded assemblies. */
export const loadDesigns = (): CorpusEntry[] =>
  readdirSync(DESIGNS)
    .filter((f) => f.endsWith('.json') && !f.startsWith('look-'))
    .sort()
    .flatMap((f) => {
      const result = loadGunDesign(readFileSync(join(DESIGNS, f), 'utf8'));
      if (!result.ok) {
        throw new Error(`${f}: ${result.error.code}: ${result.error.message}`);
      }
      return result.declaredStatus === 'published' && result.design.status === 'published'
        ? [{ label: `design ${f}`, assembly: result.design.assembly }]
        : [];
    });

/**
 * The regression corpus that property tests iterate instead of seeds: every fixture that
 * `applies` to the property (default: all but the `broken-*` fixtures, which exist to break a
 * rule) plus every published design.
 */
export const loadCorpus = (
  applies: (fixture: Assembly) => boolean = (a) => !a.name.startsWith('broken-'),
): CorpusEntry[] => [
  ...loadFixtures()
    .filter(applies)
    .map((assembly) => ({ label: `fixture ${assembly.name}`, assembly })),
  ...loadDesigns(),
];

export type Triangle = readonly [readonly number[], readonly number[], readonly number[]];

/**
 * A node's quarter-turn rotation as a row-major matrix with whole entries, so turned vertices stay exact and a face
 * square to an axis still compares equal across its corners.
 */
const quarterTurnMatrix = (rotation: readonly number[] = [0, 0, 0, 1]): number[] => {
  const [x, y, z, w] = rotation as [number, number, number, number];
  const m = [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ];
  const whole = m.map((entry) => Math.round(entry) + 0);
  if (m.some((entry, k) => Math.abs(entry - whole[k]!) > 1e-6)) {
    throw new Error(`node rotation ${rotation.join(', ')} is not a quarter turn`);
  }
  return whole;
};

/** The triangles a part's nodes draw, moved by their node transforms into file axes. */
export const partTriangles = (json: GltfJson, read: ReturnType<typeof readGlb>, partId: string): Triangle[] => {
  const triangles: Triangle[] = [];
  for (const node of json.nodes.filter(({ extras }) => extras?.part === partId)) {
    const shift = node.translation ?? [0, 0, 0];
    const turn = quarterTurnMatrix(node.rotation);
    for (const primitive of json.meshes[node.mesh!]!.primitives) {
      const positions = read.floats(primitive.attributes.POSITION);
      const accessor = json.accessors[primitive.indices]!;
      const view = json.bufferViews[accessor.bufferView]!;
      const indices = new Uint32Array(read.bin.slice(view.byteOffset, view.byteOffset + accessor.count * 4).buffer);
      for (let i = 0; i < indices.length; i += 3) {
        triangles.push(
          [0, 1, 2].map((k) =>
            [0, 1, 2].map(
              (axis) =>
                [0, 1, 2].reduce(
                  (sum, along) => sum + turn[axis * 3 + along]! * positions[indices[i + k]! * 3 + along]!,
                  0,
                ) + shift[axis]!,
            ),
          ) as unknown as Triangle,
        );
      }
    }
  }
  return triangles;
};
