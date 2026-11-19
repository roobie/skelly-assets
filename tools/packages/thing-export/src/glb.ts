// No three.js or domain data: the palette comes in as an argument, meshes come from `meshForSolid`.
//
// Layout of the file:
//   scene -> root node (named by the asset id)
//     -> one node per part, named `<part id>:<registry key>`, placed by its resolved transform, carrying one
//        mesh with one primitive per drawn solid (the solids the viewer draws: `displaySolids ?? solids`)
//        and, unless it is the root, the joint that mounts it on a part nearer the root (mounts.ts, partMounts)
//        -> one empty child node per port, named `<part>.<port>`, with the port metadata in glTF `extras`
// Vertices are in the part's local frame times the domain's `units.metresPerUnit`; the node transform supplies the placement.

import { portFrame } from '@skelly/construct/assembly/resolve.ts';
import type { PartDef, PartInstance, PortDef } from '@skelly/construct/assembly/schema.ts';
import {
  applyDir,
  applyPoint,
  compose,
  invert,
  type Mat3,
  normalize,
  scale,
  sub,
  type Transform,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';
import { type DisplayItem, displayItems } from '@skelly/construct/shapes/display.ts';
import { boundsOfPoints, localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import { displayBevel, meshForSolid, meshForSolidGroup, terracedMesh } from '@skelly/construct/shapes/mesh.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import type { TerraceLattice } from '@skelly/construct/shapes/terrace.ts';
import type { Motion } from '@skelly/motion/motion';
import { surfaceOf } from '@skelly/thing-core/materials';
import { invalidPaletteFinish, type ResolvedAppearance, resolveAppearance } from './appearance.ts';
import type {
  ExportGlb,
  ExportPortMetadata,
  GlbExportError,
  GlbExportInput,
  GlbExportResult,
  ModelGlbsResult,
  Palette,
  PartPortId,
  SrgbColor,
  VoxelGrains,
} from './exportTypes.ts';
import { featureFitsGrain } from './featureFit.ts';
import { partMounts } from './mounts.ts';
import { matrixOf, prepareSkin, preserveSkinFace, SkinError, skinPoints } from './skin.ts';
import { fillVoxels, voxelize } from './voxelize.ts';

const ASSET_FILE = /^assets\/models\/[a-z0-9_-]+\.glb$/;
/** glTF node name of a part: its id and registry key (`PartInstance.family`), e.g. `part-1:family-a`. */
export const partNodeName = (id: string, family: string): string => `${id}:${family}`;

/** The standard sRGB electro-optical transfer: one normalized channel to linear light. */
export const srgbToLinear = (c: number): number => (c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const validColor = (c: SrgbColor): boolean => c.length === 3 && c.every((x) => Number.isFinite(x) && x >= 0 && x <= 1);

/** The key of the first palette entry with a bad channel, named like the palette constructor names them. */
const badPaletteKey = (palette: Palette): string | undefined => {
  const entries: [string, SrgbColor][] = [
    ...Object.entries(palette.familyColors).map(([k, c]): [string, SrgbColor] => [`family ${k}`, c]),
    ...Object.entries(palette.specialColors).map(([k, c]): [string, SrgbColor] => [`special ${k}`, c]),
    ...Object.entries(palette.materials ?? {}).map(([k, c]): [string, SrgbColor] => [`material ${k}`, c.colour]),
    ...Object.entries(palette.roleShades ?? {}).map(([k, c]): [string, SrgbColor] => [`shade ${k}`, c]),
    ['fallback', palette.fallbackColor],
  ];
  return entries.find(([, c]) => !validColor(c))?.[0];
};

/** A glTF material's name: its sRGB colour as `#rrggbb`. */
export const hex = (c: SrgbColor): string =>
  `#${c
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** glTF quaternion [x, y, z, w] of a proper rotation matrix. */
const quaternion = (m: Mat3): [number, number, number, number] => {
  const trace = m[0] + m[4] + m[8];
  let q: [number, number, number, number];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    q = [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    q = [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
  }
  const l = Math.hypot(...q);
  const sign = q[3] < 0 ? -1 : 1;
  return q.map((x) => (x * sign) / l + 0) as [number, number, number, number];
};

const toMetres = (v: Vec3, metresPerUnit: number): Vec3 => [
  v[0] * metresPerUnit,
  v[1] * metresPerUnit,
  v[2] * metresPerUnit,
];

/**
 * Where a part's voxel lattice must start, in part-local metres, so its voxels land on the world lattice. A part placed
 * at a fraction of a voxel, or turned by a quarter turn, would otherwise leave steps and gaps against its neighbours. A
 * part turned by any other angle has no matching lattice and keeps its own.
 */
export const latticeOrigin = (
  placed: { readonly r: Mat3; readonly t: Vec3 },
  grain: number,
  metresPerUnit: number,
): Vec3 => {
  const { r, t } = placed;
  if (!r.every((x) => [-1, 0, 1].some((q) => Math.abs(x - q) < 1e-9))) {
    return [0, 0, 0];
  }
  // The inverse rotation of a rotation matrix is its transpose.
  const local = [0, 1, 2].map((i) => -[0, 1, 2].reduce((sum, j) => sum + r[j * 3 + i]! * t[j]! * metresPerUnit, 0));
  return local.map((v) => v - Math.floor(v / grain) * grain) as unknown as Vec3;
};

/** The layers a part's terracing solids step by: its voxel lattice along its local y, in its units. */
export const terraceLattice = (
  placed: { readonly r: Mat3; readonly t: Vec3 },
  grain: number,
  metresPerUnit: number,
): TerraceLattice => ({
  layer: grain / metresPerUnit,
  base: latticeOrigin(placed, grain, metresPerUnit)[1] / metresPerUnit,
});

/** Part-definition tag that asks a voxelized export for the finer `voxelDetailGrain`. */
export const VOXEL_DETAIL = 'voxel-detail';

/**
 * Part-definition tag that keeps the part's authored mesh in a voxelized export. A part the eye reads by its exact
 * outline, such as an aperture sight seen up close, loses that outline to any grain.
 */
export const SMOOTH = 'smooth';

/**
 * Whether the part's drawn solids, taken together, are too thin on some axis to read at the grain. The part is judged
 * whole, not solid by solid, because a receiver or a stock is built of thin walls and plates that read as one body, while
 * a part thin all through, such as a charging handle or a trigger, lands on one uneven layer of voxels.
 */
const isThinPart = (def: PartDef, grain: number, metresPerUnit: number): boolean => {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const solid of def.displaySolids ?? def.solids) {
    const [min, max] = localSolidBounds(solid);
    for (const axis of [0, 1, 2]) {
      low[axis] = Math.min(low[axis]!, min[axis]!);
      high[axis] = Math.max(high[axis]!, max[axis]!);
    }
  }
  return [0, 1, 2].some((axis) => !featureFitsGrain((high[axis]! - low[axis]!) * metresPerUnit, grain));
};

/**
 * The grain a voxelized export samples this part at: none for a part tagged `SMOOTH`, the detail grain for a part
 * tagged `VOXEL_DETAIL`, and, in a class that asks for it, for a part too thin for the class grain; every other part
 * takes the class grain.
 */
export const partVoxelGrain = (
  def: PartDef,
  { voxelGrain, voxelDetailGrain, voxelDetailThinParts }: VoxelGrains,
  metresPerUnit: number,
): number | undefined => {
  if (def.tags?.includes(SMOOTH)) {
    return undefined;
  }
  return voxelDetailGrain !== undefined &&
    (def.tags?.includes(VOXEL_DETAIL) || (voxelDetailThinParts && isThinPart(def, voxelGrain, metresPerUnit)))
    ? voxelDetailGrain
    : voxelGrain;
};

/**
 * A smooth part's drawn boxes that stand on the port it mounts by, reaching `depth` through that port into its host.
 * The voxel host's face snaps to its grid, so a part seated on the authored face would float by up to half a voxel;
 * reaching a whole grain in, where the host's voxels hide it, closes that gap whatever the grid.
 */
const seatedDef = (def: PartDef, port: PortDef, depth: number): PartDef => {
  const axis = port.normal.findIndex((component) => Math.abs(component) === 1);
  if (axis < 0) {
    return def;
  }
  const sign = port.normal[axis]!;
  const grow = ([x, y, z]: Vec3, by: number): Vec3 => [
    axis === 0 ? x + by : x,
    axis === 1 ? y + by : y,
    axis === 2 ? z + by : z,
  ];
  const seat = (solid: Solid): Solid => {
    if (solid.kind !== 'box') {
      return solid;
    }
    const { center, half } = solid.box;
    if (Math.abs(center[axis]! + sign * half[axis]! - port.pos[axis]!) > 1e-9) {
      return solid;
    }
    return { ...solid, box: { center: grow(center, (sign * depth) / 2), half: grow(half, depth / 2) } };
  };
  return {
    ...def,
    solids: def.solids.map(seat),
    ...(def.displaySolids ? { displaySolids: def.displaySolids.map(seat) } : {}),
  };
};

/**
 * Every part's lattice is anchored at the world origin, so two grains nest exactly when the coarse one is a whole
 * multiple of the fine one: each coarse voxel face then lies on a fine voxel face and the parts meet without steps.
 */
const checkNesting = ({ voxelGrain, voxelDetailGrain }: GlbExportInput): void => {
  if (voxelDetailGrain === undefined) {
    return;
  }
  if (voxelGrain === undefined) {
    throw new Error('voxelDetailGrain needs voxelGrain');
  }
  const ratio = voxelGrain / voxelDetailGrain;
  if (!(ratio >= 1 && Math.abs(ratio - Math.round(ratio)) < 1e-9)) {
    throw new Error('voxelGrain must be a whole multiple of voxelDetailGrain so the lattices nest');
  }
};

const isIdentity = (m: Mat3): boolean => m.every((x, i) => Math.abs(x - (i % 4 === 0 ? 1 : 0)) < 1e-12);

// ---- binary buffer assembly ----

const ARRAY_BUFFER = 34_962;
const ELEMENT_ARRAY_BUFFER = 34_963;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;

class BinaryBuffer {
  readonly views: { buffer: 0; byteOffset: number; byteLength: number; target?: number }[] = [];
  readonly accessors: Record<string, unknown>[] = [];
  private readonly chunks: Uint8Array[] = [];
  private size = 0;

  /** Appends `data` (whose byte length is a multiple of 4) as a buffer view and returns its accessor index. */
  add(data: Float32Array | Uint32Array | Uint16Array, accessor: Record<string, unknown>, target?: number): number {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.views.push({
      buffer: 0,
      byteOffset: this.size,
      byteLength: bytes.byteLength,
      ...(target === undefined ? {} : { target }),
    });
    const padded = pad4(bytes, 0);
    this.chunks.push(padded);
    this.size += padded.byteLength;
    this.accessors.push({ bufferView: this.views.length - 1, ...accessor });
    return this.accessors.length - 1;
  }

  get byteLength(): number {
    return this.size;
  }

  bytes(): Uint8Array {
    const out = new Uint8Array(this.size);
    let at = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, at);
      at += chunk.byteLength;
    }
    return out;
  }
}

const pad4 = (bytes: Uint8Array, fill: number): Uint8Array => {
  const padded = new Uint8Array(Math.ceil(bytes.byteLength / 4) * 4).fill(fill);
  padded.set(bytes);
  return padded;
};

const glbFile = (json: unknown, bin: Uint8Array): Uint8Array => {
  const jsonBytes = pad4(new TextEncoder().encode(JSON.stringify(json)), 0x20);
  const binBytes = pad4(bin, 0);
  const total = 12 + 8 + jsonBytes.byteLength + (binBytes.byteLength > 0 ? 8 + binBytes.byteLength : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46_54_6c_67, true); // 'glTF'
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.byteLength, true);
  view.setUint32(16, 0x4e_4f_53_4a, true); // 'JSON'
  out.set(jsonBytes, 20);
  if (binBytes.byteLength > 0) {
    const at = 20 + jsonBytes.byteLength;
    view.setUint32(at, binBytes.byteLength, true);
    view.setUint32(at + 4, 0x00_4e_49_42, true); // 'BIN\0'
    out.set(binBytes, at + 8);
  }
  return out;
};

// ---- validation ----

const validId = (s: string): boolean => s.length > 0 && !s.includes('.');

const portMetadata = (partId: string, port: PortDef, placed: Transform): ExportPortMetadata => {
  const frame = compose(placed, portFrame(port));
  return {
    id: `${partId}.${port.id}` as PartPortId,
    mount: port.mount,
    gender: port.gender,
    ...(port.size === undefined ? {} : { size: port.size }),
    ...(port.sizeClass === undefined ? {} : { sizeClass: port.sizeClass }),
    ...(port.swap === undefined ? {} : { swap: port.swap }),
    ...(port.standard === undefined ? {} : { standard: port.standard }),
    ...(port.accepts === undefined ? {} : { accepts: port.accepts }),
    ...(port.envelope === undefined ? {} : { envelope: port.envelope }),
    frame: {
      position: frame.t,
      normal: [frame.r[0], frame.r[3], frame.r[6]],
      up: [frame.r[1], frame.r[4], frame.r[7]],
    },
    ...(port.slots ? { slots: { count: port.slots.count, pitch: port.slots.pitch } } : {}),
  };
};

type Json = Record<string, unknown>;

const SHEEN = 'KHR_materials_sheen';

/**
 * The glTF material the writer gives a surface of this appearance. A sheen is glTF's own extension, so any loader draws
 * it; a fabric's grain and a shader surface's look have no glTF form and ride in the extras for a renderer that draws
 * them; see `docs/decisions/0013-fabric-finishes.md` and `docs/decisions/0022-surface-shaders.md`, "Decision".
 */
export const gltfMaterial = ({ color: srgb, material, shade, finish, paintable }: ResolvedAppearance): Json => {
  const opacity = finish.opacity ?? 1;
  const extras = {
    ...(material === undefined
      ? {}
      : { materialId: material, colourMultiplier: shade, ...(paintable ? { paintable } : {}) }),
    ...(finish.fabric === undefined ? {} : { fabric: finish.fabric }),
    ...(finish.surface === undefined ? {} : { surface: finish.surface }),
  };
  return {
    name: hex(srgb),
    pbrMetallicRoughness: {
      baseColorFactor: [...srgb.map(srgbToLinear), opacity],
      metallicFactor: finish.metallic,
      roughnessFactor: finish.roughness,
    },
    ...(opacity < 1 ? { alphaMode: 'BLEND' } : {}),
    ...(finish.sheen === undefined
      ? {}
      : {
          extensions: {
            [SHEEN]: {
              sheenColorFactor: finish.sheen.colour.map(srgbToLinear),
              sheenRoughnessFactor: finish.sheen.roughness,
            },
          },
        }),
    ...(Object.keys(extras).length === 0 ? {} : { extras }),
  };
};

const PAINT_SLOT = 'paint';

/**
 * Every palette material as the glTF material a paintable surface finished in it is written with, so a host that
 * repaints a surface swaps in exactly what an export in that finish would carry.
 */
export const paintMaterials = (palette: Palette): Record<string, Json> =>
  Object.fromEntries(
    Object.keys(palette.materials ?? {})
      .sort()
      .map((id) => [
        id,
        gltfMaterial(
          resolveAppearance(palette, PAINT_SLOT, '', {
            context: { finish: { [PAINT_SLOT]: id }, paintable: [PAINT_SLOT] },
            overrides: { partSlot: PAINT_SLOT },
          }),
        ),
      ]),
  );

/** Everything the writer needs from one part, once it has passed validation. */
interface PartExport {
  readonly id: string;
  readonly family: string;
  readonly appearance?: PartInstance['appearance'];
  readonly def: Omit<PartDef, 'motion'>;
  readonly motion?: Motion;
  readonly placed: Transform;
}

const sameAppearance = (a: ReturnType<typeof resolveAppearance>, b: ReturnType<typeof resolveAppearance>): boolean =>
  a.material === b.material &&
  a.slot === b.slot &&
  a.paintable === b.paintable &&
  a.color.every((channel, index) => channel === b.color[index]);

/** Splits a merge group whose solids differ in finish or piece, because one primitive carries one of each. */
const splitMixed = (
  items: DisplayItem[],
  appearanceFor: (solid: DisplayItem['solids'][number]) => ReturnType<typeof resolveAppearance>,
): DisplayItem[] =>
  items.flatMap((item) => {
    if (!item.merged) {
      return [item];
    }
    const [head, ...rest] = item.solids;
    const first = appearanceFor(head!);
    return rest.every(
      (solid) => solid.display?.piece === head!.display?.piece && sameAppearance(first, appearanceFor(solid)),
    )
      ? [item]
      : item.solids.map((solid) => ({ id: solid.id, solids: [solid], merged: false }));
  });
const fail = (error: GlbExportError): GlbExportResult => ({ ok: false, error });

/** The established GLB extras keys, for the motion of a part with one slide and at most one hinge. */
const motionMetadata = ({ stages }: Motion) => {
  const slide = stages.find((stage) => stage.kind === 'slide');
  const hinge = stages.find((stage) => stage.kind === 'hinge');
  if (!slide || stages.length !== (hinge ? 2 : 1)) {
    throw new Error('the GLB extras describe a part with one slide and at most one hinge');
  }
  return {
    kind: 'linear',
    axis: slide.direction,
    ...(hinge
      ? {
          turn: {
            pivot: hinge.axis.from,
            axis: normalize(sub(hinge.axis.to, hinge.axis.from)),
            angleRadians: (hinge.angle * Math.PI) / 180,
          },
        }
      : {}),
    // biome-ignore lint/complexity/useLiteralKeys: preserve legacy GLB keys without core domain identifiers.
    ['rest']: [0, 0, 0],
    // biome-ignore lint/complexity/useLiteralKeys: preserve legacy GLB keys without core domain identifiers.
    ['rearmost']: scale(slide.direction, slide.travel),
  };
};

/** Checks the input in the order the frozen error variants are listed; the first problem wins. */
const refusal = (input: Parameters<ExportGlb>[0]): GlbExportError | undefined => {
  const { resolved, palette, asset } = input;
  if (resolved.issues.length > 0) {
    return { code: 'structure-issues', issues: resolved.issues };
  }
  const unplaced = Object.keys(resolved.assembly.parts)
    .filter((id) => !resolved.placed.has(id))
    .sort();
  if (unplaced.length > 0) {
    return { code: 'unplaced-parts', partIds: unplaced };
  }
  for (const id of Object.keys(resolved.assembly.parts).sort()) {
    const bad = validId(id) ? resolved.defs.get(id)?.ports.find((p) => !validId(p.id))?.id : id;
    if (bad !== undefined) {
      return { code: 'invalid-port-id', id: validId(id) ? `${id}.${bad}` : id };
    }
  }
  const badKey = badPaletteKey(palette);
  if (badKey !== undefined) {
    return { code: 'invalid-palette-color', key: badKey };
  }
  const badFinish = invalidPaletteFinish(palette);
  if (badFinish !== undefined) {
    return { code: 'invalid-palette-finish', key: badFinish };
  }
  if (!ASSET_FILE.test(asset.file)) {
    return { code: 'invalid-asset-file', file: asset.file };
  }
  return undefined;
};

/**
 * How a part drawn smooth is cut into primitives: one per display item, which tools reading a solid's own primitive
 * need, or one per finish and piece, as a voxel part is.
 */
type SmoothPrimitives = 'per-item' | 'per-finish';

/** The meshes of one finish as one, in metres: their vertices end to end and their indices shifted to match. */
const joinedMesh = (
  meshes: readonly {
    readonly positions: Float32Array;
    readonly normals: Float32Array;
    readonly indices: Uint32Array;
  }[],
  metresPerUnit: number,
) => {
  const positions = new Float32Array(meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0));
  const normals = new Float32Array(positions.length);
  const indices = new Uint32Array(meshes.reduce((sum, mesh) => sum + mesh.indices.length, 0));
  let vertex = 0;
  let index = 0;
  for (const mesh of meshes) {
    positions.set(
      mesh.positions.map((x) => x * metresPerUnit),
      vertex * 3,
    );
    normals.set(mesh.normals, vertex * 3);
    indices.set(
      mesh.indices.map((i) => i + vertex),
      index,
    );
    vertex += mesh.positions.length / 3;
    index += mesh.indices.length;
  }
  return { positions, normals, indices };
};

/**
 * Writes a resolved assembly as a `.glb`. Refuses (as an error value, never an exception) an assembly with
 * structure issues or unplaced parts, ids that can't form a stable port id, a palette colour outside sRGB [0,1],
 * and an asset file outside `assets/models/<name>.glb`.
 */
const writeGlb = (input: GlbExportInput, smoothPrimitives: SmoothPrimitives = 'per-item'): GlbExportResult => {
  checkNesting(input);
  const error = refusal(input);
  if (error) {
    return fail(error);
  }
  const { resolved, palette, asset } = input;
  const { metresPerUnit } = resolved.domain.units;

  const parts: PartExport[] = Object.keys(resolved.assembly.parts)
    .sort()
    .flatMap((id) => {
      const def = resolved.defs.get(id);
      const motion = resolved.motions.get(id);
      const placed = resolved.placed.get(id);
      const instance = resolved.assembly.parts[id];
      return def && placed && instance
        ? [
            {
              id,
              family: instance.family,
              ...(instance.appearance ? { appearance: instance.appearance } : {}),
              def,
              ...(motion ? { motion } : {}),
              placed,
            },
          ]
        : [];
    });
  const mounts = partMounts(resolved);

  const skin = input.skin === undefined ? undefined : prepareSkin(input.skin);
  const bin = new BinaryBuffer();
  const materials: Json[] = [];
  const materialIndex = new Map<string, number>();
  const materialFor = (appearance: ReturnType<typeof resolveAppearance>): number => {
    const { color: srgb, material, shade, finish, paintable } = appearance;
    // A paintable material never merges with an unmarked one of the same look, so a repaint reaches only its own.
    const key = JSON.stringify([material, shade, srgb.map(srgbToLinear), finish, paintable]);
    let index = materialIndex.get(key);
    if (index === undefined) {
      index = materials.length;
      materialIndex.set(key, index);
      materials.push(gltfMaterial(appearance));
    }
    return index;
  };

  const meshes: Json[] = [];
  const appearanceFinish = input.finish ?? input.appearance?.finish;
  const appearanceContext = {
    ...input.appearance,
    ...(appearanceFinish === undefined ? {} : { finish: appearanceFinish }),
  };
  const nodes: Json[] = [{ name: asset.id, children: [] as number[] }];
  const rootChildren = (nodes[0] as { children: number[] }).children;
  const ports: ExportPortMetadata[] = [];
  const appearanceFor = (part: PartExport, solid: DisplayItem['solids'][number]) =>
    resolveAppearance(palette, part.def.family, solid.id, {
      context: part.appearance ?? appearanceContext,
      overrides: {
        ...(part.def.material === undefined ? {} : { partMaterial: part.def.material }),
        ...(part.def.slot === undefined ? {} : { partSlot: part.def.slot }),
        ...(solid.material === undefined ? {} : { solidMaterial: solid.material }),
        ...(solid.slot === undefined ? {} : { solidSlot: solid.slot }),
      },
    });
  const meshOf = (item: DisplayItem) =>
    item.merged
      ? meshForSolidGroup(item.solids)
      : meshForSolid(item.solids[0]!, displayBevel(item.solids[0]!, resolved.domain.units), input.revolveFacets);
  const bufferPrimitive = (
    mesh: { positions: Float32Array; normals: Float32Array; indices: Uint32Array },
    material: number,
    extras: Json,
    part: PartExport,
  ): Json => {
    const frame = { r: part.placed.r, t: toMetres(part.placed.t, metresPerUnit) };
    const positions = skin ? new Float32Array(skinPoints(mesh.positions, frame).flat()) : mesh.positions;
    const normals = mesh.normals.slice();
    if (skin) {
      for (let i = 0; i < normals.length; i += 3) {
        normals.set(applyDir(frame, [normals[i]!, normals[i + 1]!, normals[i + 2]!]), i);
      }
    }
    const points = Array.from(
      { length: positions.length / 3 },
      (_, index) => [positions[index * 3]!, positions[index * 3 + 1]!, positions[index * 3 + 2]!] as Vec3,
    );
    const [min, max] = boundsOfPoints(points);
    const position = bin.add(
      positions,
      { componentType: FLOAT, count: positions.length / 3, type: 'VEC3', min, max },
      ARRAY_BUFFER,
    );
    const normal = bin.add(normals, { componentType: FLOAT, count: normals.length / 3, type: 'VEC3' }, ARRAY_BUFFER);
    const indices = bin.add(
      mesh.indices,
      { componentType: UNSIGNED_INT, count: mesh.indices.length, type: 'SCALAR' },
      ELEMENT_ARRAY_BUFFER,
    );
    const attributes: Json = { POSITION: position, NORMAL: normal };
    if (skin) {
      const evaluated = skin.attributes(points);
      attributes.JOINTS_0 = bin.add(
        evaluated.joints,
        { componentType: 5123, count: points.length, type: 'VEC4' },
        ARRAY_BUFFER,
      );
      attributes.WEIGHTS_0 = bin.add(
        evaluated.weights,
        { componentType: FLOAT, count: points.length, type: 'VEC4' },
        ARRAY_BUFFER,
      );
    }
    return { attributes, indices, material, mode: 4, extras };
  };
  const appearanceExtras = (appearance: ReturnType<typeof resolveAppearance>): Json => ({
    ...(appearance.material === undefined ? {} : { material: appearance.material }),
    ...(appearance.slot === undefined ? {} : { slot: appearance.slot }),
  });
  const pieceExtras = (piece: string | undefined): Json => (piece === undefined ? {} : { piece });
  const primitiveFor = (part: PartExport, item: DisplayItem): Json | undefined => {
    const solid = item.solids[0]!;
    const mesh = meshOf(item);
    if (mesh.triangleCount === 0 || mesh.indices.length === 0) {
      return undefined;
    }
    const appearance = appearanceFor(part, solid);
    return bufferPrimitive(
      { positions: mesh.positions.map((x) => x * metresPerUnit), normals: mesh.normals, indices: mesh.indices },
      materialFor(appearance),
      {
        ...(item.merged ? { mergeGroup: item.id, solids: item.solids.map(({ id }) => id) } : { solid: solid.id }),
        ...pieceExtras(solid.display?.piece),
        ...appearanceExtras(appearance),
      },
      part,
    );
  };
  const itemsOf = (part: PartExport, copy: 'voxel' | 'smooth' = 'voxel'): DisplayItem[] => {
    const drawn = part.def.displaySolids ?? part.def.solids;
    const solids = copy === 'smooth' ? drawn.filter((solid) => !solid.display?.voxelOnly) : drawn;
    return splitMixed(displayItems(solids), (solid) => appearanceFor(part, solid));
  };
  /** What a part's voxels sample for an item: a terracing solid's steps on the part's lattice, else the item's mesh. */
  const voxelSourceOf = (item: DisplayItem, lattice: TerraceLattice | undefined) => {
    if (item.merged) {
      // A group is welded into one mesh before it is sampled, so its members have no outlines of their own to step.
      const terracing = item.solids.find((solid) => solid.display?.terrace !== undefined);
      if (terracing) {
        throw new Error(`Solid "${terracing.id}" terraces inside merge group "${item.id}"; a merged solid cannot.`);
      }
      return meshOf(item);
    }
    return (lattice && terracedMesh(item.solids[0]!, lattice)) ?? meshOf(item);
  };
  /** The part's voxel sources in part-local metres, one per display item, or none for an empty one. */
  const drawnMeshes = new Map<string, ({ positions: Float32Array; indices: Uint32Array } | undefined)[]>();
  const drawnOf = (part: PartExport) => {
    let drawn = drawnMeshes.get(part.id);
    if (drawn === undefined) {
      const grain =
        input.voxelGrain === undefined
          ? undefined
          : partVoxelGrain(part.def, { ...input, voxelGrain: input.voxelGrain }, metresPerUnit);
      const lattice = grain === undefined ? undefined : terraceLattice(part.placed, grain, metresPerUnit);
      drawn = itemsOf(part).map((item) => {
        const mesh = voxelSourceOf(item, lattice);
        return mesh.triangleCount === 0 || mesh.indices.length === 0
          ? undefined
          : { positions: mesh.positions.map((x) => x * metresPerUnit), indices: mesh.indices };
      });
      drawnMeshes.set(part.id, drawn);
    }
    return drawn;
  };
  /** Bounds of a mesh after `transform`, in metres. */
  const boundsAfter = (positions: ArrayLike<number>, transform: Transform): [number[], number[]] => {
    const low = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    const high = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (let v = 0; v < positions.length; v += 3) {
      const p = applyPoint(transform, [positions[v]!, positions[v + 1]!, positions[v + 2]!]);
      for (let axis = 0; axis < 3; axis += 1) {
        low[axis] = Math.min(low[axis]!, p[axis]!);
        high[axis] = Math.max(high[axis]!, p[axis]!);
      }
    }
    return [low, high];
  };
  const placedInMetres = (part: PartExport): Transform => ({
    r: part.placed.r,
    t: toMetres(part.placed.t, metresPerUnit),
  });
  /** Other parts' drawn meshes that come within a voxel of this part, moved into this part's frame. */
  const neighboursOf = (part: PartExport, grain: number) => {
    const world = placedInMetres(part);
    const own = drawnOf(part).flatMap((mesh) => (mesh ? [boundsAfter(mesh.positions, world)] : []));
    const near = ([low, high]: [number[], number[]]) =>
      own.some(([ownLow, ownHigh]) =>
        [0, 1, 2].every((axis) => low[axis]! <= ownHigh[axis]! + grain && high[axis]! >= ownLow[axis]! - grain),
      );
    const toLocal = invert(world);
    return parts.flatMap((other) => {
      if (other.id === part.id) {
        return [];
      }
      const into = compose(toLocal, placedInMetres(other));
      return drawnOf(other).flatMap((mesh) => {
        if (!(mesh && near(boundsAfter(mesh.positions, placedInMetres(other))))) {
          return [];
        }
        const positions = new Float32Array(mesh.positions.length);
        for (let v = 0; v < positions.length; v += 3) {
          positions.set(applyPoint(into, [mesh.positions[v]!, mesh.positions[v + 1]!, mesh.positions[v + 2]!]), v);
        }
        return [{ positions, indices: mesh.indices }];
      });
    });
  };
  /**
   * The part's display items grouped by finish and piece, in the order each group first draws: per item its group, none
   * for an item that draws nothing, since a primitive carries one material and one piece.
   */
  const finishGroupsOf = (part: PartExport, items: DisplayItem[], draws: (index: number) => boolean) => {
    const finishes: {
      appearance: ReturnType<typeof resolveAppearance>;
      piece: string | undefined;
      solids: string[];
    }[] = [];
    const finishOf = new Map<string, number>();
    const groups = items.map((item, index) => {
      if (!draws(index)) {
        return undefined;
      }
      const solid = item.solids[0]!;
      const appearance = appearanceFor(part, solid);
      const piece = solid.display?.piece;
      const key = JSON.stringify([materialFor(appearance), appearance.material, appearance.slot, piece]);
      let group = finishOf.get(key);
      if (group === undefined) {
        group = finishes.push({ appearance, piece, solids: [] }) - 1;
        finishOf.set(key, group);
      }
      finishes[group]!.solids.push(...item.solids.map(({ id }) => id));
      return group;
    });
    return { finishes, groups };
  };
  const finishExtras = (finish: ReturnType<typeof finishGroupsOf>['finishes'][number]): Json => ({
    solids: finish.solids,
    ...pieceExtras(finish.piece),
    ...appearanceExtras(finish.appearance),
  });
  /**
   * One primitive per finish and piece of the authored meshes, as a voxel part draws, so a consumer pays a draw call per
   * finish rather than per solid.
   */
  const smoothFinishPrimitivesFor = (part: PartExport, items: DisplayItem[]): Json[] => {
    const drawn = items.map((item) => {
      const mesh = meshOf(item);
      return mesh.triangleCount === 0 || mesh.indices.length === 0 ? undefined : mesh;
    });
    const { finishes, groups } = finishGroupsOf(part, items, (index) => drawn[index] !== undefined);
    return finishes.map((finish, group) => {
      const meshes = drawn.filter(
        (mesh, index): mesh is NonNullable<typeof mesh> => mesh !== undefined && groups[index] === group,
      );
      return bufferPrimitive(
        joinedMesh(meshes, metresPerUnit),
        materialFor(finish.appearance),
        finishExtras(finish),
        part,
      );
    });
  };
  /**
   * One primitive per finish and piece: the part's drawn solids sampled at the grain, so later solids paint over
   * earlier ones. Each piece's primitives together form a closed surface.
   */
  const voxelPrimitivesFor = (part: PartExport, items: DisplayItem[], grain: number): Json[] => {
    const drawn = drawnOf(part);
    const { finishes, groups } = finishGroupsOf(part, items, (index) => drawn[index] !== undefined);
    const origin = latticeOrigin(part.placed, grain, metresPerUnit);
    const fill =
      input.drawnVoxels?.(part.id) ??
      fillVoxels(
        drawn.map((mesh) => mesh ?? { positions: [], indices: [] }),
        grain,
        origin,
      );
    if (fill.grain !== grain || fill.origin.some((value, axis) => value !== origin[axis])) {
      throw new Error(`The drawn voxels of ${part.id} lie on another lattice than the file's`);
    }
    const { groups: meshes } = voxelize(fill, {
      groupOf: (source) => groups[source]!,
      neighbours: neighboursOf(part, grain),
      // A face between pieces is kept on both sides, so a game hiding one piece leaves the rest closed.
      exposeInterface: (group, neighbour) =>
        finishes[group]!.piece !== finishes[neighbour]!.piece ||
        (!surfaceOf(finishes[group]!.appearance.finish).transparent &&
          surfaceOf(finishes[neighbour]!.appearance.finish).transparent),
      preserveFace: input.skin ? preserveSkinFace(input.skin, placedInMetres(part)) : undefined,
    });
    return [...meshes].map(([group, buffers]) =>
      bufferPrimitive(
        buffers,
        materialFor(finishes[group]!.appearance),
        { voxelGrain: grain, ...finishExtras(finishes[group]!) },
        part,
      ),
    );
  };

  /** A smooth part of a voxelized file as drawn: seated one class grain into the part it mounts on. */
  const seatedInHost = (part: PartExport): PartExport => {
    const mountPort =
      part.id === input.resolved.assembly.root
        ? input.rootMount
        : mounts.get(part.id)?.mount?.interface.slice(part.id.length + 1);
    const port = part.def.ports.find(({ id }) => id === mountPort);
    return input.voxelGrain === undefined || port === undefined
      ? part
      : { ...part, def: seatedDef(part.def, port, input.voxelGrain / metresPerUnit) };
  };

  const addPart = (part: PartExport): void => {
    const drawn = part.def.displaySolids ?? part.def.solids;
    const grain =
      input.voxelGrain === undefined
        ? undefined
        : partVoxelGrain(part.def, { ...input, voxelGrain: input.voxelGrain }, metresPerUnit);
    const smoothPrimitivesFor = (items: DisplayItem[]): Json[] =>
      smoothPrimitives === 'per-finish'
        ? smoothFinishPrimitivesFor(part, items)
        : items.flatMap((item) => {
            const primitive = primitiveFor(part, item);
            return primitive ? [primitive] : [];
          });
    const primitives =
      grain === undefined
        ? smoothPrimitivesFor(itemsOf(seatedInHost(part), 'smooth'))
        : voxelPrimitivesFor(part, itemsOf(part), grain);
    const name = partNodeName(part.id, part.family);
    const joints = mounts.get(part.id);
    const node: Json = { name };
    const rotation = quaternion(part.placed.r);
    if (!(skin || isIdentity(part.placed.r))) {
      node.rotation = rotation;
    }
    node.translation = skin ? [0, 0, 0] : toMetres(part.placed.t, metresPerUnit);
    if (skin && primitives.length > 0) {
      node.skin = 0;
    }
    if (primitives.length > 0) {
      node.mesh = meshes.length;
      meshes.push({ name, primitives });
    }
    const appearance = resolveAppearance(palette, part.def.family, '', {
      context: part.appearance ?? appearanceContext,
      overrides: {
        ...(part.def.material === undefined ? {} : { partMaterial: part.def.material }),
        ...(part.def.slot === undefined ? {} : { partSlot: part.def.slot }),
      },
    });
    node.extras = {
      part: part.id,
      family: part.family,
      role: part.def.family,
      ...(appearance.material === undefined ? {} : { material: appearance.material }),
      ...(appearance.slot === undefined ? {} : { slot: appearance.slot }),
      solids: drawn.map((s) => s.id),
      ...(part.motion ? { motion: motionMetadata(part.motion) } : {}),
      ...(joints?.mount ? { mount: joints.mount } : {}),
      ...(joints && joints.meets.length > 0 ? { meets: joints.meets } : {}),
    };

    const children: number[] = [];
    const nodeIndex = nodes.length;
    nodes.push(node);
    for (const port of part.def.ports) {
      const metadata = portMetadata(part.id, port, part.placed);
      ports.push(metadata);
      const portNode: Json = {
        name: `${part.id}.${port.id}`,
        translation: toMetres(skin ? applyPoint(part.placed, port.pos) : port.pos, metresPerUnit),
        extras: { port: metadata },
      };
      const frame = (skin ? compose(part.placed, portFrame(port)) : portFrame(port)).r;
      if (!isIdentity(frame)) {
        portNode.rotation = quaternion(frame);
      }
      children.push(nodes.length);
      nodes.push(portNode);
    }
    if (children.length > 0) {
      node.children = children;
    }
    rootChildren.push(nodeIndex);
  };
  for (const part of parts) {
    addPart(part);
  }

  const skins: Json[] = [];
  if (skin && input.skin) {
    const first = nodes.length;
    const { joints } = input.skin;
    for (const joint of joints) {
      nodes.push({ name: joint.name, matrix: matrixOf(joint.rest) });
    }
    joints.forEach((joint, index) => {
      if (joint.parent === undefined) {
        rootChildren.push(first + index);
      } else {
        const parent = nodes[first + joints.findIndex(({ name }) => name === joint.parent)]!;
        parent.children ??= [];
        (parent.children as number[]).push(first + index);
      }
    });
    skins.push({
      joints: joints.map((_, index) => first + index),
      inverseBindMatrices: bin.add(skin.inverseBinds, { componentType: FLOAT, count: joints.length, type: 'MAT4' }),
    });
  }

  (nodes[0] as Json).extras = {
    [input.metadataNamespace ?? 'assembly']: {
      assembly: resolved.assembly.name,
      unit: 'u',
      metresPerUnit,
      portFrameUnit: 'u',
      materialCount: materials.length,
      ...input.modelMetadata,
    },
  };

  const sheened = materials.some((material) => (material.extensions as Json | undefined)?.[SHEEN] !== undefined);
  const json: Json = {
    asset: { version: '2.0', generator: input.generator ?? 'skelly assembly engine' },
    ...(sheened ? { extensionsUsed: [SHEEN] } : {}),
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    ...(skin ? { skins } : {}),
    ...(meshes.length > 0 ? { meshes, materials } : {}),
    ...(bin.byteLength > 0
      ? {
          accessors: bin.accessors,
          bufferViews: bin.views,
          buffers: [{ byteLength: bin.byteLength }],
        }
      : {}),
  };

  return {
    ok: true,
    glb: glbFile(json, bin.bytes()),
    partNodes: parts.map(({ id, family }) => partNodeName(id, family)),
    ports,
  };
};

const refusingBadSkin = (write: () => GlbExportResult): GlbExportResult => {
  try {
    return write();
  } catch (error) {
    if (error instanceof SkinError) {
      return fail({ code: 'invalid-skin', message: error.message });
    }
    throw error;
  }
};

export const exportGlb: ExportGlb = (input) => refusingBadSkin(() => writeGlb(input));

/**
 * A shipped model's two files from one input: the file as asked, and its smooth copy, the same assembly as its authored
 * meshes, so the copy can never drift from the build its datums are read off. The copy is drawn one primitive per
 * finish and piece, as a voxel part is, since it ships to be drawn, not to be inspected solid by solid.
 */
export const exportModelGlbs = (input: GlbExportInput): ModelGlbsResult => {
  const file = exportGlb(input);
  if (!file.ok) {
    return file;
  }
  const { voxelGrain, voxelDetailGrain, voxelDetailThinParts, drawnVoxels, ...authored } = input;
  const smooth = refusingBadSkin(() => writeGlb(authored, 'per-finish'));
  return smooth.ok ? { ...file, smoothGlb: smooth.glb } : smooth;
};
