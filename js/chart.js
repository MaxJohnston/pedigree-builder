/* Pedigree Builder · js/chart.js
   Drawing the pedigree chart: layout, connectors, zoom and pan, famous-relative lines, haplogroup nodes, the details panel and navigation.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- render ---------- */
function render(keep){
  keepDepth();
  closeDetails(true);
  buildLines(view); renderLegend();
  var D=depth, nodes, seen, rn, split=new Set();
  /* One column per generation. Someone reached by routes of different lengths (pedigree collapse) is drawn once, in the
     furthest column they reach, and the nearer child gets a longer line that skips the columns in between. If that line
     would cross several others, the person is drawn in the nearest column instead, and each further place gets a dashed
     repeat card, so repeat cards are always in the higher generation. */
  function build(withAdd){
    nodes=[]; seen=new Map();
    var anc=new Set([view]), q=[view], nkid=new Map();
    for(var i=0;i<q.length;i++){ var x=q[i]; if(P.get(x).ref!=null) continue;
      [fa(x),mo(x)].forEach(function(m){ if(!P.has(m)) return; nkid.set(m,(nkid.get(m)||0)+1); if(!anc.has(m)){ anc.add(m); q.push(m) } }); }
    /* children before parents, so each ancestor's column is settled from all of its children */
    var dOf=new Map([[view,0]]), ready=[view];
    while(ready.length){
      var y=ready.shift(), dy=dOf.get(y); if(P.get(y).ref!=null) continue;
      [fa(y),mo(y)].forEach(function(m){ if(!P.has(m)) return;
        if(dy!=null&&dy+1<=D-1){ var c=dOf.get(m); dOf.set(m,c==null?dy+1:split.has(m)?Math.min(c,dy+1):Math.max(c,dy+1)) }
        nkid.set(m,nkid.get(m)-1); if(nkid.get(m)===0) ready.push(m);
      });
    }
    dOf.forEach(function(d,n){ var nd={n:n,d:d,p:P.get(n),kids:[],owner:null}; seen.set(n,nd); nodes.push(nd) });
    var vis=new Set();
    (function visit(n){
      if(vis.has(n)) return; vis.add(n);
      var nd=seen.get(n), p=nd.p;
      if(!p.ref) (p.mf?[mo(n),fa(n)]:[fa(n),mo(n)]).forEach(function(m){
        if(P.has(m)&&seen.has(m)&&nd.d<D-1){
          var pn=seen.get(m);
          if(pn.d===nd.d+1){ nd.kids.push(pn); if(!pn.owner){ pn.owner=nd; visit(m) } }
          else if(pn.d>nd.d+1) nd.kids.push(pn);
          else { var r={n:m,d:nd.d+1,p:pn.p,kids:[],owner:nd,rep:true}; nd.kids.push(r); nodes.push(r) }
        }else if(!P.has(m)&&withAdd&&dep(m)<=MAXDEPTH){
          /* edit mode: a dashed card for each missing parent */
          var a={n:m,d:nd.d+1,p:{name:''},kids:[],owner:nd,add:true,child:n,role:m===fa(n)?'father':'mother',cls:'add',color:'var(--edit)'};
          nd.kids.push(a); nodes.push(a);
        }
      });
      nd.more=(nd.d===D-1)&&(P.has(fa(n))||P.has(mo(n)));
    })(view);
    rn=seen.get(view);
  }
  /* Full siblings share the same parent nodes: they sit together, centred on those parents. */
  function group(){
    var groups={};
    nodes.forEach(function(nd){
      if(!nd.kids.length||nd.p.solo||nd.rep) return;
      nd.gkey=nd.d+':'+nd.kids.map(function(k){return k.n}).sort(function(a,b){return a-b}).join(',');
      (groups[nd.gkey]=groups[nd.gkey]||[]).push(nd);
    });
    Object.keys(groups).forEach(function(key){
      var g=groups[key]; var ok=function(x){return x.p.so!=null?x.p.so:x.n}; g.sort(function(a,b){return ok(a)-ok(b)});
      if(g.length<2) return;
      var own=g.filter(function(m){return m.kids.some(function(k){return k.owner===m})})[0]||g[0];
      own.grp=g; g.forEach(function(m){ if(m!==own) m.ghost=true });
    });
  }
  /* Pack the tree: each branch is laid out on its own, then the next branch is slid up as far as it can go
     without touching the previous one in any generation column. Parents stay centred on their own parents. */
  function lay(n){
    var ok=n.kids.filter(function(k){return k.owner===n&&!k.ghost});
    var lo={}, hi={}, ext=null;
    if(!ok.length){ n.rel=0; ext=[0,0]; }
    else{
      var offs=[];
      ok.forEach(function(k,i){
        var pr=lay(k), off=0;
        if(i){
          off=-1e9;
          Object.keys(pr.lo).forEach(function(c){ if(hi[c]!=null) off=Math.max(off,hi[c]+1-pr.lo[c]) });
          if(off<-1e8) off=0;
        }
        k.off=off; offs.push(k.rel+off);
        Object.keys(pr.lo).forEach(function(c){
          var l=pr.lo[c]+off, h=pr.hi[c]+off;
          lo[c]=lo[c]==null?l:Math.min(lo[c],l); hi[c]=hi[c]==null?h:Math.max(hi[c],h);
        });
      });
      n.rel=offs.reduce(function(a,b){return a+b},0)/offs.length;
      ext=[Math.min.apply(null,offs.concat(n.rel)),Math.max.apply(null,offs.concat(n.rel))];
    }
    if(n.grp){ var h2=(n.grp.length-1)/2; ext=[Math.min(ext[0],n.rel-h2),Math.max(ext[1],n.rel+h2)]; }
    lo[n.d]=lo[n.d]==null?ext[0]:Math.min(lo[n.d],ext[0]);
    hi[n.d]=hi[n.d]==null?ext[1]:Math.max(hi[n.d],ext[1]);
    return {lo:lo,hi:hi};
  }
  function settle(n,base){
    var y0=base+n.rel; n.y=y0;
    if(n.grp){ var h2=(n.grp.length-1)/2; n.grp.forEach(function(m,i){ m.y=y0+i-h2 }); }
    n.kids.forEach(function(k){ if(k.owner===n&&!k.ghost) settle(k,base+k.off) });
  }
  /* A line that skips generations runs between the cards of the columns it passes: the free row nearest the parent. */
  /* Lines from one child to a couple further back travel together, aimed at the middle of the couple. */
  function longTarget(u,v){
    var grp=u.kids.filter(function(k){return k.d===v.d&&k.owner===v.owner});
    return grp.length?grp.reduce(function(s,k){return s+k.y},0)/grp.length:v.y;
  }
  /* Connectors a generation-skipping line from u to v would cross if it ran across the columns in between at row yc
     and then joined the fork of v's nearer child (its owner) next to v. */
  function crossAt(u,v,yc,ty){
    var c=0, o=v.owner, inn=function(t,a,b){ return t>Math.min(a,b)+0.01&&t<Math.max(a,b)-0.01 };
    var lo=o?Math.min(o.y,ty-0.5):ty, hi=o?Math.max(o.y,ty+0.5):ty, tp=yc<lo?lo:yc>hi?hi:yc;
    nodes.forEach(function(a){ a.kids.forEach(function(b){
      if(b.d!==a.d+1||a===u||b.add) return;
      var g=a.d;
      if(g===u.d){ if(inn(b.y,u.y,yc)) c++; if(inn(u.y,a.y,b.y)) c++; }
      else if(g>u.d&&g<v.d-1){ if(inn(yc,a.y,b.y)) c++; }
      else if(g===v.d-1&&a!==o){ if(inn(yc,a.y,b.y)) c++; if(inn(a.y,yc,tp)) c++; }
    }) });
    return c;
  }
  /* The row a generation-skipping line runs along between the cards of the columns it passes: of the free rows,
     the one where it crosses the fewest other lines, then the nearest to the parents. */
  function routeOf(u,v){
    var ty=longTarget(u,v), mids=nodes.filter(function(x){return x.d>u.d&&x.d<v.d});
    var free=function(y){ return mids.every(function(x){return Math.abs(x.y-y)>=0.5-1e-9}) };
    var cands=[ty,u.y]; mids.forEach(function(x){ cands.push(x.y-0.5,x.y+0.5) });
    var best=null;
    cands.forEach(function(y){ if(!free(y)) return; var c=crossAt(u,v,y,ty), sc=c*1000+Math.abs(y-ty)+0.3*Math.abs(y-u.y); if(!best||sc<best.s) best={y:y,s:sc,c:c} });
    return best||{y:ty,c:crossAt(u,v,ty,ty)};
  }
  function corridor(u,v){ return routeOf(u,v).y }
  /* 3 or more crossings counts as several. */
  function longCrossings(u,v){ return routeOf(u,v).c }
  /* Parents reached by a line that skips generations start out centred on their nearest child. Slide them, with everyone
     behind them, toward the middle of all their children, as far as there is room in every column they occupy. */
  function centerCross(){
    var inc=new Map();
    nodes.forEach(function(u){ u.kids.forEach(function(k){ if(k.add||k.rep) return; var a=inc.get(k)||[]; if(a.indexOf(u)<0) a.push(u); inc.set(k,a) }) });
    var blocks=new Map();
    inc.forEach(function(ch,k){
      if(!k.owner||ch.length<2||!ch.some(function(c){return k.d>c.d+1})) return;
      var key=k.owner.n+'|'+ch.map(function(c){return c.n}).sort(function(a,b){return a-b}).join(',');
      var b=blocks.get(key);
      if(!b){ b={d:k.d,want:ch.reduce(function(s,c){return s+c.y},0)/ch.length-k.owner.y,members:[]}; blocks.set(key,b) }
      b.members.push(k);
    });
    Array.from(blocks.values()).sort(function(a,b){return a.d-b.d}).forEach(function(b){
      var S=new Set();
      (function collect(xs){ xs.forEach(function(x){ if(S.has(x)) return; S.add(x); if(x.grp) collect(x.grp); collect(x.kids.filter(function(k){return k.owner===x})) }) })(b.members);
      var others=nodes.filter(function(z){return !S.has(z)});
      var fits=function(dl){ var ok=true; S.forEach(function(x){ if(ok) others.forEach(function(z){ if(z.d===x.d&&Math.abs(z.y-(x.y+dl))<1-1e-6) ok=false }) }); return ok };
      var dl=b.want, sg=dl<0?-1:1;
      while(Math.abs(dl)>1e-6&&!fits(dl)) dl=Math.abs(dl)<=0.5?0:dl-sg*0.5;
      if(dl) S.forEach(function(x){ x.y+=dl });
    });
  }
  /* Repeat cards are decided without edit mode's "Add father/mother" cards, so entering edit mode never changes them. */
  for(var pass=0;pass<8;pass++){
    build(false); group(); lay(rn); settle(rn,0); centerCross();
    var top=Infinity; nodes.forEach(function(x){ if(x.y<top) top=x.y });
    nodes.forEach(function(x){ x.y-=top });
    var bad=[];
    nodes.forEach(function(u){ u.kids.forEach(function(v){ if(v.d>u.d+1&&!split.has(v.n)&&bad.indexOf(v.n)<0&&longCrossings(u,v)>=3) bad.push(v.n) }) });
    if(!bad.length) break;
    bad.forEach(function(m){ split.add(m) });
  }
  if(editing){
    build(true); group(); lay(rn); settle(rn,0); centerCross();
    var top2=Infinity; nodes.forEach(function(x){ if(x.y<top2) top2=x.y });
    nodes.forEach(function(x){ x.y-=top2 });
  }
  var czEdges=new Set();
  ANC=ancSteps(view);
  var cz=addGuests(nodes,seen,view,function(k){czEdges.add(k)});
  addHaplo(nodes,seen);
  /* Focus mode: with at least one famous relative selected, keep only the cards on the selected routes (the line from the
     root to the shared ancestors, those ancestors, and the descendants drawn for the famous people), then close the gaps. */
  DRAWN=new Set(nodes.map(function(x){return x.n}));
  if(czOn&&czFocus&&czSel.size&&cz.route.size){
    var keepN=new Set(nodes.filter(function(x){return x.guest||x.n===view||cz.route.has(x.n)||cz.anc.has(x.n)}));
    nodes=nodes.filter(function(x){return keepN.has(x)});
    nodes.forEach(function(x){ x.kids=x.kids.filter(function(k){return keepN.has(k)}) });
    var uy=[]; nodes.forEach(function(x){ if(uy.every(function(v){return Math.abs(v-x.y)>1e-6})) uy.push(x.y) });
    uy.sort(function(a,b){return a-b});
    nodes.forEach(function(x){ x.y=uy.findIndex(function(v){return Math.abs(v-x.y)<=1e-6}) });
  }
  var maxY=0; nodes.forEach(function(x){if(x.y>maxY)maxY=x.y});
  var maxD=0; nodes.forEach(function(x){if(x.d>maxD)maxD=x.d});
  var topOf=function(nd){return TOP+nd.y*SLOT+(SLOT-CH)/2};
  var cy=function(nd){return topOf(nd)+CH/2};
  ww=MX*2+(maxD+1)*CW+maxD*GAP+20;
  wh=Math.max(TOP+(maxY+1)*SLOT+16,170);

  var h='';
  for(var d=1;d<=maxD;d+=2) h+='<div class="band" style="left:'+(xOf(d)-GAP/2)+'px;width:'+(CW+GAP)+'px"></div>';

  /* Stagger the connectors: every child gets its own vertical lane in the gap when its span overlaps
     another child's, and parents reached by several children (siblings) get separate entry points. */
  var inc=new Map();
  nodes.forEach(function(nd){nd.kids.forEach(function(k){var a=inc.get(k)||[];a.push(nd);inc.set(k,a)})});
  var entry=function(nd,k){
    var a=inc.get(k); if(!a||a.length<2) return 0;
    a=a.slice().sort(function(u,v){return u.y-v.y});
    return (a.indexOf(nd)-(a.length-1)/2)*6;
  };
  var rowY=function(y){return TOP+y*SLOT+SLOT/2};
  /* where a connector leaves the gap next to the child: the parent's row, or for a line that skips generations, its corridor */
  var kidY=function(nd,k){ return k.d>nd.d+1?rowY(corridor(nd,k)):cy(k)+entry(nd,k) };
  var byDepth={};
  /* A line that skips generations joins the fork of the parent's nearer child for its last stretch, coming in from the
     left at its corridor row. Count that row as part of that fork, so neighbouring forks get their own lanes beside it. */
  nodes.forEach(function(nd){ nd.extra=[] });
  nodes.forEach(function(nd){ nd.kids.forEach(function(k){
    if(k.d>nd.d+1&&k.owner&&k.owner.d===k.d-1&&k.owner.kids.indexOf(k)>=0) k.owner.extra.push(rowY(corridor(nd,k)));
  }) });
  nodes.forEach(function(nd){ if(nd.kids.length) (byDepth[nd.d]=byDepth[nd.d]||[]).push(nd); });
  Object.keys(byDepth).forEach(function(dk){
    var list=byDepth[dk];
    list.forEach(function(nd){
      var ys=[cy(nd)].concat(nd.extra); nd.kids.forEach(function(k){ys.push(kidY(nd,k))});
      nd.lo=Math.min.apply(null,ys); nd.hi=Math.max.apply(null,ys);
    });
    list.sort(function(a,b){return a.lo-b.lo||a.hi-b.hi});
    /* Lanes: forks whose spans overlap get separate lanes. Each fork takes the lane (or a new lane at either side of
       the existing ones) where its connectors cross the fewest of the forks already placed. A fork on the left of
       another crosses it once for every of its child entries that falls inside the other's span, and once more if the
       other's own row falls inside its span. */
    var lanes=[];
    list.forEach(function(nd){ nd.ky=nd.kids.map(function(k){return kidY(nd,k)}); });
    /* Cards that share the same parents (brothers and sisters) share one lane, so their connectors join into a single fork
       instead of crossing each other. */
    var fam=new Map(), items=[];
    list.forEach(function(nd){
      var key=nd.kids.length>1?nd.kids.map(function(k){return k.n}).sort(function(a,b){return a-b}).join(','):null;
      var it=key&&fam.get(key);
      if(!it){ it={members:[],lo:Infinity,hi:-Infinity,ky:[],cys:[]}; items.push(it); if(key) fam.set(key,it) }
      it.members.push(nd); it.lo=Math.min(it.lo,nd.lo); it.hi=Math.max(it.hi,nd.hi);
      it.ky=it.ky.concat(nd.ky); it.cys.push(cy(nd)); it.cys=it.cys.concat(nd.extra);
    });
    items.sort(function(a,b){return a.lo-b.lo||a.hi-b.hi});
    var near=function(a,b){return a.lo<b.hi+3&&b.lo<a.hi+3};
    var inS=function(y,q){return y>q.lo+1&&y<q.hi-1};
    var leftCost=function(A,B){ var c=0; A.ky.forEach(function(y){ if(inS(y,B)) c++ }); B.cys.forEach(function(y){ if(inS(y,A)) c++ }); return c };
    items.forEach(function(nd){
      var best=null;
      var consider=function(li,reuse,pos){
        var c=reuse?0:0.01;
        lanes.forEach(function(L,i){
          var leftOf=reuse?i<li:i<pos;
          if(reuse&&i===li) return;
          L.forEach(function(g){ if(!near(g,nd)) return; c+=leftOf?leftCost(g,nd):leftCost(nd,g) });
        });
        if(!best||c<best.c-1e-9) best={c:c,li:li,reuse:reuse,pos:pos};
      };
      lanes.forEach(function(L,i){ if(L.every(function(g){return !near(g,nd)})) consider(i,true,0) });
      for(var q=0;q<=lanes.length;q++) consider(0,false,q);
      if(best.reuse){ lanes[best.li].push(nd); nd._l=lanes[best.li] }
      else{ var nl=[nd]; lanes.splice(best.pos,0,nl); nd._l=nl }
    });
    items.forEach(function(it){ var ln=lanes.indexOf(it._l); it.members.forEach(function(m){ m.lane=ln }) });
    var step=lanes.length>1?Math.min(8,(GAP-20)/(lanes.length-1)):0;
    list.forEach(function(nd){nd.trunk=10+nd.lane*step});
  });
  var paths='', hot='';
  nodes.forEach(function(nd){
    nd.kids.forEach(function(k){
      var x1=xOf(nd.d)+CW, y1=cy(nd), x2=xOf(k.d), y2=cy(k)+entry(nd,k), xm=x1+nd.trunk;
      var on=czEdges.has(nd.n+'>'+k.n);
      var dd='M'+x1+' '+y1+'H'+xm+'V'+y2+'H'+x2;
      if(k.d>nd.d+1){
        /* across the columns in between, then into the fork of the parent's nearer child, sharing its last stretch */
        var o=k.owner&&k.owner.trunk!=null&&k.owner.d===k.d-1?k.owner:null;
        var xb=o?xOf(o.d)+CW+o.trunk:x2-GAP+5, yb=o?cy(k)+entry(o,k):y2;
        dd='M'+x1+' '+y1+'H'+xm+'V'+rowY(corridor(nd,k))+'H'+xb+'V'+yb+'H'+x2;
      }
      var seg='<path'+(on?' class="cz"':(k.cls?' class="'+k.cls+'"':''))+' style="--lc:'+(k.color||lc(k.n))+'" d="'+dd+'"/>';
      if(on) hot+=seg; else paths+=seg;
    });
  });
  paths+=hot;
  h+='<svg class="lines" width="'+ww+'" height="'+wh+'" aria-hidden="true">'+paths+'</svg>';

  nodes.forEach(function(nd){
    if(nd.hap){
      var hp=nd.hap, isY=hp.type==='y', tt=hp.title+' '+hp.code+' ('+hp.line+')'+(hp.to!=null&&P.has(hp.end)?'. Evidence reaches up to '+P.get(hp.end).name:'')+'. Opens FamilyTreeDNA in a new tab.';
      h+='<a class="card hap '+(isY?'hy':'hm')+'" data-n="'+nd.n+'" href="'+esc(hp.url)+'" target="_blank" rel="noopener noreferrer" style="left:'+xOf(nd.d)+'px;top:'+topOf(nd)+'px" aria-label="'+esc(tt)+'" title="'+esc(tt)+'">'+
        '<span class="hglyph" aria-hidden="true">'+(isY?'Y':'mt')+'</span>'+
        '<span class="who"><span class="nm">'+esc(hp.code)+'</span><span class="yr">'+esc(hp.label)+'</span></span>'+
        '<span class="ico" aria-hidden="true">&#8599;</span></a>';
      return;
    }
    if(nd.add){
      var cn=esc(P.get(nd.child).name);
      h+='<button type="button" class="card add" data-act="add" data-n="'+nd.n+'" data-child="'+nd.child+'" style="left:'+xOf(nd.d)+'px;top:'+topOf(nd)+'px" aria-label="Add '+nd.role+' of '+cn+'">'+
        '<span class="plus" aria-hidden="true">+</span><span class="who"><span class="nm">Add '+nd.role+'</span><span class="yr">of '+cn+'</span></span></button>';
      return;
    }
    var p=nd.p, isRoot=nd.n===view, nm=esc(p.name), gst=nd.guest, isRep=!!(nd.rep||p.ref);
    var cls='card'+(isRoot?' root':'')+(isRep?' refcard':'')+(gst?' guest':'')+(nd.famous?' famous':'')+(cz.route.has(nd.n)?' route':'')+(cz.anc.has(nd.n)?' hl':'');
    var av=gst?'':photoOf(nd.n);
    h+='<div class="'+cls+'" data-n="'+nd.n+'"'+(isRep?' tabindex="0" title="'+nm+' is also drawn elsewhere in the chart. Click to go to the full card."':'')+' style="left:'+xOf(nd.d)+'px;top:'+topOf(nd)+'px;--lc:'+lc(nd.n)+'">'+
      (av?'<img class="av" alt="" src="'+esc(av)+'">':'')+
      '<div class="who"><span class="nm" title="'+nm+'">'+nm+'</span><span class="yr"><i class="dot"></i>'+esc(gst&&!p.b&&!p.d?'—':years(p))+'</span></div>'+
      (p.wiki?'<a class="ico wiki" href="https://en.wikipedia.org/wiki/'+encodeURI(p.wiki)+'" target="_blank" rel="noopener noreferrer" aria-label="Open the Wikipedia article for '+nm+' in a new tab" title="Wikipedia article (opens in a new tab)"><span class="wglyph" aria-hidden="true">W</span></a>':'')+
      (isRoot||gst?'':'<a class="ico" href="#p'+(p.ref!=null&&P.has(p.ref)?p.ref:nd.n)+'" data-act="tree" aria-label="View the tree of '+nm+'" title="View '+nm+'’s tree">'+ICON_TREE+'</a>')+
      (editing&&!gst?'<button class="ico pen" type="button" data-act="edit" aria-label="Edit '+nm+'" title="Edit">'+ICON_PEN+'</button>':'')+
      (isRep?'':'<button class="ico" type="button" data-act="details" aria-expanded="false" aria-label="Details for '+nm+'" title="Details">'+ICON_CHEV+'</button>')+
      (nd.more?'<a class="beyond" href="#p'+nd.n+'" data-act="tree" aria-label="Ancestors of '+nm+' continue further back. View their tree." title="More ancestors further back">&#8250;</a>':'')+
      (!gst&&!isRoot&&dnaOf(nd.n)?'<span class="cdna" title="'+esc(dnaTip(dnaOf(nd.n)))+'" aria-label="'+esc(dnaTip(dnaOf(nd.n)))+'" role="img">'+ICON_DNA+'</span>':'')+
      (nd.famous?'<span class="cstar" title="Famous relative" aria-hidden="true">&#9733;</span>':(p.star?'<span class="cstar" title="'+esc(p.star)+'" aria-label="'+esc(p.star)+'">&#9733;</span>':''))+
    '</div>';
  });
  if(!rn.kids.length) h+='<p class="note" style="left:'+(xOf(0)+CW+GAP)+'px;top:'+(topOf(rn)+14)+'px">Parents not recorded yet.</p>';

  world.innerHTML=h;
  /* the DNA key is shown only when a card on the chart carries the DNA badge */
  var lgd=document.getElementById('lg-dna'); if(lgd) lgd.hidden=!world.querySelector('.card .cdna');
  world.style.width=ww+'px'; world.style.height=wh+'px';
  rootCy=cy(rn);
  var realCols=new Set(nodes.filter(function(x){return !x.hap}).map(function(x){return x.d}));
  buildHeads(maxD,function(c){return !realCols.has(c)});

  var rp=P.get(view), isHome=view===1;
  $('#kicker').textContent=isHome?'Pedigree chart':'Pedigree from the perspective of';
  $('#title').textContent=rp.name;
  $('#sub').innerHTML=isHome
    ? esc(years(rp))+(STATE.sample?' · <span class="samp">Sample tree</span>'+(READONLY?'':' Press Edit to make it your own.'):'')
    : esc(relAll(view))+' of '+esc(first())+' · '+esc(years(rp))+' · <a href="#p1" data-act="tree">Back to '+esc(first())+'’s tree</a>';
  var real=nodes.filter(function(x){return !x.guest&&!x.hap&&!x.add&&!x.rep}), nReal=real.length;
  var filled=real.reduce(function(m,x){return Math.max(m,x.d+1)},1);
  $('#status').textContent=nReal+(nReal===1?' person':' people')+' shown · '+filled+' of '+D+' generations filled';
  applyCousins();
  if(keep) setScale(scale,0,0); else fit();
}

