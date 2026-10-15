/* Pedigree Builder · js/core.js
   Shared state and helpers: the tree being edited (STATE), lookups built from it (rebuild), names, dates and grandparent lines.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* A read-only copy (saved with "Save as read-only web page") carries its tree in PB_EXPORT and cannot be edited.
   PB_BODY keeps the page's untouched markup, so a read-only copy can be built from it later. */
var READONLY=!!(window.PB_EXPORT&&window.PB_EXPORT.state);
var PB_BODY=(function(){ var b=document.body.cloneNode(true); b.querySelectorAll('script').forEach(function(s){ s.remove() }); return b.innerHTML.trim() })();

var MAXGEN=10, CW=256, CH=48, GAP=64, SLOT=58, MX=24, TOP=14, MAXDEPTH=44;
var clone=function(o){return JSON.parse(JSON.stringify(o))};
var STATE=clone(SAMPLE);
var DATA=[], P=new Map(), KIDS=new Map(), FAMOUS=[], HAPLO=[], DNA=[], DNAOF=new Map(), DEEPEST=1;
var $=function(s){return document.querySelector(s)};
var stage=$('#stage'), vp=$('#vp'), sizer=$('#sizer'), world=$('#world'), pop=$('#pop'), heads=$('#heads'), hin=$('#hin'), lg=$('#legend');
var narrow=window.matchMedia('(max-width:640px)');

/* Links: a person's or famous relative's `wiki` is either a Wikipedia article title (Thomas_Jefferson) or the full
   address of any web page (for example a page on another wiki). */
var isUrl=function(w){ return /^https?:\/\//i.test(String(w||'')) };
function wikiHref(w){ return isUrl(w)?w:'https://en.wikipedia.org/wiki/'+encodeURI(w) }
function wikiSite(w){
  if(!isUrl(w)||/wikipedia\.org/i.test(w)) return 'Wikipedia';
  var h=''; try{ h=new URL(w).hostname }catch(_){}
  return /awoiaf|westeros\.org/i.test(h)?'A Wiki of Ice and Fire':(h.replace(/^www\./,'')||'Link');
}
function wikiText(w){
  if(!isUrl(w)) return String(w).replace(/_/g,' ');
  try{ var u=new URL(w), seg=u.pathname.split('/').filter(Boolean).pop(); return decodeURIComponent(seg||u.hostname).replace(/_/g,' ') }catch(_){ return w }
}
function wikiAria(w,name){ return wikiSite(w)==='Wikipedia'?'Open the Wikipedia article for '+name+' in a new tab':'Open the '+wikiSite(w)+' page for '+name+' in a new tab' }
var view=1, depth=5, scale=1, ww=800, wh=400, openN=null, rootCy=0, editing=false;

var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var dep=function(n){var d=0; while(n>1){ n=Math.floor(n/2); d++ } return d};  /* plain division: ids go past 32 bits */
var fa=function(n){var p=P.get(n);return p&&p.fa!=null?p.fa:2*n};
var mo=function(n){var p=P.get(n);return p&&p.mo!=null?p.mo:2*n+1};
var safeUrl=function(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:''};
var DNATYPES={self:'Self test', yt:'Y-DNA test', mtt:'mtDNA test', match:'DNA match', y:'Y-DNA line', mt:'mtDNA line'};
/* Men carry Y-DNA. Fathers have even numbers; the root's sex is not recorded, so the root may have a Y-DNA test too. */
/* Sex: ancestors take it from their place in the tree (fathers male, mothers female); the root's is set on their record. */
function rawP(n){ for(var i=0;i<STATE.people.length;i++) if(STATE.people[i].n===n) return STATE.people[i]; return null }
function sexOf(n){ if(n===1){ var r=rawP(1); return (r&&r.sex)||'U' } return n%2===0?'M':'F' }
var SEXW={M:'Male',F:'Female',U:'Not recorded'};
var canY=function(n){return sexOf(n)!=='F'};
var EVT={marr:'Marriage',div:'Divorce',bapm:'Baptism',chr:'Christening',buri:'Burial',immi:'Immigration',emig:'Emigration',natu:'Naturalization',mili:'Military service',resi:'Residence',educ:'Education',cens:'Census',reli:'Religion',even:'Other event'};
var FACTS=[['all','Whole record'],['name','Name'],['birth','Birth'],['death','Death'],['parents','Parents'],['marr','Marriage'],['occ','Occupation'],['events','Other events']];
var QUAL=[['','Exact'],['abt','About'],['bef','Before'],['aft','After'],['bet','Between']];
var PHOTO_OK=/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
function photoOf(n){ var ph=STATE.photos; if(STATE.hidePhotos||!ph) return ''; var c=canonOf(n), u=ph[c]; return (u&&PHOTO_OK.test(u))?u:'' }
/* With "married names" chosen, anyone with a married name is shown under it. */
function dispName(p){
  if(STATE.nameView==='married'&&p.mln){ var np=nameParts(p), m=String(p.mln).split(',')[0].trim(); if(m) return [np.fn,np.mn,m,np.sx].filter(Boolean).join(' ') }
  return p.name;
}
var uid=function(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)};
/* Is n on the root's direct father line (step=fa) or mother line (step=mo)? Works for a person not yet added, too. */
function onLine(n,step){ var x=1; for(var i=0;i<300;i++){ if(x===n) return true; if(!P.has(x)) return false; x=step(x) } return false }
function hapUrl(h){ return h.type==='y'?'https://discover.familytreedna.com/y-dna/'+encodeURIComponent(h.code)+'/':'https://discover.familytreedna.com/mtdna/'+encodeURIComponent(h.code) }

