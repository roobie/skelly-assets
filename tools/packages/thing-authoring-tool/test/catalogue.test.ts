import { fromEulerXyzDegrees, mulMV, normalize, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { MATERIALS } from '@skelly/thing-core/materials';
import { expect, it } from 'vitest';
import { readRecipes } from '../../../recipes.mjs';
import { buildItem, loadCatalogue } from '../src/catalogue.ts';
import { catalogue } from '../src/content.ts';
import { exportItem, loadThingRecipe, THING_KINDS } from '../src/exports.ts';
import lyingOnBack from './fixtures/lying-on-back.json' with { type: 'json' };

const material = Object.keys(MATERIALS)[0]!;
// Fine enough that a voxelized box stays within `toBeCloseTo` of the smooth datum it follows.
const VOXEL = { voxelGrain: 0.002 };
const ROW_VOXEL = { grain: 0.01 };
const port = (id: string, gender: 'male' | 'female', y: number) => ({
  id,
  mount: 'fixture-joint',
  gender,
  pos: [0, y, 0],
  normal: [0, gender === 'male' ? -1 : 1, 0],
  up: [1, 0, 0],
  required: true,
});
const fixture = () => ({
  units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
  facets: 12,
  defaultMaterial: material,
  items: [
    {
      id: 'fixture',
      exportMass: 'parts',
      parts: [
        {
          id: 'lower',
          family: 'cylinder',
          params: { radius: '0.03', height: '0.02' },
          massKg: 0.2,
          finish: { body: material },
          ports: [port('top', 'female', 0.02)],
        },
        {
          id: 'upper',
          family: 'cylinder',
          params: { radius: '0.02', height: '0.04' },
          massKg: 0.3,
          finish: { body: material },
          ports: [port('bottom', 'male', 0)],
        },
      ],
      connections: [{ from: 'lower.top', to: 'upper.bottom' }],
    },
  ],
});

it('keeps per-part ports when two parts use the same family builder', () => {
  const loaded = loadCatalogue(fixture());
  const item = loaded.items[0]!;
  const built = buildItem(item, loaded);
  expect(built.report.issues).toEqual([]);
  for (const part of item.parts) {
    expect(built.report.resolved.defs.get(part.id)?.ports).toEqual(part.ports);
  }
});
const TURNED_SIDES = 12;
it('applies the catalogue turned count to non-compound families', () => {
  const loaded = loadCatalogue({ ...fixture(), turnedSides: TURNED_SIDES });
  const item = loaded.items[0]!;
  const built = buildItem(item, loaded);
  for (const part of item.parts) {
    for (const solid of built.report.resolved.defs.get(part.id)!.solids) {
      if (solid.kind === 'revolved') expect(solid.sides).toBe(TURNED_SIDES);
    }
  }
});

it('keeps compound round opt-outs through catalogue assembly building', () => {
  const input = fixture();
  const piece = { id: 'fixture', slot: 'body', kind: 'turned', axis: 'y', profile: [[0, 0], [0, 0.03], [0.02, 0.03], [0.02, 0]] };
  const part = { ...input.items[0]!.parts[0]!, family: 'compound', ports: [], params: {
    pieces: JSON.stringify([piece, { ...piece, id: 'round', sides: null }]),
  } };
  const loaded = loadCatalogue({ ...input, turnedSides: TURNED_SIDES, items: [{ ...input.items[0], parts: [part], connections: [] }] });
  const solids = buildItem(loaded.items[0]!, loaded).report.resolved.defs.get(part.id)!.solids;
  expect(solids.find(({ id }) => id === piece.id)).toMatchObject({ sides: TURNED_SIDES });
  expect(solids.find(({ id }) => id === 'round')).not.toHaveProperty('sides');
});

it('exports a label on its face, its text defaulting to the display name', () => {
  const input = fixture();
  const carton = { id: 'carton', slot: 'body', kind: 'box', min: [-0.05, 0, -0.02], max: [0.05, 0.2, 0.02] };
  const part = { ...input.items[0]!.parts[0]!, family: 'compound', ports: [], params: { pieces: JSON.stringify([carton]) } };
  const item = { ...input.items[0], parts: [part], connections: [], label: { solid: 'carton', face: '+z' } };
  const loaded = loadCatalogue({ ...input, items: [item] });
  const { label } = exportItem(
    loaded.items[0]!,
    loaded,
    { id: 'oat_flakes', file: 'assets/models/oat_flakes.glb' },
    VOXEL,
  ).modelEntry;
  expect(label?.text).toBe('Oat flakes');
  expect(label?.normal).toEqual([0, 0, 1]);
  expect(label?.up).toEqual([0, 1, 0]);
  expect(label?.at[2]).toBeCloseTo(0.02);
  expect(label?.size[0]).toBeCloseTo(0.1);
  expect(label?.size[1]).toBeCloseTo(0.2);
});

it('exports a grip following the held solid through resizing and assembly placement', () => {
  const input = fixture();
  const datum = {
    part: 'upper',
    solid: 'body',
    fraction: [0.5, 0.25, 0.5],
    turn: [0, 0, -90],
    hold: 'upright',
    roll: 90,
  };
  const exportFixture = () => {
    const loaded = loadCatalogue({ ...input, items: [{ ...input.items[0], handling: datum }] });
    return exportItem(
      loaded.items[0]!,
      loaded,
      { id: 'fixture', file: 'assets/models/fixture.glb' },
      VOXEL,
    ).modelEntry;
  };
  const before = exportFixture();
  expect(before.grip?.at[1]).toBeCloseTo(0.03);
  expect(before.grip?.turn).toEqual(datum.turn);
  expect(before.hold).toBe(datum.hold);
  expect(before.roll).toBe(datum.roll);
  input.items[0]!.parts[1]!.params.height = '0.08';
  input.items[0]!.parts[0]!.params.height = '0.06';
  input.items[0]!.parts[0]!.ports[0]!.pos[1] = 0.06;
  const after = exportFixture();
  expect(after.grip?.at[1]).toBeCloseTo(0.08);
  datum.solid = 'missing';
  expect(exportFixture).toThrow('missing datum geometry');
});
it('turns a tool laid out along its named axis so its working end faces +z, and its grip turn onto the held axes', () => {
  const input = fixture();
  // A shaft with a head at its working end, laid out along `along` with that end on the positive side and gripped with
  // a quarter twist about it, which the held axes keep about their working end.
  const tool = (along: 0 | 2, twist: number[], forward?: '+x') => {
    const span = (from: number, to: number, half: number) => ({
      min: [-half, -half, -half].map((value, axis) => (axis === along ? from : value)),
      max: [half, half, half].map((value, axis) => (axis === along ? to : value)),
    });
    const pieces = [
      { id: 'shaft', slot: 'body', kind: 'box', ...span(0, 0.25, 0.01) },
      { id: 'head', slot: 'body', kind: 'box', ...span(0.25, 0.3, 0.03) },
    ];
    const part = { ...input.items[0]!.parts[0]!, family: 'compound', ports: [], params: { pieces: JSON.stringify(pieces) } };
    const item = {
      ...input.items[0],
      ...(forward ? { forward } : {}),
      parts: [part],
      connections: [],
      handling: { part: part.id, solid: 'shaft', fraction: [0.5, 0.5, 0.5], turn: twist, hold: 'upright', roll: 0 },
      anchors: { tip: { part: part.id, solid: 'head', fraction: [1, 0.5, 0.5].map((_, axis) => (axis === along ? 1 : 0.5)) } },
    };
    const loaded = loadCatalogue({ ...input, items: [item] });
    return buildItem(loaded.items[0]!, loaded).handling;
  };
  const held = (handling: ReturnType<typeof tool>, v: Vec3) => mulMV(fromEulerXyzDegrees(handling.grip!.turn!), v);
  const towardTip = (handling: ReturnType<typeof tool>) => normalize(sub(handling.anchors!.tip!, handling.grip!.at));
  const alongX = tool(0, [90, 0, 0], '+x');
  const alongZ = tool(2, [0, 0, 90]);
  for (const handling of [alongX, alongZ]) {
    // The working end faces +z in the file and on the held axes, and the twist turns the tool's top the same way.
    expect(towardTip(handling).map(Math.round)).toEqual([0, 0, 1]);
    expect(held(handling, towardTip(handling)).map(Math.round)).toEqual([0, 0, 1]);
    expect(held(handling, [0, 1, 0]).map(Math.round)).toEqual([-1, 0, 0]);
  }
  // A tool laid out along +z already keeps its authored turn.
  expect(alongZ.grip?.turn).toEqual([0, 0, 90]);
});
it('turns the head end of a thing lying on its back to -z, its length along z', () => {
  const loaded = loadCatalogue(lyingOnBack);
  for (const item of loaded.items) {
    const { head, foot } = buildItem(item, loaded).handling.anchors!;
    const fromFoot = sub(head!, foot!);
    expect(fromFoot[2], item.id).toBeLessThan(0);
    expect(Math.abs(fromFoot[2]), item.id).toBeGreaterThan(Math.abs(fromFoot[0]));
  }
});
it('exports datums and baked collision that follow the resized solid', () => {
  const input = fixture();
  const exportFixture = () => {
    const loaded = loadCatalogue({
      ...input,
      items: [{ ...input.items[0], anchors: { top: { part: 'upper', solid: 'body', fraction: [0.5, 1, 0.5] } } }],
    });
    return exportItem(
      loaded.items[0]!,
      loaded,
      { id: 'fixture', file: 'assets/models/fixture.glb' },
      VOXEL,
      { collision: true },
    ).modelEntry;
  };
  const topOf = (entry: ReturnType<typeof exportFixture>) => ({
    datum: entry.anchors?.top?.[1],
    box: entry.parts?.upper?.collision?.[0]?.max[1],
  });
  const before = topOf(exportFixture());
  expect(before.box).toBeCloseTo(before.datum!);
  input.items[0]!.parts[1]!.params.height = '0.08';
  const after = topOf(exportFixture());
  expect(after.datum).toBeGreaterThan(before.datum!);
  expect(after.box).toBeCloseTo(after.datum!);
});
it('refuses baked collision on an inventory atom, whose export carries no parts', () => {
  const input = fixture();
  input.items[0]!.exportMass = 'inventory-atom';
  const loaded = loadCatalogue(input);
  expect(() =>
    exportItem(loaded.items[0]!, loaded, { id: 'fixture', file: 'assets/models/fixture.glb' }, VOXEL, { collision: true }),
  ).toThrow('baked collision travels with exported parts');
});
it('omits runtime part masses only when inventory-atom export is authored', () => {
  const input = fixture();
  const asset = { id: 'fixture', file: 'assets/models/fixture.glb' } as const;
  const exportFixture = () => {
    const loaded = loadCatalogue(input);
    return exportItem(loaded.items[0]!, loaded, asset, VOXEL);
  };
  const assembly = exportFixture();
  input.items[0]!.exportMass = 'inventory-atom';
  const atom = exportFixture();
  expect(assembly.modelEntry.parts).toBeDefined();
  expect(atom.modelEntry).not.toHaveProperty('parts');
  expect(atom.glb).toEqual(assembly.glb);
  expect(atom.physical).toEqual(assembly.physical);
});
it('refuses recipe mass ownership that differs from the authored item', () => {
  const item = catalogue.items[0]!;
  expect(() =>
    loadThingRecipe([
      {
        id: 'fixture',
        kind: 'item',
        source: item.id,
        voxel: ROW_VOXEL,
        options: { mass: item.exportMass === 'parts' ? 'inventory-atom' : 'parts' },
      },
    ], catalogue),
  ).toThrow('Recipe mass ownership differs');
});
it('refuses a recipe row without a voxel class, so no model exports smooth', () => {
  const item = catalogue.items[0]!;
  expect(() =>
    loadThingRecipe([{ id: 'fixture', kind: 'item', source: item.id, options: { mass: item.exportMass } }], catalogue),
  ).toThrow('Expected "voxel"');
});
it.each([0, -1])('refuses a voxel class grain of %s', (grain) => {
  const item = catalogue.items[0]!;
  expect(() =>
    loadThingRecipe([
      { id: 'fixture', kind: 'item', source: item.id, voxel: { grain }, options: { mass: item.exportMass } },
    ], catalogue),
  ).toThrow('Invalid');
});
it('refuses unknown geometry families during catalogue loading', () => {
  const input = fixture();
  input.items[0]!.parts[0]!.family = 'fixture-unknown';
  expect(() => loadCatalogue(input)).toThrow('Unknown thing family');
});
it('refuses recipe references outside the authored item set', () => {
  expect(() =>
    loadThingRecipe([
      { id: 'fixture', kind: 'item', source: 'fixture-unknown', voxel: ROW_VOXEL, options: { mass: 'parts' } },
    ], catalogue),
  ).toThrow('Unknown tool item');
});
// The material names a GLB's JSON chunk declares, read independently of the writer.
const glbMaterialNames = (glb: Uint8Array): string[] => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + view.getUint32(12, true))));
  return (json.materials ?? []).map(({ name }: { name?: string }) => name);
};
const thingRows = () =>
  readRecipes().flatMap(({ value }) =>
    loadThingRecipe((value as { kind: string }[]).filter(({ kind }) => THING_KINDS.includes(kind)), catalogue),
  );
