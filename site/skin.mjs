// The camera skin check: how much of the body a garment is meant to cover a camera sees from each review view, counted
// in pixels. The probe (clearance.mjs) says where the body leaves its garment and by how far; this says whether that
// shows, from the views a sheet is reviewed from, for a coincident face as much as for a poke.
//
// The covered surface (clearance.mjs, `coveredSurface`) is drawn on a layer of its own over the figure drawn flat, in
// a colour nothing else is drawn in, nudged towards the camera by a pixel's depth step, so a face it shares with the
// doll part beneath, or with a garment, draws as showing: a tie is what a coincident face shows as.
// The views are drawn without antialiasing, so a pixel shows or it does not, and with the camera's depth range held to
// the figure, so the depth buffer resolves a garment standing off the body by far less than a pixel.
import * as THREE from 'three';
import { viewSet } from './lookOptions.mjs';
import { frame } from './render.mjs';
import { startTile } from './tile.mjs';

const SKIN_LAYER = 1;
const SHOWING = [255, 0, 0];
const showingMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color().setRGB(...SHOWING.map((c) => c / 255)),
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const figureMaterial = new THREE.MeshLambertMaterial({ color: 0xb4b0a8 });

/**
 * Adds the covered surface to the figure, riding its joints on the skin layer: for each body part of `surface`, the
 * triangles of its covered samples. `figure` is the posing page's (pose.mjs, `buildFigure`), still at rest.
 */
export function addCoveredSkin(figure, surface) {
  for (const { bone, samples } of surface) {
    const shown = samples.filter(({ cover }) => cover >= 0);
    if (shown.length === 0) continue;
    const positions = shown.flatMap(({ corners }) => corners.flat());
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry, showingMaterial);
    mesh.layers.set(SKIN_LAYER);
    figure.bones.get(bone).joint.attach(mesh);
  }
}

let drawer;

function makeMaskDrawer() {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.8));
  return { renderer, scene, camera: new THREE.PerspectiveCamera(30, 1, 0.01, 100) };
}

// One view of `obj` as RGBA rows, top row first, with how many of its pixels show the covered skin.
function maskView({ renderer, scene, camera }, obj, direction, size) {
  frame(camera, obj, new THREE.Vector3(), direction);
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const distance = camera.position.distanceTo(sphere.center);
  camera.near = Math.max(distance - sphere.radius, distance / 100);
  camera.far = distance + sphere.radius;
  camera.updateProjectionMatrix();
  // Stored as sRGB, as the screen shows it, so the grey figure reads; pure red is the same either way.
  const target = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  renderer.setRenderTarget(target);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  camera.layers.set(0);
  scene.overrideMaterial = figureMaterial;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
  camera.layers.set(SKIN_LAYER);
  renderer.autoClear = false;
  renderer.render(scene, camera);
  renderer.autoClear = true;
  const pixels = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
  renderer.setRenderTarget(null);
  target.dispose();
  let showing = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === SHOWING[0] && pixels[i + 1] === SHOWING[1] && pixels[i + 2] === SHOWING[2]) showing++;
  const rows = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < size; y++) rows.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  return { rows, showing };
}

/**
 * The skin check of `obj`, a figure with its covered skin added and posed, from the views of the set `views`: for each
 * view { name, showing }, the covered skin's pixels at `size` pixels a side, and the masks as a tile, a PNG data URL,
 * with the covered skin that shows in red over the figure in grey.
 */
export function skinCheck(obj, size, views) {
  drawer ??= makeMaskDrawer();
  const { tile, g } = startTile(size, 2, 2);
  drawer.scene.add(obj);
  const counted = viewSet(views).map(([name, direction], i) => {
    const { rows, showing } = maskView(drawer, obj, new THREE.Vector3(...direction), size);
    const [x, y] = [(i % 2) * size, Math.floor(i / 2) * size];
    g.putImageData(new ImageData(rows, size, size), x, y);
    g.fillStyle = '#5b574f';
    g.fillText(`${name}: ${showing} px`, x + 6, y + 6);
    return { name, showing };
  });
  drawer.scene.remove(obj);
  return { views: counted, png: tile.toDataURL('image/png') };
}