/* Rebuild every derived table from STATE. Called after each edit. */
function rebuild(){
  if(!STATE.photos||typeof STATE.photos!=='object') STATE.photos={};
  CANDS=null;
  /* The chart works on copies: "name" is the name to display, "bname" the name at birth. */
  DATA=STATE.people.map(function(p){ var c=Object.assign({},p); c.bname=p.name; c.name=dispName(p); return c });
  syncPrefs();
  P=new Map(DATA.map(function(p){return [p.n,p]}));
  DATA.forEach(function(p){
    if(p.ref==null||!P.has(p.ref)) return;
    var t=P.get(p.ref); p.name=t.name;
    ['b','bm','bdy','bq','b2','d','dm','ddy','dq','d2','l','bname'].forEach(function(k){ if(t[k]!=null) p[k]=t[k]; else delete p[k] });
  });
  DEEPEST=DATA.reduce(function(m,p){return Math.max(m,dep(p.n)+1)},1);
  /* Linked ancestors can sit deeper than their number says: count the longest route too. */
  var LONG=new Map(), longest=function(n,seen){ if(LONG.has(n)) return LONG.get(n); if(seen.has(n)) return 0; seen.add(n);
    var b=0; [fa(n),mo(n)].forEach(function(m){ if(P.has(m)) b=Math.max(b,1+longest(m,seen)) }); seen.delete(n); LONG.set(n,b); return b };
  if(P.has(1)) DEEPEST=Math.max(DEEPEST,longest(1,new Set())+1);
  MAXGEN=Math.max(10,DEEPEST+1);
  KIDS=new Map();
  DATA.forEach(function(p){[fa(p.n),mo(p.n)].forEach(function(a){
    if(P.has(a)){ if(!KIDS.has(a)) KIDS.set(a,[]); KIDS.get(a).push(p.n); }
  })});
  /* Haplogroups: Y-DNA follows the father line from "from", mtDNA the mother line. */
  HAPLO=[];
  (STATE.haplo||[]).forEach(function(s){
    if(!P.has(s.from)||!s.code) return;
    var y=s.type==='y', fp=P.get(s.from);
    var h={type:y?'y':'mt', from:s.from, to:s.to, code:s.code,
      title:y?'Y-DNA haplogroup':'mtDNA haplogroup', label:y?'Paternal · Y-DNA':'Maternal · mtDNA',
      line:s.line||(y?(surnameOf(fp.name)||fp.name)+' paternal line':(s.from===1?'maternal line':fp.name+'’s maternal line')),
      url:safeUrl(s.url)||hapUrl(s)};
    var step=y?fa:mo, n=h.from, ch=[];
    while(P.has(n)&&ch.length<200){ch.push(n); if(h.to!=null&&n===h.to) break; n=step(n)}
    h.chain=ch; h.end=ch[ch.length-1]; h.members=new Set(ch);
    HAPLO.push(h);
  });
  /* DNA confirmation groups */
  var down=function(n){ var out=[], q=[n], seen=new Set([n]);
    for(var i=0;i<q.length;i++){ (KIDS.get(q[i])||[]).forEach(function(k){ if(!seen.has(k)){seen.add(k);out.push(k);q.push(k)} }) }
    return out; };
  var chainTo=function(to,step){ var out=[], n=1; while(P.has(n)&&out.length<300){ out.push(n); if(n===to) return out; n=step(n) } return null };
  DNA=(STATE.dna||[]).filter(function(g){return P.has(g.anchor)}).map(function(g){
    var ppl;
    if(g.type==='self'||g.type==='yt'||g.type==='mtt') ppl=[g.anchor];
    else if(g.type==='y'||g.type==='mt') ppl=chainTo(g.anchor,g.type==='y'?fa:mo)||[g.anchor].concat(down(g.anchor));
    else ppl=[g.anchor].concat(down(g.anchor));
    return {title:DNATYPES[g.type]||'DNA match', src:g.src||'Source not recorded', people:ppl};
  });
  DNAOF=new Map();
  DNA.forEach(function(g){ g.people.forEach(function(n){ if(!P.has(n)) return; var a=DNAOF.get(n)||[]; a.push(g); DNAOF.set(n,a) }) });
  /* Famous relatives: starred ancestors first (route of length 0), then the entries from the famous list. */
  var out=[];
  DATA.forEach(function(p){
    if(!p.star||p.ref!=null) return;
    var ns=[p.n]; DATA.forEach(function(q){ if(q.ref===p.n) ns.push(q.n) });
    out.push({name:p.name, title:p.star, b:p.b, bq:p.bq, b2:p.b2, d:p.d, dq:p.dq, d2:p.d2, wiki:p.wiki, ancestor:true,
      via:ns.map(function(n){return {anc:n, path:[], k:0, male:p.n%2===0}})});
  });
  (STATE.famous||[]).forEach(function(f){
    if(!f.name) return;
    var via=(f.routes||[]).filter(function(r){return P.has(r.anc)}).map(function(r){
      var sp=(r.half||r.anc===1)?null:(r.sp!=null?r.sp:(r.anc%2===0?r.anc+1:r.anc-1));
      if(sp!=null&&!P.has(sp)) sp=null;
      var path=(r.path||[]).map(function(e){return [e[0]||'…',e[1]||null,e[2]||null]}).concat([[f.name]]);
      var v={anc:r.anc, half:!!r.half, path:path, k:path.length};
      if(sp!=null) v.sp=sp;
      if(r.note) v.note=r.note;
      return v;
    });
    if(!via.length) return;
    out.push({name:f.name, title:f.title||'Famous relative', sex:f.sex, b:f.b, bq:f.bq, b2:f.b2, d:f.d, dq:f.dq, d2:f.d2, wiki:f.wiki, via:via});
  });
  FAMOUS=out;
  RATIO={root:null,w:null,c:null};
  DEPTHS=new Map();
  fillDepth();
}
var dnaOf=function(n){ var p=P.get(n); return DNAOF.get(p&&p.ref!=null?p.ref:n) };
var dnaTip=function(a){ return 'DNA confirmed: '+a.map(function(g){return g.title+' ('+g.src+')'}).join('; ') };