/* ---------- zoom and pan ---------- */
function setScale(s,cx,cy){
  s=clamp(s,0.03,1.6);
  if(cx==null){cx=0;cy=0}
  var wx=(vp.scrollLeft+cx)/scale, wy=(vp.scrollTop+cy)/scale;
  scale=s;
  sizer.style.width=(ww*scale)+'px'; sizer.style.height=(wh*scale)+'px';
  world.style.transform='scale('+scale+')';
  vp.scrollLeft=wx*scale-cx; vp.scrollTop=wy*scale-cy;
  $('#zlabel').textContent=Math.round(scale*100)+'%';
  layoutHeads(); scrollHeads();
  placePop();
}
function fit(whole){
  var s=Math.min(vp.clientWidth/ww,vp.clientHeight/wh);
  if(whole!==true) s=Math.max(s,0.55);
  s=clamp(s,0.03,1);
  scale=s; setScale(s,0,0); vp.scrollLeft=0;
  vp.scrollTop=(whole===true)?0:Math.max(0,rootCy*scale-vp.clientHeight/2);
}
function zoomCenter(f){setScale(scale*f,vp.clientWidth/2,vp.clientHeight/2)}
$('#zin').addEventListener('click',function(){zoomCenter(1.25)});
$('#zout').addEventListener('click',function(){zoomCenter(0.8)});
$('#zlabel').addEventListener('click',function(){setScale(1,vp.clientWidth/2,vp.clientHeight/2)});
$('#fit').addEventListener('click',function(){fit(true)});
vp.addEventListener('wheel',function(e){
  if(!(e.ctrlKey||e.metaKey)) return;
  e.preventDefault();
  var r=vp.getBoundingClientRect();
  setScale(scale*Math.exp(-e.deltaY*0.0018),e.clientX-r.left,e.clientY-r.top);
},{passive:false});

