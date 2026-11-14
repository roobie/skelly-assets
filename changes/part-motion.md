---
type: breaking
---
Car and hatchback doors, bonnets, boot lids and tailgates, and the hoist door, carry a `motion` on their model: a
non-empty list of stages from rest to the part's stop, each a hinge axis and signed angle or a slide direction and
travel in the model frame, with its share of the clock. They no longer have `hinge_a` or `hinge_b` anchors, and each
shows hinge pins in its own paint where it turns.

Upgrade:
- Open these parts by playing their `motion` rather than deriving a hinge from `hinge_a` and `hinge_b`.
- Run the stages one after another, each linearly through its `share` of the clock. Nest the first stage outermost:
  every stage is given in the part's rest frame.
- For a part placed mirrored, reflect each stage across the model's x = 0 plane: negate the x of the hinge axis ends
  and the angle, or the x of a slide's direction.
