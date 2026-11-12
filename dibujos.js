/* Dibujos de los ejercicios de fuerza: un muñequito articulado (vista lateral) en 1-4 posiciones clave.
   Ángulos absolutos en grados: 0 = hacia abajo, 90 = hacia la derecha, 180 = hacia arriba, -90 = hacia la izquierda.
   Cada viñeta mide 100 x 100; el suelo está en y = 90. */
(function(){
const L = { T:24, NECK:9, HEAD:6.3, UA:13, FA:12, TH:17, SH:17 };
const dir = a => [Math.sin(a*Math.PI/180), Math.cos(a*Math.PI/180)];
const add = (p,a,len) => { const d = dir(a); return [p[0]+d[0]*len, p[1]+d[1]*len]; };
const r1 = n => Math.round(n*10)/10;

// Calcula las articulaciones a partir de la postura
function joints(p){
  const hip = p.hip, neck = add(hip,p.t,L.T), head = add(neck,p.h ?? p.t,L.NECK);
  const [af,an] = p.a, [lf,ln] = p.l;
  const e1 = add(neck,af[0],L.UA), h1 = add(e1,af[1],L.FA), e2 = add(neck,an[0],L.UA), h2 = add(e2,an[1],L.FA);
  const k1 = add(hip,lf[0],L.TH), f1 = add(k1,lf[1],L.SH), k2 = add(hip,ln[0],L.TH), f2 = add(k2,ln[1],L.SH);
  return { hip, neck, head, e1, h1, e2, h2, k1, f1, k2, f2 };
}
const pl = pts => pts.map(p=>r1(p[0])+","+r1(p[1])).join(" ");

function figure(p, ox){
  const j = joints(p), T = (x)=>[x[0]+ox, x[1]];
  const limb = (a,b,c,far) => `<polyline points="${pl([T(a),T(b),T(c)])}" class="dj-limb${far?" dj-far":""}"/>`;
  return limb(j.hip,j.k1,j.f1,true) + limb(j.neck,j.e1,j.h1,true)
    + `<line x1="${r1(j.hip[0]+ox)}" y1="${r1(j.hip[1])}" x2="${r1(j.neck[0]+ox)}" y2="${r1(j.neck[1])}" class="dj-torso"/>`
    + `<circle cx="${r1(j.head[0]+ox)}" cy="${r1(j.head[1])}" r="${L.HEAD}" class="dj-head"/>`
    + limb(j.hip,j.k2,j.f2,false) + limb(j.neck,j.e2,j.h2,false);
}

// Material y flechas
function prop(o, ox, j){
  const X = x => r1(x+ox);
  switch (o.k){
    case "box":  return `<rect x="${X(o.x)}" y="${o.y}" width="${o.w}" height="${90-o.y}" rx="2" class="dj-prop"/>`;
    case "chair":return `<rect x="${X(o.x)}" y="${o.y}" width="${o.w}" height="${90-o.y}" rx="2" class="dj-prop"/><line x1="${X(o.x+(o.back==="r"?o.w:0))}" y1="${o.y}" x2="${X(o.x+(o.back==="r"?o.w:0))}" y2="${o.y-16}" class="dj-propline"/>`;
    case "hurdle": { const h = o.h||14; return `<line x1="${X(o.x)}" y1="90" x2="${X(o.x)}" y2="${90-h}" class="dj-propline"/><line x1="${X(o.x-2)}" y1="${90-h}" x2="${X(o.x+6)}" y2="${90-h}" class="dj-propline" style="stroke-width:3"/>`; }
    case "ball": return `<circle cx="${X(o.x)}" cy="${o.y}" r="${o.r||5}" class="dj-ball"/>`;
    case "db": { const h = j[o.j||"h2"]; return `<line x1="${X(h[0]-4)}" y1="${r1(h[1])}" x2="${X(h[0]+4)}" y2="${r1(h[1])}" class="dj-weight" style="stroke-width:2.4"/><circle cx="${X(h[0]-4)}" cy="${r1(h[1])}" r="2.6" class="dj-weightf"/><circle cx="${X(h[0]+4)}" cy="${r1(h[1])}" r="2.6" class="dj-weightf"/>`; }
    case "plate": { const h = j[o.j||"h2"]; return `<circle cx="${X(h[0])}" cy="${r1(h[1])}" r="${o.r||5.5}" class="dj-weightf"/><circle cx="${X(h[0])}" cy="${r1(h[1])}" r="1.4" class="dj-hole"/>`; }
    case "cable": { const h = j[o.j||"h2"]; return `<line x1="${X(h[0])}" y1="4" x2="${X(h[0])}" y2="${r1(h[1])}" class="dj-cable"/><line x1="${X(h[0]-8)}" y1="4" x2="${X(h[0]+8)}" y2="4" class="dj-propline"/>`; }
    case "arr":  return `<path d="${o.d}" transform="translate(${ox} 0)" class="dj-arrow" marker-end="url(#djA)"/>`;
    case "txt":  return `<text x="${X(o.x)}" y="${o.y}" class="dj-txt">${o.t}</text>`;
    default: return "";
  }
}

function svg(frames, title){
  const W = 100*frames.length;
  let s = `<svg viewBox="0 0 ${W} 100" class="dj" role="img" aria-label="${title.replace(/"/g,"&quot;")}"><defs><marker id="djA" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dj-arrowhead"/></marker></defs>`;
  frames.forEach((f,i)=>{
    const ox = i*100, j = joints(f);
    if (i>0) s += `<line x1="${ox}" y1="12" x2="${ox}" y2="86" class="dj-sep"/>`;
    s += `<line x1="${ox+4}" y1="90" x2="${ox+96}" y2="90" class="dj-ground"/>`;
    (f.under||[]).forEach(o=>{ s += prop(o,ox,j); });
    s += figure(f,ox);
    (f.props||[]).forEach(o=>{ s += prop(o,ox,j); });
    if (frames.length>1) s += `<circle cx="${ox+9}" cy="10" r="6" class="dj-num"/><text x="${ox+9}" y="13.2" class="dj-numt">${i+1}</text>`;
  });
  return s + `</svg>`;
}

/* ---------- Posturas base ---------- */
const P = (o) => Object.assign({ t:180, a:[[8,4],[-6,-2]], l:[[3,-2],[-3,2]] }, o);
const STAND   = (x=50,o={}) => P(Object.assign({ hip:[x,56] }, o));
const ARMS_UP = [[178,178],[172,172]];
const SQUAT   = (x=44,o={}) => P(Object.assign({ hip:[x,69], t:155, a:[[95,95],[90,90]], l:[[75,-12],[70,-12]] }, o));
const CROUCH  = (x=40,o={}) => P(Object.assign({ hip:[x,77], t:128, a:[[6,6],[12,12]], l:[[102,-22],[98,-20]] }, o));
const PLANK   = (x=48.4,o={}) => P(Object.assign({ hip:[x,75.3], t:115.5, a:[[0,0],[2,2]], l:[[-64.5,-64.5],[-62,-66]] }, o));
const PUSHLOW = (x=46.5,o={}) => P(Object.assign({ hip:[x,83], t:102, a:[[-81,33],[-81,33]], l:[[-78,-78],[-76,-80]] }, o));
const SUPINE  = (x=56,o={}) => P(Object.assign({ hip:[x,84], t:-90, h:-90, a:[[-90,-90],[-90,-90]], l:[[90,90],[90,90]] }, o));
const PRONE   = (x=44,o={}) => P(Object.assign({ hip:[x,85], t:90, h:90, a:[[90,90],[90,90]], l:[[-90,-90],[-90,-90]] }, o));
const SIT     = (x=45,o={}) => P(Object.assign({ hip:[x,86], t:-160, a:[[-20,-20],[-18,-18]], l:[[110,110],[108,108]] }, o));

/* ---------- Dibujos de cada ejercicio (mismo orden que ejercicios.json) ---------- */
const arr = d => ({ k:"arr", d });
const D = {
  pfg1: [
    [ // Calentamiento: abdominales
      [SUPINE(58,{ a:[[-90,-90],[-90,-90]], l:[[150,40],[96,96]] }), SUPINE(58,{ a:[[-90,-90],[-90,-90]], l:[[96,96],[150,40]], props:[arr("M70 62 Q78 54 84 64")] })],
      [SUPINE(58,{ a:[[-90,-90],[-90,-90]] }), P({ hip:[50,86], t:-135, h:-130, a:[[120,120],[125,125]], l:[[90,90],[135,135]], props:[arr("M30 50 Q40 38 52 44")] })],
      [SIT(42,{ l:[[150,80],[146,82]], props:[arr("M66 66 Q78 62 84 70")] }), SIT(42,{ l:[[112,108],[108,104]] })],
      [SUPINE(54,{ a:[[-150,40],[-150,40]], l:[[135,20],[132,22]] }), P({ hip:[54,85], t:-128, h:-120, a:[[-160,30],[-160,30]], l:[[135,20],[132,22]], props:[arr("M24 66 Q30 52 42 50")] })],
    ],
    [ // Circuito
      [STAND(46,{ a:[[95,95],[90,90]], l:[[3,-2],[60,60]], under:[{k:"chair",x:16,y:68,w:18,back:"l"}] }),
       P({ hip:[34,66], t:165, a:[[95,95],[90,90]], l:[[70,-8],[78,78]], under:[{k:"chair",x:16,y:68,w:18,back:"l"}], props:[arr("M54 40 L54 56")] })],
      [P({ hip:[36,66], t:118, a:[[25,25],[28,28]], l:[[-62,-62],[-60,-64]], under:[{k:"box",x:56,y:70,w:22}] }),
       P({ hip:[40,72], t:108, a:[[-60,40],[-60,40]], l:[[-70,-70],[-68,-72]], under:[{k:"box",x:56,y:70,w:22}], props:[arr("M78 44 L74 56")] })],
      [SUPINE(56,{ a:[[-90,-90],[90,90]] }), SUPINE(56,{ a:[[-90,-90],[150,150]], l:[[90,90],[160,160]], props:[arr("M80 78 Q88 60 74 46")] })],
      [CROUCH(36,{ a:[[-40,-30],[-36,-30]], under:[{k:"box",x:58,y:76,w:26}] }),
       P({ hip:[70,49], t:172, a:[[120,120],[115,115]], l:[[40,-30],[36,-28]], under:[{k:"box",x:58,y:76,w:26}], props:[arr("M30 64 Q44 26 60 40")] })],
      [STAND(50), CROUCH(40,{ a:[[30,0],[32,0]] }), PLANK(), PUSHLOW()],
      [PRONE(44), PRONE(44,{ t:96, h:100, l:[[-90,-90],[-125,-125]], props:[arr("M18 74 Q14 62 22 56")] })],
      [STAND(50), CROUCH(40,{ a:[[30,0],[32,0]] }), PLANK()],
      [P({ hip:[42,62], t:172, a:[[-29,-29],[-27,-27]], l:[[50,50],[48,48]], under:[{k:"box",x:12,y:62,w:22}] }),
       P({ hip:[42,74], t:172, a:[[-100,-4],[-98,-4]], l:[[64,64],[62,62]], under:[{k:"box",x:12,y:62,w:22}], props:[arr("M60 40 L60 56")] })],
      [SUPINE(56,{ a:[[-90,-90],[-90,-90]] }), P({ hip:[48,86], t:-140, h:-135, a:[[140,140],[136,136]], l:[[140,140],[136,136]], props:[arr("M18 66 Q24 46 40 44")] })],
    ],
  ],
  training: [
    [
      [PLANK(48.4,{ l:[[-64.5,-64.5],[60,-30]] }), PLANK(48.4,{ l:[[60,-30],[-64.5,-64.5]], props:[arr("M36 64 Q46 58 56 64")] })],
      [SUPINE(54,{ a:[[-90,-90],[-90,-90]], l:[[180,180],[178,178]] }), SUPINE(54,{ a:[[-90,-90],[-90,-90]], l:[[135,135],[132,132]], props:[arr("M54 30 Q68 30 74 42")] })],
      [STAND(28,{ under:[{k:"hurdle",x:52,h:12}] }), P({ hip:[56,46], t:180, a:[[120,120],[115,115]], l:[[80,-10],[76,-8]], under:[{k:"hurdle",x:52,h:12}], props:[arr("M30 40 Q48 18 66 30")] })],
      [SUPINE(56,{ a:[[-90,-90],[90,90]] }), SUPINE(56,{ a:[[-90,-90],[150,150]], l:[[90,90],[160,160]], props:[arr("M80 78 Q88 60 74 46")] })],
      [P({ hip:[50,60], t:180, a:[[-30,-20],[30,40]], l:[[40,-5],[-30,0]] }), P({ hip:[50,60], t:180, a:[[30,40],[-30,-20]], l:[[-30,0],[40,-5]], props:[arr("M30 30 Q50 20 70 30")] })],
      [SUPINE(58,{ a:[[-90,-90],[-90,-90]] }), P({ hip:[50,86], t:-135, h:-130, a:[[120,120],[125,125]], l:[[90,90],[135,135]], props:[arr("M30 50 Q40 38 52 44")] })],
      [CROUCH(36,{ a:[[-40,-30],[-36,-30]], under:[{k:"box",x:58,y:76,w:26}] }),
       P({ hip:[70,49], t:172, a:[[120,120],[115,115]], l:[[40,-30],[36,-28]], under:[{k:"box",x:58,y:76,w:26}], props:[arr("M30 64 Q44 26 60 40")] })],
      [SUPINE(54,{ a:[[-90,-90],[-90,-90]], l:[[150,40],[120,120]] }), SUPINE(54,{ a:[[-90,-90],[-90,-90]], l:[[120,120],[150,40]], props:[arr("M62 54 Q72 46 80 54")] })],
      [PLANK(), CROUCH(40,{ a:[[30,0],[32,0]], props:[arr("M22 76 Q30 66 40 72")] })],
      [STAND(46,{ a:[[95,95],[90,90]], l:[[3,-2],[60,60]], under:[{k:"chair",x:16,y:68,w:18,back:"l"}] }),
       P({ hip:[34,66], t:165, a:[[95,95],[90,90]], l:[[70,-8],[78,78]], under:[{k:"chair",x:16,y:68,w:18,back:"l"}], props:[arr("M54 40 L54 56")] })],
      [SUPINE(56,{ a:[[-90,-90],[-90,-90]] }), P({ hip:[48,86], t:-140, h:-135, a:[[140,140],[136,136]], l:[[140,140],[136,136]], props:[arr("M18 66 Q24 46 40 44")] })],
      [CROUCH(40,{ a:[[20,10],[18,8]], props:[{k:"db",j:"h2"}] }), STAND(50,{ a:[[60,20],[178,178]], props:[{k:"db",j:"h2"}, arr("M30 70 Q24 40 40 20")] })],
    ],
  ],
  pfg4: [
    [
      [P({ hip:[50,68], t:-90, h:-90, a:[[-140,-150],[-140,-150]], l:[[110,0],[108,0]], under:[{k:"box",x:20,y:70,w:40}], props:[{k:"plate",j:"h2",r:4}] }),
       P({ hip:[50,68], t:-90, h:-90, a:[[178,178],[176,176]], l:[[110,0],[108,0]], under:[{k:"box",x:20,y:70,w:40}], props:[{k:"plate",j:"h2",r:4}, arr("M10 50 Q14 30 26 26")] })],
      [STAND(50,{ a:[[4,4],[0,0]], props:[{k:"db",j:"h2"}] }), P({ hip:[50,58], t:155, h:150, a:[[20,10],[5,0]], l:[[3,-2],[-3,2]], props:[{k:"db",j:"h2"}, arr("M70 24 Q78 34 76 46")] })],
      [P({ hip:[50,72], t:180, a:[[175,175],[170,170]], l:[[90,0],[88,0]], under:[{k:"box",x:34,y:74,w:24}], props:[{k:"cable",j:"h2"}] }),
       P({ hip:[50,72], t:180, a:[[-20,170],[20,170]], l:[[90,0],[88,0]], under:[{k:"box",x:34,y:74,w:24}], props:[{k:"cable",j:"h2"}, arr("M66 22 L66 38")] })],
      [SUPINE(56,{ a:[[90,90],[90,90]] }), SUPINE(50,{ a:[[90,90],[90,90]], l:[[180,180],[176,176]], props:[arr("M86 76 Q84 56 66 46")] })],
      [STAND(50,{ a:[[30,170],[26,168]], props:[{k:"plate",j:"h2"}] }), STAND(50,{ a:[[178,178],[176,176]], props:[{k:"plate",j:"h2"}, arr("M66 40 L66 20")] })],
      [PRONE(44,{ a:[[-90,-90],[-90,-90]], props:[{k:"plate",j:"h2",r:4}] }), PRONE(46,{ t:116, h:122, a:[[112,116],[110,114]], l:[[-86,-86],[-84,-84]], props:[{k:"plate",j:"h2",r:4}, arr("M80 74 Q90 66 90 56")] })],
      [P({ hip:[46,62], t:118, a:[[0,0],[2,2]], l:[[-82,-82],[-80,-84]], under:[{k:"box",x:4,y:66,w:18}] }),
       P({ hip:[46,70], t:104, a:[[-75,35],[-75,35]], l:[[-86,-86],[-84,-88]], under:[{k:"box",x:4,y:66,w:18}], props:[arr("M80 48 L76 60")] })],
      [STAND(50,{ a:[[4,4],[0,0]], props:[{k:"plate",j:"h2",r:4.5}] }), STAND(50,{ a:[[4,170],[0,165]], props:[{k:"plate",j:"h2",r:4.5}, arr("M68 72 Q76 60 68 48")] })],
    ],
  ],
  vallas: [
    [
      [SQUAT(44,{ a:[[60,60],[50,50]] }), P({ hip:[50,46], t:180, a:[[176,176],[172,172]], l:[[2,0],[-2,0]], props:[arr("M72 70 L72 46")] })],
      [P({ hip:[50,49], t:172, a:[[125,125],[118,118]], l:[[85,-5],[80,-2]], under:[{k:"hurdle",x:20,h:11},{k:"hurdle",x:46,h:11},{k:"hurdle",x:72,h:11}], props:[arr("M24 66 Q36 46 48 66"), arr("M50 66 Q62 46 74 66")] })],
    ],
    [
      [P({ hip:[40,56], t:180, a:[[30,170],[26,168]], l:[[3,-2],[60,0]], under:[{k:"box",x:50,y:72,w:22}], props:[{k:"plate",j:"h2"}] }),
       P({ hip:[58,40], t:180, a:[[30,170],[26,168]], l:[[3,-2],[100,0]], under:[{k:"box",x:50,y:72,w:22}], props:[{k:"plate",j:"h2"}, arr("M30 60 Q36 40 50 36")] })],
      [P({ hip:[50,49], t:172, a:[[125,125],[118,118]], l:[[85,-5],[80,-2]], under:[{k:"hurdle",x:20,h:11},{k:"hurdle",x:46,h:11},{k:"hurdle",x:72,h:11}], props:[arr("M24 66 Q30 50 40 60"), arr("M40 60 Q52 44 62 66"), {k:"txt",x:6,y:20,t:"izq · der"}] })],
    ],
    [
      [STAND(50,{ a:[[30,170],[26,168]], l:[[3,-2],[-3,2]], props:[{k:"plate",j:"h2"}] }), STAND(50,{ hip:[50,51], a:[[30,170],[26,168]], props:[{k:"plate",j:"h2"}, arr("M72 76 L72 62")] })],
      [P({ hip:[50,49], t:172, a:[[125,125],[118,118]], l:[[85,-5],[80,-2]], under:[{k:"hurdle",x:20,h:11},{k:"hurdle",x:46,h:11},{k:"hurdle",x:72,h:11}], props:[arr("M24 66 Q36 46 48 66"), arr("M50 66 Q62 46 74 66")] })],
    ],
    [
      [STAND(50,{ a:[[30,170],[26,168]], props:[{k:"plate",j:"h2"}] }), P({ hip:[46,68], t:180, a:[[30,170],[26,168]], l:[[-40,-5],[85,0]], props:[{k:"plate",j:"h2"}, arr("M72 40 L72 58")] })],
      [P({ hip:[44,58], t:172, a:[[115,140],[-40,-25]], l:[[-28,-6],[92,40]], under:[{k:"hurdle",x:66,h:18}], props:[arr("M26 84 Q52 54 86 76")] })],
    ],
  ],
};

window.HC_DIBUJO = function(cid, bi, ei, title){
  const f = D[cid]?.[bi]?.[ei];
  return f ? svg(f, title||"") : "";
};
})();