var drag=null;
vp.addEventListener('pointerdown',function(e){
  if(e.pointerType!=='mouse'||e.button!==0) return;
  if(e.target.closest('.card,a,button')) return;
  drag={x:e.clientX,y:e.clientY,sl:vp.scrollLeft,st:vp.scrollTop};
  try{vp.setPointerCapture(e.pointerId)}catch(_){}
  vp.classList.add('drag');
});
vp.addEventListener('pointermove',function(e){
  if(!drag) return;
  vp.scrollLeft=drag.sl-(e.clientX-drag.x);
  vp.scrollTop=drag.st-(e.clientY-drag.y);
});
function endDrag(){drag=null;vp.classList.remove('drag')}
vp.addEventListener('pointerup',endDrag);
vp.addEventListener('pointercancel',endDrag);
var raf=0;
vp.addEventListener('scroll',function(){
  scrollHeads();
  if(openN==null||raf) return;
  raf=requestAnimationFrame(function(){raf=0;placePop()});
});
window.addEventListener('resize',function(){layoutHeads();scrollHeads();placePop()});


/* ---------- famous relatives ---------- */
var DRAWN=new Set(), czOn=false, czFocus=false, czSel=new Map(), ANC=new Map(), ANCPREV=new Map(), GUEST=new Map();
try{czOn=localStorage.getItem('pedigree-builder-cz')==='1'}catch(_){}
function ancSteps(root){
  var m=new Map([[root,0]]), pv=new Map(), q=[root];
  for(var i=0;i<q.length;i++){
    var n=q[i], st=m.get(n);
    [fa(n),mo(n)].forEach(function(a){ if(P.has(a)&&!m.has(a)){m.set(a,st+1);pv.set(a,n);q.push(a)} });
  }
  ANCPREV=pv; return m;
}
/* Ancestor ratio: the share of the root's ancestry that comes from one person. Each route from the root to that person
   contributes 1/2 for every generation it spans, and a person reached by several routes (pedigree collapse, including routes
   of different lengths) adds them up, e.g. 2/1024 reduces to 1/512. Repeat cards (ref) count as the person they repeat.
   Exact BigInt arithmetic over 2^64; computed once per root. */
