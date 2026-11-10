// Default proportions and finishes for packages/thing-authoring-tool/packages.libsonnet's cartons and vessels; a row's
// `extra` overrides any of them. `size` is in metres; `share` is a fraction of the package's own height, width or depth.
{
  carton: {
    size: { lidHeight: 0.002, bandInset: 0.0003, handleHeight: 0, handleWall: 0.006 },
    share: { bandHeight: 0.45, handleWidth: 0.6, handleDepth: 0.25 },
  },
  vessel: {
    size: { shoulderHeight: 0.002, neckHeight: 0.001, capHeight: 0.001, rimHeight: 0.001, bandInset: 0.0003 },
    capOverhang: 0.0005,
    share: { bandHeight: 0.65 },
    finish: { cap: 'steel-grey' },
  },
}
