// Web shim：桌面版 SceneService 管理 Three.js 场景层，纯 web 抽取版无场景层。
// SliderDragInputController 在 overlay 上下文为 null 时走视口坐标 fallback，行为不变。
export const sceneService = {
    getOverlayContext() { return null; }
};
