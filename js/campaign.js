/* Emberfall — js/campaign.js
 * Adventure chooser, company assembly, character materialization, module
 * begin, save-import of companies, and the campaign travel menu. */
'use strict';
var Campaign=(function(){
var sel=null;            // selected module id
var chosen=[];           // character ids in marching order
var waiting=[];          // character ids off-party
var imported=null;       // {roster, party, gold} from a save slot, or null

function allMods(tab){
  var out=[];
  Object.keys(MODULES).forEach(function(id){
    var m=MODULES[id];
    if(!tab.band){if(tab.mods&&tab.mods.indexOf(id)>=0)out.push(id);}
    else{ /* generated bands fill in milestone 4 */ }
  });
  return out;
}
function tabOf(id){
  var m=MODULES[id];if(!m)return null;
  for(var i=0;i<CAMPAIGNS.tabs.length;i++){
    var t=CAMPAIGNS.tabs[i];
    if(t.mods&&t.mods.indexOf(id)>=0)return t;
  }
  return null;
}
var curTab=0;
function choose(){
  var host=document.getElementById('campaign');
  var tabsEl=document.getElementById('campaignTabs');
  var cards=document.getElementById('campaignCards');
  tabsEl.innerHTML='';
  CAMPAIGNS.tabs.forEach(function(t,i){
    var b=UI.el('button',i===curTab?'on':'',UI.esc(t.name));
    b.onclick=function(){curTab=i;choose();};
    tabsEl.appendChild(b);
  });
  cards.innerHTML='';
  allMods(CAMPAIGNS.tabs[curTab]).forEach(function(id){
    var m=MODULES[id];
    var card=UI.el('div','card'+(sel===id?' sel':''));
    var areas=m.maps.length,enc=0,ch=0,sites=0;
    m.maps.forEach(function(mid){
      var mm=MAPS[mid];if(!mm)return;
      if(mm.overland){sites+=Object.keys(mm.sites||{}).length;return;}
      Object.keys(mm.ev||{}).forEach(function(k){if(mm.ev[k].enc)enc++;if(mm.ev[k].chest)ch++;});
    });
    card.innerHTML=
      '<span class="code">'+UI.esc(m.code)+'</span>'+
      '<h3>'+UI.esc(m.name)+'</h3>'+
      '<div class="meta"><span>lvl '+m.levels[0]+'–'+m.levels[1]+'</span>'+
      '<span>'+UI.esc(m.diffName)+' <span class="pips">'+pips(m.diff)+'</span></span>'+
      '<span>'+UI.esc(m.size)+' · '+UI.esc(m.length)+'</span></div>'+
      '<div class="meta"><span>'+areas+' areas</span><span>'+enc+' set battles</span><span>'+sites+' wild sites</span><span>'+ch+' treasures</span><span>'+(m.quests.length+m.side.length)+' commissions</span></div>'+
      '<p class="blurb">'+UI.esc(m.blurb)+'</p>'+
      ((window.G&&G.done&&G.done.indexOf(id)>=0)?'<span class="done">✓ completed</span>':'');
    card.onclick=function(){sel=id;choose();};
    cards.appendChild(card);
  });
  var sum=document.getElementById('campaignSummary');
  var mods=allMods(CAMPAIGNS.tabs[curTab]);
  sum.textContent=mods.length+' adventures on this tab'+(sel?' — '+MODULES[sel].code+' '+MODULES[sel].name:'');
  Game.show('campaign');
}
function pips(n){var h='';for(var i=0;i<4;i++)h+='<i class="'+(i<n?'on':'')+'"></i>';return h;}

/* ---- Assembly ---- */
function assemble(){
  if(!sel){
    var mods=allMods(CAMPAIGNS.tabs[curTab]);
    sel=mods[0];if(!sel){UI.toast('No adventures on this tab yet.');return;}
  }
  var m=MODULES[sel];
  if(imported){
    waiting=imported.roster.map(function(c){return c.id;});
    chosen=[];
  }else if(!chosen.length&&!waiting.length){
    waiting=PREGENS.map(function(p){return p.id;});
  }
  document.getElementById('assemblySub').textContent='For '+m.code+': '+m.name+' — recommended levels '+m.levels[0]+'–'+m.levels[1]+', purse '+startGold()+' gp';
  renderAssembly();
  Game.show('assembly');
}
function startGold(){
  if(imported)return imported.gold;
  return MODULES[sel].gold;
}
function renderAssembly(){
  var w=document.getElementById('waiting'),c=document.getElementById('chosen');
  w.innerHTML='';c.innerHTML='';
  function rowFor(id,list,cho){
    var ch=byId(id);if(!ch)return;
    var row=UI.el('div','hero-row');
    var pc=document.createElement('canvas');pc.width=44;pc.height=52;
    Figures.portrait(ch,pc);row.appendChild(pc);
    var who=UI.el('div','who');
    who.innerHTML='<div class="nm">'+UI.esc(ch.name)+'</div><div class="rc">'+
      UI.esc(Rules.RACES[ch.race].name+' '+Rules.CLASSES[ch.cls].name+' '+ch.lvl+(ch.spec?' ('+UI.esc(ch.spec)+')':''))+'</div>';
    row.appendChild(who);
    var st=UI.el('div','stats');
    st.innerHTML=ch.hp+'/'+ch.maxhp+' hp<br>AC '+Rules.theAC(ch);
    row.appendChild(st);
    var acts=UI.el('div','acts');
    if(!cho){
      var add=UI.el('button',null,'Add');add.disabled=chosen.length>=6;
      add.onclick=function(){waiting.splice(waiting.indexOf(id),1);chosen.push(id);renderAssembly();};
      acts.appendChild(add);
      var del=UI.el('button',null,'Delete');
      del.onclick=function(){waiting.splice(waiting.indexOf(id),1);renderAssembly();};
      acts.appendChild(del);
    }else{
      var rem=UI.el('button',null,'Remove');
      rem.onclick=function(){chosen.splice(chosen.indexOf(id),1);waiting.push(id);renderAssembly();};
      acts.appendChild(rem);
      var up=UI.el('button',null,'▲');up.title='Move up in marching order';
      up.onclick=function(){var i=chosen.indexOf(id);if(i>0){chosen.splice(i,1);chosen.splice(i-1,0,id);renderAssembly();}};
      acts.appendChild(up);
    }
    row.appendChild(acts);
    list.appendChild(row);
  }
  waiting.slice().forEach(function(id){rowFor(id,w,false);});
  chosen.slice().forEach(function(id){rowFor(id,c,true);});
  document.getElementById('partyCount').textContent='('+chosen.length+' of 6)';
  document.getElementById('assemblyGold').textContent=startGold()+' gp pooled';
  var begin=document.getElementById('begin');
  begin.disabled=chosen.length===0;
}
function byId(id){
  if(imported){var f=imported.roster.find(function(c){return c.id===id;});if(f)return f;}
  return PREGENS.find(function(p){return p.id===id;})||custom.find(function(p){return p.id===id;})||null;
}
var custom=[];
function addCustom(def){
  var id='pc_'+Date.now().toString(36);
  var c={id:id,name:def.name,race:def.race,cls:def.cls,align:def.align,
    color:'#'+['7d86c4','5f9e66','b7a6e8','4fb3a9','c2502c','e3b54a'][Math.floor(Math.random()*6)],
    scores:def.scores,strx:0,lvl:1,xp:0,hp:0,maxhp:0,eq:{},inv:['backpack','rations','waterskin'],book:[],prep:{},mem:{},fx:{}};
  // rolled class gold joins the pooled purse; the recruit buys a starter kit
  var rng=new Rules.RNG((Math.random()*0xffffffff)>>>0);
  custom.push(c);
  materializeStarter(c,rng);
  UI.close(UI.top());
  waiting.push(id);
  if(document.getElementById('assembly').classList.contains('hidden'))assemble();
  else renderAssembly();
}
/* Materialize a level-1 starter: hp, basic kit. */
function materializeStarter(c,rng){
  c.maxhp=c.hp=Rules.firstLevelHP(c.cls,Rules.abilityScore(c,'con'));
  if(!Object.keys(c.eq).length||!c.eq.melee){
    if(c.cls==='F'||c.cls==='P'||c.cls==='R'){c.eq.melee='longsword';c.eq.armor=c.cls==='R'?'studded':'chain';c.eq.shield='shield';}
    else if(c.cls==='C'){c.eq.melee='mace';c.eq.armor='chain';c.eq.shield='shield';}
    else if(c.cls==='T'){c.eq.melee='shortsword';c.eq.armor='leather';}
    else if(c.cls==='M'){c.eq.melee='staff';c.eq.missile='dart';
      c.book=['mmissile','sleep','armor','burnhands','shield'];c.prep={mmissile:1};c.mem={mmissile:1};}
  }
}
/* Advance an imported or fresh hero to the module start level (kit gold). */
function advanceTo(c,lvl,rng){
  var gained=0;
  while(c.lvl<lvl&&c.lvl<20){
    var before=c.maxhp;
    Rules.gainLevel(c,rng);
    gained++;
    if(c.cls==='M'){// compensate one new known spell per level gained
      var known=c.book||[];
      var pool=Object.keys(SPELLS).filter(function(s){return SPELLS[s].c==='M'&&SPELLS[s].l<=Rules.maxRing('M',c.lvl)&&known.indexOf(s)<0;});
      if(pool.length)known.push(rng.pick(pool));
    }
  }
  // kit thresholds: extra gp only for freshly made heroes (import keeps its own gear)
  return gained;
}
/* ---- Begin ---- */
function begin(){
  if(!chosen.length){UI.toast('Choose at least one adventurer.');return;}
  var m=MODULES[sel],rng=new Rules.RNG((Math.random()*0xffffffff)>>>0);
  var roster=[],partyIds=[];
  var startLvl=m.lvl;
  chosen.forEach(function(id){
    var base=byId(id);
    var c=imported?base:JSON.parse(JSON.stringify(base));
    if(!imported){
      if(!c.hp)materializeStarter(c,rng);
      if(c.lvl<startLvl){
        advanceTo(c,startLvl,rng);
        var t=Rules.KIT_LEVELS.indexOf(c.lvl);
        if(t>=0)c.inv.push('gp_kit_'+Rules.KIT_GOLD[t]); // represented in the purse below
      }
    }
    c.inv=(c.inv||[]).filter(function(x){return String(x).indexOf('gp_kit_')!==0;});
    roster.push(c);partyIds.push(c.id);
  });
  var gold=startGold();
  chosen.forEach(function(id){
    var c=byId(id);
    if(!imported&&c.lvl>1){var t=Rules.KIT_LEVELS.indexOf(c.lvl);if(t>=0)gold+=Rules.KIT_GOLD[t];}
  });
  if(imported&&imported.gold!=null)gold=imported.gold;
  var hub=MAPS[m.hub];
  var G={
    v:2,module:sel,done:(imported&&imported.done)||[],won:false,
    roster:roster,party:partyIds,gold:gold,
    map:m.hub,x:hub.start.x,y:hub.start.y,dir:hub.start.dir,
    time:8*60,march:0,
    flags:{},mods:{},seen:{},quests:{},ground:{},journal:[],bestiary:{},rumors:{},meta:{}
  };
  Game.setG(G);
  imported=null;custom=[];waiting=[];chosen=[];
  Game.show('game');
  Game.initSeen();
  Game.enterMap(m.hub,hub.start.x,hub.start.y,hub.start.dir,{fresh:true});
  Game.log('round','— '+m.code+' · '+m.name+' —');
  Game.log('',UI.esc(m.intro));
  Journal.note('Arrived at '+(hub.locName||hub.name)+'.','arrival');
  if(m.hint){Game.log('dim','Hint: '+UI.esc(m.hint));}
  Game.autosave();
  Game.hud();
}
/* ---- Import a company from a save slot (no write-back) ---- */
function importCompany(){
  UI.loadDialog();
  UI.close(UI.top()); // replaced by the import picker below
  var body=UI.el('div');
  ['auto','1','2','3'].forEach(function(k){
    var s=Game.readSlot(k);
    var row=UI.el('div','item');
    row.appendChild(UI.el('span',null,'Slot '+k+' — '+(s?(UI.esc((s.meta&&s.meta.leader)||'')+' · <span class=muted>'+UI.esc((s.meta&&s.meta.mod)||'')+' · '+UI.esc((s.meta&&s.meta.where)||'')+'</span>'):'<span class=muted>empty</span>')));
    var acts=UI.el('span','acts');
    var b=UI.el('button',null,'Bring');b.disabled=!s;
    b.onclick=function(){
      UI.close(entry);
      imported={roster:JSON.parse(JSON.stringify(s.roster||[])),party:(s.party||[]).slice(),gold:s.gold||0,done:(s.done||[]).slice()};
      waiting=imported.roster.map(function(c){return c.id;});chosen=[];
      assemble();
    };
    acts.appendChild(b);row.appendChild(acts);body.appendChild(row);
  });
  var entry=UI.modal({title:'Bring a Company from a Save',body:body,actions:[{label:'Cancel'}]});
}
/* ---- Campaign travel (menu → pick a module) ---- */
function travelMenu(){
  var m=MODULES[G.module];
  var body=UI.el('div');
  CAMPAIGNS.order.concat(Object.keys(MODULES).filter(function(id){return CAMPAIGNS.order.indexOf(id)<0;}))
  .forEach(function(id){
    var mod=MODULES[id];if(!mod)return;
    var row=UI.el('div','item');
    var avg=Math.round(G.party.reduce(function(a,pid){var c=UI.rosterById(pid);return a+((c&&c.lvl)||0);},0)/Math.max(1,G.party.length));
    var state=G.done.indexOf(id)>=0?'<span class="done">finished</span>':(id===G.module?'<b>current</b>':(avg<mod.levels[0]?'<span style="color:var(--bad)">under-level (party ~'+avg+' vs '+mod.levels[0]+'+)</span>':'open'));
    row.innerHTML='<span>'+UI.esc(mod.code+' '+mod.name)+' — '+state+'</span>';
    var acts=UI.el('span','acts');
    var b=UI.el('button',null,'Travel');b.disabled=id===G.module;
    b.onclick=function(){UI.closeAll();travel(id);};
    acts.appendChild(b);row.appendChild(acts);body.appendChild(row);
  });
  UI.modal({title:'Campaign — set out',body:body,actions:[{label:'Cancel'}]});
}
function travel(moduleId){
  var mod=MODULES[moduleId],hub=MAPS[mod.hub];
  G.module=moduleId;
  G.map=mod.hub;G.x=hub.start.x;G.y=hub.start.y;G.dir=hub.start.dir;
  G.time=14*1440+8*60;G.march=0;
  G.quests=G.quests||{};G.flags=G.flags||{};G.seen=G.seen||{};G.ground=G.ground||{};G.mods=G.mods||{};
  // heal, refresh, train to module level, keep roster/gear/coin/world progress
  var rng=new Rules.RNG((Math.random()*0xffffffff)>>>0);
  G.roster.forEach(function(c){
    if(c.dead)return;
    c.hp=c.maxhp;c.poison=null;c.fx={};c.layUsed=false;
    if(c.prep&&c.mem)Object.keys(c.prep).forEach(function(s){c.mem[s]=c.prep[s];});
    while(c.lvl<mod.lvl&&c.lvl<20)Rules.gainLevel(c,rng);
  });
  Game.closeStairsLoop();
  Game.show('game');
  Game.enterMap(mod.hub,hub.start.x,hub.start.y,hub.start.dir,{fresh:true});
  Game.log('round','— Traveled on to '+mod.code+': '+mod.name+' —');
  Game.log('',UI.esc(mod.intro));
  Journal.note('Set out for '+mod.name+'.','travel');
  Game.autosave();
  Game.hud();
}
function chooseBack(){Game.title();}
return{choose:choose,assemble:assemble,begin:begin,importCompany:importCompany,
  addCustom:addCustom,travelMenu:travelMenu,travel:travel,get sel(){return sel;}};
})();
