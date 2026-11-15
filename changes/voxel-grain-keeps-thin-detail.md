---
type: changed
---
A definition that names its own `voxelGrain` now keeps the rest of its recipe class, so a class that gives thin parts
the detail grain still does. No model changes: no row that names its own grain is in such a class. The rows that name
their own grain on the vehicle class (the bus doors, the sleek security walker, the wheeled APC and the 120 mm tank
gun) no longer carry a detail grain in their recipe, as the class has none; none has a part tagged for it.
