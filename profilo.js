/* Next Libris · modulo «Profilo» (18/11/2026, giro 3, nella copia di prova).
   Pagina del profilo: foto piccola a sinistra, nome, «Su Next Libris da …», la riga dei numeri, la citazione preferita,
   tutte le citazioni e i numeri di lettura. Si apre toccando il nome in testata («Libreria di …»; da un amico è il suo
   profilo) e da Menu › Amici › Il tuo profilo.
   Foto: scattata o scelta (ritagliata al centro, 128 px, tonda) oppure quella dell'account Google; sta nella riga del
   profilo sul server e la vedono solo gli amici (chi cerca per nome vede l'iniziale).
   Agli amici, solo se scelto in «Amici e privacy»: citazione preferita, numeri (solo con la libreria visibile), tutte le
   citazioni; mai gli appunti. I numeri li calcola il telefono e li manda al profilo quando cambiano.
   «Segui i desideri» di un amico: un riassunto al giorno (campanella e push); lui non lo sa.
   Database: supabase/018_profilo_seguiti.sql (ramo prove). Usa window.NL, window.NLSocial e window.NLAmici. */
(function () {
'use strict';
var NL = window.NL; if (!NL) return;
var esc = NL.esc, K = 'catalogo-libri-profilo', K_FOTO = 'catalogo-libri-amici-foto';
var FOTO_RE = /^(data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+\/]+=*|https:\/\/lh[0-9]\.googleusercontent\.com\/[A-Za-z0-9_=.\/-]+)$/;
function rd(k) { try { return JSON.parse(NL.ls.get(k) || 'null'); } catch (e) { return null; } }
function wr(k, v) { NL.ls.set(k, v == null ? '' : JSON.stringify(v)); }
var my = rd(K) || {};            // foto, cit {x, t, a, pg, b, d}, t (ultima modifica qui), up (impronta dell'ultimo invio)
var pics = rd(K_FOTO) || {};     // foto degli amici: id -> { il, f }
var cur = null, data = null, mode = '', busy = false, photoOpen = false;
function A() { return window.NLAmici; }
function S() { return window.NLSocial; }
function uid() { var a = S() && S().auth && S().auth(); return (a && a.uid) || null; }
function meRow() { var a = A(); return (a && a.state && a.state().me) || null; }
function has018() { var m = meRow(); return !!(m && 'p_cit' in m); }
function okFoto(f) { f = String(f || ''); return f.length <= 20000 && FOTO_RE.test(f) ? f : ''; }
function mine() { return (NL.myBooks ? NL.myBooks() : NL.books()) || []; }
function save() { wr(K, my); }
function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return s.length + ':' + h; }
function nf(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }   // 6.100 (toLocaleString in italiano lascia «6100»)
function since(t) { var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); }

/* ---------- foto o iniziale ---------- */
function avatar(id, name, big) {
  var f = okFoto(id ? (pics[id] || {}).f : my.foto), ch = (String(name || '?').trim()[0] || '?').toUpperCase();
  return '<span class="pf-av' + (big ? ' big' : '') + (f ? ' has' : '') + '" data-pf="' + esc(id || 'me') + '" data-ch="' + esc(ch) + '" style="--pf-h:' + NL.hue(name || '') + '" aria-hidden="true">' +
    (f ? '<img src="' + esc(f) + '" alt="" referrerpolicy="no-referrer" decoding="async">' : esc(ch)) + '</span>';
}

