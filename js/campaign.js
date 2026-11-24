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
    else{if(MODULES[id].band===tab.band)out.push(id);}
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
  // Deterministic per campaign: the same module always yields the same
  // starting party rolls, so assemblies and playtests are reproducible.
  var m=MODULES[sel],mseed=2166136261;
  for(var si=0;si<sel.length;si++)mseed=Math.imul(mseed^sel.charCodeAt(si),16777619)>>>0;
  var rng=new Rules.RNG(mseed>>>0);
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
/* ================= Town services ================= */
function giver(){var m=MODULES[G.module];return (m.names&&m.names.hall)||'the hall';}
function modKey(){var m=MODULES[G.module];return m.rumors||G.module;}
function partyLive(){return UI.party().filter(function(c){return !c.dead&&c.hp>0;});}

function openService(loc){
  switch(loc.svc){
    case 'inn':return inn(loc);
    case 'tavern':return tavern(loc);
    case 'temple':return temple(loc);
    case 'hall':return hall(loc);
    case 'training':return training(loc);
    case 'armory':case 'general':case 'apothecary':return shop(loc);
    default:UI.toast('The door is business, but not yours today.');
  }
}

/* ---- Inn: 1 gp/member/night, wake 07:00, +3 hp, restore spells/hands ---- */
function restNight(){
  var cost=UI.party().length;
  if(G.gold<cost){UI.toast('The purse will not stretch that far.');return false;}
  G.gold-=cost;
  var day=Math.floor(G.time/1440);
  var wake=(day+1)*1440+7*60;
  G.time=wake>G.time?wake:G.time+1;
  G.march=0;
  UI.party().forEach(function(c){
    if(c.dead)return;
    if(c.hp>0)c.hp=Math.min(c.maxhp,c.hp+3);
    spendCuresOnWounded(c);
    if(c.prep&&c.mem)Object.keys(c.prep).forEach(function(s){c.mem[s]=c.prep[s];});
    c.layUsed=false;c.fx={};
  });
  UI.log('good','A bed, a basin, and dawn at the window: the company wakes at 07:00.');
  Game.autosave();UI.hud();UI.renderParty();
  return true;
}
function spendCuresOnWounded(c){
  // healers spend remaining prepared cures on the worst hurt before re-memorizing
  if(!c.prep)return;
  var hurt=UI.party().filter(function(p){return !p.dead&&p.hp<p.maxhp;}).sort(function(a,b){return a.hp/a.maxhp-b.hp/b.maxhp;});
  if(!hurt.length)return;
  ['clw','csw','ccw','heal'].forEach(function(sid){
    while((c.prep[sid]||0)>0&&(c.mem[sid]||0)>0){
      var w=hurt.find(function(p){return p.hp<p.maxhp;});if(!w)return;
      var amt=Rules.dice(sid==='clw'?'1d8':sid==='csw'?'2d8+1':sid==='ccw'?'3d8+3':'999');
      w.hp=Math.min(w.maxhp,w.hp+amt);
      if(sid!=='heal')c.mem[sid]--;else c.prep[sid]=0,c.mem[sid]=0;
      UI.log('spell',UI.esc(c.name)+' prays '+SPELLS[sid].n+' over '+UI.esc(w.name)+' (+'+amt+' hp).');
      if((c.mem[sid]||0)<=0)break;
    }
  });
}
function inn(loc){
  var cost=UI.party().length;
  UI.modal({title:loc.name,body:
    '<p>'+svcBlurb('inn')+'</p><p>Beds are <b>'+cost+' gp</b> a night for the company, breakfast at seven.</p>'+
    '<p class="muted">The purse holds '+G.gold+' gp.</p>',
    actions:[
    {label:'Take the beds ('+cost+' gp)',primary:1,disabled:G.gold<cost,on:function(en){restNight();}},
    {label:'Rest until healed',disabled:G.gold<cost,title:'Healers spend their prepared cures each morning',on:function(en){
      var nights=0;
      while(nights<60){
        var hurt=UI.party().some(function(c){return !c.dead&&c.hp<c.maxhp&&c.hp>0;});
        if(!hurt||G.gold<cost)break;
        restNight();nights++;
      }
      UI.log('dim',nights?(nights+' nights of beds and broth later.'):'No one needed the beds.');
    }},
    {label:'Change the company',title:'Send one to the bench, take one up, or dismiss',on:function(){companyManager();}},
    {label:'Come away'}]});
}
/* ---- Inn company manager: bench / take along / dismiss ---- */
function livingActive(){
  return G.party.filter(function(id){
    var c=G.roster.find(function(r){return r.id===id;});
    return c&&!c.dead&&c.hp>0;
  }).length;
}
function companyManager(){
  var acts=G.roster.map(function(c){
    var active=G.party.indexOf(c.id)>=0;
    return {label:c.name+' — '+c.hp+'/'+c.maxhp+' hp — '+(c.dead?'dead':(active?'travelling':'in reserve')),
      on:function(){memberDialog(c);}};
  });
  acts.push({label:'Done',primary:1,on:function(){Game.autosave();UI.hud();UI.renderParty();}});
  UI.modal({title:'The company — '+G.party.length+' travelling',body:'<p class="muted">Six may travel; the rest keep the inn room. Dismissed adventurers leave for good.</p>',actions:acts});
}
function memberDialog(c){
  var active=G.party.indexOf(c.id)>=0;
  UI.modal({title:c.name+' — '+c.race+' '+c.cls+' '+c.lvl,
    body:'<p class="muted">'+(c.dead?'Gone. Only the ledger remembers.':'Bench them to lighten the march, or dismiss them from the company entirely.')+'</p>',
    actions:[
    {label:'Take them along',disabled:active||c.dead||G.party.length>=6,
      on:function(){G.party.push(c.id);UI.log('dim',c.name+' joins the travelling company.');companyManager();}},
    {label:'Leave them behind',disabled:!active||livingActive()<=1,
      on:function(){G.party.splice(G.party.indexOf(c.id),1);UI.log('dim',c.name+' stays behind.');companyManager();}},
    {label:'Dismiss from the company',disabled:active&&livingActive()<=1,title:'The company must keep at least one living soul on the road',
      on:function(){
        var i=G.party.indexOf(c.id);if(i>=0)G.party.splice(i,1);
        G.roster.splice(G.roster.indexOf(c),1);
        UI.log('bad',c.name+' is paid off at the bar and walks out of the story.');
        Game.autosave();UI.hud();UI.renderParty();
        companyManager();
      }},
    {label:'Back',primary:1,on:function(){companyManager();}}]});
}
function svcBlurb(s){
  return {inn:'Warmth, beds and rumours behind the bar.',tavern:'A long room going quietly loud.',
    armory:'Steel hung in ranks, oiled and honest.',general:'Shelves of cord, cure and small mercies.',
    apothecary:'Bottles, simples and the smell of camphor.',temple:'The Dawn\u2019s quiet, and water that helps.',
    hall:'The board, the ledger, and the work of the place.',training:'A yard of sawdust, straw and consequence.'}[s]||'A door of business.';
}

