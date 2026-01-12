export function bindUI({ startBtnId, stopBtnId, onStart, onStop }) {
    const startBtn = document.getElementById(startBtnId);
    const stopBtn = document.getElementById(stopBtnId);

    if (!startBtn) throw new Error("start button not found");
    if (!stopBtn) throw new Error("stop button not found");

    startBtn.addEventListener("click", () => onStart?.());
    stopBtn.addEventListener("click", () => onStop?.());
}

/**
 * 固定表示の「憑依」ボタンを作成（常に表示）
 * - enabled=false のときは押せない見た目＆クリック無効
 */
export function ensurePossessButton({ onClick } = {}) {
    let btn = document.getElementById("possessBtn");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "possessBtn";
    btn.textContent = "憑依";
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "12px";
    btn.style.zIndex = "9999";
    btn.style.pointerEvents = "auto";
    btn.style.padding = "12px 16px";
    btn.style.fontSize = "16px";
    btn.style.borderRadius = "14px";
    btn.style.border = "1px solid rgba(0,0,0,0.15)";
    btn.style.background = "rgba(255,255,255,0.95)";
    btn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";

    // 初期は無効（FOUNDしてから有効化）
    setPossessEnabled(false);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.dataset.enabled !== "true") return; // 念のため
        onClick?.();
    });

    document.body.appendChild(btn);
    return btn;
}

export function setPossessEnabled(enabled) {
    const btn = document.getElementById("possessBtn");
    if (!btn) return;

    btn.dataset.enabled = enabled ? "true" : "false";

    // 見た目と押下可否
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1.0" : "0.45";
    btn.style.filter = enabled ? "none" : "grayscale(0.6)";
}

export function setPossessLabel(text) {
    const btn = document.getElementById("possessBtn");
    if (!btn) return;
    btn.textContent = text;
}
