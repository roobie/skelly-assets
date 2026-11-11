local atom = (import 'packages/thing-authoring-tool/supplies.libsonnet').atom;
[
  atom('tape_roll', 'ring', 0.030, { outerRadius: 0.04, innerRadius: 0.012, coreRadius: 0.016, height: 0.021 }, { body: 'paint-terracotta', core: 'paperboard-tan' }, exportMass='parts') + { taxonomy: { category: 'materials' } },
  atom('thread_spool', 'spool', 0.015, { outerRadius: 0.027, coreRadius: 0.018, windingRadius: 0.026, height: 0.05, flangeHeight: 0.008, flangeInset: 0.004, windings: 5, grooveDepth: 0.0015 }, { core: 'paperboard-tan', winding: 'paint-terracotta' }, exportMass='parts') + { taxonomy: { category: 'materials', keywords: ['sewing'], tags: { material: ['fabric'] } } },
  atom('cord_coil', 'coil', 0.060, { radius: 0.029, tubeRadius: 0.0035, turns: 4, pitch: 0.006 }, { body: 'cord-olive' }, exportMass='parts') + { taxonomy: { category: 'materials', tags: { material: ['fabric'] } } },
  atom('fuse', 'fuse', 0.010, { radius: 0.009, capRadius: 0.011, length: 0.07, capLength: 0.008 }, { body: 'glass-grey', cap: 'steel-grey' }, exportMass='parts') + { taxonomy: { category: 'electrical' } },
  atom('bear_trap', 'bearTrap', 4.500, {
    jawRadius: 0.16, jawWidth: 0.014, jawThickness: 0.008, jawSegments: 8,
    toothCount: 9, toothHeight: 0.018,
    barWidth: 0.035, barHeight: 0.012,
    springLength: 0.17, springWidth: 0.04, springThickness: 0.01,
    panRadius: 0.06, panHeight: 0.006,
    linkCount: 5, linkRadius: 0.018, linkWire: 0.005,
  }, { frame: 'steel-parkerized', jaw: 'steel-grey', chain: 'steel-grey' }, exportMass='parts') + {
    taxonomy: { category: 'weapons', tags: { weapon: ['trap'], material: ['metal'], setting: ['modern'] } },
  },
]
