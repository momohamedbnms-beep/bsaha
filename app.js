// ===== Couche de stockage : Supabase (compte partagé) ou repli local =====
const COLLS = ['couple','profils','semaines','checks','meals','exos','charges','mesures','photos','logs','shaker'];
const D = Object.fromEntries(COLLS.map(c => [c, {}]));
let sb = null, session = null, modeStockage = 'local', pret = false, rtChannel = null;
const LS_CLE = 'bsaha.v2', LS_CFG = 'bsaha.cfg';
const CFG = (() => { try { return Object.assign({ url: '', anonKey: '', aiKey: '', aiModel: 'claude-sonnet-4-5', email: '' }, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch(e){ return { url: '', anonKey: '', aiKey: '', aiModel: 'claude-sonnet-4-5', email: '' }; } })();
function cfgSave(){ try { localStorage.setItem(LS_CFG, JSON.stringify(CFG)); } catch(e){} }
function lsCharger(){ try { const r = localStorage.getItem(LS_CLE) || localStorage.getItem('bsaha.v1'); if (r) { const o = JSON.parse(r); COLLS.forEach(c => D[c] = o[c] || {}); } } catch(e){} }
function lsSauver(){ try { localStorage.setItem(LS_CLE, JSON.stringify(D)); } catch(e){} }
function pref(){ try { return localStorage.getItem('bsaha.profil') || 'mohamed'; } catch(e){ return 'mohamed'; } }
function sbConfigured(){ return !!(CFG.url && CFG.anonKey && window.supabase); }
function getSb(){ if (!sbConfigured()) return null; if (!sb) { try { sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch(e){ return null; } } return sb; }
const pendingWrites = {};
const store = {
  async set(coll, id, data, silencieux){ D[coll][id] = JSON.parse(JSON.stringify(data)); lsSauver(); if (!silencieux) rendre();
    const c = getSb(); if (!c || !session) return;
    const key = coll+'/'+id; pendingWrites[key] = (pendingWrites[key] || Promise.resolve()).then(async () => { const res = await c.from('bsaha_docs').upsert({ user_id: session.user.id, coll, id, data: D[coll][id] || data, updated_at: new Date().toISOString() }); if (res.error) { console.warn(res.error); setSync('err', 'sync en erreur'); toast('Sauvegarde en ligne impossible (gardée sur cet appareil)'); } else setSync('ok', 'synchronisé'); }).catch(()=>{}); },
  async del(coll, id){ delete D[coll][id]; lsSauver(); rendre(); const c = getSb(); if (!c || !session) return; const res = await c.from('bsaha_docs').delete().match({ user_id: session.user.id, coll, id }); if (res.error) console.warn(res.error); },
  get(coll, id){ return D[coll][id]; }
};
function setSync(mode, txt){ const s = $('#sync'); if (!s) return; s.className = 'sync ' + (mode==='ok'?'ok':mode==='local'?'local':mode==='err'?'local':''); s.querySelector('span').textContent = txt; }
async function pullAll(){ const c = getSb(); if (!c || !session) return; const res = await c.from('bsaha_docs').select('coll,id,data').eq('user_id', session.user.id); if (res.error) { setSync('err', 'sync en erreur'); return; } COLLS.forEach(cl => D[cl] = {}); res.data.forEach(r => { if (D[r.coll]) D[r.coll][r.id] = r.data; }); lsSauver(); setSync('ok', 'synchronisé'); if (pret) rendre(); }
function subscribeRealtime(){ const c = getSb(); if (!c || !session || rtChannel) return; try { rtChannel = c.channel('bsaha-docs').on('postgres_changes', { event: '*', schema: 'public', table: 'bsaha_docs', filter: 'user_id=eq.' + session.user.id }, payload => { const r = payload.new && payload.new.coll ? payload.new : null; if (payload.eventType === 'DELETE') { const o = payload.old; if (o && D[o.coll]) { delete D[o.coll][o.id]; lsSauver(); rendre(); } return; } if (r && D[r.coll]) { D[r.coll][r.id] = r.data; lsSauver(); rendre(); } }).subscribe(); } catch(e){ console.warn(e); } }
async function initStore(){
  lsCharger();
  const c = getSb();
  if (c) {
    try { const r = await c.auth.getSession(); session = r.data.session; } catch(e){ session = null; }
    if (session) { modeStockage = 'db'; await pullAll(); subscribeRealtime(); setSync('ok', 'synchronisé'); }
    else setSync('local', 'non connecté');
    c.auth.onAuthStateChange((_e, s) => { session = s; if (s) { modeStockage = 'db'; pullAll(); subscribeRealtime(); } else { modeStockage = 'local'; setSync('local', 'non connecté'); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && session) pullAll(); });
  } else setSync('local', CFG.url ? 'hors ligne' : 'à configurer');
  for (const p of ['mohamed','firdaous']) if (!D.profils[p]) await store.set('profils', p, PROFILS_DEFAUT[p]);
  if (!D.couple.settings) await store.set('couple', 'settings', { debut: iso(lundiDe(auj())), seances: 4, jours: [1,2,4,6], cardio: 'jours-off', menuDecalage: 0 });
  pret = true;
}
// Connexion
async function connexion(email, pass, creer){ const c = getSb(); if (!c) { toast('Renseigne d\'abord l\'URL et la clé Supabase'); return false; } const r = creer ? await c.auth.signUp({ email, password: pass }) : await c.auth.signInWithPassword({ email, password: pass }); if (r.error) { toast(r.error.message); return false; } CFG.email = email; cfgSave(); if (creer && !r.data.session) toast('Compte créé : confirme l\'e-mail puis connecte-toi'); else { toast('Connecté'); const local = JSON.parse(JSON.stringify(D)); await pullAll(); /* fusion : on pousse ce qui n'existe pas en ligne */ for (const cl of COLLS) for (const [id, v] of Object.entries(local[cl]||{})) if (!D[cl][id]) await store.set(cl, id, v); } return !r.error; }
async function deconnexion(){ const c = getSb(); if (c) await c.auth.signOut(); session = null; setSync('local', 'non connecté'); }

// ===== IA (Anthropic, clé dans les réglages) =====
const aiDisponible = () => !!CFG.aiKey;
async function askAI(turns, opts={}){
  if (!CFG.aiKey) throw { code: 'not_configured' };
  const msgs = turns.map((t, i) => { const last = i === turns.length - 1; if (last && opts.images && opts.images.length) return { role: t.role, content: [ ...opts.images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.b64 } })), { type: 'text', text: t.content } ] }; return { role: t.role, content: t.content }; });
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: opts.signal, headers: { 'content-type': 'application/json', 'x-api-key': CFG.aiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: CFG.aiModel || 'claude-sonnet-4-5', max_tokens: 1500, messages: msgs }) });
  if (!res.ok) { let m = ''; try { m = (await res.json()).error?.message || ''; } catch(e){} throw { code: res.status === 401 ? 'not_granted' : res.status === 429 ? 'rate_limited' : 'error', message: m }; }
  const j = await res.json(); return (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
}
function parseJsonTolerant(t){ try { return JSON.parse(t); } catch(e){} const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch(e){} } const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b+1)); } catch(e){} } return null; }
async function fileToB64(file, max=1400){ const bmp = await createImageBitmap(file); const s = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width*s); c.height = Math.round(bmp.height*s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); return { b64, type: 'image/jpeg', blob }; }
// Photos (Supabase Storage, bucket privé bsaha-photos)
async function photoUpload(blob){ const c = getSb(); if (!c || !session) throw { code: 'not_connected' }; const path = session.user.id + '/' + Date.now() + '.jpg'; const r = await c.storage.from('bsaha-photos').upload(path, blob, { contentType: 'image/jpeg' }); if (r.error) throw r.error; return { id: path }; }
async function photoUrl(path){ const c = getSb(); if (!c || !session) return ''; const r = await c.storage.from('bsaha-photos').createSignedUrl(path, 3600); return r.data?.signedUrl || ''; }
async function photoDelete(path){ const c = getSb(); if (!c || !session) return; await c.storage.from('bsaha-photos').remove([path]); }

