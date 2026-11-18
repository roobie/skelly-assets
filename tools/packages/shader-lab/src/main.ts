import type { LeafInputs, Surface, UniformField } from '@skelly/surfaces/schema';
import {
  Box3,
  Group,
  type Light,
  type Material,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { is } from 'valibot';
import { ALL, emptyFilter, matches } from '../../../../site/filter.mjs';
import {
  frame,
  hasSmooth,
  loadEntry,
  registerModels,
  setupRenderer,
  smoothEntry,
  stillInstance,
} from '../../../../site/render.mjs';
import { CAMERA_MODES, type CameraMode, Cameras } from './cameras.ts';
import { type Content, parseContent, pieceSurface } from './content.ts';
import { kinds, onKindsUpdate } from './kinds.ts';
import { byId, fillSelect, fillSliders } from './panel.ts';
import { buildGround, buildPieces } from './pieces.ts';
import { CONTENT_EVENT, CONTENT_PATH, type ContentMessage } from './protocol.ts';
import { describe, type FailedShader, shaderErrors } from './shaderError.ts';
import { type Lit, stages } from './stage.ts';
import { SurfaceMaterials, type Worn } from './surfaceMaterials.ts';
import { difference, jsonnet, jsonnetKey, nearestLook, slidersOf, valueAt, wearSnippet, withValue } from './tune.ts';

// The page: a built model's voxel and smooth copies beside the test pieces, lit by a stage, seen through a camera, its
// surfaces tunable live. Content arrives from the dev server and again on every edit of it; the surfaces package's code
// arrives as hot updates through kinds.ts.

/** A models.json model, as far as the lab reads it. */
interface Entry {
  readonly id: string;
  readonly title: string;
  readonly smooth?: unknown;
  readonly tags: Readonly<Record<string, readonly string[]>>;
  readonly keywords: readonly string[];
}

type See = Omit<Content['lab']['seeThrough'], 'ranges'>;

const canvas = byId<HTMLCanvasElement>('view');
const renderer = new WebGLRenderer({ canvas, antialias: true });
setupRenderer(renderer);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
const camera = new PerspectiveCamera();
const materials = new SurfaceMaterials();
const stageOf = stages(renderer);
const params = new URLSearchParams(location.search);

// ---- problems: shader errors and failed loads, shown on the page rather than only in the console ----

const problems = new Map<string, string>();
const showProblems = () => {
  byId('errors').textContent = [...problems.values()].join('\n\n');
};
const problem = (key: string, text: string) => {
  problems.set(key, text);
  showProblems();
};
const clearProblems = () => {
  problems.clear();
  showProblems();
};
const status = (text: string) => {
  byId('status').textContent = text;
};

renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
  const failed = (
    [
      ['vertex', vertex],
      ['fragment', fragment],
    ] as const
  )
    .filter(([, shader]) => gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true)
    .map(
      ([stage, shader]): FailedShader => ({
        stage,
        log: gl.getShaderInfoLog(shader) ?? '',
        source: gl.getShaderSource(shader) ?? '',
      }),
    );
  const errors = failed.flatMap((shader) => shaderErrors(shader, kinds().patch.SURFACE_EDITS));
  const text = errors.length > 0 ? errors.map(describe).join('\n') : `link: ${gl.getProgramInfoLog(program) ?? ''}`;
  problem(`shader:${text}`, text);
};

// ---- the scene ----

let content: Content;
let lit: Lit;
const world = new Group();
const model = new Group();
let pieces = new Group();
let ground: Object3D = new Group();
let cameras: Cameras;
let see: See;
let entries: readonly Entry[] = [];
let shown: Entry | undefined;

// A model's material wears the surface its finish gives in the current table, else the one its export carried.
const modelSurface = (material: Material) => {
  const { materialId, surface } = material.userData as { materialId?: unknown; surface?: unknown };
  const exported = is(kinds().schema.SurfaceSchema, surface) ? surface : undefined;
  return ({ finishes }: Content) =>
    (typeof materialId === 'string' ? finishes[materialId]?.finish.surface : undefined) ?? exported;
};

