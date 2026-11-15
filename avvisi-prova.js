/* Next Libris · modulo TEMPORANEO «avvisi di prova»: solo nella copia di prova, 4 avvisi finti e un suggerimento finto per provare lo scorrimento
   degli avvisi nella disposizione A. Si toglie con: python3 togli_modulo.py avvisi-prova (nessun dato salvato). */
(function () {
'use strict';
var NL = window.NL;
if (!NL || !NL.PROVA) return;
var COL = ['#E3EEF9', '#FBEFD9', '#EDE7F6', '#E2F2EA'], INK = ['#24527D', '#7F4A00', '#4B3A7A', '#1B6A4F'];
var ref = document.getElementById('stickSentinel');
if (!ref) return;
for (var i = 1; i <= 4; i++) {
  var s = document.createElement('section');
  s.className = 'lay-note demo-note'; s.id = 'demoNote' + i;
  s.style.cssText = 'position:relative;margin:4px 0 12px;padding:14px 44px 14px 16px;border-radius:14px;background:' + COL[i - 1] + ';color:' + INK[i - 1];
  s.innerHTML = '<b style="display:block;font-size:17px">Avviso di prova ' + i + ' di 4</b><span style="font-size:14px">Scorri verso sinistra o destra per passare agli altri. Questi avvisi sono solo per la prova e li toglieremo.</span>' +
    '<button type="button" class="ico" aria-label="Chiudi l\'avviso di prova" style="position:absolute;top:6px;right:6px;color:inherit">×</button>';
  s.querySelector('button').addEventListener('click', function (e) { e.currentTarget.closest('section').hidden = true; });
  ref.parentNode.insertBefore(s, ref);
}
/* un suggerimento finto come «Hai finito… E adesso?» (piu' alto degli altri avvisi), con un libro vero «da leggere» */
var bk = NL.books().filter(function (b) { return !b.w && b.rs === 'da' && !b.xs && b.t; })[0];
var sg = document.createElement('section');
sg.className = 'nx-box lay-note demo-note'; sg.id = 'demoSugg';
var img = bk ? NL.bigImg(bk) : '';
sg.innerHTML = '<button type="button" class="ico nx-x" aria-label="Chiudi">×</button><h3>Hai finito «Libro di prova». E adesso?</h3>' +
  '<div class="nx-card">' + (img ? '<img src="' + NL.esc(img) + '" alt="" referrerpolicy="no-referrer">' : '<span class="nimg ph" style="--h:' + NL.hue(bk ? bk.t : 'prova') + '" aria-hidden="true"></span>') +
  '<div class="nt"><b>' + NL.esc(bk ? bk.t : 'Un libro da leggere') + '</b><span>' + NL.esc(bk ? bk.a || '' : '') + '</span><ul class="nx-why"><li>Suggerimento di prova: è uno dei tuoi libri da leggere.</li></ul></div></div>' +
  '<div class="nx-acts"><button class="btn primary" type="button">Inizio questo</button><button class="btn" type="button">Un altro</button><button class="link" type="button">Tutti i suggerimenti</button></div>';
sg.querySelector('.nx-x').addEventListener('click', function () { sg.hidden = true; });
Array.prototype.forEach.call(sg.querySelectorAll('.nx-acts button'), function (b) { b.addEventListener('click', function () { NL.toast('È solo un suggerimento di prova.'); }); });
var first = document.getElementById('demoNote2');
first.parentNode.insertBefore(sg, first);
NL.refresh();
})();
