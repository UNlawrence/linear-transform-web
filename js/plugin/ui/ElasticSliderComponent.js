// @ts-nocheck
import { ensureStyle } from '../../common/StyleRegistry.js';
import { nativeBridge } from '../../core/host/NativeBridge.js';
import { SliderDragInputController } from '../../core/input-controller/SliderDragInputController.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isMacCatalystHost() {
    return window.__VMS_HOST_CAPABILITIES__?.platform === 'maccatalyst';
}

export class ElasticSliderComponent {
    constructor(options = {}) {
        this._input = new SliderDragInputController({
            ...options,
            elastic: true,
            // The component is positioned by CSS. Its rendered bounds remain
            // correct when the window or document zoom changes, unlike the
            // canvas HUD coordinate system used by the other demonstrations.
            getSliderLayout: () => this._getInteractionLayout()
        });
        this.state = this._input.state;
        this._onChangeNorm = options.onChangeNorm || (() => {});
        // Keep Mac and Windows slider HUD behavior unified.
        this._useNativeHostSlider = false;
        this._useNativeHostGlass = options.useNativeHostGlass === true && isMacCatalystHost() && nativeBridge.isAvailable;
        this._useMacLiquidStyle = options.useMacLiquidStyle === true;
        this._sliderId = options.sliderId || 'bottom-revolution-slider';
        this._root = null;
        this._thumb = null;
        this._thumbBody = null;
        this._progress = null;
        this._label = null;
        this._leftIcon = null;
        this._rightIcon = null;
        this._nativeMessageHandler = null;
        this._lastNativePayloadKey = '';
        this._ensureDom();
    }

    _ensureNativeBridge() {
        if (!this._useNativeHostSlider || this._nativeMessageHandler) return;

        this._nativeMessageHandler = (event) => {
            const msg = event?.data;
            if (!msg || msg.type !== 'SYSTEM_EVENT' || msg.Event !== 'NATIVE_SLIDER_VALUE_CHANGED') return;

            let payload = msg.Data;
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch {
                    return;
                }
            }

            if (!payload || payload.sliderId !== this._sliderId) return;

            const nextNorm = clamp(Number(payload.value) || 0, 0, 1);
            this.state.sliderNorm = nextNorm;
            if ('targetSliderNorm' in this.state) this.state.targetSliderNorm = nextNorm;
            if ('visualSliderNorm' in this.state) this.state.visualSliderNorm = nextNorm;
            if ('targetSliderOverflow' in this.state) this.state.targetSliderOverflow = 0;
            if ('visualSliderOverflow' in this.state) this.state.visualSliderOverflow = 0;
            this.state.dragging = !!payload.active;
            this.state.active = !!payload.active;
            this._onChangeNorm(nextNorm);
        };

