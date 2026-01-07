// Start/Stop のバインド
export function bindUI({ startBtnId, stopBtnId, onStart, onStop }) {
  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);

  if (!startBtn) throw new Error("start button not found");
  if (!stopBtn) throw new Error("stop button not found");

  startBtn.addEventListener("click", () => onStart?.());
  stopBtn.addEventListener("click", () => onStop?.());
}

// --- 憑依ボタン ---
export function ensurePossessButton({ onClick } = {}) {
  let btn = document.getElementById("possessBtn");
  if (btn) return btn;

  btn = document.createElement("button");
  btn.id = "possessBtn";
  btn.textContent = "憑依";
  btn.style.position = "fixed";
  btn.style.zIndex = "9999";
  btn.style.display = "none";
  btn.style.padding = "10px 14px";
  btn.style.fontSize = "16px";
  btn.style.borderRadius = "12px";
  btn.style.border = "1px solid rgba(0,0,0,0.15)";
  btn.style.background = "rgba(255,255,255,0.95)";
  btn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";
  btn.style.pointerEvents = "auto";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick?.();
  });

  document.body.appendChild(btn);
  return btn;
}

export function showPossessButtonAt(clientX, clientY) {
  const btn = document.getElementById("possessBtn");
  if (!btn) return;

  const offset = 12;
  btn.style.left = `${Math.round(clientX + offset)}px`;
  btn.style.top = `${Math.round(clientY + offset)}px`;
  btn.style.bottom = "auto";
  btn.style.transform = "none";
  btn.style.display = "block";
}

export function hidePossessButton() {
  const btn = document.getElementById("possessBtn");
  if (!btn) return;
  btn.style.display = "none";
}
