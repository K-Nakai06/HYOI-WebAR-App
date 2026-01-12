export function setStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
