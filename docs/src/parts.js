import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadPartsModel(url) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  return { gltf };
}

export function createPartsController({
  sceneGroup, // session.anchor.group
  gltf,
  initialTransform = { scale: 2.0, position: [0, -0.3, 0], rotation: [0, 0, 0] },
  autoHide = true,
} = {}) {
  const parts = gltf.scene;

  // transform
  parts.scale.setScalar(initialTransform.scale ?? 1.0);
  const [px, py, pz] = initialTransform.position ?? [0, 0, 0];
  parts.position.set(px, py, pz);

  const [rx, ry, rz] = initialTransform.rotation ?? [0, 0, 0];
  parts.rotation.set(rx, ry, rz);

  parts.visible = !autoHide;
  sceneGroup.add(parts);

  // animation (optional)
  let mixer = null;
  const actions = {};
  const clipNames = (gltf.animations ?? []).map((a) => a.name);

  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(parts);
    for (const clip of gltf.animations) {
      actions[clip.name] = mixer.clipAction(clip);
    }
  }

  function show() {
    parts.visible = true;
    // 何かアニメがあれば全部再生（耳ピク等が入ってる場合に便利）
    if (mixer) Object.values(actions).forEach((a) => a.reset().play());
  }

  function hide() {
    parts.visible = false;
    if (mixer) Object.values(actions).forEach((a) => a.stop());
  }

  function resetTransform() {
    parts.scale.setScalar(initialTransform.scale ?? 1.0);
    const [x, y, z] = initialTransform.position ?? [0, 0, 0];
    parts.position.set(x, y, z);
    const [rx, ry, rz] = initialTransform.rotation ?? [0, 0, 0];
    parts.rotation.set(rx, ry, rz);
  }

  function update(dt) {
    if (!mixer) return;
    if (!parts.visible) return;
    mixer.update(dt);
  }

  return {
    parts,
    mixer,
    actions,
    clipNames,
    show,
    hide,
    resetTransform,
    update,
  };
}
