import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blueprintIssues, checkedExport, loadSavedBlueprint, saveBlueprint } from '../src/editor.ts';

const directory = new URL('../blueprints/', import.meta.url);

describe('authoring blueprint inputs', () => {
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.json'))) {
    it(`opens and exports ${file} as a schema-valid saved row`, () => {
      const blueprint = loadSavedBlueprint(readFileSync(new URL(file, directory), 'utf8'));
      expect(blueprintIssues(blueprint)).toEqual([]);
      expect(loadSavedBlueprint(saveBlueprint(blueprint))).toEqual(blueprint);
      expect(checkedExport(blueprint)).toEqual({ vehicleBlueprints: [blueprint] });
    });
  }
});