// ===== Utilitaires =====
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
const fromIso = s => { const [a,b,c] = s.split('-').map(Number); return new Date(a, b-1, c); };
const addJ = (d, n) => { const z = fromIso(iso(d)); z.setDate(z.getDate()+n); return z; };
const lundiDe = d => { const z = fromIso(iso(d)); const wd = (z.getDay()+6)%7; z.setDate(z.getDate()-wd); return z; };
const diffJ = (a, b) => Math.round((fromIso(iso(a)) - fromIso(iso(b))) / 86400000);
const auj = () => new Date();
const numJour = d => (d.getDay()+6)%7 + 1;              // 1 = lundi … 7 = dimanche
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const fmtJour = d => JOURS[numJour(d)-1] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
const vibrer = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), 2400); }
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';

const IMG = new Proxy({}, { get: (_, k) => 'f_' + k + '.jpg' });
const imgM = (k, ab) => 'm_' + k + '_' + ab + '.jpg';

let profil = 'mohamed', onglet = 'jour', semDecal = 0, exoSeance = null;

// ===== Réglages =====
const REG_DEFAUT = {
  v: 2,
  debut: iso(lundiDe(auj())),
  tpl: { mohamed: { 1:'HA', 2:'BA', 4:'HB', 6:'BB' }, firdaous: { 1:'A', 3:'B', 5:'C', 6:'D' } },
  repas: { mohamed: 2, firdaous: 3 },
  shaker: { mohamed: false, firdaous: true },
  jourPesee: 1, cyclePesee: 14
};
function REG(){ const r = D.couple.settings || {}; return {
  ...REG_DEFAUT, ...r,
  tpl: { mohamed: { ...REG_DEFAUT.tpl.mohamed, ...(r.tpl && r.tpl.mohamed || {}) }, firdaous: { ...REG_DEFAUT.tpl.firdaous, ...(r.tpl && r.tpl.firdaous || {}) } },
  repas: { ...REG_DEFAUT.repas, ...(r.repas || {}) },
  shaker: { ...REG_DEFAUT.shaker, ...(r.shaker || {}) }
}; }
const regSave = o => store.set('couple', 'settings', { ...REG(), ...o });
const prenom = p => (D.profils[p] && D.profils[p].prenom) || (p === 'mohamed' ? 'Mohamed' : 'Firdaous');
const court = p => p === 'mohamed' ? 'Mo' : 'Fifi';

