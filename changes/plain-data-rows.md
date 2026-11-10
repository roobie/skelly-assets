---
type: changed
---
For mod authors: a row file that is not plain data, with a function, a hidden field or a field that reads `self` or
`super`, now fails the Jsonnet build with the file and the field path instead of building differently from its source.
