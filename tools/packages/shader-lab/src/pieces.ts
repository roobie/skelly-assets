import { CylinderGeometry, DoubleSide, FrontSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { srgb } from './colour.ts';
import type { Content, Piece } from './content.ts';

// Enough sides that a standing log's bark is judged on a round trunk rather than on its facets.
const CYLINDER_SIDES = 64;

const geometryOf = ({ shape }: Piece) =>
  'quad' in shape
    ? new PlaneGeometry(...shape.quad)
    : new CylinderGeometry(shape.cylinder.radius, shape.cylinder.radius, shape.cylinder.height, CYLINDER_SIDES);

// A piece wearing a finish takes the finish's colour and finish, as an export's material does; one wearing a look takes
// the piece's own. The finish id rides in the material's userData as an export's extras put it there, so the lab finds
// a piece's surface as it finds a model's.
const materialOf = (piece: Piece, { finishes }: Content) => {
  const finish = 'finish' in piece ? finishes[piece.finish] : undefined;
  const [r, g, b] = finish?.colour ?? ('colour' in piece ? piece.colour : [1, 1, 1]);
  const material = new MeshStandardMaterial({
    name: piece.title,
    metalness: finish?.finish.metallic ?? 0,
    roughness: finish?.finish.roughness ?? ('roughness' in piece ? piece.roughness : 1),
    side: 'quad' in piece.shape ? DoubleSide : FrontSide,
  });
  material.color.copy(srgb([r, g, b]));
  if ('finish' in piece) material.userData = { materialId: piece.finish };
  return material;
};

/** The lab's test pieces, each at its place, casting and taking shadows. */
export const buildPieces = (content: Content) => {
  const group = new Group();
  for (const piece of content.lab.pieces) {
    const mesh = new Mesh(geometryOf(piece), materialOf(piece, content));
    mesh.name = piece.id;
    mesh.userData = { piece };
    mesh.position.set(...piece.at);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
};

/** The ground the model and the pieces stand on, so their shadows have somewhere to fall. */
export const buildGround = ({ lab: { ground } }: Content) => {
  const material = new MeshStandardMaterial({ name: 'ground', roughness: ground.roughness, metalness: 0 });
  material.color.copy(srgb(ground.colour));
  const mesh = new Mesh(new PlaneGeometry(ground.size, ground.size), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
};
