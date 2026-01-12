import * as THREE from "three";

function rand(min, max) { return min + Math.random() * (max - min); }
function randomPointInDisc(radius) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    return new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r);
}

export function createWanderController({
    avatarCtrl,
    radius = 2.5,
    speed = 0.35,
    arriveDistance = 0.06,
    idleMin = 0.6,
    idleMax = 1.4,
    y = 0,
    rotateLerp = 0.15,
} = {}) {
    const obj = avatarCtrl.avatar;
    const target = new THREE.Vector3();
    let active = false;

    let state = "idle";
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

        const vx = dx / dist;
        const vz = dz / dist;

        pos.x += vx * speed * dt;
        pos.z += vz * speed * dt;
        pos.y = y;

        const targetYaw = Math.atan2(vx, vz);
        obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, targetYaw, rotateLerp);
    }

    return { start, stop, update };
}
