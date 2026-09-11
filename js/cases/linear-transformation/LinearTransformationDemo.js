import { eventBus } from '../../framework/EventBus.js';
import { IRenderPlugin } from '../../core/abstract/IRenderPlugin.js';
import { ElasticSliderComponent } from '../../plugin/ui/ElasticSliderComponent.js';
import { ensureStyle } from '../../common/StyleRegistry.js';
import { stateStore } from '../../framework/StateStore.js';
import { createMatrixControl } from './MatrixControl.js';
import { renderCanvas } from './LinearTransformCanvas.js';
const identity=[1,0,0,1];
export class LinearTransformationDemo extends IRenderPlugin {
    constructor() { super('linear-transformation','二维线性变换'); this.matrix=[...identity]; }
    onEnable() {
        this.active=true;
        ensureStyle('linear-transformation-case', `
            .case-linear-menu[hidden] { display:none; }
            .case-linear-content { position:fixed; z-index:5; pointer-events:none; color:var(--text-color); }
            .case-linear-content svg { width:100%; height:100%; fill:none; stroke-width:.014; overflow:hidden; }
            .case-linear-content text { font-size:.19px; font-family:serif; }
            .case-linear-controls { position:absolute; bottom:90px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:16px; color:var(--text-color); font:13px var(--font-main, sans-serif); }
            .case-matrix { display:grid; grid-template-columns:16px 96px; gap:4px; align-items:center; }
            .case-matrix-cells { display:grid; grid-template-columns:1fr 1fr; border-inline:1px solid currentColor; padding:0 4px; }
            .case-matrix input { width:40px; border:0; background:transparent; color:inherit; text-align:center; padding:4px 0; font:inherit; appearance:textfield; }
            .case-matrix input::-webkit-inner-spin-button { appearance:none; }
            .case-matrix small { grid-column:2; text-align:center; font-size:10px; opacity:.6; }
            .case-linear-controls button { background:transparent; color:inherit; border:0; padding:6px; cursor:pointer; font:inherit; white-space:nowrap; }
            .case-linear-menu { position:absolute; bottom:calc(100% + 8px); padding:8px; min-width:140px; border:1px solid var(--border-color,#d9d0ba); border-radius:8px; background:var(--panel-bg,#fdf6e3); box-shadow:0 8px 24px #0001; }
            .case-linear-menu button { display:block; width:100%; text-align:left; }
            .case-linear-menu button:hover { background:#8882; }
        `);
        this.content=document.createElement('div'); this.content.className='case-linear-content';
        this.content.innerHTML='<svg viewBox="-2.5 -2.5 5 5" role="img" aria-label="二维线性变换：原图与变换结果，基向量与变换后的基向量"></svg>';
        document.body.append(this.content); this.svg=this.content.firstElementChild;
        this.slider=new ElasticSliderComponent({isEnabled:()=>this.active && ['geometry','cases'].includes(stateStore.getState('workspace')), onChangeNorm:n=>this.setMatrix(this.rotation(n*360))});
        this.slider.mount(); this.slider.reset(((Math.atan2(this.matrix[2],this.matrix[0])*180/Math.PI+360)%360)/360);
        this.sliderStyle=this.slider._root.getAttribute("style");
        this.controls=document.createElement('div'); this.controls.className='case-linear-controls';
        this.card=createMatrixControl(m=>this.setMatrix(m,false)); this.controls.append(this.card.element);
        this.addMenu('变换', [['单位矩阵',identity],['伸缩',[2,0,0,1]],['旋转',this.rotation(30)],['剪切',[1,1,0,1]],['反射',[-1,0,0,1]],['投影',[1,0,0,0]]].map(([label,m])=>[label,()=>this.setMatrix(m)]));
        this.addMenu('显示', [
            ['原图：房子', () => this.setShape('house')],
            ['原图：80 周年图片', () => this.setShape('anniversary')],
            ['原始 / 变换网格', () => { this.grid=!this.grid; this.draw(); }],
            ['教学信息', () => { this.showTeaching=true; this.updateTeaching(true); }],
        ]);
        this.slider._root.append(this.controls);
        this.closeMenus=e=>{if(e.type==='keydown' && e.key!=='Escape')return;if(e.type==='pointerdown' && this.controls.contains(e.target))return;this.controls.querySelectorAll('.case-linear-menu').forEach(el=>el.hidden=true);this.controls.querySelectorAll('[aria-expanded]').forEach(el=>el.setAttribute('aria-expanded','false'));};
        document.addEventListener('pointerdown',this.closeMenus);document.addEventListener('keydown',this.closeMenus);
        this.frame=0; this.started=0; this.card.update(this.matrix); this.draw();
        const tick=()=>{if(!this.active)return;this.layout();this.slider.step(1/60);this.slider.updateDOM({countLabel:'旋转角度',phase:'rotation'});this.frame=requestAnimationFrame(tick);};tick();
    }
    rotation(deg){const t=deg*Math.PI/180;return [Math.cos(t),-Math.sin(t),Math.sin(t),Math.cos(t)];}
    addMenu(label,items){
        const wrap=document.createElement('div'), trigger=document.createElement('button'), menu=document.createElement('div');
        trigger.textContent=label+' ▾';trigger.setAttribute('aria-expanded','false');menu.className='case-linear-menu';menu.hidden=true;
        trigger.onclick=()=>{const open=menu.hidden;this.closeMenus?.({type:'keydown',key:'Escape'});menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));};
        items.forEach(([name,action])=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');action();};menu.append(b);});wrap.append(trigger,menu);this.controls.append(wrap);
    }
    setMatrix(matrix,sync=true){
        const from=[...this.matrix]; this.matrix=[...matrix];this.card.update(matrix,sync);
        if (this.showTeaching) this.updateTeaching();
        const angle=(Math.atan2(matrix[2],matrix[0])*180/Math.PI+360)%360;this.slider.syncValue(angle/360);
        cancelAnimationFrame(this.animation);const start=performance.now();
        const tick=now=>{const t=Math.min(1,(now-start)/220);renderCanvas(this.svg,from.map((v,i)=>v+(matrix[i]-v)*(1-(1-t)**3)),this.grid,this.originalShape);if(t<1)this.animation=requestAnimationFrame(tick);};this.animation=requestAnimationFrame(tick);
    }
    setShape(shape) {
        this.originalShape=shape;
        cancelAnimationFrame(this.animation);
        this.draw();
    }
    updateTeaching(reveal=false) {
        const [a,b,c,d]=this.matrix, det=a*d-b*c;
        const rank=this.matrix.every(v=>v===0)?0:Math.abs(det)<1e-9?1:2;
        const status=rank<2?'不可逆：图形压缩到低维':det<0?'方向翻转':'方向保持';
        const fmt=value=>String(Number(value.toFixed(4)));
        const latex=String.raw`\begin{gathered}\det A = ${fmt(det)},\quad \operatorname{rank} A = ${rank}\\\text{${status}}\\\text{面积缩放倍数：}${fmt(Math.abs(det))}\end{gathered}`;
        eventBus.emit('CASE_TEACHING_INFORMATION', { latex, reveal });
    }
    draw(){renderCanvas(this.svg,this.matrix,this.grid,this.originalShape);}
    layout(){
        const sidebar=document.getElementById('ui-overlay')?.getBoundingClientRect();
        const breadcrumb=document.getElementById('breadcrumb-container')?.getBoundingClientRect();
        const caseLeft=Math.max(24,(sidebar?.right||300)+32);
        this.slider._root.style.left=`${caseLeft+(innerWidth-caseLeft-48)/2}px`;
        this.slider._root.style.width=`${Math.max(160,Math.min(430,innerWidth-caseLeft-80))}px`;
        const tray=this.controls.getBoundingClientRect();
        const left=Math.max(24,(sidebar?.right||300)+32), top=Math.max(96,(breadcrumb?.bottom||64)+32);
        Object.assign(this.content.style,{left:`${left}px`,top:`${top}px`,width:`${Math.max(80,innerWidth-left-48)}px`,height:`${Math.max(80,tray.top-top-32)}px`});
        this.content.hidden=!['geometry','cases'].includes(stateStore.getState('workspace'));
    }
    onDisable(){if(this.showTeaching){eventBus.emit('CASE_TEACHING_INFORMATION',{latex:'',reveal:false});this.showTeaching=false;}this.active=false;cancelAnimationFrame(this.frame);cancelAnimationFrame(this.animation);this.slider?.unmount();if(this.sliderStyle===null)this.slider?._root.removeAttribute("style");else if(this.slider)this.slider._root.setAttribute("style",this.sliderStyle);this.content?.remove();this.controls?.remove();document.removeEventListener('pointerdown',this.closeMenus);document.removeEventListener('keydown',this.closeMenus);}
}
export const linearTransformationDemo=new LinearTransformationDemo();