// ===== Plan de la semaine =====
function planDe(lundiIso){ const s = D.semaines[lundiIso]; const r = REG(); return {
  tpl: { mohamed: { ...r.tpl.mohamed, ...(s && s.tpl && s.tpl.mohamed || {}) }, firdaous: { ...r.tpl.firdaous, ...(s && s.tpl && s.tpl.firdaous || {}) } },
  allege: (s && s.allege) || {}, prepare: !!s
}; }
function seanceDe(p, d){ return planDe(iso(lundiDe(d))).tpl[p][numJour(d)] || null; }
function allegee(p, d){ const pl = planDe(iso(lundiDe(d))); return !!(pl.allege[p] && pl.allege[p][numJour(d)]); }
function defSeance(p, sid){ return p === 'mohamed' ? SEANCES_M[sid] : SEANCES[sid]; }
function nomSeance(p, sid){ const s = defSeance(p, sid); return s ? s.nom : sid; }

// ===== Coches =====
const coches = k => D.checks[k] || {};
function estCochee(p, d, sid){ const c = coches(iso(d))[p]; return !!(c && c[sid]); }
async function cocher(p, d, sid, val){
  const k = iso(d); const cur = JSON.parse(JSON.stringify(D.checks[k] || {}));
  cur[p] = cur[p] || {}; if (val) cur[p][sid] = true; else delete cur[p][sid];
  await store.set('checks', k, cur, true);
}
// Exercices
const exosCoches = (p, d) => (D.exos[iso(d)] || {})[p] || {};
async function cocherExo(p, d, ex, val){
  const k = iso(d); const cur = JSON.parse(JSON.stringify(D.exos[k] || {}));
  cur[p] = cur[p] || {}; if (val) cur[p][ex] = true; else delete cur[p][ex];
  await store.set('exos', k, cur, true);
}
// Repas
function repasDe(p, d){ const m = (D.meals[iso(d)] || {})[p] || {}; return { n: m.n || 0, sh: !!m.sh }; }
async function setRepas(p, d, o){
  const k = iso(d); const cur = JSON.parse(JSON.stringify(D.meals[k] || {}));
  cur[p] = { ...repasDe(p, d), ...o };
  await store.set('meals', k, cur, true);
}
// Charges
const chargeDe = (p, ex) => ((D.charges[p] || {})[ex]) || '';
async function setCharge(p, ex, v){ const cur = JSON.parse(JSON.stringify(D.charges[p] || {})); if (v) cur[ex] = v; else delete cur[ex]; await store.set('charges', p, cur, true); }

// ===== Exercices d'une séance =====
function listeExos(p, sid, d){
  const s = defSeance(p, sid); if (!s) return [];
  const leger = d ? allegee(p, d) : false;
  let ex = s.exos.map(e => {
    const info = p === 'mohamed' ? EXOS_M[e.k] : EXOS[e.k];
    const series = leger ? 2 : (e.series || 3);
    const reps = e.reps || (info && info.reps) || '10';
    return { k: e.k, nom: (info && info.nom) || e.k, series, reps, zone: (info && info.zone) || '', dur: (info && info.dur) || '', img: p === 'mohamed' ? imgM(e.k, 'a') : (info && info.img ? IMG[info.img[0]] : '') };
  });
  if (leger) { const garde = p === 'mohamed' ? (s.prioritaires || []) : (s.court || []); if (garde.length) ex = ex.filter(e => garde.includes(e.k)); }
  return ex;
}
function regleExo(p, e){
  const max = parseInt(String(e.reps).split(/[–\-]/).pop(), 10) || 10;
  if (p === 'mohamed' && chargeDe(p, e.k)) return `+2,5 kg quand ${e.series}×${max} propres`;
  return e.dur ? `${e.series}×${max} propres → ${e.dur}` : `+1 rép quand ${e.series}×${max} propres`;
}

// ===== Écran JOUR =====
function rJour(){
  const d = auj(), k = iso(d), r = REG();
  const sid = seanceDe(profil, d), fait = sid ? estCochee(profil, d, sid) : false;
  let h = '';

  // Séance
  if (sid) h += `<div class="c"><div class="ligne">
      <div><div class="lab">Séance</div><h1>${esc(nomSeance(profil, sid))}${allegee(profil, d) ? ' ·' : ''}</h1></div>
      <button class="case ${fait?'on':''}" data-a="coche-seance" data-sid="${sid}" aria-label="Séance faite" aria-pressed="${fait}">${CHECK}</button>
    </div>
    <button class="b s p" data-a="ouvrir-seance" data-sid="${sid}" style="align-self:flex-start">Voir les exos</button></div>`;
  else h += `<div class="c"><div class="ligne"><div><div class="lab">Séance</div><h1 style="color:var(--txt2)">Repos</h1></div></div></div>`;

  // Repas
  const nb = r.repas[profil] || 0, sh = r.shaker[profil], m = repasDe(profil, d);
  const total = nb + (sh ? 1 : 0), faits = Math.min(m.n, nb) + (sh && m.sh ? 1 : 0);
  let pas = '';
  for (let i = 1; i <= nb; i++) pas += `<button class="pa ${m.n >= i ? 'on' : ''}" data-a="repas" data-n="${i}" aria-label="Repas ${i}" aria-pressed="${m.n >= i}">${m.n >= i ? '✓' : i}</button>`;
  if (sh) pas += `<button class="pa sh ${m.sh ? 'on' : ''}" data-a="shaker" aria-label="Shaker" aria-pressed="${m.sh}">${m.sh ? '✓' : 'S'}</button>`;
  h += `<div class="c"><div class="ligne"><div class="lab">Repas</div><div class="cpt">${faits}/${total}</div></div><div class="pastilles">${pas}</div></div>`;

  // Pesée
  const derniere = Object.values(D.mesures).filter(x => x.profil === profil && x.poids).sort((a,b) => b.date.localeCompare(a.date))[0];
  const ecoule = derniere ? diffJ(d, fromIso(derniere.date)) : 999;
  const reste = r.cyclePesee - ecoule;
  if (reste <= 0 && reste > -3) h += `<div class="c"><div class="lab">Pesée</div><div class="saisie"><input type="number" id="kg" step="0.1" inputmode="decimal" placeholder="kg" aria-label="Poids en kg"><button class="b" data-a="pesee">OK</button></div></div>`;
  else if (derniere) h += `<div class="lab" style="text-align:center;padding:4px">Prochaine pesée dans ${reste} j</div>`;
  else h += `<div class="c"><div class="lab">Première pesée</div><div class="saisie"><input type="number" id="kg" step="0.1" inputmode="decimal" placeholder="kg" aria-label="Poids en kg"><button class="b" data-a="pesee">OK</button></div></div>`;

  // Photo du jour
  const cel = p => { const ph = (D.photos[p + '_' + k]); const cl = p === 'mohamed' ? 'm' : 'f';
    if (ph) return `<button class="slot" data-a="photo-voir" data-p="${p}"><span class="pt ${cl}">${court(p)[0]}</span><img data-photo="${esc(ph.path)}" alt=""></button>`;
    return `<button class="slot" data-a="photo-add" data-p="${p}" ${p === profil ? '' : 'disabled'}><span class="pt ${cl}">${court(p)[0]}</span><span class="plus">+</span></button>`; };
  h += `<div class="c"><div class="lab">Photo</div><div class="duo">${cel('mohamed')}${cel('firdaous')}</div></div>`;

  // Progression du jour
  const tot = total + (sid ? 1 : 0), ok = faits + (fait ? 1 : 0);
  h += `<div class="prog" aria-label="Progression du jour"><i style="width:${tot ? Math.round(ok/tot*100) : 0}%"></i></div>`;

  $('#ec-jour').innerHTML = h;
  hydraterPhotos();
}

