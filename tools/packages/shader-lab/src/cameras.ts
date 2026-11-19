import { CapsuleGeometry, MathUtils, Mesh, MeshStandardMaterial, type PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { srgb } from './colour.ts';
import type { Lab } from './content.ts';

export const CAMERA_MODES = ['orbit', 'first', 'third'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

const UP = new Vector3(0, 1, 0);
// Short of straight up or down, so the view's direction never meets its up.
const PITCH_LIMIT = Math.PI / 2 - 0.01;

// Each key's walk: forward, right and up, in units of the walk speed.
const KEYS: Readonly<Record<string, readonly [number, number, number]>> = {
  KeyW: [1, 0, 0],
  ArrowUp: [1, 0, 0],
  KeyS: [-1, 0, 0],
  ArrowDown: [-1, 0, 0],
  KeyD: [0, 1, 0],
  ArrowRight: [0, 1, 0],
  KeyA: [0, -1, 0],
  ArrowLeft: [0, -1, 0],
  KeyR: [0, 0, 1],
  KeyF: [0, 0, -1],
};

/**
 * The lab's three cameras: an orbit about the model, a first-person walk at eye height that can climb into a crown,
 * and a third-person follow behind a visible player. The walking two place the player, and so feed the leaf kind the
 * eye and the player a game would; the orbit has no player, so its eye stands in for one.
 */
export class Cameras {
  mode: CameraMode = 'orbit';
  /** The player's feet. */
  readonly feet = new Vector3();
  yaw = 0;
  pitch = 0;
  readonly marker: Mesh;
  private readonly orbit: OrbitControls;
  private readonly held = new Set<string>();
  private drag: { x: number; y: number } | undefined;
  private readonly camera: PerspectiveCamera;
  private settings: Lab['camera'];

  constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement, settings: Lab['camera']) {
    this.camera = camera;
    this.settings = settings;
    this.orbit = new OrbitControls(camera, canvas);
    this.marker = new Mesh(new CapsuleGeometry(), new MeshStandardMaterial({ name: 'player', roughness: 0.6 }));
    this.marker.castShadow = true;
    this.configure(settings);
    canvas.addEventListener('pointerdown', (event) => {
      if (this.mode === 'orbit') return;
      this.drag = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (this.drag === undefined) return;
      this.look((event.clientX - this.drag.x) * this.settings.turn, (event.clientY - this.drag.y) * this.settings.turn);
      this.drag = { x: event.clientX, y: event.clientY };
    });
    const release = () => {
      this.drag = undefined;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    // Keys typed into the panel's fields are not walks.
    const typing = (event: KeyboardEvent) =>
      event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
    addEventListener('keydown', (event) => {
      if (!typing(event) && event.code in KEYS) this.held.add(event.code);
    });
    addEventListener('keyup', (event) => this.held.delete(event.code));
    addEventListener('blur', () => this.held.clear());
  }

  /** Takes new camera content, as a content push brings it. */
  configure(settings: Lab['camera']) {
    this.settings = settings;
    const { radius, height, colour } = settings.player;
    this.marker.geometry.dispose();
    this.marker.geometry = new CapsuleGeometry(radius, Math.max(height - 2 * radius, 0));
    (this.marker.material as MeshStandardMaterial).color.copy(srgb(colour));
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();
  }

  /** The orbit's target, which a model's framing sets. */
  get target() {
    return this.orbit.target;
  }

  /** Switches to `mode`; a walk starts where the orbit looked from, facing the way it looked. */
  use(mode: CameraMode) {
    if (mode !== 'orbit' && this.mode === 'orbit') {
      const direction = this.orbit.target.clone().sub(this.camera.position);
      this.feet.set(this.camera.position.x, 0, this.camera.position.z);
      this.yaw = Math.atan2(-direction.x, -direction.z);
      this.pitch = 0;
    }
    this.mode = mode;
    this.orbit.enabled = mode === 'orbit';
    this.marker.visible = mode === 'third';
    if (mode !== 'orbit') {
      this.camera.near = this.settings.near;
      this.camera.far = this.settings.far;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Puts the player at `feet`, facing `yaw` and looking `pitch` up, in radians. */
  place(feet: readonly [number, number, number], yaw: number, pitch: number) {
    this.feet.set(...feet);
    this.yaw = yaw;
    this.pitch = MathUtils.clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  private look(dx: number, dy: number) {
    this.yaw -= dx;
    this.pitch = MathUtils.clamp(this.pitch - dy, -PITCH_LIMIT, PITCH_LIMIT);
  }

  private facing() {
    return new Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  /** Moves the player by the keys held for `seconds`, then places the camera for the mode. */
  update(seconds: number) {
    if (this.mode === 'orbit') {
      this.orbit.update();
      return;
    }
    // Forward, right and up, summed over the keys held.
    const step = new Vector3();
    for (const code of this.held) step.add(new Vector3(...(KEYS[code] ?? [0, 0, 0])));
    const ahead = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const side = new Vector3().crossVectors(ahead, UP);
    const walk = this.settings.walkSpeed * seconds;
    this.feet
      .addScaledVector(ahead, step.x * walk)
      .addScaledVector(side, step.y * walk)
      .addScaledVector(UP, step.z * walk);
    this.feet.y = Math.max(this.feet.y, 0);
    const eye = this.feet.clone().addScaledVector(UP, this.settings.eyeHeight);
    this.marker.position.copy(this.feet).addScaledVector(UP, this.settings.player.height / 2);
    this.marker.rotation.y = this.yaw;
    const facing = this.facing();
    if (this.mode === 'first') this.camera.position.copy(eye);
    else
      this.camera.position
        .copy(eye)
        .addScaledVector(facing, -this.settings.follow.distance)
        .addScaledVector(UP, this.settings.follow.height);
    this.camera.lookAt(eye.clone().add(facing));
  }

  /** The eye and the player the leaf kind is fed: the camera, and the player's feet, or the eye when there is none. */
  inputs(): { eye: [number, number, number]; player: [number, number, number] } {
    const eye = this.camera.position.toArray();
    return { eye, player: this.mode === 'orbit' ? eye : this.feet.toArray() };
  }
}