/* ---------- i numeri (li calcola il telefono, anche per gli amici) ---------- */
function top(map) { var k = '', n = 0; Object.keys(map).forEach(function (x) { if (map[x] > n || (map[x] === n && x.localeCompare(k, 'it') < 0)) { k = x; n = map[x]; } }); return [k, n]; }
function stats() {
  var y = String(new Date().getFullYear()), bs = mine().filter(function (b) { return !b.w; });
  var read = bs.filter(function (b) { return b.rs === 'ok'; }), au = {}, ge = {}, pa = {};
  var st = { n: bs.filter(function (b) { return !b.xs; }).length, l: read.length, ly: 0, y: Number(y), pg: 0, pgy: 0, pr: bs.filter(function (b) { return b.p && !b.xs; }).length };
  read.forEach(function (b) {
    var pg = Number(b.pg) || 0, thisY = String(b.rd || '').slice(0, 4) === y;
    st.pg += pg; if (thisY) { st.ly++; st.pgy += pg; }
    var a0 = (NL.authorsOf(b) || [])[0]; if (a0) au[a0] = (au[a0] || 0) + 1;
    if (b.gen) ge[b.gen] = (ge[b.gen] || 0) + 1;
    var c = NL.wdBookCountry ? NL.wdBookCountry(b) : ''; if (c) pa[c] = (pa[c] || 0) + 1;
  });
  var ta = top(au), tg = top(ge);
  if (ta[1]) { st.au = ta[0].slice(0, 60); st.aun = ta[1]; }
  if (tg[1]) { st.ge = tg[0].slice(0, 40); st.gen = tg[1]; }
  st.pa = Object.keys(pa).sort(function (a, b) { return pa[b] - pa[a] || a.localeCompare(b); }).slice(0, 60);
  return st;
}
function myQuotes() {
  var out = [];
  mine().forEach(function (b) { (b.qs || []).forEach(function (c) { if (c && c.x) out.push({ x: c.x, pg: c.pg || '', d: c.d || 0, t: b.t || '', a: b.a || '', b: b.id }); }); });
  return out.sort(function (a, b) { return b.d - a.d; });
}
function myCit() {                 // la preferita: se la citazione c'è ancora nel libro vale il testo di adesso
  var c = my.cit; if (!c || !c.x) return null;
  var q = myQuotes().filter(function (x) { return x.b === c.b && x.d === c.d; })[0];
  return q ? { x: q.x.slice(0, 600), t: q.t.slice(0, 120), a: q.a.slice(0, 120), pg: q.pg, b: q.b, d: q.d } : c;
}
function firstTs() { var t = 0; mine().forEach(function (b) { var x = Number(b.ts) || 0; if (x && (!t || x < t)) t = x; }); return t; }

/* ---------- server: mando foto, citazione e numeri quando cambiano; su un telefono nuovo riprendo foto e citazione ---------- */
async function push() {
  if (!uid() || !has018() || busy) return;
  var m = meRow();
  if (!my.t && !my.got) { my.got = 1; var f0 = okFoto(m.foto); if (f0) my.foto = f0; if (m.cit && m.cit.x) my.cit = m.cit; save(); paintPics(); }
  var body = { foto: okFoto(my.foto), cit: myCit(), stat: stats() }, sig = hash(JSON.stringify(body));
  if (sig === my.up) return;
  busy = true;
  try {
    await S().call('/rest/v1/profili?on_conflict=id', { method: 'POST', user: true, prefer: 'resolution=merge-duplicates,return=minimal', body: Object.assign({ id: uid() }, body) });
    my.up = sig; save();
  } catch (e) { if (window.nlErr && !(e && e.code === 'net')) nlErr(e); }
  busy = false;
}
async function loadPics() {
  var a = A(); if (!a || !uid()) return;
  var fr = ((a.state().list) || []).filter(function (x) { return x.stato === 'amici'; }), ids = {}, need = [], ch = false;
  fr.forEach(function (x) {
    ids[x.id] = 1;
    if (!x.foto_il) { if (pics[x.id]) { delete pics[x.id]; ch = true; } }
    else if (!pics[x.id] || pics[x.id].il !== x.foto_il) need.push(x);
  });
  Object.keys(pics).forEach(function (id) { if (!ids[id]) { delete pics[id]; ch = true; } });
  if (need.length) {
    try {
      var r = (await a.rpc('foto_amici', { ids: need.slice(0, 60).map(function (x) { return x.id; }) })) || [], got = {};
      r.forEach(function (x) { got[x.id] = okFoto(x.foto); });
      need.slice(0, 60).forEach(function (x) { if (got[x.id]) pics[x.id] = { il: x.foto_il, f: got[x.id] }; else delete pics[x.id]; });
      ch = true;
    } catch (e) { if (window.nlErr && !(e && e.code === 'net')) nlErr(e); }
  }
  if (ch) { try { wr(K_FOTO, pics); } catch (e) { if (window.nlErr) nlErr(e); } paintPics(); }
}
function paintPics() {             // le foto arrivate dopo: si aggiornano dove sono già disegnate
  Array.prototype.forEach.call(document.querySelectorAll('.pf-av[data-pf]'), function (el) {
    var id = el.dataset.pf, f = okFoto(id === 'me' ? my.foto : (pics[id] || {}).f), img = el.querySelector('img');
    if (f && (!img || img.getAttribute('src') !== f)) { el.innerHTML = '<img src="' + esc(f) + '" alt="" referrerpolicy="no-referrer" decoding="async">'; el.classList.add('has'); }
    else if (!f && img) { el.classList.remove('has'); el.textContent = el.dataset.ch || '?'; }
  });
}

