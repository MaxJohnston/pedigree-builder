/* Pedigree Builder · js/explore.js
   Find a person, the relationship calculator, tree report, places and migration, and the timeline.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- people search (shared by Find and the relationship calculator) ---------- */
var CANDS=null;
function personCands(){
  if(CANDS) return CANDS;
  CANDS=DATA.filter(function(p){return p.ref==null}).map(function(p){
    var meta=[years(p),p.n===1?'Root':relTo(p.n),p.bp].filter(Boolean).join(' · ');
    return {n:p.n,name:p.name,meta:meta,hay:fold(p.name+' '+(p.bname||'')+' '+(p.mln||'')+' '+meta+' '+(p.dp||''))};
  }).sort(function(a,b){return dep(a.n)-dep(b.n)||a.n-b.n});
  return CANDS;
}
function searchCands(list,qs){
  var toks=fold(qs).split(/\s+/).filter(Boolean);
  var out=list.filter(function(c){ return toks.every(function(t){return c.hay.indexOf(t)>=0}) });
  if(toks.length) out.sort(function(a,b){ var A=fold(a.name).indexOf(toks[0])===0?0:1, B=fold(b.name).indexOf(toks[0])===0?0:1; return A-B });
  return out.slice(0,40);
}
/* An option's value: a person's number, or text such as "f:Name" for a famous relative. */
function optVal(li){ var v=li.getAttribute('data-n'); return /^-?\d+$/.test(v)?+v:v }
/* A search box with a list of matches: arrows move, Enter picks, Escape closes the list. */
function makeCombo(inp,ul,cands,onPick){
  var hi=-1;
  function setAD(){
    var items=ul.querySelectorAll('[role="option"]');
    items.forEach(function(li,i){ li.setAttribute('aria-selected',i===hi?'true':'false') });
    if(items[hi]){ inp.setAttribute('aria-activedescendant',items[hi].id); try{items[hi].scrollIntoView({block:'nearest'})}catch(_){} }
  }
  function draw(){
    var res=searchCands(cands(),inp.value); hi=res.length?0:-1;
    ul.innerHTML=res.length?res.map(function(c,i){return '<li role="option" id="'+ul.id+'-'+i+'" data-n="'+esc(String(c.n))+'"><b>'+hiText(c.name,inp.value)+'</b><span>'+hiText(c.meta,inp.value)+'</span></li>'}).join('')
      :'<li class="none" role="presentation">No one matches “'+esc(inp.value)+'”.</li>';
    ul.hidden=false; inp.setAttribute('aria-expanded','true'); setAD();
  }
  function hide(){ ul.hidden=true; inp.setAttribute('aria-expanded','false'); inp.removeAttribute('aria-activedescendant'); hi=-1 }
  function pick(n){ hide(); onPick(n) }
  inp.addEventListener('input',function(){ if(inp.value.trim()) draw(); else hide() });
  inp.addEventListener('blur',function(){ setTimeout(function(){ if(document.activeElement!==inp) hide() },150) });
  inp.addEventListener('keydown',function(e){
    var open=!ul.hidden, items=ul.querySelectorAll('[role="option"]');
    if(e.key==='ArrowDown'){ e.preventDefault(); if(!open){ if(inp.value.trim()) draw() } else if(items.length){ hi=(hi+1)%items.length; setAD() } }
    else if(e.key==='ArrowUp'){ e.preventDefault(); if(open&&items.length){ hi=(hi-1+items.length)%items.length; setAD() } }
    else if(e.key==='Enter'){ if(open&&hi>=0&&items[hi]){ e.preventDefault(); pick(optVal(items[hi])) } }
    else if(e.key==='Escape'&&open){ e.preventDefault(); e.stopPropagation(); hide() }
  });
  ul.addEventListener('mousedown',function(e){ e.preventDefault() });
  ul.addEventListener('click',function(e){ var li=e.target.closest('[role="option"]'); if(li) pick(optVal(li)) });
  return {hide:hide};
}
/* Find: show the person on the chart, switching to the root's tree and adding generations when needed. */
function findPerson(n){
  n=canonOf(n); if(!P.has(n)) return;
  closeSheet(); closeMenus();
  if(!cardEl(n)){
    var m=ancSteps(view);
    if(!m.has(n)){ view=1; try{history.replaceState(null,'','#p1')}catch(_){} m=ancSteps(1) }
    var need=(m.get(n)||0)+1;
    if(depth<need){ depth=Math.min(need,MAXGEN); sel.value=depth }
    if(czFocus&&czSel.size) czFocus=false;
    render(true);
  }
  flash(n);
  var c=cardEl(n); if(c){ var b=c.querySelector('[data-act="details"]'); if(b) try{b.focus({preventScroll:true})}catch(_){} }
}
/* Famous relatives who are not ancestors are listed in Find too. Picking one turns on Famous relatives, adds
   generations or switches back to the root's tree if needed, and draws their line of descent. */
