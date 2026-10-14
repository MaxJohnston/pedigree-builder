/* Pedigree Builder · js/storage.js
   Saving to this browser, undo/redo/history, view settings, toolbar menus and keyboard shortcuts.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- saving ---------- */
/* The tree is kept in this viewer's private storage for this page (their own copy, on any device they sign in from),
   and mirrored in this browser so it still works when that storage is not available. */
var LSKEY='pedigree-builder-tree';
var store={touched:false};
function valid(o){return !!(o&&Array.isArray(o.people)&&o.people.some(function(p){return p&&p.n===1&&p.name!=null}))}
/* Older trees stored a repeat of an ancestor as its own entry ("ref"). The chart now draws repeats by itself, so each one
   becomes a link from the child to the person it repeated, and anything that pointed at the repeat points at that person. */
function unRef(o){
  var people=o.people, by=new Map(), map=new Map();
  people.forEach(function(p){ by.set(p.n,p) });
  people.forEach(function(p){ if(p.ref!=null&&by.has(p.ref)&&by.get(p.ref).ref==null) map.set(p.n,p.ref) });
  if(!map.size) return;
  var to=function(n){ return map.has(n)?map.get(n):n };
  map.forEach(function(t,r){ var c=by.get(Math.floor(r/2)); if(!c) return; if(r%2===0){ if(c.fa==null) c.fa=t } else { if(c.mo==null) c.mo=t } });
  o.people=people.filter(function(p){ return !map.has(p.n) });
  o.people.forEach(function(p){ if(p.fa!=null) p.fa=to(p.fa); if(p.mo!=null) p.mo=to(p.mo) });
  (o.famous||[]).forEach(function(f){ (f.routes||[]).forEach(function(r){ r.anc=to(r.anc); if(r.sp!=null) r.sp=to(r.sp) }) });
  (o.haplo||[]).forEach(function(h){ h.from=to(h.from); if(h.to!=null) h.to=to(h.to) });
  (o.dna||[]).forEach(function(g){ g.anchor=to(g.anchor) });
  if(o.photos) map.forEach(function(t,r){ if(o.photos[r]&&!o.photos[t]) o.photos[t]=o.photos[r]; delete o.photos[r] });
}
function normalize(o){
  if(o&&Array.isArray(o.people)) unRef(o);
  var ph={}; if(o.photos&&typeof o.photos==='object') Object.keys(o.photos).forEach(function(k){ if(typeof o.photos[k]==='string'&&PHOTO_OK.test(o.photos[k])) ph[k]=o.photos[k] });
  return {v:1, sample:!!o.sample, showLiving:!!o.showLiving, nameView:o.nameView==='married'?'married':'birth', hidePhotos:!!o.hidePhotos,
    photos:ph,
    people:o.people.filter(function(p){return p&&typeof p.n==='number'&&p.n>=1&&p.name!=null}).map(function(p){p.name=String(p.name);return p}),
    famous:Array.isArray(o.famous)?o.famous.filter(function(f){return f&&f.name}):[],
    haplo:Array.isArray(o.haplo)?o.haplo.filter(function(h){return h&&h.code&&typeof h.from==='number'}):[],
    dna:Array.isArray(o.dna)?o.dna.filter(function(g){return g&&typeof g.anchor==='number'}):[]};
}
function setSave(t){ var el=$('#savest'); if(el) el.textContent=t }
/* ---------- undo, redo and history ----------
   Each change keeps a snapshot of the tree from before it. View settings (living years, name style, photos) are not
   part of the tree's history, so undo never flips them. Photos are kept by reference, so snapshots stay small. */
