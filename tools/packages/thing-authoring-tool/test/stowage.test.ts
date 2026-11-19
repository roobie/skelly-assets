import { MATERIALS } from '@skelly/thing-core/materials';
import { NeutralModelSchema } from '@skelly/thing-core/schema';
import type { ExportPortMetadata } from '@skelly/thing-export/exportTypes.ts';
import { STOWAGE_MOUNT } from '@skelly/thing-export/stowage.ts';
import { parse } from 'valibot';
import { expect, it } from 'vitest';
import { readRecipes } from '../../../recipes.mjs';
import { loadCatalogue } from '../src/catalogue.ts';
import { catalogue } from '../src/content.ts';
import { exportItem, loadThingRecipe, THING_KINDS } from '../src/exports.ts';

const material = Object.keys(MATERIALS)[0]!;
const VOXEL = { voxelGrain: 0.002 };
const ASSET = { id: 'fixture', file: 'assets/models/fixture.glb' } as const;
const joint = (id: string, gender: 'male' | 'female', y: number) => ({
  id,
  mount: 'fixture-joint',
  gender,
  pos: [0, y, 0],
  normal: [0, gender === 'male' ? -1 : 1, 0],
  up: [1, 0, 0],
  required: true,
});
const slot = (id: string, x: number) => ({
  id,
  mount: STOWAGE_MOUNT,
  gender: 'female',
  accepts: ['case'],
  envelope: { min: [0, -0.01, -0.01], max: [0.02, 0.01, 0.01] },
  pos: [x, 0.02, 0],
  normal: [0, 1, 0],
  up: [0, 0, 1],
  required: false,
});
const seat = {
  id: 'stow',
  mount: STOWAGE_MOUNT,
  gender: 'male',
  standard: 'case',
  pos: [0, 0.04, 0],
  normal: [0, 1, 0],
  up: [0, 0, 1],
  required: false,
};
/** A two-part item whose lower part holds two slots and whose upper part stows by a seat, or neither with `bare`. */
const fixture = (bare = false) =>
  loadCatalogue({
    units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
    facets: 12,
    defaultMaterial: material,
    items: [
      {
        id: 'fixture',
        title: 'Fixture',
        exportMass: 'parts',
        parts: [
          {
            id: 'lower',
            family: 'cylinder',
            params: { radius: '0.03', height: '0.02' },
            massKg: 0.2,
            finish: { body: material },
            ports: [joint('top', 'female', 0.02), ...(bare ? [] : [slot('left', -0.015), slot('right', 0.015)])],
          },
          {
            id: 'upper',
            family: 'cylinder',
            params: { radius: '0.02', height: '0.04' },
            massKg: 0.3,
            finish: { body: material },
            ports: [joint('bottom', 'male', 0), ...(bare ? [] : [seat])],
          },
        ],
        connections: [{ from: 'lower.top', to: 'upper.bottom' }],
      },
    ],
  });
const exported = (bare = false) => {
  const loaded = fixture(bare);
  return exportItem(loaded.items[0]!, loaded, ASSET, VOXEL);
};

interface GltfNode {
  readonly extras?: { readonly port?: ExportPortMetadata; readonly thing?: { readonly metresPerUnit: number } };
}
/** The stowage the GLB's port nodes give, read the way a consumer of the file reads it, in metres. */
const glbStowage = (glb: Uint8Array) => {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const { nodes } = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + view.getUint32(12, true)))) as {
    readonly nodes: readonly GltfNode[];
  };
  const unit = nodes[0]!.extras!.thing!.metresPerUnit;
  const metres = (v: readonly number[]) => v.map((x) => x * unit);
  const ports = nodes.flatMap(({ extras }) => (extras?.port?.mount === STOWAGE_MOUNT ? [extras.port] : []));
  const frameOf = ({ frame }: ExportPortMetadata) => ({ ...frame, position: metres(frame.position) });
  return {
    slots: ports
      .filter(({ gender }) => gender === 'female')
      .map((port) => ({
        id: port.id.split('.')[1],
        accepts: port.accepts,
        envelope: { min: metres(port.envelope!.min), max: metres(port.envelope!.max) },
        frame: frameOf(port),
      })),
    seats: ports
      .filter(({ gender }) => gender === 'male')
      .map((port) => ({ standard: port.standard, frame: frameOf(port) })),
  };
};
const expectSameStowage = (
  { glb, modelEntry }: Pick<ReturnType<typeof exported>, 'glb' | 'modelEntry'>,
  label: string,
) => {
  const fromGlb = glbStowage(glb);
  expect(fromGlb.slots.length + fromGlb.seats.length, label).toBeGreaterThan(0);
  expect(modelEntry.stowage?.slots ?? [], label).toEqual(fromGlb.slots);
  expect(modelEntry.stowage?.seats ?? [], label).toEqual(fromGlb.seats);
  expect(parse(NeutralModelSchema, modelEntry).stowage, label).toEqual(modelEntry.stowage);
};

it("carries every stowage port node of the GLB into the model entry's stowage", () => {
  const output = exported();
  expectSameStowage(output, 'fixture');
  expect(output.modelEntry.stowage?.slots?.map(({ id }) => id)).toEqual(['left', 'right']);
});

it('writes no stowage for a model without stowage ports', () => {
  expect(Object.hasOwn(exported(true).modelEntry, 'stowage')).toBe(false);
});

it("leaves the model entry's other fields as they are without stowage", () => {
  const { stowage, ...others } = exported().modelEntry;
  expect(stowage).toBeDefined();
  expect(others).toEqual(exported(true).modelEntry);
});

// A shipped slot part and a shipped stowable item, so the shapes content authors hold to their sidecars too.
it.each([
  ['a slot part', 'female'],
  ['a stowable item', 'male'],
] as const)("carries the stowage of %s's GLB into its shipped model entry", (_case, gender) => {
  const stows = (item: (typeof catalogue.items)[number]) =>
    item.parts.some(({ ports }) => ports.some((port) => port.mount === STOWAGE_MOUNT && port.gender === gender));
  const sources = new Set(catalogue.items.filter(stows).map(({ id }) => id));
  const row = readRecipes()
    .flatMap(({ value }) =>
      loadThingRecipe(
        (value as { kind: string }[]).filter(({ kind }) => THING_KINDS.includes(kind)),
        catalogue,
      ),
    )
    .find(({ source }) => sources.has(source));
  expect(row, gender).toBeDefined();
  expectSameStowage(row!.generate(), row!.id);
});