function famCands(){
  return FAMOUS.filter(function(f){return !f.ancestor}).map(function(f){
    var yrs=famYears(f);
    var meta=[f.title,yrs,'Famous relative'].filter(Boolean).join(' · ');
    return {n:'f:'+f.name, name:f.name, meta:meta, hay:fold(f.name+' '+meta)};
  });
}
function findCands(){ return personCands().concat(famCands()) }
function findFamous(name){
  var f=FAMOUS.filter(function(x){return x.name===name})[0]; if(!f) return;
  closeSheet(); closeMenus();
  if(!czOn){ czOn=true; try{localStorage.setItem('pedigree-builder-cz','1')}catch(_){} }
  czFocus=false;
  if(!famRels(f).length&&view!==1){ view=1; try{history.replaceState(null,'','#p1')}catch(_){} render(true) }
  var rels=famRels(f).filter(function(r){return r.g-r.v.k>=0});
  if(rels.length){ var need=Math.min.apply(null,rels.map(function(r){return r.g}))+1; if(depth<need){ depth=Math.min(need,MAXGEN); sel.value=depth } }
  czSel.clear(); czSel.set(f.name,0);
  render(true);
  /* an ancestor reached by routes of different lengths is drawn in the further generation: add generations until the line fits */
  while(!routesOf(f).length&&rels.length&&depth<MAXGEN){ depth++; sel.value=depth; render(true) }
  var cards=[], guest=null;
  GUEST.forEach(function(nd){ if(nd.famous===f){ var c=cardEl(nd.n); if(c){ cards.push(c); guest=guest||c } } });
  var r=routesOf(f)[0]; if(r) cards.push(cardEl(r.v.anc));
  centerOn(cards);
  try{stage.scrollIntoView({block:'nearest'})}catch(_){}
  if(guest){ guest.classList.add('refhl'); setTimeout(function(){ guest.classList.remove('refhl') },2400) }
  else toast(f.name+' is too far back to draw from this tree. Raise Generations to see the line.');
}
makeCombo($('#find'),$('#findlist'),findCands,function(n){ $('#find').value=''; if(typeof n==='string'&&n.indexOf('f:')===0) findFamous(n.slice(2)); else findPerson(n) });

/* ---------- Explore ---------- */
$('#exploremenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-x]'); if(!b) return;
  var x=b.getAttribute('data-x'); closeMenus();
  if(x==='rel') relSheet(1,null);
  else if(x==='report') reportSheet();
  else if(x==='places') placesSheet();
  else if(x==='timeline') timelineSheet();
});

