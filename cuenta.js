// Cuenta, suscripción y panel de administradora (Firebase Auth + Firestore).
// Usa las funciones globales de index.html: $, esc, S, P, savePerfil, render, route, fmtShort, mondayOf, addDays, ymd, today, z.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN = "maria.caparros.m@gmail.com";
const app = initializeApp(window.HC_FIREBASE), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = "es";
const A = window.HC_AUTH = { listo:false, user:null, datos:null, plan:null, admin:false, lista:null, aperturas:null, tab:"alta", msg:"", ok:"", busy:false, abierta:null };

const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const plataforma = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ? "iPhone" : /android/i.test(navigator.userAgent) ? "Android" : "Ordenador";
const fecha = ts => { const d = ts?.toDate ? ts.toDate() : null; return d ? d.getDate()+" "+["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][d.getMonth()]+" "+d.getFullYear() : "—"; };
const hace = ts => { const d = ts?.toDate ? ts.toDate() : null; if (!d) return "—"; const n = Math.floor((Date.now()-d)/864e5); return n<=0 ? "hoy" : n===1 ? "ayer" : "hace "+n+" días"; };
const refresca = () => { if (["cuenta","hoy"].includes(route())) render(); };
const ERR = { "auth/email-already-in-use":"Ya hay una cuenta con ese email. Pulsa «Entrar».", "auth/invalid-email":"Ese email no es válido.",
  "auth/weak-password":"La contraseña tiene que tener al menos 8 caracteres.", "auth/invalid-credential":"Email o contraseña incorrectos.",
  "auth/wrong-password":"Email o contraseña incorrectos.", "auth/user-not-found":"No hay ninguna cuenta con ese email.",
  "auth/too-many-requests":"Demasiados intentos. Espera unos minutos.", "auth/network-request-failed":"Sin conexión. Inténtalo con internet.",
  "auth/requires-recent-login":"Por seguridad, sal y vuelve a entrar antes de borrar la cuenta.", "permission-denied":"No tienes permiso para esto." };
const errTxt = e => ERR[e?.code] || "Algo ha fallado. Inténtalo de nuevo.";

/* ---------- Contador anónimo de aperturas (una vez al día por móvil, sin datos personales) ---------- */
async function registraApertura(){
  let id, dia = new Date().toISOString().slice(0,10);
  try {
    id = localStorage.getItem("hc-dev"); const nuevo = !id;
    if (nuevo){ id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2)); localStorage.setItem("hc-dev", id); }
    if (localStorage.getItem("hc-dev-dia")===dia && !A.user) return;
    const d = { ultima: serverTimestamp(), instalada: instalada(), plataforma: plataforma() };
    if (nuevo) d.primera = serverTimestamp();
    if (A.user) d.uid = A.user.uid;
    await setDoc(doc(db, "aperturas", id), d, { merge:true });
    localStorage.setItem("hc-dev-dia", dia);
  } catch(e){}
}

/* ---------- Estado de la sesión ---------- */
async function carga(u){
  A.user = u; A.admin = !!u && (u.email||"").toLowerCase()===ADMIN && u.emailVerified; A.datos = null; A.plan = null; A.lista = null; A.aperturas = null;
  if (u){
    try {
      const s = await getDoc(doc(db, "users", u.uid)); A.datos = s.exists() ? s.data() : null;
      if (A.datos) updateDoc(doc(db, "users", u.uid), { ultimaVez: serverTimestamp(), instalada: instalada(), plataforma: plataforma() }).catch(()=>{});
      if (A.datos?.estado==="aprobada"){ const p = await getDoc(doc(db, "planes", u.uid)); A.plan = p.exists() ? p.data() : null; }
      if (A.admin) await cargaAdmin();
    } catch(e){ A.msg = errTxt(e); }
  }
  A.listo = true; refresca();
}
onAuthStateChanged(auth, async u => { await carga(u); registraApertura(); });