/* ---- Tavern: 2 gp for a round and a rumour ---- */
function tavern(loc){
  var key=modKey(),list=RUMORS[key]||[];
  if(!G.rumors)G.rumors={};
  var seen=G.rumors[key]||0;
  var body=UI.el('div');
  body.innerHTML='<p>'+svcBlurb('tavern')+' A round costs <b>2 gp</b>.</p>'+
    (seen>=list.length?'<p class="muted">The talk has turned to weather and prices.</p>':'<p class="muted">Someone at the long table is mid-story.</p>');
  UI.modal({title:loc.name,body:body,actions:[
    {label:'Buy a round (2 gp)',primary:1,disabled:G.gold<2||seen>=list.length,on:function(){
      G.gold-=2;G.rumors[key]=seen+1;
      var r=list[seen];
      UI.log('spell','Rumour: '+UI.esc(r));
      Journal.note('Tavern rumour: '+r,'rumor');
      Game.autosave();UI.hud();
      UI.toast('The company has heard it now; buy elsewhere or later.');
    }},
    {label:'Nurse a dry cup'}]});
}

/* ---- Temple ---- */
function temple(loc){
  var dead=UI.party().filter(function(c){return c.dead&&!c.lost;});
  var poisoned=UI.party().filter(function(c){return c.poison&&!c.dead;});
  var hurt=UI.party().filter(function(c){return !c.dead&&c.hp<c.maxhp;});
  var entry;
  function svcRow(label,price,enabled,why,on){
    var row=UI.el('div','item');
    row.innerHTML='<span>'+UI.esc(label)+' <b>'+price+' gp</b></span>';
    var acts=UI.el('span','acts');
    var b=UI.el('button',null,'Do it');b.disabled=!enabled||G.gold<price;b.title=enabled?(G.gold<price?'Not enough gold':''):why;
    b.onclick=on;acts.appendChild(b);row.appendChild(acts);return row;
  }
  function render(){
    var body=UI.el('div');
    body.innerHTML='<p>'+svcBlurb('temple')+' The purse holds '+G.gold+' gp.</p>';
    if(hurt.length)body.appendChild(svcRow('Cure light wounds on the worst hurt',20,true,'',function(){
      G.gold-=20;var w=hurt.sort(function(a,b){return a.hp/a.maxhp-b.hp/b.maxhp;})[0];
      w.hp=Math.min(w.maxhp,w.hp+Rules.dice('1d8'));UI.log('spell','The temple cures '+UI.esc(w.name)+'.');re();
    }));
    if(hurt.length>1)body.appendChild(svcRow('Cure serious wounds on the worst hurt',60,true,'',function(){
      G.gold-=60;var w=hurt.sort(function(a,b){return a.hp/a.maxhp-b.hp/b.maxhp;})[0];
      w.hp=Math.min(w.maxhp,w.hp+Rules.dice('2d8+1'));UI.log('spell','The temple mends '+UI.esc(w.name)+'.');re();
    }));
    if(poisoned.length)body.appendChild(svcRow('Neutralize poison ('+poisoned[0].name+')',80,true,'',function(){
      G.gold-=80;poisoned[0].poison=null;UI.log('good',UI.esc(poisoned[0].name)+' is cleansed.');poisoned=poisoned.filter(function(){return false;});re();
    }));
    if(dead.length)body.appendChild(svcRow('Raise dead ('+dead[0].name+')',400,!dead[0].lost,'That spirit is beyond recall',function(){
      G.gold-=400;var c=dead.shift();
      var roll=Rules.play.d20(),need=Rules.abilityScore(c,'con');
      if(roll<=need){c.dead=false;c.hp=1;c.scores.con=Math.max(3,c.scores.con-1);c.hp=1;
        UI.log('good',UI.esc(c.name)+' comes back at a whisper of life (CON '+roll+' \u2264 '+need+').');
        Journal.note(c.name+' was raised at the temple.','raise');}
      else{c.lost=true;UI.log('bad','The rite fails (CON '+roll+' > '+need+'). '+UI.esc(c.name)+'\u2019s spirit is beyond ordinary recall.');}
      re();
    }));
    if(!hurt.length&&!poisoned.length&&!dead.length)body.innerHTML+='<p class="muted">The temple has no work for you today. (It will cure, cleanse, and — for a price and a CON test — call back the fallen.)</p>';
    return body;
  }
  function re(){Game.autosave();UI.hud();if(entry){entry.body.innerHTML='';entry.body.appendChild(render());}}
  entry=UI.modal({title:loc.name,body:render(),actions:[{label:'Come away',primary:1}]});
}

