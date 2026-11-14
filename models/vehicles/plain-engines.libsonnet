// The engines drawn as a bare block with no accessories, by part id; see `shared.libsonnet`, `inline` and `vee`.
// `length` is along x, the crank's line.
{
  engine_i3_small: { title: 'Small inline-3 engine', layout: 'inline', massKg: 85, length: 0.34, width: 0.42, height: 0.52 },
  engine_i6_diesel: { title: 'Inline-6 diesel engine', layout: 'inline', massKg: 588, length: 0.86, width: 0.56, height: 0.75 },
  engine_i6_heavy_diesel: { title: 'Heavy inline-6 diesel engine', layout: 'inline', massKg: 1250, length: 1.12, width: 0.72, height: 0.95 },
  engine_v6_petrol: { title: 'V6 petrol engine', layout: 'vee', massKg: 175, length: 0.5, width: 0.62, height: 0.6 },
  engine_v8_petrol: { title: 'V8 petrol engine', layout: 'vee', massKg: 260, length: 0.62, width: 0.72, height: 0.68 },
  engine_v8_diesel: { title: 'V8 diesel engine', layout: 'vee', massKg: 1075, length: 1.0, width: 1.0, height: 0.88 },
  engine_v8_turbo_diesel: { title: 'V8 turbo diesel engine', layout: 'vee', massKg: 860, length: 1.16, width: 0.9, height: 0.95 },
}
