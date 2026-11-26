/* Emberfall — js/ui.js
 * DOM helpers, modal stack, log, command bar, party drawer, HUD, save/load
 * and menu dialogs, help. Screens: title lives in game.js; chooser/assembly
 * in campaign.js. */
'use strict';
var UI=(function(){
var stack=[];
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function $(id){return document.getElementById(id);}

/* ---------------- Modal stack ---------------- */
function modal(opts){
  var host=$('modals');host.classList.add('on');
  var back=el('div','mback');
  var m=el('div','modal');
  if(opts.title)m.appendChild(el('h3',null,esc(opts.title)));
  var body=el('div','body');
  if(typeof opts.body==='string')body.innerHTML=opts.body;else if(opts.body)body.appendChild(opts.body);
  m.appendChild(body);
  var bar=el('div','bar');
  var entry={root:m,back:back,closable:opts.closable!==false,onKey:opts.onKey,bar:bar,body:body};
  (opts.actions||[{label:'Close'}]).forEach(function(a){
    var b=el('button',a.cls||(a.primary?'primary':''),esc(a.label));
    b.disabled=!!a.disabled;b.title=a.title||a.label;
    b.onclick=function(){if(a.on)a.on(entry);if(a.keepOpen)return;close(entry);};
    bar.appendChild(b);
  });
  if(opts.closable!==false){var x=el('button',null,'Esc');x.title='Close';x.onclick=function(){close(entry);};bar.appendChild(x);}
  m.appendChild(bar);
  back.addEventListener('click',function(){if(entry.closable)close(entry);});
  host.appendChild(back);host.appendChild(m);
  stack.push(entry);
  if(opts.numberKeys!==false)numberButtons(m);
  var prim=bar.querySelector('.primary');if(prim&&!prim.disabled&&opts.focusPrimary!==false)prim.focus();
  if(opts.onOpen)opts.onOpen(entry);
  return entry;
}
function close(entry){
  var i=stack.indexOf(entry);if(i<0)return;
  stack.splice(i,1);entry.root.remove();entry.back.remove();
  if(!stack.length)$('modals').classList.remove('on');
}
function closeAll(){stack.slice().forEach(close);}
function closeTop(){if(stack.length)close(stack[stack.length-1]);}
function top(){return stack[stack.length-1]||null;}
document.addEventListener('keydown',function(e){
  var t=top();if(!t)return;
  var ae=document.activeElement;
  if(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName))return;
  if(e.key==='Enter'){
    var p=t.bar.querySelector('.primary');
    if(p&&!p.disabled){e.preventDefault();e.__uiTaken=true;p.click();}
  }else if(/^[1-9]$/.test(e.key)){
    var bs=dialogButtons(t.root);
    var nb=bs[+e.key-1];
    if(nb){e.preventDefault();if(e.stopPropagation)e.stopPropagation();e.__uiTaken=true;if(nb.click)nb.click();else nb.onclick({});}
  }else if(e.key==='Escape'){
    if(t.closable){e.preventDefault();e.__uiTaken=true;close(t);}else if(t.onKey)t.onKey(e);
  }else if(t.onKey){e.__uiTaken=true;t.onKey(e);}
},true);
/* Spoils summary: chest hauls and battle awards get their own parchment. */
function spoils(opts){
  opts=opts||{};
  var rows=[];
  if(opts.gold)rows.push('<div class=item><span><b>◆ '+opts.gold+' gp</b></span><span class=muted>to the purse</span></div>');
  (opts.items||[]).forEach(function(t){
    rows.push('<div class=item><span>'+esc(t)+'</span><span class=muted>'+
      esc((opts.carriers&&opts.carriers[t])?'carried by '+opts.carriers[t]:'into the pack')+'</span></div>');
  });
  (opts.lines||[]).forEach(function(l){rows.push('<p class=muted style="margin:6px 0">'+l+'</p>');});
  var body=el('div',null,rows.join('')||'<p class=muted>Nothing but mud and memory.</p>');
  return modal({title:opts.title||'Spoils',body:body,
    actions:[{label:opts.action||'Take it all',primary:1}]});
}

var toastT=null;
function toast(msg){
  var host=$('modals');var t=$('ui-toast');
  if(!t){t=el('div');t.id='ui-toast';t.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#171922ee;border:1px solid #e3b54a;color:#e9e2cf;padding:8px 18px;border-radius:6px;z-index:99;max-width:80vw;text-align:center';}
  t.textContent=msg;host.appendChild(t);
  clearTimeout(toastT);toastT=setTimeout(function(){t.remove();},2400);
}

/* ---------------- Log (transient, 250 lines) ---------------- */
function log(kind,msg){
  var box=$('log');if(!box)return;
  var p=el('p',kind||'');p.innerHTML=msg;
  box.appendChild(p);
  while(box.children.length>250)box.removeChild(box.firstChild);
  box.scrollTop=box.scrollHeight;
}

/* ---------------- HUD ---------------- */
function hud(){
  if(!window.G)return;
  var mod=MODULES[G.module];
  var m=MAPS[G.map];
  $('location').textContent=(mod?mod.name+' · ':'')+(m?m.name:'');
  $('ahead').textContent=Game.aheadText();
  /* The clock carries the hour's glyph. The clock has always been running - it is
     only recently that anything out of doors agreed with it, and a player who
     never notices the sky should still be able to read the hour at a glance. */
  var dl=Look.daylight(G.time);
  $('clock').textContent=(dl.night?'\u263E':(dl.dusk>0.35?'\u263C':'\u2600'))+' '+Game.fmtTime(G.time);
  $('gold').textContent=G.gold+' gp';
  var pips=$('pips');pips.innerHTML='';
  party().forEach(function(c){
    var i=el('i');
    if(c.dead)i.className='dead';else if(c.hp>0)i.className='ok';
    i.style.background=c.dead?'':colorOf(c);
    i.title=c.name+' — '+c.hp+'/'+c.maxhp+' hp';
    pips.appendChild(i);
  });
}
function party(){return (G.party||[]).map(function(id){return rosterById(id);}).filter(Boolean);}
function rosterById(id){return (G.roster||[]).find(function(c){return c.id===id;})||null;}
function colorOf(c){return c.color||'#9a917c';}

/* ---------------- Party drawer ---------------- */
function renderParty(){
  var box=$('party');if(!box||!G)return;
  box.innerHTML='';
  party().forEach(function(c,idx){
    var row=el('div','mrow'+(c.dead?' dead':''));
    var pc=el('canvas');pc.width=44;pc.height=52;
    pc.title=c.name+' — '+Rules.RACES[c.race].name+' '+Rules.CLASSES[c.cls].name+' · '+c.hp+'/'+c.maxhp+' hp';
    row.appendChild(pc);
    Figures.portrait(c,pc);
    var col=el('div','mcol');
    var nm=el('div');
    nm.innerHTML='<strong>'+esc(c.name)+'</strong> <span class="muted">'+esc(Rules.RACES[c.race].name+' '+Rules.CLASSES[c.cls].name+' '+c.lvl)+'</span>';
    col.appendChild(nm);
    var bar=el('div','bar');var fill=el('i');
    fill.style.width=Math.max(0,Math.round(100*c.hp/Math.max(1,c.maxhp)))+'%';
    bar.appendChild(fill);col.appendChild(bar);
    col.appendChild(el('div','mini',
      esc(c.hp+'/'+c.maxhp+' hp · AC '+Rules.theAC(c)+' · THAC0 '+Rules.THAC0(c.cls,c.lvl)+
      (c.dead?' · fallen':c.hp<=0?' · down':''))));
    // spell pips: filled = ready (mem), hollow = prepared-for-next-rest (prep)
    if(c.cls==='M'||c.cls==='C'||c.cls==='P'){
      var slots=Rules.slotsFor(c.cls,c.lvl,c.cls==='M'?Rules.abilityScore(c,'int'):c.cls==='C'?Rules.abilityScore(c,'wis'):0);
      var html='';
      slots.forEach(function(n,r){if(!n)return;
        var ready=0,prep=0;
        if(c.mem)Object.keys(c.mem).forEach(function(s){if(SPELLS[s]&&SPELLS[s].l===r+1)ready+=c.mem[s];});
        if(c.prep)Object.keys(c.prep).forEach(function(s){if(SPELLS[s]&&SPELLS[s].l===r+1)prep+=c.prep[s];});
        for(var i=0;i<n;i++)html+='<span class="sp'+(i<ready?' on':'')+'" title="Ring '+(r+1)+' copy"></span>';
        for(var j=0;j<Math.max(0,prep-ready);j++)html+='<span class="sp" style="opacity:.35" title="prepared, not rested"></span>';
      });
      if(html)col.appendChild(el('div','mini',html));
    }
    row.appendChild(col);
    var act=el('div','mini');act.style.cssText='display:flex;flex-direction:column;gap:4px;align-items:flex-end';
    var b=el('button',null,'Sheet');b.style.cssText='padding:2px 8px;min-height:0;font-size:11px';
    b.title='Open ' +c.name+'\u2019s sheet ('+(idx+1)+')';
    b.onclick=function(){sheet(c);};
    act.appendChild(b);row.appendChild(act);
    box.appendChild(row);
  });
}
var partyOpen=false;
function toggleParty(){
  partyOpen=!partyOpen;
  try{localStorage.setItem('emberfall.party',partyOpen?'1':'0');}catch(e){}
  $('party').classList.toggle('hidden',!partyOpen);
  $('party').classList.toggle('open',partyOpen);
  if(partyOpen)renderParty();
}
function initPartyPref(){
  try{partyOpen=localStorage.getItem('emberfall.party')==='1';}catch(e){partyOpen=false;}
  $('party').classList.toggle('hidden',!partyOpen);
  $('party').classList.toggle('open',partyOpen);
}

/* ---------------- Character sheet (core readout + march) ---------------- */
function sheet(c){
  if(!c)return;
  var R=Rules;
  var rows=[];
  rows.push(['Identity',esc(c.name)+' · '+R.RACES[c.race].name+' '+R.CLASSES[c.cls].name+' · '+R.ALIGNMENTS[c.align]]);
  rows.push(['Experience',c.xp+' / next '+ (R.nextXP(c)===Infinity?'—':R.nextXP(c)) +(R.canTrain(c)?' · <b>ready to train</b>':'')]);
  var ab=R.ABIL.map(function(k){
    var v=R.abilityScore(c,k);
    var adjv=k==='str'?R.strAdj(v,c.strx||0).hit:k==='dex'?R.dexAdj(v).ac:k==='con'?R.conAdj(v):k==='int'?R.intAdj(v).mod:k==='wis'?R.wisAdj(v):R.chaAdj(v);
    return esc(R.ABIL_NAME[k].slice(0,3).toUpperCase()+' '+(k==='str'?R.strDisplay(v,c.strx||0):v)+' ('+(adjv>=0?'+':'')+adjv+')');
  }).join(' · ');
  rows.push(['Abilities',ab]);
  rows.push(['Vitals',c.hp+' / '+c.maxhp+' hp · AC '+R.theAC(c)+' (armor '+R.armorAC(c)+(R.shieldAC(c)?' shield −'+R.shieldAC(c):'')+', dex −'+R.dexAdj(R.abilityScore(c,'dex')).ac+') · THAC0 '+R.THAC0(c.cls,c.lvl)+' · MV '+R.RACES[c.race].mv]);
  var st=R.saveTargets(R.CLASSES[c.cls].save,c.lvl);
  rows.push(['Saves',R.SAVE_NAMES.map(function(n,i){return n.split(' ')[0]+' '+st[i];}).join(' · ')]);
  var w=typeof item==='function'?item(c.eq&&c.eq.melee):null;
  rows.push(['Melee',(w?esc(w.n)+' (1d… '+esc(w.d)+')':'unarmed 1d2')+' · hit bonus '+(R.strOf(c).hit+(c.spec&&w&&w.fam===c.spec?1:0))+' · dmg +'+(R.strOf(c).dmg+(c.spec&&w&&w.fam===c.spec?2:0))]);
  var eqRows=['melee','missile','armor','shield','ring1','ring2','cloak','boots','gloves','belt','neck','charm'].map(function(sl){
    var it=item(c.eq[sl]);return it?esc(sl)+': '+esc(it.n):'';}).filter(Boolean).join('<br>')||'<span class=muted>—</span>';
  rows.push(['Equipped',eqRows]);
  var inv=(c.inv||[]).map(function(id){var it=item(id);return it?'<div class=item><span>'+esc(it.n)+
    (it.chargesLeft!=null?' <span class=muted>'+it.chargesLeft+' chr</span>':'')+
    (it.pieces!=null?' <span class=muted>'+(it.piecesLeft!=null?it.piecesLeft:it.pieces)+' of '+it.pieces+' left</span>':'')+
    '</span><span class="acts">'+
    /* Ammo is spent, not worn: an arrow in the missile slot is a mistake waiting. */
    ((it.t==='w'||it.t==='a'||it.t==='s'||it.t==='r'||it.t==='g')&&!it.ammo?'<button data-eq="'+c.id+'|'+id+'" title="'+esc(it.n)+' — equip and ready it">Wear</button>':'')+
    (it.t==='p'||it.t==='x'||it.t==='d'?'<button data-use="'+c.id+'|'+id+'" title="'+esc(it.n)+' — drink, read or trigger it now">Use</button>':'')+
    (it.t==='q'?'':'<button data-drop="'+c.id+'|'+id+'" title="'+esc(it.n)+' — leave it in the pack pile">Drop</button>')+'</span></div>':'';}).join('')||'<span class=muted>Empty pack</span>';
  // Mage spellbook: re-prepare choices freely — ready (mem) copies never move until rest.
  var prepHtml='';
  if(c.cls==='M'&&c.book&&c.book.length){
    var slots3=R.slotsFor('M',c.lvl,R.abilityScore(c,'int'));
    c.book.slice().sort(function(a,b){return ((SPELLS[a]?SPELLS[a].l:9)-(SPELLS[b]?SPELLS[b].l:9))||SPELLS[a].n.localeCompare(SPELLS[b].n);}).forEach(function(sp){
      var def=SPELLS[sp];if(!def)return;
      var mem3=(c.mem&&c.mem[sp])||0,prep=(c.prep&&c.prep[sp])||0;
      var used=0;Object.keys(c.prep||{}).forEach(function(s){if(SPELLS[s]&&SPELLS[s].l===def.l)used+=c.prep[s];});
      var room=(slots3[def.l-1]||0)-used;
      prepHtml+='<div class=item><span>'+esc(def.n)+' <span class=muted>ring '+def.l+' · ready '+mem3+' · laid out '+prep+(room>0?' · '+(def.l)+'-ring room '+room:'')+'</span></span><span class="acts">'+
        '<button data-prep="+|'+sp+'"'+(room<=0?' disabled title="No room left in ring '+def.l+'"':' title="Lay out one more copy for the next rest"')+'>Prepare</button>'+
        (prep>0?'<button data-prep="-|'+sp+'" title="Put this copy back in the book">Unprepare</button>':'')+'</span></div>';
    });
  }
  var wrap=el('div');
  wrap.innerHTML='<table>'+rows.map(function(r){return '<tr><th>'+r[0]+'</th><td>'+r[1]+'</td></tr>';}).join('')+'</table>'+
    (prepHtml?'<h3 style="color:var(--gold);margin-top:10px">Spellbook — lay out for the next rest</h3>'+prepHtml:'')+
    '<h3 style="color:var(--gold);margin-top:10px">Pack</h3>'+inv;
  var entry=modal({title:c.name+' — Sheet',body:wrap,actions:[{label:'Close',primary:1}],onOpen:function(){
    var cv=el('canvas');cv.width=76;cv.height=98;
    cv.style.cssText='float:left;margin:2px 14px 6px 2px;width:76px;height:98px';
    wrap.insertBefore(cv,wrap.firstChild);
    try{Figures.portrait(c,cv);}catch(e){}
  }});
  wrap.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.eq){var p=b.dataset.eq.split('|');Game.equip(UI.rosterById(p[0]),p[1]);close(entry);sheet(UI.rosterById(p[0]));}
    if(b.dataset.use){var p2=b.dataset.use.split('|');Game.usePackItem(UI.rosterById(p2[0]),p2[1]);close(entry);sheet(UI.rosterById(p2[0]));}
    if(b.dataset.drop){var q=b.dataset.drop.split('|');Game.drop(UI.rosterById(q[0]),q[1]);close(entry);sheet(UI.rosterById(q[0]));}
    if(b.dataset.prep){
      var pp=b.dataset.prep.split('|'),op=pp[0],sp=pp[1];
      c.prep=c.prep||{};
      if(op==='+'){(c.prep[sp]=c.prep[sp]||0);c.prep[sp]++;}
      else if(c.prep[sp]>1)c.prep[sp]--;else delete c.prep[sp];
      close(entry);sheet(c);
    }
  });
}
function createHero(){
  var races=Object.keys(Rules.RACES);
  var body=el('div');
  var st={race:'H',cls:'F',scores:null};
  function reroll(){st.scores=Rules.genScores(new Rules.RNG((Math.random()*0xffffffff)>>>0),st.race,st.cls).scores;}
  function opts(list,cur,fn){
    var s=el('select');
    list.forEach(function(v){var o=el('option');o.value=v[0];o.textContent=v[1];if(v[0]===cur)o.selected=1;s.appendChild(o);});
    s.onchange=function(){fn(s.value);build();};return s;
  }
  var form=el('div');
  function build(){
    form.innerHTML='';
    var nameInp=el('input');nameInp.style.cssText='background:#10121a;border:1px solid var(--edge2);color:var(--ink);padding:6px;width:100%;font:inherit';
    nameInp.placeholder='Name (required, up to 20)';nameInp.maxLength=20;
    if(!form._name)form._name=nameInp;
    var nm=el('div');nm.appendChild(el('label',null,'Name '));nm.appendChild(form._name);
    form.appendChild(nm);
    var r=el('div');r.appendChild(el('label',null,'Race '));
    r.appendChild(opts(races.map(function(k){return [k,Rules.RACES[k].name];}),st.race,function(v){st.race=v;
      if(Rules.CLASSES[st.cls].race&&Rules.CLASSES[st.cls].race.indexOf(v)<0){st.cls='F';}}));
    form.appendChild(r);
    var classes=Object.keys(Rules.CLASSES).filter(function(k){return Rules.CLASSES[k].race?Rules.CLASSES[k].race.indexOf(st.race)>=0:true;});
    var cl=el('div');cl.appendChild(el('label',null,'Class '));
    cl.appendChild(opts(classes.map(function(k){return [k,Rules.CLASSES[k].name];}),st.cls,function(v){st.cls=v;}));
    form.appendChild(cl);
    if(!st.scores)reroll();
    var stats=el('div','mini');
    stats.style.cssText='margin:8px 0;font-size:14px';
    stats.innerHTML=Rules.ABIL.map(function(k){return k.toUpperCase()+' <b>'+st.scores[k]+'</b>';}).join(' · ');
    form.appendChild(stats);
    var rr=el('button',null,'Reroll abilities');rr.onclick=function(){reroll();build();};
    form.appendChild(rr);
    entry.body.innerHTML='';entry.body.appendChild(form);
    var ok=Rules.alignmentsFor(st.cls,st.race);
    form._align=ok[0];
  }
  reroll();build();
  var entry=modal({title:'Create an Adventurer',body:body,closable:true,actions:[
    {label:'Recruit',primary:1,on:function(en){
      var name=(form._name.value||'').trim().slice(0,20);
      if(!name){UI.toast('A name is required.');en&&(en._stay=1);return;}
      Campaign.addCustom({name:name,race:st.race,cls:st.cls,align:form._align,scores:st.scores});
    }}]});
  body.appendChild(form);
}
/* ---------------- Save / Load dialogs ---------------- */
function saveDialog(){
  var body=el('div');
  ['1','2','3'].forEach(function(k){
    var s=Game.readSlot(k);
    var row=el('div','item');
    row.appendChild(el('span',null,s?('Slot '+k+' — '+esc(s.meta.leader||'')+' · '+esc(s.meta.where||'')+' · '+esc(s.meta.when||'')+' <span class=muted>('+esc(s.meta.mod||'')+')</span>'):'Slot '+k+' — <span class=muted>empty</span>'));
    var b=el('span','acts');var w=el('button',null,'Save here');
    w.onclick=function(){Game.save(k);UI.toast('Saved to slot '+k+'.');close(entry);};
    b.appendChild(w);row.appendChild(b);body.appendChild(row);
  });
  var entry=modal({title:'Save Game',body:body,actions:[{label:'Cancel'}]});
}
function loadDialog(onDone){
  var body=el('div');
  ['auto','1','2','3'].forEach(function(k){
    var s=Game.readSlot(k);
    var row=el('div','item');
    row.appendChild(el('span',null,'Slot '+k+' — '+(s?esc(s.meta.leader||'')+' · '+esc(s.meta.where||'')+' · '+esc(s.meta.when||'')+' <span class=muted>('+esc(s.meta.mod||'')+')</span>':'<span class=muted>empty</span>')));
    var acts=el('span','acts');
    var w=el('button',null,'Load');w.disabled=!s;
    w.onclick=function(){close(entry);if(Game.loadSlot(k))  {if(onDone)onDone();}};
    acts.appendChild(w);
    if(!s)w.title='No usable save in this slot';
    row.appendChild(acts);body.appendChild(row);
  });
  var entry=modal({title:'Load Game',body:body,actions:[{label:'Cancel'}]});
}
/* ---------------- Menu ---------------- */
function menu(){
  var m=MAPS[G.map];
  var safe=m&&m.safe;
  modal({title:'Menu',body:'<p class="muted">'+esc((MODULES[G.module]||{}).name||'')+' · '+esc(m?m.name:'')+' · '+Game.fmtTime(G.time)+'</p>',actions:[
    {label:'Map (M)',on:function(){Game.openFullMap();}},
    {label:'Journal (J)',on:function(){Journal.show();}},
    {label:'Bestiary (B)',on:function(){Bestiary.show();}},
    {label:'Touch Controls',on:function(){Navpad.cycle();}},
    {label:'Picture '+(Look.isLocked()?Look.tierId()+' (yours)':Look.tierId()+' (auto)'),on:function(){pictureMenu();}},
    {label:'Save',on:function(){saveDialog();}},
    {label:'Load',on:function(){loadDialog();}},
    {label:'Campaign',disabled:!safe,title:safe?'':'Travel is only possible from a safe town',on:function(){Campaign.travelMenu();}},
    {label:'How to Play',on:function(){help();}},
    {label:'Quit to Title',on:function(){Game.quitToTitle();}},
    {label:'Resume',primary:1}
  ]});
}
/* The quality tier exists whether or not anyone can see it: it sets the wall
   slice width, the ground-cast budget and the texture atlas size, and the frame
   governor walks it with measured frames. This makes it a control instead of a
   console command — with the measured cost of the choice stated in it, because a
   player picking "Ultra" on a phone should know what they just asked for. */