/* ---------- foto: scatta o scegli (ritaglio al centro, 128 px), quella di Google, togli ---------- */
function setFoto(f) { my.foto = okFoto(f); my.t = Date.now(); save(); photoOpen = false; paint(); paintPics(); push(); }
function fromFile(file) {
  if (!file) return;
  var url = URL.createObjectURL(file), img = new Image();
  img.onload = function () {
    var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'), q = 0.84, out = '';
    c.width = c.height = 128;
    try {
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
      do { out = c.toDataURL('image/jpeg', q); q -= 0.12; } while (out.length > 19000 && q > 0.3);
    } catch (e) { out = ''; }
    URL.revokeObjectURL(url);
    if (okFoto(out)) { setFoto(out); NL.toast(uid() ? 'Foto salvata: la vedono solo i tuoi amici.' : 'Foto salvata su questo telefono.'); }
    else NL.toast('Non riesco a usare questa foto: provane un\'altra.');
  };
  img.onerror = function () { URL.revokeObjectURL(url); NL.toast('Non riesco a leggere questa foto.'); };
  img.src = url;
}
async function fromGoogle() {
  try {
    var j = await S().call('/auth/v1/user', { user: true }), md = (j && j.user_metadata) || {}, f = okFoto(String(md.picture || md.avatar_url || ''));
    if (f) { setFoto(f); NL.toast('Uso la foto del tuo account Google.'); } else NL.toast('Il tuo account Google non ha una foto.');
  } catch (e) { NL.toast(e && e.code === 'net' ? e.message : 'Non riesco a leggere la foto di Google. Riprova tra poco.'); }
}

