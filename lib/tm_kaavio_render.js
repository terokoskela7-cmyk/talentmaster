/* tm_kaavio_render.js — §3-specin renderöijä (SVG). Uutettu prototyypin tm_kaavio_review.html:stä.
   KIELITIETOINEN: spec.nimi/tilanne/selitteet[].t ovat {fi,sv,en}; drawSpec(spec, lang) valitsee
   kielen ja putoaa fi:hin kun käännös puuttuu — sama kuvio kuin _ttSv/_taksNimi VP:ssä.
   ⚠ C1: spec tallennetaan kielineutraalina (avain + enum fi), käännös tapahtuu VAIN täällä.

   §1 koordinaatisto: Opta 100x100, origo ylävasen. Mittasuhde: x-yksikkö 0,68 m, y-yksikkö 1,05 m →
   sama px/metri molemmilla akseleilla. PX/PY toteuttavat tämän täyskenttänä (VW=300, VH=450).
   ⚠ ÄLÄ korvaa näitä editorin omalla 66 %-mapilla — se rikkoisi hit-testauksen (lukittu oppi).

   Vaatii DOMin (createElementNS) → testataan headless-selaimella, ei node-sandboxissa. */

const NS="http://www.w3.org/2000/svg";
const VW=300,VH=450,PAD=12,PPM=(VW-2*PAD)/68;
const PX=x=>PAD+(x/100)*(VW-2*PAD),PY=y=>PAD+(y/100)*(VH-2*PAD),R2=(x,y)=>[PX(x),PY(y)];
const degTo=(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax)*180/Math.PI;
const focusOf=s=>s.pelaajat.find(p=>p.pallo)||s.pelaajat.find(p=>p.rooli==="vastaanottaja")||s.pelaajat[0];
const el=(t,a={})=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
function defs(svg){const d=el("defs");[["ah-teal","var(--accent)"],["ah-slate","var(--slate)"]].forEach(([id,c])=>{const mk=el("marker",{id,viewBox:"0 0 10 10",refX:8.5,refY:5,markerWidth:6.5,markerHeight:6.5,orient:"auto-start-reverse"});mk.append(el("path",{d:"M0,0 L10,5 L0,10 z",fill:c}));d.append(mk);});svg.append(d);}
function pitch(g){const L="var(--line)",cr=9.15*PPM;
  g.append(el("rect",{x:PX(0),y:PY(0),width:PX(100)-PX(0),height:PY(100)-PY(0),fill:"none",stroke:L,"stroke-width":1,rx:2}));
  g.append(el("line",{x1:PX(0),y1:PY(50),x2:PX(100),y2:PY(50),stroke:L,"stroke-width":1}));
  g.append(el("circle",{cx:PX(50),cy:PY(50),r:cr,fill:"none",stroke:L,"stroke-width":1}));
  g.append(el("rect",{x:PX(21),y:PY(84.3),width:PX(79)-PX(21),height:PY(100)-PY(84.3),fill:"none",stroke:L,"stroke-width":1}));
  g.append(el("path",{d:`M${PX(39.3)},${PY(84.3)} A${cr},${cr} 0 0 1 ${PX(60.7)},${PY(84.3)}`,fill:"none",stroke:L,"stroke-width":1}));
  g.append(el("line",{x1:PX(44),y1:PY(100),x2:PX(56),y2:PY(100),stroke:"var(--ink3)","stroke-width":2.4}));
  g.append(el("rect",{x:PX(21),y:PY(0),width:PX(79)-PX(21),height:PY(15.7)-PY(0),fill:"none",stroke:L,"stroke-width":1}));
  g.append(el("path",{d:`M${PX(39.3)},${PY(15.7)} A${cr},${cr} 0 0 0 ${PX(60.7)},${PY(15.7)}`,fill:"none",stroke:L,"stroke-width":1}));
  g.append(el("line",{x1:PX(44),y1:PY(0),x2:PX(56),y2:PY(0),stroke:"var(--ink3)","stroke-width":2.4}));}
