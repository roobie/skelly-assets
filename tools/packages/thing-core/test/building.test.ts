import { parse } from 'valibot';
import { describe, expect, it } from 'vitest';
import {
  BuildingKitSchema,
  BuildingSchema,
  readBuilding,
  readBuildingKit,
  validateBuildingKit,
} from '../src/building.ts';
import { NeutralModelSchema } from '../src/schema.ts';

const kit = {
  version: 1,
  id: 'timber',
  revision: 1,
  grid: { bay: 2, storey: 3, floorTop: 0, slabBottom: -0.2 },
  joins: { wall_node: { kind: 'square-node-infill', nodeWidth: 0.2, depth: 0.2, height: 3 } },
};
const wall = {
  version: 1,
  kit: { id: 'timber', revision: 1 },
  layout: {
    kind: 'wall-infill',
    join: 'wall_node',
    nodes: [
      [-1, 0, 0],
      [1, 0, 0],
    ],
  },
};

describe('building contract', () => {
  it('is optional on legacy models and preserves authored coordinates when present', () => {
    const legacy = { id: 'wall', file: 'assets/models/wall.glb' };
    expect(parse(NeutralModelSchema, legacy)).toEqual(legacy);
    expect(parse(NeutralModelSchema, { ...legacy, building: wall }).building).toEqual(wall);
    validateBuildingKit(parse(BuildingSchema, wall), parse(BuildingKitSchema, kit));
  });

  it('strict producers reject unknown fields, versions, missing datums and bad dimensions', () => {
    for (const value of [
      { ...wall, typo: 1 },
      { ...wall, version: 2 },
      { ...wall, kit: { id: 'timber', revision: 0 } },
      { ...wall, layout: { kind: 'wall-infill', join: 'wall_node' } },
      { ...wall, layout: { ...wall.layout, typo: 1 } },
      {
        ...wall,
        layout: {
          ...wall.layout,
          nodes: [
            [-1, 0, 0],
            [Number.NaN, 0, 0],
          ],
        },
      },
      { ...wall, layout: { kind: 'surface', footprint: { x: [-1, 1], z: [-1, 1] }, bottom: 0, top: 0 } },
      { ...wall, layout: { kind: 'surface', footprint: { x: [1, -1], z: [-1, 1] }, bottom: -0.2, top: 0 } },
    ])
      expect(() => parse(BuildingSchema, value)).toThrow();
    expect(() => parse(BuildingKitSchema, { ...kit, grid: { ...kit.grid, bay: -2 } })).toThrow();
    expect(() => parse(BuildingKitSchema, { ...kit, grid: { ...kit.grid, slabBottom: 0 } })).toThrow();
  });

  it('readers ignore unfamiliar optional fields at nested object boundaries', () => {
    expect(
      readBuilding({
        ...wall,
        future: 42,
        kit: { ...wall.kit, future: 42 },
        layout: { ...wall.layout, future: 42 },
      }),
    ).toEqual(wall);
    expect(
      readBuildingKit({
        ...kit,
        future: 42,
        grid: { ...kit.grid, future: 42 },
        joins: { wall_node: { ...kit.joins.wall_node, future: 42 } },
      }),
    ).toEqual(kit);
  });

  it('unsupported semantics have no assembly interpretation, without preventing plain rendering', () => {
    for (const value of [undefined, null, {}, { ...wall, version: 2 }, { ...wall, layout: { kind: 'future' } }]) {
      expect(readBuilding(value)).toBeUndefined();
    }
    expect(readBuildingKit({ ...kit, version: 2 })).toBeUndefined();
  });

  it('qualifies node joins by kit revision and refuses invalid node separation', () => {
    const module = parse(BuildingSchema, wall);
    const definition = parse(BuildingKitSchema, kit);
    expect(() => validateBuildingKit(module, { ...definition, id: 'stone' })).toThrow(/does not match/);
    expect(() => validateBuildingKit(module, { ...definition, revision: 2 })).toThrow(/does not match/);
    expect(() => validateBuildingKit(module, { ...definition, joins: {} })).toThrow(/unknown join/);
    expect(() =>
      validateBuildingKit(
        {
          ...module,
          layout: {
            kind: 'wall-infill',
            join: 'wall_node',
            nodes: [
              [-1, 0, 0],
              [2, 0, 0],
            ],
          },
        },
        definition,
      ),
    ).toThrow(/span one bay/);
  });
});
