export function bindUI({ startBtnId, stopBtnId, onStart, onStop }) {
    const startBtn = document.getElementById(startBtnId);
    const stopBtn = document.getElementById(stopBtnId);

    if (!startBtn) throw new Error("start button not found");
    if (!stopBtn) throw new Error("stop button not found");

    startBtn.addEventListener("click", () => onStart?.());
    stopBtn.addEventListener("click", () => onStop?.());
}
