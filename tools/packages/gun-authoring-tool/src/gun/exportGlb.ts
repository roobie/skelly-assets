import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, PartDef, Resolved } from '@skelly/construct/assembly/schema.ts';
import {
  applyDir,
  applyPoint,
  eulerXyzDegrees,
  length,
  normalize,
  sub,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import type { Motion } from '@skelly/motion/motion';
import type { ModelParts, NeutralModel } from '@skelly/thing-core/schema';
import { type DrawnGeometry, drawnGeometry } from '@skelly/thing-export/drawn.ts';
import type {
  AppearanceContext,
  GlbAssetIdentity,
  GlbExportError,
  VoxelGrains,
} from '@skelly/thing-export/exportTypes.ts';
import { partNodeName, partVoxelGrain } from '@skelly/thing-export/glb.ts';
import pistolAction from '../../../../../models/guns/tables/pistolAction.json' with { type: 'json' };
import { compareCodeUnits } from '../../../../codeUnitOrder.mjs';
import { calibreSlug } from '../ammo/calibreSlug.ts';
import type { Cartridge } from '../ammo/cartridge.ts';
import { type ResolvedGunAction, resolveGunAction } from './actionDescription.ts';
import { ACTION_ROLE_TAGS } from './actionRoles.ts';
import { cycleLegs, type TimelineLeg } from './actionTimeline.ts';
import { GUN_ANCHORS } from './anchorData.ts';
import { type AnchorSelectionError, GUN_ANCHOR_POLICY, type SelectedAnchors, selectGunAnchors } from './anchors.ts';
import {
  type AttachmentCompatibilityPair,
  attachmentCompatibility,
  attachmentCompatibilityPairs,
} from './attachmentCompatibility.ts';
import {
  type AttachmentMetadata,
  type AttachmentSlotMetadata,
  attachmentMetadata,
  attachmentMountSlot,
  attachmentSlots,
  withAttachmentInstanceAppearances,
} from './attachments.ts';
import { boltCalibreIssue, isBoltAssembly, withBoltCalibre } from './boltCartridge.ts';
import type { CycleMode, CycleTimeline } from './cycle.ts';
import { gunDomain } from './domain.ts';
import { FILE_AXES, fileMotion, fileVector, gripTurn, inFileFrame, toFileAxes, toFileRotation } from './exportFrame.ts';
import { exportGunGeometry as exportGlb, exportGunModels } from './glbWriter.ts';
import { internalMagazineCapacity } from './internalMagazine.ts';
import { getOptic } from './optics.ts';
import { GUN_PALETTE } from './palette.ts';
import { BUILT_IN_FRONT_POST } from './parts.ts';
import { gunModelParts, type PartItems, PartMassError } from './physical.ts';
import { type PlatformChoice, withPlatformPorts } from './platforms.ts';
import { type RevolverMetadata, revolverMetadata } from './revolverExport.ts';
import { type SightRole, sightAxisOf, sightRoleOf } from './sightAxis.ts';
import { ironGunEyeRange } from './sightView.ts';
import { tubeMagazineCapacity } from './tubeCapacity.ts';

export type DeadvoxModelFile = `assets/models/${string}.glb`;

interface ActionPartMetadata {
  /** Exact glTF node name; the existing part node carries its geometry as a separate mesh. */
  readonly node: string;
  readonly handGrip?: Vec3;
  /** Shared timelines this node follows; other modes leave it at home. */
  readonly modes: readonly CycleMode[];
  /** What the timelines play of the part, in the model file's frame and metres. */
  readonly motion: Motion;
}

interface MovingPartMetadata {
  /** Exact glTF node name of the part. */
  readonly node: string;
  /** How the part moves through its named stops, in the model file's frame and metres. */
  readonly motion: Motion;
}

interface CycleMetadata {
  readonly durationSimSeconds: number;
  /** The stops each following part's clock runs through in turn, from rest, over the seconds given. */
  readonly legs: readonly TimelineLeg[];
}

interface GunActionMetadata {
  readonly parts: Readonly<Record<string, ActionPartMetadata>>;
  readonly fire?: CycleMetadata;
  readonly hand: CycleMetadata;
  /** Stroke fraction at which the case leaves. */
  readonly ejectAt: number;
  /** Unit ejection direction in model coordinates. */
  readonly ejectDirection: Vec3;
  readonly holdOpen: boolean;
  readonly roundsPerSimMinute?: number;
  readonly triggerMode?: 'semi' | 'auto';
}

export interface DeadvoxModelEntry extends NeutralModel {
  readonly gun: GunModelFields;
}

export interface GunModelFields {
  /** The model-derived eye point and sight axis used to align the player view. */
  readonly sight?: {
    readonly kind: 'iron' | 'optic';
    readonly eye: Vec3;
    readonly direction: Vec3;
    readonly up: Vec3;
    readonly eyeReliefMetres: number;
    readonly eyeDistanceRangeMetres?: readonly [number, number];
    readonly ocularDiameterMetres?: number;
  };
  /** Unit barrel direction in the same local model frame as anchors. */
  readonly muzzleDirection?: Vec3;
  /** Exact cartridge data id, not a slug or display designation. */
  readonly calibre?: string;
  /** Present on magazine entries; one local pose per round slot, top to bottom. */
  readonly capacity?: number;
  /** Integral capacity; unlike a detached box magazine, no round-pose column. */
  readonly internalMagazine?: { readonly capacity: number };
  readonly rounds?: readonly { readonly at: Vec3; readonly tilt: number }[];
  readonly action?: GunActionMetadata;
  /** Parts that move outside the action, such as a port cover or a collapsible stock; each node names its part. */
  readonly moving?: readonly MovingPartMetadata[];
  readonly revolver?: RevolverMetadata;
  /** Metadata for an attachment exported as its own item model. */
  readonly attachment?: AttachmentMetadata;
  /** Default mods fitted by the template, with data for deadvox to consume. */
  readonly attachments?: readonly (AttachmentMetadata & { readonly node: string; readonly mountedAt: string })[];
  /** Authored mount interfaces; fitted occupancy is linked by attachment `mountedAt` IDs. */
  readonly attachmentSlots?: readonly AttachmentSlotMetadata[];
  /** Complete gungen-certified standalone attachment allowlist for each mount slot. */
  readonly compatibility?: Readonly<Record<string, readonly string[]>>;
  /** Complete canonical allowlist of compatible pairs of single-fit choices. */
  readonly compatibilityPairs?: readonly AttachmentCompatibilityPair[];
  /** Fitted, replaceable item slots whose baked geometry is present in the gun GLB. */
  readonly slots?: { readonly magazine?: { readonly node: string; readonly at: Vec3; readonly turn: Vec3 } };
}

export interface GunDeadvoxModelEntry extends DeadvoxModelEntry {
  readonly parts: ModelParts;
  readonly grip: { readonly at: Vec3; readonly turn: Vec3 };
}

export interface GunExportMetadata {
  /** Cartridge loaded by this design; its id becomes the exact Deadvox `calibre` value. */
  readonly cartridge?: Cartridge;
}

const voxelGrainsOf = ({
  voxelGrain,
  voxelDetailGrain,
  voxelDetailThinParts,
}: {
  [Key in keyof VoxelGrains]-?: VoxelGrains[Key] | undefined;
}): Partial<VoxelGrains> => ({
  ...(voxelGrain === undefined ? {} : { voxelGrain }),
  ...(voxelDetailGrain === undefined ? {} : { voxelDetailGrain }),
  ...(voxelDetailThinParts === undefined ? {} : { voxelDetailThinParts }),
});

interface GunExportOptions extends GunExportMetadata, Partial<VoxelGrains> {
  /** Geometry-only callers skip the slot solver; CLI model exports explicitly request its certificate. */
  readonly includeAttachmentCompatibility?: boolean;
  readonly excludedAttachments?: readonly string[];
  readonly items?: PartItems;
  /** The design's platform, which the file records and which gives each port node its size class and swap path. */
  readonly platform?: PlatformChoice;
}

interface GunModelEntryOptions extends GunExportMetadata {
  readonly handling?: GunActionExport;
  readonly internalCapacity?: number;
}

export type GunAssetIdentity = GlbAssetIdentity;

export type GunExportResult =
  | {
      readonly ok: true;
      readonly glb: Uint8Array;
      readonly smoothGlb: Uint8Array;
      readonly partNodes: readonly string[];
      readonly modelEntry: GunDeadvoxModelEntry;
    }
  | {
      readonly ok: false;
      readonly error: GlbExportError | AnchorSelectionError | { readonly code: 'part-mass'; readonly message: string };
    };

const round6 = (value: number): number => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
};

