/* Next Libris · stile G «Pagina con l'Indice» (Piero, 20/11/2026; tela https://claude.ai/artifact/Tqa6XajvQCK2CVZdSSSimq, documento
   claude/nuovo-stile-proposte.md). L'app come un libro aperto: testatina in alto, nastro segnalibro con il numero dei libri, una frase
   in prosa con la capolettera, linguette laterali al posto della barra in basso (Libri · Desideri · Per te · Amici · Tu), «+ Aggiungi»
   che galleggia, il Menu diventa l'«Indice» a capitoli. Le funzioni restano quelle di sempre: questo modulo aggiunge solo i pezzi nuovi
   e li collega ai tasti che esistono già (che restano nella pagina, nascosti dallo stile). Le regole d'aspetto stanno in stile-g.css. */
(function () {
'use strict';
var NL = window.NL;
if (!NL) return;
var $ = function (s) { return document.querySelector(s); };
var esc = NL.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var SV = function (p, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
var IC = {
  libri: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 5l3.5-.8 2.6 15.4-3.5.8z"/>',
  desideri: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  perte: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  amici: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6a5 5 0 0 1 5.5 5.4"/>',
  tu: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  indice: '<path d="M4 7h16M4 12h16M4 17h10"/>'
};
function act(l) {
  var b = document.querySelector('#layNav [data-l="' + l + '"]'); if (b) { b.click(); return; }
  if ((l === 'lib' || l === 'wish') && NL.setTab) { if (NL.guest && NL.guest() && NL.guestExit) NL.guestExit(); NL.setTab(l); window.scrollTo(0, 0); }   // senza la barra in basso (disposizione classica)
  else if (l === 'prof' && window.NLProfilo) window.NLProfilo.open();
}
function vis(sel) { var e = $(sel); return !!(e && !e.hidden); }

/* ---------- linguette laterali ---------- */
var TABS = [['lib', 'Libri', 'libri'], ['wish', 'Desideri', 'desideri'], ['you', 'Per te', 'perte'], ['fri', 'Amici', 'amici'], ['prof', 'Tu', 'tu']];
function tabs() {
  if ($('#gTabs')) return;
  var n = document.createElement('nav'); n.id = 'gTabs'; n.className = 'g-tabs'; n.setAttribute('aria-label', 'Sezioni');
  n.innerHTML = '<span class="g-edge" aria-hidden="true"></span>' + TABS.map(function (t) {
    return '<button type="button" data-g="' + t[0] + '">' + SV(IC[t[2]], 17) + '<span>' + t[1] + '</span></button>';
  }).join('');
  document.body.appendChild(n);
  n.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return;
    var g = b.dataset.g;
    closeAll();
    if (g === 'fri') { if (window.NLAmici && window.NLAmici.open) window.NLAmici.open(); }
    else act(g);
    setTimeout(paintTabs, 60);
  });
}
/* chiude le pagine intere aperte prima di passare a un'altra linguetta (profilo, amici, chat, Per te, Indice) */
function closeAll() {
  if (window.NLProfilo && window.NLProfilo.close && vis('#profSheet')) window.NLProfilo.close();
  ['#friSheet', '#chSheet', '#layYou', '#layAdd'].forEach(function (s) { var e = $(s); if (e && !e.hidden) { var x = e.querySelector('.sh-x, #friClose, #chClose, [data-close]'); if (x) x.click(); else e.hidden = true; } });
  if ((document.documentElement.classList.contains('drawer-open') || vis('#drawer')) && window.__app && window.__app.closeDrawer) window.__app.closeDrawer();
  var open = document.querySelector('.row.open.cv-full .chev-btn'); if (open) open.click();
}
function current() {
  if (vis('#chSheet') || vis('#friSheet')) return 'fri';
  if (vis('#profSheet')) return (window.NLProfilo && window.NLProfilo.state && window.NLProfilo.state().cur) ? 'fri' : 'prof';
  if (document.documentElement.classList.contains('drawer-open') || vis('#drawer')) return 'prof';
  if (vis('#layYou')) return 'you';
  if (NL.guest && NL.guest()) return 'fri';
  return NL.tab && NL.tab() === 'wish' ? 'wish' : 'lib';
}
function paintTabs() {
  var c = current();
  Array.prototype.forEach.call(document.querySelectorAll('#gTabs [data-g]'), function (b) { var on = b.dataset.g === c; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.documentElement.classList.toggle('g-conv', vis('#chSheet') && ($('#chSheet').dataset.v === 'conv'));
  document.documentElement.classList.toggle('g-page', c === 'you' || c === 'prof' || (c === 'fri' && !(NL.guest && NL.guest())));
}

/* ---------- testatina, nastro, frase in prosa, «+ Aggiungi» ---------- */
function head() {
  var top = $('header.top'); if (!top || $('#gHead')) return;
  var h = document.createElement('section'); h.id = 'gHead'; h.className = 'g-head';
  h.innerHTML = '<button type="button" class="g-back" id="gBack" aria-label="Torna alla tua libreria" hidden>' + SV('<path d="M15 6l-6 6 6 6"/>', 20) + '</button><span class="g-run" id="gRun">Next Libris</span><span class="g-ics" id="gIcs"></span>';
  top.insertBefore(h, top.firstChild);
  ['#btnChat', '#btnBell'].forEach(function (s) { var b = $(s); if (b) $('#gIcs').appendChild(b); });
  var v = $('#btnView'), sb = $('#sortBar'); if (v && sb) sb.appendChild(v);
  var m = document.createElement('button'); m.type = 'button'; m.id = 'gMenu'; m.className = 'ico g-menu'; m.setAttribute('aria-label', 'Indice'); m.title = 'Indice'; m.innerHTML = SV(IC.indice, 22);
  m.addEventListener('click', function () { var o = $('#btnOpts'); if (o) o.click(); });
  $('#gIcs').appendChild(m);   // l'Indice (il Menu) si apre dalla testatina   // copertine/elenco nella riga dell'ordine
  $('#gBack').addEventListener('click', function () { act('lib'); });
  var r = document.createElement('div'); r.id = 'gRib'; r.className = 'g-rib'; r.setAttribute('aria-hidden', 'true');
  top.appendChild(r);
  var p = document.createElement('p'); p.id = 'gProse'; p.className = 'g-prose';
  top.parentNode.insertBefore(p, top.nextSibling);
  p.addEventListener('click', function (e) { if (e.target.closest('[data-gl="loan"]')) { var f = $('#fltLoan'); if (f) f.click(); } });
  var a = document.createElement('button'); a.type = 'button'; a.id = 'gAdd'; a.className = 'g-add'; a.innerHTML = SV(IC.plus, 20) + '<span>Aggiungi</span>';
  a.addEventListener('click', function () { act('add'); });
  document.body.appendChild(a);
}
function plural(n, one, many) { return n === 1 ? one : many; }
function paintHead() {
  var guest = NL.guest && NL.guest(), wish = NL.tab && NL.tab() === 'wish';
  var all = []; try { all = NL.books(); } catch (e) { all = []; }
  var lib = all.filter(function (b) { return !b.w; }), ws = all.filter(function (b) { return b.w; });
  var n = wish ? ws.length : lib.length, rib = $('#gRib'), pr = $('#gProse'), run = $('#gRun'), bk = $('#gBack');
  if (!rib) return;
  var who = guest ? String(NL.guest() || '') : '';
  rib.innerHTML = '<b>' + n + '</b>' + (wish ? SV(IC.desideri, 13) : '<small>libri</small>');
  run.textContent = guest ? (who || 'Libreria di un amico') : 'Next Libris';
  bk.hidden = !guest;
  document.documentElement.classList.toggle('g-guest', !!guest);
  var h1 = $('header.top h1');
  if (h1 && !h1.querySelector('.g-t')) { var t = document.createElement('span'); t.className = 'g-t'; h1.insertBefore(t, h1.firstChild); }
  if (h1) h1.querySelector('.g-t').textContent = guest ? (who ? 'Libreria di ' + who.split(' ')[0] : 'Libreria') : (wish ? 'Desideri' : 'Libreria');
  if (guest) { pr.hidden = true; return; }
  var s = '';
  if (wish) {
    s = ws.length ? 'Hai <b>' + ws.length + ' ' + plural(ws.length, 'libro', 'libri') + '</b> nei Desideri.' : 'Nei Desideri metti i libri che vorresti: tocca <b>Aggiungi</b>.';
  } else if (!lib.length) {
    s = 'La tua libreria è vuota: tocca <b>Aggiungi</b> e inquadra il codice a barre di un libro.';
  } else {
    var rd = lib.filter(function (b) { return b.rs === 'in'; });
    var lo = 0; try { lo = +(($('#cntLoan') || {}).textContent || 0) || 0; } catch (e) { lo = 0; }
    s = rd.length === 1 ? 'Stai leggendo <b>' + esc(rd[0].t || 'un libro') + '</b>' : rd.length ? 'Stai leggendo <b>' + rd.length + ' libri</b>' : 'Hai <b>' + lib.length + ' ' + plural(lib.length, 'libro', 'libri') + '</b>';
    s += lo ? '; <button type="button" class="g-lk" data-gl="loan">' + lo + ' ' + plural(lo, 'è in prestito', 'sono in prestito') + '</button>.' : '.';
  }
  var txt = s.replace(/^([^<A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ])/, '$1<span class="g-dc" aria-hidden="true">$2</span><span class="sr">$2</span>');
  pr.innerHTML = txt; pr.hidden = false;
}

/* ---------- Indice al posto del Menu ---------- */
function indice() {
  var h = $('#drawerH'); if (h && h.textContent !== 'Indice') h.textContent = 'Indice';
}

/* ---------- ordine e gruppi: testi brevi («Autore» invece di «Raggruppa: Autore») ---------- */
function shortGrp() {
  var g = $('#grpPick'); if (!g) return;
  var t = g.textContent, s = t.replace(/^Raggruppa:\s*/, '');
  if (s === 'Raggruppa') s = 'Gruppi';
  if (s !== t) g.textContent = s;
}

/* ---------- Aspetto › «Nastro e linguette a sinistra» (Piero, 20/11/2026): per chi tiene il telefono con la sinistra ---------- */
function side() {
  var st = NL.settings || {};
  document.documentElement.classList.toggle('g-left', !!st.gLeft);
  var cols = document.querySelector('fieldset.cols-opt'), x = $('#optGLeft');
  if (!x && cols) {
    var f = document.createElement('fieldset'); f.className = 'choice g-side-opt';
    f.innerHTML = '<legend>Linguette</legend><label class="check"><input type="checkbox" id="optGLeft"><span>Nastro e linguette a sinistra<small>Per chi tiene il telefono con la sinistra.</small></span></label>';
    cols.parentNode.insertBefore(f, cols.nextSibling);
    x = $('#optGLeft');
    x.addEventListener('change', function () { st.gLeft = x.checked; if (NL.saveSettings) NL.saveSettings(); side(); if (NL.toast) NL.toast(x.checked ? 'Linguette a sinistra.' : 'Linguette a destra.'); });
  }
  if (x) x.checked = !!st.gLeft;
}

/* ---------- avvio e aggiornamenti ---------- */
var pend = 0;
function soon() { if (pend) return; pend = setTimeout(function () { pend = 0; try { paintHead(); paintTabs(); shortGrp(); indice(); } catch (e) { if (window.nlErr) nlErr(e); } }, 40); }
function start() {
  if (window.NL_NO_G) return;   // solo nelle prove di prima (prove/_harness.js)
  document.documentElement.classList.add('g-look');
  tabs(); head(); side(); soon();
  var mo = new MutationObserver(soon);
  ['#list', '#summary', '#cntLoan', '#grpPick'].forEach(function (s) { var e = $(s); if (e) mo.observe(e, { childList: true, characterData: true, subtree: true }); });
  var mo2 = new MutationObserver(soon);
  mo2.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden', 'data-v'] });
  new MutationObserver(soon).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  if (NL.on) { NL.on('guest', soon); }
  window.addEventListener('popstate', function () { setTimeout(soon, 80); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
window.NLStileG = { paint: soon };
})();
