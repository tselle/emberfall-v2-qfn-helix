/* Emberfall — js/overland.js
 * Over: region painter, camera, reveal; wildMove with §6 travel time,
 * encounter rolls, camping and site visits. One tile = one mile.
 * Painted-art polish arrives with the rendering pass. */
'use strict';
var Over=(function(){
var O=null,cv=null,ctx=null;
var REC=null,CW=1280,CH=800,K=1;
var TILE=44*1.5;      // design px per mile-tile: the brief's 44-unit tile at 1.5× zoom
var DIRK={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0],q:[-1,-1],e:[1,-1],z:[-1,1],c:[1,1]};
var TERR={'.':{cost:1,p:.05},'=':{cost:.5,p:.035},'+':{cost:.5,p:.035},'T':{cost:2,p:.08},'n':{cost:2,p:.07},'%':{cost:3,p:.09}};

function init(canvas){cv=canvas;ctx=canvas.getContext('2d');fitWild();}
function resize(){fitWild();}
function fitWild(){REC=Look.fit(cv)||REC;if(REC){CW=REC.w;CH=REC.h;K=REC.k;}}

/* Camera window in design units: 44-unit tiles at 1.5× zoom, centred on the
 * company, clamped to the map edge so the stage is never empty void. */
function mapView(Wm,Hm){
  var s=TILE,vw=CW/s,vh=CH/s,ox,oy;
  if(Wm<=vw)ox=(CW-Wm*s)/2;else ox=CW/2-(G.x+0.5)*s;
  if(Hm<=vh)oy=(CH-Hm*s)/2;else oy=CH/2-(G.y+0.5)*s;
  if(Wm>vw)ox=Math.max(CW-Wm*s,Math.min(0,ox));
  if(Hm>vh)oy=Math.max(CH-Hm*s,Math.min(0,oy));
  return{s:s,ox:ox,oy:oy};
}
function map(){return O&&MAPS[O.mapId];}
function cellAt(x,y){return Game.cellAt(O.mapId,x,y);}
function enter(mapId){O={mapId:mapId,prompted:{},warnedMarch:false};revealAround();render();}
function partyMV(){
  var mv=12;UI.party().forEach(function(c){if(c.dead)return;mv=Math.min(mv,Rules.RACES[c.race].mv);});
  return mv;
}
/* The hour's light belongs to Look, next to the palette: the overland map, the
   watch and the sky all read the same curve, so night means one thing here. */
function isNight(){return Look.isNight(G.time);}
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
  /* A hamlet is not a town: no forge, no temple, no merchant. It does have a spare
     bed and a long table, and both take coin. Both routes go straight back into the
     town services rather than a second implementation of rest and rumour, so a bed
     here costs and cures exactly as a bed in Thornwick does. */
  if(s.hamlet){
    var beds=UI.party().length;
    UI.modal({title:s.name,body:'<p>'+UI.esc(s.text||'A hamlet of a few roofs and one bell.')+'</p>'+
      '<p class="muted">Beds are <b>'+beds+' gp</b> a night for the company; a round costs <b>2 gp</b>. '+
      'For a forge, a temple or a merchant, you want Thornwick.</p>'+
      '<p class="muted">The purse holds '+G.gold+' gp.</p>',
      actions:[
        {label:'Take the beds ('+beds+' gp)',primary:1,disabled:G.gold<beds,
         title:'Sleep to 07:00; the company recovers and spellcasters re-memorize',
         on:function(){Campaign.openService({svc:'inn',name:s.name});}},
        {label:'Buy a round at the table (2 gp)',disabled:G.gold<2,
         title:'Hear the local talk; each round reveals one more rumour',
         on:function(){Campaign.openService({svc:'tavern',name:s.name});}},
        {label:'Move on'}]});
    return;
  }
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
      Game.autosave();UI.hud();UI.renderParty();Game.refreshHour();
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
/* ---- the country's weather ------------------------------------------------
   A coarse value-noise field, sampled bilinearly, is the region's WEATHER: grass a
   little warmer over one ridge and colder in the next valley, so the painter is not
   stamping one green across ten thousand cells. Everything downstream reads it. */
function noiseField(id){
  var per=5,N=96,tab=new Float32Array(N*N);
  for(var i=0;i<N*N;i++)tab[i]=(hashXY(id,(i*7919)%N,(i*104729)%N)%1000)/1000;
  return function(x,y){
    var fx=x/per,fy=y/per;
    var x0=Math.floor(fx)%N,y0=Math.floor(fy)%N;
    var tx=fx-Math.floor(fx),ty=fy-Math.floor(fy);
    var x1=(x0+1)%N,y1=(y0+1)%N;
    var a=tab[y0*N+x0],b2=tab[y0*N+x1],c2=tab[y1*N+x0],d2=tab[y1*N+x1];
    var u=(1-tx)*(1-ty)*a+tx*(1-ty)*b2+(1-tx)*ty*c2+tx*ty*d2;
    return u>1?1:(u<0?0:u);
  };
}
function rgbOf(hex){var n=parseInt(String(hex).replace('#',''),16);return [n>>16&255,n>>8&255,n&255];}
function mixc(h1,h2,t){
  var a=rgbOf(h1),b2=rgbOf(h2);
  return 'rgb('+Math.round(a[0]+(b2[0]-a[0])*t)+','+Math.round(a[1]+(b2[1]-a[1])*t)+
         ','+Math.round(a[2]+(b2[2]-a[2])*t)+')';
}
function isWet(c){return c==='~'||c==='%';}
function terrCol(c,x,y,nz){
  var t=nz?nz(x,y):0.5;
  if(c==='^')return mixc('#4a4f5e','#3d4250',t);
  if(c==='~')return mixc('#2a4a66','#213d5c',t);
  if(c==='=')return mixc('#6a5f48','#75694e',t);
  if(c==='+')return mixc('#8a7248','#7d6740',t);
  if(c==='T')return mixc('#22402a','#1a3221',t);
  if(c==='n')return mixc('#4c4836','#57513c',t);
  if(c==='%')return mixc('#2e4438','#25402f',t);
  return mixc('#3a4529','#48532f',t);
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
  var nz=noiseField(id),grid=m.grid;
  function nb(x,y){return (x<0||y<0||x>=W||y>=H)?'.':grid[y][x];}
  for(var y=0;y<H;y++)for(var x=0;x<W;x++){
    var c=grid[y][x],px=x*s,py=y*s;
    var r=new Rules.RNG(hashXY(id,x,y));
    var t=nz(x,y);
    g.fillStyle=terrCol(c,x,y,nz);g.fillRect(px,py,s+1,s+1);
    var up=nb(x,y-1),dn=nb(x,y+1),lf=nb(x-1,y),rt=nb(x+1,y);
    /* Edge treatments. This is what makes adjacent biomes read as ONE country:
       a shoreline, a canopy shadow, a hill casting its slope into the valley. */
    if(!isWet(c)&&(isWet(up)||isWet(dn)||isWet(lf)||isWet(rt))){
      g.fillStyle='rgba(196,178,132,.30)';                 // strand-line
      if(isWet(up))g.fillRect(px,py,s,Math.max(1.4,s*.10));
      if(isWet(dn))g.fillRect(px,py+s-Math.max(1.4,s*.10),s,Math.max(1.4,s*.10));
      if(isWet(lf))g.fillRect(px,py,Math.max(1.4,s*.10),s);
      if(isWet(rt))g.fillRect(px+s-Math.max(1.4,s*.10),py,Math.max(1.4,s*.10),s);
    }
    if(c!=='T'&&(up==='T'||dn==='T'||lf==='T'||rt==='T')){
      g.fillStyle='rgba(8,14,9,.30)';                      // canopy shade
      if(up==='T')g.fillRect(px,py,s,s*.22);
      if(dn==='T')g.fillRect(px,py+s*.78,s,s*.22);
      if(lf==='T')g.fillRect(px,py,s*.22,s);
      if(rt==='T')g.fillRect(px+s*.78,py,s*.22,s);
    }
    if(isWet(c)&&!isWet(up)&&up!=='?'){                    // lit water edge
      g.fillStyle='rgba(150,196,224,.22)';g.fillRect(px,py,s,Math.max(1.2,s*.08));
    }
    if(c==='T'){   // canopy blobs with lit crowns
      for(var ti=0;ti<3;ti++){
        var cx=px+r.int(2,s-2),cy=py+r.int(2,s-2),rad=s*(.26+t*.10);
        g.fillStyle='#16281b';g.beginPath();g.arc(cx,cy,rad,0,6.29);g.fill();
        g.fillStyle='rgba(120,166,96,'+(0.16+t*0.14).toFixed(3)+')';
        g.beginPath();g.arc(cx-rad*.3,cy-rad*.35,rad*.5,0,6.29);g.fill();
      }
    }else if(c==='n'){   // hill mounds, light on the sun side, shadow away from it
      g.fillStyle='#57513c';g.beginPath();g.arc(px+s*.5,py+s*.75,s*.4,Math.PI,0);g.fill();
      g.fillStyle='rgba(20,18,14,.32)';
      g.beginPath();g.ellipse(px+s*.62,py+s*.82,s*.30,s*.10,0,0,6.29);g.fill();
      g.fillStyle=mixc('#6b6248','#7d7458',t);
      g.beginPath();g.arc(px+s*.42,py+s*.62,s*.16,Math.PI,0);g.fill();
    }else if(c==='^'){   // peaks with snow tips and a shaded flank
      g.fillStyle=mixc('#5a6070','#4b5162',t);g.beginPath();
      g.moveTo(px+1,py+s);g.lineTo(px+s*.5,py+1.5);g.lineTo(px+s-1,py+s);g.closePath();g.fill();
      g.fillStyle='rgba(12,14,20,.30)';g.beginPath();
      g.moveTo(px+s*.5,py+1.5);g.lineTo(px+s-1,py+s);g.lineTo(px+s*.5,py+s);g.closePath();g.fill();
      g.fillStyle='#cfd6e4';g.beginPath();
      g.moveTo(px+s*.5,py+1.5);g.lineTo(px+s*.66,py+s*.4);g.lineTo(px+s*.34,py+s*.4);g.closePath();g.fill();
      if(t<0.42){                                          // a scree fan below the crest
        g.fillStyle='rgba(30,32,40,.45)';
        g.beginPath();g.ellipse(px+s*.5,py+s*.92,s*.3,s*.10,0,0,6.29);g.fill();
      }
    }else if(c==='%'){   // fen reeds and water sheen
      g.strokeStyle='#3f5a49';g.lineWidth=1;
      for(var q=0;q<3;q++){var qx=px+r.int(2,s-2);g.beginPath();g.moveTo(qx,py+s);g.quadraticCurveTo(qx+2,py+s*.5,qx-1,py+2);g.stroke();}
      g.fillStyle='rgba(120,160,170,'+(0.10+t*0.10).toFixed(3)+')';g.fillRect(px,py+s*.55,s,1.6);
    }else if(c==='~'){   // current lines
      g.strokeStyle='rgba(140,180,220,.4)';g.lineWidth=1.4;
      g.beginPath();g.moveTo(px,py+s*.35+r.int(0,3));
      g.quadraticCurveTo(px+s*.5,py+s*(.3+r.chance(.5)?.45:.15),px+s,py+s*.5);g.stroke();
    }else if(c==='='||c==='+'){   // beaten ruts, and a lane where the road continues
      var lane='rgba(206,190,150,.10)';
      g.fillStyle=lane;
      if(lf==='='||lf==='+'||lf==='+')g.fillRect(px,py+s*.42,s*.5,Math.max(1.6,s*.16));
      if(rt==='='||rt==='+')g.fillRect(px+s*.5,py+s*.42,s*.5,Math.max(1.6,s*.16));
      if(up==='='||up==='+')g.fillRect(px+s*.42,py,Math.max(1.6,s*.16),s*.5);
      if(dn==='='||dn==='+')g.fillRect(px+s*.42,py+s*.5,Math.max(1.6,s*.16),s*.5);
      g.fillStyle='rgba(30,26,18,.5)';
      for(var d=0;d<4;d++)g.fillRect(px+r.int(1,s-3),py+r.int(1,s-3),2,2);
      if(c==='+'){g.strokeStyle='#5a4a30';g.strokeRect(px+1,py+1,s-2,s-2);}
    }else if(c==='.'||c===','){   // grass speckle, and flowering where the ground is warm
      g.fillStyle=r.chance(.5)?'rgba(120,140,80,.16)':'rgba(16,22,12,.25)';
      for(var p2=0;p2<4;p2++)g.fillRect(px+r.int(0,s-2),py+r.int(0,s-2),1.6,1.6);
      if(t>0.62){
        g.fillStyle='rgba(214,204,150,'+(0.10+(t-0.62)*0.5).toFixed(3)+')';
        for(var f2=0;f2<3;f2++)g.fillRect(px+r.int(1,s-2),py+r.int(1,s-2),1.4,1.4);
      }else if(t<0.24){
        g.fillStyle='rgba(58,54,44,.55)';                   // bare ground and a stone
        g.beginPath();g.ellipse(px+r.int(3,s-4),py+r.int(3,s-4),s*.09,s*.06,0,0,6.29);g.fill();
      }
    }
  }
  try{g.lineWidth=1;}catch(e){}
  return can;
}
function render(){
  if(!cv||!O)return;
  var m=map(),g=m.grid,H=g.length,W=g[0].length;
  fitWild();
  var v=mapView(W,H),s=v.s,ox=v.ox,oy=v.oy;
  ctx.setTransform(K,0,0,K,0,0);
  ctx.fillStyle='#07080c';ctx.fillRect(0,0,CW,CH);
  // the region is painted once, in device pixels, then blitted through the fit
  var ds=Math.max(8,Math.min(Math.round(s*K),Math.floor(Math.sqrt(4e6/Math.max(1,W*H)))));
  if(regionCache.id!==O.mapId||regionCache.s!==ds){
    regionCache={id:O.mapId,s:ds,can:paintTerrainLayer(m,W,H,ds,O.mapId)};
  }
  ctx.drawImage(regionCache.can,ox,oy,W*s,H*s);
  var seen=G.seen[O.mapId];
  var x0=Math.max(0,Math.floor(-ox/s)),x1=Math.min(W,Math.ceil((CW-ox)/s));
  var y0=Math.max(0,Math.floor(-oy/s)),y1=Math.min(H,Math.ceil((CH-oy)/s));
  /* Fog of travel. Hard-edged squares read as a grid rather than as country you
     have not walked. Each unknown cell is graded by how deep inside the blank it
     sits, so the veil breathes out over a few cells instead of stopping dead, and
     the frontier itself gets a thin ink line: a survey admitting where it stops
     being true. The veil stays dark enough that nothing hidden is legible. */
  function knw(kx,ky){return !seen||!seen[ky]||seen[ky][kx]==='1';}
  var FOG=null,FW=Math.max(1,x1-x0),FH=Math.max(1,y1-y0);
  if(seen&&FW>0&&FH>0){
    FOG=new Uint8Array(FW*FH);
    for(var fzy=0;fzy<FH;fzy++)for(var fzx=0;fzx<FW;fzx++)
      FOG[fzy*FW+fzx]=knw(x0+fzx,y0+fzy)?0:60;
    for(var fpass=0;fpass<6;fpass++){
      for(var fty=0;fty<FH;fty++)for(var ftx=0;ftx<FW;ftx++){
        var fidx=fty*FW+ftx,fcur=FOG[fidx];
        if(fcur===0)continue;
        var fmin=63;
        if(ftx>0&&FOG[fidx-1]<fmin)fmin=FOG[fidx-1];
        if(ftx<FW-1&&FOG[fidx+1]<fmin)fmin=FOG[fidx+1];
        if(fty>0&&FOG[fidx-FW]<fmin)fmin=FOG[fidx-FW];
        if(fty<FH-1&&FOG[fidx+FW]<fmin)fmin=FOG[fidx+FW];
        if(fmin+1<fcur)FOG[fidx]=fmin+1;
      }
    }
  }
  var FOGA=[0,0.72,0.85,0.92,0.96,0.98,0.99];
  for(var y=y0;y<y1;y++)for(var x=x0;x<x1;x++){
    var known=!seen||!seen[y]||seen[y][x]==='1';
    var c=g[y];c=c[x];
    if(!known){
      var fd=FOG?FOG[(y-y0)*FW+(x-x0)]:60;
      ctx.fillStyle='rgba(11,12,18,'+FOGA[fd>6?6:fd].toFixed(3)+')';
      ctx.fillRect(ox+x*s,oy+y*s,Math.ceil(s)+1,Math.ceil(s)+1);
      continue;
    }
    if(seen){
      var ccx=ox+x*s,ccy=oy+y*s;
      ctx.strokeStyle='rgba(227,181,74,.15)';ctx.lineWidth=1;
      ctx.beginPath();
      if(!knw(x,y-1)){ctx.moveTo(ccx,ccy);ctx.lineTo(ccx+s,ccy);}
      if(!knw(x,y+1)){ctx.moveTo(ccx,ccy+s);ctx.lineTo(ccx+s,ccy+s);}
      if(!knw(x-1,y)){ctx.moveTo(ccx,ccy);ctx.lineTo(ccx,ccy+s);}
      if(!knw(x+1,y)){ctx.moveTo(ccx+s,ccy);ctx.lineTo(ccx+s,ccy+s);}
      ctx.stroke();
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
  /* Night wash under the live markers so bands and tokens stay crisp. Two washes,
     both from the hour: the plate goes cold and indigo through the dark hours and
     catches an ember veil at either end of the day. */
  var oday=Look.daylight(G.time);
  if(oday.starA>0.04){ctx.fillStyle='rgba(24,32,72,'+(0.32*oday.starA).toFixed(3)+')';ctx.fillRect(0,0,CW,CH);}
  if(oday.dusk>0.04){ctx.fillStyle='rgba(196,98,44,'+(0.15*oday.dusk).toFixed(3)+')';ctx.fillRect(0,0,CW,CH);}
  /* Map tokens are the same likeness as the foe you fight and the entry you
     read. A red disc stays under each band so danger still reads at a glance,
     and below ~22 px per tile a silhouette is mush, so tokens fall back to the
     disc — coloured by the same recipe, at least. */
  var F=window.Figures,shapes=s>=22;
  Watch.visible().forEach(function(b){
    var bx=ox+(b.x+.5)*s,by=oy+(b.y+.5)*s;
    var def=(window.MONSTERS&&MONSTERS[b.mon])||{};
    var col=(F&&F.monColor)?F.monColor(b.mon,def):'#c0392b';
    ctx.fillStyle='rgba(192,57,43,.85)';
    ctx.beginPath();ctx.ellipse(bx,by+s*.28,s*.30,s*.11,0,0,6.29);ctx.fill();
    if(F&&F.monDesc&&shapes){
      F.inBox(ctx,F.monDesc(b.mon,def),bx,by+s*.28,s*.62*(F.sizeOf?F.sizeOf(def):1));
    }else{
      ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(bx,by-s*.06,Math.max(3,s*.24),0,6.29);ctx.fill();
    }
    ctx.font='bold '+Math.max(9,Math.round(s*.34))+'px Georgia';
    ctx.strokeStyle='rgba(13,14,19,.85)';ctx.lineWidth=2.5;
    ctx.strokeText(String(b.n),bx+s*.26,by-s*.24);
    ctx.fillStyle='#f0e6cf';ctx.fillText(String(b.n),bx+s*.26,by-s*.24);
    ctx.lineWidth=1;
  });
  // the company: gold disc and rim so it stays findable, leader's likeness on it
  var px=ox+(G.x+.5)*s,py=oy+(G.y+.5)*s;
  ctx.fillStyle='rgba(227,181,74,.20)';
  ctx.beginPath();ctx.ellipse(px,py+s*.28,s*.32,s*.12,0,0,6.29);ctx.fill();
  ctx.strokeStyle='#e3b54a';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.ellipse(px,py+s*.28,s*.32,s*.12,0,0,6.29);ctx.stroke();
  ctx.lineWidth=1;
  var lead=null;
  try{UI.party().forEach(function(c){if(!lead&&!c.dead)lead=c;});}catch(e){}
  if(F&&F.figForChar&&lead&&shapes){
    F.inBox(ctx,F.figForChar(lead),px,py+s*.28,s*.70);
  }else{
    ctx.fillStyle='#e3b54a';
    ctx.beginPath();ctx.arc(px,py,Math.max(4,s*.22),0,6.29);ctx.fill();
    ctx.strokeStyle='#0d0e13';ctx.stroke();
  }
  // compass rose and the march's hour, tucked into the corners away from the HUD
  var cxr=CW-38,cyr=CH-38,rad=20;
  ctx.strokeStyle='rgba(233,226,207,.35)';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(cxr,cyr,rad,0,6.283);ctx.stroke();
  ctx.fillStyle='rgba(13,14,19,.55)';ctx.beginPath();ctx.arc(cxr,cyr,rad-1,0,6.283);ctx.fill();
  ctx.fillStyle='#e3b54a';
  ctx.beginPath();ctx.moveTo(cxr,cyr-rad+4);ctx.lineTo(cxr+4,cyr);ctx.lineTo(cxr-4,cyr);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(233,226,207,.7)';
  ctx.beginPath();ctx.moveTo(cxr,cyr+rad-4);ctx.lineTo(cxr+4,cyr);ctx.lineTo(cxr-4,cyr);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e9e2cf';ctx.font='bold 11px Georgia';ctx.textAlign='center';
  ctx.fillText('N',cxr,cyr-rad-5);ctx.textAlign='left';
  ctx.fillStyle='rgba(233,226,207,.8)';ctx.font='13px Georgia';
  ctx.fillText(isNight()?'☾ night':'☼ day',12,CH-16);
}
function stepTowardsClient(cx,cy){
  if(!cv||!O)return;
  var m=map(),W=m.grid[0].length,H=m.grid.length;
  fitWild();
  var v=mapView(W,H),s=v.s,ox=v.ox,oy=v.oy;
  var r=cv.getBoundingClientRect();
  // client px → design units, then into the camera window
  var tx=Math.floor(((cx-r.left)*(CW/(r.width||CW))-ox)/s)-G.x;
  var ty=Math.floor(((cy-r.top)*(CH/(r.height||CH))-oy)/s)-G.y;
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
return{init:init,resize:resize,enter:enter,onKey:onKey,render:render,visit:visit,camp:camp,stepTowardsClient:stepTowardsClient,isActive:function(){return !!O&&document.getElementById('overCanvas').classList.contains('hidden')===false;}};
})();
