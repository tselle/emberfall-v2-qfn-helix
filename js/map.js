/* Emberfall — js/map.js
 * GameMap.paint/openFull/hover. The big survey map (M key or corner-map
 * click): explored space only, colored service doors, stairs, gates,
 * locked/ordinary doors, party arrow, unopened chest marks, red foe
 * diamonds, found-trap crosses, pink ground loot, place labels placed
 * with collision avoidance, a legend, and hover naming of squares.
 * Hidden encounters, un-sighted treasure and unfound traps are never
 * disclosed — not by marks, labels or hover. */
'use strict';
var GameMap=(function(){
var S=null;   /* last paint state, for hover repaints */
function gsave(){return (typeof G!=='undefined'&&G)||null;}   /* the live save state, if any */

function pal(c,seen,x,y,out){
  if(c==='#'||c==='H'||c==='B')return '#3a3f52';
  if(c==='^')return '#4a4f5e';
  if(c==='~')return '#2a4a66';
  if(c==='T')return '#25402a';
  if(c==='n')return '#3d3b2c';
  if(c==='%')return '#2b3b33';
  if(c==='='||c==='+')return '#4a4436';
  if(c==='G')return '#c8502c';
  if(c==='D')return '#8a6a40';
  if(c==='L')return '#a34a2a';
  if(c==='<'||c==='>')return '#4a7fb0';
  if(/[1-9]/.test(c))return '#b98a4a';
  if(/^[A-Z]$/.test(c))return '#c8a03c';
  return out?'#2c3527':'#232631';
}

/* ================= painting ================= */
function paint(cv,st){
  var g=cv.getContext('2d'),prep=st.prep,seen=st.seen;
  var W=prep.w,H=prep.h,cw=cv.width,ch=cv.height;
  var legendH=70,infoH=54;
  var s=Math.min((cw-40)/W,(ch-legendH-infoH-30)/H);
  var ox=(cw-W*s)/2,oy=infoH+10;
  st.s=s;st.ox=ox;st.oy=oy;
  g.fillStyle='#0b0c11';g.fillRect(0,0,cw,ch);
  function known(x,y){return !seen||!seen[y]||!seen[y][x]==='1'?false:true;}
  /* known terrain */
  var labels=[];   /* occupied label rects for collision */
  var box=[];      /* marker rects: keep clear of glyphs */
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){
    if(!known(x,y)){continue;}
    var c=prep.char[y*W+x];
    var col=pal(c,!!(st.def.outdoor||st.def.safe||st.def.overland),x,y,known);
    g.fillStyle=col;g.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));
    if(c==='T'||c==='n'||c==='^'){   // light interior texture
      g.fillStyle='rgba(255,255,255,.05)';g.fillRect(ox+x*s+s*.2,oy+y*s+s*.2,s*.6,s*.6);
    }
    if(/[1-9]/.test(c)){
      g.fillStyle='#12131a';g.fillRect(ox+x*s+s*.18,oy+y*s+s*.18,s*.64,s*.64);
      g.fillStyle='#e3b54a';g.font='bold '+Math.round(s*.5)+'px Georgia';g.textAlign='center';
      g.fillText(c,ox+x*s+s/2,oy+y*s+s*.72);g.textAlign='left';
      box.push([ox+x*s,oy+y*s,s,s]);
    }else if(c==='<'||c==='>'||c==='G'||c==='D'||c==='L'||/^[A-Z]$/.test(c)){
      box.push([ox+x*s,oy+y*s,s,s]);
    }
  }
  /* found-trap crosses */
  Object.keys((gsave()&&gsave().flags)||{}).forEach(function(f){
    var m=/^trapseen:([^:]+):(\d+),(\d+)$/.exec(f);
    if(!m||m[1]!==st.mapId)return;
    var x=+m[2],y=+m[3];if(!known(x,y))return;
    g.strokeStyle='#e0d7c2';g.lineWidth=Math.max(2,s*.08);
    g.beginPath();g.moveTo(ox+x*s+s*.28,oy+y*s+s*.28);g.lineTo(ox+x*s+s*.72,oy+y*s+s*.72);
    g.moveTo(ox+x*s+s*.72,oy+y*s+s*.28);g.lineTo(ox+x*s+s*.28,oy+y*s+s*.72);g.stroke();
    g.lineWidth=1;
  });
  /* ground loot — pink piles */
  var gr=(gsave()&&gsave().ground&&gsave().ground[st.mapId])||{};
  Object.keys(gr).forEach(function(k){
    var p=k.split(','),x=+p[0],y=+p[1];if(!known(x,y))return;
    g.fillStyle='#e58fb0';
    g.beginPath();g.arc(ox+x*s+s/2,oy+y*s+s/2,Math.max(3,s*.16),0,6.283);g.fill();
  });
  /* unopened but sighted treasure */
  if(st.def.ev)Object.keys(st.def.ev).forEach(function(letter){
    var ev=st.def.ev[letter];if(!ev.chest)return;
    var cell=findLetter(prep,letter);if(!cell||!known(cell.x,cell.y))return;
    if(gsave()&&gsave().flags[st.mapId+':'+letter]==='done')return;
    var px=ox+cell.x*s,py=oy+cell.y*s;
    g.fillStyle='#caa64a';g.fillRect(px+s*.26,py+s*.42,s*.48,s*.3);
    g.strokeStyle='#12131a';g.strokeRect(px+s*.26,py+s*.42,s*.48,s*.3);
    box.push([px,py,s,s]);
  });
  /* stair glyphs and gates get letters drawn */
  for(var y2=0;y2<H;y2++)for(var x2=0;x2<W;x2++){
    if(!known(x2,y2))continue;
    var c2=prep.char[y2*W+x2];
    if(c2==='<'||c2==='>'||c2==='L'||c2==='G'||/^[A-Z]$/.test(c2)){
      g.fillStyle=c2==='G'?'#f0e6d2':'#0d0e13';
      g.font='bold '+Math.round(s*.46)+'px Georgia';g.textAlign='center';
      g.fillText(c2,ox+x2*s+s/2,oy+y2*s+s*.7);g.textAlign='left';
    }
  }
  /* place labels, collision-aware */
  var named=[];
  if(st.def.locs)Object.keys(st.def.locs).forEach(function(k){
    var cell=findLetter(prep,k);if(cell&&known(cell.x,cell.y))named.push([cell.x,cell.y,st.def.locs[k].name||'']);
  });
  if(st.def.sites)Object.keys(st.def.sites).forEach(function(k){
    var cell=findLetter(prep,k);if(cell&&known(cell.x,cell.y))named.push([cell.x,cell.y,(st.def.sites[k].name||'')]);
  });
  if(st.def.ev)Object.keys(st.def.ev).forEach(function(letter){
    var ev=st.def.ev[letter];
    var nm=(ev.chest&&gsave()&&gsave().flags[st.mapId+':'+letter]==='done')?'plundered cache':null;
    if(!nm)return;
    var cell=findLetter(prep,letter);if(cell&&known(cell.x,cell.y))named.push([cell.x,cell.y,nm]);
  });
  g.font=Math.round(Math.min(22,Math.max(12,s*.3)))+'px Georgia';
  named.forEach(function(n){
    if(!n[2])return;
    var w=g.measureText(n[2]).width+8,h=Math.round(s*.34)+6;
    var px=ox+n[0]*s,py=oy+n[1]*s;
    var tries=[[px+s+4,py-2],[px+s+4,py+s-h],[px-w-4,py-2],[px+s/2-w/2,py-h-4],[px+s/2-w/2,py+s+4],[px+s+4,py+s+6]];
    for(var ti=0;ti<tries.length;ti++){
      var r=[tries[ti][0],tries[ti][1],w,h];
      if(ti===tries.length-1||!labels.some(function(L){return rectHit(L,r);}))
      {if(ti<tries.length-1)labels.push(r);
        g.fillStyle='rgba(11,12,17,0.72)';g.fillRect(r[0],r[1],r[2],r[3]);
        g.fillStyle='#cbbf9d';g.fillText(n[2],r[0]+4,r[1]+h-6);
        break;}
    }
  });
  /* bands */
  (st.bands||[]).forEach(function(b){
    var px=ox+(b.x+.5)*s,py=oy+(b.y+.5)*s;
    g.fillStyle='#c0392b';
    g.beginPath();g.moveTo(px,py-s*.42);g.lineTo(px+s*.42,py);g.lineTo(px,py+s*.42);g.lineTo(px-s*.42,py);g.closePath();g.fill();
    g.fillStyle='#f0e6d2';g.font='bold '+Math.round(Math.min(20,Math.max(11,s*.34)))+'px Georgia';
    g.fillText(String(b.n),px+s*.5,py-s*.3);
  });
  /* party arrow */
  if(st.x>=0){
    var ax=ox+(st.x+.5)*s,ay=oy+(st.y+.5)*s;
    var ad=[[0,-1],[1,0],[0,1],[-1,0]][st.dir||0];
    g.fillStyle='#e3b54a';
    g.beginPath();
    g.moveTo(ax+ad[0]*s*.55,ay+ad[1]*s*.55);
    g.lineTo(ax-ad[1]*s*.32,ay+ad[0]*s*.32);
    g.lineTo(ax+ad[1]*s*.32,ay-ad[0]*s*.32);
    g.closePath();g.fill();
    g.strokeStyle='#0d0e13';g.stroke();
  }
  /* hover highlight */
  if(st.hover){
    g.strokeStyle='#e3b54a';g.lineWidth=2;
    g.strokeRect(ox+st.hover.x*s+1,oy+st.hover.y*s+1,s-2,s-2);g.lineWidth=1;
  }
  /* info strip (hover name) */
  g.fillStyle='#e9e2cf';g.font='20px Georgia';
  g.fillText(st.hoverText||'Hover a square to name it.',20,36);
  /* legend */
  var lx=20,ly=ch-legendH+26;
  function swatch(col,label){
    g.fillStyle=col;g.fillRect(lx,ly-12,14,14);
    g.strokeStyle='#0d0e13';g.strokeRect(lx,ly-12,14,14);
    g.fillStyle='#cbbf9d';g.font='15px Georgia';g.fillText(label,lx+20,ly);
    lx+=20+g.measureText(label).width+26;
  }
  swatch('#8a6a40','door');swatch('#a34a2a','locked');swatch('#b98a4a','service');
  swatch('#4a7fb0','stairs');swatch('#c8502c','gate');swatch('#c8a03c','place');
  swatch('#caa64a','unopened treasure');swatch('#e0d7c2','found trap');
  swatch('#e58fb0','ground loot');swatch('#c0392b','watch band');swatch('#e3b54a','party');
  g.fillStyle='#8b8571';g.font='italic 14px Georgia';
  g.fillText('Unexplored ground stays dark. Unseen treasure, hidden foes and unfound traps are never marked.',lx+8,ly);
}
function rectHit(a,b){
  return a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
}
function findLetter(prep,letter){
  for(var y=0;y<prep.h;y++)for(var x=0;x<prep.w;x++)if(prep.char[y*prep.w+x]===letter)return{x:x,y:y};
  return null;
}

