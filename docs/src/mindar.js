import * as THREE from "three";
import { MindARThree } from "mindar-image-three";

export async function createMindARSession({
  container,
  imageTargetSrc,
  filterMinCF = 0.001,
  filterBeta = 1000,
  debugPlane = null, // {w,h,opacity}
} = {}) {
  const mindarThree = new MindARThree({
    container,
    imageTargetSrc,
    filterMinCF,
    filterBeta,
  });

  const { renderer, scene, camera } = mindarThree;
  const anchor = mindarThree.addAnchor(0);

  // 任意：ターゲット上デバッグPlane
  if (debugPlane?.w && debugPlane?.h) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(debugPlane.w, debugPlane.h),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: debugPlane.opacity ?? 0.0,
      })
    );
    anchor.group.add(p);
  }

  let updateFn = null;
  let animating = false;
  const clock = new THREE.Clock();

  function setUpdate(fn) {
    updateFn = fn;
  }

  function setAnimating(flag) {
    animating = !!flag;
  }

  function loop() {
    if (!animating) return;
    const dt = clock.getDelta();
    updateFn?.(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  async function start() {
    await mindarThree.start();
    clock.getDelta();
    animating = true;
    requestAnimationFrame(loop);
  }

  function stop() {
    animating = false;
    mindarThree.stop();
  }

  return {
    mindarThree,
    renderer,
    scene,
    camera,
    anchor,
    domElement: renderer.domElement,
    start,
    stop,
    setUpdate,
    setAnimating,
  };
}
