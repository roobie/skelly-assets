import {
  Box3,
  Color,
  DirectionalLight,
  GridHelper,
  type Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createOrbitControls } from './orbit.ts';

/**
 * A soft room for physically based surfaces to reflect: a metal shows only its surroundings, so without one it draws
 * black where an offline render shows steel. The target holds the texture's framebuffers, so the caller disposes the
 * target, not its texture, once nothing draws with it.
 */
export const roomEnvironment = (renderer: WebGLRenderer): WebGLRenderTarget => {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = generator.fromScene(room, 0.04);
  room.dispose();
  generator.dispose();
  return target;
};

export const createPreview = (canvas: HTMLCanvasElement) => {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(globalThis.devicePixelRatio);
  const scene = new Scene();
  scene.background = new Color(0x20_25_2b);
  // The room lights every surface from all round, so it stands in for an ambient light, which on top of it would wash
  // the surfaces out. The preview draws for the page's whole life, so its environment is never released.
  scene.environment = roomEnvironment(renderer).texture;
  const light = new DirectionalLight(0xff_ff_ff, 3);
  light.position.set(1, 2, 3);
  scene.add(light, new GridHelper(1, 20, 0x59_62_6d, 0x34_3d_48));
  const camera = new PerspectiveCamera(40, 1, 0.0001, 100);
  const controls = createOrbitControls(camera, canvas);
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  const frame = (object: Object3D) => {
    const bounds = new Box3().setFromObject(object);
    const target = bounds.getCenter(new Vector3());
    const distance = bounds.getSize(new Vector3()).length() / Math.sin((camera.fov * Math.PI) / 360);
    controls.target.copy(target);
    camera.position.copy(target).add(new Vector3(1, 0.7, 1).normalize().multiplyScalar(distance));
    camera.near = distance / 1000;
    camera.far = distance * 1000;
    camera.updateProjectionMatrix();
    controls.update();
  };
  /** Turns the camera about `centre`, keeping its distance and angles, which the author may have set since the frame. */
  const orbitAbout = (centre: readonly [number, number, number]) => {
    const shift = new Vector3(...centre).sub(controls.target);
    controls.target.add(shift);
    camera.position.add(shift);
    controls.update();
  };
  return { scene, frame, orbitAbout };
};
