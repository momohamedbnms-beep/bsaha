// ===== Bsaha v3 — stockage =====
const COLLS = ['couple','profils','logs','mesures','shaker'];
const D = Object.fromEntries(COLLS.map(c => [c, {}]));
let sb = null, session = null, pret = false, rtChannel = null;
const LS_CLE = 'bsaha.v3', LS_CFG = 'bsaha.cfg';
const CFG = (() => { try { return Object.assign({ url:'', anonKey:'', email:'' }, JSON.parse(localStorage.getItem(LS_CFG)||'{}')); } catch(e){ return { url:'', anonKey:'', email:'' }; } })();
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

// ===== séance du jour =====
function nbSeancesAvant(p, d){
  const r = REG(), deb = dde(r.debut), j = r.jours[p] || [];
  if (d < deb) return -1;
  let n = 0;
  for (let x = new Date(deb); x <= d; x = plus(x,1)) if (j.includes(x.getDay())) { if (iso(x) === iso(d)) return n; n++; }
  return -1;
}
function seanceDuJour(p, d){
  const r = REG(); if (!(r.jours[p]||[]).includes(d.getDay())) return null;
  const n = nbSeancesAvant(p, d); if (n < 0) return null;
  const rot = p === 'mohamed' ? ROTATION_M[4] : ROTATION_F[4];
  return rot[n % rot.length];
}
const titre = (p,k) => p === 'mohamed' ? (k[0] === 'H' ? 'Haut du corps' : 'Bas du corps') : ((SEANCES[k]||{}).sous || k);
const defSeance = (p, k) => (p === 'mohamed' ? SEANCES_M : SEANCES)[k];
const exosDe = (p, k) => { const s = defSeance(p, k); if (!s) return []; return s.exos.map(e => Object.assign({}, e, { fiche: (p === 'mohamed' ? EXOS_M : EXOS)[e.k] })); };
const lid = (p, d) => p + '_' + (typeof d === 'string' ? d : iso(d));
function log(p, d){ return D.logs[lid(p,d)] || { p, d: (typeof d === 'string' ? d : iso(d)), exos:{}, cardio:false, repas:{}, fait:false }; }
async function majLog(p, d, f){ const l = JSON.parse(JSON.stringify(log(p,d))); f(l); await store.set('logs', lid(p,d), l); }
function zonesDe(p, k){
  const ex = exosDe(p, k); const z = [];
  ex.forEach(e => (e.fiche?.zone || '').split('·').forEach(x => { const t = x.trim(); if (t && !z.includes(t)) z.push(t); }));
  return z.slice(0, 3);
}
function progSeance(p, d, k){ const ex = exosDe(p, k); if (!ex.length) return 0; const l = log(p,d); return Math.round(ex.filter(e => l.exos[e.k]).length / ex.length * 100); }

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
  rest:'<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'
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
function rJour(p, ds){
  const d = dde(ds), r = REG(), l = log(p, ds), k = seanceDuJour(p, d), h = [];
  if (p === 'firdaous'){
    const sh = D.shaker[ds] || {}, pris = sh.pris === true, non = sh.pris === false;
    h.push('<div class="card r" style="text-align:center;padding:19px 20px">'+
      '<div class="bell'+(pris?' ok':'')+'">'+svg(I.bell)+'</div>'+
      '<div class="eyebrow">Tous les jours</div><h2>Ton shaker</h2>'+
      '<div class="duo"><button class="y'+(pris?' sel':'')+'" data-a="sh1">'+svg(I.check)+'Pris</button>'+
      '<button class="n'+(non?' sel':'')+'" data-a="sh0">'+svg(I.x)+'Pas pris</button></div></div>');
  }
  if (k){
    const s = defSeance(p, k), z = zonesDe(p, k), pct = progSeance(p, ds, k), n = exosDe(p,k).length;
    h.push('<button class="card v" data-a="go-exos">'+ring(pct)+
      '<div class="ic">'+svg(I.halt)+'</div><div style="margin-top:14px">'+
      '<div class="eyebrow">Séance du jour · '+n+' exercices</div><h2>'+esc(titre(p,k))+'</h2>'+
      '<div class="tags">'+z.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div></button>');
  } else {
    h.push('<div class="card b"><div class="ic">'+svg(I.rest)+'</div><div style="margin-top:14px">'+
      '<div class="eyebrow">Aujourd’hui</div><h2>Repos</h2><div class="sub">Marche, étirements, récupération.</div></div></div>');
  }
  if (p === 'mohamed' && k){
    h.push('<div class="card g"><div class="ic">'+svg(I.run)+'</div><div style="margin-top:12px">'+
      '<div class="eyebrow">À chaque séance</div><h2>Cardio '+r.cardio.min+' min</h2>'+
      '<div class="sub">Tapis · pente '+r.cardio.pente+' % · '+String(r.cardio.vit).replace('.',',')+' km/h</div></div>'+
      '<button class="check'+(l.cardio?' on':'')+'" data-a="cardio" aria-label="Cardio fait">'+svg(I.check)+'</button></div>');
  }
  const kc = r.kcal[p] || 2100, mt = Math.round(kc*r.part.matin/10)*10, ap = kc - mt;
  const fait = (l.repas.m?mt:0) + (l.repas.a?ap:0);
  h.push('<div class="w"><div class="hrow"><div class="lab">Objectif du jour</div>'+
    '<div class="mini">'+(fait?nb(fait)+' pris':(p==='mohamed'?'perte de poids':'prise de poids'))+'</div></div>'+
    '<div class="big">'+nb(kc)+' <em>kcal</em></div>'+
    '<div class="bar"><i style="width:'+Math.round(fait/kc*100)+'%'+(p==='firdaous'?';background:linear-gradient(90deg,var(--ros1),var(--ros2))':'')+'"></i></div>'+
    '<div class="split"><button class="pa'+(l.repas.m?' on':'')+'" data-a="repas" data-k="m"><b>'+nb(mt)+'</b><i>Matin</i></button>'+
    '<button class="pa'+(l.repas.a?' on':'')+'" data-a="repas" data-k="a"><b>'+nb(ap)+'</b><i>Après-midi</i></button></div></div>');
  if (k) h.push('<button class="card '+(l.fait?'g':'b')+'" data-a="fini" style="padding:18px 22px">'+
    '<div class="eyebrow">'+(l.fait?'Bravo':'Dernière étape')+'</div><h2 style="font-size:19px">Séance terminée</h2>'+
    '<span class="check'+(l.fait?' on':'')+'" style="width:44px;height:44px;bottom:16px;right:18px">'+svg(I.check)+'</span></button>');
  $('#ec-jour').innerHTML = h.join('');
}

// --- SEMAINE ---
let semOff = 0;
function rSemaine(){
  const lun = plus(lundiDe(auj()), semOff*7), h = [];
  h.push('<div class="wsem"><div class="hrow" style="padding:0 8px"><div class="lab">Semaine du '+lun.getDate()+' '+MOIS[lun.getMonth()]+'</div>'+
    '<div style="display:flex;gap:6px"><button class="x" data-a="sem" data-n="-1" style="width:36px;height:36px" aria-label="Semaine précédente"><svg viewBox="0 0 24 24" style="transform:rotate(180deg)">'+I.chev+'</svg></button>'+
    '<button class="x" data-a="sem" data-n="1" aria-label="Semaine suivante">'+svg(I.chev)+'</button></div></div>');
  h.push('<div class="gr">'+[1,2,3,4,5,6,0].map((_,i)=>'<div class="d">'+JC[plus(lun,i).getDay()]+'</div>').join('')+'</div>');
  for (const p of ['mohamed','firdaous']){
    h.push('<div class="ltete">'+esc(PROF(p).prenom)+'</div><div class="gr">');
    for (let i = 0; i < 7; i++){
      const d = plus(lun,i), ds = iso(d), k = seanceDuJour(p,d), l = D.logs[lid(p,ds)];
      const cls = ['cell']; if (k) cls.push('prev'); if (l && l.fait) cls.push('fait'); if (ds === iso(auj())) cls.push('auj');
      h.push('<button class="'+cls.join(' ')+'" data-a="jjour" data-p="'+p+'" data-d="'+ds+'"><u>'+d.getDate()+'</u>'+(k?'<span>'+esc(k)+'</span>':'<span>·</span>')+'</button>');
    }
    h.push('</div>');
  }
  h.push('</div>');
  // scores
  const sc = ['mohamed','firdaous'].map(p => { let f = 0, t = 0; for (let i=0;i<7;i++){ const d = plus(lun,i); if (seanceDuJour(p,d)){ t++; const l = D.logs[lid(p,iso(d))]; if (l && l.fait) f++; } } return { p, f, t }; });
  h.push('<div class="vs">'+sc.map((s,i)=>'<div class="'+(i?'r':'v')+'"><i>'+esc(PROF(s.p).prenom)+'</i><b>'+s.f+'/'+s.t+'</b><u>séances faites</u></div>').join('')+'</div>');
  // shaker de la semaine
  let shn = 0; for (let i=0;i<7;i++){ const x = D.shaker[iso(plus(lun,i))]; if (x && x.pris) shn++; }
  h.push('<div class="w"><div class="hrow"><div class="lab">Shaker de Firdaous</div><div class="mini">'+shn+'/7</div></div>'+
    '<div class="bar" style="margin-top:10px"><i style="width:'+Math.round(shn/7*100)+'%;background:linear-gradient(90deg,var(--ros1),var(--ros2))"></i></div></div>');
  $('#ec-semaine').innerHTML = h.join('');
}

// --- EXOS ---
let exoSeance = null;
function rExos(p, ds){
  const d = dde(ds), k = exoSeance || seanceDuJour(p, d) || (p === 'mohamed' ? 'HA' : 'A');
  const s = defSeance(p, k), ex = exosDe(p, k), l = log(p, ds), duj = seanceDuJour(p,d) === k;
  const toutes = Object.keys(p === 'mohamed' ? SEANCES_M : SEANCES);
  const h = [];
  h.push('<div class="w" style="padding:14px 16px"><div style="display:flex;gap:7px;overflow-x:auto">'+
    toutes.map(t => '<button class="chip" data-a="seance" data-k="'+t+'" style="flex:none'+(t===k?';background:linear-gradient(142deg,var(--vio1),var(--vio2));color:#fff':'')+'">'+esc(t)+'</button>').join('')+'</div></div>');
  h.push('<div class="card v"><div class="ic">'+svg(I.halt)+'</div><div style="margin-top:12px">'+
    '<div class="eyebrow">'+esc(s.nom)+' · '+esc(s.sous)+'</div><h2>'+esc(titre(p,k))+'</h2>'+
    '<div class="sub">'+esc(s.but||'')+'</div></div></div>');
  h.push('<div class="w list">');
  ex.forEach(e => {
    const f = e.fiche || {}, im = p === 'mohamed' ? IMGM(e.k,'a') : (f.img ? IMG(f.img[0]) : '');
    const sr = e.series ? e.series+' × '+e.reps+' · '+e.repos+' s' : (f.reps||'')+' · '+(f.repos||60)+' s';
    h.push('<div class="row"><button class="th" data-a="fiche" data-k="'+esc(e.k)+'" aria-label="Voir '+esc(f.nom||e.k)+'">'+
      (im ? '<img src="'+im+'" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{innerHTML:\'\'}))">' : svg(I.img))+'</button>'+
      '<button class="rtx" data-a="fiche" data-k="'+esc(e.k)+'" style="background:none;border:0;text-align:left;min-height:44px">'+
      '<b>'+esc(f.nom||e.k)+'</b><i>'+esc(sr)+(e.parCote?' · par côté':'')+'</i></button>'+
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
  const r = REG(), h = [], series = {}, stats = {};
  for (const p of ['mohamed','firdaous']){
    const pr = PROF(p), s = seriePoids(p);
    series[p] = s;
    const dep = s.length ? s[0].poids : pr.poidsDepart, act = s.length ? s[s.length-1].poids : pr.poidsDepart;
    const delta = act - dep, but = pr.objectifPoids - dep;
    stats[p] = { pr, dep, act, delta, pct: but ? Math.max(0, Math.min(100, Math.round(delta/but*100))) : 0 };
  }
  h.push('<div class="vs">'+['mohamed','firdaous'].map((p,i)=>{ const s = stats[p];
    return '<div class="'+(i?'r':'v')+'"><i>'+esc(s.pr.prenom)+'</i><b>'+(s.delta>0?'+':'−')+kg(Math.abs(s.delta))+' kg</b>'+
      '<u>'+kg(s.dep)+' → '+kg(s.act)+' kg</u></div>'; }).join('')+'</div>');
  // objectif
  h.push('<div class="w"><div class="lab">Objectif atteint</div>'+['mohamed','firdaous'].map((p,i)=>{ const s = stats[p];
    return '<div style="margin-top:'+(i?12:10)+'px"><div class="hrow"><div style="font-size:14px;font-weight:700">'+esc(s.pr.prenom)+'</div>'+
    '<div class="mini">'+s.pct+' % · cible '+kg(s.pr.objectifPoids)+' kg</div></div>'+
    '<div class="bar"><i style="width:'+s.pct+'%'+(i?';background:linear-gradient(90deg,var(--ros1),var(--ros2))':'')+'"></i></div></div>'; }).join('')+'</div>');
  // courbe
  h.push('<div class="w"><div class="lab">Évolution</div>'+courbe(series)+
    '<div class="lg"><span><s style="background:var(--vio1)"></s>Mohamed</span><span><s style="background:var(--ros1)"></s>Firdaous</span></div></div>');
  // pesée
  const deb = dde(r.debut), jours = Math.round((auj()-deb)/864e5), prochaine = (Math.floor(jours/r.cyclePesee)+1)*r.cyclePesee - jours;
  h.push('<div class="w"><div class="hrow"><div class="lab">Pesée du trimestre</div><div class="mini">dans '+prochaine+' j</div></div>'+
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
function ouvrir(html){ const o = $('#ov'); $('#ovb').innerHTML = html; o.classList.add('on'); document.body.style.overflow = 'hidden'; }
function fermer(){ $('#ov').classList.remove('on'); $('#ovb').innerHTML = ''; document.body.style.overflow = ''; }
const ovh = (t, s) => '<div class="ovh"><div><h2>'+esc(t)+'</h2>'+(s?'<p>'+esc(s)+'</p>':'')+'</div><button class="x" data-a="fermer" aria-label="Fermer">'+svg(I.x)+'</button></div>';

function fiche(p, k){
  const f = (p === 'mohamed' ? EXOS_M : EXOS)[k]; if (!f) return;
  const h = [ovh(f.nom, f.zone + (f.mat ? ' · ' + f.mat : ''))];
  const ims = p === 'mohamed' ? [[IMGM(k,'a'),'Départ'],[IMGM(k,'b'),'Arrivée']] : (f.img ? [[IMG(f.img[0]),'Départ'],[IMG(f.img[1]),'Arrivée']] : []);
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
  for (const p of ['mohamed','firdaous']){ const s = seriePoids(p), a = s.length ? s[s.length-1].poids : PROF(p).poidsDepart;
    h.push('<label class="f">'+esc(PROF(p).prenom)+' · kg</label><input class="f" type="number" inputmode="decimal" step="0.1" id="w-'+p+'" value="'+a+'">'); }
  h.push('<button class="cta gh" data-a="pesee-ok">Enregistrer</button>');
  ouvrir(h.join(''));
}
function reglages(){
  const r = REG();
  const h = [ovh('Réglages')];
  h.push('<label class="f">Calories · Mohamed</label><input class="f" type="number" id="r-km" value="'+r.kcal.mohamed+'">');
  h.push('<label class="f">Calories · Firdaous</label><input class="f" type="number" id="r-kf" value="'+r.kcal.firdaous+'">');
  h.push('<label class="f">Cardio · minutes / pente / km-h</label><div class="nums">'+
    '<input class="f" type="number" id="r-cm" value="'+r.cardio.min+'"><input class="f" type="number" id="r-cp" value="'+r.cardio.pente+'"><input class="f" type="number" step="0.5" id="r-cv" value="'+r.cardio.vit+'"></div>');
  h.push('<label class="f">Début du programme</label><input class="f" type="date" id="r-deb" value="'+r.debut+'">');
  h.push('<label class="f">Thème</label><select class="f" id="r-th"><option value="auto">Automatique</option><option value="light">Clair</option><option value="dark">Sombre</option></select>');
  h.push('<button class="cta gh" data-a="reg-ok">Enregistrer</button>');
  h.push('<div class="sect"><h3>Synchronisation</h3><p class="sync '+(session?'ok':'local')+'"><s></s>'+(session ? 'Connecté · '+esc(CFG.email) : (sbOk() ? 'Non connecté' : 'Supabase à configurer'))+'</p></div>');
  h.push('<label class="f">URL Supabase</label><input class="f" id="s-url" value="'+esc(CFG.url)+'" placeholder="https://xxx.supabase.co">');
  h.push('<label class="f">Clé anon</label><input class="f" id="s-key" value="'+esc(CFG.anonKey)+'">');
  h.push('<label class="f">E-mail du compte partagé</label><input class="f" id="s-mail" type="email" value="'+esc(CFG.email)+'">');
  h.push('<label class="f">Mot de passe</label><input class="f" id="s-pass" type="password" autocomplete="current-password">');
  h.push('<button class="cta" data-a="sb-in">Se connecter</button>');
  h.push('<button class="cta2" data-a="sb-up">Créer le compte partagé</button>');
  if (session) h.push('<button class="cta2" data-a="sb-out">Se déconnecter</button>');
  ouvrir(h.join(''));
  const th = localStorage.getItem('bsaha.theme') || 'auto'; const sel = $('#r-th'); if (sel) sel.value = th;
}
function choixProfil(){
  const h = [ovh('Profil')];
  for (const p of ['mohamed','firdaous']) h.push('<button class="card '+(p==='mohamed'?'v':'r')+'" data-a="setp" data-p="'+p+'" style="margin-bottom:10px">'+
    '<div class="ic">'+svg(I.user)+'</div><div style="margin-top:12px"><div class="eyebrow">'+(p===profil?'Profil actif':'Basculer')+'</div>'+
    '<h2>'+esc(PROF(p).prenom)+'</h2><div class="sub">Objectif '+kg(PROF(p).objectifPoids)+' kg</div></div></button>');
  h.push('<button class="cta2" data-a="reglages">'+svg(I.gear)+' Réglages</button>');
  ouvrir(h.join(''));
}
function detailJour(p, ds){
  const d = dde(ds), k = seanceDuJour(p, d), l = log(p, ds);
  const h = [ovh(dateLongue(d), PROF(p).prenom)];
  if (k){ const s = defSeance(p,k), ex = exosDe(p,k);
    h.push('<div class="card v" style="margin-bottom:12px"><div class="eyebrow">'+esc(s.nom)+' · '+esc(s.sous)+'</div><h2>'+esc(titre(p,k))+'</h2>'+
      '<div class="tags">'+zonesDe(p,k).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>');
    h.push('<div class="w list">'+ex.map(e=>'<div class="row"><div class="rtx"><b>'+esc(e.fiche?.nom||e.k)+'</b><i>'+(e.series?e.series+' × '+e.reps:(e.fiche?.reps||''))+'</i></div>'+
      '<span class="tick'+(l.exos[e.k]?' on':'')+'">'+svg(I.check)+'</span></div>').join('')+'</div>');
    h.push('<button class="cta '+(l.fait?'':'gh')+'" data-a="fini-j" data-p="'+p+'" data-d="'+ds+'">'+(l.fait?'Annuler « terminée »':'Marquer terminée')+'</button>');
  } else h.push('<div class="card b"><div class="ic">'+svg(I.rest)+'</div><div style="margin-top:12px"><h2>Repos</h2></div></div>');
  ouvrir(h.join(''));
}

// ===== actions =====
document.addEventListener('click', async ev => {
  const nb2 = ev.target.closest('nav button');
  if (nb2){ onglet = nb2.dataset.t; if (onglet !== 'exos') exoSeance = null; vib(8); rendre(); return; }
  const el = ev.target.closest('[data-a]'); if (!el) { if (ev.target.id === 'ov') fermer(); return; }
  const a = el.dataset.a, ds = iso(auj()), p = profil;
  if (a === 'fermer') return fermer();
  if (a === 'sh1' || a === 'sh0'){ vib(12); await store.set('shaker', ds, { pris: a === 'sh1', d: ds }); return; }
  if (a === 'cardio'){ vib(12); return majLog(p, ds, l => l.cardio = !l.cardio); }
  if (a === 'repas'){ vib(10); const k = el.dataset.k; return majLog(p, ds, l => l.repas[k] = !l.repas[k]); }
  if (a === 'exo'){ vib(10); const k = el.dataset.k; return majLog(p, ds, l => { l.exos[k] = !l.exos[k]; }); }
  if (a === 'fini'){ vib(20); const k = seanceDuJour(p, auj()); return majLog(p, ds, l => { l.fait = !l.fait; l.seance = k; if (l.fait) exosDe(p,k).forEach(e => l.exos[e.k] = true); }); }
  if (a === 'fini-j'){ vib(20); const pp = el.dataset.p, dd = el.dataset.d; await majLog(pp, dd, l => { l.fait = !l.fait; l.seance = seanceDuJour(pp, dde(dd)); }); return fermer(); }
  if (a === 'go-exos'){ onglet = 'exos'; exoSeance = null; return rendre(); }
  if (a === 'seance'){ exoSeance = el.dataset.k; return rendre(); }
  if (a === 'fiche') return fiche(p, el.dataset.k);
  if (a === 'sem'){ semOff += Number(el.dataset.n); return rendre(); }
  if (a === 'jjour') return detailJour(el.dataset.p, el.dataset.d);
  if (a === 'pesee') return pesee();
  if (a === 'pesee-ok'){
    const d = iso(auj());
    for (const q of ['mohamed','firdaous']){ const v = parseFloat(($('#w-'+q)||{}).value); if (v > 20 && v < 300) await store.set('mesures', q+'_'+d, { p:q, d, poids:v }); }
    fermer(); toast('Pesée enregistrée'); return;
  }
  if (a === 'reglages') return reglages();
  if (a === 'reg-ok'){
    const r = REG(); const g = i => parseFloat(($('#'+i)||{}).value);
    r.kcal = { mohamed: g('r-km')||r.kcal.mohamed, firdaous: g('r-kf')||r.kcal.firdaous };
    r.cardio = { min: g('r-cm')||30, pente: g('r-cp')||10, vit: g('r-cv')||5.5 };
    const dv = ($('#r-deb')||{}).value; if (dv) r.debut = dv;
    const th = ($('#r-th')||{}).value || 'auto'; localStorage.setItem('bsaha.theme', th); appliqueTheme();
    await store.set('couple', 'settings', r); fermer(); toast('Enregistré'); return;
  }
  if (a === 'setp'){ profil = el.dataset.p; try { localStorage.setItem('bsaha.profil', profil); } catch(e){} fermer(); return rendre(); }
  if (a === 'sb-in' || a === 'sb-up'){
    CFG.url = ($('#s-url')||{}).value.trim(); CFG.anonKey = ($('#s-key')||{}).value.trim(); cfgSave();
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
  // migration v1 -> v3
  try {
    const v1 = JSON.parse(localStorage.getItem('bsaha.v1') || 'null');
    if (v1 && !D.couple.settings){
      for (const [id, l] of Object.entries(v1.logs || {})){
        if (!l.profil || l.seance === 'cardio') continue;
        const k = l.profil + '_' + l.date;
        D.logs[k] = { p:l.profil, d:l.date, seance:l.seance, exos:{}, cardio:false, repas:{}, fait:['complete','adaptee','partielle'].includes(l.statut) };
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
  lsSauver();
  pret = true; rendre();
  if (session){ await store.set('couple','settings', REG()); }
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js'); } catch(e){} }
})();
