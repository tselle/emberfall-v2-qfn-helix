/* Emberfall — js/view3d.js
 * View3D.init/prepare/render/minimap/figTex.
 * Software raycaster on Canvas 2D: DDA column cast against the prepared
 * grid, textured walls sampled from procedurally painted 64² tiles with a
 * half-res mip, side shading, distance fog and base contact darkening.
 * A per-column depth buffer clips billboarded entities — bands, treasure,
 * stairs — depth-sorted far to near. No game-rule effects. */
'use strict';
var View3D=(function(){
var cv=null,ctx=null,W=0,H=0;
var COLW=4;                       // column slice width in backing pixels
var TEX=64,TEXH=32;               // texture mip 0 and mip 1 widths
var zbuf=null,zStep=COLW,zN=0;
var lastMs=0;

function init(canvas){cv=canvas;ctx=canvas.getContext('2d');W=cv.width;H=cv.height;}

function prepare(mapDef){
  var g=mapDef.grid,h=g.length,w=g[0].length;
  var wall=new Uint8Array(w*h),out=new Uint8Array(w*h),char=new Array(w*h);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var c=g[y][x],i=y*w+x;
    char[i]=c;
    wall[i]=(c==='#'||c==='H'||c==='B'||c==='T'||c==='F'||c==='^'||c==='~')?1:0;
    out[i]=(mapDef.outdoor||mapDef.safe||mapDef.overland)?1:0;
  }
  return {def:mapDef,w:w,h:h,wall:wall,out:out,char:char,
          solid:function(x,y){if(x<0||y<0||x>=w||y>=h)return true;return wall[y*w+x]===1;}};
}

/* ================= procedural wall textures ================= */
var TEXCACHE=null;
function buildTextures(){
  if(TEXCACHE)return TEXCACHE;
  TEXCACHE={};
  function tile(painter){
    try{
      var c0=document.createElement('canvas');c0.width=TEX;c0.height=TEX;
      var g0=c0.getContext('2d');painter(g0,TEX);
      var c1=document.createElement('canvas');c1.width=TEXH;c1.height=TEXH;
      var g1=c1.getContext('2d');g1.drawImage(c0,0,0,TEXH,TEXH);
      return {full:c0,mip:c1};
    }catch(e){return null;}
  }
  function grain(g,base,jit,seed){
    var r=new Rules.RNG(seed);
    g.fillStyle=base;g.fillRect(0,0,TEX,TEX);
    for(var i=0;i<900;i++){
      var x=r.int(0,TEX-1),y=r.int(0,TEX-1),v=r.int(-jit,jit);
      g.fillStyle='rgba('+(v>0?255:0)+','+(v>0?255:0)+','+(v>0?255:0)+','+(Math.abs(v)/300)+')';
      g.fillRect(x,y,1,1);
    }
  }
  TEXCACHE['#']=tile(function(g){
    grain(g,'#6e6a60',26,11);
    g.fillStyle='rgba(30,28,26,.8)';
    for(var y=0;y<TEX;y+=16){g.fillRect(0,y,TEX,2);
      for(var x=(y%32)?8:0;x<TEX;x+=16)g.fillRect(x,y,2,16);}
  });
  TEXCACHE['B']=tile(function(g){
    grain(g,'#5f4e40',20,22);
    g.fillStyle='rgba(28,22,18,.85)';
    for(var y=0;y<TEX;y+=8){g.fillRect(0,y,TEX,1.6);
      for(var x=(y%16)?4:12;x<TEX;x+=12)g.fillRect(x,y,1.6,8);}
  });
  TEXCACHE['H']=tile(function(g){
    grain(g,'#57452f',16,33);
    g.fillStyle='rgba(22,16,10,.8)';
    for(var x=0;x<TEX;x+=10)g.fillRect(x,0,1.8,TEX);
    g.fillStyle='rgba(120,100,70,.25)';for(var x2=4;x2<TEX;x2+=10)g.fillRect(x2,0,1,TEX);
  });
  TEXCACHE['T']=tile(function(g){   // foliage mass for town-garden walls
    grain(g,'#22402a',26,44);
    var r=new Rules.RNG(45);
    for(var i=0;i<46;i++){g.fillStyle=r.chance(.5)?'rgba(50,90,50,.5)':'rgba(20,40,22,.6)';
      g.beginPath();g.arc(r.int(0,TEX),r.int(0,TEX),r.int(3,8),0,6.29);g.fill();}
  });
  TEXCACHE['D']=tile(function(g){   // planked door with iron bands
    grain(g,'#5c4326',14,55);
    g.fillStyle='rgba(20,14,8,.85)';for(var x=0;x<TEX;x+=12)g.fillRect(x,0,2,TEX);
    g.fillStyle='#3a3a40';g.fillRect(0,14,TEX,5);g.fillRect(0,42,TEX,5);
    g.fillStyle='#caa64a';g.beginPath();g.arc(TEX-14,32,3,0,6.29);g.fill();
  });
  TEXCACHE['L']=TEXCACHE['D'];
  TEXCACHE['^']=tile(function(g){
    grain(g,'#585d68',30,66);
    g.fillStyle='rgba(20,22,28,.6)';var r=new Rules.RNG(67);
    for(var i=0;i<18;i++){g.beginPath();g.moveTo(r.int(0,TEX),r.int(0,TEX));
      g.lineTo(r.int(0,TEX),r.int(0,TEX));g.lineWidth=r.int(1,3);g.strokeStyle='rgba(24,26,32,.5)';g.stroke();}
  });
  TEXCACHE['~']=tile(function(g){
    grain(g,'#28486a',14,77);
    g.strokeStyle='rgba(140,180,220,.35)';g.lineWidth=1.4;
    for(var y=6;y<TEX;y+=12){g.beginPath();
      for(var x=0;x<=TEX;x+=8)g.lineTo(x,y+Math.sin(x*.5+y)*2.4);g.stroke();}
  });
  TEXCACHE['F']=TEXCACHE['#'];
  TEXCACHE['S']=TEXCACHE['#'];       // secret doors look like their wall
  return TEXCACHE;
}
function texFor(c){
  var t=buildTextures();
  return t[c]||t['#'];
}

/* ================= sprite cache (billboards) ================= */
var SPR={};
function sprite(key){
  if(SPR[key]!==undefined)return SPR[key];
  var s=null;
  try{s=makeSprite(key);}catch(e){s=null;}
  SPR[key]=s;return s;
}
function makeSprite(key){
  var p=key.split(':'),kind=p[0];
  var c=document.createElement('canvas'),g=c.getContext('2d');
  if(kind==='mon'){
    var id=p[1],def=(window.MONSTERS&&MONSTERS[id])||{};
    var big=def.size==='L',small=def.size==='S';
    c.width=96;c.height=128;g=c.getContext('2d');
    var col=monColor(id,def);
    var bodyW=small?26:(big?58:38),bodyH=small?40:(big?78:58);
    var bx=48,by=120;   // feet at bottom
    g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(bx,by,26,8,0,0,6.29);g.fill();
    var fig=def.fig||'humanoid';
    if(fig==='skeleton'){
      g.strokeStyle='#d5cdb4';g.lineWidth=4;
      g.beginPath();g.moveTo(bx,by-bodyH);g.lineTo(bx,by-16);g.stroke();
      g.lineWidth=3;
      for(var r=0;r<4;r++){g.beginPath();g.moveTo(bx-12+r*1.5,by-bodyH+16+r*9);g.lineTo(bx+12-r*1.5,by-bodyH+16+r*9);g.stroke();}
      g.beginPath();g.moveTo(bx-10,by-16);g.lineTo(bx-4,by);g.moveTo(bx+10,by-16);g.lineTo(bx+4,by);g.stroke();
      g.fillStyle='#e8e2cc';g.beginPath();g.arc(bx,by-bodyH-8,10,0,6.29);g.fill();
      g.fillStyle='#141018';g.fillRect(bx-6,by-bodyH-12,4,5);g.fillRect(bx+2,by-bodyH-12,4,5);
    }else if(fig==='spider'||fig==='insect'){
      g.strokeStyle=col;g.lineWidth=4;
      for(var l=0;l<3;l++){g.beginPath();g.moveTo(bx,by-18);g.lineTo(bx-34,by-26+l*10);g.stroke();
        g.beginPath();g.moveTo(bx,by-18);g.lineTo(bx+34,by-26+l*10);g.stroke();}
      g.fillStyle=col;g.beginPath();g.ellipse(bx,by-26,20,16,0,0,6.29);g.fill();
      g.fillStyle='#c0392b';g.fillRect(bx-5,by-32,3,3);g.fillRect(bx+2,by-32,3,3);
    }else if(fig==='rat'||fig==='beast'||fig==='wolf'){
      g.fillStyle=col;g.beginPath();g.ellipse(bx-4,by-22,30,15,0,0,6.29);g.fill();
      g.beginPath();g.arc(bx+26,by-30,11,0,6.29);g.fill();
      g.fillStyle='rgba(0,0,0,.4)';g.fillRect(bx-22,by-12,6,12);g.fillRect(bx+8,by-12,6,12);
      g.fillStyle='#c0392b';g.fillRect(bx+28,by-33,3,3);
    }else if(fig==='bat'||fig==='bird'){
      g.fillStyle=col;g.beginPath();g.ellipse(bx,by-56,10,16,0,0,6.29);g.fill();
      g.beginPath();g.moveTo(bx-8,by-62);g.quadraticCurveTo(bx-42,by-90,bx-46,by-52);g.quadraticCurveTo(bx-24,by-58,bx-8,by-50);g.fill();
      g.beginPath();g.moveTo(bx+8,by-62);g.quadraticCurveTo(bx+42,by-90,bx+46,by-52);g.quadraticCurveTo(bx+24,by-58,bx+8,by-50);g.fill();
      g.fillStyle='#e8b54a';g.fillRect(bx-4,by-64,3,3);g.fillRect(bx+1,by-64,3,3);
    }else{  // humanoid and default
      g.fillStyle=col;
      g.beginPath();
      g.moveTo(bx-bodyW/2,by);g.lineTo(bx-bodyW/2+4,by-bodyH*.55);
      g.quadraticCurveTo(bx,by-bodyH-16,bx+bodyW/2-4,by-bodyH*.55);
      g.lineTo(bx+bodyW/2,by);g.closePath();g.fill();
      g.fillStyle=shade(col,-18);g.fillRect(bx-bodyW/2+6,by-14,bodyW-12,14);   // legs shade
      g.fillStyle=shade(col,26);g.beginPath();g.arc(bx,by-bodyH-6,big?12:10,0,6.29);g.fill();
      g.fillStyle='#e05a3a';g.fillRect(bx-5,by-bodyH-9,3,3);g.fillRect(bx+2,by-bodyH-9,3,3);
      if(def.leader){g.strokeStyle='#e3b54a';g.lineWidth=3;g.beginPath();
        g.moveTo(bx-10,by-bodyH-20);g.lineTo(bx-5,by-bodyH-30);g.lineTo(bx,by-bodyH-22);g.lineTo(bx+5,by-bodyH-30);g.lineTo(bx+10,by-bodyH-20);g.stroke();}
    }
    return c;
  }
  if(kind==='chest'){
    c.width=64;c.height=44;g=c.getContext('2d');
    g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(32,40,24,5,0,0,6.29);g.fill();
    g.fillStyle='#6a4a24';g.fillRect(8,18,48,22);
    g.fillStyle='#7d5a2e';g.beginPath();g.moveTo(8,18);g.quadraticCurveTo(32,-2,56,18);g.closePath();g.fill();
    g.fillStyle='#caa64a';g.fillRect(8,26,48,4);g.fillRect(28,16,8,14);
    g.fillStyle='#3a2c14';g.fillRect(30,20,4,4);
    return c;
  }
  if(kind==='stairD'||kind==='stairU'){
    c.width=72;c.height=48;g=c.getContext('2d');
    if(kind==='stairD'){
      g.fillStyle='#0a0a10';g.beginPath();g.moveTo(6,48);g.lineTo(24,8);g.lineTo(48,8);g.lineTo(66,48);g.closePath();g.fill();
      g.fillStyle='#4c5163';
      for(var i=0;i<4;i++)g.fillRect(14+i*3.4,38-i*9,44-i*6.8,6);
      g.strokeStyle='rgba(227,181,74,.5)';g.strokeRect(20,4,32,4);
    }else{
      g.fillStyle='#3d4152';
      for(var j=0;j<4;j++)g.fillRect(10+j*4,44-j*10,52-j*8,8);
      g.fillStyle='#12141c';g.fillRect(26,0,20,8);
      g.strokeStyle='rgba(120,170,220,.55)';g.strokeRect(22,2,28,6);
    }
    return c;
  }
  return null;
}
function monColor(id,def){
  if(def.undead)return '#a8a184';
  if((def.tags||[]).indexOf('giantkin')>=0)return '#8a6a4a';
  if((def.tags||[]).indexOf('troll')>=0)return '#5d7d4a';
  if((def.tags||[]).indexOf('vermin')>=0)return '#6b5a3c';
  var h=0;for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))|0;
  var hues=['#7a5a4a','#6a7248','#5a6a7a','#7a4a5a','#5f5a72','#746249'];
  return hues[Math.abs(h)%hues.length];
}
function shade(hex,amt){
  var n=parseInt(hex.slice(1),16),r=(n>>16)+amt,g=(n>>8&255)+amt,b=(n&255)+amt;
  return 'rgb('+Math.max(0,Math.min(255,r))+','+Math.max(0,Math.min(255,g))+','+Math.max(0,Math.min(255,b))+')';
}
function entitySize(key){
  var p=key.split(':');
  if(p[0]==='mon'){var d=(window.MONSTERS&&MONSTERS[p[1]])||{};
    return d.size==='L'?1.6:(d.size==='S'?0.55:1.0);}
  if(p[0]==='chest')return 0.45;
  return 0.8;
}

