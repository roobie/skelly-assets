---
type: added
---
Worktrees and users on one host can share one Jsonnet twin store, so a fresh worktree takes the twins another already
compiled rather than compiling the catalogue again. `JSONNET_TWIN_STORE` names the folder, and a setgid,
group-writable folder keeps every entry some checkout used in the last week.
