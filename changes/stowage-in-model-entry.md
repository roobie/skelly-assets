---
type: added
---
A thing's `model.json` now carries its stowage ports as `stowage`: a locker part's `slots`, each with its `id` (the port id a load-out names), `accepts`, `envelope` and `frame`, and a stowable item's `seats`, each with its `standard` and `frame`, in the model frame and metres, as the GLB's stowage port nodes give them. The field is left out of a model without stowage ports, and the GLBs and every other field are unchanged.