/* ---------- finestra ---------- */
function sheet() {
  var el = document.getElementById('profSheet'); if (el) return el;
  el = document.createElement('div'); el.className = 'sheet fri prof'; el.id = 'profSheet'; el.hidden = true;
  el.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="profH"><h2 id="profH">Profilo</h2><div id="profBody"></div>' +
    '<input type="file" id="profFile" accept="image/*" hidden><div class="row-btns"><button class="btn" type="button" id="profClose">Chiudi</button></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click', function (e) { if (e.target === el) close(); else onClick(e); });
  el.querySelector('#profClose').addEventListener('click', close);
  el.querySelector('#profFile').addEventListener('change', function (e) { fromFile(e.target.files && e.target.files[0]); e.target.value = ''; });
  return el;
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var el = document.getElementById('profSheet'); if (el && !el.hidden) { if (mode) { mode = ''; paint(); } else close(); } } });
function close() { var el = document.getElementById('profSheet'); if (el) el.hidden = true; cur = null; data = null; mode = ''; photoOpen = false; }
async function open(id) {
  var el = sheet(); cur = id || null; data = null; mode = ''; photoOpen = false; el.hidden = false; paint();
  var si = el.querySelector('.sheet-in'); if (si) si.scrollTop = 0;
  if (!cur) { push(); return; }
  try {
    var r = await A().rpc('profilo_di', { amico: id }); if (cur !== id) return;
    data = r || {};
    var f = okFoto(data.foto), x = ((A().state().list) || []).filter(function (y) { return y.id === id; })[0];
    if (f) pics[id] = { il: (x && x.foto_il) || (pics[id] || {}).il || '', f: f }; else delete pics[id];
  } catch (e) { if (cur !== id) return; data = { err: e && e.code === 'net' ? e.message : (/does not exist|PGRST202|404/.test(String(e && e.message)) ? 'Il profilo degli amici arriva con il prossimo aggiornamento.' : 'Non riesco ad aprire il profilo. Riprova tra poco.') }; }
  paint();
}
function quoteHTML(c) {
  var src = [c.a, c.t].filter(Boolean).join(', ');
  return '<blockquote class="pf-q"><p>«' + esc(c.x) + '»</p>' + (src || c.pg ? '<footer>' + (src ? '— ' + esc(src) : '') + (c.pg ? (src ? ' · ' : '') + 'pagina ' + esc(c.pg) : '') + '</footer>' : '') + '</blockquote>';
}
function numsLine(st) {
  var y = new Date().getFullYear(), p = ['<b>' + nf(st.n) + '</b> ' + (st.n === 1 ? 'libro' : 'libri')];
  if (st.y === y) p.push('<b>' + nf(st.ly) + '</b> ' + (st.ly === 1 ? 'letto' : 'letti') + ' nel ' + y);
  var np = (st.pa || []).length; if (np) p.push('<b>' + np + '</b> ' + (np === 1 ? 'paese' : 'paesi'));
  return '<p class="pf-nums">' + p.join(' · ') + '</p>';
}
function statsHTML(st, own) {
  var y = new Date().getFullYear(), r = [];
  function row(k, v, sub) { r.push('<div class="pf-st"><dt>' + k + '</dt><dd>' + v + (sub ? ' <small>' + sub + '</small>' : '') + '</dd></div>'); }
  row('Libri letti', nf(st.l), st.pg ? nf(st.pg) + ' pagine' : '');
  if (st.y === y) row('Nel ' + y, nf(st.ly), st.pgy ? nf(st.pgy) + ' pagine' : '');
  if (st.au) row('Autore più letto', esc(st.au), st.aun + (st.aun === 1 ? ' libro' : ' libri'));
  if (st.ge) row('Genere più letto', esc(st.ge), st.gen + (st.gen === 1 ? ' libro' : ' libri'));
  if ((st.pa || []).length && NL.wdFlag) row('Paesi dei libri letti', '<span class="pf-flags">' + st.pa.filter(function (c) { return /^[A-Z]{2}$/.test(c); }).map(function (c) { return '<span title="' + esc(NL.wdCName ? NL.wdCName(c) : c) + '">' + NL.wdFlag(c) + '</span>'; }).join(' ') + '</span>');
  row('Libri prestati', nf(st.pr), st.pr ? 'adesso' : '');
  return '<section class="fr-sec"><h3 class="fr-h">' + (own ? 'I tuoi numeri' : 'I suoi numeri') + '</h3><dl class="pf-dl">' + r.join('') + '</dl></section>';
}
function head(id, name, when) {
  return '<div class="pf-top">' + avatar(id, name, true) + '<div class="pf-id"><b class="pf-name">' + esc(name || 'Senza nome') + '</b>' + (when ? '<small>Su Next Libris da ' + esc(when) + '</small>' : '') + '</div></div>';
}
function paint() {
  var el = document.getElementById('profSheet'), body = document.getElementById('profBody'); if (!el || el.hidden || !body) return;
  var h = '';
  if (cur) {                                            /* ----- il profilo di un amico ----- */
    var name = A().friendName(cur);
    document.getElementById('profH').textContent = 'Profilo di ' + name;
    if (!data) h = head(cur, name, '') + '<p class="msg">Un momento…</p>';
    else if (data.err) h = head(cur, name, '') + '<p class="msg">' + esc(data.err) + '</p>';
    else if (mode === 'cits') {
      h = '<button class="link fr-back" type="button" data-p="back">‹ Profilo</button><div class="pf-qlist">' + (data.cits || []).map(quoteHTML).join('') + '</div>';
    } else {
      h = head(cur, data.utente || name, since(data.creato));
      if (data.stat) h += numsLine(data.stat);
      h += '<section class="fr-sec pf-fol"><button class="btn' + (data.segue ? '' : ' primary') + '" type="button" data-p="segui" aria-pressed="' + !!data.segue + '">' + (data.segue ? 'Segui i suoi desideri ✓' : 'Segui i suoi desideri') + '</button>' +
        '<p class="fr-small">Un avviso al giorno quando aggiunge dei desideri. ' + esc(name) + ' non viene a saperlo.' + (data.desideri ? '' : ' Per ora non mostra i desideri agli amici: non arriva niente.') + '</p></section>';
      if (data.cit && data.cit.x) h += '<section class="fr-sec"><h3 class="fr-h">Citazione preferita</h3>' + quoteHTML(data.cit) + '</section>';
      if (data.cits && data.cits.length) h += '<ul class="fr-list fr-box"><li class="fr-row fr-go"><button class="fr-who fr-open" type="button" data-p="cits">Tutte le citazioni<small>' + data.cits.length + (data.cits.length === 1 ? ' citazione' : ' citazioni') + '</small></button><span class="n" aria-hidden="true">›</span></li></ul>';
      if (data.stat) h += statsHTML(data.stat, false);
      if (!data.stat && !(data.cit && data.cit.x) && !(data.cits && data.cits.length)) h += '<p class="fr-small">' + esc(name) + ' non mostra altro nel suo profilo.</p>';
    }
  } else {                                              /* ----- il tuo profilo ----- */
    document.getElementById('profH').textContent = 'Il tuo profilo';
    var me = meRow(), nm = NL.name(), qs = myQuotes(), c = myCit(), st = stats();
    if (mode === 'pick') {
      h = '<button class="link fr-back" type="button" data-p="back">‹ Profilo</button><p class="fr-small">Tocca la citazione che vuoi nel profilo.</p><div class="pf-qlist">' +
        qs.slice(0, 300).map(function (q, i) { return '<button type="button" class="pf-qpick" data-p="setcit" data-i="' + i + '"' + (c && c.b === q.b && c.d === q.d ? ' aria-current="true"' : '') + '>' + quoteHTML(q) + '</button>'; }).join('') + '</div>' +
        (c ? '<button class="link" type="button" data-p="nocit">Nessuna citazione preferita</button>' : '');
    } else {
      h = head(null, nm, since((me && me.creato) || firstTs()));
      h += '<p class="pf-acts"><button class="link" type="button" data-p="photo" aria-expanded="' + photoOpen + '">' + (my.foto ? 'Cambia la foto' : 'Metti una foto') + '</button></p>';
      if (photoOpen) h += '<div class="pf-photo"><button class="btn" type="button" data-p="file">Scatta o scegli una foto</button>' + (uid() ? '<button class="btn" type="button" data-p="google">Usa quella di Google</button>' : '') +
        (my.foto ? '<button class="link" type="button" data-p="nofoto">Togli la foto</button>' : '') + '<p class="fr-small">' + (uid() ? 'La vedono solo i tuoi amici.' : 'Resta su questo telefono: con l\'account la vedono i tuoi amici.') + '</p></div>';
      h += numsLine(st);
      h += '<section class="fr-sec"><h3 class="fr-h">Citazione preferita</h3>' + (c ? quoteHTML(c) : '<p class="fr-small">' + (qs.length ? 'Scegline una tra le tue citazioni.' : 'Quando salvi una citazione da un libro, qui puoi mettere la tua preferita.') + '</p>') +
        (qs.length ? '<p class="pf-acts"><button class="link" type="button" data-p="pick">' + (c ? 'Cambia' : 'Scegli la citazione') + '</button></p>' : '') + '</section>';
      if (qs.length) h += '<ul class="fr-list fr-box"><li class="fr-row fr-go"><button class="fr-who fr-open" type="button" data-p="allq">Tutte le citazioni<small>' + qs.length + (qs.length === 1 ? ' citazione' : ' citazioni') + '</small></button><span class="n" aria-hidden="true">›</span></li></ul>';
      h += statsHTML(st, true);
      if (uid() && has018()) {
        var vis = [];
        if (me.p_cit) vis.push('la citazione preferita'); if (me.p_stat && me.libreria) vis.push('i numeri'); if (me.p_cits) vis.push('tutte le citazioni');
        h += '<ul class="fr-list fr-box"><li class="fr-row fr-go"><button class="fr-who fr-open" type="button" data-p="privacy">Cosa vedono gli amici<small>' + esc('La foto' + (vis.length ? ', ' + vis.join(', ') : ' e nient\'altro')) + '</small></button><span class="n" aria-hidden="true">›</span></li></ul>';
      } else if (!uid()) h += '<p class="fr-small">Con l\'account e gli amici puoi mostrare loro la foto e, se vuoi, citazioni e numeri.</p>';
    }
  }
  body.innerHTML = h;
}
async function onClick(e) {
  var b = e.target.closest && e.target.closest('[data-p]'); if (!b) return;
  var a = b.dataset.p;
  if (a === 'back') { mode = ''; paint(); }
  else if (a === 'photo') { photoOpen = !photoOpen; paint(); }
  else if (a === 'file') document.getElementById('profFile').click();
  else if (a === 'google') { b.disabled = true; await fromGoogle(); }
  else if (a === 'nofoto') { setFoto(''); NL.toast('Foto tolta.'); }
  else if (a === 'pick' || a === 'cits') { mode = a; paint(); var si = document.querySelector('#profSheet .sheet-in'); if (si) si.scrollTop = 0; }
  else if (a === 'setcit') { var q = myQuotes()[Number(b.dataset.i)]; if (q) { my.cit = { x: q.x.slice(0, 600), t: q.t.slice(0, 120), a: q.a.slice(0, 120), pg: q.pg, b: q.b, d: q.d }; my.t = Date.now(); save(); } mode = ''; paint(); push(); }
  else if (a === 'nocit') { my.cit = null; my.t = Date.now(); save(); mode = ''; paint(); push(); }
  else if (a === 'allq') { close(); NL.openQuotes(); }
  else if (a === 'privacy') { close(); A().open(true); }
  else if (a === 'segui' && cur && data) { b.disabled = true; var on = !data.segue; if (await A().follow(cur, on)) data.segue = on; paint(); }
}

/* ---------- quando si aggiorna ---------- */
if (A() && A().onLoad) A().onLoad(function () { push(); loadPics(); if (!cur) paint(); });
else document.addEventListener('DOMContentLoaded', function () { if (A() && A().onLoad) A().onLoad(function () { push(); loadPics(); if (!cur) paint(); }); });
NL.on('privacy', function () { if (!cur) paint(); });
window.NLProfilo = { open: open, avatar: avatar, stats: stats, state: function () { return { my: my, pics: pics, cur: cur, data: data, mode: mode }; }, push: push };   // per amici.js e le prove
if (NL.renderOwner) NL.renderOwner();      // il nome in testata diventa il tasto del profilo
})();
