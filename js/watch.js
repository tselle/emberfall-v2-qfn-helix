/* Emberfall — js/watch.js
 * Visible bands: wandering and lair parties live on the map as entities.
 * They hunt what they can see, they are drawn on the minimap, and touching
 * one opens the tactical board. Bands persist in G.bands (saved). */
'use strict';
var Watch=(function(){
function bands(){if(!G.bands)G.bands=[];return G.bands;}
function uid(){if(!G.bandSeq)G.bandSeq=1;return 'b'+(G.bandSeq++);}
function mapId(){return Game.mapId();}
function cell(x,y){return Game.cellAt(mapId(),x,y);}
function passable(c){return c!=null&&c!==''&&'^~#'.indexOf(c)<0;}
function night(){var h=G.time%1440/60;return h<5.5||h>=20;}
function wild(){var m=MAPS[mapId()];return !!(m&&m.overland);}
function sightOf(b){
  var base=(MONSTERS[b.mon]&&MONSTERS[b.mon].sight)||6;
  return night()?Math.max(2,Math.round(base/2)):base;
}
function losClear(x0,y0,x1,y1){
  // Bresenham; walls block, closed event letters pass
  var dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  var x=x0,y=y0,guard=0;
  while(guard++<80){
    if(x===x1&&y===y1)return true;
    if(!passable(cell(x,y)))return false;
    var e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
  return false;
}
function dist(b){return Math.max(Math.abs(b.x-G.x),Math.abs(b.y-G.y));}
function visible(){
  return bands().filter(function(b){
    if(b.map!==mapId())return false;
    return dist(b)<=sightOf(b)&&losClear(G.x,G.y,b.x,b.y);
  });
}
/* place a band on a passable cell within [d0,d1] Chebyshev of the party */
function place(d0,d1){
  for(var tries=0;tries<240;tries++){
    var x=G.x+Rules.play.d(1,d1-d0+1)-1+d0,y=G.y+Rules.play.d(1,d1-d0+1)-1+d0;
    if(Math.max(Math.abs(x-G.x),Math.abs(y-G.y))<d0)continue;
    if(!passable(cell(x,y)))continue;
    var taken=bands().some(function(b){return b.map===mapId()&&Math.abs(b.x-x)+Math.abs(b.y-y)<3;});
    if(taken)continue;
    if(!wild()&&losClear(G.x,G.y,x,y))continue;   // slip in unseen
    return {x:x,y:y};
  }
  return null;
}
function spawn(mons,opts){
  opts=opts||{};
  var d0=opts.dist?opts.dist[0]:(wild()?3:4),d1=opts.dist?opts.dist[1]:(wild()?7:8);
  var spawned=0;
  mons.forEach(function(pr){
    var n=typeof pr[1]==='string'?Rules.dice(pr[1]):pr[1];
    var at=place(d0,d1);
    if(!at)return;
    bands().push({k:uid(),mon:pr[0],n:n,x:at.x,y:at.y,map:mapId(),still:1});
    spawned++;
  });
  if(spawned)UI.log('spell','Something stirs beyond the lamplight. (Bands move when you do.)');
  return spawned;
}
function clearAt(x,y,map){
  G.bands=bands().filter(function(b){return !(b.map===(map||mapId())&&b.x===x&&b.y===y);});
}
function removeKeys(keys){
  if(!keys)return;
  G.bands=bands().filter(function(b){return keys.indexOf(b.k)<0;});
}
/* every party step advances every band on this map */
function step(){
  if(Combat.isActive()||Xbusy())return;
  var here=bands().filter(function(b){return b.map===mapId();});
  var contact=null;
  here.forEach(function(b){
    b.still=0;
    var d=dist(b);
    if(d<=1){contact=contact||b;return;}
    var mv=1;
    var def=MONSTERS[b.mon];if(def&&def.mv>=15)mv=2;
    var hunts=d<=sightOf(b)+3;
    var steps=hunts?mv:(Rules.play.d6()<=2?1:0);
    for(var s=0;s<steps;s++){
      var dx=Math.sign(G.x-b.x),dy=Math.sign(G.y-b.y);
      var opts=hunts?[[dx,dy],[dx,0],[0,dy]].filter(function(v){return v[0]||v[1];}):
        [[1,0],[-1,0],[0,1],[0,-1]].sort(function(){return Math.random()-.5;});
      var moved=false;
      for(var i=0;i<opts.length&&!moved;i++){
        var nx=b.x+opts[i][0],ny=b.y+opts[i][1];
        if(!passable(cell(nx,ny)))continue;
        if(bands().some(function(o){return o!==b&&o.map===b.map&&o.x===nx&&o.y===ny;}))continue;
        b.x=nx;b.y=ny;moved=true;
      }
      if(Math.max(Math.abs(b.x-G.x),Math.abs(b.y-G.y))<=1){contact=contact||b;return;}
    }
  });
  paintPips();
  var sightedBefore=contact?wasSeen(contact):false;
  announce();
  if(contact)engage(contact,sightedBefore);
}
/* creatures with a grammar and an appetite for coin may be talked to */
function parleyable(def){
  if(!def||def.undead)return false;
  var tg=def.tags||[];
  if(tg.indexOf('mindless')>=0||tg.indexOf('vermin')>=0||tg.indexOf('undead')>=0)return false;
  return tg.indexOf('humanoid')>=0||tg.indexOf('giantkin')>=0||tg.indexOf('gnoll')>=0||tg.indexOf('cult')>=0;
}
function engage(band,sightedBefore){
  var group=bands().filter(function(b){return b.map===mapId()&&Math.max(Math.abs(b.x-band.x),Math.abs(b.y-band.y))<=2;});
  var mons=group.map(function(b){return [b.mon,b.n];});
  function fight(withMalice){
    var unseen=group.every(function(b){return !wasSeen(b);});
    UI.log('bad','Contact! '+monsText(mons));
    Combat.start({
      mons:mons,title:'Battle in the dark',
      bands:group.map(function(b){return b.k;}),
      partySurprise:unseen&&Rules.play.d6()<=2,
      monsterSurprise:withMalice?true:Rules.play.d6()<=2,
      onEnd:function(r){Watch.removeKeys(group.map(function(b){return b.k;}));}
    });
  }
  var talkers=(sightedBefore!==false)&&mons.every(function(pr){return parleyable(MONSTERS[pr[0]]);});
  var live=UI.party().filter(function(c){return !c.dead&&c.hp>0;});
  if(!talkers||!live.length){fight(false);return;}
  var price=mons.reduce(function(a,pr){
    var d=MONSTERS[pr[0]]||{hd:1};
    return a+Math.max(5,Math.round((d.hd||1)*8)*pr[1]);
  },0);
  var face=live.slice().sort(function(a,b){return Rules.abilityScore(b,'cha')-Rules.abilityScore(a,'cha');})[0];
  var need=9;
  var mods=Rules.chaAdj(Rules.abilityScore(face,"cha"))|0;
  var foes=mons.reduce(function(a,pr){return a+pr[1];},0);
  if(live.length>foes)mods+=1;
  UI.modal({title:'A live blade bars the way',
    body:'<p>'+UI.esc(monsText(mons))+' have the way between you and violence, and one of them has stopped chewing.</p>'+
      '<p class="muted">'+UI.esc(face.name)+' may try words ('+need+' on 2d6'+(mods?(mods>0?'+':'')+mods:'')+', or the road can be bought for '+price+' gp.)</p>',
    actions:[
    {label:'Stand and fight!',primary:1,on:function(){fight(false);}},
    {label:'Parley — let word pass',on:function(){
      var roll=Rules.play.d(2,6)+mods;
      if(roll>=need){
        UI.log('good','Grumbling and counting the odds, the band gives the road.');
        Watch.removeKeys(group.map(function(b){return b.k;}));
        Game.autosave();
      }else{
        UI.log('bad','Words curdle; the band closes with malice and first blood.');
        fight(true);
      }
    }},
    {label:'Pay '+price+' gp and walk on by',disabled:G.gold<price,on:function(){
      G.gold-=price;
      UI.log('dim',price+' gp changes hands; the blades lower and the purse does not.');
      Watch.removeKeys(group.map(function(b){return b.k;}));
      UI.hud();Game.autosave();
    }},
    {label:'Back away slowly',on:function(){UI.log('dim','You give them ground and manners both.');}}]});
}
/* remember what the party has been told is visible this visit */
var seenKeys={};
function wasSeen(b){return !!seenKeys[b.k];}
function announce(){
  visible().forEach(function(b){
    if(seenKeys[b.k])return;
    seenKeys[b.k]=1;
    var def=MONSTERS[b.mon];
    UI.log('bad','Sighted: '+b.n+'× '+(def?def.n:b.mon)+' at '+dist(b)+' paces.');
    Bestiary.sight(b.mon);
    UI.toast('A band is visible — cross paces to battle.');
  });
}
function monsText(mons){return mons.map(function(pr){return pr[1]+'× '+(MONSTERS[pr[0]]?MONSTERS[pr[0]].n:pr[0]);}).join(', ');}
function paintPips(){if(window.Game&&Game.paintBandPips)Game.paintBandPips(visible());}
function Xbusy(){var X=Game.X;return !!(X&&X.busy);}
function forget(){seenKeys={};}
/* wipe bands that were hunting when the party wiped */
function scatter(keys){removeKeys(keys);}
return{spawn:spawn,step:step,visible:visible,removeKeys:removeKeys,forget:forget,
  scatter:scatter,clearAt:clearAt,sightOf:sightOf};
})();
