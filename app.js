// ===== Couche de stockage : Supabase (compte partagé) ou repli local =====
const COLLS = ['couple','profils','semaines','logs','mesures','shaker','courses','repas','coach','photos','bilans','checkins'];
const D = Object.fromEntries(COLLS.map(c => [c, {}]));
let sb = null, session = null, modeStockage = 'local', pret = false, rtChannel = null;
const LS_CLE = 'bsaha.v1', LS_CFG = 'bsaha.cfg';
const CFG = (() => { try { return Object.assign({ url: '', anonKey: '', aiKey: '', aiModel: 'claude-sonnet-4-5', email: '' }, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch(e){ return { url: '', anonKey: '', aiKey: '', aiModel: 'claude-sonnet-4-5', email: '' }; } })();
function cfgSave(){ try { localStorage.setItem(LS_CFG, JSON.stringify(CFG)); } catch(e){} }
function lsCharger(){ try { const r = localStorage.getItem(LS_CLE); if (r) { const o = JSON.parse(r); COLLS.forEach(c => D[c] = o[c] || {}); } } catch(e){} }
function lsSauver(){ try { localStorage.setItem(LS_CLE, JSON.stringify(D)); } catch(e){} }
function pref(){ try { return localStorage.getItem('bsaha.profil') || 'mohamed'; } catch(e){ return 'mohamed'; } }
function sbConfigured(){ return !!(CFG.url && CFG.anonKey && window.supabase); }
function getSb(){ if (!sbConfigured()) return null; if (!sb) { try { sb = window.supabase.createClient(CFG.url, CFG.anonKey); } catch(e){ return null; } } return sb; }
const pendingWrites = {};
const store = {
  async set(coll, id, data){ D[coll][id] = JSON.parse(JSON.stringify(data)); lsSauver(); rendre();
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
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const JOURS_C = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const iso = d => { const z = new Date(d); return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0'); };
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addJ = (d, n) => { const z = fromIso(iso(d)); z.setDate(z.getDate()+n); return z; };
const lundiDe = d => { const z = fromIso(iso(d)); const wd = (z.getDay()+6)%7; z.setDate(z.getDate()-wd); return z; };
const diffJ = (a, b) => Math.round((fromIso(iso(a)) - fromIso(iso(b))) / 86400000);
const auj = () => new Date();
const fmtLong = d => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
const fmtCourt = d => `${d.getDate()} ${MOIS[d.getMonth()].slice(0,4)}${MOIS[d.getMonth()].length>4?'.':''}`;
const r1 = x => Math.round(x*10)/10;
const COUL = { sauge:'sauge', rose:'rose', terracotta:'terracotta', sable:'sable' };
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), 2600); }

// ===== Domaine =====
const P = () => D.profils[profilActif] || PROFILS_DEFAUT[profilActif];
const couple = () => D.couple.settings || { debut: iso(lundiDe(auj())), seances: 4, jours: [1,2,4,6], cardio: 'jours-off', menuDecalage: 0 };
function semaineNum(d){ return Math.floor(diffJ(lundiDe(d), lundiDe(fromIso(couple().debut))) / 7) + 1; }
function planSemaine(lundiIso){
  const c = couple(); const s = D.semaines[lundiIso];
  const base = { lundi: lundiIso, seances: c.seances, jours: c.jours, difficulte: { mohamed: (D.profils.mohamed||PROFILS_DEFAUT.mohamed).difficulteDefaut, firdaous: (D.profils.firdaous||PROFILS_DEFAUT.firdaous).difficulteDefaut }, duree: { mohamed: (D.profils.mohamed||PROFILS_DEFAUT.mohamed).dureeDefaut, firdaous: (D.profils.firdaous||PROFILS_DEFAUT.firdaous).dureeDefaut }, indispo: { mohamed: [], firdaous: [] }, deplacements: { mohamed: {}, firdaous: {} }, cardio: c.cardio, modifs: [], valide: false };
  if (!s) return base;
  return { ...base, ...s, difficulte: { ...base.difficulte, ...(s.difficulte||{}) }, duree: { ...base.duree, ...(s.duree||{}) }, indispo: { mohamed: [], firdaous: [], ...(s.indispo||{}) }, deplacements: { mohamed: {}, firdaous: {}, ...(s.deplacements||{}) } };
}
// Séance d'un profil un jour donné → {key, plan, origine}
function seanceDu(profil, d){
  const k = iso(d); const lundi = iso(lundiDe(d)); const plan = planSemaine(lundi); const w = semaineNum(d);
  if (w < 1 || diffJ(d, fromIso(couple().debut)) < 0) return null;
  const dep = plan.deplacements[profil] || {};
  // séance déplacée vers ce jour ?
  const versIci = Object.entries(dep).find(([from, to]) => to === k);
  if (versIci) { const s = seanceNaturelle(profil, fromIso(versIci[0]), plan, w); return s ? { ...s, deplaceeDe: versIci[0] } : null; }
  if (dep[k]) return null; // déplacée ailleurs
  if ((plan.indispo[profil] || []).includes(k)) return null;
  return seanceNaturelle(profil, d, plan, w);
}
function seanceNaturelle(profil, d, plan, w){
  const js = [...plan.jours].sort((a,b) => ((a+6)%7) - ((b+6)%7)); const i = js.indexOf(d.getDay()); if (i < 0) return null;
  const n = plan.seances >= 4 ? 4 : 3; if (i >= n) return null;
  if (profil === 'mohamed') { const rot = ROTATION_M[n]; const idx = n === 3 ? ((w-1)*3 + i) % rot.length : i; return { key: rot[idx], plan, profil }; }
  const rot = ROTATION_F[n]; return { key: rot[i], plan, profil };
}
function statutDu(profil, d){ const log = D.logs[profil+'_'+iso(d)]; const s = seanceDu(profil, d); if (log && ['complete','adaptee','partielle'].includes(log.statut)) return log.statut === 'complete' ? 'terminée' : log.statut === 'adaptee' ? 'adaptée' : 'partielle'; if (!s) return null; if (log && log.statut === 'commencee') return 'commencée'; if (diffJ(d, auj()) < 0) return 'non renseignée'; return 'prévue'; }
// Contenu d'une séance selon niveau/durée
function contenuSeance(profil, d, opts={}){
  const s = seanceDu(profil, d); if (!s) return null;
  const plan = s.plan; const niveau = opts.niveau || plan.difficulte[profil] || 'moyen'; const series = SERIES_PAR_NIVEAU[niveau]; const dureeDispo = opts.duree || plan.duree[profil];
  const w = Math.max(1, semaineNum(d)); const notes = [];
  let base, exos;
  if (profil === 'mohamed') {
    base = SEANCES_M[s.key];
    exos = base.exos.map(e => { const ex = EXOS_M[e.k]; const gain = ex.type === 'gainage'; return { k: e.k, nom: ex.nom, series: gain ? 2 : series, reps: ex.reps, repos: ex.repos, unilateral: !!ex.unilateral, gainage: gain, prioritaire: base.prioritaires.includes(e.k), mat: ex.mat }; });
    if (w <= 2) { notes.push('Semaines 1–2 : apprentissage des charges, garde 3 reps en réserve.'); }
    notes.push('Règle appliquée : ' + NIVEAU_LABEL[niveau] + ' de travail par exercice. Gainage : 2 séries (hors règle).');
  } else {
    base = SEANCES[s.key];
    exos = base.exos.map(e => { let k = e.k; if (w >= 7 && P_of('firdaous').materiel?.haltere !== false && HALTERE_SWAP[k] && s.key !== 'D') k = HALTERE_SWAP[k]; const ex = EXOS[k]; return { k, nom: ex.nom, series: s.key === 'D' ? Math.min(series, 2) : series, reps: e.reps.replace(/\s*\(.*\)/, ''), repos: e.repos, unilateral: !!e.parCote, prioritaire: base.court.includes(e.k), mat: ex.mat }; });
    notes.push('Règle appliquée : ' + NIVEAU_LABEL[niveau] + ' de travail par exercice' + (s.key === 'D' ? ' (séance douce : 2 maximum)' : '') + '.');
    if (w >= 7) notes.push('Dès la semaine 7 : versions haltère (pont, squat goblet).');
  }
  const estime = ex => { const warm = profil === 'mohamed' ? 8 : 5; let sec = warm*60 + 120; ex.forEach(e => { const r = parseInt(e.reps,10) || 10; const cotes = e.unilateral ? 2 : 1; const parRep = profil === 'mohamed' ? 3.5 : 4; sec += e.series * (r * parRep * cotes + e.repos) + 40; }); return Math.round(sec/60); };
  let duree = estime(exos); let raccourci = false;
  if (opts.court || (dureeDispo && duree > dureeDispo + 5)) {
    raccourci = true;
    exos = exos.filter(e => e.prioritaire).map(e => ({ ...e, series: Math.min(e.series, 2), repos: Math.min(e.repos, 60) }));
    duree = estime(exos);
    notes.push(`Mode raccourci (${dureeDispo || opts.duree} min dispo) : exercices prioritaires seulement, 2 séries, repos ≤ 60 s. Les charges et répétitions ne changent pas.`);
  }
  return { key: s.key, nom: base.nom, sous: base.sous, couleur: base.couleur, but: base.but, echauffement: profil === 'mohamed' ? base.echauffement : ECHAUFFEMENT.map(x => x.nom + ' — ' + x.duree), exos, niveau, series, duree, notes, raccourci, semaine: w, deplaceeDe: s.deplaceeDe };
}
function P_of(p){ return D.profils[p] || PROFILS_DEFAUT[p]; }
function exoInfo(profil, k){ return profil === 'mohamed' ? EXOS_M[k] : EXOS[k]; }
const IMG = new Proxy({}, { get: (_, k) => 'assets/ex/f_' + k + '.jpg' });
const imgM = (k, ab) => 'assets/ex/m_' + k + '_' + ab + '.jpg';
function cardioDuJour(d){ const c = couple(); const p = planSemaine(iso(lundiDe(d))); const w = Math.max(1, Math.min(12, semaineNum(d))); const pal = CARDIO_M.find(x => x.sem.includes(w)) || CARDIO_M[CARDIO_M.length-1]; const s = seanceDu('mohamed', d); const veille = seanceDu('mohamed', addJ(d,-1)); const lendemain = seanceDu('mohamed', addJ(d,1)); const jambesVeille = veille && veille.key.startsWith('B'); const jambesDemain = lendemain && lendemain.key.startsWith('B');
  if (p.cardio === 'jours-off' && s) return null; if (p.cardio === 'apres' && !s) return null; if (p.cardio === 'aucun') return null; if (semaineNum(d) < 1) return null;
  let txt = pal.seance; let note = ''; if (jambesVeille) { txt = 'Marche 25 min ou piscine 20 min (lendemain d\'une séance jambes).'; note = 'allégé'; } else if (jambesDemain && p.difficulte.mohamed === 'difficile') { note = 'facile : jambes demain'; }
  if (p.difficulte.mohamed === 'difficile' && !note) note = 'intensité facile (semaine difficile en muscu)';
  return { titre: pal.titre, txt, note, semaine: w };
}
// Dernière performance comparable (même séance, même exo)
function dernierePerf(profil, key, k, avantDate){ const ls = Object.values(D.logs).filter(l => l.profil === profil && l.seance === key && l.date < avantDate && l.exos && l.exos[k] && l.exos[k].sets && l.exos[k].sets.some(s => s.done)).sort((a,b) => b.date.localeCompare(a.date)); return ls[0] ? { date: ls[0].date, sets: ls[0].exos[k].sets } : null; }
function cibleDuJour(profil, k, perf, repsPlage){ if (!perf) return 'Trouve une charge/variante qui laisse 2–3 reps en réserve ; note-la.'; const ex = exoInfo(profil, k); const faits = perf.sets.filter(s => s.done); const maxRep = parseInt(String(repsPlage).split('–')[1] || repsPlage, 10); const minReps = Math.min(...faits.map(s => +s.reps || 0)); const charge = faits[0]?.charge; if (!isNaN(maxRep) && minReps >= maxRep) return charge ? `Toutes les séries à ${maxRep}+ : monte la charge (${ex.dur || '+ un cran'}).` : `Toutes les séries à ${maxRep}+ : passe à la progression (${ex.dur || 'variante plus dure'}).`; return `Même charge/variante que le ${fmtCourt(fromIso(perf.date))} (${faits.map(s => s.reps + (s.charge ? '×'+s.charge : '')).join(' / ')}), vise +1 rep sur la série la plus faible.`; }

// ===== Nutrition =====
function bmr(p){ const w = poidsActuel(p.id) || p.poidsDepart; return p.sexe === 'H' ? 10*w + 6.25*p.taille - 5*p.age + 5 : 10*w + 6.25*p.taille - 5*p.age - 161; }
function maintien(p){ return Math.round(bmr(p) * p.activite); }
function poidsActuel(profil){ const m = Object.values(D.mesures).filter(x => x.profil === profil && x.poids).sort((a,b) => b.date.localeCompare(a.date)); return m[0]?.poids || null; }
function menuDuJour(d){ const c = couple(); const n = ((semaineNum(d)-1)*7 + (d.getDay()+6)%7 + (c.menuDecalage||0)); const idx = ((n % 14) + 14) % 14; const base = ROTATION_REPAS[idx]; const k = iso(d); const sw = D.repas[k] || {}; return { matin: sw.matin || base.matin, midiF: sw.midiF || base.midiF, soir: sw.soir || base.soir, idx, swaps: sw }; }
function recetteDe(nom){ const n = nom.replace(/^Restes\s*:\s*/, ''); return RECETTES[n] ? { nom: n, ...RECETTES[n], restes: nom.startsWith('Restes') } : null; }
function kcalRepas(profil, nom, facteur){ const r = recetteDe(nom); if (!r) return { kcal: 0, prot: 0 }; const f = facteur ?? FACTEUR_PORTION[profil]; return { kcal: Math.round(r.kcal * f), prot: Math.round(r.prot * f) }; }
function planJour(profil, d){ const m = menuDuJour(d); const p = P_of(profil); if (profil === 'mohamed') { const a = kcalRepas('mohamed', m.matin), b = kcalRepas('mohamed', m.soir); return { repas: [['Matin (avant 10 h)', m.matin, a], ['Soir (avant 18–19 h)', m.soir, b]], total: a.kcal + b.kcal, prot: a.prot + b.prot }; } const a = kcalRepas('firdaous', m.matin), b = kcalRepas('firdaous', m.midiF), c = kcalRepas('firdaous', m.soir); const sh = D.shaker[iso(d)]; const shK = sh ? (sh.portion === 'petite' ? { kcal: 450, prot: 30 } : { kcal: 650, prot: 38 }) : { kcal: 650, prot: 38 }; return { repas: [['Matin', m.matin, a], ['Midi', m.midiF, b], ['Soir', m.soir, c], ['Shaker', 'Shaker de Firdaous (600–700 kcal)', shK]], total: a.kcal + b.kcal + c.kcal + shK.kcal, prot: a.prot + b.prot + c.prot + shK.prot, shakerPris: !!sh?.pris }; }
function listeCourses(lundiIso){ const agg = {}; for (let i = 0; i < 7; i++) { const d = addJ(fromIso(lundiIso), i); const m = menuDuJour(d); const items = [[m.matin, FACTEUR_PORTION.mohamed + FACTEUR_PORTION.firdaous], [m.soir, FACTEUR_PORTION.mohamed + FACTEUR_PORTION.firdaous + (m.midiF.startsWith('Restes') ? FACTEUR_PORTION.firdaous : 0)], [m.midiF.startsWith('Restes') ? null : m.midiF, FACTEUR_PORTION.firdaous], ['Shaker de Firdaous (600–700 kcal)', 1]]; items.forEach(([nom, f]) => { if (!nom) return; const r = recetteDe(nom); if (!r) return; r.ing.forEach(([n, q, u, ray]) => { const key = n + '|' + u; if (!agg[key]) agg[key] = { nom: n, q: 0, u, rayon: ray }; agg[key].q += q * f; }); }); }
  const extras = (D.courses.actuelle?.extras || []).map(e => ({ nom: e, q: null, u: '', rayon: 'Autres' }));
  return [...Object.values(agg), ...extras]; }
function fmtQ(q, u){ if (q == null) return ''; if (u === 'pièce') return Math.ceil(q) + (Math.ceil(q) > 1 ? ' pièces' : ' pièce'); if (u === 'gousse') return Math.ceil(q) + ' gousse(s)'; if (u === 'g' && q >= 1000) return r1(q/1000) + ' kg'; if (u === 'ml' && q >= 1000) return r1(q/1000) + ' L'; return Math.round(q) + ' ' + u; }

// ===== État UI =====
let profilActif = pref(); let onglet = 'aujourdhui'; let semaineVue = 0; let jourSel = null; let menuJourVue = 0;
function setProfil(p){ profilActif = p; try { localStorage.setItem('bsaha.profil', p); } catch(e){} document.documentElement.dataset.profil = p; $$('.profil-switch button').forEach(b => b.classList.toggle('on', b.dataset.profil === p)); rendre(); }
function afficherOnglet(t){ onglet = t; $$('nav.tabs button').forEach(b => b.classList.toggle('actif', b.dataset.tab === t)); $$('.ecran').forEach(e => e.hidden = e.id !== 'ecran-'+t); rendre(); window.scrollTo({top:0}); }
function rendre(){ if (!pret) return; try { ({aujourdhui: rAuj, semaine: rSem, exos: rExos, repas: rRepas, progres: rProg, coach: rCoach})[onglet](); } catch(e){ console.error(e); } if (overlayRefaire && !$('#overlay').hidden) { /* les overlays se rafraîchissent eux-mêmes */ } }

// ===== Écran Aujourd'hui =====
function carteSeance(profil, d, c, statut){
  return `<div class="carte accent">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="pastille p-${c.couleur}">${esc(c.nom)} · ${esc(c.sous)}</span>${statut ? `<span class="pastille ${['terminée','adaptée'].includes(statut)?'p-ok':statut==='partielle'?'p-att':statut==='non renseignée'?'p-neutre':'p-accent'}">${esc(statut)}</span>`:''}</div>
    <h2>${esc(c.but)}</h2>
    <div class="grille2"><div><div class="etiquette">Niveau · séries</div><div>${esc(NIVEAU_LABEL[c.niveau])}</div></div><div><div class="etiquette">Durée estimée</div><div>≈ ${c.duree} min${c.raccourci?' · raccourci':''}</div></div></div>
    <div class="muted">${c.exos.length} exercices · ${esc(c.sous)}${c.deplaceeDe ? ' · déplacée depuis le '+fmtCourt(fromIso(c.deplaceeDe)) : ''}</div>
    ${['terminée','adaptée','partielle'].includes(statut) ? `<button class="btn sec" data-act="voir" data-p="${profil}" data-date="${iso(d)}">Revoir la séance</button>`
      : `<button class="btn" data-act="commencer" data-p="${profil}" data-date="${iso(d)}">${statut==='commencée'?'Reprendre':'C\'est parti'}</button>
         <div class="ligne-btns"><button class="btn sec petit" data-act="voir" data-p="${profil}" data-date="${iso(d)}">Voir les exercices</button><button class="btn sec petit" data-act="deplacer" data-p="${profil}" data-date="${iso(d)}">Déplacer</button><button class="btn sec petit" data-act="checkin" data-p="${profil}" data-date="${iso(d)}">Je me sens…</button></div>`}
  </div>`;
}
function rAuj(){
  const d = auj(); const p = P(); const w = semaineNum(d); const c = contenuSeance(profilActif, d); const st = statutDu(profilActif, d); const h = d.getHours();
  const plan = planSemaine(iso(lundiDe(d))); const pj = planJour(profilActif, d); const cardio = profilActif === 'mohamed' ? cardioDuJour(d) : null;
  const etat = c ? c.nom : cardio ? 'Cardio' : 'Repos';
  let html = `<div class="hero"><div class="date">${fmtLong(d)} · semaine ${w >= 1 ? w : '—'}</div><div class="gros">${h<18?'Salut':'Bonsoir'} ${esc(p.prenom)},<br>${c ? (['terminée','adaptée','partielle'].includes(st) ? 'c\'est fait.' : `${esc(etat)} aujourd'hui.`) : cardio ? 'cardio aujourd\'hui.' : 'repos aujourd\'hui.'}</div></div>`;
  if (c) html += carteSeance(profilActif, d, c, st);
  else { const prochain = [1,2,3,4,5,6,7].map(n => addJ(d,n)).find(x => seanceDu(profilActif, x));
    html += `<div class="carte accent">${cardio ? `<span class="pastille">Cardio · ${esc(cardio.titre)}</span><h2>${esc(cardio.txt)}</h2>${cardio.note?`<span class="pastille">${esc(cardio.note)}</span>`:''}<button class="btn" data-act="cardio-fait" data-date="${iso(d)}">${D.logs['mohamed_cardio_'+iso(d)]?'✓ Cardio fait':'Cardio fait'}</button>` : `<span class="pastille">Repos</span><h2>Récupérer, c'est aussi le plan.</h2><p class="muted">Marche, étirements, ou rien du tout.</p>`}${prochain ? `<p class="muted small">Prochaine séance : <strong>${fmtLong(prochain).toLowerCase()}</strong>.</p>`:''}</div>`; }
  if (profilActif === 'mohamed' && c && cardio) html += `<div class="carte"><div class="etiquette">Après la séance</div><p>${esc(cardio.txt)}</p></div>`;
  if (!plan.valide && profilActif === 'mohamed' && w >= 1) html += `<button class="bandeau" data-act="preparer" data-lundi="${iso(lundiDe(d))}" style="text-align:left"><strong>Semaine pas encore préparée</strong> → réglages par défaut (${plan.seances} séances, toi ${plan.difficulte.mohamed}, Firdaous ${plan.difficulte.firdaous}). Touche pour préparer.</button>`;
  // Repas
  const pct = Math.min(100, Math.round(pj.total / p.kcalCible * 100));
  html += `<div class="carte"><div class="etiquette" style="display:flex;justify-content:space-between"><span>Mes repas</span><span>${pj.total} / ${p.kcalCible} kcal</span></div><div class="kcal-bar" style="background:var(--ligne)"><i style="width:${pct}%;background:var(--accent)"></i></div>
    <div class="repas">${pj.repas.map(([k,v,n]) => `<div><span class="k"><span>${k}</span><span>${n.kcal} kcal</span></span>${k==='Shaker' ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><button class="nom" data-act="recette" data-nom="${esc(v)}">${esc(v.replace(/ \(.*\)/,''))}</button><button class="btn ${pj.shakerPris?'sec':'lime'} petit" data-act="shaker" data-date="${iso(d)}">${pj.shakerPris?'✓ pris':'Pris'}</button></div>` : `<button class="nom" data-act="recette" data-nom="${esc(v)}">${esc(v)}</button>`}</div>`).join('')}</div>
    <div class="ligne-btns"><button class="btn sec petit" data-act="tab" data-tab="repas">Courses & semaine</button><button class="btn sec petit" data-act="raccourci" data-r="autre">Autre repas</button></div></div>`;
  const derniere = Object.values(D.mesures).filter(m => m.profil === profilActif && m.poids).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if (!derniere || diffJ(d, fromIso(derniere.date)) >= 14) html += `<div class="carte ink"><div class="etiquette">Pesée des 14 jours</div><h2>${derniere ? 'Ça fait ' + diffJ(d, fromIso(derniere.date)) + ' jours.' : 'Première pesée.'}</h2><p class="muted small">Le matin, à jeun, mêmes conditions.</p><div class="ligne-btns"><input type="number" id="poidsAuj" step="0.1" placeholder="kg" style="max-width:110px;background:var(--ink2);color:var(--fond);border-color:transparent" aria-label="Poids"><button class="btn petit" data-act="poids-add">Enregistrer</button></div></div>`;
  html += `<div class="ligne-btns"><button class="btn sec" data-act="progres">Mes progrès & bilans</button></div>`;
  $('#ecran-aujourdhui').innerHTML = html;
}

// ===== Écran Semaine =====
function rSem(){
  const base = addJ(lundiDe(auj()), semaineVue*7); const lundi = iso(base); const w = semaineNum(base); const plan = planSemaine(lundi);
  let html = `<div class="nav-sem"><button class="icone" data-act="sem" data-n="-1" aria-label="Semaine précédente">‹</button><div style="text-align:center"><h2>Semaine ${w >= 1 ? w : '—'}</h2><div class="muted">${fmtCourt(base)} – ${fmtCourt(addJ(base,6))}${semaineVue===0?' · cette semaine':''}</div></div><button class="icone" data-act="sem" data-n="1" aria-label="Semaine suivante">›</button></div>`;
  html += `<div class="carte" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span class="pastille ${plan.valide?'p-ok':'p-neutre'}">${plan.valide?'Semaine préparée':'Réglages par défaut'}</span><span class="muted small">${plan.seances} séances · Mohamed ${plan.difficulte.mohamed} · Firdaous ${plan.difficulte.firdaous}</span></div>${profilActif==='mohamed' ? `<button class="btn petit" data-act="preparer" data-lundi="${lundi}">Je prépare notre semaine</button>` : `<p class="muted small">C'est Mohamed qui prépare la semaine. Tu peux déplacer ou alléger tes séances ici.</p>`}</div>`;
  const lettres = ['mohamed','firdaous'];
  html += `<div class="semaine">` + [0,1,2,3,4,5,6].map(i => { const d = addJ(base, i); const k = iso(d);
    const dots = lettres.map(pr => { const s = seanceDu(pr, d); const st = statutDu(pr, d); if (!s) return `<span class="point" style="opacity:.25">·</span>`; const c = pr==='mohamed' ? SEANCES_M[s.key] : SEANCES[s.key]; const done = ['terminée','adaptée','partielle'].includes(st); return `<span class="point p-${pr==='mohamed'?'bleu':'terracotta'}" title="${pr}">${done?'✓ ':''}${s.key}</span>`; }).join('');
    return `<button class="jour ${diffJ(d,auj())===0?'auj':''} ${jourSel===k?'sel':''}" data-act="jour" data-date="${k}"><span class="nom">${JOURS_C[d.getDay()]}</span><span class="num">${d.getDate()}</span>${dots}</button>`; }).join('') + `</div><p class="muted small" style="text-align:center">Lime = Mohamed · Corail = Firdaous · ✓ = faite</p>`;
  const dsel = jourSel ? fromIso(jourSel) : null;
  if (dsel && diffJ(dsel, base) >= 0 && diffJ(dsel, base) <= 6) {
    html += `<div class="etiquette">${fmtLong(dsel)}</div>`;
    for (const pr of [profilActif, profilActif==='mohamed'?'firdaous':'mohamed']) { const c = contenuSeance(pr, dsel); const st = statutDu(pr, dsel); html += `<div class="etiquette" style="color:var(--${pr==='mohamed'?'bleu':'terra'})">${P_of(pr).prenom}</div>`; if (c) html += pr === profilActif ? carteSeance(pr, dsel, c, st) : `<div class="carte"><span class="pastille p-${c.couleur}">${esc(c.nom)} · ${esc(c.sous)}</span><p class="muted">${esc(NIVEAU_LABEL[c.niveau])} · ≈ ${c.duree} min${st?' · '+st:''}</p></div>`; else { const cardio = pr==='mohamed' ? cardioDuJour(dsel) : null; html += `<div class="carte"><span class="pastille p-sable">${cardio?'Cardio':'Repos'}</span>${cardio?`<p class="small">${esc(cardio.txt)}</p>`:''}</div>`; } }
  } else html += `<p class="muted" style="text-align:center">Touche un jour pour le détail.</p>`;
  if (plan.modifs && plan.modifs.length) html += `<details><summary>Modifications de la semaine (${plan.modifs.length})</summary><div class="log">${plan.modifs.slice().reverse().map(m => `<div><span>${esc(m.t)}</span><span class="muted">${esc(m.q)}</span></div>`).join('')}</div></details>`;
  if (profilActif === 'mohamed') html += `<details><summary>Mon cardio : progression et règles</summary><div class="log">${CARDIO_M.map(c => `<div><span><strong>S${c.sem.join('–')}</strong> · ${esc(c.titre)}</span><span class="muted" style="text-align:right">${esc(c.seance)}</span></div>`).join('')}</div><ul style="margin-top:8px">${CARDIO_REGLES.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`;
  html += `<details><summary>Comment progresser (règle mesurable)</summary><p><strong>Répétitions en réserve (RIR)</strong> : à la fin d'une série, combien tu aurais encore pu en faire. On vise 2 (jamais 0 systématiquement).</p><p><strong>Surcharge progressive</strong> : quand toutes les séries de travail atteignent le haut de la fourchette avec 2 RIR, deux séances de suite → on monte d'un cran (charge, assistance réduite, ou variante). Sinon on garde. Une séance ratée = on garde. Deux séances ratées = on descend d'un cran ou on passe la semaine suivante en niveau inférieur.</p><p class="muted">Les courbatures ne sont pas l'objectif ; un stimulus suffisant et une récupération correcte le sont.</p></details>`;
  $('#ecran-semaine').innerHTML = html;
}

// Préparer la semaine (Mohamed)
function ouvrirPreparer(lundi){
  const plan = JSON.parse(JSON.stringify(planSemaine(lundi))); const base = fromIso(lundi);
  const draw = () => {
    const apercu = pr => { const jours = [0,1,2,3,4,5,6].map(i => addJ(base,i)); let n = 0, min = 0; const rows = jours.map(d => { const tmp = D.semaines[lundi]; D.semaines[lundi] = plan; const c = contenuSeance(pr, d); if (tmp) D.semaines[lundi] = tmp; else delete D.semaines[lundi]; if (!c) return null; n++; min += c.duree; return `${JOURS_C[d.getDay()]} ${c.nom} (${c.series} séries, ≈ ${c.duree} min)`; }).filter(Boolean); return `<div class="bloc"><h3>${P_of(pr).prenom} — ${n} séance${n>1?'s':''}, ${NIVEAU_LABEL[plan.difficulte[pr]]}</h3><p class="small">${rows.join(' · ') || 'aucune séance'}</p><p class="muted small">Total ≈ ${min} min</p></div>`; };
    ouvrir(btnRetour() + `<h1>Je prépare notre semaine</h1><div class="muted">Semaine du ${fmtLong(base).toLowerCase()}</div>
    <div class="carte"><div class="champ"><label>Nombre de séances pour le couple</label><div class="choix" data-opt="seances"><button data-v="4" class="${plan.seances===4?'on':''}">4 (défaut)</button><button data-v="3" class="${plan.seances===3?'on':''}">3</button></div><p class="muted small">À 3 séances, Mohamed tourne sur Haut A / Bas A / Haut B / Bas B au fil des semaines : aucun groupe n'est sacrifié deux fois de suite. Firdaous : A / B / C.</p></div>
    <div class="champ"><label>Jours communs (choisis-en ${plan.seances})</label><div class="jours-choix" id="jours">${[1,2,3,4,5,6,0].map(j => `<button data-j="${j}" class="${plan.jours.includes(j)?'on':''}">${JOURS_C[j]}</button>`).join('')}</div></div>
    ${['mohamed','firdaous'].map(pr => `<div class="champ"><label>Difficulté de ${P_of(pr).prenom}</label><div class="choix" data-diff="${pr}">${['facile','moyen','difficile'].map(n => `<button data-v="${n}" class="${plan.difficulte[pr]===n?'on':''}">${NIVEAU_LABEL[n]}</button>`).join('')}</div></div>
    <div class="champ"><label>Temps disponible de ${P_of(pr).prenom} par séance</label><div class="choix" data-duree="${pr}">${[25,35,45,60,75].map(m => `<button data-v="${m}" class="${plan.duree[pr]===m?'on':''}">${m} min</button>`).join('')}</div></div>
    <div class="champ"><label>Indisponibilités de ${P_of(pr).prenom}</label><div class="jours-choix" data-indispo="${pr}">${[0,1,2,3,4,5,6].map(i => { const d = addJ(base,i); const k = iso(d); return `<button data-k="${k}" class="${(plan.indispo[pr]||[]).includes(k)?'off':''}">${JOURS_C[d.getDay()]}</button>`; }).join('')}</div></div>`).join('<div class="sep"></div>')}
    <div class="champ"><label>Cardio de Mohamed</label><div class="choix" data-opt="cardio"><button data-v="jours-off" class="${plan.cardio==='jours-off'?'on':''}">Jours sans muscu</button><button data-v="apres" class="${plan.cardio==='apres'?'on':''}">Après la muscu</button><button data-v="aucun" class="${plan.cardio==='aucun'?'on':''}">Pas cette semaine</button></div></div></div>
    <div class="carte"><div class="etiquette">Aperçu avant validation</div>${apercu('mohamed')}${apercu('firdaous')}<p class="muted small">Règle : facile 2 · moyen 3 · difficile 4 séries de travail par exercice (gainage : 2, échauffement à part). Changer le niveau ne touche ni les charges, ni les répétitions, ni le cardio. Les séances déjà réalisées ne bougent pas.</p></div>
    <div class="ligne-btns"><button class="btn" id="validerSem">Valider cette semaine</button></div>
    <div class="ligne-btns"><button class="btn sec petit" id="dupliquer">Dupliquer vers la semaine suivante</button><button class="btn sec petit" id="reinit">Revenir aux réglages par défaut</button></div>`, () => ouvrirPreparer(lundi));
    const o = $('#overlay');
    o.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.j != null) { const j = +b.dataset.j; if (plan.jours.includes(j)) plan.jours = plan.jours.filter(x => x !== j); else if (plan.jours.length < plan.seances) plan.jours.push(j); else { toast(`${plan.seances} jours maximum : retire un jour d'abord`); return; } draw(); return; }
      if (b.closest('[data-opt]')) { const g = b.closest('[data-opt]').dataset.opt; const v = b.dataset.v; if (g === 'seances') { plan.seances = +v; if (plan.jours.length > plan.seances) plan.jours = plan.jours.slice(0, plan.seances); } else plan.cardio = v; draw(); return; }
      if (b.closest('[data-diff]')) { plan.difficulte[b.closest('[data-diff]').dataset.diff] = b.dataset.v; draw(); return; }
      if (b.closest('[data-duree]')) { plan.duree[b.closest('[data-duree]').dataset.duree] = +b.dataset.v; draw(); return; }
      if (b.closest('[data-indispo]')) { const pr = b.closest('[data-indispo]').dataset.indispo; const k = b.dataset.k; const arr = plan.indispo[pr] || []; plan.indispo[pr] = arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]; draw(); return; }
      if (b.id === 'validerSem') { if (plan.jours.length !== plan.seances) { toast(`Choisis exactement ${plan.seances} jours`); return; } const avant = planSemaine(lundi); const q = []; if (avant.seances !== plan.seances) q.push(`${avant.seances}→${plan.seances} séances`); ['mohamed','firdaous'].forEach(pr => { if (avant.difficulte[pr] !== plan.difficulte[pr]) q.push(`${P_of(pr).prenom} ${avant.difficulte[pr]}→${plan.difficulte[pr]}`); }); if (avant.jours.join() !== plan.jours.join()) q.push('jours modifiés'); plan.modifs = [...(avant.modifs||[]), { t: q.length ? q.join(', ') : 'Semaine validée', q: fmtCourt(auj()) }]; plan.valide = true; plan.lundi = lundi; store.set('semaines', lundi, plan); fermerTout(); toast('Semaine enregistrée : ' + plan.seances + ' séances, Mohamed ' + plan.difficulte.mohamed + ', Firdaous ' + plan.difficulte.firdaous); return; }
      if (b.id === 'dupliquer') { const next = iso(addJ(base, 7)); const copie = { ...plan, lundi: next, indispo: { mohamed: [], firdaous: [] }, deplacements: { mohamed: {}, firdaous: {} }, modifs: [{ t: 'Dupliquée depuis la semaine du ' + fmtCourt(base), q: fmtCourt(auj()) }], valide: true }; store.set('semaines', next, copie); toast('Semaine suivante préparée à l\'identique'); return; }
      if (b.id === 'reinit') { store.del('semaines', lundi); fermerTout(); toast('Semaine remise par défaut'); return; }
    };
  };
  draw();
}
function deplacerSeance(profil, dateK){
  const d = fromIso(dateK); const lundi = iso(lundiDe(d)); const plan = JSON.parse(JSON.stringify(planSemaine(lundi))); const s = seanceDu(profil, d); if (!s) return;
  const from = s.deplaceeDe || dateK;
  const libres = [];
  for (let n = -6; n <= 6; n++) { const c = addJ(d, n); if (iso(lundiDe(c)) !== lundi || n === 0) continue; if (seanceDu(profil, c) || D.logs[profil+'_'+iso(c)]) continue; libres.push(c); }
  if (!libres.length) { toast('Aucun jour libre cette semaine'); return; }
  ouvrir(btnRetour() + `<h1>Déplacer la séance</h1><p class="muted">${profil==='mohamed'?SEANCES_M[s.key].nom:SEANCES[s.key].nom} du ${fmtLong(d).toLowerCase()} → choisis un jour libre de la même semaine. Évite deux séances jambes/fessiers à la suite.</p><div class="liste">${libres.map(c => { const veille = seanceDu(profil, addJ(c,-1)), lend = seanceDu(profil, addJ(c,1)); const warn = (veille && veille.key !== s.key) || (lend && lend.key !== s.key); return `<button class="item" data-vers="${iso(c)}"><div><div class="t">${fmtLong(c)}</div><div class="s">${warn?'séance la veille ou le lendemain : récupération courte':'jour libre, récupération ok'}</div></div><span class="chev">›</span></button>`; }).join('')}</div>`);
  $('#overlay').onclick = ev => { const b = ev.target.closest('[data-vers]'); if (!b) return; plan.deplacements[profil] = plan.deplacements[profil] || {}; plan.deplacements[profil][from] = b.dataset.vers; plan.modifs = [...(plan.modifs||[]), { t: `${P_of(profil).prenom} : séance déplacée au ${fmtCourt(fromIso(b.dataset.vers))}`, q: fmtCourt(auj()) }]; plan.lundi = lundi; if (D.logs[profil+'_'+dateK] && D.logs[profil+'_'+dateK].statut === 'commencee') store.del('logs', profil+'_'+dateK); store.set('semaines', lundi, plan); fermerTout(); toast('Séance déplacée'); };
}

