export function setStatus(statusId, text) {
    const el = document.getElementById(statusId);
    if (el) el.textContent = text;
}