/* ----- relationship calculator ----- */
function upDist(x){
  var d=new Map([[x,0]]), prev=new Map(), q=[x];
  for(var i=0;i<q.length&&i<20000;i++){
    var y=q[i];
    [fa(y),mo(y)].forEach(function(z){ if(!P.has(z)) return; z=canonOf(z); if(!d.has(z)){ d.set(z,d.get(y)+1); prev.set(z,y); q.push(z) } });
  }
  return {d:d,prev:prev};
}
function pathUp(U,from,to){ var out=[to], x=to; while(x!==from&&U.prev.has(x)){ x=U.prev.get(x); out.push(x) } return out.reverse() }
function word(sx,m,f,u){ return sx==='M'?m:sx==='F'?f:u }
function ancLabelS(g,sx){
  if(g===1) return word(sx,'father','mother','parent');
  if(g===2) return word(sx,'grandfather','grandmother','grandparent');
  var b=word(sx,'great-grandfather','great-grandmother','great-grandparent');
  return g===3?b:ord(g-2)+' '+b;
}
function descLabelS(g,sx){
  if(g===1) return word(sx,'son','daughter','child');
  if(g===2) return word(sx,'grandson','granddaughter','grandchild');
  var b=word(sx,'great-grandson','great-granddaughter','great-grandchild');
  return g===3?b:ord(g-2)+' '+b;
}
/* B's relationship to A when A is g generations below the shared ancestor and B is k generations below. */
function kinLabel(g,k,half,sx){
  var pre=half?'half-':'', m=Math.min(g,k), diff=Math.abs(g-k);
  if(m===1){
    if(g===k) return pre+word(sx,'brother','sister','sibling');
    if(k<g) return pre+greatPre(diff-1)+word(sx,'uncle','aunt','parent’s sibling');
    return pre+(diff===1?'':diff===2?'grand-':diff===3?'great-grand-':ord(diff-2)+' great-grand-')+word(sx,'nephew','niece','sibling’s child');
  }
  var s2=(half?'half ':'')+ord(m-1)+' cousin';
  if(diff) s2+=', '+(diff===1?'once':diff===2?'twice':diff+' times')+' removed';
  return s2;
}
function relCompute(A,B){
  A=canonOf(A); B=canonOf(B);
  var pa=P.get(A), pb=P.get(B);
  if(A===B) return {big:'That is the same person.'};
  var UA=upDist(A), UB=upDist(B);
  if(UA.d.has(B)){ var g=UA.d.get(B); return {big:pb.name+' is '+pa.name+'’s '+ancLabelS(g,sexOf(B))+'.', path:pathUp(UA,A,B).map(function(x){return {n:x}}), top:B} }
  if(UB.d.has(A)){ var g2=UB.d.get(A); return {big:pb.name+' is '+pa.name+'’s '+descLabelS(g2,sexOf(B))+'.', path:pathUp(UB,B,A).reverse().map(function(x){return {n:x}}), top:A} }
  var best=Infinity, commons=[];
  UA.d.forEach(function(da,x){ if(!UB.d.has(x)) return; var t=da+UB.d.get(x); if(t<best){best=t;commons=[x]} else if(t===best) commons.push(x) });
  if(commons.length){
    var C=commons[0], g3=UA.d.get(C), k=UB.d.get(C);
    var pA=pathUp(UA,A,C), pB=pathUp(UB,B,C);
    var half=false;
    if(commons.length===1&&pA.length>1){
      var cA=pA[pA.length-2], other=canonOf(fa(cA)===C||canonOf(fa(cA))===C?mo(cA):fa(cA));
      if(P.has(other)&&!UB.d.has(other)) half=true;
    }
    var path=pA.map(function(x){return {n:x,up:true}}).concat(pB.slice(0,-1).reverse().map(function(x){return {n:x,down:true}}));
    var lbl=kinLabel(g3,k,half,sexOf(B));
    return {big:pb.name+' is '+pa.name+'’s '+lbl+'.', path:path, top:C, commons:commons,
      note:'Shared ancestor'+(commons.length>1?'s':'')+': '+commons.map(function(x){return P.get(x).name}).join(' and ')+'.'+(half?' They share only one of the couple, so the relationship is a half one.':'')};
  }
  var kA=KIDS.get(A)||[], shared=kA.filter(function(c){ var f=canonOf(fa(c)), m=canonOf(mo(c)); return (f===A&&m===B)||(f===B&&m===A) });
  if(shared.length) return {big:pb.name+' and '+pa.name+' are partners: the parents of '+shared.map(function(c){return P.get(c).name}).join(' and ')+'.'};
  return {big:'No shared ancestor is recorded, so '+pa.name+' and '+pb.name+' are not related by blood in this tree.',
    note:(A!==1?pa.name+' is '+first()+'’s '+relTo(A).toLowerCase()+'. ':'')+(B!==1?pb.name+' is '+first()+'’s '+relTo(B).toLowerCase()+'.':'')};
}
var relA=1, relB=null;
function relSheet(a,b){
  relA=a; relB=b;
  var nm=function(n){return n!=null&&P.has(n)?P.get(n).name:''};
  var h='<div class="fwrap">'+sheetHead('Explore','Relationship calculator','How any two people in the tree are related')+'<div class="sbody">'+
    '<div class="relgrid">'+
      '<div class="f combo"><label for="rel-a">First person</label><input type="search" id="rel-a" value="'+esc(nm(relA))+'" role="combobox" aria-expanded="false" aria-controls="rel-al" aria-autocomplete="list" autocomplete="off" placeholder="Type a name"><ul class="combolist" id="rel-al" role="listbox" hidden></ul></div>'+
      '<div class="f combo"><label for="rel-b">Second person</label><input type="search" id="rel-b" value="'+esc(nm(relB))+'" role="combobox" aria-expanded="false" aria-controls="rel-bl" aria-autocomplete="list" autocomplete="off" placeholder="Type a name"><ul class="combolist" id="rel-bl" role="listbox" hidden></ul></div>'+
    '</div>'+
    '<div class="btnrow"><button class="btn" type="button" data-s="rel-swap">Swap</button></div>'+
    '<div id="relout" aria-live="polite"></div>'+
    '<p class="note2">Works for anyone in the tree, including ancestors who appear more than once. Relationships come from the parents recorded here, so a missing parent can hide a connection.</p>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null,false);
  makeCombo(sheet.querySelector('#rel-a'),sheet.querySelector('#rel-al'),personCands,function(n){ relA=n; sheet.querySelector('#rel-a').value=P.get(n).name; relDraw() });
  makeCombo(sheet.querySelector('#rel-b'),sheet.querySelector('#rel-bl'),personCands,function(n){ relB=n; sheet.querySelector('#rel-b').value=P.get(n).name; relDraw() });
  relDraw();
  if(relB==null) try{sheet.querySelector('#rel-b').focus()}catch(_){}
}
function relDraw(){
  var o=sheet.querySelector('#relout'); if(!o) return;
  if(relA==null||relB==null||!P.has(relA)||!P.has(relB)){ o.className=''; o.innerHTML='<p class="note2">Choose two people.</p>'; return }
  var r=relCompute(relA,relB);
  var h='<p class="big">'+esc(r.big)+'</p>';
  if(r.path&&r.path.length) h+='<ol class="relpath" aria-label="Line of descent">'+r.path.map(function(x,i){
    var isTop=x.n===r.top, ar=i===0?'•':(x.down?'↓':'↑');
    if(r.path[0]&&r.path[0].up&&i>0&&!x.down) ar='↑';
    return '<li class="'+(isTop?'ca':'')+'"><span class="ar" aria-hidden="true">'+ar+'</span><span><button type="button" class="linkbtn" data-s="rel-find" data-n="'+x.n+'"><b>'+esc(P.get(x.n).name)+'</b></button> <span class="mute">'+esc(years(P.get(x.n)))+(isTop&&r.commons?' · shared ancestor':'')+'</span></span></li>';
  }).join('')+'</ol>';
  if(r.note) h+='<p class="note2">'+esc(r.note)+'</p>';
  o.className='relout'; o.innerHTML=h;
}

