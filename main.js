// 入口：启用「二维线性变换」demo。
// 核心逻辑原样来自 frontend/legacy-src/js/cases/linear-transformation/LinearTransformationDemo.js，
// 本文件仅负责启动 + 把教学信息（原版经 eventBus 发给桌面 KaTeX 面板）渲染成纯文本。
import { linearTransformationDemo } from './js/cases/linear-transformation/LinearTransformationDemo.js';
import { eventBus } from './js/framework/EventBus.js';

const teachingEl = document.getElementById('teaching');

function latexToText(latex) {
    if (!latex) return '';
    return latex
        .replace(/\\begin\{gathered\}/g, '')
        .replace(/\\end\{gathered\}/g, '')
        .replace(/\\operatorname\{rank\}\s*A/g, 'rank A')
        .replace(/\\det\s*A/g, 'det A')
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\quad/g, '    ')
        .replace(/\\\\/g, '\n')
        .trim();
}

eventBus.on('CASE_TEACHING_INFORMATION', ({ latex, reveal }) => {
    if (reveal && latex) {
        teachingEl.textContent = latexToText(latex);
        teachingEl.classList.add('show');
    } else {
        teachingEl.classList.remove('show');
        teachingEl.textContent = '';
    }
});

linearTransformationDemo.onEnable();