/* ================= hover naming (disclosure-safe) ================= */
function hoverName(st,x,y){
  var prep=st.prep;
  if(x<0||y<0||x>=prep.w||y>=prep.h)return 'Outers dark — no ground at all.';
  var known=!st.seen||!st.seen[y]||st.seen[y][x]==='1';
  if(!known)return 'Unexplored ground.';
  var c=prep.char[y*prep.w+x];
  var band=(st.bands||[]).find(function(b){return b.x===x&&b.y===y;});
  var out=[];
  if(c==='#')out.push('cut stone wall');
  else if(c==='H')out.push('timber wall');
  else if(c==='B')out.push('brick wall');
  else if(c==='^')out.push('broken rock — impassable');
  else if(c==='~')out.push('running water — impassable');
  else if(c==='T')out.push('woods');
  else if(c==='n')out.push('hills');
  else if(c==='%')out.push('fen');
  else if(c==='=')out.push('road');
  else if(c==='+')out.push('bridge');
  else if(c===',')out.push('grass');
  else if(c==='.')out.push(st.wild?'open ground':'floor');
  else if(c==='G'){var ex=st.def.exit;out.push('gate'+(ex&&ex.label?' → '+ex.label:''));}
  else if(c==='D')out.push('door');
  else if(c==='L')out.push('a locked door');
  else if(c==='S')out.push('wall');   // secrets stay secrets
  else if(/[1-9]/.test(c)&&st.def.locs&&st.def.locs[c])out.push('door '+c+' — '+(st.def.locs[c].name||'a service'));
  else if(c==='<'||c==='>'){
    var st2=st.def.stairs&&st.def.stairs[x+','+y];
    out.push((c==='<'?'Stairs up':'Stairs down')+(st2&&st2.label?' → '+st2.label:''));
  }
  else if(/^[A-Z]$/.test(c)&&st.def.sites&&st.def.sites[c])out.push(st.def.sites[c].name);
  else if(/[a-z]/.test(c)&&st.def.ev&&st.def.ev[c]){
    var ev=st.def.ev[c],done=G.flags[st.mapId+':'+c]==='done';
    if(ev.chest)out.push(done?'an opened cache':'a treasure, unopened');
    else if(done)out.push('a visited place');
    else out.push('a place');   // set battles and text never advertised
  }
  var gg=gsave();var pile=gg&&gg.ground&&gg.ground[st.mapId]&&gg.ground[st.mapId][x+','+y];
  if(pile&&pile.length){
    out.push('discarded: '+pile.map(function(id){var it=(window.item&&item(id))||{n:id};return it.n;}).join(', '));
  }
  if(gg&&gg.flags['trapseen:'+st.mapId+':'+x+','+y])out.push('a trap, found and marked');
  if(band){
    var md=(window.MONSTERS&&MONSTERS[band.mon])||{n:band.mon};
    out.push(md.n+' ×'+band.n+' — watchful');
  }
  if(!out.length)out.push('open ground');
  return out.join(' · ');
}

