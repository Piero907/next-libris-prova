/* Next Libris · modulo «Come si usa»: guida di primo avvio e libreria di esempio (giro 4, 18/11/2026).
   Modulo a parte: usa solo window.NL. Per toglierlo: cancellare guida.js e guida.css e le loro righe in index.html e in SHELL di sw.js
   (togli_modulo.py, nel ramo prove). Dati suoi: 'catalogo-libri-guida' ({ seen: 1 } quando la guida è stata vista).
   - Otto schermate da sfogliare col dito, con un tocco ai lati dello schermo o con i tasti; «Salta» sempre in vista. Si apre da sola una volta,
     ai nuovi e a chi usa già l'app (al primo avvio dopo l'aggiornamento: cfg.v < GV). Si riapre da Menu › Info e aiuto › Come si usa.
   - «Prova adesso» apre la parte vera dell'app; nelle schermate 4, 5 e 6 apre la libreria di esempio.
   - Libreria di esempio: la modalità ospite dell'app (NL.guestEnter con info.esempio): solo da guardare, niente salvataggi né sincronizzazione,
     mai mescolata con i libri veri, fuori dalle statistiche. Zero chiamate: nessuna ricerca, niente Wikipedia/Wikidata (paesi e film sono
     scritti qui sotto), copertine disegnate dall'app, descrizioni brevi scritte da noi.
   REGOLA (Piero, 18/11/2026): a ogni versione vera la guida si aggiorna con le funzioni nuove (testi, «Prova adesso», prova e2e123). */
