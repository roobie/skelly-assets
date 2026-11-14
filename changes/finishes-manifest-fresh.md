---
type: fixed
---
A build after a change to `models/finishes.jsonnet` writes the new colours into the manifest's `finishes` on the first
run, where it used to write the previous build's until a second build.