/* ---- Hall: pay reportable work, then offer the next ---- */
function questDoneEvent(qid){
  var mod=MODULES[G.module],found=false;
  mod.maps.forEach(function(mid){var mm=MAPS[mid];if(!mm)return;
    Object.keys(mm.ev||{}).forEach(function(k){
      var e=mm.ev[k];
      if(e.enc&&e.enc.quest===qid&&G.flags[mid+':'+k]==='done')found=true;});});
  return found;
}
function questCarried(q){
  if(!q.needItem)return true;
  if(!questDoneEvent(q.__id)){
    // deed-event placement (items granted by text events)
    var placed=false;
    MODULES[G.module].maps.forEach(function(mid){var mm=MAPS[mid];if(!mm||mm.overland)return;
      Object.keys(mm.ev||{}).forEach(function(k){var e=mm.ev[k];
        if(e.text&&e.items&&e.items.indexOf(q.needItem)>=0&&G.flags[mid+':'+k]==='done')placed=true;});});
    if(!placed)return false;
  }
  return UI.party().some(function(c){return !c.dead&&c.inv.indexOf(q.needItem)>=0;});
}
function consumeQuestItem(q){
  if(!q.needItem)return;
  for(var i=0;i<G.party.length;i++){
    var c=UI.rosterById(G.party[i]);
    if(!c)continue;   // the pack yields its prize, bearer or no bearer
    var j=c.inv.indexOf(q.needItem);
    if(j>=0){c.inv.splice(j,1);return;}
  }
}
function payQuest(qid){
  var q=QUESTS[qid];
  G.quests[qid].done=1;
  G.gold+=q.gold;
  var each=Math.max(5,5*Math.round(q.xp*0.25/5));
  UI.party().forEach(function(c){
    if(c.dead)return;
    var amt=Rules.xpAward(c,each);
    c.xp+=amt;
  });
  UI.log('gold',giver()+' pays '+q.gold+' gp, and '+each+' XP each for “'+UI.esc(q.name)+'”.');
  Journal.note('Reported “'+q.name+'” — paid '+q.gold+' gp.','report');
  if(q.final){
    G.won=true;
    if(G.done.indexOf(G.module)<0)G.done.push(G.module);
    Journal.note('Module complete: '+MODULES[G.module].name+'.','complete');
  }
  Game.autosave();UI.hud();
}
function hall(loc){
  var mod=MODULES[G.module];
  var reportable=Journal.commissions().filter(function(x){return x.reportable;});
  // final commission paid last among reportable
  reportable.sort(function(a,b){return (a.q.final?1:0)-(b.q.final?1:0);});
  var body=UI.el('div');
  body.innerHTML='<p>'+svcBlurb('hall')+' '+UI.esc(giver())+' is at the board.</p>';
  if(reportable.length){
    reportable.forEach(function(x){
      var row=UI.el('div','item');
      row.innerHTML='<span><b>'+UI.esc(x.q.name)+'</b><br><span class=muted>'+UI.esc(x.q.done)+'</span></span>'+
        '<span class=gold>'+x.q.gold+' gp · XP</span>';
      body.appendChild(row);
    });
    body.appendChild(UI.el('p','gold','Report it all?'));
  }
  UI.modal({title:loc.name+' — '+giver(),body:body,actions:
    reportable.length?[{label:'Report and collect',primary:1,on:function(){
      reportable.forEach(function(x){consumeQuestItem(x.q);payQuest(x.id);});
      var fin=reportable.some(function(x){return x.q.final;});
      if(fin)epilogue();else offersLoop(mod);
    }}]:[],closable:true});
  if(!reportable.length)offersLoop(mod);
}
function offersLoop(mod){
  var all=mod.quests.concat(mod.side||[]);
  var next=all.find(function(qid){return !G.quests[qid];});
  if(!next){UI.toast('The board is empty for now; the work you know is work you owe.');return;}
  var q=QUESTS[next];
  UI.modal({title:giver()+' offers a commission',body:
    '<p><b>'+UI.esc(q.name)+'</b> '+(q.side?'<span class=muted>side</span>':'<span class=gold>main</span>')+'</p>'+
    '<p>'+UI.esc(q.lead)+'</p><p class=spell>'+UI.esc(q.goal)+'</p>'+
    '<p>'+UI.esc(q.offer)+'</p>',
    actions:[
      {label:'Accept',primary:1,on:function(){
        G.quests[next]={offered:1,t:G.time};
        UI.log('gold','Accepted: '+UI.esc(q.name)+'.');
        Journal.note('Commission accepted: '+q.name+'. — “'+q.goal+'"','quest');
        Game.autosave();
        offersLoop(mod);   // offer the rest in sequence
      }},
      {label:'Not now'}]});
}
function epilogue(){
  var mod=MODULES[G.module];
  var next=mod.next&&MODULES[mod.next];
  var more=next&&G.done.indexOf(mod.next)<0;
  UI.modal({title:mod.code+' complete — '+mod.name,closable:false,body:
    '<p>'+UI.esc(mod.victory)+'</p>'+
    (more?'<p class=muted>'+UI.esc(next.code)+': '+UI.esc(next.name)+' awaits beyond the maps you know.</p>':'<p class=muted>The named saga is ended; the generated roads remain.</p>'),
    actions:[
      more?{label:'Set out →',primary:1,on:function(){travelMenu();}}:{label:'Stay a while',primary:!more}]});
}

