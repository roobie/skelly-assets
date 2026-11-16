// The overlaps of the vehicle families nobody has judged since the check began to read a part through a panel as deep
// as it passes (`docs/decisions/0014-site-overlap.md`, "Decision"), as `site.unjudged` entries by vehicle. They count as
// the vehicle's own `unjudged` entries and may stand over a shallower allowance of the vehicle; a family is judged by
// turning its rows into fits, allowances or model fixes and deleting them.
(import 'unjudged-overlaps/helicopters.libsonnet')
+ (import 'unjudged-overlaps/others.libsonnet')
+ (import 'unjudged-overlaps/trucks.libsonnet')
+ (import 'unjudged-overlaps/vans-and-buses.libsonnet')
