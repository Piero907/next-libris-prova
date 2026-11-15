/* Next Libris · modulo «Aspetto della scheda aperta»: Attuale, A (ordinata), B (a sezioni), C (a linguette), D (pagina del libro).
   Modulo a parte: usa solo window.NL (NL.on('rows') dopo ogni disegno delle schede). Si toglie con togli_modulo.py schede:
   resta la scheda di sempre. La scelta sta in 'catalogo-libri-card'. */
(function () {
'use strict';
var NL = window.NL;
if (!NL) return;
var $ = NL.$, esc = NL.esc;
var LS = 'catalogo-libri-card';
var STYLES = [
  { k: 'attuale', t: 'Attuale', d: 'Tutti i campi uno sotto l\'altro, come adesso.' },
  { k: 'a', t: 'A · Ordinata', d: 'Gli stessi campi, più stretti e allineati; i pulsanti diventano icone in una riga.' },
  { k: 'b', t: 'B · A sezioni', d: 'Titolo e autore in alto; sotto, sezioni da aprire: Dati, In libreria, Lettura.' },
  { k: 'c', t: 'C · A linguette', d: 'Titolo e autore in alto; sotto, linguette Dati, Lettura, Libreria, Altro: una alla volta.' },
  { k: 'd', t: 'D · Pagina del libro', d: 'Si legge come una pagina: copertina, dati in una riga, lettura. «Modifica» apre i campi.' }
];
var cur = 'attuale';
try { var c0 = JSON.parse(NL.ls.get(LS) || '{}'); if (STYLES.some(function (x) { return x.k === c0.v; })) cur = c0.v; } catch (e) {}
function save() { NL.ls.set(LS, JSON.stringify({ v: cur })); }
var root = document.documentElement;
var secOpen = {}, tabOf = {}, editing = {};      // per libro: sezioni aperte (B), linguetta (C), campi aperti (D)

function q(el, sel) { return el.querySelector(sel); }
function qa(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }
function grab(card, sels) { var out = []; sels.forEach(function (s) { qa(card, s).forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); }); }); return out; }
/* i gruppi di campi della scheda (sono gli stessi elementi dell'app: spostati, non rifatti) */
function groups(card) {
  return [
    { k: 'dati', t: 'Dati del libro', nodes: grab(card, ['.f-e', '.f-y', '.f-c', '.f-pg', '.f-gen', '.foot .f-i']) },
    { k: 'lettura', t: 'Lettura', nodes: grab(card, ['.read']) },
    { k: 'libreria', t: 'In libreria', nodes: grab(card, ['.f-sh', '.f-n', '.ser', '.serbox']) },
    { k: 'altro', t: 'Altro', nodes: grab(card, ['.facets', 'details.desc:not(.quotes)', 'details.quotes', '.links', '.foot .tail']) }
  ].filter(function (g) { return g.nodes.length; });
}
function grid(nodes) { var d = document.createElement('div'); d.className = 'cv-grid'; nodes.forEach(function (n) { d.appendChild(n); }); return d; }
function tidy(card) {                             // contenitori rimasti vuoti dopo gli spostamenti
  qa(card, '.meta, .more, .foot').forEach(function (x) { if (!x.querySelector('label, .f, .tail, button, details')) x.remove(); });
}