// ===== Mode séance =====
let runState = null;
function ouvrirSeance(profil, dateK, mode){
  const d = fromIso(dateK); const logK = profil+'_'+dateK; let log = D.logs[logK];
  const c = contenuSeance(profil, d, log?.court ? { court: true } : {}); if (!c) return;
  if (mode === 'run' && (!log || log.statut === 'commencee')) { if (!log) { log = { profil, date: dateK, seance: c.key, statut: 'commencee', exos: {}, adaptations: [], debut: Date.now() }; store.set('logs', logK, log); } }
  const fini = log && log.statut !== 'commencee';
  const cur = runState && runState.logK === logK ? runState.i : 0;
  let html = btnRetour(mode==='run' ? 'Pause · quitter' : 'Retour') + `<div><span class="pastille p-${c.couleur}">${esc(c.nom)} · ${esc(c.sous)}</span><h1 style="margin-top:6px">${esc(c.but)}</h1><div class="muted">${fmtLong(d)} · semaine ${c.semaine} · ${esc(NIVEAU_LABEL[c.niveau])} · ≈ ${c.duree} min</div></div>`;
  html += `<div class="bandeau">${c.notes.map(esc).join(' ')}</div>`;
  if (log?.checkin) html += `<div class="muted small">Avant la séance : énergie ${log.checkin.energie}/5, sommeil ${log.checkin.sommeil}/5${log.checkin.douleur?' · douleur signalée : '+esc(log.checkin.douleur):''}.</div>`;
  html += `<details ${cur===0?'open':''}><summary>Échauffement (${profil==='mohamed'?'8':'5'} min)</summary><ol>${c.echauffement.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`;
  if (mode === 'run' && !fini) {
    html += `<div class="prog"><i style="width:${Math.round(cur/c.exos.length*100)}%"></i></div>`;
    c.exos.forEach((e, i) => {
      const ex = exoInfo(profil, e.k); const sets = (log.exos[e.k]?.sets) || Array.from({length: e.series}, () => ({ reps: '', charge: '', done: false }));
      const perf = dernierePerf(profil, c.key, e.k, dateK); const ouvert = i === cur;
      html += `<div class="carte ${ouvert?'accent':''}" id="exo-${i}" style="${ouvert?'':'opacity:.75'}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><img src="${profil==='mohamed'?imgM(e.k,'b'):IMG[ex.img[1]]}" alt="" loading="lazy" style="width:64px;height:64px;border-radius:14px;object-fit:cover;flex:none"><div style="flex:1"><div class="etiquette">Exercice ${i+1}/${c.exos.length}${e.prioritaire?' · prioritaire':''}</div><h3>${esc(ex.nom)}</h3><div class="muted small">${e.series} séries de travail × ${esc(e.reps)}${e.unilateral?' <strong>par côté</strong>':''} · repos ${e.repos} s · ${esc(ex.mat)}</div></div>${!ouvert?`<button class="btn sec petit" data-act="aller" data-i="${i}">Ouvrir</button>`:''}</div>
        ${ouvert ? `
        <div class="bloc"><div class="etiquette">Dernière fois</div><p class="small">${perf ? fmtCourt(fromIso(perf.date)) + ' : ' + perf.sets.filter(s=>s.done).map(s => (s.reps||'–') + (s.charge?' × '+s.charge:'')).join(' / ') : 'Première fois sur cet exercice.'}</p><div class="etiquette">Objectif aujourd'hui</div><p class="small">${esc(cibleDuJour(profil, e.k, perf, e.reps))}</p><p class="small muted">Effort : ${esc(ex.effort || '2 reps en réserve')}</p></div>
        <details><summary>Technique, variantes, alternative</summary>${profil==='firdaous' ? `<div class="paire"><figure><img src="${IMG[ex.img[0]]}" alt=""><figcaption>Départ</figcaption></figure><figure><img src="${IMG[ex.img[1]]}" alt=""><figcaption class="arr">Arrivée</figcaption></figure></div><ol>${ex.etapes.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="small"><strong>Plus facile :</strong> ${esc(ex.facile)}<br><strong>Progression :</strong> ${esc(ex.progression)}</p>` : `<div class="paire"><figure><img src="${imgM(e.k,'a')}" alt="" loading="lazy"><figcaption>Départ</figcaption></figure><figure><img src="${imgM(e.k,'b')}" alt="" loading="lazy"><figcaption class="arr">Arrivée</figcaption></figure></div><ul>${ex.tech.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="small"><strong>Plus facile :</strong> ${esc(ex.facile)}<br><strong>Plus dur :</strong> ${esc(ex.dur)}<br><strong>Si le matériel est pris :</strong> ${esc(ex.alt)}${ex.pourquoi?'<br><strong>Pourquoi cet exercice :</strong> '+esc(ex.pourquoi):''}</p>`}</details>
        <div class="bloc"><div class="serie-row"><span class="lbl">Série</span><span class="lbl">Reps${e.unilateral?' /côté':''}</span><span class="lbl">${profil==='mohamed' && !e.gainage ? 'Charge / assist.' : 'Variante / kg'}</span><span></span></div>
        ${sets.map((s, j) => `<div class="serie-row"><span class="lbl">${j+1}</span><input type="text" inputmode="decimal" value="${esc(s.reps)}" data-set="${j}" data-f="reps" data-k="${e.k}" placeholder="${esc(String(e.reps).split('–')[0])}"><input type="text" value="${esc(s.charge)}" data-set="${j}" data-f="charge" data-k="${e.k}" placeholder="kg / élastique"><button data-act="set-ok" data-k="${e.k}" data-j="${j}" class="${s.done?'ok':''}" aria-label="Série ${j+1} faite">${s.done?'✓':''}</button></div>`).join('')}</div>
        <div class="ligne-btns"><button class="btn sec petit" data-act="chrono" data-s="${e.repos}">Repos ${e.repos} s</button><button class="btn sec petit" data-act="trop-dur" data-k="${e.k}">Trop difficile</button><button class="btn sec petit" data-act="mat-indispo" data-k="${e.k}">Matériel pris</button></div>
        <div class="ligne-btns">${i>0?`<button class="btn sec petit" data-act="aller" data-i="${i-1}">‹ Précédent</button>`:''}${i<c.exos.length-1?`<button class="btn petit" data-act="aller" data-i="${i+1}">Exercice suivant ›</button>`:`<button class="btn petit" data-act="terminer">Terminer la séance</button>`}</div>` : ''}
      </div>`;
    });
    html += `<div class="ligne-btns"><button class="btn sec petit" data-act="manque-temps">Je manque de temps</button><button class="btn sec petit" data-act="terminer">Terminer maintenant</button></div>`;
    if (log.adaptations?.length) html += `<div class="muted small">Adaptations : ${log.adaptations.map(esc).join(' · ')}</div>`;
  } else {
    c.exos.forEach((e, i) => { const ex = exoInfo(profil, e.k); const sets = log?.exos?.[e.k]?.sets; html += `<div class="carte"><div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700">${i+1}. ${esc(ex.nom)}</div><div class="muted small">${e.series} × ${esc(e.reps)}${e.unilateral?' par côté':''} · repos ${e.repos} s</div></div>${sets ? `<div class="small" style="text-align:right">${sets.map(s => s.done ? (s.reps||'–') + (s.charge?'×'+s.charge:'') : '·').join(' / ')}</div>` : ''}</div><button class="btn sec petit" data-act="fiche" data-p="${profil}" data-k="${e.k}">Fiche</button></div>`; });
    if (fini) html += `<div class="carte"><span class="pastille p-ok">Séance ${log.statut==='complete'?'complète':log.statut==='adaptee'?'adaptée':'partielle'}</span><p class="muted small">Effort ${log.bilan?.effort||'–'}/5${log.bilan?.note?' · « '+esc(log.bilan.note)+' »':''}${log.adaptations?.length?' · '+log.adaptations.map(esc).join(' · '):''}</p></div>`;
  }
  ouvrir(html, () => ouvrirSeance(profil, dateK, mode));
  runState = { profil, dateK, logK, i: cur, mode };
  if (mode === 'run' && !fini) { const el = $('#exo-'+cur); if (el && cur > 0) el.scrollIntoView({ block: 'start' });
    $('#overlay').oninput = ev => { const inp = ev.target; if (!inp.dataset.k) return; const l = D.logs[logK]; l.exos[inp.dataset.k] = l.exos[inp.dataset.k] || { sets: Array.from({length: c.exos.find(x=>x.k===inp.dataset.k).series}, () => ({ reps:'', charge:'', done:false })) }; l.exos[inp.dataset.k].sets[+inp.dataset.set][inp.dataset.f] = inp.value; clearTimeout(ouvrirSeance._t); ouvrirSeance._t = setTimeout(() => store.set('logs', logK, l), 800); }; }
}
function chrono(sec){ let t = sec; const el = document.createElement('div'); el.className='chrono-box'; el.innerHTML = `<div class="etiquette">Repos</div><div class="chrono">${t}</div><div class="ligne-btns"><button class="btn sec petit" data-x="pause">Pause</button><button class="btn sec petit" data-x="skip">Passer</button></div>`; document.body.appendChild(el); let paused = false; const iv = setInterval(()=>{ if (paused) return; t--; el.querySelector('.chrono').textContent = t; if (t<=0){ clearInterval(iv); el.querySelector('.chrono').textContent='C\'est reparti'; try { navigator.vibrate && navigator.vibrate(200); } catch(e){} setTimeout(()=>el.remove(),1200);} },1000); el.onclick = ev => { const b = ev.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'skip') { clearInterval(iv); el.remove(); } else { paused = !paused; b.textContent = paused ? 'Reprendre' : 'Pause'; } }; }
function terminerSeance(){
  const { profil, dateK, logK } = runState; const log = D.logs[logK]; const c = contenuSeance(profil, fromIso(dateK), log.court ? { court: true } : {});
  const total = c.exos.reduce((s,e) => s + e.series, 0); const faits = c.exos.reduce((s,e) => s + ((log.exos[e.k]?.sets||[]).filter(x=>x.done).length), 0);
  const statut = faits >= total ? (log.adaptations?.length ? 'adaptee' : 'complete') : faits >= total*0.5 ? (log.adaptations?.length ? 'adaptee' : 'partielle') : 'partielle';
  const f = { effort: 3, note: '' };
  ouvrir(btnRetour('Retour à la séance') + `<h1>${faits >= total ? 'Séance bouclée.' : 'On note où tu en es.'}</h1><p class="muted">${faits}/${total} séries faites → séance <strong>${statut==='complete'?'complète':statut==='adaptee'?'adaptée':'partielle'}</strong>.${log.adaptations?.length?' Adaptations : '+log.adaptations.map(esc).join(' · ')+'.':''}</p>
    <div class="carte"><div class="champ"><label>Effort global ressenti (1 facile → 5 très dur)</label><div class="echelle" id="eff">${[1,2,3,4,5].map(n=>`<button data-n="${n}" class="${n===3?'on':''}">${n}</button>`).join('')}</div></div><div class="champ"><label for="noteFin">Note (facultatif)</label><textarea id="noteFin" placeholder="Ce qui a marché, ce qui a coincé…"></textarea></div><button class="btn" id="validerFin">Valider</button></div>`);
  const o = $('#overlay'); o.onclick = ev => { const b = ev.target.closest('#eff [data-n]'); if (b) { f.effort = +b.dataset.n; $$('#eff button').forEach(x => x.classList.toggle('on', x===b)); } if (ev.target.id === 'validerFin') { log.statut = statut; log.bilan = { effort: f.effort, note: $('#noteFin').value.trim() }; log.fin = Date.now(); store.set('logs', logK, log); runState = null; fermerTout(); afficherOnglet('aujourdhui'); toast(profil==='mohamed' ? (statut==='complete' ? 'Complète. Engagement tenu.' : 'Notée. La prochaine, on finit.') : (statut==='complete' ? 'Bravo, séance complète.' : 'Séance notée, c\'est déjà ça.')); } };
}
function ouvrirCheckin(profil, dateK){ const f = { energie: 3, sommeil: 3, douleur: '' }; const ech = (id, lab) => `<div class="champ"><label>${lab}</label><div class="echelle" data-ech="${id}">${[1,2,3,4,5].map(n=>`<button data-n="${n}" class="${n===3?'on':''}">${n}</button>`).join('')}</div></div>`;
  ouvrir(btnRetour() + `<h1>Je me sens…</h1><p class="muted">Dix secondes. Ça sert à adapter, pas à noter.</p><div class="carte">${ech('energie','Énergie (1 → 5)')}${ech('sommeil','Sommeil de cette nuit (1 → 5)')}<div class="champ"><label for="douleur">Une douleur ou une gêne ? (vide si non)</label><input type="text" id="douleur" placeholder="ex. : genou droit, bas du dos…"></div><button class="btn" id="okCheck">Voir la proposition</button></div>`);
  $('#overlay').onclick = ev => { const b = ev.target.closest('[data-n]'); if (b) { f[b.closest('[data-ech]').dataset.ech] = +b.dataset.n; $$('button', b.parentElement).forEach(x=>x.classList.toggle('on', x===b)); } if (ev.target.id === 'okCheck') { f.douleur = $('#douleur').value.trim(); const logK = profil+'_'+dateK; const log = D.logs[logK] || { profil, date: dateK, seance: seanceDu(profil, fromIso(dateK))?.key, statut: 'commencee', exos: {}, adaptations: [] }; log.checkin = f; let prop = 'Séance normale.'; if (f.douleur) prop = 'Douleur signalée : pas d\'exercice qui la réveille. Si elle est vive ou inhabituelle, on reporte et on demande un avis ; sinon, séance allégée (2 séries, repos longs) en évitant la zone.'; else if (f.energie <= 2 || f.sommeil <= 2) { prop = 'Énergie ou sommeil bas : séance raccourcie (exercices prioritaires, 2 séries). Pas de tentative de record aujourd\'hui.'; log.court = true; log.adaptations.push('Raccourcie (énergie/sommeil bas)'); } else if (f.energie >= 4 && f.sommeil >= 4) prop = 'Bonne forme : séance complète, tu peux viser +1 rep sur les exercices prioritaires.'; store.set('logs', logK, log); ouvrir(btnRetour() + `<h1>Proposition</h1><div class="carte"><p>${esc(prop)}</p><p class="muted small">Ce n'est pas un score médical : juste une règle simple à partir de ce que tu as indiqué.</p><button class="btn" data-act="commencer" data-p="${profil}" data-date="${dateK}">Commencer ma séance</button><button class="btn sec" data-act="fermer">Plus tard</button></div>`); } }; }