// ===== Écran SEMAINE =====
function rSemaine(){
  const base = addJ(lundiDe(auj()), semDecal * 7), lundi = iso(base), pl = planDe(lundi);
  const jours = [0,1,2,3,4,5,6].map(i => addJ(base, i));
  const ajd = iso(auj());
  let h = `<div class="sem-nav"><button data-a="sem" data-d="-1" aria-label="Semaine précédente">‹</button>
    <h1>${base.getDate()} ${MOIS[base.getMonth()]} – ${jours[6].getDate()} ${MOIS[jours[6].getMonth()]}</h1>
    <button data-a="sem" data-d="1" aria-label="Semaine suivante">›</button></div>`;

  h += `<div class="c" id="grille-c"><div class="grille7">`;
  jours.forEach(j => h += `<div class="gj ${iso(j)===ajd?'auj':''}">${JOURS[numJour(j)-1][0]}</div>`);
  h += `</div>`;
  for (const p of ['mohamed','firdaous']) {
    let n = 0, tt = 0, cells = '';
    jours.forEach(j => {
      const sid = pl.tpl[p][numJour(j)] || null, kk = iso(j), estAuj = kk === ajd;
      if (!sid) { cells += `<button class="cell vide ${estAuj?'auj':''}" data-a="cell" data-p="${p}" data-date="${kk}" aria-label="Repos">·</button>`; return; }
      tt++; const c = estCochee(p, j, sid); if (c) n++;
      const passe = diffJ(auj(), j) > 0;
      const cl = c ? 'fait' : passe ? 'rate' : (p === 'mohamed' ? 'prevu-m' : 'prevu-f');
      cells += `<button class="cell ${cl} ${estAuj?'auj':''}" data-a="cell" data-p="${p}" data-date="${kk}" data-sid="${sid}" aria-pressed="${c}" aria-label="${esc(nomSeance(p,sid))} ${prenom(p)} ${fmtJour(j)}">${c ? '✓' : esc(sid)}</button>`;
    });
    h += `<div class="ligne-tete"><span class="gtete ${p==='mohamed'?'m':'f'}">${court(p)}</span><span class="sc">${n}/${tt}</span></div><div class="grille7">${cells}</div>`;
  }
  h += `</div>`;
  const jd = numJour(auj());
  if (!pl.prepare && (jd === 7 || jd === 1 || semDecal > 0)) h += `<button class="b s" data-a="preparer" data-lundi="${lundi}">Préparer la semaine</button>`;
  $('#ec-semaine').innerHTML = h;
  brancherSwipe();
}
function brancherSwipe(){
  const g = $('#grille-c'); if (!g) return; let x0 = null, y0 = null;
  g.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  g.addEventListener('touchend', e => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { semDecal += dx < 0 ? 1 : -1; rSemaine(); }
    x0 = null;
  }, { passive: true });
}

