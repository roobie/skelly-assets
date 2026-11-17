// What tools/build.mjs and tools/mobs.mjs share about generating models: the export cache they reuse unchanged models
// from, and how CI splits a complete build's generation over runners, each filling the cache with its share.
import { join, resolve } from 'node:path';
import process from 'node:process';
import { BUILD_ROOT } from './buildDir.mjs';

// Under the build root like the Jsonnet twin store, so an author's builds are incremental without asking.
// SKELLY_EXPORT_CACHE names another folder, as JSONNET_TWIN_STORE does, so worktrees and users on one host can share
// a store rather than each regenerating every model (packages/thing-export/src/cache.ts, pruneEntries).
export const DEFAULT_CACHE = process.env.SKELLY_EXPORT_CACHE || join(BUILD_ROOT, 'exports');

// The command line options that choose the cache, as node:util parseArgs takes them.
export const CACHE_OPTIONS = {
  cache: { type: 'string', default: DEFAULT_CACHE },
  'no-cache': { type: 'boolean', default: false },
};

// The cache folder the options name, or undefined under --no-cache.
export const cacheFolder = (values) => (values['no-cache'] ? undefined : resolve(values.cache));

// Shard `index` of `count` takes every count-th unit, so each shard's share interleaves all packs and the shards stay
// balanced however unevenly rows are spread over packs.
export const shardUnits = (units, { index, count }) => units.filter((_, at) => at % count === index - 1);

export const parseShard = (text) => {
  const [index, count] = text.split('/').map(Number);
  if (!(Number.isInteger(index) && Number.isInteger(count) && index >= 1 && index <= count)) {
    throw new Error(`--shard takes <index>/<count>, 1 <= index <= count: ${text}`);
  }
  return { index, count };
};