// ===== Fiches =====
function ficheHtml(profil, k){ const e = exoInfo(profil, k); if (profil === 'firdaous') return `<div><span class="pastille p-sable">${esc(e.zone)}</span><h1 style="margin-top:6px">${esc(e.nom)}</h1><p class="muted">Matériel : ${esc(e.mat)}</p></div><div class="paire"><figure><img src="${IMG[e.img[0]]}" alt="Départ"><figcaption>Départ</figcaption></figure><figure><img src="${IMG[e.img[1]]}" alt="Arrivée"><figcaption class="arr">Arrivée</figcaption></figure></div><div class="carte"><div class="bloc"><h3>Objectif</h3><p>${esc(e.but)}</p></div><div class="bloc"><h3>Installation</h3><p>${esc(e.install)}</p></div><div class="bloc"><h3>Exécution</h3><ol>${e.etapes.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><div class="bloc"><h3>Respiration · rythme</h3><p>${esc(e.respiration)} ${esc(e.rythme)}</p></div><div class="bloc"><h3>Ce que tu dois sentir</h3><p>${esc(e.sensations)}</p></div></div><div class="carte"><div class="bloc"><h3>Erreurs fréquentes</h3><ul>${e.erreurs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="bloc"><h3>Plus facile</h3><p>${esc(e.facile)}</p></div><div class="bloc"><h3>Progression</h3><p>${esc(e.progression)}</p></div><div class="bloc"><h3>Quand s'arrêter</h3><p>${esc(e.arret)}</p></div></div>`;
  return `<div><span class="pastille p-sable">${esc(e.zone)}</span><h1 style="margin-top:6px">${esc(e.nom)}</h1><p class="muted">Matériel : ${esc(e.mat)} · ${esc(e.reps)} · repos ${e.repos} s</p></div><div class="paire"><figure><img src="${imgM(k,'a')}" alt="Départ" loading="lazy"><figcaption>${e.type==='gainage'?'Position':'Départ'}</figcaption></figure><figure><img src="${imgM(k,'b')}" alt="Arrivée" loading="lazy"><figcaption class="arr">${e.type==='gainage'?'Erreur à éviter':'Arrivée'}</figcaption></figure></div><div class="carte"><div class="bloc"><h3>Technique</h3><ul>${e.tech.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="bloc"><h3>Effort attendu</h3><p>${esc(e.effort)}</p></div>${e.pourquoi?`<div class="bloc"><h3>Pourquoi cet exercice</h3><p>${esc(e.pourquoi)}</p></div>`:''}</div><div class="carte"><div class="bloc"><h3>Plus facile</h3><p>${esc(e.facile)}</p></div><div class="bloc"><h3>Plus dur</h3><p>${esc(e.dur)}</p></div><div class="bloc"><h3>Si le matériel est pris</h3><p>${esc(e.alt)}</p></div></div>`; }

