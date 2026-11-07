import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The pack ids the recipe sources declare, from the source files alone (no compiled twin needed).
export function recipePackIds(root = resolve(import.meta.dirname, '..')) {
  return readdirSync(resolve(root, 'models/recipes')).filter(name => name.endsWith('.jsonnet')).sort()
    .map(name => name.slice(0, -'.jsonnet'.length));
}

export function readRecipes(root = resolve(import.meta.dirname, '..')) {
  const directory = resolve(root, 'models/recipes');
  return recipePackIds(root).map(packId => ({
    packId,
    value: JSON.parse(readFileSync(resolve(directory, `${packId}.json`), 'utf8')),
  }));
}
