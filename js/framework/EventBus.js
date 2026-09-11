// @ts-check

/**
 * @file EventBus.js
 * @description 企业级全局事件总线，负责系统各层级间的异步通信。
 * @layer Framework
 */

export class EventBus {
    constructor() {
        /** @private */
        /** @type {Map<string, Array<(data: unknown) => void>>} */
        this._events = new Map();
    }

    /**
     * 订阅事件
     * @param {string} eventName 事件名称
     * @param {(data: unknown) => void} callback 回调函数
     */
    on(eventName, callback) {
        if (!this._events.has(eventName)) {
            this._events.set(eventName, []);
        }
        this._events.get(eventName)?.push(callback);
    }

    /**
     * 发布事件
     * @param {string} eventName 事件名称
     * @param {unknown} data 传递的数据
     */
    emit(eventName, data) {
        const callbacks = this._events.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in event "${eventName}":`, error);
                }
            });
        }
    }

    /**
     * 移除特定事件的监听
     * @param {string} eventName
     * @param {(data: unknown) => void} [callback]
     */
    off(eventName, callback) {
        if (callback) {
            const callbacks = this._events.get(eventName);
            if (!callbacks) return;
            const next = callbacks.filter((item) => item !== callback);
            if (next.length) {
                this._events.set(eventName, next);
            } else {
                this._events.delete(eventName);
            }
            return;
        }
        this._events.delete(eventName);
    }
}

// 导出全局单例
export const eventBus = new EventBus();
