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
var TEX=128,TEXH=64;             // texture mip 0 and mip 1 widths (branch: crisper masonry)
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
  TEXCACHE['#']=tile(function(g){   // warm irregular masonry
    grain(g,'#77705f',22,11);
    var r=new Rules.RNG(1111);
    for(var y=0;y<TEX;y+=11){
      var off=(Math.floor(y/11)%2)*6+r.int(-1,1);
      for(var x=off;x<TEX;x+=13+r.int(0,4)){
        var w=11+r.int(0,3),h=9,v=r.int(-14,14);
        g.fillStyle='rgb('+(112+v)+','+(104+v)+','+(88+v)+')';
        g.fillRect(x+1,y+1,Math.min(w,TEX-x-1),h-1);
        g.fillStyle='rgba(40,34,28,.55)';
        g.fillRect(x,y,1,h);g.fillRect(x,y,w,1);
        if(r.chance(.3)){g.fillStyle='rgba(210,200,175,.16)';g.fillRect(x+2,y+2,2,1);}
      }
    }
    g.fillStyle='rgba(24,20,15,.35)';g.fillRect(0,0,TEX,3);
  });
  TEXCACHE['B']=tile(function(g){   // running-bond brick
    grain(g,'#6d4a3c',16,22);
    var r=new Rules.RNG(2222);
    for(var y=0;y<TEX;y+=7){
      var off=(Math.floor(y/7)%2)*8;
      g.fillStyle='rgba(26,17,13,.9)';g.fillRect(0,y,TEX,1.6);
      for(var x=off;x<TEX;x+=16){
        var v=r.int(-16,16);
        g.fillStyle='rgb('+(108+v)+','+(64+(v*.6|0))+','+(44+(v*.5|0))+')';
        g.fillRect(x+1,y+2,14,5);
        if(r.chance(.25)){g.fillStyle='rgba(20,12,9,.5)';g.fillRect(x+r.int(2,10),y+3,2,2);}
      }
    }
    g.fillStyle='rgba(20,14,10,.4)';g.fillRect(0,0,TEX,2);
  });
  TEXCACHE['H']=tile(function(g){   // Tudor half-timber: plaster + dark oak frame
    grain(g,'#cfc2a4',14,33);
    var r=new Rules.RNG(3333);
    // weathered plaster
    for(var i=0;i<26;i++){g.fillStyle='rgba(120,102,74,'+(0.05+r.chance(.5)?.08:.03)+')';
      g.beginPath();g.arc(r.int(0,TEX),r.int(0,TEX),r.int(3,9),0,6.29);g.fill();}
    function beam(x,y,w,h){g.fillStyle='#3a2a17';g.fillRect(x,y,w,h);
      g.fillStyle='rgba(90,66,38,.8)';g.fillRect(x,y+1,w,1);
      g.fillStyle='rgba(14,9,4,.6)';g.fillRect(x,y+h-1,w,1);}
    beam(0,0,TEX,5);beam(0,TEX-6,TEX,6);          // sill and header
    beam(4,0,5,TEX);beam(TEX-10,0,5,TEX);         // posts
    beam(0,30,TEX,4);                             // mid rail
    // diagonal braces
    g.save();g.translate(10,34);g.rotate(.62);g.fillStyle='#3a2a17';g.fillRect(0,0,26,4);g.restore();
    g.save();g.translate(TEX-12,34);g.rotate(-.62);g.fillStyle='#3a2a17';g.fillRect(-14,0,26,4);g.restore();
    // wattle hints between timbers
    g.fillStyle='rgba(96,78,52,.35)';
    for(var wx=12;wx<TEX-14;wx+=6)g.fillRect(wx,10,1.4,17);
    // weather streaks below the sill, and a plank wainscot at the base
    g.fillStyle='rgba(70,56,36,.28)';
    for(var wx2=14;wx2<TEX-16;wx2+=9)g.fillRect(wx2,36,3,r.int(8,20));
    g.fillStyle='#4a3823';g.fillRect(0,TEX-20,TEX,14);
    g.fillStyle='rgba(18,12,6,.7)';
    for(var px2=6;px2<TEX;px2+=13)g.fillRect(px2,TEX-20,1.6,14);
    g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,TEX-6,TEX,6);
    // a low window with oiled paper glow
    g.fillStyle='#2c2013';g.fillRect(24,12,16,14);
    g.fillStyle='rgba(226,180,110,.5)';g.fillRect(26,14,12,10);
    g.fillStyle='#3a2a17';g.fillRect(31,12,2,14);g.fillRect(24,18,16,2);
  });
  TEXCACHE['T']=tile(function(g){   // deep foliage mass with lit crowns
    grain(g,'#1d3a24',22,44);
    var r=new Rules.RNG(45);
    for(var i=0;i<64;i++){var x=r.int(0,TEX),y=r.int(0,TEX),rad=r.int(4,10);
      g.fillStyle='rgba('+(28+r.int(0,26))+','+(66+r.int(0,44))+','+(28+r.int(0,20))+',.85)';
      g.beginPath();g.arc(x,y,rad,0,6.29);g.fill();
      g.fillStyle='rgba(150,190,120,.13)';
      g.beginPath();g.arc(x-rad*.3,y-rad*.35,rad*.5,0,6.29);g.fill();}
    g.fillStyle='rgba(6,14,8,.4)';g.fillRect(0,TEX-10,TEX,10);
  });
  TEXCACHE['D']=tile(function(g){   // arched studded door with ring knocker
    grain(g,'#4f3a22',12,55);
    g.fillStyle='rgba(16,11,6,.9)';
    g.beginPath();g.moveTo(8,TEX);g.lineTo(8,26);g.quadraticCurveTo(TEX/2,2,TEX-8,26);g.lineTo(TEX-8,TEX);g.closePath();g.fill();
    g.fillStyle='#5c4326';
    g.beginPath();g.moveTo(11,TEX);g.lineTo(11,27);g.quadraticCurveTo(TEX/2,6,TEX-11,27);g.lineTo(TEX-11,TEX);g.closePath();g.fill();
    g.fillStyle='rgba(24,16,8,.8)';
    for(var x=15;x<TEX-12;x+=8)g.fillRect(x,10,1.6,TEX-10);
    g.fillStyle='#3c3c44';
    g.fillRect(11,22,TEX-22,4);g.fillRect(11,44,TEX-22,4);
    var r=new Rules.RNG(56);
    for(var s=0;s<10;s++){var sx=14+r.int(0,TEX-30),sy=(s<5?23:45)+1;
      g.fillStyle='#8a8a94';g.fillRect(sx,sy-1,2,2);}
    g.strokeStyle='#9a7b34';g.lineWidth=2.4;
    g.beginPath();g.arc(TEX/2+7,34,4.5,0,6.29);g.stroke();
    g.fillStyle='#241a0e';g.fillRect(10,TEX-4,TEX-20,4);
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


/* ================= ground textures (floorcasting) ================= */
var FBUF=null;
  var FLOORFAIL=0;
var GTEX=null;
function groundTextures(){
  if(GTEX)return GTEX;
  GTEX={};
  function gt(painter,seed,base){
    var c=document.createElement('canvas');c.width=64;c.height=64;
    var g=c.getContext('2d');
    g.fillStyle=base;g.fillRect(0,0,64,64);
    try{painter(g,seed);}catch(e){}
    return g.getImageData(0,0,64,64);
  }
  GTEX['.']=gt(function(g,s){   // worn flagstones
    var r=new Rules.RNG(801);
    for(var y=0;y<64;y+=16)for(var x=0;x<64;x+=16){
      var v=r.int(-12,12);
      g.fillStyle='rgb('+(74+v)+','+(69+v)+','+(62+v)+')';
      g.fillRect(x+1,y+1,14,14);
      if(r.chance(.3)){g.fillStyle='rgba(30,26,22,.5)';g.fillRect(x+r.int(2,10),y+r.int(2,10),3,2);}
    }
  },801,'#33302c');
  GTEX[',']=gt(function(g,s){   // trodden grass
    var r=new Rules.RNG(802);
    for(var i=0;i<900;i++){var x=r.int(0,63),y=r.int(0,63),t=r.chance(.18);
      g.fillStyle=t?'rgba(126,112,64,.5)':'rgba('+(52+r.int(0,44))+','+(92+r.int(0,58))+','+(42+r.int(0,28))+',.65)';
      g.fillRect(x,y,1,t?2:1);}
  },802,'#33502c');
  GTEX['=']=GTEX['+']=gt(function(g,s){   // cobble road
    var r=new Rules.RNG(803);
    for(var y=0;y<64;y+=8)for(var x=(Math.floor(y/8)%2)*4;x<64;x+=9){
      var v=r.int(-14,14);
      g.fillStyle='rgb('+(92+v)+','+(84+v)+','+(68+v)+')';
      g.beginPath();g.arc(x+4,y+4,3.4,0,6.29);g.fill();
      if(r.chance(.2)){g.fillStyle='rgba(200,190,160,.2)';g.fillRect(x+2,y+2,2,1);}
    }
    g.fillStyle='rgba(28,24,18,.55)';
    for(var yy=0;yy<64;yy+=8)g.fillRect(0,yy,64,1);
  },803,'#4e4636');
  GTEX['T']=gt(function(g){   // shaded loam under trees
    var r=new Rules.RNG(804);
    for(var i=0;i<420;i++){var x=r.int(0,63),y=r.int(0,63);
      g.fillStyle=r.chance(.3)?'rgba(60,88,48,.5)':'rgba('+(40+r.int(0,22))+','+(34+r.int(0,18))+','+(24+r.int(0,14))+',.6)';
      g.fillRect(x,y,2,1);}
  },804,'#233019');
  GTEX['n']=gt(function(g){
    var r=new Rules.RNG(805);
    for(var i=0;i<520;i++){var x=r.int(0,63),y=r.int(0,63);
      g.fillStyle=r.chance(.25)?'rgba(122,112,82,.5)':'rgba('+(58+r.int(0,36))+','+(66+r.int(0,34))+','+(40+r.int(0,22))+',.6)';
      g.fillRect(x,y,2,2);}
  },805,'#3a4028');
  GTEX['%']=gt(function(g){
    var r=new Rules.RNG(806);
    for(var i=0;i<420;i++){var x=r.int(0,63),y=r.int(0,63);
      g.fillStyle=r.chance(.3)?'rgba(70,110,96,.5)':'rgba('+(34+r.int(0,26))+','+(56+r.int(0,36))+','+(48+r.int(0,30))+',.6)';
      g.fillRect(x,y,2,1);}
    for(var w=0;w<7;w++){g.fillStyle='rgba(120,160,150,.18)';
      g.fillRect(r.int(0,50),r.int(0,60),r.int(6,14),1);}
  },806,'#27443a');
  GTEX['~']=GTEX['.'];
  GTEX['?']=GTEX['.'];
  GTEX['F']=GTEX['.'];
  GTEX['1']=GTEX['.'];
  return GTEX;
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
    var band=Math.min(12,Math.max(2,lh*.04));
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(px,y0+lh-band,colw+1,band);
    ctx.fillStyle='rgba(240,230,200,.05)';ctx.fillRect(px,y0,colw+1,Math.min(8,Math.max(1,lh*.02)));
  }
  /* ---------- cast-textured ground ---------- */
  var groundTexs=FLOORFAIL?null:groundTextures();
  if(!FLOORFAIL&&(!groundTexs['.']||!groundTexs['.'].data))FLOORFAIL=1;
  var dirX0=Math.cos(a0),dirY0=Math.sin(a0),tanH0=Math.tan(fov/2);
  var plX=-dirY0*tanH0,plY=dirX0*tanH0;
  var FH=Math.max(1,Math.ceil((h2-horizon)/2)),FW=Math.max(1,Math.ceil(w2/2));
  if(!FBUF||FBUF.W!==FW||FBUF.H!==FH){
    FBUF={W:FW,H:FH,can:document.createElement('canvas')};
    FBUF.can.width=FW;FBUF.can.height=FH;FBUF.ctx=FBUF.can.getContext('2d');
    FBUF.img=FBUF.ctx.createImageData(FW,FH);
  }
  if(!FBUF||!FBUF.img||!FBUF.img.data){FLOORFAIL=1;FBUF=null;}
  var fpx=FBUF&&!FLOORFAIL?FBUF.img.data:null;
  if(FBUF&&fpx){
  var fogR=outdoor?36:16,fogG=outdoor?40:17,fogB=outdoor?32:22;
  for(var fy=0;fy<FH;fy++){
    var sy=horizon+fy*2+1.5;
    var rowD=(h2*0.9)/(2*(sy-horizon));
    if(rowD>26)continue;
    var fog=Math.min(.9,rowD/15);
    var stepW=4/w2;
    var wxL=cx+(dirX0-plX)*rowD,wyL=cy+(dirY0-plY)*rowD;
    var dwx=(plX*2)*rowD*stepW,dwy=(plY*2)*rowD*stepW;
    var rowBase=fy*FW*4;
    for(var fx=0;fx<FW;fx++){
      var bx=fx*2;
      var zci=Math.floor(bx/colw);
      var za=rowBase+(fx<<2);
      if(zbuf[zci]!==undefined&&rowD>=zbuf[zci]-0.02){
        // ground behind a wall: deep shade at the contact line, thinning to haze
        var sh=Math.exp(-(rowD-zbuf[zci])*0.7);                  // 1 at the wall, ->0 beyond
        var shR=26+ (fogR-10)*(1-sh), shG=25+(fogG-10)*(1-sh), shB=23+(fogB-10)*(1-sh);
        fpx[za]=shR; fpx[za+1]=shG; fpx[za+2]=shB; fpx[za+3]=255;
        continue;
      }
      var wx=wxL+dwx*fx,wy=wyL+dwy*fx;
      var gx=Math.floor(wx),gy=Math.floor(wy);
      var ch=(gx>=0&&gy>=0&&gx<prep.w&&gy<prep.h)?prep.char[gy*prep.w+gx]:'?';
      var texG=groundTexs[ch]||groundTexs['?'];
      if(!texG)continue;
      var u=(wx-Math.floor(wx)),v=(wy-Math.floor(wy));
      var tx=(u*texG.width)|0,ty=((1-v)*texG.height)|0;   // texture up = away
      var td=texG.data,ti=((ty*texG.width+tx)<<2);
      var a=rowBase+(fx<<2);
      var mixf=fog;
      fpx[a]  =td[ti]  *(1-mixf)+fogR*mixf;
      fpx[a+1]=td[ti+1]*(1-mixf)+fogG*mixf;
      fpx[a+2]=td[ti+2]*(1-mixf)+fogB*mixf;
      fpx[a+3]=255;
    }
  }
  FBUF.ctx.putImageData(FBUF.img,0,0);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(FBUF.can,0,horizon,w2,h2-horizon);
  ctx.restore();}

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
