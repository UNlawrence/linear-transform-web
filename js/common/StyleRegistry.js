// @ts-check

/**
 * @param {string} id
 * @param {string} cssText
 * @returns {HTMLStyleElement | null}
 */
export function ensureStyle(id, cssText) {
    if (!id || typeof document === 'undefined') return null;

    /** @type {HTMLStyleElement | null} */
    let style = /** @type {HTMLStyleElement | null} */ (document.getElementById(id));
    if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
    }

    if (typeof cssText === 'string' && style.textContent !== cssText) {
        style.textContent = cssText;
    }

    return style;
}
