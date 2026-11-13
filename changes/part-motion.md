---
type: breaking
---
Car and hatchback doors, bonnets, boot lids and tailgates, and the hoist door, carry a `motion` on their model: a hinge
axis and signed open angle in the model frame, from rest to the part's stop. They no longer have `hinge_a` or `hinge_b`
anchors, and each shows round hinge pins where it turns.

Upgrade:
- Open these parts by playing their `motion` rather than deriving a hinge from `hinge_a` and `hinge_b`.
- For a part placed mirrored, reflect its motion across the model's x = 0 plane: negate the x of the hinge axis ends
  and the angle, or the x of a slide's direction.
