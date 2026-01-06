import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

export async function createMindARSession({
  container,
  imageTargetSrc,
  filterMinCF = 0.001,
  filterBeta = 1000,
  debugPlane = { w: 1, h: 0.7, opacity: 0.15 },
}) {
  const mindarThree = new MindARThree({
    container,
    imageTargetSrc,
    maxTrack: 1,
    filterMinCF,
    filterBeta,
  });

  const { renderer, scene, camera } = mindarThree;

  // ライト（glbが暗くなるのを避ける）
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  // ターゲット0番のアンカー
  const anchor = mindarThree.addAnchor(0);

  // 認識確認用プレーン（任意）
  const debug = new THREE.Mesh(
    new THREE.PlaneGeometry(debugPlane.w, debugPlane.h),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: debugPlane.opacity })
  );
  anchor.group.add(debug);

  // ループ制御
  const clock = new THREE.Clock();
  let updateFn = null;
  let animating = true; // target found時だけtrueにするなど

  function setUpdate(fn) {
    updateFn = fn;
  }

  function setAnimating(v) {
    animating = v;
  }

  async function start() {
    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      if (animating && updateFn) updateFn(dt);
      renderer.render(scene, camera);
    });
  }

  function stop() {
    mindarThree.stop();
    renderer.setAnimationLoop(null);
  }

  return {
    mindarThree,
    renderer,
    scene,
    camera,
    anchor,
    start,
    stop,
    setUpdate,
    setAnimating,
  };
}