/** A file-frame point in metres. */
const fileMetres = ([x, y, z]: Vec3, metresPerUnit: number): Vec3 => [
  round6(x * metresPerUnit),
  round6(y * metresPerUnit),
  round6(z * metresPerUnit),
];

/** A gungen-frame point in the file's axes and metres. */
const modelPoint = (point: Vec3, metresPerUnit: number): Vec3 => fileMetres(toFileAxes(point), metresPerUnit);

interface GunActionExport {
  readonly ejection: Vec3;
  readonly action: GunActionMetadata;
}

const cycleMetadata = (cycle: CycleTimeline, parts: Readonly<Record<string, ActionPartMetadata>>): CycleMetadata => ({
  durationSimSeconds: cycle.durationSeconds,
  legs: cycleLegs(
    cycle,
    Object.values(parts)
      .filter(({ modes }) => modes.includes(cycle.mode))
      .map(({ motion }) => motion),
  ),
});

const handGripMetadata = (part: ResolvedGunAction['carrier'], metresPerUnit: number): { handGrip?: Vec3 } => {
  const grip = part.def.axes.find((axis) => axis.kind === 'rack-grip');
  return grip ? { handGrip: modelPoint(applyPoint(part.placed, grip.origin), metresPerUnit) } : {};
};

const buildActionExport = (
  resolved: Resolved,
  description: ResolvedGunAction | undefined,
): GunActionExport | undefined => {
  const cycle = description?.cycle;
  if (!(description?.ejection && cycle)) {
    return undefined;
  }
  const { metresPerUnit } = resolved.domain.units;
  const parts: Record<string, ActionPartMetadata> = Object.fromEntries(
    Object.entries(description.parts).map(([role, part]) => [
      role,
      {
        node: part.node,
        modes: part.modes,
        ...handGripMetadata(part, metresPerUnit),
        motion: fileMotion(part.motion, part.placed, metresPerUnit),
      },
    ]),
  );
  return {
    ejection: description.ejection,
    action: {
      parts,
      ...(description.kind === 'slide' ? { triggerMode: pistolAction.triggerMode as 'semi' } : {}),
      ...(cycle.fire ? { fire: cycleMetadata(cycle.fire, parts) } : {}),
      hand: cycleMetadata(cycle.hand, parts),
      ejectAt: cycle.ejectAt,
      ejectDirection: toFileAxes(cycle.ejectDirection),
      holdOpen: cycle.holdOpenOnEmpty,
      ...(cycle.rpm === undefined ? {} : { roundsPerSimMinute: cycle.rpm }),
    },
  };
};

/**
 * Every part that moves for its own sake rather than with the action, a port cover or a stock: its node and its motion
 * in the file's frame and metres. A part with an action role moves with the action, so it is left to the action
 * description, or left out with the action where none is described.
 */
const movingPartsData = (resolved: Resolved): GunModelFields['moving'] | undefined => {
  const { metresPerUnit } = resolved.domain.units;
  const acts = (id: string) => resolved.defs.get(id)!.tags?.some((tag) => ACTION_ROLE_TAGS.includes(tag));
  const moving = [...resolved.motions]
    .filter(([id]) => !acts(id))
    .map(
      ([id, motion]): MovingPartMetadata => ({
        node: partNodeName(id, resolved.assembly.parts[id]!.family),
        motion: fileMotion(motion, resolved.placed.get(id)!, metresPerUnit),
      }),
    );
  return moving.length > 0 ? moving : undefined;
};

