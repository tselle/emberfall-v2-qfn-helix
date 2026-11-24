/* Emberfall — js/game.js
 * Owns campaign state G, the exploration runtime X, save/load, map entry,
 * movement & arrival events, traps/search, camping, title/assembly flow,
 * global input and bootstrap. */
'use strict';
var Game=(function(){
var G=null;var X=null;            // X: transient exploration runtime
var SAVE_PREFIX='emberfall.save.';
var DIRV=[[0,-1],[1,0],[0,1],[-1,0]];   // 0=N 1=E 2=S 3=W
var DIRS=['N','E','S','W'];

/* ============ Screens ============ */
function show(id){
  ['title','campaign','assembly','game'].forEach(function(s){
    var e=document.getElementById(s);if(e)e.classList.toggle('hidden',s!==id);
  });
}
function fmtTime(mins){
  var day=1+Math.floor(mins/1440),h=Math.floor(mins%1440/60),m=mins%60;
  return 'Day '+day+', '+('0'+h).slice(-2)+':'+('0'+m).slice(-2);
}

/* ============ Title ============ */
function title(){
  UI.closeAll();
  show('title');
  paintTitleActions();
  embers();
}
function paintTitleActions(){
  var host=document.getElementById('titleActions');host.innerHTML='';
  var latest=latestSave();
  function btn(label,fn,enabled,sub){
    var b=document.createElement('button');b.textContent=label+(sub?' — '+sub:'');
    b.disabled=!enabled;b.onclick=fn;
    b.title=enabled?(sub||label):'No saved company yet';
    host.appendChild(b);return b;
  }
  btn('New Game',function(){Campaign.choose();},true);
  btn('Continue',function(){loadLatest();},!!latest,latest?((latest.meta.leader||'\u2014')+' \u00b7 '+(latest.meta.where||'')+' \u00b7 '+(latest.meta.when||'')):null);
  btn('Load Game',function(){UI.loadDialog();},!!latest);
  btn('How to Play',function(){UI.help();},true);
}
function latestSave(){
  var best=null;
  ['auto','1','2','3'].forEach(function(k){var s=readSlot(k);if(s&&(!best||(s.meta&&s.meta.ts)>((best.meta&&best.meta.ts)||0)))best=s;});
  return best;
}
function loadLatest(){
  var best=null,bk=null;
  ['auto','1','2','3'].forEach(function(k){var s=readSlot(k);if(s&&(!best||(s.meta.ts||0)>(best.meta.ts||0))){best=s;bk=k;}});
  if(!best){UI.toast('No saved company found.');return;}
  loadSlot(bk);
}

/* ============ Save / load ============ */
function storageOK(){try{localStorage.setItem('emberfall.probe','1');localStorage.removeItem('emberfall.probe');return true;}catch(e){return false;}}
function readSlot(k){
  if(!storageOK())return null;
  try{var raw=localStorage.getItem(SAVE_PREFIX+k);return raw?JSON.parse(raw):null;}catch(e){return null;}
}
function save(k){
  if(!G)return false;
  if(!storageOK()){UI.toast('Saving is unavailable in this browser.');return false;}
  var lead=UI.party()[0];
  var m=MAPS[G.map],mod=MODULES[G.module];
  G.meta={leader:lead?lead.name:'\u2014',where:m?m.name:'',when:fmtTime(G.time),
    saved:new Date().toLocaleString(),ts:Date.now(),
    mod:(mod?mod.code+' '+mod.name:''),lvl:Math.round(UI.party().reduce(function(a,c){return a+c.lvl;},0)/Math.max(1,G.party.length))};
  try{localStorage.setItem(SAVE_PREFIX+k,JSON.stringify(G));return true;}
  catch(e){UI.toast('Save failed: '+(e&&e.name||'storage error'));return false;}
}
function autosave(){save('auto');}
function loadSlot(k){
  var s=readSlot(k);
  if(!s||!s.roster){UI.toast('That slot cannot be read.');return false;}
  // legacy / missing-field migration
  if(!s.module)s.module='hollow';
  if(!s.done)s.done=s.won?[s.module]:[];
  ['flags','mods','seen','quests','ground','journal','bestiary','rumors'].forEach(function(f){if(!s[f])s[f]=(f==='journal')?[]:{};});
  if(s.time==null)s.time=480;if(s.march==null)s.march=0;
  G=s;window.G=G;
  UI.closeAll();
  show('game');
  enterMap(G.map,G.x,G.y,G.dir,{restoring:true});
  UI.log('round','— Resumed: '+(MODULES[G.module]?MODULES[G.module].name:'')+' —');
  UI.hud();
  return true;
}
function quitToTitle(){
  autosave();
  X=null;
  title();
}

/* ============ Seen-mask ============ */
function seenRow(mapId,y){
  var m=MAPS[mapId];if(!m)return '';
  var row=G.seen[mapId];
  if(!row){row=[];for(var i=0;i<m.grid.length;i++)row.push(new Array(m.grid[0].length+1).join('0'));G.seen[mapId]=row;}
  return row[y];
}
function reveal(mapId,x,y){
  var m=MAPS[mapId];if(!m)return;
  if(y<0||y>=m.grid.length||x<0||x>=m.grid[0].length)return;
  var row=G.seen[mapId];seenRow(mapId,y);row=G.seen[mapId];
  row[y]=row[y].substr(0,x)+'1'+row[y].substr(x+1);
}
function opaque(mapId,x,y){
  var m=MAPS[mapId];if(!m)return true;
  if(y<0||y>=m.grid.length||x<0||x>=m.grid[0].length)return true;
  var c=cellAt(mapId,x,y);
  return '#HBTFL^~'.indexOf(c)>=0;   // D doors opaque too? spec: doors opaque: D opaque. S looks like wall (#) until found.
}
function cellAt(mapId,x,y){
  var m=MAPS[mapId];if(!m)return '#';
  var mods=G.mods&&G.mods[mapId];
  var k=x+','+y;
  if(mods&&mods[k]!=null)return mods[k];
  if(y<0||y>=m.grid.length||x<0||x>=m.grid[0].length)return '#';
  return m.grid[y].charAt(x);
}
function setCell(mapId,x,y,c){
  if(!G.mods[mapId])G.mods[mapId]={};
  G.mods[mapId][x+','+y]=c;
}
function revealSight(mapId,x,y,dir){
  reveal(mapId,x-1,y-1);reveal(mapId,x,y-1);reveal(mapId,x+1,y-1);
  reveal(mapId,x-1,y);reveal(mapId,x,y);reveal(mapId,x+1,y);
  reveal(mapId,x-1,y+1);reveal(mapId,x,y+1);reveal(mapId,x+1,y+1);
  var v=DIRV[dir],cx=x,y2=y;
  for(var i=1;i<=7;i++){
    cx=x+v[0]*i;y2=y+v[1]*i;
    if(opaque(mapId,cx,y2)){reveal(mapId,cx,y2);break;}   // reveal the blocking face
    reveal(mapId,cx,y2);
    reveal(mapId,cx+v[1],y2-v[0]);reveal(mapId,cx-v[1],y2+v[0]);   // sides
  }
}
function initSeen(){if(!G.seen)G.seen={};if(!G.ground)G.ground={};if(!G.mods)G.mods={};if(!G.flags)G.flags={};}

/* ============ Map entry ============ */
function enterMap(mapId,x,y,dir,opts){
  opts=opts||{};
  var def=MAPS[mapId];
  if(!def){UI.toast('That way leads nowhere (map missing).');return;}
  X={mapId:mapId,def:def,prep:View3D.prepare(effMap(mapId)),busy:false,pending:null,
     skipStairs:!opts.restoring,prompted:{},mode:def.overland?'wild':'local',cam:{x:x+.5,y:y+.5,dir:dir}};
  Watch.forget();
  G.map=mapId;G.x=x;G.y=y;G.dir=dir;
  // canvas mode switching
  document.getElementById('view3d').classList.toggle('hidden',X.mode==='wild');
  document.getElementById('overCanvas').classList.toggle('hidden',X.mode!=='wild');
  document.getElementById('combatCanvas').classList.add('hidden');
  if(X.mode==='local'){renderView(1);}
  else{Over.enter(mapId);}
  revealSight(mapId,x,y,dir);
  paintMinimap();
  UI.hud();
  buildCmdBar();
  if(!opts.restoring)arrivalSeq();
}
function effMap(mapId){
  // definition + persistent modified cells, non-destructive copy
  var m=MAPS[mapId];
  var grid=m.grid.slice();
  var mods=G.mods&&G.mods[mapId];
  if(mods)Object.keys(mods).forEach(function(k){
    var p=k.split(','),y=+p[0+1],x=+p[0];
    var row=grid[y].split('');row[x]=mods[k];grid[y]=row.join('');
  });
  return Object.assign({},m,{grid:grid});
}
function closeStairsLoop(){X=null;}

/* ============ Arrival sequence ============ */
function arrivalSeq(){
  var c=cellAt(G.map,G.x,G.y);
  var stairs=X.def.stairs&&X.def.stairs[G.x+','+G.y];
  if(stairs&&X.skipStairs===false){doStairs(stairs);return;}
  X.skipStairs=false;
  // ground pile
  var gpile=G.ground[G.map]&&G.ground[G.map][G.x+','+G.y];
  if(gpile&&gpile.length){groundModal(gpile);return;}
  // event letter (prompted at most once per visit; uncleared ones wait on the tile)
  if(/[a-z]/.test(c)&&X.def.ev&&X.def.ev[c]){
    var key=G.map+':'+c;
    if(!G.flags[key]&&!X.prompted[key]){X.prompted[key]=1;eventModal(c,X.def.ev[c],key);return;}
  }
  // floor trap
  if(X.def.traps&&X.def.traps[G.x+','+G.y]){
    var tk=G.x+','+G.y,tf='trapoff:'+G.map+':'+tk;
    if(!G.flags[tf]&&G.flags['trapseen:'+G.map+':'+tk]===undefined){
      // unknown trap springs under the front rank
      G.flags[tf]=1;
      trapBlast(X.def.traps[tk].kind,'You step into a hidden trap!');
      return;
    }else if(!G.flags[tf]&&G.flags['trapseen:'+G.map+':'+tk]){
      // a marked trap can be stepped around
    }
  }
  // wandering roll (authored tables) — spawn as watch bands
  var wander=X.def.wander;
  if(wander&&wander.length&&!X.def.safe&&!X.noWanderRoll){
    var w=pickWander(wander);
    if(w)Watch.spawn(w.mons);
  }
}
function bandPips(){try{return Watch.visible();}catch(e){return[];}}
function pickWander(list){
  var r=Math.random();
  for(var i=0;i<list.length;i++){if(r<list[i].p)return list[i];r-=list[i].p;}
  return null;
}
function monsText(mons){return mons.map(function(pr){return pr[1]+'× '+(MONSTERS[pr[0]]?MONSTERS[pr[0]].n:pr[0]);}).join(', ');}
function doStairs(st){
  UI.log('dim','You take the stair: '+(st.label||'')+'\u2026');
  enterMap(st.to,st.x,st.y,st.dir,{});
  autosave();
}
/* ---- Events ---- */
function eventModal(ch,ev,key){
  if(ev.enc){
    UI.modal({title:'Set battle',closable:false,body:'<p>'+UI.esc(ev.enc.text||'A fight is upon you.')+'</p>'+
      '<p class="muted">'+UI.esc(monsText(ev.enc.mons))+'</p>',
      actions:[
        {label:'Stand and fight!',primary:1,on:function(){
          Combat.start({mons:ev.enc.mons,title:'Set battle',text:ev.enc.text,
            monsterSurprise:!!ev.enc.ambush,partySurprise:!!ev.enc.surprise,
            loot:{items:ev.items||[],gold:ev.gold},
            onWin:function(){
              G.flags[key]='done';
              if(ev.enc.quest)Journal.note('Deed accomplished: '+ev.enc.quest+'.','deed');
              autosave();
            }});
        }},
        {label:'Withdraw',on:function(){delete X.prompted[key];stepBack();}}]});
    return;
  }
  if(ev.chest){
    chestModal(ev,key);
    return;
  }
  // plain text / deed / items
  UI.modal({title:'A discovery',body:'<p>'+UI.esc(ev.text||'')+'</p>'+
    (ev.hint?'<p class="spell">'+UI.esc(ev.hint)+'</p>':''),
    actions:[{label:'Continue',primary:1,on:function(){
      G.flags[key]='done';
      if(ev.deed)G.flags['deed:'+ev.deed]=1;
      if(ev.items)(ev.items||[]).forEach(function(id){giveToCarrier(id);UI.log('gold','Recovered: '+UI.esc(itemName(id))+' (quest item).');});
      if(ev.hint)Journal.note(ev.hint,'clue');else Journal.note(ev.text||'','note');
      autosave();paintMinimap();UI.hud();
    }}]});
}
function chestModal(ev,key){
  if(ev.chest.guard){
    var g=ev.chest.guard,guards=Array.isArray(g[0])?g:[g];
    UI.modal({title:'A treasure',body:'<p>'+UI.esc(ev.chest.text)+'</p>'+
      '<p class="bad">Something guards it: '+UI.esc(monsText(guards))+'.</p>',
      actions:[
        {label:'Fight the guard',primary:1,on:function(){
          Combat.start({mons:guards,title:'Chest guard',text:'The guardian moves on the treasure.',
            loot:{items:ev.chest.items||[],gold:ev.chest.gold?undefined:undefined},
            onWin:function(){G.flags[key]='done';
              var gold=Rules.dice(ev.chest.gold||'0')|0;
              if(gold){G.gold+=gold;UI.log('gold','The hoard divides at '+gold+' gp.');}
              (ev.chest.items||[]).forEach(function(id){giveToCarrier(id);UI.log('gold','Recovered: '+UI.esc(itemName(id))+'.');});
              if(ev.chest.trap){/* trap still waits under the lid */}
              autosave();paintMinimap();UI.hud();}});
        }},
        {label:'Leave it'}]});
    return;
  }
  if(ev.chest.lock){
    chestLockModal(ev,key);
    return;
  }
  UI.modal({title:'A treasure',body:'<p>'+UI.esc(ev.chest.text)+'</p>',
    actions:[
      {label:'Open it',primary:1,on:function(){
        if(ev.chest.trap)chestTrap(ev.chest.trap);
        openChest(ev.chest,key);
      }},
      {label:'Leave'}]});
}
function knockCasters(){
  return UI.party().filter(function(c){return !c.dead&&c.cls==='M'&&c.mem&&c.mem.knock>0;});
}
function knockAction(onOpen){
  var list=knockCasters();
  return {label:'Knock'+(list.length?' — '+list[0].name.split(' ')[0]+' ('+list[0].mem.knock+' left)':''),
    disabled:!list.length,on:function(){
      var c=list[0];c.mem.knock--;if(c.mem.knock<=0)delete c.mem.knock;
      G.time+=1;
      UI.log('good',UI.esc(c.name)+' speaks a hollow word — the lock forgets its own purpose.');
      UI.hud();UI.renderParty();
      onOpen();
    }};
}
function chestLockModal(ev,key){
  var lockItem=ev.chest.lock,pickKey='pick:'+key;
  var hasKey=UI.party().some(function(c){return !c.dead&&(c.inv.indexOf(lockItem)>=0||Object.keys(c.eq||{}).some(function(s){return c.eq[s]===lockItem;}));});
  UI.modal({title:'A locked treasure',body:'<p>'+UI.esc(ev.chest.text)+'</p><p>'+(ev.chest.lockText||'It is locked fast.')+'</p>',
    actions:[
    {label:'Use the key',disabled:!hasKey,on:function(){openChest(ev.chest,key);}},
    knockAction(function(){openChest(ev.chest,key);}),
    {label:'Pick the lock',disabled:!!G.flags[pickKey+':done'],on:function(){
      G.flags[pickKey+':done']=1;G.time+=10;
      var best=null;UI.party().forEach(function(c){if(c.dead)return;var sk=Rules.thiefSkills(c);if(sk&&(!best||sk.pick>best.pick))best={c:c,s:sk};});
      if(!best){UI.log('dim','None of your company knows locks.');UI.hud();return;}
      if(Rules.play.d100()<=best.s.pick){UI.log('good',UI.esc(best.c.name)+' picks the casket lock.');openChest(ev.chest,key);}
      else UI.log('bad',UI.esc(best.c.name)+' fails — the lock keeps its secret.');
      UI.hud();
    }},
    {label:'Force it',on:function(){
      G.time+=10;
      var strongest=UI.party().filter(function(c){return !c.dead;}).sort(function(a,b){return Rules.abilityScore(b,'str')-Rules.abilityScore(a,'str');})[0];
      if(!strongest){UI.hud();return;}
      var sa=Rules.strOf(strongest);
      if(Rules.play.d20()<=Math.min(20,sa.openDoors+(Rules.abilityScore(strongest,'str')>=18?4:2))){
        UI.log('good',UI.esc(strongest.name)+' forces the silverwork with a crash.');
        if(X.def.wander&&Rules.play.chance(.25))arrivalSeq();
        openChest(ev.chest,key);
      }else{
        UI.log('bad','The hasp bends but holds.');
        if(X.def.wander&&Rules.play.chance(.25)){UI.log('bad','The crashing draws something.');arrivalSeq();}
      }
      UI.hud();
    }},
    {label:'Leave'}]});
}
function openChestNoModal(ch){
  var gold=Rules.dice(ch.gold||'0')|0;
  if(gold){G.gold+=gold;
    var xp=Math.max(1,Math.floor(gold/Math.max(1,UI.party().filter(function(c){return !c.dead;}).length)));
    UI.log('gold','You divide '+gold+' gp among the purse.');awardXP(xp);}
  (ch.items||[]).forEach(function(id){giveToCarrier(id);UI.log('gold','Found: '+UI.esc(itemName(id))+'.');});
  if(ch.items&&ch.items.length)Journal.note('Recovered '+ch.items.map(itemName).join(', ')+'.','loot');
  autosave();paintMinimap();UI.hud();
}
function stepBack(){/* withdrawal leaves you where you stood; the tile waits */}
function openChest(ch,key){
  G.flags[key]='done';
  var gold=Rules.dice(ch.gold||'0')|0;
  if(gold){G.gold+=gold;UI.log('good','You divide '+gold+' gp among the purse.');
    var xp=Math.floor(gold/Math.max(1,UI.party().filter(function(c){return !c.dead;}).length||1));
    awardXP(xp);}
  (ch.items||[]).forEach(function(id){
    giveToCarrier(id);
    UI.log('gold','Found: '+UI.esc(itemName(id))+'.');
    if(id.indexOf('scroll:')!==0&&item(id)&&item(id).t==='q'){}
  });
  if(ch.items&&ch.items.length)Journal.note('Recovered '+ch.items.map(itemName).join(', ')+'.','loot');
  else if(gold)Journal.note('Found '+gold+' gp of treasure.','loot');
  autosave();paintMinimap();UI.hud();
}
function chestTrap(kind){
  UI.log('bad','A trap springs from the chest!');
  trapBlast(kind,'Chest trap');
}
function trapBlast(kind,why){
  var lvl=Math.max(1,Math.round(UI.party().reduce(function(a,c){return a+c.lvl;},0)/Math.max(1,G.party.length)));
  var group=['stones','fire','gas','rune'].indexOf(kind)>=0;
  var dice=group?'2d6':'1d6';
  var saveKind=kind==='gas'?'poison':kind==='fire'?'breath':kind==='darts'||kind==='needles'?'dex':null;
  UI.party().forEach(function(c){
    if(c.dead)return;
    var dmg=Rules.dice(dice);
    var saved=false;
    if(group){
      var st=Rules.saveTargets(Rules.CLASSES[c.cls].save,c.lvl)[kind==='gas'?0:kind==='fire'?3:3];
      saved=Rules.play.d20()>=st;
      if(saved)dmg=Math.ceil(dmg/2);
    }
    applyDamage(c,dmg,why+' ('+kind+')');
  });
  UI.hud();UI.renderParty();
}
function applyDamage(c,dmg,why){
  if(dmg<=0)return;
  c.hp-=dmg;
  UI.log('bad',UI.esc(c.name)+' takes '+dmg+' damage'+(why?' — '+why:'')+' ('+c.hp+'/'+c.maxhp+').');
  if(c.hp<=0&&!c.dead){
    c.hp=Math.max(c.hp,-9);
    UI.log('bad',UI.esc(c.name)+' falls!');
  }
}
function giveToCarrier(id){
  var p=UI.party().find(function(c){return !c.dead;})||UI.party()[0];
  if(p)p.inv.push(id);
}
function awardXP(each){
  UI.party().forEach(function(c){
    if(c.dead)return;
    var amt=Rules.xpAward(c,each);
    if(amt>0){c.xp+=amt;UI.log('dim',UI.esc(c.name)+' gains '+amt+' XP'+(Rules.canTrain(c)?' — ready to train!':''));}
  });
}
/* ---- Ground ---- */
function groundModal(pile){
  UI.modal({title:'A pile of gear',body:'<p>'+pile.map(function(id){return UI.esc(itemName(id));}).join('<br>')+'</p>',
    actions:[{label:'Take everything',primary:1,on:function(){
      var p=UI.party().find(function(c){return !c.dead;});
      if(p){pile.forEach(function(id){p.inv.push(id);});UI.log('good','You gather: '+pile.map(itemName).join(', ')+'.');}
      delete G.ground[G.map][G.x+','+G.y];paintMinimap();UI.hud();
    }},{label:'Leave it'}]});
}
/* ---- Locks ---- */
function lockModal(x,y){
  var def=X.def,key=G.x+','+G.y;
  var pickKey='pick:'+G.map+':'+key;
  var hasKey=def.keyItem&&UI.party().some(function(c){return !c.dead&&(c.inv.indexOf(def.keyItem)>=0||Object.keys(c.eq).some(function(s){return c.eq[s]===def.keyItem;}));});
  UI.modal({title:'A locked door',body:'<p>'+(def.lockText||'Iron and oak, and it is locked.')+'</p>',
    actions:[
    {label:'Use the key',disabled:!hasKey,on:function(){
      setCell(G.map,x,y,'D');UI.log('good','The '+itemName(def.keyItem)+' turns the lock.');
      // consume: key is a quest item; keep it (reusable keys)
      enterRefresh();
    }},
    knockAction(function(){setCell(G.map,x,y,'D');enterRefresh();}),
    {label:'Pick the lock',disabled:!!G.flags[pickKey+':done'],on:function(){
      G.flags[pickKey+':done']=1;
      G.time+=10;
      var best=null;UI.party().forEach(function(c){if(c.dead)return;var sk=Rules.thiefSkills(c);if(sk&&(!best||sk.pick>best.s.pick))best={c:c,s:sk};});
      if(!best){UI.log('dim','None of your company knows locks.');UI.hud();return;}
      if(Rules.play.d100()<=best.s.pick){UI.log('good',UI.esc(best.c.name)+' picks the lock.');setCell(G.map,x,y,'D');enterRefresh();}
      else{UI.log('bad',UI.esc(best.c.name)+' fails the picks — this lock keeps its secret (no retry at this level).');}
      UI.hud();
    }},
    {label:'Force it',on:function(){
      G.time+=10;
      var strongest=UI.party().filter(function(c){return !c.dead;}).sort(function(a,b){return Rules.abilityScore(b,'str')-Rules.abilityScore(a,'str');})[0];
      if(!strongest){UI.hud();return;}
      var sa=Rules.strOf(strongest);
      if(Rules.play.d20()<=Math.min(20,sa.openDoors+ (Rules.abilityScore(strongest,'str')>=18?4:2))){
        UI.log('good',UI.esc(strongest.name)+' bursts the door open.');setCell(G.map,x,y,'D');enterRefresh();
      }else{
        UI.log('bad','The door shudders but holds.');
        if(X.def.wander&&Rules.play.chance(.25)){UI.log('bad','The banging draws wanderers!');arrivalSeq();}
      }
      UI.hud();
    }},
    {label:'Leave'}]});
}
function enterRefresh(){
  X.prep=View3D.prepare(effMap(G.map));
  revealSight(G.map,G.x,G.y,G.dir);
  renderView(1);paintMinimap();
  arrivalSeq();
}

/* ============ Search & camp ============ */
function doSearch(){
  G.time+=10;
  UI.log('dim','You search the vicinity (ten minutes).');
  var found=false;
  [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(d){
    var x=G.x+d[0],y=G.y+d[1];
    if(cellAt(G.map,x,y)==='S'){
      var ok=UI.party().some(function(c){
        if(c.dead)return false;
        var odds=(c.race==='E'||c.race==='HE')?2:1;
        return Rules.play.d6()<=odds;
      });
      if(ok){
        setCell(G.map,x,y,'D');found=true;
        UI.log('good','A secret door is found at '+x+','+y+'!');
        Journal.note('Found a secret door in '+(X.def.name||'')+'.','secret');
      }
    }
    var tk=x+','+y;
    if(X.def.traps&&X.def.traps[tk]&&G.flags['trapseen:'+G.map+':'+tk]===undefined){
      var spot=UI.party().some(function(c){if(c.dead)return false;return Rules.play.d6()<=(c.race==='D'?2:1);});
      if(spot){G.flags['trapseen:'+G.map+':'+tk]=1;UI.log('good','A trap is sighted at '+tk+' — marked on the survey map.');found=true;}
    }
  });
  if(!found)UI.log('dim','Nothing answers the search.');
  enterRefreshKeepTime();UI.hud();
}
function enterRefreshKeepTime(){
  X.prep=View3D.prepare(effMap(G.map));
  revealSight(G.map,G.x,G.y,G.dir);
  renderView(1);paintMinimap();
}
function doCamp(){
  if(X.def.safe){UI.toast('The streets are watched here — rest at the inn.');return;}
  UI.modal({title:'Make camp',body:'<p>Eight hours of watchful rest. The wounded mend a little; spells return to hand.</p>'+
    (X.def.wander?'<p class="bad">This place prowls; the camp may be interrupted.</p>':''),
    actions:[{label:'Camp',primary:1,on:function(){
      if(X.def.wander&&Rules.play.chance(.35)){
        G.time+=60;
        UI.log('bad','Sounds circle the fire and draw too close — the camp breaks before dawn. (No rest gained; the interruption fight arrives with combat.)');
        UI.hud();return;
      }
      G.time+=480;G.march=0;
      UI.party().forEach(function(c){
        if(c.dead)return;
        if(c.hp>0)c.hp=Math.min(c.maxhp,c.hp+1);
        if(c.prep&&c.mem)Object.keys(c.prep).forEach(function(s){c.mem[s]=c.prep[s];});
        c.layUsed=false;c.fx={};
      });
      UI.log('good','You rest until dawn. Spells return to hand; the march begins afresh.');
      autosave();UI.hud();UI.renderParty();
    }},{label:'Stay here'}]});
}

/* ============ Movement ============ */
function facing(){return DIRV[G.dir];}
function bump(dx,dy){
  var nx=G.x+dx,ny=G.y+dy;
  var c=cellAt(G.map,nx,ny);
  if(c==='G'){gateModal();return;}
  if(/[1-9]/.test(c)&&X.def.locs&&X.def.locs[c]){serviceModal(X.def.locs[c]);return;}
  if(c==='L'){lockModal(nx,ny);return;}
  if(opaque(G.map,nx,ny)){UI.log('dim','The way is firm.');return;}
  stepTo(nx,ny);
}
function stepTo(nx,ny){
  if(X.busy){return;}
  var from={x:G.x,y:G.y};
  X.busy=true;
  animMove(from,{x:nx,y:ny},170,function(){
    G.time+=1;G.march+=1;
    G.x=nx;G.y=ny;
    revealSight(G.map,nx,ny,G.dir);
    X.busy=false;
    paintMinimap();UI.hud();
    arrivalSeq();
    if(!UI.top())Watch.step();   // bands advance only when the way is clear of modals
    drainPending();
  });
}
function tryTurn(nd){
  if(X.busy)return;
  var from=G.dir,to=(nd+4)%4;
  // animate through fractional angle
  X.busy=true;
  var a0=facingAngle(from),a1=a0+(shortDelta(from,nd)*Math.PI/2);
  animAngle(a0,a1,140,function(){
    G.dir=(nd+4)%4;
    X.busy=false;renderView(1);UI.hud();drainPending();
  });
}
function forwardHotkey(k){
  if(k==='p')UI.toggleParty();
  else if(k==='m')openFullMap();
  else if(k==='j')Journal.show();
  else if(k==='b')Bestiary.show();
}
function facingAngle(d){return [-Math.PI/2,0,Math.PI/2,Math.PI][d];}
function shortDelta(from,to){
  var d=(to-from+4)%4;
  if(d===3)d=-1;if(d===2)d=2;   // right turn +1, left -1, about 2
  return d;
}
function strafe(side){
  var v=facing();
  bump(side*v[1],-side*v[0]);   // strafe left uses right-hand normal
}
function walkBack(){
  var v=facing();bump(-v[0],-v[1]);
}
function animMove(from,to,ms,done){
  var t0=performance.now(),finished=false;
  function fin(){
    if(finished)return;finished=true;
    X.cam.x=to.x+.5;X.cam.y=to.y+.5;renderView(1);done();
  }
  var sc=0.5;   // motion scale; degrades further if frames run long
  function frame(){
    if(finished)return;
    var t=Math.min(1,(performance.now()-t0)/ms);
    X.cam.x=from.x+(to.x-from.x)*t+.5;
    X.cam.y=from.y+(to.y-from.y)*t+.5;
    if(t<1){
      renderView(sc);
      if(X.slowFrame&&sc>0.3)sc-=0.12;    // hold the ~24 ms frame budget
      requestAnimationFrame(frame);
    }else fin();
  }
  frame();
  setTimeout(fin,ms+600);   // finish-once fallback if rAF stalls
}
function animAngle(a0,a1,ms,done){
  var t0=performance.now();
  function frame(){
    var t=Math.min(1,(performance.now()-t0)/ms);
    X.cam.ang=a0+(a1-a0)*t;
    renderView(t<1?0.5:1);
    if(t<1)requestAnimationFrame(frame);
    else{delete X.cam.ang;done();}
  }
  frame();
}
function bufferCmd(fn){
  if(X.busy){X.pending=fn;UI.log('dim','…');return;}
  fn();
}
function drainPending(){
  var p=X&&X.pending;X&&(X.pending=null);
  if(p)p();
}

/* ============ Gates & services ============ */
function gateModal(){
  var ex=X.def.exit&&X.def.exit['G'];
  if(!ex){UI.log('dim','The gate stands shut.');return;}
  UI.modal({title:'The gate',body:'<p>'+(ex.label||'The gate opens outward.')+'</p>',
    actions:[{label:'Go out',primary:1,on:function(){
      enterMap(ex.to,ex.x,ex.y,ex.dir,{});
      autosave();
    }},{label:'Stay'}]});
}
function serviceModal(loc){
  Campaign.openService(loc);
}
function svcBlurb(loc){
  switch(loc.svc){
    case 'inn':return 'Warmth, beds and rumours behind the bar.';
    case 'tavern':return 'A long room going quietly loud.';
    case 'armory':return 'Steel hung in ranks, oiled and honest.';
    case 'general':case 'apothecary':return 'Shelves of cord, cure and small mercies.';
    case 'temple':return 'The Dawn\u2019s quiet, and water that helps.';
    case 'hall':return 'The board, the ledger, and the work of the place.';
    case 'training':return 'A yard of sawdust, straw and consequence.';
    default:return 'A door of business.';
  }
}

/* ============ Rendering ============ */
function renderView(scale){
  if(!X||X.mode!=='local')return 0;
  X.cam.dir=G.dir;
  var ms=View3D.render(X.prep,X.cam,scale,{entities:billEntities()});
  X.slowFrame=ms>26;
  return ms;
}
/* Billboards: sighted bands, stairs and discovered-but-unlooted treasure. */
function billEntities(){
  var ents=[];
  if(!X)return ents;
  try{
    Watch.visible().forEach(function(b){
      ents.push({x:b.x+.5,y:b.y+.5,spr:'mon:'+b.mon,tag:'×'+b.n});
    });
  }catch(e){}
  var p=X.prep;
  for(var y=0;y<p.h;y++)for(var x=0;x<p.w;x++){
    var c=p.char[y*p.w+x];
    var dd=(x-G.x)*(x-G.x)+(y-G.y)*(y-G.y);
    if(dd>49)continue;
    if(c==='<'){ents.push({x:x+.5,y:y+.5,spr:'stairU'});continue;}
    if(c==='>'){ents.push({x:x+.5,y:y+.5,spr:'stairD'});continue;}
    if(/[a-z]/.test(c)&&X.def.ev&&X.def.ev[c]&&X.def.ev[c].chest&&G.flags[G.map+':'+c]!=='done'){
      if(seenRow(G.map,y)[x]==='1')ents.push({x:x+.5,y:y+.5,spr:'chest'});
    }
  }
  return ents;
}
/* wipe: total field defeat — wake at daybreak, light of purse, bands gone */
function wipe(){
  var day=Math.floor(G.time/1440);
  G.time=(day+1)*1440+7*60;
  G.march=0;
  G.gold=Math.floor(G.gold*0.9);
  G.bands=(G.bands||[]).filter(function(b){return b.map!==G.map;});
  var anyAlive=false;
  UI.party().concat([]).forEach(function(){});
  G.party.forEach(function(id){
    var c=UI.rosterById(id);if(!c)return;
    if(!c.dead&&c.hp<=0){c.hp=1;c.fx={};anyAlive=true;}
    else if(c.hp>0)anyAlive=true;
  });
  UI.log('bad','Darkness, then a long dawn: the company wakes where the foes left them, robbed of a tenth of its gold.');
  Journal.note('Overrun and left for dead; woke at daybreak.','defeat');
  autosave();
  if(!anyAlive){gameOver();return;}
  UI.modal({title:'Overrun',body:'<p>You wake at daybreak, bruised and lighter of purse. The survivors pull each other upright.</p>',
    actions:[{label:'Limp on',primary:1}]});
  UI.hud();UI.renderParty();
}
function gameOver(){
  UI.modal({title:'The company is lost',closable:false,body:'<p>No breath remains in the roster. bards will sing differently now.</p>',
    actions:[{label:'Return to the title',primary:1,on:function(){quitToTitle();}}]});
}
function paintMinimap(){
  var mc=document.getElementById('minimap');if(!mc||!X)return;
  // marks: traps found (cross), loot (pink)
  View3D.minimap(X.prep,G.seen[G.map],G.x,G.y,G.dir,{canvas:mc,bands:bandPips()});
  var ctx=mc.getContext('2d');
  var s=Math.min(mc.width/X.prep.w,mc.height/X.prep.h);
  var ox=(mc.width-X.prep.w*s)/2,oy=(mc.height-X.prep.h*s)/2;
  var mm=MAPS[G.map];
  Object.keys(G.seen||{});
  if(X.def.traps)Object.keys(X.def.traps).forEach(function(k){
    if(G.flags['trapseen:'+G.map+':'+k]&&!G.flags['trapoff:'+G.map+':'+k]){
      var p=k.split(','),x=+p[0],y=+p[1];
      if(seenRow(G.map,y)[x]==='1'){
        ctx.strokeStyle='#c8502c';ctx.beginPath();
        ctx.moveTo(ox+x*s+2,oy+y*s+2);ctx.lineTo(ox+(x+1)*s-2,oy+(y+1)*s-2);
        ctx.moveTo(ox+(x+1)*s-2,oy+y*s+2);ctx.lineTo(ox+x*s+2,oy+(y+1)*s-2);ctx.stroke();
      }
    }
  });
  var gp=G.ground[G.map];
  if(gp)Object.keys(gp).forEach(function(k){
    var p=k.split(','),x=+p[0],y=+p[1];
    if(seenRow(G.map,y)[x]==='1'){ctx.fillStyle='#e8a0c0';ctx.fillRect(ox+x*s+s*.3,oy+y*s+s*.3,s*.4,s*.4);}
  });
}
function openFullMap(){
  if(!X)return;
  var mapId=G.map;
  GameMap.show({
    def:X.def||MAPS[mapId],
    prep:X.prep&&X.mapId===mapId?X.prep:View3D.prepare(MAPS[mapId]),
    seen:G.seen[mapId],
    x:G.x,y:G.y,dir:G.dir,
    bands:bandPips(),
    mapId:mapId,
    wild:!!(MAPS[mapId]&&MAPS[mapId].overland)
  });
}
function aheadText(){
  if(!X||!G)return '';
  var v=facing(),c=cellAt(G.map,G.x+v[0],G.y+v[1]);
  var what;
  if(c==='G')what='the gate out';
  else if(/[1-9]/.test(c)&&X.def.locs&&X.def.locs[c])what=X.def.locs[c].name;
  else if(c==='<'||c==='>')what='a stair';
  else if(c==='D')what='a door';
  else if(c==='L')what='a locked door';
  else if(/[a-z]/.test(c)&&X.def.ev&&X.def.ev[c])what=(X.def.ev[c].chest?'a treasure':X.def.ev[c].enc?'a set battle':'a place');
  else if(/^[A-Z]$/.test(c)&&X.def.sites&&X.def.sites[c])what=X.def.sites[c].name;
  else if(opaque(G.map,G.x+v[0],G.y+v[1]))what='a wall';
  else what='open ground';
  return 'Facing '+DIRS[G.dir]+' — '+what+(G.march>=600?' · weary':'');
}

/* ============ Lay on hands (paladin, once-rest pool) ============ */
function layPool(c){return (c.lvl|0)+Math.floor((c.lvl|0)/2);}
function layLeft(c){return layPool(c)-(c.layUsed|0);}
function layMenu(){
  var pals=UI.party().filter(function(c){return c.cls==='P'&&!c.dead&&layLeft(c)>0;});
  if(!pals.length){UI.toast('None who can lay on hands have strength left this rest.');return;}
  function pickTarget(p){
    var hurt=UI.party().filter(function(c){return !c.dead&&c.hp<c.maxhp;});
    if(!hurt.length){UI.toast('No wounds left to close.');return;}
    var body=UI.el('div');
    body.appendChild(UI.el('p','muted',p.name+' has '+layLeft(p)+' point'+(layLeft(p)===1?'':'s')+' of healing left in hand. One touch, one soul.'));
    UI.modal({title:'Lay on hands',body:body,actions:hurt.map(function(t){
      var amt=Math.min(layLeft(p),2+Math.floor(p.lvl/2),t.maxhp-t.hp);
      return {label:t.name+' ('+t.hp+'/'+t.maxhp+' hp) — heal '+amt,primary:t===hurt[0]?1:0,on:function(){
        t.hp+=amt;p.layUsed=(p.layUsed|0)+amt;
        UI.log('good',UI.esc(p.name)+' lays hands on '+UI.esc(t.name)+' — '+amt+' wound'+(amt===1?'':'s')+' closed.');
        if(window.Game)Game.autosave();
        UI.hud();UI.renderParty();
      }};
    }).concat([{label:'Not now'}])});
  }
  if(pals.length===1){pickTarget(pals[0]);return;}
  var body=UI.el('div');
  body.appendChild(UI.el('p','muted','Whose laid hands?'));
  UI.modal({title:'Hands of the Faith',body:body,actions:pals.map(function(p,i){
    return {label:p.name+' — '+layLeft(p)+' points left',primary:i===0?1:0,on:function(){pickTarget(p);}};
  }).concat([{label:'Never mind'}])});
}

/* ============ Command bar ============ */
function buildCmdBar(){
  var bar=document.getElementById('cmdbar');if(!bar||!X)return;
  bar.innerHTML='';
  function btn(label,title,fn,icon){
    var b=UI.el('button');b.title=title;b.setAttribute('aria-label',title);
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="'+icon+'"/></svg>';
    b.onclick=fn;bar.appendChild(b);return b;
  }
  btn('Search','Search (F)',doSearch,'M4 20 L10 14 M10 14 a5 5 0 1 0 -1 -1 M10 14 L6 18');
  btn('Camp','Camp (R)',doCamp,'M6 18 L12 6 L18 18 M4 18 H20');
  btn('Lay','Lay on hands (paladin, per rest)',layMenu,'M9 20 c-3 -2 -5 -5 -5 -8 l0 -5 l2 0 l0 4 M12 19 l0 -12 l2 0 l0 11 M15 19 l0 -13 l2 0 l0 12 M18 18 l0 -8 l2 0 l0 9 c0 4 -3 7 -6 8 z');
  btn('Party','Company (P)',UI.toggleParty,'M8 6 a3 3 0 1 1 8 0 M4 20 c0 -5 16 -5 16 0');
  btn('Map','Survey map (M)',openFullMap,'M4 4 h16 v16 h-16 z M4 10 h16 M10 4 v16');
  btn('Journal','Journal (J)',function(){Journal.show();},'M6 3 h10 v18 l-5 -3 l-5 3 z');
  btn('Bestiary','Bestiary (B)',function(){Bestiary.show();},'M4 18 c2 -8 14 -8 16 0 M8 10 a2 2 0 1 1 0.1 0 M16 10 a2 2 0 1 1 0.1 0');
  btn('Save','Save',UI.saveDialog,'M4 4 h12 l4 4 v12 h-16 z M8 4 v6 h8');
  btn('Menu','Menu (Esc)',UI.menu,'M4 7 h16 M4 12 h16 M4 17 h16');
  btn('Touch','Touch controls',Navpad.cycle,'M12 4 a8 8 0 1 1 -0.1 0 M12 9 v6 M9 12 h6');
  document.getElementById('cmdhint').textContent='W/↑ step · S/↓ back · A/D turn · Q/E strafe · F search · R camp · Esc menu';
}

/* ============ Equip / drop ============ */
/* ---- pack consumption: potions, scrolls, charged devices ---- */
function consumePack(c,id){
  var i=c.inv.indexOf(id);
  if(i<0&&String(id).indexOf('#')<0){
    for(var j=0;j<c.inv.length;j++){if(c.inv[j]===id){i=j;break;}}
  }
  if(i<0)return false;
  var it=item(c.inv[i]);
  if(it&&it.t==='d'&&it.chargesLeft!=null&&it.chargesLeft>1){
    c.inv[i]=String(it.id).split('#')[0]+'#'+(it.chargesLeft-1);
    UI.log('dim',UI.esc(it.n)+' dwindles — '+(it.chargesLeft-1)+' charges.');
  }else c.inv.splice(i,1);
  return true;
}
var READABLE_HERE={clw:1,csw:1,ccw:1,heal:1,neutpoison:1,slowpoison:1,freeaction:1,raisedead:1,resurrect:1};
function usePackItem(c,id){
  var it=item(id);if(!it)return false;
  if(it.t==='p'){
    if(!it.cure){UI.toast('That draught serves another purpose.');return false;}
    if(c.hp>=c.maxhp){UI.toast(c.name+' needs no draught.');return false;}
    var amt=Rules.dice(it.cure);c.hp=Math.min(c.maxhp,c.hp+amt);
    consumePack(c,id);
    UI.log('good',UI.esc(c.name)+' drinks deep (+'+amt+' hp).');
    autosave();UI.hud();UI.renderParty();return true;
  }
  if(it.t==='x')return readScrollOut(c,id,it);
  if(it.t==='d'){UI.toast('Its purpose waits for battle.');return false;}
  UI.toast('That is equipment, not a convenience.');return false;
}
function learnChance(c){return Rules.clamp(35+Rules.abilityScore(c,'int')*3,5,95);}
function learnFromScroll(c,id,it){
  var sp=it.spell,def=SPELLS[sp];
  var acts=[{label:'Copy it into the spellbook ('+learnChance(c)+'%)',primary:1,on:function(){
    G.time+=30;
    if(Rules.play.chance(learnChance(c)/100)){
      (c.book=c.book||[]).push(sp);
      consumePack(c,id);
      UI.log('good',UI.esc(c.name)+' copies '+UI.esc(def.n)+' into the spellbook; the scroll crumbles.');
      Journal.note(c.name+' learned the spell '+def.n+'.','learn');
      autosave();UI.hud();
      if(UI.top()===null)UI.renderParty();
    }else{
      UI.log('bad','The notation swims and will not hold; '+UI.esc(c.name)+' keeps the unburned scroll.');
    }
  }}];
  if(READABLE_HERE[sp])acts.push({label:'Just read it (cast, scroll lost)',on:function(){readScrollOut(c,id,it);}});
  acts.push({label:'Not here, not now'});
  UI.modal({title:'A scroll of '+def.n+' — unknown spell',
    body:'<p class="muted">'+UI.esc(c.name)+' has this spell nowhere in the book. Reading it plain will spend the magic; copying it is a gamble of ink, hours, and the reader’s art ('+learnChance(c)+'%).</p>',
    actions:acts});
}
function scrollSphereOK(c,sp){
  var def=SPELLS[sp];if(!def)return false;
  if(def.c==='M')return c.cls==='M';
  return c.cls==='C'||c.cls==='P'||(c.cls==='R'&&def.l<=4);
}
function readScrollOut(c,id,it){
  var sp=it.spell;
  if(!scrollSphereOK(c,sp)){UI.toast('The script squirms, unreadable to '+Rules.CLASSES[c.cls].name+'.');return false;}
  // §spell economy: a mage before an unknown wizard scroll may try to copy it.
  if(SPELLS[sp]&&SPELLS[sp].c==='M'&&c.cls==='M'&&(c.book||[]).indexOf(sp)<0){
    learnFromScroll(c,id,it);return true;
  }
  if(!READABLE_HERE[sp]){UI.toast('The parchment holds no purchase on the quiet.');return false;}
  var dead=sp==='raisedead'||sp==='resurrect';
  if(dead){
    var cand=UI.party().filter(function(p){return p.dead&&!p.lost;});
    if(!cand.length){UI.toast('No one lies beyond these words.');return false;}
    var t=cand[0];
    consumePack(c,id);
    var roll=Rules.play.d20(),need=Rules.abilityScore(t,'con');
    if(sp==='resurrect'||roll<=need){t.dead=false;t.hp=1;if(sp==='raisedead')t.scores.con=Math.max(3,t.scores.con-1);
      UI.log('good',UI.esc(t.name)+' returns from the read word.');Journal.note(t.name+' was raised by a scroll.','raise');}
    else{t.lost=true;UI.log('bad','The rite falters; '+UI.esc(t.name)+'’s spirit drifts beyond recall.');}
    autosave();UI.renderParty();return true;
  }
  var hurt=UI.party().filter(function(p){return !p.dead&&p.hp<p.maxhp&&p.hp>0;}).sort(function(a,b){return a.hp/a.maxhp-b.hp/b.maxhp;});
  if(!hurt.length){UI.toast('No wound waits on this reading.');return false;}
  var t2=hurt[0],dice=sp==='clw'?'1d8':sp==='csw'?'2d8+1':sp==='ccw'?'3d8+3':'999';
  consumePack(c,id);
  if(sp==='neutpoison'||sp==='slowpoison'){t2.poison=null;UI.log('good',UI.esc(t2.name)+' is cleansed.');}
  else if(sp==='freeaction'){UI.log('good','A reading eases '+UI.esc(t2.name)+'.');}
  else{var d=Rules.dice(dice);t2.hp=Math.min(t2.maxhp,t2.hp+d);UI.log('good',UI.esc(t2.name)+' is healed by the read word (+'+d+').');}
  autosave();UI.hud();UI.renderParty();return true;
}
function equip(c,id){
  var it=item(id);if(!it)return;
  if(c.inv.indexOf(id)<0)return;
  if(it.t==='q'){UI.toast('That must stay carried, not worn.');return;}
  var slot=it.t==='w'?'melee':it.t==='r'?'missile':it.t==='a'?'armor':it.t==='s'?'shield':'charm';
  if(it.t==='w'&&c.cls==='M'&&['dagger','staff','dart','sling'].indexOf(id.indexOf('#')>0?id.split('#')[0]:id)<0){UI.toast('Mages take that warily.');return;}
  var prev=c.eq[slot];
  c.eq[slot]=id;
  c.inv.splice(c.inv.indexOf(id),1);
  if(prev)c.inv.push(prev);
  UI.log('dim',UI.esc(c.name+' wears '+itemName(id)+'.'));
  UI.hud();
}
function drop(c,id){
  var it=item(id);
  if(it&&it.t==='q'){UI.toast('A quest item is not dropped.');return;}
  var i=c.inv.indexOf(id);if(i<0)return;
  c.inv.splice(i,1);
  var k=G.x+','+G.y;
  if(!G.ground[G.map])G.ground[G.map]={};
  (G.ground[G.map][k]=G.ground[G.map][k]||[]).push(id);
  UI.log('dim',UI.esc(c.name+' drops '+itemName(id)+' here.'));
  paintMinimap();
}

/* ============ Input ============ */
document.addEventListener('keydown',function(e){
  if(e.__uiTaken)return;                    // a dialog already spent this key
  if(document.getElementById('game').classList.contains('hidden'))return;
  if(UI.top())return;                       // dialogs own the keyboard
  if(Combat.isActive()){Combat.onKey(e);return;}
  if(X&&X.mode==='wild'){Over.onKey(e);return;}
  if(!X)return;
  var k=e.key.toLowerCase();
  var v=facing();
  function fwd(){bump(v[0],v[1]);}
  function back(){walkBack();}
  switch(k){
    case 'w':case 'arrowup':bufferCmd(fwd);e.preventDefault();break;
    case 's':case 'arrowdown':bufferCmd(back);e.preventDefault();break;
    case 'a':case 'arrowleft':tryTurn((G.dir+3)%4);e.preventDefault();break;
    case 'd':case 'arrowright':tryTurn((G.dir+1)%4);e.preventDefault();break;
    case 'q':bufferCmd(function(){strafe(-1);});break;
    case 'e':bufferCmd(function(){strafe(1);});break;
    case 'f':doSearch();break;
    case 'r':doCamp();break;
    case 'p':case 'm':case 'j':case 'b':forwardHotkey(k,e);break;
    case 'escape':UI.menu();break;
    default:
      if(/^[1-6]$/.test(k)){var c=UI.party()[+k-1];if(c)UI.sheet(c);}
  }
},false);
/* click-to-step: click ahead half = step, sides = turn */
function stageClick(e){
  if(UI.top()||!X||X.mode!=='local')return;
  var cv=document.getElementById('view3d');
  var r=cv.getBoundingClientRect();
  var px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
  var v=facing();
  if(py<.62){bufferCmd(function(){bump(v[0],v[1]);});}
  else if(px<.35){tryTurn((G.dir+3)%4);}
  else if(px>.65){tryTurn((G.dir+1)%4);}
}

/* ============ Title embers ============ */
var emberRAF=null;
function embers(){
  var c=document.getElementById('embers');if(!c)return;
  if(emberRAF)cancelAnimationFrame(emberRAF);
  function frame(){
    if(document.getElementById('title').classList.contains('hidden')){emberRAF=null;return;}
    var w=c.width=c.clientWidth,h=c.height=c.clientHeight,g=c.getContext('2d');
    if(!c._p){c._p=[];for(var i=0;i<70;i++)c._p.push({x:Math.random(),s:.4+Math.random(),ph:Math.random()*6.28,y:Math.random()});}
    g.clearRect(0,0,w,h);
    var t=Date.now()/1000;
    c._p.forEach(function(p){
      var y=((p.y-t*.03*p.s)%1+1)%1,x=p.x+Math.sin(t*.7+p.ph)*.02;
      g.fillStyle='rgba(230,'+(110+Math.floor(60*p.s))+',40,'+((1-y)*.8).toFixed(2)+')';
      g.beginPath();g.arc(x*w,y*h,p.s*1.7,0,6.29);g.fill();
    });
    emberRAF=requestAnimationFrame(frame);
  }
  frame();
}

/* ============ Bootstrap ============ */
document.addEventListener('DOMContentLoaded',function(){
  View3D.init(document.getElementById('view3d'));
  Over.init(document.getElementById('overCanvas'));
  UI.initPartyPref();
  Combat.init(document.getElementById('combatCanvas'));
  document.getElementById('view3d').addEventListener('click',stageClick);
  document.getElementById('overCanvas').addEventListener('click',function(e){if(X&&X.mode==='wild')Over.stepTowardsClient(e.clientX,e.clientY);});
  document.getElementById('minimap').addEventListener('click',function(){if(X)openFullMap();});
  Navpad.auto();   /* touch pads appear on coarse pointers, per saved mode */
  title();
});

function setG(v){G=v;window.G=v;}
return{
  get G(){return G;},set G(v){setG(v);},setG:setG,
  get X(){return X;},
  forwardHotkey:forwardHotkey,
  show:show,title:title,fmtTime:fmtTime,
  readSlot:readSlot,save:save,autosave:autosave,loadSlot:loadSlot,loadLatest:loadLatest,latestSave:latestSave,
  SAVE_PREFIX:SAVE_PREFIX,DIRS:DIRS,
  enterMap:enterMap,initSeen:initSeen,closeStairsLoop:closeStairsLoop,
  log:function(k,m){UI.log(k,m);},
  hud:function(){UI.hud();if(UI.top()===null&&document.getElementById('party').classList.contains('open'))UI.renderParty();},
  openFullMap:openFullMap,aheadText:aheadText,cellAt:cellAt,
  equip:equip,drop:drop,quitToTitle:quitToTitle,
  doSearch:doSearch,doCamp:doCamp,reveal:reveal,opaque:opaque,
  giveToCarrier:giveToCarrier,wipe:wipe,mapId:function(){return G&&G.map;},
  paintMinimap:paintMinimap,paintBandPips:function(){paintMinimap();},awardXP:awardXP,
  consumePack:consumePack,usePackItem:usePackItem,scrollSphereOK:scrollSphereOK,knockCasters:knockCasters
};
})();