/* B · sezioni da aprire */
function doB(card, id) {
  var gs = groups(card), anchor = q(card, '.head');
  if (!anchor) return;
  var box = document.createElement('div'); box.className = 'cv-secs';
  gs.forEach(function (g) {
    var d = document.createElement('details'); d.className = 'cv-sec'; d.dataset.k = g.k;
    var open = secOpen[id] ? !!secOpen[id][g.k] : g.k === 'dati';
    if (open) d.open = true;
    d.innerHTML = '<summary><span>' + esc(g.t) + '</span><span class="cv-sum">' + esc(summary(g, id)) + '</span></summary>';
    var body = document.createElement('div'); body.className = 'cv-body';
    body.appendChild(g.k === 'dati' || g.k === 'libreria' ? grid(g.nodes.filter(isField)) : document.createElement('span'));
    g.nodes.filter(function (n) { return !isField(n) || (g.k !== 'dati' && g.k !== 'libreria'); }).forEach(function (n) { body.appendChild(n); });
    d.appendChild(body);
    d.addEventListener('toggle', function () { (secOpen[id] || (secOpen[id] = {}))[g.k] = d.open; if (d.open) NL.autosize(d); });
    box.appendChild(d);
  });
  anchor.parentNode.insertBefore(box, anchor.nextSibling);
  tidy(card);
}
function isField(n) { return n.classList && n.classList.contains('f'); }
function summary(g, id) {                         // cosa c'e' dentro, a sezione chiusa
  var b = NL.get(id); if (!b) return '';
  if (g.k === 'dati') return [b.e, b.y, b.pg ? b.pg + ' pagine' : ''].filter(Boolean).join(' · ');
  if (g.k === 'lettura') return b.rs === 'ok' ? 'Letto' + (b.rt ? ' ' + '★'.repeat(b.rt) : '') : b.rs === 'in' ? 'In lettura' : b.rs === 'da' ? 'Da leggere' : '';
  if (g.k === 'libreria') return [b.sh, b.se ? b.se + (b.sn ? ', ' + b.sn : '') : ''].filter(Boolean).join(' · ');
  if (g.k === 'altro') return [b.ds ? 'descrizione' : '', (b.qs || []).length ? (b.qs.length === 1 ? '1 citazione' : b.qs.length + ' citazioni') : ''].filter(Boolean).join(' · ');
  return '';
}

/* C · linguette */
function doC(card, id) {
  var gs = groups(card), anchor = q(card, '.head');
  if (!anchor || !gs.length) return;
  var on = tabOf[id] && gs.some(function (g) { return g.k === tabOf[id]; }) ? tabOf[id] : gs[0].k;
  var bar = document.createElement('div'); bar.className = 'cv-tabs'; bar.setAttribute('role', 'tablist');
  var panes = document.createElement('div'); panes.className = 'cv-panes';
  gs.forEach(function (g) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cv-tab'; b.setAttribute('role', 'tab'); b.dataset.k = g.k;
    b.textContent = g.k === 'dati' ? 'Dati' : g.t; b.setAttribute('aria-selected', g.k === on ? 'true' : 'false');
    bar.appendChild(b);
    var p = document.createElement('div'); p.className = 'cv-pane'; p.dataset.k = g.k; p.setAttribute('role', 'tabpanel'); p.hidden = g.k !== on;
    if (g.k === 'dati' || g.k === 'libreria') p.appendChild(grid(g.nodes.filter(isField)));
    g.nodes.filter(function (n) { return !isField(n) || (g.k !== 'dati' && g.k !== 'libreria'); }).forEach(function (n) { p.appendChild(n); });
    panes.appendChild(p);
  });
  bar.addEventListener('click', function (e) {
    var t = e.target.closest('.cv-tab'); if (!t) return;
    e.stopPropagation(); tabOf[id] = t.dataset.k;
    qa(bar, '.cv-tab').forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    qa(panes, '.cv-pane').forEach(function (x) { x.hidden = x.dataset.k !== t.dataset.k; });
    NL.autosize(panes);
  });
  anchor.parentNode.insertBefore(bar, anchor.nextSibling);
  bar.parentNode.insertBefore(panes, bar.nextSibling);
  tidy(card);
}

