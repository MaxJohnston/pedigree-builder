/* Pedigree Builder · js/editing.js
   Edit mode: the side sheet, the person form, linking people who appear twice, deleting, famous-relative forms, and the backup screen with .txt export and import.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- edit mode ---------- */
var ICON_PEN='<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.8 2.4l2.8 2.8-8.2 8.2-3.5.7.7-3.5z"/><path d="M9.3 3.9l2.8 2.8"/></svg>';
function setEditing(on){
  editing=on;
  document.body.classList.toggle('editing',on);
  $('#edit').setAttribute('aria-pressed',on?'true':'false');
  $('#editbar').hidden=!on;
  render(true);
}
$('#edit').addEventListener('click',function(){setEditing(!editing)});

/* ---------- side sheet (forms) ---------- */
var sheet=$('#sheet'), scrim=$('#scrim'), sheetFocus=null, sheetSubmit=null;
function openSheet(html,onSubmit,wide){
  closeDetails(true); closeMenus();
  sheet.classList.toggle('wide',!!wide);
  sheetFocus=document.activeElement;
  sheet.innerHTML=html; sheet.hidden=false; scrim.hidden=false;
  sheetSubmit=onSubmit||null;
  var f=sheet.querySelector('[autofocus]')||sheet.querySelector('input,textarea,select,button');
  try{(f||sheet).focus({preventScroll:true})}catch(_){}
}
function closeSheet(){
  if(sheet.hidden) return;
  sheet.hidden=true; scrim.hidden=true; sheet.innerHTML=''; sheetSubmit=null;
  if(sheetFocus&&document.contains(sheetFocus)) try{sheetFocus.focus({preventScroll:true})}catch(_){}
}
scrim.addEventListener('click',closeSheet);
sheet.addEventListener('submit',function(e){
  e.preventDefault();
  if(sheetSubmit) sheetSubmit(e.target);
});
function sheetErr(msg){
  var el=sheet.querySelector('.ferr'); if(!el) return;
  el.textContent=msg; el.hidden=!msg;
  if(msg) try{el.scrollIntoView({block:'nearest'})}catch(_){}
}
var fval=function(form,name){var el=form.elements[name];return el?String(el.value||'').trim():''};
function parseYear(s,label){
  if(!s) return {v:undefined};
  if(!/^\d{3,4}$/.test(s)) return {err:label+': use a year with three or four digits, such as 1872.'};
  var y=+s; if(y<1||y>2100) return {err:label+': that year is out of range.'};
  return {v:y};
}
function wikiTitle(s){
  s=String(s||'').trim(); if(!s) return undefined;
  var m=/wikipedia\.org\/wiki\/([^?#]+)/i.exec(s);
  if(m){ try{s=decodeURIComponent(m[1])}catch(_){s=m[1]} }
  return s.replace(/\s+/g,'_');
}
var f1=function(label,name,value,opts){
  opts=opts||{};
  var id='f-'+name;
  var tag=opts.area?'<textarea id="'+id+'" name="'+name+'" rows="'+(opts.rows||3)+'"'+(opts.ph?' placeholder="'+esc(opts.ph)+'"':'')+'>'+esc(value)+'</textarea>'
    :'<input id="'+id+'" name="'+name+'" value="'+esc(value)+'"'+(opts.num?' inputmode="numeric" maxlength="'+(opts.max||4)+'" autocomplete="off"':' autocomplete="off"')+(opts.ph?' placeholder="'+esc(opts.ph)+'"':'')+(opts.auto?' autofocus':'')+'>';
  return '<label class="f'+(opts.cls?' '+opts.cls:'')+'" for="'+id+'"><span>'+label+'</span>'+tag+(opts.help?'<small>'+opts.help+'</small>':'')+'</label>';
};
function sheetHead(kick,title,sub){
  return '<header class="sh"><div><p class="kicker">'+esc(kick)+'</p><h2 id="sheet-t">'+esc(title)+'</h2>'+(sub?'<p class="sub">'+esc(sub)+'</p>':'')+'</div>'+
    '<button class="btn sq" type="button" data-s="cancel" aria-label="Close">&times;</button></header>';
}

/* ----- person editor ----- */
function dnaRow(g,n){
  var ty=g.type||'match', opts=['self'];
  if(canY(n)) opts.push('yt');
  opts.push('mtt','match');
  if(onLine(n,fa)) opts.push('y');
  if(onLine(n,mo)) opts.push('mt');
  if(opts.indexOf(ty)<0) opts.push(ty);
  return '<div class="dnarow">'+
    '<select name="dtype" aria-label="Kind of DNA evidence">'+opts.map(function(t){return '<option value="'+t+'"'+(t===ty?' selected':'')+'>'+DNATYPES[t]+'</option>'}).join('')+'</select>'+
    '<input name="dsrc" value="'+esc(g.src||'')+'" placeholder="Test company, or who the match is with" aria-label="Source of the DNA evidence" autocomplete="off">'+
    '<button class="btn sq" type="button" data-s="rm-row" aria-label="Remove this DNA confirmation">&times;</button></div>';
}
function editPerson(n,isNew,child){
  if(!isNew&&!P.has(n)) return;
  if(isNew&&(P.has(n)||dep(n)>MAXDEPTH)) return;
  curN=n;
  var p=isNew?{n:n}:P.get(n), isRoot=n===1;
  var role=isNew?(fa(child)===n?'father':'mother'):null;
  var male=isNew?role==='father':n%2===0;
  var kick=isNew?'New ancestor':(isRoot?'You':'Edit person');
  var title=isNew?'Add '+role+' of '+P.get(child).name:p.name;
  var sub=isNew?cap(relTo(n))+' of '+first():(isRoot?'Root of the tree':cap(relTo(n))+' of '+first());
  var hy=(STATE.haplo||[]).filter(function(h){return h.from===n&&h.type==='y'})[0]||{};
  var hm=(STATE.haplo||[]).filter(function(h){return h.from===n&&h.type==='mt'})[0]||{};
  var dn=(STATE.dna||[]).filter(function(g){return g.anchor===n});
  var links=isNew?linkable(child,role):[];
  linkCands=links.map(function(q){ var meta=[years(q),relTo(q.n),q.bp].filter(Boolean).join(' · '); return {n:q.n,name:q.name,meta:meta,hay:fold(q.name+' '+meta+' '+(q.dp||''))} });
  var lay='';
  if(!isNew){
    var lf=function(k,lab){
      if(p[k]==null||!P.has(p[k])) return '';
      return '<div class="linked"><span>'+lab+': <b>'+esc(P.get(p[k]).name)+'</b>, linked from elsewhere in the tree</span>'+
        '<label class="chk"><input type="checkbox" name="un'+k+'"> Unlink</label></div>';
    };
    lay='<fieldset><legend>Chart layout</legend>'+
      '<label class="chk" for="f-mf"><input type="checkbox" id="f-mf" name="mf"'+(p.mf?' checked':'')+'> Show mother above father</label>'+
      '<p class="note2">Swaps the order of this person’s parents in the chart. Useful when it untangles crossing lines.</p>'+
      lf('fa','Father')+lf('mo','Mother')+
    '</fieldset>';
  }
  var h='<form id="pf" novalidate>'+sheetHead(kick,title,sub)+'<div class="sbody">'+
    '<p class="ferr" role="alert" hidden></p>'+
    (isNew?'<fieldset><legend>Already in the tree?</legend>'+
      '<div class="f combo"><label for="f-linkq">Search for someone already in the tree</label>'+
        (links.length?'<input type="search" id="f-linkq" role="combobox" aria-expanded="false" aria-controls="f-linklist" aria-autocomplete="list" autocomplete="off" placeholder="Type a name, place or year">'+
        '<ul class="combolist" id="f-linklist" role="listbox" aria-label="People already in the tree" hidden></ul>':'')+
        '<input type="hidden" name="link" id="f-link" value="">'+
        '<div class="picked" id="f-picked" hidden></div>'+
        '<small>'+(links.length?'Leave this empty to add a new person. Use it when the same person is an ancestor more than once, for example when cousins married. They are drawn once, or as a dashed repeat card if they sit in a different generation.':'Nobody in the tree can be linked here yet.')+'</small></div>'+
    '</fieldset><div class="newfields">':'')+
    '<fieldset><legend>Name and dates</legend>'+
      (function(){ var np=nameParts(p);
        return '<div class="row2 even">'+f1('First name','fn',np.fn,{auto:true,ph:isNew?(role==='father'?'e.g. William':'e.g. Sarah'):''})+
          f1('Middle name(s)','mn',np.mn,{ph:isNew?(role==='father'?'e.g. Henry':'e.g. Ann'):''})+'</div>'+
          '<div class="rowls">'+f1('Last name at birth','ln',np.ln,{ph:isNew?(role==='father'?'e.g. Lane':'e.g. Pruitt'):''})+
          f1('Suffix','sx',np.sx,{ph:'Jr., III'})+'</div>'; })()+
      f1('Married last name(s)','mln',p.mln||'',{ph:'e.g. Whitaker',help:'Separate several with commas. Choose View → Married names to show them on the chart.'})+
      (isRoot?'<label class="f" for="f-sex"><span>Sex</span><select id="f-sex" name="sex">'+['U','M','F'].map(function(k){return '<option value="'+k+'"'+(sexOf(1)===k?' selected':'')+'>'+SEXW[k]+'</option>'}).join('')+'</select></label>'
        :'<p class="note2">Sex: <b>'+(male?'Male':'Female')+'</b>, from this person’s place in the tree as a '+(male?'father':'mother')+'.</p>')+
      '<label class="chk" for="f-l"><input type="checkbox" id="f-l" name="l"'+(p.l?' checked':'')+'> Living</label>'+
      dateRow('Birth','b',p)+
      f1('Born in','bp',p.bp||'')+
      '<div class="dgrp">'+dateRow('Death','d',p)+
      f1('Died in','dp',p.dp||'')+'</div>'+
    '</fieldset>'+
    '<fieldset><legend>Life</legend>'+
      f1('Occupation','occ',p.occ||'')+
      f1('Spouse','spouse',p.spouse||'',{help:'Leave empty to use the partner shown in the tree.'})+
      f1('Children','children',(p.children||[]).join('\n'),{area:true,rows:3,help:'One name per line. Children already in the tree are listed automatically.'})+
      f1('Notes','notes',p.notes||'',{area:true,rows:4})+
    '</fieldset>'+
    '<fieldset><legend>Events</legend>'+
      '<p class="note2">Marriage, burial, immigration, military service and other events. Dates can be exact (12 May 1890) or approximate (abt 1850).</p>'+
      '<div class="rows" id="evrows">'+(p.ev||[]).map(evRow).join('')+'</div>'+
      '<button class="btn" type="button" data-s="add-ev">+ Add event</button>'+
    '</fieldset>'+
    '<fieldset><legend>Sources</legend>'+
      '<p class="note2">Records that support this person’s details: a census, a certificate, a FamilySearch or Ancestry record. Choose which fact each one supports.</p>'+
      '<div class="rows" id="srcrows">'+(p.src||[]).map(srcRow).join('')+'</div>'+
      '<button class="btn" type="button" data-s="add-src">+ Add source</button>'+
    '</fieldset>'+
    '<fieldset><legend>Photo</legend>'+
      '<div class="photorow"><img id="f-phimg" alt="Current photo"'+(photoOf(n)||(STATE.photos||{})[n]?' src="'+esc((STATE.photos||{})[n]||'')+'"':' hidden')+'>'+
      '<label class="f" for="f-photo" style="width:auto;flex:1 1 200px"><span>Choose a photo</span><input type="file" id="f-photo" accept="image/*"></label>'+
      '<button class="btn" type="button" data-s="rm-photo" id="f-phrm"'+((STATE.photos||{})[n]?'':' hidden')+'>Remove photo</button></div>'+
      '<p class="note2">Photos are shrunk to a small portrait and saved with the tree.</p>'+
    '</fieldset>'+
    '<fieldset><legend>Fame and links</legend>'+
      f1('Notable for','star',p.star||'',{ph:'e.g. Signer of the Declaration of Independence',help:'Fill this in to list this ancestor with the famous relatives (★).'})+
      f1('Wikipedia article','wiki',(p.wiki||'').replace(/_/g,' '),{ph:'Article title or link'})+
    '</fieldset>'+
    '<fieldset><legend>Haplogroups</legend>'+
      '<p class="note2">A haplogroup entered here is shown on everyone up this person’s '+(male||isRoot?'father line (Y-DNA) and ':'')+'mother line (mtDNA), with a node at the end of the line.</p>'+
      (male||isRoot?'<div class="row2">'+f1('Y-DNA','hy',hy.code||'',{ph:'e.g. R-M269'})+f1('Y-DNA link','hyu',hy.url||'',{ph:'Optional. FamilyTreeDNA by default'})+'</div>':'')+
      '<div class="row2">'+f1('mtDNA','hm',hm.code||'',{ph:'e.g. H1'})+f1('mtDNA link','hmu',hm.url||'',{ph:'Optional. FamilyTreeDNA by default'})+'</div>'+
    '</fieldset>'+
    '<fieldset><legend>DNA confirmation</legend>'+
      '<p class="note2"><b>Self test</b>, '+(canY(n)?'<b>Y-DNA test</b> and ':'')+'<b>mtDNA test</b> record a test this person took, and confirm this person. <b>DNA match</b> confirms this person and the line down to the root.'+(onLine(n,fa)||onLine(n,mo)?' <b>'+(onLine(n,fa)?'Y-DNA line':'mtDNA line')+'</b> confirms the root’s direct '+(onLine(n,fa)?'father':'mother')+' line up to this person.':'')+(canY(n)?'':' Y-DNA tests are only for men.')+'</p>'+
      '<div class="dnarows" id="dnarows">'+dn.map(function(g){return dnaRow(g,n)}).join('')+'</div>'+
      '<button class="btn" type="button" data-s="add-row">+ Add DNA confirmation</button>'+
    '</fieldset>'+lay+
    (isNew?'</div>':'')+
    '</div><footer class="sf">'+
      '<button class="btn primary" type="submit" id="pf-go">'+(isNew?'Add '+role:'Save changes')+'</button>'+
      '<button class="btn" type="button" data-s="cancel">Cancel</button>'+
      (!isNew&&!isRoot?'<button class="btn danger" type="button" data-s="del">Delete…</button>':'')+
    '</footer>'+
    (!isNew&&!isRoot?'<div class="confirm" id="delc" hidden></div>':'')+
  '</form>';
  sheet.setAttribute('data-child',isNew?child:'');
  pendingPhoto=undefined;
  openSheet(h,function(form){
    var lk=isNew&&form.elements.link?+form.elements.link.value:0;
    if(lk){ linkParent(child,role,lk); return; }
    var fn=fval(form,'fn'), mn=fval(form,'mn'), ln=fval(form,'ln'), sx=fval(form,'sx');
    if(!fn&&!ln){sheetErr('Enter a first or last name. Use “Unknown” if neither is recorded.');return}
    var name=[fn,mn,ln,sx].filter(Boolean).join(' ');
    var by=parseYear(fval(form,'b'),'Birth year'), dy=parseYear(fval(form,'d'),'Death year');
    if(by.err){sheetErr(by.err);return}
    if(dy.err){sheetErr(dy.err);return}
    if(by.v&&dy.v&&dy.v<by.v){sheetErr('The death year is before the birth year.');return}
    var living=form.elements.l.checked;
    var bqa=qualOf(form,'b',by.v,'birth'); if(bqa.err){sheetErr(bqa.err);return}
    var dqa=living?{}:qualOf(form,'d',dy.v,'death'); if(dqa.err){sheetErr(dqa.err);return}
    var bdt=dayMonth(form,'bdy','bm',by.v,'birth'); if(bdt.err){sheetErr(bdt.err);return}
    var ddt=living?{}:dayMonth(form,'ddy','dm',dy.v,'death'); if(ddt.err){sheetErr(ddt.err);return}
    var bmo=bdt.m, bdy=bdt.d;
    if(!living&&by.v&&dy.v&&by.v===dy.v&&bdt.m&&ddt.m&&(ddt.m*40+(ddt.d||0))<(bdt.m*40+(bdt.d||0))){sheetErr('The death date is before the birth date.');return}
    var old=rawP(n);
    /* start from the stored record so fields this form does not show are kept */
    var o=old?clone(old):{n:n};
    FORMKEYS.forEach(function(k){ delete o[k] });
    o.n=n; o.name=name;
    if(fn) o.fn=fn; if(mn) o.mn=mn; if(ln) o.ln=ln; if(sx) o.sx=sx;
    var mln=fval(form,'mln'); if(mln) o.mln=mln;
    if(form.elements.sex&&form.elements.sex.value!=='U') o.sex=form.elements.sex.value;
    if(!isNew){
      if(form.elements.mf.checked) o.mf=1; else delete o.mf;
      if(form.elements.unfa&&form.elements.unfa.checked) delete o.fa;
      if(form.elements.unmo&&form.elements.unmo.checked) delete o.mo;
    }
    if(form.elements.l.checked) o.l=1;
    if(by.v) o.b=by.v;
    if(by.v&&bqa.q) o.bq=bqa.q; if(by.v&&bqa.y2) o.b2=bqa.y2;
    if(bmo) o.bm=bmo;
    if(bdy) o.bdy=bdy;
    if(dy.v&&!o.l) o.d=dy.v;
    if(dy.v&&!o.l&&dqa.q) o.dq=dqa.q; if(dy.v&&!o.l&&dqa.y2) o.d2=dqa.y2;
    if(!o.l&&ddt.m) o.dm=ddt.m;
    if(!o.l&&ddt.d) o.ddy=ddt.d;
    var evs=readEvents(form); if(evs.err){sheetErr(evs.err);return} if(evs.list.length) o.ev=evs.list;
    var srl=readSources(form); if(srl.length) o.src=srl;
    ['bp','dp','occ','spouse','notes','star'].forEach(function(k){ var v=fval(form,k); if(v) o[k]=v });
    if(o.l) delete o.dp;
    var kids=fval(form,'children').split(/\n+/).map(function(s){return s.trim()}).filter(Boolean);
    if(kids.length) o.children=kids;
    var w=wikiTitle(fval(form,'wiki')); if(w) o.wiki=w;
    if(isNew) STATE.people.push(o);
    else STATE.people[STATE.people.indexOf(old)]=o;
    var phChanged=pendingPhoto!==undefined;
    if(phChanged){ var ph=Object.assign({},STATE.photos||{}); if(pendingPhoto) ph[n]=pendingPhoto; else delete ph[n]; STATE.photos=ph; }
    /* haplogroups from this person */
    var keepH=(STATE.haplo||[]).filter(function(x){return x.from!==n});
    [['y','hy','hyu',hy],['mt','hm','hmu',hm]].forEach(function(t){
      if(!form.elements[t[1]]) { if(t[3].code) keepH.push(t[3]); return }
      var code=fval(form,t[1]); if(!code) return;
      var e={id:t[3].id||uid('h'), type:t[0], from:n, code:code};
      var u=safeUrl(fval(form,t[2])); if(u) e.url=u;
      if(t[3].line&&t[3].code===code) e.line=t[3].line;
      if(t[3].to!=null) e.to=t[3].to;
      keepH.push(e);
    });
    STATE.haplo=keepH;
    /* DNA confirmations anchored on this person */
    var keepD=(STATE.dna||[]).filter(function(g){return g.anchor!==n});
    var types=form.querySelectorAll('[name="dtype"]'), srcs=form.querySelectorAll('[name="dsrc"]');
    for(var i=0;i<types.length;i++) keepD.push({id:uid('d'), type:types[i].value, anchor:n, src:String(srcs[i].value||'').trim()});
    STATE.dna=keepD;
    closeSheet();
    if(isNew&&dep(n)+1>depth) depth=dep(n)+1;
    var desc=isNew?'Added '+name+' as '+role+' of '+P.get(child).name:'Edited '+name+diffText(old,o,phChanged);
    commit(false,false,desc);
    sel.value=depth;
    if(isNew) flash(n);
  });
  syncLiving();
}
/* Precision, day, month and year side by side, for birth (k="b") or death (k="d"). "Between" adds a second year. */
function dateRow(lab,k,p){
  var q=p[k+'q']||'', mv=p[k+'m'];
  return '<div class="row4">'+
    '<label class="f" for="f-'+k+'q"><span>'+lab+' date</span><select id="f-'+k+'q" name="'+k+'q" data-qual="'+k+'">'+QUAL.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===q?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></label>'+
    f1('Day',k+'dy',p[k+'dy']||'',{num:true,max:2,ph:'Day'})+
    '<label class="f" for="f-'+k+'m"><span>Month</span><select id="f-'+k+'m" name="'+k+'m"><option value="">Month</option>'+
      MONTHS.map(function(m,i){return '<option value="'+(i+1)+'"'+(mv===i+1?' selected':'')+'>'+m+'</option>'}).join('')+'</select></label>'+
    f1('Year',k,p[k]||'',{num:true,ph:'Year'})+'</div>'+
    '<div class="y2row" id="y2-'+k+'"'+(q==='bet'?'':' hidden')+'>'+f1('…and year',k+'2',p[k+'2']||'',{num:true,ph:'Later year',help:'For “between”, the earliest and latest possible years.'})+'</div>';
}
function qualOf(form,k,y,what){
  var q=fval(form,k+'q'); if(!q) return {};
  if(!y) return {err:'Enter a '+what+' year to go with “'+(QUAL.filter(function(x){return x[0]===q})[0]||['',''])[1].toLowerCase()+'”.'};
  if(q!=='bet') return {q:q};
  var y2=parseYear(fval(form,k+'2'),cap(what)+' “and year”'); if(y2.err) return {err:y2.err};
  if(!y2.v||y2.v<=y) return {err:cap(what)+' date: for “between”, enter a later second year.'};
  return {q:q,y2:y2.v};
}
var FORMKEYS=['name','fn','mn','ln','sx','mln','sex','l','b','bm','bdy','bq','b2','d','dm','ddy','dq','d2','bp','dp','occ','spouse','notes','star','children','wiki','ev','src'];
function evRow(e){
  e=e||{};
  return '<div class="evrow">'+
    '<select name="etype" aria-label="Kind of event">'+Object.keys(EVT).map(function(k){return '<option value="'+k+'"'+(k===(e.t||'marr')?' selected':'')+'>'+EVT[k]+'</option>'}).join('')+'</select>'+
    '<input name="edate" value="'+esc(e.date||'')+'" placeholder="Date, e.g. 12 May 1890 or abt 1850" aria-label="Event date" autocomplete="off">'+
    '<input name="eplace" value="'+esc(e.pl||'')+'" placeholder="Place" aria-label="Event place" autocomplete="off">'+
    '<input name="etext" value="'+esc(e.tx||'')+'" placeholder="Details, e.g. to Anna Nowak" aria-label="Event details" autocomplete="off">'+
    '<button class="btn sq" type="button" data-s="rm-row2" aria-label="Remove this event">&times;</button></div>';
}
function readEvents(form){
  var out=[], err='';
  form.querySelectorAll('.evrow').forEach(function(r){
    var g=function(nm){return String(r.querySelector('[name="'+nm+'"]').value||'').trim()};
    var t=g('etype'), date=g('edate'), pl=g('eplace'), tx=g('etext');
    if(!date&&!pl&&!tx) return;
    var m=/\b(\d{3,4})\b/.exec(date), e={id:uid('e'), t:t};
    if(date) e.date=date; if(m) e.y=+m[1]; if(pl) e.pl=pl; if(tx) e.tx=tx;
    if(date&&!m&&!err) err=(EVT[t]||'Event')+': include a year in the date, such as 1890.';
    out.push(e);
  });
  return {list:out, err:err};
}
function srcRow(s){
  s=s||{};
  return '<div class="srcrow">'+
    '<select name="sfact" aria-label="Fact this source supports">'+FACTS.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===(s.f||'all')?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+
    '<input name="sti" value="'+esc(s.ti||'')+'" placeholder="Title, e.g. 1900 U.S. Census, Xenia, Ohio" aria-label="Source title" autocomplete="off">'+
    '<input name="surl" value="'+esc(s.url||'')+'" placeholder="Link (optional)" aria-label="Source link" autocomplete="off" inputmode="url">'+
    '<button class="btn sq" type="button" data-s="rm-row2" aria-label="Remove this source">&times;</button></div>';
}
function readSources(form){
  var out=[];
  form.querySelectorAll('.srcrow').forEach(function(r){
    var g=function(nm){return String(r.querySelector('[name="'+nm+'"]').value||'').trim()};
    var ti=g('sti'), url=safeUrl(g('surl'));
    if(!ti&&!url) return;
    if(!ti){ try{ ti=new URL(url).hostname.replace(/^www\./,'') }catch(_){ ti=url } }
    var s={id:uid('s'), f:g('sfact')||'all', ti:ti}; if(url) s.url=url;
    out.push(s);
  });
  return out;
}
/* "Edited X: birth year 1936 → 1937" for the history list. */
function diffText(a,b,ph){
  if(!a) return '';
  var L=[['name','name'],['mln','married name'],['sex','sex'],['occ','occupation'],['bp','birthplace'],['dp','death place'],['spouse','spouse'],['star','notable for'],['wiki','Wikipedia']];
  var out=[];
  var dt=function(o,k){ return fullDate(o,k)||'(none)' };
  if(fullDate(a,'b')!==fullDate(b,'b')) out.push('birth '+dt(a,'b')+' → '+dt(b,'b'));
  if(!!a.l!==!!b.l) out.push(b.l?'marked living':'marked not living');
  if(fullDate(a,'d')!==fullDate(b,'d')) out.push('death '+dt(a,'d')+' → '+dt(b,'d'));
  L.forEach(function(x){ var u=a[x[0]]||'', v=b[x[0]]||''; if(u!==v) out.push(x[1]+(u&&v&&String(u).length<40&&String(v).length<40?' '+u+' → '+v:(v?' set':' removed'))) });
  if((a.notes||'')!==(b.notes||'')) out.push('notes');
  if(JSON.stringify(a.children||[])!==JSON.stringify(b.children||[])) out.push('children');
  if(JSON.stringify((a.ev||[]).map(function(e){return [e.t,e.date,e.pl,e.tx]}))!==JSON.stringify((b.ev||[]).map(function(e){return [e.t,e.date,e.pl,e.tx]}))) out.push('events');
  if(JSON.stringify((a.src||[]).map(function(e){return [e.f,e.ti,e.url]}))!==JSON.stringify((b.src||[]).map(function(e){return [e.f,e.ti,e.url]}))) out.push('sources');
  if(!!a.mf!==!!b.mf) out.push('parent order');
  if(ph) out.push('photo');
  if(!out.length) return '';
  return ': '+out.slice(0,3).join('; ')+(out.length>3?' and '+(out.length-3)+' more':'');
}
/* Photos: shrink to a small portrait so the tree stays light. */
var pendingPhoto;
function shrinkPhoto(file){
  return new Promise(function(res,rej){
    if(!file||!/^image\//.test(file.type)) return rej(new Error('Choose an image file (JPEG, PNG, WebP or GIF).'));
    var r=new FileReader();
    r.onerror=function(){rej(new Error('That photo could not be read.'))};
    r.onload=function(){
      var img=new Image();
      img.onerror=function(){rej(new Error('That photo could not be opened.'))};
      img.onload=function(){
        var M=240, sc=Math.min(1,M/Math.max(img.width,img.height)), w=Math.max(1,Math.round(img.width*sc)), h=Math.max(1,Math.round(img.height*sc));
        var c=document.createElement('canvas'); c.width=w; c.height=h;
        var x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg',0.82));
      };
      img.src=r.result;
    };
    r.readAsDataURL(file);
  });
}
/* Read a day and month from the form and check them against the month length (and the year, for 29 February). */
function dayMonth(form,dk,mk,year,what){
  var m=+fval(form,mk)||0, ds=fval(form,dk), d=0;
  if(ds){
    if(!/^\d{1,2}$/.test(ds)||+ds<1||+ds>31) return {err:cap(what)+' day: use a number from 1 to 31.'};
    if(!m) return {err:'Choose a '+what+' month to go with the '+what+' day.'};
    d=+ds;
    var mx=[31,29,31,30,31,30,31,31,30,31,30,31][m-1];
    if(m===2&&year&&!((year%4===0&&year%100!==0)||year%400===0)) mx=28;
    if(d>mx) return {err:MONTHS[m-1]+(year?' '+year:'')+' has only '+mx+' days.'};
  }
  return {m:m,d:d};
}
function syncLiving(){
  var c=sheet.querySelector('#f-l'), g=sheet.querySelector('.dgrp'); if(!c||!g) return;
  g.hidden=c.checked;
}
sheet.addEventListener('change',function(e){
  if(e.target.id==='f-l') syncLiving();
  var qk=e.target.getAttribute&&e.target.getAttribute('data-qual');
  if(qk){ var y2=sheet.querySelector('#y2-'+qk); if(y2) y2.hidden=e.target.value!=='bet'; }
  if(e.target.id==='f-photo'){
    var inp=e.target, f=inp.files&&inp.files[0]; if(!f) return;
    shrinkPhoto(f).then(function(u){
      pendingPhoto=u; var im=sheet.querySelector('#f-phimg'), rm=sheet.querySelector('#f-phrm');
      if(im){ im.src=u; im.hidden=false } if(rm) rm.hidden=false; sheetErr('');
    },function(er){ sheetErr(er.message); inp.value='' });
  }
  if(e.target.id==='f-file') readImportFile(e.target);
});

/* ----- search box for linking someone already in the tree ----- */
var linkCands=[], linkHi=-1;
function fold(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'') }
function linkMatches(qs){
  var toks=fold(qs).split(/\s+/).filter(Boolean);
  var out=linkCands.filter(function(c){ return toks.every(function(t){return c.hay.indexOf(t)>=0}) });
  if(toks.length) out.sort(function(a,b){ var A=fold(a.name).indexOf(toks[0])===0?0:1, B=fold(b.name).indexOf(toks[0])===0?0:1; return A-B });
  return out.slice(0,40);
}
function hiText(t,qs){
  var toks=fold(qs).split(/\s+/).filter(Boolean), f=fold(t), mark=new Array(t.length).fill(false);
  toks.forEach(function(k){ var i=f.indexOf(k); while(i>=0){ for(var j=i;j<i+k.length;j++) mark[j]=true; i=f.indexOf(k,i+k.length) } });
  var h='', on=false;
  for(var i=0;i<t.length;i++){ if(mark[i]!==on){ h+=on?'</mark>':'<mark>'; on=mark[i] } h+=esc(t[i]) }
  return h+(on?'</mark>':'');
}
function showLinkList(){
  var inp=sheet.querySelector('#f-linkq'), ul=sheet.querySelector('#f-linklist'); if(!inp||!ul) return;
  var res=linkMatches(inp.value);
  linkHi=res.length?0:-1;
  ul.innerHTML=res.length?res.map(function(c,i){
    return '<li role="option" id="lo-'+c.n+'" data-n="'+c.n+'" aria-selected="'+(i===0?'true':'false')+'"><b>'+hiText(c.name,inp.value)+'</b><span>'+hiText(c.meta,inp.value)+'</span></li>';
  }).join(''):'<li class="none" role="presentation">No one matches “'+esc(inp.value)+'”.</li>';
  ul.hidden=false; inp.setAttribute('aria-expanded','true');
  inp.setAttribute('aria-activedescendant',res.length?'lo-'+res[0].n:'');
}
function hideLinkList(){
  var inp=sheet.querySelector('#f-linkq'), ul=sheet.querySelector('#f-linklist'); if(!ul) return;
  ul.hidden=true; inp.setAttribute('aria-expanded','false'); inp.removeAttribute('aria-activedescendant'); linkHi=-1;
}
function moveLinkHi(step){
  var items=sheet.querySelectorAll('#f-linklist [role="option"]'); if(!items.length) return;
  linkHi=(linkHi+step+items.length)%items.length;
  items.forEach(function(li,i){ li.setAttribute('aria-selected',i===linkHi?'true':'false') });
  items[linkHi].scrollIntoView({block:'nearest'});
  sheet.querySelector('#f-linkq').setAttribute('aria-activedescendant',items[linkHi].id);
}
function setLink(n){
  var c=linkCands.filter(function(x){return x.n===n})[0];
  var hid=sheet.querySelector('#f-link'), inp=sheet.querySelector('#f-linkq'), pk=sheet.querySelector('#f-picked');
  var nf=sheet.querySelector('.newfields'), go=sheet.querySelector('#pf-go');
  var role=fa(+sheet.getAttribute('data-child'))===curN?'father':'mother';
  hid.value=c?c.n:'';
  hideLinkList();
  if(c){
    pk.innerHTML='<span>Link as '+role+': <b>'+esc(c.name)+'</b><br><span class="mute">'+esc(c.meta)+'</span></span><button class="btn" type="button" data-s="unpick">Change</button>';
    pk.hidden=false; inp.hidden=true;
    try{pk.querySelector('button').focus()}catch(_){}
  }else{
    pk.hidden=true; pk.innerHTML=''; inp.hidden=false; inp.value='';
    try{inp.focus()}catch(_){}
  }
  if(nf) nf.hidden=!!c;
  if(go) go.textContent=(c?'Link as ':'Add ')+role;
}
sheet.addEventListener('input',function(e){ if(e.target.id==='f-linkq'){ if(e.target.value.trim()) showLinkList(); else hideLinkList() } });
sheet.addEventListener('focusin',function(e){ if(e.target.id==='f-linkq'&&e.target.value.trim()) showLinkList() });
sheet.addEventListener('focusout',function(e){ if(e.target.id==='f-linkq') setTimeout(function(){ var a=document.activeElement; if(!a||a.id!=='f-linkq') hideLinkList() },120) });
sheet.addEventListener('keydown',function(e){
  if(e.target.id!=='f-linkq') return;
  var ul=sheet.querySelector('#f-linklist'), open=ul&&!ul.hidden;
  if(e.key==='ArrowDown'){ e.preventDefault(); if(!open) showLinkList(); else moveLinkHi(1) }
  else if(e.key==='ArrowUp'){ e.preventDefault(); if(open) moveLinkHi(-1) }
  else if(e.key==='Enter'){
    e.preventDefault();
    var items=sheet.querySelectorAll('#f-linklist [role="option"]');
    if(open&&linkHi>=0&&items[linkHi]) setLink(+items[linkHi].getAttribute('data-n'));
  }
  else if(e.key==='Escape'&&open){ e.stopPropagation(); hideLinkList() }
});
sheet.addEventListener('mousedown',function(e){ if(e.target.closest('#f-linklist')) e.preventDefault() });
sheet.addEventListener('click',function(e){
  var li=e.target.closest('#f-linklist [role="option"]'); if(li){ setLink(+li.getAttribute('data-n')); return }
  if(e.target.closest('[data-s="unpick"]')) setLink(0);
});

/* People who can be linked in as this child's father or mother: not the child, not anyone descended from the child
   (that would make a loop), not a repeat card, and of the matching side (fathers have even numbers, mothers odd). */
function linkable(child,role){
  var desc=new Set([child]), q=[child];
  while(q.length){ var x=q.pop(); (KIDS.get(x)||[]).forEach(function(k){ if(!desc.has(k)){desc.add(k);q.push(k)} }) }
  return DATA.filter(function(p){
    return p.ref==null&&p.n!==1&&!desc.has(p.n)&&(role==='father'?p.n%2===0:p.n%2===1)&&p.n!==fa(child)&&p.n!==mo(child);
  }).sort(function(a,b){return dep(a.n)-dep(b.n)||a.name.localeCompare(b.name)});
}
/* Same generation: the child points straight at that person (fa/mo), so they are drawn once with lines to both children.
   Different generation: a dashed repeat card (ref) goes in the empty slot and points back to the person. */
function linkParent(child,role,target){
  var c=rawP(child), t=P.get(target); if(!c||!t) return;
  var slot=role==='father'?2*child:2*child+1, key=role==='father'?'fa':'mo';
  var ci=STATE.people.indexOf(c);
  var nc=Object.assign({},c);
  if(dep(target)===dep(slot)&&target!==slot){ nc[key]=target; }
  else{
    if(P.has(slot)) return;
    delete nc[key];
    STATE.people.push({n:slot, name:t.bname, ref:target});
  }
  STATE.people[ci]=nc;
  closeSheet();
  if(dep(slot)+1>depth) depth=dep(slot)+1;
  commit(false,false,'Linked '+t.name+' as '+role+' of '+P.get(child).name);
  sel.value=depth;
  flash(nc[key]!=null?target:slot);
}
function refSheet(n){
  var p=P.get(n), t=P.get(p.ref); curN=n;
  var h='<div class="fwrap">'+sheetHead('Repeat card',p.name,cap(relTo(n))+' of '+first())+'<div class="sbody">'+
    '<p class="note2">This dashed card repeats <b>'+esc(t.name)+'</b>, who is drawn in full elsewhere in the tree as the '+esc(relTo(t.n).toLowerCase())+'. Details are kept on that card.</p>'+
    '<div class="btnrow"><button class="btn primary" type="button" data-s="person" data-n="'+t.n+'">Edit '+esc(t.name)+'</button>'+
    '<button class="btn danger" type="button" data-s="unref">Remove this link…</button></div>'+
    '<div class="confirm" id="delc" hidden></div>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null);
}

/* Everyone who would go with a deleted person: their ancestors, unless another line in the tree still reaches them. */
function removalSet(n){
  var keep=new Set(), q=[1];
  while(q.length){ var x=q.pop(); if(x===n||keep.has(x)||!P.has(x)) continue; keep.add(x); q.push(fa(x),mo(x)) }
  var gone=new Set(), r=[n];
  while(r.length){ var y=r.pop(); if(gone.has(y)||keep.has(y)||!P.has(y)) continue; gone.add(y); r.push(fa(y),mo(y)) }
  return gone;
}
function deletePerson(n){
  var gone=removalSet(n), dname=P.get(n).name;
  STATE.people=STATE.people.filter(function(p){return !gone.has(p.n)});
  STATE.people=STATE.people.filter(function(p){return p.ref==null||!gone.has(p.ref)});
  STATE.people.forEach(function(p){ if(p.fa!=null&&gone.has(p.fa)) delete p.fa; if(p.mo!=null&&gone.has(p.mo)) delete p.mo });
  STATE.haplo=(STATE.haplo||[]).filter(function(h){return !gone.has(h.from)});
  STATE.dna=(STATE.dna||[]).filter(function(g){return !gone.has(g.anchor)});
  if(gone.size){ var ph=Object.assign({},STATE.photos||{}); gone.forEach(function(g){ delete ph[g] }); STATE.photos=ph; }
  if(gone.has(view)){ view=1; try{history.replaceState(null,'','#p1')}catch(_){} }
  closeSheet(); commit(false,false,'Deleted '+dname+(gone.size>1?' and '+(gone.size-1)+' '+(gone.size===2?'ancestor':'ancestors')+' behind them':''));
}

/* ----- famous relatives ----- */
function personOptions(sel){
  var list=DATA.filter(function(p){return p.ref==null}).slice().sort(function(a,b){return dep(a.n)-dep(b.n)||a.n-b.n});
  return '<option value="">Choose the shared ancestor…</option>'+list.map(function(p){
    return '<option value="'+p.n+'"'+(p.n===sel?' selected':'')+'>'+esc(p.name)+' · '+esc(p.n===1?'Root':relTo(p.n))+'</option>';
  }).join('');
}
function routeBlock(r,i){
  var lines=(r.path||[]).map(function(e){return [e[0],e[1],e[2]].filter(function(x){return x!=null&&x!==''}).join(', ')}).join('\n');
  return '<div class="route">'+
    '<div class="rhead"><b>Route '+(i+1)+'</b><button class="btn" type="button" data-s="rm-route">Remove route</button></div>'+
    '<label class="f"><span>Shared ancestor</span><select name="ranc">'+personOptions(r.anc)+'</select></label>'+
    '<label class="chk"><input type="checkbox" name="rhalf"'+(r.half?' checked':'')+'> Related through this ancestor only (half relation)</label>'+
    '<label class="f"><span>Line of descent</span><textarea name="rpath" rows="4" placeholder="Ruth Whitaker, 1899, 1978&#10;…">'+esc(lines)+'</textarea>'+
    '<small>One person per line, from the ancestor’s child down to the famous person’s parent: name, born, died. Leave empty if the famous person is the ancestor’s child. Use … for a generation whose name is not known.</small></label>'+
    '<label class="f"><span>Note</span><input name="rnote" value="'+esc(r.note||'')+'" placeholder="Optional, e.g. through his first wife" autocomplete="off"></label>'+
  '</div>';
}
function famousForm(id){
  var f=id?(STATE.famous||[]).filter(function(x){return x.id===id})[0]:null;
  var isNew=!f; f=f||{routes:[{}]};
  var h='<form id="ff" novalidate>'+sheetHead('Famous relative',isNew?'Add a famous relative':f.name,'A notable person who shares an ancestor with this tree')+'<div class="sbody">'+
    '<p class="ferr" role="alert" hidden></p>'+
    '<fieldset><legend>Who</legend>'+
      f1('Name','fname',f.name||'',{auto:true,ph:'e.g. Thomas Jefferson'})+
      f1('Known for','ftitle',f.title||'',{ph:'e.g. 3rd U.S. President'})+
      '<div class="row2">'+f1('Born (year)','fb',f.b||'',{num:true})+f1('Died (year)','fd',f.d||'',{num:true})+'</div>'+
      f1('Wikipedia article','fwiki',(f.wiki||'').replace(/_/g,' '),{ph:'Article title or link'})+
    '</fieldset>'+
    '<fieldset><legend>How you are related</legend>'+
      '<p class="note2">Pick the ancestor you share. The shared couple is used unless you tick “half relation”. Add another route if you are related more than one way.</p>'+
      '<div id="routes">'+(f.routes&&f.routes.length?f.routes:[{}]).map(routeBlock).join('')+'</div>'+
      '<button class="btn" type="button" data-s="add-route">+ Add another route</button>'+
    '</fieldset>'+
    '<p class="note2">To mark one of your own ancestors as famous, edit that person and fill in “Notable for”.</p>'+
    '</div><footer class="sf">'+
      '<button class="btn primary" type="submit">'+(isNew?'Add famous relative':'Save changes')+'</button>'+
      '<button class="btn" type="button" data-s="fam-back">Back to list</button>'+
      (!isNew?'<button class="btn danger" type="button" data-s="fdel" data-id="'+esc(f.id)+'">Delete…</button>':'')+
    '</footer>'+
    (!isNew?'<div class="confirm" id="delc" hidden></div>':'')+
  '</form>';
  openSheet(h,function(form){
    var name=fval(form,'fname'); if(!name){sheetErr('Enter the famous person’s name.');return}
    var by=parseYear(fval(form,'fb'),'Born'), dy=parseYear(fval(form,'fd'),'Died');
    if(by.err){sheetErr(by.err);return} if(dy.err){sheetErr(dy.err);return}
    var routes=[], bad='';
    form.querySelectorAll('.route').forEach(function(rb,i){
      var anc=+rb.querySelector('[name="ranc"]').value;
      var txt=rb.querySelector('[name="rpath"]').value;
      if(!anc){ if(txt.trim()) bad='Route '+(i+1)+': choose the shared ancestor.'; return }
      var path=txt.split(/\n+/).map(function(s){return s.trim()}).filter(Boolean).map(function(line){
        var parts=line.split(',').map(function(s){return s.trim()});
        var nm=parts[0]||'…', b=/^\d{3,4}$/.test(parts[1]||'')?+parts[1]:null, d=/^\d{3,4}$/.test(parts[2]||'')?+parts[2]:null;
        return [nm,b,d];
      });
      var r={anc:anc, path:path};
      if(rb.querySelector('[name="rhalf"]').checked) r.half=true;
      var note=rb.querySelector('[name="rnote"]').value.trim(); if(note) r.note=note;
      routes.push(r);
    });
    if(bad){sheetErr(bad);return}
    if(!routes.length){sheetErr('Add at least one route: choose the ancestor you share with '+name+'.');return}
    var o={id:(f&&f.id)||uid('f'), name:name, title:fval(form,'ftitle')||undefined, b:by.v, d:dy.v, wiki:wikiTitle(fval(form,'fwiki')), routes:routes};
    Object.keys(o).forEach(function(k){ if(o[k]===undefined) delete o[k] });
    STATE.famous=STATE.famous||[];
    var i=STATE.famous.findIndex(function(x){return x.id===o.id});
    if(i<0) STATE.famous.push(o); else STATE.famous[i]=o;
    commit(false,false,(i<0?'Added':'Edited')+' famous relative '+name);
    if(!czOn){ czOn=true; try{localStorage.setItem('pedigree-builder-cz','1')}catch(_){} render(true); }
    famousMgr('Saved '+name+'.');
  });
}
function famousMgr(msg){
  var list=STATE.famous||[];
  var stars=DATA.filter(function(p){return p.star&&p.ref==null});
  var h='<div class="fwrap">'+sheetHead('Famous relatives','Famous relatives','Cousins and other notable relatives, and famous ancestors')+'<div class="sbody">'+
    (msg?'<p class="okmsg" role="status">'+esc(msg)+'</p>':'')+
    '<button class="btn primary" type="button" data-s="fam-add">+ Add famous relative</button>'+
    '<section><h3 class="sh3">Relatives through a shared ancestor</h3>'+
    (list.length?'<ul class="mlist">'+list.map(function(f){
      var anc=(f.routes||[]).map(function(r){return P.has(r.anc)?P.get(r.anc).name:'(ancestor no longer in the tree)'});
      return '<li><div><b>'+esc(f.name)+'</b> <span class="mute">'+esc(f.title||'')+'</span><br><span class="mute">via '+esc(anc.join('; ')||'no route')+'</span></div>'+
        '<button class="btn" type="button" data-s="fam-edit" data-id="'+esc(f.id)+'">Edit</button></li>';
    }).join('')+'</ul>':'<p class="note2">None added yet.</p>')+
    '</section>'+
    '<section><h3 class="sh3">Famous ancestors</h3>'+
    (stars.length?'<ul class="mlist">'+stars.map(function(p){
      return '<li><div><b>★ '+esc(p.name)+'</b><br><span class="mute">'+esc(p.star)+'</span></div><button class="btn" type="button" data-s="person" data-n="'+p.n+'">Edit</button></li>';
    }).join('')+'</ul>':'')+
    '<p class="note2">An ancestor is listed here when “Notable for” is filled in on their card.</p></section>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null);
}

/* ----- backup and reset ----- */
function dataMgr(msg){
  var h='<div class="fwrap">'+sheetHead('Your data','Backup and reset','')+'<div class="sbody">'+
    (msg?'<p class="okmsg" role="status">'+esc(msg)+'</p>':'')+
    '<p class="ferr" role="alert" hidden></p>'+
    '<section><h3 class="sh3">Export</h3><p class="note2">Save the whole tree, with famous relatives, haplogroups and DNA notes, as a .txt file. Import it here later, or in another browser or on another computer.</p>'+
      '<div class="btnrow"><button class="btn primary" type="button" data-s="export">Export as .txt file</button>'+
      '<button class="btn" type="button" data-s="copy">Copy tree data</button></div>'+
      '<p class="note2">The .txt file is a complete backup of everything on this page. For Ancestry, FamilySearch, MyHeritage and other family-tree programs, export a GEDCOM file instead. GEDCOM carries people, dates, places, events, sources and haplogroups, but not famous relatives or photos.</p>'+
      '<div class="btnrow"><button class="btn" type="button" data-s="ged-export">Export as GEDCOM (.ged)</button></div>'+
      '<p class="note2" id="ged-msg" role="status" hidden></p>'+
      '<p class="note2" id="exp-msg" role="status" hidden></p>'+
      '<textarea id="f-exp" class="mono" rows="4" readonly hidden aria-label="Exported tree text"></textarea>'+
      '<button class="btn" type="button" id="exp-copy" data-s="copy-exp" hidden>Copy this text</button></section>'+
    '<section><h3 class="sh3">Import</h3>'+
      '<label class="f filein" for="f-file"><span>Choose a .txt file from this page, or a GEDCOM (.ged) file from another program</span><input type="file" id="f-file" accept=".txt,.json,.ged,.gedcom,text/plain,application/json"></label>'+
      '<label class="f" for="f-imp"><span>Or paste tree data</span><textarea id="f-imp" class="mono" rows="3"></textarea></label>'+
      '<button class="btn" type="button" data-s="import">Import pasted data…</button>'+
      '<div class="confirm" id="impc" hidden></div></section>'+
    '<section><h3 class="sh3">Start again</h3>'+
      '<div class="btnrow"><button class="btn danger" type="button" data-s="blank">Start a blank tree…</button>'+
      '<button class="btn danger" type="button" data-s="reset">Load the sample tree…</button></div>'+
      '<div class="confirm" id="delc" hidden></div></section>'+
    '</div><footer class="sf"><button class="btn" type="button" data-s="cancel">Close</button></footer></div>';
  openSheet(h,null);
}
function confirmBox(text,yes,act,box){
  var c=sheet.querySelector(box||'#delc'); if(!c) return;
  c.innerHTML='<p>'+text+'</p><div class="btnrow"><button class="btn danger" type="button" data-s="'+act+'">'+esc(yes)+'</button><button class="btn" type="button" data-s="no">Keep it</button></div>';
  c.hidden=false;
  try{c.querySelector('button').focus()}catch(_){}
}
var pendingDel=null, pendingImport=null;
/* Accepts the exported file or pasted text: the tree data is the JSON object in it. */
function parseTree(raw){
  raw=String(raw||''); var a=raw.indexOf('{'), z=raw.lastIndexOf('}');
  if(a<0||z<a) return null;
  try{ var o=JSON.parse(raw.slice(a,z+1)); return valid(o)?o:null }catch(_){ return null }
}
function askImport(o,from){
  pendingImport={o:o,from:from.replace(/[“”]/g,'')};
  var root=o.people.filter(function(p){return p.n===1})[0];
  sheetErr('');
  confirmBox('Replace your tree with '+esc(root.name)+'’s tree from '+esc(from)+' ('+o.people.length+' '+(o.people.length===1?'person':'people')+')? Your current tree is replaced. You can undo this, or export it first to keep a copy.','Import and replace','import-yes','#impc');
}
function readImportFile(input){
  var f=input.files&&input.files[0]; if(!f) return;
  if(f.size>60e6){ sheetErr('That file is too large to import here.'); input.value=''; return }
  var r=new FileReader();
  r.onload=function(){
    if(isGedcom(r.result)){ gedImportStart(r.result,f.name); return }
    var o=parseTree(r.result);
    if(!o){ sheetErr('“'+f.name+'” does not contain tree data from this page or a GEDCOM file. Choose a file made with “Export as .txt file”, or a .ged file.'); input.value=''; return }
    askImport(o,'“'+f.name+'”');
  };
  r.onerror=function(){ sheetErr('That file could not be read. Try choosing it again.') };
  r.readAsText(f);
}
function exportText(){
  var root=P.get(1).name||'tree';
  var slug=root.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tree';
  var d=new Date(), ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return {name:'family-tree-'+slug+'-'+ds+'.txt',
    txt:'Pedigree Builder export · '+root+' · '+ds+'\n'+'Import this file on the Backup & reset screen.\n\n'+JSON.stringify(STATE,null,2)+'\n'};
}
function showExportText(why){
  var f=exportText(), ta=sheet.querySelector('#f-exp'), msg=sheet.querySelector('#exp-msg'), cp=sheet.querySelector('#exp-copy');
  if(!ta) return;
  ta.value=f.txt; ta.hidden=false; ta.rows=8;
  if(msg){ msg.textContent=why+' Copy the text below and save it in a text file named '+f.name+'. You can import that file later.'; msg.hidden=false }
  if(cp) cp.hidden=false;
}
/* Export: the browser downloads the file. If it blocks the download, the text is shown with a copy button instead. */
function exportFile(btn){
  var msg=sheet.querySelector('#exp-msg');
  var say=function(t){ if(msg){ msg.textContent=t; msg.hidden=!t } };
  var f=exportText();
  if(browserSave(f.name,f.txt,'text/plain;charset=utf-8')) say('Saved '+f.name+' to your downloads.');
  else showExportText('Your browser blocked the download.');
}
sheet.addEventListener('click',function(e){
  var b=e.target.closest('[data-s]'); if(!b) return;
  var s=b.getAttribute('data-s'), form=sheet.querySelector('form');
  if(s==='cancel') closeSheet();
  else if(s==='add-row'){ var rows=sheet.querySelector('#dnarows'); rows.insertAdjacentHTML('beforeend',dnaRow({type:'match'},curN)); rows.lastElementChild.querySelector('input').focus(); }
  else if(s==='rm-row'){ b.closest('.dnarow').remove(); }
  else if(s==='rm-row2'){ b.parentNode.remove(); }
  else if(s==='add-ev'){ var er=sheet.querySelector('#evrows'); er.insertAdjacentHTML('beforeend',evRow({})); er.lastElementChild.querySelector('select').focus(); }
  else if(s==='add-src'){ var sr=sheet.querySelector('#srcrows'); sr.insertAdjacentHTML('beforeend',srcRow({})); sr.lastElementChild.querySelector('input').focus(); }
  else if(s==='rm-photo'){ pendingPhoto=null; var im=sheet.querySelector('#f-phimg'); if(im){im.hidden=true;im.removeAttribute('src')} b.hidden=true; var fi=sheet.querySelector('#f-photo'); if(fi) fi.value=''; }
  else if(s==='add-route'){ var R=sheet.querySelector('#routes'); R.insertAdjacentHTML('beforeend',routeBlock({},R.children.length)); R.lastElementChild.querySelector('select').focus(); }
  else if(s==='rm-route'){ var R2=sheet.querySelector('#routes'); b.closest('.route').remove(); [].forEach.call(R2.children,function(x,i){x.querySelector('.rhead b').textContent='Route '+(i+1)}); }
  else if(s==='del'){
    var gone=removalSet(curN), extra=gone.size-1, nm=P.get(curN).name;
    confirmBox('Delete '+esc(nm)+(extra?' and the '+extra+' '+(extra===1?'ancestor':'ancestors')+' recorded behind them':'')+'? This cannot be undone.','Delete','del-yes');
  }
  else if(s==='del-yes') deletePerson(curN);
  else if(s==='no'){ var c=b.closest('.confirm'); c.hidden=true; c.innerHTML=''; pendingImport=null; }
  else if(s==='fam-add') famousForm(null);
  else if(s==='fam-edit') famousForm(b.getAttribute('data-id'));
  else if(s==='fam-back') famousMgr();
  else if(s==='person'){ curN=+b.getAttribute('data-n'); editPerson(curN,false); }
  else if(s==='fdel'){ pendingDel=b.getAttribute('data-id'); confirmBox('Delete this famous relative?','Delete','fdel-yes'); }
  else if(s==='fdel-yes'){ var fdn=((STATE.famous||[]).filter(function(x){return x.id===pendingDel})[0]||{}).name||''; STATE.famous=(STATE.famous||[]).filter(function(x){return x.id!==pendingDel}); czSel.clear(); commit(false,false,'Deleted famous relative '+fdn); famousMgr('Deleted.'); }
  else if(s==='copy'){
    var txt=JSON.stringify(STATE), ta=sheet.querySelector('#f-exp');
    ta.value=txt; ta.hidden=false;
    var sel=function(){ try{ta.focus();ta.select()}catch(_){} };
    try{ navigator.clipboard.writeText(txt).then(function(){ b.textContent='Copied' },function(){ sel(); b.textContent='Select the text and copy it' }) }
    catch(_){ sel(); b.textContent='Select the text and copy it' }
  }
  else if(s==='import'){
    var o=parseTree(sheet.querySelector('#f-imp').value);
    if(!o){ sheetErr('That text is not tree data from this page. Export the tree or use “Copy tree data” to get it.'); return }
    askImport(o,'the pasted data');
  }
  else if(s==='import-yes'){
    if(!pendingImport) return;
    var keepPrefs=prefsNow();
    STATE=normalize(pendingImport.o); var from=pendingImport.from; pendingImport=null; view=1; czSel.clear();
    Object.assign(STATE,keepPrefs,{showLiving:STATE.showLiving});
    try{history.replaceState(null,'','#p1')}catch(_){}
    commit(true,false,'Imported a tree from '+from); dataMgr('Tree imported. Use Undo if you want your previous tree back.');
  }
  else if(s==='export') exportFile(b);
  else if(s==='ged-export') gedExportClick(b);
  else if(s==='ged-yes') gedImportFinish();
  else if(s==='revert'){ revertTo(+b.getAttribute('data-i')); closeSheet(); }
  else if(s==='rel-swap'){ var t2=relA; relA=relB; relB=t2; relSheet(relA,relB); }
  else if(s==='rel-find'){ findPerson(+b.getAttribute('data-n')); }
  else if(s==='wall-add'){ editPerson(+b.getAttribute('data-n'),true,+b.getAttribute('data-c')); }
  else if(s==='walls-all'){ wallsAll=true; reportSheet(); }
  else if(s==='pl-lvl'){ placesSheet(b.getAttribute('data-v')); }
  else if(s==='copy-exp'){
    var ta2=sheet.querySelector('#f-exp'), pick=function(){ try{ta2.focus();ta2.select();ta2.setSelectionRange(0,ta2.value.length)}catch(_){} };
    try{ navigator.clipboard.writeText(ta2.value).then(function(){ b.textContent='Copied' },function(){ pick(); b.textContent='Text selected. Copy it' }) }
    catch(_){ pick(); b.textContent='Text selected. Copy it' }
  }
  else if(s==='unref') confirmBox('Remove this repeat card? '+esc(P.get(P.get(curN).ref).name)+' stays in the tree where they are drawn in full.','Remove link','unref-yes');
  else if(s==='unref-yes'){
    var rn=P.get(curN).name;
    STATE.people=STATE.people.filter(function(p){return p.n!==curN});
    if(view===curN) view=1;
    closeSheet(); commit(false,false,'Removed a repeat card of '+rn);
  }
  else if(s==='blank') confirmBox('Replace the whole tree with a single person? You can undo this.','Start blank tree','blank-yes');
  else if(s==='reset') confirmBox('Replace the whole tree with the sample tree? You can undo this.','Load sample','reset-yes');
  else if(s==='blank-yes'||s==='reset-yes'){
    var kp=prefsNow();
    STATE=s==='reset-yes'?clone(SAMPLE):{v:1,sample:false,people:[{n:1,name:'Your name',fn:'Your',ln:'name',l:1}],famous:[],haplo:[],dna:[],photos:{}};
    Object.assign(STATE,kp);
    view=1; czSel.clear();
    try{history.replaceState(null,'','#p1')}catch(_){}
    commit(true, s==='reset-yes', s==='reset-yes'?'Loaded the sample tree':'Started a blank tree');
    closeSheet();
    if(s==='blank-yes'){ if(!editing) setEditing(true); curN=1; editPerson(1,false); }
  }
});
var curN=1;
function flash(n){
  var c=cardEl(n); if(!c) return;
  centerOn([c]); c.classList.add('refhl');
  setTimeout(function(){ c.classList.remove('refhl') },2400);
}