/* ---- Training hall ---- */
function training(loc){
  var body=UI.el('div');
  function trainRow(c){
    var row=UI.el('div','item');
    var cost=Rules.trainCost(c.lvl);
    row.innerHTML='<span><b>'+UI.esc(c.name)+'</b> <span class=muted>'+Rules.CLASSES[c.cls].name+' '+c.lvl+' → '+(c.lvl+1)+'</span><br>'+
      '<span class=muted>'+c.xp+' / '+Rules.nextXP(c)+' xp · '+cost+' gp</span></span>';
    var acts=UI.el('span','acts');
    var b=UI.el('button',null,'Train');b.disabled=!Rules.canTrain(c)||G.gold<cost;
    b.title=!Rules.canTrain(c)?'Not enough XP yet':(G.gold<cost?'Not enough gold':'');
    b.onclick=function(){
      G.gold-=cost;
      var before={lvl:c.lvl,hp:c.maxhp};
      var rng=new Rules.RNG((Math.random()*0xffffffff)>>>0);
      Rules.gainLevel(c,rng);
      UI.log('good',UI.esc(c.name)+' trains to level '+c.lvl+' (+'+(c.maxhp-before.hp)+' hp).');
      if(c.cls==='M')pickMageSpell(c);
      else{if(c.prep&&c.mem)Object.keys(c.prep).forEach(function(s){c.mem[s]=c.prep[s];});Game.autosave();render2();}
    };
    acts.appendChild(b);row.appendChild(acts);return row;
  }
  function render2(){
    var b=UI.el('div');
    b.innerHTML='<p>'+svcBlurb('training')+' Training is <b>100 gp × level</b>, one level per session, XP earned in the field.</p><p class=muted>The purse holds '+G.gold+' gp.</p>';
    var any=UI.party().some(function(c){return !c.dead&&c.lvl<20;});
    UI.party().forEach(function(c){if(!c.dead&&c.lvl<20)b.appendChild(trainRow(c));});
    if(!any)b.innerHTML+='<p class=muted>No one in the company can learn more today.</p>';
    return b;
  }
  var entry=UI.modal({title:loc.name,body:render2(),actions:[{label:'Leave the yard',primary:1}]});
  // re-render helper for mage spell choice completion
  entry._re=render2;
}
function pickMageSpell(c){
  var known=c.book||[];
  var maxL=Rules.maxRing('M',c.lvl);
  var pool=Object.keys(SPELLS).filter(function(s){return SPELLS[s].c==='M'&&SPELLS[s].l<=maxL&&known.indexOf(s)<0;});
  if(!pool.length){Game.autosave();UI.hud();return;}
  var selEl=UI.el('select');selEl.style.cssText='background:#10121a;border:1px solid var(--edge2);color:var(--ink);padding:6px;width:100%;font:inherit';
  pool.sort(function(a,b){return SPELLS[a].l-SPELLS[b].l||SPELLS[a].n.localeCompare(SPELLS[b].n);})
    .forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent='Ring '+SPELLS[s].l+' — '+SPELLS[s].n;selEl.appendChild(o);});
  var body=UI.el('div');
  body.appendChild(UI.el('p',null,UI.esc(c.name)+' copies one new spell from the abacus of rings you can now reach.'));
  body.appendChild(selEl);
  UI.modal({title:'A new spell for the book',closable:false,body:body,actions:[
    {label:'Copy it',primary:1,on:function(){
      known.push(selEl.value);
      if(!c.prep)c.prep={};if(!c.mem)c.mem={};
      var ring=SPELLS[selEl.value].l;
      var slots=Rules.slotsFor('M',c.lvl,Rules.abilityScore(c,'int'));
      if((slots[ring-1]||0)>0&&!c.prep[selEl.value])c.prep[selEl.value]=1;
      UI.log('spell',UI.esc(c.name)+' copies '+SPELLS[selEl.value].n+' into the book.');
      Game.autosave();UI.hud();
    }}]});
}