// ===== Écran EXOS =====
function rExos(){
  const d = auj();
  if (exoSeance) return rSeance(exoSeance, d);
  const ids = profil === 'mohamed' ? Object.keys(SEANCES_M) : Object.keys(SEANCES);
  const sidAuj = seanceDe(profil, d);
  let h = `<div class="seances">`;
  ids.forEach(sid => {
    const s = defSeance(profil, sid), n = listeExos(profil, sid).length;
    h += `<button class="c" data-a="ouvrir-seance" data-sid="${sid}" style="text-align:left;flex-direction:row;align-items:center;gap:14px;padding:16px 20px">
      <div class="gtete ${profil==='mohamed'?'m':'f'}" style="width:40px;height:40px;font-size:13px">${esc(sid)}</div>
      <div class="txt" style="flex:1"><div class="nom">${esc(s.nom)}</div><div class="det">${n} exos${sid === sidAuj ? ' · aujourd\'hui' : ''}</div></div>
      <span style="color:var(--txt2)">›</span></button>`;
  });
  $('#ec-exos').innerHTML = h + `</div>`;
}
function rSeance(sid, d){
  const ex = listeExos(profil, sid, d), ch = exosCoches(profil, d), s = defSeance(profil, sid);
  const tousFaits = ex.length && ex.every(e => ch[e.k]);
  let h = `<button class="retour" data-a="retour-exos">‹ Séances</button>
    <div class="ligne"><h1>${esc(s.nom)}</h1><div class="cpt">${ex.filter(e=>ch[e.k]).length}/${ex.length}</div></div>
    <div class="c" style="gap:0">`;
  ex.forEach(e => {
    const on = !!ch[e.k];
    h += `<div class="exo">
      ${e.img ? `<img class="vign" src="${esc(e.img)}" alt="" loading="lazy">` : ''}
      <div class="txt"><div class="nom">${esc(e.nom)}</div>
        <div class="det"><span>${e.series}×${esc(e.reps)}</span>${profil==='mohamed' ? `<input type="number" inputmode="decimal" placeholder="kg" value="${esc(chargeDe(profil, e.k))}" data-a="charge" data-ex="${e.k}" aria-label="Charge ${esc(e.nom)}">` : ''}</div>
        <div class="regle">${esc(regleExo(profil, e))}</div></div>
      <button class="case p ${on?'on':''}" data-a="coche-exo" data-ex="${e.k}" data-sid="${sid}" aria-pressed="${on}" aria-label="${esc(e.nom)} fait">${CHECK}</button>
    </div>`;
  });
  h += `</div><button class="b" data-a="coche-tout" data-sid="${sid}">${tousFaits ? 'Tout décocher' : 'Tout cocher'}</button>`;
  $('#ec-exos').innerHTML = h;
}

// ===== Écran RÉGLAGES =====
function rReglages(){
  const r = REG();
  const stepper = (a, p, v, min, max) => `<div class="stepper"><button data-a="${a}" data-p="${p}" data-d="-1" ${v<=min?'disabled':''} aria-label="Moins">−</button><b>${v}</b><button data-a="${a}" data-p="${p}" data-d="1" ${v>=max?'disabled':''} aria-label="Plus">+</button></div>`;
  let h = '';
  for (const p of ['mohamed','firdaous']) {
    h += `<div class="c" style="padding:18px 10px"><div class="ligne" style="padding:0 8px"><div class="gtete ${p==='mohamed'?'m':'f'}">${court(p)}</div><input value="${esc(prenom(p))}" data-a="prenom" data-p="${p}" aria-label="Prénom" style="flex:1"></div>
      <div class="ligne" style="padding:0 8px"><span class="lab">Repas / jour</span>${stepper('nb-repas', p, r.repas[p], 0, 6)}</div>
      <div class="ligne" style="padding:0 8px"><span class="lab">Shaker</span><button class="sw ${r.shaker[p]?'on':''}" data-a="sw-shaker" data-p="${p}" role="switch" aria-checked="${r.shaker[p]}" aria-label="Shaker"><i></i></button></div>
      <div class="lab" style="padding:0 8px">Semaine type</div><div class="grille7">`;
    for (let j = 1; j <= 7; j++) h += `<div class="gj">${JOURS[j-1][0]}</div>`;
    h += `</div><div class="grille7">`;
    for (let j = 1; j <= 7; j++) { const sid = r.tpl[p][j]; h += `<button class="cell ${sid ? (p==='mohamed'?'prevu-m':'prevu-f') : 'vide'}" data-a="tpl" data-p="${p}" data-j="${j}" aria-label="${JOURS[j-1]} ${sid || 'repos'}">${sid ? esc(sid) : '·'}</button>`; }
    h += `</div></div>`;
  }
  h += `<div class="c"><div class="ligne"><span class="lab">Cycle de pesée</span>${stepper('cycle', 'x', r.cyclePesee, 7, 30)}</div></div>`;
  h += `<div class="c"><div class="lab">Compte partagé</div>
    <input id="sb-url" placeholder="URL Supabase" value="${esc(CFG.url)}" aria-label="URL Supabase">
    <input id="sb-key" placeholder="Clé anon" value="${esc(CFG.anonKey)}" aria-label="Clé anon">
    <input id="ai-key" placeholder="Clé Anthropic (Coach)" value="${esc(CFG.aiKey)}" aria-label="Clé Anthropic">
    <button class="b" data-a="cfg-save">Enregistrer</button>
    ${session ? `<button class="b s" data-a="deco">Se déconnecter (${esc(CFG.email)})</button>` : `<input id="mail" type="email" placeholder="E-mail" value="${esc(CFG.email)}" aria-label="E-mail"><input id="mdp" type="password" placeholder="Mot de passe" aria-label="Mot de passe"><div class="ligne"><button class="b" data-a="co" style="flex:1">Connexion</button><button class="b s" data-a="creer" style="flex:1">Créer</button></div>`}</div>`;
  h += `<div class="c"><div class="ligne"><button class="b s p" data-a="export">Exporter</button><button class="b s p" data-a="import">Importer</button></div></div>`;
  $('#ec-reglages').innerHTML = h;
}

