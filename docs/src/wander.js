import * as THREE from "three";

function rand(min, max) {
    return min + Math.random() * (max - min);
}

// 半径Rの円内で一様にランダム点を作る（XZ平面）
function randomPointInDisc(radius) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    return new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r);
}

export function createWanderController({
    avatarCtrl,
    radius = 1.2,           // 歩き回る半径（ターゲット座標系）
    speed = 0.35,           // 移動速度（座標/秒）
    arriveDistance = 0.06,  // 目的地に着いた判定
    idleMin = 0.6,          // 立ち止まる最短秒
    idleMax = 1.4,          // 立ち止まる最長秒
    y = 0,                  // 高さ固定（必要なら調整）
    rotateLerp = 0.15,      // 向きの追従（0〜1）
} = {}) {
    const obj = avatarCtrl.avatar; // THREE.Object3D
    const target = new THREE.Vector3();
    let active = false;

    let state = "idle"; // "idle" | "walk"
    let idleTimer = 0;

    function pickNextTarget() {
        const p = randomPointInDisc(radius);
        target.set(p.x, y, p.z);
    }

    function start() {
        active = true;
        state = "idle";
        idleTimer = rand(idleMin, idleMax);
        avatarCtrl.playIdle();
    }

    function stop() {
        active = false;
        state = "idle";
        avatarCtrl.playIdle();
    }

    function update(dt) {
        if (!active) return;

        if (state === "idle") {
            idleTimer -= dt;
            if (idleTimer <= 0) {
                pickNextTarget();
                state = "walk";
                avatarCtrl.playWalk();
            }
            return;
        }

        // walk
        const pos = obj.position;
        const dx = target.x - pos.x;
        const dz = target.z - pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < arriveDistance) {
            state = "idle";
            idleTimer = rand(idleMin, idleMax);
            avatarCtrl.playIdle();
            return;
        }

        // 進行方向
        const vx = dx / dist;
        const vz = dz / dist;

        // 移動
        pos.x += vx * speed * dt;
        pos.z += vz * speed * dt;
        pos.y = y;

        // 向きを進行方向へ（Y回転のみ）
        const targetYaw = Math.atan2(vx, vz); // threeの前方向に合わせる（必要なら符号反転）
        obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, targetYaw, rotateLerp);
    }

    return { start, stop, update };
}
