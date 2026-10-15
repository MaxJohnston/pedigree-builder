/* Pedigree Builder · js/main.js
   Start-up: loads the saved tree (or the sample) and draws the chart. Loaded last.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- start ---------- */
(function(){
  if(READONLY){ STATE=normalize(PB_EXPORT.state); document.body.classList.add('readonly'); return }
  try{ var s=localStorage.getItem(LSKEY); if(s){ var o=JSON.parse(s); if(valid(o)) STATE=normalize(o) } }catch(_){}
})();
rebuild();
fitDepth(READONLY?(PB_EXPORT.depth||5):(savedDepth()||5));
view=readHash();
if(READONLY&&!location.hash&&P.has(PB_EXPORT.view)) view=PB_EXPORT.view;
render();
resetHistory();
setSave('Saved in this browser');
