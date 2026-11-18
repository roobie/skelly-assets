---
type: changed
---
Clip sampling slerps rotations with its own quaternion code, so the pose page, the showcase viewer and the Node reader
share one interpolation and the clip decode path no longer reaches three.js.
