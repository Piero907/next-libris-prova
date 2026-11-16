/* Next Libris · modulo «Amici» (16/11/2026, nella copia di prova).
   Amicizia reciproca: chiedi, l'altro accetta o rifiuta. Ci si trova con il nome utente (ricerca da 3 lettere: uguale o che comincia
   così) o con il link d'invito (…/?amico=nomeutente). Gli avvisi delle richieste compaiono dentro l'app, all'apertura (niente email,
   niente Realtime: limiti del piano gratuito di Supabase). Database: supabase/002_amicizie.sql (ramo prove).
   Usa window.NL e window.NLSocial (social.js): senza account online (NLSocial assente) il modulo non fa niente. */
(function () {
'use strict';
var NL = window.NL, S = window.NLSocial; if (!NL || !S || !S.call) return;
var esc = NL.esc, K_INV = 'catalogo-libri-amici-invito', K_SEEN = 'catalogo-libri-amici-visti';
var me = null, list = null, loading = null, lastLoad = 0, found = null, foundQ = '', invite = null, confirmId = '', busy = '', err = '';

function rd(k) { try { return JSON.parse(NL.ls.get(k) || 'null'); } catch (e) { return null; } }
function wr(k, v) { NL.ls.set(k, v == null ? '' : JSON.stringify(v)); }
function rpc(name, body) { return S.call('/rest/v1/rpc/' + name, { method: 'POST', user: true, body: body || {} }); }
function uid() { var a = S.auth(); return a && a.uid; }
function clean(u) { return String(u || '').trim().replace(/^@/, '').toLowerCase(); }
function suggest() {
  var n = String(NL.name() || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._]+/g, '');
  return n.length >= 3 ? n.slice(0, 20) : '';
}
function who(x) { return (x.nome ? '<b>' + esc(x.nome) + '</b> ' : '') + '<span class="fr-u">@' + esc(x.utente || '?') + '</span>'; }
function nice(e) {
  var m = String(e && e.message || e);
  if (e && e.code === 'net') return m;
  if (/utente non trovato/.test(m)) return 'Nessuno con questo nome utente.';
  if (/duplicate|unique|23505/.test(m) || e.code === 409) return 'Questo nome utente è già preso: scegline un altro.';
  if (/check|23514/.test(m)) return 'Usa da 3 a 20 tra lettere minuscole, numeri, punto o trattino basso.';
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
    } catch (e) { err = nice(e); }
    loading = null; paintAll();
  })();
  return loading;
}
function friends() { return (list || []).filter(function (x) { return x.stato === 'amici'; }); }
function received() { return (list || []).filter(function (x) { return x.stato === 'attesa' && x.verso === 'ricevuta'; }); }
function sent() { return (list || []).filter(function (x) { return x.stato === 'attesa' && x.verso === 'inviata'; }); }

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
  var el = sheet(); confirmId = ''; err = ''; el.hidden = false; paint();
  await load(true);
  if (invite && me && me.utente) await findInvite();
}
function close() { var el = document.getElementById('friSheet'); if (el) el.hidden = true; found = null; foundQ = ''; }
async function findInvite() {
  try { var r = await rpc('cerca_utenti', { q: invite }); found = (r || []).filter(function (x) { return x.utente === invite; }); foundQ = invite; }
  catch (e) { err = nice(e); }
  if (found && !found.length) { err = 'Il link d\'invito è per @' + invite + ', ma non trovo nessuno con questo nome utente.'; invite = null; wr(K_INV, null); }
  paint();
}
function relBtn(x) {
  if (x.rel === 'amici') return '<span class="fr-tag">Amici</span>';
  if (x.rel === 'inviata') return '<span class="fr-tag">Richiesta inviata</span>';
  if (x.rel === 'ricevuta') return '<button class="btn primary" type="button" data-f="yes" data-id="' + esc(x.id) + '">Accetta</button>';
  return '<button class="btn primary" type="button" data-f="ask" data-u="' + esc(x.utente) + '"' + (busy === x.utente ? ' disabled' : '') + '>Chiedi l\'amicizia</button>';
}
function row(x, btns) { return '<li class="fr-row"><span class="fr-who">' + who(x) + '</span><span class="fr-act">' + btns + '</span></li>'; }
function paint() {
  var body = document.getElementById('friBody'); if (!body || document.getElementById('friSheet').hidden) return;
  var h = '';
  if (!uid()) {
    h = '<p class="msg">' + (invite ? 'Ti ha invitato <b>@' + esc(invite) + '</b>. ' : '') + 'Per avere amici serve l\'account: entra con Google, poi torna qui.</p>' +
      '<button class="btn primary" type="button" data-f="login">Entra con il tuo account</button>';
  } else if (!me) {
    h = '<p class="msg">' + (err ? esc(err) : 'Un momento…') + '</p>';
  } else if (!me.utente) {
    h = '<p class="msg">' + (invite ? 'Ti ha invitato <b>@' + esc(invite) + '</b>. ' : '') + 'Prima scegli il tuo <b>nome utente</b>: gli amici ti trovano così.</p>' +
      '<form id="friFormU" class="fr-form"><label class="field"><span>Nome utente</span><span class="fr-at"><i>@</i><input type="text" id="friU" autocomplete="username" autocapitalize="none" spellcheck="false" enterkeyhint="done" maxlength="20" required value="' + esc(suggest()) + '"></span></label>' +
      '<p class="acc-small">Da 3 a 20 tra lettere minuscole, numeri, punto o trattino basso. Lo vedono gli altri, insieme al tuo nome; la tua email no.</p>' +
      '<p class="msg bad" id="friErr"' + (err ? '' : ' hidden') + '>' + esc(err) + '</p><button class="btn primary" type="submit" id="friSaveU">Salva</button></form>';
  } else {
    var rec = received(), fr = friends(), se = sent();
    h += '<div class="fr-me"><p>Sei <b>@' + esc(me.utente) + '</b></p><button class="btn primary" type="button" data-f="invite">Invita un amico</button></div>';
    if (found && foundQ === invite && found.length) h += '<div class="fr-inv"><p class="msg">Ti ha invitato:</p><ul class="fr-list">' + found.map(function (x) { return row(x, relBtn(x)); }).join('') + '</ul></div>';
    h += '<form id="friFormQ" class="fr-form fr-q"><input type="search" id="friQ" placeholder="Cerca per nome utente" autocapitalize="none" spellcheck="false" enterkeyhint="search" value="' + esc(foundQ && foundQ !== invite ? foundQ : '') + '"><button class="btn" type="submit">Cerca</button></form>';
    if (found && foundQ && foundQ !== invite) h += found.length ? '<ul class="fr-list">' + found.map(function (x) { return row(x, relBtn(x)); }).join('') + '</ul>' : '<p class="msg">Nessuno con un nome utente così.</p>';
    if (err) h += '<p class="msg bad" id="friErr">' + esc(err) + '</p>';
    if (rec.length) h += '<h3 class="fr-h">Richieste per te <span class="fr-n">' + rec.length + '</span></h3><ul class="fr-list">' + rec.map(function (x) {
      return row(x, '<button class="btn primary" type="button" data-f="yes" data-id="' + esc(x.id) + '">Accetta</button><button class="btn" type="button" data-f="no" data-id="' + esc(x.id) + '">Rifiuta</button>');
    }).join('') + '</ul>';
    h += '<h3 class="fr-h">I tuoi amici' + (fr.length ? ' <span class="fr-n">' + fr.length + '</span>' : '') + '</h3>';
    h += fr.length ? '<ul class="fr-list">' + fr.map(function (x) {
      return confirmId === x.id ? '<li class="fr-row fr-conf"><span>Togli ' + who(x) + ' dagli amici?</span><span class="fr-act"><button class="btn" type="button" data-f="cancel">Annulla</button><button class="btn primary" type="button" data-f="drop" data-id="' + esc(x.id) + '">Sì, togli</button></span></li>'
        : row(x, '<button class="link" type="button" data-f="ask-drop" data-id="' + esc(x.id) + '">Togli</button>');
    }).join('') + '</ul>' : '<p class="msg">Ancora nessuno. Cerca un amico per nome utente oppure mandagli il tuo link con «Invita un amico».</p>';
    if (se.length) h += '<h3 class="fr-h">Richieste che hai mandato</h3><ul class="fr-list">' + se.map(function (x) {
      return row(x, '<span class="fr-tag">In attesa</span><button class="link" type="button" data-f="drop" data-id="' + esc(x.id) + '">Annulla</button>');
    }).join('') + '</ul>';
    h += '<p class="acc-small">Gli altri vedono solo il tuo nome e il tuo nome utente. Le tue liste restano private finché non scegli di mostrarle.</p>';
  }
  body.innerHTML = h;
}
async function onSubmit(e) {
  var f = e.target; e.preventDefault();
  if (f.id === 'friFormU') {
    var u = clean(document.getElementById('friU').value);
    if (!/^[a-z0-9._]{3,20}$/.test(u)) { err = nice({ message: 'check' }); paint(); return; }
    var b = document.getElementById('friSaveU'); b.disabled = true; b.textContent = 'Salvo…';
    try {
      await S.call('/rest/v1/profili?on_conflict=id', { method: 'POST', user: true, prefer: 'resolution=merge-duplicates,return=minimal', body: { id: uid(), utente: u } });
      me.utente = u; err = ''; NL.toast('Ora sei @' + u + '.');
      if (invite) await findInvite(); else paint();
    } catch (x) { err = nice(x); paint(); }
  } else if (f.id === 'friFormQ') {
    var q = clean(document.getElementById('friQ').value);
    if (q.length < 3) { found = null; foundQ = ''; err = 'Scrivi almeno 3 lettere del nome utente.'; paint(); return; }
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
  if (a === 'ask-drop') { confirmId = id; paint(); return; }
  if (a === 'cancel') { confirmId = ''; paint(); return; }
  b.disabled = true; err = '';
  try {
    if (a === 'ask') {
      busy = b.dataset.u;
      var st = await rpc('chiedi_amicizia', { utente: b.dataset.u });
      NL.toast(st === 'amici' ? 'Ora siete amici.' : 'Richiesta mandata a @' + b.dataset.u + '.');
      if (b.dataset.u === invite) { invite = null; wr(K_INV, null); }
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
  var link = S.home() + '?amico=' + encodeURIComponent(me.utente);
  var text = 'Sono @' + me.utente + ' su Next Libris: aggiungimi tra gli amici. ' + link;
  if (navigator.share) { try { await navigator.share({ text: text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); NL.toast('Link d\'invito copiato: incollalo in un messaggio.'); }
  catch (e) { NL.toast(link); }
}

/* ---------- avviso in cima: richieste nuove ---------- */
function paintNote() {
  var rec = received(), seen = rd(K_SEEN) || [], nuove = rec.filter(function (x) { return seen.indexOf(x.id) < 0; });
  var box = document.getElementById('friNote');
  if (!box) {
    if (!nuove.length) return;
    var anchor = document.getElementById('nxBox') || document.getElementById('donAsk') || document.getElementById('list'); if (!anchor) return;
    box = document.createElement('section'); box.id = 'friNote'; box.className = 'fri-note lay-note'; box.hidden = true;
    box.innerHTML = '<button type="button" class="fn-open" id="friNoteGo"><span class="fn-ico" aria-hidden="true">👋</span><span><b id="friNoteT"></b><small>Tocca per rispondere</small></span><span class="fn-go">Vedi</span></button>' +
      '<button type="button" class="ico" id="friNoteX" aria-label="Più tardi">×</button>';
    anchor.parentNode.insertBefore(box, anchor);
    box.querySelector('#friNoteGo').addEventListener('click', function () { seenAll(); open(); });
    box.querySelector('#friNoteX').addEventListener('click', function () { seenAll(); NL.summary && NL.summary(); });
  }
  box.hidden = !nuove.length;
  if (!nuove.length) return;
  var x = nuove[0];
  document.getElementById('friNoteT').textContent = nuove.length === 1 ? (x.nome || '@' + x.utente) + ' vuole essere tuo amico' : nuove.length + ' richieste di amicizia';
}
function seenAll() { wr(K_SEEN, received().map(function (x) { return x.id; })); paintNote(); }

/* ---------- voce nel Menu ---------- */
function paintMenu() {
  var b = document.getElementById('goFri');
  if (!b) {
    var m = S.menu && S.menu(); if (!m) return;
    b = document.createElement('button'); b.type = 'button'; b.id = 'goFri'; b.className = 'dopt dgo';
    b.innerHTML = '<span><b>Amici</b><small id="goFriTxt"></small></span><span class="dbadge" id="goFriN" hidden></span><span class="n" aria-hidden="true">›</span>';
    m.appendChild(b);
    b.addEventListener('click', function () { NL.closeDrawer(); setTimeout(open, 60); });
  }
  var t, rec = received().length, fr = friends().length;
  if (!uid()) t = 'Cerca gli amici per nome utente o invitali con un link';
  else if (!list) t = me && !me.utente ? 'Scegli il tuo nome utente' : 'Cerca gli amici o invitali';
  else if (me && !me.utente) t = 'Scegli il tuo nome utente';
  else t = (fr ? fr + (fr === 1 ? ' amico' : ' amici') : 'Ancora nessun amico') + (rec ? ' · ' + rec + (rec === 1 ? ' richiesta' : ' richieste') : '');
  document.getElementById('goFriTxt').textContent = t;
  var n = document.getElementById('goFriN'); n.hidden = !rec; n.textContent = rec || '';
}
function paintAll() { paint(); paintMenu(); paintNote(); }

/* ---------- link d'invito: …/?amico=nomeutente ---------- */
(function () {
  var q = new URLSearchParams(location.search), u = clean(q.get('amico'));
  if (q.has('amico')) {
    q.delete('amico');
    try { history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
    if (/^[a-z0-9._]{3,20}$/.test(u)) { wr(K_INV, u); setTimeout(open, 700); }
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
if (uid()) setTimeout(function () { load(true); }, 2500);
window.NLAmici = { open: open, load: load, state: function () { return { me: me, list: list, invite: invite }; } };   // per le prove
})();
