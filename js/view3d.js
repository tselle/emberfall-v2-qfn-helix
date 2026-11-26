/* Emberfall — js/view3d.js
 * View3D.init/resize/prepare/render/minimap/figTex.
 * Software raycaster on Canvas 2D: DDA column cast against the prepared
 * grid; walls, floor and ceiling all sample procedurally painted materials
 * (256² base, four mip levels, trilinear on the cast surfaces) chosen per map
 * by material set; a world-anchored 360° environment above the horizon; side
 * shading, distance fog and base contact darkening.
 * A per-column depth buffer clips billboarded entities — bands, treasure,
 * stairs — depth-sorted far to near. The cast runs natively in device pixels;
 * Look owns the backing-store size and the wall slice width, so the view is
 * sharp at any stage size instead of a stretched 1280×800 bitmap.
 * No game-rule effects. */
'use strict';
var View3D=(function(){
var cv=null,ctx=null,W=0,H=0,REC=null,K=1;
var TEX=128,TEXH=64;             // authored DESIGN grid every painter draws against
/* Every material is painted once into a TEXPX² raster with a four-level mip
   chain (base, /2, /4, /8). Painters keep their 128-unit coordinates because
   the context is scaled, so geometry scales for free while grain is painted at
   device resolution and therefore genuinely gains detail. Phones keep a 128²
   base so the atlas stays a couple of megabytes instead of a dozen. */
var TEXPX=256;
function texBaseSize(){
  // The quality tier is the affordability signal: 256² from `high` upward, 128²
  // below it. Built once, lazily, on the first frame — a tier nudge later on
  // changes slice width and cast budget but does not repaint the atlas, because
  // rebuilding a dozen materials mid-stroll would itself be a hitch.
  return (Look.tierIndex?Look.tierIndex():2)>=2?256:128;
}
function mipChain(c){                    // four levels, browser box-filtered
  var out=[c],src=c,w=TEXPX;
  for(var m=1;m<4;m++){
    var n=Math.max(8,w>>1);
    var cm=document.createElement('canvas');cm.width=n;cm.height=n;
    var gm=cm.getContext('2d');gm.imageSmoothingEnabled=true;
    try{gm.imageSmoothingQuality='high';}catch(e){}
    gm.drawImage(src,0,0,n,n);
    out.push(cm);src=cm;w=n;
  }
  return out;
}
/* Mip choice: the level closest to one texel per screen pixel, biased to the
   sharper side, so near masonry keeps its joints and far masonry stops shimmering. */
function pickMip(chain,px){
  var i=0;
  while(i<chain.length-1&&chain[i].width>px*1.4)i++;
  return chain[i];
}
var zbuf=null,zN=0;
var lastMs=0;

function init(canvas){
  cv=canvas;ctx=canvas.getContext('2d');
  resize();
}
/* Re-fit the backing store to the stage and the device. Cheap and idempotent;
 * render() also re-fits, so a resize mid-battle never draws at the old size. */
function resize(){
  REC=Look.fit(cv)||REC;
  if(!REC)return null;
  if(REC.virtual){            // stage hidden: paint against the current bitmap
    W=cv.width;H=cv.height;K=H/Look.REF_H;
  }else{W=REC.bw;H=REC.bh;K=REC.k;}
  return REC;
}

/* Open ground: whatever a street, a yard, a garden or a path is paved with, it is
   not a room. Used to keep an outdoor corner from being mistaken for a building. */
var OPENGROUND=',=+Tn%~. ';

/* Which tiles have a roof over them.
   Indoors the answer is all of them, which is what the renderer already assumes.
   On a village map the question is real: a shop is a walkable tile behind three
   walls, and unless something says so it is drawn as a courtyard with the night
   sky over its own plaster — which is the single biggest reason a town building
   reads as an interior instead of a building. So the grid is asked directly: a
   non-ground tile walled on three sides is a room, and gets a ceiling above it
   and the builders' floor beneath it. Overland maps get no roofs at all: there
   is nothing built on them, and a mountain corner is not a shrine's ceiling. */
function roofsFor(w,h,wall,out,char,mapDef){
  var roof=new Uint8Array(w*h);
  var outdoor=!!(mapDef.outdoor||mapDef.safe||mapDef.overland);
  if(!outdoor){roof.fill(1);return roof;}
  if(mapDef.overland)return roof;
  /* Gates stay open. A gate is a gap in a wall, not a room, and roofing one turns
     the road out of a village into a covered tunnel - which is exactly what the
     south gate of a generated village looked like until this was excluded. */
  var noRoof='GS';
  if(mapDef.exit)for(var ek in mapDef.exit)noRoof+=ek;
  /* A room is found by flooding it, not by counting a tile's neighbours.
     Counting neighbours worked while every shop was one tile deep and failed the
     moment one was two: the front half of a two-deep shop has only two walls
     beside it - the other side is its own back room - so it got no ceiling and
     the shop stood open to the sky above its own doorstep. So: flood the tiles
     that are neither wall nor open ground, and if what comes out is small, walled
     and reached by no more than a door or two, it is a room and it is roofed. */
  var seen=new Uint8Array(w*h),cells=[],stack=[];
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    var i=y*w+x;
    if(wall[i]||seen[i])continue;
    if(OPENGROUND.indexOf(char[i])>=0||noRoof.indexOf(char[i])>=0)continue;
    cells.length=0;cells.push(i);seen[i]=1;
    var doors=0,walls=0;
    for(var k=0;k<cells.length;k++){
      var c=cells[k],cx=c%w,cy=(c/w)|0;
      var nb=[cx+1,cy,cx-1,cy,cx,cy+1,cx,cy-1];
      for(var n=0;n<4;n++){
        var nx=nb[n*2],ny=nb[n*2+1];
        if(nx<0||ny<0||nx>=w||ny>=h){walls++;continue;}
        var j=ny*w+nx;
        if(wall[j]){walls++;continue;}
        if(OPENGROUND.indexOf(char[j])>=0||noRoof.indexOf(char[j])>=0){doors++;continue;}
        if(seen[j])continue;
        seen[j]=1;cells.push(j);
      }
    }
    // a yard, a warren or a marker in the middle of a street: not a room
    if(cells.length>30||doors>2||walls<cells.length)continue;
    /* A single tile needs three walls before it is a room: set into a wall line,
       flanked either side and closed behind. One wall at its back is a marker standing
       in a yard, and roofing one lays flagstone in the middle of a street - which is
       what Thornwick's churchyard did, a paved patch in the grass with nothing on it. */
    if(cells.length===1&&walls<3)continue;
    for(k=0;k<cells.length;k++)roof[cells[k]]=1;
  }
  return roof;
}

function prepare(mapDef){
  var g=mapDef.grid,h=g.length,w=g[0].length;
  var wall=new Uint8Array(w*h),out=new Uint8Array(w*h),char=new Array(w*h);
  for(var y=0;y<h;y++)for(var x=0;x<w;x++){
    // a row shorter than the first must not hand undefined to the renderer
    var c=x<g[y].length?g[y][x]:'#',i=y*w+x;
    char[i]=c;
    wall[i]=(c==='#'||c==='H'||c==='B'||c==='T'||c==='F'||c==='^'||c==='~')?1:0;
    out[i]=(mapDef.outdoor||mapDef.safe||mapDef.overland)?1:0;
  }
  var roof=roofsFor(w,h,wall,out,char,mapDef);
  var prep={def:mapDef,w:w,h:h,wall:wall,out:out,char:char,roof:roof,lights:null,
            doorW:null,doorRooms:null,
            solid:function(x,y){if(x<0||y<0||x>=w||y>=h)return true;return wall[y*w+x]===1;}};
  /* Doors first: the lamps and the goods are placed from the fronts. */
  var sd=shopDoors(prep);
  prep.doorW=sd.mask;prep.doorFaces=sd.faces;prep.doorRooms=sd.rooms;
  prep.lights=mapLights(w,h,wall,mapDef,sd.faces);
  prep.props=propsFor(prep);
  prep.props=prep.props.concat(fixturesFor(prep));   // the village's own furniture
  return prep;
}

/* ---- placed light sources -------------------------------------------------
   The map already says where a lamp belongs: a sconce goes on a wall that faces
   open ground, a brazier sits where passages meet. So the list is DERIVED from
   the map instead of hand-authored per level — every generated delve gets honest
   lighting for free. Deterministic from a tile hash, so a torch is in the same
   place every time you see the room, and capped so a huge keep does not pay for
   hundreds of them. `on` is the wall tile it hangs on (wall sconce), `x`/`y` the
   point the flame burns at, `rad` the world radius it reaches. */
function hashL(x,y,salt){
  var h=(x*73856093)^(y*19349663);
  var s=String(salt||'m');
  for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
  return (h>>>0)/4294967295;
}
/* Which faces of a service room are its front. A tile wearing a service letter is a
   door when one of its neighbours is open ground under the sky: that face looks out on
   the street, and a room that opens on the street has a door in it, not a hole. The
   mask makes those faces solid to the eye - the wall continues across the doorway and
   the goods behind it stay behind it - while the tile stays walkable, so the door is
   something you go through rather than something you admire. */
function shopDoors(prep){
  var w=prep.w,h=prep.h,mask=new Uint8Array(w*h),faces=[],rooms=[];
  var mapDef=prep.def;
  if(!mapDef||mapDef.overland||!mapDef.locs||!mapDef.grid)return {mask:mask,faces:faces,rooms:rooms};
  var NB=[[0,-1],[0,1],[-1,0],[1,0]];
  for(var k in mapDef.locs){
    if(k.length!==1)continue;
    var tiles=[],x,y;
    for(y=1;y<h-1;y++)for(x=1;x<w;x++)if(prep.char[y*w+x]===k)tiles.push([x,y]);
    if(!tiles.length)continue;
    var svc=(mapDef.locs[k]&&mapDef.locs[k].svc)||'',room=null;
    for(var i=0;i<tiles.length;i++)for(var j=0;j<4;j++){
      var nx=tiles[i][0]+NB[j][0],ny=tiles[i][1]+NB[j][1];
      if(nx<1||ny<1||nx>=w-1||ny>=h-1)continue;
      if(prep.solid(nx,ny)||prep.roof[ny*w+nx])continue;   // not street: an inner wall or the yard
      mask[tiles[i][1]*w+tiles[i][0]]=1;
      faces.push({x:tiles[i][0],y:tiles[i][1],dx:NB[j][0],dy:NB[j][1],svc:svc});
      if(!room)room={x:tiles[i][0],y:tiles[i][1],dx:NB[j][0],dy:NB[j][1],svc:svc,tiles:tiles};
    }
    if(room)rooms.push(room);
  }
  return {mask:mask,faces:faces,rooms:rooms};
}

/* What stands in each shop. Goods go against the back wall and along the sides. The
   board is set against the wall beside the door, not in front of it: it is there to be
   read from the street, and a board in the doorway only ever gets in the way. */
function propsFor(prep){
  var out=[],rooms=prep.doorRooms||[];
  if(!rooms.length)return out;
  var w=prep.w;
  function open(x,y){return x>=0&&y>=0&&x<w&&y<(prep.h)&&!prep.solid(Math.floor(x),Math.floor(y));}
  for(var i=0;i<rooms.length;i++){
    var room=rooms[i],door=[room.x,room.y],dx=room.dx,dy=room.dy,tiles=room.tiles;
    var back=null,bd=-1,t;
    for(t=0;t<tiles.length;t++){
      if(tiles[t][0]===door[0]&&tiles[t][1]===door[1])continue;
      var d=(tiles[t][0]-door[0])*dx+(tiles[t][1]-door[1])*dy;
      if(bd<0||d<bd){bd=d;back=tiles[t];}
    }
    if(!back)back=door;
    var kit=PROPS_FOR[room.svc]||['crate','barrel','stool'];
    var lx=dy!==0?1:0,ly=dx!==0?1:0;
    var bx=back[0]+0.5-dx*0.28,by=back[1]+0.5-dy*0.28;
    var slots=[[0,0],[lx*0.30,ly*0.30],[-lx*0.30,-ly*0.30]];
    for(t=0;t<kit.length&&t<slots.length;t++){
      var px=bx+slots[t][0],py=by+slots[t][1];
      if(!open(px,py))continue;
      out.push({x:px,y:py,spr:'prop:'+kit[t]});
    }
    /* The board stands on the pavement in front of the wall, off the door's centre, so
       it marks the entrance without ever standing in it. It is placed inside the street
       tile rather than part way into the next one, because half the shops in a village
       have a neighbour's wall there and the board quietly vanished. */
    var sx=door[0]+0.5+dx*0.90+lx*0.30,sy=door[1]+0.5+dy*0.90+ly*0.30;
    if(open(sx,sy))out.push({x:sx,y:sy,spr:'prop:sign'});
  }
  return out;
}

/* Where a village keeps its fixtures.
   A lane with nothing against its walls reads as scenery however good the walls are;
   a lane with a woodpile, a ladder and a water trough reads as somewhere people live.
   So the pieces are placed from what the map already claims: the smith gets an anvil at
   his door, the chapel a bench and a notice board, the dock crates and a barrel, the
   fountain square a bench, and the gate a finger post. The rest goes where there is a
   wall to stand against, kept apart so one street does not collect everything. Every
   fixture hugs its wall rather than sitting in the middle of the thoroughfare, since a
   billboard you walk through still looks like a doorway you failed to notice.
   Seeded from the map's own name, so the village is furnished the same way every visit. */
function fixturesFor(prep){
  var out=[],def=prep.def,g=def&&def.grid;
  if(!g||!g.length||def.overland)return out;
  var w=prep.w,h=prep.h,x,y,i,k;
  var rng=new Rules.RNG((hashL(0,0,def.id||'m')*0xFFFFFFFF)>>>0);
  var used={};
  for(i=0;i<(prep.props||[]).length;i++)
    used[((prep.props[i].y|0)*w)+(prep.props[i].x|0)]=1;
  var block='GS<>#HBTFL^~';
  if(def.exit)for(var ek in def.exit)block+=ek;
  if(def.locs)for(var lk in def.locs)if(lk.length===1)block+=lk;
  var NB=[[1,0],[-1,0],[0,1],[0,-1]];
  /* The map's own landmarks. A well dropped in the middle of a green will otherwise
     stand in front of the fountain that has always been there, and the viewer sees one
     water feature where the plan says two: the nearer billboard eats the further one. */
  var marks=[];
  for(y=0;y<h;y++)for(x=0;x<Math.min(w,g[y].length);x++)
    if('F'.indexOf(g[y][x])>=0)marks.push([x+0.5,y+0.5]);
  function clearOfMarks(tx,ty,rad){
    for(var q=0;q<marks.length;q++)
      if(Math.abs(marks[q][0]-tx-0.5)<rad&&Math.abs(marks[q][1]-ty-0.5)<rad)return false;
    return true;
  }
  function freeTile(tx,ty){
    if(tx<1||ty<1||tx>=w-1||ty>=h-1)return false;
    var c=g[ty].length>tx?g[ty][tx]:'#';
    if(block.indexOf(c)>=0||OPENGROUND.indexOf(c)<0)return false;
    if(prep.solid(tx,ty)||prep.roof[ty*w+tx])return false;   // fixtures stand in the open
    if(!clearOfMarks(tx,ty,1.6))return false;
    return !used[ty*w+tx];
  }
  function wallDir(tx,ty){for(var n=0;n<4;n++)if(prep.solid(tx+NB[n][0],ty+NB[n][1]))return n;return -1;}
  function claim(tx,ty,spr,open){
    var ox=0.5,oy=0.5,wd=open?-1:wallDir(tx,ty);
    if(wd>=0){ox+=NB[wd][0]*0.24;oy+=NB[wd][1]*0.24;}
    used[ty*w+tx]=1;
    out.push({x:tx+ox,y:ty+oy,spr:'prop:'+spr});
  }
  function nook(tx,ty,rad){
    var best=null,bd=1e9;
    for(var yy=Math.max(1,ty-rad);yy<=Math.min(h-2,ty+rad);yy++)
      for(var xx=Math.max(1,tx-rad);xx<=Math.min(w-2,tx+rad);xx++){
        if(!freeTile(xx,yy)||wallDir(xx,yy)<0)continue;
        var d=(xx-tx)*(xx-tx)+(yy-ty)*(yy-ty);
        if(d<bd){bd=d;best=[xx,yy];}
      }
    return best;
  }
  function findChar(chars){
    /* Every settlement keeps its gate in its own outer wall, so this scan has to run
       over the boundary rows too; skipping them finds nothing, everywhere. */
    for(var yy=0;yy<h;yy++)for(var xx=0;xx<Math.min(w,g[yy].length);xx++)
      if(chars.indexOf(g[yy].charAt(xx))>=0)return [xx,yy];
    return null;
  }
  /* The parish well: it wants open ground with room to stand, and the middle of the
     settlement rather than a corner. */
  var best=null,bs=-1e9,mx=(w-1)/2,my=(h-1)/2;
  for(y=1;y<h-1;y++)for(x=1;x<w-1;x++){
    if(!freeTile(x,y))continue;
    var op=0;for(var n2=0;n2<4;n2++)if(!prep.solid(x+NB[n2][0],y+NB[n2][1]))op++;
    if(op<3)continue;
    var sc=op*8-Math.abs(x-mx)-Math.abs(y-my);
    if(sc>bs){bs=sc;best=[x,y];}
  }
  if(best)claim(best[0],best[1],'well',true);
  var anchors=[['b',['anvil','barrel']],['c',['bench','board']],['d',['crate','barrel']],
               ['F',['bench','trough']],['G',['signpost']]];
  function freeNear(tx,ty,rad){            // some things belong out in the open
    var best=null,bd=1e9;
    for(var yy=Math.max(1,ty-rad);yy<=Math.min(h-2,ty+rad);yy++)
      for(var xx=Math.max(1,tx-rad);xx<=Math.min(w-2,tx+rad);xx++){
        if(!freeTile(xx,yy))continue;
        var d=(xx-tx)*(xx-tx)+(yy-ty)*(yy-ty);
        if(d<bd){bd=d;best=[xx,yy];}
      }
    return best;
  }
  for(i=0;i<anchors.length;i++){
    var at=findChar(anchors[i][0]);
    if(!at)continue;
    var kit=anchors[i][1];
    for(k=0;k<kit.length;k++){
      /* A sign post at a gate stands out in the yard, where there is no wall to lean
         against and no sense in looking for one; anything else would rather be against
         the building it serves. */
      var nk=nook(at[0],at[1],2+k)||freeNear(at[0],at[1],3+k);
      if(nk)claim(nk[0],nk[1],kit[k],wallDir(nk[0],nk[1])<0);
    }
  }
  /* The lane itself. Candidates get a seeded key and the best few are taken, kept
     clear of everything already standing. */
  var dressing=['woodpile','ladder','haystack','trough','cart','stocks','board','bench','barrel'],
      cand=[];
  for(y=1;y<h-1;y++)for(x=1;x<w-1;x++)
    if(freeTile(x,y)&&wallDir(x,y)>=0)cand.push([x,y,rng.next()]);
  cand.sort(function(a,b){return b[2]-a[2];});
  var want=5+rng.int(0,2),got=0;
  for(i=0;i<cand.length&&got<want;i++){
    var c2=cand[i],far=true;
    for(k=0;k<out.length;k++)
      if(Math.abs(out[k].x-c2[0]-0.5)<1.8&&Math.abs(out[k].y-c2[1]-0.5)<1.8){far=false;break;}
    if(!far)continue;
    claim(c2[0],c2[1],dressing[(got+rng.int(0,1))%dressing.length],false);
    got++;
  }
  return out;
}

function mapLights(w,h,wall,def,doorFaces){
  var out=[],salt=(def&&def.id)||'m';
  /* Density is set by area, not by a per-cell coin flip. A rate is easier to write
     and impossible to predict: the same number gave a crypt two lamps and a cellar
     nine, so the rooms that needed light most were the ones that got none. Instead:
     every wall face is a candidate, and the ones whose hash comes up highest fill
     the map's quota. */
  var spacing=def&&def.mat==='hall'?8:def&&def.mat==='town'?8:def&&def.mat==='crypt'?13:
              def&&def.mat==='keep'?11:def&&def.mat==='mine'?10:10;
  if(def&&def.overland)spacing=42;
  var cand=[],open=0,x,y,i;
  for(y=1;y<h-1;y++)for(x=1;x<w-1;x++){
    i=y*w+x;
    if(!wall[i]){open++;continue;}
    var dirs=[];
    if(!wall[i-1])dirs.push([1,0]);
    if(!wall[i+1])dirs.push([-1,0]);
    if(!wall[i-w])dirs.push([0,1]);
    if(!wall[i+w])dirs.push([0,-1]);
    if(!dirs.length)continue;
    /* A brazier needs room to stand, but requiring three open faces in a warren of
       corridors means it never appears at all. */
    cand.push({x:x,y:y,d:dirs.length>=2&&hashL(x,y,salt+'b')>0.62?1:0,n:dirs,h:hashL(x,y,salt)});
  }
  cand.sort(function(a,b){return b.h-a.h;});
  var quota=Math.max(2,Math.min(26,Math.round(open/spacing)));
  for(i=0;i<cand.length&&out.length<quota;i++){
    var c=cand[i];
    // a sconce burns just off the wall it hangs on; a brazier stands on open ground
    var off=c.d?0.0:0.30;
    var d=c.n[(hashL(c.x,c.y,salt+'d')*c.n.length)|0];
    out.push({x:c.x+0.5+d[0]*(1+off),y:c.y+0.5+d[1]*(1+off),
              on:[c.x,c.y],floor:!!c.d,
              i:c.d?1.05:0.82,rad:c.d?5.6:4.4,
              fl:c.d?0.10:0.13});
  }
  /* A lamp burns beside every shopfront door. Not decoration: a door you cannot make
     out is a wall you cannot read, and light is how a place says it is open. It hangs
     on the street side of the wall by the jamb, so the pavement in front of a shop is
     the brightest ground in the lane and the light has somewhere to come from. Driven
     off the door faces, so generated villages get theirs for free. */
  if(doorFaces&&doorFaces.length){
    for(var fi=0;fi<doorFaces.length;fi++){
      var DF=doorFaces[fi],llx=DF.dy!==0?1:0,lly=DF.dx!==0?1:0;
      var lpx=DF.x+0.5+DF.dx*0.52+llx*0.34,lpy=DF.y+0.5+DF.dy*0.52+lly*0.34;
      var ltx=lpx|0,lty=lpy|0;
      if(ltx<0||lty<0||ltx>=w||lty>=h||wall[lty*w+ltx])continue;   // a lamp needs air to hang in
      out.push({x:lpx,y:lpy,on:[DF.x,DF.y],floor:0,i:0.95,rad:3.4,fl:0.16});
    }
  }
  return out;
}

/* ================= procedural wall textures ================= */
var TEXCACHE=null,CTEX=null;
/* A painter that throws used to vanish into `return null`, and the wall quietly drew
   generic masonry instead: the only symptom was a picture that looked merely dull.
   Every failure is recorded here and reported on the console, because a missing texture
   is otherwise indistinguishable from a bad design choice. */
var TEXFAIL=[];
function buildTextures(){
  if(TEXCACHE)return TEXCACHE;
  TEXPX=texBaseSize();
  GTEX=null;CTEX=null;               // ground and ceilings share the raster size
  TEXCACHE={};
  function tile(painter){
    try{
      var SC=TEXPX/TEX;
      var c0=document.createElement('canvas');c0.width=TEXPX;c0.height=TEXPX;
      var g0=c0.getContext('2d');g0.setTransform(SC,0,0,SC,0,0);
      painter(g0,TEX);
      return mkTex(c0);
    }catch(e){
      var rec={painter:Object.keys(TEXCACHE).length,keySoFar:Object.keys(TEXCACHE).join(''),
               error:String(e&&e.message||e)};
      TEXFAIL.push(rec);
      if(window.console&&console.warn)console.warn('Emberfall: texture painter failed',rec);
      return null;
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
  /* A shopfront, painted as one face: the wall continues across the whole tile and the
     door is cut into it. This is what a traveller reads from the lane - a closed leaf
     with a lit window beside it and a beam over its head - and it is also what makes a
     building an enclosed thing rather than a shelter: with no face across the opening,
     the ceiling of the room starts at the street line and every shop looks like a carport.
     v runs down from the wall head, so the door head sits at 0.31 of the storey. */
  TEXCACHE['*']=tile(function(g){
    var S=TEX/64;                                     // paint in 64-unit terms, fill the grid
    grain(g,'#c9bb9d',14,77);
    var r=new Rules.RNG(7777);
    for(var i=0;i<40;i++){g.fillStyle='rgba(116,98,70,'+(0.05+r.chance(.5)?.07:.03)+')';
      g.beginPath();g.arc(r.int(0,TEX),r.int(0,TEX),r.int(5,14),0,6.29);g.fill();}
    g.save();g.scale(S,S);
    function beam(x,y,w,h){g.fillStyle='#38281a';g.fillRect(x,y,w,h);
      g.fillStyle='rgba(96,70,40,.85)';g.fillRect(x,y+1,w,1);
      g.fillStyle='rgba(12,8,4,.65)';g.fillRect(x,y+h-1,w,1);}
    beam(0,0,64,4);beam(0,60,64,4);                   // wall head and base
    beam(3,0,4,64);beam(56,0,4,64);                   // corner posts
    // weather streaks under the wall head
    g.fillStyle='rgba(70,56,36,.22)';
    for(var sx=12;sx<52;sx+=9)g.fillRect(sx,5,3,r.int(6,14));
    /* the shop window: lit glass, oak frame, mullions, a stone sill */
    var WX=38,WY=25,WW=21,WH=18;
    var rg=g.createRadialGradient(WX+WW*0.5,WY+WH*0.55,1,WX+WW*0.5,WY+WH*0.55,WW*0.95);
    rg.addColorStop(0,'rgba(252,206,132,.98)');rg.addColorStop(0.55,'rgba(214,148,70,.92)');
    rg.addColorStop(1,'rgba(112,68,34,.92)');
    g.fillStyle=rg;g.fillRect(WX,WY,WW,WH);
    g.fillStyle='rgba(60,36,14,.55)';g.fillRect(WX,WY+WH*0.62,WW,WH*0.38);  // goods in the window
    g.fillStyle='#2f2116';
    g.fillRect(WX+WW/2-0.8,WY,1.6,WH);g.fillRect(WX,WY+WH/2-0.8,WW,1.6);    // mullions
    beam(WX-2,WY-3,WW+4,3);beam(WX-2,WY+WH,WW+4,3);
    beam(WX-2,WY-3,3,WH+6);beam(WX+WW-1,WY-3,3,WH+6);
    g.fillStyle='#7d6a4e';g.fillRect(WX-3,WY+WH+3,WW+6,3);                  // sill
    /* the door: planked, braced, ironed, with a small glazed quarter light */
    var DX=12,DY=20,DW=22,DH=59-DY;   // leaf reaches the threshold at 0.92 of the storey
    beam(DX-2,DY-4,DW+4,4);                                                // lintel over the head
    g.fillStyle='#4a3421';g.fillRect(DX,DY,DW,DH);
    for(var p=0;p<4;p++){                                                  // vertical boards
      var pv=r.int(-10,10);
      g.fillStyle='rgb('+(82+pv)+','+(58+pv*0.7|0)+','+(36+pv*0.5|0)+')';
      g.fillRect(DX+1+p*(DW-2)/4,DY+1,(DW-2)/4-1,DH-2);
      g.fillStyle='rgba(16,10,4,.55)';g.fillRect(DX+p*(DW-2)/4,DY,1,DH);
    }
    g.fillStyle='#3a2818';g.fillRect(DX+1,DY+DH*0.42,DW-2,3);              // brace rail
    g.save();g.translate(DX+2,DY+DH-3);g.rotate(-0.62);
    g.fillStyle='#3a2818';g.fillRect(0,0,DW*0.8,3);g.restore();            // diagonal brace
    g.fillStyle='#2a2118';
    g.fillRect(DX+1,DY+6,DW*0.55,2.4);g.fillRect(DX+1,DY+DH*0.62,DW*0.6,2.4);  // iron straps
    g.fillStyle='#8d8478';g.beginPath();g.arc(DX+DW-4,DY+DH*0.5,1.9,0,6.29);g.fill();
    g.fillStyle='#5a5248';g.beginPath();g.arc(DX+DW-4,DY+DH*0.5,1,0,6.29);g.fill();
    // quarter light in the door head, glowing
    var QX=DX+DW*0.28,QY=DY+3,QW=DW*0.44,QH=6;
    g.fillStyle='rgba(248,198,120,.95)';g.fillRect(QX,QY,QW,QH);
    g.fillStyle='#2f2116';g.fillRect(QX+QW/2-0.7,QY,1.4,QH);
    g.fillStyle='#38281a';g.fillRect(QX-1.5,QY-1.5,QW+3,1.5);g.fillRect(QX-1.5,QY+QH,QW+3,1.5);
    g.fillRect(QX-1.5,QY-1.5,1.5,QH+3);g.fillRect(QX+QW,QY-1.5,1.5,QH+3);
    // jamb posts either side of the leaf
    beam(DX-3,DY-1,3,DH+1);beam(DX+DW,DY-1,3,DH+1);
    g.fillStyle='#6d6255';g.fillRect(DX-1,59,DW+2,3);                       // threshold stone
    g.fillStyle='rgba(252,196,120,.16)';g.fillRect(DX,DY,DW,DH);            // light past the leaf
    g.restore();
  });
  /* A fountain. The grid has always had a character for it, and until now it drew the
     same anonymous masonry as a cellar wall: a fountain is a public thing, standing in
     a square, and you should know what you have walked into from the far side of the
     green. Basin courses, a thick rim, wet stone, and a pillar with a spout whose
     water falls back into the dark. */
  /* A fountain. The grid has always had a character for it, and until now it drew the
     same anonymous masonry as a cellar wall.
     The catch is that this engine has one wall height, and this tile is a wall: a real
     open basin cannot be modelled here, and a basin painted at the foot of a full-height
     face reads as a decorative band on a slab. So it is built as what a town of this
     size would actually raise over its public water: a stone pump-house, basin at the
     foot where the water goes, trough and wet stone below, and a shingled roof and
     finial above, so the whole height of the face is a building rather than a plinth. */
  TEXCACHE['F']=tile(function(g){
    var S=TEX/64;
    grain(g,'#8d8778',12,41);
    var r=new Rules.RNG(4141);
    g.save();g.scale(S,S);
    // the body: coursed, dressed stone
    for(var y=16;y<62;y+=7){
      var off=(Math.floor(y/7)%2)*7;
      for(var x=off-6;x<64;x+=15){
        var v=r.int(-14,14);
        g.fillStyle='rgb('+(144+v)+','+(138+v)+','+(124+v)+')';
        g.fillRect(x+1,y+1,13,5);
        g.fillStyle='rgba(30,28,22,.5)';g.fillRect(x,y,1,6);
      }
    }
    // roof: a steep shingle cap with a finial, so the head of the face is a roof
    g.fillStyle='#4a3526';g.beginPath();g.moveTo(30,1);g.lineTo(63,17);g.lineTo(1,17);
    g.closePath();g.fill();
    for(var sy=5;sy<17;sy+=3){
      var inset=(sy-1)*1.85;
      g.fillStyle=sy%6<3?'rgba(88,64,44,.9)':'rgba(58,42,28,.9)';
      g.fillRect(1+inset,sy,62-inset*2,2.2);
    }
    g.fillStyle='#2c2016';g.fillRect(0,16,64,2.6);                 // eaves
    g.fillStyle='#8b8577';g.fillRect(30,0,3,5);                      // finial stalk
    g.fillStyle='#c9b06a';g.beginPath();g.arc(31.5,2.4,2.2,0,6.29);g.fill();
    /* The recess where the water stands. Kept well above black: a niche dark enough to
       read as depth on a swatch is a hole in the wall at three paces, and the whole
       point of the porch is that you can see the pillar and the water inside it. */
    g.fillStyle='#5a5145';g.fillRect(14,20,36,22);
    g.fillStyle='#494137';g.fillRect(14,20,36,3);                      // head shadow
    g.fillStyle='#6c6252';g.fillRect(14,38,36,4);                      // the sill it stands on
    g.fillStyle='#37312a';g.fillRect(12,19,40,2);g.fillRect(12,19,2,24);g.fillRect(50,19,2,24);
    /* The lintel the porch is cut under, with corbels at its ends. A struck semicircle
       here wants a radius the porch does not have: it lands on the roof and reads as a
       rainbow over the building rather than stone carrying stone. */
    g.fillStyle='#9d9482';g.fillRect(11,17,42,3);
    g.fillStyle='#b5ac97';g.fillRect(11,17,42,1);
    g.fillStyle='rgba(30,26,20,.45)';g.fillRect(11,20,42,1.4);
    g.fillStyle='#8f8878';g.fillRect(9,15,5,7);g.fillRect(50,15,5,7);   // corbels
    g.fillStyle='#a8a08e';g.fillRect(9,15,5,1.4);g.fillRect(50,15,5,1.4);
    // pillar, spout and the thread of water falling to the basin
    g.fillStyle='#b3ab96';g.fillRect(29,26,6,14);
    g.fillStyle='#cdc5ae';g.fillRect(29,26,6,2);g.fillRect(29,26,1.6,14);
    g.fillStyle='#7d766a';g.fillRect(27,24,10,3);
    g.fillStyle='rgba(214,232,238,.8)';g.fillRect(31,28,2,12);
    g.fillStyle='rgba(214,232,238,.3)';g.fillRect(30,40,4,2);
    // the basin: a thick rim with water in it, catching the sky
    g.fillStyle='#a8a08d';g.fillRect(4,40,56,6);
    g.fillStyle='#c6bea9';g.fillRect(4,40,56,2);
    g.fillStyle='#25404a';g.fillRect(7,42,50,4);
    g.fillStyle='rgba(132,172,188,.55)';g.fillRect(9,43,46,1.6);
    g.fillStyle='rgba(200,218,226,.4)';g.fillRect(16,44,12,1.2);g.fillRect(38,44,9,1);
    g.fillStyle='rgba(38,34,26,.6)';g.fillRect(4,45,56,2);
    // the overflow trough and the wet stone below it, with moss at the waterline
    g.fillStyle='#8f8878';g.fillRect(8,50,48,7);
    g.fillStyle='#ada592';g.fillRect(8,50,48,2);
    g.fillStyle='rgba(40,58,62,.38)';g.fillRect(18,46,28,16);
    g.fillStyle='rgba(72,96,58,.5)';
    for(var mx=6;mx<58;mx+=5)if(r.chance(.5))g.fillRect(mx,r.int(46,56),r.int(2,4),r.int(2,5));
    // and the square's own paving at the foot
    g.fillStyle='rgba(96,88,72,.55)';g.fillRect(0,58,64,6);
    g.fillStyle='rgba(152,144,124,.45)';
    for(var px=0;px<64;px+=11)g.fillRect(px,59,9,2);
    g.restore();
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
    // a lamp-lit pane: bright enough that the emissive mask keeps it warm at
    // range instead of letting the air wash it out to the haze colour
    g.fillStyle='rgba(240,190,110,.92)';g.fillRect(26,14,12,10);
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
  TEXCACHE['C']=tile(function(g){   // crypt: pale ashlar, carved string course, cellar lichen
    grain(g,'#4d4b52',18,181);
    var r=new Rules.RNG(182);
    for(var y=0;y<TEX;y+=26){
      var off=(Math.floor(y/26)%2)*13+r.int(-1,1);
      for(var x=off;x<TEX;x+=32+r.int(0,5)){
        var v=r.int(-13,13);
        g.fillStyle='rgb('+(84+v)+','+(82+v)+','+(88+v)+')';
        g.fillRect(x+1,y+1,30,24);
      }
    }
    g.fillStyle='rgba(20,20,26,.66)';
    for(var y2=0;y2<TEX;y2+=26)g.fillRect(0,y2,TEX,2);
    g.fillStyle='rgba(198,190,166,.13)';g.fillRect(0,11,TEX,4);
    g.fillStyle='rgba(112,126,92,.20)';
    var rl=new Rules.RNG(183);
    for(var i=0;i<22;i++)g.fillRect(rl.int(0,TEX-8),rl.int(TEX-44,TEX),rl.int(3,9),rl.int(6,38));
    g.strokeStyle='rgba(56,52,62,.5)';g.lineWidth=2;
    g.beginPath();g.moveTo(46,74);g.arc(58,74,12,Math.PI,0);g.stroke();
  });
  TEXCACHE['R']=tile(function(g){   // cave and mine: hacked rock, no courses at all
    grain(g,'#574d42',26,211);
    var r=new Rules.RNG(212);
    for(var i=0;i<30;i++){                       // wedged facets
      var x=r.int(0,TEX),y=r.int(0,TEX),w=r.int(9,28),h=r.int(7,21),v=r.int(-18,18);
      g.fillStyle='rgba('+(92+v)+','+(82+v)+','+(70+v)+',.5)';
      g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y+r.int(-4,7));g.lineTo(x+r.int(2,w),y+h);g.closePath();g.fill();
    }
    g.strokeStyle='rgba(15,12,9,.62)';g.lineWidth=2;
    for(var k=0;k<16;k++){                       // deep cracks
      var sx=r.int(0,TEX),sy=r.int(0,TEX);
      g.beginPath();g.moveTo(sx,sy);
      for(var st=0;st<4;st++)g.lineTo(sx+r.int(-18,18),sy+r.int(4,22));
      g.stroke();
    }
    g.fillStyle='rgba(18,15,12,.34)';g.fillRect(0,TEX-14,TEX,14);
  });
  TEXCACHE['K']=tile(function(g){   // keep: fine ashlar with a mason's mark
    grain(g,'#8a8274',16,241);
    var r=new Rules.RNG(242);
    for(var y=0;y<TEX;y+=16){
      var off=(Math.floor(y/16)%2)*12;
      for(var x=off;x<TEX;x+=24){
        var v=r.int(-11,11);
        g.fillStyle='rgb('+(146+v)+','+(138+v)+','+(124+v)+')';
        g.fillRect(x+1,y+1,22,14);
      }
    }
    g.fillStyle='rgba(38,34,30,.6)';
    for(var y2=0;y2<TEX;y2+=16)g.fillRect(0,y2,TEX,1.6);
    g.fillStyle='rgba(255,251,238,.10)';
    for(var y3=0;y3<TEX;y3+=16)g.fillRect(0,y3+1.6,TEX,1.2);
    g.strokeStyle='rgba(52,46,40,.55)';g.lineWidth=2;
    g.beginPath();g.moveTo(52,62);g.lineTo(64,46);g.lineTo(76,62);g.moveTo(58,56);g.lineTo(70,56);g.stroke();
    g.fillStyle='rgba(20,17,14,.16)';g.fillRect(0,TEX-14,TEX,14);
  });
  TEXCACHE['i']=tile(function(g){   // the inside of a wall: lime wash over lath, no windows
    grain(g,'#a2988a',18,29);
    var r=new Rules.RNG(9091);
    for(var i=0;i<20;i++){g.fillStyle='rgba(70,62,50,'+(0.04+r.chance(.5)?.05:.02)+')';
      g.beginPath();g.arc(r.int(0,TEX),r.int(0,TEX),r.int(4,11),0,6.29);g.fill();}
    // soot creeping down from the joists, darker than any street facade
    for(var x=0;x<TEX;x+=17){
      var grd=g.createLinearGradient(0,0,0,TEX*0.55);
      grd.addColorStop(0,'rgba(36,29,21,.38)');grd.addColorStop(1,'rgba(36,29,21,0)');
      g.fillStyle=grd;g.fillRect(x,0,6+r.int(0,8),TEX*0.55);
    }
    // the scantling behind the wash, just legible
    g.strokeStyle='rgba(88,74,54,.26)';g.lineWidth=1;
    for(var x2=8;x2<TEX;x2+=34){g.beginPath();g.moveTo(x2,6);g.lineTo(x2,TEX-11);g.stroke();}
    // wainscot and the dark line where wall meets boards
    g.fillStyle='#2e2317';g.fillRect(0,TEX-8,TEX,8);
    g.fillStyle='rgba(126,100,64,.5)';g.fillRect(0,TEX-8,TEX,1);
    g.fillStyle='rgba(16,12,9,.4)';g.fillRect(0,TEX-2,TEX,2);
  });
  /* Secret doors are indistinguishable from their wall, which is the entire point.
     Fountains are NOT: the grid has always had a character for the town's public water
     and this line used to paste anonymous masonry over it, which is why a fountain
     looked like a garden wall no matter what was painted for it. */
  TEXCACHE['S']=TEXCACHE['#'];       // secret doors look like their wall
  return TEXCACHE;
}
function texFor(c){
  var t=buildTextures();
  return t[c]||t['#'];
}

function mkTex(c0){
  var ch=mipChain(c0);
  return {full:ch[0],mip:ch[1],chain:ch,base:c0,vars:[],
          emit:emitColumns(ch[0].getContext('2d').getImageData(0,0,TEXPX,TEXPX))};
}
/* Same stone, different weathering. A facade that repeats tile for tile is the
   fastest way to make a hand-painted world look like a spreadsheet, and the fix
   must not be "more art": copy the base and lay seeded weathering over it —
   damp washes, pale bloom, water streaks under the sill. Built LAZILY, one per
   material per first sighting, so a map that never shows a mine never pays for a
   weathered mine. */
function variantOf(t,seed){
  if(!t||!t.base)return t;
  var v=t.vars[seed];
  if(v)return v;
  try{
    var c=document.createElement('canvas');
    c.width=t.base.width;c.height=t.base.height;
    var g=c.getContext('2d');
    g.drawImage(t.base,0,0);
    var r=new Rules.RNG(9001+seed*7717);
    var CW=c.width,CHh=c.height,i;
    /* Kept deliberately faint. Weathering strong enough to admire on a 256² swatch
       is strong enough to read as blob-brush dirt when stretched over a wall three
       steps away — the difference between a facade that has lived and one that has
       been painted with stains. */
    for(i=0;i<11;i++){                      // large washes: damp dark, efflorescent pale
      var wx=r.int(0,CW),wy=r.int(0,CHh),rad=r.int(CW*0.05,CW*0.20);
      var damp=r.chance(.62);
      var al=damp?0.075:0.045;
      var gr=g.createRadialGradient(wx,wy,0,wx,wy,rad);
      gr.addColorStop(0,damp?'rgba(9,8,6,'+al.toFixed(3)+')'
                            :'rgba(216,210,188,'+al.toFixed(3)+')');
      gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.beginPath();g.arc(wx,wy,rad,0,6.29);g.fill();
    }
    for(i=0;i<6;i++){                       // streaks running down from the top
      var sx=r.int(0,CW),len=r.int(CHh*0.18,CHh*0.62);
      g.fillStyle='rgba(16,13,10,'+(0.028+r.chance(.5)*0.034).toFixed(3)+')';
      g.fillRect(sx,0,Math.max(1,CW*0.010),len);
    }
    for(i=0;i<6;i++){                       // scuffs along the base
      var bx=r.int(0,CW),by=r.int(CHh*0.72,CHh*0.97);
      g.fillStyle='rgba(0,0,0,.055)';
      g.beginPath();g.ellipse(bx,by,r.int(CW*0.02,CW*0.07),r.int(2,CHh*0.03),0,0,6.29);g.fill();
    }
    v=mkTex(c);v.base=null;                  // variants do not spawn variants
    t.vars[seed]=v;return v;
  }catch(e){return t;}
}
function grain(g,base,jit,seed){
  var r=new Rules.RNG(seed);
  g.fillStyle=base;g.fillRect(0,0,TEX,TEX);
  var SC=TEXPX/TEX,sz=TEX/TEXPX,n=Math.round(900*SC*SC);   // speckle density is per area, not per texture
  for(var i=0;i<n;i++){
    var x=r.int(0,TEX-sz),y=r.int(0,TEX-sz),v=r.int(-jit,jit);
    g.fillStyle='rgba('+(v>0?255:0)+','+(v>0?255:0)+','+(v>0?255:0)+','+(Math.abs(v)/300)+')';
    g.fillRect(x,y,sz,sz);
  }
}

/* ---- what a wall character LOOKS like in this particular building. The same
   '#' is brick in a cellar, crypt ashlar under a barrow, hacked rock in a mine.
   Explicit def.mat wins; otherwise the map's own name says what it is. */
var MATS={
  town:{id:'town',wall:{'#':'#','H':'H','B':'B','^':'^','~':'~'},interior:'i',ceil:'plaster',floor:{'.':'plank'}},
  cellar:{id:'cellar',wall:{'#':'B','H':'B','B':'B','^':'R','~':'R'},ceil:'beams',floor:{'.':'slab','D':'slab','L':'slab'}},
  crypt:{id:'crypt',wall:{'#':'C','H':'C','B':'C','^':'R','~':'R'},ceil:'crypt',floor:{'.':'cryptslab','D':'cryptslab','L':'cryptslab'}},
  mine:{id:'mine',wall:{'#':'R','H':'K','B':'K','^':'R','~':'R'},ceil:'rock',floor:{'.':'earth','D':'earth','L':'earth'}},
  keep:{id:'keep',wall:{'#':'K','H':'H','B':'B','^':'R','~':'~'},ceil:'plaster',floor:{'.':'flag','D':'flag','L':'flag'}},
  hall:{id:'hall',wall:{'#':'K','H':'H','B':'B','^':'R','~':'~'},ceil:'beams',floor:{'.':'plank','D':'plank','L':'plank'}},
  wild:{id:'wild',wall:{'#':'#','H':'T','B':'#','^':'^','~':'~'},ceil:null}
};
var MATCACHE=new WeakMap();
function materialFor(def,id){
  if(!def)return MATS.town;
  var hit=MATCACHE.get(def);
  if(hit!==undefined)return hit;
  var out=def.mat?MATS[def.mat]:null;
  if(!out){
    var t=((id||'')+' '+(def.name||'')+' '+(def.locName||'')).toLowerCase();
    if(/cellar|brewery|sewer|crypt|tomb|barrow|ossuar|charnel|catacomb/.test(t))
      out=MATS[/cellar|brewery|sewer/.test(t)?'cellar':'crypt'];
    else if(/mine|tunnel|quarry|underdark|cave|delve|warren/.test(t))out=MATS.mine;
    else if(/keep|hold|citadel|bastion|tower|castle/.test(t))out=MATS.keep;
    else if(/hall|longhouse|barrack|mess|yard/.test(t))out=MATS.hall;
    else if(def.overland)out=MATS.wild;
    else out=/thornwick|town|village|street|market|gate|square/.test(t)?MATS.town:MATS.crypt;
  }
  MATCACHE.set(def,out);
  return out;
}
/* ---- ONE lighting and haze model ------------------------------------------------
   Everything the eye receives is described by a single distance response:

       lit  = 1 / (1 + d²k)     light that reached you
       airT = 1 − lit           air that got in the way

   A wall, a floor tile and a roof plank at the same distance therefore converge on
   the same colour, which is the difference between a torch-lit room and three
   unrelated fog recipes stapled together. Light is warm and falls off; the air
   takes over. Each theme carries its own air and its own shadow floor, so nothing
   crushes to pure black. k is the density: outdoor air is thin, underground air is
   thick. Outdoor air at dusk genuinely glows, so its haze is bright. Underground,
   the air is the absence of light: it is dark and merely tinted — damp brown in a
   cellar, cold violet under a barrow, blue-green in a worked mine. amb is the
   fill that keeps a corner from crushing to pure black. */
var ATMOS={
  town:{hr:126,hg:104,hb:104,k:0.0042,roof:1.00,amb:0.30,sr:36,sg:36,sb:42},
  wild:{hr:122,hg:106,hb:100,k:0.0040,roof:1.00,amb:0.32,sr:34,sg:36,sb:40},
  cellar:{hr:44,hg:40,hb:41,k:0.0200,roof:0.66,amb:0.07,sr:18,sg:17,sb:18},
  crypt:{hr:46,hg:44,hb:56,k:0.0180,roof:0.62,amb:0.07,sr:18,sg:17,sb:24},
  mine:{hr:38,hg:48,hb:47,k:0.0220,roof:0.60,amb:0.06,sr:16,sg:20,sb:20},
  keep:{hr:50,hg:47,hb:44,k:0.0160,roof:0.68,amb:0.08,sr:20,sg:19,sb:17},
  hall:{hr:56,hg:44,hb:34,k:0.0170,roof:0.66,amb:0.08,sr:22,sg:18,sb:15}
};
function atmosphereFor(m,outdoor){
  var key=m&&m.id?m.id:'crypt';
  if(outdoor&&key!=='wild')key='town';
  return ATMOS[key]||ATMOS.crypt;
}
/* Lit windows, lantern glass and embers hold their glow at range. Read once per
   texture as "how much warm, blue-starved light does this texel column carry", so
   the renderer pays one array lookup per wall column, not per pixel. */
function emitColumns(img){
  var w=img.width,h=img.height,d=img.data,e=new Float32Array(w);
  for(var x=0;x<w;x++){
    var m=0;
    for(var y=0;y<h;y+=2){
      var i=((y*w+x)<<2),R=d[i],G=d[i+1],B=d[i+2];
      // Only genuinely luminous colour counts. Pale plaster is bright but not
      // lit; a lamp-lit pane is warm, blue-starved and brighter than the air.
      if(R>168&&R>B+70&&G>B+25){var st=(R-B)/170*(G/255);if(st>m)m=st;}
    }
    e[x]=m>0.62?1:m*1.6;
  }
  return e;
}

/* ---- ceilings. The roof is cast with the same machinery as the floor, so it is
   the same building: joists over a cellar, ribs over a crypt, rock over a delve. */
function ceilTextures(){
  if(CTEX)return CTEX;
  buildTextures();
  CTEX={};
  function ct(painter){
    var SC=TEXPX/TEX;
    var c=document.createElement('canvas');c.width=TEXPX;c.height=TEXPX;
    var g=c.getContext('2d');g.setTransform(SC,0,0,SC,0,0);
    try{painter(g);}catch(e){}
    var ch=mipChain(c),img=[];
    for(var i=0;i<ch.length;i++)img.push({d:ch[i].getContext('2d').getImageData(0,0,ch[i].width,ch[i].height),w:ch[i].width});
    return {chain:img};
  }
  CTEX.beams=ct(function(g){        // cellar: joists and boards, soot in the grooves
    g.fillStyle='#33271a';g.fillRect(0,0,TEX,TEX);
    for(var x=0;x<TEX;x+=21){
      g.fillStyle='#46351f';g.fillRect(x,0,17,TEX);
      g.fillStyle='rgba(14,10,6,.5)';g.fillRect(x+16,0,4,TEX);
      g.fillStyle='rgba(226,196,150,.05)';g.fillRect(x+1,0,2,TEX);
    }
    var r=new Rules.RNG(302);
    for(var i=0;i<10;i++){g.fillStyle='rgba(18,13,8,.45)';g.fillRect(0,r.int(0,TEX),TEX,r.int(2,5));}
    g.fillStyle='rgba(8,6,4,.5)';g.fillRect(0,0,TEX,7);g.fillRect(0,TEX-7,TEX,7);
  });
  CTEX.vault=ct(function(g){        // groin vault
    g.fillStyle='#6d6558';g.fillRect(0,0,TEX,TEX);
    var r=new Rules.RNG(311);
    for(var i=0;i<420;i++){var v=r.int(-20,20);
      g.fillStyle='rgba('+(120+v)+','+(112+v)+','+(98+v)+',.5)';
      g.fillRect(r.int(0,TEX),r.int(0,TEX),r.int(2,7),r.int(2,6));}
    g.strokeStyle='rgba(30,27,24,.7)';g.lineWidth=6;
    g.beginPath();g.moveTo(0,0);g.lineTo(TEX,TEX);g.moveTo(TEX,0);g.lineTo(0,TEX);g.stroke();
    g.fillStyle='rgba(22,20,18,.28)';
    g.beginPath();g.moveTo(0,0);g.lineTo(TEX,0);g.lineTo(TEX/2,TEX/2);g.closePath();g.fill();
    g.beginPath();g.moveTo(0,TEX);g.lineTo(TEX,TEX);g.lineTo(TEX/2,TEX/2);g.closePath();g.fill();
    g.fillStyle='rgba(255,240,210,.10)';g.beginPath();g.arc(TEX/2,TEX/2,12,0,6.29);g.fill();
  });
  CTEX.crypt=ct(function(g){        // ribbed crypt vault with a carved boss
    g.fillStyle='#494750';g.fillRect(0,0,TEX,TEX);
    var r=new Rules.RNG(321);
    for(var i=0;i<460;i++){var v=r.int(-18,18);
      g.fillStyle='rgba('+(80+v)+','+(78+v)+','+(86+v)+',.5)';
      g.fillRect(r.int(0,TEX),r.int(0,TEX),r.int(2,6),r.int(2,7));}
    g.strokeStyle='rgba(22,22,28,.8)';g.lineWidth=6;
    g.beginPath();g.moveTo(0,0);g.lineTo(TEX,TEX);g.moveTo(TEX,0);g.lineTo(0,TEX);
    g.moveTo(TEX/2,0);g.lineTo(TEX/2,TEX);g.moveTo(0,TEX/2);g.lineTo(TEX,TEX/2);g.stroke();
    g.fillStyle='rgba(200,192,168,.16)';g.beginPath();g.arc(TEX/2,TEX/2,13,0,6.29);g.fill();
    g.strokeStyle='rgba(18,18,22,.9)';g.lineWidth=2;g.beginPath();g.arc(TEX/2,TEX/2,7,0,6.29);g.stroke();
    g.fillStyle='rgba(112,126,92,.14)';
    for(var k=0;k<16;k++)g.fillRect(r.int(0,TEX-6),r.int(0,TEX-10),r.int(3,8),r.int(6,18));
  });
  CTEX.rock=ct(function(g){         // hacked cave roof
    g.fillStyle='#3d372f';g.fillRect(0,0,TEX,TEX);
    var r=new Rules.RNG(331);
    for(var i=0;i<54;i++){            // wedged facets, chunky enough to read overhead
      var v=r.int(-22,22);
      g.fillStyle='rgba('+(82+v)+','+(74+v)+','+(63+v)+',.75)';
      var cx=r.int(0,TEX),cy=r.int(0,TEX),ww=r.int(10,30),hh=r.int(8,24);
      g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+ww,cy+r.int(-6,8));
      g.lineTo(cx+r.int(3,ww),cy+hh);g.closePath();g.fill();}
    g.strokeStyle='rgba(8,6,4,.55)';g.lineWidth=3;   // a few deep fractures, not scribble
    for(var k=0;k<7;k++){var sx=r.int(0,TEX),sy=r.int(0,TEX);
      g.beginPath();g.moveTo(sx,sy);for(var t=0;t<3;t++)g.lineTo(sx+r.int(-18,18),sy+r.int(8,26));g.stroke();}
  });
  CTEX.plaster=ct(function(g){      // keep: plaster panels between heavy joists
    g.fillStyle='#8f8878';g.fillRect(0,0,TEX,TEX);
    var r=new Rules.RNG(341);
    for(var i=0;i<520;i++){var v=r.int(-16,16);
      g.fillStyle='rgba('+(150+v)+','+(142+v)+','+(126+v)+',.45)';
      g.fillRect(r.int(0,TEX),r.int(0,TEX),r.int(2,6),r.int(2,6));}
    g.fillStyle='#4a3a26';
    for(var y=0;y<TEX;y+=26)g.fillRect(0,y,TEX,7);
    for(var y2=0;y2<TEX;y2+=26)for(var x=0;x<TEX;x+=30)g.fillRect(x,y2+7,7,19);
    g.fillStyle='rgba(24,20,16,.3)';g.fillRect(0,0,TEX,4);
  });
  return CTEX;
}


/* Trilinear ground filtering. The continuous mip level is picked from how many
   screen pixels one tile covers at this depth, then the two bracketing levels are
   fetched and blended — which is what kills both the horizontal banding you get
   from switching levels outright and the shimmer you get from never switching.
   Returns module scratch, or null if the texture has no pixels. */
var GSCRATCH=[0,0,0],GA=[0,0,0],GB=[0,0,0];
function texFetch(t,fu,fv,out){
  var d=t.d.data,w=t.w,wl=w-1;
  // clamp the COORDINATE first, so the weights can never go negative and
  // inflate the average past 255 (which is what a clamped buffer will happily
  // paint as white).
  if(fu<0)fu=0;else if(fu>wl-0.002)fu=wl-0.002;
  if(fv<0)fv=0;else if(fv>wl-0.002)fv=wl-0.002;
  var x0=fu|0,y0=fv|0,xb=x0+1>wl?wl:x0+1,yb=y0+1>wl?wl:y0+1;
  var ax=((fu-x0)*255)|0,ay=((fv-y0)*255)|0,omx=255-ax,omy=255-ay;
  var i00=(y0*w+x0)<<2,i10=(y0*w+xb)<<2,i01=(yb*w+x0)<<2,i11=(yb*w+xb)<<2;
  out[0]=(d[i00]*omx+d[i10]*ax+128>>8)*omy+(d[i01]*omx+d[i11]*ax+128>>8)*ay+128>>8;
  out[1]=(d[i00+1]*omx+d[i10+1]*ax+128>>8)*omy+(d[i01+1]*omx+d[i11+1]*ax+128>>8)*ay+128>>8;
  out[2]=(d[i00+2]*omx+d[i10+2]*ax+128>>8)*omy+(d[i01+2]*omx+d[i11+2]*ax+128>>8)*ay+128>>8;
}
function groundSample(tex,u,v,px){
  var chain=tex.chain||[{d:tex.data,w:tex.width}];
  if(!chain[0].d)return null;
  var top=chain.length-1;
  var lf=Math.log(chain[0].w/Math.max(1,px))*1.4426950408889634;   // log2
  if(!(lf>0))lf=0;else if(lf>top)lf=top;
  var i0=lf|0,f=lf-i0;
  var w0=chain[i0].w;
  texFetch(chain[i0],u*w0-0.5,(1-v)*w0-0.5,GA);
  if(f>0.02&&i0<top){
    var w1=chain[i0+1].w;
    texFetch(chain[i0+1],u*w1-0.5,(1-v)*w1-0.5,GB);
    var f2=(f*255)|0,i2=255-f2;
    GSCRATCH[0]=(GA[0]*i2+GB[0]*f2+128)>>8;
    GSCRATCH[1]=(GA[1]*i2+GB[1]*f2+128)>>8;
    GSCRATCH[2]=(GA[2]*i2+GB[2]*f2+128)>>8;
    return GSCRATCH;
  }
  return GA;
}

/* ================= ground textures (floorcasting) ================= */
var FBUF=null;
  var FLOORFAIL=0;
var GTEX=null;
function groundTextures(){
  if(GTEX)return GTEX;
  GTEX={};
  function gt(painter,seed,base){
    buildTextures();                      // fixes TEXPX
    var D=64,SC=TEXPX/D;
    var c=document.createElement('canvas');c.width=TEXPX;c.height=TEXPX;
    var g=c.getContext('2d');g.setTransform(SC,0,0,SC,0,0);
    g.fillStyle=base;g.fillRect(0,0,D,D);
    try{painter(g,seed);}catch(e){}
    // grit painted in device pixels, so the bigger raster actually pays off
    var r=new Rules.RNG((seed||7)*7+1);
    g.setTransform(1,0,0,1,0,0);
    for(var i=0;i<Math.round(520*SC*SC);i++){
      var v=r.int(-24,24);
      g.fillStyle='rgba('+(v>0?255:0)+','+(v>0?255:0)+','+(v>0?255:0)+','+(Math.abs(v)/460)+')';
      g.fillRect(r.int(0,TEXPX-1),r.int(0,TEXPX-1),1,1);
    }
    var ch=mipChain(c),img=[];
    for(var m=0;m<ch.length;m++){
      var w=ch[m].width;
      img.push({d:ch[m].getContext('2d').getImageData(0,0,w,w),w:w});
    }
    return {chain:img,data:img[0].d,width:img[0].w,height:img[0].w};
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
  /* Interiors get the floor their builders laid, keyed through MATS.floor. */
  GTEX['slab']=gt(function(g){      // cellar: damp close-laid slabs, grit in the joints
    var r=new Rules.RNG(811);
    for(var y=0;y<64;y+=11)for(var x=(Math.floor(y/11)%2)*6;x<64;x+=13){
      var v=r.int(-9,9);
      g.fillStyle='rgb('+(58+v)+','+(52+v)+','+(46+v)+')';
      g.fillRect(x+1,y+1,11,9);
    }
    g.fillStyle='rgba(18,15,12,.55)';
    for(var y2=0;y2<64;y2+=11)g.fillRect(0,y2,64,1.4);
    g.fillStyle='rgba(96,104,84,.13)';
    for(var i=0;i<26;i++)g.fillRect(r.int(0,60),r.int(0,60),r.int(2,6),r.int(2,5));
  },811,'#2b2622');
  GTEX['cryptslab']=gt(function(g){  // crypt: pale worn slabs with a carved edge
    var r=new Rules.RNG(821);
    for(var y=0;y<64;y+=16)for(var x=0;x<64;x+=16){
      var v=r.int(-11,11);
      g.fillStyle='rgb('+(96+v)+','+(93+v)+','+(88+v)+')';
      g.fillRect(x+1,y+1,14,14);
      g.fillStyle='rgba(220,214,196,.10)';g.fillRect(x+1,y+1,14,2);
    }
    g.fillStyle='rgba(20,20,24,.62)';
    for(var y2=0;y2<64;y2+=16){g.fillRect(0,y2,64,1.6);g.fillRect(y2,0,1.6,64);}
    g.fillStyle='rgba(112,126,92,.16)';
    for(var i=0;i<20;i++)g.fillRect(r.int(0,58),r.int(40,62),r.int(3,9),r.int(2,8));
  },821,'#4a4741');
  GTEX['earth']=gt(function(g){      // mine: packed beaten earth, pick scuff and stone chips
    var r=new Rules.RNG(831);
    for(var i=0;i<340;i++){
      var v=r.int(-14,14);
      g.fillStyle='rgba('+(74+v)+','+(60+v)+','+(45+v)+',.65)';
      g.fillRect(r.int(0,62),r.int(0,62),r.int(2,7),r.int(2,6));
    }
    g.strokeStyle='rgba(34,26,18,.55)';g.lineWidth=1.2;
    for(var k=0;k<14;k++){var sx=r.int(4,58),sy=r.int(4,58);
      g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+r.int(-7,7),sy+r.int(-7,7));g.stroke();}
    g.fillStyle='rgba(126,120,110,.28)';
    for(var c=0;c<26;c++)g.fillRect(r.int(0,60),r.int(0,60),r.int(2,4),r.int(2,3));
  },831,'#4a3d2e');
  GTEX['flag']=gt(function(g){       // keep: tight ashlar flags, laid regular
    var r=new Rules.RNG(841);
    for(var y=0;y<64;y+=8)for(var x=(Math.floor(y/8)%2)*4;x<64;x+=9){
      var v=r.int(-8,8);
      g.fillStyle='rgb('+(120+v)+','+(114+v)+','+(104+v)+')';
      g.fillRect(x+1,y+1,7,6);
    }
    g.fillStyle='rgba(40,36,32,.55)';
    for(var y2=0;y2<64;y2+=8)g.fillRect(0,y2,64,1.2);
  },841,'#6b6459');
  GTEX['plank']=gt(function(g){      // hall: wide boards, worn along the grain
    var r=new Rules.RNG(851);
    for(var y=0;y<64;y+=9){
      var v=r.int(-12,12);
      g.fillStyle='rgb('+(92+v)+','+(70+v)+','+(46+v)+')';
      g.fillRect(0,y+1,64,7);
      g.fillStyle='rgba(28,20,12,.6)';g.fillRect(0,y,64,1.4);
      for(var k=0;k<7;k++){g.fillStyle='rgba(60,44,28,.35)';
        g.fillRect(r.int(0,60),y+2,r.int(6,20),1);}
    }
  },851,'#4d3a26');
  GTEX['~']=GTEX['.'];
  GTEX['?']=GTEX['.'];
  GTEX['F']=GTEX['.'];
  GTEX['1']=GTEX['.'];
  return GTEX;
}

/* ================= shop goods (the things that make a room a place) =================
   A room with nothing in it is not a shop, and no amount of correct plaster will
   say otherwise. What stands behind a doorway is what a traveller actually reads:
   you are not looking at the wall, you are looking at what a place keeps in its
   opening. So each service is furnished from its own kit, and every door gets a
   board on a post, which is how a trade was advertised when almost nobody could
   read. */
var PROPS_H={counter:0.42,shelf:0.80,crate:0.40,barrel:0.40,table:0.34,stool:0.20,
             cot:0.24,altar:0.56,brazier:0.44,rack:0.72,sign:0.40,
             /* fixtures: things a village owns rather than a person keeps */
             well:0.92,cart:0.46,woodpile:0.28,haystack:0.58,trough:0.24,stocks:0.32,
             signpost:0.86,board:0.50,anvil:0.38,ladder:0.86,bench:0.24};
var PROPS_FOR={
  inn:['table','stool','cot'],tavern:['table','barrel','brazier'],
  general:['counter','shelf','crate'],apothecary:['counter','shelf','barrel'],
  temple:['altar','brazier','brazier'],hall:['table','brazier','crate'],
  armory:['rack','crate','barrel'],training:['rack','barrel','crate']
};

/* ================= sprite cache (billboards) ================= */
var SPR={};
function sprite(key){
  if(SPR[key]!==undefined)return SPR[key];
  var s=null;
  try{s=makeSprite(key);}catch(e){s=null;}
  if(s&&!Array.isArray(s))s=[s];        // every sprite is a gait list now
  SPR[key]=s;return s;
}
/* How tall a thing stands, as a fraction of a wall. One factor for the board,
   the vale and the in-view billboard, so a troll towers the same everywhere. */
function entitySize(key){
  var p=key.split(':');
  if(p[0]==='mon'){var d=(window.MONSTERS&&MONSTERS[p[1]])||{};
    return (window.Figures&&Figures.sizeOf)?Figures.sizeOf(d)
      :(d.size==='L'?1.4:(d.size==='S'?0.72:1.0));}
  if(p[0]==='chest')return 0.45;
  if(p[0]==='prop')return PROPS_H[p[1]]||0.42;
  return 0.8;
}
/* Which pose this entity wears right now. The scene repaints only while
   something moves, so the tick advances with rendered frames rather than the
   clock: creatures step while you walk, and hold a crisp pose when you stop.
   Phase comes from the tile the creature stands on, so a pack is not marching
   in lockstep. */
var animTick=0;
function poseOf(frames,en){
  if(frames.length<2)return frames[0];
  var ph=en&&en.x!==undefined?(((en.x*7+en.y*13)|0)%frames.length+frames.length)%frames.length:0;
  return frames[((animTick>>3)+ph)%frames.length];
}
/* Every prop is bottom-anchored like a chest: its shadow ellipse sits on the
   floor line and the billboard code stands it up from there. Wood is cut with a
   dark foot and a lit top so it reads at a distance; goods are the only bright
   colours in a room, which is why they carry the recognition. */
function shadow(g,w,h,r){g.fillStyle='rgba(0,0,0,.38)';g.beginPath();
  g.ellipse(w/2,h-4,w*(r||0.34),h*0.055,0,0,6.29);g.fill();}
function plank(g,x,y,w,h,a,b){g.fillStyle=a;g.fillRect(x,y,w,h);
  g.fillStyle=b;g.fillRect(x,y+h-2,w,2);g.fillRect(x,y,1,h);}
function pot(g,x,y,s,c1,c2){g.fillStyle=c1;g.beginPath();
  g.moveTo(x-s,y-s*0.4);g.quadraticCurveTo(x-s*1.15,y+s*1.2,x,y+s*1.3);
  g.quadraticCurveTo(x+s*1.15,y+s*1.2,x+s,y-s*0.4);g.closePath();g.fill();
  g.fillStyle=c2;g.fillRect(x-s*0.75,y-s*0.7,s*1.5,s*0.36);}
function paintProp(kind,c,g){
  var W,H;
  if(kind==='counter'){W=104;H=48;c.width=W;c.height=H;shadow(g,W,H);
    plank(g,8,20,88,24,'#5b3d22','#2f1f11');
    for(var i=0;i<4;i++){g.fillStyle='#3d2916';g.fillRect(14+i*22,24,2,18);}
    g.fillStyle='#7d5730';g.fillRect(4,14,96,8);
    g.fillStyle='rgba(158,58,44,.85)';g.fillRect(10,22,84,5);
    pot(g,26,10,6,'#7c6a52','#93805f');pot(g,76,10,5,'#5d6f5f','#728470');
    g.fillStyle='#c9b072';g.fillRect(48,6,10,9);g.fillStyle='#8d7a4a';g.fillRect(48,6,10,2);
    return c;}
  if(kind==='shelf'){W=84;H=104;c.width=W;c.height=H;shadow(g,W,H,0.30);
    g.fillStyle='#4a3220';g.fillRect(6,6,6,H-10);g.fillRect(W-12,6,6,H-10);
    for(var s=0;s<4;s++){var yy=20+s*22;plank(g,4,yy,W-8,7,'#6b4a2a','#33220f');
      pot(g,22,yy-6,7,['#8d5a3a','#6a7d5c','#7a6a86','#a08a4e'][s],['#a8724c','#849a72','#94849c','#c0a862'][s]);
      pot(g,44,yy-5,6,['#5d6f7f','#8a4f45','#6f7a4c','#8c7f52'][s],['#77899a','#a5695c','#8c9a63','#ab9c6a'][s]);
      g.fillStyle=['#7d6a4e','#8b7b5e','#6d5f4c','#7f705a'][s];g.fillRect(58,yy-11,14,11);
      g.fillStyle='rgba(255,255,255,.10)';g.fillRect(58,yy-11,14,3);}
    return c;}
  if(kind==='crate'){W=76;H=56;c.width=W;c.height=H;shadow(g,W,H);
    plank(g,4,26,40,26,'#6b4a2a','#33220f');plank(g,16,12,34,16,'#7a5734','#3d2915');
    plank(g,46,32,26,20,'#5b3d22','#2f1f11');
    g.fillStyle='#43301b';g.fillRect(4,34,40,2);g.fillRect(46,40,26,2);
    g.fillStyle='#8f7d5c';g.beginPath();g.moveTo(58,32);g.quadraticCurveTo(52,14,66,16);
    g.quadraticCurveTo(78,20,74,32);g.closePath();g.fill();
    return c;}
  if(kind==='barrel'){W=54;H=58;c.width=W;c.height=H;shadow(g,W,H,0.36);
    g.fillStyle='#6b4a2a';g.beginPath();g.moveTo(12,8);g.quadraticCurveTo(2,28,12,52);
    g.lineTo(42,52);g.quadraticCurveTo(52,28,42,8);g.closePath();g.fill();
    g.fillStyle='#4a3220';for(var i=0;i<4;i++)g.fillRect(16+i*7,8,2,44);
    g.fillStyle='#8d7a5c';g.fillRect(10,16,34,4);g.fillRect(9,34,36,4);
    g.fillStyle='#7d5730';g.beginPath();g.ellipse(27,8,15,5,0,0,6.29);g.fill();
    g.fillStyle='#3d2916';g.beginPath();g.ellipse(27,8,11,3.4,0,0,6.29);g.fill();
    return c;}
  if(kind==='table'){W=108;H=44;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#3d2916';g.fillRect(14,20,8,20);g.fillRect(86,20,8,20);
    g.fillStyle='#4a3220';g.fillRect(18,26,72,5);
    g.fillStyle='#7a5734';g.fillRect(6,14,96,8);
    g.fillStyle='rgba(214,204,182,.9)';g.fillRect(10,22,88,6);
    g.fillStyle='rgba(158,58,44,.8)';g.fillRect(10,27,88,2);
    g.fillStyle='#b9a06a';g.fillRect(30,6,9,9);g.fillRect(64,7,8,8);
    g.fillStyle='#8d7748';g.fillRect(30,6,9,2);g.fillRect(64,7,8,2);
    return c;}
  if(kind==='stool'){W=34;H=30;c.width=W;c.height=H;shadow(g,W,H,0.42);
    g.fillStyle='#4a3220';g.fillRect(7,12,4,14);g.fillRect(23,12,4,14);g.fillRect(15,13,4,13);
    g.fillStyle='#7a5734';g.beginPath();g.ellipse(17,12,13,5,0,0,6.29);g.fill();
    g.fillStyle='#5b3d22';g.beginPath();g.ellipse(17,13,13,4,0,0,6.29);g.fill();
    return c;}
  if(kind==='cot'){W=98;H=34;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#4a3220';g.fillRect(6,10,6,20);g.fillRect(86,10,6,20);
    g.fillStyle='#8f7d5c';g.fillRect(10,16,78,12);
    g.fillStyle='#6d5b46';g.fillRect(10,22,78,6);
    g.fillStyle='rgba(120,88,64,.95)';g.fillRect(34,14,54,10);
    g.fillStyle='#cfc3a4';g.fillRect(12,12,20,8);
    return c;}
  if(kind==='altar'){W=78;H=64;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#6f6a62';g.fillRect(12,22,54,30);
    g.fillStyle='#847f76';g.fillRect(8,16,62,8);
    g.fillStyle='#57534c';g.fillRect(12,44,54,4);g.fillRect(8,20,62,2);
    g.fillStyle='#4d4941';g.fillRect(20,30,38,3);
    g.fillStyle='#d8cbaa';g.fillRect(24,4,5,13);g.fillRect(49,6,5,11);
    g.fillStyle='#f2b659';g.beginPath();g.ellipse(26.5,2,2.6,4,0,0,6.29);g.fill();
    g.beginPath();g.ellipse(51.5,4,2.4,3.6,0,0,6.29);g.fill();
    return c;}
  if(kind==='brazier'){W=46;H=52;c.width=W;c.height=H;shadow(g,W,H,0.40);
    g.fillStyle='#3a332c';g.fillRect(9,20,4,28);g.fillRect(33,20,4,28);g.fillRect(21,22,4,26);
    g.fillStyle='#4c443a';g.beginPath();g.moveTo(6,20);g.lineTo(40,20);g.lineTo(34,10);g.lineTo(12,10);
    g.closePath();g.fill();
    g.fillStyle='#2b2620';g.beginPath();g.ellipse(23,11,14,4,0,0,6.29);g.fill();
    g.fillStyle='#c8621f';g.beginPath();g.ellipse(23,11,11,3,0,0,6.29);g.fill();
    g.fillStyle='#f0a63c';g.beginPath();g.ellipse(20,10,4,2.2,0,0,6.29);g.fill();
    g.beginPath();g.ellipse(28,11,3,1.8,0,0,6.29);g.fill();
    return c;}
  if(kind==='rack'){W=92;H=88;c.width=W;c.height=H;shadow(g,W,H,0.32);
    g.fillStyle='#4a3220';g.fillRect(8,10,7,72);g.fillRect(W-15,10,7,72);
    plank(g,4,26,84,7,'#6b4a2a','#33220f');plank(g,4,58,84,7,'#6b4a2a','#33220f');
    g.fillStyle='#8b8f96';g.fillRect(22,8,5,44);g.fillRect(38,10,5,42);g.fillRect(54,9,5,43);
    g.fillStyle='#b9bcc2';g.beginPath();g.moveTo(22,8);g.lineTo(27,2);g.lineTo(31,9);g.closePath();g.fill();
    g.beginPath();g.moveTo(38,10);g.lineTo(43,4);g.lineTo(47,11);g.closePath();g.fill();
    g.fillStyle='#6d6a63';g.fillRect(20,52,9,4);g.fillRect(36,54,9,4);
    g.fillStyle='#7a5734';g.beginPath();g.ellipse(68,46,12,14,0,0,6.29);g.fill();
    g.fillStyle='#9b6f3c';g.beginPath();g.ellipse(68,46,8,10,0,0,6.29);g.fill();
    g.fillStyle='#c8c2b2';g.beginPath();g.ellipse(68,46,3,4,0,0,6.29);g.fill();
    return c;}
  if(kind==='sign'){W=70;H=108;c.width=W;c.height=H;
    g.fillStyle='rgba(0,0,0,.34)';g.beginPath();g.ellipse(30,H-4,17,5,0,0,6.29);g.fill();
    g.fillStyle='#4a3220';g.fillRect(26,6,7,H-10);
    g.fillStyle='#5b3d22';g.fillRect(26,6,3,H-10);
    g.fillStyle='#4a3220';g.fillRect(30,12,30,6);
    g.fillStyle='#3a332c';g.fillRect(36,18,2,10);g.fillRect(54,18,2,10);
    g.fillStyle='#6b4a26';g.fillRect(24,28,44,30);
    g.fillStyle='#8a6631';g.fillRect(27,31,38,24);
    g.fillStyle='rgba(232,190,110,.95)';g.beginPath();g.ellipse(46,43,10,9,0,0,6.29);g.fill();
    g.fillStyle='#5b3d22';g.fillRect(40,40,12,3);g.fillRect(42,46,9,3);
    g.fillStyle='#3d2916';g.fillRect(24,28,44,3);g.fillRect(24,55,44,3);
    return c;}
  /* ---- fixtures: the things a village owns ----
     These are the pieces a street is judged by. A lane with nothing against its walls
     reads as a set, however good the walls are; a lane with a woodpile, a ladder and a
     trough reads as somewhere people live. All of them are bottom-anchored like the
     shop goods, so they stand on the ground and take a shadow. */
  if(kind==='well'){                                   // the parish well: curb, windlass, bucket
    W=104;H=124;c.width=W;c.height=H;shadow(g,W,H,0.34);
    // drum of the curb, coursed stone with a thick top rim
    g.fillStyle='#8e8878';g.fillRect(18,66,68,50);
    var r2=new Rules.RNG(9090);
    for(var wy=68;wy<114;wy+=8){
      var woff=((wy/8)|0)%2*7;
      for(var wx=14+woff;wx<88;wx+=17){
        var wv=r2.int(-16,16);
        g.fillStyle='rgb('+(150+wv)+','+(144+wv)+','+(130+wv)+')';
        g.fillRect(wx,wy,15,6);
        g.fillStyle='rgba(32,28,22,.5)';g.fillRect(wx-1,wy-1,1,7);
      }
    }
    g.fillStyle='#a8a08d';g.beginPath();g.ellipse(52,66,35,10,0,0,6.29);g.fill();
    g.fillStyle='#2a2b2c';g.beginPath();g.ellipse(52,67,28,7,0,0,6.29);g.fill();
    g.fillStyle='rgba(120,150,166,.35)';g.beginPath();g.ellipse(46,68,10,2.4,0,0,6.29);g.fill();
    // posts, windlass beam and a pent roof to keep the rain off the rope
    g.fillStyle='#573d22';g.fillRect(22,26,7,42);g.fillRect(75,26,7,42);
    g.fillStyle='#6d4e2c';g.fillRect(16,20,72,7);
    g.fillStyle='#3f2c17';g.fillRect(16,25,72,2);
    g.fillStyle='#4e3a22';g.beginPath();g.moveTo(8,22);g.lineTo(52,6);g.lineTo(96,22);
    g.closePath();g.fill();
    g.fillStyle='rgba(20,14,8,.45)';
    for(var sr=0;sr<4;sr++){g.fillRect(14+sr*4,20-sr*3,76-sr*8,1.6);}
    // pulley, rope and the bucket that lives there
    g.fillStyle='#7d7566';g.beginPath();g.arc(52,26,5,0,6.29);g.fill();
    g.fillStyle='#3a332a';g.beginPath();g.arc(52,26,2,0,6.29);g.fill();
    g.strokeStyle='#b2a279';g.lineWidth=1.6;g.beginPath();g.moveTo(52,30);g.lineTo(52,86);g.stroke();
    g.fillStyle='#6b4a2a';g.beginPath();g.moveTo(44,86);g.lineTo(60,86);g.lineTo(57,100);
    g.lineTo(47,100);g.closePath();g.fill();
    g.fillStyle='#8a6631';g.fillRect(44,86,16,3);
    g.strokeStyle='#5d554a';g.lineWidth=1.4;g.beginPath();g.arc(52,84,6,Math.PI,0);g.stroke();
    // moss where the spill runs, and a step to stand on
    g.fillStyle='rgba(70,96,54,.5)';g.fillRect(20,106,14,8);g.fillRect(70,110,12,6);
    g.fillStyle='#7d7466';g.fillRect(36,112,32,8);g.fillStyle='#93897a';g.fillRect(36,112,32,2);
    return c;}
  if(kind==='cart'){                                   // a hand cart, spoked and loaded
    W=122;H=76;c.width=W;c.height=H;shadow(g,W,H);
    function wheel(cx,cy,rad){
      g.strokeStyle='#3c2a16';g.lineWidth=4;g.beginPath();g.arc(cx,cy,rad,0,6.29);g.stroke();
      g.strokeStyle='#6b4a2a';g.lineWidth=2.4;
      for(var s=0;s<6;s++){var a=s*Math.PI/3+0.3;
        g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);g.stroke();}
      g.fillStyle='#4a3220';g.beginPath();g.arc(cx,cy,rad*0.24,0,6.29);g.fill();
      g.fillStyle='#8d7a5c';g.beginPath();g.arc(cx,cy,rad*0.1,0,6.29);g.fill();}
    wheel(34,52,19);wheel(90,52,19);
    g.fillStyle='#5b3d22';g.fillRect(14,30,96,10);                 // the bed
    g.fillStyle='#7a5734';g.fillRect(14,30,96,3);
    for(var bx=18;bx<108;bx+=11){g.fillStyle='#4a3220';g.fillRect(bx,18,3,13);}   // stanchions
    g.fillStyle='#6b4a2a';g.fillRect(14,16,96,5);                  // side rail
    g.fillStyle='#4a3220';g.fillRect(14,40,96,3);
    g.save();g.translate(110,36);g.rotate(0.42);g.fillStyle='#5b3d22';
    g.fillRect(0,0,26,4);g.fillRect(0,10,22,4);g.restore();         // shafts
    pot(g,46,22,9,'#8f7d5c','#a89472');pot(g,66,20,8,'#7d6a4e','#96844e');  // sacks aboard
    return c;}
  if(kind==='woodpile'){                               // split logs stacked against the wall
    W=110;H=54;c.width=W;c.height=H;shadow(g,W,H);
    var r3=new Rules.RNG(3131);
    for(var ly=0;ly<3;ly++)for(var lx=0;lx<11;lx++){
      var cx2=10+lx*9+(ly%2)*4,cy2=H-10-ly*11,rv=r3.int(-3,3);
      if(cx2>102)continue;
      g.fillStyle='rgb('+(120+rv)+','+(88+rv)+','+(54+rv)+')';
      g.beginPath();g.arc(cx2,cy2,5.4,0,6.29);g.fill();
      g.strokeStyle='rgba(58,40,22,.8)';g.lineWidth=1;g.beginPath();
      g.arc(cx2,cy2,2.6,0,6.29);g.stroke();
      g.fillStyle='rgba(255,238,200,.16)';g.fillRect(cx2-4,cy2-5,8,1.6);
    }
    g.fillStyle='#4a3220';g.fillRect(4,H-38,104,3);                 // the leaning rail
    return c;}
  if(kind==='haystack'){                               // a stack in the corner of a croft
    /* A symmetrical cone with a rope round it is a bell tent. A real stack is laid in
       courses, is heavier on one side where the pitchfork pulled it, and sheds loose
       straw at the foot, so it sits INTO the ground rather than on it. */
    W=116;H=96;c.width=W;c.height=H;shadow(g,W,H,0.42);
    var r4=new Rules.RNG(4242);
    g.fillStyle='#a3823b';g.beginPath();g.moveTo(6,H-8);
    g.bezierCurveTo(10,58,26,26,58,14);                              // windward side
    g.bezierCurveTo(86,20,102,44,110,H-8);g.closePath();g.fill();
    g.fillStyle='rgba(58,40,14,.32)';g.beginPath();g.moveTo(66,H-8);
    g.bezierCurveTo(92,44,80,22,58,14);g.bezierCurveTo(78,30,86,52,92,H-8);
    g.closePath();g.fill();
    g.fillStyle='rgba(226,196,116,.22)';g.beginPath();g.moveTo(20,H-14);
    g.bezierCurveTo(22,54,32,30,56,18);g.bezierCurveTo(44,34,34,60,32,H-14);
    g.closePath();g.fill();
    g.strokeStyle='rgba(88,64,24,.45)';g.lineWidth=1.6;             // the courses it was pitched in
    for(var hy=H-18;hy>22;hy-=9){
      var span=(hy-14)/(H-30);
      g.beginPath();
      g.moveTo(10+58*(1-Math.min(1,span)),hy);
      g.quadraticCurveTo(58,hy-6,106-58*(1-Math.min(1,span)));
      g.stroke();}
    g.strokeStyle='rgba(238,212,132,.55)';g.lineWidth=1.2;          // hanging straw
    for(var hs=0;hs<30;hs++){var hx=r4.int(12,104),hy2=r4.int(24,H-16);
      g.beginPath();g.moveTo(hx,hy2);g.lineTo(hx+r4.int(-5,7),hy2+r4.int(6,14));g.stroke();}
    g.fillStyle='#c19b46';                                        // the straw it shed
    for(var sk=0;sk<26;sk++){var sx=r4.int(2,112);
      g.fillRect(sx,H-10+r4.int(0,7),r4.int(5,14),1.6);}
    g.fillStyle='rgba(40,28,10,.45)';g.fillRect(8,H-12,100,7);      // dark, damp foot
    return c;}
  if(kind==='trough'){                                 // the public water trough
    W=112;H=46;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#7d766a';g.fillRect(8,18,96,22);
    g.fillStyle='#948c7e';g.fillRect(8,18,96,3);
    g.fillStyle='#5f594f';g.fillRect(8,36,96,4);
    g.fillStyle='#a49c8c';g.beginPath();g.ellipse(56,18,48,7,0,0,6.29);g.fill();
    g.fillStyle='#2f454e';g.beginPath();g.ellipse(56,19,42,5.4,0,0,6.29);g.fill();
    g.fillStyle='rgba(150,186,200,.45)';g.fillRect(18,17,26,2);g.fillRect(64,20,22,1.6);
    g.fillStyle='#6f6a5e';g.fillRect(16,38,12,8);g.fillRect(84,38,12,8);      // block feet
    g.fillStyle='#8b8577';g.fillRect(96,8,7,14);                          // the standpipe
    g.fillStyle='#5d5750';g.fillRect(92,12,7,3);
    return c;}
  if(kind==='stocks'){                                 // the punishment frame by the hall
    W=98;H=58;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#4a3220';g.fillRect(10,16,9,34);g.fillRect(79,16,9,34);
    g.fillStyle='#6b4a2a';g.fillRect(6,30,86,8);                        // the sill board
    g.fillStyle='#5b3d22';g.fillRect(6,14,86,9);                        // the hinged board
    g.fillStyle='#241a10';
    g.beginPath();g.arc(38,23,7,0,6.29);g.fill();g.beginPath();g.arc(60,23,7,0,6.29);g.fill();
    g.beginPath();g.arc(38,34,7,0,6.29);g.fill();g.beginPath();g.arc(60,34,7,0,6.29);g.fill();
    g.fillStyle='#8b9098';g.fillRect(32,26,8,4);g.fillRect(58,26,8,4);    // iron cuffs
    g.fillStyle='#7a5734';g.fillRect(6,12,86,3);
    g.fillStyle='#3a2818';g.fillRect(44,4,10,10);                        // the hook it hangs on
    return c;}
  if(kind==='signpost'){                               // fingers at the crossroads
    W=76;H=134;c.width=W;c.height=H;shadow(g,W,H,0.34);
    g.fillStyle='#4a3220';g.fillRect(33,10,9,H-14);
    g.fillStyle='#5f4227';g.fillRect(33,10,3,H-14);
    g.fillStyle='#3a2818';g.beginPath();g.moveTo(29,10);g.lineTo(46,10);g.lineTo(37.5,2);
    g.closePath();g.fill();
    function finger(y,dir,w,txt){
      g.save();g.translate(37,y);g.rotate(dir*0.13);
      g.fillStyle='#6b4a26';g.fillRect(dir>0?-4:-w+4,-7,w,14);
      g.fillStyle='#8a6631';g.fillRect(dir>0?-2:-w+6,-5,w-4,10);
      g.fillStyle='#3a2818';
      g.beginPath();
      if(dir>0){g.moveTo(w-4,-7);g.lineTo(w+4,0);g.lineTo(w-4,7);}else{g.moveTo(-w+4,-7);g.lineTo(-w-4,0);g.lineTo(-w+4,7);}
      g.closePath();g.fill();
      g.fillStyle='rgba(50,34,16,.8)';for(var t2=0;t2<txt;t2++)g.fillRect(dir>0?2:-w+8+t2*7,-1.4,5,2.6);
      g.restore();}
    finger(28,1,34,3);finger(50,-1,30,2);finger(72,1,26,2);
    g.fillStyle='rgba(70,96,54,.4)';g.fillRect(30,H-22,15,7);
    return c;}
  if(kind==='board'){                                  // the reeve's notice board
    W=92;H=88;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#4a3220';g.fillRect(12,30,8,52);g.fillRect(72,30,8,52);
    g.fillStyle='#5b3d22';g.fillRect(6,18,80,44);
    for(var bp=8;bp<84;bp+=11){g.fillStyle='rgba(30,20,10,.45)';g.fillRect(bp,18,1.4,44);}
    g.fillStyle='#7a5734';g.fillRect(6,18,80,4);
    g.fillStyle='#4e3a22';g.beginPath();g.moveTo(2,18);g.lineTo(46,4);g.lineTo(90,18);
    g.closePath();g.fill();
    var papers=[[16,26,22,16,-0.05],[42,24,18,20,0.04],[24,46,26,12,0.02],[56,44,16,14,-0.06]];
    for(var pi=0;pi<papers.length;pi++){
      var P=papers[pi];g.save();g.translate(P[0]+P[2]/2,P[1]+P[3]/2);g.rotate(P[4]);
      g.fillStyle='#d9cfae';g.fillRect(-P[2]/2,-P[3]/2,P[2],P[3]);
      g.fillStyle='rgba(70,58,38,.6)';
      for(var ln=1;ln<4;ln++)g.fillRect(-P[2]/2+3,-P[3]/2+3+ln*3,P[2]-6,1);
      g.fillStyle='#8b8577';g.beginPath();g.arc(0,-P[3]/2+2,1.3,0,6.29);g.fill();
      g.restore();}
    return c;}
  if(kind==='anvil'){                                  // the smith's, on a blocked stump
    W=90;H=62;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#5b3d22';g.beginPath();g.moveTo(22,60);g.lineTo(66,60);
    g.lineTo(62,30);g.lineTo(26,30);g.closePath();g.fill();
    g.fillStyle='#6d4e2c';for(var ag=0;ag<3;ag++)g.fillRect(27,34+ag*8,34,2);
    g.fillStyle='#3a332c';g.fillRect(24,28,42,5);g.fillRect(26,52,38,4);      // hooped
    g.fillStyle='#4e545c';g.beginPath();                                      // the anvil
    g.moveTo(28,28);g.lineTo(62,28);g.lineTo(60,20);g.lineTo(52,20);
    g.lineTo(50,14);g.lineTo(38,14);g.lineTo(36,20);g.lineTo(28,20);g.closePath();g.fill();
    g.fillStyle='#767d86';g.fillRect(36,13,16,3);                             // lit face
    g.fillStyle='#3b4046';g.beginPath();g.moveTo(62,28);g.lineTo(74,24);       // the horn
    g.lineTo(62,20);g.closePath();g.fill();
    g.fillStyle='#22262b';g.fillRect(28,26,34,2);
    return c;}
  if(kind==='ladder'){                                 // left against the wall, where it belongs
    W=62;H=124;c.width=W;c.height=H;shadow(g,W,H,0.36);
    g.save();g.translate(30,H-6);g.rotate(-0.14);
    g.fillStyle='#6b4a2a';g.fillRect(-18,-H+10,6,H-10);g.fillRect(8,-H+10,6,H-10);
    g.fillStyle='#8a6631';g.fillRect(-18,-H+10,2,H-10);g.fillRect(8,-H+10,2,H-10);
    for(var lr=0;lr<7;lr++){g.fillStyle='#5b3d22';g.fillRect(-18,-H+22+lr*16,32,5);
      g.fillStyle='rgba(255,238,200,.12)';g.fillRect(-18,-H+22+lr*16,32,1.4);}
    g.restore();
    return c;}
  if(kind==='bench'){                                  // by the fountain, in the shade
    W=108;H=48;c.width=W;c.height=H;shadow(g,W,H);
    g.fillStyle='#7d766a';g.fillRect(10,26,18,18);g.fillRect(80,26,18,18);     // block ends
    g.fillStyle='#948c7e';g.fillRect(10,26,18,3);g.fillRect(80,26,18,3);
    g.fillStyle='#5b3d22';g.fillRect(4,16,100,11);
    g.fillStyle='#7a5734';g.fillRect(4,16,100,3);
    g.fillStyle='rgba(30,20,10,.4)';g.fillRect(4,25,100,2);g.fillRect(38,16,1.6,11);
    g.fillStyle='rgba(70,96,54,.4)';g.fillRect(12,40,16,5);
    return c;}
  W=52;H=52;c.width=W;c.height=H;shadow(g,W,H);
  g.fillStyle='#6b4a2a';g.fillRect(10,16,32,32);
  return c;
}
function makeSprite(key){
  var p=key.split(':'),kind=p[0];
  var c=document.createElement('canvas'),g=c.getContext('2d');
  if(kind==='mon'){
    /* One likeness per creature, painted by Figures and cached as four gait
       frames. The old local painter here had five silhouette branches and its
       own colour recipe, which is why a blob-shaped shade with wings looked like
       a man in a cloak the moment you rounded a corner. */
    var F=window.Figures;
    if(!F||!F.monDesc)return null;
    var id=p[1],def=(window.MONSTERS&&MONSTERS[id])||{};
    var desc=F.monDesc(id,def);
    var still={shape:desc.shape,color:desc.color,accent:desc.accent,
               weapon:desc.weapon,leader:desc.leader,noShadow:true};
    var SW=104,SH=128,fx=SW/2,fy=SH-12,tall=100,frames=[];
    for(var f=0;f<F.FRAMES;f++){
      var fc=document.createElement('canvas');
      fc.width=SW;fc.height=SH;
      var fg=fc.getContext('2d');
      fg.fillStyle='rgba(0,0,0,.42)';
      fg.beginPath();fg.ellipse(fx,fy,SW*0.19,SH*0.045,0,0,6.29);fg.fill();
      F.inBoxAnim(fg,still,fx,fy,tall,f);
      frames.push(fc);
    }
    return frames;
  }
  if(kind==='prop')return paintProp(p[1],c,g);
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
/* ================= the environment =================
   Everything above the horizon is authored in WORLD azimuth and elevation and
   projected with the same tangent-space maths as the walls, so a steeple, a ridge
   or a bank of cloud is a PLACE you turn toward rather than wallpaper that slides.
   Nothing here depends on wall-clock time: the renderer paints on demand, and a
   sky that only shimmers while you move would look broken when you stop. */
var SKY=null;
function skyAssets(){
  if(SKY)return SKY;
  var TAU=Math.PI*2,r=new Rules.RNG(20240715),i;
  var stars=[];
  for(i=0;i<260;i++){
    var el=Math.pow(r.int(0,1000)/1000,1.5);
    stars.push({az:r.int(0,6283)/1000,el:el,b:0.18+r.int(0,60)/100,s:r.int(10,26)/10});
  }
  // two ridge lines, 720 azimuth samples each: the far hills and the near downs
  function ridge(a1,a2,f1,f2,ph){
    var t=[],rr=new Rules.RNG(4000+ph*7);
    for(var k=0;k<720;k++){
      var A=k/720*TAU;
      var v=a1*(0.55+0.45*Math.sin(A*f1+ph))+a2*(0.5+0.5*Math.sin(A*f2+ph*1.7))
            +0.035*Math.sin(A*f2*3.1+ph*0.6)+rr.int(0,60)/1000*0.35;
      t.push(v);
    }
    return t;
  }
  var far=ridge(0.16,0.09,3,7,1.3),near=ridge(0.30,0.15,2,5,4.1);
  var clouds=[];
  for(i=0;i<30;i++){
    clouds.push({az:r.int(0,6283)/1000,el:0.06+Math.pow(r.int(0,1000)/1000,1.7)*0.72,
      da:(0.05+r.int(0,20)/100)*0.5,h:(0.02+r.int(0,5)/100),a:0.10+r.int(0,24)/100,
      warm:r.int(0,100)<40});
  }
  function puff(top,mid){
    var c=document.createElement('canvas');c.width=96;c.height=48;
    var g=c.getContext('2d');
    var rad=g.createRadialGradient(48,26,2,48,26,44);
    rad.addColorStop(0,top);rad.addColorStop(0.42,mid);rad.addColorStop(1,'rgba(40,38,62,0)');
    g.fillStyle=rad;
    g.beginPath();g.ellipse(48,26,44,20,0,0,6.29);g.fill();
    g.globalCompositeOperation='source-atop';
    g.fillStyle='rgba(20,18,34,.20)';g.fillRect(0,32,96,16);
    return c;
  }
  var cool=puff('rgba(226,214,222,.95)','rgba(150,140,170,.42)');
  var lit=puff('rgba(255,214,164,.95)','rgba(226,140,86,.40)');
  return SKY={stars:stars,far:far,near:near,clouds:clouds,cool:cool,lit:lit};
}
function drawSky(ctx,w2,horizon,ang,fov,atmo){
  var S=skyAssets(),TAU=Math.PI*2,tanH=Math.tan(fov/2),hw=w2*0.5;
  atmo=atmo||ATMOS.town;
  // The air the ground hazes into is the air the horizon has to dissolve into,
  // or the world stops at its own skyline.
  function airward(r,g2,b,t){
    return 'rgb('+((r*(1-t)+atmo.hr*t)|0)+','+((g2*(1-t)+atmo.hg*t)|0)+','+((b*(1-t)+atmo.hb*t)|0)+')';
  }
  // sky body: zenith indigo down to a smoke-and-ember horizon
  var g=ctx.createLinearGradient(0,0,0,horizon);
  g.addColorStop(0,'#141a38');g.addColorStop(0.42,'#2e2a4e');
  g.addColorStop(0.74,'#5b3f52');g.addColorStop(0.93,airward(147,84,63,0.42));
  g.addColorStop(1,airward(184,118,63,0.55));
  ctx.fillStyle=g;ctx.fillRect(0,0,w2,horizon);
  function dx(az){                                  // azimuth → screen x, or null if behind
    var d=az-ang;d=((d%TAU)+TAU*1.5)%TAU-Math.PI;
    // tan() runs away near the edge of the frustum; a runaway here hands a
    // non-finite centre to createRadialGradient and takes the whole view down.
    if(Math.abs(d)>Math.min(fov*0.72,1.30))return null;
    var t=Math.tan(d);
    if(!isFinite(t))return null;
    var x=hw+t/tanH*hw;
    return isFinite(x)?x:null;
  }
  function yOf(el){return horizon-el*horizon*0.94;}
  // the fire that is going out somewhere in the west, fixed to the world
  var gx=dx(4.71);
  if(gx!==null){
    var rg=ctx.createRadialGradient(gx,horizon,2,gx,horizon,Math.max(120,w2*0.42));
    rg.addColorStop(0,'rgba(255,158,64,.50)');rg.addColorStop(0.35,'rgba(226,96,48,.22)');
    rg.addColorStop(1,'rgba(60,30,50,0)');
    ctx.fillStyle=rg;ctx.fillRect(0,0,w2,horizon+1);
  }
  // stars, fading out toward the glow at the horizon
  for(var i=0;i<S.stars.length;i++){
    var st=S.stars[i],x=dx(st.az);
    if(x===null)continue;
    var a=st.b*Math.min(1,st.el*3.1);
    if(a<=0.02)continue;
    ctx.fillStyle='rgba(236,230,214,'+a.toFixed(3)+')';
    ctx.fillRect(x,yOf(st.el),st.s,st.s);
  }
  // a low moon, gibbous, with its own halo
  var mx=dx(2.30),my=yOf(0.42);
  if(mx!==null){
    var mr=Math.max(14,horizon*0.055);
    var hg=ctx.createRadialGradient(mx,my,mr*0.6,mx,my,mr*5.2);
    hg.addColorStop(0,'rgba(255,238,206,.30)');hg.addColorStop(1,'rgba(255,220,180,0)');
    ctx.fillStyle=hg;ctx.fillRect(mx-mr*6,my-mr*6,mr*12,mr*12);
    ctx.fillStyle='#f2e6c8';ctx.beginPath();ctx.arc(mx,my,mr,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(190,176,152,.55)';
    ctx.beginPath();ctx.arc(mx-mr*0.32,my-mr*0.18,mr*0.26,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(mx+mr*0.28,my+mr*0.30,mr*0.18,0,TAU);ctx.fill();
  }
  // clouds: width taken from the same projection, so they stretch at the edges
  ctx.save();ctx.imageSmoothingEnabled=true;
  for(var k=0;k<S.clouds.length;k++){
    var c=S.clouds[k],cx2=dx(c.az);
    if(cx2===null)continue;
    var x1=dx(c.az-c.da),x2=dx(c.az+c.da);
    var wpx=(x2!==null&&x1!==null)?Math.abs(x2-x1):c.da*2*hw/tanH*0.5;
    var hpx=Math.max(6,wpx*c.h*6.5);
    ctx.globalAlpha=c.a;
    ctx.drawImage(c.warm?S.lit:S.cool,cx2-wpx*0.5,yOf(c.el)-hpx*0.5,wpx,hpx);
  }
  ctx.globalAlpha=1;ctx.restore();
  // ridgelines, filled from the projected table so they slide as you turn
  function ridgeLine(tbl,fill,rim){
    var N=tbl.length;
    ctx.beginPath();ctx.moveTo(-2,horizon+1);
    for(var px=-2;px<=w2+2;px+=6){
      var az=ang+Math.atan((px-hw)/hw*tanH);
      var f=((az/TAU)%1+1)%1*N,i0=f|0,fr=f-i0;
      var hh=tbl[i0%N]+(tbl[(i0+1)%N]-tbl[i0%N])*fr;
      ctx.lineTo(px,horizon-hh*horizon*1.9);
    }
    ctx.lineTo(w2+2,horizon+1);ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(rim){ctx.strokeStyle=rim;ctx.lineWidth=1.4;ctx.stroke();}
  }
  // aerial perspective on the ranges themselves: the far ridge is further into
  // the air than the near one, so it is lighter and colder, not just smaller
  ridgeLine(S.far,airward(43,47,69,0.50),'rgba(255,168,96,.14)');
  ridgeLine(S.near,airward(27,31,44,0.22),'rgba(255,150,84,.10)');
  // haze where the world meets the sky, so the ranges sink into the dusk
  var hz=ctx.createLinearGradient(0,horizon-Math.max(8,horizon*0.10),0,horizon+1);
  hz.addColorStop(0,'rgba('+atmo.hr+','+atmo.hg+','+atmo.hb+',0)');
  hz.addColorStop(1,'rgba('+atmo.hr+','+atmo.hg+','+atmo.hb+',.46)');
  ctx.fillStyle=hz;ctx.fillRect(0,horizon-Math.max(8,horizon*0.10),w2,Math.max(8,horizon*0.10)+1);
}

/* ================= render ================= */
function render(prep,cam,scale,opts){
  lastMs=0;
  if(!ctx)return 0;
  var t0=performance.now();
  scale=scale||1;
  resize();                      // stay glued to the stage and the device
  animTick++;
  // A NaN here would take the whole view down, and this file's history says a
  // stray hoisted variable is the most likely way to get one. Degrade instead.
  var w2=Math.max(160,Math.floor(W*scale)||160),h2=Math.max(100,Math.floor(H*scale)||100);
  // low-res motion frames paint in a shrunken coordinate space; stretch it
  // over the full canvas backing store so the view never letterboxes.
  ctx.setTransform(W/w2,0,0,H/h2,0,0);
  var horizon=h2/2;
  var outdoor=!!(prep.def.outdoor||prep.def.safe||prep.def.overland);
  var mat=materialFor(prep.def,prep.def.id);
  var atmo=atmosphereFor(mat,outdoor);
  // Base fills are the floor of the model: whatever the cast does not reach, and
  // the fallback when pixel work is unavailable, already carries this air's colour.
  ctx.fillStyle='rgb('+((atmo.hr*0.30)|0)+','+((atmo.hg*0.30)|0)+','+((atmo.hb*0.32)|0)+')';
  ctx.fillRect(0,0,w2,horizon);
  var flr=ctx.createLinearGradient(0,horizon,0,h2);
  flr.addColorStop(0,'rgb('+((atmo.hr*0.62)|0)+','+((atmo.hg*0.62)|0)+','+((atmo.hb*0.62)|0)+')');
  flr.addColorStop(1,'rgb('+atmo.sr+','+atmo.sg+','+atmo.sb+')');
  ctx.fillStyle=flr;ctx.fillRect(0,horizon,w2,h2-horizon);
  // camera
  var a0=(cam.ang!==undefined)?cam.ang:[-Math.PI/2,0,Math.PI/2,Math.PI][cam.dir];
  var fov=1.15;
  var cx=cam.x,cy=cam.y;
  if(outdoor)drawSky(ctx,w2,horizon,a0,fov,atmo);
  // A wall slice is a constant *visual* width: one design unit wide, whatever
  // the device resolution. Motion frames shrink the space, so shrink with it.
  var colw=Math.max(1,Math.round(Look.slicePx(REC)*scale));
  var bslice=Math.max(1,Math.round(Look.billPx(REC)*scale));
  /* The camera can only make sense of a handful of placed lights at once, so keep
     the nearest few and let the rest wait. Each one is then one small 1/(1+d²f)
     term per wall column and per lit ground sample — the same response as the
     camera's own light, just centred somewhere other than here. */
  /* Placed lights. "The four nearest" is the obvious rule and the wrong one: three
     torches at your back crowd out the single torch you are looking at, so the
     feature vanishes exactly when you would notice it. Keep the nearest ones that
     are actually in front of the camera. */
  var LGS=[],LALL=prep.lights||[];
  if(LALL.length&&Look.tierIndex()>0){
    /* The same camera plane the walls, billboards and light bodies use: f is the
       view axis and p points to the RIGHT. Flipping this puts the frustum test on
       the mirrored half of the field. */
    var fdX=Math.cos(a0),fdY=Math.sin(a0),ltH=Math.tan(fov/2);
    var rtX=-fdY*ltH,rtY=fdX*ltH;
    var ldet=1/(rtX*fdY-fdX*rtY);
    var LCAND=[];
    for(var li=0;li<LALL.length;li++){
      var LX=LALL[li],ldx=LX.x-cx,ldy=LX.y-cy,ld2=ldx*ldx+ldy*ldy;
      var lreach=LX.rad+13;
      if(ld2>lreach*lreach)continue;
      var tD=ldet*(-rtY*ldx+rtX*ldy);                // depth along the view axis
      if(tD<0.25)continue;                           // behind you
      var tS=ldet*(fdY*ldx-fdX*ldy);                 // across it, positive to the right
      if(tS<-tD*0.75-1.6||tS>tD*0.75+1.6)continue;   // outside the frustum and the flame's own width
      LCAND.push({L:LX,d2:ld2});
    }
    LCAND.sort(function(a,b){return a.d2-b.d2;});
    if(LCAND.length>5)LCAND.length=5;
    LGS=LCAND;
    for(var lj=0;lj<LGS.length;lj++){LGS[lj].d=Math.sqrt(LGS[lj].d2);LGS[lj].r2=LGS[lj].L.rad*LGS[lj].L.rad;}
  }
  var LON=LGS.length>0;
  var VARON=Look.tierIndex()>0;     // weathered facade variants are a fair-and-above luxury
  ctx.imageSmoothingEnabled=false;      // crisp masonry, no double-blur per slice
  zN=Math.ceil(w2/colw)+1;
  if(!zbuf||zbuf.length<zN)zbuf=new Float32Array(zN+4);
  for(var i0=0;i0<zN;i0++)zbuf[i0]=99;
  var DOORS=prep.doorW||null,camTX=cx|0,camTY=cy|0;   // storefronts: solid to the eye
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
      var hi=mapY*prep.w+mapX;
      if(prep.wall[hi]){hit=1;c=prep.char[hi];}
      /* A storefront is a face you can walk through but not see through. It stays out of
         the wall set, because the door opens for anyone, but the eye is stopped by it -
         and you are the exception once you are standing in the doorway yourself. */
      else if(DOORS&&DOORS[hi]&&!(mapX===camTX&&mapY===camTY)){hit=1;c='*';}
    }
    if(hit!==1){continue;}
    dist=side===0?(mapX-cx+(1-stepX)/2)/rdx:(mapY-cy+(1-stepY)/2)/rdy;
    if(dist<=0.01)dist=.01;
    zbuf[ci]=dist;
    var lh=h2*0.9/dist;
    if(lh>h2*3)lh=h2*3;
    var y0=(h2-lh)/2;
    // texture column
    var wallU=side===0?(cy+dist*rdy):(cx+dist*rdx);
    var wallX=wallU-Math.floor(wallU);
    var doorFace=(c==='*');
    var texMat=mat.wall[c]||c,tex=texFor(texMat);
    /* The inside of a building's own wall is not a facade. On an outdoor map a face
       whose far side is roofed bounds a room, and a room has one door for light:
       plain lime wash, no windows, and kept dim. This is also what makes a doorway
       legible from the street. With the same bright plaster on both sides, the shop
       front and the shop's back wall are the same pale wall, and the entrance has
       no contrast at all - the question becomes "where is the front of the inn?".
       A dark opening cut into a bright wall answers it without a sign. */
    var roomFace=0;
    if(outdoor&&!doorFace){
      var nbX=mapX,nbY=mapY;                  // the tile the face looks out on
      if(side===0)nbX+=(stepX>0?-1:1);else nbY+=(stepY>0?-1:1);
      roomFace=(nbX>=0&&nbY>=0&&nbX<prep.w&&nbY<prep.h)?prep.roof[nbY*prep.w+nbX]:0;
      if(roomFace&&mat.interior)tex=texFor(mat.interior);
    }
    /* Same block, different weathering, and sometimes the other hand. A wall face
       is identified by its tile and its orientation, so the choice is stable while
       you look at it and different down the corridor. */
    var vseed=((mapX*7+mapY*13+(side?5:0))>>>0);
    var mir=((side===0&&rdx>0)||(side===1&&rdy<0))?1:0;
    if(VARON&&!doorFace&&tex&&tex.vars&&(vseed&1))tex=variantOf(tex,1+((vseed>>1)&1));
    var texCan=tex&&tex.chain?pickMip(tex.chain,lh):(tex&&tex.full?tex.full:null);
    var TW=texCan.width,TH=texCan.height;
    var texX=(wallX*TW)|0;
    if(mir^((vseed>>3)&1))texX=TW-1-texX;
    if(texCan&&texCan.width>0){
      try{ctx.drawImage(texCan,texX,0,1,TH,px,y0,colw,lh);}
      catch(e){ctx.fillStyle='#555';ctx.fillRect(px,y0,colw,lh);}
    }else{ctx.fillStyle='#555';ctx.fillRect(px,y0,colw,lh);}
    // ── the single response: lit toward the surface, airT toward the air ──
    var lit=1/(1+dist*dist*atmo.k);if(lit<atmo.amb)lit=atmo.amb;
    var airT=1-lit;
    var texU=(mir^((vseed>>3)&1))?1-wallX:wallX;
    var em=tex.emit?tex.emit[Math.min(TEXPX-1,Math.max(0,(texU*TEXPX)|0))]:0;   // lit windows keep their glow
    if(em>0)airT*=1-em;
    /* Placed light on this column. The exact hit point is known, so a sconce three
       steps down the passage brightens the wall beside it and leaves the next one
       alone — which is what makes a corridor read as a place rather than a tunnel. */
    var lhit=0;
    if(LON){
      var hpar=side===0?(stepX>0?mapX:mapX+1):(stepY>0?mapY:mapY+1);
      var lhx=side===0?hpar:wallU,lhy=side===0?wallU:hpar;
      for(var lk=0;lk<LGS.length;lk++){
        var LG=LGS[lk],lqx=lhx-LG.L.x,lqy=lhy-LG.L.y,lq2=lqx*lqx+lqy*lqy;
        if(lq2>LG.r2)continue;
        lhit+=LG.L.i/(1+lq2*LG.L.fl);
      }
      /* Same rule as the ground: the lamp fills the light the camera's lost, it does
         not pile on top of light the surface already has. */
      var lroom=1.18-lit;
      if(lhit>lroom)lhit=lroom>0?lroom:0;
      if(lhit>0.02)airT=Math.max(0,airT-lhit*0.80);   // nearer lamps thin the air in front of them
    }
    if(airT>0.015){
      ctx.fillStyle='rgba('+atmo.hr+','+atmo.hg+','+atmo.hb+','+airT.toFixed(3)+')';
      ctx.fillRect(px,y0,colw,lh);
    }
    if(lit>0.70){                                     // near the lamp the air is warm
      ctx.fillStyle='rgba(255,190,116,'+((lit-0.70)*0.19).toFixed(3)+')';
      ctx.fillRect(px,y0,colw,lh);
    }
    // Which way the wall faces belongs to the light, not to a fixed 34% of black.
    if(side===1){ctx.fillStyle='rgba(10,12,20,'+(0.30*lit).toFixed(3)+')';ctx.fillRect(px,y0,colw,lh);}
    /* A room's own dimness, held back from the distance haze so a far interior does
       not simply turn into air. */
    if(roomFace){
      ctx.fillStyle='rgba(14,11,9,'+(0.40*(0.34+0.66*lit)).toFixed(3)+')';
      ctx.fillRect(px,y0,colw,lh);
    }
    /* Corners, measured rather than assumed. The DDA stopped at a wall; walking on
       along that face tells us how far it is to the end of the run, so a long facade
       keeps an even light and only the ground near an actual corner darkens. The old
       term was a function of the texture coordinate, so every block repeated the same
       fake corner. */
    var runA=0,runB=0,rw;
    if(side===0){
      for(rw=mapY-1;rw>=0&&runA<9&&prep.wall[rw*prep.w+mapX];rw--)runA++;
      for(rw=mapY+1;rw<prep.h&&runB<9&&prep.wall[rw*prep.w+mapX];rw++)runB++;
    }else{
      for(rw=mapX-1;rw>=0&&runA<9&&prep.wall[mapY*prep.w+rw];rw--)runA++;
      for(rw=mapX+1;rw<prep.w&&runB<9&&prep.wall[mapY*prep.w+rw];rw++)runB++;
    }
    var edge=Math.min(wallX+runA,1-wallX+runB);
    var cor=edge>=1.45?0:(1-edge/1.45);cor=cor*cor*0.32*(0.32+0.68*lit);
    if(cor>0.012){ctx.fillStyle='rgba(8,9,16,'+cor.toFixed(3)+')';ctx.fillRect(px,y0,colw,lh);}
    /* A door is framed in timber. If the room beside this face has a roof, then the
       wall ends at a doorway on that side, so the shared edge gets an oak jamb and
       the head of the wall a lintel. The opening you can see into carries the hint
       when you are close; at a distance, or when the room is dark, the frame is all
       that says "here, this one is a door". */
    if(outdoor&&!roomFace&&!doorFace){
      var dA=0,dB=0;
      if(side===0){
        if(mapY>0)dA=prep.roof[(mapY-1)*prep.w+mapX];
        if(mapY<prep.h-1)dB=prep.roof[(mapY+1)*prep.w+mapX];
      }else{
        if(mapX>0)dA=prep.roof[mapY*prep.w+mapX-1];
        if(mapX<prep.w-1)dB=prep.roof[mapY*prep.w+mapX+1];
      }
      var jamb=0,t2;
      if(dA)jamb=1-wallX/0.17;
      if(dB){t2=1-(1-wallX)/0.17;if(t2>jamb)jamb=t2;}
      jamb=jamb<0?0:(jamb>1?1:jamb);
      if(jamb>0.01){
        ctx.fillStyle='rgba(34,21,13,'+(jamb*(0.30+0.34*lit)).toFixed(3)+')';
        ctx.fillRect(px,y0,colw,lh);
      }
      if(dA||dB){
        ctx.fillStyle='rgba(30,19,12,'+(0.22+0.30*lit).toFixed(3)+')';
        ctx.fillRect(px,y0,colw,Math.max(2,lh*0.11));
      }
    }
    if(lhit>0.02){                            // the lamp's own warmth, capped so it never bleaches
      ctx.fillStyle='rgba(255,186,112,'+Math.min(0.46,lhit*0.34).toFixed(3)+')';
      ctx.fillRect(px,y0,colw,lh);
    }
    // Contact ambient occlusion, graded and tinted instead of one black bar, with
    // a warm rim where the wall meets the roof so the join stays readable.
    var ao=Math.min(30,Math.max(3,lh*0.085));
    ctx.fillStyle='rgba(8,9,16,'+(0.10+0.26*lit*(1-em)).toFixed(3)+')';
    ctx.fillRect(px,y0+lh-ao,colw,ao);
    ctx.fillStyle='rgba(8,9,16,'+(0.05+0.14*lit*(1-em)).toFixed(3)+')';
    ctx.fillRect(px,y0+lh-ao*2.5,colw,ao*1.5);
    ctx.fillStyle='rgba(255,214,166,'+(0.055*lit+0.012).toFixed(3)+')';
    ctx.fillRect(px,y0,colw,Math.min(9,Math.max(1,lh*0.022)));
  }
  /* ---------- cast-textured ground, and roof ---------- */
  var groundTexs=FLOORFAIL?null:groundTextures();
  if(!FLOORFAIL&&(!groundTexs['.']||!groundTexs['.'].data))FLOORFAIL=1;
  var dirX0=Math.cos(a0),dirY0=Math.sin(a0),tanH0=Math.tan(fov/2);
  var plX=-dirY0*tanH0,plY=dirX0*tanH0;
  // The roof is the mirror of the floor at the same distances, so it rides the
  // same cast: one pass, one budget, and the ceiling belongs to the same
  // building as the walls. Outdoors the sky owns the upper half instead.
  var ceilKey=mat.ceil||(outdoor?null:'vault');
  var ceilTex=null;
  if(ceilKey&&!FLOORFAIL){
    var ct=ceilTextures()[ceilKey]||ceilTextures().vault;
    if(ct&&ct.chain&&ct.chain[0]&&ct.chain[0].d)ceilTex=ct;
  }
  var yTop=ceilTex?0:horizon;
  /* A roof plane seen from the street is a soffit in shadow, not a slab of
     daylight: from the lane, the far side of a building shows its own ceiling
     above the wall head, and left at full sky brightness it reads as a pale
     sheet floating over the lane. Seen while standing under it, the same plane
     is a room's ceiling and takes full light. */
  var camRoof=prep.roof[(cy|0)*prep.w+(cx|0)]?1:0;
  var ceilDim=camRoof?1:0.42;
  var vspan=h2-yTop;
  // Casting costs one texel per sample; budget the samples and let the step
  // factors follow, so big canvases don't pay quadratically.
  var fsc=Math.min(.5,Math.sqrt(Look.floorBudget()/Math.max(1,w2*vspan)));
  fsc=Math.max(.14,fsc);
  var FH=Math.max(1,Math.ceil(vspan*fsc)),FW=Math.max(1,Math.ceil(w2*fsc));
  var fstepX=w2/FW,fstepY=vspan/FH;
  if(!FBUF||FBUF.W!==FW||FBUF.H!==FH){
    FBUF={W:FW,H:FH,can:document.createElement('canvas')};
    FBUF.can.width=FW;FBUF.can.height=FH;FBUF.ctx=FBUF.can.getContext('2d');
    FBUF.img=FBUF.ctx.createImageData(FW,FH);
  }
  if(!FBUF||!FBUF.img||!FBUF.img.data){FLOORFAIL=1;FBUF=null;}
  var fpx=FBUF&&!FLOORFAIL?FBUF.img.data:null;
  if(FBUF&&fpx){
  var airR=atmo.hr,airG=atmo.hg,airB=atmo.hb;               // one air, both surfaces
  /* World step per buffer sample. The row spans the camera plane exactly once:
     its left edge is (f - p) and its right edge must be (f + p), so crossing the
     full width w2 advances two plane widths. A sample is fstepX pixels of that.
     The factor of two that used to live here made the row span f-p .. f+3p, which
     sheared the entire ground half a field to the right: walking forward streamed
     the floor sideways instead of under you. */
  var stepW=fstepX/w2;   // camera derivative × fstepX
  /* The buffer is composited over the wall pass, so a pixel it leaves untouched
     shows the wall behind it. Ground that sits behind a wall is hidden by that
     wall and must not be painted at all: filling those pixels with "shade" is
     what used to drag a black slab across every wall in the game. */
  fpx.fill(0);
  for(var fy=0;fy<FH;fy++){
    var sy=yTop+fy*fstepY+fstepY*0.75;
    var dy=sy-horizon;
    var upSide=dy<0;
    var ady=upSide?-dy:dy;
    var rowBase=fy*FW*4;
    var rowD=(h2*0.9)/(2*Math.max(0.35,ady));
    // One light level per row — distance is constant along a row, so the whole
    // lighting response costs nothing per pixel. The roof reads the same curve
    // scaled by atmo.roof: it sits above the light, so it hazes out sooner.
    var lit=1/(1+rowD*rowD*atmo.k);if(lit<atmo.amb)lit=atmo.amb;
    var lR=lit,lG=lit*(0.80+0.20*lit),lB=lit*(0.58+0.42*lit);
    var litc=lit*atmo.roof,lRc=litc,lGc=litc*(0.80+0.20*litc),lBc=litc*(0.58+0.42*litc);
    var airT=1-lit,airTc=1-litc;
    var hzR=airR*airT,hzG=airG*airT,hzB=airB*airT;
    var hzRc=airR*airTc*ceilDim,hzGc=airG*airTc*ceilDim,hzBc=airB*airTc*ceilDim;
    // one ground tile covers this depth in screen px — drives the mip choice
    var pxTile=(h2*0.45)/(rowD*(rowD+1));
    if(rowD>26){continue;}   // past the cast: the base gradient already carries this air
    var wxL=cx+(dirX0-plX)*rowD,wyL=cy+(dirY0-plY)*rowD;
    var dwx=(plX*2)*rowD*stepW,dwy=(plY*2)*rowD*stepW;
    for(var fx=0;fx<FW;fx++){
      var bx=fx*fstepX;
      var zci=Math.floor(bx/colw);
      var za=rowBase+(fx<<2);
      var zwall=zbuf[zci];
      if(zwall!==undefined&&rowD>=zwall-0.02){
        /* Hidden behind a wall. The wall's slice covers every row from its head down,
           so the only ground pixel a wall cannot account for is one above that head -
           and above the head of a wall, seen from under a roof, is the ceiling behind
           it. Leaving those pixels transparent is what put a slit of night over the
           shop's own back wall. */
        if(!(upSide&&camRoof))continue;
        /* The ground buffer is sampled coarsely and stretched, so one cell covers many
           wall columns and a single column's head cannot decide it: a cell that spans a
           near wall and a far one gets left as a window onto the night. Ask every column
           the cell covers, and paint if any of them has open air above its head. */
        var headMax=-1,cc,cmax=Math.min(zN,Math.floor((bx+fstepX)/colw)+1);
        for(cc=Math.floor(bx/colw);cc<cmax;cc++){
          var cz=zbuf[cc];if(cz===undefined||cz>=90)continue;
          var chy=(h2-h2*0.9/cz)*0.5;
          if(chy>headMax)headMax=chy;
        }
        if(headMax<0||sy>headMax+fstepY)continue;     // every wall here reaches this row
        roofed=1;gx=cx|0;gy=cy|0;ch=prep.char[(cy|0)*prep.w+(cx|0)];
        u=(u%1+1)%1;v=(v%1+1)%1;
      }
      var wx=wxL+dwx*fx,wy=wyL+dwy*fx;
      var gx=Math.floor(wx),gy=Math.floor(wy);
      var ch=(gx>=0&&gy>=0&&gx<prep.w&&gy<prep.h)?prep.char[gy*prep.w+gx]:'?';
      var u=(wx-Math.floor(wx)),v=(wy-Math.floor(wy));
      var roofed=(gx>=0&&gy>=0&&gx<prep.w&&gy<prep.h)?prep.roof[gy*prep.w+gx]:0;
      var a=za,src,mr2,mg2,mb2;
      if(upSide){
        /* No roof here: leave the pixel untouched. The ground buffer starts
           transparent, so the sky that was drawn under it survives, and a street
           stays open while the shop next door is closed over. */
        var fedge=0;
        if(!roofed){
          /* Steeply upward, the sample steps out through the wall itself before it
             can describe the roof, so the answer comes back "sky" and a wedge of
             night sits at the top of every room you stand inside. The roof does run
             to the wall's inner face: sample a little nearer along the ray, and if
             that ground lies under a roof, the roof reaches here. */
          var bk=0.30/Math.max(1e-3,rowD);
          var qx=wx-(wx-cx)*bk,qy=wy-(wy-cy)*bk;
          var qgx=Math.floor(qx),qgy=Math.floor(qy);
          if(qgx>=0&&qgy>=0&&qgx<prep.w&&qgy<prep.h&&prep.roof[qgy*prep.w+qgx]){
            roofed=1;gx=qgx;gy=qgy;ch=prep.char[qgy*prep.w+qgx];
            u=qx-qgx;v=qy-qgy;fedge=1;
          }else if(camRoof){
            /* Nothing nearer is under a roof either. Past a tile the air often is open -
               but only along a line that gets there without crossing masonry. Standing
               under a roof you cannot see the sky through the building's own wall, so if
               the run to this sample is stopped by a wall, the pixel is ceiling. The test
               is deliberately a short march: it costs nothing for the open cone of a
               doorway, which is the only place indoors that the sky is allowed. */
            var cwx=wx-cx,cwy=wy-cy,cl=Math.sqrt(cwx*cwx+cwy*cwy),occ=false;
            for(var cstep=0.3;cstep<cl;cstep+=0.3){
              var kgx=(cx+cwx*cstep/cl)|0,kgy=(cy+cwy*cstep/cl)|0;
              if(kgx<0||kgy<0||kgx>=prep.w||kgy>=prep.h)break;
              if(prep.wall[kgy*prep.w+kgx]){occ=true;break;}
            }
            if(!occ)continue;
            roofed=1;gx=cx|0;gy=cy|0;ch=prep.char[(cy|0)*prep.w+(cx|0)];
            u=(u%1+1)%1;v=(v%1+1)%1;
          }else continue;
        }
        /* The leading edge of a roof seen from the lane is a fascia board, not an
           infinite plane: the first band of ceiling you see over a wall head is
           edge-on and in its own shadow, which is the difference between a floating
           sheet and the eaves of a building. */
        var fascia=fedge;
        if(!camRoof&&!fedge){
          var fax=gx,fay=gy,fdx=wx-cx,fdy=wy-cy;
          if(Math.abs(fdx)>=Math.abs(fdy)){if(fdx>0)fax--;else fax++;}
          else{if(fdy>0)fay--;else fay++;}
          fascia=((fax>=0&&fay>=0&&fax<prep.w&&fay<prep.h)?prep.roof[fay*prep.w+fax]:1)?0:1;
        }
        var fdim=fascia?0.40:1;
        src=groundSample(ceilTex,u,v,pxTile);
        mr2=lRc*ceilDim*fdim;mg2=lGc*ceilDim*fdim;mb2=lBc*ceilDim*fdim;
      }else{
        // Indoors, every walkable character that is not a named outdoor surface
        // (door, chest cell, stairs, rubble) wears the building's own floor —
        // otherwise a lone event tile in a crypt shows up as village flagstone.
        var OPENG=ch===','||ch==='='||ch==='+'||ch==='T'||ch==='n'||ch==='%'||ch==='~';
        var laid=mat.floor&&!OPENG&&ch!=='?'&&(roofed||!outdoor);
        var fk=laid?mat.floor['.']:ch;
        var texG=groundTexs[fk]||groundTexs[ch]||groundTexs['?'];
        if(!texG){fpx[a]=hzR;fpx[a+1]=hzG;fpx[a+2]=hzB;fpx[a+3]=255;continue;}
        src=groundSample(texG,u,v,pxTile);
        mr2=lR;mg2=lG;mb2=lB;
      }
      if(!src){
        fpx[a]=upSide?hzRc:hzR;fpx[a+1]=upSide?hzGc:hzG;fpx[a+2]=upSide?hzBc:hzB;
        fpx[a+3]=255;continue;
      }
      // Contact shadow: the ground approaching a wall receives less of the room.
      // Folded into the light terms, so the common sample costs no extra work.
      if(zwall!==undefined){
        var gap=zwall-rowD;
        if(gap<1.7){
          var cs=0.40+0.60*(gap/1.7);
          mr2*=cs;mg2*=cs;mb2*=cs;
        }
      }
      /* Pooled light on the ground. The row's distance is known, and by the triangle
         inequality a lamp further from the camera than this row plus its reach cannot
         touch it — so the common case costs one subtraction, not a light loop. Where a
         lamp does reach, its warm term joins the light multipliers and its share of
         the haze steps back, which is what makes a bright pool around a brazier. */
      var fzm=fascia?0.45:1;
      var hzr=upSide?hzRc*fzm:hzR,hzg=upSide?hzGc*fzm:hzG,hzb=upSide?hzBc*fzm:hzB;
      if(LON){
        var lam=0,lk2;
        for(lk2=0;lk2<LGS.length;lk2++){
          var LG2=LGS[lk2];
          if(LG2.d-rowD>LG2.L.rad)continue;
          var pux=wx-LG2.L.x,puy=wy-LG2.L.y,pu2=pux*pux+puy*puy;
          if(pu2>LG2.r2)continue;
          lam+=LG2.L.i/(1+pu2*LG2.L.fl);
        }
        if(upSide)lam*=0.45;
        if(lam>0.004){
          /* A lamp only adds what the camera's own light has left unclaimed. Under
             your feet the lamp is already at full so a torch there changes nothing;
             three passages away, where the camera light has died, the same torch
             takes over. Adding outright instead of filling spare room is what turned
             village grass into lime. */
          var room=1.18-lit;
          if(lam>room)lam=room>0?room:0;
          if(lam>0.004){
            mr2+=lam*1.06;mg2+=lam*0.70;mb2+=lam*0.32;
            var hdm=1-Math.min(0.86,lam*0.80);
            hzr*=hdm;hzg*=hdm;hzb*=hdm;
          }
        }
      }
      // same arithmetic cost as the old two-term fog mix: three multiplies, three adds
      fpx[a]  =src[0]*mr2+hzr;
      fpx[a+1]=src[1]*mg2+hzg;
      fpx[a+2]=src[2]*mb2+hzb;
      fpx[a+3]=255;
    }
  }
  FBUF.ctx.putImageData(FBUF.img,0,0);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(FBUF.can,0,yTop,w2,vspan);
  ctx.restore();}

  // billboards, far to near. Goods belong to the map, not to the party.
  var ents=(opts&&opts.entities)||[];
  if(prep.props&&prep.props.length)ents=ents.concat(prep.props);
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
      var en=e.en,frames=sprite(en.spr);
      if(!frames||!frames.length)return;
      var spr=poseOf(frames,en);
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
      for(var xx=x0;xx<x1;xx+=bslice){
        var idx=Math.floor(xx/colw);              // the depth buffer is wall-sliced
        if(zbuf[idx]!==undefined&&zbuf[idx]<=e.tY+.12)continue;   // occluded by wall
        var u=(xx-(sx-swp/2))/swp;
        try{ctx.drawImage(spr,Math.min(TW2-1,(u*TW2)|0),0,Math.max(1,(bslice/swp*TW2)|0),TH2,xx,top,bslice,shp);}
        catch(e2){}
      }
      if(en.tag&&x0<sx&&sx<x1&&!(zbuf[Math.floor(sx/colw)]<=e.tY+.12)){
        ctx.fillStyle='#e06a4a';ctx.font=Math.max(11,Math.round(h2*.022))+'px Georgia';
        ctx.fillText(en.tag,sx-swp/2,bottom+Math.max(11,h2*.022));
      }
      ctx.globalAlpha=1;
    });
  }
  /* ---- the sources themselves ----
     A light that illuminates a room but has no body in it looks like a camera bug.
     Each light gets a bracket or a brazier, a flame, and a glow that occupies the air
     it is lighting. Nothing here flickers: the scene repaints on demand, and a flame
     that only moves while you move would look broken the moment you stop. */
  if(LON){
    var ldirX=Math.cos(a0),ldirY=Math.sin(a0),ltanH=Math.tan(fov/2);
    var lplX=-ldirY*ltanH,lplY=ldirX*ltanH;
    var ldet=1/(lplX*ldirY-ldirX*lplY);
    for(var lm=0;lm<LGS.length;lm++){
      var LT=LGS[lm].L,ldx2=LT.x-cx,ldy2=LT.y-cy;
      var ltX=ldet*(ldirY*ldx2-ldirX*ldy2),ltY=ldet*(-lplY*ldx2+lplX*ldy2);
      /* A torch you are standing inside has no readable shape: at half a unit the
         projection puts a screen-high flame above your eye line, in the ceiling.
         Below arm's length it is only a smear of light on the walls, which the
         lighting pass already paints, so the body is skipped. */
      if(ltY<0.85||Math.abs(ltX/ltY)>3.0)continue;
      var lsx=(w2/2)*(1+ltX/ltY);
      var llh=h2*0.9/ltY,lbot=horizon+llh/2;
      var lzi=Math.max(0,Math.min(zN-1,Math.floor(lsx/colw)));
      if(zbuf[lzi]!==undefined&&zbuf[lzi]<ltY-0.22)continue;      // around a corner, out of sight
      var lhy=LT.floor?lbot-llh*0.17:lbot-llh*0.62;
      var lfr=Math.max(1.6,llh*0.020);
      /* The halo is a glow, not a disc of fire: left unclamped it grows past the
         frame at close range and flattens the whole view to orange. */
      var lrad=Math.min(h2*0.30,Math.max(7,llh*0.26));
      var lgr=ctx.createRadialGradient(lsx,lhy,0,lsx,lhy,lrad);
      lgr.addColorStop(0,'rgba(255,206,136,.55)');
      lgr.addColorStop(0.34,'rgba(236,140,60,.20)');
      lgr.addColorStop(1,'rgba(168,84,26,0)');
      ctx.fillStyle=lgr;
      ctx.beginPath();ctx.arc(lsx,lhy,lrad,0,6.29);ctx.fill();
      if(LT.floor){                                   // brazier: three legs and a bowl
        ctx.fillStyle='#20180f';
        ctx.fillRect(lsx-lfr*2.0,lhy+lfr*1.2,lfr*4.0,lfr*1.5);
        ctx.fillStyle='#3a2c18';
        ctx.beginPath();ctx.ellipse(lsx,lhy+lfr*1.0,lfr*2.3,lfr*0.9,0,0,6.29);ctx.fill();
      }else{                                          // sconce: an iron bracket off the wall
        ctx.fillStyle='#241b12';
        ctx.fillRect(lsx-lfr*0.55,lhy+lfr*0.8,lfr*1.1,lfr*2.4);
        ctx.fillRect(lsx-lfr*1.6,lhy+lfr*1.5,lfr*3.2,lfr*0.6);
      }
      ctx.fillStyle='rgba(255,146,48,.92)';
      ctx.beginPath();ctx.ellipse(lsx,lhy-lfr*0.5,lfr*0.95,lfr*1.8,0,0,6.29);ctx.fill();
      ctx.fillStyle='rgba(255,232,182,.95)';
      ctx.beginPath();ctx.ellipse(lsx,lhy,lfr*0.45,lfr*0.95,0,0,6.29);ctx.fill();
    }
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

return{init:init,resize:resize,prepare:prepare,render:render,minimap:minimap,
  figTex:figTex,lastFrameMs:lastFrameMs,fit:function(){return REC;},
  texFailures:function(){buildTextures();return TEXFAIL;},
  /* A single material, large, on the page. Judging a painter by the swatch instead of
     by walking around a village looking for it is a different order of iteration. */
  texSwatch:function(k){
    buildTextures();
    var t=TEXCACHE[k];
    if(!t||!t.base)return 'no texture for '+k;
    var c=document.createElement('canvas');
    c.width=256;c.height=256;
    var g=c.getContext('2d');
    g.imageSmoothingEnabled=false;
    g.drawImage(t.base,0,0,256,256);
    document.body.innerHTML='';document.body.style.margin='0';
    document.body.appendChild(c);
    return 'swatch '+k+' mounted at 256px';
  }};
})();
