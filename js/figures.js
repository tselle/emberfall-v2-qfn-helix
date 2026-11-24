/* Emberfall — js/figures.js
 * Shared procedural drawFig(ctx,desc,x,y,scale), figForChar(c), portrait(c,canvas),
 * monFigure(def,canvas). Distinct silhouettes: humanoid, dwarf, elf, halfling,
 * skeleton, rat, spider, wolf, centipede, insect, beast, dragon, blob, serpent,
 * orb, bird, bat. Feet at (x,y); scale 1 ≈ 40 px tall. Purely cosmetic. */
'use strict';
var Figures=(function(){

function shade(hex,amt){
  var n=parseInt(String(hex||'#888888').replace('#',''),16);
  if(isNaN(n))n=0x888888;
  var r=Math.max(0,Math.min(255,(n>>16)+amt)),g=Math.max(0,Math.min(255,(n>>8&255)+amt)),b=Math.max(0,Math.min(255,(n&255)+amt));
  return 'rgb('+r+','+g+','+b+')';
}

function drawFig(ctx,desc,x,y,s){
  desc=desc||{};
  var col=desc.color||'#9a917c',acc=desc.accent||shade(col,34),lit=shade(col,52);
  var shape=desc.shape||'humanoid';
  ctx.save();
  ctx.translate(x,y);ctx.scale(s,s);
  /* contact shadow */
  ctx.fillStyle='rgba(0,0,0,.45)';
  ctx.beginPath();ctx.ellipse(0,0,10,3,0,0,6.29);ctx.fill();
  function ell(cx,cy,rx,ry,fill){ctx.fillStyle=fill||col;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.29);ctx.fill();}
  function tri(p1,p2,p3,fill){ctx.fillStyle=fill||col;ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.lineTo(p3[0],p3[1]);ctx.closePath();ctx.fill();}
  function limb(x0,y0,x1,y1,w,fill){ctx.strokeStyle=fill||col;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
  switch(shape){
    case 'dwarf':
      ell(0,-9,8,6);                       // broad body
      limb(-5,-4,-6,0,3.4);limb(5,-4,6,0,3.4);
      ell(0,-19,6,5.4,lit);                // helm dome
      ctx.fillStyle=shade(col,-30);ctx.fillRect(-6,-19,12,2.6);
      tri([-4,-16],[4,-16],[0,-8],shade('#c9b68f',0));   // beard
      ell(0,-24,2.6,2.2,acc);
      break;
    case 'elf':case 'highelf':
      ctx.fillStyle=col;                   // tall hooded robe
      ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(-8,-18,0,-26);
      ctx.quadraticCurveTo(8,-18,7,0);ctx.closePath();ctx.fill();
      ctx.fillStyle=shade(col,26);         // hood peak
      ctx.beginPath();ctx.moveTo(-5,-22);ctx.quadraticCurveTo(0,-32,5,-22);ctx.quadraticCurveTo(0,-25,-5,-22);ctx.fill();
      ell(0,-24,1.8,1.8,lit);
      break;
    case 'halfling':
      ell(0,-7,7,6.4);
      ell(0,-15,5,4.8,lit);
      ell(-4,-1.6,3.4,1.8,shade(col,-18));ell(4,-1.6,3.4,1.8,shade(col,-18));   // big feet
      ell(-1.8,-16,1.2,1.2,'#222');
      break;
    case 'skeleton':
      limb(0,-16,0,-6,2.4,'#d5cdb4');
      for(var r=0;r<3;r++)limb(-4.4,-14+r*3.4,4.4,-14+r*3.4,1.6,'#d5cdb4');
      limb(-4,-6,-5,0,1.8,'#cfc6ad');limb(4,-6,5,0,1.8,'#cfc6ad');
      ell(0,-20,4.4,4.2,'#e8e2cc');
      ell(-1.8,-20.6,1.1,1.4,'#141018');ell(1.8,-20.6,1.1,1.4,'#141018');
      break;
    case 'rat':
      ell(-1,-6,6.6,4.6);
      ell(5.6,-8.4,3,2.8,shade(col,16));
      ell(7,-11,1.6,1.8,shade(col,26));
      ctx.strokeStyle=shade(col,-24);ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(-7,-6);ctx.quadraticCurveTo(-13,-8,-12,-1);ctx.stroke();
      ell(6.6,-9,.9,.9,'#c0392b');
      break;
    case 'spider':
      ell(-2,-7,6,5.4,shade(col,-12));
      ell(4.4,-6,3,2.6,col);
      ctx.strokeStyle=shade(col,-16);ctx.lineWidth=1.4;
      for(var l=0;l<4;l++){
        ctx.beginPath();ctx.moveTo(2,-6);ctx.quadraticCurveTo(9+l*1.6,-12+l*3.4,11+l*1.8,-2+l*1.6);ctx.stroke();
        ctx.beginPath();ctx.moveTo(1,-6);ctx.quadraticCurveTo(-6-l*1.6,-12+l*3.4,-9-l*1.8,-2+l*1.6);ctx.stroke();
      }
      ell(5.4,-7.2,.9,.9,'#c0392b');ell(3.6,-7.2,.9,.9,'#c0392b');
      break;
    case 'wolf':
      ell(-1,-9,9,4.8);
      ell(7.4,-12.4,3.6,3.2,shade(col,12));
      tri([6,-15],[8,-19],[9.4,-14.4],shade(col,-14));
      limb(-6,-5,-6.4,0,2.4);limb(-2,-5,-1.4,0,2.4);limb(3,-5,3.4,0,2.4);limb(6,-5,6.6,0,2.4);
      ctx.strokeStyle=shade(col,-20);ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-9.6,-10);ctx.quadraticCurveTo(-14,-13,-13,-7);ctx.stroke();
      ell(8.6,-13.4,.9,.9,'#e0b54a');
      break;
    case 'centipede':case 'insect':
      for(var sg=0;sg<4;sg++)ell(-6+sg*4,-5-sg*.6,3.4-sg*.4,3-sg*.3,sg%2?shade(col,14):col);
      ctx.strokeStyle=shade(col,-22);ctx.lineWidth=1;
      for(var lg=0;lg<4;lg++){limb(-6+lg*4,-4,-8.4+lg*4,0,1);limb(-6+lg*4,-4,-3.6+lg*4,0,1);}
      ctx.beginPath();ctx.moveTo(7,-6);ctx.quadraticCurveTo(11,-10,12,-8);ctx.moveTo(7,-6);ctx.quadraticCurveTo(12,-6,13,-3);ctx.stroke();
      break;
    case 'beast':
      ell(-1,-9,10,6.4,shade(col,-8));
      ell(8,-13,4.4,3.8,col);
      limb(-6,-4,-6.6,0,3.6);limb(4,-4,4.6,0,3.6);
      ctx.strokeStyle=shade('#d8c7a8',0);ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(9.4,-16.4);ctx.quadraticCurveTo(12,-20,10.6,-21.6);ctx.moveTo(6.6,-16.6);ctx.quadraticCurveTo(8,-20.4,6.4,-22);ctx.stroke();
      ell(9.6,-14,.9,.9,'#c0392b');
      break;
    case 'dragon':
      ctx.fillStyle=shade(col,-10);        // folded wings
      ctx.beginPath();ctx.moveTo(-2,-22);ctx.quadraticCurveTo(-16,-18,-12,-4);ctx.quadraticCurveTo(-6,-10,-2,-14);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(0,-22);ctx.quadraticCurveTo(14,-18,11,-4);ctx.quadraticCurveTo(5,-10,0,-14);ctx.closePath();ctx.fill();
      ell(0,-12,5,8.4,col);                // haunches + torso
      ctx.strokeStyle=shade(col,-24);ctx.lineWidth=2.6;
      ctx.beginPath();ctx.moveTo(-4,-6);ctx.quadraticCurveTo(-11,-3,-13,0);ctx.stroke();   // tail
      limb(-2.4,-4,-2.8,0,3);limb(2.4,-4,2.8,0,3);
      ell(1,-23.6,4,3.6,lit);              // horned head
      ctx.strokeStyle=shade('#d8c7a8',0);ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(0,-26.4);ctx.quadraticCurveTo(-2,-30,-4.4,-29);ctx.moveTo(2.6,-26.4);ctx.quadraticCurveTo(4,-30,6.4,-28.6);ctx.stroke();
      ell(2.6,-24.4,1,1,'#e0b54a');
      break;
    case 'blob':
      ctx.fillStyle=col;
      ctx.beginPath();ctx.moveTo(-10,0);
      ctx.quadraticCurveTo(-11,-12,0,-13.4);ctx.quadraticCurveTo(11,-12,10,0);ctx.closePath();ctx.fill();
      ell(4,-6,2.4,1.6,shade(col,36));
      ell(-2,-9,1.6,1.2,shade(col,52));
      break;
    case 'serpent':
      ctx.strokeStyle=col;ctx.lineWidth=4.4;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(-8,-2);ctx.bezierCurveTo(-2,-4,-6,-12,2,-12);
      ctx.bezierCurveTo(8,-12,6,-4,10,-14);ctx.stroke();
      ell(10.6,-15,2.6,2,shade(col,16));
      ell(11.4,-15.8,.8,.8,'#e0b54a');
      break;
    case 'orb':
      ell(0,-14,8.4,8.4,shade(col,-14));
      ctx.strokeStyle=acc;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,-14,9.6,3.4,-.4,0,6.29);ctx.stroke();
      ell(0,-14,3.2,3.2,'#e9e2cf');ell(0,-14,1.4,1.4,'#141018');
      for(var t=0;t<5;t++)ell(-6+t*3,-4.6+((t%2)*1.6),1.4,2.2,shade(col,-26));
      break;
    case 'bird':case 'bat':
      ell(0,-12,3.4,4.6,col);
      ctx.fillStyle=shape==='bat'?shade(col,-10):shade(col,18);
      ctx.beginPath();ctx.moveTo(-2,-15);ctx.quadraticCurveTo(-14,-22,-15,-10);ctx.quadraticCurveTo(-8,-12,-2,-10);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(2,-15);ctx.quadraticCurveTo(14,-22,15,-10);ctx.quadraticCurveTo(8,-12,2,-10);ctx.closePath();ctx.fill();
      ell(0,-17.4,1.8,1.8,lit);
      if(shape==='bird'){tri([1.6,-17.4],[4.6,-16.8],[1.6,-16],'#e0b54a');}
      ell(-.8,-17.8,.7,.7,'#141018');
      break;
    default: /* humanoid */
      limb(-3.4,-4,-4.2,0,3.2,shade(col,-18));limb(3.4,-4,4.2,0,3.2,shade(col,-18));
      ctx.fillStyle=col;
      ctx.beginPath();ctx.moveTo(-5.4,0);ctx.lineTo(-4.6,-14);
      ctx.quadraticCurveTo(0,-20,4.6,-14);ctx.lineTo(5.4,0);ctx.closePath();ctx.fill();
      ctx.fillStyle=acc;ctx.fillRect(-5,-8.6,10,2);          // belt
      ell(0,-21,4.4,4.2,lit);
      ell(0,-23.6,2.8,2.2,shade(col,64));                    // hair/cap
      ell(-1.6,-21.2,.85,.85,'#20202a');ell(1.6,-21.2,.85,.85,'#20202a');
      if(desc.weapon){
        ctx.strokeStyle=desc.weapon==='staff'?'#8a6a40':'#c9ccd8';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(6.6,-4);ctx.lineTo(6.6,-26);ctx.stroke();
        if(desc.weapon==='staff'){ell(6.6,-27,2,2,acc);}
      }
  }
  ctx.restore();
}

