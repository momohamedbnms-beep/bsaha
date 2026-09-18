// ===== Bsaha v3 — stockage =====
const COLLS = ['couple','profils','logs','mesures','shaker','repas'];
const D = Object.fromEntries(COLLS.map(c => [c, {}]));
let sb = null, session = null, pret = false, rtChannel = null;
const LS_CLE = 'bsaha.v3', LS_CFG = 'bsaha.cfg';
const SB_DEF = { url:'https://xifuvauojojgwdyfvnjg.supabase.co', anonKey:'sb_publishable_XOdO89Ng6uyYSklh4ncRAw_gqVc-9op', email:'', aiKey:'', aiModel:'claude-sonnet-4-5' };
const CFG = (() => { try { const s = JSON.parse(localStorage.getItem(LS_CFG)||'{}'); if (!s.url || !s.anonKey) { s.url = SB_DEF.url; s.anonKey = SB_DEF.anonKey; } return Object.assign({}, SB_DEF, s); } catch(e){ return Object.assign({}, SB_DEF); } })();
function cfgSave(){ try { localStorage.setItem(LS_CFG, JSON.stringify(CFG)); } catch(e){} }
function lsCharger(){ try { const r = localStorage.getItem(LS_CLE); if (r) { const o = JSON.parse(r); COLLS.forEach(c => D[c] = o[c] || {}); } } catch(e){} }
function lsSauver(){ try { localStorage.setItem(LS_CLE, JSON.stringify(D)); } catch(e){} }
function sbOk(){ return !!(CFG.url && CFG.anonKey && window.supabase); }
function getSb(){ if (!sbOk()) return null; if (!sb) { try { sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch(e){ return null; } } return sb; }
const pend = {};
const store = {
  async set(coll, id, data){
    D[coll][id] = JSON.parse(JSON.stringify(data)); lsSauver(); rendre();
    const c = getSb(); if (!c || !session) return;
    const k = coll+'/'+id;
    pend[k] = (pend[k] || Promise.resolve()).then(async () => {
      const r = await c.from('bsaha_docs').upsert({ user_id: session.user.id, coll, id, data: D[coll][id] || data, updated_at: new Date().toISOString() });
      if (r.error) console.warn(r.error);
    }).catch(()=>{});
  },
  get(coll, id){ return D[coll][id]; }
};
async function pullAll(){ const c = getSb(); if (!c || !session) return; const r = await c.from('bsaha_docs').select('coll,id,data').eq('user_id', session.user.id); if (r.error) return; COLLS.forEach(cl => D[cl] = {}); r.data.forEach(x => { if (D[x.coll]) D[x.coll][x.id] = x.data; }); lsSauver(); if (pret) rendre(); }
function subRT(){ const c = getSb(); if (!c || !session || rtChannel) return; try { rtChannel = c.channel('bsaha-v3').on('postgres_changes', { event:'*', schema:'public', table:'bsaha_docs', filter:'user_id=eq.'+session.user.id }, p => { const r = p.new && p.new.coll ? p.new : null; if (p.eventType === 'DELETE'){ const o = p.old; if (o && D[o.coll]){ delete D[o.coll][o.id]; lsSauver(); rendre(); } return; } if (r && D[r.coll]){ D[r.coll][r.id] = r.data; lsSauver(); rendre(); } }).subscribe(); } catch(e){} }
async function connexion(email, pass, creer){ const c = getSb(); if (!c){ toast('Renseigne d’abord Supabase'); return false; } const r = creer ? await c.auth.signUp({ email, password: pass }) : await c.auth.signInWithPassword({ email, password: pass }); if (r.error){ toast(r.error.message); return false; } CFG.email = email; cfgSave(); if (creer && !r.data.session) toast('Compte créé : confirme l’e-mail'); else { toast('Connecté'); const loc = JSON.parse(JSON.stringify(D)); await pullAll(); for (const cl of COLLS) for (const [id,v] of Object.entries(loc[cl]||{})) if (!D[cl][id]) await store.set(cl, id, v); } return true; }
async function deconnexion(){ const c = getSb(); if (c) await c.auth.signOut(); session = null; rendre(); }

// ===== utilitaires =====
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const auj = () => { const d = new Date(); d.setHours(12,0,0,0); return d; };
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dde = s => { const [a,b,c] = s.split('-').map(Number); const d = new Date(a, b-1, c); d.setHours(12,0,0,0); return d; };
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const lundiDe = d => { const x = new Date(d); const j = (x.getDay()+6)%7; x.setDate(x.getDate()-j); x.setHours(12,0,0,0); return x; };
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const JC = ['D','L','M','M','J','V','S'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const dateLongue = d => JOURS[d.getDay()]+' '+d.getDate()+' '+MOIS[d.getMonth()];
const MC = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const joursTexte = x => (x && x.length) ? x.slice().sort((m,n)=>((m+6)%7)-((n+6)%7)).map(m=>JOURS[m].slice(0,3).toLowerCase()).join(' · ') : 'aucun';
const dateCourte = d => JOURS[d.getDay()]+' '+d.getDate()+' '+MC[d.getMonth()];
const nb = n => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const kg = n => (Math.round(n*10)/10).toString().replace('.', ',');
let toastT = null;
function toast(t){ const w = $('#tw'); $('#tt').textContent = t; w.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(()=>w.classList.remove('on'), 2400); }
function vib(ms){ try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} }
const IMG = k => 'f_' + k + '.jpg';
const IMGM = (k, ab) => 'm_' + k + '_' + ab + '.jpg';

// ===== réglages =====
const REG_DEF = () => ({ v:3, debut: iso(lundiDe(auj())),
  jours: { mohamed:[1,2,4,6], firdaous:[1,3,5,6] },
  kcal: { mohamed:2100, firdaous:2400 },
  part: { matin:0.55 },
  cardio: { min:30, pente:10, vit:5.5 },
  cyclePesee: 90 });
const REG = () => Object.assign(REG_DEF(), D.couple.settings || {});
const PROF = p => Object.assign({}, PROFILS_DEFAUT[p], D.profils[p] || {});
let profil = (() => { try { return localStorage.getItem('bsaha.profil') || 'mohamed'; } catch(e){ return 'mohamed'; } })();
let onglet = 'jour';

// ===== planning : jours par défaut + surcharges semaine par semaine =====
const cleOv = (p, lun) => p + '_' + iso(lun);
function joursDe(p, d){
  const r = REG(), ov = (r.ov || {})[cleOv(p, lundiDe(d))];
  return Array.isArray(ov) ? ov : (r.jours[p] || []);
}
function estJour(p, d){ return joursDe(p, d).includes(d.getDay()); }
function nbSeancesAvant(p, d){
  const deb = dde(REG().debut);
  if (d < deb) return -1;
  let n = 0;
  for (let x = new Date(deb); x <= d; x = plus(x,1)) if (estJour(p, x)) { if (iso(x) === iso(d)) return n; n++; }
  return -1;
}
function seanceDuJour(p, d){
  if (!estJour(p, d)) return null;
  const n = nbSeancesAvant(p, d); if (n < 0) return null;
  const rot = p === 'mohamed' ? ROTATION_M[4] : ROTATION_F[4];
  return rot[n % rot.length];
}
const chef = () => profil === 'mohamed';
async function basculerJour(p, ds){
  const d = dde(ds), lun = lundiDe(d), r = REG();
  const cur = joursDe(p, d).slice(), dow = d.getDay(), i = cur.indexOf(dow);
  if (i >= 0) cur.splice(i, 1); else cur.push(dow);
  cur.sort((x,y)=>((x+6)%7)-((y+6)%7));
  r.ov = Object.assign({}, r.ov || {}); r.ov[cleOv(p, lun)] = cur;
  vib(12);
  await store.set('couple', 'settings', r);
}
async function figerHabitude(){
  const lun = plus(lundiDe(auj()), semOff*7), r = REG();
  r.jours = { mohamed: joursDe('mohamed', lun).slice(), firdaous: joursDe('firdaous', lun).slice() };
  r.ov = {};
  await store.set('couple', 'settings', r);
  toast('Ce rythme devient l’habitude');
}
const titre = (p,k) => p === 'mohamed' ? (k[0] === 'H' ? 'Haut du corps' : 'Bas du corps') : ((SEANCES[k]||{}).sous || k);
// lieu : Mohamed est toujours à la salle ; Firdaous choisit jour par jour
const LIEU_DEF = p => p === 'mohamed' ? 'salle' : 'maison';
function lieuDe(p, d){
  const ds = typeof d === 'string' ? d : iso(d);
  if (p === 'mohamed') return 'salle';
  const l = D.logs[lid(p, ds)];
  if (l && l.lieu) return l.lieu;
  return PROF(p).lieuDefaut || 'maison';
}
const catDe = (p, lieu) => (p === 'mohamed' || lieu === 'salle') ? 'm' : 'f';
const CAT = c => c === 'm' ? EXOS_M : EXOS;
function defSeance(p, k, lieu){
  if (p === 'mohamed') return SEANCES_M[k];
  return (lieu === 'salle' && typeof SEANCES_F_SALLE !== 'undefined' && SEANCES_F_SALLE[k]) ? SEANCES_F_SALLE[k] : SEANCES[k];
}
function exosDe(p, k, lieu){
  const s = defSeance(p, k, lieu); if (!s) return [];
  const c = catDe(p, lieu);
  return s.exos.map(e => Object.assign({}, e, { fiche: CAT(c)[e.k], cat: c }));
}
const imgEx = e => e.cat === 'm' ? IMGM(e.k, 'a') : ((e.fiche && e.fiche.img) ? IMG(e.fiche.img[0]) : '');
const lid = (p, d) => p + '_' + (typeof d === 'string' ? d : iso(d));
function log(p, d){ return D.logs[lid(p,d)] || { p, d: (typeof d === 'string' ? d : iso(d)), exos:{}, cardio:false, repas:{}, fait:false, lieu: LIEU_DEF(p) }; }
async function majLog(p, d, f){ const l = JSON.parse(JSON.stringify(log(p,d))); f(l); await store.set('logs', lid(p,d), l); }
function zonesDe(p, k, lieu){
  const ex = exosDe(p, k, lieu); const z = [];
  ex.forEach(e => (e.fiche?.zone || '').split('·').forEach(x => { const t = x.trim(); if (t && !z.includes(t)) z.push(t); }));
  return z.slice(0, 3);
}
function progSeance(p, d, k){ const ex = exosDe(p, k, lieuDe(p, d)); if (!ex.length) return 0; const l = log(p,d); return Math.round(ex.filter(e => l.exos[e.k]).length / ex.length * 100); }

// ===== streak =====
function jourOk(p, dstr){
  const d = dde(dstr), l = D.logs[lid(p,dstr)], s = seanceDuJour(p, d);
  if (p === 'firdaous' && !(D.shaker[dstr] && D.shaker[dstr].pris)) return false;
  if (s) return !!(l && l.fait);
  return p === 'firdaous' ? true : !!(l && (l.fait || l.repas?.m || l.repas?.a));
}
function streak(p){
  let n = 0, d = auj();
  if (jourOk(p, iso(d))) n++;
  d = plus(d, -1);
  for (let i = 0; i < 400; i++){ const r = REG(); if (d < dde(r.debut)) break; if (!jourOk(p, iso(d))) break; n++; d = plus(d, -1); }
  return n;
}

// ===== icônes =====
const I = {
  halt:'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  run:'<circle cx="13" cy="4" r="1.6"/><path d="M6 20l3-5 3 2 2-5 4 3M4 20h16"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  check:'<path d="M4 12.5l5.5 5.5L20 6.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M3 17l5-4 4 3 3-2 6 4"/>',
  flame:'<path d="M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-1-.3-2-1-3 2 2 3 4.5 3 7a8 8 0 1 1-16 0c0-5 4-8 8-12z" fill="#E8853C" stroke="none"/>',
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  scale:'<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M8.5 10.5L12 8l3.5 2.5"/><path d="M12 8v5"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3"/>',
  rest:'<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
  cam:'<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.2-2h7.2l1.2 2h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.4"/>',
  fork:'<path d="M6 3v6a2.5 2.5 0 0 0 5 0V3M8.5 11v10"/><path d="M17 3c-1.6 1.4-2 3.2-2 5.2 0 1.6.8 2.6 2 2.8V21"/>',
  glass:'<path d="M7 3h10l-1.2 6.2a4 4 0 0 1-3.9 3.2h0a4 4 0 0 1-3.9-3.2z"/><path d="M12 12.5V21M9 21h6"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>'
};
const svg = (d, cls='') => '<svg class="'+cls+'" viewBox="0 0 24 24">'+d+'</svg>';
const ring = pct => { const c = 2*Math.PI*21; return '<div class="ring"><svg width="52" height="52"><circle cx="26" cy="26" r="21" stroke="rgba(255,255,255,.22)"/><circle cx="26" cy="26" r="21" stroke="#fff" stroke-linecap="round" stroke-dasharray="'+c.toFixed(0)+'" stroke-dashoffset="'+(c*(1-pct/100)).toFixed(0)+'"/></svg><b>'+pct+'%</b></div>'; };

// ===== rendu =====
function rendre(){
  if (!pret) return;
  const d = auj(), ds = iso(d), p = profil, pr = PROF(p);
  $('#h-t').innerHTML = onglet === 'jour' ? 'Bonjour<br>'+esc(pr.prenom) : { semaine:'La semaine', exos:'Les exercices', suivi:'Le défi' }[onglet];
  $('#h-s').textContent = onglet === 'jour' ? dateCourte(d) : (onglet === 'suivi' ? 'Vous deux' : pr.prenom);
  $('#b-streak').innerHTML = svg(I.flame) + streak(p);
  $('#b-profil').innerHTML = svg(I.user) + esc(pr.prenom.slice(0,4));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === onglet));
  $$('.ec').forEach(e => e.hidden = e.id !== 'ec-'+onglet);
  ({ jour: rJour, semaine: rSemaine, exos: rExos, suivi: rSuivi })[onglet](p, ds);
}

