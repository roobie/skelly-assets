import {
  array,
  check,
  fallback,
  finite,
  type InferOutput,
  integer,
  literal,
  minValue,
  nonEmpty,
  number,
  type ObjectEntries,
  object,
  optional,
  pipe,
  record,
  regex,
  safeParse,
  strictObject,
  string,
  tuple,
  variant,
} from 'valibot';

const id = pipe(string(), regex(/^[a-z0-9_]+$/));
const scalar = pipe(number(), finite());
const positive = pipe(
  scalar,
  check((value) => value > 0, 'must be positive'),
);
const revision = pipe(positive, integer());
const point = tuple([scalar, scalar, scalar]);
const interval = pipe(
  tuple([scalar, scalar]),
  check(([lo, hi]) => lo < hi, 'interval must increase'),
);

/** Strict producers catch typos; readers discard unfamiliar optional fields at every object boundary. */
const schemas = (strict: boolean) => {
  const shape = <const Entries extends ObjectEntries>(entries: Entries) =>
    strict ? strictObject(entries) : object(entries);
  const kitRef = shape({ id, revision });
  const unit = pipe(
    point,
    check((v) => Math.abs(Math.hypot(...v) - 1) <= 1e-6, 'must be a unit vector'),
  );
  const frame = pipe(
    shape({ at: point, normal: unit, up: unit }),
    check(
      ({ normal, up }) => Math.abs(normal.reduce((sum, v, axis) => sum + v * up[axis]!, 0)) <= 1e-6,
      'frame normal and up must be perpendicular',
    ),
  );
  const apertureProfile = pipe(
    variant('kind', [
      shape({ kind: literal('rectangle'), x: interval, y: interval }),
      shape({ kind: literal('semicircular-head'), bottom: scalar, spring: scalar, radius: positive }),
    ]),
    check(
      (profile) => profile.kind !== 'semicircular-head' || profile.bottom <= profile.spring,
      'opening bottom must not exceed its spring',
    ),
  );
  const aperture = shape({ id, basis: literal('nominal'), frame, profile: apertureProfile, through: interval });
  const section = pipe(
    variant('kind', [
      shape({ kind: literal('triangular-panel'), basis: literal('nominal'), halfSpan: positive, rise: positive }),
      shape({
        kind: literal('pitched-shell'),
        basis: literal('nominal'),
        halfSpan: positive,
        rise: positive,
        overhang: pipe(scalar, minValue(0)),
        verticalThickness: positive,
      }),
      shape({
        kind: literal('semicircular-shell'),
        basis: literal('nominal'),
        innerRadius: positive,
        outerRadius: positive,
      }),
      shape({ kind: literal('semicircular-panel'), basis: literal('nominal'), radius: positive }),
    ]),
    check(
      (profile) => profile.kind !== 'semicircular-shell' || profile.innerRadius < profile.outerRadius,
      'shell inner radius must be below outer radius',
    ),
  );
  const join = shape({ kind: literal('square-node-infill'), nodeWidth: positive, depth: positive, height: positive });
  const kit = pipe(
    shape({
      version: literal(1),
      id,
      revision,
      grid: pipe(
        shape({ bay: positive, storey: positive, floorTop: scalar, slabBottom: scalar }),
        check(({ floorTop, slabBottom }) => slabBottom < floorTop, 'slab bottom must be below finished floor'),
      ),
      joins: optional(record(id, join)),
    }),
    check(
      ({ joins, grid }) => Object.values(joins ?? {}).every(({ nodeWidth }) => nodeWidth < grid.bay),
      'shared node must be narrower than its bay',
    ),
  );
  const layout = pipe(
    variant('kind', [
      shape({ kind: literal('wall-infill'), join: id, nodes: tuple([point, point]) }),
      shape({ kind: literal('shared-node'), join: id, at: point }),
      shape({
        kind: literal('surface'),
        footprint: shape({ x: interval, z: interval }),
        bottom: scalar,
        top: scalar,
      }),
      shape({
        kind: literal('span'),
        supportX: interval,
        bearingX: optional(tuple([interval, interval])),
        extentZ: interval,
        repeat: optional(point),
      }),
      shape({
        kind: literal('stair-flight'),
        width: positive,
        run: positive,
        rise: positive,
        treadDepth: positive,
        risers: pipe(array(positive), nonEmpty()),
      }),
      shape({
        kind: literal('edge-run'),
        extentX: interval,
        depth: positive,
        baseHeight: positive,
        height: positive,
        repeat: point,
      }),
      shape({ kind: literal('face-attachment'), frame }),
      shape({ kind: literal('static-insert'), frame, opening: shape({ model: id, aperture: id }) }),
    ]),
    check((layout) => {
      switch (layout.kind) {
        case 'surface':
          return layout.bottom < layout.top;
        case 'span': {
          const { repeat, extentZ, bearingX, supportX } = layout;
          return (
            (!repeat || (repeat[0] === 0 && repeat[1] === 0 && Math.abs(repeat[2] - extentZ[1] + extentZ[0]) < 1e-6)) &&
            (!bearingX ||
              (bearingX[0][0] >= supportX[0] && bearingX[1][1] <= supportX[1] && bearingX[0][1] <= bearingX[1][0]))
          );
        }
        case 'stair-flight':
          return (
            Math.abs(layout.run - layout.treadDepth * layout.risers.length) < 1e-6 &&
            Math.abs(layout.rise - layout.risers.reduce((sum, rise) => sum + rise, 0)) < 1e-6
          );
        case 'edge-run':
          return (
            layout.baseHeight <= layout.height &&
            layout.repeat[1] === 0 &&
            layout.repeat[2] === 0 &&
            Math.abs(layout.repeat[0] - layout.extentX[1] + layout.extentX[0]) < 1e-6
          );
        default:
          return true;
      }
    }, 'layout dimensions, bearing strips or repeat pitch are inconsistent'),
  );
  return {
    kit,
    module: shape({
      version: literal(1),
      kit: kitRef,
      layout,
      datums: optional(record(id, frame)),
      apertures: optional(
        pipe(
          array(aperture),
          nonEmpty(),
          check((list) => new Set(list.map(({ id }) => id)).size === list.length, 'aperture ids must be distinct'),
        ),
      ),
      section: optional(section),
    }),
  };
};

