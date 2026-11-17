---
type: added
---
Builders on one host can share one export cache, so a fresh worktree reuses the models others built instead of
generating the whole catalogue: `SKELLY_EXPORT_CACHE` names the folder, and a setgid, group-writable folder keeps
every entry some build used in the last week.