/* ================= render ================= */
function render(prep,cam,scale,opts){
  lastMs=0;
  if(!ctx)return 0;
  var t0=performance.now();
  scale=scale||1;
  var w2=Math.max(160,Math.floor(W*scale)),h2=Math.max(100,Math.floor(H*scale));
  // low-res motion frames paint in a shrunken coordinate space; stretch it
  // over the full canvas backing store so the view never letterboxes.
  ctx.setTransform(W/w2,0,0,H/h2,0,0);
  var horizon=h2/2;
  var outdoor=!!(prep.def.outdoor||prep.def.safe||prep.def.overland);
  // sky
  var sky=ctx.createLinearGradient(0,0,0,horizon);
  if(outdoor){sky.addColorStop(0,'#232a4a');sky.addColorStop(.7,'#4a3a44');sky.addColorStop(1,'#5a4a40');}
  else{sky.addColorStop(0,'#0b0c11');sky.addColorStop(1,'#171922');}
  ctx.fillStyle=sky;ctx.fillRect(0,0,w2,horizon);
  if(outdoor){   // dusk stars and hill silhouettes
    var rs=new Rules.RNG(prep.w*7+prep.h);
    ctx.fillStyle='rgba(233,226,207,.7)';
    for(var st=0;st<26;st++)ctx.fillRect(rs.int(0,w2),rs.int(0,horizon*.55),1.6,1.6);
    ctx.fillStyle='#1d2430';
    ctx.beginPath();ctx.moveTo(0,horizon);
    for(var hx=0;hx<=w2;hx+=w2/9)ctx.lineTo(hx,horizon-10-Math.abs(Math.sin(hx*.013+prep.w))*26);
    ctx.lineTo(w2,horizon);ctx.closePath();ctx.fill();
  }
  var flr=ctx.createLinearGradient(0,horizon,0,h2);
  if(outdoor){flr.addColorStop(0,'#3a4029');flr.addColorStop(1,'#20241a');}
  else{flr.addColorStop(0,'#26232a');flr.addColorStop(1,'#101014');}
  ctx.fillStyle=flr;ctx.fillRect(0,horizon,w2,h2-horizon);
  // camera
  var a0=(cam.ang!==undefined)?cam.ang:[-Math.PI/2,0,Math.PI/2,Math.PI][cam.dir];
  var fov=1.15;
  var cx=cam.x,cy=cam.y;
  var colw=Math.max(2,(COLW*scale)|0);
  zN=Math.ceil(w2/colw)+1;
  if(!zbuf||zbuf.length<zN)zbuf=new Float32Array(zN+4);
  for(var i0=0;i0<zN;i0++)zbuf[i0]=99;
  var ci=-1;
  for(var px=0;px<w2;px+=colw){
    ci++;
    var camX=2*px/w2-1;
    var ra=a0+camX*fov/2;
    var rdx=Math.cos(ra),rdy=Math.sin(ra);
    var mapX=Math.floor(cx),mapY=Math.floor(cy);
    var ddx=Math.abs(1/(rdx||1e-9)),ddy=Math.abs(1/(rdy||1e-9));
    var stepX,stepY,sdx,sdy;
    if(rdx<0){stepX=-1;sdx=(cx-mapX)*ddx;}else{stepX=1;sdx=(mapX+1-cx)*ddx;}
    if(rdy<0){stepY=-1;sdy=(cy-mapY)*ddy;}else{stepY=1;sdy=(mapY+1-cy)*ddy;}
    var hit=0,side=0,dist=0,c='?',guard=0;
    while(!hit&&guard++<64){
      if(sdx<sdy){sdx+=ddx;mapX+=stepX;side=0;}else{sdy+=ddy;mapY+=stepY;side=1;}
      if(mapX<0||mapY<0||mapX>=prep.w||mapY>=prep.h){hit=2;break;}
      if(prep.wall[mapY*prep.w+mapX]){hit=1;c=prep.char[mapY*prep.w+mapX];}
    }
    if(hit!==1){continue;}
    dist=side===0?(mapX-cx+(1-stepX)/2)/rdx:(mapY-cy+(1-stepY)/2)/rdy;
    if(dist<=0.01)dist=.01;
    zbuf[ci]=dist;
    var lh=h2*0.9/dist;
    if(lh>h2*3)lh=h2*3;
    var y0=(h2-lh)/2;
    // texture column
    var wallX=side===0?(cy+dist*rdy):(cx+dist*rdx);
    wallX-=Math.floor(wallX);
    var tex=texFor(c),texCan=(dist>7&&tex.mip)?tex.mip:tex.full;
    var TW=texCan.width,TH=texCan.height;
    var texX=(wallX*TW)|0;
    if((side===0&&rdx>0)||(side===1&&rdy<0))texX=TW-1-texX;
    if(texCan&&texCan.width>0){
      try{ctx.drawImage(texCan,texX,0,1,TH,px,y0,colw+1,lh);}
      catch(e){ctx.fillStyle='#555';ctx.fillRect(px,y0,colw,lh);}
    }else{ctx.fillStyle='#555';ctx.fillRect(px,y0,colw,lh);}
    if(side===1){ctx.fillStyle='rgba(6,6,12,.34)';ctx.fillRect(px,y0,colw+1,lh);}
    var fog=Math.min(.86,dist/14);
    if(fog>.04){ctx.fillStyle='rgba(13,14,20,'+fog.toFixed(3)+')';ctx.fillRect(px,y0,colw+1,lh);}
    ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(px,y0+lh-Math.max(2,lh*.05),colw+1,Math.max(2,lh*.05));
    ctx.fillStyle='rgba(240,230,200,.05)';ctx.fillRect(px,y0,colw+1,Math.max(1,lh*.02));
  }
  // billboards, far to near
  var ents=(opts&&opts.entities)||[];
  if(ents.length){
    var dirX=Math.cos(a0),dirY=Math.sin(a0),tanH=Math.tan(fov/2);
    var planeX=-dirY*tanH,planeY=dirX*tanH;
    var invDet=1/(planeX*dirY-dirX*planeY);
    var list=ents.map(function(en){
      var dx=en.x-cx,dy=en.y-cy;
      var tX=invDet*(dirY*dx-dirX*dy),tY=invDet*(-planeY*dx+planeX*dy);
      return {en:en,tX:tX,tY:tY};
    }).filter(function(e){return e.tY>0.2&&Math.abs(e.tX/e.tY)<3.2;})
      .sort(function(a,b){return b.tY-a.tY;});
    list.forEach(function(e){
      var en=e.en,spr=sprite(en.spr);
      if(!spr||!spr.width)return;
      var sx=(w2/2)*(1+e.tX/e.tY);
      var lh=h2*0.9/e.tY;
      var hs=en.hs||entitySize(en.spr);
      var shp=lh*hs;
      var swp=shp*(spr.width/spr.height);
      var bottom=horizon+lh/2;
      var top=bottom-shp;
      var x0=Math.max(0,Math.floor(sx-swp/2)),x1=Math.min(w2,Math.ceil(sx+swp/2));
      if(x1<=x0)return;
      var fade=1-Math.min(.9,e.tY/14);
      ctx.globalAlpha=Math.max(.08,fade);
      var TW2=spr.width,TH2=spr.height;
      for(var xx=x0;xx<x1;xx+=colw){
        var idx=Math.floor(xx/colw);
        if(zbuf[idx]!==undefined&&zbuf[idx]<=e.tY+.12)continue;   // occluded by wall
        var u=(xx-(sx-swp/2))/swp;
        try{ctx.drawImage(spr,Math.min(TW2-1,(u*TW2)|0),0,Math.max(1,(colw/swp*TW2)|0),TH2,xx,top,colw+1,shp);}
        catch(e2){}
      }
      if(en.tag&&x0<sx&&sx<x1&&!(zbuf[Math.floor(sx/colw)]<=e.tY+.12)){
        ctx.fillStyle='#e06a4a';ctx.font=Math.max(11,Math.round(h2*.022))+'px Georgia';
        ctx.fillText(en.tag,sx-swp/2,bottom+Math.max(11,h2*.022));
      }
      ctx.globalAlpha=1;
    });
  }
  ctx.setTransform(1,0,0,1,0,0);   // restore identity for other painters
  lastMs=performance.now()-t0;
  return lastMs;
}
function lastFrameMs(){return lastMs;}

