import {
  check,
  finite,
  type InferOutput,
  integer,
  literal,
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
  const join = shape({ kind: literal('square-node-infill'), nodeWidth: positive, depth: positive, height: positive });
  const kit = shape({
    version: literal(1),
    id,
    revision,
    grid: pipe(
      shape({ bay: positive, storey: positive, floorTop: scalar, slabBottom: scalar }),
      check(({ floorTop, slabBottom }) => slabBottom < floorTop, 'slab bottom must be below finished floor'),
    ),
    joins: optional(record(id, join)),
  });
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
    ]),
    check((layout) => layout.kind !== 'surface' || layout.bottom < layout.top, 'surface bottom must be below top'),
  );
  return {
    kit,
    module: shape({ version: literal(1), kit: kitRef, layout }),
  };
};

const strict = schemas(true);
const readable = schemas(false);
/** Producer contract. All coordinates are authored metres in the shipped model frame, never drawn bounds. */
export const BuildingSchema = strict.module;
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