// ===== Écran COACH =====
let chatEtat = { turns: [], pending: null, img: null };
function rCoach(){
  const st = chatEtat;
  let h = `<div class="chat" id="chat">${st.turns.map(t => `<div class="bulle ${t.role==='user'?'moi':'co'}">${t.img?`<img src="${t.img}" alt="">`:''}${esc(t.content)}</div>`).join('')}${st.pending ? `<div class="bulle co">${esc(st.pending)}</div>` : ''}</div>
    <div class="saisie">
      <button class="ic" data-a="coach-photo" aria-label="Photo"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.4"/><path d="M8 6l1.5-2h5L16 6"/></svg></button>
      <input id="q" placeholder="…" aria-label="Question">
      <button class="ic" data-a="coach-envoi" aria-label="Envoyer"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button>
    </div>${st.img ? `<div class="lab">Photo jointe</div>` : ''}`;
  $('#ec-coach').innerHTML = h;
  const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight;
}
async function envoyerCoach(txt){
  if (!txt && !chatEtat.img) return;
  chatEtat.turns.push({ role: 'user', content: txt, img: chatEtat.img ? 'data:image/jpeg;base64,' + chatEtat.img.b64 : null });
  const img = chatEtat.img; chatEtat.img = null; chatEtat.pending = '…'; rCoach();
  const d = auj(), sid = seanceDe(profil, d);
  const ctx = `Tu réponds court, en français, sans formules de politesse. ${prenom(profil)}, ${fmtJour(d)}. Séance du jour : ${sid ? nomSeance(profil, sid) : 'repos'}.`;
  try {
    const rep = await askAI([{ role: 'user', content: ctx + '\n\n' + txt }], { images: img ? [img] : [] });
    chatEtat.pending = null; chatEtat.turns.push({ role: 'assistant', content: rep });
  } catch(e) { chatEtat.pending = null; chatEtat.turns.push({ role: 'assistant', content: 'Erreur : ' + (e.message || e) }); }
  rCoach();
}

// ===== Photos =====
async function hydraterPhotos(){
  for (const img of $$('img[data-photo]')) {
    const p = img.dataset.photo; if (!p || img.dataset.fait) continue; img.dataset.fait = '1';
    try { const u = await photoUrl(p); if (u) img.src = u; } catch(e){}
  }
}
function choisirPhoto(p){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    if (!session) { toast('Connecte-toi (Réglages)'); return; }
    try { const { blob } = await fileToB64(f, 1400); const up = await photoUpload(blob);
      await store.set('photos', p + '_' + iso(auj()), { profil: p, date: iso(auj()), path: up.id, ts: Date.now() });
    } catch(e) { toast('Échec'); }
  };
  inp.click();
}

