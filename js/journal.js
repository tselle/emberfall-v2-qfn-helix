/* Emberfall — js/journal.js
 * Derived commissions, dated notes, earlier adventures. */
'use strict';
var Journal=(function(){
function note(text,kind){
  if(!window.G)return;
  if(!G.journal)G.journal=[];
  G.journal.push({t:G.time,m:G.module,text:text,kind:kind||''});
}
function commissions(){
  var mod=MODULES[G.module];if(!mod)return[];
  var out=[];
  mod.quests.concat(mod.side||[]).forEach(function(qid){
    var q=QUESTS[qid];if(!q)return;
    var st=G.quests[qid];
    var state=st&&st.done?'done':st&&st.offered?'active':'unoffered';
    // derived reportable: final deed event done or item carried
    var reportable=false;
    mod.maps.forEach(function(mid){var mm=MAPS[mid];if(!mm)return;
      Object.keys(mm.ev||{}).forEach(function(k){
        var e=mm.ev[k];
        if(e.enc&&e.enc.quest===qid&&G.flags[mid+':'+k]==='done')reportable=true;
        if(e.text&&e.items&&q.needItem&&e.items.indexOf(q.needItem)>=0&&G.flags[mid+':'+k]==='done')reportable=true;
      });});
    if(!reportable&&q.needItem&&G.roster.some(function(c){return G.party.indexOf(c.id)>=0&&c.inv&&c.inv.indexOf(q.needItem)>=0;}))reportable=true;
    out.push({id:qid,q:q,state:state,reportable:reportable&&state==='active'});
  });
  return out.filter(function(x){return x.state!=='unoffered';});
}
function show(){
  var body=UI.el('div');
  var coms=commissions();
  body.appendChild(UI.el('h3',null,'Commissions'));
  if(!coms.length)body.appendChild(UI.el('p','muted','No work taken yet. The hall board has offers.'));
  coms.forEach(function(x){
    var badge=x.q.side?'<span class=muted>side</span>':'<span class=gold>main</span>';
    var flag=x.state==='done'?'<span class=good>reported</span>':(x.reportable?'<span class=gold>ready to report</span>':'<span class=muted>active</span>');
    body.appendChild(UI.el('div','item','<span><b>'+UI.esc(x.q.name)+'</b> '+badge+'<br><span class=muted>'+UI.esc(x.q.goal)+'</span></span><span>'+flag+'</span>'));
  });
  body.appendChild(UI.el('h3',null,'Notes'));
  var byDay={};
  (G.journal||[]).slice().reverse().forEach(function(j){
    var day=1+Math.floor(j.t/1440);
    (byDay[day]=byDay[day]||[]).push(Game.fmtTime(j.t).split(', ')[1]+' · '+(j.m?MODULES[j.m]?MODULES[j.m].code+' ':'':'')+j.text);
  });
  Object.keys(byDay).reverse().forEach(function(d){
    body.appendChild(UI.el('div','gold','Day '+d));
    byDay[d].forEach(function(t){body.appendChild(UI.el('p',null,UI.esc(t)));});
  });
  if(!Object.keys(byDay).length)body.appendChild(UI.el('p','muted','Nothing noted yet.'));
  UI.modal({title:'Journal',body:body,actions:[{label:'Close',primary:1}]});
}
return{note:note,show:show,commissions:commissions};
})();
