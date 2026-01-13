import * as THREE from "three";

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

export function createPossessController({
    avatarCtrl,
    anchorGroup,
    approachOffset = new THREE.Vector3(0, 0, 0.35),
    moveSpeed = 1.0,
    arriveDistance = 0.06,
    possessDuration = 0.9,
} = {}) {
    const avatar = avatarCtrl.avatar;

    // ★憑依開始直前の状態を保存して復元する
    const prePos = new THREE.Vector3();
    const preRot = new THREE.Euler();
    const preScale = new THREE.Vector3();
    let hasPreTransform = false;

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.02, 12, 48),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    anchorGroup.add(ring);

    const glow = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 48),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.visible = false;
    anchorGroup.add(glow);

    let active = false;
    let phase = "idle";
    let tPossess = 0;

    const targetPos = new THREE.Vector3();
    const dir = new THREE.Vector3();

    let onStartCb = null;
    let onDoneCb = null;

    function onStart(fn) { onStartCb = fn; }
    function onDone(fn) { onDoneCb = fn; }

    function start() {
        if (!avatar.visible) return;

        // ★開始直前の状態を保存
        prePos.copy(avatar.position);
        preRot.copy(avatar.rotation);
        preScale.copy(avatar.scale);
        hasPreTransform = true;

        avatar.visible = true;

        active = true;
        phase = "move";
        tPossess = 0;

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
        active = false;
        phase = "idle";
        tPossess = 0;

        ring.visible = false;
        glow.visible = false;
        ring.material.opacity = 0.0;
        glow.material.opacity = 0.0;

        // ★憑依前に復元
        if (hasPreTransform) {
            avatar.position.copy(prePos);
            avatar.rotation.copy(preRot);
            avatar.scale.copy(preScale);
        }
    }

    function isActive() { return active; }

    function update(dt) {
        if (!active) return;

        targetPos.copy(approachOffset);

        if (phase === "move") {
            dir.subVectors(targetPos, avatar.position);
            const dist = dir.length();

            ring.material.opacity = Math.min(0.55, ring.material.opacity + dt * 0.8);
            glow.material.opacity = Math.min(0.35, glow.material.opacity + dt * 0.6);

            if (dist > 1e-4) {
                const vx = dir.x / dist;
                const vz = dir.z / dist;
                const yaw = Math.atan2(vx, vz);
                avatar.rotation.y = lerp(avatar.rotation.y, yaw, 0.18);
            }

            if (dist <= arriveDistance) {
                phase = "possess";
                tPossess = 0;

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

        // possess
        tPossess += dt;
        const t = Math.min(1, tPossess / possessDuration);
        const e = easeOutCubic(t);

        ring.scale.setScalar(lerp(1.0, 1.8, e));
        glow.scale.setScalar(lerp(1.0, 2.3, e));
        ring.material.opacity = lerp(0.6, 0.0, e);
        glow.material.opacity = lerp(0.35, 0.0, e);

        const s = lerp(1.0, 0.05, e);
        // ★憑依開始時のスケール基準で縮小（preScale）
        avatar.scale.copy(preScale).multiplyScalar(s);

        if (t >= 1.0) {
        // ★次回のFOUNDに備えて、憑依前に戻してから消す
            if (hasPreTransform) {
                avatar.position.copy(prePos);
                avatar.rotation.copy(preRot);
                avatar.scale.copy(preScale);
            }

            avatar.visible = false;
            ring.visible = false;
            glow.visible = false;

            active = false;
            phase = "idle";

            onDoneCb?.();
        }
    }

    return { start, stopAndReset, isActive, update, onStart, onDone };
}
