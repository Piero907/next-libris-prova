/* Next Libris · modulo «Disposizione dello schermo»: Classico oppure A (barra in basso). (B, C e D provate e tolte il 15/11/2026.)
   Modulo a parte: usa solo window.NL. Toglierlo (togli_modulo.py layout) riporta l'app alla disposizione classica.
   La scelta sta in 'catalogo-libri-layout'. Nella A gli avvisi stanno sopra la ricerca e (di predefinito) si vedono uno alla volta. */
(function () {
'use strict';
var NL = window.NL;
if (!NL) return;
var $ = NL.$, esc = NL.esc;
var LS = 'catalogo-libri-layout', DEF = NL.PROVA ? 'a' : 'classico';   // nella copia di prova si parte dalla A
var LAYOUTS = [
  { k: 'classico', t: 'Classico', d: 'Tasti grandi in alto, Scansiona, Foto e Digita in basso.' },
  { k: 'a', t: 'A · Barra in basso', d: 'Libreria, Desideri, + per aggiungere, Per te e Menu sempre sotto il pollice.' }
];
var cur = DEF, one = true;
try { var c0 = JSON.parse(NL.ls.get(LS) || '{}'); if (LAYOUTS.some(function (x) { return x.k === c0.v; })) cur = c0.v; else if (/^[bcd]$/.test(c0.v)) cur = 'a'; one = c0.one !== false; } catch (e) {}
var root = document.documentElement;
function svg(p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 22) + '" height="' + (w || 22) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
var I = {
  books: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 5l3.5-.8 2.6 15.4-3.5.8z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  quote: '<path d="M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6"/>',
  stats: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  out: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  next: '<path d="M5 6h14M5 12h9M5 18h6"/><path d="M17 15l3 3-3 3"/>'
};
function save() { NL.ls.set(LS, JSON.stringify({ v: cur, one: one })); }

/* ---------- barra in basso (A), pulsante tondo (C), tasto menu nella barra di D ---------- */
var built = false;
function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function build() {
  if (built) return; built = true;
  document.body.appendChild(el('<nav class="lay-nav" id="layNav" aria-label="Navigazione">' +
    '<button type="button" data-l="lib">' + svg(I.books) + '<span>Libreria</span></button>' +
    '<button type="button" data-l="wish">' + svg(I.heart) + '<span>Desideri</span></button>' +
    '<button type="button" class="lay-plus" data-l="add" aria-label="Aggiungi un libro">' + svg(I.plus, 28) + '</button>' +
    '<button type="button" data-l="you">' + svg(I.spark) + '<span>Per te</span></button>' +
    '<button type="button" data-l="menu">' + svg(I.menu) + '<span>Menu</span></button></nav>'));
  document.body.appendChild(el('<div class="sheet" id="layAdd" hidden><div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="layAddH">' +
    '<h2 id="layAddH">Aggiungi un libro</h2><div class="lay-grid">' +
    '<button type="button" class="lay-big pri" data-l="scan">' + NL.icon('scan') + '<b>Scansiona</b><small>il codice a barre: il modo più preciso</small></button>' +
    '<button type="button" class="lay-big" data-l="photo">' + NL.icon('cam') + '<b>Foto</b><small>della copertina</small></button>' +
    '<button type="button" class="lay-big" data-l="type">' + NL.icon('key') + '<b>Digita</b><small>titolo o ISBN</small></button>' +
    '<button type="button" class="lay-big" data-l="check">' + NL.icon('check') + '<b>Ce l\'ho già?</b><small>controlla in libreria</small></button></div>' +
    '<div class="row-btns"><button type="button" class="btn" data-l="close">Chiudi</button></div></div></div>'));
  document.body.appendChild(el('<div class="sheet" id="layYou" hidden><div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="layYouH">' +
    '<h2 id="layYouH">Per te</h2><div class="dlist dmenu" id="layYouList"></div>' +
    '<div class="row-btns"><button type="button" class="btn" data-l="close">Chiudi</button></div></div></div>'));
  document.addEventListener('click', onClick);
}
function youItems() {
  var out = [{ l: 'sugg', i: I.next, t: 'Suggerimenti', s: 'Cosa leggere dopo e libri da scoprire' }];
  var W = window.NLWrap; if (W && W.cfg().on && W.quarters().length) out.push({ l: 'wrap', i: I.cal, t: 'Il tuo trimestre in libri', s: 'Il riepilogo ogni tre mesi' });
  var nq = NL.nQuotes();
  if (nq) out.push({ l: 'quotes', i: I.quote, t: 'Tutte le citazioni', s: nq === 1 ? '1 citazione salvata' : nq + ' citazioni salvate' });
  out.push({ l: 'stats', i: I.stats, t: 'Statistiche', s: 'Libri, valore, pagine e letture' });
  out.push({ l: 'export', i: I.out, t: 'Backup ed esportazione', s: 'Backup, Excel, PDF' });
  return out;
}
function paintYou() {
  $('#layYouList').innerHTML = youItems().map(function (x) {
    return '<button type="button" class="dopt dgo lay-you" data-l="' + x.l + '"><span class="lay-yi">' + svg(x.i) + '</span><span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></span><span class="n" aria-hidden="true">›</span></button>';
  }).join('');
}
function sheetOpen(id) { var s = $(id); s.hidden = false; if (id === '#layYou') paintYou(); setTimeout(function () { try { s.querySelector('button').focus({ preventScroll: true }); } catch (e) {} }, 30); }
function sheetsClose() { ['#layAdd', '#layYou'].forEach(function (k) { var s = $(k); if (s) s.hidden = true; }); }
function act(l) {
  sheetsClose();
  if (l === 'lib' || l === 'wish') { NL.setTab(l); window.scrollTo({ top: 0 }); paintNav(); }
  else if (l === 'add') sheetOpen('#layAdd');
  else if (l === 'you') sheetOpen('#layYou');
  else if (l === 'menu') NL.openMenu();
  else if (l === 'scan') $('#btnScan').click();
  else if (l === 'photo') $('#btnPhoto').click();
  else if (l === 'type') $('#btnType').click();
  else if (l === 'check') $('#btnCheck').click();
  else if (l === 'sugg') NL.openSugg('next');
  else if (l === 'wrap') { if (window.NLWrap) window.NLWrap.open(); }
  else if (l === 'quotes') NL.openQuotes();
  else if (l === 'stats') NL.openStats();
  else if (l === 'export') NL.openExport();
}
function onClick(e) {
  var t = e.target;
  var sh = t.closest('#layAdd, #layYou');
  if (sh && t === sh) { sheetsClose(); return; }
  var b = t.closest('[data-l]');
  if (!b || !b.closest('#layNav, #layAdd, #layYou')) return;
  if (b.dataset.l === 'close') { sheetsClose(); return; }
  act(b.dataset.l);
}
window.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var open = ['#layAdd', '#layYou'].some(function (k) { var s = $(k); return s && !s.hidden; });
  if (open) { e.stopImmediatePropagation(); sheetsClose(); }
}, true);
function paintNav() {
  var n = $('#layNav'); if (!n) return;
  var t = NL.tab();
  Array.prototype.forEach.call(n.querySelectorAll('[data-l="lib"],[data-l="wish"]'), function (b) { var on = b.dataset.l === t; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
}

/* ---------- avvisi in cima: uno alla volta ---------- */
var NOTES = ['#notice', '#nxBox', '#wrapAsk', '#donAsk', '#instCard', '#donRow'], noteIdx = 0, mo = null;
function notes() {
  var all = NOTES.map(function (k) { return document.querySelector(k); }).filter(Boolean);
  all.forEach(function (x) { x.classList.remove('lay-later'); });
  var more = $('#layMore');
  if (cur === 'classico' || !one) { if (more) more.hidden = true; return; }
  var vis = all.filter(function (x) { return !x.hidden; });
  if (!more) {
    more = el('<button type="button" class="lay-more" id="layMore" hidden></button>');
    more.addEventListener('click', function () { noteIdx++; notes(); });
  }

  if (!mo && window.MutationObserver) mo = new MutationObserver(function () { notes(); });
  if (mo) all.forEach(function (x) { if (!x.__layObs) { x.__layObs = 1; mo.observe(x, { attributes: true, attributeFilter: ['hidden'] }); } });
  if (vis.length < 2) { more.hidden = true; return; }
  noteIdx = noteIdx % vis.length;
  vis.forEach(function (x, i) { if (i !== noteIdx) x.classList.add('lay-later'); });
  var shown = vis[noteIdx];
  shown.parentNode.insertBefore(more, shown.nextSibling);
  more.hidden = false;
  more.innerHTML = 'Avviso ' + (noteIdx + 1) + ' di ' + vis.length + ' · <b>Il prossimo ›</b>';

}

/* ---------- applica ---------- */
function apply() {
  root.setAttribute('data-layout', cur);
  if (cur !== 'classico') build();
  place(); loans0();
  paintNav(); notes(); sheetsClose();
  setTimeout(function () { try { NL.updateStick(); } catch (e) {} }, 0);
}
function paintOption(sec) {
  if (sec !== 'look') return;
  var box = document.getElementById('optLayout');
  if (!box) {
    var fs = document.querySelector('#optSheet .sum-opts') || (document.querySelector('#optSheet input[name="viewDef"]') || { closest: function () { return null; } }).closest('fieldset');
    if (!fs) return;
    box = el('<fieldset class="choice lay-opt" id="optLayout"><legend>Disposizione dello schermo</legend>' + LAYOUTS.map(function (x) {
      return '<label class="lay-o"><input type="radio" name="layout" value="' + x.k + '"><span><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></span></label>';
    }).join('') + '<label class="check lay-one" id="layOneL"><input type="checkbox" id="layOne"><span>Avvisi in cima uno alla volta<small>Prestiti, «Hai finito…», trimestre, installazione: se sono più di uno, «Il prossimo» passa al successivo.</small></span></label>' +
      '<p class="hint">Si vede subito. Nella A gli avvisi stanno sopra la ricerca.</p></fieldset>');
    fs.parentNode.insertBefore(box, fs);
    box.addEventListener('change', function (e) {
      if (e.target.name === 'layout') { cur = e.target.value; save(); apply(); paintOption('look'); }
      else if (e.target.id === 'layOne') { one = e.target.checked; save(); notes(); }
    });
  }
  $('#layOne').checked = one; $('#layOneL').hidden = cur !== 'a';
  Array.prototype.forEach.call(box.querySelectorAll('input[name="layout"]'), function (i) { i.checked = i.value === cur; });
}
function loans0() {                        // nella A la riga «Prestati» serve solo se il riepilogo non li mostra gia' (toccandoli)
  var c = document.getElementById('cntLoan');
  root.classList.toggle('lay-loans0', !c || !(parseInt(c.textContent, 10) > 0) || NL.settings.sumLoan !== false);
}
/* nella A gli avvisi che stanno sotto la ricerca salgono sopra; nella classica tornano al loro posto */
var MOVE = ['#wrapAsk', '#nxBox', '#donAsk', '#donRow'];
function place() {
  var a = cur === 'a', ref = a ? document.getElementById('stickSentinel') : document.getElementById('thead');
  if (!ref) return;
  MOVE.forEach(function (k) { var e = document.querySelector(k); if (e) ref.parentNode.insertBefore(e, ref); });
}
NL.on('list', function () { paintNav(); notes(); setTimeout(loans0, 0); });
NL.on('options', paintOption);
apply();
window.NLLayout = { get: function () { return cur; }, set: function (v) { cur = v; save(); apply(); }, list: LAYOUTS };
})();