var ord=function(k){var v=k%100,s=['th','st','nd','rd'];return k+(s[(v-20)%10]||s[v]||s[0])};
var cap=function(s){return s.charAt(0).toUpperCase()+s.slice(1)};
var sur=function(n){var p=P.get(n);return p?p.name.trim().split(/\s+/).pop():'?'};
var first=function(){return P.get(1).name.split(' ')[0]};

function relTo(n){
  var d=dep(n); if(!d) return 'Self';
  var m=n%2===0;
  if(d===1) return m?'Father':'Mother';
  if(d===2) return m?'Grandfather':'Grandmother';
  var base=m?'great-grandfather':'great-grandmother';
  return d===3?cap(base):ord(d-2)+' '+base;
}
/* Every number of generations between two people (more than one with pedigree collapse). */
var DEPTHS=new Map();
function allDepths(from,to){
  var key=from+'>'+to; if(DEPTHS.has(key)) return DEPTHS.get(key);
  var out=[], layer=new Set([from]);
  for(var g=0;g<=MAXDEPTH+2&&layer.size;g++){
    if(layer.has(to)) out.push(g);
    var nx=new Set(); layer.forEach(function(x){ [fa(x),mo(x)].forEach(function(m){ if(P.has(m)) nx.add(m) }) }); layer=nx;
  }
  DEPTHS.set(key,out); return out;
}
function relAtDepth(d,male){
  if(!d) return 'Self';
  if(d===1) return male?'Father':'Mother';
  if(d===2) return male?'Grandfather':'Grandmother';
  var base=male?'great-grandfather':'great-grandmother';
  return d===3?cap(base):ord(d-2)+' '+base;
}
function relAll(n){
  var ds=allDepths(1,n); if(!ds.length) ds=[dep(n)];
  var rs=[]; ds.forEach(function(d){var r=relAtDepth(d,n%2===0); if(rs.indexOf(r)<0) rs.push(r)});
  if(rs.length<2) return rs[0];
  var parts=rs.map(function(r){var m=/^(\d+(?:st|nd|rd|th) )?(.*)$/.exec(r);return {o:(m[1]||'').trim(),b:m[2]}});
  if(parts.every(function(p){return p.b===parts[0].b&&p.o})) return parts.map(function(p){return p.o}).join(' and ')+' '+parts[0].b;
  return rs.join(' and ');
}
function genLabel(d){
  if(d===0) return 'Self';
  if(d===1) return 'Parents';
  if(d===2) return 'Grandparents';
  if(d===3) return 'Great-grandparents';
  return ord(d-2)+' great-grandparents';
}
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
/* Full birth date as far as it is known, e.g. "17 June 1934", "March 1871", "1897". Hidden for living people unless the tree shows their birth years. */
function birthDate(p){
  if(p.l&&!STATE.showLiving) return '';
  return fullDate(p,'b');
}
/* Years before year 1 are stored as negative numbers and shown as "50 BC". There is no year 0. */
function yStr(y){ y=+y; return y<0?(-y)+' BC':String(y) }
/* The year in a free-text date: the last number, negative when "BC"/"BCE" follows or a minus sign comes before it. */
function yearIn(t){
  t=String(t||''); var re=/(^|[^\d\-\u2212])([\-\u2212]?)(\d{1,4})(?!\d)(\s*B\.?\s?C\.?(?:E\.?)?(?![A-Za-z]))?/gi, m, last=null;
  while((m=re.exec(t))) last=m;
  if(!last) return null;
  var y=+last[3]; if(!y) return null;
  return (last[2]||last[4])?-y:y;
}
/* Short year for cards: "c. 1850", "bef. 1700", "aft. 1820", "1820/1825". k is "b" (birth) or "d" (death). */
function yText(p,k){
  var y=p[k]; if(!y) return '';
  var q=p[k+'q'], y2=p[k+'2'];
  if(q==='abt') return 'c. '+yStr(y); if(q==='bef') return 'bef. '+yStr(y); if(q==='aft') return 'aft. '+yStr(y);
  if(q==='bet'&&y2) return y<0&&y2<0?(-y)+'/'+yStr(y2):yStr(y)+'/'+yStr(y2);
  return yStr(y);
}
/* Full date in words: "17 June 1934", "about 1850", "between 1820 and 1825". */
function fullDate(p,k){
  var y=p[k]; if(!y) return '';
  var q=p[k+'q'];
  if(q==='bet'&&p[k+'2']) return 'between '+yStr(y)+' and '+yStr(p[k+'2']);
  var m=p[k+'m'], d=p[k+'dy'], parts=[];
  if(m&&d) parts.push(d); if(m) parts.push(MONTHS[m-1]); parts.push(yStr(y));
  return ({abt:'about ',bef:'before ',aft:'after '}[q]||'')+parts.join(' ');
}
/* Years of a famous relative for lists: "1743–1826", "b. c. 1850", "d. 209". */
function famYears(f){
  return f.b&&f.d?yText(f,'b')+'–'+yText(f,'d'):f.b?'b. '+yText(f,'b'):f.d?'d. '+yText(f,'d'):'';
}
/* What a card needs from a famous relative. */
function famP(f){ return {name:f.name, b:f.b, bq:f.bq, b2:f.b2, d:f.d, dq:f.dq, d2:f.d2, wiki:f.wiki} }
function years(p){
  if(p.l) return (p.b&&STATE.showLiving)?yText(p,'b')+'–Living':'Living';
  if(p.b&&p.d) return yText(p,'b')+'–'+yText(p,'d');
  if(p.b) return 'b. '+yText(p,'b');
  if(p.d) return 'd. '+yText(p,'d');
  return 'Dates not recorded';
}
/* XSH[c]: extra width added before column c (a widened gap); see render(). */
var XSH=[], XEX=[], REPOPT=false;
var xOf=function(c){return MX+c*(CW+GAP)+(XSH[c]||0)};

