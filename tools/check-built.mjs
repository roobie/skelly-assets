// Compare every produced byte and account for the disjoint, provenance-stamped copied set.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

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
  const expected = new Set(tracked);
  const actual = new Set(fresh);
  const rows = JSON.parse(readFileSync(join(repo, 'models/copied.json'), 'utf8'));
  const copied = new Set();
  const differences = [];
  for (const row of rows) {
    if (typeof row.path !== 'string' || !row.path.startsWith('built/') ||
        !row.source?.repository || !row.source?.commit || !row.source?.path) {
      throw new Error(`invalid copied provenance: ${JSON.stringify(row)}`);
    }
    if (copied.has(row.path)) differences.push(`duplicate copied row: ${row.path}`);
    copied.add(row.path);
    if (!expected.has(row.path)) differences.push(`stale copied row: ${row.path}`);
    if (actual.has(row.path)) differences.push(`produced and copied: ${row.path}`);
  }
  for (const file of tracked) {
    if (!actual.has(file)) {
      if (!copied.has(file)) differences.push(`missing: ${file}`);
    }
    else if (!readFileSync(join(repo, file)).equals(readFileSync(join(temporary, relative('built', file))))) {
      differences.push(`changed: ${file}`);
    }
  }
  for (const file of fresh) if (!expected.has(file)) differences.push(`unexpected: ${file}`);
  if (differences.length) {
    console.error(differences.join('\n'));
    process.exitCode = 1;
  } else console.log(`check-built: ${fresh.length} produced files match exactly; ${copied.size} copied files accounted for`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