const placePieces = () => {
  materials.drop(pieces);
  world.remove(pieces);
  pieces = buildPieces(content);
  for (const mesh of pieces.children) {
    const id = mesh.name;
    materials.wear(mesh, mesh.name, content, () => (now) => {
      const piece = now.lab.pieces.find((each) => each.id === id);
      return piece === undefined ? undefined : pieceSurface(piece, now);
    });
  }
  world.remove(ground);
  ground = buildGround(content);
  world.add(pieces, ground);
};

const disposeLights = (scene: Object3D) =>
  scene.traverse((object) => {
    if ((object as Light).isLight) (object as Light).dispose();
  });

const useStage = (id: string) => {
  const stage = content.lab.stages[id];
  if (stage === undefined) return;
  if (lit !== undefined && lit.scene !== stageOf.showcase) disposeLights(lit.scene);
  lit = stageOf.light(stage, content.lab);
  lit.scene.add(world);
  params.set('stage', id);
  remember();
};

// The voxel copy on the left and the smooth copy on the right, `gap` apart, each standing on the ground.
const showModel = async (entry: Entry) => {
  shown = entry;
  params.set('model', entry.id);
  remember();
  pickModel();
  status(`Loading ${entry.title}…`);
  const copies = [['voxel', entry] as const, ...(hasSmooth(entry) ? [['smooth', smoothEntry(entry)] as const] : [])];
  try {
    const loaded = await Promise.all(copies.map(([, each]) => loadEntry(each)));
    if (shown !== entry) return;
    materials.drop(model);
    model.clear();
    copies.forEach(([name], i) => {
      const copy: Object3D = stillInstance(loaded[i], entry);
      copy.name = name;
      copy.traverse((object) => {
        object.castShadow = object.receiveShadow = true;
      });
      const box = new Box3().setFromObject(copy);
      const half = content.lab.gap / 2;
      const x =
        copies.length === 1 ? -(box.min.x + box.max.x) / 2 : name === 'voxel' ? -half - box.max.x : half - box.min.x;
      copy.position.set(x, -box.min.y, -(box.min.z + box.max.z) / 2);
      model.add(copy);
      materials.wear(copy, name, content, modelSurface);
    });
    if (cameras.mode === 'orbit') frame(camera, model, cameras.target);
    status('');
    fillSurfaces();
  } catch (error) {
    problem(`model:${entry.id}`, `${entry.id} did not load: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ---- the panel: the model picker, the stage and camera, the surface sliders and the see-through ----

const pickModel = () => {
  const filter = { ...emptyFilter(), q: byId<HTMLInputElement>('search').value, shelf: ALL };
  const found = entries.filter((entry) => matches(entry, filter));
  fillSelect(
    byId('model'),
    found.map(({ id, title }) => [id, `${title} (${id})`]),
    shown?.id ?? '',
  );
};

// A kind's own schema, so a surface's sliders are its kind's ranged numbers.
const kindFields = (surface: Surface): UniformField[] => {
  const schema = kinds().schema.SurfaceSchema.options.find(({ entries: { kind } }) => kind.literal === surface.kind);
  return schema === undefined ? [] : kinds().schema.uniformFields(schema);
};

let chosen: Worn | undefined;

const snippet = (worn: Worn) => {
  const surface = worn.surface;
  if (surface === undefined) return 'Plain: this material wears no surface.';
  const name = nearestLook(surface, content.lab.looks);
  const look = name === undefined ? undefined : content.lab.looks[name];
  if (name === undefined || look === undefined) return `No look of kind ${surface.kind} in models/surfaces.libsonnet.`;
  const { materialId } = worn.material.userData as { materialId?: unknown };
  const wear = wearSnippet(name, look, surface);
  return typeof materialId === 'string' ? `${jsonnetKey(materialId)}: ${wear}` : wear;
};

const fillLook = () => {
  const box = byId('look');
  const worn = chosen;
  if (worn?.surface === undefined) {
    box.replaceChildren();
    byId('snippet').textContent = worn === undefined ? '' : snippet(worn);
    return;
  }
  fillSliders(
    box,
    slidersOf(kindFields(worn.surface)),
    (path) => Number(valueAt(worn.surface, path)),
    (path, value) => {
      if (worn.surface === undefined) return;
      materials.show(worn, withValue(worn.surface, path, value));
      byId('snippet').textContent = snippet(worn);
    },
  );
  byId('snippet').textContent = snippet(worn);
};

const fillSurfaces = () => {
  const worn = materials.under(world);
  if (chosen === undefined || !worn.includes(chosen)) chosen = worn.find(({ surface }) => surface !== undefined);
  fillSelect(
    byId('surface'),
    worn.map((each, i) => [String(i), `${each.label} (${each.surface?.kind ?? 'plain'})`]),
    String(chosen === undefined ? -1 : worn.indexOf(chosen)),
  );
  fillLook();
};

// The see-through's sliders: the inputs' schema gives the ranges it holds, the lab's content the ones it leaves open.
const fillSee = () => {
  const { ranges } = content.lab.seeThrough;
  const fields = kinds()
    .schema.uniformFields(kinds().schema.LeafInputsSchema)
    .map((field) => {
      const range = ranges[field.path.join('.')];
      return field.range === undefined && range !== undefined ? { ...field, range } : field;
    });
  const seeSnippet = () => {
    const { ranges: _, ...base } = content.lab.seeThrough;
    const tune = difference(base, see);
    byId('see-snippet').textContent =
      tune === undefined ? 'As in models/shader-lab.jsonnet.' : `seeThrough+: ${jsonnet(tune)}`;
  };
  fillSliders(
    byId('see'),
    slidersOf(fields),
    (path) => Number(valueAt(see, path)),
    (path, value) => {
      see = withValue(see, path, value);
      seeSnippet();
    },
  );
  seeSnippet();
};

const remember = () => history.replaceState(null, '', `?${params}`);

// ---- live content and code ----

const adopt = (message: ContentMessage) => {
  if ('error' in message) {
    problem('content', `Content did not compile:\n${message.error}`);
    return false;
  }
  try {
    content = parseContent(message, kinds().schema.SurfaceSchema);
  } catch (error) {
    problem('content', `Content does not fit its schema: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
  problems.delete('content');
  showProblems();
  const { ranges: _, ...base } = content.lab.seeThrough;
  see = base;
  return true;
};

// A content edit retunes what wears a kind it already wore and recompiles what changed kind; pieces, ground and lights
// are rebuilt, the model and the cameras stay.
const onContent = (message: ContentMessage) => {
  if (!adopt(message)) return;
  clearProblems();
  placePieces();
  materials.retune(content);
  cameras.configure(content.lab.camera);
  useStage(params.get('stage') ?? 'showcase');
  fillStages();
  fillSurfaces();
  fillSee();
};

const fillStages = () =>
  fillSelect(
    byId('stage'),
    Object.entries(content.lab.stages).map(([id, { title }]) => [id, title]),
    params.get('stage') ?? 'showcase',
  );

onKindsUpdate(() => {
  clearProblems();
  materials.reload();
  fillSurfaces();
  fillSee();
});

// ---- the frame loop ----

const timer = new Timer();
const torchAt = new Vector3();
const resize = () => {
  const { clientWidth: width, clientHeight: height } = canvas;
  if (canvas.width === Math.round(width * devicePixelRatio) && canvas.height === Math.round(height * devicePixelRatio))
    return;
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
};

// A frame at `time`, in milliseconds, or now; a step longer than a tenth of a second, as after a hidden tab, is cut short.
const draw = (time?: number) => {
  resize();
  timer.update(time);
  cameras.update(Math.min(timer.getDelta(), 0.1));
  const inputs: LeafInputs = { ...cameras.inputs(), ...see };
  materials.feed(inputs);
  if (lit.torch !== undefined) {
    if (cameras.mode === 'orbit') torchAt.copy(camera.position);
    else
      torchAt
        .copy(cameras.feet)
        .add(new Vector3(...lit.torch.offset).applyAxisAngle(new Vector3(0, 1, 0), cameras.yaw));
    lit.torch.light.position.copy(torchAt);
  }
  try {
    renderer.render(lit.scene, camera);
  } catch (error) {
    // A patch that cannot find its hook throws while three compiles, as it would in the game.
    problem('render', `Drawing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ---- the page's own API, which the browser test and the screenshot script drive ----

const isMode = (mode: string | null): mode is CameraMode => CAMERA_MODES.includes(mode as CameraMode);

const useCamera = (mode: CameraMode) => {
  cameras.use(mode);
  if (mode === 'orbit') frame(camera, model, cameras.target);
  params.set('camera', mode);
  remember();
  byId<HTMLSelectElement>('camera').value = mode;
};

const lab = {
  /** The problems on the page now. */
  problems: () => [...problems.values()],
  /** The worn materials' labels, in the surface picker's order. */
  worn: () => materials.under(world).map(({ label, surface }) => ({ label, kind: surface?.kind })),
  async model(id: string) {
    const entry = entries.find((each) => each.id === id);
    if (entry === undefined) throw new Error(`models.json has no model ${id}`);
    await showModel(entry);
  },
  stage(id: string) {
    useStage(id);
    byId<HTMLSelectElement>('stage').value = id;
  },
  camera(mode: CameraMode, feet?: [number, number, number], yaw = 0, pitch = 0) {
    useCamera(mode);
    if (feet !== undefined) cameras.place(feet, yaw, pitch);
  },
  /** Orbits about `at`, seen from `from`. */
  look(from: [number, number, number], at: [number, number, number]) {
    useCamera('orbit');
    camera.position.set(...from);
    cameras.target.set(...at);
  },
  /** Sets a number of the surface worn by the material labelled `label`. */
  tune(label: string, path: readonly string[], value: number) {
    const worn = materials.under(world).find((each) => each.label === label);
    if (worn?.surface === undefined) throw new Error(`no surface on ${label}`);
    materials.show(worn, withValue(worn.surface, path, value));
    if (worn === chosen) fillLook();
  },
  /** Sets one of the see-through inputs. */
  see(name: keyof See, value: number) {
    see = { ...see, [name]: value };
    fillSee();
  },
  /** Draws a frame now, so a picture taken next shows every change made before it. */
  draw: () => draw(),
};

declare global {
  interface Window {
    shaderLab: typeof lab & { ready: Promise<void> };
  }
}

const start = async () => {
  const [catalogue, message] = await Promise.all([
    fetch('models.json').then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<{ models: Entry[] }>;
    }),
    fetch(CONTENT_PATH).then((response) => response.json() as Promise<ContentMessage>),
  ]);
  if (!adopt(message)) throw new Error('the lab content did not load');
  registerModels(catalogue.models);
  entries = catalogue.models;
  cameras = new Cameras(camera, canvas, content.lab.camera);
  world.add(model, cameras.marker);
  placePieces();
  useStage(params.get('stage') ?? 'showcase');
  fillStages();
  fillSelect(
    byId('camera'),
    CAMERA_MODES.map((mode) => [mode, { orbit: 'Orbit', first: 'First person', third: 'Third person' }[mode]]),
    'orbit',
  );
  fillSee();
  pickModel();
  const first = entries.find(({ id }) => id === (params.get('model') ?? content.lab.model)) ?? entries[0];
  if (first !== undefined) await showModel(first);
  const mode = params.get('camera');
  if (isMode(mode)) useCamera(mode);

  byId('search').addEventListener('input', pickModel);
  byId<HTMLSelectElement>('model').addEventListener('change', (event) => {
    const entry = entries.find(({ id }) => id === (event.target as HTMLSelectElement).value);
    if (entry !== undefined) void showModel(entry);
  });
  byId<HTMLSelectElement>('stage').addEventListener('change', (event) =>
    useStage((event.target as HTMLSelectElement).value),
  );
  byId<HTMLSelectElement>('camera').addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (isMode(value)) useCamera(value);
  });
  byId<HTMLSelectElement>('surface').addEventListener('change', (event) => {
    chosen = materials.under(world)[Number((event.target as HTMLSelectElement).value)];
    fillLook();
  });
  import.meta.hot?.on(CONTENT_EVENT, onContent);
  renderer.setAnimationLoop(draw);
};

window.shaderLab = {
  ...lab,
  // Resolves either way: a lab that did not start says why among its problems.
  ready: start().catch((error: unknown) => {
    problem('start', `The lab did not start: ${error instanceof Error ? error.message : String(error)}`);
  }),
};
