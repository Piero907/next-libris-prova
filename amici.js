/* Next Libris · modulo «Amici» (16/11/2026, nella copia di prova).
   Amicizia reciproca: chiedi, l'altro accetta o rifiuta. Il nome dell'app («Libreria di Piero») e' anche il nome per gli amici:
   unico (senza badare alle maiuscole), 3-20 caratteri (lettere anche accentate, numeri, spazi, punto, trattino, apostrofo).
   Ci si trova cercando il nome (da 3 lettere: uguale o che comincia cosi') o con il link d'invito (…/?amico=Nome).
   Dove si vede: parte «Amici» nel Menu, icona accanto all'ingranaggio con il numero delle richieste, avviso in cima (prima degli altri).
   Le richieste si leggono all'apertura e tornando all'app (niente email, niente Realtime: limiti del piano gratuito di Supabase).
   Database: supabase/002_amicizie.sql e 003_nome_unico.sql (ramo prove). Usa window.NL e window.NLSocial (social.js). */
(function () {
'use strict';
var NL = window.NL, S = window.NLSocial; if (!NL || !S || !S.call) return;
var esc = NL.esc, K_INV = 'catalogo-libri-amici-invito', K_SEEN = 'catalogo-libri-amici-visti';
var NAME_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ ._'-]{3,20}$/;
var me = null, list = null, loading = null, lastLoad = 0, found = null, foundQ = '', invite = null, confirmId = '', busy = '', err = '', editName = false, syncing = false;
var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>';

function rd(k) { try { return JSON.parse(NL.ls.get(k) || 'null'); } catch (e) { return null; } }
function wr(k, v) { NL.ls.set(k, v == null ? '' : JSON.stringify(v)); }
function rpc(name, body) { return S.call('/rest/v1/rpc/' + name, { method: 'POST', user: true, body: body || {} }); }
function uid() { var a = S.auth(); return a && a.uid; }
function tidy(v) { return String(v || '').replace(/^\s*@/, '').replace(/\s+/g, ' ').trim(); }
function validName(v) { return NAME_RE.test(v) && v === v.trim(); }
function nameOf(x) { return esc(x.utente || x.nome || '?'); }
var RULES = 'Da 3 a 20 caratteri: lettere, numeri, spazi, punto, trattino o apostrofo.';
function nice(e) {
  var m = String(e && e.message || e);
  if (e && e.code === 'net') return m;
  if (/utente non trovato/.test(m)) return 'Non trovo nessuno con questo nome.';
  if (/duplicate|unique|23505/.test(m) || (e && e.code === 409)) return 'Questo nome è già usato da un altro: aggiungi un\'iniziale o un numero (es. «Piero R.»).';
  if (/check|23514/.test(m)) return RULES;
  if (/troppe richieste/.test(m)) return 'Hai già tante richieste in attesa: aspetta che qualcuno risponda.';
  return 'Non ci riesco (' + m + '). Riprova tra poco.';
}

/* ---------- dati ---------- */
async function load(force) {
  if (!uid()) { me = null; list = null; paintAll(); return; }
  if (loading) return loading;
  if (!force && list && Date.now() - lastLoad < 60000) return;
  loading = (async function () {
    try {
      var p = await S.call('/rest/v1/profili?select=utente,nome&id=eq.' + encodeURIComponent(uid()), { user: true });
      me = (p && p[0]) || { utente: null, nome: '' };
      list = (await rpc('miei_amici')) || [];
      lastLoad = Date.now(); err = '';
      if (me.utente && NL.name() !== me.utente) { syncing = true; NL.setName(me.utente); syncing = false; }   // il nome per gli amici vale anche nell'app
    } catch (e) { err = nice(e); }
    loading = null; paintAll();
  })();
  return loading;
}
function friends() { return (list || []).filter(function (x) { return x.stato === 'amici'; }); }
function received() { return (list || []).filter(function (x) { return x.stato === 'attesa' && x.verso === 'ricevuta'; }); }
function sent() { return (list || []).filter(function (x) { return x.stato === 'attesa' && x.verso === 'inviata'; }); }
async function saveMine(v) {                        // il nome per gli amici (e nell'app)
  await S.call('/rest/v1/profili?on_conflict=id', { method: 'POST', user: true, prefer: 'resolution=merge-duplicates,return=minimal', body: { id: uid(), utente: v, nome: v } });
  me.utente = v; me.nome = v;
  syncing = true; NL.setName(v); syncing = false;
}
/* nome cambiato nell'app (Impostazioni › Condivisione, benvenuto, condivisione): se sei entrato vale anche per gli amici */
NL.on('name', async function (v) {
  if (syncing || !uid() || !me) return;
  v = tidy(v);
  if (v === (me.utente || '')) return;
  var back = function (msg) { if (me.utente) { syncing = true; NL.setName(me.utente); syncing = false; } NL.toast(msg); };
  if (!v) { if (me.utente) back('Il nome serve agli amici per trovarti: resta «' + me.utente + '».'); return; }
  if (!validName(v)) { back(RULES + (me.utente ? ' Resta «' + me.utente + '».' : '')); return; }
  try { await saveMine(v); NL.toast('Nome salvato: lo vedono anche i tuoi amici.'); paintAll(); }
  catch (e) { back(nice(e) + (me.utente ? ' Resta «' + me.utente + '».' : '')); }
});

/* ---------- finestra «Amici» ---------- */
function sheet() {
  var el = document.getElementById('friSheet'); if (el) return el;
  el = document.createElement('div'); el.className = 'sheet fri'; el.id = 'friSheet'; el.hidden = true;
  el.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="friH"><h2 id="friH">Amici</h2><div id="friBody"></div>' +
    '<div class="row-btns"><button class="btn" type="button" id="friClose">Chiudi</button></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click', function (e) { if (e.target === el) close(); });
  el.querySelector('#friClose').addEventListener('click', close);
  el.addEventListener('click', onClick);
  el.addEventListener('submit', onSubmit);
  return el;
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var el = document.getElementById('friSheet'); if (el && !el.hidden) close(); } });
async function open() {
  var el = sheet(); confirmId = ''; err = ''; editName = false; el.hidden = false; seenAll(); paint();
  await load(true);
  if (invite && me && me.utente) await findInvite();
}
function close() { var el = document.getElementById('friSheet'); if (el) el.hidden = true; found = null; foundQ = ''; editName = false; }
async function findInvite() {
  try { var r = await rpc('cerca_utenti', { q: invite }); found = (r || []).filter(function (x) { return (x.utente || '').toLowerCase() === invite.toLowerCase(); }); foundQ = invite; }
  catch (e) { err = nice(e); }
  if (found && !found.length) { err = 'Il link d\'invito è di «' + invite + '», ma non trovo nessuno con questo nome.'; invite = null; wr(K_INV, null); found = null; foundQ = ''; }
  paint();
}
function relBtn(x) {
  if (x.rel === 'amici') return '<span class="fr-tag">Amici</span>';
  if (x.rel === 'inviata') return '<span class="fr-tag">Richiesta inviata</span>';
  if (x.rel === 'ricevuta') return '<button class="btn primary" type="button" data-f="yes" data-id="' + esc(x.id) + '">Accetta</button>';
  return '<button class="btn primary" type="button" data-f="ask" data-u="' + esc(x.utente) + '"' + (busy === x.utente ? ' disabled' : '') + '>Chiedi l\'amicizia</button>';
}
function row(x, btns) { return '<li class="fr-row"><span class="fr-who">' + nameOf(x) + '</span><span class="fr-act">' + btns + '</span></li>'; }
function nameForm(first) {
  var v = first ? tidy(NL.name()).slice(0, 20) : me.utente;
  return '<form id="friFormU" class="fr-form"><label class="field"><span>Il tuo nome</span><input type="text" id="friU" autocomplete="nickname" spellcheck="false" enterkeyhint="done" maxlength="20" required value="' + esc(v || '') + '"></label>' +
    '<p class="fr-small">Lo vedono i tuoi amici e chi riceve i libri che condividi; è lo stesso nome di «Libreria di …». ' + RULES + ' Deve essere diverso da quello degli altri.</p>' +
    (err ? '<p class="msg bad" id="friErr">' + esc(err) + '</p>' : '') +
    '<div class="row-btns">' + (first ? '' : '<button class="btn" type="button" data-f="name-no">Annulla</button>') + '<button class="btn primary" type="submit" id="friSaveU">Salva</button></div></form>';
}
function paint() {
  var body = document.getElementById('friBody'); if (!body || document.getElementById('friSheet').hidden) return;
  var h = '';
  if (!uid()) {
    h = '<p class="msg">' + (invite ? 'Ti ha invitato <b>' + esc(invite) + '</b>. ' : '') + 'Per avere amici serve l\'account: entra con Google, poi torna qui.</p>' +
      '<button class="btn primary" type="button" data-f="login">Entra con il tuo account</button>';
  } else if (!me) {
    h = '<p class="msg">' + (err ? esc(err) : 'Un momento…') + '</p>';
  } else if (!me.utente) {
    h = '<p class="msg">' + (invite ? 'Ti ha invitato <b>' + esc(invite) + '</b>. ' : '') + 'Prima scegli il nome con cui ti trovano gli amici.</p>' + nameForm(true);
  } else if (editName) {
    h = nameForm(false);
  } else {
    var rec = received(), fr = friends(), se = sent();
    h += '<div class="fr-me"><span class="fr-me-n"><small>Il tuo nome</small><b>' + esc(me.utente) + '</b></span><button class="link" type="button" data-f="name">Cambia</button></div>';
    h += '<button class="btn primary fr-invite" type="button" data-f="invite">Invita un amico</button>';
    if (found && foundQ === invite && found.length) h += '<div class="fr-inv"><p class="fr-small">Ti ha invitato</p><ul class="fr-list">' + found.map(function (x) { return row(x, relBtn(x)); }).join('') + '</ul></div>';
    if (rec.length) h += '<section class="fr-sec"><h3 class="fr-h">Richieste per te <span class="fr-n">' + rec.length + '</span></h3><ul class="fr-list">' + rec.map(function (x) {
      return row(x, '<button class="btn" type="button" data-f="no" data-id="' + esc(x.id) + '">Rifiuta</button><button class="btn primary" type="button" data-f="yes" data-id="' + esc(x.id) + '">Accetta</button>');
    }).join('') + '</ul></section>';
    h += '<section class="fr-sec"><h3 class="fr-h">Cerca un amico</h3><form id="friFormQ" class="fr-q"><input type="search" id="friQ" placeholder="Il suo nome (almeno 3 lettere)" autocomplete="off" spellcheck="false" enterkeyhint="search" value="' + esc(foundQ && foundQ !== invite ? foundQ : '') + '"><button class="btn" type="submit">Cerca</button></form>';
    if (found && foundQ && foundQ !== invite) h += found.length ? '<ul class="fr-list">' + found.map(function (x) { return row(x, relBtn(x)); }).join('') + '</ul>' : '<p class="fr-small">Nessuno con un nome così.</p>';
    if (err) h += '<p class="msg bad" id="friErr">' + esc(err) + '</p>';
    h += '</section>';
    h += '<section class="fr-sec"><h3 class="fr-h">I tuoi amici' + (fr.length ? ' <span class="fr-n">' + fr.length + '</span>' : '') + '</h3>';
    h += fr.length ? '<ul class="fr-list">' + fr.map(function (x) {
      return confirmId === x.id ? '<li class="fr-row fr-conf"><span class="fr-who">Togli <b>' + nameOf(x) + '</b> dagli amici?</span><span class="fr-act"><button class="btn" type="button" data-f="cancel">Annulla</button><button class="btn primary" type="button" data-f="drop" data-id="' + esc(x.id) + '">Togli</button></span></li>'
        : row(x, '<button class="link" type="button" data-f="ask-drop" data-id="' + esc(x.id) + '">Togli</button>');
    }).join('') + '</ul>' : '<p class="fr-small">Ancora nessuno. Cerca un amico per nome oppure mandagli il tuo link con «Invita un amico».</p>';
    h += '</section>';
    if (se.length) h += '<section class="fr-sec"><h3 class="fr-h">Richieste che hai mandato</h3><ul class="fr-list">' + se.map(function (x) {
      return row(x, '<span class="fr-tag">In attesa</span><button class="link" type="button" data-f="drop" data-id="' + esc(x.id) + '">Annulla</button>');
    }).join('') + '</ul></section>';
    h += '<p class="fr-small">Gli altri vedono solo il tuo nome. I tuoi libri e le tue liste restano privati finché non scegli di mostrarli.</p>';
  }
  body.innerHTML = h;
}
async function onSubmit(e) {
  var f = e.target; e.preventDefault();
  if (f.id === 'friFormU') {
    var u = tidy(document.getElementById('friU').value);
    if (!validName(u)) { err = RULES; paint(); return; }
    var b = document.getElementById('friSaveU'); b.disabled = true; b.textContent = 'Salvo…';
    try { await saveMine(u); err = ''; editName = false; NL.toast('Nome salvato: ' + u + '.'); if (invite) await findInvite(); else paintAll(); }
    catch (x) { err = nice(x); paint(); var i = document.getElementById('friU'); if (i) { i.value = u; i.focus(); } }
  } else if (f.id === 'friFormQ') {
    var q = tidy(document.getElementById('friQ').value);
    if (q.length < 3) { found = null; foundQ = ''; err = 'Scrivi almeno 3 lettere del nome.'; paint(); return; }
    err = '';
    try { found = (await rpc('cerca_utenti', { q: q })) || []; foundQ = q; } catch (x) { err = nice(x); }
    paint();
  }
}
async function onClick(e) {
  var b = e.target.closest && e.target.closest('[data-f]'); if (!b) return;
  var a = b.dataset.f, id = b.dataset.id;
  if (a === 'login') { close(); S.open(); return; }
  if (a === 'invite') { shareInvite(); return; }
  if (a === 'name') { editName = true; err = ''; paint(); var i = document.getElementById('friU'); if (i) i.focus(); return; }
  if (a === 'name-no') { editName = false; err = ''; paint(); return; }
  if (a === 'ask-drop') { confirmId = id; paint(); return; }
  if (a === 'cancel') { confirmId = ''; paint(); return; }
  b.disabled = true; err = '';
  try {
    if (a === 'ask') {
      busy = b.dataset.u;
      var st = await rpc('chiedi_amicizia', { utente: b.dataset.u });
      NL.toast(st === 'amici' ? 'Ora siete amici.' : 'Richiesta mandata a ' + b.dataset.u + '.');
      if (invite && b.dataset.u.toLowerCase() === invite.toLowerCase()) { invite = null; wr(K_INV, null); }
      (found || []).forEach(function (x) { if (x.utente === b.dataset.u) x.rel = st === 'amici' ? 'amici' : 'inviata'; });
    } else if (a === 'yes' || a === 'no') {
      await rpc('rispondi_amicizia', { da: id, accetta: a === 'yes' });
      NL.toast(a === 'yes' ? 'Ora siete amici.' : 'Richiesta rifiutata.');
      (found || []).forEach(function (x) { if (x.id === id) x.rel = a === 'yes' ? 'amici' : ''; });
    } else if (a === 'drop') {
      var x = (list || []).filter(function (y) { return y.id === id; })[0];
      await rpc('togli_amicizia', { altro: id }); confirmId = '';
      NL.toast(x && x.stato === 'amici' ? 'Tolto dagli amici.' : 'Richiesta annullata.');
      (found || []).forEach(function (y) { if (y.id === id) y.rel = ''; });
    }
  } catch (x2) { err = nice(x2); }
  busy = '';
  await load(true);
}
async function shareInvite() {
  if (!uid() || !me || !me.utente) { open(); return; }
  var link = S.home() + '?amico=' + encodeURIComponent(me.utente);
  var text = 'Sono ' + me.utente + ' su Next Libris: aggiungimi tra gli amici. ' + link;
  if (navigator.share) { try { await navigator.share({ text: text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); NL.toast('Link d\'invito copiato: incollalo in un messaggio.'); }
  catch (e) { NL.toast(link); }
}

/* ---------- avviso in cima (prima degli altri avvisi: .lay-first) ---------- */
function fresh() { var seen = rd(K_SEEN) || []; return received().filter(function (x) { return seen.indexOf(x.id) < 0; }); }
function paintNote() {
  var nuove = fresh(), box = document.getElementById('friNote');
  if (!box) {
    if (!nuove.length) return;
    var anchor = document.getElementById('nxBox') || document.getElementById('donAsk') || document.getElementById('list'); if (!anchor) return;
    box = document.createElement('section'); box.id = 'friNote'; box.className = 'fri-note lay-note lay-first'; box.hidden = true;
    box.innerHTML = '<button type="button" class="fn-open" id="friNoteGo"><span class="fn-ico" aria-hidden="true">' + ICON + '</span><span class="fn-t"><b id="friNoteT"></b><small>Tocca per rispondere</small></span><span class="fn-go">Vedi</span></button>' +
      '<button type="button" class="ico" id="friNoteX" aria-label="Più tardi">×</button>';
    anchor.parentNode.insertBefore(box, anchor);
    box.querySelector('#friNoteGo').addEventListener('click', function () { open(); });
    box.querySelector('#friNoteX').addEventListener('click', function () { seenAll(); NL.summary && NL.summary(); });
  }
  box.hidden = !nuove.length;
  if (!nuove.length) return;
  var x = nuove[0];
  document.getElementById('friNoteT').textContent = nuove.length === 1 ? (x.utente || x.nome || '?') + ' vuole essere tuo amico' : nuove.length + ' richieste di amicizia';
}
function seenAll() { wr(K_SEEN, received().map(function (x) { return x.id; })); paintNote(); }

/* ---------- icona in alto, accanto all'ingranaggio, con il numero delle richieste ---------- */
function paintTop() {
  var b = document.getElementById('btnFri');
  if (!b) {
    var gear = document.getElementById('btnOpts'); if (!gear) return;
    b = document.createElement('button'); b.type = 'button'; b.id = 'btnFri'; b.className = 'ico fri-top';
    b.innerHTML = ICON + '<span class="fri-badge" id="btnFriN" hidden></span>';
    gear.parentNode.insertBefore(b, gear);
    document.documentElement.classList.add('has-fri');
    b.addEventListener('click', function () { open(); });
  }
  var n = received().length;
  var badge = document.getElementById('btnFriN'); badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n || '';
  b.setAttribute('aria-label', n ? 'Amici: ' + n + (n === 1 ? ' richiesta' : ' richieste') : 'Amici');
  b.title = 'Amici';
}

/* ---------- parte «Amici» nel Menu, subito sotto Filtri, Suggerimenti, Statistiche ---------- */
function paintMenu() {
  var m = document.getElementById('friMenu');
  if (!m) {
    var top = document.querySelector('#drawerOpts .dmain'); if (!top) return;
    var h = document.createElement('h3'); h.id = 'friMenuH'; h.textContent = 'Amici';
    m = document.createElement('div'); m.className = 'dlist dmenu'; m.id = 'friMenu';
    m.innerHTML = '<button type="button" class="dopt dgo" id="goFri"><span><b>I tuoi amici</b><small id="goFriTxt"></small></span><span class="dbadge" id="goFriN" hidden></span><span class="n" aria-hidden="true">›</span></button>' +
      '<button type="button" class="dopt dgo" id="goInv"><span><b>Invita un amico</b><small>Manda il tuo link: con un tocco ti chiede l\'amicizia</small></span><span class="n" aria-hidden="true">›</span></button>';
    top.parentNode.insertBefore(h, top.nextSibling); h.parentNode.insertBefore(m, h.nextSibling);
    m.querySelector('#goFri').addEventListener('click', function () { NL.closeDrawer(); setTimeout(open, 60); });
    m.querySelector('#goInv').addEventListener('click', function () { NL.closeDrawer(); setTimeout(shareInvite, 60); });
  }
  var t, rec = received().length, fr = friends().length;
  if (!uid()) t = 'Entra con il tuo account per trovare gli amici';
  else if (!me || !list) t = 'Richieste e amici';
  else if (!me.utente) t = 'Scegli il nome con cui ti trovano';
  else t = (rec ? rec + (rec === 1 ? ' richiesta per te' : ' richieste per te') + ' · ' : '') + (fr ? fr + (fr === 1 ? ' amico' : ' amici') : 'Ancora nessun amico');
  document.getElementById('goFriTxt').textContent = t;
  var n = document.getElementById('goFriN'); n.hidden = !rec; n.textContent = rec || '';
}
function paintAll() { paint(); paintMenu(); paintNote(); paintTop(); }

/* ---------- link d'invito: …/?amico=Nome ---------- */
(function () {
  var q = new URLSearchParams(location.search), u = tidy(q.get('amico'));
  if (q.has('amico')) {
    q.delete('amico');
    try { history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
    if (validName(u)) { wr(K_INV, u); setTimeout(open, 700); }
  }
  invite = rd(K_INV);
})();

NL.on('menu', paintMenu);
S.onAuth(function () {
  me = null; list = null; found = null; foundQ = '';
  if (uid() && invite) { var acc = document.getElementById('accSheet'); if (acc) acc.hidden = true; open(); }   // entrato dopo un invito: si riprende da li'
  else if (uid()) load(true);
  else paintAll();
});
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && uid() && Date.now() - lastLoad > 300000) load(true); });
paintTop();
if (uid()) setTimeout(function () { load(true); }, 1500);
window.NLAmici = { open: open, load: load, state: function () { return { me: me, list: list, invite: invite }; } };   // per le prove
})();
