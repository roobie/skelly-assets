// The clearance probe's findings (site/clearance.mjs, `clearanceProbe`) counted by kind, for tests to compare. A
// failing deep comparison of the findings themselves builds a diff of thousands of points, which exhausts memory.
export const counted = (findings) => Object.fromEntries(Object.entries(findings).map(([kind, list]) => [kind, list.length]));

// The counts of a probe that finds nothing.
export const CLEAN = { pokes: 0, flush: 0, sinks: 0, seams: 0 };
