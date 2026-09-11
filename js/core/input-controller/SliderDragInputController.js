import { sceneService } from '../render-service/SceneService.js';
import {
    computeSliderRubberBand,
    DEFAULT_ELASTIC_SLIDER_SPRING,
    getElasticSliderLayout,
    rawSliderNormFromClientX,
    sliderNormFromClientX,
    stepSliderSpring
} from '../../plugin/ui/ElasticSliderHud.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export class SliderDragInputController {
    constructor(options = {}) {
        this._isEnabled = options.isEnabled || (() => false);
        this._isUiTarget = options.isUiTarget || (() => false);
        this._isActiveSurface = options.isActiveSurface || (() => true);
        this._getSliderLayout = options.getSliderLayout || null;
        this._hitPadding = options.hitPadding || { x: 40, y: 22 };
        this._onChangeNorm = options.onChangeNorm || (() => {});
        this._elastic = !!options.elastic;
        this._springConfig = {
            ...DEFAULT_ELASTIC_SLIDER_SPRING,
            ...(options.springConfig || {})
        };
        this.state = this._createState();
        this._bound = false;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerLost = this._onPointerLost.bind(this);
    }

    bind() {
        if (this._bound) return;
        if (window.PointerEvent) {
            window.addEventListener('pointerdown', this._onPointerDown);
            window.addEventListener('pointermove', this._onPointerMove);
            window.addEventListener('pointerup', this._onPointerUp);
            window.addEventListener('pointercancel', this._onPointerUp);
            window.addEventListener('lostpointercapture', this._onPointerLost, true);
        } else {
            window.addEventListener('mousedown', this._onPointerDown);
            window.addEventListener('mousemove', this._onPointerMove);
            window.addEventListener('mouseup', this._onPointerUp);
        }
        window.addEventListener('blur', this._onPointerUp);
        window.addEventListener('pointerleave', this._onPointerLost);
        this._bound = true;
    }

    unbind() {
        if (!this._bound) return;
        if (window.PointerEvent) {
            window.removeEventListener('pointerdown', this._onPointerDown);
            window.removeEventListener('pointermove', this._onPointerMove);
            window.removeEventListener('pointerup', this._onPointerUp);
            window.removeEventListener('pointercancel', this._onPointerUp);
            window.removeEventListener('lostpointercapture', this._onPointerLost, true);
        } else {
            window.removeEventListener('mousedown', this._onPointerDown);
            window.removeEventListener('mousemove', this._onPointerMove);
            window.removeEventListener('mouseup', this._onPointerUp);
        }
        window.removeEventListener('blur', this._onPointerUp);
        window.removeEventListener('pointerleave', this._onPointerLost);
        this._bound = false;
    }

    reset() {
        this.state = this._createState();
        return this.state;
    }

    resetToNorm(norm = 0, syncVisual = true) {
        const safeNorm = clamp(norm, 0, 1);
        this.state = this._createState();
        this.state.sliderNorm = safeNorm;
        if (this._elastic) {
            this.state.targetSliderNorm = safeNorm;
            this.state.visualSliderNorm = safeNorm;
            this.state.targetSliderOverflow = 0;
            this.state.visualSliderOverflow = 0;
            this.state.sliderNormVelocity = 0;
            this.state.sliderOverflowVelocity = 0;
            this.state.activeScale = syncVisual ? 1 : this.state.activeScale;
            this.state.activeScaleVelocity = 0;
        }
        return this.state;
    }

    step(deltaTime) {
        if (!this._elastic) return this.state;

        const safeDt = Number.isFinite(deltaTime) ? deltaTime : 1 / 60;
        if (this.state.dragging) {
            this.state.visualSliderNorm = clamp(this.state.targetSliderNorm, 0, 1);
            this.state.sliderNormVelocity = 0;
            this.state.visualSliderOverflow = clamp(
                this.state.targetSliderOverflow,
                -this._springConfig.maxOverflow,
                this._springConfig.maxOverflow
            );
            this.state.sliderOverflowVelocity = 0;

            const activeScaleStep = stepSliderSpring(
                this.state.activeScale,
                1.12,
                this.state.activeScaleVelocity,
                safeDt,
                this._springConfig.activeScaleStiffness,
                this._springConfig.activeScaleDamping
            );
            this.state.activeScale = clamp(activeScaleStep.value, 1, 1.18);
            this.state.activeScaleVelocity = activeScaleStep.velocity;
            return this.state;
        }

        const normStep = stepSliderSpring(
            this.state.visualSliderNorm,
            this.state.targetSliderNorm,
            this.state.sliderNormVelocity,
            safeDt,
            this._springConfig.normStiffness,
            this._springConfig.normDamping
        );
        this.state.visualSliderNorm = clamp(normStep.value, 0, 1);
        this.state.sliderNormVelocity = normStep.velocity;

        const overflowStep = stepSliderSpring(
            this.state.visualSliderOverflow,
            this.state.targetSliderOverflow,
            this.state.sliderOverflowVelocity,
            safeDt,
            this._springConfig.overflowStiffness,
            this._springConfig.overflowDamping
        );
        this.state.visualSliderOverflow = clamp(
            overflowStep.value,
            -this._springConfig.maxOverflow,
            this._springConfig.maxOverflow
        );
        this.state.sliderOverflowVelocity = overflowStep.velocity;

        const targetScale = this.state.dragging ? 1.12 : 1;
        const scaleStep = stepSliderSpring(
            this.state.activeScale,
            targetScale,
            this.state.activeScaleVelocity,
            safeDt,
            this._springConfig.activeScaleStiffness,
            this._springConfig.activeScaleDamping
        );
        this.state.activeScale = clamp(scaleStep.value, 1, 1.18);
        this.state.activeScaleVelocity = scaleStep.velocity;
        return this.state;
    }

    _createState() {
        const baseState = {
            active: false,
            dragging: false,
            pointerId: null,
            sliderNorm: 0
        };

        if (!this._elastic) return baseState;

        return {
            ...baseState,
            targetSliderNorm: 0,
            visualSliderNorm: 0,
            sliderNormVelocity: 0,
            targetSliderOverflow: 0,
            visualSliderOverflow: 0,
            sliderOverflowVelocity: 0,
            activeScale: 1,
            activeScaleVelocity: 0
        };
    }

    _onPointerDown(event) {
        if (!this._isEnabled() || !this._isActiveSurface()) return;
        if (this._isUiTarget(event.target)) return;

        if (this.state.active) {
            this._resetInteraction();
        }

        const { point, layout } = this._getPointerLayout(event.clientX, event.clientY);
        if (!this._isSliderHit(point.x, point.y, layout)) return;

        this.state.active = true;
        this.state.dragging = true;
        this.state.pointerId = event.pointerId ?? null;
        if (this._elastic) {
            this._setElasticNorm(rawSliderNormFromClientX(point.x, layout), true);
        } else {
            this._setNorm(sliderNormFromClientX(point.x, layout));
        }
        event.preventDefault?.();
    }

    _onPointerMove(event) {
        if (!this.state.active || !this.state.dragging) return;
        if (this.state.pointerId !== null && event.pointerId !== undefined && event.pointerId !== this.state.pointerId) return;
        const { point, layout } = this._getPointerLayout(event.clientX, event.clientY);
        if (this._elastic) {
            this._setElasticNorm(rawSliderNormFromClientX(point.x, layout));
        } else {
            this._setNorm(sliderNormFromClientX(point.x, layout));
        }
    }

    _onPointerUp(event) {
        if (this.state.pointerId !== null && event?.pointerId !== undefined && event.pointerId !== this.state.pointerId) return;
        this._resetInteraction();
    }

    _onPointerLost(event) {
        if (!this.state.active) return;
        if (this.state.pointerId !== null && event?.pointerId !== undefined && event.pointerId !== this.state.pointerId) return;
        this._resetInteraction();
    }

    _resetInteraction() {
        this.state.active = false;
        this.state.dragging = false;
        this.state.pointerId = null;
        if (this._elastic) {
            this.state.targetSliderOverflow = 0;
        }
    }

    _setNorm(norm) {
        const safeNorm = clamp(norm, 0, 1);
        this.state.sliderNorm = safeNorm;
        this._onChangeNorm(safeNorm);
    }

    _setElasticNorm(rawNorm, syncVisual = false) {
        const elastic = computeSliderRubberBand(rawNorm, this._springConfig.maxOverflow);
        this.state.sliderNorm = elastic.sliderNorm;
        this.state.targetSliderNorm = elastic.sliderNorm;
        this.state.targetSliderOverflow = elastic.overflow;
        if (syncVisual || this.state.dragging) {
            this.state.visualSliderNorm = elastic.sliderNorm;
            this.state.visualSliderOverflow = elastic.overflow;
            this.state.sliderNormVelocity = 0;
            this.state.sliderOverflowVelocity = 0;
        }
        this._onChangeNorm(elastic.sliderNorm);
    }

    _toOverlayPoint(clientX, clientY) {
        const ctx = sceneService.getOverlayContext();
        const canvas = ctx?.canvas;
        if (!canvas) {
            return { x: clientX, y: clientY, width: window.innerWidth, height: window.innerHeight };
        }
        const rect = canvas.getBoundingClientRect();
        const safeW = Math.max(1, rect.width);
        const safeH = Math.max(1, rect.height);
        const x = ((clientX - rect.left) / safeW) * canvas.width;
        const y = ((clientY - rect.top) / safeH) * canvas.height;
        // 使用视觉可见高度（innerHeight）而非 canvas 完整高度（可能包含底部 bleed 区域），
        // 确保 slider layout 的 y0 = height - 66 对应视觉底部，而非超出视口的区域。
        const visualHeight = Math.min(canvas.height, Math.ceil(window.innerHeight));
        return { x, y, width: canvas.width, height: visualHeight };
    }

    _getPointerLayout(clientX, clientY) {
        const layout = this._getSliderLayout?.();
        if (layout && Number.isFinite(layout.x0) && Number.isFinite(layout.y0) &&
            Number.isFinite(layout.trackW) && Number.isFinite(layout.trackH)) {
            return {
                point: { x: clientX, y: clientY },
                layout
            };
        }

        const point = this._toOverlayPoint(clientX, clientY);
        return {
            point,
            layout: getElasticSliderLayout(point.width, point.height)
        };
    }

    _isSliderHit(x, y, layout) {
        return (
            x >= layout.x0 - this._hitPadding.x &&
            x <= layout.x0 + layout.trackW + this._hitPadding.x &&
            y >= layout.y0 - this._hitPadding.y &&
            y <= layout.y0 + layout.trackH + this._hitPadding.y
        );
    }
}
