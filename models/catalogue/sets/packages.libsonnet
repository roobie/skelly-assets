local p = import 'packages/thing-authoring-tool/packages.libsonnet';
local carton = p.carton, vessel = p.vessel;
[
  vessel('canned_beans', 0.450, 0.037, 0.11, 'steel-grey', 'paint-terracotta', exportMass='parts') + { taxonomy: { category: 'food' } },
  vessel('canned_soup', 0.430, 0.034, 0.12, 'steel-grey', 'paperboard-tan', exportMass='parts') + { taxonomy: { category: 'food' } },
  carton('crackers', 0.250, 0.14, 0.20, 0.055, 'paperboard-tan', 'paint-terracotta', exportMass='parts') + { taxonomy: { category: 'food' } },
  carton('chocolate_bar', 0.100, 0.15, 0.012, 0.07, 'paperboard-brown', 'paperboard-tan', exportMass='parts', extra={ lidHeight: 0.0005 }) + { taxonomy: { category: 'food' } },
  vessel('soda_can', 0.360, 0.033, 0.115, 'steel-grey', 'plastic-red', exportMass='inventory-atom', extra={ shoulderHeight: 0.005, neckRadius: 0.029, capRadius: 0.030 }) + { taxonomy: { category: 'food' } },
  vessel('empty_soda_can', 0.015, 0.033, 0.115, 'steel-grey', 'plastic-red', exportMass='inventory-atom', extra={ shoulderHeight: 0.005, neckRadius: 0.029, capRadius: 0.030 }) + { taxonomy: { category: 'food', tags: { state: ['empty'] } } },
  vessel('water_bottle', 1.050, 0.043, 0.20, 'glass-grey', 'plastic-blue', exportMass='parts', extra={ shoulderHeight: 0.025, neckRadius: 0.014, neckHeight: 0.015, capRadius: 0.016, capHeight: 0.012 }) + { taxonomy: { category: 'food' } },
  carton('juice_carton', 1.050, 0.075, 0.19, 0.075, 'paperboard-tan', 'plastic-green', exportMass='parts', extra={ lidHeight: 0.015 }) + { taxonomy: { category: 'food' } },
  carton('cartridge_box_308_h_winchester', 0.520, 0.15, 0.08, 0.035, 'paperboard-brown', 'paperboard-tan', exportMass='parts') + { taxonomy: { category: 'ammunition', tags: { weapon: ['rifle'] } } },
  carton('cartridge_box_5_d_56x45', 0.280, 0.095, 0.065, 0.04, 'paperboard-tan', 'cord-olive', exportMass='parts') + { taxonomy: { category: 'ammunition', tags: { weapon: ['rifle'] } } },
  carton('cartridge_box_7_d_62x39', 0.360, 0.11, 0.065, 0.045, 'paperboard-brown', 'cord-olive', exportMass='parts') + { taxonomy: { category: 'ammunition', tags: { weapon: ['rifle'] } } },
  carton('cartridge_box_357_h_magnum', 0.825, 0.13, 0.055, 0.10, 'paperboard-tan', 'plastic-blue', exportMass='parts') + { taxonomy: { category: 'ammunition', tags: { weapon: ['handgun'] } } },
  carton('shotshell_box', 0.840, 0.12, 0.075, 0.095, 'paperboard-brown', 'plastic-red', exportMass='parts') + { taxonomy: { category: 'ammunition', tags: { weapon: ['shotgun'] } } },
  carton('ammo_can', 1.600, 0.28, 0.17, 0.14, 'polymer-od-green', 'paperboard-tan', exportMass='parts', extra={ lidHeight: 0.012, bandHeight: 0.035, handleHeight: 0.025, handleWidth: 0.11, handleDepth: 0.018, handleWall: 0.008 }, heldSolid='handle') + { taxonomy: { category: 'ammunition', keywords: ['military'] } },
  vessel('gas_canister', 0.350, 0.045, 0.12, 'steel-grey', 'plastic-blue', exportMass='parts', extra={ shoulderHeight: 0.015, neckRadius: 0.012, neckHeight: 0.008, capRadius: 0.014, capHeight: 0.006 }) + { taxonomy: { category: 'containers', keywords: ['fuel'] } },
]
