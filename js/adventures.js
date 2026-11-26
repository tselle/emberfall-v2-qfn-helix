/* Emberfall — js/adventures.js
 * The Long Roads: fifty generated adventures, built once at load from fixed
 * 32-bit seeds (Mulberry32). Same registry shapes as the hand-written saga —
 * village, region, dungeon floors, deeds, treasure, wander, rumors — so the
 * same engine plays them without a single special case.
 * IDs adv<t>_<i> · codes T<t>-<ii> (both one-based). */
'use strict';
var Adventures=(function(){

/* Band tables: chooser order per size — 4 small, 3 medium, 2 large, 1 huge. */
var THEMES=[
 ['vermin','fungus','beasts','bandits','goblinoid','swamp','lycanthrope','undead','goblinoid','undead'],
 ['vermin','beasts','menagerie','wizard','lycanthrope','swamp','frozen','giants','demons','dragon'],
 ['beasts','swamp','elemental','menagerie','underdark','devils','giants','undead','dragon','demons'],
 ['beasts','elemental','menagerie','frozen','wizard','underdark','devils','giants','devils','dragon'],
 ['giants','underdark','dragon','wizard','demons','devils','undead','giants','dragon','undead']];
var BANDLVL=[1,5,9,13,17];
var SIZES=['small','small','small','small','medium','medium','medium','large','large','huge'];
var FLOORS={small:1,medium:2,large:3,huge:5};
var SPAN={small:2,medium:4,large:5,huge:7};
var DIFFN=['','Standard','Grim','Hard','Grim','Deadly'];

/* Theme pools — every entry is a real registry monster. */
var POOL={
 vermin:[['rat',3],['bat',3],['beetle',2],['centipede',2],['spider',2],['rat',5],['centipede',3]],
 fungus:[['spider',2],['centipede',2],['bat',3],['beetle',2],['spider',3]],
 beasts:[['wolf',2],['rat',4],['wolf',3],['worg',2],['worg',3],['werehyena',1]],
 bandits:[['brigand',2],['brigand',3],['brigandchief',1],['brigand',4]],
 goblinoid:[['kobold',3],['kobold',4],['goblinx',0],['orc',2],['bugbear',2],['worg',2],['kobold',5],['bugbear',3]],
 swamp:[['spider',3],['werehyena',1],['wolf',3],['gnoll',2],['shadow',1],['ghoul',1]],
 lycanthrope:[['werehyena',1],['wolf',3],['werehyena',1],['worg',2],['wolf',4]],
 undead:[['skeleton',2],['zombie',2],['skeleton',3],['ghoul',1],['shadow',1],['zombie',3],['specter',1]],
 menagerie:[['orc',2],['gnoll',3],['wolf',2],['ogrewatcher',1],['gnoll',4],['bugbear',2]],
 wizard:[['cultist',2],['zealot',1],['cultist',3],['brigand',2],['ravenwitch',1]],
 frozen:[['zombie',3],['skeleton',2],['shadow',1],['specter',1],['wight',1]],
 giants:[['ogre',1],['ogre',2],['hillgiant',1],['ogrewatcher',1],['troll',1]],
 demons:[['zealot',2],['hellhound',1],['cultist',3],['specter',1],['hellhound',2]],
 dragon:[['troll',1],['hillgiant',1],['ogre',2],['worg',3],['gargoyle',1]],
 elemental:[['shadow',2],['specter',1],['zealot',2],['hellhound',1],['shadow',3]],
 underdark:[['bat',4],['spider',2],['centipede',3],['skeleton',2],['shadow',2],['gargoyle',1]],
 devils:[['hellhound',1],['specter',1],['zealot',2],['wight',1],['hellhound',2]],
};
POOL.goblinoid=POOL.goblinoid.filter(function(e){return MONSTERS[e[0]];});
/* The monster theme decides what the rooms are MADE of, so a delve reads before
   you meet anything in it. Consumed by View3d.materialFor via def.mat. */
var MATFORTHEME={
  undead:'crypt',dragon:'crypt',wizard:'crypt',lycanthrope:'crypt',
  underdark:'mine',elemental:'mine',fungus:'mine',goblinoid:'mine',
  bandits:'hall',menagerie:'hall',frozen:'keep',devils:'keep',
  vermin:'cellar',beasts:'cellar',swamp:'cellar',giants:'keep'
};
function poolFor(theme){return (POOL[theme]||POOL.beasts).filter(function(e){return MONSTERS[e[0]];});}
function bossFor(theme){
  var p=poolFor(theme).slice().sort(function(a,b){return (MONSTERS[b[0]].xp||0)-(MONSTERS[a[0]].xp||0);});
  return p[0][0];
}

/* Name foundries (wilderness stream) */
var VILLAGE=['Ashbourne','Dunhollow','Merefleet','Stonewake','Coldbrook','Thistlecross','Harrowmere','Grimsdale','Fenwick','Emberhollow','Mudcat','Rookleigh','Saltmarsh','Barrowby','Wolfcote','Kettlebridge','Mirkford','Dunmoor','Stotrelmead','Haregrath','Pinewick','Carrowdun','Vale End','Mudgate','Redmay','Lammas Cross','Dunwarren','Merecross','Blackquarry','Windrun'];
var REGION=['The Grey Fens','The Brindled Hills','Thornharrow','The Wolf Lines','Ashdown Forest','The Sunken Road','Kettlefell','The Mere Wilds','Baringsfell','The Hollow South','Rookmoor','The Cold Crown','Stammerwood','The Broken Steps','Deepfell','The Vesper Bogs','Longbarrow','The Ashen Strine','Mudwall Fen','Garrowvale','The Tin Hills','Waking Down','The Sallow Reach','Carrow Moss','The Riven Downs','Fenhallow','The Smolder Field','Hollowmarrow','The Standish Lines','Gravehills'];
var DUNGEON=['Cellars','Underworks','Vaults','Halls','Deep','Undercroft','Warrens','Fell','Pits','Run','Hollow','Chambers','Hag-Works','Galleries','Stair'];
var VFIRST=['Besa','Orrec','Hund','Maera','Kest','Urve','Sallow','Gryme','Voss','Tarkin','Ester','Brun','Ollok','Whispergin','Hale','Corvane','Dunness','Malda','Ferrow','Gath'];
var VLAST=['the Guttering','Blackbrand','Nine-Fingers','the pale','the Sluice','Ironshod','the unquiet','Red-Maw','the low','Bonebait','the third knock','Ashcrown','the widow','Grubtongue','the late','Kettle-crowned','the deep voice','Mireborn','the hungriest','Half-buried'];
var GIVER=['Elder','Thane','Reeve','Commander','Magistrate','Warden','Bailiff','Provost'];
var GNAME=['Maddoc','Halda','Bergen','Ysolde','Ceria','Bram','Oduvael','Prinn','Saeris','Tovald','Hesta','Corvane','Milla','Barnadine','Fenna','Old Cuth','Avra','Sable','Garrow','Wick'];
var TRAINER=['Sergeant Ilde','Master Brennan','Marchwarden Cael','Sergeant Voss','Fencer Aleth','Old Garett','Drill-Maister Brint'];
var QITEM=['a seal-ring of the lost garrison','the foreman’s ledger, pressed dry in ash','a reliquary shard wrapped in oilcloth','a captain’s broken banner','a strongbox key on a melted chain','an ivory tally of the old faith','a martyr’s thumb-bone in a silver cantle','a charter, sealed and unopened','the assayor’s weight-chain','a night-log of the deep watch'];

function pad2(i){return (i<10?'0':'')+i;}

/* ================= Village: templated on Thornwick / Coldharrow ================= */
function genVillage(tplKey,id,name,hall,trainer,regStart){
  var src=MAPS[tplKey];
  var def=JSON.parse(JSON.stringify(src));
  def.id='v_'+id;def.name=name;def.locName=name.toLowerCase();
  def.desc='Hearth-smoke and hatchets: the last street of '+name+', and beyond it all the Long Roads.';
  var keepMaps=['v_'+id,'reg_'+id];
  for(var f=1;f<=FLOORS[SIZES[0]];f++)keepMaps.push('f'+f+'_'+id);
  // prune stairs that would leave the adventure
  var drop=[];
  Object.keys(def.stairs||{}).forEach(function(k){
    if(keepMaps.indexOf(def.stairs[k].to)<0){drop.push(k);delete def.stairs[k];}
  });
  if(def.stairs&&!Object.keys(def.stairs).length)delete def.stairs;
  // rebuild grid without orphan stair glyphs
  var g=def.grid.slice();
  drop.forEach(function(k){var p=k.split(',');var row=g[+p[1]].split('');if(/[<>]/.test(row[+p[0]]))row[+p[0]]='.';g[+p[1]]=row.join('');});
  def.grid=g;
  def.exit={G:{to:'reg_'+id,x:9,y:13,dir:2,label:'The gate out onto the Long Roads'}};
  // rename services
  var gn=wrpick(GIVER)+' '+wrpick(GNAME);
  Object.keys(def.locs||{}).forEach(function(k){
    var l=def.locs[k];
    if(l.svc==='hall')l.name=gn+'’s Hall';
    else if(l.svc==='training')l.name=wrpick(TRAINER)+'’s Yard';
    else if(l.svc==='inn')l.name='The '+wrpick(['Cropped Oak','Warm Lantern','Salt Horse','Broken Wheel','Golden Antler','Ferryman’s Rest'])+' Inn';
    else if(l.svc==='tavern')l.name='The '+wrpick(['Cropped Oak','Salt Horse','Broken Wheel','Ferryman’s Rest','Singing Eel']);
    else if(l.svc==='temple')l.name='The Dawn-alms House';
    else if(l.svc==='armory')l.name=wrpick(['Brazenbrand','Orric','Halfdan','Steddian'])+'’s Forge';
    else if(l.svc==='general')l.name=wrpick(['Grimsby','Marrow','Quick-nail'])+'’s General Store';
    else if(l.svc==='apothecary')l.name='the Botanic Bench';
  });
  MAPS['v_'+id]=def;
  return def;
}
var _wr=null;function wrpick(a){return _wr.pick(a);}

/* ================= Dungeon floor generation (secrets stream) ================= */
function blankGrid(w,h,ch){var g=[];for(var y=0;y<h;y++){var r=[];for(var x=0;x<w;x++)r.push(ch||'#');g.push(r);}return g;}
function genFloor(dr,id,fi,floors,theme,lvl){
  var W=25,H=19;
  for(var attempt=0;attempt<50;attempt++){
    var out=tryFloor(dr,id,fi,floors,theme,lvl,W,H,attempt);
    if(out)return out;
    dr=new Rules.RNG((dr.s+911)>>>0);
  }
  return tryFloor(dr,id,fi,floors,theme,lvl,W,H,99);
}
function tryFloor(dr,id,fi,floors,theme,lvl,W,H,attempt){
  var g=blankGrid(W,H,'#');
  // 4×3 candidate room slots
  var slots=[];
  for(var c=0;c<4;c++)for(var r=0;r<3;r++)slots.push({c:c,r:r});
  var nRooms=attempt>8?5:(3+dr.int(0,2));
  var chosen=dr.shuffle(slots).slice(0,nRooms);
  var rooms=chosen.map(function(s){
    var w=Math.min(5,3+dr.int(0,2)),h=Math.min(4,3+dr.int(0,1));
    var x0=2+s.c*6,y0=2+s.r*6;
    var x=x0+dr.int(0,5-w),y=y0+dr.int(0,5-h);
    var room={x:x,y:y,w:w,h:h,cx:x+(w>>1),cy:y+(h>>1)};
    for(var yy=y;yy<y+h;yy++)for(var xx=x;xx<x+w;xx++)g[yy][xx]='.';
    return room;
  });
  function corridor(a,b){
    var x=a.cx,y=a.cy;
    var horizFirst=dr.chance(.5);
    function hstep(nx,ny){if(g[ny][nx]==='#')g[ny][nx]='.';}
    if(horizFirst){
      while(x!==b.cx){x+=Math.sign(b.cx-x);hstep(x,y);}
      while(y!==b.cy){y+=Math.sign(b.cy-y);hstep(x,y);}
    }else{
      while(y!==b.cy){y+=Math.sign(b.cy-y);hstep(x,y);}
      while(x!==b.cx){x+=Math.sign(b.cx-x);hstep(x,y);}
    }
  }
  var order=rooms.slice().sort(function(a,b){return (a.cy*W+a.cx)-(b.cy*W+b.cx);});
  for(var i=1;i<order.length;i++)corridor(order[i-1],order[i]);
  if(order.length>2&&dr.chance(.55))corridor(dr.pick(rooms),dr.pick(rooms));
  // door at pinch points: corridor cell, walls opposite, room abreast
  var isRoom=function(x,y){return rooms.some(function(rm){return x>=rm.x&&x<rm.x+rm.w&&y>=rm.y&&y<rm.y+rm.h;});};
  if(attempt>8){ // fallback trunk corridor guarantees connectivity
    for(var tx=1;tx<W-1;tx++)if(g[2][tx]==='#')g[2][tx]='.';
    var rc=order[order.length-1];for(var ty=2;ty<rc.cy;ty++)if(g[ty][rc.cx]==='#')g[ty][rc.cx]='.';
  }
  for(var y=1;y<H-1;y++)for(var x=1;x<W-1;x++){
    if(g[y][x]!=='.')continue;
    if(isRoom(x,y))continue;
    if((g[y][x-1]==='#'&&g[y][x+1]==='#')||(g[y-1][x]==='#'&&g[y+1][x]==='#')){
      var sideRoom=(g[y-1][x]==='.'&&isRoom(x,y-1))||(g[y+1][x]==='.'&&isRoom(x,y+1))||
                   (g[y][x-1]==='.'&&isRoom(x-1,y))||(g[y][x+1]==='.'&&isRoom(x+1,y));
      if(sideRoom&&dr.chance(.5))g[y][x]='D';
    }
  }
  // flood from entry room
  var entry=order[0];
  var dist=bfsGrid(g,entry.cx,entry.cy);
  // room distances & sort
  var far=rooms.slice().sort(function(a,b){return (dist[b.cy*W+b.cx]||0)-(dist[a.cy*W+a.cx]||0);});
  var roomsOK=far.length>=4?true:(far.length>=3&&nRooms>=3);
  var bossRoom=far[0],lieuRoom=far[1]||far[0],chestRooms=far.slice(2,5);
  var stairs={};
  // entry marker for upper floors: stairs up in entry room
  if(fi>1){g[entry.cy][entry.cx]='<';}
  // events: boss (a), lieutenant (b), chests (c..e), quest item chest (h), secret (f/g)
  var ev={},letters=[];
  function place(ch,room){
    if(!room)return null;
    var cands=[[room.cx,room.cy],[room.cx+1,room.cy],[room.cx-1,room.cy],[room.cx,room.cy+1],[room.cx,room.cy-1]]
      .filter(function(p){return g[p[1]]&&g[p[1]][p[0]]==='.';});
    if(!cands.length)return null;
    var pk=cands[dr.int(0,cands.length-1)];
    g[pk[1]][pk[0]]=ch;return{x:pk[0],y:pk[1]};
  }
  var placed=[];
  var bp=place('a',bossRoom);if(!bp)return null;placed.push(bp);
  ev.a={enc:{mons:[['bo_'+id+'_'+fi,1]].concat(themeGuards(theme,dr,lvl)),text:dr.pick([
    'At the room\u2019s heart waits the master of this floor, and the room is shaped like waiting.',
    'It has heard the stairs. It has been rehearsing.',
    'The air here is ruled by one throat.']),quest:'q_'+id+'_'+fi},leader:1};
  // stairs down: a free corner of the boss room, clear of every event letter
  var deeper=null;
  if(fi<floors){
    var cands=[[bossRoom.x,bossRoom.y],[bossRoom.x+bossRoom.w-1,bossRoom.y],[bossRoom.x,bossRoom.y+bossRoom.h-1],[bossRoom.x+bossRoom.w-1,bossRoom.y+bossRoom.h-1]]
      .filter(function(p){return g[p[1]][p[0]]==='.';});
    if(!cands.length)return null;
    deeper={x:cands[0][0],y:cands[0][1]};
    g[deeper.y][deeper.x]='>';
  }
  var lp=place('b',lieuRoom);if(lp)placed.push(lp);
  if(lp)ev.b={enc:{mons:[lieutenant(id,fi,theme,dr)],text:'A masked subordinate holds this reach for its master.'},leader:1};
  chestRooms.forEach(function(rm,ci){
    var ch='cdefg'.charAt(ci);var p2=place(ch,rm);if(!p2)return;placed.push(p2);
    var gold=(2+lvl)+'d6x10';
    ev[ch]={chest:{text:dr.pick(['A strongbox under rubble.','Sacked goods, sorted by someone in a hurry.','A dead man’s bundle, still tied.']),gold:gold}};
    if(dr.chance(.3))ev[ch].chest.trap=dr.pick(['darts','gas','needles','fire']);
    if(dr.chance(.25))ev[ch].chest.items=['potioncure'];
  });
  // secret treasures: 1–2 alcove-ish cells off corridors
  if(dr.chance(.7)){
    var sc=place('f',dr.pick(rooms));
    if(sc){ev.f={chest:{text:'A hidden niche behind a false stone.',gold:(1+Math.ceil(lvl/2))+'d6x10',hidden:1}};placed.push(sc);}
  }
  // traps in corridors away from stairs
  var traps={},tried=0;
  for(var ty2=1;ty2<H-1&&Object.keys(traps).length<(2+dr.int(0,1));ty2++)
  for(var tx2=1;tx2<W-1&&Object.keys(traps).length<(2+dr.int(0,1));tx2++){
    if(g[ty2][tx2]!=='.'||isRoom(tx2,ty2))continue;
    if(/[a-z<>]/.test(g[ty2][tx2]))continue;
    if(tried++>40)break;
    if(dr.chance(.35))traps[tx2+','+ty2]={kind:dr.pick(['darts','gas','stones','needles'])};
  }
  // connectivity requirement: every event letter and stairs reachable
  var pts=placed.filter(Boolean);
  if(deeper)pts.push(deeper);
  for(var pi=0;pi<pts.length;pi++){
    if(dist[pts[pi].y*W+pts[pi].x]===undefined)return null;
  }
  if(!roomsOK)return null;
  var grid=g.map(function(r){return r.join('');});
  var wander=[];
  for(var wi=0;wi<2;wi++){var e2=dr.pick(poolFor(theme));
    wander.push({p:.03,mons:[[e2[0],String(Math.max(1,Math.floor(e2[1]/2)))] ]});}
  return {grid:grid,ev:ev,traps:Object.keys(traps).length?traps:null,stairs:stairs,
    entry:{x:entry.cx,y:entry.cy,dir:1},deeper:deeper,wander:wander};
}
function findLetter(g,ch){
  for(var y=0;y<g.length;y++){var x=g[y].indexOf(ch);if(x>=0)return{x:x,y:y};}
  return null;
}
function bfsGrid(g,sx,sy){
  var H=g.length,W=g[0].length,dist={},q=[[sx,sy]];dist[sy*W+sx]=0;
  while(q.length){
    var c=q.shift(),x=c[0],y=c[1];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v){
      var nx=x+v[0],ny=y+v[1];
      if(nx<0||ny<0||nx>=W||ny>=H)return;
      if('#'.indexOf(g[ny][nx])>=0)return;
      var k=ny*W+nx;
      if(dist[k]===undefined){dist[k]=dist[y*W+x]+1;q.push([nx,ny]);}
    });
  }
  return dist;
}
function themeGuards(theme,dr,lvl){
  var budget=Math.max(1,Math.floor(2.4*lvl))-(MONSTERS[bossFor(theme)].hd|0);
  var out=[],used=0;
  for(var i=0;i<3&&used<Math.max(2,budget);i++){
    var e=dr.pick(poolFor(theme));
    var hd=Math.ceil(MONSTERS[e[0]].hd||1);
    var n=1+dr.int(0,1);
    if(hd*n>budget+2)continue;
    out.push([e[0],n]);used+=hd*n;
  }
  if(!out.length){out.push([poolFor(theme)[0][0],2]);}
  return out;
}
function lieutenant(id,fi,theme,dr){
  var b=bossFor(theme);
  return ['bo_'+id+'_'+fi+'_l',1];
}
function cloneBoss(base,id,theme){
  var p=MONSTERS[base];if(!p)return;
  var m=/(\d+)d(\d+)([+-]\d+)?/.exec(p.hp);
  var maxhp=m?(+m[1])*(+m[2])+(m[3]?+m[3]:0):8;
  var names=vrFirst()+' '+vrLast();
  MONSTERS[id]={n:names,hd:p.hd,hp:String(maxhp)+'d1',ac:p.ac,mv:p.mv,ml:16,
    xp:(p.xp||30)*2,atk:p.atk.slice(),size:p.size,fig:p.fig,tags:(p.tags||[]).slice(),
    undead:p.undead,regen:p.regen,poison:p.poison,leader:1,sizeL:p.size,
    lore:'The named master of '+id.replace(/.+_/,'').split('_')[0]+' — '+(p.lore||'')};
  MONSTERS[id].lore='“'+names+'” rules the deep rooms of this road, grown fat on the road’s traffic. '+((p.lore)||'');
}
var _vr=null;function vrFirst(){return _vr.pick(VFIRST);}
function vrLast(){return _vr.pick(VLAST);}

