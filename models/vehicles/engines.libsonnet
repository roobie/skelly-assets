// The engines built as a fused core with their class's accessories; see `engine-kit.libsonnet`. `massKg` is the whole
// dressed engine's, so the fused model and the assembly weigh the same and the core takes what the accessories leave.
// Its crank lies along x; `length` is along the crank.
{
  i4_petrol: { class: 'light', massKg: 140, length: 0.46, width: 0.46, height: 0.55 },
  i4_diesel: { class: 'light', massKg: 185, length: 0.5, width: 0.5, height: 0.62 },
  v8_petrol_medium: { class: 'medium', massKg: 262, length: 0.8, width: 0.62, height: 0.72 },
}
