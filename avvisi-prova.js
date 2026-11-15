/* Next Libris · modulo TEMPORANEO «avvisi di prova»: solo nella copia di prova, 4 avvisi finti per provare lo scorrimento
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
NL.refresh();
})();
