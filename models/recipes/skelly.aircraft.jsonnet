// Helicopters, so a product can carry a city's traffic without its aircraft. The cockpit and cabin fittings they share
// with road vehicles stay in skelly.ground-vehicles, which this pack depends on.
local packs = import 'models/vehicles/packs.libsonnet';
local catalogue = import 'models/catalogue/packs.libsonnet';
[packs.partRecipe(row) for row in catalogue.rows(packs.parts('skelly.aircraft'))]
