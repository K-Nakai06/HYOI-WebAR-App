import { createMindARSession } from "./mindar.js";
import { loadAnimatedAvatar, createAvatarController } from "./avatar.js";
import { bindUI, ensurePossessButton, setPossessEnabled, setPossessLabel } from "./ui.js?v=5";
import { setStatus } from "./utils.js";
import { createWanderController } from "./wander.js";
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

     // スマホでのジェスチャ競合を避ける
    container.style.touchAction = "none";

    // 1) MindAR session
    const session = await createMindARSession({
        container,
        imageTargetSrc: CONFIG.targetMindPath,
        filterMinCF: CONFIG.filterMinCF,
        filterBeta: CONFIG.filterBeta,
        debugPlane: CONFIG.debugPlane,
    });

    // 2) ライト追加（黒くなる対策）
    session.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(1, 2, 1);
    session.scene.add(dir);

    // 3) 固定「憑依」ボタン（常時表示・FOUND中だけ有効）
    ensurePossessButton({
        onClick: () => {
            // ここに「憑依開始」処理を後で入れる
            setStatus(CONFIG.statusId, "status: 憑依開始（ダミー）");
            setPossessLabel("憑依中...");
            setTimeout(() => setPossessLabel("憑依"), 800);
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

    setStatus(CONFIG.statusId, `status: avatar loaded (clips: ${avatarCtrl.clipNames.length})`);

    // 5) 状態管理（Start後＆FOUND中だけボタンを有効に）
    let isRunning = false;
    let targetVisible = false;

    function refreshPossessEnabled() {
        setPossessEnabled(isRunning && targetVisible);
    }

    // 6) target events
    session.anchor.onTargetFound = () => {
        targetVisible = true;
        refreshPossessEnabled();
        setStatus(CONFIG.statusId, "status: target FOUND");
        avatarCtrl.show();
        wander.start();
    };

    session.anchor.onTargetLost = () => {
        targetVisible = false;
        refreshPossessEnabled();
        setStatus(CONFIG.statusId, "status: target NOT FOUND");
        wander.stop();
        avatarCtrl.hide();
        avatarCtrl.stopAll();
    };

    // 7) UI start/stop（ループ制御はここだけ）
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
            refreshPossessEnabled();

            session.setAnimating(false);
            session.stop();

            wander.stop();
            avatarCtrl.hide();
            avatarCtrl.stopAll();

            setStatus(CONFIG.statusId, "status: stopped");
        },
    });

    // 8) loop update
    session.setUpdate((dt) => {
        wander.update(dt);
        avatarCtrl.update(dt);
    });

    setStatus(CONFIG.statusId, "status: ready (press Start)");
}

bootstrap().catch((e) => {
    console.error(e);
    alert(e?.message ?? String(e));
});