(function () {
'use strict';
var NL = window.NL;
if (!NL || !NL.guestEnter) return;
var L = NL.L, esc = NL.esc, $ = NL.$;
var LS = 'catalogo-libri-guida';
var GV = 2;                                               // versione della guida: 2 = otto schermate (giro 5); chi ha visto una versione più vecchia la rivede una volta
var cfg = {};
try { cfg = JSON.parse(NL.ls.get(LS) || '{}') || {}; } catch (e) { cfg = {}; }
function save() { NL.ls.set(LS, JSON.stringify(cfg)); }

/* ---------- le otto schermate (testi approvati da Piero il 18/11/2026; giro 5: «Aggiungi i libri» riscritta e «Trova più libri» nuova) ---------- */
var S = [
  { ico: 'tolib', h: 'Benvenuto',
    p: ['Next Libris è la tua libreria in tasca: i libri che hai, quelli che leggi e quelli che desideri.', 'È gratuita; se ti piace, puoi sostenerla.'] },
  { ico: 'scan', h: 'Aggiungi i libri', go: 'add', sel: '#layNav [data-l="add"], #btnScan',   // testo riscritto (giro 5)
    p: ['Tocca il <b>+</b> in basso e scegli come: <b>Scansiona</b> il codice a barre sul retro, <b>Fotografa</b> la copertina o <b>Digita</b> titolo o ISBN.',
      'Con <b>Per autore</b> trovi tutti i libri di uno scrittore. In negozio, <b>Ce l\'ho già?</b> ti dice se un libro ce l\'hai già.'] },
  { ico: 'gear', h: 'Trova più libri (facoltativo)', go: 'key', btn: 'Crea la chiave',   // schermata nuova: chiave e worker (giro 5)
    p: ['Next Libris cerca i libri in archivi gratuiti. Con una <b>chiave Google Libri</b>, gratuita e tua, ne trova molti di più, con copertine e descrizioni. Si crea in 5 minuti e ti guidiamo passo passo.',
      'Il <b>worker</b> aggiunge i dati delle biblioteche italiane. Se un amico ti presta la sua chiave, non devi crearla.'] },
  { ico: 'fav', h: 'La pagina del libro', go: 'book',
    p: ['Tocca un libro per aprirlo. Segna se lo stai leggendo o l\'hai già letto, dagli un voto con i <b>libricini</b>, mettilo tra i preferiti con la <b>stella</b> e tieni il segno con il <b>segnalibro</b>.',
      'La <b>matita</b> serve a correggere i dati. Se dal libro hanno tratto un film o una serie, lo trovi qui.'] },
  { ico: 'search', h: 'Trova e ordina', go: 'sort', sel: '#q, #sortBar',
    p: ['Cerca per titolo o autore, usa i <b>Filtri</b> e <b>Ordina · Raggruppa</b> (per autore, genere, paese…). Scegli tra copertine ed elenco; sulle copertine <b>due dita</b> le ingrandiscono o le rimpiccioliscono.',
      'Serie e copie dello stesso libro stanno insieme. Tocca il nome di un autore per <b>Info Autore</b>.'] },
  { ico: 'loan', h: 'Prestiti e Desideri', go: 'wish',
    p: ['Segna a chi hai prestato un libro e chi l\'ha prestato a te.', 'Nei <b>Desideri</b> metti i libri che vorresti: gli amici possono vederli e regalarteli di nascosto.'] },
  { ico: 'user', h: 'Amici e profilo', go: 'friends', mod: 'NLAmici',
    p: ['Con <b>Accedi con Google</b> i tuoi libri si salvano anche online e puoi trovare gli amici per nome. Guarda le loro librerie, chiedi <b>Me lo presti?</b> e segui i loro desideri.',
      'La <b>campanella</b> ti avvisa delle novità. Tocca il tuo nome in alto per vedere il tuo <b>profilo</b>.'] },
  { ico: 'chart', h: 'Per te',
    p: ['Suggerimenti sui tuoi autori, novità, film tratti dai tuoi libri, statistiche e <b>La tua stagione in libri</b>.', 'Ogni tanto fai un <b>backup</b> dal Menu.'],
    end: 'Rivedi questa guida quando vuoi: Menu › Info e aiuto › <b>Come si usa</b>.' }
];
/* per la prova e2e123: ogni schermata dice quale parte dell'app deve esistere */
function screens() { return S.filter(function (s) { return !s.mod || window[s.mod]; }); }

/* ---------- la guida ---------- */
var G = { el: null, i: 0, pushed: false, back: null };
function build() {
  if (G.el) return;
  var el = document.createElement('div');
  el.id = 'guida'; el.className = 'guida'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Come si usa Next Libris');
  el.innerHTML = '<div class="gd-top"><div class="gd-prog" id="gdProg" aria-hidden="true"></div><button type="button" class="gd-skip" data-gd="skip">Salta</button></div>' +
    '<div class="gd-stage" id="gdStage" aria-live="polite"></div>' +
    '<div class="gd-nav"><button type="button" class="gd-btn" data-gd="prev">‹ Indietro</button><span class="gd-n" id="gdN"></span><button type="button" class="gd-btn gd-next" data-gd="next">Avanti ›</button></div>';
  document.body.appendChild(el);
  G.el = el;
  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gd]'); if (!b) return;
    var a = b.dataset.gd;
    if (a === 'skip') close();
    else if (a === 'prev') go(G.i - 1);
    else if (a === 'next') { if (G.i >= screens().length - 1) close(); else go(G.i + 1); }
    else if (a === 'try') tryIt(b.dataset.go);
  });
  /* sfogliare col dito, come «La tua stagione in libri» */
  var x0 = null, y0 = 0;
  el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', function (e) {
    if (x0 == null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { go(G.i + (dx < 0 ? 1 : -1)); return; }
    /* tocco ai lati dello schermo (un quarto a sinistra / a destra), non su tasti o link: indietro / avanti (giro 5) */
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && !(e.target.closest && e.target.closest('button, a, input, label'))) {
      var w = window.innerWidth || 360;
      if (e.clientX < w * 0.25) go(G.i - 1);
      else if (e.clientX > w * 0.75) { if (G.i >= screens().length - 1) close(); else go(G.i + 1); }
    }
  });
  el.addEventListener('pointercancel', function () { x0 = null; });
}
function paint() {
  var list = screens(), s = list[G.i], n = list.length;
  $('#gdProg').innerHTML = list.map(function (x, k) { return '<span class="' + (k <= G.i ? 'on' : '') + '"></span>'; }).join('');
  var tries = s.go ? '<button type="button" class="btn primary gd-try" data-gd="try" data-go="' + s.go + '">' + esc(s.btn || 'Prova adesso') + '</button>' : '';
  var more = s.more ? '<p class="gd-more">' + esc(s.more.t) + ' <button type="button" class="gd-link" data-gd="try" data-go="' + s.more.go + '">Prova adesso ›</button></p>' : '';
  var ex = /^(book|sort|wish)$/.test(s.go || '') ? '<p class="gd-ex">Si apre una libreria di esempio: solo da guardare.</p>' : '';
  $('#gdStage').innerHTML = '<div class="gd-slide" data-gs="' + G.i + '"><span class="gd-ico" aria-hidden="true">' + NL.icon(s.ico) + '</span>' +
    '<h2 class="gd-h">' + esc(s.h) + '</h2>' + s.p.map(function (t) { return '<p class="gd-p">' + t + '</p>'; }).join('') +
    more + (tries ? '<div class="gd-acts">' + tries + '</div>' + ex : '') + (s.end ? '<p class="gd-end">' + s.end + '</p>' : '') + '</div>';
  $('#gdN').textContent = (G.i + 1) + ' di ' + n;
  G.el.querySelector('[data-gd="prev"]').disabled = G.i === 0;
  var nx = G.el.querySelector('[data-gd="next"]'); nx.textContent = G.i >= n - 1 ? 'Inizia' : 'Avanti ›';
}
function go(i) { if (i < 0 || i >= screens().length) return; G.i = i; paint(); }
function open(i) {
  if (NL.guest && NL.guest()) NL.guestExit();
  build();
  G.back = document.activeElement;
  G.i = Math.max(0, Math.min(i || 0, screens().length - 1));
  paint();
  G.el.hidden = false; document.body.classList.add('guida-open');
  if (!cfg.seen || (cfg.v || 1) < GV) { cfg.seen = 1; cfg.v = GV; save(); }
  if (!G.pushed) { try { history.pushState({ guida: 1 }, ''); G.pushed = true; } catch (e) { if (window.nlErr) nlErr(e); } }
  setTimeout(function () { try { G.el.querySelector('.gd-next').focus({ preventScroll: true }); } catch (e) { if (window.nlErr) nlErr(e); } }, 30);
}
function close(fromPop, keepFocus) {
  if (!G.el || G.el.hidden) return;
  G.el.hidden = true; document.body.classList.remove('guida-open');
  if (G.pushed) { G.pushed = false; if (!fromPop) { try { history.back(); } catch (e) { if (window.nlErr) nlErr(e); } } }
  if (!keepFocus) { try { if (G.back) G.back.focus({ preventScroll: true }); } catch (e) { if (window.nlErr) nlErr(e); } }
}
window.addEventListener('popstate', function () { if (G.el && !G.el.hidden) { G.pushed = false; close(true); } });
window.addEventListener('keydown', function (e) {
  if (!G.el || G.el.hidden) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); }
  else if (e.key === 'ArrowRight') { e.stopImmediatePropagation(); go(G.i + 1); }
  else if (e.key === 'ArrowLeft') { e.stopImmediatePropagation(); go(G.i - 1); }
}, true);

