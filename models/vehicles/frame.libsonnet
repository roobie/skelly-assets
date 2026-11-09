// Vehicle parts and placements are laid out with x forward, y up and z toward the near side, because a vehicle's
// measures read along its length. The build turns both onto the model frame's +z forward; see
// docs/decisions/0002-model-frame.md.
{
  forward: '+x',
  rows(rows):: [row { forward: $.forward } for row in rows],
}
