// Stands on a dash top: the dials face the driver at -x under the hood, centred on z. `nose` is how far the housing
// reaches ahead of the origin, so a cab can stand the binnacle clear of its windscreen.
local k = import 'kit.libsonnet';
local box = k.box;
local hoodBase = 0.13;
{
  height: 0.17,
  nose: 0.12,
  row: k.compound('instrument_binnacle', 2, [
    box('housing', 'shell', [-0.1, 0, -0.22], [self.nose, hoodBase, 0.22]),
    k.prism('hood', 'shell', [[-0.16, hoodBase], [self.nose, hoodBase], [self.nose, self.height], [-0.12, self.height]], [-0.22, 0.22]),
  ] + k.bothSides([
    box('dial', 'dial', [-0.125, 0.03125, 0.0625], [-0.1, 0.09375, 0.1875]),
  ]), { shell: 'plastic-black', dial: 'plastic-white' }) + { title: 'Instrument binnacle' },
}
