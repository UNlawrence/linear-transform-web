// @ts-check

import { eventBus } from './EventBus.js';

/**
 * @typedef {"on" | "off" | "host"} InferenceMode
 *
 * @typedef {Object} AppState
 * @property {boolean} isPrivacyMode
 * @property {boolean} showHandLandmarks
 * @property {boolean} isTrackerReady
 * @property {string | null} activePluginId
 * @property {number} handCount
 * @property {"zh" | "en"} currentLanguage
 * @property {InferenceMode} inferenceMode
 * @property {"geometry" | "excalidraw" | "calculator" | "visualLab"} workspace
 * @property {string} handwritingMode
 * @property {"off" | "browser_local" | "browser_online"} gestureEngine
 * @property {string} recognitionState
 * @property {"off" | "local" | "online"} recognitionEngine
 * @property {"math" | "linalg"} brand 侧栏品牌工作室：math=VisualMathStudio，linalg=VisualLinAlgStudio（案例库随之切到线性代数）
 * @property {"tiny" | "small" | "base"} recognitionLocalTier
 * @property {"gemini" | "openai" | "dashscope"} onlineRecognitionProvider
 * @property {string} geminiRecognitionModel
 * @property {string} openaiRecognitionModel
 * @property {string} openaiRecognitionBaseUrl
 * @property {string} dashscopeRecognitionModel
 * @property {boolean} atlasAutonomousIteration
 * @property {boolean} geometryRecognitionEnabled
 * @property {boolean} calcFloating
 * @property {number} uiScale
 */

const STORAGE_PREFIX = 'vms_state_';
// Keys that can flap every frame while hand tracking runs; console logging
// them is measurably expensive in WKWebView.
const HIGH_FREQUENCY_KEYS = new Set(['handCount']);
const PERSISTED_KEYS = /** @type {(keyof AppState)[]} */ ([
    'currentLanguage',
    'brand',
    'showHandLandmarks',
    'geometryRecognitionEnabled',
    'recognitionEngine',
    'recognitionLocalTier',
    'onlineRecognitionProvider',
    'geminiRecognitionModel',
    'openaiRecognitionModel',
    'openaiRecognitionBaseUrl',
    'dashscopeRecognitionModel',
    'gestureEngine',
    'atlasAutonomousIteration',
    'calcFloating',
    'uiScale',
]);

/**
 * Coerce a persisted UI scale into the supported range. Anything missing or
 * malformed falls back to 1.0 (100%).
 * @param {unknown} value
 * @returns {number}
 */
function clampUiScale(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.min(1.5, Math.max(0.8, num));
}

function readPersistedState() {
    const out = /** @type {Partial<AppState>} */ ({});
    try {
        for (const key of PERSISTED_KEYS) {
            const raw = localStorage.getItem(STORAGE_PREFIX + key);
            if (raw === null) continue;
            try {
                /** @type {Record<string, any>} */ (out)[key] = JSON.parse(raw);
            } catch {
                /** @type {Record<string, any>} */ (out)[key] = raw;
            }
        }
    } catch { /* localStorage unavailable */ }
    return out;
}

export class StateStore {
    constructor() {
        const persisted = readPersistedState();
        /** @type {AppState} */
        this._state = {
            isPrivacyMode: true,
            showHandLandmarks: persisted.showHandLandmarks ?? true,
            isTrackerReady: false,
            activePluginId: null,
            handCount: 0,
            currentLanguage: persisted.currentLanguage ?? 'zh',
            brand: persisted.brand === 'linalg' ? 'linalg' : 'math',
            inferenceMode: 'off',
            workspace: 'geometry',
            handwritingMode: 'guided',
            recognitionState: 'idle',
            recognitionEngine: persisted.recognitionEngine ?? 'off',
            recognitionLocalTier: persisted.recognitionLocalTier ?? 'small',
            onlineRecognitionProvider: persisted.onlineRecognitionProvider ?? 'gemini',
            geminiRecognitionModel: persisted.geminiRecognitionModel ?? 'gemini-2.5-flash',
            openaiRecognitionModel: persisted.openaiRecognitionModel ?? 'gpt-4o-mini',
            openaiRecognitionBaseUrl: persisted.openaiRecognitionBaseUrl ?? 'https://api.openai.com/v1',
            dashscopeRecognitionModel: persisted.dashscopeRecognitionModel ?? 'qwen-vl-max',
            gestureEngine: persisted.gestureEngine ?? 'off',
            atlasAutonomousIteration: persisted.atlasAutonomousIteration ?? true,
            geometryRecognitionEnabled: persisted.geometryRecognitionEnabled ?? false,
            calcFloating: persisted.calcFloating ?? false,
            uiScale: clampUiScale(persisted.uiScale),
        };
    }

    /**
     * @template {keyof AppState} K
     * @param {K} key
     * @param {AppState[K]} value
     */
    setState(key, value) {
        if (this._state[key] !== value) {
            const oldValue = this._state[key];
            this._state[key] = value;

            if (PERSISTED_KEYS.includes(key)) {
                try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
            }

            eventBus.emit(`STATE_CHANGED_${key.toUpperCase()}`, {
                newValue: value,
                oldValue
            });

            eventBus.emit('STATE_UPDATED', { key, value });
            if (!HIGH_FREQUENCY_KEYS.has(key)) {
                console.log(`[StateStore] ${key}:`, oldValue, '=>', value);
            }
        }
    }

    /**
     * @template {keyof AppState} K
     * @param {K} key
     * @returns {AppState[K]}
     */
    getState(key) {
        return this._state[key];
    }

    /** @returns {AppState} */
    getSnapshot() {
        return { ...this._state };
    }
}

export const stateStore = new StateStore();
