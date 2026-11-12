local c = import 'packages/thing-authoring-tool/cans.libsonnet';
local atom = c.atom, tin = c.tin;
local shellMassKg = 0.100;
[
  tin('opened_beans', 0.037, 0.11, 'paint-terracotta', 'beans', exportMass='inventory-atom', massKg=shellMassKg) + { title: 'Opened beans' } + { taxonomy: { category: 'food', tags: { state: ['opened'] } } },
  tin('opened_soup', 0.034, 0.12, 'paperboard-tan', 'soup', exportMass='inventory-atom', massKg=shellMassKg) + { title: 'Opened soup' } + { taxonomy: { category: 'food', tags: { state: ['opened'] } } },
  tin('empty_can', 0.037, 0.11, 'paint-terracotta', 'empty', exportMass='inventory-atom', massKg=shellMassKg) + { title: 'Empty can' } + { taxonomy: { category: 'food', tags: { state: ['empty'] } } },
  tin('opened_soda', 0.033, 0.115, 'plastic-red', 'drink', exportMass='inventory-atom', massKg=0.015, food='paint-oxblood') + { title: 'Opened soda' } + { taxonomy: { category: 'food', tags: { state: ['opened'] } } },
  atom('can_opener', 'handOpener', 0.100, {
    handleLength: 0.127, tangWidth: 0.008, tangDepth: 0.006,
    gripLength: 0.092, gripWidth: 0.014, gripDepth: 0.014,
    handleGap: 0.008, handleSplay: 9,
    jawLength: 0.037, jawWidth: 0.021, jawThickness: 0.004, jawGap: 0.01,
    pivotRadius: 0.004,
    feedRadius: 0.009, feedThickness: 0.005, toothDepth: 0.002, toothCount: 12,
    cutterRadius: 0.008, cutterThickness: 0.002,
    spindleRadius: 0.003, spindleHeight: 0.022,
    keyLength: 0.042, keyWidth: 0.014, keyThickness: 0.006,
  }, { body: 'steel-grey', grip: 'plastic-red', wheel: 'steel-parkerized', key: 'paint-charcoal' }, 'grip-left', exportMass='parts', turn=[0, 0, 0], roll=90) + { title: 'Can opener' } + { taxonomy: { category: 'household', tags: { place: ['kitchen'] }, keywords: ['cooking'] } },
]