function pictureMenu(){
  var ids=(Look.TIERS||[]).map(function(t){return t.id;});
  var line='Current: <b>'+Look.tierId()+'</b> '
    +(Look.isLocked()?'<span class="muted">(pinned by you)</span>':'<span class="muted">(governor\u2019s choice)</span>')
    +'<br>Wall slice <b>'+Look.colw()+'</b> design units \u00b7 cast budget <b>'+Look.floorBudget()+'</b> samples'
    +' \u00b7 device ratio cap <b>'+((Look.TIERS[Look.tierIndex()]||{}).devCap)+'</b>';
  var acts=[{label:'Let the game choose (auto)',on:function(){Game.lookAuto();menu();}}];
  ids.forEach(function(id,i){
    acts.push({label:id.charAt(0).toUpperCase()+id.slice(1),
      title:i<=1?'Coarse but cheap':'Sharper and dearer',
      on:function(){Game.lookTier(i);pictureMenu();}});
  });
  acts.push({label:'Done',primary:1});
  modal({title:'Picture quality',body:'<p class="muted">'+line+'</p>'+
    '<p class="muted">Higher tiers draw the world in finer slices: narrower wall columns, more ground '
    +'samples per frame, a larger texture atlas. The weathering on the facades and the lamp light '
    +'from sconces and braziers are fair and above &mdash; on low, rooms are lit only by your own '
    +'lantern. The game steps the tier down by itself if frames '
    +'run long, and back up only once a long stretch has been comfortable. Pinning a tier here '
    +'overrides that, which is the right choice on a machine you know.</p>',actions:acts});
}
function help(){
  modal({title:'How to Play',body:
   '<p><b>Moving (buildings &amp; dungeons):</b> W/↑ forward, S/↓ back, A/← and D/→ turn, Q/E strafe. One step costs one minute; turning is free. F searches adjacent cells (10 minutes); R camps eight hours where it is permitted.</p>'+
   '<p><b>The wilds:</b> W/A/S/D and arrows are absolute N/W/S/E; Q/E/Z/C the diagonals. Click the landscape for one step. Enter/Visit invokes a site; R camp (refuges and camps are safer).</p>'+
   '<p><b>Anywhere:</b> P or the ☷ button opens the company; 1–6 open sheets; M or the survey map opens the full map; J journal; B bestiary; Esc the menu.</p>'+
   '<p><b>Fighting:</b> the tactical board will take the round: initiative each round, move then act, blue tiles are reachable, C cast, T turn undead, H hide, U use item, Space ends the turn, Q auto-battle.</p>'+
   '<p><b>Spells:</b> known ≠ prepared ≠ memorized. Adjust <i>preparation</i> on the sheet any time; only a completed rest (inn or camp) copies preparations into ready spells. Casting spends a ready copy.</p>'+
   '<p><b>Advancement:</b> XP is shared by survivors with a +10% prime-requisite bonus; levels are taken at the training hall for 100 gp × level, one level per training.</p>'+
   '<p><b>Campaign:</b> from a safe town, the menu\u2019s Campaign sends the company on to another adventure; the world keeps its gates, chests and deeds.</p>'});
}
/* Dialog button numbering: keys select actions in any modal (spell menus, sheets). */
function dialogButtons(root){
  if(root.querySelectorAll){
    var q=[].slice.call(root.querySelectorAll('button')).filter(function(b){return !b.disabled;});
    if(q.length)return q;
  }
  var out=[];(function w(el){(el.children||[]).forEach(function(c){
    if(c&&(c.onclick||c.tagName==='BUTTON'))out.push(c);
    if(c&&!c.disabled)w(c);
  });})(root);
  return out.filter(function(b){return !b.disabled;});
}
function numberButtons(root){
  var list=dialogButtons(root);
  for(var i=0;i<Math.min(list.length,10);i++){
    var kb=document.createElement('b');kb.className='kbd';kb.textContent=String((i+1)%10);
    if(kb.insertBefore||true){
      var b=list[i];
      if(b.firstChild&&b.insertBefore)b.insertBefore(kb,b.firstChild);
      else if(b.children)b.children.unshift(kb);
      else b.appendChild(kb);
    }
  }
}

