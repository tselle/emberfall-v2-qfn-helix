/* Emberfall — js/bestiary.js
 * Keyed by monster ID; records {seen,fought,slain}; the discovery-gated
 * bestiary screen — you remember what you have met, and no more. */
'use strict';
var Bestiary=(function(){
function rec(){if(window.G){if(!G.bestiary)G.bestiary={};return G.bestiary;}return null;}
function sight(monId){var b=rec();if(b&&!b[monId])b[monId]={seen:G.time,fought:0,slain:0};}
function fought(monId){var b=rec();if(!b)return;sight(monId);if(b[monId])b[monId].fought++;}
function slain(monId,n){var b=rec();if(!b)return;sight(monId);b[monId].slain+=n||1;}
function loreLines(id){
  var out=[];
  var def=MONSTERS[id];
  if(!def){out.push('A creature your company has met but never named.');return out;}
  out.push('Hit Dice '+def.hd+' · AC '+(def.ac!=null?def.ac:'?')+' · Move '+(def.mv||12)+' · XP '+(def.xp||0));
  out.push('Attacks: '+(def.atk||['1d6']).join(' / ')+(def.size?' · size '+def.size:''));
  if(def.ml!=null)out.push('Morale: '+(def.ml==='fearless'?'fearless':def.ml));
  if(def.undead)out.push('Undead (turned as rank '+(typeof def.undead==='number'?def.undead:Math.ceil(def.hd))+').');
  if(def.regen)out.push('Regains '+def.regen+' wounds a round unless burned.');
  if(def.poison)out.push('Poisonous.');
  if(def.tags&&def.tags.length)out.push('Known as: '+def.tags.join(', ')+'.');
  if(def.lore)out.push(def.lore);
  return out;
}
function show(){
  if(!window.G){return;}
  var b=rec()||{};
  var ids=Object.keys(b).sort(function(x,y){
    var a=MONSTERS[x],c=MONSTERS[y];
    return ((a&&a.n)||x).localeCompare(((c&&c.n)||y));
  });
  var body=UI.el('div');
  if(!ids.length)body.appendChild(UI.el('p','muted','The bestiary is empty. Nothing out there has introduced itself yet.'));
  ids.forEach(function(id){
    var def=MONSTERS[id],r=b[id];
    var row=UI.el('div','item');
    row.style.display='flex';row.style.gap='12px';row.style.alignItems='flex-start';
    try{
      var pc=document.createElement('canvas');
      pc.width=62;pc.height=80;pc.style.cssText='flex:0 0 auto;border-radius:6px';
      Figures.monFigure(def||{n:'Unnamed',fig:'blob'},pc,id);
      row.appendChild(pc);
    }catch(e){}
    var left=UI.el('div');
    left.innerHTML='<b style="color:'+(def&&def.undead?'#b9b29a':'#d8a25c')+'">'+UI.esc((def&&def.n)||'The Unnamed')+'</b>'+
      (r.slain?' <span class=good>×'+r.slain+' slain</span>':(r.fought?' <span class=gold>encountered</span>':' <span class=muted>sighted</span>'));
    loreLines(id).forEach(function(l,i){
      left.innerHTML+='<div class="'+(i===0?'muted':'spell')+'" style="font-size:'+(i===0?'12px':'12px')+'">'+UI.esc(l)+'</div>';
    });
    row.appendChild(left);
    body.appendChild(row);
  });
  UI.modal({title:'Bestiary — '+ids.length+' remembered',body:body,actions:[{label:'Close',primary:1}]});
}
function card(monId){
  var d=MONSTERS[monId];if(!d)return monId;
  return d.n+(d.hd!=null?' ('+d.hd+')':'');
}
return{sight:sight,fought:fought,slain:slain,show:show,card:card};
})();
