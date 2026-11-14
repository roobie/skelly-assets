import type { FabricDef } from '@skelly/thing-core/materials';
import type { Material, Object3D } from 'three';

export function wearFabric(material: Material, fabric: FabricDef): void;
export function wearFabrics(object: Object3D): void;