/* ============ Hover tooltips ============ */
/* iPadOS Safari shows no native title tooltips, even with a trackpad.
   One delegated pointer layer renders them ourselves; the title is moved
   to data-tip on first hover (aria-label keeps the accessible name). */
var tipNode=null,tipTimer=null,tipFor=null;
function tipLazy(){if(!tipNode){tipNode=document.createElement('div');tipNode.id='ui-tip';tipNode.setAttribute('aria-hidden','true');document.body.appendChild(tipNode);}return tipNode;}
function tipElAt(e){var t=e.target;return(t&&t.closest)?t.closest('[title],[data-tip]'):null;}
function tipTextOf(el){
  if(el.getAttribute('data-tip')!=null)return el.getAttribute('data-tip');
  var t=el.getAttribute('title');
  if(t){el.setAttribute('data-tip',t);el.removeAttribute('title');
    if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',t);}
  return t;
}
function tipPlace(x,y){var n=tipLazy();var r=n.getBoundingClientRect();
  var L=x+14,T=y+18;
  if(L+r.width>window.innerWidth-8)L=Math.max(8,x-r.width-10);
  if(T+r.height>window.innerHeight-8)T=Math.max(8,y-r.height-14);
  n.style.left=L+'px';n.style.top=T+'px';}
function tipShowFor(el,x,y){
  var n=tipLazy();n.textContent=tipTextOf(el)||'';
  if(!n.textContent){tipHide();return;}
  n.classList.add('on');tipPlace(x,y);tipFor=el;}
function tipHide(){if(tipTimer){clearTimeout(tipTimer);tipTimer=null;}
  if(tipNode)tipNode.classList.remove('on');tipFor=null;}
document.addEventListener('pointermove',function(e){
  if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
  var el=tipElAt(e);var text=el?tipTextOf(el):null;
  if(!text){if(tipFor)tipHide();return;}
  if(el!==tipFor){
    tipFor=el;if(tipTimer)clearTimeout(tipTimer);
    tipTimer=setTimeout(function(){if(tipFor===el)tipShowFor(el,e.clientX,e.clientY);},90);
    if(tipNode)tipNode.classList.remove('on');
  }else if(tipNode&&tipNode.classList.contains('on'))tipPlace(e.clientX,e.clientY);
},true);
document.addEventListener('pointerout',function(e){
  if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
  var el=tipElAt(e);if(!el||el!==tipFor)return;
  if(e.relatedTarget&&el.contains&&el.contains(e.relatedTarget))return;
  tipHide();
},true);
var tipLastPT=null;
document.addEventListener('pointerdown',function(e){tipLastPT=e.pointerType;tipHide();},true);
document.addEventListener('focusin',function(e){
  if(tipLastPT==='touch')return;   // taps must not pin a tooltip
  var el=tipElAt(e);if(!el)return;
  var r=el.getBoundingClientRect();tipShowFor(el,r.left+r.width/2,r.top);
},true);
document.addEventListener('focusout',tipHide,true);
if(window.addEventListener){window.addEventListener('blur',tipHide);window.addEventListener('scroll',tipHide,true);}
document.addEventListener('keydown',function(e){if(e.key==='Escape')tipHide();},true);

return{el:el,esc:esc,$:$,modal:modal,close:close,closeAll:closeAll,top:top,toast:toast,log:log,
  hud:hud,party:party,rosterById:rosterById,colorOf:colorOf,renderParty:renderParty,toggleParty:toggleParty,initPartyPref:initPartyPref,closeTop:closeTop,tipHide:tipHide,spoils:spoils,
  sheet:sheet,createHero:createHero,saveDialog:saveDialog,loadDialog:loadDialog,menu:menu,help:help};
})();