/* Grandparent lines are relative to whoever is the root of the current view.
   Slot 4 = father's father, 5 = father's mother, 6 = mother's father, 7 = mother's mother.
   Each slot owns a colour; everyone who descends from that grandparent gets it. */
var LINE=new Map(), LINEINFO=[];
var SUFFIX=/^(jr\.?|sr\.?|i{1,3}|iv|v|vi{0,3}|ix|x)$/i;
/* First, middle, last (at birth) and suffix. Stored parts are used when present; an older entry with only a full
   name is split: first word, last word (after any suffix such as Jr. or III), and everything between. */
function nameParts(p){
  if(p.fn!=null||p.mn!=null||p.ln!=null||p.sx!=null) return {fn:p.fn||'',mn:p.mn||'',ln:p.ln||'',sx:p.sx||''};
  var t=String((p.bname!=null?p.bname:p.name)||'').trim().split(/\s+/).filter(Boolean), sx=[];
  while(t.length>2&&SUFFIX.test(t[t.length-1])) sx.unshift(t.pop());
  if(!t.length) return {fn:'',mn:'',ln:'',sx:''};
  if(t.length===1) return {fn:t[0],mn:'',ln:'',sx:sx.join(' ')};
  return {fn:t[0],mn:t.slice(1,-1).join(' '),ln:t[t.length-1],sx:sx.join(' ')};
}
function surnameOf(name){
  if(name.indexOf(',')>-1) return null;
  var t=name.trim().split(/\s+/);
  while(t.length>1&&SUFFIX.test(t[t.length-1])) t.pop();
  return t[t.length-1].replace(/["\u201c\u201d]/g,'')||null;
}
function buildLines(root){
  LINE=new Map(); LINEINFO=[];
  var f=fa(root), m=mo(root);
  var gps=[P.has(f)?fa(f):null, P.has(f)?mo(f):null, P.has(m)?fa(m):null, P.has(m)?mo(m):null];
  gps.forEach(function(g,i){
    if(g==null||!P.has(g)||LINE.has(g)) return;
    var slot=4+i; LINE.set(g,slot); LINEINFO.push({slot:slot,n:g,label:'',s:null});
    var st=[g];
    while(st.length){
      var x=st.pop();
      [fa(x),mo(x)].forEach(function(y){ if(P.has(y)&&!LINE.has(y)){LINE.set(y,slot);st.push(y)} });
    }
  });
  var counts={};
  /* the line is named after the grandparent's recorded last name ("of" dropped), or the last word of their name */
  LINEINFO.forEach(function(e){var gp=P.get(e.n); e.s=gp.ln?String(gp.ln).replace(/^(of|von|de|van)\s+/i,'').trim()||null:surnameOf(gp.name);var k=(e.s||'').toLowerCase();counts[k]=(counts[k]||0)+1});
  LINEINFO.forEach(function(e){e.label=(e.s&&counts[e.s.toLowerCase()]===1)?e.s:P.get(e.n).name});
}
function lineLabel(slot){for(var i=0;i<LINEINFO.length;i++){if(LINEINFO[i].slot===slot) return LINEINFO[i].label} return ''}
function lineOf(n){return LINE.get(n)||null}
function lc(n){var g=lineOf(n);return g?'var(--l'+g+')':'var(--rule)'}
function renderLegend(){
  var h='<li class="lead">Grandparent lines</li>';
  if(!LINEINFO.length) h+='<li class="lead">none recorded for this person</li>';
  else h+=LINEINFO.map(function(e){
    return '<li><i class="dot" style="--lc:var(--l'+e.slot+')"></i><span title="'+esc(P.get(e.n).name)+'">'+esc(e.label)+'</span></li>';
  }).join('');
  h+='<li id="lg-dna" hidden><span class="cdna" aria-hidden="true">'+ICON_DNA+'</span><span>DNA confirmed</span></li>';
  lg.innerHTML=h;
}

/* Generation labels live in a strip outside the scrolling chart, so they stay in view while
   scrolling down. They follow horizontal scroll and zoom. */
function buildHeads(maxD,hapOnly){
  var h='';
  for(var c=0;c<=maxD;c++){
    var ho=hapOnly&&hapOnly(c);
    h+='<div class="hd'+(c%2?' alt':'')+'" data-c="'+c+'"><b>'+(ho?'DNA':(c+1))+'</b><span class="tx">'+(ho?'Haplogroup':esc(genLabel(c)))+'</span></div>';
  }
  hin.innerHTML=h;
}
function layoutHeads(){
  var w=(CW+GAP)*scale, kids=hin.children;
  heads.style.right=(vp.offsetWidth-vp.clientWidth)+'px';
  for(var i=0;i<kids.length;i++){
    var c=+kids[i].getAttribute('data-c');
    kids[i].style.left=((xOf(c)-GAP/2-(XEX[c]||0))*scale)+'px';
    kids[i].style.width=((CW+GAP+(XEX[c]||0))*scale)+'px';
    kids[i].classList.toggle('num',w<150);
  }
}
function scrollHeads(){hin.style.transform='translateX('+(-vp.scrollLeft)+'px)'}

var ICON_DNA='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4.5 1.5c0 3.2 7 4.3 7 6.5s-7 3.3-7 6.5M11.5 1.5c0 3.2-7 4.3-7 6.5s7 3.3 7 6.5M5.6 4.4h4.8M5.6 11.6h4.8"/></svg>';
var ICON_TREE='<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="6" width="4" height="4" rx=".8"/><rect x="10.5" y="1.5" width="4" height="4" rx=".8"/><rect x="10.5" y="10.5" width="4" height="4" rx=".8"/><path d="M5.5 8H8M8 3.5v9M8 3.5h2.5M8 12.5h2.5"/></svg>';
var ICON_CHEV='<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transition:transform .15s"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>';
