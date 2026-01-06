import { createMindARSession } from "./mindar.js";
import { loadAnimatedAvatar, createAvatarController } from "./avatar.js";
import { bindUI } from "./ui.js";
import { setStatus } from "./utils.js";

const CONFIG = {
    containerId: "container",
    statusId: "status",
    startBtnId: "startBtn",
    stopBtnId: "stopBtn",

    // assets
    targetMindPath: "./assets/targets.mind",
    avatarPath: "./assets/Panda.glb",

    // MindAR tuning（必要に応じて調整）
    filterMinCF: 0.001,
    filterBeta: 1000,

    // ターゲット面サイズ（デバッグ用プレーン）
    debugPlane: { w: 1.0, h: 0.7, opacity: 0.18 },

    // アバター初期変換
    avatar: { scale: 0.4, position: [1.2, 0, 0.6] },

    // アニメ名のヒント（なければ先頭を使う）
    preferredIdleKeywords: ["idle", "stand", "breath"],
};

async function bootstrap() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) throw new Error("container not found");

    // 1) MindARセッションを作る
    const session = await createMindARSession({
        container,
        imageTargetSrc: CONFIG.targetMindPath,
        filterMinCF: CONFIG.filterMinCF,
        filterBeta: CONFIG.filterBeta,
        debugPlane: CONFIG.debugPlane,
    });

    // 2) アバター読み込み & 制御器作成
    setStatus(CONFIG.statusId, "status: loading avatar...");
    const avatarAsset = await loadAnimatedAvatar(CONFIG.avatarPath);
    const avatarCtrl = createAvatarController({
        sceneGroup: session.anchor.group,
        gltf: avatarAsset.gltf,
        preferredIdleKeywords: CONFIG.preferredIdleKeywords,
        initialTransform: CONFIG.avatar,
    });
    setStatus(CONFIG.statusId, `status: avatar loaded (clips: ${avatarCtrl.clipNames.length})`);
    console.log("Animation clips:", avatarCtrl.clipNames);

    // 3) ターゲット検出イベント（FOUND/LOST）
    session.anchor.onTargetFound = () => {
        setStatus(CONFIG.statusId, "status: target FOUND");
        avatarCtrl.show();
        avatarCtrl.playIdle();
        session.setAnimating(true);
    };

    session.anchor.onTargetLost = () => {
        setStatus(CONFIG.statusId, "status: target LOST");
        avatarCtrl.hide();
        avatarCtrl.stopAll();         // 「一時停止したい」なら stopAll を pause に置換してもOK
        session.setAnimating(false);
    };

    // 4) UI（Start/Stop）
    bindUI({
        startBtnId: CONFIG.startBtnId,
        stopBtnId: CONFIG.stopBtnId,
        onStart: async () => {
            setStatus(CONFIG.statusId, "status: starting...");
            await session.start();
            setStatus(CONFIG.statusId, "status: scanning...");
        },
        onStop: () => {
        session.stop();
        avatarCtrl.hide();
        avatarCtrl.stopAll();
        setStatus(CONFIG.statusId, "status: stopped");
        },
    });

    // 5) ループ：mixer更新 + render
    session.setUpdate((dt) => {
        avatarCtrl.update(dt);
    });

    setStatus(CONFIG.statusId, "status: ready (press Start)");
}

bootstrap().catch((e) => {
    console.error(e);
    alert(e?.message ?? String(e));
});