/* ================= minimap ================= */
function minimap(prep,seen,camX,camY,dir,opts){
  var mc=opts.canvas,mm=mc.getContext('2d');
  var cw=mc.width,chh=mc.height;
  mm.fillStyle='#0d0e13';mm.fillRect(0,0,cw,chh);
  var s=Math.min(cw/prep.w,chh/prep.h);
  var ox=(cw-prep.w*s)/2,oy=(chh-prep.h*s)/2;
  for(var y=0;y<prep.h;y++)for(var x=0;x<prep.w;x++){
    if(seen&&seen[y]&&seen[y][x]!=='1')continue;
    var c=prep.char[y*prep.w+x];
    var col='#1f222d';
    if(c==='#'||c==='H'||c==='B')col='#3a3f52';
    else if(c==='^'||c==='~')col='#2a3346';
    else if(c==='T')col='#25402a';
    else if(c==='n')col='#3d3b2c';
    else if(c==='%')col='#2b3b33';
    else if(c==='='||c==='+')col='#4a4436';
    else if(c==='.'){col=prep.out[y*prep.w+x]?'#2c3527':'#232631';}
    else if(c===','){col='#26301f';}
    else if(/[1-9]/.test(c))col='#b98a4a';
    else if(c==='G')col='#c8502c';
    else if(c==='D')col='#8a6a40';
    else if(c==='L')col='#a34a2a';
    else if(c==='<'||c==='>')col='#4a7fb0';
    else if(/[a-z]/.test(c))col='#5a5470';
    else if(/^[A-Z]$/.test(c))col='#c8a03c';
    mm.fillStyle=col;mm.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));
  }
  if(opts.bands)opts.bands.forEach(function(b){
    if(b.x<0||b.y<0||b.x>=prep.w||b.y>=prep.h)return;
    mm.fillStyle='#c0392b';
    mm.beginPath();
    mm.moveTo(ox+b.x*s+s/2,oy+b.y*s+1);
    mm.lineTo(ox+(b.x+1)*s-1,oy+b.y*s+s/2);
    mm.lineTo(ox+b.x*s+s/2,oy+(b.y+1)*s-1);
    mm.lineTo(ox+b.x*s+1,oy+b.y*s+s/2);
    mm.closePath();mm.fill();
    mm.fillStyle='#e9e2cf';mm.font=Math.max(8,s*.8)+'px Georgia';
    mm.fillText(String(b.n),ox+b.x*s+s+2,oy+b.y*s+s-1);
  });
  if(camX>=0){
    mm.fillStyle='#e3b54a';
    var ax=ox+(camX+.5)*s,ay=oy+(camY+.5)*s;
    var adir=[[0,-1],[1,0],[0,1],[-1,0]][dir];
    mm.beginPath();
    mm.moveTo(ax+adir[0]*s,ay+adir[1]*s);
    mm.lineTo(ax-adir[1]*s*.6,ay+adir[0]*s*.6);
    mm.lineTo(ax+adir[1]*s*.6,ay-adir[0]*s*.6);
    mm.closePath();mm.fill();
  }
  return null;
}

function figTex(desc,key){return sprite(key);}   // billboard cache handle

return{init:init,prepare:prepare,render:render,minimap:minimap,figTex:figTex,
  lastFrameMs:lastFrameMs,COLW:COLW};
})();
