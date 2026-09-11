// Web shim：替换原 IRenderPlugin（原版顶部 import RenderCommand → 拖入 Three.js 桌面渲染层）。
// 原文件路径 core/abstract/IRenderPlugin.js；此处仅保留插件生命周期接口，未改动任何业务逻辑。
export class IRenderPlugin {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.app = null;
    }
    onInstall(appContainer) { this.app = appContainer; }
    async onInit() {}
    onUpdate() {}
    onEnable() {}
    onDisable() {}
    onDestroy() {}
}