// --- JOUR ---

// ===== nutrition : poids, tendance, calories, protéines =====
function poidsActuel(p){ const s = seriePoids(p); return s.length ? s[s.length-1].poids : PROF(p).poidsDepart; }
function poidsDepartReel(p){ const s = seriePoids(p); return s.length ? s[0].poids : PROF(p).poidsDepart; }
// tendance en kg/semaine par régression linéaire sur les 35 derniers jours (min 3 pesées sur 14 j)
function tendance(p){
  const lim = plus(auj(), -35), s = seriePoids(p).filter(m => dde(m.d) >= lim);
  if (s.length < 3) return null;
  const t0 = dde(s[0].d).getTime(), pts = s.map(m => [(dde(m.d).getTime()-t0)/864e5, m.poids]);
  if (pts[pts.length-1][0] < 14) return null;
  const n = pts.length, sx = pts.reduce((a,q)=>a+q[0],0), sy = pts.reduce((a,q)=>a+q[1],0);
  const sxy = pts.reduce((a,q)=>a+q[0]*q[1],0), sxx = pts.reduce((a,q)=>a+q[0]*q[0],0);
  const den = n*sxx - sx*sx; if (!den) return null;
  return ((n*sxy - sx*sy)/den) * 7;
}
const sens = p => PROF(p).objectifPoids < PROF(p).poidsDepart ? -1 : 1;
function rythmeCible(p){ const pr = PROF(p); return sens(p) < 0 ? -0.75 : 0.35; }
function bmr(p){ const pr = PROF(p), w = poidsActuel(p);
  return Math.round(10*w + 6.25*pr.taille - 5*pr.age + (pr.sexe === 'H' ? 5 : -161)); }
function tdee(p){ return Math.round(bmr(p) * (PROF(p).activite || 1.45)); }
// recommandation = maintien + écart pour le rythme visé, corrigée par la tendance réelle (lissée, bornée)
function kcalReco(p){
  const base = tdee(p) + Math.round(rythmeCible(p) * 7700 / 7);
  const t = tendance(p); let corr = 0;
  if (t !== null){
    const ecart = t - rythmeCible(p);            // >0 = prend plus / perd moins que prévu
    if (Math.abs(ecart) > 0.2) corr = -Math.sign(ecart) * Math.min(300, Math.round(Math.abs(ecart) * 400 / 50) * 50);
  }
  return Math.max(1200, Math.round((base + corr) / 10) * 10);
}
function protReco(p){
  const pr = PROF(p);
  const g = sens(p) < 0 ? 2.1 * Math.min(pr.objectifPoids, poidsActuel(p)) : 1.8 * poidsActuel(p);
  return Math.round(g / 5) * 5;
}
const manuel = (p, champ) => (REG()[champ] || {})[p];
const kcalCible = p => manuel(p, 'kcalM') || kcalReco(p);
const protCible = p => manuel(p, 'protM') || protReco(p);

// ===== repas =====
const rid = (p, ds) => p + '_' + ds + '_' + Math.random().toString(36).slice(2, 8);
function repasDe(p, ds){ return Object.entries(D.repas).filter(([, r]) => r.p === p && r.d === ds)
  .map(([id, r]) => Object.assign({ id }, r)).sort((a, b) => (a.h || '') < (b.h || '') ? -1 : 1); }
function totaux(p, ds){ return repasDe(p, ds).reduce((a, r) => ({ kcal: a.kcal + (+r.kcal || 0), prot: a.prot + (+r.prot || 0) }), { kcal: 0, prot: 0 }); }
const TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation', 'Shaker', 'Autre'];
const heureMaintenant = () => { const d = new Date(); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };

// ===== objectifs 3 / 6 / 12 mois =====
const JALONS = [{ k:'m3', mois:3, t:'Objectif 3 mois' }, { k:'m6', mois:6, t:'Objectif 6 mois' }, { k:'m12', mois:12, t:'Objectif 1 an' }];
function objDef(p){
  const pr = PROF(p), dep = pr.poidsDepart, cible = pr.objectifPoids, s = sens(p);
  return s < 0 ? { m3: dep - 10, m6: Math.max(cible, dep - 13), m12: cible }
               : { m3: dep + 5, m6: Math.min(cible, dep + 10), m12: cible };
}
const objectifs = p => Object.assign(objDef(p), (PROF(p).obj) || {});
function dateJalon(mois){ const d = dde(REG().debut); const x = new Date(d); x.setMonth(x.getMonth() + mois); x.setHours(12,0,0,0); return x; }
const joursRestants = mois => Math.max(0, Math.ceil((dateJalon(mois) - auj()) / 864e5));
function projection(p, mois){
  const cible = objectifs(p)[JALONS.find(j => j.mois === mois).k];
  const dep = poidsDepartReel(p), act = poidsActuel(p);
  const total = cible - dep, fait = act - dep, reste = cible - act;
  const sem = Math.max(1, joursRestants(mois) / 7);
  return { cible, dep, act, total, fait, reste, parSemaine: reste / sem,
    pct: total ? Math.max(0, Math.min(100, Math.round(fait / total * 100))) : 0, jours: joursRestants(mois) };
}