/* «Prova adesso»: chiude la guida e apre la parte vera (dopo che Indietro ha tolto la guida dalla cronologia) */
var fromGuide = -1;
function tryIt(what) {
  var at = G.i;
  close(false, true);
  setTimeout(function () {
    if (what === 'add') {
      var plus = document.querySelector('#layNav [data-l="add"]');
      if (plus && plus.getClientRects().length) plus.click();
      else { var d = document.getElementById('btnScan'); if (d) { d.scrollIntoView({ block: 'center' }); try { d.focus({ preventScroll: true }); } catch (e) { if (window.nlErr) nlErr(e); } } }   // disposizione «Classico»: Scansiona, Foto e Digita in basso
    } else if (what === 'key') {
      if (window.NLRicerche && window.NLRicerche.guide) window.NLRicerche.guide();
      else if (NL.openOptions) NL.openOptions('search');
    } else if (what === 'friends') {
      if (window.NLAmici && window.NLAmici.open) window.NLAmici.open();
    } else if (what === 'book' || what === 'sort' || what === 'wish') {
      enter(at, what);
    }
  }, 60);
}

/* ---------- la libreria di esempio ---------- */
var D = '2026-';
function bk(k, o) { return Object.assign({ id: 'ex' + k, ts: Date.parse(D + '01-01') - k * 864e5, g: [], c: null }, o); }
/* libri: classici, più García Márquez e Asimov (scelta di Piero); solo titolo, autore e dati; descrizioni nostre */
var BOOKS = [
  bk(1, { t: 'I promessi sposi', a: 'Alessandro Manzoni', e: 'Mondadori', y: '2002', pg: '720', gen: 'Romanzo storico', rs: 'ok', rt: 5, rd: D + '03-10', fav: true,
    ds: 'Renzo e Lucia vogliono sposarsi, ma un signorotto prepotente lo impedisce. Tra fughe, peste e carestia, la loro storia attraversa la Lombardia del Seicento.' }),
  bk(2, { t: 'I promessi sposi', a: 'Alessandro Manzoni', e: 'Einaudi', y: '2014', pg: '880', gen: 'Romanzo storico',
    ds: 'La stessa storia in un\'altra edizione, con note e commento: le due copie stanno insieme sotto un solo libro.' }),
  bk(3, { t: 'Il fu Mattia Pascal', a: 'Luigi Pirandello', e: 'Feltrinelli', y: '2015', pg: '280', gen: 'Romanzo', rs: 'in', pp: '112',
    ds: 'Un uomo legge sul giornale della propria morte e decide di approfittarne per ricominciare da capo con un altro nome.' }),
  bk(4, { t: 'Le avventure di Pinocchio', a: 'Carlo Collodi', e: 'Giunti', y: '2019', pg: '240', gen: 'Per ragazzi', rs: 'ok', rt: 4, rd: D + '01-22', p: 'Marta', pd: D + '10-02',
    ds: 'Il burattino di legno che vorrebbe diventare un bambino vero, tra bugie, cattive compagnie e un padre che non smette di cercarlo.' }),
  bk(5, { t: 'Anna Karenina', a: 'Lev Tolstoj', e: 'Garzanti', y: '2008', pg: '960', gen: 'Romanzo', rs: 'ok', rt: 4, rd: D + '07-15',
    ds: 'Nella Russia dell\'Ottocento, una donna sceglie l\'amore contro le regole della sua società, mentre accanto a lei altre vite cercano la loro strada.' }),
  bk(6, { t: 'Orgoglio e pregiudizio', a: 'Jane Austen', e: 'Rizzoli', y: '2011', pg: '400', gen: 'Romanzo', rs: 'da',
    ds: 'Elizabeth Bennet e il signor Darcy partono col piede sbagliato: una commedia di prime impressioni, famiglie e matrimoni nell\'Inghilterra di campagna.' }),
  bk(7, { t: 'Cent\'anni di solitudine', a: 'Gabriel García Márquez', e: 'Mondadori', y: '2017', pg: '380', gen: 'Realismo magico', rs: 'ok', rt: 5, rd: D + '05-04', fav: true,
    ds: 'Sette generazioni della famiglia Buendía nel paese immaginario di Macondo, dove il prodigioso e il quotidiano convivono senza stupore.' }),
  bk(8, { t: 'Cronaca di una morte annunciata', a: 'Gabriel García Márquez', e: 'Mondadori', y: '2014', pg: '120', gen: 'Romanzo',
    ds: 'Tutto il paese sa che un uomo sta per essere ucciso, eppure nessuno riesce a fermare quello che accade: una ricostruzione all\'indietro.' }),
  bk(9, { t: 'Fondazione', a: 'Isaac Asimov', e: 'Mondadori', y: '2016', pg: '260', gen: 'Fantascienza', se: 'Ciclo della Fondazione', sn: '1', rs: 'ok', rt: 4, rd: D + '08-30',
    ds: 'Un matematico prevede la caduta dell\'Impero galattico e mette in piedi un piano per accorciare i secoli bui che verranno.' }),
  bk(10, { t: 'Fondazione e Impero', a: 'Isaac Asimov', e: 'Mondadori', y: '2016', pg: '280', gen: 'Fantascienza', se: 'Ciclo della Fondazione', sn: '2',
    ds: 'Il piano deve fare i conti con un nemico che nessuno aveva previsto.' }),
  bk(11, { t: 'Seconda Fondazione', a: 'Isaac Asimov', e: 'Mondadori', y: '2017', pg: '270', gen: 'Fantascienza', se: 'Ciclo della Fondazione', sn: '3',
    ds: 'La ricerca di una seconda Fondazione nascosta chiude la prima trilogia del ciclo.' }),
  bk(12, { t: 'Il Gattopardo', a: 'Giuseppe Tomasi di Lampedusa', e: 'Feltrinelli', y: '2018', pg: '330', gen: 'Romanzo storico', w: true,
    ds: 'In Sicilia, mentre arrivano i garibaldini, un principe osserva la fine del suo mondo e capisce che tutto deve cambiare perché nulla cambi.' })
];
/* paesi e film già scritti: nessuna domanda a Wikidata (formato di app-wiki.js: c paese, b paese di nascita, f film; k = titolo del libro) */
function wdData() {
  function f(t, y, d, s, book) { var tk = L.titleKey(book), full = L.norm(book).replace(/[^a-z0-9]+/g, ' ').trim(); return { q: 'ex-' + L.norm(t + y).replace(/[^a-z0-9]+/g, ''), t: t, y: y, d: d, s: s ? 1 : 0, u: '', k: [tk, full] }; }
  var now = Date.now();
  return { '~v': 1,
    'alessandro manzoni': { q: 'ex1', c: 'IT', t: now, f: [f('I promessi sposi', 1941, 'Mario Camerini', 0, 'I promessi sposi'), f('I promessi sposi', 1989, 'Salvatore Nocita', 1, 'I promessi sposi')] },
    'luigi pirandello': { q: 'ex2', c: 'IT', t: now, f: [f('Le due vite di Mattia Pascal', 1985, 'Mario Monicelli', 0, 'Il fu Mattia Pascal')] },
    'carlo collodi': { q: 'ex3', c: 'IT', t: now, f: [f('Le avventure di Pinocchio', 1972, 'Luigi Comencini', 1, 'Le avventure di Pinocchio'), f('Pinocchio', 2019, 'Matteo Garrone', 0, 'Le avventure di Pinocchio')] },
    'lev tolstoj': { q: 'ex4', c: 'RU', t: now, f: [f('Anna Karenina', 2012, 'Joe Wright', 0, 'Anna Karenina')] },
    'jane austen': { q: 'ex5', c: 'GB', t: now, f: [f('Orgoglio e pregiudizio', 2005, 'Joe Wright', 0, 'Orgoglio e pregiudizio'), f('Orgoglio e pregiudizio', 1995, 'Simon Langton', 1, 'Orgoglio e pregiudizio')] },
    'gabriel garcia marquez': { q: 'ex6', c: 'CO', t: now, f: [f('Cent\'anni di solitudine', 2024, '', 1, 'Cent\'anni di solitudine'), f('Cronaca di una morte annunciata', 1987, 'Francesco Rosi', 0, 'Cronaca di una morte annunciata')] },
    'isaac asimov': { q: 'ex7', c: 'US', b: 'RU', t: now, f: [f('Foundation', 2021, '', 1, 'Fondazione')] },
    'giuseppe tomasi di lampedusa': { q: 'ex8', c: 'IT', t: now, f: [f('Il Gattopardo', 1963, 'Luchino Visconti', 0, 'Il Gattopardo')] }
  };
}
function wdFix(m) {                       // le chiavi come le calcola l'app (wdKey: nome normalizzato)
  var out = { '~v': m['~v'] };
  Object.keys(m).forEach(function (k) { if (k.charAt(0) !== '~') out[L.norm(k)] = m[k]; });
  return out;
}
function enter(at, what) {
  fromGuide = at == null ? -1 : at;
  var books = BOOKS.map(function (b) { return Object.assign({}, b); });
  var ok = NL.guestEnter('esempio', books, { esempio: true, wd: wdFix(wdData()), empty: { lib: 'Nessun libro da mostrare.', wish: 'Nessun desiderio da mostrare.' } });
  if (ok === false) return;
  bar();
  if (what === 'book') NL.openCard('ex7');
  else if (what === 'wish') { NL.setTab('wish'); bar(); window.scrollTo({ top: 0 }); }
  else if (what === 'sort') {
    var sb = $('#sortBar'); if (sb) { sb.scrollIntoView({ block: 'center' }); sb.classList.add('gd-flash'); setTimeout(function () { sb.classList.remove('gd-flash'); }, 2200); }
  }
}
/* striscia «Libreria di esempio · Esci» */
function bar() {
  var on = NL.esempio && NL.esempio(), el = document.getElementById('exBar');
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) {
    var top = document.querySelector('header.top'); if (!top) return;
    el = document.createElement('section'); el.id = 'exBar'; el.className = 'ex-bar';
    top.parentNode.insertBefore(el, top.nextSibling);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ex]'); if (!b) return;
      if (b.dataset.ex === 'out') NL.guestExit();
      else if (b.dataset.ex === 'guide') { var i = fromGuide; NL.guestExit(); open(i < 0 ? 0 : i); }
      else if (b.dataset.ex === 'tab') { if (NL.tab() !== b.dataset.t) { NL.setTab(b.dataset.t); window.scrollTo({ top: 0 }); } bar(); }
    });
  }
  el.hidden = false;
  var all = NL.books(), nl = all.filter(function (b) { return !b.w; }).length, nw = all.length - nl, t = NL.tab();
  el.innerHTML = '<p class="ex-h">Solo da guardare: <b>i tuoi libri non cambiano</b>.</p>' +
    '<div class="ex-row"><div class="chips ex-tabs">' +
      '<button type="button" class="chip" data-ex="tab" data-t="lib" aria-pressed="' + (t !== 'wish') + '">Libreria · ' + nl + '</button>' +
      '<button type="button" class="chip" data-ex="tab" data-t="wish" aria-pressed="' + (t === 'wish') + '">Desideri · ' + nw + '</button></div>' +
    '<span class="ex-go">' + (fromGuide >= 0 ? '<button type="button" class="link" data-ex="guide">‹ Guida</button>' : '') +
    '<button type="button" class="btn sm" data-ex="out">Esci</button></span></div>';
}
NL.on('guest', function () { bar(); });
/* nell'esempio si guarda soltanto: stella, libricini, matita e gli altri tasti rispondono con un avviso */
var FREE = { toggle: 1, zoom: 1, facet: 1, serall: 1, descmore: 1, websearch: 1, clearflt: 1, auinfo: 1 };   // auinfo: lo ferma openAuthor con il suo avviso
var tWarn = 0;
function warn() { var t = Date.now(); if (t - tWarn < 1200) return; tWarn = t; NL.toast('È solo un esempio: prova con i tuoi libri.'); }
function stopped(e) {
  if (!(NL.esempio && NL.esempio())) return null;
  var t = e.target; if (!t.closest || !t.closest('#list')) return null;
  var x = t.closest('input, textarea, select, [contenteditable], .cv-editb, [data-act]');
  if (!x) return null;
  if (x.dataset && x.dataset.act && FREE[x.dataset.act]) return null;
  return x;
}
document.addEventListener('mousedown', function (e) { if (stopped(e)) e.preventDefault(); }, true);   // niente tastiera
document.addEventListener('click', function (e) { if (!stopped(e)) return; e.preventDefault(); e.stopImmediatePropagation(); warn(); }, true);
document.addEventListener('focusin', function (e) { if (!stopped(e)) return; try { e.target.blur(); } catch (x) { /* niente */ } warn(); }, true);
document.addEventListener('change', function (e) { if (stopped(e)) { e.stopImmediatePropagation(); } }, true);