/* ================= open ================= */
function openFull(st){
  var body=UI.el('div');
  var cv=document.createElement('canvas');
  cv.width=1840;cv.height=1100;
  cv.style.cssText='width:100%;max-height:74vh;background:#0b0c11;cursor:crosshair';
  body.appendChild(cv);
  S=st;st.hover=null;st.hoverText=null;st.canvas=cv;
  paint(cv,st);
  cv.addEventListener('mousemove',function(e){
    var r=cv.getBoundingClientRect();
    var mx=(e.clientX-r.left)*(cv.width/r.width),my=(e.clientY-r.top)*(cv.height/r.height);
    var x=Math.floor((mx-st.ox)/st.s),y=Math.floor((my-st.oy)/st.s);
    if(x<0||y<0||x>=st.prep.w||y>=st.prep.h||my<st.oy){
      if(st.hover){st.hover=null;st.hoverText=null;paint(cv,st);}
      return;
    }
    st.hover={x:x,y:y};
    st.hoverText=hoverName(st,x,y);
    paint(cv,st);
  });
  UI.modal({title:'Survey — '+(st.def.name||st.mapId),body:body,actions:[{label:'Close',primary:1}]});
}
function paintN(){if(S&&S.canvas)paint(S.canvas,S);}
function show(st){openFull(st);}
return{paint:paint,openFull:openFull,hover:hoverName,show:show,repaint:paintN};
})();