// ===== Écran Exercices =====
let exoFiltre = 'tous';
function rExos(){
  const M = profilActif === 'mohamed'; const src = M ? EXOS_M : EXOS;
  const zones = ['tous', ...new Set(Object.values(src).map(e => e.zone.split(' · ')[0]))];
  const items = Object.entries(src).filter(([k,e]) => exoFiltre === 'tous' || e.zone.split(' · ')[0] === exoFiltre);
  let html = `<div class="hero"><div class="date">${M ? 'Salle · ' + Object.keys(EXOS_M).length : 'Maison · ' + Object.keys(EXOS).length} exercices</div><div class="gros">Mes exercices.</div></div>`;
  html += `<div class="chips">${zones.map(z => `<button class="${z===exoFiltre?'on':''}" data-act="exo-filtre" data-z="${esc(z)}">${z==='tous'?'Tous':esc(z)}</button>`).join('')}</div>`;
  html += `<div class="grille-exos">${items.map(([k,e]) => `<button class="tuile" data-act="fiche" data-p="${profilActif}" data-k="${k}"><img src="${M ? imgM(k,'b') : IMG[e.img[1]]}" alt="" loading="lazy"><div class="tuile-t"><strong>${esc(e.nom)}</strong><span>${esc(e.zone)}</span></div></button>`).join('')}</div>`;
  html += `<div class="carte"><div class="etiquette">Les mots du programme</div><p class="small"><strong>Répétition</strong> : un mouvement complet. <strong>Série</strong> : un groupe de répétitions. <strong>Repos</strong> : la pause entre deux séries. <strong>RIR</strong> : les répétitions que tu aurais encore pu faire (on vise 2).</p></div>`;
  if (!M) html += `<div class="carte"><div class="etiquette">Échauffement (5 min)</div><ol>${ECHAUFFEMENT.map(x=>`<li>${esc(x.nom)} — ${esc(x.duree)}</li>`).join('')}</ol></div><div class="carte"><div class="etiquette">Matériel</div>${ACHATS.map(a => `<div class="bloc"><strong>${esc(a.item)}</strong><span class="muted small">${esc(a.utilite)} · ${esc(a.prix)}</span></div>`).join('')}</div>`;
  $('#ecran-exos').innerHTML = html;
}

