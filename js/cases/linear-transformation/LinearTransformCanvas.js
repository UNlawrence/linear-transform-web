const point = ([a,b,c,d], [x,y]) => [a*x+b*y, c*x+d*y];
const identity = [1,0,0,1];
const shape = [[-.9,-.8],[.9,-.8],[.9,.5],[0,1.3],[-.9,.5],[-.9,-.8]];
const path = (points, matrix=identity) => points.map((p,i) => { const [x,y]=point(matrix,p); return `${i?'L':'M'}${x} ${-y}`; }).join(' ');
const anniversaryImage = new URL('../../../assets/cases/linear-transformation/anniversary-80.png', import.meta.url).href;

// Conjugate the mathematical transform by the SVG y-axis inversion.
export function imageTransform([a, b, c, d]) {
    return `matrix(${a} ${-c} ${-b} ${d} 0 0)`;
}

export function renderCanvas(svg, matrix, grid=false, originalShape='house') {
    const line = (p,m=identity,extra='') => `<path d="${path(p,m)}" ${extra}/>`;
    const vector = (p,m,color,label,dy) => { const [x,y]=point(m,p); return `<g stroke="${color}" fill="${color}">${line([[0,0],p],m,'marker-end="url(#lt-arrow)"')}<text stroke="none" x="${x+.12}" y="${-y+dy}">${label}</text></g>`; };
    svg.innerHTML = `<defs><marker id="lt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="context-stroke"/></marker></defs>
    ${grid ? `<g stroke="currentColor" opacity=".12">${Array.from({length:9},(_,i)=>i-4).map(n=>line([[n,-4],[n,4]])+line([[-4,n],[4,n]])).join('')}</g><g stroke="#b86b42" opacity=".15">${Array.from({length:9},(_,i)=>i-4).map(n=>line([[n,-4],[n,4]],matrix)+line([[-4,n],[4,n]],matrix)).join('')}</g>`:''}
    <g stroke="currentColor" opacity=".3">${line([[-4,0],[4,0]])}${line([[0,-4],[0,4]])}</g>
    ${originalShape === 'anniversary' ? `
    <image href="${anniversaryImage}" x="-1.4" y="-1.07" width="2.8" height="2.14" preserveAspectRatio="xMidYMid meet" opacity=".22"/>
    <image href="${anniversaryImage}" x="-1.4" y="-1.07" width="2.8" height="2.14" preserveAspectRatio="xMidYMid meet" transform="${imageTransform(matrix)}"/>
    <path d="${path([[-1.4,-1.07],[1.4,-1.07],[1.4,1.07],[-1.4,1.07],[-1.4,-1.07]],matrix)}" stroke="#b8663e"/>
    ` : `<path d="${path(shape)}" stroke="#89999d" fill="#89999d" fill-opacity=".06" stroke-dasharray=".07 .06"/>
    <path d="${path(shape,matrix)}" stroke="#b8663e" fill="#b8663e" fill-opacity=".16"/>`}
    ${vector([1,0],identity,'#7f8c98','e₁',.3)}${vector([0,1],identity,'#7f8c98','e₂',.3)}
    ${vector([1,0],matrix,'#307c7b','Ae₁',-.16)}${vector([0,1],matrix,'#885574','Ae₂',-.16)}`;
}