/* ----- tree report: completeness and brick walls ----- */
function reportData(){
  var rows=[], layer=new Map([[1,1]]);
  for(var g=1;g<=80;g++){
    var next=new Map();
    layer.forEach(function(c,x){ [fa(x),mo(x)].forEach(function(y){ if(!P.has(y)) return; y=canonOf(y); next.set(y,(next.get(y)||0)+c) }) });
    if(!next.size) break;
    var pos=0; next.forEach(function(c){pos+=c});
    rows.push({g:g,pos:pos,uniq:next.size,max:Math.pow(2,g)});
    layer=next;
  }
  var ppl=DATA.filter(function(p){return p.ref==null});
  var R=ratioMaps(1), share=function(n){ var w=R.w.get(n); return w==null?0:Number(w)/18446744073709551616*100 };
  var walls=[];
  ppl.forEach(function(p){
    var mf=!P.has(fa(p.n)), mm=!P.has(mo(p.n));
    if(mf||mm) walls.push({n:p.n,mf:mf,mm:mm,share:share(p.n)/2*((mf?1:0)+(mm?1:0))});
  });
  walls.sort(function(a,b){return dep(a.n)-dep(b.n)||b.share-a.share||a.n-b.n});
  var k={people:ppl.length,
    born:ppl.filter(function(p){return p.b}).length,
    bp:ppl.filter(function(p){return p.bp}).length,
    dead:ppl.filter(function(p){return !p.l}).length,
    died:ppl.filter(function(p){return !p.l&&p.d}).length,
    src:ppl.filter(function(p){return p.src&&p.src.length}).length,
    dna:ppl.filter(function(p){return dnaOf(p.n)}).length,
    ph:ppl.filter(function(p){return (STATE.photos||{})[p.n]}).length};
  return {rows:rows,walls:walls,k:k};
}
var wallsAll=false;
function reportSheet(){
  var D=reportData(), k=D.k, pct=function(a,b){return b?Math.round(a/b*100)+'%':'—'};
  var fmt=function(x){ return x>=1e6?x.toExponential(2).replace('e+','×10^'):Math.round(x).toLocaleString() };
  var kp=function(v,l){return '<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>'};
  var wl=D.walls, shown=wallsAll?wl:wl.slice(0,60);
  var h='<div class="fwrap">'+sheetHead('Explore','Tree report','How complete '+first()+'’s tree is, and where each line stops')+'<div class="sbody">'+
    '<section><h3 class="sh3">At a glance</h3><div class="kpis">'+
      kp(k.people.toLocaleString(),'people in the tree')+
      kp(pct(k.born,k.people),'have a birth year')+
      kp(pct(k.bp,k.people),'have a birthplace')+
      kp(pct(k.died,k.dead),'of the deceased have a death year')+
      kp(pct(k.src,k.people),'have at least one source')+
      kp(k.dna.toLocaleString(),'DNA confirmed')+
      kp(k.ph.toLocaleString(),'with a photo')+
    '</div></section>'+
    '<section><h3 class="sh3">Completeness by generation</h3><div class="tscroll"><table class="tbl"><thead><tr><th>Gen.</th><th>Who</th><th class="num">Known</th><th class="num">Possible</th><th>Filled</th><th class="num">Different people</th></tr></thead><tbody>'+
      D.rows.map(function(r){ var f=r.pos/r.max*100;
        return '<tr><td class="num">'+(r.g+1)+'</td><td>'+esc(genLabel(r.g))+'</td><td class="num">'+fmt(r.pos)+'</td><td class="num">'+fmt(r.max)+'</td><td><div class="bar" title="'+f.toFixed(f<1?2:0)+'%"><i style="width:'+Math.max(f>0?1:0,Math.min(100,f))+'%"></i></div></td><td class="num">'+r.uniq.toLocaleString()+(r.uniq<r.pos?' <span class="mute">('+fmt(r.pos-r.uniq)+' repeats)</span>':'')+'</td></tr>';
      }).join('')+
    '</tbody></table></div><p class="note2">“Known” counts each place in the pedigree, so an ancestor who appears twice counts twice. “Different people” counts them once.</p></section>'+
    '<section><h3 class="sh3">Brick walls · '+wl.length+'</h3><p class="note2">People whose father or mother is not recorded, closest generations first. The share is how much of '+first()+'’s ancestry is missing behind them.</p>'+
      '<div class="tscroll"><table class="tbl"><thead><tr><th>Person</th><th>Relation</th><th>Missing</th><th class="num">Share</th><th></th></tr></thead><tbody>'+
      shown.map(function(w){ var p=P.get(w.n);
        var miss=w.mf&&w.mm?'Both parents':w.mf?'Father':'Mother';
        var adds=READONLY?'':(w.mf?'<button class="btn" type="button" data-s="wall-add" data-n="'+fa(w.n)+'" data-c="'+w.n+'">Add father</button> ':'')+(w.mm?'<button class="btn" type="button" data-s="wall-add" data-n="'+mo(w.n)+'" data-c="'+w.n+'">Add mother</button>':'');
        return '<tr><td><button type="button" class="linkbtn" data-s="rel-find" data-n="'+w.n+'">'+esc(p.name)+'</button><br><span class="mute">'+esc(years(p))+'</span></td><td>'+esc(w.n===1?'Root':relTo(w.n))+'</td><td>'+miss+'</td><td class="num">'+(w.share>=0.01?w.share.toFixed(w.share>=1?1:2):w.share.toPrecision(2))+'%</td><td><div class="btnrow">'+adds+'</div></td></tr>';
      }).join('')+'</tbody></table></div>'+
      (wl.length>shown.length?'<button class="btn" type="button" data-s="walls-all">Show all '+wl.length+'</button>':'')+
    '</section>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null,true);
}

/* ----- places: birthplace mix ----- */
/* "Birthplace mix" tab: how the ancestors in one generation divide up by the flag of their birthplace. Every slot of that
   generation counts 1/2^(g-1). A slot with no person, or a person with no birthplace, takes the birthplace of the nearest
   descendant on that line who has one, so a line that stops early still counts in full. Counts are kept as whole numbers
   of slots, so the fractions are exact. */