// ===== Écran Repas =====
function rRepas(){
  const d = addJ(auj(), menuJourVue); const p = P(); const pj = planJour(profilActif, d); const m = menuDuJour(d);
  let html = `<div><h1>Nos repas</h1><div class="muted">Bases communes, portions adaptées : Mohamed ×${FACTEUR_PORTION.mohamed}, Firdaous ×${FACTEUR_PORTION.firdaous}. Rotation sur 14 jours.</div></div>`;
  html += `<div class="chips">${[-1,0,1,2,3,4,5,6].map(n => { const x = addJ(auj(), n); return `<button class="${n===menuJourVue?'on':''}" data-act="menu-jour" data-n="${n}">${n===0?'Aujourd\'hui':JOURS_C[x.getDay()]+' '+x.getDate()}</button>`; }).join('')}</div>`;
  html += `<div class="carte"><div class="etiquette" style="display:flex;justify-content:space-between"><span>${P().prenom} · ${fmtLong(d)}</span><span>≈ ${pj.total} kcal · ${pj.prot} g · cible ${p.kcalCible}</span></div><div class="repas">${pj.repas.map(([k,v,n]) => { const mk = k.startsWith('Matin')?'matin':k==='Midi'?'midiF':k.startsWith('Soir')?'soir':null; return `<div><span class="k"><span>${k}</span><span>≈ ${n.kcal} kcal · ${n.prot} g</span></span><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><button class="nom" data-act="recette" data-nom="${esc(v)}" data-p="${profilActif}">${esc(v.replace(/ \(.*\)/,''))}</button>${mk?`<button class="btn sec petit" data-act="swap" data-date="${iso(d)}" data-m="${mk}">Changer</button>`:`<button class="btn ${pj.shakerPris?'sec':''} petit" data-act="shaker" data-date="${iso(d)}">${pj.shakerPris?'✓ pris':'Pris'}</button>`}</div></div>`; }).join('')}</div>
  ${Math.abs(pj.total - p.kcalCible) > 250 ? `<p class="muted small">Écart de ${pj.total - p.kcalCible > 0 ? '+' : ''}${pj.total - p.kcalCible} kcal avec la cible : ajuste la portion (${profilActif==='mohamed'?'féculent du soir':'shaker ou collation'}) ou demande au coach.</p>` : ''}
  <div class="ligne-btns">${['Il manque un ingrédient','Je n\'ai que dix minutes','Je mange à l\'extérieur','J\'ai peu faim'].map(r => `<button class="btn sec petit" data-act="raccourci" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`;
  // Courses
  const lundi = iso(lundiDe(d)); const liste = listeCourses(lundi); const coches = D.courses.actuelle?.coches || {}; const parRayon = {}; liste.forEach(it => { (parRayon[it.rayon] = parRayon[it.rayon] || []).push(it); });
  html += `<details><summary>Liste de courses commune — semaine du ${fmtCourt(fromIso(lundi))} (${liste.filter(i=>!coches[i.nom]).length} à acheter)</summary><p class="muted small">Calculée à partir des repas de la semaine pour vous deux. Coche ce que vous avez déjà. Les prix ne sont pas indiqués : ils varient selon le magasin.</p>${[...RAYONS,'Autres'].filter(r => parRayon[r]).map(r => `<div class="bloc"><h3>${esc(r)}</h3>${parRayon[r].map(it => `<button class="check ${coches[it.nom]?'on':''}" data-act="coche" data-nom="${esc(it.nom)}"><span class="box">${coches[it.nom]?'✓':''}</span><span class="txt">${esc(it.nom)}${it.q!=null?' — '+fmtQ(it.q,it.u):''}</span></button>`).join('')}</div>`).join('')}<div class="ligne-btns" style="margin-top:8px"><input type="text" id="extraItem" placeholder="Ajouter un article…" style="flex:1"><button class="btn sec petit" data-act="extra-add">Ajouter</button><button class="btn sec petit" data-act="coches-reset">Tout décocher</button></div></details>`;
  html += `<details><summary>Rotation 14 jours</summary><table class="tbl"><tr><th>J</th><th>Matin</th><th>Midi (Firdaous)</th><th>Soir</th></tr>${ROTATION_REPAS.map((r,i) => `<tr><td>${i+1}</td><td>${esc(r.matin)}</td><td>${esc(r.midiF)}</td><td>${esc(r.soir)}</td></tr>`).join('')}</table><p class="muted small">Mohamed : matin + soir (deux repas). Firdaous : matin, midi (souvent les restes de la veille), soir, shaker.</p></details>`;
  html += `<details><summary>Toutes les recettes (${Object.keys(RECETTES).length})</summary><div class="liste">${Object.entries(RECETTES).map(([n,r]) => `<button class="item" data-act="recette" data-nom="${esc(n)}" data-p="${profilActif}"><div><div class="t">${esc(n)}</div><div class="s">${esc(r.temps)} · ${r.kcal} kcal · ${r.prot} g prot (portion standard)</div></div><span class="chev">›</span></button>`).join('')}</div></details>`;
  html += `<details><summary>Mes besoins et ma cible calorique</summary>${cibleHtml(profilActif)}</details>`;
  $('#ecran-repas').innerHTML = html;
}
function cibleHtml(profil){ const p = P_of(profil); const pa = poidsActuel(profil) || p.poidsDepart; const b = Math.round(bmr(p)); const m = maintien(p); const ecart = p.kcalCible - m; const parSem = r1(ecart * 7 / 7700);
  return `<div class="bloc"><p><strong>Méthode</strong> : métabolisme de base (Mifflin-St Jeor) × facteur d'activité ${p.activite} (${profil==='mohamed'?'4 séances + cardio':'3–4 séances à la maison'}). Ce sont des estimations ; le suivi des pesées sur 3–4 semaines corrige.</p><table class="tbl"><tr><th>Donnée</th><th>Valeur</th><th>Statut</th></tr><tr><td>Poids utilisé</td><td>${pa} kg</td><td>${poidsActuel(profil)?'mesuré':'déclaré'}</td></tr><tr><td>Métabolisme de base</td><td>≈ ${b} kcal</td><td>estimé</td></tr><tr><td>Maintien</td><td>≈ ${m} kcal</td><td>estimé</td></tr><tr><td>Cible quotidienne</td><td><strong>${p.kcalCible} kcal</strong> · ${p.protCible} g prot</td><td>${ecart>0?'+':''}${ecart} kcal → ≈ ${parSem>0?'+':''}${parSem} kg/sem</td></tr></table>
  ${profil==='mohamed' ? `<p class="small">Objectif déclaré : ${p.poidsDepart} → ${p.jalon.poids} kg en ${p.jalon.mois} mois, puis ${p.objectifPoids} kg à ${p.objectifMois} mois. ${esc(p.jalon.texte)} Le déficit actuel (${Math.abs(ecart)} kcal) vise ≈ ${Math.abs(parSem)} kg/semaine ; en dessous de 2 200 kcal avec 4 séances + cardio, la récupération et la masse musculaire en pâtissent.</p>` : `<p class="small">Objectif déclaré : ${p.poidsDepart} → ${p.objectifPoids} kg en ${p.objectifMois} mois ou plus (≈ ${r1((p.objectifPoids-p.poidsDepart)/(p.objectifMois*4.33))} kg/semaine). Prise graduelle ; on ne peut pas choisir où le poids se place.</p>`}
  ${profilActif==='mohamed' ? `<div class="grille2"><div class="champ"><label for="kc-${profil}">Cible kcal / jour</label><input type="number" id="kc-${profil}" value="${p.kcalCible}" step="50"></div><div class="champ"><label for="pr-${profil}">Protéines g / jour</label><input type="number" id="pr-${profil}" value="${p.protCible}" step="5"></div><div class="champ"><label for="op-${profil}">Objectif poids (kg)</label><input type="number" id="op-${profil}" value="${p.objectifPoids}" step="0.5"></div><div class="champ"><label for="om-${profil}">Horizon (mois)</label><input type="number" id="om-${profil}" value="${p.objectifMois}" step="1"></div></div><button class="btn sec petit" data-act="cible-save" data-p="${profil}">Enregistrer pour ${p.prenom}</button><p class="muted small">Seul l'espace Mohamed peut modifier les objectifs et les calories.</p>` : ''}</div>`; }
function ouvrirRecette(nom, profil){ const r = recetteDe(nom); if (!r) { ouvrir(btnRetour() + `<h1>${esc(nom)}</h1><p class="muted">Pas de fiche : c'est un reste ou une collation libre.</p>`); return; } const f = FACTEUR_PORTION[profil] || 1; const fM = FACTEUR_PORTION.mohamed, fF = FACTEUR_PORTION.firdaous;
  ouvrir(btnRetour() + `<span class="pastille p-rose">Recette${r.restes?' · restes de la veille':''}</span><h1>${esc(r.nom)}</h1><div class="muted">${esc(r.temps)} · portion standard ≈ ${r.kcal} kcal · ${r.prot} g prot (estimation, huiles et sauces comptées)</div>
  <div class="carte"><div class="etiquette">Quantités par personne</div><table class="tbl"><tr><th>Ingrédient</th><th>Mohamed (×${fM})</th><th>Firdaous (×${fF})</th></tr>${r.ing.map(([n,q,u]) => `<tr><td>${esc(n)}</td><td>${fmtQ(q*fM,u)}</td><td>${fmtQ(q*fF,u)}</td></tr>`).join('')}</table><p class="muted small">Poids crus sauf mention (thon, haricots : égouttés). Mohamed ≈ ${Math.round(r.kcal*fM)} kcal · Firdaous ≈ ${Math.round(r.kcal*fF)} kcal.</p></div>
  <div class="carte"><div class="bloc"><h3>Préparation</h3><ol>${r.etapes.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><div class="bloc"><h3>Alternatives</h3><p>${esc(r.subst)}</p></div><div class="bloc"><h3>Conservation</h3><p>${esc(r.conserv)}</p></div></div>`); }
function ouvrirSwap(dateK, moment){ const m = menuDuJour(fromIso(dateK)); const cur = m[moment]; const cands = Object.entries(RECETTES).filter(([n,r]) => moment==='matin' ? r.moment==='matin' : r.moment==='repas');
  ouvrir(btnRetour() + `<h1>Remplacer « ${esc(cur)} »</h1><p class="muted">${fmtLong(fromIso(dateK))} · ${moment==='matin'?'matin':moment==='midiF'?'midi (Firdaous)':'soir (commun)'}. La liste de courses se met à jour toute seule.</p><div class="liste">${cands.map(([n,r]) => `<button class="item" data-choix="${esc(n)}"><div><div class="t">${esc(n)}</div><div class="s">${esc(r.temps)} · ${r.kcal} kcal · ${r.prot} g</div></div><span class="chev">›</span></button>`).join('')}</div>${m.swaps[moment]?`<button class="btn sec" data-choix="__reset">Revenir au repas prévu</button>`:''}`);
  $('#overlay').onclick = ev => { const b = ev.target.closest('[data-choix]'); if (!b) return; const sw = { ...(D.repas[dateK]||{}) }; if (b.dataset.choix === '__reset') delete sw[moment]; else sw[moment] = b.dataset.choix; store.set('repas', dateK, sw); fermerTout(); toast('Repas remplacé, courses mises à jour'); }; }

