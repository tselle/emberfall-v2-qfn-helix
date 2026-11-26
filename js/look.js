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

/* ================= the hour =================
   One description of the light, asked of the campaign clock in minutes. Before
   this the sky was authored as permanent dusk and the day cycle existed only as
   two identical private isNight() helpers deciding when monsters got braver. The
   clock was already advancing - fights spend ten minutes, a march an hour, a
   rest eight hours - and nothing painted any of it.
   Colours are keyframed through the day and interpolated; nothing is computed
   from astronomy, because the Emberwild's sky is meant to carry ember at the
   horizon whatever the hour, and a physically-correct noon would look like a
   different game. Azimuth follows the renderer's own convention: 0 east, π/2
   south, π west - so the sun stands due south at noon, as it should. */
var DAYKEYS=[
  /* h    zenith            mid               horizon           haze            amb */
  [0.0,  [9,12,26],   [15,20,40],   [34,38,60],    [62,70,96],   0.42],
  [4.6,  [11,15,33],  [26,28,54],   [64,54,74],    [80,80,108],  0.48],
  [6.0,  [38,52,94],  [112,92,112], [222,132,84],  [146,118,112],0.72],
  [8.5,  [56,86,150], [120,146,190],[196,178,150], [160,168,178],0.95],
  [12.0, [70,106,176],[136,168,208],[200,204,206], [178,188,198],1.12],
  [16.5, [64,96,164], [150,152,176],[214,178,132], [180,170,164],1.05],
  [19.0, [36,38,78],  [104,70,92],  [232,126,62],  [158,108,88], 0.80],
  [20.6, [16,20,42],  [30,32,58],   [120,74,64],   [104,88,96],  0.52],
  [24.0, [9,12,26],   [15,20,40],   [34,38,60],    [62,70,96],   0.42]
];
var DAY={};               // memoised per minute-bucket: painters run this per frame
function mix3(a,b,f){return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];}
function ramp(h,a,b,x,y){if(h<=a)return 0;if(h>=b)return y;return x+(y-x)*(h-a)/(b-a);}
function daylight(mins){
  var t=Math.floor((mins==null?720:mins)/5);           // five-minute buckets are plenty
  var key=(t*5/60)%24;
  if(t<0)t=0;
  var cache=daylight._c||(daylight._c={});
  var hit=cache[key];
  if(hit)return hit;
  var i=0;while(i<DAYKEYS.length-2&&DAYKEYS[i+1][0]<=key)i++;
  var A=DAYKEYS[i],B=DAYKEYS[i+1];
  var f=(key-A[0])/(B[0]-A[0]);if(f<0)f=0;if(f>1)f=1;
  // the day's light: nothing before first light, full by mid-morning, gone by night
  var sun=Math.min(ramp(key,5.2,7.6,0,1),1-ramp(key,17.6,20.2,0,1));
  // and the two hours of the day that are worth painting for
  var dusk=Math.min(1,Math.exp(-Math.pow(key-6,2)/1.1)+Math.exp(-Math.pow(key-19,2)/1.5));
  var p=Math.max(0,Math.min(1,(key-6)/12));
  var np=((key-19+24)%24)/11;                          // the night arc, dusk to dawn
  var out={
    h:key,
    sun:sun,
    dusk:dusk,
    night:(key<5.5||key>=20),
    starA:Math.max(0,1-sun*1.7),
    lamp:1-sun,
    zen:mix3(A[1],B[1],f),
    mid:mix3(A[2],B[2],f),
    hor:mix3(A[3],B[3],f),
    haze:mix3(A[4],B[4],f),
    ambMul:A[5]+(B[5]-A[5])*f,
    sunAz:Math.PI*p,
    sunEl:Math.sin(Math.PI*p)*0.86,
    sunUp:(key>5.6&&key<18.4),
    moonAz:Math.PI*Math.max(0,Math.min(1,np)),
    moonEl:Math.sin(Math.PI*Math.max(0,Math.min(1,np)))*0.80,
    moonUp:(key<5.4||key>=18.6)
  };
  // at most 288 keys exist (a day in five-minute buckets), so the cache is bounded
  cache[key]=out;
  return out;
}
function isNight(mins){return daylight(mins).night;}

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
  daylight:daylight,isNight:isNight,
  fit:fit,fitBox:fitBox,slicePx:slicePx,billPx:billPx,scaleOf:scaleOf,report:report};
})();
