---
read_if:
  - you change how mobgen builds, poses or bakes a body
  - you add a body plan or a mob template
  - you decide what mobgen code may import
---

# mobgen — procedural voxel actors

Mobgen keeps body construction independent of feasibility rules and rendering so body plans can be tested,
baked and viewed without baking in a particular anatomy or renderer. See `src/core/generate.ts`,
`src/core/rules.ts` and `src/viewer/main.ts`.

## Design boundaries

- Content holds authored values; TypeScript holds feasibility mechanisms. The content lives in the models
  tree, so a look change touches no package code, and it is the only thing the package imports from outside
  itself. Templates must declare supports and mass rather than relying on humanoid anatomy. See
  `models/mobs/`, `src/core/template.ts`, `src/core/rules.ts`, `src/core/templateMass.ts` and
  `test/boundaries.test.ts`.
- One bone owns each voxel so part topology remains useful for severing. Rigid ownership accepts visible
  seams at bent joints; preserving skeletal connection matters more than retaining every sub-voxel feature.
  See `src/core/voxelize.ts`, `repairJointAdjacencyInPlace`, `repairOverlappingJointAdjacency`, and
  `src/mob/dismember.ts`, `severedBoneSet`.
- Facial proportions should survive voxel-resolution changes. Dimensions follow body scale while the grid
  controls sampling. See `src/mob/humanoid.ts`, `buildFaceLayout`, and `src/core/generate.ts`, `realizeLod`.
- Coarse ownership and voxel counts are poor proxies for draw cost. Silhouette validation is an explicit
  far-LOD choice; full validation remains the detail default. See `src/core/generate.ts`,
  `recommendedProfileFor`, and `src/core/rules.ts`, `SILHOUETTE_RULES`.
- Actor mass is a template choice rather than voxel density: stylized bodies need not share realistic
  density. See `src/core/templateMass.ts`, `templatePartMassProperties`.

Materials and colour choices are authored in Jsonnet so changing a look does not require changing a builder.
Material bytes are local to a voxel grid, not a global palette. Emission is self-light, not a placed light;
viewer and crowd shaders share that interpretation. See `models/mobs/materialTemplates.jsonnet`,
`src/mob/materials.ts`, `resolveMaterials`, `src/viewer/scene.ts`, `fleshMaterial`, and `src/mob/crowd.ts`.

Shared-rig attacks and hit reactions belong to template content rather than its identity, so new templates
can reuse mechanisms without consumer branches. Missing or unknown selections fail rather than silently
falling back. See `src/mob/attack.ts`, `attackClipFor`, and `src/mob/reactions.ts`, `flinchClipFor`.

Game-owned ragdoll physics is intentionally absent from the pipeline viewer. A separate preview solver would
create approval drift; inspect physical falls in the game instead. The acid body's procedural death animation
remains an authoring preview. See `src/viewer/main.ts`, `applyDeathFrame`, and `test/boundaries.test.ts`.

Ragdoll groups are different: which bones fall together and how far each joint may swing describe the body,
so they change with its anatomy and stay with the model, and the game's solver reads them. The game has no
generic rule for a new anatomy, so a plan the humanoid rules don't fit carries its own. See
`models/mobs/leaper/ragdoll.jsonnet` and `test/leaper.test.ts`.

## Body plans and readiness

Body plans name anatomy. A leg-cut humanoid keeps the same rig and borrows crawl posing rather than becoming
another anatomy. See `src/core/template.ts`, `Template.legCut`, `src/mob/humanoid.ts`, and `src/mob/crawl.ts`.

The dog's four-paw anatomy requires a quadruped plan, not a crouched humanoid. Its assets-side template is
exportable because shipped model rows select it. Readiness remains an explicit selection boundary, not a naming
convention or incidental list. See `src/mob/quadruped.ts`, `src/mob/quadrupedTemplate.ts`,
`src/core/template.ts`, `consumableTemplate`, and `test/dog.test.ts`.

The quadruped trot is distance-driven to avoid foot jumps when speed changes. Joint flex and torso motion
must be solved around ground targets rather than layered onto planted legs. Its impaired diagonal retains
relative shortening so stride does not erase the limp. See `src/mob/quadruped.ts`, `DOG_TROT` and
`quadrupedGaitPose`.

The skeleton uses the humanoid rig, but its thin geometry snaps to voxel rows and columns to avoid vanishing.
It declares no flesh marrow and uses an explicit step width rather than girth-derived stance width. See
`src/mob/skeleton.ts`, `models/mobs/skeletonTemplate.jsonnet` and `test/skeleton.test.ts`.

The fused body should read as one grotesque fusion. Complete humanoid members remain severable subtrees
beneath a non-severable core; arbitrary member orientation means there is no single humanoid gaze target.
See `src/mob/fusedMass.ts`, `fusedMassManifest`, and `src/viewer/main.ts`, `applyLiveFrame`.

The leaper is an ambush predator built around folded hind springs, so it is its own plan rather than a
posed humanoid or quadruped. Its rest pose is the coiled crouch it spends its life in, so validation judges
that body; every other stance is a clip on the same rig. Its joints must hold together through deep folds,
which a rigid-voxel bend cracks open, so seams are checked after posing. Losing a hind spring changes which
gait the body can still perform instead of distorting the healthy one. It stays standalone from the other
plans so its tuning cannot move them. See `src/mob/leaper/plan.ts`, `LEAPER_TEMPLATE`;
`src/mob/leaper/seams.ts`, `jointCracks`; `src/mob/leaper/motion.ts`, `locomotionFor`; and
`test/boundaries.test.ts`.

Population-quality assertions belong in explicit sweeps because they measure distributions rather than an
individual body's contract. See `test/sweeps.ts`, `sweepGroup`, and `src/cli/stats.ts`.