/* D · pagina del libro: si legge; «Modifica» mostra i campi */
function doD(card, id) {
  var b = NL.get(id), head = q(card, '.head');
  if (!b || !head || !b.t) return;               // senza titolo (da completare) restano i campi
  if (editing[id]) { card.classList.add('cv-edit'); addDone(card, id); return; }
  var img = NL.bigImg(b), dati = [b.e, b.y, b.pg ? b.pg + ' pagine' : '', b.c != null ? NL.eur(b.c) : ''].filter(Boolean);
  var chips = [b.gen, b.sh ? 'Scaffale: ' + b.sh : '', b.se ? b.se + (b.sn ? ', vol. ' + b.sn : '') : ''].filter(Boolean);
  var read = b.w ? '' : b.rs === 'ok' ? 'Letto' + (b.rd ? ' il ' + NL.itDate(b.rd) : '') : b.rs === 'in' ? 'In lettura' : b.rs === 'da' ? 'Da leggere' : '';
  var v = document.createElement('div'); v.className = 'cv-page';
  v.innerHTML = '<div class="cv-hero">' + (img ? '<img src="' + esc(img) + '" alt="" referrerpolicy="no-referrer">' : '<span class="cv-ph" style="--h:' + NL.hue(b.t + b.a + b.i) + '">' + esc(b.t.slice(0, 1)) + '</span>') +
    '<div class="cv-ht"><h3>' + esc(b.t) + '</h3><p class="cv-au">' + esc(b.a || '') + '</p>' + (dati.length ? '<p class="cv-meta">' + esc(dati.join(' · ')) + '</p>' : '') + '</div></div>' +
    (chips.length ? '<p class="cv-chips">' + chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</p>' : '') +
    (read ? '<p class="cv-read"><b>' + esc(read) + '</b>' + (b.rt ? ' <span class="cv-st" aria-label="' + b.rt + ' stelle su 5">' + '★'.repeat(b.rt) + '<i>' + '★'.repeat(5 - b.rt) + '</i></span>' : '') + '</p>' : '') +
    (b.n ? '<p class="cv-note">' + esc(b.n) + '</p>' : '') +
    '<button type="button" class="btn cv-editb">' + NL.icon('pen') + 'Modifica</button>';
  v.querySelector('.cv-editb').addEventListener('click', function (e) { e.stopPropagation(); editing[id] = true; NL.refreshRow(id); });
  head.parentNode.insertBefore(v, head);
  card.classList.add('cv-view');
}
function addDone(card, id) {
  var top = q(card, '.head'); if (!top) return;
  var d = document.createElement('button'); d.type = 'button'; d.className = 'btn primary cv-done'; d.textContent = 'Fatto';
  d.addEventListener('click', function (e) { e.stopPropagation(); delete editing[id]; NL.refreshRow(id); });
  top.parentNode.insertBefore(d, top);
}

function decorate(el) {
  if (cur === 'attuale' || !el) return;
  var cards = el.matches && el.matches('.row.open.has-top') ? [el] : qa(el, '.row.open.has-top');
  cards.forEach(function (card) {
    if (card.dataset.cv) return;
    card.dataset.cv = cur;
    var id = card.dataset.id;
    try { if (cur === 'b') doB(card, id); else if (cur === 'c') doC(card, id); else if (cur === 'd') doD(card, id); } catch (e) { if (window.console) console.warn('schede', e); }
  });
}
function apply() { root.setAttribute('data-card', cur); NL.refresh(); }
function paintOption(sec) {
  if (sec !== 'look') return;
  var box = document.getElementById('optCard');
  if (!box) {
    var anchor = document.querySelector('#optSheet .sum-opts') || document.querySelector('#optSheet input[name="viewDef"]');
    var fs = anchor && (anchor.closest ? anchor.closest('fieldset') || anchor : anchor); if (!fs) return;
    var f = document.createElement('fieldset'); f.className = 'choice lay-opt'; f.id = 'optCard';
    f.innerHTML = '<legend>Scheda aperta del libro</legend>' + STYLES.map(function (x) {
      return '<label class="lay-o"><input type="radio" name="cardv" value="' + x.k + '"><span><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></span></label>';
    }).join('') + '<p class="hint">Si vede subito: apri un libro e prova. Poi decidiamo quale tenere.</p>';
    fs.parentNode.insertBefore(f, fs);
    f.addEventListener('change', function (e) { if (e.target.name === 'cardv') { cur = e.target.value; save(); apply(); } });
    box = f;
  }
  Array.prototype.forEach.call(box.querySelectorAll('input'), function (i) { i.checked = i.value === cur; });
}
NL.on('rows', decorate);
NL.on('options', paintOption);
root.setAttribute('data-card', cur);
if (cur !== 'attuale') NL.refresh();
window.NLCard = { get: function () { return cur; }, set: function (v) { cur = v; save(); apply(); }, list: STYLES };
})();
