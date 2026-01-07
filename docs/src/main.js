import { createMindARSession } from "./mindar.js";
import { loadAnimatedAvatar, createAvatarController } from "./avatar.js";
import { bindUI, ensurePossessButton, showPossessButtonAt, hidePossessButton } from "./ui.js?v=3";
import { setStatus } from "./utils.js";
import { createWanderController } from "./wander.js";
import * as THREE from "three";



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
    avatar: { scale: 0.4, position: [1.2, -5, 5] },

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

    ensurePossessButton({
        onClick: () => {
            setStatus(CONFIG.statusId, "status: 憑依ボタン押下（ここに憑依処理を追加）");
        },
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

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let targetVisible = false;

    // canvas上のタップ座標 → NDCに変換してRaycast
    function onPointerDown(e) {
        if (!targetVisible) return;

        const rect = session.domElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        ndc.set(x * 2 - 1, -(y * 2 - 1));
        raycaster.setFromCamera(ndc, session.camera);

        // ターゲット面（hitPlane）に当たったら「憑依」ボタン表示
        const hits = raycaster.intersectObject(session.hitPlane, true);
        if (hits.length > 0) {
            showPossessButtonAt(e.clientX, e.clientY);
        }
    }

    // pointerイベント（スマホ/PC両対応）
    session.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });

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
    console.log("Animation clips:", avatarCtrl.clipNames);

    // 3) ターゲット検出イベント（FOUND/LOST）
    session.anchor.onTargetFound = () => {
        setStatus(CONFIG.statusId, "status: target FOUND");
        avatarCtrl.show();
        wander.start();
        session.setAnimating(true);
        // ボタンは「タップしたら出す」ので、FOUND時は一旦隠す
        // hidePossessButton();
        // ★テスト：強制的にボタン表示
        showPossessButtonAt(window.innerWidth / 2, window.innerHeight - 120);
    };

    session.anchor.onTargetLost = () => {
        setStatus(CONFIG.statusId, "status: target LOST");
        wander.stop();
        avatarCtrl.hide();
        avatarCtrl.stopAll();         // 「一時停止したい」なら stopAll を pause に置換してもOK
        session.setAnimating(false);
        hidePossessButton(); // ←LOSTで確実に消す
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
        wander.update(dt);
        avatarCtrl.update(dt);
    });

    setStatus(CONFIG.statusId, "status: ready (press Start)");
}

bootstrap().catch((e) => {
    console.error(e);
    alert(e?.message ?? String(e));
});
