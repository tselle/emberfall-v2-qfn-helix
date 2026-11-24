/* Emberfall — js/view3d.js
 * View3D.init/prepare/render/minimap/figTex.
 * Software raycaster on Canvas 2D: DDA column cast with side shading and
 * distance fog, sky/floor fields outdoors. Textures, billboards and the
 * contact-shadow/mip refinements arrive with the rendering pass; the cast,
 * projection and prepared-cell contract are real. No game-rule effects. */
'use strict';
var View3D=(function(){
var cv=null,ctx=null,W=0,H=0;
var COLW=4;                       // column slice width in backing pixels

function init(canvas){cv=canvas;ctx=canvas.getContext('2d');W=cv.width;H=cv.height;}

/* prepare(mapDef) → packed renderer map (no game state touched). */
function prepare(mapDef){
  var g=mapDef.grid,h=g.length,w=g[0].length;
  var wall=new Uint8Array(w*h),out=new Uint8Array(w*h),char=new Array(w*h);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var c=g[y][x],i=y*w+x;
    char[i]=c;
    // solid cells: # H B (buildings) T F billboards-solid; regions use same fn
    wall[i]=(c==='#'||c==='H'||c==='B'||c==='T'||c==='F'||c==='^'||c==='~')?1:0;
    out[i]=(mapDef.outdoor||mapDef.safe||mapDef.overland)?1:0;
  }
  return {def:mapDef,w:w,h:h,wall:wall,out:out,char:char,
          solid:function(x,y){if(x<0||y<0||x>=w||y>=h)return true;return wall[y*w+x]===1;}};
}

/* Palette per wall char; secret doors must look like the surrounding wall. */
function wallColor(c,side,d,px,py){
  var r,g,b;
  switch(c){
    case 'B': r=96;g=78;b=64; break;        // brick
    case 'H': r=88;g=72;b=52; break;        // timber
    case 'D': case 'L': r=104;g=76;b=44; break; // doors
    case '^': r=88;g=92;b=100; break;       // mountain
    case '~': r=40;g=70;b=96; break;        // river
    case '=': case '+': r=110;g=100;b=84; break;
    default: r=118;g=112;b=98;              // stone '#'
  }
  if(c==='D'||c==='L'){if(((py*7+px*13)%38)<3&&(py%2)){r-=28;g-=22;b-=16;}}   // planks
  if(c==='H'&&(py%9)<1){r-=34;g-=28;b-=20;}
  if(c==='#'&&((px*17+py*31)%53)<4){r-=22;g-=22;b-=20;}                       // stone grain
  if(side)  {r*=.78;g*=.78;b*=.8;}
  var fog=Math.min(1,d/13);
  r=r*(1-fog)+13*fog; g=g*(1-fog)+14*fog; b=b*(1-fog)+19*fog;
  var n=1-Math.min(.35,d*.02);                                               // near darkening
  return 'rgb('+(r*n|0)+','+(g*n|0)+','+(b*n|0)+')';
}

/* cam: {x,y (tile floats), dir 0..3, planeHalf} render(scale) */
function render(prep,cam,scale){
  if(!ctx)return;
  scale=scale||1;
  var w2=Math.max(160,Math.floor(W*scale)),h2=Math.max(100,Math.floor(H*scale));
  var t0=performance.now();
  // sky/floor fields
  var horizon=h2/2;
  var sky=ctx.createLinearGradient(0,0,0,horizon);
  var outdoor=!!(prep.def.outdoor||prep.def.safe||prep.def.overland);
  if(outdoor){sky.addColorStop(0,'#2c3352');sky.addColorStop(1,'#5a4a44');}
  else{sky.addColorStop(0,'#0d0e13');sky.addColorStop(1,'#191b24');}
  ctx.fillStyle=sky;ctx.fillRect(0,0,w2,horizon);
  var flr=ctx.createLinearGradient(0,horizon,0,h2);
  if(outdoor){flr.addColorStop(0,'#40452f');flr.addColorStop(1,'#232619');}
  else{flr.addColorStop(0,'#26232a');flr.addColorStop(1,'#101014');}
  ctx.fillStyle=flr;ctx.fillRect(0,horizon,w2,h2-horizon);
  // camera
  var angs=[Math.PI/2*1,0,-Math.PI/2,Math.PI];      // dir 0=N,1=E,2=S,3=W (screen angle)
  var a0=(cam.ang!==undefined)?cam.ang:[ -Math.PI/2, 0, Math.PI/2, Math.PI][cam.dir]; // canvas-space facing (fractional while turning)
  var fov=1.15;
  var cx=cam.x,cy=cam.y;
  for(var px=0;px<w2;px+=COLW*scale|0||4){
    var camX=2*px/w2-1;
    var ra=a0+camX*fov/2;
    var rdx=Math.cos(ra),rdy=Math.sin(ra);
    // DDA
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
    if(!hit)continue;
    dist=side===0?(mapX-cx+(1-stepX)/2)/rdx:(mapY-cy+(1-stepY)/2)/rdy;
    if(dist<=0.01)dist=.01;
    var lh=Math.min(h2*2,h2/dist*0.9);
    var y0=(h2-lh)/2, y1=y0+lh;
    var wallH=Math.round(lh);
    // wall slice
    ctx.fillStyle=wallColor(c,side,dist,mapX,mapY);
    ctx.fillRect(px,y0,COLW*scale|0,wallH);
    // contact darkening at wall base & top edge
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.fillRect(px,y1-3,COLW*scale,3);
    ctx.fillStyle='rgba(255,255,255,.05)';
    ctx.fillRect(px,y0,COLW*scale,2);
  }
  // blit internal size to canvas backing if scaled
  return performance.now()-t0;
}

/* Grid minimap: explored mask only; marks per §9. */
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
    else if(c==='T')col='#25402a';
    else if(c==='.'){col=prep.out[y*prep.w+x]?'#2c3527':'#232631';}
    else if(c===','){col='#26301f';}
    else if(/[1-9]/.test(c))col='#b98a3a';
    else if(c==='G')col='#c8502c';
    else if(c==='D')col='#8a6a40';
    else if(c==='L')col='#a34a2a';
    else if(c==='<'||c==='>')col='#4a7fb0';
    else if(/[a-z]/.test(c))col='#5a5470';
    else if(/^[A-Z]$/.test(c))col='#c8a03c';
    mm.fillStyle=col;mm.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));
  }
  // party arrow
  if(camX>=0){
    mm.fillStyle='#e3b54a';
    var ax=ox+(camX+.5)*s,ay=oy+(camY+.5)*s;
    var adir=[ [0,-1],[1,0],[0,1],[-1,0] ][dir];
    mm.beginPath();
    mm.moveTo(ax+adir[0]*s,ay+adir[1]*s);
    mm.lineTo(ax-adir[1]*s*.6,ay+adir[0]*s*.6);
    mm.lineTo(ax+adir[1]*s*.6,ay-adir[0]*s*.6);
    mm.closePath();mm.fill();
  }
  return null;
}

function figTex(desc,key){return null;}   // billboard cache: rendering pass

return{init:init,prepare:prepare,render:render,minimap:minimap,figTex:figTex,COLW:COLW};
})();