// ===== IA : estimation d'un repas à partir d'une photo =====
const aiOk = () => !!CFG.aiKey;
async function askAI(texte, images){
  if (!CFG.aiKey) throw { code: 'no_key' };
  const content = [...(images || []).map(im => ({ type:'image', source:{ type:'base64', media_type:im.type, data:im.b64 } })), { type:'text', text:texte }];
  const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST',
    headers:{ 'content-type':'application/json', 'x-api-key':CFG.aiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model: CFG.aiModel || 'claude-sonnet-4-5', max_tokens: 400, messages:[{ role:'user', content }] }) });
  if (!res.ok){ let m=''; try { m = (await res.json()).error?.message || ''; } catch(e){} throw { code: res.status === 401 ? 'cle' : 'err', message:m }; }
  const j = await res.json();
  return (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
}
function jsonTolerant(t){ try { return JSON.parse(t); } catch(e){}
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m){ try { return JSON.parse(m[1]); } catch(e){} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a){ try { return JSON.parse(t.slice(a, b+1)); } catch(e){} }
  return null; }
async function imgCompress(file, max = 620, q = 0.62){
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width*s); c.height = Math.round(bmp.height*s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', q);
  return { dataUrl, b64: dataUrl.split(',')[1], type: 'image/jpeg' };
}

// ===== séries / répétitions lisibles =====
function nbSeries(p, e){
  if (e.series) return e.series;
  const n = PROF(p).difficulteDefaut || 'moyen';
  return (typeof SERIES_PAR_NIVEAU !== 'undefined' ? SERIES_PAR_NIVEAU[n] : 3) || 3;
}
function ligneSerie(p, e){
  const f = e.fiche || {}, s = nbSeries(p, e);
  const reps = e.reps || f.reps || '';
  const duree = /s$|sec|second/i.test(String(reps)) || f.type === 'gainage';
  const cote = e.parCote || f.unilateral ? (/jambe|bras/i.test(String(reps)) ? '' : ' par côté') : '';
  const unite = duree ? '' : (cote ? '' : ' répétitions');
  return s + ' séries × ' + reps + unite + cote;
}
const ligneRepos = (e) => 'Repos : ' + ((e.repos || (e.fiche || {}).repos || 60)) + ' s';
function astuce(f){
  const src = f.etapes || f.tech || [];
  const t = src.slice(0, 2).join(' ');
  return t.length > 190 ? t.slice(0, 187) + '…' : t;
}

// ===== rendu =====
function rendre(){
  if (!pret) return;
  const d = auj(), ds = iso(d), p = profil, pr = PROF(p);
  $('#h-t').innerHTML = onglet === 'jour' ? 'Bonjour<br>'+esc(pr.prenom) : { semaine:'La semaine', exos:'Les exercices', suivi:'Le défi' }[onglet];
  $('#h-s').textContent = onglet === 'jour' ? dateCourte(d) : (onglet === 'suivi' ? 'Vous deux' : pr.prenom);
  $('#b-streak').innerHTML = svg(I.flame) + streak(p);
  $('#b-profil').innerHTML = svg(I.user) + esc(pr.prenom.slice(0,4));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === onglet));
  $$('.ec').forEach(e => e.hidden = e.id !== 'ec-'+onglet);
  ({ jour: rJour, semaine: rSemaine, exos: rExos, suivi: rSuivi })[onglet](p, ds);
}

// --- sélecteur maison / salle ---
function segLieu(p, ds, lieu){
  return '<div class="seg"><div class="seglab">Aujourd’hui je m’entraîne</div><div class="segb">'+
    ['maison','salle'].map(x => '<button class="'+(x===lieu?'on':'')+'" data-a="lieu" data-p="'+p+'" data-d="'+ds+'" data-l="'+x+'">'+
      svg(x==='maison'?I.home:I.halt)+(x==='maison'?'À la maison':'À la salle')+'</button>').join('')+'</div></div>';
}

// --- barres nutrition ---
function blocNutrition(p, ds, compact){
  const kc = kcalCible(p), pc = protCible(p), t = totaux(p, ds);
  const rk = Math.max(0, kc - t.kcal), rp = Math.max(0, pc - t.prot);
  const pk = Math.min(100, Math.round(t.kcal / kc * 100)), pp = Math.min(100, Math.round(t.prot / pc * 100));
  const c2 = p === 'firdaous' ? 'linear-gradient(90deg,var(--ros1),var(--ros2))' : 'linear-gradient(90deg,var(--vio1),var(--vio2))';
  return '<div class="w"><div class="hrow"><div class="lab">Nutrition du jour</div><div class="mini">'+(sens(p)<0?'perte de poids':'prise de poids')+'</div></div>'+
    '<div class="nut"><div class="nk">'+nb(t.kcal)+' <em>/ '+nb(kc)+' kcal</em></div>'+
    '<div class="bar"><i style="width:'+pk+'%;background:'+c2+'"></i></div>'+
    '<div class="rest">'+(t.kcal>kc ? nb(t.kcal-kc)+' kcal au-dessus' : nb(rk)+' kcal restantes')+'</div></div>'+
    '<div class="nut"><div class="nk">'+nb(t.prot)+' <em>/ '+nb(pc)+' g de protéines</em></div>'+
    '<div class="bar"><i style="width:'+pp+'%;background:linear-gradient(90deg,var(--grn1),var(--grn2))"></i></div>'+
    '<div class="rest">'+(t.prot>=pc ? 'objectif atteint' : 'il te manque '+nb(rp)+' g')+'</div></div>'+
    (compact ? '' : '<div class="split"><button class="pa" data-a="repas-new"><b>+</b><i>Ajouter un repas</i></button>'+
      '<button class="pa" data-a="repas-photo"><b>'+svg(I.cam)+'</b><i>Photo du repas</i></button></div>')+
    '</div>';
}
function blocRepas(p, ds, lecture){
  const rs = repasDe(p, ds);
  if (!rs.length) return lecture ? '' : '<div class="w"><div class="lab">Repas du jour</div><p class="mini" style="margin-top:8px">Rien pour l’instant. Ajoute ton premier repas au-dessus.</p></div>';
  return '<div class="w" style="padding:14px 18px"><div class="lab" style="padding:0 4px 4px">Repas du jour</div>'+
    rs.map(r => '<button class="row" data-a="repas-edit" data-id="'+esc(r.id)+'" style="width:100%">'+
      '<span class="th">'+(r.photo ? '<img src="'+r.photo+'" alt="">' : svg(I.fork))+'</span>'+
      '<span class="rtx"><b>'+esc(r.type || 'Repas')+(r.h ? ' · '+esc(r.h) : '')+'</b>'+
      '<i>'+esc(r.nom || '')+'</i><i class="mac">'+nb(r.kcal||0)+' kcal · '+nb(r.prot||0)+' g</i></span>'+
      '<svg class="go" viewBox="0 0 24 24">'+I.chev+'</svg></button>').join('')+'</div>';
}

