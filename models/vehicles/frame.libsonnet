// Vehicle parts and placements are laid out with x forward, y up and z toward the near side, because a vehicle's
// measures read along its length. The build turns both onto the model frame's +z forward; see
// docs/decisions/0002-model-frame.md.
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
{
  forward: '+x',
  rows(rows):: [row { forward: $.forward } for row in rows],
  // A vehicle file's finished rows: its `own` taxonomy beneath each row's, every row of the fleet a vehicle part, and
  // the frame the rows are laid out in.
  vehicleRows(own, rows):: taxonomy.inherit({ category: 'vehicle-parts' }, $.rows(taxonomy.inherit(own, rows))),
}
