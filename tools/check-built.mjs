// Rebuild everything into a temporary folder and hold built/ to it: the fresh set equals the tracked set under built/,
// every file is byte-equal, nothing sits flat under built/ but manifest.json, the manifest names exactly the fresh
// files (tools/manifest.mjs, treeDifferences) and every directory under built/ is a declared pack (tools/layout.mjs,
// declaredPacks).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { declaredPacks, undeclaredDirectories } from './layout.mjs';
import { MANIFEST, treeDifferences } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
if (git('status', '--porcelain', '--', 'built').trim()) {
  throw new Error('built/ must be clean before checking determinism');
}
const temporary = mkdtempSync(join(tmpdir(), 'skelly-assets-built-'));
try {
  for (const tool of ['build.mjs', 'mobs.mjs']) {
    execFileSync(process.execPath, [join(import.meta.dirname, tool), '--out', temporary], { cwd: repo, stdio: 'inherit' });
  }
  const tracked = git('ls-files', '-z', '--', 'built').split('\0').filter(Boolean);
  const fresh = readdirSync(temporary, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `built/${relative(temporary, join(entry.parentPath, entry.name))}`).sort();
  const manifest = JSON.parse(readFileSync(join(temporary, MANIFEST), 'utf8'));
  const differences = treeDifferences({ tracked, fresh, manifest });
  const freshSet = new Set(fresh);
  for (const file of tracked) {
    if (freshSet.has(file) && !readFileSync(join(repo, file)).equals(readFileSync(join(temporary, relative('built', file))))) {
      differences.push(`changed: ${file}`);
    }
  }
  for (const directory of undeclaredDirectories([...tracked, ...fresh], declaredPacks(repo))) differences.push(`undeclared directory: ${directory}`);
  if (differences.length) {
    console.error(differences.join('\n'));
    process.exitCode = 1;
  } else console.log(`check-built: ${fresh.length} produced files equal the tracked set byte for byte; the manifest names each; every directory a declared pack`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
