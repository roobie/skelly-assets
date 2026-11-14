---
type: changed
---
Clip sampling slerps rotations with its own quaternion code, so the pose and look pages and the Node reader share one interpolation and the clip decode path no longer reaches three.js.
