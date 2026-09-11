function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

const SLIDER_EDGE_GRAB_PADDING = 20;

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
    return t * t * (3 - 2 * t);
}

export const DEFAULT_ELASTIC_SLIDER_SPRING = Object.freeze({
    normStiffness: 48,
    normDamping: 15,
    overflowStiffness: 56,
    overflowDamping: 18,
    activeScaleStiffness: 28,
    activeScaleDamping: 13,
    maxOverflow: 0.12
});

function decay(value, max) {
    if (max === 0) return 0;
    const safeValue = Math.max(0, value);
    const normalized = safeValue / Math.max(max, 0.0001);
    const eased = 1 - Math.exp(-normalized * 1.6);
    const compressed = 1 - Math.pow(1 - eased, 1.35);
    return Math.min(compressed * max, max);
}

export function computeSliderRubberBand(rawNorm, maxOverflow = 0.34) {
    const safeRaw = Number.isFinite(rawNorm) ? rawNorm : 0;
    const sliderNorm = clamp(safeRaw, 0, 1);
    let overflow = 0;

    if (safeRaw < 0) {
        overflow = -decay((-safeRaw) * 3.15, maxOverflow);
    } else if (safeRaw > 1) {
        overflow = decay((safeRaw - 1) * 3.15, maxOverflow);
    }

    return {
        sliderNorm,
        overflow: clamp(overflow, -maxOverflow, maxOverflow)
    };
}

export function stepSliderSpring(current, target, velocity, dt, stiffness = 34, damping = 10) {
    const safeDt = clamp(dt || 0, 1 / 240, 0.05);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const safeTarget = Number.isFinite(target) ? target : 0;
    const safeVelocity = Number.isFinite(velocity) ? velocity : 0;
    const accel = (safeTarget - safeCurrent) * stiffness - safeVelocity * damping;
    const nextVelocity = safeVelocity + accel * safeDt;
    const nextValue = safeCurrent + nextVelocity * safeDt;

    if (Math.abs(safeTarget - nextValue) < 0.0005 && Math.abs(nextVelocity) < 0.0005) {
        return { value: safeTarget, velocity: 0 };
    }

    return { value: nextValue, velocity: nextVelocity };
}

