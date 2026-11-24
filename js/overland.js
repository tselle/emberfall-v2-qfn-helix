/* Emberfall — js/overland.js
 * Over: region painter, camera, reveal; wildMove with §6 travel time,
 * encounter rolls, camping and site visits. One tile = one mile.
 * Painted-art polish arrives with the rendering pass. */
'use strict';
var Over=(function(){
var O=null,cv=null,ctx=null;
var DIRK={w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],q:[-1,-1],e:[1,-1],z:[-1,1],c:[1,1]};
var TERR={'.':{cost:1,p:.05},'=':{cost:.5,p:.035},'+':{cost:.5,p:.035},'T':{cost:2,p:.08},'n':{cost:2,p:.07},'%':{cost:3,p:.09}};

function init(canvas){cv=canvas;ctx=canvas.getContext('2d');}
function map(){return O&&MAPS[O.mapId];}
function cellAt(x,y){return Game.cellAt(O.mapId,x,y);}
function enter(mapId){O={mapId:mapId,prompted:{},warnedMarch:false};revealAround();render();}
function partyMV(){
  var mv=12;UI.party().forEach(function(c){if(c.dead)return;mv=Math.min(mv,Rules.RACES[c.race].mv);});
  return mv;
}
function isNight(){var h=G.time%1440/60;return h<5.5||h>=20;}
function revealAround(){
  var r=isNight()?2.2:4.2;
  var m=map();
  var cur=cellAt(G.x,G.y);
  if(cur==='n')r+=2;if(cur==='T'||cur==='%')r-=1.2;
  for(var dy=-Math.ceil(r);dy<=Math.ceil(r);dy++)for(var dx=-Math.ceil(r);dx<=Math.ceil(r);dx++){
    if(dx*dx+dy*dy<=r*r)Game.reveal(O.mapId,G.x+dx,G.y+dy);
  }
}
function wildMove(dx,dy){
  var nx=G.x+dx,ny=G.y+dy,m=map();
  var c=cellAt(nx,ny);
  if(c==='#'||c==='^'||c==='~'||nx<0||ny<0||ny>=m.grid.length||nx>=m.grid[0].length){UI.log('dim','The ground refuses that step.');return;}
  var terr=TERR[c]||TERR['.'];
  var mv=partyMV();
  var diag=(dx&&dy)?1.4:1;
  var tired=G.march>=600?1.5:1;
  var mins=Math.round(600/(2*mv)*terr.cost*diag*tired);
  G.time+=mins;G.march+=mins;
  G.x=nx;G.y=ny;
  if(G.march>=600&&!O.warnedMarch){O.warnedMarch=true;UI.log('bad','The company is weary; every mile costs half again.');}
  revealAround();render();UI.hud();
  // site?
  if(/^[A-Z]$/.test(c)&&c!=='T'&&m.sites&&m.sites[c]){siteVisit(c,true);return;}
  rollEncounter(terr,mins,c);
  if(!window.UI||!UI.top())Watch.step();
}
function rollEncounter(terr,mins,c){
  var m=map();
  var night=isNight()?1.5:1;
  var p=1-Math.pow(1-terr.p*(m.encRate||1)*night,mins/60);
  if(!Rules.play.chance(p))return;
  var list=(m.enc||[]).filter(function(e){
    if(!e.terr||e.terr.indexOf(c)<0)return false;
    if(e.night&&!isNight())return false;
    return true;
  });
  if(!list.length)return;
  var pickE=Rules.play.pick(list);
  var mons=pickE.mons.map(function(pr){
    var n=typeof pr[1]==='number'?pr[1]:Rules.dice(String(pr[1]));
    return [pr[0],n];});
  Watch.spawn(mons,{dist:[3,7]});
}
/* ---- Sites ---- */
function questDone(qid){
  var mod=MODULES[G.module];if(!mod)return false;
  var found=false;
  mod.maps.forEach(function(mid){var mm=MAPS[mid];if(!mm)return;
    Object.keys(mm.ev||{}).forEach(function(k){
      if(mm.ev[k].enc&&mm.ev[k].enc.quest===qid&&G.flags[mid+':'+k]==='done')found=true;
    });});
  return found;
}
function siteVisit(ch,arrived){
  var m=map(),s=m.sites[ch],key='site:'+O.mapId+':'+ch;
  if(!s)return;
  if(s.home){
    UI.modal({title:s.name,body:'<p>'+UI.esc(s.text||'')+'</p>',actions:[
      {label:'Go in',primary:1,on:function(){Game.enterMap(s.to,s.x,s.y,s.dir,{});Game.autosave();}},
      {label:'Stay outside'}]});
    return;
  }
  if(s.gate&&!questDone(s.gate.quest)){UI.log('bad',UI.esc(s.gate.text));UI.toast('The way is refused.');return;}
  if(s.to){
    UI.modal({title:s.name,body:'<p>'+UI.esc(s.text||'')+'</p>',actions:[
      {label:'Enter',primary:1,on:function(){Game.enterMap(s.to,s.x,s.y,s.dir,{});Game.autosave();}},
      {label:'Withdraw'}]});
    return;
  }
  if(s.fight&&!G.flags[key]){
    var mons=s.fight.mons.map(function(pr){return [pr[0],typeof pr[1]==='string'?Rules.dice(pr[1]):pr[1]];});
    UI.modal({title:s.name+' — a lair',closable:false,body:'<p>'+UI.esc(s.fight.text||'')+'</p>'+
      '<p class="muted">'+monsText(mons)+'</p>',
      actions:[
        {label:'Storm the lair!',primary:1,on:function(){
          Combat.start({mons:mons,title:s.name,text:s.fight.text,partySurprise:!!s.fight.surprise,
            onWin:function(){
              G.flags[key]='done';
              if(s.fight.quest)Journal.note('Deed accomplished: '+s.fight.quest+'.','deed');
              else Journal.note('Cleared '+s.name+'.','deed');
              Game.autosave();
            }});
        }},
        {label:'Circle warily back'}]});
    return;
  }
  if(s.heal){
    var last=G.flags['heal:'+key];
    if(last!=null&&G.time-last<7*1440){UI.toast(UI.esc(s.heal.who+' tends the wounded once in seven days.'));return;}
    UI.modal({title:s.heal.who,body:'<p>'+UI.esc(s.text||'')+'</p><p class=good>Every living wound is dressed and eased.</p>',
      actions:[{label:'Accept the care',primary:1,on:function(){
        G.flags['heal:'+key]=G.time;
        UI.party().forEach(function(c){if(c.dead)return;c.hp=Math.min(c.maxhp,c.hp+Math.max(4,Math.ceil(c.maxhp/2)));c.poison=null;});
        Game.autosave();UI.hud();UI.renderParty();
      }},{label:'Decline'}]});
    return;
  }
  if(s.holy){
    if(!G.flags[key]){G.flags[key]='done';
      UI.modal({title:s.name,body:'<p>'+UI.esc(s.text||'')+'</p><p class=good>The rite steadies the company. (+'+s.holy.xp+' XP each)</p>',
        actions:[{label:'Amen',primary:1,on:function(){
          UI.party().forEach(function(c){if(c.dead)return;var amt=Rules.xpAward(c,s.holy.xp);c.xp+=amt;});
          Journal.note('Received a blessing at '+s.name+'.','holy');Game.autosave();UI.hud();
        }}]});
      return;}
    UI.log('dim','The stones know you now; the blessing is spent.');return;
  }
  if(s.hamlet){UI.toast(UI.esc(s.name+' — bed, bread and trade arrive with town services.'));return;}
  UI.modal({title:s.name,body:'<p>'+UI.esc(s.text||'A place on the map.')+'</p>',actions:[{label:'Look about',primary:1,on:function(){
    if(s.deed&&!G.flags['deed:'+s.deed]){G.flags['deed:'+s.deed]=1;Journal.note(s.text||'','note');Game.autosave();}
  }}]});
}
function camp(){
  UI.modal({title:'Camp in the wilds',body:'<p>'+((map().sites&&map().sites[cellAt(G.x,G.y)]&&map().sites[cellAt(G.x,G.y)].holy)?'Holy ground holds the dark off tonight.':'The watch is set; the region prowls.')+(Watch.visible().length?'<br><b class=bad>Footfalls already ring the camp.</b>':'')+'</p>',
    actions:[{label:'Camp eight hours',primary:1,on:function(){
      var risk=1;
      var s=map().sites&&map().sites[cellAt(G.x,G.y)];
      if(s&&(s.holy||s.home||s.hamlet))risk=0;
      var p=risk?(Watch.visible().length?.6:.25):0;
      if(risk&&Rules.play.chance(p)){G.time+=120;UI.log('bad','Sounds through the dark break the camp before dawn. (No rest gained; interruption fights arrive with combat.)');UI.hud();return;}
      G.time+=480;G.march=0;O.warnedMarch=false;
      UI.party().forEach(function(c){if(c.dead)return;if(c.hp>0)c.hp=Math.min(c.maxhp,c.hp+1);
        if(c.prep&&c.mem)Object.keys(c.prep).forEach(function(sp){c.mem[sp]=c.prep[sp];});c.layUsed=false;c.fx={};});
      UI.log('good','You camp and take the watch in turns. Dawn finds the company rested.');
      Game.autosave();UI.hud();UI.renderParty();
    }},{label:'Not yet'}]});
}
function visit(){
  var c=cellAt(G.x,G.y);
  if(/^[A-Z]$/.test(c)&&map().sites&&map().sites[c])siteVisit(c,false);
  else UI.log('dim','Nothing here but '+terrName(c)+'.');
}
function terrName(c){return {'^':'broken rock','~':'running water','T':'woods','n':'hills','%':'fen','=':'road','+':'bridge',',':'grass','.':'grassland'}[c]||'open ground';}
/* ---- painting: one cached painted region, fog overlay, site marks ---- */
var regionCache={id:'',s:0,can:null};
function terrCol(c,x,y){
  if(c==='^')return '#4a4f5e';
  if(c==='~')return '#2a4a66';
  if(c==='=')return '#6a5f48';
  if(c==='+')return '#8a7248';
  if(c==='T')return (x*7+y*13)%3?'#22402a':'#1c3624';
  if(c==='n')return (x*11+y*5)%3?'#4c4836':'#433f30';
  if(c==='%')return '#2e4438';
  return (x*3+y*5)%4?'#3a4529':'#354026';
}
function hashXY(id,x,y){
  var h=(x*73856093)^(y*19349663);
  for(var i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);
  return h>>>0;
}
function paintTerrainLayer(m,W,H,s,id){
  var can=document.createElement('canvas');
  can.width=Math.max(1,W*s);can.height=Math.max(1,H*s);
  var g=can.getContext('2d');
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){
    var c=m.grid[y][x],px=x*s,py=y*s;
    var r=new Rules.RNG(hashXY(id,x,y));
    g.fillStyle=terrCol(c,x,y);g.fillRect(px,py,s+1,s+1);
    if(c==='T'){   // canopy blobs with lit crowns
      for(var t=0;t<3;t++){
        var cx=px+r.int(2,s-2),cy=py+r.int(2,s-2),rad=s*.3;
        g.fillStyle='#16281b';g.beginPath();g.arc(cx,cy,rad,0,6.29);g.fill();
        g.fillStyle='#2e5a36';g.beginPath();g.arc(cx-rad*.3,cy-rad*.35,rad*.55,0,6.29);g.fill();
      }
    }else if(c==='n'){   // hill mounds, light on the sun side
      g.fillStyle='#57513c';g.beginPath();g.arc(px+s*.5,py+s*.75,s*.4,Math.PI,0);g.fill();
      g.fillStyle='#6b6248';g.beginPath();g.arc(px+s*.42,py+s*.62,s*.16,Math.PI,0);g.fill();
    }else if(c==='^'){   // peaks with snow tips
      g.fillStyle='#5a6070';g.beginPath();
      g.moveTo(px+1,py+s);g.lineTo(px+s*.5,py+1.5);g.lineTo(px+s-1,py+s);g.closePath();g.fill();
      g.fillStyle='#cfd6e4';g.beginPath();
      g.moveTo(px+s*.5,py+1.5);g.lineTo(px+s*.66,py+s*.4);g.lineTo(px+s*.34,py+s*.4);g.closePath();g.fill();
    }else if(c==='%'){   // fen reeds and water sheen
      g.strokeStyle='#3f5a49';g.lineWidth=1;
      for(var q=0;q<3;q++){var qx=px+r.int(2,s-2);g.beginPath();g.moveTo(qx,py+s);g.quadraticCurveTo(qx+2,py+s*.5,qx-1,py+2);g.stroke();}
      g.fillStyle='rgba(120,160,170,.14)';g.fillRect(px,py+s*.55,s,1.6);
    }else if(c==='~'){   // current lines
      g.strokeStyle='rgba(140,180,220,.4)';g.lineWidth=1.4;
      g.beginPath();g.moveTo(px,py+s*.35+r.int(0,3));
      g.quadraticCurveTo(px+s*.5,py+s*(.3+r.chance(.5)?.45:.15),px+s,py+s*.5);g.stroke();
    }else if(c==='='||c==='+'){   // beaten ruts and planks
      g.fillStyle='rgba(30,26,18,.5)';
      for(var d=0;d<4;d++)g.fillRect(px+r.int(1,s-3),py+r.int(1,s-3),2,2);
      if(c==='+'){g.strokeStyle='#5a4a30';g.strokeRect(px+1,py+1,s-2,s-2);}
    }else if(c==='.'||c===','){   // grass speckle
      g.fillStyle=r.chance(.5)?'rgba(120,140,80,.16)':'rgba(16,22,12,.25)';
      for(var p2=0;p2<4;p2++)g.fillRect(px+r.int(0,s-2),py+r.int(0,s-2),1.6,1.6);
    }
  }
  try{g.lineWidth=1;}catch(e){}
  return can;
}
function render(){
  if(!cv||!O)return;
  var m=map(),g=m.grid,H=g.length,W=g[0].length;
  var cw=cv.width,ch=cv.height;
  var s=Math.min(cw/W,ch/H),ox=(cw-W*s)/2,oy=(ch-H*s)/2;
  ctx.fillStyle='#07080c';ctx.fillRect(0,0,cw,ch);
  var seen=G.seen[O.mapId];
  if(regionCache.id!==O.mapId||regionCache.s!==Math.round(s)*1000+H){
    regionCache={id:O.mapId,s:Math.round(s)*1000+H,can:paintTerrainLayer(m,W,H,s,O.mapId)};
  }
  ctx.drawImage(regionCache.can,ox,oy,W*s,H*s);
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){
    var known=!seen||!seen[y]||seen[y][x]==='1';
    var c=g[y];c=c[x];
    if(!known){
      ctx.fillStyle='#0d0f16';ctx.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));
      continue;
    }
    if(/^[A-Z]$/.test(c)&&c!=='T'&&m.sites&&m.sites[c]){
      ctx.fillStyle='#e3b54a';ctx.beginPath();
      ctx.moveTo(ox+x*s+s/2,oy+y*s+2);ctx.lineTo(ox+x*s+s-2,oy+y*s+s/2);
      ctx.lineTo(ox+x*s+s/2,oy+y*s+s-2);ctx.lineTo(ox+x*s+2,oy+y*s+s/2);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='#e9e2cf';ctx.font=Math.max(10,s*.5)+'px Georgia';
      ctx.fillText(m.sites[c].name,ox+x*s+2,oy+y*s-3);
    }
  }
  // night wash under the live markers so bands and tokens stay crisp
  if(isNight()){ctx.fillStyle='rgba(24,32,72,0.28)';ctx.fillRect(0,0,cw,ch);}
  // bands visible to the march
  Watch.visible().forEach(function(b){
    ctx.fillStyle='#c0392b';
    ctx.beginPath();ctx.arc(ox+(b.x+.5)*s,oy+(b.y+.5)*s,Math.max(3,s*.3),0,6.29);ctx.fill();
    ctx.fillStyle='#e9e2cf';ctx.font=Math.max(9,s*.45)+'px Georgia';
    ctx.fillText(String(b.n),ox+(b.x+1)*s+1,oy+(b.y+1)*s-1);
  });
  // party token
  ctx.fillStyle='#e3b54a';
  ctx.beginPath();ctx.arc(ox+(G.x+.5)*s,oy+(G.y+.5)*s,Math.max(4,s*.35),0,6.29);ctx.fill();
  ctx.strokeStyle='#0d0e13';ctx.stroke();
  // compass
  ctx.fillStyle='#e9e2cf';ctx.font='16px Georgia';ctx.fillText('N',cw-24,20);
  ctx.fillText('☾ '+(isNight()?'night':'day'),12,20);
}
function stepTowardsClient(cx,cy){
  if(!cv||!O)return;
  var m=map(),W=m.grid[0].length,H=m.grid.length;
  var s=Math.min(cv.width/W,cv.height/H),ox=(cv.width-W*s)/2,oy=(cv.height-H*s)/2;
  var r=cv.getBoundingClientRect();
  var tx=Math.floor(((cx-r.left)*(cv.width/r.width)-ox)/s)-G.x;
  var ty=Math.floor(((cy-r.top)*(cv.height/r.height)-oy)/s)-G.y;
  if(!tx&&!ty)return;
  var dx=Math.abs(tx)>=Math.abs(ty)?(tx>0?1:-1):0;
  var dy=dx===0?(ty>0?1:-1):0;
  wildMove(dx,dy);
}
function onKey(e){
  var k=e.key.toLowerCase();
  if(DIRK[k]){wildMove(DIRK[k][0],DIRK[k][1]);e.preventDefault();return;}
  if(e.key==='Enter'||e.key===' '){visit();e.preventDefault();return;}
  if(k==='r'){camp();return;}
  if(k==='m'||k==='j'||k==='b'||k==='p'||k==='f'){Game.forwardHotkey(k,e);}
}
function monsText(mons){return mons.map(function(pr){return pr[1]+'× '+(MONSTERS[pr[0]]?MONSTERS[pr[0]].n:pr[0]);}).join(', ');}
return{init:init,enter:enter,onKey:onKey,render:render,visit:visit,camp:camp,stepTowardsClient:stepTowardsClient,isActive:function(){return !!O&&document.getElementById('overCanvas').classList.contains('hidden')===false;}};
})();
