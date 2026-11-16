/* Next Libris · modulo «Amici» (16/11/2026, nella copia di prova).
   Amicizia reciproca: chiedi, l'altro accetta o rifiuta. Il nome dell'app («Libreria di Piero») e' anche il nome per gli amici:
   unico (senza badare alle maiuscole), 3-20 caratteri (lettere anche accentate, numeri, spazi, punto, trattino, apostrofo).
   Ci si trova cercando il nome (da 3 lettere: uguale o che comincia cosi') o con il link d'invito (…/?amico=Nome).
   Dove si vede: parte «Amici» nel Menu, icona accanto all'ingranaggio con il numero delle richieste, avviso in cima (prima degli altri).
   Le richieste si leggono all'apertura e tornando all'app (niente email, niente Realtime: limiti del piano gratuito di Supabase).
   Desideri: «Gli amici vedono i miei desideri» (spento di partenza); la pagina di un amico mostra i suoi desideri e «Te lo regalo io»
   (lui non lo vede, gli altri amici si'). Prestiti e regali: in «Presta, vendi o regala» si sceglie un amico; il libro compare subito
   nella sua Libreria con «Prestato da …» / «Regalato da …» (un regalo che era tra i suoi desideri ci passa); la restituzione la segna
   chiunque dei due e vale per entrambi. Scelte di Piero del 16/11/2026.
   Database: supabase/002_amicizie.sql, 003_nome_unico.sql, 004_desideri_scambi.sql (ramo prove). Usa window.NL e window.NLSocial (social.js). */
