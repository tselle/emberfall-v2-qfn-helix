/* Emberfall — js/combat.js
 * The tactical board: 14×10 isometric grid, group initiative, THAC0 melee,
 * memorized spells, turning, morale, breath/weapons, XP and loot.
 * Combat is an overlay on the exploration screen; the roster’s hp, spell
 * slots, and gold are mutated directly and persist. */
'use strict';
var Combat=(function(){
var CB=null,cv=null,ctx=null,blink=0;
var W=14,H=10,TW=84,TH=42;
var BLUNT={club:1,mace:1,flail:1,warhammer:1,hammer:1,morningstar:1,quarterstaff:1,staff:1};

function isActive(){return !!CB;}
function el(id){return document.getElementById(id);}

/* ================= Start / finish ================= */
function start(spec){
  if(CB&&!CB.done){UI.toast('A battle is already underway.');return;}
  CB=null;   // a finished board never blocks the next battle
  cv=el('combatCanvas');ctx=cv.getContext('2d');
  var indoor=!(MAPS[G.map]&&MAPS[G.map].overland);
  var obstacles=indoor?[{x:6,y:2},{x:7,y:2},{x:6,y:7},{x:7,y:7}]:seedRocks();
  var mons=[];
  (spec.mons||[]).forEach(function(pr){
    var id=pr[0];
    var n=typeof pr[1]==='string'?Rules.dice(pr[1]):pr[1];
    var def=MONSTERS[id]||{n:id,hd:1,hp:'1d8',ac:9,mv:9,ml:7,xp:15,atk:['1d6']};
    n=Math.min(n,14-mons.length);
    for(var i=0;i<n;i++){
      var hp=Rules.dice(def.hp)||1;
      mons.push({side:'m',mid:id,def:def,name:def.n,hp:hp,maphp:hp,ac:def.ac,mv:def.mv||9,ml:def.ml,
        x:11+Rules.play.d(1,3)-1,y:1+Rules.play.d(1,8),acted:false,seen:false});
    }
    Bestiary.sight(id);Bestiary.fought(id);
  });
  // spread monsters into free cells
  mons.forEach(function(m,i){while(occupiedBy(mons,m.x,m.y,m))m.y=(m.y+1)%H;});
  var pcs=[];
  UI.party().forEach(function(c,i){
    if(c.dead)return;
    pcs.push({side:'p',c:c,x:1,y:2+i*1.5|0,acted:false,defending:false,backstab:1,
      fx:{},turns:0});
  });
  pcs.forEach(function(p){while(occupiedBy(pcs,p.x,p.y,p))p.y++;});
  CB={spec:spec,mons:mons,pcs:pcs,obstacles:obstacles,round:0,phase:'idle',
    order:[],turn:null,tool:null,moveSet:{},log:[],xp:0,kills:0,escaped:0,
    surprise:spec.partySurprise||spec.monsterSurprise||0,done:false,token:0};
  cv.classList.remove('hidden');
  FX.length=0;ensureAnim();
  el('view3d').classList.add('hidden');el('overCanvas').classList.add('hidden');
  el('battleStatus').classList.remove('hidden');
  logEvent(spec.text||'Battle! '+mons.length+' foe'+(mons.length>1?'s':'')+' against '+pcs.length+'.');
  if(spec.partySurprise)logEvent('The company is surprised — the foes act first!');
  CB.order=initOrder();
  CB.idx=-1;
  nextTurn();
}
function seedRocks(){
  var r=new Rules.RNG((((G.x*73856093)^(G.y*19349663)^(hash(G.map)))>>>0)||7);
  var out=[],n=r.int(1,3);
  for(var i=0;i<n;i++){out.push({x:r.int(5,8),y:r.int(2,7)});}
  return out;
}
function hash(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;}
function occupiedBy(list,x,y,self){
  return list.some(function(u){return u!==self&&!isDown(u)&&u.x===x&&u.y===y;});
}
function isDown(u){return u.side==='p'&&(u.c.dead||u.c.hp<=0);}
function standing(u){return !isDown(u)&&!u.gone;}
function effAC(u){
  var c=u.c,ac=Rules.theAC(c),fx=u.fx||{};
  if(fx.armor)ac-=1;
  if(fx.shield)ac-=2;
  if(fx.stoneskin>0)ac-=1;
  if(CB&&CB.pcs.some(function(p){return p.fx.bless;}))ac-=1;
  if(fx.defending||u.defending)ac-=4;
  return ac;
}
function pcAC(c){var u=pcOf(c);return u?effAC(u):Rules.theAC(c);}
function finish(result){
  if(CB.done)return;CB.done=true;
  if(blink){clearInterval(blink);blink=0;}
  var r=resolve(result);
  cv.classList.add('hidden');el('battleStatus').classList.add('hidden');
  var wild=MAPS[G.map]&&MAPS[G.map].overland;
  el(wild?'overCanvas':'view3d').classList.remove('hidden');
  var spec=CB.spec;CB=null;
  G.time+=10+2*Math.max(1,r.rounds||1);
  if(spec.onEnd)spec.onEnd(r);
  Game.autosave();UI.hud();UI.renderParty();
  Game.enterMap(G.map,G.x,G.y,G.dir,{restoring:true});
  if(r.result==='win')UI.log('good','The field is yours.');
  if(r.result==='fled')UI.log('dim','You break away, blood and mud.');
}
function resolve(result){
  var r={result:result,xp:0,rounds:CB.round,fell:[]};
  if(result==='win'||result==='fled'){
    // the press of battle ends; the fallen breathe on
    CB.pcs.forEach(function(p){
      if(!p.c.dead&&p.c.hp<=0){p.c.hp=1;logEvent(p.c.name+' is dragged from the field, barely breathing.');}
    });
    var xp=0;
    CB.mons.forEach(function(m){
      if(m.hp<=0)xp+=m.def.xp||0;
      else if(m.gone)xp+=Math.ceil((m.def.xp||0)/2);
    });
    if(result==='fled')xp=0;
    r.xp=xp;
    if(xp){
      UI.party().forEach(function(c){
        if(c.dead)return;
        var amt=Rules.xpAward(c,xp);
        c.xp+=amt;
      });
      logEvent('The company shares '+xp+' experience.');
      if(CB.pcs.some(function(p){return !p.c.dead&&p.c.xp>=Rules.nextXP(p.c);}))
        UI.log('spell','Some stand taller — training hall promotion waits in town.');
    }
    if(result==='win'&&CB.spec.loot){
      var L=CB.spec.loot;
      if(L.gold){var g=typeof L.gold==='string'?Rules.dice(L.gold):L.gold;if(g){G.gold+=g;logEvent('Spoils: '+g+' gp.');}}
      (L.items||[]).forEach(function(id){Game.giveToCarrier(id);logEvent('Recovered: '+itemName(id));});
    }
    if(result==='win'&&CB.spec.onWin)CB.spec.onWin(r);
  }
  if(result==='lose')Game.wipe();
  return r;
}

/* ================= Initiative & turns ================= */
function initOrder(){
  var us=[];
  CB.pcs.forEach(function(p){if(!isDown(p))us.push({u:p,i:Rules.play.d6()+Rules.dexOf(p.c).ac});});   // DEX reaction
  CB.mons.forEach(function(m){if(standing(m))us.push({u:m,i:Rules.play.d6()});});
  us.sort(function(a,b){return b.i-a.i||((b.u.side==='p')?1:-1);});
  return us.map(function(x){return x.u;});
}
function nextTurn(){
  if(!CB||CB.done)return;
  // advance until a live actor
  for(;;){
    CB.idx++;
    if(CB.idx>=CB.order.length){endRound();return;}
    var u=CB.order[CB.idx];
    if(!u)continue;
    if(!standing(u)){u.acted=true;continue;}
    if(u.acted){continue;}
    if(u.side==='m'&&(u.hp<=0||u.gone)){continue;}
    break;
  }
  var un=CB.order[CB.idx];
  CB.turn=un;un.acted=true;
  CB.moveSet=moveSet(un);
  CB.tool=null;
  var tk=++CB.token;
  draw();
  if(un.side==='m')setTimeout(function(){if(CB&&!CB.done&&CB.turn===un&&CB.token===tk)monAct(un);},300);
  else{
    status('Round '+CB.round+' · '+un.c.name+"'s act");
    buildCommands(un);
  }
}
function endRound(){
  if(CB.done)return;
  // death spiral & buffs & regen & morale
  CB.pcs.forEach(function(p){
    if(p.c.hp<0&&!p.c.dead){p.c.hp--;if(p.c.hp<=-10){p.c.dead=true;logEvent(p.c.name+' dies of their wounds.');}}
    p.defending=false;
    tickFx(p);
  });
  var leaderDown=CB.mons.some(function(m){return m.hp<=0&&m.def.leader;});
  CB.mons.forEach(function(m){
    if(m.hp<=0||m.gone)return;
    if(m.burning){m.hp-=Rules.dice('1d6');if(m.hp<=0){killMon(m);return;}}
    if(m.def.regen&&!m.burning)m.hp=Math.min(m.maphp,m.hp+m.def.regen);
    if(m.held>0)m.held--;
    if(m.blindT>0)m.blindT--;
    // morale: below half or leader dead
    if(m.ml!=='fearless'&&(m.hp*2<m.maphp||leaderDown)){
      if(Rules.play.d(2,6)>m.ml)fleeMon(m);
    }
  });
  if(winCheck())return;
  CB.round++;
  CB.pcs.forEach(function(p){p.acted=false;});
  CB.mons.forEach(function(m){m.acted=false;});
  CB.order=initOrder();CB.idx=-1;
  draw();
  var tk=++CB.token;
  setTimeout(function(){if(CB&&!CB.done&&CB.token===tk)nextTurn();},120);
}
function winCheck(){
  if(!CB||CB.done)return true;
  var alive=CB.mons.some(function(m){return standing(m)&&!m.gone;});
  var able=CB.pcs.some(function(p){return !isDown(p);});
  if(!alive){finish('win');return true;}
  if(!able){finish('lose');return true;}
  return false;
}
function killMon(m){
  m.hp=0;m.gone=true;m.escaped=false;CB.kills++;
  if(m.mid)Bestiary.slain(m.mid);
  logEvent(m.name+' falls.');
  winCheck();
}
function fleeMon(m){
  if(m.flee)return;
  m.flee=true;m.gone=true;m.escaped=true;CB.escaped++;
  logEvent(m.name+' breaks and flees the field!');
  UI.log('dim',m.name+' flees — pursuit is a choice for braver hearts.');
}
function tickFx(p){
  var f=p.fx;
  ['bless','haste','prayer','aid'].forEach(function(k){if(f[k]>0)f[k]--;});
  if(f.mirror>0)f.mirror--;
  if(f.invisT>0){f.invisT--;if(!f.invisT)logEvent(p.c.name+'’s invisibility thins.');}
}

/* ================= Movement ================= */
function blocked(x,y){
  if(x<0||y<0||x>=W||y>=H)return true;
  return CB.obstacles.some(function(o){return o.x===x&&o.y===y;});
}
function occupied(x,y,self){
  var all=CB.pcs.concat(CB.mons);
  return all.some(function(u){return u!==self&&standing(u)&&u.x===x&&u.y===y;});
}
function moveSet(u){
  // half-square costs: orthogonal 2, diagonal 3; budget = mv*2
  var budget=(u.side==='p'?Rules.RACES[u.c.race].mv:u.mv)*(u.fx&&u.fx.slowed?1:2);
  var set={};set[u.x+','+u.y]=0;
  var q=[u];
  while(q.length){
    q.sort(function(a,b){return set[a.x+','+a.y]-set[b.x+','+b.y];});
    var cur=q.shift(),base=set[cur.x+','+cur.y];
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      var nx=cur.x+dx,ny=cur.y+dy;
      if(blocked(nx,ny)||occupied(nx,ny,cur))continue;
      if(dx&&dy&&(blocked(cur.x+dx,cur.y)||blocked(cur.x,cur.y+dy)))continue;
      var cost=base+(dx&&dy?3:2);
      if(cost>budget)continue;
      var k=nx+','+ny;
      if(set[k]===undefined||cost<set[k]){set[k]=cost;if(!q.some(function(o){return o.x===nx&&o.y===ny;}))q.push({x:nx,y:ny});}
    }
  }
  return set;
}
function pathTo(u,tx,ty){
  var set=CB.moveSet;if(set[tx+','+ty]===undefined)return null;
  // greedy retrace through decreasing costs
  var path=[],x=u.x,y=u.y,guard=0;
  var cx=tx,cy=ty;
  while((cx!==u.x||cy!==u.y)&&guard++<64){
    path.push([cx,cy]);
    var best=null,bestc=set[cx+','+cy];
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      var nx=cx+dx,ny=cy+dy;
      if(set[nx+','+ny]!==undefined&&set[nx+','+ny]<bestc&&!blocked(nx,ny)&&!occupied(nx,ny,u)){
        if(nx===u.x&&ny===u.y){path.push([nx,ny]);cx=nx;cy=ny;best=true;break;}
        best=[nx,ny];bestc=set[nx+','+ny];
      }
    }
    if(!best)return null;
    if(best===true)break;
    cx=best[0];cy=best[1];
  }
  return path.reverse();
}
function doMove(u,tx,ty){
  var p=pathTo(u,tx,ty);
  if(!p)return false;
  u.x=tx;u.y=ty;
  fxBurst(tx,ty,'#39405e','ring');
  CB.moveSet=moveSet(u);
  draw();
  return true;
}
function dist8(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));}
function losFree(x0,y0,x1,y1){
  var dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=Math.sign(x1-x0),sy=Math.sign(y1-y0),err=dx-dy,g=0;
  var x=x0,y=y0;
  while(g++<40){
    if(x===x1&&y===y1)return true;
    if((x!==x0||y!==y0)&&blocked(x,y))return false;
    var e2=2*err;
    if(e2>-dy){err-=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
  return false;
}

/* ================= PC actions ================= */
function weapon(c){var it=item(c.eq&&c.eq.melee);return it&&it.t==='w'?it:null;}
function missileWeapon(c){
  if(c.eq&&c.eq.missile){var it=item(c.eq.missile);if(it)return it;}
  var id=(c.inv||[]).find(function(i){var t=item(i);return t&&t.t==='r';});
  return id?item(id):null;
}
function hasAmmo(c,it){
  if(!it||it.id.indexOf('bow')<0)return true;   // darts/sling: self-contained
  return (c.inv||[]).indexOf('arrow')>=0;
}
function strOf(c){return Rules.strOf(c);}
function buildCommands(u){
  var bar=el('cmdbar');bar.innerHTML='';
  var hint=el('cmdhint');
  function cmd(label,fn,dis,title){
    var b=document.createElement('button');b.innerHTML=label;
    if(dis)b.disabled=true;if(title)b.title=title;
    b.onclick=function(){if(!CB||CB.done)return;fn();};
    bar.appendChild(b);return b;
  }
  var c=u.c;
  cmd('⚔ Attack',function(){arm({kind:'attack'});hint.textContent='Click a foe to fall on it — distance will be crossed if your feet can manage it.';});
  var mw=missileWeapon(c);
  cmd('➹ Shoot',function(){arm({kind:'shoot'});hint.textContent='Click a foe in range with clear line.';},
    !(mw&&hasAmmo(c))||c.lvl<1,mw?'':'No missile weapon equipped or carried'+(mw&&!hasAmmo(c)?' (no arrows)':''));
  var casts=casterSpells(c);
  cmd('✦ Spell',function(){spellMenu(u,casts);},!casts.length,!casts.length?'Nothing memorized for battle':undefined);
  if(c.cls==='C')cmd('☩ Turn',function(){turnUndead(u);},
    !CB.mons.some(function(m){return standing(m)&&m.def.undead;}),'Turn undead');
  cmd('🛡 Defend',function(){u.defending=true;logEvent(c.name+' circles steel and guards. (AC −4 until next act)');endAct();});
  cmd('🜺 Item',function(){itemMenu(u);});
  var unaware=CB.mons.filter(function(m){return standing(m)&&!m.seen;});
  if(c.cls==='T')cmd('🗡 Backstab',function(){arm({kind:'attack',backstab:true});
    hint.textContent='Choose a foe that has not yet marked you — one strike, multiplied by your level.';},
    !unaware.length,'No unsuspected foe');
  cmd('⤺ Fly!',function(){tryFlee(u);},undefined,'Break from the field (no experience)');
  cmd('✕ Cancel',function(){CB.tool=null;hint.textContent='Pick a command.';draw();});
  hint.textContent=c.name+': choose your act.';
  function arm(tool){CB.tool=tool;draw();}
}
function casterSpells(c){
  if(!c.mem)return [];
  return Object.keys(c.mem).filter(function(sp){return c.mem[sp]>0&&SPELLC[sp];});
}
function endAct(){if(!CB||CB.done)return;CB.tool=null;nextTurn();}
function pcAttack(u,m,opts){
  opts=opts||{};
  var c=u.c,w=weapon(c);
  var n=Rules.attacksPerRound(c,CB.round,w?w.fam:null);
  if(u.fx.haste>0)n*=2;
  var first=true;
  for(var a=0;a<n;a++){
    if(!CB||CB.done||!standing(m)){break;}
    var bonus=strOf(c).hit|0;
    if(u.fx.bless>0)bonus+=1;
    if(u.fx.prayer>0)bonus+=1;
    if(opts.backstab&&first)bonus+=4;
    if(opts.called)bonus-=4;
    var res=Rules.toHitRoll(c,m.ac,bonus);
    m.seen=true;
    if(u.fx.invisT>0){u.fx.invisT=0;logEvent(c.name+' steps out of thin air!');}
    if(res.roll===20){
      var dmg=swing(u,m,opts,first);
      fxLunge(u,m.x,m.y);fxBurst(m.x,m.y,'#e3b54a','star');fxNum(m.x,m.y,'-'+dmg,'#ffd75e',17,(a-1)*20);
      fxNum(m.x,m.y,'20!','#e3b54a',12,20+(a-1)*20);
      logEvent(c.name+' finds a seam (20!) — '+dmg+' damage to the '+m.name+'.');
    }else if(res.hit){
      var dmg2=swing(u,m,opts,first);
      fxLunge(u,m.x,m.y);fxBurst(m.x,m.y,'#e06a4a');fxNum(m.x,m.y,'-'+dmg2,'#ff9d76',14,(a-1)*20);
      logEvent(c.name+' hits '+m.name+' ('+dmg2+').');
    }else logEvent(c.name+' swings wide ('+res.roll+').');
    first=false;
    if(m.hp<=0){killMon(m);break;}
  }
  u.backstab=0;
  draw();winCheck();
}
function swing(u,m,opts,first){
  var c=u.c,w=weapon(c);
  var dice=w?w.d:'1d3';
  var dmg=Rules.dice(dice)+strOf(c).dmg;
  if(u.fx.bless>0)dmg+=1;
  if(u.fx.strength>0)dmg+=2;
  if(u.fx.prayer>0)dmg+=1;
  if(opts.called)dmg=Math.floor(dmg*1.5);
  if(opts.backstab&&first&&c.cls==='T')dmg*=Math.max(1,c.lvl);
  dmg=Math.max(0,Math.round(dmg));
  // skeleton/stone resistance: half unless blunt
  if(m.def.undead&&m.def.tags&&m.def.tags.indexOf('undead')>=0&&!(w&&BLUNT[w.id])&&!opts.fire){
    dmg=Math.ceil(dmg/2);
    if(w)logEvent('Bone knits — the blow counts half.');
  }
  m.hp-=dmg;
  return dmg;
}
function pcShoot(u,m){
  var c=u.c,mw=missileWeapon(c);
  if(!mw)return;
  var rng=mw.id.indexOf('longbow')>=0?10:mw.id.indexOf('shortbow')>=0?7:5;
  if(dist8(u,m)>rng||!losFree(u.x,u.y,m.x,m.y)){UI.toast('No clean line — or beyond bolt range.');return;}
  if(mw.id.indexOf('bow')>=0){
    var j=(c.inv||[]).indexOf('arrow');if(j>=0)c.inv.splice(j,1);
  }
  var n=Rules.missileROF(c);
  for(var a=0;a<n;a++){
    if(!CB||CB.done||!standing(m))break;
    m.seen=true;
    var res=Rules.toHitRoll(c,m.ac,0);
    if(res.hit){
      var dmg=Rules.dice(mw.d||'1d8');
      m.hp-=dmg;
      fxTracer(u.x,u.y,m.x,m.y,'#d8c7a8');fxNum(m.x,m.y,'-'+dmg,'#ff9d76',14,(a-1)*20);
      fxBurst(m.x,m.y,'#b0714f');
      logEvent(c.name+' puts a shaft in '+m.name+' ('+dmg+').');
    }else logEvent(c.name+"'s shot goes wide.");
    if(m.hp<=0){killMon(m);break;}
  }
  draw();winCheck();
}
function spellMenu(u,casts){
  var c=u.c;
  var body=UI.el('div');
  body.appendChild(UI.el('p','muted','Memorized and ready — the slot burns when cast.'));
  casts.forEach(function(sp){
    var def=SPELLS[sp],info=SPELLC[sp];
    var row=UI.el('div','item');
    row.innerHTML='<span><b>'+UI.esc(def.n)+'</b> <span class=muted>ring '+def.l+' · '+info.tip+'</span><br><span class=muted>'+UI.esc(def.desc)+'</span></span>';
    var acts=UI.el('span','acts');
    var b=UI.el('button',null,'Cast ('+c.mem[sp]+')');
    b.onclick=function(){
      UI.closeTop();
      c.mem[sp]--;if(c.mem[sp]<=0)delete c.mem[sp];
      if(info.t==='self'||info.t==='all'){info.f(c,null,CB);endAct();}
      else{CB.tool={kind:'spell',sp:sp,info:info};draw();
        UI.toast('Now choose a '+(info.t==='cell'?'place on the board':info.t==='ally'?'companion':'foe')+'.');}
    };
    acts.appendChild(b);row.appendChild(acts);body.appendChild(row);
  });
  UI.modal({title:c.name+' — spell slots',body:body,actions:[{label:'Put it away'}]});
}
function castAt(u,tx,ty,target){
  var c=u.c,tool=CB.tool,sp=tool.sp,info=tool.info;
  var rngT=Math.max(1,Math.round(((SPELLS[sp].rng||30)||30)/10));
  if(SPELLS[sp].rng>0&&Math.max(Math.abs(u.x-tx),Math.abs(u.y-ty))>rngT+2){UI.toast('Beyond the reach of the gesture.');return;}
  if(tool.scrollId){Game.consumePack(c,tool.scrollId);logEvent('The magic unravels from its paper or wand.');}
  CB.tool=null;
  logEvent(c.name+' weaves '+SPELLS[sp].n+'.');
  spellSpark(sp,tx,ty);
  info.f(c,{x:tx,y:ty,unit:target},CB);
  endAct();
}
function turnUndead(u){
  var c=u.c;
  var targets=CB.mons.filter(function(m){return standing(m)&&m.def.undead&&!m.turnTried;});
  if(!targets.length)return;
  targets.forEach(function(m){
    m.turnTried=true;
    var r=Rules.turnResult(c.lvl,Math.ceil(m.def.hd));
    if(r==='destroy'){m.hp=0;m.gone=true;CB.kills++;logEvent(m.name+' comes apart at the holy word.');}
    else if(r==='turn'){fleeMon(m);}
    else if(r==='hold'){m.held=Math.max(m.held,1);logEvent(m.name+' holds, held by the sign.');}
    else logEvent('The '+m.name+' ignores the rite.');
  });
  draw();winCheck();
}
function itemMenu(u){
  var c=u.c;
  var uses=(c.inv||[]).map(function(id){var it=item(id);return it&&(it.t==='p'||it.t==='x'||it.t==='d')?{id:id,it:it}:null;}).filter(Boolean);
  uses=uses.filter(function(x){
    if(x.it.t==='p')return true;
    var sp=x.it.spell,info=SPELLC[sp];
    if(!info)return false;
    var sphere=SPELLS[sp].c==='M'?c.cls==='M':(c.cls==='C'||c.cls==='P'||(c.cls==='R'&&SPELLS[sp].l<=4));
    if(!sphere)return false;
    return info.t==='mon'||info.t==='cell'||info.t==='self';
  });
  if(!uses.length){UI.toast('Nothing in the pack for the press of battle.');return;}
  var body=UI.el('div');
  uses.forEach(function(x){
    var row=UI.el('div','item');
    row.innerHTML='<span>'+UI.esc(x.it.n)+' <span class=muted>'+UI.esc(x.it.cure?'heals '+x.it.cure:'')+
      (x.it.poison?' — poison':x.it.oil?' — oil and flame':'')+
      (x.it.t==='x'?' — read once: '+((SPELLS[x.it.spell]||{}).n||'')+' ('+SPELLC[x.it.spell].tip+')':'')+
      (x.it.t==='d'?' — device, '+x.it.chargesLeft+' charges: '+((SPELLS[x.it.spell]||{}).n||''):'')+
      '</span></span>';
    var acts=UI.el('span','acts');var b=UI.el('button',null,'Use');
    b.onclick=function(){
      if(x.it.t==='x'||x.it.t==='d'){
        var info=SPELLC[x.it.spell];
        UI.closeTop();
        if(info.t==='self'){Game.consumePack(c,x.id);info.f(c,null,CB);endAct();return;}
        CB.tool={kind:'spell',sp:x.it.spell,info:info,scrollId:x.id};
        UI.toast('Aim the '+(info.t==='cell'?'place':'foe')+' — the parchment burns on release.');
        draw();return;
      }
      c.inv.splice(c.inv.indexOf(x.id),1);
      if(x.it.cure){var amt=Rules.dice(x.it.cure);c.hp=Math.min(c.maxhp,c.hp+amt);logEvent(c.name+' drinks deep (+'+amt+' hp).');}
      else if(x.it.poison){u.poisoned=1;logEvent(c.name+' coats a blade with venom.');}
      else if(x.it.oil){CB.tool={kind:'oil'};UI.closeTop();UI.toast('Splash it on a foe.');draw();return;}
      UI.closeTop();endAct();
    };
    acts.appendChild(b);row.appendChild(acts);body.appendChild(row);
  });
  UI.modal({title:c.name+' — the pack',body:body,actions:[{label:'Leave it'}]});
}
function tryFlee(u){
  if(Rules.play.d6()<=4){
    logEvent('You give ground and run — the company about and away.');
    finish('fled');
  }else{
    logEvent('The break fails! Foes fall on the withdrawal.');
    CB.mons.forEach(function(m){
      if(standing(m)&&!m.flee)monStrike(m,nearestPc(m,true));
    });
    draw();winCheck();
  }
}

/* ================= Monster AI ================= */
function nearestPc(m,includeDown){
  var best=null,bd=999;
  CB.pcs.forEach(function(p){
    if(p.c.dead)return;
    if(!includeDown&&p.c.hp<=0)return;
    var d=dist8(m,p)+(includeDown?p.c.hp<=0?0:2:0);
    if(d<bd){bd=d;best=p;}
  });
  return best;
}
function monAct(m){
  if(!CB||CB.done||!standing(m)){nextTurn();return;}
  if(m.flee){ // run for the edge
    m.x+=m.x<W/2?-1:1;
    if(m.x<0||m.x>=W){m.gone=true;draw();nextTurn();return;}
    draw();nextTurn();return;
  }
  if(m.held>0){m.held--;logEvent(m.name+' strains against the binding.');draw();nextTurn();return;}
  if(m.blindT>0){m.blindT--;logEvent(m.name+' gropes at the dark.');draw();nextTurn();return;}
  if(m.slowedT>0&&CB.round%2===0){m.slowedT--;logEvent(m.name+' moves in a dream-slow dance.');draw();nextTurn();return;}
  m.seen=true;
  var t=nearestPc(m,false);
  if(!t){ // only down pcs remain: finish them
    t=nearestPc(m,true);
    if(t){monStrike(m,t);draw();if(!winCheck())nextTurn();return;}
  }
  if(t){
    // move toward target keeping budget
    var budget=m.mv*2;
    var step=1;
    while(dist8(m,t)>1&&budget>=2&&step++<20){
      var dx=Math.sign(t.x-m.x),dy=Math.sign(t.y-m.y);
      var opts=[[dx,dy],[dx,0],[0,dy]].filter(function(v){return v[0]||v[1];});
      var moved=false;
      for(var i=0;i<opts.length&&!moved;i++){
        var nx=m.x+opts[i][0],ny=m.y+opts[i][1];
        if(blocked(nx,ny)||occupied(nx,ny,m))continue;
        if(opts[i][0]&&opts[i][1]&&(blocked(m.x+opts[i][0],m.y)||blocked(m.x,m.y+opts[i][1])))continue;
        m.x=nx;m.y=ny;budget-=(opts[i][0]&&opts[i][1])?3:2;moved=true;
      }
      if(!moved)break;
    }
    if(dist8(m,t)<=1)monStrike(m,t);
    else logEvent(m.name+' circles closer.');
  }
  draw();
  if(!winCheck())nextTurn();
}
function parseAtk(m,i){
  var s=(m.def.atk&&m.def.atk[i])||'1d6';
  var mm=/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/.exec(s);
  return{dice:mm?mm[1]+'d'+mm[2]:'1d6',mod:mm?(mm[3]==='-'?-+mm[4]:+mm[4]||0):0,drain:/drain/i.test(s)};
}
function monStrike(m,t){
  if(!t||!standing(m))return;
  var c=t.c;
  var lvl=Math.max(1,Math.ceil(m.def.hd));
  var n=(m.def.atk&&m.def.atk.length)||1;
  if(n>2)n=2;
  for(var a=0;a<n;a++){
    if(c.hp<=0||c.dead)break;
    var at=parseAtk(m,a);
    if(t.fx.mirror>0&&Rules.play.chance(.4)){logEvent('A mirror-image takes the blow for '+c.name+'.');continue;}
    if(t.fx.stoneskin>0){t.fx.stoneskin--;logEvent('A stone wrinkle swallows a blow.');continue;}
    var need=Rules.THAC0('F',lvl)-pcAC(c);
    var roll=Rules.play.d20();
    if(roll===20||(roll!==1&&roll>=need)){
      var dmg=Rules.dice(at.dice)+at.mod;
      c.hp-=dmg;
      fxLunge(m,t.x,t.y);fxBurst(t.x,t.y,'#a3402f');fxNum(t.x,t.y,'-'+dmg,'#ff7b6b',15,(a-1)*18);
      logEvent(m.name+(a?' claws':' strikes')+' '+c.name+' for '+dmg+'.');
      if(c.poisonedFrom!==m&&m.def.poison&&!c.poison){c.poison=m.def.poison;}
      if(at.drain){
        var loss=Math.max(50,Math.floor((c.xp-levelFloor(c))/2));
        c.xp=Math.max(0,c.xp-loss);
        logEvent(c.name+' feels a level of life stolen (−'+loss+' xp).');
      }
      if(c.hp<=0)logEvent(c.hp>-10?c.name+' collapses!':c.name+' falls still.');
    }else logEvent(m.name+'’s blow clangs on mail.');
  }
}
function levelFloor(c){
  // xp banked toward the current level
  var t=Rules.XPT,floor=0;
  for(var i=0;i<t.length;i++){if(c.xp>=t[i])floor=t[i];else break;}
  return floor;
}

/* ================= Spell engine ================= */
function msave(m,kind,mod){
  var need=20-Math.min(17,Math.ceil(m.def.hd))+(mod||0);
  return Rules.play.d20()>=need;
}
function pcsave(c,kind,mod){
  var sv=Rules.saveTargets(c);
  var idx={poison:1,wand:1,poly:2,breath:3,spell:4,death:0}[kind]||4;
  return Rules.play.d20()>=sv[idx]+(mod||0);
}
function areaFx(cx,cy,r,fn){
  CB.pcs.forEach(function(p){if(!isDown(p)&&dist8(p,{x:cx,y:cy})<=r)fn(p,'p');});
  CB.mons.forEach(function(m){if(standing(m)&&dist8(m,{x:cx,y:cy})<=r)fn(m,'m');});
}
function monDamage(m,dmg,fire){
  if(m.def.undead&&fire){/*full*/}
  m.hp-=dmg;
  if(m.hp<=0)killMon(m);
}
var SPELLC={
 mmissile:{t:'mon',tip:'one foe, unerring',f:function(c,tg){var n=1+Math.floor((c.lvl-1)/2),d=0;
   for(var i=0;i<n;i++)d+=Rules.dice('1d4+1');monDamage(tg.unit,d);
   logEvent('Darts of force strike true ('+d+').');}},
 sleep:{t:'cell',tip:'2d4 hd of drowsing',f:function(c,tg){var pool=Rules.dice('2d4');
   var inA=CB.mons.filter(function(m){return standing(m)&&dist8(m,tg)<=2&&!m.def.undead;}).sort(function(a,b){return a.def.hd-b.def.hd;});
   inA.forEach(function(m){if(pool>=m.def.hd){pool-=m.def.hd;m.held=1+Rules.play.d(1,3);logEvent(m.name+' drowses.');}});}},
 armor:{t:'self',tip:'AC −1 this battle',f:function(c){var u=pcOf(c);u.fx.armor=1;logEvent('Fine chains of force settle around '+c.name+'.');}},
 shield:{t:'self',tip:'AC −2 vs blows',f:function(c){pcOf(c).fx.shield=1;logEvent('A shield of whirling wind turns aside the air.');}},
 cspray:{t:'self',tip:'flame, adjacent foes',f:function(c){var u=pcOf(c),d=Rules.dice(Math.min(c.lvl,10)+'d4');
   CB.mons.forEach(function(m){if(standing(m)&&dist8(m,u)<=1){if(msave(m,'breath'))monDamage(m,Math.ceil(d/2),1);else monDamage(m,d,1);}});
   logEvent('Rivers of flame burst from '+c.name+'’s palms.');}},
 burnhands:{t:'self',tip:'flame, adjacent foes',f:function(c){SPELLC.cspray.f(c);}},
 strength:{t:'self',tip:'+2 blows',f:function(c){pcOf(c).fx.strength=3;logEvent(c.name+' flexes, suddenly mighty.');}},
 mirror:{t:'self',tip:'blows may miss',f:function(c){pcOf(c).fx.mirror=Rules.play.d4()+1;}},
 invis:{t:'self',tip:'unseen until you strike',f:function(c){pcOf(c).fx.invisT=6;logEvent(c.name+' fades from sight.');}},
 stoneskin:{t:'self',tip:'absorbs 3 blows',f:function(c){pcOf(c).fx.stoneskin=3;}},
 scare:{t:'mon',tip:'save or flee',f:function(c,tg){if(!msave(tg.unit,'wand'))fleeMon(tg.unit);else logEvent(tg.unit.name+' masters its fear.');}},
 fear:{t:'mon',tip:'save or flee',f:function(c,tg){SPELLC.scare.f(c,tg);}},
 spook:{t:'mon',tip:'save or flee',f:function(c,tg){SPELLC.scare.f(c,tg);}},
 blind:{t:'mon',tip:'save or blind',f:function(c,tg){if(!msave(tg.unit,'wand')){tg.unit.blindT=1+Rules.play.d(1,3);logEvent(tg.unit.name+' blinds.');}}},
 command:{t:'mon',tip:'lose the next act',f:function(c,tg){if(!msave(tg.unit,'wand')){tg.unit.held=1;logEvent(tg.unit.name+' obeys a stranger will.');}}},
 slow:{t:'mon',tip:'save or move in syrup',f:function(c,tg){if(!msave(tg.unit,'spell')){tg.unit.slowedT=3;}}},
 haste:{t:'ally',tip:'double acts 2 rounds',f:function(c,tg){pcOf(tg.unit.c).fx.haste=3;logEvent(tg.unit.c.name+' blurs.');}},
 web:{t:'cell',tip:'entangles',f:function(c,tg){areaFx(tg.x,tg.y,1,function(u,side){if(side==='m'&&!msave(u,'spell')){u.held=2;logEvent(u.name+' tangles in the webs.');}});}},
 stink:{t:'cell',tip:'nauseate',f:function(c,tg){areaFx(tg.x,tg.y,2,function(u,side){if(side==='m'&&!msave(u,'poison')){u.held=1+Rules.play.d(1,3);logEvent(u.name+' retches and drowses.');}});}},
 acid:{t:'mon',tip:'acid arrow',f:function(c,tg){monDamage(tg.unit,Rules.dice('2d4')+1);logEvent('Black acid eats '+tg.unit.name+'.');}},
 vamp:{t:'mon',tip:'touch drain',f:function(c,tg){var res=Rules.toHitRoll(c,tg.unit.ac,0);
   if(res.hit){var d=Rules.dice(c.lvl+'d6');tg.unit.hp-=d;if(tg.unit.hp<=0)killMon(tg.unit);
     c.hp=Math.min(c.maxhp,c.hp+Math.ceil(d/2));logEvent('Life pours from '+tg.unit.name+' into '+c.name+'.');}
   else logEvent('The grasping hand comes up empty.');}},
 bolt:{t:'mon',tip:'lightning, save half',f:function(c,tg){var d=Rules.dice(c.lvl+'d6');
   monDamage(tg.unit,msave(tg.unit,'breath')?Math.ceil(d/2):d);logEvent('Lightning leaps.');}},
 fireball:{t:'cell',tip:'40ft burst, save half',f:function(c,tg){var d=Rules.dice(c.lvl+'d6');
   areaFx(tg.x,tg.y,2,function(u,side){
     if(side==='m'){monDamage(u,msave(u,'breath')?Math.ceil(d/2):d,1);}
     else{var hv=pcsave(u.c,'breath')?Math.ceil(d/2):d;u.c.hp-=hv;if(u.c.hp<=0)logEvent(u.c.name+' is engulfed!');}});
   logEvent('A ball of fire detonates.');}},
 dbf:{t:'cell',tip:'delayed burst, save half',f:function(c,tg){SPELLC.fireball.f(c,tg);}},
 cone:{t:'cell',tip:'cone, save half',f:function(c,tg){SPELLC.fireball.f(c,tg);}},
 meteor:{t:'cell',tip:'strobing bursts',f:function(c,tg){SPELLC.fireball.f(c,tg);SPELLC.fireball.f(c,{x:tg.x+1,y:tg.y});}},
 chainlite:{t:'mon',tip:'arcing bolts',f:function(c,tg){var d=Rules.dice(c.lvl+'d6');
   monDamage(tg.unit,msave(tg.unit,'breath')?Math.ceil(d/2):d);logEvent('Lightning arcs between them.');}},
 icestorm:{t:'cell',tip:'freezing sphere',f:function(c,tg){var d=Rules.dice('2d8+1');
   areaFx(tg.x,tg.y,3,function(u,side){if(side==='m')monDamage(u,msave(u,'breath')?Math.ceil(d/2):d);
     else{u.c.hp-=Math.ceil(d/4);}});}},
 cloudkill:{t:'cell',tip:'save poison or die',f:function(c,tg){areaFx(tg.x,tg.y,2,function(u,side){
   if(side==='m'){if(!msave(u,'poison')){u.hp=0;u.gone=true;CB.kills++;logEvent(u.name+' collapses in the green rain.');}}
   else if(!pcsave(u.c,'poison')){u.c.hp-=Rules.dice('4d6');if(u.c.hp<=0)logEvent(u.c.name+' sinks choking.');}});}},
 incencloud:{t:'cell',tip:'save or burn',f:function(c,tg){SPELLC.cloudkill.f(c,tg);}},
 flesh:{t:'mon',tip:'save or stone',f:function(c,tg){if(!msave(tg.unit,'poly')){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent(tg.unit.name+' becomes a grey statue.');}else logEvent('Flesh holds fast.');}},
 disint:{t:'mon',tip:'save or unmake',f:function(c,tg){if(!msave(tg.unit,'poly')){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent(tg.unit.name+' comes apart at the atoms.');}else logEvent('The ray skates off.');}},
 finger:{t:'mon',tip:'save or die',f:function(c,tg){if(!msave(tg.unit,'death')){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent('The finger of death closes.');}else logEvent('Death waves a refusal.');}},
 pwkill:{t:'mon',tip:'HD ≤ 3 die',f:function(c,tg){if(tg.unit.def.hd<=3){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent('A word, and '+tg.unit.name+' is slain.');}}},
 pwstun:{t:'mon',tip:'HD ≤ 6 stunned',f:function(c,tg){if(tg.unit.def.hd<=6)tg.unit.held=1+Rules.play.d(4);}},
 pwblind:{t:'mon',tip:'HD ≤ 7 blinded',f:function(c,tg){if(tg.unit.def.hd<=7)tg.unit.blindT=2+Rules.play.d(1,4);}},
 deathspell:{t:'cell',tip:'sum HD ≤ 8 die',f:function(c,tg){var pool=8;
   CB.mons.filter(function(m){return standing(m)&&dist8(m,tg)<=2;}).sort(function(a,b){return a.def.hd-b.def.hd;})
   .forEach(function(m){if(!m.def.undead&&pool>=m.def.hd){pool-=m.def.hd;m.hp=0;m.gone=true;CB.kills++;logEvent(m.name+' drops dead.');}});}},
 holdperson:{t:'mon',tip:'save or held',f:function(c,tg){if(tg.unit.def.size==='L'||tg.unit.def.hd>8){logEvent('The word cannot hold so great a body.');return;}
   if(!msave(tg.unit,'spell')){tg.unit.held=Math.max(1,c.lvl);logEvent(tg.unit.name+' stands frozen mid-step.');}}},
 hold_p:0,
 holdmon:0,
 charm:{t:'mon',tip:'fight for you a while',f:function(c,tg){if(!msave(tg.unit,'spell')){tg.unit.held=2;logEvent(tg.unit.name+' looks at you with sudden friendship.');}}},
 // ---- priest ----
 clw:{t:'ally',tip:'heal 1d8 (2d8 at 7+)',f:function(c,tg){var d=Rules.dice(c.lvl>=7?'2d8':'1d8');tg.unit.c.hp=Math.min(tg.unit.c.maxhp,tg.unit.c.hp+d);logEvent(c.name+' lays hands: '+tg.unit.c.name+' +'+d+'.');}},
 caw:0,
 ccw:{t:'ally',tip:'heal 3d8+3',f:function(c,tg){var d=Rules.dice('3d8+3');tg.unit.c.hp=Math.min(tg.unit.c.maxhp,tg.unit.c.hp+d);}},
 heal:{t:'ally',tip:'heal whole',f:function(c,tg){tg.unit.c.hp=tg.unit.c.maxhp;logEvent('The wound-light leaves '+tg.unit.c.name+' whole.');}},
 csw:{t:'ally',tip:'heal 2d8+1',f:function(c,tg){var d=Rules.dice('2d8+1');tg.unit.c.hp=Math.min(tg.unit.c.maxhp,tg.unit.c.hp+d);}},
 casw:{t:'mon',tip:'wounds by touch',f:function(c,tg){var res=Rules.toHitRoll(c,tg.unit.ac,0);if(res.hit){var d=Rules.dice('2d8+1');if(tg.unit.def.undead&&!msave(tg.unit,'spell'))d*=2;monDamage(tg.unit,d);}}},
 cacw:{t:'mon',tip:'wounds by touch',f:function(c,tg){var res=Rules.toHitRoll(c,tg.unit.ac,0);if(res.hit){var d=Rules.dice('3d6+1');if(tg.unit.def.undead&&!msave(tg.unit,'spell'))d*=2;monDamage(tg.unit,d);}}},
 caw2:0,
 bless:{t:'all',tip:'all foes +1 hit/AC',f:function(c){CB.pcs.forEach(function(p){p.fx.bless=3;});logEvent('A circle of blessing steadies every arm.');}},
 prayer:{t:'all',tip:'+1 all, 2 rounds',f:function(c){CB.pcs.forEach(function(p){p.fx.prayer=2;});}},
 aid:{t:'all',tip:'+1 hit and hp, 3 rounds',f:function(c){CB.pcs.forEach(function(p){p.fx.bless=Math.max(p.fx.bless,3);p.c.hp+=1;});}},
 magstone:{t:'mon',tip:'dart of stone',f:function(c,tg){monDamage(tg.unit,Rules.dice('1d6')+2);}},
 flamestrike:{t:'mon',tip:'fire from above',f:function(c,tg){var d=Rules.dice('6d6')+1;monDamage(tg.unit,msave(tg.unit,'breath')?Math.ceil(d/2):d,1);logEvent('A pillar of fire descends.');}},
 holyword:{t:'cell',tip:'save or die (evil)',f:function(c,tg){areaFx(tg.x,tg.y,2,function(u,side){
   if(side==='m'&&(u.def.undead||(u.def.tags||[]).indexOf('evil')>=0)){if(!msave(u,'spell')){u.hp=0;u.gone=true;CB.kills++;logEvent(u.name+' is unmade by the Word.');}}});}},
 slayliving:{t:'mon',tip:'save −4 or die',f:function(c,tg){if(tg.unit.def.undead){logEvent('The dead thing only laughs.');return;}
   if(!msave(tg.unit,'spell',-4)){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent(tg.unit.name+' drops, life cut.');}}},
 destruction:{t:'mon',tip:'save or unmake',f:function(c,tg){if(!msave(tg.unit,'spell')){tg.unit.hp=0;tg.unit.gone=true;CB.kills++;logEvent(tg.unit.name+' is destroyed.');}else logEvent('The word of destruction fails to find its mark.');}},
 harm:{t:'mon',tip:'devastating touch',f:function(c,tg){var res=Rules.toHitRoll(c,tg.unit.ac,0);if(res.hit){var d=Math.min(20*8,Rules.dice(c.lvl+'d6'));monDamage(tg.unit,d);logEvent('The negative touch ravages '+tg.unit.name+'.');}}},
 bladebarrier:{t:'self',tip:'shields round caster',f:function(c){var u=pcOf(c),d=Rules.dice('6d6')+c.lvl;
   CB.mons.forEach(function(m){if(standing(m)&&dist8(m,u)<=1)monDamage(m,msave(m,'breath')?Math.ceil(d/2):d);});}},
 cablind:{t:'cell',tip:'blind them all',f:function(c,tg){areaFx(tg.x,tg.y,2,function(u,side){if(side==='m'&&!msave(u,'spell'))u.blindT=1+Rules.play.d(1,3);});}},
 cublind:{t:'mon',tip:'blind one',f:function(c,tg){SPELLC.blind.f(c,tg);}},
 freeaction:{t:'ally',tip:'free a bound ally',f:function(c,tg){tg.unit.held=0;tg.unit.slowedT=0;}},
 neutpoison:{t:'ally',tip:'cleanse venom',f:function(c,tg){tg.unit.c.poison=null;}},
 slowpoison:{t:'ally',tip:'ward venom',f:function(c,tg){SPELLC.neutpoison.f(c,tg);}},
 resfc:{t:'ally',tip:'ward stone-flesh',f:function(c,tg){tg.unit.fx.resf=1;}},
 magvest:0,cablind2:0
};
SPELLC.holdmon=SPELLC.holdperson;SPELLC.hold_p=SPELLC.holdperson;SPELLC.caw=SPELLC.clw;SPELLC.caw2=SPELLC.caw;SPELLC.cablind2=SPELLC.cablind;
function pcOf(c){return CB.pcs.find(function(p){return p.c===c;});}

/* ================= Flee button etc done; drawing ================= */
/* ================= battle FX =================
 * Transient, purely cosmetic: floating numbers, bursts, bolt tracers and
 * attack lunges. They never touch combat state; the loop repaints while a
 * battle is live so time-based effects animate between discrete actions. */
var FX=[];
function fxNum(x,y,txt,col,size,xoff){FX.push({k:'num',x:x,y:y,t:txt,c:col,s:size||14,xo:xoff||0,b:Date.now()});}
function fxBurst(x,y,col,kind){FX.push({k:'burst',x:x,y:y,c:col,kind:kind||'ring',b:Date.now()});}
function fxTracer(x0,y0,x1,y1,col){FX.push({k:'tracer',x:x0,y:y0,x1:x1,y1:y1,c:col||'#d8c7a8',b:Date.now()});}
function fxLunge(u,tx,ty){FX.push({k:'lunge',u:u,x:u.x,y:u.y,tx:tx,ty:ty,dur:190,b:Date.now()});}
function fxDur(f){return f.k==='num'?1050:f.k==='burst'?540:f.k==='tracer'?260:(f.dur||300);}
function lungeOffset(u){
  var now=Date.now(),best=null;
  for(var i=FX.length-1;i>=0;i--){
    var f=FX[i];
    if(f.k==='lunge'&&f.u===u){
      var p=(now-f.b)/f.dur;
      if(p>=0&&p<1){best={off:Math.sin(Math.PI*p)*0.42,tx:f.tx,ty:f.ty};break;}
    }
  }
  return best;
}
function spellSpark(sp,x,y){
  var n=(SPELLS[sp]&&SPELLS[sp].n||'').toLowerCase();
  if(/fire|flame|burn|fireball/.test(n))return fxBurst(x,y,'#e07b3a','fire');
  if(/cold|ice|frost|snow/.test(n))return fxBurst(x,y,'#8fc7e8','star');
  if(/lightning|bolt|thunder/.test(n))return fxBurst(x,y,'#f4d06a','star');
  if(/heal|cure|restore|vigor/.test(n))return fxBurst(x,y,'#7fd483','heal');
  if(/death|die|destroy|slay|word/.test(n))return fxBurst(x,y,'#cfd6e4','skull');
  if(/hold|sleep|stun|paraly|charm|scare|fear/.test(n))return fxBurst(x,y,'#7f9df0','ring');
  return fxBurst(x,y,'#e3b54a','ring');
}
var animLive=false;
function ensureAnim(){
  if(animLive)return;animLive=true;
  var raf=(typeof requestAnimationFrame==='function')?requestAnimationFrame:function(f){return setTimeout(f,33);};
  (function tick(){
    if(CB&&!CB.done)draw();
    raf(tick);
  })();
}
function drawFX(){
  var now=Date.now(),keep=[];
  FX.forEach(function(f){
    var el=now-f.b,dur=fxDur(f);
    if(el>=dur)return;
    keep.push(f);
    var p=el/dur;
    if(f.k==='lunge')return;
    var px=isoX(f.x+.5,f.y+.5),py=isoY(f.x+.5,f.y+.5);
    if(f.k==='num'){
      ctx.globalAlpha=1-p*p;
      ctx.fillStyle=f.c;ctx.font='bold '+f.s+'px Georgia';ctx.textAlign='center';
      ctx.fillText(f.t,px+f.xo,py-26-p*36);
      ctx.textAlign='left';ctx.globalAlpha=1;
    }else if(f.k==='tracer'){
      var ax=isoX(f.x+.5,f.y+.5),ay=isoY(f.x+.5,f.y+.5)-14;
      var bx=isoX(f.x1+.5,f.y1+.5),by=isoY(f.x1+.5,f.y1+.5)-14;
      ctx.globalAlpha=1-p;
      ctx.strokeStyle=f.c;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+(bx-ax)*Math.min(1,p*1.6),ay+(by-ay)*Math.min(1,p*1.6));ctx.stroke();
      ctx.lineWidth=1;ctx.globalAlpha=1;
    }else if(f.k==='burst'){
      ctx.globalAlpha=(1-p)*0.9;
      if(f.kind==='fire'){
        for(var i=0;i<10;i++){
          var a=i*0.628+p*0.9,r=6+p*30;
          ctx.fillStyle=i%2?'#e07b3a':'#f4c063';
          ctx.beginPath();ctx.arc(px+Math.cos(a)*r,py-8+Math.sin(a)*r*.55-p*16,3.4*(1-p),0,6.283);ctx.fill();
        }
        ctx.fillStyle='rgba(20,12,8,'+(0.5*(1-p))+')';
        ctx.beginPath();ctx.ellipse(px,py,14+p*26,(14+p*26)*.5,0,0,6.283);ctx.fill();
      }else if(f.kind==='star'){
        ctx.strokeStyle=f.c;ctx.lineWidth=2;
        for(var s=0;s<6;s++){
          var sa=s*1.047+p*2.2;
          ctx.beginPath();ctx.moveTo(px+Math.cos(sa)*(4+p*6),py-12+Math.sin(sa)*(4+p*6)*.6);
          ctx.lineTo(px+Math.cos(sa)*(8+p*24),py-12+Math.sin(sa)*(8+p*24)*.6);ctx.stroke();
        }
        ctx.lineWidth=1;
      }else if(f.kind==='heal'){
        ctx.strokeStyle=f.c;ctx.lineWidth=2;
        for(var q=0;q<3;q++){
          var hx=px-12+q*12,hy=py-10-p*34+q*5;
          ctx.beginPath();ctx.moveTo(hx-4,hy);ctx.lineTo(hx+4,hy);ctx.moveTo(hx,hy-4);ctx.lineTo(hx,hy+4);ctx.stroke();
        }
        ctx.lineWidth=1;
      }else if(f.kind==='skull'){
        ctx.fillStyle=f.c;ctx.font=Math.round(14+p*12)+'px Georgia';ctx.textAlign='center';
        ctx.fillText('☠',px,py-16-p*26);ctx.textAlign='left';
      }else{ // ground ring
        ctx.strokeStyle=f.c;
        ctx.beginPath();ctx.ellipse(px,py,8+p*26,(8+p*26)*.5,0,0,6.283);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
  });
  FX=keep;
}

function isoX(x,y){return cv.width/2+(x-y)*TW/2;}
function isoY(x,y){return 92+(x+y)*TH/2;}
function unIso(px,py){
  var dx=(px-cv.width/2)/(TW/2),dy=(py-92)/(TH/2);
  return{x:Math.floor((dy+dx)/2),y:Math.floor((dy-dx)/2)};
}
function draw(){
  if(!CB)return;
  var g=ctx;
  g.fillStyle='#0a0b10';g.fillRect(0,0,cv.width,cv.height);
  var grd=g.createLinearGradient(0,0,0,cv.height);
  grd.addColorStop(0,'#141620');grd.addColorStop(1,'#08090d');
  g.fillStyle=grd;g.fillRect(0,0,cv.width,cv.height);
  // floor tiles back-to-front with highlights
  for(var s=0;s<W+H-1;s++){
    for(var x=0;x<W;x++){
      var y=s-x;if(y<0||y>=H)continue;
      var px=isoX(x,y),py=isoY(x,y);
      var obst=CB.obstacles.some(function(o){return o.x===x&&o.y===y;});
      diamond(px,py);
      g.fillStyle=obst?'#1b1e29':((x+y)%2?'#23283a':'#1e2230');
      g.fill();
      g.strokeStyle='rgba(227,181,74,0.06)';g.stroke();
      if(obst){g.fillStyle='#2a2f42';g.fillRect(px-10,py-26,20,22);}
      var mk=CB.moveSet[x+','+y];
      if(CB.turn&&CB.turn.side==='p'&&!CB.tool&&mk!==undefined&&!(x===CB.turn.x&&y===CB.turn.y)){
        diamond(px,py);g.fillStyle='rgba(90,130,220,0.14)';g.fill();
      }
      if(CB.tool&&(CB.tool.kind==='spell'&&CB.tool.info.t==='cell')){
        diamond(px,py);g.fillStyle='rgba(200,90,60,0.10)';g.fill();
      }
    }
  }
  // units back to front
  var all=CB.pcs.concat(CB.mons).filter(function(u){return u.side==='p'?!u.c.dead:!u.gone||u.side==='p';})
    .filter(function(u){return u.side==='p'?!u.c.dead:!u.gone;})
    .sort(function(a,b){return (a.x+a.y)-(b.x+b.y);});
  all.forEach(function(u){drawUnit(u);});
  drawFX();
  // banner
  g.fillStyle='rgba(10,11,16,0.75)';g.fillRect(0,0,cv.width,56);
  g.fillStyle='#e3b54a';g.font='16px Georgia';
  g.fillText(CB.spec.title||'Battle',16,24);
  g.fillStyle='#9a917c';g.font='12px Georgia';
  g.fillText('Round '+CB.round+' · foes '+CB.mons.filter(function(m){return standing(m);}).length+' · company '+CB.pcs.filter(function(p){return !isDown(p);}).length+(CB.surprise?' · SURPRISED':''),16,44);
  // initiative strip (right, upcoming order)
  var ix=cv.width-16;g.textAlign='right';
  CB.order.slice(Math.max(0,CB.idx),CB.idx+9).forEach(function(uu,i){
    g.fillStyle=uu===CB.turn?'#e3b54a':(uu.side==='p'?'#cfd6e4':'#c0603f');
    g.font=(uu===CB.turn?'bold 13px  ':'12px ')+'Georgia';
    g.fillText((i===0?'▸ ':'')+(uu.side==='p'?uu.c.name.split(' ')[0]:uu.name.split(' ')[0]),ix,20+i*15);
  });
  g.textAlign='left';
  if(CB.turn&&CB.turn.side==='p'){
    var u0=CB.turn;
    g.fillStyle='#e3b54a';g.beginPath();g.arc(isoX(u0.x,u0.y),isoY(u0.x,u0.y)-2,34,0,6.283);g.strokeStyle='rgba(227,181,74,'+(0.5+0.4*Math.sin(Date.now()/180))+')';g.lineWidth=2;g.stroke();g.lineWidth=1;
  }
}
function diamond(px,py){
  ctx.beginPath();ctx.moveTo(px,py-TH/2);ctx.lineTo(px+TW/2,py);
  ctx.lineTo(px,py+TH/2);ctx.lineTo(px-TW/2,py);ctx.closePath();
}
function drawUnit(u){
  var lg=lungeOffset(u),ux=u.x,uy=u.y;
  if(lg){ux=u.x+(lg.tx-u.x)*lg.off;uy=u.y+(lg.ty-u.y)*lg.off;}
  var px=isoX(ux,uy),py=isoY(ux,uy);
  var pc=u.side==='p';
  var down=pc&&u.c.hp<=0;
  var col=pc?(u.c.color||'#8899bb'):(u.def.undead?'#b9b29a':u.def.size==='L'?'#c05a3a':u.def.regen?'#5d7d4a':'#a0522d');
  var hgt=pc?34:(u.def.size==='L'?46:u.def.size==='S'?22:34);
  if(u===CB.turn){ctx.fillStyle='rgba(227,181,74,0.18)';ctx.beginPath();ctx.ellipse(px,py+3,26,12,0,0,6.283);ctx.fill();}
  // team base ring + contact shadow
  ctx.strokeStyle=pc?'rgba(120,160,220,0.5)':'rgba(200,90,60,0.5)';
  ctx.beginPath();ctx.ellipse(px,py+3,19,8.5,0,0,6.283);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.ellipse(px,py+3,16,7,0,0,6.283);ctx.fill();
  if(down){
    ctx.strokeStyle='#7a2d24';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(px-10,py-8);ctx.lineTo(px+10,py+4);ctx.moveTo(px-10,py+4);ctx.lineTo(px+10,py-8);ctx.stroke();ctx.lineWidth=1;
  }else{
    // body: tapered figure
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.moveTo(px,py-hgt);ctx.quadraticCurveTo(px+12,py-hgt*0.55,px+8,py);
    ctx.lineTo(px-8,py);ctx.quadraticCurveTo(px-12,py-hgt*0.55,px,py-hgt);
    ctx.fill();
    // head
    ctx.fillStyle=pc?'#d8c7a8':(u.def.undead?'#cfc6ad':'#c98f6a');
    ctx.beginPath();ctx.arc(px,py-hgt-5,pc?7:6,0,6.283);ctx.fill();
    if(u.fx&&u.fx.invisT>0){ctx.fillStyle='rgba(10,11,16,0.55)';ctx.fillRect(px-14,py-hgt-14,28,hgt+16);}
    if(u.flee){ctx.fillStyle='#e3b54a';ctx.font='14px Georgia';ctx.fillText('⇶',px+10,py-20);}
    if(u.held>0){ctx.strokeStyle='#7f9df0';ctx.beginPath();ctx.arc(px,py-hgt/2,16,0,6.283);ctx.stroke();}
    if(u.blindT>0){ctx.fillStyle='#556';ctx.fillRect(px-8,py-hgt-10,16,5);}
    if(u.burning!==undefined&&u.burning){ctx.fillStyle='#e07b3a';ctx.font='13px Georgia';ctx.fillText('♨',px-16,py-hgt);}
    if(u.acted&&u!==CB.turn){ctx.fillStyle='rgba(233,226,207,0.55)';ctx.beginPath();ctx.arc(px+14,py-hgt+2,3,0,6.283);ctx.fill();}
  }
  // hp bar — team-tinted track, gold seam on the current turn’s unit
  var frac=pc?clamp01(u.c.hp/Math.max(1,u.c.maxhp)):clamp01(u.hp/u.maphp);
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(px-16,py+8,32,4);
  ctx.fillStyle=pc?(frac>.5?'#5f8f57':frac>.25?'#c9a13f':'#a3402f'):'#8a3a2c';
  ctx.fillRect(px-16,py+8,32*frac,4);
  ctx.strokeStyle=u===CB.turn?'rgba(227,181,74,0.8)':'rgba(233,226,207,0.22)';
  ctx.strokeRect(px-16.5,py+7.5,33,5);
  if(pc){ctx.fillStyle=u.c.color||'#8899bb';ctx.fillRect(px-16,py+13,32,1.6);}
  // name for pcs
  ctx.fillStyle=pc?'#cfd6e4':'#b0714f';ctx.font='10px Georgia';
  ctx.fillText((pc?u.c.name.split(' ')[0]:u.name.split(' ')[0]),px-16,py+24);
}
function clamp01(v){return Math.max(0,Math.min(1,v));}
function status(t){var b=el('battleStatus');b.textContent=t;}
function logEvent(m){
  UI.log(/hit|falls|slain|die|kills|wins|bless|heal|∪/.test(m)?'good':/wide|clangs|flee|fails|collapses|dies|stolen|engulf/.test(m)?'bad':'dim',m);
}

/* ================= Input ================= */
function onClick(e){
  if(!CB||CB.done||!CB.turn||CB.turn.side!=='p')return;
  var r=cv.getBoundingClientRect();
  var pt=unIso((e.clientX-r.left)*(cv.width/r.width),(e.clientY-r.top)*(cv.height/r.height));
  var u=CB.turn;
  var target=CB.mons.find(function(m){return standing(m)&&m.x===pt.x&&m.y===pt.y;});
  var ally=CB.pcs.find(function(p){return !isDown(p)&&p.x===pt.x&&p.y===pt.y;});
  var tool=CB.tool;
  if(!tool){
    // click own unit ends turn? default: move
    if(CB.moveSet[pt.x+','+pt.y]!==undefined&&!(pt.x===u.x&&pt.y===u.y)){doMove(u,pt.x,pt.y);}
    else if(target){UI.toast('Choose ⚔ Attack first.');}
    return;
  }
  if(tool.kind==='attack'&&target){
    if(dist8(u,target)>1){
      // walk adjacent then strike
      var best=null,bd=999;
      CB.mons; // adjacency cells of target
      for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
        var nx=target.x+dx,ny=target.y+dy,k=nx+','+ny;
        if(CB.moveSet[k]!==undefined&&CB.moveSet[k]<bd&&!occupied(nx,ny,u)){bd=CB.moveSet[k];best=[nx,ny];}
      }
      if(best)doMove(u,best[0],best[1]);
    }
    if(dist8(u,target)<=1){pcAttack(u,target,{backstab:tool.backstab,called:tool.called});CB.tool=null;endAct();}
    else UI.toast('Feet cannot reach a striking place this act.');
    return;
  }
  if(tool.kind==='shoot'&&target){pcShoot(u,target);CB.tool=null;endAct();return;}
  if(tool.kind==='spell'){
    var inf=tool.info;
    if(inf.t==='mon'&&target){castAt(u,pt.x,pt.y,target);return;}
    if(inf.t==='ally'&&ally){castAt(u,pt.x,pt.y,ally);return;}
    if(inf.t==='cell'&&!target){castAt(u,pt.x,pt.y,null);return;}
    UI.toast('That is not the proper target.');return;
  }
  if(tool.kind==='oil'&&target){
    target.burning=true;target.burningFlag=1;logEvent(target.name+' catches fire!');
    CB.tool=null;endAct();return;
  }
}
function onKey(e){
  if(!CB)return false;
  if(e.key==='Escape'){if(CB.tool){CB.tool=null;draw();return true;}return true;}
  return false;
}
function init(canvas){cv=canvas;cv.addEventListener('click',onClick);}
/* autopilot: sane default act for the current pc (used by headless tests, handy for demos) */
function autoAct(){
  if(!CB||!CB.turn||CB.turn.side!=='p')return;
  var tk=CB.token;
  var u=CB.turn;var m=null,bd=999;
  // ensure exactly one driver when the whole board falls in one act
  if(!CB.mons.some(function(mm){return mm.hp>0&&!mm.gone;})){if(!CB.done)finish('win');return;}
  CB.mons.forEach(function(mm){if(standing(mm)){var d=dist8(u,mm);if(d<bd){bd=d;m=mm;}}});
  if(!m){endAct();return;}
  var casts=casterSpells(u.c);
  if(u.c.cls==='M'&&u.c.mem.mmissile>0&&bd>1){
    u.c.mem.mmissile--;if(u.c.mem.mmissile<=0)delete u.c.mem.mmissile;
    SPELLC.mmissile.f(u.c,{unit:m},CB);endAct();return;
  }
  if(bd>1){
    var best=null,bc=999;
    for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
      var nx=m.x+dx,ny=m.y+dy,k=nx+','+ny;
      if(CB.moveSet[k]!==undefined&&CB.moveSet[k]<bc&&!occupied(nx,ny,u)){bc=CB.moveSet[k];best=[nx,ny];}
    }
    if(best)doMove(u,best[0],best[1]);
  }
  if(dist8(u,m)<=1)pcAttack(u,m,{});
  else if(u.c.hp<=0){} // downed: nothing
  if(CB&&CB.token===tk)endAct();
}
return{start:start,isActive:isActive,onKey:onKey,init:init,autoAct:autoAct,
  _turn:function(){return CB&&CB.turn;},_cb:function(){return CB;},
  _clear:function(){if(CB&&CB.done)CB=null;}};
})();
