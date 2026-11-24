/* Emberfall — js/navpad.js
 * On-screen direction pads for touch play. Cycle off → right → left → both
 * → off; the choice and each pad’s position persist in emberfall.navpad.
 * Buttons act by dispatching the same key events the keyboard uses, so all
 * input guards (dialogs, combat routing) apply unchanged. Holding a button
 * repeats: turns at ~60 ms, steps a little slower. Drag a pad’s rim to move
 * it; placement saves on release. */
'use strict';
var Navpad=(function(){
var KEY='emberfall.navpad';
var MODES=['off','right','left','both'];
var mode='auto',pads={},els=[];
var REPEAT_STEP=140,REPEAT_TURN=60;

function load(){
  try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.mode)return s;}catch(e){}
  return {mode:'auto',r:null,l:null};
}
function save(st){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function st(){var s=load();s.mode=mode;pads.r&&(s.r=pads.r);pads.l&&(s.l=pads.l);save(s);}

function send(key){
  try{document.dispatchEvent(new KeyboardEvent('keydown',{key:key,bubbles:true,cancelable:true}));}
  catch(e){
    /* ancient stub environments: fall through to the game key handler */
    if(window.Game&&Game.forwardHotkey)Game.forwardHotkey(key,{key:key,preventDefault:function(){}});
  }
}

/* one pad: 3×3 grid; rim area draggable via the ⠿ handle cell */
function buildPad(side,layout,pos){
  var d=document.createElement('div');
  d.className='pad '+side;
  if(pos){d.style.right='auto';d.style.left='auto';d.style.bottom='auto';
    d.style.left=pos.x+'px';d.style.top=pos.y+'px';}
  layout.forEach(function(cell){
    var b=document.createElement('button');
    b.innerHTML=cell.g;
    if(cell.mid)b.className='mid';
    b.style.gridColumn=cell.c;b.style.gridRow=cell.r;
    if(cell.k){
      var timer=null,delay=null;
      var fire=function(){cell.k==='key'?send(cell.key):cell.k();};
      var stop=function(){clearTimeout(delay);clearInterval(timer);delay=timer=null;};
      b.addEventListener('pointerdown',function(e){
        e.preventDefault();fire();
        delay=setTimeout(function(){timer=setInterval(fire,cell.turn?REPEAT_TURN:REPEAT_STEP);},380);
      });
      ['pointerup','pointercancel','pointerleave'].forEach(function(ev){b.addEventListener(ev,stop);});
    }else if(cell.drag){
      /* drag handle: move the whole pad */
      b.addEventListener('pointerdown',function(e){
        e.preventDefault();
        var r=d.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
        var mv=function(ev){
          d.style.left=(ev.clientX-dx)+'px';d.style.top=(ev.clientY-dy)+'px';
          d.style.right='auto';d.style.bottom='auto';
        };
        var up=function(){
          document.removeEventListener('pointermove',mv);
          pads[side]={x:parseInt(d.style.left,10)||0,y:parseInt(d.style.top,10)||0};
          st();
        };
        document.addEventListener('pointermove',mv);
        document.addEventListener('pointerup',up,{once:true});
      });
    }
    d.appendChild(b);
  });
  document.body.appendChild(d);
  return d;
}

function layouts(){
  /* left pad: relative commands — forward, back, turn, look */
  var left=[
    {g:'▲',c:2,r:1,k:'key',key:'ArrowUp',turn:false},
    {g:'◀',c:1,r:2,k:'key',key:'ArrowLeft',turn:true},
    {g:'⭮',c:2,r:2,k:function(){cycle();},mid:1},
    {g:'▶',c:3,r:2,k:'key',key:'ArrowRight',turn:true},
    {g:'▼',c:2,r:3,k:'key',key:'ArrowDown',turn:false},
    {g:'⠿',c:1,r:1,drag:1,mid:1},
    {g:'✥',c:3,r:1,drag:1,mid:1}
  ];
  /* right pad: absolute 8-way for the wilds and menus of movement */
  var right=[
    {g:'↖',c:1,r:1,k:'key',key:'q',turn:true},{g:'↑',c:2,r:1,k:'key',key:'w',turn:true},
    {g:'↗',c:3,r:1,k:'key',key:'e',turn:true},
    {g:'←',c:1,r:2,k:'key',key:'a',turn:true},{g:'·',c:2,r:2,mid:1},
    {g:'→',c:3,r:2,k:'key',key:'d',turn:true},
    {g:'↙',c:1,r:3,k:'key',key:'z',turn:true},{g:'↓',c:2,r:3,k:'key',key:'s',turn:true},
    {g:'↘',c:3,r:3,k:'key',key:'c',turn:true}
  ];
  return {left:left,right:right};
}

function rebuild(){
  els.forEach(function(e){e.remove();});els=[];
  var L=layouts(),s=load();
  if(mode==='left'||mode==='both')els.push(buildPad('left',L.left,pads.l||s.l));
  if(mode==='right'||mode==='both')els.push(buildPad('right',L.right,pads.r||s.r));
}

function show(m){mode=m||'both';rebuild();st();}
function hide(){mode='off';els.forEach(function(e){e.remove();});els=[];st();}
function cycle(){
  var i=MODES.indexOf(mode==='auto'?'off':mode);
  mode=MODES[(i+1)%MODES.length];
  rebuild();st();
  if(window.UI&&UI.toast)UI.toast('Touch pads: '+mode+'.');
}
function auto(){
  var s=load();
  mode=(s.mode==='auto')
    ?((window.matchMedia&&matchMedia('(pointer: coarse)').matches)||('ontouchstart' in window)?'both':'off')
    :s.mode;
  pads.l=s.l;pads.r=s.r;
  if(mode!=='off')rebuild();
}
return{cycle:cycle,place:function(){st();},hide:hide,show:show,auto:auto,get mode(){return mode;}};
})();
