/* Pedigree Builder · js/files-gedcom.js
   File downloads and GEDCOM 5.5.1 import and export.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- saving any file: the browser downloads it ---------- */
function browserSave(name,data,mime){
  try{
    var blob=data instanceof Blob?data:new Blob([data],{type:mime||'text/plain;charset=utf-8'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url) },4000);
    return true;
  }catch(_){ return false }
}
function saveFile(name,data,mime){
  return Promise.resolve(browserSave(name,data,mime)?{ok:true,name:name}:{ok:false,code:'blocked'});
}
function fileStem(){
  var root=(P.get(1)&&P.get(1).bname)||'tree';
  var slug=root.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tree';
  var d=new Date(); return 'family-tree-'+slug+'-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function saveMsg(r,what){
  if(r.ok) return 'Saved '+r.name+' to your downloads.';
  return 'Your browser blocked the download of the '+what+'. Check its download settings and try again.';
}

/* ---------- GEDCOM export (5.5.1) ---------- */
var GMON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
var EV2GED={bapm:'BAPM',chr:'CHR',buri:'BURI',immi:'IMMI',emig:'EMIG',natu:'NATU',resi:'RESI',educ:'EDUC',cens:'CENS',reli:'RELI'};
function gedDateOf(p,k){
  var y=p[k]; if(!y) return '';
  var q=p[k+'q'];
  if(q==='bet'&&p[k+'2']) return 'BET '+y+' AND '+p[k+'2'];
  var parts=[], m=p[k+'m'], d=p[k+'dy']; if(m&&d) parts.push(d); if(m) parts.push(GMON[m-1]); parts.push(y);
  return ({abt:'ABT ',bef:'BEF ',aft:'AFT '}[q]||'')+parts.join(' ');
}
/* free-text event date ("abt 1850", "12 May 1890") to GEDCOM; unknown wording is kept as a date phrase */
function gedDateText(t){
  t=String(t||'').trim(); if(!t) return '';
  var u=t.toUpperCase().replace(/\bABOUT\b|\bCIRCA\b|\bC\.\s*/g,'ABT ').replace(/\bBEFORE\b/g,'BEF').replace(/\bAFTER\b/g,'AFT').replace(/\bBETWEEN\b/g,'BET').replace(/,/g,' ').replace(/\s+/g,' ').trim();
  u=u.replace(/\b(JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|SEPT|OCTOBER|NOVEMBER|DECEMBER)\b/g,function(m){return m.slice(0,3)});
  if(/^((ABT|BEF|AFT|EST|CAL) )?((\d{1,2} )?(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) )?\d{3,4}$/.test(u)||/^BET \d{3,4} AND \d{3,4}$/.test(u)) return u;
  return '('+t.replace(/[()]/g,'')+')';
}
function gedLines(lv,tag,val,out){
  var parts=(val==null?'':String(val)).split(/\r?\n/);
  parts.forEach(function(line,i){
    var head=i===0?lv+' '+tag:(lv+1)+' CONT', first=line.slice(0,200), rest=line.slice(200);
    out.push(head+(first?' '+first:''));
    while(rest.length){ out.push((lv+1)+' CONC '+rest.slice(0,200)); rest=rest.slice(200) }
  });
}
function gedExport(){
  var out=[], L=function(lv,tag,val){ gedLines(lv,tag,val,out) };
  var d=new Date();
  L(0,'HEAD'); L(1,'SOUR','PEDIGREE_BUILDER'); L(2,'NAME','Pedigree Builder'); L(1,'DATE',d.getDate()+' '+GMON[d.getMonth()]+' '+d.getFullYear());
  L(1,'GEDC'); L(2,'VERS','5.5.1'); L(2,'FORM','LINEAGE-LINKED'); L(1,'CHAR','UTF-8'); L(1,'SUBM','@U1@');
  var ppl=STATE.people.filter(function(p){return p.ref==null});
  var id=function(n){return '@I'+n+'@'};
  /* sources, shared between people when the title and link match */
  var SRC=new Map(), srcList=[];
  var srcId=function(sr){ var k=(sr.ti||'')+'|'+(sr.url||''); if(!SRC.has(k)){ SRC.set(k,'@S'+(srcList.length+1)+'@'); srcList.push(sr) } return SRC.get(k) };
  /* families: one per pair of parents of someone in the tree */
  var FAM=new Map(), famList=[];
  var famOf=function(f,m){ var k=f+'|'+m; if(!FAM.has(k)){ var o={id:'@F'+(famList.length+1)+'@',f:f,m:m,kids:[],extra:[]}; FAM.set(k,o); famList.push(o) } return FAM.get(k) };
  ppl.forEach(function(p){
    var f=P.has(fa(p.n))?canonOf(fa(p.n)):null, m=P.has(mo(p.n))?canonOf(mo(p.n)):null;
    if(f==null&&m==null) return;
    famOf(f,m).kids.push(p.n);
  });
  /* children who are only names, and the root's own family */
  var extraI=[], key=function(s2){var t=String(s2).trim().split(/\s+/);return (t[0]+'|'+t[t.length-1]).toLowerCase()};
  ppl.forEach(function(p){
    if(!(p.children||[]).length&&!(p.n===1&&p.spouse)) return;
    var fams=famList.filter(function(F){return F.f===p.n||F.m===p.n});
    var F=fams[0];
    if(!F){ var male=sexOf(p.n)!=='F'; F=famOf(male?p.n:null,male?null:p.n);
      if(p.spouse){ var sid='@X'+(extraI.length+1)+'@'; extraI.push({id:sid,name:p.spouse,sex:male?'F':'M',fams:F.id}); if(male) F.mx=sid; else F.fx=sid } }
    (p.children||[]).forEach(function(c){
      var inTree=F.kids.some(function(k){return key(STATE.people.filter(function(x){return x.n===k})[0].name)===key(c)});
      if(inTree||F.extra.some(function(x){return key(x.name)===key(c)})) return;
      var cid='@X'+(extraI.length+1)+'@'; extraI.push({id:cid,name:c,famc:F.id}); F.extra.push({id:cid,name:c});
    });
  });
  famList.forEach(function(F){ ['marr','div'].forEach(function(t){
    var hp=F.f!=null?rawP(F.f):null, wp=F.m!=null?rawP(F.m):null;
    var e=(hp&&(hp.ev||[]).filter(function(z){return z.t===t})[0])||(wp&&(wp.ev||[]).filter(function(z){return z.t===t})[0]);
    if(e) F[t]=e;
  }) });
  var nameLine=function(fn,mn,ln,sx){ return [[fn,mn].filter(Boolean).join(' '),'/'+(ln||'')+'/',sx].filter(Boolean).join(' ') };
  var cites=function(p,f,lv){ (p.src||[]).forEach(function(sr){ if(sr.f===f) L(lv,'SOUR',srcId(sr)) }) };
  ppl.forEach(function(p){
    var np=nameParts(p);
    L(0,id(p.n)+' INDI');
    L(1,'NAME',nameLine(np.fn,np.mn,np.ln,np.sx));
    if(np.fn||np.mn) L(2,'GIVN',[np.fn,np.mn].filter(Boolean).join(' ')); if(np.ln) L(2,'SURN',np.ln); if(np.sx) L(2,'NSFX',np.sx);
    cites(p,'name',2);
    String(p.mln||'').split(',').map(function(x){return x.trim()}).filter(Boolean).forEach(function(m){ L(1,'NAME',nameLine(np.fn,np.mn,m,np.sx)); L(2,'TYPE','married') });
    L(1,'SEX',sexOf(p.n));
    if(p.b||p.bp||(p.src||[]).some(function(x){return x.f==='birth'})){ L(1,'BIRT'); if(p.b) L(2,'DATE',gedDateOf(p,'b')); if(p.bp) L(2,'PLAC',p.bp); cites(p,'birth',2) }
    if(p.l) L(1,'_LIVING','Y');
    else if(p.d||p.dp){ L(1,'DEAT'); if(p.d) L(2,'DATE',gedDateOf(p,'d')); if(p.dp) L(2,'PLAC',p.dp); cites(p,'death',2) }
    else L(1,'DEAT','Y');
    if(p.occ){ L(1,'OCCU',p.occ); cites(p,'occ',2) }
    var seenT={}, inFam=famList.filter(function(x){return x.f===p.n||x.m===p.n})[0];
    (p.ev||[]).forEach(function(e){
      /* a person's first marriage (and divorce) is the family's; both partners usually record it, so it is written once on the family */
      if((e.t==='marr'||e.t==='div')&&inFam&&inFam[e.t]&&!seenT[e.t]){ seenT[e.t]=1; return }
      var tag=EV2GED[e.t];
      if(tag) L(1,tag); else { L(1,'EVEN'); L(2,'TYPE',EVT[e.t]||'Event') }
      if(e.date) L(2,'DATE',gedDateText(e.date)); if(e.pl) L(2,'PLAC',e.pl); if(e.tx) L(2,'NOTE',e.tx);
      if(e.t==='marr') cites(p,'marr',2);
    });
    if(p.notes) L(1,'NOTE',p.notes);
    if(p.spouse&&p.n!==1) L(1,'NOTE','Spouse: '+p.spouse);
    (p.src||[]).forEach(function(sr){ if(['all','parents','events'].indexOf(sr.f)>=0||(sr.f==='marr'&&!(p.ev||[]).some(function(e){return e.t==='marr'}))){ L(1,'SOUR',srcId(sr)); if(sr.f!=='all') L(2,'NOTE','Supports: '+(FACTS.filter(function(x){return x[0]===sr.f})[0]||['',''])[1]) } });
    if(p.star) L(1,'_STAR',p.star);
    if(p.wiki) L(1,'_WIKI',p.wiki);
    (STATE.haplo||[]).forEach(function(h){ if(h.from!==p.n) return; L(1,h.type==='y'?'_YDNA':'_MTDNA',h.code); if(h.url) L(2,'_URL',h.url); if(h.to!=null) L(2,'_TO','@I'+h.to+'@') });
    (STATE.dna||[]).forEach(function(g){ if(g.anchor!==p.n) return; L(1,'_DNA',g.type); if(g.src) L(2,'_SRC',g.src) });
    famList.forEach(function(F){ if(F.kids.indexOf(p.n)>=0) L(1,'FAMC',F.id) });
    famList.forEach(function(F){ if(F.f===p.n||F.m===p.n) L(1,'FAMS',F.id) });
  });
  extraI.forEach(function(x){
    var t=String(x.name).trim().split(/\s+/), sn=t.length>1?t.pop():'';
    L(0,x.id+' INDI'); L(1,'NAME',t.join(' ')+' /'+sn+'/'); if(x.sex) L(1,'SEX',x.sex);
    if(x.famc) L(1,'FAMC',x.famc); if(x.fams) L(1,'FAMS',x.fams);
  });
  famList.forEach(function(F){
    L(0,F.id+' FAM');
    if(F.f!=null) L(1,'HUSB',id(F.f)); else if(F.fx) L(1,'HUSB',F.fx);
    if(F.m!=null) L(1,'WIFE',id(F.m)); else if(F.mx) L(1,'WIFE',F.mx);
    ['marr','div'].forEach(function(t){ var e=F[t]; if(!e) return; L(1,t==='marr'?'MARR':'DIV'); if(e.date) L(2,'DATE',gedDateText(e.date)); if(e.pl) L(2,'PLAC',e.pl); if(e.tx) L(2,'NOTE',e.tx) });
    F.kids.forEach(function(k){ L(1,'CHIL',id(k)) });
    F.extra.forEach(function(x){ L(1,'CHIL',x.id) });
  });
  srcList.forEach(function(sr,i){ L(0,'@S'+(i+1)+'@ SOUR'); L(1,'TITL',sr.ti||'Source'); if(sr.url){ L(1,'WWW',sr.url); L(1,'NOTE',sr.url) } });
  L(0,'@U1@ SUBM'); L(1,'NAME',(P.get(1)&&P.get(1).bname)||'Unknown');
  L(0,'TRLR');
  return out.join('\r\n')+'\r\n';
}
function gedExportClick(btn){
  var msg=sheet.querySelector('#ged-msg'), say=function(t){ if(msg){ msg.textContent=t; msg.hidden=!t } };
  var txt; try{ txt=gedExport() }catch(e){ say('The GEDCOM file could not be built: '+e.message); return }
  btn.disabled=true; say('Preparing the file…');
  saveFile(fileStem()+'.ged','﻿'+txt,'text/plain;charset=utf-8').then(function(r){ btn.disabled=false; say(saveMsg(r,'GEDCOM file')) });
}

