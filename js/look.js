/* Emberfall — js/look.js
 * Shared visual plumbing: palette, quality tiers and canvas fitting.
 *
 * Stage painters work in DESIGN UNITS. The design surface is always 800 design
 * pixels tall — the brief's reference surface is 1280×800 — and it widens with
 * the stage, with the aspect capped at 2.8. The backing store, by contrast, is
 * sized to the real device (CSS box × an effective pixel ratio), and one
 * ctx.setTransform(k,0,0,k,0,0) maps design units onto device pixels. Fixed
 * pixel artwork (isometric tiles, fonts, figure heights) therefore keeps its
 * proportions while gaining real detail, instead of a 1280×800 bitmap stretched
 * over whatever box the stage happens to be.
 *
 * The raycaster is the exception: it iterates device pixels natively and asks
 * Look.slicePx() how wide a wall column should be, so column width stays
 * constant in *visual* size at any resolution.
 *
 * No assets, no build step, no network. Nothing here touches game rules. */
'use strict';
var Look=(function(){

var REF_H=800;            // design height of the stage, per the 1280×800 reference
var REF_W=1280;           // nominal design width (stages wider than this widen it)
var MAX_ASPECT=2.8;       // brief: "widening to the stage (aspect capped at 2.8)"
var MAX_BACKING=3.4e6;    // device-pixel ceiling per stage canvas

/* Quality tiers. devCap caps device pixels per CSS pixel; colw is a wall slice
 * in design units; floorPx budgets the floor-caster's pixel loop. */
var TIERS=[
  {id:'low',   devCap:0.75, colw:4, floorPx:70000,  billCol:4},
  {id:'fair',  devCap:1.00, colw:2, floorPx:120000, billCol:2},
  {id:'high',  devCap:1.35, colw:1, floorPx:200000, billCol:1},
  {id:'ultra', devCap:2.00, colw:1, floorPx:320000, billCol:1}
];
var tier=2;               // 'high' until the frame governor walks it
var locked=false;         // a player who chose a tier keeps it

/* The palette the whole game shares (mirrors css/style.css :root). */
var C={bg:'#0d0e13', panel:'#171922', panel2:'#1f222d', edge:'#2c3040', edge2:'#3a3f52',
  ink:'#e9e2cf', muted:'#9a917c', dim:'#6f6a5c', gold:'#e3b54a', ember:'#c8502c',
  emberHi:'#e86a3c', good:'#69c07a', bad:'#d05a5a', magic:'#b7a6e8'};

var recs=(typeof WeakMap==='function')?new WeakMap():null;
var loose={};             // fallback record store keyed by element id
var gen=0;                // bumped whenever a tier change invalidates every fit

function tierIndex(){return tier;}
function tierId(){return TIERS[tier].id;}
function setTier(i){
  i=Math.max(0,Math.min(TIERS.length-1,i|0));
  if(i===tier)return false;
  tier=i;gen++;
  return true;
}
/* The governor walks the tier with measured frames. A player who picked a tier
   from the menu outranks it: `locked` means nudges do nothing until they hand
   control back. */
function lock(v){locked=(v!==false);}
function isLocked(){return locked;}
function nudge(dir){if(locked)return false;return setTier(tier+dir);}
function colw(){return TIERS[tier].colw;}
function billCol(){return TIERS[tier].billCol;}
function floorBudget(){return TIERS[tier].floorPx;}

function dpr(){return Math.max(1,Math.min(3,window.devicePixelRatio||1));}

function cssBox(cv){
  var w=cv.clientWidth,h=cv.clientHeight;
  if(!w||!h){var r=cv.getBoundingClientRect();w=w||r.width;h=h||r.height;}
  return {w:w||0,h:h||0};
}
/* Measure the STAGE, not the canvas: the stage is the layout authority, and the
 * canvas box is partly a consequence of the fit we are about to choose. */
function stageBox(cv){
  var ref=(cv.parentElement||cv);
  var w=ref.clientWidth,h=ref.clientHeight;
  if(!w||!h){var r=ref.getBoundingClientRect();w=w||r.width;h=h||r.height;}
  if(!w||!h){var own=cssBox(cv);w=w||own.w;h=h||own.h;}
  return {w:w,h:h};
}

/* Design surface for a stage box. The surface is REF_H design pixels tall and
 * widens with the stage, but the brief caps the surface aspect at 2.8 — so on a
 * very wide stage the design *width* is capped at REF_H×2.8 and the design
 * height shrinks to keep the box exact. The canvas always fills the stage: the
 * cap bounds the design surface and the cast cost, it never pillarboxes. */
function boxFor(cssW,cssH){
  var aspect=cssW/cssH;
  if(!isFinite(aspect)||aspect<=0)aspect=REF_W/REF_H;
  var dw,dh;
  if(aspect>=MAX_ASPECT){
    dh=Math.round(REF_H*MAX_ASPECT/aspect);dw=Math.round(dh*aspect);
  }else{
    dh=REF_H;dw=Math.round(REF_H*aspect);
    if(dw<360){dw=360;dh=Math.round(dw/aspect);}
  }
  var dev=Math.min(dpr(),TIERS[tier].devCap);
  var k=cssH*dev/dh;
  if(dw*k*dh*k>MAX_BACKING)k=Math.sqrt(MAX_BACKING/(dw*dh));
  if(!(k>0))k=1;
  return {w:dw,h:dh,k:k,capped:aspect>=MAX_ASPECT,aspect:aspect,
          bw:Math.max(1,Math.round(dw*k)),bh:Math.max(1,Math.round(dh*k))};
}

/* The canvas fills the stage in every case; clear any legacy inline sizing once. */
function applyBox(cv){
  if(cv._lookBoxed)return;
  cv._lookBoxed=1;
  var st=cv.style;
  st.width='100%';st.height='100%';st.left='0';st.right='0';
  st.top='0';st.bottom='0';st.transform='none';
}
function keyOf(cv){return cv.id||'';}
function getRec(cv){
  if(recs)return recs.get(cv)||null;
  return loose[keyOf(cv)]||null;
}
function setRec(cv,r){if(recs)recs.set(cv,r);else loose[keyOf(cv)]=r;}

/* Fit a full-stage canvas to its element and the device. Returns
 * {bw,bh,w,h,k,capped,changed} — device size, design size, device px per design
 * unit, whether the aspect cap letterboxed it, and whether we re-allocated.
 * A hidden canvas (no box) returns the previous record unchanged. */
function fit(cv){
  if(!cv)return null;
  var css=stageBox(cv);
  var prev=getRec(cv);
  if(!css.w||!css.h){
    // Hidden (display:none) or not laid out yet: keep the last real fit, and if
    // there is none, report a virtual reference fit without allocating pixels.
    if(prev)return prev;
    var virt=boxFor(REF_W,REF_H);virt.changed=false;virt.virtual=true;
    return virt;
  }
  var want=boxFor(css.w,css.h);
  var stale=!prev||prev.bw!==want.bw||prev.bh!==want.bh||prev.gen!==gen||
            cv.width!==want.bw||cv.height!==want.bh;
  if(stale){
    cv.width=want.bw;cv.height=want.bh;
    want.changed=true;
  }else{
    want.changed=false;
  }
  applyBox(cv);
  want.gen=gen;
  setRec(cv,want);
  return want;
}

/* Size an explicitly-laid-out canvas (the survey minimap) to CSS pixels × dpr. */
function fitBox(cv,cssW,cssH){
  if(!cv)return null;
  cssW=Math.max(60,Math.round(cssW));cssH=Math.max(60,Math.round(cssH));
  var k=Math.min(dpr(),TIERS[tier].devCap);
  var bw=Math.max(1,Math.round(cssW*k)),bh=Math.max(1,Math.round(cssH*k));
  var prev=getRec(cv);
  var stale=!prev||prev.bw!==bw||prev.bh!==bh||prev.gen!==gen||
            cv.width!==bw||cv.height!==bh;
  if(stale){cv.width=bw;cv.height=bh;}
  cv.style.width=cssW+'px';cv.style.height=cssH+'px';
  var r={bw:bw,bh:bh,w:cssW,h:cssH,k:k,capped:false,gen:gen,changed:!!stale};
  setRec(cv,r);
  return r;
}

/* Wall column width in device pixels for a fitted canvas: a constant *visual*
 * slice width at any resolution. Takes the record returned by fit(). */
function slicePx(rec){
  var k=(rec&&rec.k>0)?rec.k:1;
  return Math.max(1,Math.round(colw()*k));
}

/* Billboard slice width in device pixels, same rule (takes fit()'s record). */
function billPx(rec){
  var k=(rec&&rec.k>0)?rec.k:1;
  return Math.max(1,Math.round(billCol()*k));
}

/* Effective device pixels per CSS pixel for a fitted canvas. */
function scaleOf(cv){
  var r=getRec(cv);
  if(!r||!cv.getBoundingClientRect)return 1;
  var b=cssBox(cv);
  return b.w?cv.width/b.w:1;
}

/* Console aid: what every stage surface is actually sized to right now. */
function report(){
  var out=[];
  ['view3d','overCanvas','combatCanvas','minimap'].forEach(function(id){
    var cv=document.getElementById(id);if(!cv)return;
    var b=cssBox(cv),r=getRec(cv);
    out.push(id+': css '+Math.round(b.w)+'×'+Math.round(b.h)+
      ' backing '+cv.width+'×'+cv.height+
      ' design '+(r?r.w+'×'+r.h:'—')+
      ' k='+(r?r.k.toFixed(3):'—')+(r&&r.capped?' (design width capped)':''));
  });
  out.push('tier='+tierId()+(locked?' pinned':' auto')+' dpr='+dpr()+
    ' colw='+colw()+' floorPx='+floorBudget());
  return out.join('\n');
}

return {REF_H:REF_H,REF_W:REF_W,MAX_ASPECT:MAX_ASPECT,C:C,TIERS:TIERS,
  tierIndex:tierIndex,tierId:tierId,setTier:setTier,nudge:nudge,
  lock:lock,isLocked:isLocked,
  colw:colw,billCol:billCol,floorBudget:floorBudget,dpr:dpr,
  fit:fit,fitBox:fitBox,slicePx:slicePx,billPx:billPx,scaleOf:scaleOf,report:report};
})();
