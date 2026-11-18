/** An entry's files by name, as written or as read back from the folder. */
export type EntryFiles = Readonly<Record<string, string | Uint8Array>>;

/**
 * A folder of entries, each a set of files named `<key>.<name>`. Each file lands whole, by rename, and an entry's files
 * land in the order named, so a reader that finds the last finds the whole entry.
 */
export interface EntryFolder {
  /** An entry's files, or undefined when its last is missing; a reuse in a shared store refreshes the entry's age. */
  readonly read: (key: string, names: readonly string[]) => Record<string, Buffer> | undefined;
  readonly write: (key: string, names: readonly string[], files: EntryFiles) => void;
  /** Where an entry's file lies, for a reader that must name the file rather than read it, such as a link to it. */
  readonly path: (key: string, name: string) => string;
  /**
   * Removes the entries a complete build did not name, so a store holds what the next build can reuse rather than one
   * entry per edit ever made. A private store keeps only those named; a shared store counts each named entry as used,
   * whether or not the build read it, and also keeps each entry used within SHARED_ENTRY_LIFE_MS. An entry's files go
   * together, judged by the newest, so a reader never finds part of one. A writer's temporary file is left alone until
   * it is older than TEMPORARY_LIFE_MS, whatever entry it belongs to, so a prune never breaks a landing in flight.
   */
  readonly prune: (keep: ReadonlySet<string>, now?: number) => void;
}

/** The folder `kind` of `store`, shared when `store` is setgid and group-writable. */
export function entryFolder(store: string, kind: string): EntryFolder;

export const SHARED_ENTRY_LIFE_MS: number;
export const TEMPORARY_LIFE_MS: number;