const frontBeadSightLine = (
  resolved: Resolved,
  beadTop: Vec3,
): { readonly direction: Vec3; readonly eyeReliefU: number } => {
  const receiverId = Object.entries(resolved.assembly.parts).find(([, part]) => part.family === 'receiver')?.[0];
  const receiver = receiverId && resolved.defs.get(receiverId);
  const receiverTransform = receiverId && resolved.placed.get(receiverId);
  if (!(receiver && receiverTransform)) {
    throw new Error('Front bead sight needs a receiver to derive its eye line');
  }
  const bounds = receiver.solids.map(localSolidBounds);
  const minimumX = Math.min(...bounds.map(([minimum]) => minimum[0]));
  const maximumX = Math.max(...bounds.map(([, maximum]) => maximum[0]));
  const maximumY = Math.max(...bounds.map(([, maximum]) => maximum[1]));
  const minimumZ = Math.min(...bounds.map(([minimum]) => minimum[2]));
  const maximumZ = Math.max(...bounds.map(([, maximum]) => maximum[2]));
  const receiverTop = applyPoint(receiverTransform, [(minimumX + maximumX) / 2, maximumY, (minimumZ + maximumZ) / 2]);
  const eyePoint: Vec3 = [receiverTop[0], beadTop[1], receiverTop[2]];
  const eyeToBead = sub(beadTop, eyePoint);
  if (!(eyePoint[0] < beadTop[0] && eyePoint[1] > receiverTop[1] && length(eyeToBead) > 0)) {
    throw new Error('Front bead must sit forward of and above the receiver top');
  }
  return { direction: normalize(eyeToBead), eyeReliefU: length(eyeToBead) };
};

interface SightCandidate {
  id: string;
  priority: number;
  kind: 'optic' | 'iron';
  eye: Vec3;
  direction: Vec3;
  eyeReliefMetres: number;
  ocularDiameterMetres?: number;
}

/** Which sight an export aims from: the eye looks through an optic or a rear sight, and only a front sight left alone. */
const SIGHT_PRIORITY: Readonly<Record<SightRole, number>> = { optic: 0, rear: 1, front: 2 };

const sightCandidate = (resolved: Resolved, id: string, part: PartDef): SightCandidate | undefined => {
  const axis = sightAxisOf(part);
  const role = sightRoleOf(part);
  const transform = resolved.placed.get(id);
  if (!(axis && role && transform)) {
    return undefined;
  }
  const { family } = resolved.assembly.parts[id]!;
  const params = resolved.params.get(id);
  const optic = role === 'optic' ? getOptic(params?.type?.value, params?.mountSection?.value) : undefined;
  const eyeLocal = optic ? ([optic.ocularX, optic.opticalAxisY, 0] as Vec3) : axis.origin;
  const eye = applyPoint(transform, eyeLocal);
  let direction = normalize(applyDir(transform, axis.dir));
  let eyeReliefU = optic?.eyeReliefU ?? axis.referenceDistanceU;
  if (family === 'front-sight-bead') {
    ({ direction, eyeReliefU } = frontBeadSightLine(resolved, eye));
  }
  if (eyeReliefU === undefined) {
    throw new Error(`Sight part ${id} needs exported eye relief`);
  }
  return {
    id,
    priority: SIGHT_PRIORITY[role],
    kind: optic ? 'optic' : 'iron',
    eye,
    direction,
    eyeReliefMetres: eyeReliefU * resolved.domain.units.metresPerUnit,
    ...(optic ? { ocularDiameterMetres: optic.ocularOpeningDiameterU * resolved.domain.units.metresPerUnit } : {}),
  };
};

const attachmentData = (resolved: Resolved): (AttachmentMetadata & { node: string; mountedAt: string })[] =>
  [...resolved.defs.entries()].flatMap(([partId, definition]) => {
    const instance = resolved.assembly.parts[partId];
    if (!instance) {
      return [];
    }
    const params = resolved.params.get(partId);
    const metadata = attachmentMetadata(
      instance.family,
      params && Object.fromEntries(Object.entries(params).map(([name, value]) => [name, value.value])),
      resolved.domain.units.metresPerUnit,
      definition,
    );
    if (!metadata) {
      return [];
    }
    const mountedAt = attachmentMountSlot(resolved, partId, metadata.mount);
    if (!mountedAt) {
      return [];
    }
    return [
      {
        ...metadata,
        node: partNodeName(partId, instance.family),
        mountedAt,
      },
    ];
  });

const magazineSlotData = (resolved: Resolved): NonNullable<GunModelFields['slots']>['magazine'] | undefined => {
  const [partId, instance] =
    Object.entries(resolved.assembly.parts).find(([id]) => resolved.defs.get(id)?.family === 'magazine') ?? [];
  const transform = partId && resolved.placed.get(partId);
  if (!(partId && instance && transform) || resolved.params.get(partId)?.integral?.value === 'yes') {
    return undefined;
  }
  return {
    node: partNodeName(partId, instance.family),
    at: modelPoint(transform.t, resolved.domain.units.metresPerUnit),
    // The detached magazine file is turned as the gun's is, so it takes the part's turn in the file's axes.
    turn: eulerXyzDegrees(toFileRotation(transform.r)),
  };
};

interface GlbSightJson {
  readonly nodes: {
    translation?: Vec3;
    rotation?: readonly [number, number, number, number];
    mesh?: number;
    extras?: { part?: string };
  }[];
  readonly meshes: { primitives: { attributes: { POSITION: number }; indices: number }[] }[];
  readonly accessors: { bufferView: number; byteOffset?: number; count: number }[];
  readonly bufferViews: { byteOffset?: number }[];
}

/** Model-metre ranges, one per axis, that a drawn face is read over; an absent axis is unbounded. */
type Column = Readonly<Partial<Record<Axis, readonly [number, number]>>>;

/**
 * A node's rotation as an exact matrix when it is a whole number of quarter turns, or undefined for any other angle.
 * Rounding to whole entries keeps the turned vertices exact, so faces square to an axis stay square.
 */