function roundRect(ctx, x, y, width, height, radius) {
    if (width <= 0) return;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

export function getElasticSliderLayout(width, height) {
    const trackW = Math.min(430, width * 0.44);
    const trackH = 10;
    const x0 = (width - trackW) * 0.5;
    const y0 = height - 66;
    return { x0, y0, trackW, trackH };
}

export function sliderNormFromClientX(clientX, layout) {
    if (!layout) return 0;
    if (clientX <= layout.x0 + SLIDER_EDGE_GRAB_PADDING) return 0;
    if (clientX >= layout.x0 + layout.trackW - SLIDER_EDGE_GRAB_PADDING) return 1;
    return clamp(
        (clientX - (layout.x0 + SLIDER_EDGE_GRAB_PADDING)) /
            Math.max(layout.trackW - SLIDER_EDGE_GRAB_PADDING * 2, 0.0001),
        0,
        1
    );
}

export function rawSliderNormFromClientX(clientX, layout) {
    if (!layout) return 0;
    if (clientX < layout.x0 - SLIDER_EDGE_GRAB_PADDING) {
        return (clientX - (layout.x0 - SLIDER_EDGE_GRAB_PADDING)) / Math.max(layout.trackW, 0.0001);
    }
    if (clientX > layout.x0 + layout.trackW + SLIDER_EDGE_GRAB_PADDING) {
        return 1 + (clientX - (layout.x0 + layout.trackW + SLIDER_EDGE_GRAB_PADDING)) / Math.max(layout.trackW, 0.0001);
    }
    return sliderNormFromClientX(clientX, layout);
}

export function drawElasticSliderHud(ctx, params) {
    if (!ctx || !params) return;

    const w = ctx.canvas.width;
    // 使用视觉可见高度（innerHeight）而非 canvas 完整高度（可能包含底部 bleed 区域），
    // 确保 HUD 被绘制在视口底部可见范围内，而非超出视口的区域。
    const h = Math.min(ctx.canvas.height, Math.ceil(window.innerHeight));
    const { x0, y0, trackW, trackH } = getElasticSliderLayout(w, h);


    const overflow = params.overflow || 0;
    const velocity = params.sliderNormVelocity || 0;
    const stretchX = overflow * trackW;
    const velocityStretch = clamp(velocity * 0.045, -0.018, 0.018);
    const stretchMag = Math.abs(overflow) + Math.abs(velocityStretch);
    const activeScale = clamp(params.activeScale ?? 1, 1, 1.2);
    const visualTrackH = trackH + (activeScale - 1) * 30;
    const visualY0 = y0 - (visualTrackH - trackH) * 0.5;
    const safeNorm = clamp(params.sliderNorm, 0, 1);
    const handleBaseX = x0 + trackW * safeNorm;
    const finalHandleX = handleBaseX + stretchX;
    const iconOpacity = 0.72 + (activeScale - 1) * 1.4;
    const labelOffset = 18 + (activeScale - 1) * 26;
    const distanceToEdge = Math.min(safeNorm, 1 - safeNorm);
    const edgeZone = 0.1;
    const edgeProximity = 1 - smoothstep(0, edgeZone, distanceToEdge);
    const pushingLeft = safeNorm <= 0.5 && (overflow < 0 || velocity < -0.001);
    const pushingRight = safeNorm >= 0.5 && (overflow > 0 || velocity > 0.001);
    const edgePress = edgeProximity * (pushingLeft || pushingRight ? 1 : 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const iconGap = 26;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(88,110,117,${clamp(iconOpacity, 0, 1).toFixed(3)})`;

    // Left Icon (-)
    const leftIconX = x0 - iconGap + (overflow < 0 ? stretchX * 0.18 : 0);
    ctx.save();
    ctx.translate(leftIconX, visualY0 + visualTrackH / 2);
    ctx.scale(overflow < 0 ? 1 + stretchMag * 0.55 : activeScale, overflow < 0 ? 1 + stretchMag * 0.55 : activeScale);
    ctx.fillText('-', 0, 0);
    ctx.restore();

    // Right Icon (+)
    const rightIconX = x0 + trackW + iconGap + (overflow > 0 ? stretchX * 0.18 : 0);
    ctx.save();
    ctx.translate(rightIconX, visualY0 + visualTrackH / 2);
    ctx.scale(overflow > 0 ? 1 + stretchMag * 0.55 : activeScale, overflow > 0 ? 1 + stretchMag * 0.55 : activeScale);
    ctx.fillText('+', 0, 0);
    ctx.restore();

    // Track stays structurally fixed; only height/breathing responds.
    ctx.save();

    // Shadow for depth
    ctx.shadowBlur = 8 * (activeScale - 1);
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(88,110,117,0.18)';
    ctx.beginPath();
    roundRect(ctx, x0, visualY0, trackW, visualTrackH, visualTrackH * 0.5);
    ctx.fill();

    // Progress bar
    ctx.shadowBlur = 0;
    ctx.fillStyle = params.leftAdjusting && params.phase === 'circle'
        ? 'rgba(38,139,210,0.72)'
        : 'rgba(88,110,117,0.52)';
    const progressW = trackW * clamp(params.sliderNorm, 0, 1);
    if (progressW > 0) {
        ctx.beginPath();
        roundRect(ctx, x0, visualY0, progressW, visualTrackH, visualTrackH * 0.5);
        ctx.fill();
    }
    ctx.restore();

    // Handle (Knob)
    ctx.save();
    ctx.translate(finalHandleX, visualY0 + visualTrackH / 2);
    const velocityBulge = Math.abs(velocity) * 0.18;
    const overflowBulge = Math.abs(overflow) * 0.16;
    const edgeSquashX = 1 - edgePress * 0.24;
    const edgeSquashY = 1 + edgePress * 0.18;
    const handleScaleX = clamp((1 + velocityBulge + overflowBulge) * edgeSquashX, 0.72, 1.18);
    const handleScaleY = clamp((1 / (1 + velocityBulge * 0.65 + overflowBulge * 0.45)) * edgeSquashY, 0.88, 1.24);
    ctx.scale(handleScaleX * activeScale, handleScaleY * activeScale);

    ctx.shadowBlur = 12 * activeScale;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowOffsetY = 4 * activeScale;

    ctx.beginPath();
    ctx.arc(0, 0, 8 * (1 + stretchMag * 0.08 + edgePress * 0.04), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(88,110,117,0.98)';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(88,110,117,0.95)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const countLabel = params.countLabel || 'Split Count';
    ctx.fillText(`${countLabel}: ${params.splitCount}`, x0, visualY0 - labelOffset);
    ctx.restore();
}