        nativeBridge.addEventListener(this._nativeMessageHandler);
    }

    _ensureDom() {
        if (document.getElementById('bottom-glass-slider-container')) {
            this._root = document.getElementById('bottom-glass-slider-container');
            this._root.classList.toggle('is-mac-liquid', this._useMacLiquidStyle);
            this._root.classList.toggle('has-native-glass', this._useNativeHostGlass);
            this._root.classList.toggle('is-native-host', this._useNativeHostGlass);
            this._thumb = this._root.querySelector('.glass-slider-thumb');
            this._thumbBody = this._root.querySelector('.glass-slider-thumb-body');
            this._progress = this._root.querySelector('.glass-slider-progress');
            this._label = this._root.querySelector('.glass-slider-label');
            this._leftIcon = this._root.querySelector('.glass-slider-icon.left');
            this._rightIcon = this._root.querySelector('.glass-slider-icon.right');
            return;
        }

        this._ensureStyle();

        this._root = document.createElement('div');
        this._root.id = 'bottom-glass-slider-container';
        this._root.classList.toggle('is-mac-liquid', this._useMacLiquidStyle);
        this._root.classList.toggle('has-native-glass', this._useNativeHostGlass);
        this._root.classList.toggle('is-native-host', this._useNativeHostGlass);
        this._root.innerHTML = `
            <div class="glass-slider-icon left">-</div>
            <div class="glass-slider-icon right">+</div>
            <div class="glass-slider-track-bg"></div>
            <div class="glass-slider-progress"></div>
            <div class="glass-slider-thumb">
                <div class="glass-slider-thumb-body"></div>
            </div>
            <div class="glass-slider-label"></div>
        `;
        document.body.appendChild(this._root);
        this._thumb = this._root.querySelector('.glass-slider-thumb');
        this._thumbBody = this._root.querySelector('.glass-slider-thumb-body');
        this._progress = this._root.querySelector('.glass-slider-progress');
        this._label = this._root.querySelector('.glass-slider-label');
        this._leftIcon = this._root.querySelector('.glass-slider-icon.left');
        this._rightIcon = this._root.querySelector('.glass-slider-icon.right');
    }

    _ensureStyle() {
        ensureStyle('elastic-slider-component', `
            #bottom-glass-slider-container {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                width: min(430px, calc(100vw - 112px));
                max-width: calc(100vw - 112px);
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            #bottom-glass-slider-container.is-mounted {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
                pointer-events: auto;
            }
            #bottom-glass-slider-container.is-native-host,
            #bottom-glass-slider-container.is-native-host.is-mounted {
                opacity: 0;
                pointer-events: none;
                transform: translateX(-50%) translateY(0);
            }
            
            .glass-slider-track-bg {
                position: absolute;
                width: 100%;
                height: 10px;
                background: rgba(88, 110, 117, 0.15);
                border-radius: 5px;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
            }
            
            .glass-slider-progress {
                position: absolute;
                left: 0;
                width: 0%;
                height: 10px;
                background: rgba(88, 110, 117, 0.45);
                border-radius: 5px;
                pointer-events: none;
                transition: background 0.3s ease;
            }
            .is-pressing .glass-slider-progress {
                background: rgba(38, 139, 210, 0.6);
            }
            
            .glass-slider-thumb {
                position: absolute;
                left: 0;
                top: 50%;
                width: 0;
                height: 0;
                pointer-events: none;
                will-change: transform;
            }
            
            .glass-slider-thumb-body {
                position: absolute;
                top: -12px;
                left: -20px;
                width: 40px;
                height: 24px;
                border-radius: 12px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 100%);
                backdrop-filter: blur(12px) saturate(140%);
                -webkit-backdrop-filter: blur(12px) saturate(140%);
                border: 1px solid rgba(255, 255, 255, 0.8);
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12), 
                            inset 0 1px 1px rgba(255, 255, 255, 0.8),
                            0 0 0 1px rgba(0,0,0,0.02);
                transform-origin: center center;
                will-change: transform;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease, box-shadow 0.3s ease, border 0.3s ease;
            }
            .is-pressing .glass-slider-thumb-body {
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.3) 100%);
                box-shadow: 0 16px 36px rgba(0, 0, 0, 0.22), 
                            inset 0 1px 2px rgba(255, 255, 255, 1);
                border: 1px solid rgba(255, 255, 255, 1);
            }
            
            .glass-slider-icon {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                font-family: system-ui, -apple-system, sans-serif;
                font-weight: 700;
                font-size: 22px;
                color: rgba(88,110,117,0.6);
                pointer-events: none;
                will-change: transform, opacity;
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease;
            }
            .glass-slider-icon.left { right: 100%; margin-right: 28px; }
            .glass-slider-icon.right { left: 100%; margin-left: 28px; }
            
            .glass-slider-label {
                position: absolute;
                top: -36px;
                left: 0;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                color: rgba(88,110,117,0.9);
                font-weight: 600;
                pointer-events: none;
                transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                will-change: transform;
                text-shadow: 0 1px 2px rgba(255,255,255,0.8);
                white-space: nowrap;
            }

            #bottom-glass-slider-container.is-mac-liquid {
                --slider-track-tint: rgba(203, 227, 244, 0.38);
                --slider-track-stroke: rgba(255, 255, 255, 0.52);
                --slider-accent: rgb(113, 164, 205);
                --slider-text: rgb(64, 88, 108);
                width: min(430px, calc(100vw - 112px));
                height: 48px;
                contain: layout style paint;
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-track-bg {
                height: 44px;
                border-radius: 22px;
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, 0.54), rgba(255, 255, 255, 0.12)),
                    linear-gradient(135deg, rgba(196, 222, 240, 0.34), rgba(221, 234, 244, 0.14));
                backdrop-filter: blur(20px) saturate(145%);
                -webkit-backdrop-filter: blur(20px) saturate(145%);
                border: 1px solid var(--slider-track-stroke);
                box-shadow:
                    0 18px 44px rgba(38, 65, 89, 0.12),
                    inset 0 1px 0 rgba(255, 255, 255, 0.72),
                    inset 0 -1px 0 rgba(150, 184, 209, 0.22);
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-track-bg::before {
                content: '';
                position: absolute;
                inset: 8px 14px;
                border-radius: 999px;
                background: linear-gradient(180deg, rgba(110, 145, 173, 0.14), rgba(94, 130, 158, 0.08));
                box-shadow: inset 0 1px 2px rgba(65, 85, 102, 0.06);
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-progress {
                left: 14px;
                height: 28px;
                border-radius: 999px;
                background:
                    linear-gradient(90deg, rgba(172, 209, 235, 0.56), rgba(113, 164, 205, 0.34) 58%, rgba(113, 164, 205, 0.18));
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.46),
                    0 0 0 1px rgba(173, 206, 230, 0.24);
                will-change: width, background;
                transition: background 0.22s ease, box-shadow 0.22s ease;
            }

            #bottom-glass-slider-container.is-mac-liquid.is-pressing .glass-slider-progress {
                background:
                    linear-gradient(90deg, rgba(190, 226, 248, 0.84), rgba(118, 170, 212, 0.56) 56%, rgba(118, 170, 212, 0.34));
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.64),
                    0 0 18px rgba(113, 164, 205, 0.22);
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-thumb-body {
                top: -19px;
                left: -30px;
                width: 60px;
                height: 38px;
                border-radius: 19px;
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.22)),
                    linear-gradient(135deg, rgba(196, 224, 242, 0.42), rgba(255, 255, 255, 0.12) 60%, rgba(138, 183, 219, 0.18));
                backdrop-filter: blur(24px) saturate(165%);
                -webkit-backdrop-filter: blur(24px) saturate(165%);
                border: 1px solid rgba(255, 255, 255, 0.74);
                box-shadow:
                    0 18px 38px rgba(45, 71, 92, 0.22),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9),
                    inset 0 -1px 0 rgba(151, 187, 214, 0.26),
                    0 0 0 1px rgba(135, 173, 200, 0.12);
                transition: background 0.22s ease, box-shadow 0.22s ease, border 0.22s ease;
            }

            #bottom-glass-slider-container.is-mac-liquid.is-pressing .glass-slider-thumb-body {
                background:
                    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(233, 244, 251, 0.46)),
                    linear-gradient(135deg, rgba(196, 227, 245, 0.64), rgba(133, 181, 218, 0.28) 72%, rgba(255, 255, 255, 0.14));
                box-shadow:
                    0 20px 42px rgba(45, 73, 95, 0.28),
                    0 0 22px rgba(113, 164, 205, 0.14),
                    inset 0 1px 0 rgba(255, 255, 255, 0.98),
                    inset 0 -1px 0 rgba(146, 190, 221, 0.32);
                border: 1px solid rgba(255, 255, 255, 0.92);
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-icon {
                font-weight: 800;
                color: rgba(76, 103, 124, 0.72);
            }

            #bottom-glass-slider-container.is-mac-liquid .glass-slider-label {
                top: 58px;
                letter-spacing: 0.01em;
                color: rgba(67, 92, 111, 0.96);
                font-weight: 700;
                text-shadow: 0 1px 10px rgba(255,255,255,0.72);
            }

        `);
    }

    mount() {
        if (!this._root) return;
        this._root.classList.add('is-mounted');
        if (!this._useNativeHostSlider) {
            this.bind();
        }
        this.updateDOM();
    }

    unmount() {
        if (this._useNativeHostSlider || this._useNativeHostGlass) {
            this._postNativeState({ visible: false });
        }
        this._root?.classList.remove('is-mounted');
        this.unbind();
    }

    bind() {
        if (this._useNativeHostSlider) return;
        this._input.bind();
    }

    unbind() {
        if (this._useNativeHostSlider) return;
        this._input.unbind();
    }

    reset(norm = 0) {
        this.state = this._input.resetToNorm(norm, true);
        this.updateDOM();
        return this.state;
    }

    syncValue(norm) {
        const safeNorm = clamp(norm, 0, 1);
        this.state.sliderNorm = safeNorm;
        if ('targetSliderNorm' in this.state) {
            this.state.targetSliderNorm = safeNorm;
        }
        if (!this.state.dragging) {
            if ('visualSliderNorm' in this.state) {
                this.state.visualSliderNorm = safeNorm;
            }
            this.state.sliderNormVelocity = 0;
            this.state.visualSliderOverflow = 0;
            this.state.sliderOverflowVelocity = 0;
        }
        this.updateDOM();
        return this.state;
    }

    step(deltaTime) {
        this.state = this._input.step(deltaTime);
        return this.state;
    }

    updateDOM(params = {}) {
        if (!this._root) return;
        
        let sliderNorm = params.sliderNorm ?? this.state.visualSliderNorm ?? this.state.sliderNorm ?? 0;
        let overflow = params.overflow ?? this.state.visualSliderOverflow ?? 0;
        let velocity = params.sliderNormVelocity ?? this.state.sliderNormVelocity ?? 0;
        let activeScale = params.activeScale ?? this.state.activeScale ?? 1;
        
        // 防御性检查：防止 NaN 导致瞬移或消失
        if (!Number.isFinite(sliderNorm)) sliderNorm = 0;
        if (!Number.isFinite(overflow)) overflow = 0;
        if (!Number.isFinite(velocity)) velocity = 0;

        if (this._useNativeHostGlass) {
            this._postNativeState({
                visible: this._root.classList.contains('is-mounted'),
                value: sliderNorm,
                overflow,
                label: this._buildLabelText({
                    ...params,
                    sliderNorm
                }),
                active: !!(this.state.dragging || params.leftAdjusting)
            });
            return;
        }

        const isMacLiquid = this._root?.classList.contains('is-mac-liquid');
        const trackInset = isMacLiquid ? 14 : 0;
        const containerWidth = this._root.clientWidth || 430;
        const trackWidth = Math.max(0, containerWidth - trackInset * 2);
        
        // 视觉平滑处理：减小视觉溢出的敏感度，使边缘表现更“粘”
        const visualOvershoot = overflow * trackWidth * 0.12;
        const thumbX = clamp(trackInset + sliderNorm * trackWidth + visualOvershoot, trackInset - 10, trackInset + trackWidth + 10);

        // Thumb transformations
        this._thumb.style.transform = `translate3d(${thumbX.toFixed(2)}px, 0, 0)`;
        
        const velocityBulge = Math.abs(velocity) * 0.15;
        const overflowBulge = Math.abs(overflow) * 0.45;
        
        // 缩放计算
        const handleScaleX = clamp(1 + velocityBulge + overflowBulge, 0.8, 1.6);
        const handleScaleY = clamp(1 / (1 + velocityBulge * 0.5 + overflowBulge * 0.3), 0.7, 1.1);
        
        // 补偿位移，确保拉伸时一侧边缘相对固定
        const stretchOffset = overflow * 14;
        const liftY = (activeScale - 1) * 20; // 这里的 liftY 随 scale 增加而增加，产生“浮起”感

        this._thumbBody.style.transform = `translate3d(${-stretchOffset.toFixed(2)}px, ${-liftY.toFixed(2)}px, 0) scale(${handleScaleX * activeScale}, ${handleScaleY * activeScale})`;

        // 交互反馈
        if (this.state.dragging || params.leftAdjusting) {
            this._root.classList.add('is-pressing');
        } else {
            this._root.classList.remove('is-pressing');
        }

        // Progress bar
        if (isMacLiquid) {
            this._progress.style.width = `${(clamp(sliderNorm, 0, 1) * trackWidth).toFixed(2)}px`;
        } else {
            this._progress.style.width = `${(clamp(sliderNorm, 0, 1) * 100).toFixed(2)}%`;
        }

        // 标签处理
        if (this._label) {
            const labelText = params.countLabel || '';
            this._label.textContent = this._buildLabelText({
                ...params,
                sliderNorm
            });
            
            const labelX = clamp(thumbX, trackInset + 40, trackInset + trackWidth - 40);
            const labelPopY = (activeScale - 1) * 50; // 标签随压力弹起更高
            this._label.style.transform = `translate3d(${labelX.toFixed(2)}px, ${-labelPopY.toFixed(2)}px, 0) translateX(-50%)`;
        }

        // 图标微动
        if (this._leftIcon) {
            const leftPull = overflow < 0 ? Math.abs(overflow) * 40 : 0;
            this._leftIcon.style.transform = `translateY(-50%) translateX(${-leftPull.toFixed(2)}px) scale(${1 + leftPull * 0.02})`;
            this._leftIcon.style.opacity = overflow < 0 ? 1 : 0.6;
        }
        if (this._rightIcon) {
            const rightPull = overflow > 0 ? Math.abs(overflow) * 40 : 0;
            this._rightIcon.style.transform = `translateY(-50%) translateX(${rightPull.toFixed(2)}px) scale(${1 + rightPull * 0.02})`;
            this._rightIcon.style.opacity = overflow > 0 ? 1 : 0.6;
        }

    }

    _getInteractionLayout() {
        const rect = this._root?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return null;

        const isMacLiquid = this._root.classList.contains('is-mac-liquid');
        const trackHeight = isMacLiquid ? 44 : 10;
        return {
            x0: rect.left,
            y0: rect.top + (rect.height - trackHeight) / 2,
            trackW: rect.width,
            trackH: trackHeight
        };
    }

    _buildLabelText(params = {}) {
        const labelText = params.countLabel || '';
        const safeNorm = clamp(params.sliderNorm ?? this.state.sliderNorm ?? 0, 0, 1);
        let valDisplay = '';

        if (params.phase === 'rotation') {
            const angle = Math.round(safeNorm * 360);
            valDisplay = `: ${angle}°`;
        } else if (params.splitCount !== undefined) {
            valDisplay = `: ${params.splitCount}`;
        } else if (params.countLabel) {
            const count = 1 + Math.round(safeNorm * 19);
            valDisplay = `: ${count}`;
        }

        return `${labelText}${valDisplay}`;
    }

    _postNativeState({ visible = true, value = 0, overflow = 0, label = '', active = false } = {}) {
        const safeValue = clamp(value, 0, 1);
        const payload = {
            type: 'NATIVE_SLIDER_STATE',
            sliderId: this._sliderId,
            visible: !!visible,
            value: safeValue,
            overflow: Number.isFinite(overflow) ? overflow : 0,
            label,
            active: !!active
        };
        const payloadKey = JSON.stringify(payload);
        if (payloadKey === this._lastNativePayloadKey) return;
        this._lastNativePayloadKey = payloadKey;
        nativeBridge.postMessage(payload);
    }
}
// @ts-nocheck
