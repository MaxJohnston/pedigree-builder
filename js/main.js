/* Pedigree Builder · js/main.js
   Start-up: loads the saved tree (or the sample) and draws the chart. Loaded last.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- start ---------- */
(function(){
  try{ var s=localStorage.getItem(LSKEY); if(s){ var o=JSON.parse(s); if(valid(o)) STATE=normalize(o) } }catch(_){}
})();
rebuild();
fitDepth(savedDepth()||5);
view=readHash();
render();
resetHistory();
setSave('Saved in this browser');
