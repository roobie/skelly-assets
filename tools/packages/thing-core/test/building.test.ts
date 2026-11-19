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
      const model = parse(NeutralModelSchema, { id: 'wall', file: 'assets/models/wall.glb', building: value });
      expect(model.file).toBe('assets/models/wall.glb');
      expect(model.building).toBeUndefined();
    }
    expect(readBuildingKit({ ...kit, version: 2 })).toBeUndefined();
  });

  it('validates demonstrated span, stair, attachment and nominal-opening cases', () => {
    const frame = { at: [0, 0, 0], normal: [0, 0, 1], up: [0, 1, 0] };
    const valid = {
      ...wall,
      layout: { kind: 'span', supportX: [-2, 2], extentZ: [-1, 1], repeat: [0, 0, 2] },
      datums: { front: frame },
      apertures: [
        {
          id: 'portal',
          basis: 'nominal',
          frame,
          through: [-0.2, 0.2],
          profile: { kind: 'semicircular-head', bottom: 0, spring: 1.6, radius: 0.6 },
        },
      ],
      section: { kind: 'semicircular-shell', basis: 'nominal', innerRadius: 1.8, outerRadius: 2 },
    };
    expect(parse(BuildingSchema, valid)).toEqual(valid);
    expect(
      readBuilding({
        ...valid,
        datums: { front: { ...frame, future: true } },
        section: { ...valid.section, future: true },
        apertures: valid.apertures.map((aperture) => ({
          ...aperture,
          future: true,
          frame: { ...frame, future: true },
          profile: { ...aperture.profile, future: true },
        })),
      }),
    ).toEqual(valid);
    for (const value of [
      { ...valid, layout: { ...valid.layout, repeat: [0, 0, 1.9] } },
      {
        ...valid,
        layout: {
          ...valid.layout,
          bearingX: [
            [-3, -1.8],
            [1.8, 2],
          ],
        },
      },
      { ...valid, datums: { front: { ...frame, normal: [0, 0, 2] } } },
      { ...valid, datums: { front: { ...frame, up: [0, 0, 1] } } },
      { ...valid, apertures: [valid.apertures[0], valid.apertures[0]] },
      { ...valid, apertures: [{ ...valid.apertures[0], basis: 'guaranteed-clearance' }] },
      {
        ...valid,
        apertures: [
          { ...valid.apertures[0], profile: { kind: 'semicircular-head', bottom: 2, spring: 1.6, radius: 0.6 } },
        ],
      },
      { ...valid, section: { ...valid.section, innerRadius: 2.1 } },
    ])
      expect(() => parse(BuildingSchema, value)).toThrow();
    const stair = {
      ...wall,
      layout: {
        kind: 'stair-flight',
        width: 1.6,
        run: 2,
        rise: 1.5,
        treadDepth: 0.2,
        risers: Array.from({ length: 5 }, () => [0.14, 0.16]).flat(),
      },
    };
    expect(parse(BuildingSchema, stair)).toEqual(stair);
    expect(() => parse(BuildingSchema, { ...stair, layout: { ...stair.layout, run: 2.1 } })).toThrow();
    expect(() => parse(BuildingSchema, { ...stair, layout: { ...stair.layout, rise: 1.6 } })).toThrow();
    expect(() => parse(BuildingSchema, { ...stair, layout: { ...stair.layout, risers: [] } })).toThrow();
    const edge = {
      ...wall,
      layout: { kind: 'edge-run', extentX: [-1, 1], depth: 0.4, baseHeight: 0.4, height: 1.2, repeat: [2, 0, 0] },
    };
    expect(parse(BuildingSchema, edge)).toEqual(edge);
    expect(() => parse(BuildingSchema, { ...edge, layout: { ...edge.layout, repeat: [2, 1, 0] } })).toThrow();
    expect(() => parse(BuildingSchema, { ...edge, layout: { ...edge.layout, baseHeight: 2 } })).toThrow();
    expect(() =>
      parse(BuildingKitSchema, { ...kit, joins: { wall_node: { ...kit.joins.wall_node, nodeWidth: 2 } } }),
    ).toThrow();
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