// --- JOUR ---
function rJour(p, ds){
  const d = dde(ds), r = REG(), l = log(p, ds), k = seanceDuJour(p, d), h = [];
  if (p === 'firdaous'){
    const sh = D.shaker[ds] || {}, pris = sh.pris === true, non = sh.pris === false;
    const rec = PROF('firdaous').shaker || {};
    h.push('<div class="card r" style="text-align:center;padding:19px 20px">'+
      '<div class="bell'+(pris?' ok':'')+'">'+svg(I.bell)+'</div>'+
      '<div class="eyebrow">Tous les jours</div><h2>Ton shaker</h2>'+
      (rec.kcal ? '<div class="sub">'+esc(rec.nom||'Shaker')+' · '+nb(rec.kcal)+' kcal · '+nb(rec.prot)+' g</div>' : '')+
      '<div class="duo"><button class="y'+(pris?' sel':'')+'" data-a="sh1">'+svg(I.check)+'Pris</button>'+
      '<button class="n'+(non?' sel':'')+'" data-a="sh0">'+svg(I.x)+'Pas pris</button></div></div>');
  }
  if (k){
    const lieu = lieuDe(p, ds), s = defSeance(p, k, lieu), z = zonesDe(p, k, lieu);
    const pct = progSeance(p, ds, k), n = exosDe(p, k, lieu).length;
    h.push('<button class="card v" data-a="go-exos">'+ring(pct)+
      '<div class="ic">'+svg(I.halt)+'</div><div style="margin-top:14px">'+
      '<div class="eyebrow">Séance du jour · '+n+' exercices</div><h2>'+esc(titre(p,k))+'</h2>'+
      '<div class="tags">'+z.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div></button>');
    if (p === 'firdaous') h.push(segLieu(p, ds, lieu));
  } else {
    h.push('<div class="card b"><div class="ic">'+svg(I.rest)+'</div><div style="margin-top:14px">'+
      '<div class="eyebrow">Aujourd’hui</div><h2>Repos</h2><div class="sub">Marche, étirements, récupération.</div></div></div>');
  }
  if (p === 'mohamed' && k){
    h.push('<div class="card g"><div class="ic">'+svg(I.run)+'</div><div style="margin-top:12px">'+
      '<div class="eyebrow">À chaque séance</div><h2>Cardio '+r.cardio.min+' min</h2>'+
      '<div class="sub">Tapis · pente '+r.cardio.pente+' % · '+String(r.cardio.vit).replace('.',',')+' km/h</div></div>'+
      '<button class="check'+(l.cardio?' on':'')+'" data-a="cardio" aria-label="Cardio fait">'+svg(I.check)+'</button></div>');
  }
  h.push(blocNutrition(p, ds));
  if ((PROF(p).shaker || {}).kcal)
    h.push('<button class="cta2 gros'+(p==='mohamed'?' v':'')+'" data-a="shaker-add" data-p="'+p+'">'+svg(I.glass)+' Ajouter mon shaker</button>');
  h.push(blocRepas(p, ds));
  // poids + prochain jalon
  const pr0 = projection(p, 3);
  h.push('<div class="w"><div class="hrow"><div class="lab">Poids</div><button class="lien" data-a="pesee">Mettre à jour</button></div>'+
    '<div class="big">'+kg(pr0.act)+' <em>kg</em></div>'+
    '<div class="hrow" style="margin-top:12px"><div class="mini">Objectif 3 mois · '+kg(pr0.cible)+' kg</div><div class="mini">'+pr0.jours+' j restants</div></div>'+
    '<div class="bar"><i style="width:'+pr0.pct+'%"></i></div></div>');
  if (k) h.push('<button class="card '+(l.fait?'g':'b')+'" data-a="fini" style="padding:18px 22px">'+
    '<div class="eyebrow">'+(l.fait?'Bravo':'Dernière étape')+'</div><h2 style="font-size:19px">Séance terminée</h2>'+
    '<span class="check'+(l.fait?' on':'')+'" style="width:44px;height:44px;bottom:16px;right:18px">'+svg(I.check)+'</span></button>');
  $('#ec-jour').innerHTML = h.join('');
}

// --- SEMAINE ---
let semOff = 0, edit = false;
function rSemaine(){
  const lun = plus(lundiDe(auj()), semOff*7), h = [];
  h.push('<div class="wsem"><div class="hrow" style="padding:0 8px"><div class="lab">Semaine du '+lun.getDate()+' '+MOIS[lun.getMonth()]+'</div>'+
    '<div style="display:flex;gap:6px"><button class="x" data-a="sem" data-n="-1" aria-label="Semaine précédente"><svg viewBox="0 0 24 24" style="transform:rotate(180deg)">'+I.chev+'</svg></button>'+
    '<button class="x" data-a="sem" data-n="1" aria-label="Semaine suivante">'+svg(I.chev)+'</button></div></div>');
  if (chef()) h.push('<button class="'+(edit?'cta gh':'cta2')+'" data-a="edit" style="margin:10px 6px 2px;width:calc(100% - 12px)">'+
    svg(edit?I.check:I.gear)+(edit?'Terminé — appuie sur un jour':'Modifier les jours')+'</button>');
  h.push('<div class="gr">'+[1,2,3,4,5,6,0].map((_,i)=>'<div class="d">'+JC[plus(lun,i).getDay()]+'</div>').join('')+'</div>');
  for (const p of ['mohamed','firdaous']){
    const nj = joursDe(p, lun).length;
    h.push('<div class="ltete" style="display:flex;justify-content:space-between;padding:0 6px"><span>'+esc(PROF(p).prenom)+'</span><span class="mini">'+nj+' séance'+(nj>1?'s':'')+'</span></div><div class="gr">');
    for (let i = 0; i < 7; i++){
      const d = plus(lun,i), ds = iso(d), k = seanceDuJour(p,d), l = D.logs[lid(p,ds)];
      const auc = ds === iso(auj());
      const cls = ['cell']; if (k) cls.push('prev'); if (l && l.fait) cls.push('fait'); if (auc) cls.push('auj');
      const ed = edit && chef(); if (ed) cls.push('edit');
      h.push('<button class="'+cls.join(' ')+'" data-a="'+(ed?'togj':'jjour')+'" data-p="'+p+'" data-d="'+ds+'">'+
        (auc ? '<s class="pt"></s>' : '')+'<u>'+d.getDate()+'</u>'+(k?'<span>'+esc(k)+'</span>':'<span>'+(ed?'+':'·')+'</span>')+'</button>');
    }
    h.push('</div>');
  }
  if (edit && chef()) h.push('<button class="cta2" data-a="habitude" style="margin:14px 6px 2px;width:calc(100% - 12px)">Appliquer à toutes les semaines</button>');
  h.push('</div>');
  // ce qu'il y a à faire aujourd'hui, en toutes lettres
  const dj = auj(), dsj = iso(dj);
  h.push('<div class="w"><div class="hrow"><div class="lab">Aujourd’hui · '+esc(dateCourte(dj))+'</div></div>'+
    ['mohamed','firdaous'].map(p => {
      const k = seanceDuJour(p, dj), lieu = lieuDe(p, dsj), l = D.logs[lid(p,dsj)];
      if (!k) return '<div class="jal"><div class="hrow"><div class="jt">'+esc(PROF(p).prenom)+'</div><div class="mini">Repos</div></div></div>';
      const s = defSeance(p, k, lieu), ex = exosDe(p, k, lieu);
      return '<div class="jal"><div class="hrow"><div class="jt">'+esc(PROF(p).prenom)+' · '+esc(titre(p,k))+'</div>'+
        '<div class="jc">'+(l && l.fait ? 'fait' : (p === 'firdaous' ? (lieu === 'salle' ? 'salle' : 'maison') : 'à faire'))+'</div></div>'+
        '<div class="mini" style="margin-top:4px">'+esc(s.sous)+' · '+ex.length+' exercices</div>'+
        '<div class="exl">'+ex.map(e => '<span>'+esc((e.fiche||{}).nom || e.k)+'</span>').join('')+'</div>'+
        '<button class="cta2" data-a="jjour" data-p="'+p+'" data-d="'+dsj+'" style="margin-top:10px;min-height:46px">Ouvrir la séance</button></div>';
    }).join('')+'</div>');
  const sc = ['mohamed','firdaous'].map(p => { let f = 0, t = 0; for (let i=0;i<7;i++){ const d = plus(lun,i); if (seanceDuJour(p,d)){ t++; const l = D.logs[lid(p,iso(d))]; if (l && l.fait) f++; } } return { p, f, t }; });
  h.push('<div class="vs">'+sc.map((s,i)=>'<div class="'+(i?'r':'v')+'"><i>'+esc(PROF(s.p).prenom)+'</i><b>'+s.f+'/'+s.t+'</b><u>séances faites</u></div>').join('')+'</div>');
  let shn = 0; for (let i=0;i<7;i++){ const x = D.shaker[iso(plus(lun,i))]; if (x && x.pris) shn++; }
  h.push('<div class="w"><div class="hrow"><div class="lab">Shaker de Firdaous</div><div class="mini">'+shn+'/7</div></div>'+
    '<div class="bar" style="margin-top:10px"><i style="width:'+Math.round(shn/7*100)+'%;background:linear-gradient(90deg,var(--ros1),var(--ros2))"></i></div></div>');
  $('#ec-semaine').innerHTML = h.join('');
}

// --- EXOS ---
let exoSeance = null;
function rExos(p, ds){
  const d = dde(ds), k = exoSeance || seanceDuJour(p, d) || (p === 'mohamed' ? 'HA' : 'A');
  const lieu = lieuDe(p, ds), s = defSeance(p, k, lieu), ex = exosDe(p, k, lieu);
  const l = log(p, ds), duj = seanceDuJour(p,d) === k;
  const toutes = Object.keys(p === 'mohamed' ? SEANCES_M : SEANCES);
  const h = [];
  h.push('<div class="w" style="padding:14px 16px"><div style="display:flex;gap:7px;overflow-x:auto">'+
    toutes.map(t => '<button class="chip" data-a="seance" data-k="'+t+'" style="flex:none'+(t===k?';background:linear-gradient(142deg,var(--vio1),var(--vio2));color:#fff':'')+'">'+esc(t)+'</button>').join('')+'</div></div>');
  h.push('<div class="card v"><div class="ic">'+svg(I.halt)+'</div><div style="margin-top:12px">'+
    '<div class="eyebrow">'+esc(s.nom)+' · '+esc(s.sous)+'</div><h2>'+esc(titre(p,k))+'</h2>'+
    '<div class="sub">'+esc(s.but||'')+'</div></div></div>');
  if (p === 'firdaous' && duj) h.push(segLieu(p, ds, lieu));
  h.push('<div class="w list">');
  ex.forEach(e => {
    const f = e.fiche || {}, im = imgEx(e);
    h.push('<div class="row"><button class="th" data-a="fiche" data-k="'+esc(e.k)+'" data-c="'+e.cat+'" aria-label="Voir '+esc(f.nom||e.k)+'">'+
      (im ? '<img src="'+im+'" alt="" loading="lazy">' : svg(I.img))+'</button>'+
      '<button class="rtx" data-a="fiche" data-k="'+esc(e.k)+'" data-c="'+e.cat+'" style="background:none;border:0;text-align:left;min-height:44px">'+
      '<b>'+esc(f.nom||e.k)+'</b><i>'+esc(ligneSerie(p,e))+'</i><i class="mac">'+esc(ligneRepos(e))+'</i></button>'+
      '<button class="aide" data-a="astuce" data-k="'+esc(e.k)+'" data-c="'+e.cat+'" aria-label="Comment faire">?</button>'+
      (duj ? '<button class="tick'+(l.exos[e.k]?' on':'')+'" data-a="exo" data-k="'+esc(e.k)+'" aria-label="Cocher">'+svg(I.check)+'</button>'
           : '<span class="go">'+svg(I.chev)+'</span>')+'</div>');
  });
  h.push('</div>');
  if (duj) h.push('<button class="card '+(l.fait?'g':'b')+'" data-a="fini" style="padding:18px 22px">'+
    '<div class="eyebrow">'+(l.fait?'Bravo':'Dernière étape')+'</div><h2 style="font-size:19px">Séance terminée</h2>'+
    '<span class="check'+(l.fait?' on':'')+'" style="width:44px;height:44px;bottom:16px;right:18px">'+svg(I.check)+'</span></button>');
  $('#ec-exos').innerHTML = h.join('');
}

// --- SUIVI ---
function seriePoids(p){
  return Object.values(D.mesures).filter(m => m.p === p && m.poids).sort((a,b)=>a.d<b.d?-1:1);
}
function rSuivi(){
  const h = [], stats = {}, series = {};
  for (const p of ['mohamed','firdaous']){
    series[p] = seriePoids(p);
    const dep = poidsDepartReel(p), act = poidsActuel(p);
    stats[p] = { pr: PROF(p), dep, act, delta: act - dep };
  }
  h.push('<div class="vs">'+['mohamed','firdaous'].map((p,i)=>{ const s = stats[p];
    return '<div class="'+(i?'r':'v')+'"><i>'+esc(s.pr.prenom)+'</i><b>'+(s.delta>0?'+':'−')+kg(Math.abs(s.delta))+' kg</b>'+
      '<u>'+kg(s.dep)+' → '+kg(s.act)+' kg</u></div>'; }).join('')+'</div>');
  // Mes objectifs
  h.push('<div class="w"><div class="hrow"><div class="lab">Mes objectifs · '+esc(PROF(profil).prenom)+'</div>'+
    (chef() ? '<button class="lien" data-a="obj-edit">Modifier</button>' : '')+'</div>');
  JALONS.forEach((j, i) => { const q = projection(profil, j.mois);
    h.push('<div class="jal'+(i?'':' first')+'"><div class="hrow"><div class="jt">'+j.t+'</div><div class="jc">'+kg(q.cible)+' kg</div></div>'+
      '<div class="bar"><i style="width:'+q.pct+'%'+(profil==='firdaous'?';background:linear-gradient(90deg,var(--ros1),var(--ros2))':'')+'"></i></div>'+
      '<div class="hrow" style="margin-top:6px"><div class="mini">'+(q.fait>=0?'+':'−')+kg(Math.abs(q.fait))+' kg faits · reste '+kg(Math.abs(q.reste))+' kg</div>'+
      '<div class="mini">'+q.jours+' j</div></div>'+
      '<div class="mini" style="margin-top:3px">Rythme nécessaire ≈ '+kg(Math.abs(q.parSemaine))+' kg/semaine</div></div>'); });
  h.push('</div>');
  // courbe
  h.push('<div class="w"><div class="lab">Évolution</div>'+courbe(series)+
    '<div class="lg"><span><s style="background:var(--vio1)"></s>Mohamed</span><span><s style="background:var(--ros1)"></s>Firdaous</span></div></div>');
  // nutrition recommandée
  h.push('<div class="w"><div class="hrow"><div class="lab">Recommandations du jour</div>'+
    (chef() ? '<button class="lien" data-a="nut-edit">Modifier</button>' : '')+'</div>'+
    ['mohamed','firdaous'].map(p => { const t = tendance(p);
      return '<div class="jal"><div class="hrow"><div class="jt">'+esc(PROF(p).prenom)+'</div>'+
        '<div class="jc">'+nb(kcalCible(p))+' kcal · '+nb(protCible(p))+' g</div></div>'+
        '<div class="mini" style="margin-top:4px">Recommandé : '+nb(kcalReco(p))+' kcal · '+nb(protReco(p))+' g de protéines'+
        (manuel(p,'kcalM')||manuel(p,'protM') ? ' · réglé à la main' : '')+'</div>'+
        '<div class="mini">'+(t === null ? 'Tendance : pas encore assez de pesées (3 sur 2 semaines).'
          : 'Tendance réelle : '+(t>0?'+':'−')+kg(Math.abs(t))+' kg/semaine · visé '+(rythmeCible(p)>0?'+':'−')+kg(Math.abs(rythmeCible(p))))+'</div></div>'; }).join('')+'</div>');
  // pesée
  const r = REG(), jours = Math.round((auj() - dde(r.debut))/864e5), prochaine = (Math.floor(jours/r.cyclePesee)+1)*r.cyclePesee - jours;
  h.push('<div class="w"><div class="hrow"><div class="lab">Pesée du trimestre</div><div class="mini">dans '+prochaine+' j</div></div>'+
    '<div class="split" style="margin-top:12px">'+['mohamed','firdaous'].map(p=>'<div class="pa" style="pointer-events:none"><b>'+kg(stats[p].act)+'</b><i>'+esc(stats[p].pr.prenom)+'</i></div>').join('')+'</div>'+
    '<button class="cta gh" data-a="pesee">'+svg(I.scale)+' Entrer mon poids</button>'+
    '<button class="cta2" data-a="reglages">'+svg(I.gear)+' Réglages</button></div>');
  $('#ec-suivi').innerHTML = h.join('');
}
function courbe(series){
  const W = 300, H = 110, all = [...series.mohamed, ...series.firdaous];
  if (all.length < 2) return '<div class="chart" style="display:flex;align-items:center;justify-content:center"><div class="mini" style="text-align:center">Entre ton poids pour voir la courbe.</div></div>';
  const ds = all.map(m => dde(m.d).getTime()), t0 = Math.min(...ds), t1 = Math.max(...ds);
  const paths = ['mohamed','firdaous'].map((p,i) => {
    const s = series[p]; if (s.length < 2) return '';
    const ws = s.map(m=>m.poids), lo = Math.min(...ws), hi = Math.max(...ws), sp = (hi-lo)||1;
    const pts = s.map(m => [ t1>t0 ? (dde(m.d).getTime()-t0)/(t1-t0)*W : W/2, H-8 - (m.poids-lo)/sp*(H-22) ]);
    const dd = pts.map((q,j)=>(j?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');
    const c = i ? 'var(--ros1)' : 'var(--vio1)', last = pts[pts.length-1];
    return '<path d="'+dd+'" stroke="'+c+'" stroke-linecap="round"/><circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="5" fill="'+c+'" stroke="var(--card)" stroke-width="3"/>';
  }).join('');
  return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+paths+'</svg></div>';
}

// ===== overlay =====
function ouvrir(html){ const o = $('#ov'); $('#ovb').innerHTML = html; o.classList.add('on'); document.body.style.overflow = 'hidden'; $('#ovc').scrollTop = 0; }
function fermer(){ $('#ov').classList.remove('on'); $('#ovb').innerHTML = ''; document.body.style.overflow = ''; }
const ovh = (t, s) => '<div class="ovh"><div><h2>'+esc(t)+'</h2>'+(s?'<p>'+esc(s)+'</p>':'')+'</div><button class="x" data-a="fermer" aria-label="Fermer">'+svg(I.x)+'</button></div>';

// ===== fiches & feuilles =====
function astucePopup(c, k){
  const f = CAT(c)[k]; if (!f) return;
  const h = [ovh(f.nom, 'En deux lignes')];
  h.push('<div class="w" style="margin-bottom:12px"><p class="sect" style="margin:0">'+esc(astuce(f))+'</p></div>');
  if (f.facile) h.push('<div class="sect"><h3>Trop dur ?</h3><p>'+esc(f.facile)+'</p></div>');
  h.push('<button class="cta gh" data-a="fiche" data-k="'+esc(k)+'" data-c="'+c+'">Voir la fiche complète</button>');
  ouvrir(h.join(''));
}
function repasForm(p, ds, r){
  const e = r || { type:'Déjeuner', h: heureMaintenant(), nom:'', kcal:'', prot:'', desc:'', photo:'' };
  const h = [ovh(r ? 'Modifier le repas' : 'Ajouter un repas', dateLongue(dde(ds)))];
  if (e.photo) h.push('<div class="ph1"><img src="'+e.photo+'" alt=""></div>');
  h.push('<label class="f">Moment</label><select class="f" id="m-type">'+TYPES.map(t=>'<option'+(t===e.type?' selected':'')+'>'+t+'</option>').join('')+'</select>');
  h.push('<label class="f">Ce que tu as mangé</label><input class="f" id="m-nom" value="'+esc(e.nom)+'" placeholder="Poulet, riz, salade">');
  h.push('<div class="nums"><div style="flex:1"><label class="f">Calories</label><input class="f" type="number" inputmode="numeric" id="m-kcal" value="'+esc(e.kcal)+'"></div>'+
    '<div style="flex:1"><label class="f">Protéines (g)</label><input class="f" type="number" inputmode="numeric" id="m-prot" value="'+esc(e.prot)+'"></div></div>');
  h.push('<label class="f">Heure</label><input class="f" type="time" id="m-h" value="'+esc(e.h||heureMaintenant())+'">');
  h.push('<label class="f">Note (facultatif)</label><input class="f" id="m-desc" value="'+esc(e.desc||'')+'">');
  h.push('<button class="cta gh" data-a="repas-save" data-id="'+esc(r ? r.id : '')+'" data-p="'+p+'" data-d="'+ds+'">Enregistrer</button>');
  if (r) h.push('<button class="cta2 danger" data-a="repas-del" data-id="'+esc(r.id)+'">Supprimer ce repas</button>');
  ouvrir(h.join(''));
  window.__photo = e.photo || '';
}
function photoForm(p, ds){
  const h = [ovh('Photo du repas', 'L’IA estime, tu corriges si besoin.')];
  h.push('<input type="file" accept="image/*" capture="environment" id="m-file" hidden>');
  h.push('<button class="cta gh" data-a="photo-pick">'+svg(I.cam)+' Choisir une photo</button>');
  h.push('<div id="m-prev"></div>');
  h.push('<label class="f">Description (aide l’estimation)</label><input class="f" id="m-txt" placeholder="2 morceaux de poulet, pommes de terre, sauce, salade">');
  h.push('<button class="cta" data-a="photo-go">Estimer les calories</button>');
  h.push('<div id="m-res"></div>');
  if (!aiOk()) h.push('<div class="sect"><h3>Clé IA manquante</h3><p>Ajoute ta clé Anthropic dans Réglages pour activer l’estimation par photo. Sans clé, tu peux toujours saisir un repas à la main.</p></div>');
  ouvrir(h.join(''));
  window.__photo = '';
  const f = $('#m-file');
  if (f) f.onchange = async () => {
    const file = f.files && f.files[0]; if (!file) return;
    try { const im = await imgCompress(file); window.__photo = im.dataUrl; window.__b64 = im.b64;
      $('#m-prev').innerHTML = '<div class="ph1"><img src="'+im.dataUrl+'" alt=""></div>'; } catch(e){ toast('Photo illisible'); }
  };
}
function objForm(){
  const p = profil, o = objectifs(p), pr = PROF(p);
  const h = [ovh('Objectifs de '+pr.prenom, 'Poids visé à chaque étape')];
  h.push('<label class="f">Poids objectif final (kg)</label><input class="f" type="number" step="0.5" id="o-fin" value="'+pr.objectifPoids+'">');
  JALONS.forEach(j => h.push('<label class="f">'+j.t+' (kg)</label><input class="f" type="number" step="0.5" id="o-'+j.k+'" value="'+o[j.k]+'">'));
  h.push('<label class="f">Début du programme</label><input class="f" type="date" id="o-deb" value="'+REG().debut+'">');
  h.push('<button class="cta gh" data-a="obj-save" data-p="'+p+'">Enregistrer</button>');
  h.push('<div class="sect"><h3>Note</h3><p>Les projections et les calories se recalculent aussitôt. Tes pesées et ton historique ne sont jamais effacés.</p></div>');
  ouvrir(h.join(''));
}
function nutForm(){
  const h = [ovh('Calories et protéines', 'Vide = calcul automatique')];
  for (const p of ['mohamed','firdaous']){
    h.push('<div class="sect"><h3>'+esc(PROF(p).prenom)+'</h3><p>Recommandé : '+nb(kcalReco(p))+' kcal · '+nb(protReco(p))+' g</p></div>');
    h.push('<div class="nums"><div style="flex:1"><label class="f">Calories</label><input class="f" type="number" id="n-k-'+p+'" placeholder="'+kcalReco(p)+'" value="'+(manuel(p,'kcalM')||'')+'"></div>'+
      '<div style="flex:1"><label class="f">Protéines</label><input class="f" type="number" id="n-p-'+p+'" placeholder="'+protReco(p)+'" value="'+(manuel(p,'protM')||'')+'"></div></div>');
  }
  h.push('<button class="cta gh" data-a="nut-save">Enregistrer</button>');
  h.push('<button class="cta2" data-a="nut-auto">Tout remettre en automatique</button>');
  ouvrir(h.join(''));
}
const SHAKER_DEF = {
  mohamed: { nom:'Shaker protéiné', kcal:280, prot:34, ing:'300 ml de lait écrémé\n1 dose de whey\n1 c. à c. de cacao non sucré' },
  firdaous:{ nom:'Shaker prise de poids', kcal:550, prot:35, ing:'250 ml de lait\n1 dose de whey\n1 banane\n30 g de flocons d’avoine\n1 c. à s. de beurre de cacahuète' }
};
function shakerForm(p){
  const s = Object.assign({}, SHAKER_DEF[p], PROF(p).shaker || {});
  const h = [ovh('Shaker de '+PROF(p).prenom, 'Un seul appui pour l’ajouter chaque jour')];
  h.push('<label class="f">Nom</label><input class="f" id="k-nom" value="'+esc(s.nom)+'">');
  h.push('<label class="f">Ce que tu mets dedans</label><textarea class="f ta" id="k-ing" rows="5" placeholder="Un ingrédient par ligne">'+esc(s.ing||'')+'</textarea>');
  h.push('<div class="nums"><div style="flex:1"><label class="f">Calories</label><input class="f" type="number" inputmode="numeric" id="k-kcal" value="'+s.kcal+'"></div>'+
    '<div style="flex:1"><label class="f">Protéines (g)</label><input class="f" type="number" inputmode="numeric" id="k-prot" value="'+s.prot+'"></div></div>');
  h.push('<button class="cta gh" data-a="shaker-save" data-p="'+p+'">Enregistrer</button>');
  h.push('<div class="sect"><h3>Note</h3><p>Les calories et les protéines sont celles de ta dose habituelle. Change-les ici dès que tu changes de recette : le bouton du jour suivra.</p></div>');
  ouvrir(h.join(''));
}
function fiche(c, k){
  const f = CAT(c)[k]; if (!f) return;
  const h = [ovh(f.nom, f.zone + (f.mat ? ' · ' + f.mat : ''))];
  const ims = c === 'm' ? [[IMGM(k,'a'),'Départ'],[IMGM(k,'b'),'Arrivée']] : (f.img ? [[IMG(f.img[0]),'Départ'],[IMG(f.img[1]),'Arrivée']] : []);
  if (ims.length) h.push('<div class="ph2">'+ims.map(([src,c])=>'<figure><img src="'+src+'" alt="'+esc(f.nom+' — '+c)+'" onerror="this.closest(\'figure\').style.display=\'none\'"><figcaption>'+c+'</figcaption></figure>').join('')+'</div>');
  const S = (t, c) => c ? '<div class="sect"><h3>'+t+'</h3>'+c+'</div>' : '';
  const L = a => '<ul>'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  const O = a => '<ol>'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
  h.push(S('À quoi ça sert', f.but ? '<p>'+esc(f.but)+'</p>' : ''));
  h.push(S('Installation', f.install ? '<p>'+esc(f.install)+'</p>' : ''));
  h.push(S('Mouvement', f.etapes ? O(f.etapes) : (f.tech ? O(f.tech) : '')));
  h.push(S('Respiration', f.respiration ? '<p>'+esc(f.respiration)+'</p>' : ''));
  h.push(S('Ce que tu dois sentir', f.sensations ? '<p>'+esc(f.sensations)+'</p>' : ''));
  h.push(S('Effort', f.effort ? '<p>'+esc(f.effort)+'</p>' : ''));
  h.push(S('Erreurs à éviter', f.erreurs ? L(f.erreurs) : ''));
  h.push(S('Plus facile', f.facile ? '<p>'+esc(f.facile)+'</p>' : ''));
  h.push(S('Plus dur', (f.dur||f.progression) ? '<p>'+esc(f.dur||f.progression)+'</p>' : ''));
  h.push(S('Remplacement', f.alt ? '<p>'+esc(f.alt)+'</p>' : ''));
  h.push(S('Arrête si', f.arret ? '<p>'+esc(f.arret)+'</p>' : ''));
  ouvrir(h.join(''));
}
function pesee(){
  const h = [ovh('Ta pesée', 'Le matin, à jeun, même balance.')];
  for (const p of ['mohamed','firdaous'])
    h.push('<label class="f">'+esc(PROF(p).prenom)+' · kg</label><input class="f" type="number" inputmode="decimal" step="0.1" id="w-'+p+'" value="'+poidsActuel(p)+'">');
  h.push('<button class="cta gh" data-a="pesee-ok">Enregistrer</button>');
  ouvrir(h.join(''));
}
function reglages(){
  const r = REG();
  const h = [ovh('Réglages')];
  h.push('<button class="cta2" data-a="nut-edit">'+svg(I.fork)+' Calories et protéines</button>');
  h.push('<button class="cta2" data-a="obj-edit">'+svg(I.scale)+' Objectifs 3 / 6 / 12 mois</button>');
  h.push('<button class="cta2" data-a="shaker-edit" data-p="mohamed">'+svg(I.glass)+' Shaker de Mohamed</button>');
  h.push('<button class="cta2" data-a="shaker-edit" data-p="firdaous">'+svg(I.glass)+' Shaker de Firdaous</button>');
  h.push('<label class="f">Cardio · minutes / pente / km-h</label><div class="nums">'+
    '<input class="f" type="number" id="r-cm" value="'+r.cardio.min+'"><input class="f" type="number" id="r-cp" value="'+r.cardio.pente+'"><input class="f" type="number" step="0.5" id="r-cv" value="'+r.cardio.vit+'"></div>');
  h.push('<div class="sect"><h3>Jours par défaut</h3><p>Mohamed : '+esc(joursTexte(r.jours.mohamed))+'<br>Firdaous : '+esc(joursTexte(r.jours.firdaous))+'<br>Modifiables dans l’onglet Semaine.</p></div>');
  h.push('<label class="f">Début du programme</label><input class="f" type="date" id="r-deb" value="'+r.debut+'">');
  h.push('<label class="f">Thème</label><select class="f" id="r-th"><option value="auto">Automatique</option><option value="light">Clair</option><option value="dark">Sombre</option></select>');
  h.push('<label class="f">Clé Anthropic (photo des repas)</label><input class="f" id="r-ai" type="password" value="'+esc(CFG.aiKey||'')+'" placeholder="sk-ant-…">');
  h.push('<button class="cta gh" data-a="reg-ok">Enregistrer</button>');
  h.push('<div class="sect"><h3>Synchronisation</h3><p class="sync '+(session?'ok':'local')+'"><s></s>'+(session ? 'Connecté · '+esc(CFG.email) : (sbOk() ? 'Non connecté' : 'Supabase à configurer'))+'</p></div>');
  h.push('<label class="f">E-mail du compte partagé</label><input class="f" id="s-mail" type="email" value="'+esc(CFG.email)+'">');
  h.push('<label class="f">Mot de passe</label><input class="f" id="s-pass" type="password" autocomplete="current-password">');
  h.push('<button class="cta" data-a="sb-in">Se connecter</button>');
  if (session) h.push('<button class="cta2" data-a="sb-out">Se déconnecter</button>');
  h.push('<div class="sect"><h3>Avancé</h3></div>');
  h.push('<label class="f">URL Supabase</label><input class="f" id="s-url" value="'+esc(CFG.url)+'">');
  h.push('<label class="f">Clé publique</label><input class="f" id="s-key" value="'+esc(CFG.anonKey)+'">');
  ouvrir(h.join(''));
  const th = localStorage.getItem('bsaha.theme') || 'auto'; const sel = $('#r-th'); if (sel) sel.value = th;
}
function choixProfil(){
  const h = [ovh('Profil')];
  for (const p of ['mohamed','firdaous']) h.push('<button class="card '+(p==='mohamed'?'v':'r')+'" data-a="setp" data-p="'+p+'" style="margin-bottom:10px">'+
    '<div class="ic">'+svg(I.user)+'</div><div style="margin-top:12px"><div class="eyebrow">'+(p===profil?'Profil actif':'Basculer')+'</div>'+
    '<h2>'+esc(PROF(p).prenom)+'</h2><div class="sub">Objectif '+kg(PROF(p).objectifPoids)+' kg</div></div></button>');
  h.push('<button class="cta2" data-a="reglages">'+svg(I.gear)+' Réglages</button>');
  ouvrir(h.join(''));
}
// journée complète : entraînement, nutrition, repas, poids
function detailJour(p, ds){
  const d = dde(ds), k = seanceDuJour(p, ds ? d : d), l = log(p, ds);
  const mes = Object.values(D.mesures).find(m => m.p === p && m.d === ds);
  const h = [ovh(dateLongue(d), PROF(p).prenom)];
  if (k){ const lieu = lieuDe(p, ds), s = defSeance(p,k,lieu), ex = exosDe(p,k,lieu);
    h.push('<div class="card v" style="margin-bottom:12px"><div class="eyebrow">'+esc(s.nom)+' · '+esc(s.sous)+'</div><h2>'+esc(titre(p,k))+'</h2>'+
      '<div class="tags">'+zonesDe(p,k,lieu).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>');
    if (p === 'firdaous') h.push(segLieu(p, ds, lieu));
    h.push('<div class="w list" style="margin-bottom:12px">'+ex.map(e=>{
      const f = e.fiche||{}, im = imgEx(e);
      return '<div class="row"><button class="th" data-a="fiche" data-k="'+esc(e.k)+'" data-c="'+e.cat+'">'+(im?'<img src="'+im+'" alt="" loading="lazy">':svg(I.img))+'</button>'+
      '<button class="rtx" data-a="fiche" data-k="'+esc(e.k)+'" data-c="'+e.cat+'" style="background:none;border:0;text-align:left;min-height:44px">'+
      '<b>'+esc(f.nom||e.k)+'</b><i>'+esc(ligneSerie(p,e))+'</i><i class="mac">'+esc(ligneRepos(e))+'</i></button>'+
      '<button class="aide" data-a="astuce" data-k="'+esc(e.k)+'" data-c="'+e.cat+'" aria-label="Comment faire">?</button>'+
      '<button class="tick'+(l.exos[e.k]?' on':'')+'" data-a="exo-j" data-p="'+p+'" data-d="'+ds+'" data-k="'+esc(e.k)+'" aria-label="Cocher">'+svg(I.check)+'</button></div>'; }).join('')+'</div>');
    h.push('<button class="cta '+(l.fait?'':'gh')+'" data-a="fini-j" data-p="'+p+'" data-d="'+ds+'">'+(l.fait?'Annuler « terminée »':'Marquer terminée')+'</button>');
  } else h.push('<div class="card b" style="margin-bottom:12px"><div class="ic">'+svg(I.rest)+'</div><div style="margin-top:12px"><h2>Repos</h2><div class="sub">Marche, étirements, récupération.</div></div></div>');
  h.push(blocNutrition(p, ds, true));
  h.push(blocRepas(p, ds, true));
  if (p === 'firdaous'){ const sh = D.shaker[ds] || {};
    h.push('<div class="w"><div class="hrow"><div class="lab">Shaker</div><div class="mini">'+(sh.pris ? 'pris' : sh.pris === false ? 'pas pris' : 'non renseigné')+'</div></div></div>'); }
  if (mes) h.push('<div class="w"><div class="hrow"><div class="lab">Poids ce jour-là</div><div class="mini">'+kg(mes.poids)+' kg</div></div></div>');
  ouvrir(h.join(''));
}

// ===== actions =====
document.addEventListener('click', async ev => {
  const nb2 = ev.target.closest('nav button');
  if (nb2){ onglet = nb2.dataset.t; if (onglet !== 'exos') exoSeance = null; if (onglet !== 'semaine') edit = false; vib(8); rendre(); return; }
  const el = ev.target.closest('[data-a]'); if (!el) { if (ev.target.id === 'ov') fermer(); return; }
  const a = el.dataset.a, ds = iso(auj()), p = profil;
  if (a === 'fermer') return fermer();
  if (a === 'sh1' || a === 'sh0'){ vib(12); await store.set('shaker', ds, { pris: a === 'sh1', d: ds }); return; }
  if (a === 'cardio'){ vib(12); return majLog(p, ds, l => l.cardio = !l.cardio); }
  if (a === 'exo'){ vib(10); const k = el.dataset.k; return majLog(p, ds, l => { l.exos[k] = !l.exos[k]; }); }
  if (a === 'exo-j'){ vib(10); const pp = el.dataset.p, dd = el.dataset.d, k = el.dataset.k;
    await majLog(pp, dd, l => { l.exos[k] = !l.exos[k]; }); return detailJour(pp, dd); }
  if (a === 'fini'){ vib(20); const k = seanceDuJour(p, auj()); return majLog(p, ds, l => { l.fait = !l.fait; l.seance = k; l.lieu = lieuDe(p, ds); if (l.fait) exosDe(p, k, l.lieu).forEach(e => l.exos[e.k] = true); }); }
  if (a === 'fini-j'){ vib(20); const pp = el.dataset.p, dd = el.dataset.d; await majLog(pp, dd, l => { l.fait = !l.fait; l.seance = seanceDuJour(pp, dde(dd)); }); return fermer(); }
  if (a === 'go-exos'){ onglet = 'exos'; exoSeance = null; return rendre(); }
  if (a === 'seance'){ exoSeance = el.dataset.k; return rendre(); }
  if (a === 'fiche') return fiche(el.dataset.c || catDe(p, lieuDe(p, ds)), el.dataset.k);
  if (a === 'astuce') return astucePopup(el.dataset.c || catDe(p, lieuDe(p, ds)), el.dataset.k);
  if (a === 'sem'){ semOff += Number(el.dataset.n); return rendre(); }
  if (a === 'edit'){ edit = !edit; vib(10); return rendre(); }
  if (a === 'lieu'){ const pp = el.dataset.p, dd = el.dataset.d, ll = el.dataset.l; vib(12);
    await majLog(pp, dd, l => { if (l.lieu !== ll){ l.lieu = ll; l.exos = {}; l.fait = false; } });
    if ($('#ov').classList.contains('on')) detailJour(pp, dd); return; }
  if (a === 'togj') return basculerJour(el.dataset.p, el.dataset.d);
  if (a === 'habitude') return figerHabitude();
  if (a === 'jjour') return detailJour(el.dataset.p, el.dataset.d);
  // --- repas ---
  if (a === 'repas-new') return repasForm(p, ds, null);
  if (a === 'repas-photo') return photoForm(p, ds);
  if (a === 'photo-pick'){ const f = $('#m-file'); if (f) f.click(); return; }
  if (a === 'photo-go'){
    if (!window.__b64){ toast('Choisis d’abord une photo'); return; }
    const res = $('#m-res'); res.innerHTML = '<div class="w" style="margin-top:12px"><p class="mini">Estimation en cours…</p></div>';
    const desc = ($('#m-txt')||{}).value || '';
    try {
      const t = await askAI('Estime ce repas. Réponds UNIQUEMENT en JSON : {"nom":"…","kcal":nombre,"prot":nombre}. '+
        'kcal = calories totales de l’assiette, prot = grammes de protéines. Précision au mieux, pas de texte autour.'+
        (desc ? ' Description donnée par la personne : ' + desc : ''), [{ b64: window.__b64, type:'image/jpeg' }]);
      const j = jsonTolerant(t);
      if (!j || !j.kcal){ res.innerHTML = '<div class="w" style="margin-top:12px"><p class="mini">Estimation illisible. Saisis les valeurs à la main.</p></div>'; return; }
      window.__est = j;
      res.innerHTML = '<div class="w" style="margin-top:12px"><div class="lab">Estimation</div>'+
        '<div class="big" style="font-size:30px">'+nb(j.kcal)+' <em>kcal</em></div>'+
        '<div class="mini" style="margin-top:6px">'+nb(j.prot||0)+' g de protéines · '+esc(j.nom||'repas')+'</div>'+
        '<div class="mini" style="margin-top:8px">Estimation basée sur la photo et ta description — à ajuster si besoin.</div>'+
        '<button class="cta gh" data-a="photo-add" data-p="'+p+'" data-d="'+ds+'">Ajouter à ma journée</button>'+
        '<button class="cta2" data-a="photo-edit" data-p="'+p+'" data-d="'+ds+'">Corriger avant d’ajouter</button></div>';
    } catch(e){
      res.innerHTML = '<div class="w" style="margin-top:12px"><p class="mini">'+(e.code === 'no_key' ? 'Ajoute ta clé Anthropic dans Réglages.' : e.code === 'cle' ? 'Clé refusée.' : 'Estimation impossible pour le moment.')+'</p></div>';
    }
    return;
  }
  if (a === 'photo-add' || a === 'photo-edit'){
    const j = window.__est || {}, pp = el.dataset.p, dd = el.dataset.d;
    const r = { p:pp, d:dd, type:'Déjeuner', h:heureMaintenant(), nom:j.nom||'Repas', kcal:Math.round(j.kcal||0), prot:Math.round(j.prot||0), desc:($('#m-txt')||{}).value||'', photo: window.__photo||'' };
    if (a === 'photo-edit'){ r.id = ''; return repasForm(pp, dd, Object.assign({ id:'' }, r)); }
    await store.set('repas', rid(pp, dd), r); vib(15); fermer(); toast('Repas ajouté'); return;
  }
  if (a === 'repas-edit'){ const r = D.repas[el.dataset.id]; if (r) return repasForm(r.p, r.d, Object.assign({ id: el.dataset.id }, r)); return; }
  if (a === 'repas-save'){
    const id = el.dataset.id, pp = el.dataset.p, dd = el.dataset.d;
    const v = i => (($('#'+i)||{}).value || '');
    const r = { p:pp, d:dd, type:v('m-type'), nom:v('m-nom'), kcal:Math.round(+v('m-kcal')||0), prot:Math.round(+v('m-prot')||0), h:v('m-h'), desc:v('m-desc'), photo: window.__photo||'' };
    await store.set('repas', id || rid(pp, dd), r); fermer(); toast('Enregistré'); return;
  }
  if (a === 'repas-del'){ const id = el.dataset.id; if (id && D.repas[id]){ delete D.repas[id]; lsSauver();
      const c = getSb(); if (c && session) await c.from('bsaha_docs').delete().match({ user_id: session.user.id, coll:'repas', id });
      rendre(); } fermer(); toast('Supprimé'); return; }
  if (a === 'shaker-add'){
    const pp = el.dataset.p || p, s = PROF(pp).shaker || {};
    await store.set('repas', rid(pp, ds), { p:pp, d:ds, type:'Shaker', h:heureMaintenant(), nom:s.nom||'Shaker', kcal:+s.kcal||0, prot:+s.prot||0, desc:s.ing||'', photo:'' });
    if (pp === 'firdaous') await store.set('shaker', ds, { pris:true, d:ds });
    vib(15); toast('Shaker ajouté'); return;
  }
  if (a === 'shaker-edit') return shakerForm(el.dataset.p || p);
  if (a === 'shaker-save'){
    const pp = el.dataset.p, v = i => (($('#'+i)||{}).value || '');
    const pr = Object.assign({}, PROF(pp), { shaker:{ nom:v('k-nom'), kcal:Math.round(+v('k-kcal')||0), prot:Math.round(+v('k-prot')||0), ing:v('k-ing') } });
    await store.set('profils', pp, pr); fermer(); toast('Recette enregistrée'); return;
  }
  // --- objectifs & nutrition ---
  if (a === 'obj-edit') return objForm();
  if (a === 'obj-save'){
    const pp = el.dataset.p, g = i => parseFloat(($('#'+i)||{}).value);
    const o = {}; JALONS.forEach(j => { const x = g('o-'+j.k); if (x > 20 && x < 300) o[j.k] = x; });
    const fin = g('o-fin'), pr = Object.assign({}, PROF(pp), { obj:o });
    if (fin > 20 && fin < 300) pr.objectifPoids = fin;
    await store.set('profils', pp, pr);
    const dv = ($('#o-deb')||{}).value; if (dv){ const r = REG(); r.debut = dv; await store.set('couple','settings', r); }
    fermer(); toast('Objectifs mis à jour'); return;
  }
  if (a === 'nut-edit') return nutForm();
  if (a === 'nut-save'){
    const r = REG(); r.kcalM = Object.assign({}, r.kcalM); r.protM = Object.assign({}, r.protM);
    for (const q of ['mohamed','firdaous']){
      const k = parseFloat(($('#n-k-'+q)||{}).value), pp2 = parseFloat(($('#n-p-'+q)||{}).value);
      if (k > 800) r.kcalM[q] = Math.round(k); else delete r.kcalM[q];
      if (pp2 > 30) r.protM[q] = Math.round(pp2); else delete r.protM[q];
    }
    await store.set('couple','settings', r); fermer(); toast('Enregistré'); return;
  }
  if (a === 'nut-auto'){ const r = REG(); r.kcalM = {}; r.protM = {}; await store.set('couple','settings', r); fermer(); toast('Calcul automatique rétabli'); return; }
  if (a === 'pesee') return pesee();
  if (a === 'pesee-ok'){
    const d = iso(auj());
    for (const q of ['mohamed','firdaous']){ const v = parseFloat(($('#w-'+q)||{}).value); if (v > 20 && v < 300) await store.set('mesures', q+'_'+d, { p:q, d, poids:v }); }
    fermer(); toast('Pesée enregistrée'); return;
  }
  if (a === 'reglages') return reglages();
  if (a === 'reg-ok'){
    const r = REG(), g = i => parseFloat(($('#'+i)||{}).value);
    r.cardio = { min: g('r-cm')||30, pente: g('r-cp')||10, vit: g('r-cv')||5.5 };
    const dv = ($('#r-deb')||{}).value; if (dv) r.debut = dv;
    const th = ($('#r-th')||{}).value || 'auto'; localStorage.setItem('bsaha.theme', th); appliqueTheme();
    const ai = ($('#r-ai')||{}).value; if (ai !== undefined) { CFG.aiKey = ai.trim(); cfgSave(); }
    const su = ($('#s-url')||{}).value, sk = ($('#s-key')||{}).value;
    if (su && sk){ CFG.url = su.trim(); CFG.anonKey = sk.trim(); cfgSave(); }
    await store.set('couple', 'settings', r); fermer(); toast('Enregistré'); return;
  }
  if (a === 'setp'){ profil = el.dataset.p; edit = false; try { localStorage.setItem('bsaha.profil', profil); } catch(e){} fermer(); return rendre(); }
  if (a === 'sb-in' || a === 'sb-up'){
    const ok = await connexion(($('#s-mail')||{}).value.trim(), ($('#s-pass')||{}).value, a === 'sb-up');
    if (ok){ subRT(); fermer(); rendre(); } return;
  }
  if (a === 'sb-out'){ await deconnexion(); fermer(); return; }
});
$('#b-profil').addEventListener('click', choixProfil);
$('#b-streak').addEventListener('click', () => toast(streak(profil) + ' jour' + (streak(profil)>1?'s':'') + ' d’affilée — continue !'));
$('#ov').addEventListener('click', e => { if (e.target.id === 'ov') fermer(); });

function appliqueTheme(){ const t = localStorage.getItem('bsaha.theme') || 'auto'; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

// ===== démarrage =====
(async function init(){
  appliqueTheme();
  lsCharger();
  try {
    const v1 = JSON.parse(localStorage.getItem('bsaha.v1') || 'null');
    if (v1 && !D.couple.settings){
      for (const [id, l] of Object.entries(v1.logs || {})){
        if (!l.profil || l.seance === 'cardio') continue;
        D.logs[l.profil + '_' + l.date] = { p:l.profil, d:l.date, seance:l.seance, exos:{}, cardio:false, repas:{}, fait:['complete','adaptee','partielle'].includes(l.statut) };
      }
      for (const [d, s] of Object.entries(v1.shaker || {})) D.shaker[d] = { pris: !!s.pris, d };
      for (const [id, m] of Object.entries(v1.mesures || {})) if (m.poids) D.mesures[id] = { p:m.profil, d:m.date, poids:m.poids };
      if (v1.profils) for (const p of ['mohamed','firdaous']) if (v1.profils[p]) D.profils[p] = Object.assign({}, PROFILS_DEFAUT[p], v1.profils[p]);
      const r = REG_DEF(); if (v1.couple?.settings?.debut) r.debut = v1.couple.settings.debut;
      D.couple.settings = r; lsSauver();
    }
  } catch(e){ console.warn(e); }
  const c = getSb();
  if (c){
    try { const r = await c.auth.getSession(); session = r.data.session; } catch(e){ session = null; }
    if (session){ await pullAll(); subRT(); }
    c.auth.onAuthStateChange((_e, s) => { session = s; if (s){ pullAll(); subRT(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && session) pullAll(); });
  }
  for (const p of ['mohamed','firdaous']) if (!D.profils[p]) D.profils[p] = PROFILS_DEFAUT[p];
  if (!D.couple.settings) D.couple.settings = REG_DEF();
  // v3 -> v4 : les anciennes calories fixes deviennent un réglage manuel, rien n'est perdu
  const r4 = D.couple.settings;
  if (!r4.v4){ r4.v4 = true; if (r4.kcal && !r4.kcalM) r4.kcalM = Object.assign({}, r4.kcal); }
  for (const q of ['mohamed','firdaous']) if (!(D.profils[q]||{}).shaker)
    D.profils[q] = Object.assign({}, D.profils[q], { shaker: Object.assign({}, SHAKER_DEF[q]) });
  lsSauver();
  pret = true; rendre();
  if (session){ await store.set('couple','settings', REG());
    for (const q of ['mohamed','firdaous']) await store.set('profils', q, D.profils[q]); }
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch(e){} }
})();