(function () {
'use strict';
var NL = window.NL, S = window.NLSocial; if (!NL || !S || !S.call) return;
var esc = NL.esc, K_INV = 'catalogo-libri-amici-invito', K_SEEN = 'catalogo-libri-amici-visti';
var NAME_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ ._'-]{3,20}$/;
var K_PEND = 'catalogo-libri-amici-scambi-da-mandare', K_GOT = 'catalogo-libri-amici-ricevuti';
var swaps = [], view = null, wishes = null, libs = null, libsShow = 30, libsQ = '', recvId = '';
var me = null, list = null, loading = null, lastLoad = 0, found = null, foundQ = '', invite = null, confirmId = '', busy = '', err = '', editName = false, syncing = false;
var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>';

function rd(k) { try { return JSON.parse(NL.ls.get(k) || 'null'); } catch (e) { return null; } }
function wr(k, v) { NL.ls.set(k, v == null ? '' : JSON.stringify(v)); }
function rpc(name, body) { return S.call('/rest/v1/rpc/' + name, { method: 'POST', user: true, body: body || {} }); }
function uid() { var a = S.auth(); return a && a.uid; }
function tidy(v) { return String(v || '').replace(/^\s*@/, '').replace(/\s+/g, ' ').trim(); }
function validName(v) { return NAME_RE.test(v) && v === v.trim(); }
function aChi(n) { return (/^[aA]/.test(n) ? 'ad ' : 'a ') + n; }   // «ad Anna», «a Marco»
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
      var p = await S.call('/rest/v1/profili?select=utente,nome,desideri,libreria&id=eq.' + encodeURIComponent(uid()), { user: true });
      me = (p && p[0]) || { utente: null, nome: '', desideri: false };
      list = (await rpc('miei_amici')) || [];
      try { swaps = (await rpc('miei_scambi')) || []; await applySwaps(); } catch (e) { if (window.console) console.warn('scambi', e); }
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
  el.addEventListener('input', function (e) { if (e.target.id === 'friLibQ') { libsQ = e.target.value; libsShow = 30; var l = document.getElementById('friLibList'); if (l) l.innerHTML = libList(); } });
  el.addEventListener('change', async function (e) {
    var k = e.target.id === 'friWish' ? 'desideri' : e.target.id === 'friLib' ? 'libreria' : ''; if (!k) return;
    var on = e.target.checked, body = { id: uid() }; body[k] = on; e.target.disabled = true;
    try { await S.call('/rest/v1/profili?on_conflict=id', { method: 'POST', user: true, prefer: 'resolution=merge-duplicates,return=minimal', body: body });
      me[k] = on;
      NL.toast(k === 'desideri' ? (on ? 'I tuoi amici ora vedono i tuoi desideri.' : 'I tuoi desideri ora sono solo tuoi.') : (on ? 'I tuoi amici ora vedono la tua libreria.' : 'La tua libreria ora è solo tua.'));
      if (on) S.run && S.run(false); }
    catch (x) { e.target.checked = !on; NL.toast(nice(x)); }
    e.target.disabled = false;
  });
  return el;
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var el = document.getElementById('friSheet'); if (el && !el.hidden) close(); } });
async function open() {
  var el = sheet(); confirmId = ''; err = ''; editName = false; view = null; wishes = null; el.hidden = false; seenAll(); paint();
  await load(true);
  if (invite && me && me.utente) await findInvite();
}
function close() { var el = document.getElementById('friSheet'); if (el) el.hidden = true; found = null; foundQ = ''; editName = false; view = null; wishes = null; }
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
  } else if (view) {
    h = friendView();
  } else {
    var rec = received(), fr = friends(), se = sent();
    h += '<div class="fr-me"><span class="fr-me-n"><small>Il tuo nome</small><b>' + esc(me.utente) + '</b></span><button class="link" type="button" data-f="name">Cambia</button></div>';
    h += '<div class="fr-share"><label class="check fr-wish"><input type="checkbox" id="friLib"' + (me.libreria ? ' checked' : '') + '><span>Gli amici vedono la mia libreria<small>Titolo, autore, copertina, lettura e voto. Note, citazioni, appunti, prezzi, scaffali e prestiti restano tuoi.</small></span></label>' +
      '<label class="check fr-wish"><input type="checkbox" id="friWish"' + (me.desideri ? ' checked' : '') + '><span>Gli amici vedono i miei desideri<small>Così sanno cosa regalarti; chi ti farà un regalo resta una sorpresa.</small></span></label></div>';
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
        : '<li class="fr-row fr-go"><button class="fr-who fr-open" type="button" data-f="friend" data-id="' + esc(x.id) + '">' + nameOf(x) + '<small>Libreria, desideri, prestiti e regali</small></button><span class="n" aria-hidden="true">›</span></li>';
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
  if (a === 'friend') { openFriend(id); return; }
  if (a === 'back') { view = null; wishes = null; libs = null; confirmId = ''; paint(); return; }
  if (a === 'more') { libsShow += 30; var l = document.getElementById('friLibList'); if (l) l.innerHTML = libList(); return; }
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
    } else if (a === 'gift' || a === 'ungift') {
      try { await rpc('prenota_regalo', { amico: view, libro: id, si: a === 'gift' }); NL.toast(a === 'gift' ? 'Segnato: lo regali tu. ' + friendName(view) + ' non lo vede.' : 'Non lo regali più.'); }
      catch (x3) { NL.toast(/già prenotato/.test(x3.message) ? 'L\'ha già prenotato un altro amico.' : nice(x3)); }
      await loadWishes(); return;
    } else if (a === 'drop') {
      var x = (list || []).filter(function (y) { return y.id === id; })[0];
      await rpc('togli_amicizia', { altro: id }); confirmId = ''; if (view === id) { view = null; wishes = null; }
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

/* ---------- pagina di un amico: i suoi desideri (se li mostra) e cosa c'è tra voi ---------- */
function friendName(id) { var x = (list || []).filter(function (y) { return y.id === id; })[0]; return x ? (x.utente || x.nome || 'Il tuo amico') : 'Il tuo amico'; }
async function openFriend(id) { view = id; wishes = null; libs = null; libsShow = 30; libsQ = ''; confirmId = ''; err = ''; paint(); var si = document.querySelector('#friSheet .sheet-in'); if (si) si.scrollTop = 0; await Promise.all([loadWishes(), loadLibs()]); }
async function loadLibs() {
  var id = view; if (!id) return;
  try { var r = await rpc('libreria_di', { amico: id }); if (view === id) libs = r || { visibili: false, libri: [] }; }
  catch (e) { if (view === id) libs = { err: nice(e) }; }
  paint();
}
function libList() {
  var mine = {}; NL.books().forEach(function (b) { if (b.i && !b.w && !b.xs) mine[b.i] = 1; });
  var q = String(libsQ || '').trim().toLowerCase();
  var all = (libs && libs.libri || []).filter(function (x) { return !q || ((x.t || '') + ' ' + (x.a || '')).toLowerCase().indexOf(q) >= 0; });
  if (!all.length) return '<li class="fr-small">' + (q ? 'Nessun libro così.' : 'La sua libreria è vuota.') + '</li>';
  return all.slice(0, libsShow).map(function (x) {
    var w = NL.L && NL.L.rateWord ? NL.L.rateWord(x.rt) : '', st = x.rs === 'ok' ? 'Letto' + (w ? ' · ' + w : '') : x.rs === 'in' ? 'In lettura' : '';
    var both = x.i && mine[x.i] ? '<span class="fr-both">Ce l\'hai anche tu</span>' : '';
    return '<li class="fr-row fr-book">' + cover(x) + '<span class="fr-bk"><b>' + esc(x.t || (x.i ? 'ISBN ' + x.i : 'Senza titolo')) + '</b>' + (x.a ? '<small>' + esc(x.a) + '</small>' : '') +
      (st || both ? '<small class="fr-st">' + esc(st) + (st && both ? ' · ' : '') + both + '</small>' : '') + '</span></li>';
  }).join('') + (all.length > libsShow ? '<li class="fr-more"><button class="btn" type="button" data-f="more">Mostra altri ' + Math.min(30, all.length - libsShow) + ' (di ' + all.length + ')</button></li>' : '');
}
async function loadWishes() {
  var id = view; if (!id) return;
  try { var r = await rpc('desideri_di', { amico: id }); if (view === id) wishes = r || { visibili: false, libri: [] }; }
  catch (e) { if (view === id) wishes = { err: nice(e) }; }
  paint();
}
function cover(x) {
  return x.img && /^https:\/\//.test(x.img) ? '<img class="fr-cov" src="' + esc(x.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="fr-cov ph" aria-hidden="true">' + esc((x.t || '?').charAt(0).toUpperCase()) + '</span>';
}
function friendView() {
  var x = (list || []).filter(function (y) { return y.id === view; })[0] || { id: view, utente: '?' }, n = nameOf(x), h = '';
  h += '<button class="link fr-back" type="button" data-f="back">‹ Amici</button><p class="fr-fname">' + n + '</p>';
  h += '<section class="fr-sec"><h3 class="fr-h">I suoi desideri</h3>';
  if (!wishes) h += '<p class="fr-small">Un momento…</p>';
  else if (wishes.err) h += '<p class="msg bad">' + esc(wishes.err) + '</p>';
  else if (!wishes.visibili) h += '<p class="fr-small">' + n + ' non mostra i suoi desideri agli amici.</p>';
  else if (!wishes.libri.length) h += '<p class="fr-small">La sua lista dei desideri è vuota.</p>';
  else {
    h += '<p class="fr-small">«Te lo regalo io»: ' + n + ' non lo vede; gli altri amici sì, così non lo regalate in due.</p><ul class="fr-list">' + wishes.libri.map(function (w) {
      var act = w.prenotato === 'io' ? '<span class="fr-tag fr-mine">Lo regali tu</span><button class="link" type="button" data-f="ungift" data-id="' + esc(w.id) + '">Annulla</button>'
        : w.prenotato ? '<span class="fr-tag">Lo regala ' + esc(w.prenotato) + '</span>'
        : '<button class="btn" type="button" data-f="gift" data-id="' + esc(w.id) + '">Te lo regalo io</button>';
      return '<li class="fr-row fr-book">' + cover(w) + '<span class="fr-bk"><b>' + esc(w.t || (w.i ? 'ISBN ' + w.i : 'Senza titolo')) + '</b>' + (w.a ? '<small>' + esc(w.a) + '</small>' : '') + '</span><span class="fr-act">' + act + '</span></li>';
    }).join('') + '</ul>';
  }
  h += '</section>';
  var tra = swaps.filter(function (s) { return (s.da === view || s.a === view) && (s.stato !== 'chiuso' || s.tipo === 'regalo'); });
  h += '<section class="fr-sec"><h3 class="fr-h">Tra voi</h3>';
  h += tra.length ? '<ul class="fr-list">' + tra.map(function (s) {
    var t = '«' + esc((s.libro && s.libro.t) || 'un libro') + '»', mio = s.da === uid();
    var txt = s.tipo === 'prestito' ? (mio ? 'Gli hai prestato ' + t : 'Ti ha prestato ' + t) + (s.stato === 'reso' ? ' · restituzione da confermare' : '') : (mio ? 'Gli hai regalato ' + t : 'Ti ha regalato ' + t);
    return '<li class="fr-row"><span class="fr-who fr-swap">' + txt + '<small>' + esc(L_date(s.creato)) + '</small></span></li>';
  }).join('') + '</ul>' : '<p class="fr-small">Nessun prestito o regalo in corso.</p>';
  h += '<p class="fr-small">Per prestargli o regalargli un libro: apri il libro › «Presta, vendi o regala» › scegli ' + n + '. Lo vedrà subito nella sua Libreria.</p></section>';
  h += '<section class="fr-sec"><h3 class="fr-h">La sua libreria' + (libs && libs.visibili && libs.totale ? ' <span class="fr-n">' + libs.totale + '</span>' : '') + '</h3>';
  if (!libs) h += '<p class="fr-small">Un momento…</p>';
  else if (libs.err) h += '<p class="msg bad">' + esc(libs.err) + '</p>';
  else if (!libs.visibili) h += '<p class="fr-small">' + n + ' non mostra la sua libreria agli amici.</p>';
  else {
    if (libs.libri.length > 12) h += '<input type="search" class="fr-libq" id="friLibQ" placeholder="Cerca nella sua libreria" autocomplete="off" enterkeyhint="search" value="' + esc(libsQ) + '">';
    h += '<ul class="fr-list" id="friLibList">' + libList() + '</ul>';
  }
  h += '</section>';
  h += confirmId === view ? '<div class="fr-conf"><p>Togli <b>' + n + '</b> dagli amici?</p><div class="row-btns"><button class="btn" type="button" data-f="cancel">Annulla</button><button class="btn primary" type="button" data-f="drop" data-id="' + esc(view) + '">Togli</button></div></div>'
    : '<button class="link fr-drop" type="button" data-f="ask-drop" data-id="' + esc(view) + '">Togli dagli amici</button>';
  return h;
}
function L_date(t) { var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }

/* ---------- prestiti e regali tra amici ---------- */
var COPY = ['t', 'a', 'e', 'y', 'i', 'img', 'imgL', 'pg', 'gen', 'ds', 'dsf', 'dsl', 'se', 'sn', 'sq'];   // il prezzo e le note no
function snap(b) { var o = {}; COPY.forEach(function (k) { if (b[k]) o[k] = b[k]; }); return o; }
function friendByName(n) { n = tidy(n).toLowerCase(); return friends().filter(function (x) { return (x.utente || '').toLowerCase() === n; })[0]; }
function pend() { return rd(K_PEND) || []; }
function setPend(a) { wr(K_PEND, a.length ? a : null); }
/* dopo «Salva» in «Presta, vendi o regala» (4,5 s: il tempo di «Annulla»): se il nome è di un amico, lo vede anche lui */
NL.on('loan', function (ev) { setTimeout(function () { sendSwap(ev.id, ev.kind, ev.who, ev.old); }, 4500); });
async function sendSwap(id, kind, who, old) {
  var b = NL.get(id); if (!b || !uid()) return;
  var still = kind === 'p' ? b.p === who && !b.xs : kind === 'r' ? b.xs === 'r' && b.xa === who : false;
  var same = old && ((kind === 'p' && old.p === who && !old.xs) || (kind === 'r' && old.xs === 'r' && old.xa === who));
  if (!still && kind !== 'v' && kind !== 's') return;                      // annullato
  if (b.sx && !same) { var oldSx = b.sx; b.sx = ''; NL.save(); try { await rpc('chiudi_scambio', { id: oldSx }); } catch (e) {} }
  if (!still || b.sx) return;
  var f = friendByName(who); if (!f) return;
  try {
    var nid = await rpc('crea_scambio', { a: f.id, tipo: kind === 'p' ? 'prestito' : 'regalo', libro: snap(b), libro_id: b.id });
    b = NL.get(id); if (b) { b.sx = nid; NL.save(); }
    NL.toast((kind === 'p' ? 'Prestito' : 'Regalo') + ' visibile anche a ' + f.utente + ', nella sua app.');
    setPend(pend().filter(function (x) { return x.id !== id; }));
  } catch (e) {
    if (e.code === 'net') { setPend(pend().filter(function (x) { return x.id !== id; }).concat([{ id: id, kind: kind, who: who }])); NL.toast('Senza rete: avviso ' + f.utente + ' appena torna la connessione.'); }
    else NL.toast('Non sono riuscito ad avvisare ' + f.utente + ' (' + e.message + ').');
  }
}
/* «Restituito» (o «È tornato in libreria») da chi presta: finito anche per l'amico */
NL.on('loanBack', function (ev) { setTimeout(async function () {
  var b = NL.get(ev.id); if (!b || !b.sx || b.p || b.xs) return;
  var x = b.sx; b.sx = ''; NL.save();
  try { await rpc('chiudi_scambio', { id: x }); } catch (e) {}
}, 4500); });
/* «Prestato da Anna» toccato da chi l'ha ricevuto: l'hai restituito? */
NL.on('recv', function (id) {
  var b = NL.get(id); if (!b || b.sk !== 'p') return;
  recvId = id;
  var el = document.getElementById('recvSheet');
  if (!el) {
    el = document.createElement('div'); el.className = 'sheet fri'; el.id = 'recvSheet'; el.hidden = true;
    el.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="recvH"><h2 id="recvH">Prestato da un amico</h2><p class="msg" id="recvTxt"></p><p class="fr-small" id="recvSub"></p>' +
      '<div class="row-btns"><button class="btn" type="button" id="recvNo">Non ancora</button><button class="btn primary" type="button" id="recvYes">Restituito</button></div></div>';
    document.body.appendChild(el);
    var shut = function () { el.hidden = true; recvId = ''; };
    el.addEventListener('click', function (e) { if (e.target === el) shut(); });
    el.querySelector('#recvNo').addEventListener('click', shut);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.hidden) shut(); });
    el.querySelector('#recvYes').addEventListener('click', async function () {
      var x = NL.get(recvId); shut(); if (!x) return;
      var sx = x.sx, who = x.sda;
      if (!sx) { x.xs = 'b'; x.xa = who; x.xd = NL.today(); NL.save(); NL.refresh(); return; }
      try { await rpc('segnala_reso', { id: sx }); }                 // il prestito lo chiude chi ha prestato, quando conferma
      catch (e) { NL.toast(e.code === 'net' ? 'Senza rete: riprova quando c\'è la connessione.' : nice(e)); return; }
      x = NL.get(x.id); if (x) { x.sk = 'q'; NL.save(); NL.refresh(); }
      NL.toast(who + ' deve confermare di averlo ricevuto.');
    });
  }
  document.getElementById('recvTxt').innerHTML = 'Hai restituito <b>«' + esc(b.t || 'questo libro') + '»</b> ' + esc(aChi(b.sda)) + '?';
  document.getElementById('recvSub').textContent = b.sda + ' dovrà confermare di averlo ricevuto. Poi il libro resta nel tuo elenco come storico, in grigio.';
  el.hidden = false;
});
/* applica quello che è arrivato: libri nuovi per chi riceve, restituzioni per tutti e due */
async function applySwaps() {
  var me_ = uid(), books = NL.books(), changed = false, got = [];
  for (var i = 0; i < swaps.length; i++) {
    var s = swaps[i], mine = function (b) { return b.sx === s.id; };
    var local = books.filter(mine)[0];
    if (s.a === me_ && s.stato === 'aperto' && !s.visto) {
      if (!local) {
        var L0 = s.libro || {}, wish = s.tipo === 'regalo' && L0.i ? books.filter(function (b) { return b.w && b.i && b.i === L0.i; })[0] : null;
        if (wish) { wish.w = false; wish.ts = Date.now(); wish.rs = wish.rs || 'da'; wish.sx = s.id; wish.sk = 'r'; wish.sda = s.nome_da || ''; }
        else {
          var nb = NL.clean(Object.assign({}, L0, { id: NL.newId(), ts: Date.now(), w: false, rs: 'da', sx: s.id, sk: s.tipo === 'prestito' ? 'p' : 'r', sda: s.nome_da || '' }));
          if (nb) books.unshift(nb);
        }
        changed = true; got.push(s);
      }
      try { await rpc('segna_visto', { id: s.id }); } catch (e) {}
    }
    if (s.tipo === 'prestito' && local && s.a === me_ && !local.xs) {           // restituzione: «da confermare» o rifiutata
      if (s.stato === 'reso' && local.sk === 'p') { local.sk = 'q'; changed = true; }
      if (s.stato === 'aperto' && local.sk === 'q') { local.sk = 'p'; changed = true; NL.toast((s.nome_da || 'Il tuo amico') + ' dice di non avere ancora ricevuto «' + (local.t || 'il libro') + '».'); }
    }
    if (s.stato === 'chiuso' && s.tipo === 'prestito' && local) {
      if (s.a === me_ && (local.sk === 'p' || local.sk === 'q') && !local.xs) { local.xs = 'b'; local.xa = local.sda || s.nome_da || ''; local.xd = String(s.chiuso || '').slice(0, 10) || NL.today(); changed = true;
        NL.toast((s.nome_da || 'Il tuo amico') + ' ha segnato «' + (local.t || 'il libro') + '» come restituito.'); }
      if (s.da === me_ && local.p) { local.p = ''; local.pd = ''; local.sx = ''; changed = true;
        NL.toast((s.nome_a || 'Il tuo amico') + ' ti ha restituito «' + (local.t || 'il libro') + '».'); }
    }
  }
  if (changed) { NL.save(); NL.refresh(); }
  if (got.length) { var g = (rd(K_GOT) || []).concat(got.map(function (s) { return { id: s.id, t: (s.libro && s.libro.t) || '', da: s.nome_da || '', k: s.tipo }; })).slice(-20); wr(K_GOT, g); }
  var p = pend(); if (p.length) { setPend([]); p.forEach(function (x) { sendSwap(x.id, x.kind, x.who, null); }); }
  paintGot(); paintRet();
}
/* avviso in cima per chi ha prestato: «Bruno dice di averti restituito «X»»: Confermo / Non ancora */
function paintRet() {
  var r = swaps.filter(function (s) { return s.da === uid() && s.tipo === 'prestito' && s.stato === 'reso'; }), box = document.getElementById('friRet');
  if (!box) {
    if (!r.length) return;
    var anchor = document.getElementById('nxBox') || document.getElementById('donAsk') || document.getElementById('list'); if (!anchor) return;
    box = document.createElement('section'); box.id = 'friRet'; box.className = 'fri-note fri-ret lay-note lay-first'; box.hidden = true;
    box.innerHTML = '<div class="fn-open"><span class="fn-ico" aria-hidden="true">' + ICON + '</span><span class="fn-t"><b id="friRetT"></b><small>L\'hai ricevuto?</small></span></div>' +
      '<div class="fn-acts"><button type="button" class="fn-go" id="friRetNo">Non ancora</button><button type="button" class="fn-go fn-yes" id="friRetYes">Confermo</button></div>';
    anchor.parentNode.insertBefore(box, anchor);
    box.addEventListener('click', async function (e) {
      var yes = e.target.closest('#friRetYes'), no = e.target.closest('#friRetNo'); if (!yes && !no) return;
      var s = swaps.filter(function (x) { return x.id === box.dataset.id; })[0]; if (!s) return;
      e.target.disabled = true;
      try {
        if (yes) {
          await rpc('chiudi_scambio', { id: s.id }); s.stato = 'chiuso';
          var b = NL.books().filter(function (x) { return x.sx === s.id; })[0];
          if (b) { b.p = ''; b.pd = ''; b.sx = ''; NL.save(); NL.refresh(); }
          NL.toast('Prestito chiuso: «' + ((s.libro && s.libro.t) || 'il libro') + '» è di nuovo tuo.');
        } else { await rpc('rifiuta_reso', { id: s.id }); s.stato = 'aperto'; NL.toast((s.nome_a || 'Il tuo amico') + ' vedrà che non l\'hai ancora ricevuto.'); }
      } catch (x2) { NL.toast(nice(x2)); }
      e.target.disabled = false; paintRet(); NL.summary && NL.summary();
    });
  }
  box.hidden = !r.length;
  if (!r.length) return;
  box.dataset.id = r[0].id;
  document.getElementById('friRetT').textContent = (r[0].nome_a || 'Il tuo amico') + ' dice di averti restituito «' + ((r[0].libro && r[0].libro.t) || 'un libro') + '»';
}
/* avviso in cima: «Anna ti ha prestato «X»: è nella tua Libreria» */
function paintGot() {
  var g = rd(K_GOT) || [], box = document.getElementById('friGot');
  if (!box) {
    if (!g.length) return;
    var anchor = document.getElementById('nxBox') || document.getElementById('donAsk') || document.getElementById('list'); if (!anchor) return;
    box = document.createElement('section'); box.id = 'friGot'; box.className = 'fri-note lay-note lay-first'; box.hidden = true;
    box.innerHTML = '<div class="fn-open"><span class="fn-ico" aria-hidden="true">' + ICON + '</span><span class="fn-t"><b id="friGotT"></b><small id="friGotS"></small></span></div>' +
      '<button type="button" class="ico" id="friGotX" aria-label="Ho visto">×</button>';
    anchor.parentNode.insertBefore(box, anchor);
    box.querySelector('#friGotX').addEventListener('click', function () { wr(K_GOT, null); paintGot(); NL.summary && NL.summary(); });
  }
  box.hidden = !g.length;
  if (!g.length) return;
  var x = g[g.length - 1];
  document.getElementById('friGotT').textContent = g.length === 1 ? x.da + (x.k === 'prestito' ? ' ti ha prestato «' : ' ti ha regalato «') + x.t + '»' : g.length + ' libri da amici: prestiti e regali';
  document.getElementById('friGotS').textContent = g.length === 1 ? 'È nella tua Libreria, con «' + (x.k === 'prestito' ? 'Prestato' : 'Regalato') + ' da ' + x.da + '»' : 'Sono nella tua Libreria, con il nome di chi te li ha dati';
}