async function cargaAdmin(){
  const [us, ap, pl] = await Promise.all([getDocs(collection(db, "users")), getDocs(collection(db, "aperturas")), getDocs(collection(db, "planes"))]);
  const planes = {}; pl.forEach(d=>planes[d.id] = d.data());
  A.lista = us.docs.map(d=>({ id:d.id, ...d.data(), plan: planes[d.id]||null }))
    .sort((a,b)=>(a.estado==="pendiente"?0:1)-(b.estado==="pendiente"?0:1) || (b.creado?.seconds||0)-(a.creado?.seconds||0));
  A.aperturas = ap.docs.map(d=>d.data());
}

/* ---------- Acciones ---------- */
async function alta(){
  const v = id => ($("#"+id)?.value||"").trim();
  const nombre = v("c-nombre"), email = v("c-email").toLowerCase(), pass = $("#c-pass").value;
  if (!nombre || !email || !pass) return aviso("Rellena tu nombre, email y contraseña.");
  if (pass.length < 8) return aviso("La contraseña tiene que tener al menos 8 caracteres.");
  if (!$("#c-priv").checked) return aviso("Para suscribirte tienes que aceptar el aviso de privacidad.");
  const cuest = { objetivo: v("c-obj"), carrera: v("c-carrera"), fecha: v("c-fecha"), nivel: v("c-nivel"), dias: v("c-dias"),
    sensaciones: $("#c-sens").checked, notas: v("c-notas").slice(0,600) };
  boton(true); aviso("");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    sendEmailVerification(cred.user).catch(()=>{});
    if (email!==ADMIN) await setDoc(doc(db, "users", cred.user.uid), { nombre, email, estado:"pendiente", creado: serverTimestamp(), ultimaVez: serverTimestamp(),
      instalada: instalada(), plataforma: plataforma(), cuestionario: cuest, privacidad: serverTimestamp() });
    boton(false); await carga(cred.user); return;
  } catch(e){ aviso(errTxt(e)); }
  boton(false);
}
async function entrar(){
  const email = ($("#c-email").value||"").trim(), pass = $("#c-pass").value;
  if (!email || !pass) return aviso("Escribe tu email y tu contraseña.");
  boton(true); aviso("");
  try { await signInWithEmailAndPassword(auth, email, pass); } catch(e){ aviso(errTxt(e)); }
  boton(false);
}
async function olvido(){
  const email = ($("#c-email").value||"").trim(); if (!email) return aviso("Escribe tu email y vuelve a pulsar.");
  try { await sendPasswordResetEmail(auth, email); ok("Si hay una cuenta con ese email, te llegará un enlace para cambiar la contraseña."); } catch(e){ aviso(errTxt(e)); }
}
async function verificado(){
  try { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); await carga(auth.currentUser);
    if (!auth.currentUser.emailVerified) aviso("Todavía no consta verificado. Abre el enlace del email y vuelve a pulsar."); }
  catch(e){ aviso(errTxt(e)); }
}
async function reenviar(){ try { await sendEmailVerification(auth.currentUser); A.ok = "Email de verificación enviado. Mira también en spam."; } catch(e){ aviso(errTxt(e)); } refresca(); }
async function salir(){ await signOut(auth); A.tab = "entrar"; A.msg = A.ok = ""; }
async function borrarCuenta(){
  if (!confirm("¿Seguro que quieres borrar tu cuenta y tus datos? No se puede deshacer.")) return;
  const u = auth.currentUser;
  try { await deleteDoc(doc(db, "users", u.uid)).catch(()=>{}); await deleteUser(u); A.ok = "Tu cuenta y tus datos se han borrado."; }
  catch(e){ aviso(errTxt(e)); }
  refresca();
}
// Aplica el objetivo del cuestionario a tu plan (se guarda en tu móvil)
async function aplicarObjetivo(){
  const c = A.datos?.cuestionario || {}, dist = { "Media maratón":21.1, "10 km":10, "Maratón":42.2, "5 km":5 }[c.objetivo] || "";
  const t = today(), lunes = t.getDay()===1 ? t : addDays(mondayOf(t), 7);
  const p = { ...S.perfil, objetivos: c.fecha ? [{ nombre: c.carrera || c.objetivo || "Mi carrera", distancia: dist, fecha: c.fecha, tiempo: "" }] : S.perfil.objetivos,
    planStart: ymd(lunes), ritmosModo: c.sensaciones ? "sens" : "numeros", experience: c.nivel || S.perfil.experience };
  try { await savePerfil(p); A.ok = "Listo: tu plan empieza el lunes "+fmtShort(lunes)+"."; } catch(e){ aviso("No se pudo guardar en este móvil."); }
  refresca();
}
// Administradora
async function estado(uid, est){
  try { await updateDoc(doc(db, "users", uid), { estado: est, revisado: serverTimestamp() }); await cargaAdmin(); A.ok = est==="aprobada" ? "Suscriptora aprobada." : "Acceso quitado."; }
  catch(e){ aviso(errTxt(e)); }
  refresca();
}
async function guardaPlan(uid){
  const notas = ($("#pl-"+uid)?.value||"").trim().slice(0,4000);
  try { await setDoc(doc(db, "planes", uid), { notas, actualizado: serverTimestamp() }, { merge:true }); await cargaAdmin(); A.ok = "Contenido guardado."; }
  catch(e){ aviso(errTxt(e)); }
  refresca();
}
const msgHtml = () => A.msg ? `<p class="msg-err" role="alert">${esc(A.msg)}</p>` : A.ok ? `<p class="hint" role="status" style="color:var(--ok);font-weight:700">${esc(A.ok)}</p>` : "";
// Los avisos se cambian en su sitio, sin volver a pintar el formulario (así no se borra lo que has escrito)
function pinta(){ const el = $("#cu-msg"); if (el){ el.innerHTML = msgHtml(); if (A.msg||A.ok) el.scrollIntoView({block:"nearest"}); } else refresca(); }
function aviso(m){ A.msg = m; A.ok = ""; pinta(); }
function ok(m){ A.ok = m; A.msg = ""; pinta(); }
function boton(on){ A.busy = on; const b = $("#cform button[type=submit]"); if (b){ b.disabled = on; b.textContent = on ? "Un momento…" : A.tab==="alta" ? "Enviar solicitud" : "Entrar"; } }

