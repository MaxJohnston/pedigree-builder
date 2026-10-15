/* Pedigree Builder · js/picture.js
   Saving the chart as a PNG or SVG picture.
   All files share one global scope and must load in the order listed in index.html. */
'use strict';

/* ---------- save the chart as a picture ---------- */
function chartSVG(){
  var cs=getComputedStyle(document.documentElement);
  var tok=function(v,fb){ return (cs.getPropertyValue(v)||'').trim()||fb };
  var bg=tok('--surface','#F9FBFA'), fg=tok('--fg','#15201D'), mu=tok('--muted','#566664'), rule=tok('--rule','#AEBCB8'), band=tok('--band','#F0F4F3'), star=tok('--star','#6B46B4'), dnac=tok('--dna','#0B7A75');
  var HEAD=64, W=ww, H=wh+HEAD+20;
  var x=function(t){ return esc(t) };
  var o='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  o+='<rect width="'+W+'" height="'+H+'" fill="'+bg+'"/>';
  o+='<text x="24" y="34" font-family="Newsreader, Georgia, serif" font-size="24" fill="'+fg+'">'+x($('#title').textContent)+'</text>';
  o+='<text x="24" y="54" font-family="IBM Plex Sans, Arial, sans-serif" font-size="12" fill="'+mu+'">'+x($('#kicker').textContent+' · '+$('#status').textContent)+'</text>';
  o+='<g transform="translate(0,'+HEAD+')">';
  world.querySelectorAll('.band').forEach(function(b){ o+='<rect x="'+parseFloat(b.style.left)+'" y="0" width="'+parseFloat(b.style.width)+'" height="'+wh+'" fill="'+band+'"/>' });
  world.querySelectorAll('svg.lines path').forEach(function(pth){
    var c=getComputedStyle(pth), st=c.stroke&&c.stroke!=='none'?plainColor(c.stroke):rule, da=c.strokeDasharray&&c.strokeDasharray!=='none'?c.strokeDasharray:'';
    o+='<path d="'+pth.getAttribute('d')+'" fill="none" stroke="'+st+'" stroke-width="'+(pth.classList.contains('cz')?2.5:1.5)+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';
  });
  var clip=0;
  world.querySelectorAll('.card').forEach(function(c){
    if(c.classList.contains('add')) return;
    var L=parseFloat(c.style.left), T=parseFloat(c.style.top), root=c.classList.contains('root'), hap=c.classList.contains('hap');
    var cc=getComputedStyle(c), stroke=cc.borderTopColor||rule;
    var fill=root?fg:bg, tfill=root?bg:fg, mfill=root?bg:mu;
    o+='<rect x="'+L+'" y="'+T+'" width="'+CW+'" height="'+CH+'" rx="'+(hap?24:6)+'" fill="'+fill+'" stroke="'+stroke+'"'+(c.classList.contains('refcard')||c.classList.contains('guest')?' stroke-dasharray="4 3"':'')+'/>';
    var tx=L+11, im=c.querySelector('img.av');
    if(im&&im.getAttribute('src')){ clip++; o+='<clipPath id="cp'+clip+'"><circle cx="'+(L+23)+'" cy="'+(T+CH/2)+'" r="17"/></clipPath><image x="'+(L+6)+'" y="'+(T+CH/2-17)+'" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp'+clip+')" href="'+esc(im.getAttribute('src'))+'" xlink:href="'+esc(im.getAttribute('src'))+'"/>'; tx=L+48 }
    if(hap){ var g=c.querySelector('.hglyph'); o+='<circle cx="'+(L+24)+'" cy="'+(T+CH/2)+'" r="15" fill="'+getComputedStyle(g).backgroundColor+'"/><text x="'+(L+24)+'" y="'+(T+CH/2+4)+'" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="'+bg+'">'+x(g.textContent)+'</text>'; tx=L+46 }
    var nm=(c.querySelector('.nm')||{}).textContent||'', yr=(c.querySelector('.yr')||{}).textContent||'';
    var maxc=Math.floor((CW-(tx-L)-50)/7.2); if(nm.length>maxc) nm=nm.slice(0,maxc-1)+'…';
    o+='<text x="'+tx+'" y="'+(T+21)+'" font-family="'+(hap?'IBM Plex Mono, monospace':'Newsreader, Georgia, serif')+'" font-size="'+(hap?14:15)+'" fill="'+tfill+'">'+x(nm)+'</text>';
    o+='<text x="'+tx+'" y="'+(T+37)+'" font-family="IBM Plex Mono, monospace" font-size="11" fill="'+mfill+'">'+x(yr)+'</text>';
    if(c.querySelector('.cdna')) o+='<circle cx="'+(L+CW)+'" cy="'+T+'" r="9" fill="'+dnac+'" stroke="'+bg+'" stroke-width="1.5"/><text x="'+(L+CW)+'" y="'+(T+2.5)+'" text-anchor="middle" font-size="6.5" fill="'+bg+'" font-family="IBM Plex Sans, Arial, sans-serif">DNA</text>';
    if(c.querySelector('.cstar')) o+='<circle cx="'+L+'" cy="'+T+'" r="9" fill="'+star+'" stroke="'+bg+'" stroke-width="1.5"/><text x="'+L+'" y="'+(T+4)+'" text-anchor="middle" font-size="11" fill="'+bg+'">★</text>';
  });
  o+='</g></svg>';
  return {svg:o,w:W,h:H};
}
function svgToPng(sv){
  return new Promise(function(res,rej){
    var sc=Math.min(2,Math.sqrt(64e6/(sv.w*sv.h)),16000/sv.w,16000/sv.h);
    if(sc<0.25) return rej(new Error('too-big'));
    var url=URL.createObjectURL(new Blob([sv.svg],{type:'image/svg+xml'})), img=new Image();
    img.onload=function(){
      try{
        var c=document.createElement('canvas'); c.width=Math.round(sv.w*sc); c.height=Math.round(sv.h*sc);
        var g=c.getContext('2d'); g.scale(sc,sc); g.drawImage(img,0,0); URL.revokeObjectURL(url);
        c.toBlob(function(b){ b?res(b):rej(new Error('png')) },'image/png');
      }catch(e){ URL.revokeObjectURL(url); rej(e) }
    };
    img.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('img')) };
    img.src=url;
  });
}
/* Modern colour syntax (oklch, color(srgb …)) as plain rgb(), read back from a 1-pixel canvas, so saved SVG files open in any program. */
var PCOL={};
function plainColor(c){
  if(/^(#|rgb)/i.test(c)) return c; if(PCOL[c]) return PCOL[c];
  try{ var cv=document.createElement('canvas'); cv.width=cv.height=1; var g=cv.getContext('2d'); g.fillStyle='#000'; g.fillStyle=c; g.fillRect(0,0,1,1);
    var d=g.getImageData(0,0,1,1).data; return PCOL[c]='rgb('+d[0]+','+d[1]+','+d[2]+')' }catch(_){ return c }
}
function savePicture(kind){
  closeMenus();
  var sv; try{ sv=chartSVG() }catch(e){ toast('The picture could not be made: '+e.message); return }
  var name=fileStem()+(view!==1?'-'+String(P.get(view).bname||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'):'')+'.'+kind;
  toast('Preparing the picture…');
  var go=kind==='svg'?Promise.resolve(new Blob([sv.svg],{type:'image/svg+xml'})):svgToPng(sv);
  go.then(function(blob){ return saveFile(name,blob,kind==='svg'?'image/svg+xml':'image/png') })
    .then(function(r){ toast(saveMsg(r,'picture')) },function(e){ toast(e&&e.message==='too-big'?'This chart is too large for a PNG. Save it as SVG instead, or lower Generations.':'The PNG could not be made in this browser. Try SVG instead.') });
}
document.querySelectorAll('[data-pic]').forEach(function(b){ b.addEventListener('click',function(){ savePicture(b.getAttribute('data-pic')) }) });

/* Read-only copy: the whole app (styles, scripts and this tree) in one HTML file that opens in any browser, with
   edit mode switched off. It is built from this page's own source, so it always matches this version. */
function pageSources(){
  var els=[].slice.call(document.querySelectorAll('style[data-pb],link[data-pb],script[data-pb]'));
  return Promise.all(els.map(function(el){
    var css=el.tagName!=='SCRIPT', src=el.getAttribute(el.tagName==='LINK'?'href':'src');
    if(!src) return {css:css,text:el.textContent};
    return fetch(src).then(function(r){ if(!r.ok) throw new Error('fetch'); return r.text() }).then(function(t){ return {css:css,text:t} });
  }));
}
function saveReadOnly(){
  closeMenus();
  pageSources().then(function(parts){
    var st=clone(STATE); delete st.handled; delete st.shareOn;
    var data={state:st, depth:depth, view:view, made:new Date().toISOString().slice(0,10)};
    var safe=function(s){ return s.replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029') };
    var head=['<meta charset="utf-8">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<title>'+esc((P.get(1)||{}).name||'Family tree')+' · Family tree</title>'];
    document.querySelectorAll('link[rel="icon"],link[rel="stylesheet"][href^="https://fonts."]').forEach(function(l){ head.push(l.outerHTML) });
    var css='', js='';
    /* A read-only page has no use for edit mode, the forms, undo, saving, file import and export or the sample trees:
       everything marked as edit-only in the source is left out, and so are the edit-only parts of the page. */
    var cut=function(t){ return t.replace(/\/\*\{edit\*\/[\s\S]*?\/\*\}edit\*\/\n?/g,'') };
    parts.forEach(function(p){
      var t=cut(p.text); if(!t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/'use strict';/g,'').trim()) return;
      if(p.css) css+='<style data-pb>\n'+t.replace(/<\/(style)/gi,'<\\/$1')+'\n</style>\n';
      else js+='<script data-pb>\n'+t.replace(/<\/(script)/gi,'<\\/$1')+'\n<\/script>\n';
    });
    var tpl=document.createElement('template'); tpl.innerHTML=PB_BODY;
    tpl.content.querySelectorAll('[data-edit]').forEach(function(el){ el.remove() });
    var body=tpl.innerHTML.replace(/\n{3,}/g,'\n\n');
    var html='<!doctype html>\n<html lang="en">\n<head>\n'+head.join('\n')+'\n'+css+'</head>\n<body>\n'+body+'\n'+
      '<script>var PB_EXPORT='+safe(JSON.stringify(data))+';<\/script>\n'+js+'</body>\n</html>\n';
    return saveFile(fileStem()+'-read-only.html',new Blob([html],{type:'text/html'}),'text/html').then(function(r){ toast(saveMsg(r,'page')) });
  },function(){
    toast('This copy of Pedigree Builder cannot read its own files, so it cannot save a read-only page. Use the single-file version (pedigree-builder.html), or open the page from a web server.');
  });
}
document.querySelectorAll('[data-ro]').forEach(function(b){ b.addEventListener('click',saveReadOnly) });