var RATIO={root:null,w:null,c:null};
function canonOf(n){var p=P.get(n);return p&&p.ref!=null&&P.has(p.ref)?p.ref:n}
function ratioMaps(root){
  if(RATIO.root===root) return RATIO;
  var r0=canonOf(root), seen=new Set([r0]), q=[r0], par=new Map(), indeg=new Map([[r0,0]]);
  for(var i=0;i<q.length;i++){
    var x=q[i], ps=[];
    [fa(x),mo(x)].forEach(function(a){ if(P.has(a)){ var c=canonOf(a); ps.push(c);
      indeg.set(c,(indeg.get(c)||0)+1); if(!seen.has(c)){seen.add(c);q.push(c)} } });
    par.set(x,ps);
  }
  var w=new Map([[r0,1n<<64n]]), cnt=new Map([[r0,1n]]), ready=[r0];
  while(ready.length){
    var y=ready.pop();
    (par.get(y)||[]).forEach(function(c){
      w.set(c,(w.get(c)||0n)+(w.get(y)>>1n)); cnt.set(c,(cnt.get(c)||0n)+cnt.get(y));
      indeg.set(c,indeg.get(c)-1); if(indeg.get(c)===0) ready.push(c);
    });
  }
  RATIO={root:root,w:w,c:cnt}; return RATIO;
}
function ratioText(n){
  var R=ratioMaps(view), c=canonOf(n), W=R.w.get(c);
  if(W==null||c===canonOf(view)) return null;
  var tz=0n; while(((W>>tz)&1n)===0n) tz++;
  var num=W>>tz, den=1n<<(64n-tz);
  var pct=Number(W)/18446744073709551616*100;
  var out='<span class="mono">'+num+'/'+den+'</span>';
  var k=R.c.get(c);
  out+=' <span class="mute">('+(pct>=0.01?pct.toFixed(pct>=1?1:2):pct.toPrecision(2))+'%'+(k>1n?' · reached by '+k+' routes':'')+')</span>';
  return out;
}
function greatPre(g){return g<=0?'':g===1?'great-':ord(g)+' great-'}
function relLabel(g,k,half){
  var pre=half?'half-':'';
  if(g===0) return k===1?'son':k===2?'grandson':k===3?'great-grandson':ord(k-2)+' great-grandson';
  var m=Math.min(g,k), diff=Math.abs(g-k);
  if(m===1){
    if(g===k) return pre+'brother';
    if(k<g) return pre+greatPre(diff-1)+'uncle';
    return pre+(diff===1?'':diff===2?'grand-':diff===3?'great-grand-':ord(diff-2)+' great-grand-')+'nephew';
  }
  var s=(half?'half ':'')+ord(m-1)+' cousin';
  if(diff) s+=', '+(diff===1?'once':diff===2?'twice':diff+'×')+' removed';
  return s;
}
function ancLabel(g,male){
  if(g===1) return male?'father':'mother';
  if(g===2) return male?'grandfather':'grandmother';
  var b=male?'great-grandfather':'great-grandmother';
  return g===3?b:ord(g-2)+' '+b;
}
function famRels(f){
  var out=[];
  f.via.forEach(function(v){
    if(!ANC.has(v.anc)) return;
    allDepths(view,v.anc).forEach(function(g){
      if(v.k===0&&g===0) return;
      out.push({v:v,g:g,label:v.k===0?ancLabel(g,v.male):relLabel(g,v.k,v.half),rank:g+v.k+(v.half?0.5:0)});
    });
  });
  out.sort(function(a,b){return a.rank-b.rank});
  return out;
}
/* routes that can be drawn from the current root: the common ancestor is on screen and the famous person is not more recent than the root */
function routesOf(f){
  return famRels(f).filter(function(r){return r.g-r.v.k>=0&&(DRAWN.has(r.v.anc)||(r.v.sp&&DRAWN.has(r.v.sp)))});
}
function pathNames(v,f){return v.path.map(function(e,i){return i===v.path.length-1?f.name:(e[0]==='…'?'…':e[0])})}
function ancNames(v){return P.get(v.anc).name+(v.sp&&P.get(v.sp)?' & '+P.get(v.sp).name:'')}
function viaText(r,f){if(!r.v.path.length) return 'Direct ancestor';return 'via '+ancNames(r.v)+' → '+pathNames(r.v,f).join(' → ')+(r.v.note?' ('+r.v.note+')':'')}
function czPerson(){return view===1?first():P.get(view).name}
function czRows(n){
  var rows=[];
  FAMOUS.forEach(function(f){
    famRels(f).forEach(function(r){
      if(r.v.k===0||(r.v.anc!==n&&r.v.sp!==n)) return;
      rows.push('<p class="fam"><b>'+esc(f.name)+'</b> <span class="mute">'+esc(f.title)+'</span><br>'+
        esc(cap(r.label))+' of '+esc(czPerson())+'<br><span class="mute">'+esc(P.get(r.v.anc).name+' → '+pathNames(r.v,f).join(' → '))+'</span></p>');
    });
  });
  return rows.join('');
}
/* Guests: relatives drawn in the tree for the selected famous relatives. Each sits in its own generation column,
   joined by connectors to its parents, so the line of descent reads like part of the pedigree. */
