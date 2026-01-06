import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadAnimatedAvatar(url) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  return { gltf };
}

function pickAction(actionsByName, keywords) {
  const entries = Object.entries(actionsByName);
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    for (const [name, action] of entries) {
      if (name.toLowerCase().includes(k)) return action;
    }
  }
  return entries.length ? entries[0][1] : null;
}

export function createAvatarController({
  sceneGroup, // anchor.group を渡す
  gltf,
  preferredIdleKeywords = ["idle"],
  initialTransform = { scale: 1.0, position: [0, 0, 0] },
}) {
  const avatar = gltf.scene;
  avatar.visible = false;

  avatar.scale.setScalar(initialTransform.scale ?? 1.0);
  const [x, y, z] = initialTransform.position ?? [0, 0, 0];
  avatar.position.set(x, y, z);

  sceneGroup.add(avatar);

  const clipNames = (gltf.animations ?? []).map((a) => a.name);

  let mixer = null;
  const actions = {};
  let activeAction = null;

  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(avatar);
    for (const clip of gltf.animations) {
      actions[clip.name] = mixer.clipAction(clip);
    }
    activeAction = pickAction(actions, preferredIdleKeywords);
  }

  function show() {
    avatar.visible = true;
  }

  function hide() {
    avatar.visible = false;
  }

  function fadeTo(action, duration = 0.2) {
    if (!action) return;
    action.reset().fadeIn(duration).play();
    if (activeAction && activeAction !== action) activeAction.fadeOut(duration);
    activeAction = action;
  }

  function playIdle() {
    if (!mixer) return;
    const idle = pickAction(actions, preferredIdleKeywords);
    fadeTo(idle, 0.15);
  }

  function playWalk() {
    if (!mixer) return;
    // walk/run系を優先、なければ先頭クリップ
    const walk = pickAction(actions, ["walk", "run", "move"]);
    fadeTo(walk, 0.15);
  }


  function stopAll() {
    if (!mixer) return;
    Object.values(actions).forEach((a) => a.stop());
  }

  function update(dt) {
    if (!mixer) return;
    mixer.update(dt);
  }

  return {
    avatar,
    mixer,
    actions,
    clipNames,
    show,
    hide,
    playIdle,
    playWalk,
    stopAll,
    update,
  };
}
