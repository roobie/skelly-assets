// Two variants of one van for tools/test/placements.test.mjs: one that drops the engine, and one whose parent is gone.
(import 'models/vehicles/site.libsonnet').variants({
  van: {
    sites: [
      { id: 'body', part: 'fixture_van_body', at: [0, 0, 0] },
      { id: 'engine', part: 'fixture_engine', at: [1, 0, 0] },
    ],
  },
  electric_van: {
    parent: 'van',
    sites(base): [placed for placed in base if placed.id != 'engine'] + [{ id: 'motor', part: 'fixture_motor', at: [1, 0, 0] }],
    tags: { 'vehicle-role': ['farm'] },
  },
  orphan_van: { parent: 'gone_van', sites(base): base },
})