function sector(cx,cy,dir,half,r){const a0=(dir-half)*Math.PI/180,a1=(dir+half)*Math.PI/180;return `M${cx},${cy} L${cx+r*Math.cos(a0)},${cy+r*Math.sin(a0)} A${r},${r} 0 0 1 ${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} Z`;}
function wavy(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,amp=2.6,wl=8,wend=Math.max(6,len-8),nW=Math.max(1,Math.round(wend/wl)),steps=Math.max(10,nW*7);let d=`M${x1},${y1}`;for(let i=1;i<=steps;i++){const t=(i/steps)*wend,off=Math.sin((t/wend)*nW*Math.PI*2)*amp;d+=` L${x1+ux*t+nx*off},${y1+uy*t+ny*off}`;}return d+` L${x2-ux*3},${y2-uy*3}`;}
function orientArc(g,x,y,r,deg,color){const a=deg*Math.PI/180,sp=1.15,rr=r+3;g.append(el("path",{d:`M${x+rr*Math.cos(a-sp)},${y+rr*Math.sin(a-sp)} A${rr},${rr} 0 0 1 ${x+rr*Math.cos(a+sp)},${y+rr*Math.sin(a+sp)}`,fill:"none",stroke:color,"stroke-width":1.7,"stroke-linecap":"round"}));}
function drawSpec(s,lang){
  const svg=el("svg",{class:"pitch",viewBox:`0 0 ${VW} ${VH}`,role:"img"});defs(svg);const g=el("g");svg.append(g);pitch(g);
  if(s.vyohyke){const z=s.vyohyke;g.append(el("rect",{x:PX(z.x),y:PY(z.y),width:PX(z.x+z.w)-PX(z.x),height:PY(z.y+z.h)-PY(z.y),fill:"none",stroke:"var(--teal-brd)","stroke-width":1,"stroke-dasharray":"4 3",rx:1}));}
  (s.korkeuslinjat||[]).forEach(kl=>{const y=PY(kl.y);g.append(el("line",{x1:PX(2),y1:y,x2:PX(98),y2:y,stroke:"var(--red)","stroke-width":1.3,"stroke-dasharray":"7 4",opacity:.8}));});
  (s.peittovarjot||[]).forEach(pv=>{const F=s.pelaajat.find(p=>p.id===pv.from),Tt=s.pelaajat.find(p=>p.id===pv.to);if(!F||!Tt)return;const[fx,fy]=R2(F.x,F.y),[tx,ty]=R2(Tt.x,Tt.y);const dx=tx-fx,dy=ty-fy,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux,ext=L*1.35,ex=fx+ux*ext,ey=fy+uy*ext,w=13;g.append(el("path",{d:`M${fx},${fy} L${ex+nx*w},${ey+ny*w} L${ex-nx*w},${ey-ny*w} Z`,fill:"var(--red)","fill-opacity":.13,stroke:"var(--red)","stroke-width":.8,"stroke-dasharray":"2 3","stroke-opacity":.5,"stroke-linejoin":"round"}));});
  const rc=s.pelaajat.find(p=>p.rooli==="vastaanottaja");
  if(s.cone&&rc){const[rx,ry]=R2(rc.x,rc.y),cr=s.cone.r*PPM;g.append(el("path",{d:sector(rx,ry,rc.avoin,s.cone.half,cr),fill:"var(--cone)",stroke:"var(--teal-brd)","stroke-width":1,"stroke-dasharray":"1.5 3","stroke-linejoin":"round"}));g.append(el("path",{d:sector(rx,ry,rc.avoin,s.cone.half*0.82,cr*0.55),fill:"var(--cone)",stroke:"none"}));}
  const focus=focusOf(s);const[fx,fy]=R2(focus.x,focus.y);const resolve=e=>e.ref?(()=>{const p=s.pelaajat.find(q=>q.id===e.ref);return[p.x,p.y];})():[e.x,e.y];
  (s.liikkeet||[]).forEach(li=>{const[ax,ay]=R2(...resolve(li.from)),[bx,by]=R2(...resolve(li.to));const f=li.from.ref&&s.pelaajat.find(p=>p.id===li.from.ref);const c=(f&&f.joukkue==="vastustaja")?"var(--slate)":"var(--accent)",mk=(f&&f.joukkue==="vastustaja")?"url(#ah-slate)":"url(#ah-teal)";const ang=Math.atan2(by-ay,bx-ax),gap=li.to.ref?12:2,ex=bx-gap*Math.cos(ang),ey=by-gap*Math.sin(ang);
    if(li.tyyppi==="kuljetus")g.append(el("path",{d:wavy(ax,ay,ex,ey),fill:"none",stroke:c,"stroke-width":1.9,"stroke-linecap":"round","marker-end":mk}));
    else if(li.tyyppi==="laukaus"){const nx=-Math.sin(ang),ny=Math.cos(ang),o=1.5;g.append(el("line",{x1:ax+nx*o,y1:ay+ny*o,x2:ex+nx*o,y2:ey+ny*o,stroke:c,"stroke-width":1.5,"stroke-linecap":"round","marker-end":mk}));g.append(el("line",{x1:ax-nx*o,y1:ay-ny*o,x2:ex-nx*o,y2:ey-ny*o,stroke:c,"stroke-width":1.5,"stroke-linecap":"round"}));}
    else{const a={x1:ax,y1:ay,x2:ex,y2:ey,stroke:c,"stroke-width":1.9,"stroke-linecap":"round","marker-end":mk};if(li.tyyppi==="syotto")a["stroke-dasharray"]="6 4";g.append(el("line",a));}});
  s.pelaajat.forEach(p=>{const[x,y]=R2(p.x,p.y);
    if(p.rooli==="vastaanottaja"){g.append(el("circle",{cx:x,cy:y,r:13,fill:"var(--halo)"}));orientArc(g,x,y,10,(p.avoin??-90)+180,"var(--accent)");g.append(el("circle",{cx:x,cy:y,r:9,fill:"var(--accent)",stroke:"var(--bg)","stroke-width":1.4}));const t=el("text",{x,y:y+3,"text-anchor":"middle","font-family":"var(--font-mono)","font-weight":600,"font-size":8.5,fill:"var(--bg)"});t.textContent=p.id;g.append(t);}
    else if(p.joukkue==="vastustaja"){if(p.gk){g.append(el("path",{d:`M${x},${y-8} L${x+7.5},${y+6} L${x-7.5},${y+6} Z`,fill:"var(--pitch)",stroke:"var(--slate)","stroke-width":1.8,"stroke-linejoin":"round"}));const t=el("text",{x,y:y+4,"text-anchor":"middle","font-family":"var(--font-mono)","font-weight":600,"font-size":6.5,fill:"var(--slate)"});t.textContent=p.id;g.append(t);}else{g.append(el("circle",{cx:x,cy:y,r:7,fill:"var(--pitch)",stroke:"var(--slate)","stroke-width":1.8}));orientArc(g,x,y,7,degTo(x,y,fx,fy)+180,"var(--slate)");const t=el("text",{x,y:y+2.6,"text-anchor":"middle","font-family":"var(--font-mono)","font-weight":600,"font-size":7,fill:"var(--slate)"});t.textContent=p.id;g.append(t);}}
    else{const rad=p.korostus?8:6;g.append(el("circle",{cx:x,cy:y,r:rad,fill:p.korostus?"var(--accent)":"var(--fade)",stroke:"var(--bg)","stroke-width":1}));orientArc(g,x,y,rad,degTo(x,y,fx,fy)+180,"var(--accent)");if(p.korostus){const t=el("text",{x,y:y+2.8,"text-anchor":"middle","font-family":"var(--font-mono)","font-weight":600,"font-size":7.5,fill:"var(--bg)"});t.textContent=p.id;g.append(t);}}
    if(p.pallo)g.append(el("circle",{cx:x+(p.rooli==="vastaanottaja"?11:8),cy:y-(p.rooli==="vastaanottaja"?9:7),r:2.8,fill:"var(--bone)",stroke:"var(--carbon)","stroke-width":.7}));});
  (s.selitteet||[]).forEach(se=>{const[x,y]=R2(se.x,se.y),right=se.x>58;if(right)g.append(el("line",{x1:x+5,y1:y,x2:x+1.5,y2:y,stroke:"var(--ink3)","stroke-width":1}));else g.append(el("line",{x1:x-5,y1:y,x2:x-1.5,y2:y,stroke:"var(--ink3)","stroke-width":1}));const t=el("text",{x:right?x-1:x+1,y:y+3,"text-anchor":right?"end":"start","font-family":"var(--font-sans)","font-weight":500,"font-size":8.5,fill:"var(--ink)"});t.textContent=se.t[lang];g.append(t);});
  return svg;
}

var TM_KAAVIO_RENDER = { drawSpec: drawSpec, kaavioPX: PX, kaavioPY: PY, KAAVIO_VW: VW, KAAVIO_VH: VH };
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_RENDER;
if (typeof window !== 'undefined') { window.drawSpec = drawSpec; window.TM_KAAVIO_RENDER = TM_KAAVIO_RENDER; }