/* Put a new node in its generation column as close to row py as possible. If that spot is taken, push the
   rows below it down just enough to make room (every column moves together, so the layout stays aligned). */
function insertRow(nodes,nd,py){
  var col=nodes.filter(function(x){return x.d===nd.d}).sort(function(a,b){return a.y-b.y});
  var prev=null, at=null;
  col.forEach(function(x){ if(x.y<=py+1e-6) prev=x; else if(!at) at=x; });
  var Y=py;
  if(prev&&py-prev.y<0.999) Y=prev.y+1;
  if(at&&at.y-Y<0.999){
    var sh=Y+1-at.y;
    nodes.forEach(function(x){ if(x.y>=at.y-1e-9) x.y+=sh; });
  }
  nd.y=Y; nodes.push(nd);
}
/* Haplogroup nodes: one after the last known person of the father line (Y-DNA) and of the mother line (mtDNA). */
function addHaplo(nodes,seen){
  HAPLO.forEach(function(h,i){
    var en=seen.get(h.end); if(!en) return;
    var nd={n:-(9001+i), d:en.d+1, hap:h, kids:[], p:{name:h.code}, color:'var(--'+(h.type==='y'?'hy':'hm')+')', cls:h.type==='y'?'hl-y':'hl-m'};
    /* choose the gap in the column where the new connector crosses the fewest others, then the nearest one */
    var col=nodes.filter(function(x){return x.d===nd.d}).sort(function(a,b){return a.y-b.y});
    var src=nodes.filter(function(x){return x.d===en.d&&x!==en});
    var bestS=null;
    for(var q=0;q<=col.length;q++){
      var pv=q?col[q-1]:null, at=q<col.length?col[q]:null;
      var yq=pv&&at?(pv.y+at.y)/2:pv?pv.y+1:at?Math.max(0,at.y-1):0, cr=0;
      src.forEach(function(x){ x.kids.forEach(function(k){
        var ik=col.indexOf(k); if(ik<0) return;
        var a=en.y<x.y?-1:1, b=q<=ik?-1:1; if(a!==b) cr++;
      }) });
      var cst=cr*1000+Math.abs(yq-en.y)*0.02;
      if(!bestS||cst<bestS.c-1e-9) bestS={c:cst,pv:pv,at:at};
    }
    var lo=bestS.pv?bestS.pv.y+1:0, hi=bestS.at?bestS.at.y-1:1e9;
    var Yh=lo<=hi?Math.max(lo,Math.min(hi,en.y)):lo;
    var sh=bestS.at&&bestS.at.y-Yh<1-1e-9?Yh+1-bestS.at.y:0;
    if(sh) nodes.forEach(function(x){ if(x.y>=bestS.at.y-1e-9) x.y+=sh });
    nd.y=Yh; nodes.push(nd);
    en.kids.push(nd);
  });
}
function addGuests(nodes,seen,view0,addEdge){
  GUEST.clear();
  var out={route:new Set(), anc:new Set()};
  if(!czOn) return out;
  var gk=new Map(), gid=0;
  /* Place a new line of relatives (ordered from the shared ancestor down to the famous person) in one go. Each relative
     may go into any gap of its generation column; the best set of gaps is found by dynamic programming so that the
     connectors from the shared ancestor down cross as few other connectors as possible (then stay short). */
  function placeChain(list){
    if(!list.length) return;
    var info=list.map(function(nd){
      var col=nodes.filter(function(x){return x.d===nd.d}).sort(function(a,b){return a.y-b.y});
      var ys=[]; for(var s=0;s<=col.length;s++){
        var pv=s?col[s-1]:null, at=s<col.length?col[s]:null;
        ys.push(pv&&at?(pv.y+at.y)/2:pv?pv.y+1:at?Math.max(0,at.y-1):0);
      }
      return {nd:nd,col:col,ys:ys};
    });
    /* connectors that already exist between a column and the next, as [row index in this column, kid] */
    var gapEdges=function(col){ var e=[]; col.forEach(function(u,iu){ u.kids.forEach(function(k){ e.push([iu,k]) }) }); return e };
    var link=function(i,s,t){
      /* cost of the connector(s) from list[i] (slot s) to its kid(s): list[i-1] (slot t) or the fixed kids */
      var a=info[i], nd=a.nd, cost=0, edges=gapEdges(a.col), prevInfo=i?info[i-1]:null, kidIdx=null;
      if(prevInfo){ kidIdx=new Map(); prevInfo.col.forEach(function(k,ik){kidIdx.set(k,ik)}); }
      nd.kids.forEach(function(K){
        var ky=prevInfo?prevInfo.ys[t]:K.y;
        edges.forEach(function(e){
          var k=e[1]; if(k===K) return;
          var og=s<=e[0]?-1:1, ok;
          if(prevInfo){ var ik=kidIdx.get(k); if(ik==null) return; ok=t<=ik?-1:1; }
          else ok=K.y<k.y?-1:K.y>k.y?1:0;
          if(ok&&og!==ok) cost+=1000;
        });
        cost+=Math.abs(a.ys[s]-ky)*0.02;
      });
      return cost;
    };
    var dp=[], back=[];
    info.forEach(function(a,i){
      dp[i]=[]; back[i]=[];
      for(var s=0;s<a.ys.length;s++){
        if(!i){ dp[0][s]=link(0,s,0); back[0][s]=-1; continue }
        var bt=0, bc=Infinity;
        for(var t=0;t<info[i-1].ys.length;t++){
          var c=dp[i-1][t]+link(i,s,t);
          if(c<bc-1e-9){bc=c;bt=t}
        }
        dp[i][s]=bc; back[i][s]=bt;
      }
    });
    var last=info.length-1, bs=0;
    dp[last].forEach(function(c,s){ if(c<dp[last][bs]-1e-9) bs=s });
    var pick=[]; for(var q=last,s=bs;q>=0;q--){ pick[q]=s; s=back[q][s] }
    info.forEach(function(a,i){
      var s=pick[i], nd=a.nd, pv=s?a.col[s-1]:null, at=s<a.col.length?a.col[s]:null;
      var want=nd.kids.reduce(function(z,k){return z+k.y},0)/nd.kids.length;
      var lo=pv?pv.y+1:0, hi=at?at.y-1:1e9;
      var Y=lo<=hi?Math.max(lo,Math.min(hi,want)):lo;
      var shift=at&&at.y-Y<1-1e-9?Y+1-at.y:0;
      if(shift) nodes.forEach(function(x){ if(x.y>=at.y-1e-9) x.y+=shift });
      nd.y=Y; nodes.push(nd);
    });
  }
  czSel.forEach(function(vi,name){
    var f=FAMOUS.filter(function(x){return x.name===name})[0]; if(!f) return;
    var ok=famRels(f).filter(function(r){return seen.has(r.v.anc)&&seen.get(r.v.anc).d-r.v.k>=0});
    if(!ok.length) return;
    var r=ok[Math.min(vi,ok.length-1)], A=seen.get(r.v.anc), sp=r.v.sp&&seen.get(r.v.sp);
    out.anc.add(r.v.anc); if(sp) out.anc.add(r.v.sp);
    var c=r.v.anc; out.route.add(c);
    while(c!==view0){var pc=ANCPREV.get(c); addEdge(pc+'>'+c); out.route.add(pc); c=pc}
    var key=String(r.v.anc), prev=null, pending=[];
    r.v.path.forEach(function(e,i){
      var j=i+1, last=(j===r.v.path.length);
      key+='|'+e[0];
      var nd=gk.get(key);
      if(!nd){
        nd={n:-(++gid), d:A.d-j, guest:true, j:j, g:r.g, half:!!r.v.half, to:[],
            kids:i===0?(sp?[A,sp]:[A]):[prev], p:{name:e[0]==='…'?'(name not recorded)':e[0], b:e[1], d:e[2]}};
        nd.via=(i===0?ancNames(r.v):'')+(i===0?' → ':'')+r.v.path.slice(0,j).map(function(x){return x[0]}).join(' → ');
        pending.push(nd); gk.set(key,nd); GUEST.set(nd.n,nd);
      }
      if(!last){ var f2=FAMOUS.filter(function(x){return x.name===e[0]})[0];
        if(f2){ nd.famous=f2; nd.p={name:f2.name,b:f2.b,d:f2.d,wiki:f2.wiki}; } }
      if(nd.to.indexOf(f.name)<0) nd.to.push(f.name);
      if(last){
        nd.famous=f; nd.p={name:f.name,b:f.b,d:f.d,wiki:f.wiki};
        nd.via=ancNames(r.v)+' → '+pathNames(r.v,f).join(' → ');
        nd.note=r.v.note||'';
      }
      nd.kids.forEach(function(k){addEdge(nd.n+'>'+k.n)});
      prev=nd;
    });
    placeChain(pending);
  });
  if(GUEST.size) untangle(nodes);
  return out;
}
/* Once every selected relative is placed, take each drawn relative in turn and try it in every gap of its column
   (making a new row where there is no room) and keep the spot where its connectors cross the fewest others, then
   the shortest connectors. Rows are only ever inserted or removed across the whole chart, so the cards that are
   not relatives never change their order; at the end any empty rows are closed. */