// ===== Navigation =====
function setProfil(p){
  profil = p; try { localStorage.setItem('bsaha.profil', p); } catch(e){}
  document.documentElement.dataset.p = p;
  $$('#qui button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  exoSeance = null; rendre();
}
function setOnglet(t){
  onglet = t; exoSeance = null;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $$('.ec').forEach(e => e.hidden = e.id !== 'ec-' + t);
  rendre(); window.scrollTo({ top: 0 });
}
function majNav(){ const b = $('#nav button[data-t="coach"]'); if (b) b.hidden = !CFG.aiKey; $('#nav').style.gridTemplateColumns = `repeat(${CFG.aiKey ? 5 : 4},1fr)`; }
function rendre(){
  if (!pret) return;
  $('#titre').textContent = onglet === 'jour' ? fmtJour(auj()) : ({ semaine:'Semaine', exos:'Exos', reglages:'Réglages', coach:'Coach' })[onglet];
  try { ({ jour: rJour, semaine: rSemaine, exos: rExos, reglages: rReglages, coach: rCoach })[onglet](); } catch(e){ console.error(e); }
}

// ===== Actions =====
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, d = auj();

  if (a === 'coche-seance') {
    const sid = b.dataset.sid, val = !b.classList.contains('on');
    b.classList.toggle('on', val); b.setAttribute('aria-pressed', val);
    if (val) { b.classList.add('pop'); vibrer(35); setTimeout(()=>b.classList.remove('pop'), 240); }
    await cocher(profil, d, sid, val);
    const ex = listeExos(profil, sid, d); for (const e of ex) await cocherExo(profil, d, e.k, val);
    majProgJour();
  }
  else if (a === 'repas') {
    const n = +b.dataset.n, cur = repasDe(profil, d).n;
    await setRepas(profil, d, { n: cur >= n ? n - 1 : n });
    b.classList.add('pop'); setTimeout(()=>b.classList.remove('pop'), 240); vibrer(25); majPastilles();
  }
  else if (a === 'shaker') { const cur = repasDe(profil, d).sh; await setRepas(profil, d, { sh: !cur }); b.classList.add('pop'); setTimeout(()=>b.classList.remove('pop'), 240); vibrer(25); majPastilles(); }
  else if (a === 'pesee') {
    const v = parseFloat(($('#kg') || {}).value); if (!v) return;
    await store.set('mesures', profil + '_' + iso(d), { profil, date: iso(d), poids: v });
    toast(v + ' kg'); rJour();
  }
  else if (a === 'ouvrir-seance') { exoSeance = b.dataset.sid; setOnglet('exos'); }
  else if (a === 'retour-exos') { exoSeance = null; rExos(); }
  else if (a === 'coche-exo') {
    const ex = b.dataset.ex, sid = b.dataset.sid, val = !b.classList.contains('on');
    b.classList.toggle('on', val); b.setAttribute('aria-pressed', val);
    if (val) { b.classList.add('pop'); vibrer(25); setTimeout(()=>b.classList.remove('pop'), 240); }
    await cocherExo(profil, d, ex, val);
    const liste = listeExos(profil, sid, d), ch = exosCoches(profil, d);
    await cocher(profil, d, sid, liste.every(e => ch[e.k]));
    const c = $('#ec-exos .cpt'); if (c) c.textContent = liste.filter(e => ch[e.k]).length + '/' + liste.length;
  }
  else if (a === 'coche-tout') {
    const sid = b.dataset.sid, liste = listeExos(profil, sid, d), ch = exosCoches(profil, d);
    const val = !liste.every(e => ch[e.k]);
    for (const e of liste) await cocherExo(profil, d, e.k, val);
    await cocher(profil, d, sid, val); vibrer(35); rSeance(sid, d);
  }
  else if (a === 'sem') { semDecal += +b.dataset.d; rSemaine(); }
  else if (a === 'cell') {
    if (b._long) { b._long = false; return; }
    const sid = b.dataset.sid; if (!sid) return;
    const dd = fromIso(b.dataset.date), p = b.dataset.p, val = !estCochee(p, dd, sid);
    await cocher(p, dd, sid, val);
    const ex = listeExos(p, sid, dd); for (const e of ex) await cocherExo(p, dd, e.k, val);
    vibrer(25); rSemaine();
  }
  else if (a === 'preparer') {
    const l = b.dataset.lundi, r = REG();
    await store.set('semaines', l, { tpl: JSON.parse(JSON.stringify(r.tpl)), allege: {} });
    toast('Semaine prête'); rSemaine();
  }
  else if (a === 'photo-add') choisirPhoto(b.dataset.p);
  else if (a === 'photo-voir') {
    const p = b.dataset.p, ph = D.photos[p + '_' + iso(d)]; if (!ph) return;
    ouvrir(`<button class="retour" data-a="fermer">‹ Retour</button><div class="c"><img data-photo="${esc(ph.path)}" alt="" style="width:100%;border-radius:12px">${p === profil ? `<button class="b s" data-a="photo-suppr" data-p="${p}">Supprimer</button>` : ''}</div>`);
    hydraterPhotos();
  }
  else if (a === 'photo-suppr') { const p = b.dataset.p, ph = D.photos[p + '_' + iso(d)]; if (ph) { try { await photoDelete(ph.path); } catch(e){} await store.del('photos', p + '_' + iso(d)); } fermer(); }
  else if (a === 'fermer') fermer();
  // Réglages
  else if (a === 'nb-repas') { const r = REG(); const p = b.dataset.p; await regSave({ repas: { ...r.repas, [p]: Math.max(0, Math.min(6, r.repas[p] + (+b.dataset.d))) } }); rReglages(); }
  else if (a === 'cycle') { const r = REG(); await regSave({ cyclePesee: Math.max(7, Math.min(30, r.cyclePesee + (+b.dataset.d))) }); rReglages(); }
  else if (a === 'sw-shaker') { const r = REG(); const p = b.dataset.p; await regSave({ shaker: { ...r.shaker, [p]: !r.shaker[p] } }); rReglages(); }
  else if (a === 'tpl') {
    const p = b.dataset.p, j = +b.dataset.j, r = REG();
    const ids = [null, ...(p === 'mohamed' ? Object.keys(SEANCES_M) : Object.keys(SEANCES))];
    const cur = r.tpl[p][j] || null, i = ids.indexOf(cur);
    const suiv = ids[(i + 1) % ids.length];
    const tpl = JSON.parse(JSON.stringify(r.tpl)); if (suiv) tpl[p][j] = suiv; else delete tpl[p][j];
    await regSave({ tpl }); rReglages();
  }
  else if (a === 'cfg-save') {
    CFG.url = $('#sb-url').value.trim(); CFG.anonKey = $('#sb-key').value.trim(); CFG.aiKey = $('#ai-key').value.trim();
    cfgSave(); majNav(); toast('Enregistré'); setTimeout(()=>location.reload(), 500);
  }
  else if (a === 'co' || a === 'creer') { const ok = await connexion($('#mail').value.trim(), $('#mdp').value, a === 'creer'); if (ok) setTimeout(()=>location.reload(), 600); }
  else if (a === 'deco') { await deconnexion(); location.reload(); }
  else if (a === 'export') {
    const blob = new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' });
    const u = URL.createObjectURL(blob), el = document.createElement('a'); el.href = u; el.download = 'bsaha-' + iso(d) + '.json'; el.click(); URL.revokeObjectURL(u);
  }
  else if (a === 'import') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const o = JSON.parse(await f.text());
      for (const c of COLLS) for (const [id, v] of Object.entries(o[c] || {})) await store.set(c, id, v, true);
      toast('Importé'); rendre(); } catch(e){ toast('Fichier invalide'); } };
    inp.click();
  }
  else if (a === 'coach-envoi') { const q = $('#q'); const t = q.value.trim(); q.value = ''; envoyerCoach(t); }
  else if (a === 'coach-photo') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; chatEtat.img = await fileToB64(f, 1100); rCoach(); };
    inp.click();
  }
});
document.addEventListener('change', async ev => {
  const el = ev.target.closest('[data-a="charge"]'); if (el) { await setCharge(profil, el.dataset.ex, el.value.trim()); return; }
  const pr = ev.target.closest('[data-a="prenom"]'); if (pr) { const p = pr.dataset.p; await store.set('profils', p, { ...(D.profils[p] || {}), prenom: pr.value.trim() || court(p) }, true); $$('#qui button').forEach(b => { if (b.dataset.p === p) b.textContent = court(p); }); }
});
// Appui long sur une cellule de semaine
let lp = null;
document.addEventListener('touchstart', ev => {
  const c = ev.target.closest('.cell[data-sid]'); if (!c) return;
  lp = setTimeout(() => { c._long = true; vibrer(40); menuCellule(c); }, 480);
}, { passive: true });
['touchend','touchmove','touchcancel'].forEach(e => document.addEventListener(e, () => { clearTimeout(lp); }, { passive: true }));

