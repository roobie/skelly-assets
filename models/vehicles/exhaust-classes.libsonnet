// The size classes of an exhaust's salvageable parts. Every exhaust of one general size takes the same catalytic
// converter and muffler, so one salvaged from one car fits another, while a truck's are bigger than a car's; a diesel
// truck's class has no converter. A class is one entry here; `exhausts.libsonnet` names each exhaust's class.
// Metres and kilograms; `exhaust-kit.libsonnet` says each part's frame.
{
  light: {
    pipe: { radius: 0.03, finish: 'steel-spall-black', bracket: 'steel-grey' },
    tip: { radius: 0.04, length: 0.0625, finish: 'steel-stainless' },
    // A canister whose ends taper down to the pipe.
    cat: { id: 'catalytic_converter_light', massKg: 2.5, axis: 'x', radius: 0.065, length: 0.36, taper: 0.06, finish: 'steel-stainless' },
    // A flat oval box: `section` is its height and width across the run.
    muffler: { id: 'muffler_light', massKg: 3.5, axis: 'x', section: [0.14, 0.3], length: 0.42, finish: 'steel-spall-black' },
  },
  heavy: {
    pipe: { radius: 0.065, finish: 'steel-bright', bracket: 'paint-charcoal' },
    tip: { radius: 0.085, length: 0.12, finish: 'steel-bright' },
    // An upright can in a stack, with a heat shield wrapping `span` degrees of its outboard face, +z, against burns.
    muffler: { id: 'muffler_heavy', massKg: 18, axis: 'y', section: [0.26, 0.26], length: 0.85, finish: 'steel-bright', shield: { thickness: 0.02, span: 120, finish: 'steel-stainless' } },
  },
}