const quarterTurn = (rotation: GlbSightJson['nodes'][number]['rotation']): readonly number[] | undefined => {
  const [x, y, z, w] = rotation ?? [0, 0, 0, 1];
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
  return m.every((entry, k) => Math.abs(entry - whole[k]!) < 1e-6) ? whole : undefined;
};

/**
 * The model-file triangles drawn by the part `partId`, or by every part of a set turned only by quarter turns, as a
 * part turned by any other angle draws no faces square to the axes.
 */
function* drawnTriangles(
  glb: Uint8Array,
  partId: string | ReadonlySet<string>,
): Generator<readonly [Vec3, Vec3, Vec3]> {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as GlbSightJson;
  const nodes = json.nodes.filter(({ rotation, extras }) =>
    typeof partId === 'string'
      ? extras?.part === partId
      : quarterTurn(rotation) !== undefined && extras?.part !== undefined && partId.has(extras.part),
  );
  if (nodes.some(({ rotation }) => quarterTurn(rotation) === undefined)) {
    throw new Error(`Sight part ${partId} needs a mesh turned only by quarter turns to give its drawn top`);
  }
  const binStart = 20 + jsonLength + 8;
  const startOf = (accessor: GlbSightJson['accessors'][number]) =>
    binStart + (json.bufferViews[accessor.bufferView]!.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  for (const node of nodes) {
    const shift = node.translation ?? [0, 0, 0];
    const turn = quarterTurn(node.rotation)!;
    for (const { attributes, indices } of node.mesh === undefined ? [] : json.meshes[node.mesh]!.primitives) {
      const positions = startOf(json.accessors[attributes.POSITION]!);
      const local = (vertex: number, along: number) => view.getFloat32(positions + vertex * 12 + along * 4, true);
      const coordinate = (vertex: number, along: number) =>
        turn[along * 3]! * local(vertex, 0) +
        turn[along * 3 + 1]! * local(vertex, 1) +
        turn[along * 3 + 2]! * local(vertex, 2) +
        shift[along]!;
      const point = (vertex: number): Vec3 => [coordinate(vertex, 0), coordinate(vertex, 1), coordinate(vertex, 2)];
      const index = json.accessors[indices]!;
      const indexStart = startOf(index);
      for (let corner = 0; corner + 2 < index.count; corner += 3) {
        yield [0, 1, 2].map((k) => point(view.getUint32(indexStart + (corner + k) * 4, true))) as [Vec3, Vec3, Vec3];
      }
    }
  }
}

type Axis = 0 | 1 | 2;

/** The two axes after `axis` in cyclic order, so their cross product points along `axis`. */
const PLANE_OF: Readonly<Record<Axis, readonly [Axis, Axis]>> = { 0: [1, 2], 1: [2, 0], 2: [0, 1] };

/** `point` with its coordinate along `axis` set to `value`. */
const withCoordinate = (point: Vec3, axis: Axis, value: number): Vec3 =>
  point.map((coordinate, k) => (k === axis ? value : coordinate)) as unknown as Vec3;

/** Along an axis (1) or against it (-1). */
type Sense = 1 | -1;

/** Whether the triangle's winding turns its face towards `axis`, or away from it with `sense` -1. */
const facesTowards = (axis: Axis, [a, b, c]: readonly [Vec3, Vec3, Vec3], sense: Sense = 1): boolean => {
  const [u, v] = PLANE_OF[axis];
  return sense * ((b[u] - a[u]) * (c[v] - a[v]) - (b[v] - a[v]) * (c[u] - a[u])) > 0;
};

/**
 * The furthest face along `axis`, or against it with `sense` -1, that the drawn meshes in the model file turn that
 * way, so voxelized metadata reports what the file actually draws. With a column, only faces over it count, which keeps
 * a post's top from being read off the guard ears beside it. A column range on `axis` itself bounds where the face may
 * lie, which keeps a post's top from being read off a hood ring over it.
 */
const drawnFaceMetres = (
  glb: Uint8Array,
  axis: Axis,
  column: Column,
  partId: string | ReadonlySet<string>,
  sense: Sense = 1,
) => {
  const [u, v] = PLANE_OF[axis];
  const over = (values: readonly number[], range: Column[0]) =>
    range === undefined || (Math.min(...values) < range[1] && Math.max(...values) > range[0]);
  const bound = column[axis];
  let far = Number.NEGATIVE_INFINITY;
  for (const triangle of drawnTriangles(glb, partId)) {
    const [a, b, c] = triangle;
    if (
      facesTowards(axis, triangle, sense) &&
      a[axis] === b[axis] &&
      b[axis] === c[axis] &&
      (bound === undefined || (a[axis] >= bound[0] && a[axis] <= bound[1])) &&
      over([a[u], b[u], c[u]], column[u]) &&
      over([a[v], b[v], c[v]], column[v])
    ) {
      far = Math.max(far, sense * a[axis]);
    }
  }
  return Number.isFinite(far) ? round6(sense * far) : undefined;
};

/** The voxelized file a sight line is read off, and the grains it was sampled at. */
interface VoxelFile {
  readonly glb: Uint8Array;
  readonly grains: VoxelGrains;
}

const drawnTopOrThrow = (file: VoxelFile, partId: string, column: Column = {}): number => {
  const top = drawnFaceMetres(file.glb, FILE_AXES.up, column, partId);
  if (top === undefined) {
    throw new Error(`Sight part ${partId} draws no top to aim along`);
  }
  return top;
};

/** The point a rear sight aims at: the origin of the one front-sight axis on the gun, placed. */
const frontSightTip = (resolved: Resolved): Vec3 => {
  const fronts = Object.keys(resolved.assembly.parts).flatMap((id) => {
    const def = resolved.defs.get(id);
    const transform = resolved.placed.get(id);
    const axis = def && sightRoleOf(def) === 'front' ? sightAxisOf(def) : undefined;
    return axis && transform ? [applyPoint(transform, axis.origin)] : [];
  });
  if (fronts.length !== 1) {
    throw new Error(`A rear sight needs exactly one front sight to aim at, but the gun has ${fronts.length}`);
  }
  return fronts[0]!;
};

/**
 * A front post built into another part, such as a barrel, in model metres: its authored bounds and the part that draws
 * it. A built-in rear sight has no front-sight part to aim at, so it aims at this post.
 */
const builtInFrontPost = (resolved: Resolved) =>
  [...resolved.defs].flatMap(([id, def]) => {
    const post = def.solids.find((solid) => solid.id === BUILT_IN_FRONT_POST);
    const transform = resolved.placed.get(id);
    if (!(post && transform)) {
      return [];
    }
    const corners = localSolidBounds(post).map((corner) =>
      modelPoint(applyPoint(transform, corner), resolved.domain.units.metresPerUnit),
    );
    const low = [0, 1, 2].map((axis) => Math.min(...corners.map((corner) => corner[axis]!))) as unknown as Vec3;
    const high = [0, 1, 2].map((axis) => Math.max(...corners.map((corner) => corner[axis]!))) as unknown as Vec3;
    return [{ id, low, high }];
  })[0];

/**
 * The model-metre range along the file's side axis of the sight's authored solids that reach its sight axis's height.
 * A rear sight's notch lies between them, so the top the eye lines up with is read over them, not over the notch.
 * An aperture's eye sits inside its hole, where no solid tops out, so the walls that cross its height bound it.
 */
const leafSpan = (resolved: Resolved, sight: { readonly id: string }): readonly [number, number] => {
  const def = resolved.defs.get(sight.id)!;
  const transform = resolved.placed.get(sight.id)!;
  const { metresPerUnit } = resolved.domain.units;
  const [, top] = sightAxisOf(def)!.origin;
  const bounds = def.solids.map((solid) => localSolidBounds(solid));
  const toppedOut = bounds.filter(([, high]) => Math.abs(high[1] - top) < 1e-6);
  const leaves = toppedOut.length > 0 ? toppedOut : bounds.filter(([low, high]) => low[1] < top && high[1] > top);
  const sides = leaves.flatMap(([low, high]) =>
    [low[0], high[0]].flatMap((px) =>
      [low[1], high[1]].flatMap((py) =>
        [low[2], high[2]].map((pz) => toFileAxes(applyPoint(transform, [px, py, pz]))[FILE_AXES.side] * metresPerUnit),
      ),
    ),
  );
  if (sides.length === 0) {
    throw new Error(`Sight part ${sight.id} has no solid at its sight axis's height`);
  }
  return [Math.min(...sides), Math.max(...sides)];
};

/**
 * How far apart the drawn faces are that bound a sight's line on each side, read in the voxel row centred at `row`, or 0
 * when the line runs through drawn material or has a face on one side only.
 */
const drawnWidthAtRow = (file: VoxelFile, partId: string, eye: Vec3, row: number): number => {
  const { bore, up, side } = FILE_AXES;
  let low = Number.NEGATIVE_INFINITY;
  let high = Number.POSITIVE_INFINITY;
  for (const triangle of drawnTriangles(file.glb, partId)) {
    const [a, b, c] = triangle;
    const over = (axis: Axis, at: number) =>
      Math.min(a[axis], b[axis], c[axis]) < at && Math.max(a[axis], b[axis], c[axis]) > at;
    if (!(a[side] === b[side] && b[side] === c[side] && over(bore, eye[bore]) && over(up, row))) {
      continue;
    }
    const towardsHigh = facesTowards(side, triangle);
    if (towardsHigh && a[side] <= eye[side]) {
      low = Math.max(low, a[side]);
    } else if (!towardsHigh && a[side] >= eye[side]) {
      high = Math.min(high, a[side]);
    }
  }
  return Number.isFinite(low) && Number.isFinite(high) ? high - low : 0;
};

/**
 * The vertical span of the closed hole that the sight line runs through in the drawn part: the highest ceiling face with
 * material above it and a floor face below it over the line. An open notch has no ceiling, so it gives none.
 */
const drawnApertureSpan = (file: VoxelFile, partId: string, eye: Vec3): readonly [number, number] | undefined => {
  const ceilings: number[] = [];
  const floors: number[] = [];
  const { bore, up, side } = FILE_AXES;
  for (const triangle of drawnTriangles(file.glb, partId)) {
    const [a, b, c] = triangle;
    const over = (axis: Axis, at: number) =>
      Math.min(a[axis], b[axis], c[axis]) < at && Math.max(a[axis], b[axis], c[axis]) > at;
    if (!(a[up] === b[up] && b[up] === c[up] && over(bore, eye[bore]) && over(side, eye[side]))) {
      continue;
    }
    (facesTowards(up, triangle) ? floors : ceilings).push(a[up]);
  }
  const ceiling = Math.max(...ceilings.filter((y) => floors.some((above) => above > y) && floors.some((f) => f < y)));
  if (!Number.isFinite(ceiling)) {
    return undefined;
  }
  return [Math.max(...floors.filter((y) => y < ceiling)), ceiling];
};

/**
 * A rear sight is aimed through its notch or its closed aperture, so the voxels must leave it open: at least one voxel
 * of the gun grain wide. A gap one voxel wide or narrower of its own grain can fill, and the player would line up the
 * top of a solid block. An open notch is read at the drawn top; where the top row is solid across the line, the eye
 * drops to the centre of the closed aperture on the line and the width is read across the hole. `grain` is the part's
 * own. Returns the eye.
 */
const openSightGapOrThrow = (file: VoxelFile, partId: string, grain: number, topEye: Vec3): Vec3 => {
  const notch = drawnWidthAtRow(file, partId, topEye, topEye[FILE_AXES.up] - grain / 2);
  const wide = (width: number) => width >= file.grains.voxelGrain - 1e-6;
  if (wide(notch)) {
    return topEye;
  }
  const span = drawnApertureSpan(file, partId, topEye);
  if (span !== undefined) {
    const centre = round6((span[0] + span[1]) / 2);
    const eye = withCoordinate(topEye, FILE_AXES.up, centre);
    // A quarter grain below the centre lies inside a voxel row whether the centre is mid-row or on a row boundary.
    const aperture = drawnWidthAtRow(file, partId, eye, centre - grain / 4);
    if (wide(aperture) && wide(span[1] - span[0])) {
      return eye;
    }
  }
  throw new Error(
    `Sight part ${partId} draws its notch ${round6(notch)} m wide on the sight line, under the ${file.grains.voxelGrain} m gun grain`,
  );
};

/**
 * An iron sight's line as the voxelized file draws it, in model metres, because voxels move the tops the player lines
 * up. A smooth rear sight, a separate part too small to voxelize, is drawn as authored, so its authored datum stands:
 * it aims at frontSightTip, the origin of the gun's one front-sight axis, and a bead keeps its level line. A voxelized
 * rear sight, built into a part such as a revolver's frame or a receiver's drum aperture, takes the top of its leaves,
 * which the line also runs between, then drops into the aperture where that top is closed. It keeps its direction
 * unless the gun has a builtInFrontPost, which a voxelized part draws too: then it aims at the post's drawn top, read
 * no higher than one voxel over its authored top so a hood ring above it stays out.
 */
const drawnIronSightLine = (
  file: VoxelFile,
  resolved: Resolved,
  sight: { readonly id: string; readonly eye: Vec3; readonly direction: Vec3 },
): { readonly eye: Vec3; readonly direction: Vec3 } => {
  const { metresPerUnit } = resolved.domain.units;
  const { bore, up, side } = FILE_AXES;
  const grainOf = (partId: string) => partVoxelGrain(resolved.defs.get(partId)!, file.grains, metresPerUnit);
  const sightGrain = grainOf(sight.id);
  if (sightGrain === undefined) {
    const direction =
      sightRoleOf(resolved.defs.get(sight.id)!) === 'rear'
        ? normalize(sub(modelPoint(frontSightTip(resolved), metresPerUnit), sight.eye))
        : sight.direction;
    return { eye: sight.eye, direction };
  }
  const top = drawnTopOrThrow(file, sight.id, {
    [bore]: [sight.eye[bore] - sightGrain / 2, sight.eye[bore] + sightGrain / 2],
    [side]: leafSpan(resolved, sight),
  });
  const eye = openSightGapOrThrow(file, sight.id, sightGrain, withCoordinate(sight.eye, up, top));
  const post = builtInFrontPost(resolved);
  if (post === undefined) {
    return { eye, direction: sight.direction };
  }
  const postGrain = grainOf(post.id)!;
  // Twice the post's width holds its top voxel column wherever the sampler put it.
  const centre = (post.low[side] + post.high[side]) / 2;
  const band = post.high[side] - post.low[side];
  const postTop = drawnTopOrThrow(file, post.id, {
    [bore]: [post.low[bore], post.high[bore]],
    [up]: [post.low[up], post.high[up] + postGrain],
    [side]: [centre - band, centre + band],
  });
  // The eye lines up with the tip's edge on the post's rear face, which faces back along the bore.
  const aim = fileVector({ bore: post.low[bore], up: postTop, side: centre });
  return { eye, direction: normalize(sub(aim, eye)) };
};

// Wider than any bore, so the muzzle's front ring lies over it, and narrower than the gap to the sights above it.
const MUZZLE_COLUMN_METRES = 0.012;

/**
 * The muzzle on the front face the voxelized file draws around the bore axis, because the drawn barrel ends up to a
 * voxel off the smooth tip. Only host parts count: a fitted device comes off in play, so the shot leaves the barrel.
 * Every gun file runs its barrel forward along the file's bore axis.
 */
const drawnMuzzle = (file: VoxelFile, hostParts: ReadonlySet<string>, muzzle: Vec3): Vec3 => {
  const { bore, up, side } = FILE_AXES;
  const column = {
    [up]: [muzzle[up] - MUZZLE_COLUMN_METRES, muzzle[up] + MUZZLE_COLUMN_METRES],
    [side]: [muzzle[side] - MUZZLE_COLUMN_METRES, muzzle[side] + MUZZLE_COLUMN_METRES],
  } as const;
  const front = drawnFaceMetres(file.glb, bore, column, hostParts);
  if (front === undefined) {
    throw new Error('The voxelized gun draws no muzzle face around its bore axis');
  }
  return withCoordinate(muzzle, bore, front);
};

/**
 * The support anchor on the lowest face the forend part's drawn meshes reach, because a support hand carries the gun
 * under the forend as the file draws it, and a hand-copied height would drift at the next re-export.
 */
const drawnSupport = (file: VoxelFile, partId: string, support: Vec3): Vec3 => {
  let low = Number.POSITIVE_INFINITY;
  const { up } = FILE_AXES;
  for (const [a, b, c] of drawnTriangles(file.glb, partId)) {
    low = Math.min(low, a[up], b[up], c[up]);
  }
  if (!Number.isFinite(low)) {
    throw new Error(`Support part ${partId} draws no underside`);
  }
  return withCoordinate(support, up, round6(low));
};

/**
 * The butt on the rearmost face the stock part's drawn meshes turn back over its middle, because the shoulder takes the
 * stock where the file draws it: a raked pad lies forward of its heel at mid-height, and voxels move the face.
 */
const drawnButt = (file: VoxelFile, partId: string, butt: Vec3): Vec3 => {
  const { bore, up, side } = FILE_AXES;
  // A quarter grain each way overlaps the voxel face over the middle wherever the middle falls on the lattice.
  const reach = file.grains.voxelGrain / 4;
  const column = {
    [up]: [butt[up] - reach, butt[up] + reach],
    [side]: [butt[side] - reach, butt[side] + reach],
  } as const;
  const rear = drawnFaceMetres(file.glb, bore, column, partId, -1);
  if (rear === undefined) {
    throw new Error(`Stock part ${partId} draws no rear face behind its butt`);
  }
  return withCoordinate(butt, bore, rear);
};

const voxelFileOf = (glb: Uint8Array, grains: Partial<VoxelGrains>): VoxelFile | undefined => {
  const { voxelGrain } = grains;
  return voxelGrain === undefined ? undefined : { glb, grains: { ...grains, voxelGrain } };
};

/**
 * The entry's anchors with the muzzle moved onto the drawn front, the support onto the drawn forend underside and the
 * butt onto the drawn rear face of the stock.
 */
const drawnAnchors = (
  anchors: GunDeadvoxModelEntry['anchors'],
  file: VoxelFile | undefined,
  {
    sourceParts: { support: supportPart, butt: buttPart } = {},
    hostParts,
  }: { readonly sourceParts: SelectedAnchors['sourceParts']; readonly hostParts: ReadonlySet<string> },
) =>
  file && anchors
    ? {
        anchors: {
          ...anchors,
          ...(anchors.muzzle ? { muzzle: drawnMuzzle(file, hostParts, anchors.muzzle) } : {}),
          ...(anchors.support && supportPart ? { support: drawnSupport(file, supportPart, anchors.support) } : {}),
          ...(anchors.butt && buttPart ? { butt: drawnButt(file, buttPart, anchors.butt) } : {}),
        },
      }
    : {};

/** The sight an export describes: the lowest priority, then the first id. */
export const compareSightCandidates = (
  a: { priority: number; id: string },
  b: { priority: number; id: string },
): number => a.priority - b.priority || compareCodeUnits(a.id, b.id);

const sightMetadata = (resolved: Resolved, voxel?: VoxelFile): GunModelFields['sight'] => {
  const candidates = [...resolved.defs.entries()].flatMap(([id, part]) => {
    const candidate = sightCandidate(resolved, id, part);
    return candidate ? [candidate] : [];
  });
  const [chosen] = candidates.sort(compareSightCandidates);
  if (!chosen) {
    return undefined;
  }
  const {
    id: sightId,
    kind: sightKind,
    eye,
    direction: chosenDirection,
    eyeReliefMetres,
    ocularDiameterMetres,
  } = chosen;
  const toModel = (point: Vec3): Vec3 => modelPoint(point, resolved.domain.units.metresPerUnit);
  const toModelDirection = (vector: Vec3): Vec3 => normalize(toFileAxes(vector));
  let direction = chosenDirection;
  if (sightKind === 'iron' && resolved.assembly.parts[sightId]!.family === 'ak-rear-sight') {
    const tip = frontSightTip(resolved);
    direction = normalize([tip[0] - eye[0], tip[1] - eye[1], tip[2] - eye[2]]);
  }
  // An optic's line is its optical axis, which the drawn tube does not define, so only iron sights read the file.
  const drawn =
    voxel && sightKind === 'iron'
      ? drawnIronSightLine(voxel, resolved, { id: sightId, eye: toModel(eye), direction: toModelDirection(direction) })
      : { eye: toModel(eye), direction: toModelDirection(direction) };
  const { eye: modelEye, direction: modelDirection } = drawn;
  const upAxis = toModelDirection(applyDir(resolved.placed.get(sightId)!, [0, 1, 0]));
  const upDot = upAxis[0] * modelDirection[0] + upAxis[1] * modelDirection[1] + upAxis[2] * modelDirection[2];
  const up = normalize([
    upAxis[0] - modelDirection[0] * upDot,
    upAxis[1] - modelDirection[1] * upDot,
    upAxis[2] - modelDirection[2] * upDot,
  ]);
  return {
    kind: sightKind,
    eye: modelEye,
    direction: modelDirection,
    up,
    eyeReliefMetres: round6(eyeReliefMetres),
    ...(sightKind === 'iron' ? { eyeDistanceRangeMetres: ironGunEyeRange(resolved, eye, direction) } : {}),
    ...(ocularDiameterMetres === undefined ? {} : { ocularDiameterMetres: round6(ocularDiameterMetres) }),
  };
};

export const createGunModelEntry = ({
  asset,
  parts,
  anchors,
  metresPerUnit,
  options = {},
  sight,
  drawn,
}: {
  asset: GunAssetIdentity;
  parts: ModelParts;
  anchors: SelectedAnchors;
  metresPerUnit: number;
  options?: GunModelEntryOptions;
  sight?: GunModelFields['sight'];
  /**
   * Moves a file-frame point onto the drawn model (see `inFileFrame`); the muzzle is left for `drawnMuzzle`, which
   * reads it off the file.
   */
  drawn?: DrawnGeometry;
}): GunDeadvoxModelEntry => {
  const { handling } = options;
  const calibre = options.cartridge?.id;
  if (calibre !== undefined) {
    calibreSlug(calibre);
  }
  const onModel = (point: Vec3): Vec3 =>
    drawn ? fileMetres(drawn.point(toFileAxes(point)), metresPerUnit) : modelPoint(point, metresPerUnit);
  const others = Object.entries(anchors.others)
    .filter(([name]) => name !== 'magwell')
    .map(([name, frame]): [string, Vec3] => [
      name,
      name === 'muzzle' ? modelPoint(frame.position, metresPerUnit) : onModel(frame.position),
    ]);
  return {
    id: asset.id,
    file: asset.file as DeadvoxModelFile,
    parts,
    grip: { at: onModel(anchors.hold.position), turn: gripTurn() },
    ...(others.length > 0 || handling
      ? {
          anchors: {
            ...Object.fromEntries(others),
            ...(handling ? { ejection: onModel(handling.ejection) } : {}),
          },
        }
      : {}),
    gun: {
      ...(sight ? { sight } : {}),
      ...(anchors.others.muzzle ? { muzzleDirection: normalize(toFileAxes(anchors.others.muzzle.forward)) } : {}),
      ...(calibre === undefined ? {} : { calibre }),
      ...(handling ? { action: handling.action } : {}),
      ...(options.internalCapacity === undefined ? {} : { internalMagazine: { capacity: options.internalCapacity } }),
    },
  };
};

const integralCapacity = (resolved: Resolved, cartridge: Cartridge | undefined): number | undefined => {
  if (!cartridge) {
    return undefined;
  }
  return cartridge.kind === 'shotshell'
    ? tubeMagazineCapacity(resolved, cartridge)
    : internalMagazineCapacity(resolved, cartridge);
};

const boltMetadataIssue = (assembly: Assembly, cartridge: Cartridge | undefined): string | undefined =>
  cartridge && isBoltAssembly(assembly) ? boltCalibreIssue(cartridge.id) : undefined;

/** The part ids the gun body keeps: every part but the fitted attachments and magazine, which come off in play. */
const hostPartIds = (resolved: Resolved, replaceableNodes: ReadonlySet<string>): ReadonlySet<string> =>
  new Set(
    [...resolved.defs.keys()].filter((id) => {
      const family = resolved.assembly.parts[id]?.family;
      return family !== undefined && !replaceableNodes.has(partNodeName(id, family));
    }),
  );

const bodyPhysicalData = (
  resolved: Resolved,
  replaceableNodes: ReadonlySet<string>,
  { drawn, items }: { readonly drawn: DrawnGeometry; readonly items: PartItems },
) => {
  try {
    return { ok: true as const, parts: gunModelParts(resolved, replaceableNodes, { items, drawn }) };
  } catch (error) {
    if (!(error instanceof PartMassError)) {
      throw error;
    }
    return { ok: false as const, error: { code: 'part-mass' as const, message: error.message } };
  }
};

const attachmentCertificates = (
  assembly: Assembly,
  slots: readonly AttachmentSlotMetadata[],
  excluded: readonly string[],
) => {
  const compatibility = attachmentCompatibility(assembly, slots, gunDomain, excluded);
  return { compatibility, compatibilityPairs: attachmentCompatibilityPairs(assembly, slots, compatibility) };
};

/**
 * Exports a gun assembly: core writes the GLB, then this adapter selects gun anchors and builds the Deadvox entry.
 * Structural anchors are emitted independently of optional cartridge metadata.
 */
export const exportGunGlb = (
  assembly: Assembly,
  asset: GunAssetIdentity,
  appearance: AppearanceContext,
  options: GunExportOptions = {},
): GunExportResult => {
  const {
    includeAttachmentCompatibility = false,
    excludedAttachments = [],
    items = {},
    platform,
    voxelGrain,
    voxelDetailGrain,
    voxelDetailThinParts,
    ...metadata
  } = options;
  const grains = voxelGrainsOf({ voxelGrain, voxelDetailGrain, voxelDetailThinParts });
  const message = boltMetadataIssue(assembly, metadata.cartridge);
  if (message) {
    return { ok: false, error: { code: 'structure-issues', issues: [{ rule: 'structure', message, parts: [] }] } };
  }
  const built = withAttachmentInstanceAppearances(
    resolve(withBoltCalibre(assembly, metadata.cartridge?.id), gunDomain),
  );
  const resolved = platform === undefined ? built : withPlatformPorts(built, platform);
  // Broken assemblies get the core writer's structure report before anchor selection.
  if (resolved.issues.length > 0 || resolved.placed.size < Object.keys(assembly.parts).length) {
    const probe = exportGlb({ resolved, palette: GUN_PALETTE, appearance, asset });
    if (!probe.ok) {
      return probe;
    }
  }
  const anchors = selectGunAnchors(resolved, GUN_ANCHORS, GUN_ANCHOR_POLICY);
  if ('code' in anchors) {
    return { ok: false, error: anchors };
  }
  // Datums read off placements are written as the file draws them, so they read the file-frame assembly, and the
  // file meshes the voxels they were read off.
  const fileResolved = inFileFrame(resolved);
  const drawn = drawnGeometry(fileResolved, grains);
  const result = exportGunModels({
    resolved,
    palette: GUN_PALETTE,
    appearance,
    asset,
    ...grains,
    drawnVoxels: drawn.voxels,
    ...(platform === undefined ? {} : { modelMetadata: { platform } }),
  });
  if (!result.ok) {
    return result;
  }
  const voxelFile = voxelFileOf(result.glb, grains);
  const action = resolveGunAction(resolved);
  const handling = buildActionExport(resolved, action);
  const moving = movingPartsData(resolved);
  const internalCapacity = integralCapacity(resolved, metadata.cartridge);
  const {
    units: { metresPerUnit },
  } = resolved.domain;
  const fittedAttachments = attachmentData(resolved);
  const magazine = magazineSlotData(resolved);
  const replaceableNodes = new Set([
    ...fittedAttachments.map(({ node }) => node),
    ...(magazine ? [magazine.node] : []),
  ]);
  const physical = bodyPhysicalData(fileResolved, replaceableNodes, { drawn, items });
  if (!physical.ok) {
    return physical;
  }
  const modelEntry = createGunModelEntry({
    asset,
    parts: physical.parts,
    anchors,
    metresPerUnit,
    drawn,
    options: {
      ...metadata,
      ...(handling ? { handling } : {}),
      ...(internalCapacity === undefined ? {} : { internalCapacity }),
    },
    sight: sightMetadata(resolved, voxelFile),
  });
  const attachmentSlotsData = attachmentSlots(resolved).map(({ position, direction, up, ...slot }) => ({
    ...slot,
    position: modelPoint(position, metresPerUnit),
    direction: normalize(toFileAxes(direction)),
    up: normalize(toFileAxes(up)),
  }));
  const revolver = revolverMetadata(resolved, metadata.cartridge);
  const certificates = includeAttachmentCompatibility
    ? attachmentCertificates(assembly, attachmentSlotsData, excludedAttachments)
    : {};
  return {
    ...result,
    modelEntry: {
      ...modelEntry,
      ...drawnAnchors(modelEntry.anchors, voxelFile, {
        sourceParts: anchors.sourceParts,
        hostParts: hostPartIds(resolved, replaceableNodes),
      }),
      gun: {
        ...modelEntry.gun,
        ...(revolver ? { revolver } : {}),
        ...(moving ? { moving } : {}),
        attachments: fittedAttachments,
        attachmentSlots: attachmentSlotsData,
        ...certificates,
        ...(magazine ? { slots: { magazine } } : {}),
      },
    },
  };
};