var RACE_SHAPE={H:'humanoid',D:'dwarf',E:'elf',HE:'elf',HL:'halfling',HF:'halfling',G:'humanoid',O:'humanoid',HN:'humanoid'};
function figForChar(c){
  var w=null;
  if(c){
    if(c.cls==='M')w='staff';
    else if(c.cls==='T')w='dagger';
    else if(c.eq&&c.eq.melee)w='blade';
  }
  return{shape:RACE_SHAPE[(c&&c.race)||'H']||'humanoid',
    color:(c&&c.color)||'#8888aa',
    accent:(c&&({F:'#c2502c',P:'#e3b54a',C:'#b07b4a',R:'#5f9e66',T:'#4fb3a9',M:'#b7a6e8'})[c.cls])||'#666',
    weapon:w,race:c&&c.race,cls:c&&c.cls};
}

function bg(canvas){
  var g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  var gr=g.createLinearGradient(0,0,0,h);
  gr.addColorStop(0,'#181a24');gr.addColorStop(1,'#0b0c11');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(227,181,74,.18)';g.strokeRect(.5,.5,w-1,h-1);
  return g;
}
function portrait(c,canvas){
  if(!canvas)return;
  var g=bg(canvas),w=canvas.width,h=canvas.height;
  g.fillStyle='rgba(227,181,74,.08)';
  g.beginPath();g.ellipse(w/2,h*.86,w*.32,h*.05,0,0,6.29);g.fill();
  drawFig(g,figForChar(c),w/2,h*.92,Math.min(w,h)/22);
  if(c&&c.cls){g.fillStyle='rgba(233,226,207,.65)';g.font=Math.max(9,Math.round(h*.11))+'px Georgia';g.fillText((c.cls||'')+' '+(c.lvl||1),6,h-6);}
}
function monFigure(def,canvas){
  if(!canvas)return;
  bg(canvas);
  var id=(def&&def.fig)||((def&&def.undead)?'skeleton':'blob');
  var h=0;var s=String((def&&def.n)||'x');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;
  var hues=['#7a5a4a','#6a7248','#5a6a7a','#7a4a5a','#5f5a72','#746249'];
  drawFig(canvas.getContext('2d'),{shape:id,color:def&&def.undead?'#a8a184':hues[Math.abs(h)%hues.length]},
    canvas.width/2,canvas.height*.92,Math.min(canvas.width,canvas.height)/(def&&def.size==='L'?17:21));
}
return{drawFig:drawFig,figForChar:figForChar,portrait:portrait,monFigure:monFigure};
})();
