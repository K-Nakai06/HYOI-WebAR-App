import * as THREE from "three";

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function createPossessController({
    avatarCtrl,
    anchorGroup, // session.anchor.group
    approachOffset = new THREE.Vector3(0, 0, 0.35), // ターゲット中心の少し手前
    moveSpeed = 1.0, // 近づく速さ（unit/s）
    arriveDistance = 0.06,
    possessDuration = 0.9, // 演出時間
} = {}) {
    const avatar = avatarCtrl.avatar;

    const baseScale = avatar.scale.clone(); // ★元スケールを保存（重要）


    // 演出用：リング（ターゲット中心）
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.02, 12, 48),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    anchorGroup.add(ring);

    // 演出用：発光っぽい板
    const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 48),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.visible = false;
    anchorGroup.add(glow);

    let active = false;
    let phase = "idle"; // "move" | "possess"
    let tPossess = 0;

    const targetPos = new THREE.Vector3();
    const dir = new THREE.Vector3();

    let onStartCb = null;
    let onDoneCb = null;

    function onStart(fn) { onStartCb = fn; }
    function onDone(fn) { onDoneCb = fn; }

    function start() {
        if (!avatar.visible) return;
        avatar.scale.copy(baseScale); // ★毎回リセット
        avatar.visible = true;        // ★念のため（完了時に消してるので）

        active = true;
        phase = "move";
        tPossess = 0;

        // 「憑依系」アニメがあれば優先、なければ歩きで開始
        avatarCtrl.playWalk();

        ring.visible = true;
        glow.visible = true;
        ring.material.opacity = 0.0;
        glow.material.opacity = 0.0;
        ring.scale.set(1, 1, 1);
        glow.scale.set(1, 1, 1);

        onStartCb?.();
    }

    function stopAndReset() {
        avatar.scale.copy(baseScale); // ★復元
        active = false;
        phase = "idle";
        tPossess = 0;

        ring.visible = false;
        glow.visible = false;
        ring.material.opacity = 0.0;
        glow.material.opacity = 0.0;

        // 戻す
        avatar.scale.setScalar(avatar.scale.x); // noop（ここは必要なら原状保存に変えてOK）
    }

    function isActive() {
        return active;
    }

    function update(dt) {
        if (!active) return;

        // ターゲット中心（anchorローカル原点） + offset に向かう
        targetPos.copy(approachOffset);

        if (phase === "move") {
            dir.subVectors(targetPos, avatar.position);
            const dist = dir.length();

            // 演出をうっすら出す
            ring.material.opacity = Math.min(0.55, ring.material.opacity + dt * 0.8);
            glow.material.opacity = Math.min(0.35, glow.material.opacity + dt * 0.6);

            // 向きだけターゲットへ
            if (dist > 1e-4) {
                const vx = dir.x / dist;
                const vz = dir.z / dist;
                const yaw = Math.atan2(vx, vz);
                avatar.rotation.y = lerp(avatar.rotation.y, yaw, 0.18);
            }

            if (dist <= arriveDistance) {
                phase = "possess";
                tPossess = 0;

                // 「憑依/変身」っぽいアニメがあれば再生、なければidle
                const hasPossess = avatarCtrl.playByKeywords(
                    ["possess", "transform", "magic", "cast", "attack", "skill", "jump"],
                    0.12
                );
                if (!hasPossess) avatarCtrl.playIdle();
                return;
            }

            dir.normalize();
            avatar.position.x += dir.x * moveSpeed * dt;
            avatar.position.y += dir.y * moveSpeed * dt;
            avatar.position.z += dir.z * moveSpeed * dt;
            return;
        }

        // phase === "possess"
        tPossess += dt;
        const t = Math.min(1, tPossess / possessDuration);
        const e = easeOutCubic(t);

        // リング・グローを拡大＆フェード
        ring.scale.setScalar(lerp(1.0, 1.8, e));
        glow.scale.setScalar(lerp(1.0, 2.3, e));
        ring.material.opacity = lerp(0.6, 0.0, e);
        glow.material.opacity = lerp(0.35, 0.0, e);

        // アバターを縮退させて消える（憑依っぽい）
        const s0 = 1.0;
        const s = lerp(s0, 0.05, e);
        avatar.scale.copy(baseScale).multiplyScalar(s); // 相対で縮める

        if (t >= 1.0) {
            avatar.scale.copy(baseScale);
            // 完了：アバターを消す
            avatar.visible = false;

            ring.visible = false;
            glow.visible = false;

            active = false;
            phase = "idle";

            onDoneCb?.();
        }
    }

    return {
        start,
        stopAndReset,
        isActive,
        update,
        onStart,
        onDone,
    };
}