var UNDO=[], REDO=[], HIST=[], LAST=null, PREFKEYS=['showLiving','nameView','hidePhotos'];
function prefsNow(){ var o={}; PREFKEYS.forEach(function(k){ if(STATE[k]!==undefined) o[k]=STATE[k] }); return o }
function snapshot(){ var o={}; Object.keys(STATE).forEach(function(k){ if(k!=='photos'&&PREFKEYS.indexOf(k)<0) o[k]=STATE[k] }); return {s:JSON.stringify(o), ph:STATE.photos||{}} }
function restoreSnap(sn){ var pr=prefsNow(); STATE=JSON.parse(sn.s); STATE.photos=sn.ph||{}; Object.assign(STATE,pr) }
function resetHistory(){ UNDO=[]; REDO=[]; HIST=[]; LAST=snapshot(); syncUndo() }
function commit(replaced,isSample,desc){
  STATE.sample=!!isSample;
  store.touched=true;
  if(LAST){ var e={desc:desc||'Changed the tree', at:Date.now(), before:LAST}; UNDO.push(e); if(UNDO.length>80) UNDO.shift(); REDO=[]; HIST.push(e); if(HIST.length>150) HIST.shift(); }
  LAST=snapshot();
  rebuild();
  if(!P.has(view)) view=1;
  render(!replaced);
  queueSave(); syncUndo();
}
function applySnap(sn){
  restoreSnap(sn); LAST=snapshot(); store.touched=true; czSel.clear(); closeDetails(true);
  rebuild(); if(!P.has(view)) view=1; render(true); queueSave(); syncUndo();
}
function undo(){
  if(!UNDO.length) return;
  var e=UNDO.pop(); REDO.push({desc:e.desc, after:LAST});
  HIST.push({desc:'Undid: '+e.desc, at:Date.now(), before:LAST});
  applySnap(e.before); toast('Undid: '+e.desc,'Redo',redo);
}
function redo(){
  if(!REDO.length) return;
  var r=REDO.pop(), e={desc:r.desc, at:Date.now(), before:LAST}; UNDO.push(e);
  HIST.push({desc:'Redid: '+r.desc, at:Date.now(), before:LAST});
  applySnap(r.after); toast('Redid: '+r.desc,'Undo',undo);
}
function revertTo(i){
  var h=HIST[i]; if(!h) return;
  var e={desc:'Restored the tree to before: '+h.desc, at:Date.now(), before:LAST};
  UNDO.push(e); REDO=[]; HIST.push(e);
  applySnap(h.before); toast('Restored the tree to before: '+h.desc,'Undo',undo);
}
function syncUndo(){
  var u=$('#undo'), r=$('#redo');
  if(u){ u.disabled=!UNDO.length; u.title=UNDO.length?'Undo: '+UNDO[UNDO.length-1].desc+' (Ctrl+Z)':'Nothing to undo' }
  if(r){ r.disabled=!REDO.length; r.title=REDO.length?'Redo: '+REDO[REDO.length-1].desc+' (Ctrl+Shift+Z)':'Nothing to redo' }
}
var toastT=0;
function toast(msg,act,fn){
  var t=$('#toast'); t.innerHTML=''; var sp=document.createElement('span'); sp.textContent=msg; t.appendChild(sp);
  if(act){ var b=document.createElement('button'); b.type='button'; b.textContent=act; b.onclick=function(){ t.hidden=true; fn() }; t.appendChild(b) }
  t.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){ t.hidden=true },6000);
}
function historySheet(){
  var tm=function(ms){ var d=new Date(ms); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') };
  var rows=HIST.map(function(h,i){return {h:h,i:i}}).reverse();
  var html='<div class="fwrap">'+sheetHead('Edit history','Changes this session','')+'<div class="sbody">'+
    '<p class="note2">Every change you make is listed here, newest first. Restoring puts the tree back as it was just before that change, which also undoes everything after it. The restore itself can be undone. This list clears when the page is closed or reloaded.</p>'+
    (rows.length?'<ul class="hlist">'+rows.map(function(x){
      return '<li><div><time>'+tm(x.h.at)+'</time>'+esc(x.h.desc)+'</div><button class="btn" type="button" data-s="revert" data-i="'+x.i+'">Restore to before</button></li>';
    }).join('')+'</ul>':'<p class="note2"><b>No changes yet.</b></p>')+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(html,null);
}
/* The tree is saved in this browser's local storage after every change. */
function queueSave(){
  if(READONLY) return;
  try{ localStorage.setItem(LSKEY,JSON.stringify(STATE)); setSave('Saved in this browser') }
  catch(_){ setSave('Could not save: this browser’s storage is full or switched off. Export the tree to keep it.') }
}

/* ---------- controls ---------- */
var sel=$('#depth');
function fillDepth(){
  sel.innerHTML='';
  for(var g=1;g<=MAXGEN;g++){var o=document.createElement('option');o.value=g;o.textContent=g;sel.appendChild(o)}
  fitDepth(depthHeld!=null?(savedDepth()||depth):depth);
}
sel.addEventListener('change',function(){depthHeld=null;depth=+sel.value;render()});
/* The number of generations shown is remembered in this browser. When a tree is too short for the remembered number,
   the chart shows what it has and keeps the remembered number for the next, deeper tree. */
var DKEY='pedigree-builder-generations', depthHeld=null;
function savedDepth(){ try{ var v=parseInt(localStorage.getItem(DKEY),10); return v>0?v:0 }catch(_){ return 0 } }
function fitDepth(want){ depth=Math.max(1,Math.min(want,MAXGEN)); depthHeld=want>MAXGEN?depth:null; sel.value=depth }
function keepDepth(){ if(!READONLY&&depth!==depthHeld){ try{ localStorage.setItem(DKEY,String(depth)) }catch(_){} } }
/* View settings: saved with the tree but not part of its edit history. */
function setPref(k,v){ STATE[k]=v; rebuild(); render(true); queueSave() }
function syncPrefs(){
  var a=document.getElementById('showliv'); if(a) a.checked=!!STATE.showLiving;
  var b=document.getElementById('showph'); if(b) b.checked=!STATE.hidePhotos;
  document.querySelectorAll('input[name="nameview"]').forEach(function(r){ r.checked=r.value===(STATE.nameView||'birth') });
}
$('#showliv').addEventListener('change',function(e){ setPref('showLiving',e.target.checked) });
$('#showph').addEventListener('change',function(e){ setPref('hidePhotos',!e.target.checked) });
document.querySelectorAll('input[name="nameview"]').forEach(function(r){ r.addEventListener('change',function(){ if(r.checked) setPref('nameView',r.value) }) });
/* Menus in the toolbar */
function closeMenus(except){ document.querySelectorAll('.menu').forEach(function(m){ if(m===except) return; m.hidden=true; var b=document.querySelector('[aria-controls="'+m.id+'"]'); if(b) b.setAttribute('aria-expanded','false') }) }
document.querySelectorAll('.mwrap>.btn').forEach(function(b){
  b.addEventListener('click',function(){
    var m=document.getElementById(b.getAttribute('aria-controls')), open=m.hidden;
    closeMenus(m); m.hidden=!open; b.setAttribute('aria-expanded',open?'true':'false');
    if(open){ var f=m.querySelector('input,button'); if(f) try{f.focus()}catch(_){} }
  });
});
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.mwrap')) closeMenus() });
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ var open=document.querySelector('.menu:not([hidden])'); if(open){ closeMenus(); var b=document.querySelector('[aria-controls="'+open.id+'"]'); if(b) b.focus(); } }
  if(!(e.ctrlKey||e.metaKey)||e.altKey) return;
  var t=e.target, tag=t&&t.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||!sheet.hidden) return;
  var k=String(e.key).toLowerCase();
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo() }
  else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); redo() }
});
$('#editbar').addEventListener('click',function(e){
  var b=e.target.closest('[data-e]'); if(!b) return;
  var a=b.getAttribute('data-e');
  if(a==='done') setEditing(false);
  else if(a==='famous') famousMgr();
  else if(a==='data') dataMgr();
  else if(a==='me'){ curN=1; editPerson(1,false); }
  else if(a==='undo') undo();
  else if(a==='redo') redo();
  else if(a==='history') historySheet();
});
