import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readRecipes(root = resolve(import.meta.dirname, '..')) {
  const directory = resolve(root, 'models/recipes');
  return readdirSync(directory).filter(name => name.endsWith('.jsonnet')).sort().map(name => ({
    packId: name.slice(0, -'.jsonnet'.length),
    value: JSON.parse(readFileSync(resolve(directory, name.replace(/\.jsonnet$/, '.json')), 'utf8')),
  }));
}