function untangle(nodes){
  var guests=nodes.filter(function(x){return x.guest});
  if(!guests.length) return;
  guests.sort(function(a,b){return b.d-a.d||a.y-b.y});
  for(var pass=0;pass<8;pass++){
    var moved=false;
    guests.forEach(function(g){
      var par=nodes.filter(function(x){return x.kids.indexOf(g)>=0});
      var nb=g.kids.concat(par);
      if(!nb.length) return;
      var others=nodes.filter(function(x){return x!==g});
      var col=others.filter(function(x){return x.d===g.d}).sort(function(a,b){return a.y-b.y});
      var colL=others.filter(function(x){return x.d===g.d-1});
      var want=nb.reduce(function(a,k){return a+k.y},0)/nb.length;
      var cost=function(Y,at,shift){
        var pos=function(x){return x===g?Y:(shift&&x.y>=at.y-1e-9?x.y+shift:x.y)};
        var pg=Y, cr=0, len=0;
        g.kids.forEach(function(k){
          len+=Math.abs(pos(k)-pg);
          col.forEach(function(x){ x.kids.forEach(function(k2){
            if(k2!==k&&(pg-pos(x))*(pos(k)-pos(k2))<-1e-9) cr++;
          }) });
        });
        par.forEach(function(pp){
          len+=Math.abs(pos(pp)-pg);
          colL.forEach(function(x){ if(x===pp) return; x.kids.forEach(function(k2){
            if(k2!==g&&(pos(pp)-pos(x))*(pg-pos(k2))<-1e-9) cr++;
          }) });
        });
        return cr*1000+len*0.02+Math.abs(Y-want)*0.01+shift*0.3;
      };
      /* where it sits now */
      var cur=null;
      for(var i=0;i<=col.length;i++){ var pv=i?col[i-1]:null, a=i<col.length?col[i]:null;
        if((!pv||pv.y<g.y-1e-9)&&(!a||a.y>g.y+1e-9)){ cur={i:i,Y:g.y,at:a,shift:0,cost:cost(g.y,a,0)}; break } }
      var best=cur;
      for(var j=0;j<=col.length;j++){
        var prv=j?col[j-1]:null, at=j<col.length?col[j]:null;
        var lo=prv?prv.y+1:0, hi=at?at.y-1:1e9;
        var Y=lo<=hi?Math.max(lo,Math.min(hi,want)):lo;
        var shift=at&&at.y-Y<1-1e-9?Y+1-at.y:0;
        var c=cost(Y,at,shift);
        if(!best||c<best.cost-1e-9) best={i:j,Y:Y,at:at,shift:shift,cost:c};
      }
      if(best&&cur&&best!==cur&&best.cost<cur.cost-1e-9){
        if(best.shift) others.forEach(function(x){ if(x.y>=best.at.y-1e-9) x.y+=best.shift });
        g.y=best.Y; moved=true;
      }
    });
    if(!moved) break;
  }
  /* close rows that nothing occupies any more */
  var ys=[]; nodes.forEach(function(x){ if(ys.every(function(v){return Math.abs(v-x.y)>1e-6})) ys.push(x.y) });
  ys.sort(function(a,b){return a-b});
  var cut=0, map=[];
  ys.forEach(function(v,i){ if(i&&v-ys[i-1]>1+1e-6) cut+=v-ys[i-1]-1; map.push(v-cut) });
  nodes.forEach(function(x){ x.y=map[ys.findIndex(function(v){return Math.abs(v-x.y)<1e-6})] });
  var top=Math.min.apply(null,nodes.map(function(x){return x.y}));
  if(top!==0) nodes.forEach(function(x){ x.y-=top });
}
function guestPop(n){
  var nd=GUEST.get(n); if(!nd) return '';
  var p=nd.p, f=nd.famous, rows=[];
  var add=function(k,v){rows.push('<dt>'+k+'</dt><dd>'+v+'</dd>')};
  var lab=relLabel(nd.g,nd.j,nd.half);
  add('Relation',esc(cap(lab))+' of '+esc(czPerson()));
  if(f) add('Title',esc(f.title));
  if(f&&f.b&&f.d) add('Lived','about '+(f.d-f.b)+' years');
  add('Descent','<span class="mute">'+esc(nd.via)+'</span>');
  if(nd.note) add('Note',esc('Shared line runs '+nd.note+'.'));
  if(!f) add('Leads to',esc(nd.to.join(', ')));
  if(f&&f.wiki) add('Wikipedia','<a href="https://en.wikipedia.org/wiki/'+encodeURI(f.wiki)+'" target="_blank" rel="noopener noreferrer">'+esc(f.wiki.replace(/_/g,' '))+' ↗</a>');
  return '<h2>'+esc(p.name)+'</h2><p class="life">'+esc(p.b||p.d?years(p):'Dates not shown')+'</p>'+
    '<dl>'+rows.join('')+'</dl>'+
    '<p class="hint">Shown for reference. This relative is not part of the direct pedigree.</p>'+
    '<div class="actions"><button class="btn" type="button" data-act="close">Close</button></div>';
}
function applyCousins(){
  var panel=$('#czp'), btn=$('#cz');
  btn.setAttribute('aria-pressed',czOn?'true':'false');
  document.body.classList.toggle('cz-on',czOn);
  if(!czOn){panel.hidden=true;panel.innerHTML='';return}
  var shown=[], further=0;
  FAMOUS.forEach(function(f){
    var rels=famRels(f); if(!rels.length) return;
    var drawn=rels.filter(function(r){return DRAWN.has(r.v.anc)||(r.v.sp&&DRAWN.has(r.v.sp))});
    if(!drawn.length){further++;return}
    shown.push({f:f,rels:rels,routes:routesOf(f)});
  });
  var h='<h2>Famous relatives of '+esc(czPerson())+' · '+shown.length+(further?' · '+further+' more further back (raise Generations)':'')+'</h2>'+
    '<p class="czbar"><button class="btn" type="button" data-czfocus aria-pressed="'+(czFocus&&czSel.size?'true':'false')+'"'+(czSel.size?'':' disabled')+
    ' title="'+(czSel.size?'Show only the selected routes':'Select a famous relative first')+'">Hide other lines</button>'+
    '<span class="t2">'+(czSel.size?'Keeps only the cards on the selected routes.':'Select a famous relative to use this.')+'</span></p>';
  if(!shown.length) h+='<p class="t2" style="margin:4px">No famous relatives are recorded for the ancestors shown in this view.</p>';
  else{
    h+='<ul class="czl">';
    shown.forEach(function(x){
      var f=x.f, can=x.routes.length>0, sel=czSel.has(f.name);
      var vi=sel?Math.min(czSel.get(f.name),x.routes.length-1):0, r=can?x.routes[vi]:x.rels[0];
      var others=x.rels.filter(function(e){return e!==r}).map(function(e){return e.label}).filter(function(l,i,a){return a.indexOf(l)===i&&l!==r.label}).join('; ');
      h+='<li><button class="czi" type="button" data-cz="'+esc(f.name)+'" aria-pressed="'+(sel?'true':'false')+'"'+(can?'':' aria-disabled="true"')+'>'+
        '<span class="n2">'+(sel?'<span class="sdot" aria-hidden="true">&#9733;</span> ':'')+esc(f.name)+'</span> <span class="t2">'+esc(f.title)+(f.b?' · '+f.b+'–'+(f.d||'Living'):'')+'</span>'+
        '<span class="r2">'+esc(cap(r.label))+(others?' <span class="t2">· also '+esc(others)+'</span>':'')+'</span>'+
        '<span class="v2">'+esc(viaText(r,f))+'</span>'+
        '<span class="v2">'+(can?(sel?(x.routes.length>1?'Showing route '+(vi+1)+' of '+x.routes.length+' in the tree · click for the next, then to hide':'Shown in the tree · click to hide'):'Click to show in the tree'):'Not drawable from this person’s tree (they are more recent than the root)')+'</span></button>'+
        (f.wiki?'<a class="ico czw" href="https://en.wikipedia.org/wiki/'+encodeURI(f.wiki)+'" target="_blank" rel="noopener noreferrer" aria-label="Open the Wikipedia article for '+esc(f.name)+' in a new tab" title="Wikipedia article (opens in a new tab)"><span class="wglyph" aria-hidden="true">W</span></a>':'')+'</li>';
    });
    h+='</ul>';
  }
  panel.innerHTML=h; panel.hidden=false;
}
function centerOn(cards){
  cards=cards.filter(Boolean); if(!cards.length) return;
  var v=vp.getBoundingClientRect(), l=1e9,t=1e9,r=-1e9,b=-1e9;
  cards.forEach(function(c){var q=c.getBoundingClientRect(); l=Math.min(l,q.left);t=Math.min(t,q.top);r=Math.max(r,q.right);b=Math.max(b,q.bottom)});
  vp.scrollLeft+=((l+r)/2)-(v.left+v.width/2);
  vp.scrollTop+=((t+b)/2)-(v.top+v.height/2);
}
$('#cz').addEventListener('click',function(){
  czOn=!czOn; czSel.clear();
  try{localStorage.setItem('pedigree-builder-cz',czOn?'1':'0')}catch(_){}
  render(true);
});
$('#czp').addEventListener('click',function(e){
  var fb=e.target.closest('[data-czfocus]');
  if(fb){ if(czSel.size){ czFocus=!czFocus; render(true); fit(); } return; }
  var b=e.target.closest('[data-cz]'); if(!b||b.getAttribute('aria-disabled')==='true') return;
  var nm=b.getAttribute('data-cz'), f=FAMOUS.filter(function(x){return x.name===nm})[0]; if(!f) return;
  var cur=czSel.get(nm), nr=routesOf(f).length;
  if(cur==null) czSel.set(nm,0); else if(cur+1<nr) czSel.set(nm,cur+1); else czSel.delete(nm);
  render(true);
  if(czSel.has(nm)){
    var cards=[];
    GUEST.forEach(function(nd){if(nd.famous===f) cards.push(cardEl(nd.n))});
    var r=routesOf(f)[Math.min(czSel.get(nm),nr-1)];
    if(r) cards.push(cardEl(r.v.anc));
    centerOn(cards);
    try{stage.scrollIntoView({block:'nearest'})}catch(_){}
  }
  var again=[].filter.call($('#czp').querySelectorAll('[data-cz]'),function(x){return x.getAttribute('data-cz')===nm})[0];
  if(again) try{again.focus({preventScroll:true})}catch(_){}
});

