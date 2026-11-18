import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { entryFolder, SHARED_ENTRY_LIFE_MS, TEMPORARY_LIFE_MS } from '../entryFolder.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const NAMES = ['body', 'json'];
const FILES = { body: 'body', json: '{}' };
const KEYS = { recent: 'a'.repeat(64), old: 'b'.repeat(64), kept: 'c'.repeat(64) };

const withStore = (check, { mode } = {}) => {
  const store = mkdtempSync(join(tmpdir(), 'entry-folder-'));
  // How a store shared by a group is set up: setgid and group-writable.
  if (mode !== undefined) chmodSync(store, mode);
  try {
    return check(store);
  } finally {
    rmSync(store, { recursive: true, force: true });
  }
};
const SHARED = { mode: 0o2775 };

const age = (dir, prefix, ms) => {
  const then = new Date(Date.now() - ms);
  for (const name of readdirSync(dir).filter((file) => file.startsWith(prefix)))
    utimesSync(join(dir, name), then, then);
};
const keysIn = (dir) => [...new Set(readdirSync(dir).map((name) => name.split('.')[0]))].sort();

// Three entries in `kind`: one used a day short of its life, one a day past it, and one past it that the build names.
const agedEntries = (store, kind = 'kind') => {
  const folder = entryFolder(store, kind);
  for (const key of Object.values(KEYS)) folder.write(key, NAMES, FILES);
  const dir = join(store, kind);
  age(dir, KEYS.recent, SHARED_ENTRY_LIFE_MS - DAY_MS);
  age(dir, KEYS.old, SHARED_ENTRY_LIFE_MS + DAY_MS);
  age(dir, KEYS.kept, SHARED_ENTRY_LIFE_MS + DAY_MS);
  return { folder, dir };
};

test('a private store keeps on pruning only the entries named, every file of each', () =>
  withStore((store) => {
    const { folder, dir } = agedEntries(store);
    folder.prune(new Set([KEYS.kept]));
    assert.deepEqual(readdirSync(dir).sort(), [`${KEYS.kept}.body`, `${KEYS.kept}.json`]);
  }));

test('a shared store keeps the entries used within their life, and drops every file of those older', () =>
  withStore((store) => {
    const { folder, dir } = agedEntries(store);
    folder.prune(new Set([KEYS.kept]));
    assert.deepEqual(keysIn(dir), [KEYS.recent, KEYS.kept].sort());
  }, SHARED));

test('a shared store counts an entry a prune names as used, so it outlives its life unread', () =>
  withStore((store) => {
    const { folder, dir } = agedEntries(store);
    folder.prune(new Set([KEYS.kept]));
    folder.prune(new Set(), Date.now() + 2 * DAY_MS);
    assert.deepEqual(keysIn(dir), [KEYS.kept]);
  }, SHARED));

test('a shared store refreshes the age of an entry it serves, so a reused entry outlives its life', () =>
  withStore((store) => {
    const folder = entryFolder(store, 'kind');
    folder.write(KEYS.recent, NAMES, FILES);
    age(join(store, 'kind'), KEYS.recent, SHARED_ENTRY_LIFE_MS - DAY_MS);
    assert.equal(String(folder.read(KEYS.recent, NAMES).body), FILES.body);
    folder.prune(new Set(), Date.now() + 2 * DAY_MS);
    assert.deepEqual(keysIn(join(store, 'kind')), [KEYS.recent]);
  }, SHARED));

test("sharedness is the store root's, even for a kind folder made before the store was shared", () =>
  withStore((store) => {
    mkdirSync(join(store, 'kind'), { mode: 0o755 });
    chmodSync(store, SHARED.mode);
    const { folder, dir } = agedEntries(store);
    folder.prune(new Set([KEYS.kept]));
    assert.deepEqual(keysIn(dir), [KEYS.recent, KEYS.kept].sort());
  }));

for (const [name, mode] of [
  ['private', undefined],
  ['shared', SHARED.mode],
]) {
  test(`a ${name} store's prune leaves a writer's temporary file in flight, and drops a dead writer's whatever its entry`, () =>
    withStore(
      (store) => {
        const { folder, dir } = agedEntries(store);
        const inFlight = `${KEYS.old}.json.1.0.tmp`;
        const dead = `${KEYS.kept}.json.2.0.tmp`;
        writeFileSync(join(dir, inFlight), 'landing');
        writeFileSync(join(dir, dead), 'abandoned');
        age(dir, dead, TEMPORARY_LIFE_MS + 60_000);
        folder.prune(new Set([KEYS.kept]));
        const names = readdirSync(dir);
        assert.ok(names.includes(inFlight), 'the temporary file in flight is left to land');
        assert.ok(!names.includes(dead), "the dead writer's temporary file is dropped");
      },
      { mode },
    ));
}

test('a shared store gives the group what the owner may do with each folder and file it makes, whatever the umask', () =>
  withStore((root) => {
    const umask = process.umask(0o022);
    try {
      entryFolder(join(root, 'tool'), 'inner').write(KEYS.kept, NAMES, FILES);
    } finally {
      process.umask(umask);
    }
    const groupOf = (path) => statSync(path).mode & 0o070;
    assert.deepEqual([groupOf(join(root, 'tool')), groupOf(join(root, 'tool', 'inner'))], [0o070, 0o070]);
    for (const name of readdirSync(join(root, 'tool', 'inner')))
      assert.equal(groupOf(join(root, 'tool', 'inner', name)), 0o060);
  }, SHARED));

test('a private store is left to the umask', () =>
  withStore((root) => {
    const umask = process.umask(0o022);
    try {
      entryFolder(join(root, 'tool'), 'inner').write(KEYS.kept, NAMES, FILES);
    } finally {
      process.umask(umask);
    }
    assert.equal(statSync(join(root, 'tool')).mode & 0o070, 0o050);
  }));