// ===== Écran Progrès =====
function rProg(){
  const d = auj(); const p = P(); const w = semaineNum(d); const logs = Object.values(D.logs).filter(l => l.profil === profilActif && ['complete','adaptee','partielle'].includes(l.statut)).sort((a,b)=>a.date.localeCompare(b.date));
  let prev = 0, done = 0; for (let n = 27; n >= 0; n--) { const x = addJ(d,-n); if (seanceDu(profilActif, x)) { prev++; if (['terminée','adaptée','partielle'].includes(statutDu(profilActif, x))) done++; } }
  const M = Object.values(D.mesures).filter(m => m.profil === profilActif).sort((a,b)=>a.date.localeCompare(b.date)); const Pd = M.filter(m => m.poids);
  let html = `<div><h1>Mes progrès</h1><div class="muted">Mesuré, observé, incertain — jamais inventé.</div></div>`;
  html += `<div class="stat"><div><div class="n">${logs.length}</div><div class="l">séances faites</div></div><div><div class="n">${prev?Math.round(done/prev*100):0}%</div><div class="l">régularité 4 sem.</div></div><div><div class="n">${w>=1?w:'—'}</div><div class="l">semaine</div></div></div>`;
  html += `<div class="carte"><div class="etiquette">Poids (tous les 14 jours)</div><div class="ligne-btns"><input type="number" id="poidsVal" step="0.1" placeholder="kg" style="max-width:110px" aria-label="Poids"><input type="date" id="poidsDate" value="${iso(d)}" style="max-width:170px"><button class="btn sec petit" data-act="poids-add">Enregistrer</button></div><p class="muted small">Enregistrer à une date déjà saisie remplace la valeur (pas de doublon).</p>${Pd.length >= 2 ? graphe(Pd.map(x=>({date:x.date, v:x.poids})), 'kg') : ''}${Pd.length ? `<div class="log">${Pd.slice(-6).reverse().map(x => `<div><span>${fmtCourt(fromIso(x.date))}</span><span>${x.poids} kg <button data-act="poids-del" data-date="${x.date}" style="color:var(--attention);font-weight:700;margin-left:8px">retirer</button></span></div>`).join('')}</div>${Pd.length>=3?`<p class="small">Tendance : ${tendance(Pd)}. ${profilActif==='mohamed' ? (tendance(Pd).startsWith('-') ? 'Dans le bon sens' : 'Pas encore de baisse nette') : (tendance(Pd).startsWith('+') ? 'Dans le bon sens' : 'Pas encore de hausse nette')} — on ne change les calories qu'après 3–4 semaines de tendance, jamais sur une pesée.</p>`:''}` : `<p class="muted small">Point de départ déclaré : ${p.poidsDepart} kg.</p>`}</div>`;
  html += `<div class="carte"><div class="etiquette">Mensurations (environ 1×/mois, facultatif)</div><div class="grille2">${[['taille','Tour de taille (cm)'],['hanches','Tour de hanches (cm)'],['bras','Bras (cm)'],['cuisse','Cuisse (cm)']].map(([k,l]) => `<div class="champ"><label for="m-${k}">${l}</label><input type="number" id="m-${k}" step="0.5"></div>`).join('')}</div><button class="btn sec petit" data-act="mesures-add">Enregistrer les mensurations</button>${M.filter(m=>m.taille||m.hanches).length ? `<div class="log">${M.filter(m=>m.taille||m.hanches||m.bras||m.cuisse).slice(-4).reverse().map(x=>`<div><span>${fmtCourt(fromIso(x.date))}</span><span class="muted">${['taille','hanches','bras','cuisse'].filter(k=>x[k]).map(k=>k+' '+x[k]).join(' · ')}</span></div>`).join('')}</div>`:''}</div>`;
  // Performances par exercice
  const perfs = {}; logs.forEach(l => Object.entries(l.exos||{}).forEach(([k,v]) => { const best = (v.sets||[]).filter(s=>s.done).map(s => ({ reps: parseFloat(s.reps)||0, charge: parseFloat(s.charge)||0 })); if (!best.length) return; (perfs[k] = perfs[k] || []).push({ date: l.date, reps: Math.max(...best.map(b=>b.reps)), charge: Math.max(...best.map(b=>b.charge)) }); }));
  html += `<details><summary>Performances par exercice</summary>${Object.keys(perfs).length ? Object.entries(perfs).map(([k,arr]) => { const ex = exoInfo(profilActif, k); const a = arr[0], z = arr[arr.length-1]; return `<div class="log"><div><span><strong>${esc(ex?.nom||k)}</strong></span><span class="muted">${fmtCourt(fromIso(a.date))} : ${a.reps}${a.charge?'×'+a.charge:''} → ${fmtCourt(fromIso(z.date))} : ${z.reps}${z.charge?'×'+z.charge:''}</span></div></div>`; }).join('') : '<p class="muted">Dès ta première séance enregistrée.</p>'}</details>`;
  // Bilan hebdo
  const lundi = iso(lundiDe(d)); const bh = D.bilans[profilActif+'_S'+lundi];
  html += `<div class="carte"><div class="etiquette">Bilan de la semaine (bref)</div>${bh ? `<p class="small"><strong>Marché :</strong> ${esc(bh.ok)}<br><strong>Coincé :</strong> ${esc(bh.ko)}<br><strong>On ajuste :</strong> ${esc(bh.adj)}</p>` : ''}<button class="btn sec petit" data-act="bilan-hebdo">${bh?'Modifier':'Remplir'} : ce qui a marché, ce qui a coincé, ce qu'on ajuste</button></div>`;
  // Bilans 3/6/12
  const debut = fromIso(couple().debut);
  html += `<div class="carte"><div class="etiquette">Bilans à 3, 6 et 12 mois</div>${[3,6,12].map(m => { const dd = new Date(debut); dd.setMonth(dd.getMonth()+m); const passe = diffJ(d, dd) >= 0; const b = D.bilans[profilActif+'_M'+m]; return `<div class="bloc"><strong>${m} mois — ${fmtLong(dd).toLowerCase()} ${passe && !b ? '<span class="pastille p-ok">à faire</span>':''}</strong>${b ? `<p class="small">${esc(b.resume)}</p>` : `<p class="muted small">Mesuré · progrès observés · régularité · difficultés · à maintenir · 1–3 adaptations prioritaires.</p>`}${passe ? `<button class="btn sec petit" data-act="bilan-mois" data-m="${m}">${b?'Relire / modifier':'Générer avec le coach'}</button>`:''}</div>`; }).join('<div class="sep"></div>')}</div>`;
  // Photos de suivi
  const photos = Object.values(D.photos).filter(x => x.profil === profilActif).sort((a,b)=>b.date.localeCompare(a.date));
  if (photos.length) html += `<details><summary>Mes photos de suivi (${photos.length})</summary><p class="muted small">Privées, stockées dans cette app. Mêmes conditions à chaque fois : lumière, distance, position.</p><div class="grille2">${photos.slice(0,8).map(ph => `<figure style="margin:0"><img data-photo="${esc(ph.id)}" alt="" style="border-radius:12px;min-height:80px;background:var(--ligne)"><figcaption class="muted small">${fmtCourt(fromIso(ph.date))} · ${esc(ph.contexte)} <button data-act="photo-del" data-id="${ph.id}" style="color:var(--attention);font-weight:700">supprimer</button></figcaption></figure>`).join('')}</div></details>`;
  html += `<details><summary>Mes astuces</summary>${(ASTUCES[profilActif]||[]).map(a => `<div class="bloc"><h3>${esc(a.t)}</h3><p class="small">${esc(a.c)}</p></div>`).join('')}</details>`;
  html += `<details><summary>Journal (${logs.length})</summary><div class="log">${logs.slice(-15).reverse().map(l => `<div><span><strong>${esc((profilActif==='mohamed'?SEANCES_M:SEANCES)[l.seance]?.nom||l.seance)}</strong> · ${fmtCourt(fromIso(l.date))}</span><span class="muted">${l.statut==='complete'?'complète':l.statut==='adaptee'?'adaptée':'partielle'} · effort ${l.bilan?.effort||'–'}/5</span></div>`).join('') || '<p class="muted">Rien encore.</p>'}</div></details>`;
  html += `<div class="carte"><div class="etiquette">Mes données</div><p class="muted small">${modeStockage==='db' ? 'Synchronisées entre vos téléphones (Supabase, même compte). Chaque séance, pesée ou repas est un enregistrement séparé : une saisie sur un téléphone n\'écrase pas celle de l\'autre, sauf si vous modifiez exactement la même chose au même moment (le dernier gagne).' : 'Stockage sur cet appareil uniquement (pas de synchronisation dans ce mode).'} Export texte pour sauvegarde.</p><div class="ligne-btns"><button class="btn sec petit" data-act="export">Exporter</button><button class="btn sec petit" data-act="import">Restaurer</button></div></div>`;
  html += `<details><summary>Sources</summary><ul>${SOURCES2.map(s => `<li><a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join('')}</ul></details>`;
  $('#ecran-progres').innerHTML = html; $$('#ecran-progres img[data-photo]').forEach(im => photoUrl(im.dataset.photo).then(u => { if (u) im.src = u; }));
}
function tendance(P){ const a = P.slice(-3).reduce((s,p)=>s+p.poids,0)/Math.min(3,P.length); const b = P.slice(0,3).reduce((s,p)=>s+p.poids,0)/Math.min(3,P.length); const j = Math.max(7, diffJ(fromIso(P[P.length-1].date), fromIso(P[0].date))); const parSem = (a-b)/j*7; return (parSem>=0?'+':'')+parSem.toFixed(2)+' kg/semaine'; }
function graphe(P, unite){ const W=320,H=120,pl=34,pr=8,pt=10,pb=22; const xs=P.map(p=>fromIso(p.date).getTime()); const ys=P.map(p=>p.v); const x0=Math.min(...xs),x1=Math.max(...xs); const y0=Math.floor(Math.min(...ys)-1),y1=Math.ceil(Math.max(...ys)+1); const X=t=>pl+(x1===x0?0:(t-x0)/(x1-x0))*(W-pl-pr); const Y=v=>pt+(1-(v-y0)/(y1-y0))*(H-pt-pb); const pts=P.map(p=>`${X(fromIso(p.date).getTime()).toFixed(1)},${Y(p.v).toFixed(1)}`); return `<svg class="mini-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution"><line x1="${pl}" x2="${W-pr}" y1="${Y(y0)}" y2="${Y(y0)}" stroke="var(--ligne)"/><line x1="${pl}" x2="${W-pr}" y1="${Y(y1)}" y2="${Y(y1)}" stroke="var(--ligne)"/><text x="2" y="${Y(y1)+4}">${y1}</text><text x="2" y="${Y(y0)+4}">${y0}</text><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/>${P.map(p=>`<circle cx="${X(fromIso(p.date).getTime())}" cy="${Y(p.v)}" r="3" fill="var(--accent)"/>`).join('')}<text x="${pl}" y="${H-6}">${fmtCourt(fromIso(P[0].date))}</text><text x="${W-pr}" y="${H-6}" text-anchor="end">${fmtCourt(fromIso(P[P.length-1].date))}</text></svg>`; }

// ===== Coach IA =====
const chatState = { mohamed: { turns: [], pending: null }, firdaous: { turns: [], pending: null } };
let photoEnAttente = null; let coachCtl = null;
function contexteCoach(profil){
  const p = P_of(profil); const d = auj(); const c = contenuSeance(profil, d); const plan = planSemaine(iso(lundiDe(d))); const pj = planJour(profil, d);
  const logs = Object.values(D.logs).filter(l => l.profil === profil && l.statut !== 'commencee').sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const poids = Object.values(D.mesures).filter(m => m.profil === profil && m.poids).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const mem = D.coach[profil]?.memoire || [];
  const ton = profil === 'mohamed' ? 'Ton : direct et exigeant. Donne un objectif concret, reconnais l\'effort, rappelle l\'engagement. Jamais d\'humiliation, de culpabilisation, ni d\'incitation à ignorer une douleur.' : `Ton : ${p.ton === 'direct' ? 'direct et encourageant' : 'bienveillant, clair, sans jugement sur le corps'}. Jamais de termes comme « défaut » ou « stockage disgracieux ».`;
  return `Tu es le coach intégré de l'application « Nos routines ». Tu parles à ${p.prenom} (profil actif : ${profil}). Tu ne connais QUE ce profil ; ne mentionne jamais les données de l'autre personne.
${ton}
RÈGLES : réponses directes, contextualisées, avec 1–3 actions concrètes et une explication courte. Distingue toujours : données enregistrées (ci-dessous), tes observations, tes hypothèses. Tu n'es pas médecin : pas de diagnostic, pas de prescription ; pour un symptôme inquiétant (douleur vive, thoracique, malaise, essoufflement anormal, sang, fièvre), oriente vers un médecin ou les urgences et arrête le coaching ordinaire. Une question de recette ne mérite pas d'avertissement médical. Sur une photo : estimation en fourchette, jamais de taux de graisse, de graisse viscérale ou de muscle gagné. On ne peut pas choisir où le corps stocke la graisse. Pas de promesse de résultat.
FORMAT DE RÉPONSE : réponds UNIQUEMENT par un objet JSON : {"reponse": "texte en français (markdown léger autorisé)", "actions": [ ... ]}. actions est un tableau (souvent vide) de propositions que l'utilisateur devra valider ; types autorisés :
 {"type":"remplacer_repas","date":"AAAA-MM-JJ","moment":"matin|midiF|soir","recette":"<nom exact d'une recette de la liste>"}
 {"type":"ajouter_course","item":"<article>"}
 {"type":"noter_adaptation","date":"AAAA-MM-JJ","texte":"<adaptation de la séance>"}
 {"type":"difficulte_semaine","lundi":"AAAA-MM-JJ","profil":"${profil}","niveau":"facile|moyen|difficile"}
 {"type":"memoire","texte":"<préférence durable à retenir>"}
 ${profil==='mohamed' ? '{"type":"cible_kcal","profil":"mohamed|firdaous","kcal":2400,"prot":175}' : ''}
Ne propose une action que si elle est utile. Aucune action n'est appliquée sans validation.