/* ---------- details popover ---------- */
/* Length of life. With full birth and death dates: "75 years, 9 months, 6 days". With months but no days: "about 75 years, 9 months".
   Otherwise, or when either date is approximate: "about 75 years". */
function lifespanText(p){
  if(!p.b||!p.d||p.l) return '';
  var pl=function(n,w){ return n+' '+w+(n===1?'':'s') };
  if(p.bq||p.dq||!p.bm||!p.dm) return 'about '+pl(p.d-p.b,'year');
  var exact=!!(p.bdy&&p.ddy), months=(p.d-p.b)*12+(p.dm-p.bm), d=0;
  if(exact){
    /* whole months from the birth date (a 31st falls back to the month's last day), then the days left over */
    if(p.ddy<p.bdy) months--;
    var dim=function(y2,m2){ return new Date(Date.UTC(y2,m2,0)).getUTCDate() };
    var ay=p.b+Math.floor((p.bm-1+months)/12), am=((p.bm-1+months)%12+12)%12+1;
    var anchor=Date.UTC(ay,am-1,Math.min(p.bdy,dim(ay,am)));
    d=Math.round((Date.UTC(p.d,p.dm-1,p.ddy)-anchor)/864e5);
  }
  if(months<0||d<0) return '';
  var y=Math.floor(months/12), m=months%12;
  var parts=[]; if(y) parts.push(pl(y,'year')); if(m) parts.push(pl(m,'month')); if(exact&&d) parts.push(pl(d,'day'));
  if(!parts.length) parts.push(exact?'less than a day':'less than a month');
  return (exact?'':'about ')+parts.join(', ');
}
function popHTML(n){
  if(n<0) return guestPop(n);
  var p=P.get(n), d=dep(n), rows=[];
  var add=function(k,v){rows.push('<dt>'+k+'</dt><dd>'+v+'</dd>')};
  var link=function(m){return '<a href="#p'+m+'" data-act="tree">'+esc(P.get(m).name)+'</a>'};
  var srcs=p.src||[];
  var cite=function(f){ var ix=[]; srcs.forEach(function(s,i){ if(s.f===f) ix.push(i+1) }); return ix.length?'<sup class="cite" title="Sources '+ix.join(', ')+'">'+ix.join(',')+'</sup>':'' };
  add('Relation', n===1?'Self':esc(relAll(n))+' of '+esc(first()));
  var rt=ratioText(n); if(rt) add('Ancestor ratio',rt);
  add('Sex',esc(SEXW[sexOf(n)]));
  if(p.bname&&p.bname!==p.name) add('Birth name',esc(p.bname)+cite('name'));
  if(p.mln) add('Married name',esc(p.mln));
  var lv=lifespanText(p); if(lv) add('Lived',esc(lv));
  var bdt=birthDate(p); if(bdt) add('Born',esc(bdt)+cite('birth'));
  if(!p.l&&p.d) add('Died',esc(fullDate(p,'d'))+cite('death'));
  if(p.bp) add('Born in',esc(p.bp));
  if(p.dp) add('Died in',esc(p.dp));
  if(p.occ) add('Occupation',esc(p.occ)+cite('occ'));
  (p.ev||[]).slice().sort(function(a,b){return (a.y||9999)-(b.y||9999)}).forEach(function(e){
    add(esc(EVT[e.t]||'Event'),'<span class="ev">'+[e.date?'<b>'+esc(e.date)+'</b>':'',esc(e.pl||''),esc(e.tx||'')].filter(Boolean).join(' · ')+'</span>'+cite(e.t==='marr'?'marr':'events'));
  });
  var inTree=KIDS.get(n)||[];
  if(p.spouse) add('Spouse',esc(p.spouse));
  else if(inTree.length){
    var c0=inTree[0], pp=(fa(c0)===n?mo(c0):fa(c0));
    if(P.has(pp)) add('Spouse or partner',link(pp));
  }
  var key=function(s){var t=s.trim().split(/\s+/);return t[0]+'|'+t[t.length-1]};
  var kidRows=[], used={};
  (p.children||[]).forEach(function(c){
    var hit=inTree.filter(function(x){return key(P.get(x).name)===key(c)})[0];
    if(hit){used[hit]=1;kidRows.push(link(hit))}else kidRows.push(esc(c));
  });
  inTree.forEach(function(x){if(!used[x]) kidRows.push(link(x))});
  if(kidRows.length) add(kidRows.length>1?'Children':'Child',kidRows.join('<br>'));
  var fN=fa(n), mN=mo(n), f=P.has(fN), m=P.has(mN);
  if(f||m) add('Parents',[f?link(fN):'',m?link(mN):''].filter(Boolean).join('<br>')+cite('parents'));
  else add('Parents','<span class="mute">Not recorded yet</span>');
  var g=lineOf(n);
  if(g) add('Line','<i class="dot" style="--lc:var(--l'+g+')"></i> '+esc(lineLabel(g))+' line');
  if(p.wiki) add('Wikipedia','<a href="https://en.wikipedia.org/wiki/'+encodeURI(p.wiki)+'" target="_blank" rel="noopener noreferrer">'+esc(p.wiki.replace(/_/g,' '))+' ↗</a>');
  HAPLO.forEach(function(h){
    if(h.members.has(n)) add(h.title,'<a class="hg" href="'+esc(h.url)+'" target="_blank" rel="noopener noreferrer">'+esc(h.code)+' ↗</a> <span class="mute">('+esc(h.line)+')'+(h.to!=null&&P.has(h.end)?' · evidence reaches up to '+esc(P.get(h.end).name):'')+'</span>');
  });
  var dn=n===view?null:dnaOf(n);
  if(dn) add('DNA confirmed',dn.map(function(g){return '<b>'+esc(g.title)+'</b> <span class="mute">'+esc(g.src)+'</span>'}).join('<br>'));
  if(p.star) add('Notable','★ '+esc(p.star));
  if(czOn){var fr=czRows(n); if(fr) add('Famous relatives',fr)}
  add('Ahnentafel no.','<span class="mono">'+n+'</span>');
  if(p.notes) add('Notes',esc(p.notes));
  if(srcs.length) add('Sources','<ol class="srcs">'+srcs.map(function(s){
    var fl=(FACTS.filter(function(x){return x[0]===s.f})[0]||['','Whole record'])[1];
    var u=safeUrl(s.url);
    return '<li>'+(u?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(s.ti||u)+' ↗</a>':esc(s.ti))+' <span class="mute">('+esc(fl)+')</span></li>';
  }).join('')+'</ol>');
  var none=!(p.bp||p.dp||p.occ||p.notes||srcs.length);
  var ph=photoOf(n);
  return (ph?'<img class="pph" alt="Photo of '+esc(p.name)+'" src="'+esc(ph)+'">':'')+'<h2>'+esc(p.name)+cite('name')+'</h2><p class="life">'+esc(years(p))+'</p>'+
    '<dl>'+rows.join('')+'</dl>'+
    (none?'<p class="hint">Birthplace, occupation, notes and sources are not recorded yet.'+(READONLY?'':' Use Edit to add them.')+'</p>':'')+
    '<div class="actions">'+
      (n!==view?'<a class="btn primary" href="#p'+n+'" data-act="tree">View this person’s tree</a>':'')+
      (READONLY?'':'<button class="btn" type="button" data-act="edit" data-n="'+n+'">Edit</button>')+
      '<button class="btn" type="button" data-act="close">Close</button>'+
    '</div>';
}
function cardEl(n){return world.querySelector('.card[data-n="'+n+'"]:not(.refcard)')||world.querySelector('.card[data-n="'+n+'"]')}
function ensureVisible(card){
  var v=vp.getBoundingClientRect(), r=card.getBoundingClientRect(), pad=12;
  if(r.left<v.left+pad) vp.scrollLeft-=(v.left+pad-r.left);
  else if(r.right>v.right-pad) vp.scrollLeft+=(r.right-(v.right-pad));
  if(r.top<v.top+pad) vp.scrollTop-=(v.top+pad-r.top);
  else if(r.bottom>v.bottom-pad) vp.scrollTop+=(r.bottom-(v.bottom-pad));
}
function openDetails(n){
  if(openN===n){closeDetails();return}
  closeDetails(true);
  var card=cardEl(n); if(!card) return;
  openN=n; card.classList.add('open');
  card.querySelector('[data-act="details"]').setAttribute('aria-expanded','true');
  pop.innerHTML=popHTML(n); pop.hidden=false;
  if(!narrow.matches) ensureVisible(card);
  placePop();
  try{pop.focus({preventScroll:true})}catch(_){}
}
function closeDetails(quiet){
  if(openN==null) return;
  var card=cardEl(openN);
  if(card){
    card.classList.remove('open');
    var b=card.querySelector('[data-act="details"]');
    b.setAttribute('aria-expanded','false');
    if(!quiet){try{b.focus({preventScroll:true})}catch(_){}}
  }
  openN=null; pop.hidden=true; pop.innerHTML='';
}
function placePop(){
  if(openN==null) return;
  var card=cardEl(openN); if(!card){closeDetails(true);return}
  if(narrow.matches){pop.style.left='';pop.style.top='';return}
  var s=stage.getBoundingClientRect(), r=card.getBoundingClientRect();
  var pw=pop.offsetWidth, ph=pop.offsetHeight;
  var left=clamp(r.left-s.left,8,Math.max(8,s.width-pw-8));
  var top=r.bottom-s.top+6;
  if(top+ph>s.height-8) top=r.top-s.top-ph-6;
  top=clamp(top,8,Math.max(8,s.height-ph-8));
  pop.style.left=left+'px'; pop.style.top=top+'px';
}