const strict = schemas(true);
const readable = schemas(false);
/** Producer contract. All coordinates are authored metres in the shipped model frame, never drawn bounds. */
export const BuildingSchema = strict.module;
/** Generic model readers must not reject an otherwise renderable asset for unsupported building semantics. */
export const BuildingReaderSchema = fallback(optional(readable.module), undefined);
export const BuildingKitSchema = strict.kit;
export type Building = InferOutput<typeof BuildingSchema>;
export type BuildingKit = InferOutput<typeof BuildingKitSchema>;

/** Undefined means unsupported/invalid semantics, not an instruction to stop rendering the model. */
export const readBuilding = (value: unknown): Building | undefined => {
  const result = safeParse(readable.module, value);
  return result.success ? result.output : undefined;
};
export const readBuildingKit = (value: unknown): BuildingKit | undefined => {
  const result = safeParse(readable.kit, value);
  return result.success ? result.output : undefined;
};

/** Checks qualified joins against the referenced kit; equal grids never establish compatibility. */
export const validateBuildingKit = (building: Building, kit: BuildingKit): void => {
  if (building.kit.id !== kit.id || building.kit.revision !== kit.revision) {
    throw new Error(
      `building kit ${building.kit.id}@${building.kit.revision} does not match ${kit.id}@${kit.revision}`,
    );
  }
  const { layout } = building;
  if (layout.kind === 'wall-infill' || layout.kind === 'shared-node') {
    const join = kit.joins?.[layout.join];
    if (!join) throw new Error(`${kit.id}: unknown join ${layout.join}`);
    if (layout.kind === 'wall-infill') {
      const [a, b] = layout.nodes;
      if (Math.abs(b[0] - a[0] - kit.grid.bay) > 1e-6 || a[1] !== b[1] || a[2] !== b[2]) {
        throw new Error(`${kit.id}: infill nodes must span one bay along local +x`);
      }
    }
  }
};
