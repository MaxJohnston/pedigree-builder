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
    var c=getComputedStyle(pth), st=c.stroke&&c.stroke!=='none'?c.stroke:rule, da=c.strokeDasharray&&c.strokeDasharray!=='none'?c.strokeDasharray:'';
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