var plTab='moves', plGen=0;
function birthMix(root,g){
  var memo=new Map(), rep={};
  var keyOf=function(bp){ var f=flagOf(bp), k=f.code?f.code:'?'+f.label; if(!rep[k]) rep[k]=bp; return k };
  var one=function(k,rem){ var o={}; o[k]=Math.pow(2,rem); return o };
  var walk=function(n,rem,inh){
    if(!P.has(n)) return one(inh,rem);
    var c=canonOf(n), p=P.get(c), own=p.bp?keyOf(p.bp):'', k=own||inh;
    if(rem===0||(!P.has(fa(c))&&!P.has(mo(c)))) return one(k,rem);
    var mk=c+'|'+rem+'|'+(own?'':inh); if(memo.has(mk)) return memo.get(mk);
    var a=walk(fa(c),rem-1,k), b=walk(mo(c),rem-1,k), o={};
    [a,b].forEach(function(d){ for(var x in d) o[x]=(o[x]||0)+d[x] });
    memo.set(mk,o); return o;
  };
  return {d:walk(root,g-1,''), rep:rep};
}
function mixSheetBody(){
  var maxG=Math.max(2,DEEPEST||2), g=Math.min(Math.max(2,plGen||depth),maxG); plGen=g;
  var bm=birthMix(view,g), d=bm.d, tot=Math.pow(2,g-1);
  var gcd=function(a,b){ while(b){ var t=a%b; a=b; b=t } return a };
  var rows=Object.keys(d).map(function(k){
    var f=k===''?{code:'',label:'Not recorded',sub:'No birthplace on this line',src:''}:flagOf(bm.rep[k]);
    var c=d[k], q=gcd(c,tot); return {k:k,f:f,c:c,fr:c===tot?'All':(c/q)+'/'+(tot/q),pc:100*c/tot};
  }).sort(function(a,b){ return (a.k==='')-(b.k==='')||b.c-a.c||a.f.label.localeCompare(b.f.label) });
  var opts=''; for(var i=2;i<=maxG;i++) opts+='<option value="'+i+'"'+(i===g?' selected':'')+'>'+i+' · '+esc(genLabel(i-1))+'</option>';
  /* the pie: each slice filled with its flag, cropped to the slice */
  var R=120, C=R+4, a0=-Math.PI/2, defs='', sl='';
  var pt=function(a){ return [C+R*Math.cos(a), C+R*Math.sin(a)] };
  rows.forEach(function(r,i){
    var span=2*Math.PI*r.c/tot, a1=a0+span, path, tt=r.f.label+(r.f.sub?' ('+r.f.sub+')':'')+': '+r.fr+' · '+(r.pc>=1?r.pc.toFixed(1):r.pc.toPrecision(2))+'%';
    if(rows.length===1) path='M'+(C-R)+' '+C+'A'+R+' '+R+' 0 1 1 '+(C+R)+' '+C+'A'+R+' '+R+' 0 1 1 '+(C-R)+' '+C+'Z';
    else { var p0=pt(a0), p1=pt(a1); path='M'+C+' '+C+'L'+p0[0].toFixed(2)+' '+p0[1].toFixed(2)+'A'+R+' '+R+' 0 '+(span>Math.PI?1:0)+' 1 '+p1[0].toFixed(2)+' '+p1[1].toFixed(2)+'Z' }
    var fill='var(--rule)';
    if(r.f.src){
      var xs=[C], ys=[C]; for(var s=0;s<=24;s++){ var q=pt(a0+span*s/24); xs.push(q[0]); ys.push(q[1]) }
      if(rows.length===1){ xs=[C-R,C+R]; ys=[C-R,C+R] }
      var x0=Math.min.apply(null,xs), y0=Math.min.apply(null,ys), w=Math.max.apply(null,xs)-x0, h=Math.max.apply(null,ys)-y0;
      defs+='<pattern id="pfl'+i+'" patternUnits="userSpaceOnUse" x="'+x0.toFixed(1)+'" y="'+y0.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'"><image href="'+r.f.src+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" preserveAspectRatio="xMidYMid slice"/></pattern>';
      fill='url(#pfl'+i+')';
    }
    sl+='<path d="'+path+'" style="fill:'+fill+'"'+(r.f.src?'':' class="nof"')+'><title>'+esc(tt)+'</title></path>';
    a0=a1;
  });
  var pie='<svg class="mixpie" viewBox="0 0 '+(2*C)+' '+(2*C)+'" role="img" aria-label="Birthplaces of '+esc(P.get(view).name)+'’s '+esc(genLabel(g-1).toLowerCase())+'"><defs>'+defs+'</defs>'+sl+'</svg>';
  var leg='<ul class="mixleg">'+rows.map(function(r){
    return '<li><span class="mflag'+(r.f.src?'':' none')+'">'+(r.f.src?'<img src="'+r.f.src+'" alt="">':'?')+'</span><span class="mname">'+esc(r.f.label)+(r.f.sub?'<small>'+esc(r.f.sub)+'</small>':'')+'</span><span class="mfr">'+r.fr+'</span><span class="mpc">'+(r.pc>=1?r.pc.toFixed(1):r.pc.toPrecision(2))+'%</span></li>' }).join('')+'</ul>';
  return '<div class="btnrow" style="align-items:center"><label class="note2" for="pl-gen">Generation</label><select id="pl-gen" class="mixsel">'+opts+'</select></div>'+
    '<section><h3 class="sh3">Birthplaces of '+esc(P.get(view).name)+'’s '+esc(genLabel(g-1).toLowerCase())+'</h3>'+
    '<div class="mixwrap">'+pie+leg+'</div>'+
    '<p class="note2">Each of the '+tot.toLocaleString()+' places in this generation counts '+(tot>1?'1/'+tot.toLocaleString():'in full')+'. Where a line has no person or no birthplace that far back, it takes the birthplace of the nearest person below on that line who has one.</p></section>';
}
sheet.addEventListener('change',function(e){ if(e.target.id==='pl-gen'){ plGen=+e.target.value; placesSheet(); var s=sheet.querySelector('#pl-gen'); if(s) try{s.focus({preventScroll:true})}catch(_){} } });