it('exports every authored glow as an emissive material its own GLB names exactly once', () => {
  const glowing = new Set(catalogue.items.filter(({ glow }) => glow !== undefined).map(({ id }) => id));
  expect(glowing.size).toBeGreaterThan(0);
  const rows = thingRows().filter(({ source }) => glowing.has(source));
  expect(new Set(rows.map(({ source }) => source))).toEqual(glowing);
  for (const row of rows) {
    const { glb, modelEntry } = row.generate();
    expect(modelEntry.emissiveMaterial, row.id).toBeDefined();
    expect(glbMaterialNames(glb).filter((name) => name === modelEntry.emissiveMaterial), row.id).toHaveLength(1);
  }
});
it('refuses a glow whose material the built GLB does not draw', () => {
  const input = fixture();
  const lit = Object.keys(MATERIALS).find((id) => id !== material)!;
  const body = { id: 'body', slot: 'body', kind: 'box', min: [0, 0, 0], max: [0.02, 0.02, 0.02] };
  const part = { ...input.items[0]!.parts[0]!, family: 'compound', ports: [], finish: { body: material, lit }, params: {
    pieces: JSON.stringify([body]),
  } };
  const loaded = loadCatalogue({ ...input, items: [{ ...input.items[0], parts: [part], connections: [], glow: 'lit' }] });
  expect(() => exportItem(loaded.items[0]!, loaded, { id: 'fixture', file: 'assets/models/fixture.glb' }, VOXEL)).toThrow(
    'fixture: emissive material',
  );
});
type GltfMaterial = { extras: { paintable?: true } };
type GltfJson = { meshes: { primitives: { material: number; extras: { slot?: string } }[] }[]; materials: GltfMaterial[] };
const glbJson = (glb: Uint8Array): GltfJson => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  return JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + view.getUint32(12, true))));
};
const paintFixture = () => {
  const input = fixture();
  const box = (slot: string, x: number) => ({ id: slot, slot, kind: 'box', min: [x, 0, 0], max: [x + 0.02, 0.02, 0.02] });
  const part = { ...input.items[0]!.parts[0]!, family: 'compound', ports: [], params: {
    pieces: JSON.stringify([box('paint', 0), box('trim', 0.02)]),
  }, finish: { paint: material, trim: material }, paintable: ['paint'] };
  return { ...input, items: [{ ...input.items[0], parts: [part], connections: [] }] };
};
it('marks only the paintable slot\'s material, even when an unmarked slot shares its look', () => {
  const loaded = loadCatalogue(paintFixture());
  const { glb, modelEntry } = exportItem(loaded.items[0]!, loaded, { id: 'fixture', file: 'assets/models/fixture.glb' }, VOXEL);
  const json = glbJson(glb);
  const slotMaterials = (slot: string) =>
    new Set(json.meshes.flatMap(({ primitives }) =>
      primitives.filter(({ extras }) => extras.slot === slot).map((primitive) => json.materials[primitive.material]!)));
  const paint = [...slotMaterials('paint')];
  const trim = [...slotMaterials('trim')];
  expect(paint.length).toBeGreaterThan(0);
  expect(trim.length).toBeGreaterThan(0);
  expect(paint.every(({ extras }) => extras.paintable === true)).toBe(true);
  expect(trim.some(({ extras }) => extras.paintable)).toBe(false);
  expect(modelEntry.paintable).toEqual(['paint']);
});
it('refuses a paintable slot that colours no solid', () => {
  const input = paintFixture();
  const part = { ...input.items[0]!.parts[0]!, paintable: ['glass'], finish: { paint: material, trim: material, glass: material } };
  expect(() => loadCatalogue({ ...input, items: [{ ...input.items[0], parts: [part] }] })).toThrow('paintable slot glass');
});
it('exports the player bust with joint anchors that seat the limbs symmetrically about the centre line', () => {
  const row = thingRows().find((candidate) => candidate.id === 'player_bust')!;
  const anchors = row.generate().modelEntry.anchors!;
  for (const joint of ['neck', 'head', 'shoulder_left', 'shoulder_right', 'hip_left', 'hip_right']) {
    expect(anchors[joint], joint).toBeDefined();
  }
  expect(anchors.shoulder_left![1]).toBeCloseTo(anchors.shoulder_right![1]);
  expect(anchors.shoulder_left![0]).toBeCloseTo(-anchors.shoulder_right![0]);
  expect(anchors.hip_left![0]).toBeCloseTo(-anchors.hip_right![0]);
});