/* ---- Shops ---- */
function classOK(c,it){
  if(!it)return false;
  if(it.t==='a'||it.t==='s'){
    if(c.cls==='M')return false;                    // mages: no armor, no shield
    if(c.cls==='T'&&it.ac<7)return false;           // thieves: leather at best
    if(c.cls==='R'&&it.ac<6)return false;           // rangers: up to studded
  }
  if(it.t==='w'||it.t==='r'){
    if(c.cls==='M')return ['dagger','staff','dart','sling'].indexOf(it.id)>=0;
    if(c.cls==='C')return ['mace','flail','warhammer','club','quarterstaff'].indexOf(it.id)>=0;
    if(c.cls==='T')return ['bastardsword','twohandsword','battleaxe','spear','poleaxe','falchion','halberd'].indexOf(it.id)<0;
  }
  return true;
}
function shopStock(loc){
  var m=MODULES[G.module];
  var key=(m.shops&&m.shops[loc.svc])||loc.svc;
  var s=SHOPS[key];
  if(!s){ // fall back to kind default
    s=SHOPS[loc.svc]||{stock:[],name:loc.name};
  }
  return s;
}
function shop(loc){
  var stock=shopStock(loc);
  var buyer=UI.party().find(function(c){return !c.dead;});
  var body=UI.el('div');
  var entry;
  function render(){
    var b=UI.el('div');
    var buyers=UI.party().filter(function(c){return !c.dead;});
    var sel=UI.el('select');sel.style.cssText='background:#10121a;border:1px solid var(--edge2);color:var(--ink);padding:6px;font:inherit';
    buyers.forEach(function(c){var o=document.createElement('option');o.value=c.id;o.textContent=c.name+' ('+Rules.CLASSES[c.cls].name+')';if(buyer&&c.id===buyer.id)o.selected=1;sel.appendChild(o);});
    sel.onchange=function(){buyer=UI.rosterById(sel.value);entry.body.innerHTML='';entry.body.appendChild(render());};
    var kv=UI.el('div','kv');kv.appendChild(UI.el('b',null,'Buyer'));
    var holder=UI.el('span');kv.appendChild(holder);b.appendChild(kv);
    holder.appendChild(sel);
    b.appendChild(UI.el('p','muted','Purse '+G.gold+' gp — prices; sale is half price, gems and jewelry full.'));
    b.appendChild(UI.el('h3',null,'Stock'));
    (stock.stock||[]).forEach(function(id){
      var it=item(id);if(!it)return;
      var ok=buyer?classOK(buyer,it):true;
      var row=UI.el('div','item');
      row.innerHTML='<span>'+(ok?'':'<span style="color:var(--bad)">✕ </span>')+UI.esc(it.n)+' <span class=muted>'+(it.d||it.ac!=null?'':'')+'</span></span><span class=gold>'+it.price+' gp</span>';
      var acts=UI.el('span','acts');
      var buy=UI.el('button',null,'Buy');
      buy.disabled=!ok||G.gold<it.price;
      buy.title=!ok?'Not for '+((buyer&&Rules.CLASSES[buyer.cls].name)||'this class'):(G.gold<it.price?'Not enough gold':'');
      buy.onclick=function(){
        if(!buyer)return;
        G.gold-=it.price;
        buyer.inv.push(id);
        UI.log('good',UI.esc(buyer.name)+' buys '+UI.esc(it.n)+'.');
        // auto-equip if the slot is empty and it is wearable
        var slot=it.t==='w'?'melee':it.t==='r'?'missile':it.t==='a'?'armor':it.t==='s'?'shield':(it.t==='g'?'charm':null);
        if(slot&&ok&&!buyer.eq[slot]){buyer.eq[slot]=id;buyer.inv.splice(buyer.inv.indexOf(id),1);UI.log('dim','Worn at once.');}
        Game.autosave();UI.hud();entry.body.innerHTML='';entry.body.appendChild(render());
      };
      acts.appendChild(buy);row.appendChild(acts);b.appendChild(row);
    });
    if(buyer){
      b.appendChild(UI.el('h3',null,'Sell from '+UI.esc(buyer.name)+'\u2019s pack'));
      var pack=buyer.inv.map(function(id,i){
        var it=item(id);if(!it)return '';
        if(it.t==='q')return '<div class=item><span class=q>'+UI.esc(it.n)+' <span class=muted>(quest — unsellable)</span></span></div>';
        var worth=it.t==='v'?it.price:Math.floor((it.price||0)/2);
        if(!worth)return '<div class=item><span>'+UI.esc(it.n)+' <span class=muted>(no market)</span></span></div>';
        return '<div class=item><span>'+UI.esc(it.n)+'</span><span class="acts"><span class=gold>'+worth+' gp</span><button data-sell="'+id+'">Sell</button></span></div>';
      }).join('')||'<p class=muted>Nothing to sell.</p>';
      var sellWrap=UI.el('div');sellWrap.innerHTML=pack;
      sellWrap.addEventListener('click',function(e){
        var btn=e.target.closest('button[data-sell]');if(!btn)return;
        var id=btn.dataset.sell,j=buyer.inv.indexOf(id);if(j<0)return;
        var it=item(id);var worth=it.t==='v'?it.price:Math.floor((it.price||0)/2);
        buyer.inv.splice(j,1);G.gold+=worth;
        UI.log('dim','Sold '+UI.esc(it.n)+' for '+worth+' gp.');
        Game.autosave();UI.hud();entry.body.innerHTML='';entry.body.appendChild(render());
      });
      b.appendChild(sellWrap);
    }
    return b;
  }
  entry=UI.modal({title:stock.name||loc.name,body:render(),actions:[{label:'Close',primary:1}]});
}

return{choose:choose,assemble:assemble,begin:begin,importCompany:importCompany,
  addCustom:addCustom,travelMenu:travelMenu,travel:travel,openService:openService,get sel(){return sel;}};
})();
