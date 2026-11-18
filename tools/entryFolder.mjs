// @ts-check
// The folders of entries that every content-addressed store of the tools keeps: the export cache, the checks' results
// and the Jsonnet twin store. It sits beside sources.mjs rather than in a package because the twin store runs before
// any package code may be imported, and imports nothing of the tools so that stays true.
import { chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { threadId } from 'node:worker_threads';

/** @typedef {Readonly<Record<string, string | Uint8Array>>} EntryFiles An entry's files by name, as written or as read back from the folder. */

/**
 * A folder of entries, each a set of files named `<key>.<name>`. Each file lands whole, by rename, and an entry's files
 * land in the order named, so a reader that finds the last finds the whole entry.
 * @typedef {object} EntryFolder
 * @property {(key: string, names: readonly string[]) => Record<string, Buffer> | undefined} read An entry's files, or
 *   undefined when its last is missing; a reuse in a shared store refreshes the entry's age.
 * @property {(key: string, names: readonly string[], files: EntryFiles) => void} write
 * @property {(key: string, name: string) => string} path Where an entry's file lies, for a reader that must name the
 *   file rather than read it, such as a link to it.
 * @property {(keep: ReadonlySet<string>, now?: number) => void} prune Removes the entries a complete build did not
 *   name, so a store holds what the next build can reuse rather than one entry per edit ever made. A private store keeps
 *   only those named; a shared store counts each named entry as used, whether or not the build read it, and also keeps
 *   each entry used within SHARED_ENTRY_LIFE_MS. An entry's files go together, judged by the newest, so a reader never
 *   finds part of one. A writer's temporary file is left alone until it is older than TEMPORARY_LIFE_MS, whatever entry
 *   it belongs to, so a prune never breaks a landing in flight.
 */

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
/** @param {string} file */
const temporaryOf = (file) => `${file}.${process.pid}.${threadId}.tmp`;
const TEMPORARY = /\.\d+\.\d+\.tmp$/;
const ENTRY = /^([0-9a-f]+)\.(.+)$/;

const SETGID = 0o2000;
const GROUP_WRITE = 0o020;
// A store is shared when it is setgid, so what is made in it keeps its group, and its group may write in it: that is
// how a store shared by several users is set up, and a store a build makes for itself is neither.
/** @param {string} dir */
const isShared = (dir) => {
  const { mode } = statSync(dir);
  return (mode & SETGID) !== 0 && (mode & GROUP_WRITE) !== 0;
};
// The group gets the access the owner has, since the umask of whoever made the path may withhold it.
/** @param {string} path */
const shareWithGroup = (path) => {
  const { mode } = statSync(path);
  chmodSync(path, (mode & 0o7777) | ((mode & 0o700) >> 3));
};

// Makes `dir` and its missing parents, each shared with the group when the folder it is made in is shared.
/** @param {string} dir */
const makeFolder = (dir) => {
  const target = resolve(dir);
  const first = mkdirSync(target, { recursive: true });
  if (first === undefined) return;
  const made = [];
  for (let at = target; at.length >= first.length; at = dirname(at)) made.unshift(at);
  for (const at of made) if (isShared(dirname(at))) shareWithGroup(at);
};

/** @param {string} path */
const modified = (path) => statSync(path, { throwIfNoEntry: false })?.mtimeMs;

/**
 * The folder `kind` of `store`, shared when `store` is setgid and group-writable. Throws, naming the chmod, when the
 * store is shared and the folder, made before it was, is not.
 *
 * Sharedness is the store's, as its owner set it up. A kind folder made before the store was shared would refuse the
 * group's writes, so it fails here, naming the fix, rather than at some other user's first write.
 * @param {string} store
 * @param {string} kind
 * @returns {EntryFolder}
 */
export const entryFolder = (store, kind) => {
  const dir = join(store, kind);
  makeFolder(dir);
  const shared = isShared(store);
  if (shared && !isShared(dir)) {
    throw new Error(`${dir} predates sharing ${store}, so its group may not write in it: chmod 2775 ${dir}`);
  }
  /** @type {EntryFolder['path']} */
  const path = (key, name) => join(dir, `${key}.${name}`);
  /**
   * @param {string} file
   * @param {string | Uint8Array} data
   */
  const land = (file, data) => {
    const temporary = temporaryOf(file);
    writeFileSync(temporary, data);
    if (shared) shareWithGroup(temporary);
    renameSync(temporary, file);
  };
  /** @type {EntryFolder['write']} */
  const write = (key, names, files) => {
    for (const name of names) {
      const data = files[name];
      if (data === undefined) throw new Error(`entry ${key} has no file ${name} to write`);
      land(path(key, name), data);
    }
  };
  // Undefined when another build's prune removed a file meanwhile, which costs that entry's regeneration.
  /** @type {EntryFolder['read']} */
  const readEntry = (key, names) => {
    try {
      return Object.fromEntries(names.map((name) => [name, readFileSync(path(key, name))]));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  };
  // Landing anew rather than touching, since only a file's owner may set its times and a shared entry has many users.
  /**
   * @param {string} key
   * @param {readonly string[]} names
   * @param {number} lastUse
   * @param {number} now
   */
  const renew = (key, names, lastUse, now) => {
    if (!shared || now - lastUse <= REFRESH_AFTER_MS) return;
    const files = readEntry(key, names);
    if (files) write(key, names, files);
  };
  return {
    read: (key, names) => {
      const last = names.at(-1);
      const lastUse = last === undefined ? undefined : modified(path(key, last));
      if (lastUse === undefined) return undefined;
      const files = readEntry(key, names);
      if (files) renew(key, names, lastUse, Date.now());
      return files;
    },
    write,
    path,
    prune: (keep, now = Date.now()) => {
      /** @type {Map<string, string[]>} */
      const entries = new Map();
      for (const name of readdirSync(dir)) {
        if (TEMPORARY.test(name)) {
          if (now - (modified(join(dir, name)) ?? now) > TEMPORARY_LIFE_MS) rmSync(join(dir, name), { force: true });
          continue;
        }
        const [, key, file] = ENTRY.exec(name) ?? [];
        if (key !== undefined && file !== undefined) entries.set(key, [...(entries.get(key) ?? []), file]);
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