/* ----- places and migration ----- */
function placeKey(pl,lvl){
  var t=String(pl||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
  if(!t.length) return '';
  if(lvl==='country') return t[t.length-1];
  if(lvl==='region') return t.slice(-2).join(', ');
  return t.join(', ');
}
var plLvl='region';
function placesSheet(lvl){
  if(lvl) plLvl=lvl; else lvl=plLvl;
  var tabs='<div class="seg pltabs" role="group" aria-label="Show"><button type="button" data-s="pl-tab" data-v="moves" aria-pressed="'+(plTab==='moves')+'">Migration</button><button type="button" data-s="pl-tab" data-v="mix" aria-pressed="'+(plTab==='mix')+'">Birthplace mix</button></div>';
  if(plTab==='mix'){
    openSheet('<div class="fwrap">'+sheetHead('Explore','Places and migration','Where '+first()+'’s ancestors were born, and where families moved')+'<div class="sbody">'+tabs+mixSheetBody()+
      '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>',null,true);
    return;
  }
  var ppl=DATA.filter(function(p){return p.ref==null});
  var byGen={};
  ppl.forEach(function(p){ if(!p.bp) return; var g=dep(p.n), k=placeKey(p.bp,lvl); (byGen[g]=byGen[g]||{})[k]=(byGen[g][k]||0)+1 });
  var flows={}, add=function(key,from,to,who,y){ var f=flows[key]||(flows[key]={from:from,to:to,n:0,who:[],y0:9999,y1:0}); f.n++; if(f.who.length<4) f.who.push(who); if(y){f.y0=Math.min(f.y0,y);f.y1=Math.max(f.y1,y)} };
  ppl.forEach(function(c){
    if(!c.bp) return; var to=placeKey(c.bp,lvl);
    [fa(c.n),mo(c.n)].forEach(function(x){ if(!P.has(x)) return; var q=P.get(canonOf(x)); if(!q.bp) return; var fr=placeKey(q.bp,lvl); if(fr!==to) add('g|'+fr+'|'+to,fr,to,c.name,c.b) });
  });
  var life={};
  ppl.forEach(function(p){ if(!p.bp||!p.dp) return; var fr=placeKey(p.bp,lvl), to=placeKey(p.dp,lvl); if(fr===to) return;
    var k=fr+'|'+to, f=life[k]||(life[k]={from:fr,to:to,n:0,who:[],y0:9999,y1:0}); f.n++; if(f.who.length<4) f.who.push(p.name); if(p.b){f.y0=Math.min(f.y0,p.b);f.y1=Math.max(f.y1,p.b)} });
  var list=function(o){ return Object.keys(o).map(function(k){return o[k]}).sort(function(a,b){return a.y0-b.y0||b.n-a.n}) };
  var flowHTML=function(arr,verb){ return arr.length?arr.map(function(f){
    return '<div class="flow"><span class="fr">'+esc(f.from)+' → '+esc(f.to)+'</span><span class="mute">'+f.n+' '+(f.n===1?'person':'people')+(f.y0<9999?' · born '+(f.y0===f.y1?f.y0:f.y0+'–'+f.y1):'')+'</span><span class="who2">'+esc(f.who.join(', '))+(f.n>f.who.length?' and '+(f.n-f.who.length)+' more':'')+'</span></div>' }).join(''):'<p class="note2">None found at this level. Try a more detailed grouping, or add more birthplaces.</p>' };
  var gens=Object.keys(byGen).map(Number).sort(function(a,b){return a-b});
  var seg=function(v,l){return '<button type="button" data-s="pl-lvl" data-v="'+v+'" aria-pressed="'+(lvl===v)+'">'+l+'</button>'};
  var h='<div class="fwrap">'+sheetHead('Explore','Places and migration','Where '+first()+'’s ancestors were born, and where families moved')+'<div class="sbody">'+tabs+
    '<div class="btnrow" style="align-items:center"><span class="note2">Group places by</span><div class="seg" role="group" aria-label="Group places by">'+seg('country','Country')+seg('region','State or region')+seg('town','Town')+'</div></div>'+
    '<section><h3 class="sh3">Moves from parent to child</h3><p class="note2">A parent born in one place with a child born somewhere else, earliest first.</p>'+flowHTML(list(flows))+'</section>'+
    '<section><h3 class="sh3">Moves during a lifetime</h3><p class="note2">People who died somewhere other than where they were born.</p>'+flowHTML(list(life))+'</section>'+
    '<section><h3 class="sh3">Birthplaces by generation</h3><div class="tscroll"><table class="tbl"><tbody>'+
      (gens.length?gens.map(function(g){ var o=byGen[g], ks=Object.keys(o).sort(function(a,b){return o[b]-o[a]});
        return '<tr><td style="width:12em">'+esc(genLabel(g))+'</td><td><div class="chips">'+ks.slice(0,14).map(function(k2){return '<span class="chip">'+esc(k2)+(o[k2]>1?' <i>×'+o[k2]+'</i>':'')+'</span>'}).join('')+(ks.length>14?'<span class="chip"><i>+'+(ks.length-14)+' more</i></span>':'')+'</div></td></tr>' }).join('')
        :'<tr><td>No birthplaces recorded yet.</td></tr>')+
    '</tbody></table></div></section>'+
    '<p class="note2">Places are grouped by how they are written, so “Lucca, Italy” and “Lucca, Tuscany, Italy” count separately at the town level. A map is not shown because this page cannot load map images.</p>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null,true);
}

/* ----- timeline ----- */
var HISTEV=[[1066,0,'Norman conquest of England'],[1215,0,'Magna Carta'],[1337,1453,'Hundred Years’ War'],[1347,1351,'Black Death'],[1455,1487,'Wars of the Roses'],
  [1492,0,'Columbus reaches the Americas'],[1517,0,'Reformation begins'],[1588,0,'Spanish Armada'],[1607,0,'Jamestown founded'],[1620,0,'Mayflower lands'],[1618,1648,'Thirty Years’ War'],
  [1642,1651,'English Civil War'],[1754,1763,'French and Indian War'],[1775,1783,'American Revolution'],[1789,1799,'French Revolution'],[1812,1815,'War of 1812'],
  [1845,1852,'Irish Famine'],[1861,1865,'U.S. Civil War'],[1892,1954,'Ellis Island open'],[1914,1918,'World War I'],[1918,1920,'Influenza pandemic'],[1929,1939,'Great Depression'],
  [1939,1945,'World War II'],[1950,1953,'Korean War'],[1955,1975,'Vietnam War'],[1969,0,'Moon landing'],[1989,0,'Berlin Wall falls'],[2001,0,'September 11 attacks']];
var tlOrder='gen'; try{ tlOrder=localStorage.getItem('pedigree-builder-timeline-order')||'gen' }catch(_){}
function timelineSheet(){
  var now=new Date().getFullYear(), hidden=0;
  var ppl=[];
  DRAWN.forEach(function(n){ if(n<1||!P.has(n)) return; var p=P.get(n); if(p.ref!=null) return;
    if(p.l&&!STATE.showLiving){ hidden++; return }
    if(!p.b&&!p.d) return; ppl.push(p) });
  ppl.sort(function(a,b){return dep(a.n)-dep(b.n)||(a.b||a.d||0)-(b.b||b.d||0)});
  /* "Family order": everyone sits between their parents, father's side above and mother's side below (as on the chart,
     so "Show mother above father" is followed); people drawn only as guests come last */
  if(tlOrder==='family'){
    var inl=new Set(ppl.map(function(p){return p.n})), seenF=new Set(), fam=[];
    (function walk(n){
      if(!P.has(n)) return; var c=canonOf(n); if(seenF.has(c)) return; seenF.add(c);
      var p=P.get(c), two=p.mf?[mo(c),fa(c)]:[fa(c),mo(c)];
      walk(two[0]); if(inl.has(c)) fam.push(p); walk(two[1]);
    })(view);
    ppl.forEach(function(p){ if(!seenF.has(p.n)) fam.push(p) });
    ppl=fam;
  }
  var h0='<div class="fwrap">'+sheetHead('Explore','Timeline','Lifespans of the people in the current view, against history')+'<div class="sbody">';
  if(!ppl.length){ openSheet(h0+'<p class="note2"><b>No dates to show.</b> Add birth or death years, or raise Generations.</p></div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>',null,true); return }
  var span=function(p){ var a=p.b||(p.d-60), z=p.d||(p.l?now:(p.b+60)); return [a,z] };
  var y0=Infinity, y1=-Infinity; ppl.forEach(function(p){ var s2=span(p); y0=Math.min(y0,s2[0]); y1=Math.max(y1,s2[1]) });
  var st=(y1-y0)>400?50:(y1-y0)>150?25:10;
  y0=Math.floor((y0-3)/st)*st; y1=Math.min(now+5,Math.ceil((y1+3)/st)*st);
  /* drawn at the panel's real width (it can be widened by dragging its left edge), so text stays the same size and
     nothing scrolls sideways: the panel is opened first, then the chart is measured to fit it */
  var note='<p class="note2">Showing the '+ppl.length+' people in the current chart view'+(hidden?' ('+hidden+' living '+(hidden===1?'person':'people')+' hidden, because birth years of living people are switched off)':'')+'. Raise Generations to include more. Faded bars have uncertain or missing dates; dots are events. Purple marks are historical events; short ones are shaded down the chart, long ones are a line along the top.</p>';
  var ord='<div class="btnrow" style="align-items:center"><span class="note2">Order</span><div class="seg" role="group" aria-label="Order of the people">'+
    '<button type="button" data-s="tl-ord" data-v="gen" aria-pressed="'+(tlOrder!=='family')+'">By generation</button>'+
    '<button type="button" data-s="tl-ord" data-v="family" aria-pressed="'+(tlOrder==='family')+'">Between their parents</button></div></div>';
  openSheet(h0+note+ord+'<div class="tlwrap" id="tlwrap"></div></div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>',null,true);
  var wrap=sheet.querySelector('#tlwrap');
  var W=Math.max(300,Math.floor(wrap.clientWidth)||760), LW=Math.min(230,Math.round(W*.3)), RH=17, NM=Math.max(10,Math.floor((LW-12)/6.6));
  /* year marks at least 36 pixels apart, so they never run into each other on a narrow screen */
  [10,25,50,100,200,250,500,1000].some(function(s2){ st=Math.max(st,s2); return s2/(y1-y0)*(W-LW-14)>=36 });
  y0=Math.floor(y0/st)*st; y1=Math.min(now+5,Math.ceil(y1/st)*st);
  var X=function(y){ return LW+(y-y0)/(y1-y0)*(W-LW-14) };
  /* each label goes in the first row where it overlaps no other label and no other event's line, and where its own line,
     which runs down from it to the axis, crosses no label below it (labels near the right edge read leftwards) */
  var lanes=[], evs=[];
  HISTEV.slice().sort(function(a,b){return a[0]-b[0]}).forEach(function(e){
    var a=e[0], b=e[1]||e[0]; if(b<y0||a>y1) return;
    var xa=X(Math.max(a,y0)), xb=X(Math.min(b,y1)), wd=e[2].length*5.9+8, right=xa+wd>W-4;
    var l0=right?xa-wd:xa, l1=right?xa:xa+wd, ln=0;
    var clash=function(L,lines){
      return evs.some(function(o){
        if(o.ln===L&&l0<o.l1+4&&l1>o.l0-4) return true;
        if(lines&&o.ln<L&&o.xa>l0-3&&o.xa<l1+3) return true;
        if(lines&&o.ln>L&&xa>o.l0-3&&xa<o.l1+3) return true;
        return false });
    };
    while(ln<=lanes.length&&clash(ln,true)) ln++;
    /* two events too close together for that: settle for a row where only a line crosses */
    if(ln>lanes.length){ ln=0; while(clash(ln,false)) ln++ }
    (lanes[ln]=lanes[ln]||[]).push([l0,l1]);
    evs.push({e:e,a:a,b:b,xa:xa,xb:xb,ln:ln,right:right,l0:l0,l1:l1});
  });
  /* two pictures sharing one set of coordinates: the years and events (HB high) stay at the top of the panel while
     the lifespans below them scroll */
  var HT=Math.max(72,lanes.length*15+12), HB=HT+26, top=HB+10, H=top+ppl.length*RH+4;
  var hd='', bd='', lab='';
  for(var y=y0;y<=y1;y+=st){
    hd+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="'+(HT+6)+'" y2="'+HB+'" style="stroke:var(--rule-soft)"/><text x="'+X(y)+'" y="'+(HT+16)+'" text-anchor="middle" font-size="10" style="fill:var(--muted)">'+yStr(y)+'</text>';
    bd+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="'+HB+'" y2="'+H+'" style="stroke:var(--rule-soft)"/>';
  }
  evs.forEach(function(v){
    var e=v.e, a=v.a, b=v.b, xa=v.xa, xb=v.xb, ln=v.ln;
    var ly=13+ln*15, long=b-a>20, tt='<title>'+esc(e[2])+(e[1]?' ('+a+'–'+b+')':' ('+a+')')+'</title>';
    hd+='<g>'+tt+(long?'<line x1="'+xa+'" x2="'+xb+'" y1="'+(HT+22)+'" y2="'+(HT+22)+'" style="stroke:var(--star);stroke-width:3;opacity:.5"/>':'')+
      '<line x1="'+xa+'" x2="'+xa+'" y1="'+(ly+3)+'" y2="'+(long?HT+22:HB)+'" style="stroke:var(--star);opacity:.5"/></g>';
    if(!long) bd+='<rect x="'+xa+'" y="'+HB+'" width="'+Math.max(1.5,xb-xa)+'" height="'+(H-HB)+'" style="fill:var(--star);opacity:.08"><title>'+esc(e[2])+' ('+a+(e[1]?'–'+b:'')+')</title></rect>';
    /* the labels go on top of every line, edged in the panel colour so a line passing behind does not cut through them */
    lab+='<g>'+tt+(v.right?'<text x="'+(xa-3)+'" y="'+ly+'" text-anchor="end"':'<text x="'+(xa+3)+'" y="'+ly+'"')+' font-size="10.5" class="tlev">'+esc(e[2])+'</text></g>';
  });
  hd+=lab;
  ppl.forEach(function(p,i){
    var yy=top+i*RH, s2=span(p), col=lc(p.n), xa=X(s2[0]), xb=X(s2[1]);
    var nm=p.name.length>NM?p.name.slice(0,NM-1)+'…':p.name;
    bd+='<g><title>'+esc(p.name+', '+years(p)+' · '+(p.n===1?'Root':relTo(p.n)))+'</title>'+
      '<text x="'+(LW-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11.5" style="fill:var(--fg)">'+esc(nm)+'</text>';
    var sure0=!!p.b&&!p.bq, sure1=(!!p.d&&!p.dq)||(p.l&&!!p.b);
    bd+='<rect x="'+xa+'" y="'+(yy-4)+'" width="'+Math.max(2,xb-xa)+'" height="8" rx="4" style="fill:'+col+';opacity:'+(sure0&&sure1?'.9':'.45')+'"/>';
    if(!p.d&&!p.l) bd+='<line x1="'+(xb-30)+'" x2="'+xb+'" y1="'+yy+'" y2="'+yy+'" stroke-dasharray="3 3" style="stroke:var(--surface);stroke-width:3"/>';
    (p.ev||[]).forEach(function(e){ if(!e.y||e.y<y0||e.y>y1) return; bd+='<circle cx="'+X(e.y)+'" cy="'+yy+'" r="3" style="fill:var(--fg);stroke:var(--surface);stroke-width:1.2"><title>'+esc((EVT[e.t]||'Event')+(e.date?', '+e.date:'')+(e.pl?', '+e.pl:''))+'</title></circle>' });
    bd+='</g>';
  });
  wrap.innerHTML='<div class="tlhead"><svg class="tl" width="'+W+'" height="'+HB+'" viewBox="0 0 '+W+' '+HB+'" role="img" aria-label="Years and historical events">'+hd+'</svg></div>'+
    '<svg class="tl" width="'+W+'" height="'+(H-HB)+'" viewBox="0 '+HB+' '+W+' '+(H-HB)+'" role="img" aria-label="Timeline of '+ppl.length+' lifespans">'+bd+'</svg>';
}
