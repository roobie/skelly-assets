import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileJsonnetFile, REPOSITORY_ROOT } from '../../../jsonnet/index.mjs';
import {
  addFitting,
  blueprintIssues,
  checkedExport,
  createMirroredPair,
  loadSavedBlueprint,
  pairChoicesFromForm,
  removeFitting,
  renameFitting,
  saveBlueprint,
  setAt,
  setCargo,
  setService,
  setSupportedBy,
  toggleMirror,
} from '../src/editor.ts';
import { exportVehicleBlueprint, type VehicleBlueprintInput } from '../src/export.ts';
import { host, PANEL, serviceFor } from './fixtures/parts.ts';

const NEAR_STRUT = 'strut_near';

/** Save, reload and schema-check the record the author downloads. */
const roundTrip = (edited: VehicleBlueprintInput) => {
  const saved = saveBlueprint(edited);
  const reloaded = loadSavedBlueprint(saved);
  const exported = exportVehicleBlueprint(reloaded);
  return { saved, reloaded, exported, issues: blueprintIssues(reloaded) };
};

const record = (blueprint: VehicleBlueprintInput, id: string) =>
  blueprint.fittings.find((fitting) => fitting.id === id)!;

describe('editor download round-trip', () => {
  it('starts from a fixture that has no issues', () => {
    expect(roundTrip(host).issues).toEqual([]);
  });

  it('carries added and set values through save, export and load', () => {
    let edited = addFitting(host, { id: 'extra', part: PANEL, at: [2, 0.5, 0.1] });
    edited = setAt(edited, 'extra', [2, 0.5, 0.25]);
    edited = setSupportedBy(edited, 'extra', ['frame', 'panel']);
    edited = setService(edited, 'extra', serviceFor('Extra', 12));
    edited = setCargo(edited, 'hold', [4, 2, 2]);
    const result = roundTrip(edited);

    expect(result.issues).toEqual([]);
    expect(record(result.reloaded, 'extra')).toEqual({
      id: 'extra',
      part: PANEL,
      at: [2, 0.5, 0.25],
      supportedBy: ['frame', 'panel'],
      service: serviceFor('Extra', 12),
    });
    expect(record(result.reloaded, 'hold').cargo).toEqual([4, 2, 2]);
  });

  it('removes a fitting, and refuses export while another still rests on it', () => {
    const removed = removeFitting(host, 'panel');
    expect(roundTrip(removed).reloaded.fittings.map(({ id }) => id)).not.toContain('panel');

    const fixed = setSupportedBy(removed, 'bolt', ['frame']);
    expect(roundTrip(fixed).issues).toEqual([]);
    expect(checkedExport(fixed).vehicleBlueprints[0].fittings).toHaveLength(
      host.fittings.length - 1,
    );
  });

  it('leaves no key behind when cargo and service are cleared', () => {
    const withCargo = setCargo(host, 'panel', [1, 1, 1]);
    const cleared = setService(setCargo(withCargo, 'panel', undefined), 'wheel', undefined);
    const result = roundTrip(cleared);

    expect(result.issues).toEqual([]);
    expect(result.saved).not.toContain('null');
    for (const fitting of [
      record(cleared, 'panel'),
      record(result.reloaded, 'panel'),
      record(result.exported.vehicleBlueprints[0], 'panel'),
    ]) {
      expect(Object.keys(fitting)).not.toContain('cargo');
    }
    for (const fitting of [
      record(cleared, 'wheel'),
      record(result.reloaded, 'wheel'),
      record(result.exported.vehicleBlueprints[0], 'wheel'),
    ]) {
      expect(Object.keys(fitting)).not.toContain('service');
    }
  });

  it('renames a fitting and every reference to it', () => {
    const result = roundTrip(renameFitting(host, 'wheel', 'tyre'));

    expect(result.issues).toEqual([]);
    expect(result.reloaded.fittings.flatMap(({ supportedBy }) => supportedBy)).not.toContain('wheel');
    expect(record(result.reloaded, 'cap').supportedBy).toEqual(['tyre']);
    expect(record(result.reloaded, 'reflector').supportedBy).toEqual(['tyre', 'frame']);
  });

  it('mirrors one fitting about its own origin and changes nothing else', () => {
    const mirrored = toggleMirror(host, 'panel');
    const after = roundTrip(mirrored);

    expect(after.issues).toEqual([]);
    expect(record(mirrored, 'panel')).toEqual({ ...record(host, 'panel'), mirror: true });
    expect(mirrored.fittings).toHaveLength(host.fittings.length);
    expect(mirrored.fittings.filter(({ id }) => id !== 'panel')).toEqual(
      host.fittings.filter(({ id }) => id !== 'panel'),
    );

    const again = roundTrip(toggleMirror(mirrored, 'panel'));
    expect(Object.keys(record(again.reloaded, 'panel'))).not.toContain('mirror');
  });

  it('creates a mirrored pair from the author-given mapping', () => {
    const edited = createMirroredPair(host, 'wheel', {
      base: 'wheel',
      supports: { frame: { kind: 'shared' }, [NEAR_STRUT]: { kind: 'paired', far: 'strut_far' } },
      outside: { cap: 'both', reflector: 'far' },
      serviceNames: { near: 'Near wheel', far: 'Far wheel' },
    });
    const result = roundTrip(edited);
    const [near, far] = [record(result.reloaded, 'wheel_near'), record(result.reloaded, 'wheel_far')];
    const original = record(host, 'wheel');

    expect(result.issues).toEqual([]);
    expect(result.reloaded.fittings.map(({ id }) => id)).not.toContain('wheel');
    expect(near.at).toEqual(original.at);
    expect(near.mirror).toBeUndefined();
    expect(far.at).toEqual([original.at[0], original.at[1], -original.at[2]]);
    expect(far.mirror).toBe(true);
    expect(near.supportedBy).toEqual(['frame', 'strut_near']);
    expect(far.supportedBy).toEqual(['frame', 'strut_far']);
    expect(record(result.reloaded, 'cap').supportedBy).toEqual(['wheel_near', 'wheel_far']);
    expect(record(result.reloaded, 'reflector').supportedBy).toEqual(['wheel_far', 'frame']);
    expect([near.service?.name, far.service?.name]).toEqual(['Near wheel', 'Far wheel']);

  });

  it('applies no default to a pair: a missing choice refuses the operation', () => {
    const choices = {
      base: 'wheel',
      supports: { frame: { kind: 'shared' }, [NEAR_STRUT]: { kind: 'shared' } },
      outside: { cap: 'both', reflector: 'near' },
      serviceNames: { near: 'Near', far: 'Far' },
    } as const;

    expect(() => createMirroredPair(host, 'wheel', { ...choices, supports: { frame: { kind: 'shared' } } })).toThrow(
      'shared or paired',
    );
    expect(() => createMirroredPair(host, 'wheel', { ...choices, outside: { cap: 'both' } })).toThrow('reflector');
    expect(() =>
      createMirroredPair(host, 'wheel', { base: 'wheel', supports: choices.supports, outside: choices.outside }),
    ).toThrow('service');
    expect(() => createMirroredPair(host, 'wheel', { ...choices, base: 'strut' })).toThrow('twin ids are free');
    expect(() => createMirroredPair(host, 'strut_far', { ...choices, base: 'x' })).toThrow('mirror');
  });
});