/* ================= Region ================= */
function genRegion(id,name,size,theme,lvl,startLv){
  var W={small:28,medium:32,large:36,huge:40}[size],H={small:20,medium:22,large:24,huge:26}[size];
  var wr=_wr;
  var g=blankGrid(W,H,'.');
  // northern mountain border with a single south road gap at the home column
  var homeX=4+wr.int(0,W-9);
  for(var x=0;x<W;x++)g[0][x]='^';
  for(x=0;x<W;x++){if(wr.chance(.35)){g[1][x]='^';if(x===homeX)g[1][x]='.';}}
  g[1][homeX]='.';
  // river meander
  var rx=wr.int(4,W-5);
  for(var y=2;y<H;y++){g[y][rx]='~';rx+=wr.pick([-1,0,0,1]);rx=Math.max(2,Math.min(W-3,rx));}
  // biome blobs
  function blob(ch,cx,cy,r){
    for(var yy=cy-r;yy<=cy+r;yy++)for(var xx=cx-r;xx<=cx+r;xx++){
      if(xx<1||yy<1||xx>=W-1||yy>=H-1)continue;
      if(xx===homeX&&yy<2)continue;
      if((xx-cx)*(xx-cx)+(yy-cy)*(yy-cy)<=r*r+wr.int(0,1)&&g[yy][xx]==='.')g[yy][xx]=ch;
    }
  }
  var forests=2+wr.int(0,2),hills=2+wr.int(0,2),fen=wr.int(1,3);
  for(var i=0;i<forests;i++)blob('T',wr.int(3,W-4),wr.int(4,H-3),wr.int(2,3));
  for(i=0;i<hills;i++)blob('n',wr.int(3,W-4),wr.int(3,H-3),wr.int(1,3));
  for(i=0;i<fen;i++)blob('%',wr.int(4,W-5),wr.int(H-8,H-3),wr.int(1,2));
  // road: home south with one jog, to the south edge
  var roadX=homeX,roadCells=[];
  for(y=2;y<H;y++){
    if(y===Math.floor(H/2)&&wr.chance(.6)){var nj=Math.max(2,Math.min(W-3,roadX+wr.pick([-2,-1,1,2])));
      for(var sx=Math.min(roadX,nj);sx<=Math.max(roadX,nj);sx++){if(g[y][sx]!=='~')g[y][sx]='=';roadCells.push([sx,y]);}}
    g[y][roadX]=(g[y][roadX]==='~')?'+':'=';
    roadCells.push([roadX,y]);
  }
  // site placement
  var sites={},letters=[];
  function freeSpot(minDFromRoad){
    for(var t=0;t<80;t++){
      var x2=wr.int(2,W-3),y2=wr.int(3,H-3);
      if(g[y2][x2]!=='.'&&g[y2][x2]!=='n'&&g[y2][x2]!=='T'&&g[y2][x2]!=='%')continue;
      var near=roadCells.some(function(rc){return Math.abs(rc[0]-x2)+Math.abs(rc[1]-y2)<minDFromRoad;});
      if(near&&letters.length>=2)continue;
      g[y2][x2]='.';
      return{x:x2,y:y2};
    }
    return{x:wr.int(2,W-3),y:wr.int(3,H-3)};
  }
  function addSite(ch,spot,def){
    if(spot.y<2||spot.x<1||spot.x>=W-1||spot.y>=H-1)return false;
    if(g[spot.y][spot.x]==='~'||g[spot.y][spot.x]==='^')return false;
    if(sites[ch])return false;
    g[spot.y][spot.x]=ch;sites[ch]=def;letters.push({ch:ch,x:spot.x,y:spot.y});
    return true;
  }
  var LETTERS='ABCEFGIJKLMNOPQRSUVWXYZ'.split('');var li=wr.int(0,LETTERS.length-1);
  function nextLetter(){li=(li+1+wr.int(0,3))%LETTERS.length;return LETTERS[li];}
  // home at road top
  var home={name:__villageName,home:1,to:'v_'+id,x:homeX,y:1?2:2,dir:2,text:'The road comes down the hills at last and '+__villageName+' takes it in like a family argument.'};
  g[2][homeX]='H';sites.H=home;letters.push({ch:'H',x:homeX,y:2});
  // dungeon entrance site
  var entSite=addSite('D',freeSpot(3),{name:__dungeonName+' — the Way Down',
    to:'f1_'+id,x:0,y:0,dir:1,text:'A stair mouth under a lintel cut by hands with time to spare.'});
  // lairs 2–4
  var lairs=2+wr.int(0,2);
  for(i=0;i<lairs;i++){
    var pool=poolFor(theme),pickE=wr.pick(pool);
    var nm=wr.pick(['Hollow','Midden','Roost','Fire-circle','Pond-bed','Trench','Smelter','Bone-field'])+' of '+vrFirst()+' '+vrLast();
    addSite(nextLetter(),freeSpot(2),{
      name:nm,icon:'lairs',
      fight:{mons:[[pickE[0],String(pickE[1])]].concat(wr.chance(.5)?[wr.pick(pool)]:[]),
        text:'Lair-sign everywhere: picked bones, wrong glyphs, and company inside.'},
      cache:{gold:(2+startLv)+'d6x10'},
      text:'The lair, quiet at last.'});
  }
  addSite('U',freeSpot(1),{name:wrpick(['Mother','Old','Aunt','Brother'])+' '+wrpick(['Tam','Celle','Bryn','Wick'])+"'s Croft",icon:'heal',
    heal:{who:wrpick(['Mother','Old','Brother'])+' '+wrpick(['Tam','Celle','Bryn','Wick']),every:7},
    text:'A gated croft that mends the worst of you, once in seven days, for manners.'});
  addSite('X',freeSpot(1),{name:'Shrine of the '+wrpick(['Kindle','Pale Stone','Last Lantern','Quiet Sister']),icon:'holy',
    holy:{who:'the shrine',xp:20+10*startLv},text:'A roofless shrine; the candle somehow still lit. The rite steadies the company.'});
  if(size!=='small')addSite('O',freeSpot(1),{name:wrpick(['Kettle','Mile','Stain','Ford'])+' Hamlet',icon:'hamlet',hamlet:1,
    text:'A hamlet of twelve roofs, one bell, and bed-bread for coin.'});
  addSite('R',freeSpot(1),{name:'The Old Crossway',icon:'mark',
    text:'Milestone moss. Carvings name '+wrpick(REGION)+' ways: the croft, the shrine, a lair you have already guessed at.'});
  var grid=g.map(function(r){return r.join('');});
  // reachability repair: BFS 8-way from home; carve a road spur to any stranded site
  var dist=bfs8(grid,homeX,2);
  letters.forEach(function(L){
    if(L.y===2&&L.x===homeX)return;
    if(dist[L.y*W+L.x]!==undefined)return;
    var y3=L.y,x3=L.x,guard=0;
    while(x3!==homeX&&guard++<120){
      x3+=Math.sign(homeX-x3);
      if(y3>=2&&y3<H){var r1=grid[y3].split('');if(r1[x3]!=='+'&&r1[x3]!=='='&&r1[x3]!=='H')r1[x3]='=';grid[y3]=r1.join('');}
    }
    while(y3!==2&&guard++<200){
      y3+=Math.sign(2-y3);
      var r2=grid[y3].split('');
      if(r2[x3]==='~')r2[x3]='+';else if(r2[x3]!=='='&&r2[x3]!=='H')r2[x3]='=';
      grid[y3]=r2.join('');
    }
    dist=bfs8(grid,homeX,2);
  });
  // last resort: straight clear spur for anything still stranded
  dist=bfs8(grid,homeX,2);
  letters.forEach(function(L){
    if(dist[L.y*W+L.x]!==undefined)return;
    var y3=L.y,x3=L.x;
    while(y3>2){y3--;var rr=grid[y3].split('');if(rr[x3]==='~')rr[x3]='+';else if(rr[x3]!=='H')rr[x3]='=';grid[y3]=rr.join('');}
  });
  var enc=genEnc(theme,startLv);
  MAPS['reg_'+id]={id:'reg_'+id,name:name,locName:name.toLowerCase(),overland:true,
    encRate:0.9,grid:grid,start:{x:homeX,y:2,dir:2},
    desc:'The Long Roads’ '+name.toLowerCase()+': the village at the north ridge and everything unpaid-for beyond it.',
    sites:sites,enc:enc,rumors:RUMORS['rum_'+id]};
  return {start:{x:homeX,y:2,dir:2}};
}
function bfs8(g,sx,sy){
  var H=g.length,W=g[0].length,dist={},q=[[sx,sy]];dist[sy*W+sx]=0;
  while(q.length){
    var c=q.shift(),x=c[0],y=c[1];
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      var nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=W||ny>=H)continue;
      var ch=g[ny][nx];
      if(ch==='^'||ch==='~')continue;
      var k=ny*W+nx;
      if(dist[k]===undefined){dist[k]=dist[y*W+x]+1;q.push([nx,ny]);}
    }
  }
  return dist;
}
function genEnc(theme,lvl){
  var pool=poolFor(theme),out=[];
  out.push({p:.04,terr:'.',mons:[[pool[0][0],String(Math.max(1,Math.min(5,Math.round(lvl/2))))]]});
  out.push({p:.05,terr:'Tn',mons:[pool[pool.length-1][0],String(1+ (lvl>6?2:1))].length?[[pool[pool.length-1][0],lvl>8?'2d2':'1d2']]:[]});
  out.push({p:.06,terr:'=%',mons:[[pool[Math.min(pool.length-1,1)][0],'1d2']]});
  out.push({p:.07,night:1,terr:'.',mons:[[pool[Math.min(pool.length-1,2)][0],'1d3']]});
  out.push({p:.03,terr:'=',mons:[[pool[0][0],'1d1']]});
  return out.filter(function(e){return e.mons.length&&MONSTERS[e.mons[0][0]];});
}
var __villageName='',__dungeonName='';

