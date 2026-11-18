---
type: changed
---
The vehicle swing check takes a fraction of the time it did, most of all for vehicles with many moving parts, and
`tools/check-sources.mjs` reuses the sweeps the build keeps in the export cache (`--cache`, `--no-cache`) instead of
sweeping every vehicle on each run. What the check finds is unchanged.
