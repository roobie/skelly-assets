// The folders of entries that every content-addressed store of the tools keeps: the export cache, the checks' results
// and the Jsonnet twin store. It sits beside sources.mjs rather than in a package because the twin store runs before
// any package code may be imported, and imports nothing of the tools so that stays true.
import { chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { threadId } from 'node:worker_threads';

const DAY_MS = 24 * 60 * 60 * 1000;
// How long a shared store keeps an entry that no build has used. Its builds come from other worktrees and users, so
// one complete build cannot name the entries the others still reuse; a week spans a branch left aside for a few days
// without keeping every code change's full set of models for long.
export const SHARED_ENTRY_LIFE_MS = 7 * DAY_MS;
// A use refreshes an entry's age at most daily, so a build that reuses every model rewrites few of them.
const REFRESH_AFTER_MS = DAY_MS;
// A file lands in moments, so a temporary file this old is a dead writer's and no one will rename it.
export const TEMPORARY_LIFE_MS = 60 * 60 * 1000;

// Named after the file it becomes and the writer, so writers landing one file at once never share a temporary file.
const temporaryOf = (file) => `${file}.${process.pid}.${threadId}.tmp`;
const TEMPORARY = /\.\d+\.\d+\.tmp$/;
const ENTRY = /^([0-9a-f]+)\.(.+)$/;

const SETGID = 0o2000;
const GROUP_WRITE = 0o020;
// A store is shared when it is setgid, so what is made in it keeps its group, and its group may write in it: that is
// how a store shared by several users is set up, and a store a build makes for itself is neither.
const isShared = (dir) => {
  const { mode } = statSync(dir);
  return (mode & SETGID) !== 0 && (mode & GROUP_WRITE) !== 0;
};
// The group gets the access the owner has, since the umask of whoever made the path may withhold it.
const shareWithGroup = (path) => {
  const { mode } = statSync(path);
  chmodSync(path, (mode & 0o7777) | ((mode & 0o700) >> 3));
};

// Makes `dir` and its missing parents, each shared with the group when the folder it is made in is shared.
const makeFolder = (dir) => {
  const target = resolve(dir);
  const first = mkdirSync(target, { recursive: true });
  if (first === undefined) return;
  const made = [];
  for (let at = target; at.length >= first.length; at = dirname(at)) made.unshift(at);
  for (const at of made) if (isShared(dirname(at))) shareWithGroup(at);
};

const modified = (path) => statSync(path, { throwIfNoEntry: false })?.mtimeMs;

// Sharedness is the store's, as its owner set it up, so a kind folder made before the store was shared still counts.
export const entryFolder = (store, kind) => {
  const dir = join(store, kind);
  makeFolder(dir);
  const shared = isShared(store);
  const path = (key, name) => join(dir, `${key}.${name}`);
  const land = (file, data) => {
    const temporary = temporaryOf(file);
    writeFileSync(temporary, data);
    if (shared) shareWithGroup(temporary);
    renameSync(temporary, file);
  };
  const write = (key, names, files) => {
    for (const name of names) land(path(key, name), files[name]);
  };
  // Undefined when another build's prune removed a file meanwhile, which costs that entry's regeneration.
  const readEntry = (key, names) => {
    try {
      return Object.fromEntries(names.map((name) => [name, readFileSync(path(key, name))]));
    } catch (error) {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    }
  };
  // Landing anew rather than touching, since only a file's owner may set its times and a shared entry has many users.
  const renew = (key, names, lastUse, now) => {
    if (!shared || now - lastUse <= REFRESH_AFTER_MS) return;
    const files = readEntry(key, names);
    if (files) write(key, names, files);
  };
  return {
    read: (key, names) => {
      const lastUse = modified(path(key, names.at(-1)));
      if (lastUse === undefined) return undefined;
      const files = readEntry(key, names);
      if (files) renew(key, names, lastUse, Date.now());
      return files;
    },
    write,
    path,
    prune: (keep, now = Date.now()) => {
      const entries = new Map();
      for (const name of readdirSync(dir)) {
        if (TEMPORARY.test(name)) {
          if (now - (modified(join(dir, name)) ?? now) > TEMPORARY_LIFE_MS) rmSync(join(dir, name), { force: true });
          continue;
        }
        const [, key, file] = ENTRY.exec(name) ?? [];
        if (key !== undefined) entries.set(key, [...(entries.get(key) ?? []), file]);
      }
      for (const [key, names] of entries) {
        const lastUse = Math.max(...names.map((name) => modified(path(key, name)) ?? 0));
        if (keep.has(key)) renew(key, names, lastUse, now);
        else if (!shared || now - lastUse > SHARED_ENTRY_LIFE_MS) {
          for (const name of names) rmSync(path(key, name), { force: true });
        }
      }
    },
  };
};
