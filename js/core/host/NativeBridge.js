// Web shim：桌面版 NativeBridge 桥接 Tauri 原生层。纯 web 环境无原生宿主，恒返回不可用，
// 使 ElasticSliderComponent 走纯 DOM 渲染路径（视觉与桌面非 native 模式一致）。
export const nativeBridge = {
    get isAvailable() { return false; },
    recordDiagnostics() { return Promise.resolve(false); },
    postMessage() { return false; },
    addEventListener() {},
    removeEventListener() {}
};