describe('pair dialog mapping', () => {
  const untouched = {
    base: 'wheel',
    supports: [
      { support: 'frame', kind: '', far: '' },
      { support: NEAR_STRUT, kind: '', far: '' },
    ],
    outside: [{ id: 'cap', side: '' }],
    serviceNames: { near: 'Near', far: 'Far' },
  };

  it('yields no mapping from untouched controls, and none until each choice is made', () => {
    expect(() => pairChoicesFromForm(untouched)).toThrow('shared or paired');
    const supports = untouched.supports.map((row) => ({ ...row, kind: 'shared' }));
    expect(() => pairChoicesFromForm({ ...untouched, supports })).toThrow('Choose a side for "cap"');
    const paired = supports.map((row) => ({ ...row, kind: 'paired' }));
    expect(() =>
      pairChoicesFromForm({ ...untouched, supports: paired, outside: [{ id: 'cap', side: 'both' }] }),
    ).toThrow('Name the far twin');
  });

  it('maps the author-made choices once every control is set', () => {
    expect(
      pairChoicesFromForm({
        ...untouched,
        supports: [
          { support: 'frame', kind: 'shared', far: '' },
          { support: NEAR_STRUT, kind: 'paired', far: 'strut_far' },
        ],
        outside: [{ id: 'cap', side: 'near' }],
      }),
    ).toEqual({
      base: 'wheel',
      supports: { frame: { kind: 'shared' }, [NEAR_STRUT]: { kind: 'paired', far: 'strut_far' } },
      outside: { cap: 'near' },
      serviceNames: { near: 'Near', far: 'Far' },
    });
  });
});

describe('schema boundary', () => {
  it('refuses export when every fitting is removed', () => {
    const empty = host.fittings.reduce((blueprint, { id }) => removeFitting(blueprint, id), host);

    expect(blueprintIssues(empty).join('\n')).toContain('needs at least one fitting');
    expect(() => checkedExport(empty)).toThrow('needs at least one fitting');
  });

  it('refuses export of a service with a negative duration', () => {
    const edited = setService(host, 'wheel', serviceFor('Wheel', -5));

    expect(blueprintIssues(edited).join('\n')).toContain('must be more than 0');
    expect(() => checkedExport(edited)).toThrow('must be more than 0');
  });
});

describe('hand-merge against the authored Jsonnet source', () => {
  const library = 'packages/vehicle-authoring-tool/test/fixtures/authored-blueprint.libsonnet';

  /** Compiles a throwaway source that applies the tracked library to `height` and `duration`. */
  const compileAuthored = (height: number, duration: number): VehicleBlueprintInput => {
    const directory = mkdtempSync(join(tmpdir(), 'vat-authored-'));
    try {
      const path = join(directory, 'edited.jsonnet');
      writeFileSync(path, `(import '${library}').blueprint(${height}, ${duration})\n`);
      return JSON.parse(compileJsonnetFile(path, REPOSITORY_ROOT)) as VehicleBlueprintInput;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  };

  it('matches the recompiled source once the same edit is merged by hand, service included', () => {
    const [height, duration] = [0.8, 45];
    let edited = compileAuthored(0.9, 30);
    edited = setAt(edited, 'rail', [0.5, height, 0]);
    edited = setAt(edited, 'plate_near', [1, height, 0.4]);
    edited = setAt(edited, 'plate_far', [1, height, -0.4]);
    edited = setService(edited, 'plate_near', {
      ...record(edited, 'plate_near').service!,
      durationSimSeconds: duration,
    });
    edited = setService(edited, 'plate_far', { ...record(edited, 'plate_far').service!, durationSimSeconds: duration });

    const downloaded = roundTrip(edited);
    const recompiled = compileAuthored(height, duration);
    const authored = roundTrip(recompiled);

    expect(downloaded.issues).toEqual([]);
    expect(authored.issues).toEqual([]);
    expect(downloaded.exported).toEqual({ vehicleBlueprints: [recompiled] });
    expect(record(recompiled, 'plate_far').service?.name).toBe('Far plate');
  });
});
