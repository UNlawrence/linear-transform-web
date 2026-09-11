export function createMatrixControl(onChange) {
    const card = document.createElement('section');
    card.className = 'case-matrix';
    card.setAttribute('aria-label', '矩阵 A');
    card.innerHTML = `<span>A</span><div class="case-matrix-cells">${[1,0,0,1].map((v,i)=>`<input type="number" step="any" aria-label="矩阵第 ${Math.floor(i/2)+1} 行第 ${i%2+1} 列" value="${v}">`).join('')}</div><small>det A = 1</small>`;
    card.addEventListener('input', () => {
        const inputs=[...card.querySelectorAll('input')];
        const matrix=inputs.map(input=>input.valueAsNumber);
        if(matrix.every(Number.isFinite)) onChange(matrix);
    });
    return { element:card, update(matrix, sync=true) {
        if(sync) card.querySelectorAll('input').forEach((input,i)=>input.value=String(Math.round(matrix[i]*10000)/10000));
        card.querySelector('small').textContent=`det A = ${Number((matrix[0]*matrix[3]-matrix[1]*matrix[2]).toFixed(4))}`;
    }};
}