/* ---------- navigation (perspective) ---------- */
function readHash(){var m=/^#p(\d+)$/.exec(location.hash);var n=m?+m[1]:1;if(!P.has(n)) return 1;var q=P.get(n);return q.ref!=null&&P.has(q.ref)?q.ref:n}
function setView(n){
  if(!P.has(n)) n=1;
  if(n===view&&world.firstChild) return;
  view=n; render();
}
function go(n){
  if(!P.has(n)) return;
  var q=P.get(n); if(q.ref!=null&&P.has(q.ref)) n=q.ref;
  try{history.pushState(null,'','#p'+n)}catch(_){ try{location.hash='p'+n}catch(__){} }
  setView(n);
}
window.addEventListener('hashchange',function(){setView(readHash())});
window.addEventListener('popstate',function(){setView(readHash())});

/* Repeat cards: clicking one highlights the card of the same person where they are drawn in full. */
var refTimer=0;
function clearRefHl(){ world.querySelectorAll('.card.refhl').forEach(function(c){c.classList.remove('refhl')}) }
function showRef(card){
  var n=+card.getAttribute('data-n'), p=P.get(n), o=p&&cardEl(p.ref!=null?p.ref:n);
  clearRefHl(); clearTimeout(refTimer);
  if(!o) return;
  o.classList.add('refhl'); centerOn([o]);
  refTimer=setTimeout(clearRefHl,6000);
}
document.addEventListener('click',function(e){
  var c=e.target.closest('.card.refcard');
  if(!c){ clearRefHl(); return; }
  if(e.target.closest('a,button')) return;
  showRef(c);
});
world.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ') return;
  var c=e.target.closest&&e.target.closest('.card.refcard');
  if(c&&e.target===c){ e.preventDefault(); showRef(c); }
});
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-act]'); if(!t) return;
  var act=t.getAttribute('data-act');
  if(act==='tree'){
    e.preventDefault();
    var m=/#p(\d+)/.exec(t.getAttribute('href')||'');
    if(m) go(+m[1]);
  }else if(act==='details'){
    var card=t.closest('.card'); if(card) openDetails(+card.getAttribute('data-n'));
  }else if(act==='close'){
    closeDetails();
  }else if(act==='edit'){
    e.preventDefault();
    var cd=t.closest('.card'), en=cd?+cd.getAttribute('data-n'):+t.getAttribute('data-n'), ep=P.get(en);
    if(ep&&ep.ref!=null&&P.has(ep.ref)) refSheet(en);
    else if(P.has(en)){ curN=en; editPerson(en,false); }
  }else if(act==='add'){
    editPerson(+t.getAttribute('data-n'),true,+t.getAttribute('data-child'));
  }
});
document.addEventListener('pointerdown',function(e){
  if(openN==null) return;
  if(pop.contains(e.target)||e.target.closest('[data-act="details"]')) return;
  closeDetails(true);
});
document.addEventListener('keydown',function(e){if(e.key!=='Escape') return; if(!sheet.hidden) closeSheet(); else closeDetails()});