/* ---------- in «Presta, vendi o regala»: gli amici da scegliere con un tocco ---------- */
function paintLoanFriends() {
  var sh = document.getElementById('loanSheet'), who = document.getElementById('loanWhoF'); if (!sh || !who) return;
  var box = document.getElementById('loanFri');
  var kind = (sh.querySelector('#loanKind [aria-pressed="true"]') || {}).dataset; kind = kind && kind.k;
  var fr = uid() ? friends() : [];
  var show = !sh.hidden && (kind === 'p' || kind === 'r') && fr.length && !who.hidden;
  if (!box) {
    if (!show) return;
    box = document.createElement('div'); box.id = 'loanFri'; box.className = 'loan-fri';
    who.parentNode.insertBefore(box, who.nextSibling);
    box.addEventListener('click', function (e) {
      var c = e.target.closest('[data-u]'); if (!c) return;
      var inp = document.getElementById('loanWho'); inp.value = c.dataset.u; inp.dispatchEvent(new Event('input', { bubbles: true })); paintLoanFriends();
    });
  }
  box.hidden = !show; if (!show) return;
  var cur = friendByName(document.getElementById('loanWho').value);
  box.innerHTML = '<p class="fr-small">I tuoi amici su Next Libris</p><div class="chips">' + fr.slice(0, 12).map(function (x) {
    return '<button type="button" class="chip todo" data-u="' + esc(x.utente) + '" aria-pressed="' + (cur && cur.id === x.id ? 'true' : 'false') + '">' + esc(x.utente) + '</button>';
  }).join('') + '</div>' + (cur ? '<p class="fr-small fr-ok">' + esc(cur.utente) + ' lo vedrà nella sua app: ' + (kind === 'p' ? '«Prestato da ' + esc(NL.name() || 'te') + '»' : '«Regalato da ' + esc(NL.name() || 'te') + '»') + '.</p>' : '');
}
(function () {
  var sh = document.getElementById('loanSheet'); if (!sh) return;
  if (window.MutationObserver) new MutationObserver(function () { paintLoanFriends(); }).observe(sh, { attributes: true, attributeFilter: ['hidden'] });
  sh.addEventListener('click', function (e) { if (e.target.closest('#loanKind')) setTimeout(paintLoanFriends, 0); });
  sh.addEventListener('input', function (e) { if (e.target.id === 'loanWho') paintLoanFriends(); });
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
window.NLAmici = { open: open, load: load, state: function () { return { me: me, list: list, invite: invite, swaps: swaps }; } };   // per le prove
})();
