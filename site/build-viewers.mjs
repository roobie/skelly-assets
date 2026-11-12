// Builds every viewer site/tools.json lists into its package's dist/, which site/build.mjs then serves.
// Usage: node site/build-viewers.mjs.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readTools, viewerDir } from './tools.mjs';

const root = resolve(import.meta.dirname, '..');
for (const { viewer } of readTools(root)) {
  if (!viewer) continue;
  console.log(`building ${viewer}`);
  execFileSync('npx', ['vite', 'build'], { cwd: viewerDir(root, viewer), stdio: 'inherit' });
}