/* ================= Rumors informed by actual foes ================= */
function genRumors(id,theme,floorDefs,foes){
  var out=[];
  var undead=foes.some(function(f){return MONSTERS[f]&&MONSTERS[f].undead;});
  var troll=foes.some(function(f){return f==='troll'||f==='gnashrot';});
  out.push('The way down is ‘'+__dungeonName+'’ — the '+floorDefs.length+' floor'+(floorDefs.length>1?'s':'')+' under the '+REGION_HINT+'.');
  if(undead)out.push('Bone and shroud below. Bring holy water and blunt steel; edges only annoy them.');
  if(troll)out.push('Something down there knits itself back together. Fire is the long answer.');
  out.push(vrFirst()+' '+vrLast()+' holds the deepest room, and does not share.');
  out.push('They say a '+wrpick(['strongbox','ledger','reliquary','seal'])+' of the old keeping still sits at the bottom floor.');
  RUMORS['rum_'+id]=out;
}
var REGION_HINT='';

/* ================= Shops by band ================= */
function genShops(t){
  var arm={name:'the band forge',stock:['club','dagger','staff','mace','sling','dart','leather']};
  if(t>=1)arm.stock=arm.stock.concat(['shortsword','handaxe','spear','chain','shield','backpack','rope','torch','oil','rations','waterskin']);
  if(t>=2)arm.stock.push('warhammer','flail','studded','longbow','arrow');
  if(t>=3)arm.stock.push('broadsword','battleaxe','splint');
  if(t>=4)arm.stock.push('bastardsword','banded','plate');
  if(t>=5)arm.stock.push('twohandsword','halberd');
  var gen={name:'the general barrow',stock:['backpack','bedroll','rations','waterskin','rope','torch','lantern','oil','mirror','spikes','thtools','antivenom']};
  SHOPS['gen_arm'+t]={name:'Forge of the '+['Ash','Iron','Salt','Pale','Deep'][t-1]+' Row',stock:Array.from(new Set(arm.stock))};
  SHOPS['gen_gen'+t]={name:'Chandler of the '+['Ash','Iron','Salt','Pale','Deep'][t-1]+' Row',stock:gen.stock.slice()};
}