/* ---------- Menu › Info e aiuto: «Come si usa» e «Guarda una libreria di esempio» ---------- */
function menu() {
  var list = document.getElementById('infoList'); if (!list || document.getElementById('goGuida')) return;
  var a = document.createElement('button'); a.type = 'button'; a.className = 'dopt'; a.id = 'goGuida';
  a.innerHTML = '<span><b>Come si usa</b><small>La guida in sette schermate</small></span><span class="n" aria-hidden="true">›</span>';
  var b = document.createElement('button'); b.type = 'button'; b.className = 'dopt'; b.id = 'goEsempio';
  b.innerHTML = '<span><b>Guarda una libreria di esempio</b><small>Prova l\'app senza i tuoi libri</small></span><span class="n" aria-hidden="true">›</span>';
  list.insertBefore(b, list.firstChild); list.insertBefore(a, b);
  a.addEventListener('click', function () { NL.fromMenu(function () { open(0); }); });
  b.addEventListener('click', function () { NL.fromMenu(function () { enter(-1, ''); }); });
  var sm = document.querySelector('#goInfo small'); if (sm) sm.textContent = 'Guida, condividi, installa, contatti';
}
menu();

/* prima apertura in assoluto: la guida si apre da sola (dopo la schermata d'apertura) */
/* si apre da sola una volta: ai nuovi e, dal giro 5, anche a chi usa già l'app, al primo avvio dopo l'aggiornamento (GV = versione della guida) */
function due() { return !cfg.seen || (cfg.v || 1) < GV; }
if (due() && !/[?&]amico=|#k=/.test(location.search + location.hash)) setTimeout(function () { if (due() && !(NL.guest && NL.guest())) open(0); }, 900);

window.NLGuida = { open: open, close: close, esempio: function (what) { enter(-1, what || ''); }, screens: function () { return screens().map(function (s) { return { h: s.h, go: s.go || '', sel: s.sel || '', mod: s.mod || '' }; }); } };
})();