/* ---------- Vistas ---------- */
const PRIV = `<details class="ses" style="margin-top:.4rem"><summary><span class="st"><small class="tap">Aviso de privacidad</small></span><span class="chev" aria-hidden="true"></span></summary>
  <div class="hint" style="margin-top:.4rem;line-height:1.5">
  <p><b>Qué guardamos:</b> tu nombre, tu email, las respuestas del cuestionario, la fecha en que te apuntaste y la última vez que abriste la app. Tu contraseña la gestiona Google (Firebase) y nadie puede verla.</p>
  <p><b>Para qué:</b> para darte acceso al contenido personalizado y preparar tu plan. Solo lo ve la administradora de Hybrid Coach.</p>
  <p><b>Dónde:</b> en Google Firebase, con los datos alojados en la Unión Europea.</p>
  <p><b>Tus entrenos</b> (historial, días que marcas…) se siguen guardando solo en tu móvil.</p>
  <p><b>La app también cuenta, sin datos personales,</b> cuántos móviles la abren y si la tienen instalada.</p>
  <p><b>Tus derechos:</b> puedes borrar tu cuenta y tus datos cuando quieras desde «Mi cuenta → Borrar mi cuenta».</p></div></details>`;

function vAcceso(){
  const alta = A.tab==="alta";
  return `<section class="card"><p class="kicker">Hybrid Coach Club</p><h2>Suscríbete gratis</h2>
    <p>Responde unas preguntas y prepararé tu plan personalizado. Cuando apruebe tu solicitud, lo verás aquí con tu contraseña.</p>
    <div class="chips" style="margin-top:.8rem" role="group" aria-label="Acceso">
      <button class="chip" data-cu="tab" data-t="alta" aria-pressed="${alta}">Crear cuenta</button>
      <button class="chip" data-cu="tab" data-t="entrar" aria-pressed="${!alta}">Ya tengo cuenta</button></div>
    <form id="cform" class="stack" style="margin-top:1rem;gap:.8rem" novalidate>
      ${alta?`<div class="field"><label for="c-nombre">Nombre</label><input id="c-nombre" type="text" autocomplete="given-name" maxlength="60"></div>`:""}
      <div class="field"><label for="c-email">Email</label><input id="c-email" type="email" autocomplete="email" inputmode="email"></div>
      <div class="field"><label for="c-pass">Contraseña${alta?" (mínimo 8 caracteres)":""}</label><input id="c-pass" type="password" autocomplete="${alta?"new-password":"current-password"}"></div>
      ${alta?`<p class="kicker" style="margin-top:.4rem">Tu objetivo</p>
      <div class="fields">
        <div class="field"><label for="c-obj">Quiero…</label><select id="c-obj"><option>Media maratón</option><option>10 km</option><option>5 km</option><option>Maratón</option><option>Ponerme en forma y ganar fuerza</option></select></div>
        <div class="field"><label for="c-carrera">Carrera (si tienes una)</label><input id="c-carrera" type="text" maxlength="80" placeholder="Ej.: Media de Álora"></div>
        <div class="field"><label for="c-fecha">Fecha de la carrera</label><input id="c-fecha" type="date"></div>
        <div class="field"><label for="c-nivel">Nivel</label><select id="c-nivel"><option value="principiante">Empiezo</option><option value="intermedio" selected>Corro a menudo</option><option value="avanzado">Compito</option></select></div>
        <div class="field"><label for="c-dias">Días por semana</label><select id="c-dias"><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div></div>
      <label class="check"><input type="checkbox" id="c-sens" checked> Prefiero entrenar a sensaciones, sin ritmos por kilómetro</label>
      <div class="field"><label for="c-notas">¿Algo que deba saber? (lesiones, ansiedad, horarios…)</label><textarea id="c-notas" rows="3" maxlength="600"></textarea></div>
      <label class="check"><input type="checkbox" id="c-priv"> He leído y acepto el aviso de privacidad</label>${PRIV}`:""}
      <div class="actions"><button class="btn primary" type="submit" >${alta?"Enviar solicitud":"Entrar"}</button>
        ${alta?"":`<button class="btn ghost sm" type="button" data-cu="olvido">He olvidado la contraseña</button>`}</div>
    </form></section>`;
}
function vSuscriptora(){
  const d = A.datos, u = A.user;
  if (!d) return `<section class="card"><h2>Tu cuenta no tiene datos</h2><p>Puede que se borrara. Sal y crea la cuenta de nuevo.</p></section>`;
  const c = d.cuestionario || {};
  const est = d.estado==="aprobada" ? `<span class="pill" style="color:var(--ok)">Aprobada</span>` : d.estado==="rechazada" ? `<span class="pill" style="color:var(--bad)">Sin acceso</span>` : `<span class="pill" style="color:var(--qual)">Pendiente</span>`;
  let cuerpo;
  if (d.estado==="aprobada") cuerpo = `<section class="card today"><p class="kicker">Tu plan personalizado</p>
      ${A.plan?.notas ? `<div style="white-space:pre-wrap;color:var(--ink);margin-top:.5rem">${esc(A.plan.notas)}</div><p class="hint" style="margin-top:.6rem">Actualizado: ${fecha(A.plan.actualizado)}</p>` : `<p>Estoy preparando tu contenido personalizado. Aparecerá aquí.</p>`}
      ${c.fecha ? `<div class="actions" style="margin-top:1rem"><button class="btn primary" data-cu="aplicar">Usar mi objetivo en el plan</button></div><p class="hint" style="margin-top:.4rem">${esc(c.carrera||c.objetivo)} · ${esc(c.fecha)}. El plan empieza el próximo lunes.</p>` : ""}</section>`;
  else if (d.estado==="rechazada") cuerpo = `<section class="card"><p>Ahora mismo no tienes acceso al contenido personalizado. Puedes seguir usando el plan gratuito.</p></section>`;
  else cuerpo = `<section class="card"><h2>Solicitud enviada 🙌</h2><p>Revisaré tus respuestas y te daré acceso. Mientras, puedes usar el plan gratuito.</p></section>`;
  return `${cuerpo}<section class="card"><div class="cardhead" style="margin:0"><p class="kicker">Mi cuenta</p>${est}</div>
    <p style="color:var(--ink)">${esc(d.nombre)} · ${esc(u.email)}</p>
    ${!u.emailVerified?`<p class="hint" style="margin-top:.4rem">Confirma tu email con el enlace que te enviamos.</p><div class="actions" style="margin-top:.4rem"><button class="btn ghost sm" data-cu="reenviar">Reenviar email</button></div>`:""}
    <div class="actions" style="margin-top:.8rem"><button class="btn sm" data-cu="salir">Salir</button><button class="btn ghost sm" data-cu="borrar">Borrar mi cuenta</button></div></section>`;
}
function vAdmin(){
  if (!A.user.emailVerified) return `<section class="card today"><p class="kicker">Administradora</p><h2>Confirma tu email</h2>
    <p>Para abrir el panel, abre el enlace que te ha llegado a ${esc(A.user.email)} (mira en spam) y luego pulsa aquí.</p>
    <div class="actions" style="margin-top:.8rem"><button class="btn primary" data-cu="verificado">Ya lo he confirmado</button><button class="btn ghost sm" data-cu="reenviar">Reenviar email</button><button class="btn ghost sm" data-cu="salir">Salir</button></div></section>`;
  const ap = A.aperturas||[], sem = Date.now()-7*864e5, ts = x => x?.toDate ? x.toDate().getTime() : 0;
  const plat = {}; ap.forEach(a=>plat[a.plataforma||"?"] = (plat[a.plataforma||"?"]||0)+1);
  const L = A.lista||[], pend = L.filter(x=>x.estado==="pendiente").length;
  const stat = (n,t) => `<div class="card" style="padding:.8rem;text-align:center"><b class="num" style="font-size:1.6rem;color:var(--ink)">${n}</b><p class="hint" style="margin:0">${t}</p></div>`;
  const fichas = L.map(x=>{ const c = x.cuestionario||{}, open = A.abierta===x.id;
    const est = x.estado==="aprobada" ? `<span class="pill" style="color:var(--ok)">Aprobada</span>` : x.estado==="rechazada" ? `<span class="pill" style="color:var(--bad)">Sin acceso</span>` : `<span class="pill" style="color:var(--qual)">Pendiente</span>`;
    return `<details class="ses" style="border-top:1px solid var(--line);padding:.7rem 0" ${open?"open":""} data-uid="${esc(x.id)}">
      <summary><span class="st"><b>${esc(x.nombre||"—")}</b><small>${esc(x.email||"")} · ${hace(x.ultimaVez)}${x.instalada?" · instalada":""}</small></span>${est}<span class="chev" aria-hidden="true"></span></summary>
      <div class="det"><ul class="steps">
        <li><b>Objetivo:</b> ${esc(c.objetivo||"—")}${c.carrera?" · "+esc(c.carrera):""}${c.fecha?" · "+esc(c.fecha):""}</li>
        <li><b>Nivel:</b> ${esc(c.nivel||"—")} · ${esc(c.dias||"?")} días/semana · ${c.sensaciones?"a sensaciones":"con ritmos"}</li>
        ${c.notas?`<li><b>Notas:</b> ${esc(c.notas)}</li>`:""}
        <li><b>Alta:</b> ${fecha(x.creado)} · <b>Última vez:</b> ${hace(x.ultimaVez)} · ${esc(x.plataforma||"")}</li></ul>
        <div class="actions" style="margin-top:.7rem">${x.estado!=="aprobada"?`<button class="btn primary sm" data-cu="aprobar" data-uid="${esc(x.id)}">Aprobar</button>`:""}${x.estado!=="rechazada"?`<button class="btn ghost sm" data-cu="rechazar" data-uid="${esc(x.id)}">${x.estado==="aprobada"?"Quitar acceso":"Rechazar"}</button>`:""}</div>
        <div class="field" style="margin-top:.8rem"><label for="pl-${esc(x.id)}">Contenido personalizado (solo lo ve ella)</label><textarea id="pl-${esc(x.id)}" rows="6" maxlength="4000" placeholder="Mensaje, ajustes de su plan, consejos…">${esc(x.plan?.notas||"")}</textarea></div>
        <div class="actions" style="margin-top:.5rem"><button class="btn sm" data-cu="guardaplan" data-uid="${esc(x.id)}">Guardar contenido</button></div></div></details>`; }).join("");
  return `<section class="card"><p class="kicker">Quién tiene tu app</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:.5rem;margin-top:.6rem">
        ${stat(ap.length,"móviles la han abierto")}${stat(ap.filter(a=>a.instalada).length,"la tienen instalada")}${stat(ap.filter(a=>ts(a.ultima)>sem).length,"activos esta semana")}${stat(L.length,"suscriptoras")}</div>
      <p class="hint" style="margin-top:.6rem">${Object.entries(plat).map(([k,n])=>`${esc(k)}: ${n}`).join(" · ")||"Aún no hay datos."}</p></section>
    <section class="card"><div class="cardhead" style="margin:0"><p class="kicker">Suscriptoras</p>${pend?`<span class="pill" style="color:var(--qual)">${pend} pendiente${pend>1?"s":""}</span>`:""}</div>
      ${L.length?fichas:`<p>Aún no se ha apuntado nadie. Comparte la app para que se suscriban desde «Mi cuenta».</p>`}
      <div class="actions" style="margin-top:.8rem"><button class="btn ghost sm" data-cu="recargar">Actualizar</button><button class="btn ghost sm" data-cu="salir">Salir</button></div></section>`;
}
window.vCuenta = function(){
  const msg = `<div id="cu-msg">${msgHtml()}</div>`;
  const body = !A.listo ? `<div class="card empty">Conectando…</div>` : !A.user ? vAcceso() : A.admin || (A.user.email||"").toLowerCase()===ADMIN ? vAdmin() : vSuscriptora();
  return `<div class="stack"><header class="hero"><p class="kicker">${A.admin?"Administradora":"Mi cuenta"}</p><h1>${A.admin?"Tu panel":A.user?"Hola"+(A.datos?.nombre?", "+esc(A.datos.nombre):""):"Únete"}</h1></header>${msg}${body}</div>`;
};
window.wireCuenta = function(){
  const f = $("#cform"); if (f) f.addEventListener("submit", ev => { ev.preventDefault(); A.tab==="alta" ? alta() : entrar(); });
  document.querySelectorAll("#view details[data-uid]").forEach(d => d.addEventListener("toggle", ()=>{ if (d.open) A.abierta = d.dataset.uid; else if (A.abierta===d.dataset.uid) A.abierta = null; }));
};
document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-cu]"); if (!b) return; ev.preventDefault();
  const a = b.dataset.cu, uid = b.dataset.uid;
  if (a==="tab"){ A.tab = b.dataset.t; A.msg = A.ok = ""; render(); }
  if (a==="olvido") olvido();
  if (a==="salir") salir();
  if (a==="borrar") borrarCuenta();
  if (a==="reenviar") reenviar();
  if (a==="verificado") verificado();
  if (a==="aplicar") aplicarObjetivo();
  if (a==="aprobar") estado(uid, "aprobada");
  if (a==="rechazar") estado(uid, "rechazada");
  if (a==="guardaplan") guardaPlan(uid);
  if (a==="recargar") cargaAdmin().then(()=>{ A.ok = "Datos actualizados."; refresca(); }).catch(e=>aviso(errTxt(e)));
});
// Tarjeta en Hoy con tu contenido personalizado
window.hcHoyCard = () => A.datos?.estado==="aprobada" && A.plan?.notas
  ? `<section class="card"><div class="cardhead" style="margin:0"><p class="kicker">Para ti</p><a class="btn sm" href="#cuenta">Ver todo</a></div><p style="color:var(--ink);white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${esc(A.plan.notas)}</p></section>`
  : "";
window.hcEsSuscriptora = () => !!A.datos;
render();
