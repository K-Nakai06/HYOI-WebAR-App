import { createMindARSession } from "./mindar.js";
import { loadAnimatedAvatar, createAvatarController } from "./avatar.js";
import { bindUI, ensurePossessButton, setPossessEnabled, setPossessLabel } from "./ui.js?v=7";
import { setStatus } from "./utils.js";
import { createWanderController } from "./wander.js";
import { createPossessController } from "./possess.js";
import { loadPartsModel, createPartsController } from "./parts.js";
import * as THREE from "three";

const CONFIG = {
  containerId: "container",
  statusId: "status",
  startBtnId: "startBtn",
  stopBtnId: "stopBtn",

  targetMindPath: "./assets/targets.mind",
  avatarPath: "./assets/Panda.glb",

  // ★追加：パーツモデル（目・耳・しっぽ）
  partsPath: "./assets/parts.glb",

  filterMinCF: 0.001,
  filterBeta: 1000,

  debugPlane: { w: 1.0, h: 0.7, opacity: 0.18 },

  avatar: { scale: 0.4, position: [1.2, -5, 5] },
  preferredIdleKeywords: ["idle", "stand", "breath"],

  // ★追加：パーツの初期位置合わせ（必要なら調整）
  // ターゲットの中心(0,0,0)基準で、少し上に持ち上げる等
  parts: {
    scale: 0.4,
    position: [0, 0.02, 0],     // ←最初は少しだけ上（モデルにより調整）
    rotation: [0, 0, 0],
  },
};

async function bootstrap() {
  const container = document.getElementById(CONFIG.containerId);
  if (!container) throw new Error("container not found");
  container.style.touchAction = "none";

  // 1) MindAR session
  const session = await createMindARSession({
    container,
    imageTargetSrc: CONFIG.targetMindPath,
    filterMinCF: CONFIG.filterMinCF,
    filterBeta: CONFIG.filterBeta,
    debugPlane: CONFIG.debugPlane,
  });

  // 2) Light（PBR黒対策）
  session.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  session.scene.add(dir);

  // 状態
  let isRunning = false;
  let targetVisible = false;

  // 後で作るので宣言だけ
  let wander = null;
  let possess = null;
  let avatarCtrl = null;
  let partsCtrl = null;

  function refreshPossessEnabled() {
    // 憑依中は押させない（parts表示中も押させないならここで制御）
    const possessing = possess?.isActive?.() ?? false;
    const partsShown = partsCtrl?.parts?.visible ?? false;
    setPossessEnabled(isRunning && targetVisible && !possessing && !partsShown);
  }

  // 3) 固定ボタン
  ensurePossessButton({
    onClick: () => {
      if (!isRunning || !targetVisible) return;
      if (!avatarCtrl?.avatar?.visible) return;

      setStatus(CONFIG.statusId, "status: possessing...");
      setPossessLabel("憑依中...");
      setPossessEnabled(false);

      // 放浪停止→憑依開始
      wander.stop();
      possess.start();
    },
  });
  setPossessEnabled(false);

  // 4) avatar load
  setStatus(CONFIG.statusId, "status: loading avatar...");
  const avatarAsset = await loadAnimatedAvatar(CONFIG.avatarPath);

  avatarCtrl = createAvatarController({
    sceneGroup: session.anchor.group,
    gltf: avatarAsset.gltf,
    preferredIdleKeywords: CONFIG.preferredIdleKeywords,
    initialTransform: CONFIG.avatar,
  });

  wander = createWanderController({
    avatarCtrl,
    radius: 2.5,
    speed: 0.35,
    arriveDistance: 0.06,
    idleMin: 0.6,
    idleMax: 1.4,
    y: 0,
  });

  // 5) parts load（★追加）
  setStatus(CONFIG.statusId, "status: loading parts...");
  const partsAsset = await loadPartsModel(CONFIG.partsPath);

  partsCtrl = createPartsController({
    sceneGroup: session.anchor.group,
    gltf: partsAsset.gltf,
    initialTransform: CONFIG.parts,
    autoHide: true,
  });

  // 6) possess controller
  possess = createPossessController({
    avatarCtrl,
    anchorGroup: session.anchor.group,
    approachOffset: new THREE.Vector3(0, 0, 0.35),
    moveSpeed: 1.2,
    arriveDistance: 0.06,
    possessDuration: 0.9,
  });

  // 憑依完了 → パーツ表示（★ここがメイン）
  possess.onDone(() => {
    setStatus(CONFIG.statusId, "status: possessed!");
    setPossessLabel("憑依完了");

    // ★パーツだけ残す
    partsCtrl.resetTransform(); // 念のため毎回初期Transformへ
    partsCtrl.show();

    refreshPossessEnabled(); // 押せない状態にしたければこのまま
  });

  setStatus(
    CONFIG.statusId,
    `status: loaded (avatar clips: ${avatarCtrl.clipNames.length}, parts clips: ${partsCtrl.clipNames.length})`
  );

  // 7) target events
  session.anchor.onTargetFound = () => {
    targetVisible = true;
    setStatus(CONFIG.statusId, "status: target FOUND");

    // ターゲット再検出時：まずパーツは隠して、通常状態へ
    partsCtrl.hide();
    partsCtrl.resetTransform();

    // アバター再登場
    avatarCtrl.show();
    wander.start();

    // UI
    setPossessLabel("憑依");
    refreshPossessEnabled();
  };

  session.anchor.onTargetLost = () => {
    targetVisible = false;
    setStatus(CONFIG.statusId, "status: target NOT FOUND");

    // 憑依演出リセット
    possess.stopAndReset();

    // アバター停止＆隠す
    wander.stop();
    avatarCtrl.hide();
    avatarCtrl.stopAll();

    // ★パーツも消す（ターゲットが無いので）
    partsCtrl.hide();
    partsCtrl.resetTransform();

    // UI
    setPossessLabel("憑依");
    refreshPossessEnabled();
  };

  // 8) UI start/stop
  bindUI({
    startBtnId: CONFIG.startBtnId,
    stopBtnId: CONFIG.stopBtnId,
    onStart: async () => {
      setStatus(CONFIG.statusId, "status: starting...");
      await session.start();
      session.setAnimating(true);
      isRunning = true;
      refreshPossessEnabled();
      setStatus(CONFIG.statusId, "status: scanning...");
    },
    onStop: () => {
      isRunning = false;

      session.setAnimating(false);
      session.stop();

      possess.stopAndReset();
      partsCtrl.hide();
      partsCtrl.resetTransform();

      wander.stop();
      avatarCtrl.hide();
      avatarCtrl.stopAll();

      setPossessLabel("憑依");
      refreshPossessEnabled();
      setStatus(CONFIG.statusId, "status: stopped");
    },
  });

  // 9) loop update
  session.setUpdate((dt) => {
    // 憑依中はwander止めてるので任意
    if (!possess.isActive()) wander.update(dt);

    possess.update(dt);
    avatarCtrl.update(dt);

    // ★パーツのアニメ更新（あれば）
    partsCtrl.update(dt);
  });

  setStatus(CONFIG.statusId, "status: ready (press Start)");
}

bootstrap().catch((e) => {
  console.error(e);
  alert(e?.message ?? String(e));
});
