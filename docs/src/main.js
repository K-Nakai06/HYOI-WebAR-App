import { createMindARSession } from "./mindar.js";
import { loadAnimatedAvatar, createAvatarController } from "./avatar.js";
import { bindUI, ensurePossessButton, setPossessEnabled, setPossessLabel } from "./ui.js?v=6";
import { setStatus } from "./utils.js";
import { createWanderController } from "./wander.js";
import { createPossessController } from "./possess.js";
import * as THREE from "three";

const CONFIG = {
  containerId: "container",
  statusId: "status",
  startBtnId: "startBtn",
  stopBtnId: "stopBtn",

  targetMindPath: "./assets/targets.mind",
  avatarPath: "./assets/Panda.glb",

  filterMinCF: 0.001,
  filterBeta: 1000,

  debugPlane: { w: 1.0, h: 0.7, opacity: 0.18 },

  avatar: { scale: 0.4, position: [1.2, -5, 5] },
  preferredIdleKeywords: ["idle", "stand", "breath"],
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

  // 2) ライト（PBRモデル黒対策）
  session.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  session.scene.add(dir);

  // 3) 固定ボタン（FOUND中だけ有効）
  let isRunning = false;
  let targetVisible = false;

  function refreshPossessEnabled() {
    // 憑依中は押させない
    setPossessEnabled(isRunning && targetVisible && !possess?.isActive());
  }

  ensurePossessButton({
    onClick: () => {
      if (!isRunning || !targetVisible) return;

      setStatus(CONFIG.statusId, "status: possessing...");
      setPossessLabel("憑依中...");
      setPossessEnabled(false);

      // 放浪停止 → 憑依開始
      wander.stop();
      possess.start();
    },
  });
  setPossessEnabled(false);

  // 4) avatar load
  setStatus(CONFIG.statusId, "status: loading avatar...");
  const avatarAsset = await loadAnimatedAvatar(CONFIG.avatarPath);

  const avatarCtrl = createAvatarController({
    sceneGroup: session.anchor.group,
    gltf: avatarAsset.gltf,
    preferredIdleKeywords: CONFIG.preferredIdleKeywords,
    initialTransform: CONFIG.avatar,
  });

  const wander = createWanderController({
    avatarCtrl,
    radius: 2.5,
    speed: 0.35,
    arriveDistance: 0.06,
    idleMin: 0.6,
    idleMax: 1.4,
    y: 0,
  });

  // 5) 憑依演出コントローラ
  const possess = createPossessController({
    avatarCtrl,
    anchorGroup: session.anchor.group,
    // ターゲット中心の少し手前に寄せる
    approachOffset: new THREE.Vector3(0, 0, 0.35),
    moveSpeed: 1.2,
    arriveDistance: 0.06,
    possessDuration: 0.9,
  });

  possess.onStart(() => {
    // ここで必要なら効果音なども（後で）
  });

  possess.onDone(() => {
    setStatus(CONFIG.statusId, "status: possessed!");
    setPossessLabel("憑依完了");

    // ここから先は「目/耳/しっぽだけ出す」等の表現へ繋げられます
    // いったんFOUND中は“完了表示”のままにして、LOSTでリセットします
  });

  setStatus(CONFIG.statusId, `status: avatar loaded (clips: ${avatarCtrl.clipNames.length})`);

  // 6) target events
  session.anchor.onTargetFound = () => {
    targetVisible = true;
    setStatus(CONFIG.statusId, "status: target FOUND");

    // アバターを表示して放浪開始（まだ憑依してない状態）
    avatarCtrl.show();
    wander.start();

    // ボタン状態更新
    setPossessLabel("憑依");
    refreshPossessEnabled();
  };

  session.anchor.onTargetLost = () => {
    targetVisible = false;
    setStatus(CONFIG.statusId, "status: target NOT FOUND");

    // 演出リセット
    possess.stopAndReset();

    // アバターを隠す（次にFOUNDしたらまた表示）
    wander.stop();
    avatarCtrl.hide();
    avatarCtrl.stopAll();

    // UIもリセット
    setPossessLabel("憑依");
    refreshPossessEnabled();
  };

  // 7) UI start/stop（ループ制御はここ）
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
      wander.stop();
      avatarCtrl.hide();
      avatarCtrl.stopAll();

      setPossessLabel("憑依");
      refreshPossessEnabled();

      setStatus(CONFIG.statusId, "status: stopped");
    },
  });

  // 8) loop update
  session.setUpdate((dt) => {
    // 憑依中は wander を止めているので、updateしても実害はないが一応分岐
    if (!possess.isActive()) {
      wander.update(dt);
    }
    possess.update(dt);
    avatarCtrl.update(dt);

    // ボタン状態を憑依の終了タイミングで戻したい場合はここで
    // （完了後は「憑依完了」のままにしてるので、今回は戻さない）
  });

  setStatus(CONFIG.statusId, "status: ready (press Start)");
}

bootstrap().catch((e) => {
  console.error(e);
  alert(e?.message ?? String(e));
});