/* ================= The build ================= */
var list=[];
function build(){
  for(var t=1;t<=5;t++)genShops(t);
  for(var ti=0;ti<5;ti++){
    var bandTab={id:'band'+(ti+1),name:'The Long Roads '+(ti+1),band:ti+1,mods:[]};
    CAMPAIGNS.tabs.push(bandTab);
    for(var i=1;i<=10;i++){
      var theme=THEMES[ti][i-1],size=SIZES[i-1],floors=FLOORS[size],lvl=BANDLVL[ti];
      var id='adv'+(ti+1)+'_'+i, code='T'+(ti+1)+'-'+pad2(i);
      var seed=(7919*(ti+1)+104729*i+31*theme.length)>>>0;
      _wr=new Rules.RNG((seed+15485863)>>>0);
      var dr=new Rules.RNG((seed+32452843)>>>0);
      _vr=dr;
      __villageName=VILLAGE[((seed>>>3)%VILLAGE.length)];
      __dungeonName=VILLAGE[((seed>>>7)%VILLAGE.length)]+' '+DUNGEON[((seed>>>11)%DUNGEON.length)];
      // Spec §11 acceptance fixtures: two adventures are pinned references.
      if(id==='adv1_1')__villageName='Crowstead';
      if(id==='adv5_10'){__villageName='Greycross';__dungeonName='The Crypt of Zuloon';}
      REGION_HINT=__dungeonName;
      var regionName=REGION[((seed>>>5)%REGION.length)];
      // quests per deed-floor
      var deedFloors=[];
      if(floors===5)deedFloors=[2,3,4,5];else for(var df=1;df<=floors;df++)deedFloors.push(df);
      var questIds=[],finalQ=null,sideIds=[];
      deedFloors.forEach(function(fi2,k){
        var qid='q_'+id+'_'+fi2;
        var bossName=null;
        questIds.push(qid);if(k===deedFloors.length-1)finalQ=qid;
        var gold=[60,120,260,480,900][ti]+ (size==='huge'?400:size==='large'?200:0);
        QUESTS[qid]={name:'',goal:'',offer:'',done:'',gold:gold,xp:300*lvl*(1+k),final:qid===finalQ?1:0,reveal:'f'+fi2+'_'+id};
      });
      // side retrieval (two on huge)
      var sideN=size==='huge'?2:1;
      for(var s=0;s<sideN;s++){
        var sqid='s_'+id+'_'+(s+1),qitem='qit_'+id+'_'+(s+1);
        var iname=QITEM[(seed+s*13)%QITEM.length];
        ITEMS[qitem]={n:iname.charAt(0).toUpperCase()+iname.slice(1),t:'q',price:0,desc:'Recovered on the road of '+code+'.'};
        QUESTS[sqid]={name:'Recover '+iname.replace(/^a /,'a ').replace(/^the /,'the '),lead:'What the road swallowed, the road still holds.',
          goal:'Recover '+iname+' from '+__dungeonName+'.',offer:'The guild-folk of '+__villageName+' pay for their history.',
          done:iname.replace(/^the /,'The ')+' is returned.',gold:30*lvl,xp:200*lvl,side:1,needItem:qitem,reveal:'f'+floors+'_'+id};
        sideIds.push(sqid);
      }
      // dungeon floors
      var floorDefs=[];
      deedFloors.concat([]).forEach(function(){});
      for(var fi=1;fi<=floors;fi++){
        var bbase=bossFor(theme);
        cloneBoss(bbase,'bo_'+id+'_'+fi,theme);
        cloneBoss(bbase,'bo_'+id+'_'+fi+'_l',theme);
        MONSTERS['bo_'+id+'_'+fi+'_l'].n=MONSTERS['bo_'+id+'_'+fi+'_l'].n.replace(/.+/,'The Left Hand of '+MONSTERS['bo_'+id+'_'+fi].n);
        MONSTERS['bo_'+id+'_'+fi+'_l'].leader=0;
        MONSTERS['bo_'+id+'_'+fi+'_l'].xp=Math.floor(MONSTERS['bo_'+id+'_'+fi].xp/2);
        MONSTERS['bo_'+id+'_'+fi+'_l'].ml=Math.max(12,MONSTERS['bo_'+id+'_'+fi].ml-2);
        var fd=genFloor(dr,id,fi,floors,theme,lvl);
        fd.fi=fi;floorDefs.push(fd);
      }
      // stair pairing between floors
      for(var f2=0;f2<floorDefs.length-1;f2++){
        var up=floorDefs[f2],down=floorDefs[f2+1];
        up.stairs[up.deeper.x+','+up.deeper.y]={to:'f'+(f2+2)+'_'+id,x:down.entry.x,y:down.entry.y,dir:1,label:'Down '+(f2+2)};
        down.stairs[down.entry.x+','+down.entry.y]={to:'f'+(f2+1)+'_'+id,x:up.deeper.x,y:up.deeper.y,dir:1,label:'Up '+(f2+1)};
      }
      // side quest item chests on top floor
      var topFloor=floorDefs[floorDefs.length-1];
      for(var si=0;si<sideIds.length;si++){
        var ch='hi'.charAt(si)||'k';
        var spot=null;
        var gr=topFloor.grid;
        outer:for(var yy=3;yy<16;yy++)for(var xx=3;xx<22;xx++){
          if(gr[yy][xx]==='.'||gr[yy][xx]==='D'){spot={x:xx,y:yy};break outer;}
        }
        if(!spot)continue;
        var rows=topFloor.grid.slice();var rw=rows[spot.y].split('');rw[spot.x]=ch;rows[spot.y]=rw.join('');
        topFloor.grid=rows;
        topFloor.ev[ch]={chest:{text:'The prize of this road, stored where only the patient look.',items:[QUESTS[sideIds[si]].needItem]}};
      }
      // register floor maps
      floorDefs.forEach(function(fd2,ix){
        MAPS['f'+(ix+1)+'_'+id]={id:'f'+(ix+1)+'_'+id,
          name:__dungeonName+(floors>1?' — floor '+(ix+1):''),locName:__dungeonName.toLowerCase(),
          grid:fd2.grid,start:{x:fd2.entry.x,y:fd2.entry.y,dir:fd2.entry.dir},
          ev:fd2.ev,traps:fd2.traps,stairs:fd2.stairs,wander:fd2.wander,
          mat:MATFORTHEME[theme]||'crypt',        // who built this, and what is overhead
          desc:'Cut rooms and older purpose. Floor '+(ix+1)+' of '+floors+'.'};
      });
      // village + region
      var vtpl=(ti+1)===1?'thornwick':'cold_town';
      genVillage(vtpl,id,__villageName);
      var rs=genRegion(id,regionName,size,theme,lvl,lvl);
  // wire the two doors: village gate → region start; region home → village street
  MAPS['v_'+id].exit={G:{to:'reg_'+id,x:rs.start.x,y:rs.start.y,dir:rs.start.dir,label:'The gate out onto the Long Roads'}};
  var vsite=MAPS['reg_'+id].sites.H;
  vsite.x=MAPS['v_'+id].start.x;vsite.y=MAPS['v_'+id].start.y;vsite.dir=MAPS['v_'+id].start.dir;
      // fix dungeon-entrance site arrival coords (must stand next to stair)
      Object.keys(MAPS['reg_'+id].sites).forEach(function(ch){
        var st=MAPS['reg_'+id].sites[ch];
        if(st.to&&/^f1_/.test(st.to)){st.x=MAPS['f1_'+id].start.x;st.y=MAPS['f1_'+id].start.y;st.dir=MAPS['f1_'+id].start.dir;}
      });
      // region home site returns to village
      // quests final text now that bosses exist
      deedFloors.forEach(function(fi3,k3){
        var qid='q_'+id+'_'+fi3,bn=MONSTERS['bo_'+id+'_'+fi3].n;
        QUESTS[qid].name=bn;
        QUESTS[qid].goal='End '+bn+' on floor '+fi3+' of '+__dungeonName+'.';
        QUESTS[qid].lead=__villageName+' sends you down the '+__dungeonName+'; this one keeps that floor.';
        QUESTS[qid].offer='The '+GIVER[(seed+k3)%GIVER.length]+' '+GNAME[(seed*3+k3)%GNAME.length]+' pays '+QUESTS[qid].gold+' gp and share of the peace.';
        QUESTS[qid].done=bn+' is ended; floor '+fi3+' keeps silence.';
      });
      // module
      var mapIds=['v_'+id,'reg_'+id].concat(floorDefs.map(function(fd3,ix){return 'f'+(ix+1)+'_'+id;}));
      var giverName=GIVER[(seed>>>2)%GIVER.length]+' '+GNAME[(seed>>>4)%GNAME.length];
      var foes=[];floorDefs.forEach(function(fd4){fd4.ev&&Object.keys(fd4.ev).forEach(function(k){var e=fd4.ev[k];if(e.enc)e.enc.mons.forEach(function(p){foes.push(p[0]);});});});
      genRumors(id,theme,floorDefs,foes);
      MAPS['v_'+id].locName=__villageName;
      MODULES[id]={code:code,name:code+' — '+__dungeonName,lvl:lvl,levels:[lvl,lvl+SPAN[size]],
        diff:ti+1,diffName:DIFFN[ti+1],size:size.charAt(0).toUpperCase()+size.slice(1),
        length:{small:'about an hour',medium:'two hours',large:'three hours',huge:'a long, long day'}[size],
        hub:'v_'+id,maps:mapIds,gold:Math.round(40*Math.pow(lvl,1.5)/10)*10,
        next:null,quests:questIds,side:sideIds,final:finalQ,band:ti+1,
        names:{hall:giverName,trainer:TRAINER[(seed>>>6)%TRAINER.length]},
        rumors:'rum_'+id,shops:{armory:'gen_arm'+(ti+1),general:'gen_gen'+(ti+1)},
        blurb:'A '+theme+' road: '+__villageName+' at the north, '+__dungeonName+' under the '+REGION_HINT.toLowerCase()+', and '+giverName+' doing the sums.',
        intro:giverName+' spreads a stained map of '+regionName+': '+__villageName+' holds the north gate and '+__dungeonName+' holds everything else.',
        hint:'The Way Down sits on the region road; each floor’s master keeps that floor’s deed.',
        victory:__dungeonName+' is cleared floor by floor and '+__villageName+' buys the round.',
        lose:regionName+' keeps '+__villageName+'’s best folk under it.'};
      if(id==='adv1_1'&&MONSTERS['bo_adv1_1_1']){
        MONSTERS['bo_adv1_1_1'].n='Othys the Many-Legged';
        if(MONSTERS['bo_adv1_1_1_l'])MONSTERS['bo_adv1_1_1_l'].n='The Left Hand of Othys';
      }
      if(id==='adv5_10'&&MONSTERS['bo_adv5_10_5']){
        MONSTERS['bo_adv5_10_5'].n='Zuloon the Barrow-King';
        if(MONSTERS['bo_adv5_10_5_l'])MONSTERS['bo_adv5_10_5_l'].n='The Left Hand of Zuloon';
      }
      bandTab.mods.push(id);
      list.push(id);
    }
  }
  // chain next pointers: band order
  for(var li=0;li<list.length;li++){
    if(li<list.length-1)MODULES[list[li]].next=list[li+1];
    else MODULES[list[li]].next=null;
  }
  // link saga ends into the Long Roads
  MODULES.ravenmoor.next='adv1_1';
}

return{build:build,list:function(){return list.slice();},themes:THEMES};
})();
Adventures.build();