/* ---------- GEDCOM import ---------- */
function isGedcom(t){ return /^﻿?\s*0\s+HEAD\b/.test(String(t).slice(0,400)) }
function gedParse(text){
  var lines=String(text).replace(/^﻿/,'').split(/\r\n|\r|\n/), root={tag:'ROOT',kids:[]}, stack=[root], recs={}, n=0;
  for(var i=0;i<lines.length;i++){
    var m=/^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?: (.*))?$/.exec(lines[i]); if(!m) continue;
    var lv=+m[1], tag=m[3].toUpperCase(), val=m[4]!=null?m[4]:'';
    if(tag==='CONC'||tag==='CONT'){ var par=stack[lv]; if(par) par.val+=(tag==='CONT'?'\n':'')+val; continue }
    var node={tag:tag,id:m[2]||null,val:val,kids:[]}, parent=stack[lv]; if(!parent) continue;
    parent.kids.push(node); stack[lv+1]=node; stack.length=lv+2;
    if(lv===0&&node.id) recs[node.id]=node;
    n++;
  }
  return {root:root,recs:recs};
}
var gk=function(nd,t){ for(var i=0;i<nd.kids.length;i++) if(nd.kids[i].tag===t) return nd.kids[i]; return null };
var gks=function(nd,t){ return nd.kids.filter(function(k){return k.tag===t}) };
var gv=function(nd,t){ var k=nd&&gk(nd,t); return k?String(k.val||'').trim():'' };
var GMAP={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
function gedSimple(v){
  var t=String(v||'').replace(/@#D[^@]*@/g,'').replace(/\(.*?\)/g,' ').trim().toUpperCase().split(/[\s,.]+/).filter(Boolean);
  var y=null, mo2=0, d=0;
  for(var i=t.length-1;i>=0;i--){ var mm=/^(\d{3,4})(\/\d+)?$/.exec(t[i]); if(mm){ y=+mm[1]; t=t.slice(0,i); break } }
  if(!y) return null;
  if(t.length&&GMAP[t[t.length-1].slice(0,3)]){ mo2=GMAP[t[t.length-1].slice(0,3)]; t.pop(); if(t.length&&/^\d{1,2}$/.test(t[t.length-1])) d=+t[t.length-1] }
  return {y:y,m:mo2,d:d};
}
function gedParseDate(v){
  v=String(v||'').trim().toUpperCase(); if(!v) return null;
  var m=/^(?:BET|FROM)\s+(.+?)\s+(?:AND|TO)\s+(.+)$/.exec(v);
  if(m){ var a=gedSimple(m[1]), b=gedSimple(m[2]); if(a&&b&&b.y>a.y) return {q:'bet',y:a.y,y2:b.y}; if(a) return {q:'abt',y:a.y} ; return null }
  var q='';
  m=/^(ABT|ABOUT|EST|CAL|CIRCA|C)\.?\s+(.+)$/.exec(v); if(m){ q='abt'; v=m[2] }
  m=/^(BEF|BEFORE|TO)\.?\s+(.+)$/.exec(v); if(m){ q='bef'; v=m[2] }
  m=/^(AFT|AFTER|FROM)\.?\s+(.+)$/.exec(v); if(m){ q='aft'; v=m[2] }
  var r=gedSimple(v); if(!r) return null; r.q=q; return r;
}
function gedHuman(v){
  v=String(v||'').trim(); if(!v) return '';
  if(/^\(.*\)$/.test(v)) return v.slice(1,-1);
  return v.replace(/@#D[^@]*@\s*/g,'').toLowerCase().replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/g,function(m){return m.charAt(0).toUpperCase()+m.slice(1)});
}
var GED2EV={BAPM:'bapm',CHR:'chr',BURI:'buri',CREM:'buri',IMMI:'immi',EMIG:'emig',NATU:'natu',RESI:'resi',EDUC:'educ',CENS:'cens',RELI:'reli',_MILT:'mili',_MILI:'mili',MILI:'mili',GRAD:'educ',PROB:'even',WILL:'even',CONF:'even',BARM:'even',BASM:'even',ADOP:'even',ORDN:'even',RETI:'even',EVEN:'even',DIV:'div'};
function gedName(ind){
  var ns=gks(ind,'NAME'), pri=ns.filter(function(n){ return !/marri/i.test(gv(n,'TYPE')) })[0]||ns[0];
  var parse=function(nd){
    if(!nd) return {fn:'',mn:'',ln:'',sx:''};
    var v=String(nd.val||''), m=/^(.*?)\/(.*?)\/(.*)$/.exec(v), giv, sn, suf;
    if(m){ giv=m[1].trim(); sn=m[2].trim(); suf=m[3].trim() } else { giv=v.trim(); sn=''; suf='' }
    if(gv(nd,'GIVN')) giv=gv(nd,'GIVN'); if(gv(nd,'SURN')) sn=gv(nd,'SURN'); if(gv(nd,'NSFX')) suf=gv(nd,'NSFX');
    var pre=gv(nd,'NPFX'); if(pre&&giv.indexOf(pre)!==0) giv=pre+' '+giv;
    var t=giv.split(/\s+/).filter(Boolean);
    return {fn:t[0]||'',mn:t.slice(1).join(' '),ln:sn,sx:suf};
  };
  var o=parse(pri);
  var mar=ns.filter(function(n){ return n!==pri&&/marri/i.test(gv(n,'TYPE')) }).map(function(n){return parse(n).ln}).filter(Boolean);
  if(mar.length) o.mln=mar.join(', ');
  return o;
}
function gedSources(G,nd,f){
  var out=[];
  gks(nd,'SOUR').forEach(function(sr){
    var ti='', url='', rec=/^@.+@$/.test(String(sr.val).trim())?G.recs[String(sr.val).trim()]:null;
    if(rec){ ti=gv(rec,'TITL')||gv(rec,'ABBR')||String(rec.val||'').trim()||'Source'; url=gv(rec,'WWW')||gv(rec,'_LINK')||gv(rec,'_URL')||gv(rec,'URL') }
    else ti=String(sr.val||'').trim()||'Source';
    var page=gv(sr,'PAGE'); if(page) ti+=': '+page;
    var notes=[gv(sr,'NOTE'),gv(rec||{kids:[]},'NOTE'),page].join(' ');
    if(!url){ var mm=/https?:\/\/[^\s<>"]+/.exec(notes); if(mm) url=mm[0] }
    var o={id:uid('s'),f:f,ti:ti.slice(0,300)}; var su=safeUrl(url); if(su) o.url=su;
    out.push(o);
  });
  return out;
}
function gedNotes(G,nd){
  return gks(nd,'NOTE').map(function(n){ var v=String(n.val||'').trim(); if(/^@.+@$/.test(v)&&G.recs[v]) return String(G.recs[v].val||'').trim(); return String(n.val||'') }).filter(Boolean).join('\n\n');
}
var GED=null;
function gedImportStart(text,fname){
  var G; try{ G=gedParse(text) }catch(e){ sheetErr('That GEDCOM file could not be read.'); return }
  var inds=Object.keys(G.recs).filter(function(k){return G.recs[k].tag==='INDI'});
  if(!inds.length){ sheetErr('“'+fname+'” has no people in it.'); return }
  var cands=inds.map(function(k,i){
    var ind=G.recs[k], nm=gedName(ind), name=[nm.fn,nm.mn,nm.ln,nm.sx].filter(Boolean).join(' ')||'(no name)';
    var b=gk(ind,'BIRT'), by=b?gedSimple(gv(b,'DATE')):null, pl=b?gv(b,'PLAC'):'';
    var meta=[by?'b. '+by.y:'',pl].filter(Boolean).join(' · ');
    return {n:i, id:k, name:name, meta:meta, hay:fold(name+' '+meta)};
  });
  var cur=fold((P.get(1)&&P.get(1).bname)||''), def=cands.filter(function(c){return fold(c.name)===cur})[0]||cands[0];
  GED={G:G, cands:cands, root:def.id, fname:fname};
  sheetErr('');
  var box=sheet.querySelector('#impc');
  box.innerHTML='<p><b>'+esc(fname)+'</b> is a GEDCOM file with '+cands.length.toLocaleString()+' '+(cands.length===1?'person':'people')+'. This page charts one person’s ancestors, so choose who the chart starts from. Their brothers, sisters and children are kept as names on their parents’ records.</p>'+
    '<div class="f combo"><label for="ged-root">Start the chart from</label><input type="search" id="ged-root" value="'+esc(def.name)+'" role="combobox" aria-expanded="false" aria-controls="ged-rl" aria-autocomplete="list" autocomplete="off"><ul class="combolist" id="ged-rl" role="listbox" hidden></ul></div>'+
    '<p class="note2" id="ged-count"></p>'+
    '<div class="btnrow"><button class="btn danger" type="button" data-s="ged-yes">Import and replace my tree</button><button class="btn" type="button" data-s="no">Cancel</button></div>';
  box.hidden=false;
  makeCombo(box.querySelector('#ged-root'),box.querySelector('#ged-rl'),function(){return cands},function(i){ GED.root=cands[i].id; box.querySelector('#ged-root').value=cands[i].name; gedCount() });
  gedCount();
}
function gedCount(){
  var t=gedBuild(GED.G,GED.root), el=sheet.querySelector('#ged-count');
  GED.tree=t;
  if(el) el.textContent=t.people.length.toLocaleString()+' '+(t.people.length===1?'person':'people')+' will be charted, going back '+t.gens+' '+(t.gens===1?'generation':'generations')+'. Your current tree is replaced; you can undo this.';
}
function gedBuild(G,rootId){
  var people=[], byN=new Map(), slot=new Map([[rootId,1]]), q=[[rootId,1]], haplo=[], dna=[], gens=1, now=new Date().getFullYear();
  var famcOf=function(ind){ var fs=gks(ind,'FAMC'); var b=fs.filter(function(f){ var pe=gv(f,'PEDI').toLowerCase(); return !pe||pe==='birth' })[0]||fs[0]; return b?G.recs[String(b.val).trim()]:null };
  var person=function(id,n){
    var ind=G.recs[id], nm=gedName(ind), o={n:n};
    o.name=[nm.fn,nm.mn,nm.ln,nm.sx].filter(Boolean).join(' ')||'Unknown';
    ['fn','mn','ln','sx','mln'].forEach(function(k){ if(nm[k]) o[k]=nm[k] });
    if(n===1){ var sx=gv(ind,'SEX').charAt(0).toUpperCase(); if(sx==='M'||sx==='F') o.sex=sx }
    var src=[].concat(gedSources(G,ind,'all'));
    gks(ind,'NAME').forEach(function(nd){ src=src.concat(gedSources(G,nd,'name')) });
    var b=gk(ind,'BIRT')||null, de=gk(ind,'DEAT')||null;
    if(b){ var bd=gedParseDate(gv(b,'DATE')); if(bd){ o.b=bd.y; if(bd.q) o.bq=bd.q; if(bd.y2) o.b2=bd.y2; if(bd.m&&!bd.q){ o.bm=bd.m; if(bd.d) o.bdy=bd.d } else if(bd.m){ o.bm=bd.m; if(bd.d) o.bdy=bd.d } } var bp=gv(b,'PLAC'); if(bp) o.bp=bp; src=src.concat(gedSources(G,b,'birth')) }
    if(de){ var dd=gedParseDate(gv(de,'DATE')); if(dd){ o.d=dd.y; if(dd.q) o.dq=dd.q; if(dd.y2) o.d2=dd.y2; if(dd.m){ o.dm=dd.m; if(dd.d) o.ddy=dd.d } } var dp=gv(de,'PLAC'); if(dp) o.dp=dp; src=src.concat(gedSources(G,de,'death')) }
    if(gv(ind,'_LIVING').charAt(0).toUpperCase()==='Y'||(!de&&o.b&&o.b>now-100)){ o.l=1; delete o.d; delete o.dp }
    var occ=gks(ind,'OCCU'); if(occ.length){ o.occ=occ.map(function(x){return String(x.val||'').trim()}).filter(Boolean).join('; '); occ.forEach(function(x){ src=src.concat(gedSources(G,x,'occ')) }) }
    var ev=[];
    ind.kids.forEach(function(k){
      var t=GED2EV[k.tag]; if(!t) return;
      var e={id:uid('e'),t:t}, ty=gv(k,'TYPE');
      if(k.tag==='EVEN'&&/milit/i.test(ty)) e.t='mili';
      var dt=gv(k,'DATE'); if(dt){ e.date=gedHuman(dt); var yy=/\b(\d{3,4})\b/.exec(dt); if(yy) e.y=+yy[1] }
      var pl=gv(k,'PLAC'); if(pl) e.pl=pl;
      var tx=[e.t==='even'&&ty?ty:'',String(k.val||'').trim()==='Y'?'':String(k.val||'').trim(),gv(k,'NOTE')].filter(Boolean).join(' · '); if(tx) e.tx=tx;
      ev.push(e); src=src.concat(gedSources(G,k,e.t==='div'?'events':'events'));
    });
    gks(ind,'FAMS').forEach(function(fr){
      var F=G.recs[String(fr.val).trim()]; if(!F) return;
      var sp=[gv(F,'HUSB'),gv(F,'WIFE')].filter(function(x){return x&&x!==id})[0], spn=sp&&G.recs[sp]?(function(){var z=gedName(G.recs[sp]);return [z.fn,z.mn,z.ln,z.sx].filter(Boolean).join(' ')})():'';
      ['MARR','DIV'].forEach(function(T){ var M=gk(F,T); if(!M) return;
        var e={id:uid('e'),t:T==='MARR'?'marr':'div'}, dt=gv(M,'DATE'); if(dt){ e.date=gedHuman(dt); var yy=/\b(\d{3,4})\b/.exec(dt); if(yy) e.y=+yy[1] }
        var pl=gv(M,'PLAC'); if(pl) e.pl=pl; if(spn) e.tx=(T==='MARR'?'to ':'from ')+spn; ev.push(e); src=src.concat(gedSources(G,M,T==='MARR'?'marr':'events')) });
    });
    if(ev.length) o.ev=ev;
    var notes=gedNotes(G,ind); if(notes) o.notes=notes;
    if(gv(ind,'_STAR')) o.star=gv(ind,'_STAR');
    if(gv(ind,'_WIKI')) o.wiki=gv(ind,'_WIKI');
    if(src.length) o.src=src.slice(0,60);
    gks(ind,'_YDNA').concat(gks(ind,'_MTDNA')).forEach(function(h){ var c=String(h.val||'').trim(); if(!c) return; var e={id:uid('h'),type:h.tag==='_YDNA'?'y':'mt',from:n,code:c}; var u=safeUrl(gv(h,'_URL')); if(u) e.url=u; var to=gv(h,'_TO'); if(to) e._to=to; haplo.push(e) });
    gks(ind,'_DNA').forEach(function(g){ var t=String(g.val||'').trim(); if(DNATYPES[t]) dna.push({id:uid('d'),type:t,anchor:n,src:gv(g,'_SRC')}) });
    return o;
  };
  var r0=person(rootId,1); people.push(r0); byN.set(1,r0);
  for(var i=0;i<q.length&&people.length<60000;i++){
    var id=q[i][0], n=q[i][1], F=famcOf(G.recs[id]); if(!F) continue;
    [[gv(F,'HUSB'),2*n,'fa'],[gv(F,'WIFE'),2*n+1,'mo']].forEach(function(x){
      var pid=x[0], sn=x[1]; if(!pid||!G.recs[pid]||dep(sn)>MAXDEPTH) return;
      if(slot.has(pid)){
        var ex=slot.get(pid);
        if(dep(ex)===dep(sn)) byN.get(n)[x[2]]=ex;
        else { var rp={n:sn,name:byN.get(ex).name,ref:ex}; people.push(rp); byN.set(sn,rp) }
        return;
      }
      slot.set(pid,sn); var o=person(pid,sn); people.push(o); byN.set(sn,o); q.push([pid,sn]); gens=Math.max(gens,dep(sn)+1);
    });
  }
  /* children and spouses who are not in the pedigree become names on their parents' records */
  slot.forEach(function(n,id){
    var ind=G.recs[id], o=byN.get(n), kids=[], sps=[];
    gks(ind,'FAMS').forEach(function(fr){
      var F=G.recs[String(fr.val).trim()]; if(!F) return;
      var sp=[gv(F,'HUSB'),gv(F,'WIFE')].filter(function(x){return x&&x!==id})[0]; if(sp&&G.recs[sp]) sps.push(sp);
      gks(F,'CHIL').forEach(function(c){ var cid=String(c.val).trim(); if(!G.recs[cid]||slot.has(cid)) return; var z=gedName(G.recs[cid]); var nm=[z.fn,z.mn,z.ln,z.sx].filter(Boolean).join(' '); if(nm&&kids.indexOf(nm)<0) kids.push(nm) });
    });
    if(kids.length) o.children=kids;
    var nmOf=function(sp){ var z=gedName(G.recs[sp]); return [z.fn,z.mn,z.ln,z.sx].filter(Boolean).join(' ') };
    /* the partner shown in the tree is linked automatically; record spouses only when there is more than one, or for the root */
    if(n===1&&sps.length) o.spouse=sps.map(nmOf).join('; ');
    else if(sps.length>1) o.spouse=sps.map(nmOf).join('; ');
  });
  haplo.forEach(function(h){ if(h._to){ var t=slot.get(h._to); if(t) h.to=t; delete h._to } });
  return {v:1, people:people, famous:[], haplo:haplo, dna:dna, photos:{}, gens:gens};
}
function gedImportFinish(){
  if(!GED||!GED.tree) return;
  var t=GED.tree, from=GED.fname; delete t.gens; GED=null;
  var kp=prefsNow();
  STATE=normalize(t); Object.assign(STATE,kp);
  view=1; czSel.clear(); try{history.replaceState(null,'','#p1')}catch(_){}
  depth=Math.min(5,MAXGEN);
  commit(true,false,'Imported the GEDCOM file '+from);
  dataMgr('GEDCOM file imported. Use Undo if you want your previous tree back.');
}
