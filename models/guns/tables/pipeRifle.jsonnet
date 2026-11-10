// The scavenged pipe rifle's furniture: rough boards cut by eye, and the strapping that holds the pipe to them.
// Shapes are side-profile look estimates in gun units, never measurements.
{
  stock: {
    // Convex, counter-clockwise board cuts in the stock frame (receiver rear on the seat), each sawn to its own
    // thickness so the joins read as separate pieces.
    boards: [
      { id: 'wrist', profile: [[0, 1], [-10, 1], [-10, -3.5], [0, -2.5]], halfWidthU: 0.875 },
      { id: 'neck', profile: [[-10, 1], [-14.5, 1], [-14.5, -3.5], [-10, -3.5]], halfWidthU: 1 },
      { id: 'butt', profile: [[-14.5, 1], [-27.5, 0.75], [-27, -8], [-14.5, -3.5]], halfWidthU: 1.125 },
    ],
    // Tape wound round a board, each wrap an x span on it.
    tape: { board: 'neck', wraps: [[-14, -12.75], [-12.25, -10.5]], thicknessU: 0.25 },
    palm: [-4, -1, 0],
    cheek: [-18, 1, 0],
  },
  foreEnd: {
    // A plank under the action and the pipe. Under the action it is cut down to the trigger plate.
    bedTopU: -1.5,
    board: { topU: -1.5, bottomU: -3.25, frontInsetU: 1 },
    halfWidthU: 1.25,
    // Straps round pipe and plank: wide hose clamps with their screw housing, and narrow wire turns without.
    straps: [
      { x: 1, widthU: 0.25, housing: false },
      { x: 1.5, widthU: 0.25, housing: false },
      { x: 2, widthU: 0.25, housing: false },
      { x: 7, widthU: 0.75, housing: true },
      { x: 13.5, widthU: 0.75, housing: true },
    ],
    strapThicknessU: 0.25,
    housing: { lengthU: 0.75, heightU: 1, depthU: 0.5 },
  },
}
