---
type: added
---
A finish can carry a shader `surface` (bark or leaves, from `@skelly/surfaces`), exported in each GLB material's
`extras.surface`, with the manifest's `surfaceContract` naming its version; the `bark` and `bark-birch` finishes now
wear bark looks. A shader lab (`tools/packages/shader-lab`) shows the built models wearing their looks and retunes them
live, so a look is judged by eye before it ships; the bark looks now have longer plates and finer birch marks.