function menuCellule(c){
  const p = c.dataset.p, dk = c.dataset.date, sid = c.dataset.sid, dd = fromIso(dk);
  const lundi = iso(lundiDe(dd)), pl = planDe(lundi);
  let h = `<button class="retour" data-a="fermer">‹ Retour</button><h1>${esc(nomSeance(p, sid))}</h1><div class="lab">${prenom(p)} · ${fmtJour(dd)}</div><div class="menu">`;
  for (let j = 1; j <= 7; j++) if (j !== numJour(dd) && !pl.tpl[p][j]) h += `<button data-mv="${j}">Déplacer vers ${JOURS[j-1]}</button>`;
  h += `<button data-al="1">${allegee(p, dd) ? 'Séance normale' : 'Alléger'}</button></div>`;
  ouvrir(h);
  $('#ov').onclick = async e2 => {
    const mv = e2.target.closest('[data-mv]'), al = e2.target.closest('[data-al]');
    const s = JSON.parse(JSON.stringify(D.semaines[lundi] || { tpl: JSON.parse(JSON.stringify(REG().tpl)), allege: {} }));
    s.tpl[p] = s.tpl[p] || {};
    if (mv) { const j = +mv.dataset.mv; delete s.tpl[p][numJour(dd)]; s.tpl[p][j] = sid; await store.set('semaines', lundi, s); fermer(); rSemaine(); }
    else if (al) { s.allege = s.allege || {}; s.allege[p] = s.allege[p] || {}; const n = numJour(dd); if (s.allege[p][n]) delete s.allege[p][n]; else s.allege[p][n] = true; await store.set('semaines', lundi, s); fermer(); rSemaine(); }
  };
}
function ouvrir(h){ const o = $('#ov'); o.innerHTML = `<div class="int">${h}</div>`; o.hidden = false; document.body.style.overflow = 'hidden'; }
function fermer(){ const o = $('#ov'); o.hidden = true; o.innerHTML = ''; o.onclick = null; document.body.style.overflow = ''; }
function majProgJour(){
  const d = auj(), r = REG(), sid = seanceDe(profil, d);
  const nb = r.repas[profil] || 0, sh = r.shaker[profil], m = repasDe(profil, d);
  const total = nb + (sh ? 1 : 0), faits = Math.min(m.n, nb) + (sh && m.sh ? 1 : 0);
  const c = $('#ec-jour .cpt'); if (c) c.textContent = faits + '/' + total;
  const tot = total + (sid ? 1 : 0), ok = faits + (sid && estCochee(profil, d, sid) ? 1 : 0);
  const bar = $('#ec-jour .prog i'); if (bar) bar.style.width = (tot ? Math.round(ok/tot*100) : 0) + '%';
}
function majPastilles(){
  const d = auj(), m = repasDe(profil, d);
  $$('#ec-jour .pa[data-a="repas"]').forEach(el => { const on = m.n >= +el.dataset.n; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); el.textContent = on ? '\u2713' : el.dataset.n; });
  const s = $('#ec-jour .pa[data-a="shaker"]'); if (s) { s.classList.toggle('on', m.sh); s.setAttribute('aria-pressed', m.sh); s.textContent = m.sh ? '\u2713' : 'S'; }
  majProgJour();
}

// ===== Migration v1 → v2 =====
async function migrer(){
  const r = D.couple.settings || {};
  if (r.v === 2) return;
  const checks = {}, meals = {};
  for (const l of Object.values(D.logs || {})) {
    if (!l.date || !l.profil || !l.seance) continue;
    if (!['complete','adaptee','partielle'].includes(l.statut)) continue;
    checks[l.date] = checks[l.date] || {}; checks[l.date][l.profil] = checks[l.date][l.profil] || {};
    checks[l.date][l.profil][l.seance] = true;
  }
  for (const [k, v] of Object.entries(D.shaker || {})) if (v && v.pris) { meals[k] = meals[k] || {}; meals[k].firdaous = { ...(meals[k].firdaous || {}), sh: true }; }
  for (const [k, v] of Object.entries(checks)) await store.set('checks', k, v, true);
  for (const [k, v] of Object.entries(meals)) await store.set('meals', k, v, true);
  await store.set('couple', 'settings', { ...REG_DEFAUT, ...r, v: 2, debut: r.debut || REG_DEFAUT.debut });
  console.info('Migration v1→v2 :', Object.keys(checks).length, 'jours de séances,', Object.keys(meals).length, 'jours de shaker.');
}

// ===== Démarrage =====
(async function(){
  try { profil = localStorage.getItem('bsaha.profil') || 'mohamed'; } catch(e){}
  document.documentElement.dataset.p = profil;
  $$('#qui button').forEach(b => b.classList.toggle('on', b.dataset.p === profil));
  $('#qui').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) setProfil(b.dataset.p); });
  $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setOnglet(b.dataset.t); });
  await initStore();
  await migrer();
  majNav();
  pret = true;
  rendre();
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch(e){} }
})();