DONNÉES ENREGISTRÉES DU PROFIL :
- ${p.prenom}, ${p.age} ans, ${p.taille} cm, poids de départ ${p.poidsDepart} kg, dernier poids ${poids[0] ? poids[0].poids + ' kg le ' + poids[0].date : 'aucune pesée'}. Objectif : ${p.objectifPoids} kg à ${p.objectifMois} mois. ${p.jalon?.texte||''}
- Cible : ${p.kcalCible} kcal, ${p.protCible} g protéines ; maintien estimé ≈ ${maintien(p)} kcal (Mifflin × ${p.activite}). ${p.repasParJour} repas/jour.
- Lieu : ${p.lieu}. Priorités : ${(p.priorites||[]).join(', ')}. Notes : ${p.notes||''} ${profil==='mohamed'?`Niveau : ${p.niveau.tractions} tractions, ${p.niveau.pompes} pompes.`:''}
- Aujourd'hui ${iso(d)} (${JOURS[d.getDay()]}), semaine ${semaineNum(d)} : ${c ? `séance ${c.nom} (${c.sous}), niveau ${c.niveau} = ${c.series} séries, exercices : ${c.exos.map(e=>e.nom+' '+e.series+'×'+e.reps).join(' ; ')}` : 'repos' + (profil==='mohamed' && cardioDuJour(d) ? ' + cardio : ' + cardioDuJour(d).txt : '')}.
- Semaine (lundi ${plan.lundi}) : ${plan.seances} séances, jours ${plan.jours.map(j=>JOURS_C[j]).join('/')}, difficulté ${plan.difficulte[profil]}, ${plan.duree[profil]} min dispo.
- Repas du jour : ${pj.repas.map(([k,v,n])=>k+' : '+v+' ('+n.kcal+' kcal)').join(' ; ')} — total ≈ ${pj.total} kcal / ${pj.prot} g prot.${profil==='firdaous'?' Shaker '+(pj.shakerPris?'pris':'pas encore pris')+'.':''}
- Recettes disponibles : ${Object.keys(RECETTES).join(' | ')}.
- Dernières séances : ${logs.length ? logs.map(l => l.date+' '+l.seance+' '+l.statut+(l.bilan?' effort '+l.bilan.effort+'/5':'')+(l.exos?' ['+Object.entries(l.exos).map(([k,v])=>k+': '+(v.sets||[]).filter(s=>s.done).map(s=>s.reps+(s.charge?'×'+s.charge:'')).join('/')).join('; ')+']':'')).join(' || ') : 'aucune'}.
- Pesées : ${poids.map(x=>x.date+' '+x.poids+'kg').join(', ') || 'aucune'}.
- Mémoire du coach (préférences validées) : ${mem.length ? mem.join(' ; ') : 'vide'}.`;
}
function rCoach(){
  const p = P(); const st = chatState[profilActif]; const mem = D.coach[profilActif]?.memoire || [];
  if (!st.turns.length && D.coach[profilActif]?.turns) st.turns = D.coach[profilActif].turns;
  let html = `<div><h1>Mon coach</h1><div class="muted">${aiDisponible() ? `Il connaît ton programme, tes repas, tes séances et tes pesées — uniquement les tiens.` : `Ajoute ta clé Anthropic dans les réglages (⚙) pour activer le coach. Tout le reste fonctionne sans.`}</div></div>`;
  html += `<div class="chips">${['Comment adapter mon repas ?','Cet exercice est trop dur','Je n\'ai que 25 minutes','Pourquoi mon poids varie ?','Qu\'est-ce qui a progressé ?'].map(q => `<button data-act="q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  html += `<div class="chat" id="chat">${st.turns.length ? st.turns.map(t => `<div class="bulle ${t.role==='user'?'moi':'coach'}">${t.img?`<img src="${t.img}" alt="">`:''}${esc(t.content)}</div>`).join('') : `<div class="bulle coach">${profilActif==='mohamed' ? 'Prêt. Dis-moi où tu bloques : une séance, un repas, une charge à choisir, une baisse de motivation.' : 'Je suis là pour toi : une question sur un exercice, un repas, ton shaker, ou juste pour comprendre où tu en es.'}</div>`}${st.pending ? `<div class="bulle coach" id="pending">${esc(st.pending)}</div>` : ''}</div>`;
  if (st.actions && st.actions.length) html += `<div class="action-box"><div class="etiquette">Le coach propose</div>${st.actions.map((a,i) => `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="small">${esc(decrireAction(a))}</span><span class="ligne-btns"><button class="btn petit" data-act="action-ok" data-i="${i}">Appliquer</button><button class="btn sec petit" data-act="action-non" data-i="${i}">Annuler</button></span></div>`).join('')}<p class="muted small">Rien n'est modifié tant que tu n'appuies pas sur Appliquer.</p></div>`;
  html += `<div class="carte"><div class="compose"><textarea id="msg" placeholder="Pose ta question…" ${aiDisponible()?'':'disabled'}></textarea><button class="btn petit" data-act="envoyer" ${aiDisponible()?'':'disabled'}>Envoyer</button></div>
    <div class="ligne-btns"><label class="btn sec petit" id="photoLabel" style="cursor:pointer"><input type="file" id="photo" accept="image/*" hidden> Ajouter une photo</label>${photoEnAttente ? `<span class="pastille p-accent">photo prête : ${esc(photoEnAttente.contexte)}</span>` : ''}${coachCtl ? '<button class="btn sec petit" data-act="stop">Stop</button>' : ''}</div>
    <p class="muted small" id="photoInfo">Photo : repas, étiquette, matériel, position d'exercice, suivi physique. Les photos envoyées au coach passent par Claude pour l'analyse ; elles ne sont gardées que si tu coches « garder dans mon suivi ».</p></div>`;
  html += `<details><summary>Ce que mon coach sait de moi (${mem.length})</summary><p class="muted small">Préférences que tu as validées. Tu peux en retirer.</p>${mem.length ? mem.map((m,i) => `<div class="log"><div><span class="small">${esc(m)}</span><button data-act="mem-del" data-i="${i}" style="color:var(--attention);font-weight:700">retirer</button></div></div>`).join('') : '<p class="muted small">Rien pour l\'instant. Le coach proposera d\'en retenir quand c\'est utile.</p>'}<div class="ligne-btns" style="margin-top:8px"><input type="text" id="memNew" placeholder="Ajouter moi-même une préférence…" style="flex:1"><button class="btn sec petit" data-act="mem-add">Ajouter</button></div><p class="muted small">Le profil (objectifs, calories, notes) se modifie depuis Repas → « Mes besoins » (espace Mohamed).</p></details>`;
  html += `<p class="muted small">Le coach explique, propose et oriente ; il ne remplace pas un médecin. Conversations privées à ce profil dans cette app.</p>`;
  const valMsg = $('#msg')?.value; $('#ecran-coach').innerHTML = html; if (valMsg) $('#msg').value = valMsg;
  const chat = $('#chat'); if (chat) chat.scrollTop = chat.scrollHeight;
  const inp = $('#photo'); if (inp) { inp.onchange = () => choisirPhoto(inp.files[0]); }
}
function decrireAction(a){ switch (a.type) { case 'remplacer_repas': return `Remplacer le repas du ${a.moment==='matin'?'matin':a.moment==='midiF'?'midi':'soir'} (${a.date}) par « ${a.recette} »`; case 'ajouter_course': return `Ajouter « ${a.item} » à la liste de courses`; case 'noter_adaptation': return `Noter sur la séance du ${a.date} : « ${a.texte} »`; case 'difficulte_semaine': return `Passer ${P_of(a.profil).prenom} en « ${a.niveau} » pour la semaine du ${a.lundi}`; case 'memoire': return `Retenir : « ${a.texte} »`; case 'cible_kcal': return `Cible de ${P_of(a.profil).prenom} : ${a.kcal} kcal / ${a.prot} g protéines`; default: return JSON.stringify(a); } }
async function appliquerAction(a){
  if (a.type === 'remplacer_repas') { if (!RECETTES[a.recette]) { toast('Recette inconnue'); return; } const sw = { ...(D.repas[a.date]||{}) }; sw[a.moment] = a.recette; await store.set('repas', a.date, sw); }
  else if (a.type === 'ajouter_course') { const c = { ...(D.courses.actuelle||{ coches: {}, extras: [] }) }; c.extras = [...(c.extras||[]), a.item]; await store.set('courses', 'actuelle', c); }
  else if (a.type === 'noter_adaptation') { const k = profilActif+'_'+a.date; const l = D.logs[k] || { profil: profilActif, date: a.date, seance: seanceDu(profilActif, fromIso(a.date))?.key, statut: 'commencee', exos: {}, adaptations: [] }; l.adaptations = [...(l.adaptations||[]), a.texte]; await store.set('logs', k, l); }
  else if (a.type === 'difficulte_semaine') { if (profilActif !== 'mohamed' && a.profil !== profilActif) { toast('Tu ne peux modifier que ta propre difficulté'); return; } if (profilActif === 'firdaous' && SERIES_PAR_NIVEAU[a.niveau] > SERIES_PAR_NIVEAU[planSemaine(a.lundi).difficulte.firdaous]) { toast('Depuis ton espace tu peux alléger, pas durcir : demande à Mohamed'); return; } const plan = JSON.parse(JSON.stringify(planSemaine(a.lundi))); plan.difficulte[a.profil] = a.niveau; plan.lundi = a.lundi; plan.modifs = [...(plan.modifs||[]), { t: `${P_of(a.profil).prenom} → ${a.niveau} (via le coach)`, q: fmtCourt(auj()) }]; await store.set('semaines', a.lundi, plan); }
  else if (a.type === 'memoire') { const c = { ...(D.coach[profilActif]||{}) }; c.memoire = [...(c.memoire||[]), a.texte]; await store.set('coach', profilActif, c); }
  else if (a.type === 'cible_kcal') { if (profilActif !== 'mohamed') { toast('Seul l\'espace Mohamed modifie les calories'); return; } const p = { ...P_of(a.profil), kcalCible: +a.kcal, protCible: +a.prot }; await store.set('profils', a.profil, p); }
  toast('Appliqué');
}
async function envoyer(texte){
  if (!aiDisponible()) { toast('Clé IA manquante : réglages ⚙'); return; } const st = chatState[profilActif]; texte = (texte||'').trim(); if (!texte && !photoEnAttente) return;
  const ph = photoEnAttente; photoEnAttente = null;
  const userTurn = { role: 'user', content: texte || (ph ? 'Voici une photo (' + ph.contexte + ').' : ''), img: ph?.apercu };
  st.turns.push(userTurn); st.pending = 'Le coach réfléchit…'; st.actions = null; rCoach();
  const turns = [{ role: 'user', content: contexteCoach(profilActif) }, ...st.turns.slice(-10).map(t => ({ role: t.role, content: t.content + (t.img && t !== userTurn ? ' [photo envoyée précédemment]' : '') }))];
  if (ph) turns[turns.length-1].content += `\n[Photo jointe — contexte : ${ph.contexte}. ${ph.contexte==='Mon repas' ? 'Identifie les aliments visibles, donne une fourchette calorique approximative et demande les quantités manquantes ; ne devine pas les huiles cachées.' : ph.contexte==='Une étiquette alimentaire' ? 'Lis les ingrédients et valeurs nutritionnelles ; demande une photo plus nette si illisible.' : ph.contexte==='Une position pendant un exercice' ? 'Commente la position visible avec des repères généraux ; une image isolée ne vérifie pas tout le mouvement ni ne diagnostique une blessure.' : ph.contexte==='Mon suivi physique' ? 'Décris prudemment ce qui est visible ; aucun diagnostic, aucun taux de graisse, aucune quantité de muscle. Rappelle les conditions comparables.' : 'Réponds à la question à partir de ce qui est visible.'}]`;
  coachCtl = new AbortController();
  try {
    const imgs = ph ? [await fileToB64(ph.blob)] : undefined;
    const raw = await askAI(turns, { signal: coachCtl.signal, images: imgs });
    const res = parseJsonTolerant(raw);
    const rep = res && res.reponse ? String(res.reponse) : raw;
    st.turns.push({ role: 'assistant', content: rep }); st.actions = res && Array.isArray(res.actions) ? res.actions.filter(a => a && a.type) : [];
  } catch (e) { st.turns.push({ role: 'assistant', content: e.code === 'not_granted' ? 'Clé IA refusée : vérifie-la dans les réglages.' : e.code === 'rate_limited' ? 'Trop de questions d\'un coup : réessaie dans une minute.' : e.name === 'AbortError' ? 'Arrêté.' : 'Le coach n\'a pas pu répondre (' + (e.message || e.code || 'réseau') + ').' }); }
  st.pending = null; coachCtl = null;
  const c = { ...(D.coach[profilActif]||{}) }; c.turns = st.turns.slice(-12).map(t => ({ role: t.role, content: t.content })); store.set('coach', profilActif, c);
}
function choisirPhoto(file){ if (!file) return; const contextes = ['Mon repas','Une étiquette alimentaire','Mon matériel','Une position pendant un exercice','Mon suivi physique','Une autre question']; const url = URL.createObjectURL(file);
  ouvrir(btnRetour('Annuler') + `<h1>Ta photo</h1><img src="${url}" alt="" style="max-height:260px;border-radius:14px;object-fit:contain"><div class="carte"><div class="champ"><label>C'est quoi ?</label><div class="choix" id="ctx">${contextes.map((c,i)=>`<button data-c="${esc(c)}" class="${i===0?'on':''}">${esc(c)}</button>`).join('')}</div></div>${(getSb() && session) ? `<label class="check" id="garder"><span class="box"></span><span class="txt">Garder dans mon suivi (privé, dans cette app)</span></label>` : '<p class="muted small">Connecte-toi (⚙) pour pouvoir garder des photos dans ton suivi ; sinon elle est analysée puis oubliée.</p>'}<p class="muted small">Analyse : la photo est envoyée à Claude (compte connecté) pour cette réponse uniquement. Suivi physique : mêmes conditions à chaque fois. Les photos ne sont jamais publiées.</p><button class="btn" id="okPhoto">Joindre au message</button></div>`);
  let ctx = contextes[0], garder = false; $('#overlay').onclick = async ev => { const b = ev.target.closest('#ctx [data-c]'); if (b) { ctx = b.dataset.c; $$('#ctx button').forEach(x=>x.classList.toggle('on', x===b)); } if (ev.target.closest('#garder')) { garder = !garder; $('#garder').classList.toggle('on', garder); $('#garder .box').textContent = garder ? '✓' : ''; } if (ev.target.id === 'okPhoto') { photoEnAttente = { blob: file, contexte: ctx, apercu: url }; if (garder && getSb() && session) { try { const small = await fileToB64(file, 1600); const up = await photoUpload(small.blob); await store.set('photos', profilActif+'_'+Date.now(), { profil: profilActif, date: iso(auj()), id: up.id, contexte: ctx }); toast('Photo gardée dans ton suivi'); } catch(e){ toast('Photo non gardée (' + (e.code||'erreur') + ')'); } } fermerTout(); afficherOnglet('coach'); } }; }
async function bilanMois(m){ if (!aiDisponible()) { toast('Clé IA manquante : réglages ⚙'); return; } const d = auj(); const logs = Object.values(D.logs).filter(l => l.profil === profilActif && l.statut !== 'commencee'); const poids = Object.values(D.mesures).filter(x => x.profil === profilActif); const prompt = contexteCoach(profilActif) + `\n\nTÂCHE : rédige le bilan à ${m} mois de ${P().prenom}, en français, structuré avec ces titres : Mesuré · Progrès observés · Régularité · Difficultés · À maintenir · 1 à 3 adaptations prioritaires. Distingue objectifs, projections et résultats réels ; si une donnée manque, dis-le au lieu d'inventer. Total séances enregistrées : ${logs.length}. Pesées : ${poids.filter(x=>x.poids).map(x=>x.date+' '+x.poids).join(', ')||'aucune'}. Mensurations : ${poids.filter(x=>x.taille).map(x=>x.date+' taille '+x.taille).join(', ')||'aucune'}. Réponds par {"reponse": "<bilan>", "actions": []}.`; toast('Le coach rédige le bilan…'); try { const raw = await askAI([{ role: 'user', content: prompt }]); const res = parseJsonTolerant(raw); const txt = res?.reponse || raw; await store.set('bilans', profilActif+'_M'+m, { resume: txt, date: iso(d) }); toast('Bilan enregistré'); } catch(e){ toast('Bilan impossible (' + (e.code||'erreur') + ')'); } }

// ===== Réglages =====
function ouvrirReglages(){
  const co = !!(getSb() && session);
  ouvrir(btnRetour() + `<h1>Réglages</h1>
  <div class="carte"><div class="etiquette">Compte (le même sur vos deux téléphones)</div>${co ? `<p>Connecté : <strong>${esc(session.user.email||'')}</strong></p><button class="btn sec petit" data-act="deconnexion">Se déconnecter</button>` : `<div class="champ"><label for="cfgEmail">E-mail</label><input type="text" id="cfgEmail" value="${esc(CFG.email)}" autocomplete="username"></div><div class="champ"><label for="cfgPass">Mot de passe</label><input type="password" id="cfgPass" autocomplete="current-password" style="font:inherit;color:var(--ink);background:var(--blanc);border:2px solid var(--ligne);border-radius:14px;padding:11px;min-height:48px;width:100%"></div><div class="ligne-btns"><button class="btn petit" data-act="connexion">Se connecter</button><button class="btn sec petit" data-act="creer">Créer le compte</button></div>`}<p class="muted small">Firdaous se connecte avec le même e-mail et mot de passe : vous partagez tout (calendrier, courses), chacun son espace.</p></div>
  <div class="carte"><div class="etiquette">Serveur (Supabase)</div><div class="champ"><label for="cfgUrl">URL du projet</label><input type="text" id="cfgUrl" value="${esc(CFG.url)}" placeholder="https://xxxx.supabase.co"></div><div class="champ"><label for="cfgKey">Clé anon (publique)</label><input type="text" id="cfgKey" value="${esc(CFG.anonKey)}" placeholder="eyJ…"></div></div>
  <div class="carte"><div class="etiquette">Coach IA (Anthropic)</div><div class="champ"><label for="cfgAi">Clé API</label><input type="text" id="cfgAi" value="${esc(CFG.aiKey)}" placeholder="sk-ant-…"></div><div class="champ"><label for="cfgModel">Modèle</label><input type="text" id="cfgModel" value="${esc(CFG.aiModel)}"></div><p class="muted small">La clé reste sur ce téléphone. Les questions et photos partent directement chez Anthropic, jamais ailleurs.</p></div>
  <button class="btn" data-act="cfg-save">Enregistrer</button>
  <div class="carte"><div class="etiquette">Mes données</div><div class="ligne-btns"><button class="btn sec petit" data-act="export">Exporter</button><button class="btn sec petit" data-act="import">Restaurer</button></div></div>
  <p class="muted small">Bsaha v3 · ${modeStockage==='db'?'synchronisé':'local'}</p>`, ouvrirReglages);
}

// ===== Overlays =====
const pile = []; let overlayRefaire = null;
function ouvrir(html, refaire){ const o = $('#overlay'); if (!o.hidden && !ouvrir._remplace) pile.push(o._refaire || null); ouvrir._remplace = false; o._refaire = refaire || null; overlayRefaire = refaire || null; o.onclick = null; o.oninput = null; o.innerHTML = `<div class="int">${html}</div>`; o.hidden = false; document.body.style.overflow = 'hidden'; o.scrollTop = 0; }
function fermer(){ const o = $('#overlay'); if (pile.length) { const prev = pile.pop(); if (prev) { ouvrir._remplace = true; prev(); return; } } fermerTout(); }
function fermerTout(){ pile.length = 0; const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; o.onclick = null; o.oninput = null; document.body.style.overflow = ''; rendre(); }
const btnRetour = (t='Retour') => `<button class="retour" data-act="fermer">‹ ${t}</button>`;
function ouvrirExport(){ const txt = JSON.stringify(D); ouvrir(btnRetour() + `<h1>Exporter</h1><p class="muted">Copie ce texte et garde-le. Restaurer : coller dans « Restaurer ».</p><textarea id="exp" style="min-height:200px;font-size:.75rem">${esc(txt)}</textarea><button class="btn sec" id="copier">Copier</button>`); $('#copier').onclick = async () => { try { await navigator.clipboard.writeText(txt); toast('Copié'); } catch(e){ $('#exp').select(); toast('Sélectionne et copie'); } }; }
function ouvrirImport(){ ouvrir(btnRetour() + `<h1>Restaurer</h1><p class="muted">Colle un export. Les enregistrements existants sont conservés, ceux de l'export sont ajoutés ou remplacés.</p><textarea id="imp" style="min-height:200px;font-size:.75rem"></textarea><button class="btn" id="doImp">Restaurer</button>`); $('#doImp').onclick = async () => { try { const o = JSON.parse($('#imp').value); if (!o.profils) throw 0; for (const c of COLLS) for (const [id, v] of Object.entries(o[c]||{})) await store.set(c, id, v); fermerTout(); toast('Données restaurées'); } catch(e){ toast('Texte non reconnu'); } }; }

// ===== Événements =====
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'fermer') { if (runState && runState.mode === 'run' && !$('#overlay').hidden && pile.length === 0) { runState = null; } fermer(); }
  else if (a === 'tab') afficherOnglet(b.dataset.tab);
  else if (a === 'commencer') { if (!$('#overlay').hidden) { pile.length = 0; } ouvrir._remplace = true; ouvrirSeance(b.dataset.p, b.dataset.date, 'run'); }
  else if (a === 'voir') ouvrirSeance(b.dataset.p, b.dataset.date, 'voir');
  else if (a === 'deplacer') deplacerSeance(b.dataset.p, b.dataset.date);
  else if (a === 'checkin') ouvrirCheckin(b.dataset.p, b.dataset.date);
  else if (a === 'preparer') ouvrirPreparer(b.dataset.lundi);
  else if (a === 'fiche') ouvrir(btnRetour() + ficheHtml(b.dataset.p, b.dataset.k), () => ouvrir(btnRetour() + ficheHtml(b.dataset.p, b.dataset.k)));
  else if (a === 'sem') { semaineVue += +b.dataset.n; rSem(); }
  else if (a === 'jour') { jourSel = jourSel === b.dataset.date ? null : b.dataset.date; rSem(); }
  else if (a === 'aller') { runState.i = +b.dataset.i; ouvrir._remplace = true; ouvrirSeance(runState.profil, runState.dateK, 'run'); }
  else if (a === 'set-ok') { const l = D.logs[runState.logK]; const c = contenuSeance(runState.profil, fromIso(runState.dateK), l.court?{court:true}:{}); const e = c.exos.find(x => x.k === b.dataset.k); l.exos[e.k] = l.exos[e.k] || { sets: Array.from({length: e.series}, () => ({ reps:'', charge:'', done:false })) }; const s = l.exos[e.k].sets[+b.dataset.j]; s.done = !s.done; if (s.done && !s.reps) s.reps = String(e.reps).split('–')[0]; const y = $('#overlay').scrollTop; await store.set('logs', runState.logK, l); ouvrir._remplace = true; ouvrirSeance(runState.profil, runState.dateK, 'run'); $('#overlay').scrollTop = y; if (s.done) chrono(e.repos); }
  else if (a === 'chrono') chrono(+b.dataset.s);
  else if (a === 'trop-dur') { const l = D.logs[runState.logK]; const ex = exoInfo(runState.profil, b.dataset.k); l.adaptations = [...(l.adaptations||[]), `${ex.nom} → version facile (${ex.facile})`]; await store.set('logs', runState.logK, l); toast('Noté : ' + ex.facile); ouvrir._remplace = true; ouvrirSeance(runState.profil, runState.dateK, 'run'); }
  else if (a === 'mat-indispo') { const l = D.logs[runState.logK]; const ex = exoInfo(runState.profil, b.dataset.k); const alt = ex.alt || ex.progression || 'variante libre'; l.adaptations = [...(l.adaptations||[]), `${ex.nom} → ${alt}`]; await store.set('logs', runState.logK, l); toast('Alternative : ' + alt); ouvrir._remplace = true; ouvrirSeance(runState.profil, runState.dateK, 'run'); }
  else if (a === 'manque-temps') { const l = D.logs[runState.logK]; l.court = true; l.adaptations = [...(l.adaptations||[]), 'Raccourcie (manque de temps) : prioritaires, 2 séries, repos ≤ 60 s']; await store.set('logs', runState.logK, l); runState.i = 0; toast('Séance raccourcie : les exercices prioritaires restent'); ouvrir._remplace = true; ouvrirSeance(runState.profil, runState.dateK, 'run'); }
  else if (a === 'terminer') terminerSeance();
  else if (a === 'cardio-fait') { const k = 'mohamed_cardio_'+b.dataset.date; if (D.logs[k]) await store.del('logs', k); else await store.set('logs', k, { profil: 'mohamed', date: b.dataset.date, seance: 'cardio', statut: 'cardio' }); }
  else if (a === 'recette') ouvrirRecette(b.dataset.nom, b.dataset.p || profilActif);
  else if (a === 'menu-jour') { menuJourVue = +b.dataset.n; rRepas(); }
  else if (a === 'exo-filtre') { exoFiltre = b.dataset.z; rExos(); }
  else if (a === 'reglages') ouvrirReglages();
  else if (a === 'progres') { ouvrir(btnRetour() + '<div id="ecran-progres"></div>'); rProg(); }
  else if (a === 'connexion') { const e = $('#cfgEmail').value.trim(), p = $('#cfgPass').value; if (await connexion(e, p, false)) { fermerTout(); } }
  else if (a === 'creer') { const e = $('#cfgEmail').value.trim(), p = $('#cfgPass').value; if (await connexion(e, p, true)) { fermerTout(); } }
  else if (a === 'deconnexion') { await deconnexion(); fermerTout(); }
  else if (a === 'cfg-save') { CFG.url = $('#cfgUrl').value.trim().replace(/\/$/, ''); CFG.anonKey = $('#cfgKey').value.trim(); CFG.aiKey = $('#cfgAi').value.trim(); CFG.aiModel = $('#cfgModel').value.trim() || 'claude-sonnet-4-5'; cfgSave(); sb = null; toast('Réglages enregistrés'); ouvrir._remplace = true; ouvrirReglages(); }
  else if (a === 'swap') ouvrirSwap(b.dataset.date, b.dataset.m);
  else if (a === 'shaker') { const k = b.dataset.date; const cur = D.shaker[k]; if (cur?.pris) { ouvrir(btnRetour() + `<h1>Mon shaker</h1><div class="carte"><p>Enregistré aujourd'hui (${cur.portion==='petite'?'petite portion ≈ 450 kcal':'portion normale ≈ 650 kcal'}).</p><div class="ligne-btns"><button class="btn sec petit" data-sh="normale">Portion normale</button><button class="btn sec petit" data-sh="petite">Petite portion</button><button class="btn danger petit" data-sh="annuler">Annuler la saisie</button></div></div>`); } else { ouvrir(btnRetour() + `<h1>Mon shaker</h1><div class="carte"><p>Quelle portion ?</p><div class="ligne-btns"><button class="btn petit" data-sh="normale">Normale (≈ 650 kcal)</button><button class="btn sec petit" data-sh="petite">Petite faim (≈ 450 kcal)</button></div></div>`); } $('#overlay').onclick = async e2 => { const x = e2.target.closest('[data-sh]'); if (!x) return; if (x.dataset.sh === 'annuler') await store.del('shaker', k); else await store.set('shaker', k, { pris: true, portion: x.dataset.sh, date: k }); fermerTout(); }; }
  else if (a === 'raccourci') { const map = { 'Il manque un ingrédient': 'Il me manque un ingrédient pour le repas prévu : propose un remplacement simple avec ce que j\'ai probablement, et l\'ajout aux courses si besoin.', 'Je n\'ai que dix minutes': 'Je n\'ai que dix minutes pour manger : propose un repas rapide qui respecte ma cible.', 'Je mange à l\'extérieur': 'Je mange à l\'extérieur ce repas : que choisir et comment ajuster le reste de la journée ?', 'J\'ai peu faim': 'J\'ai peu faim aujourd\'hui : comment adapter mes repas' + (profilActif==='firdaous' ? ' et mon shaker' : '') + ' sans casser l\'objectif ?', autre: 'Je veux un autre repas que celui prévu ' + (menuJourVue===0?'aujourd\'hui':'ce jour-là') + ' : propose 2 options de la liste et applique celle que je choisis.' }; afficherOnglet('coach'); envoyer(map[b.dataset.r] || b.dataset.r); }
  else if (a === 'coche') { const c = { ...(D.courses.actuelle||{ coches: {}, extras: [] }) }; c.coches = { ...(c.coches||{}) }; if (c.coches[b.dataset.nom]) delete c.coches[b.dataset.nom]; else c.coches[b.dataset.nom] = true; await store.set('courses', 'actuelle', c); }
  else if (a === 'extra-add') { const v = $('#extraItem').value.trim(); if (!v) return; const c = { ...(D.courses.actuelle||{ coches: {}, extras: [] }) }; c.extras = [...(c.extras||[]), v]; await store.set('courses', 'actuelle', c); }
  else if (a === 'coches-reset') { const c = { ...(D.courses.actuelle||{}) , coches: {} }; await store.set('courses', 'actuelle', c); }
  else if (a === 'cible-save') { const pr = b.dataset.p; const p = { ...P_of(pr), kcalCible: +$('#kc-'+pr).value || P_of(pr).kcalCible, protCible: +$('#pr-'+pr).value || P_of(pr).protCible, objectifPoids: +$('#op-'+pr).value || P_of(pr).objectifPoids, objectifMois: +$('#om-'+pr).value || P_of(pr).objectifMois }; await store.set('profils', pr, p); toast('Objectifs de ' + p.prenom + ' enregistrés'); }
  else if (a === 'poids-add') { const inp = $('#poidsVal') || $('#poidsAuj'); const v = parseFloat(inp.value); if (!v) return; const date = $('#poidsDate')?.value || iso(auj()); const k = profilActif+'_'+date; const cur = D.mesures[k] || { profil: profilActif, date }; await store.set('mesures', k, { ...cur, poids: v }); toast('Pesée enregistrée'); }
  else if (a === 'poids-del') { const k = profilActif+'_'+b.dataset.date; const cur = { ...D.mesures[k] }; delete cur.poids; if (Object.keys(cur).length <= 2) await store.del('mesures', k); else await store.set('mesures', k, cur); }
  else if (a === 'mesures-add') { const date = iso(auj()); const k = profilActif+'_'+date; const cur = D.mesures[k] || { profil: profilActif, date }; const o = { ...cur }; ['taille','hanches','bras','cuisse'].forEach(f => { const v = parseFloat($('#m-'+f).value); if (v) o[f] = v; }); await store.set('mesures', k, o); toast('Mensurations enregistrées'); }
  else if (a === 'bilan-hebdo') { const lundi = iso(lundiDe(auj())); const k = profilActif+'_S'+lundi; const bh = D.bilans[k] || { ok:'', ko:'', adj:'' }; ouvrir(btnRetour() + `<h1>Bilan de la semaine</h1><div class="carte"><div class="champ"><label for="b1">Ce qui a marché</label><textarea id="b1">${esc(bh.ok)}</textarea></div><div class="champ"><label for="b2">Ce qui a coincé</label><textarea id="b2">${esc(bh.ko)}</textarea></div><div class="champ"><label for="b3">Ce qu'on ajuste</label><textarea id="b3">${esc(bh.adj)}</textarea></div><button class="btn" id="okB">Enregistrer</button></div>`); $('#okB').onclick = async () => { await store.set('bilans', k, { ok: $('#b1').value, ko: $('#b2').value, adj: $('#b3').value, profil: profilActif, lundi }); fermerTout(); toast('Bilan enregistré'); }; }
  else if (a === 'bilan-mois') { const b2 = D.bilans[profilActif+'_M'+b.dataset.m]; if (b2) ouvrir(btnRetour() + `<h1>Bilan ${b.dataset.m} mois</h1><div class="carte"><p style="white-space:pre-wrap">${esc(b2.resume)}</p><button class="btn sec petit" data-act="bilan-regen" data-m="${b.dataset.m}">Regénérer avec le coach</button></div>`); else bilanMois(+b.dataset.m); }
  else if (a === 'bilan-regen') { fermerTout(); bilanMois(+b.dataset.m); }
  else if (a === 'photo-del') { try { await photoDelete(b.dataset.id); } catch(e){} const k = Object.keys(D.photos).find(x => D.photos[x].id === b.dataset.id); if (k) await store.del('photos', k); toast('Photo supprimée'); }
  else if (a === 'q') { envoyer(b.dataset.q); }
  else if (a === 'envoyer') { const t = $('#msg').value; $('#msg').value = ''; envoyer(t); }
  else if (a === 'stop') { coachCtl?.abort(); }
  else if (a === 'action-ok') { const st = chatState[profilActif]; const act = st.actions[+b.dataset.i]; await appliquerAction(act); st.actions.splice(+b.dataset.i, 1); rCoach(); }
  else if (a === 'action-non') { const st = chatState[profilActif]; st.actions.splice(+b.dataset.i, 1); rCoach(); toast('Proposition annulée'); }
  else if (a === 'mem-del') { const c = { ...(D.coach[profilActif]||{}) }; c.memoire = (c.memoire||[]).filter((_,i) => i !== +b.dataset.i); await store.set('coach', profilActif, c); }
  else if (a === 'mem-add') { const v = $('#memNew').value.trim(); if (!v) return; const c = { ...(D.coach[profilActif]||{}) }; c.memoire = [...(c.memoire||[]), v]; await store.set('coach', profilActif, c); }
  else if (a === 'export') ouvrirExport();
  else if (a === 'import') ouvrirImport();
});
$$('nav.tabs button').forEach(b => b.addEventListener('click', () => afficherOnglet(b.dataset.tab)));
$('#btnReglages').addEventListener('click', ouvrirReglages);
$$('.profil-switch button').forEach(b => b.addEventListener('click', () => setProfil(b.dataset.profil)));

(async () => { document.documentElement.dataset.profil = profilActif; $$('.profil-switch button').forEach(b => b.classList.toggle('on', b.dataset.profil === profilActif)); $('#ecran-aujourdhui').innerHTML = '<p class="muted">Chargement…</p>'; await initStore(); afficherOnglet('aujourdhui'); })();

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(()=>{}); }
