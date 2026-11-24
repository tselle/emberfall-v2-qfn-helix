/* Emberfall — js/game.js
 * Owns campaign state G, save/load, exploration runtime, title/assembly
 * screens, global input and bootstrap. (Milestone 1: title + save probing;
 * exploration, input and screens fill in with milestone 2.) */
'use strict';
var Game=(function(){
var G=null;
var SAVE_PREFIX='emberfall.save.';
var DIRS=['N','E','S','W'];

/* ---------------- Screens ---------------- */
function show(id){
  ['title','campaign','assembly','game'].forEach(function(s){
    var e=document.getElementById(s);if(e)e.classList.toggle('hidden',s!==id);
  });
}
function title(){
  UI.closeAll();
  show('title');
  paintTitleActions();
}
function fmtTime(mins){
  var day=1+Math.floor(mins/1440),h=Math.floor(mins%1440/60),m=mins%60;
  return 'Day '+day+', '+('0'+h).slice(-2)+':'+('0'+m).slice(-2);
}
function latestSave(){
  var best=null;
  ['auto','1','2','3'].forEach(function(k){
    try{
      var raw=localStorage.getItem(SAVE_PREFIX+k);if(!raw)return;
      var s=JSON.parse(raw);if(!s||!s.meta)return;
      if(!best||(s.meta.ts||0)>(best.meta.ts||0))best=s;
    }catch(e){}
  });
  return best;
}
function paintTitleActions(){
  var host=document.getElementById('titleActions');host.innerHTML='';
  var latest=null;try{latest=latestSave();}catch(e){}
  function btn(label,fn,enabled,sub){
    var b=document.createElement('button');b.textContent=label+(sub?': '+sub:'');
    b.disabled=!enabled;b.onclick=fn;
    b.title=enabled?(sub||label):'No saved company yet';
    host.appendChild(b);return b;
  }
  btn('New Game',function(){Campaign.choose();},true);
  btn('Continue',function(){loadContinue();},!!latest,latest?((latest.meta.leader||'\u2014')+' \u00b7 '+(latest.meta.where||'')+' \u00b7 '+(latest.meta.when||'')):null);
  btn('Load Game',function(){loadDialog();},!!latest);
  btn('How to Play',function(){UI.toast('The full chronicle of arms arrives with milestone 5.');},true);
}

/* ---------------- Save infrastructure (storage-safe) ---------------- */
function storageOK(){try{localStorage.setItem('emberfall.probe','1');localStorage.removeItem('emberfall.probe');return true;}catch(e){return false;}}
function readSlot(k){
  if(!storageOK())return null;
  try{var raw=localStorage.getItem(SAVE_PREFIX+k);return raw?JSON.parse(raw):null;}
  catch(e){return null;} // missing or unreadable JSON must never crash play
}
function loadContinue(){
  var latest=null;
  ['auto','1','2','3'].forEach(function(k){var s=readSlot(k);if(s&&(!latest||(s.meta&&s.meta.ts)>(latest.s.meta&&latest.s.meta.ts)))latest={k:k,s:s};});
  if(!latest){UI.toast('No saved company found.');return;}
  loadSlot(latest.k);
}
function loadSlot(k){UI.toast('Resuming saved companies arrives with milestone 1 (state restore).');}
function loadDialog(){UI.toast('Load dialog arrives with milestone 1.');}

/* ---------------- Title embers ---------------- */
var emberRAF=null;
function embers(){
  var c=document.getElementById('embers');if(!c)return;
  function frame(){
    if(document.getElementById('title').classList.contains('hidden')){emberRAF=null;return;}
    var w=c.width=c.clientWidth,h=c.height=c.clientHeight,g=c.getContext('2d');
    if(!c._p){c._p=[];for(var i=0;i<70;i++)c._p.push({x:Math.random(),y:Math.random(),s:.4+Math.random(),ph:Math.random()*6.28});}
    g.clearRect(0,0,w,h);
    var t=Date.now()/1000;
    c._p.forEach(function(p){
      var y=((p.y-t*.02*p.s)%1+1)%1,x=p.x+Math.sin(t*.7+p.ph)*.015;
      var a=(1-y)*.8;
      g.fillStyle='rgba('+(230)+','+(110+Math.floor(60*p.s))+','+40+','+a.toFixed(2)+')';
      var px=x*w,py=y*h,r=p.s*1.6;
      g.beginPath();g.arc(px,py,r,0,6.29);g.fill();
    });
    emberRAF=requestAnimationFrame(frame);
  }
  if(emberRAF)cancelAnimationFrame(emberRAF);
  frame();
}

/* ---------------- Bootstrap (spec §2) ---------------- */
document.addEventListener('DOMContentLoaded',function(){
  View3D.init(document.getElementById('view3d'));
  Over.init(document.getElementById('overCanvas'));
  title();
  embers();
});

return{
  get G(){return G;},set G(v){G=v;},
  show:show,title:title,fmtTime:fmtTime,latestSave:latestSave,readSlot:readSlot,
  loadSlot:loadSlot,loadContinue:loadContinue,SAVE_PREFIX:SAVE_PREFIX,DIRS:DIRS
};
})();
