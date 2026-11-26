/* Emberfall — js/figures.js
 * THE ONE LIKENESS. drawFig(ctx,desc,x,y,scale) is the only creature painter in
 * the game: portrait, bestiary card, map token, battle pawn and in-view billboard
 * all call it with the same desc from monDesc(id). Four surfaces each inventing
 * their own creature out of one monster id is how a goblin turns brown in the
 * vale, orange in a fight and grey in its own bestiary entry.
 * Silhouettes: humanoid, dwarf, elf, halfling, skeleton, rat, spider, wolf,
 * centipede, insect, beast, dragon, blob, serpent, orb, bird, bat.
 * Feet at (x,y); a shape spans FIG_H design units tall. Purely cosmetic. */
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
  /* contact shadow — surfaces that already ground the figure pass noShadow */
  if(!desc.noShadow){
    ctx.fillStyle='rgba(0,0,0,.45)';
    ctx.beginPath();ctx.ellipse(0,0,10,3,0,0,6.29);ctx.fill();
  }
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
      /* Bone used to be four literal greys, which made every skeleton in the
         game the same creature. Bone is now the pale end of this creature's own
         colour, so a fresh skeleton, a wight and an ancient barrow-king share a
         family and keep their differences. */
      var bone=desc.bone||shade(col,58),rib=desc.rib||shade(col,42),skull=desc.skull||shade(col,76);
      limb(0,-16,0,-6,2.4,bone);
      for(var r=0;r<3;r++)limb(-4.4,-14+r*3.4,4.4,-14+r*3.4,1.6,rib);
      limb(-4,-6,-5,0,1.8,bone);limb(4,-6,5,0,1.8,bone);
      ell(0,-20,4.4,4.2,skull);
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
      ell(0,-14,8.4,8.4,col);
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
  if(desc.marks&&desc.marks.length)drawMarks(ctx,desc,shape,col,acc,lit);
  if(desc.leader)regalia(ctx,shape);
  ctx.restore();
}
/* ================= family marks =================
   Many of the 251 creatures share a shape: gnoll, kobold, goblin and cultist are
   all "small upright thing". Size and hue alone do not separate them at 30 pixels,
   so each likeness carries one or two MARKS that change the SILHOUETTE - horns, a
   shoulder hump, a crest, a tail, a hood. Marks are derived from tags and names
   first and from a hash of the id otherwise, so a creature keeps its marks across
   a reload and a save, and no surface has to know they exist. */
var HEAD={humanoid:[0,-21,4.4],dwarf:[0,-19.4,6],elf:[0,-25,5],highelf:[0,-25,5],
  halfling:[0,-15.4,5],skeleton:[0,-20,4.4]};
var MARK_POOL=['horn','crest','tusk','ears','tail','hump','cowl','mask','plume','stump'];
var TAG_MARKS=[
  [/gnoll|hyena/,['hump','tusk']],
  [/troll|ogre|giant|cyclop|hill/,['hump','horn']],
  [/kobold|goblin|hobgob|slynt|nork/,['ears','plume']],
  [/orc|ugly|bandit|raider|brigand/,['horn','stump']],
  [/skeleton|bone|wight|ghoul|spectr|wraith|undead|shade|ghost/,['crest','mask']],
  [/wolf|hound|jackal|canine|dingo/,['crest','tusk']],
  [/rat|mouse|vermin|shrew|skink/,['ears','tail']],
  [/spider|beetle|insect|centipede|scorpion|moth|tick|wasp/,['tusk','ears']],
  [/serpent|snake|wyrm|dragon|viper|lizard/,['crest','tusk']],
  [/cult|priest|witch|acolyte|druid|monk|acolyt/,['cowl','mask']],
  [/bat|bird|crow|hawk|raven|owl|harpy/,['crest','ears']],
  [/blob|ooze|slime|pudding|gelatin|muck/,['mask','tail']]
];
function marksFor(id,def){
  def=def||(window.MONSTERS&&MONSTERS[id])||{};
  var hay=String(id||'')+' '+(def.name||'')+' '+(def.tags||[]).join(' ');
  hay=hay.toLowerCase();
  for(var i=0;i<TAG_MARKS.length;i++)if(TAG_MARKS[i][0].test(hay))return TAG_MARKS[i][1].slice();
  var h=hashId(id+'#marks');
  var a=MARK_POOL[h%MARK_POOL.length],b=MARK_POOL[(h>>4)%MARK_POOL.length];
  return a===b?[a]:[a,b];
}
function drawMarks(ctx,desc,shape,col,acc,lit){
  var mk=desc.marks,i,m;
  var dark=shade(col,-34),hi=shade(col,44);
  var hd=HEAD[shape];
  /* quadruped and low shapes take their marks along the back and the muzzle */
  var LOW={wolf:[-1,-9,9,4.8,[7.4,-12.4]],rat:[-1,-6,6.6,4.6,[5.6,-8.4]],
    beast:[-1,-9,10,6.4,[8,-13]],spider:[-2,-7,6,5.4,[4.4,-6]],
    centipede:[0,-6,8,3.4,[6,-6]],insect:[0,-6,8,3.4,[6,-6]],
    serpent:[4,-12,6,4,[10.6,-15]],blob:[0,-7,10,7,[6,-6]],
    orb:[0,-14,8.4,8.4,[7,-16]],dragon:[0,-12,5,8.4,[1,-23.6]],
    bird:[0,-12,3.4,4.6,[0,-17.4]],bat:[0,-12,3.4,4.6,[0,-17.4]]};
  var lo=LOW[shape];
  for(i=0;i<mk.length;i++){m=mk[i];
    if(m==='horn'&&hd){
      ctx.strokeStyle=hi;ctx.lineWidth=1.5;ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(hd[0]-hd[2]*.7,hd[1]-hd[2]*.55);ctx.quadraticCurveTo(hd[0]-hd[2]*1.5,hd[1]-hd[2]*1.5,hd[0]-hd[2]*1.1,hd[1]-hd[2]*2.1);
      ctx.moveTo(hd[0]+hd[2]*.7,hd[1]-hd[2]*.55);ctx.quadraticCurveTo(hd[0]+hd[2]*1.5,hd[1]-hd[2]*1.5,hd[0]+hd[2]*1.1,hd[1]-hd[2]*2.1);
      ctx.stroke();
    }else if(m==='horn'&&lo){
      ctx.strokeStyle=hi;ctx.lineWidth=1.3;
      ctx.beginPath();
      ctx.moveTo(lo[3][0]-1,lo[3][1]-2.4);ctx.quadraticCurveTo(lo[3][0]-1,lo[3][1]-6,lo[3][0]+2,lo[3][1]-6.6);
      ctx.stroke();
    }else if(m==='crest'){
      ctx.fillStyle=dark;
      if(hd){
        ctx.beginPath();
        ctx.moveTo(hd[0]-2.6,hd[1]-hd[2]*.9);ctx.lineTo(0,hd[1]-hd[2]*2.2);ctx.lineTo(hd[0]+2.6,hd[1]-hd[2]*.9);
        ctx.closePath();ctx.fill();
      }else if(lo){
        for(var cm=0;cm<4;cm++){
          var bxp=lo[0]-lo[2]*.55+cm*(lo[2]*0.42);
          ctx.beginPath();ctx.moveTo(bxp-1.3,lo[1]-lo[3]*.75);
          ctx.lineTo(bxp,lo[1]-lo[3]*1.75-cm*0.4);ctx.lineTo(bxp+1.3,lo[1]-lo[3]*.75);
          ctx.closePath();ctx.fill();
        }
      }
    }else if(m==='tusk'){
      ctx.fillStyle='#e6dfc9';
      if(hd){
        ctx.beginPath();ctx.moveTo(hd[0]-2.6,hd[1]+hd[2]*.35);ctx.lineTo(hd[0]-1.9,hd[1]-hd[2]*.5);ctx.lineTo(hd[0]-1.1,hd[1]+hd[2]*.35);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(hd[0]+2.6,hd[1]+hd[2]*.35);ctx.lineTo(hd[0]+1.9,hd[1]-hd[2]*.5);ctx.lineTo(hd[0]+1.1,hd[1]+hd[2]*.35);ctx.closePath();ctx.fill();
      }else if(lo){
        ctx.beginPath();ctx.moveTo(lo[3][0]+2.2,lo[3][1]+1.2);ctx.lineTo(lo[3][0]+2.8,lo[3][1]-1.9);ctx.lineTo(lo[3][0]+3.4,lo[3][1]+1.2);ctx.closePath();ctx.fill();
      }
    }else if(m==='ears'){
      if(hd){
        tri2(ctx,[hd[0]-hd[2]*.75,hd[1]-hd[2]*.35],[hd[0]-hd[2]*1.75,hd[1]-hd[2]*1.9],[hd[0]-hd[2]*.05,hd[1]-hd[2]*1.05],shade(col,10));
        tri2(ctx,[hd[0]+hd[2]*.75,hd[1]-hd[2]*.35],[hd[0]+hd[2]*1.75,hd[1]-hd[2]*1.9],[hd[0]+hd[2]*.05,hd[1]-hd[2]*1.05],shade(col,10));
      }else if(lo){
        tri2(ctx,[lo[3][0]-2.4,lo[3][1]-1.6],[lo[3][0]-1.2,lo[3][1]-7.4],[lo[3][0]+1.4,lo[3][1]-2.4],shade(col,10));
      }
    }else if(m==='tail'){
      ctx.strokeStyle=dark;ctx.lineWidth=1.9;ctx.lineCap='round';
      ctx.beginPath();
      if(lo&&lo[2]>4){ctx.moveTo(lo[0]-lo[2],lo[1]);ctx.quadraticCurveTo(lo[0]-lo[2]-6.4,lo[1]-1.4,lo[0]-lo[2]-7.4,lo[1]+3.2);}
      else{ctx.moveTo(-4.6,-4);ctx.quadraticCurveTo(-11,-3.4,-10.4,2.6);}
      ctx.stroke();
    }else if(m==='hump'){
      ell2(ctx,-1.4,-14.6,6.4,4.4,shade(col,-8));
      if(hd)ell2(ctx,-1.2,-13.4,4.4,2.6,hi);
    }else if(m==='cowl'){
      ctx.fillStyle=shade(col,-14);
      if(hd){
        ctx.beginPath();ctx.moveTo(hd[0]-hd[2]*1.25,hd[1]+hd[2]*.65);
        ctx.quadraticCurveTo(hd[0]-hd[2]*1.5,hd[1]-hd[2]*2.1,hd[0],hd[1]-hd[2]*2.35);
        ctx.quadraticCurveTo(hd[0]+hd[2]*1.5,hd[1]-hd[2]*2.1,hd[0]+hd[2]*1.25,hd[1]+hd[2]*.65);
        ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(10,9,14,.55)';
        ctx.beginPath();ctx.ellipse(hd[0],hd[1],hd[2]*.72,hd[2]*.86,0,0,6.29);ctx.fill();
      }else if(lo){
        ell2(ctx,lo[3][0],lo[3][1]-.6,4.2,3.6,shade(col,-14));
      }
    }else if(m==='mask'){
      ctx.fillStyle='#ddd5bb';
      if(hd){ctx.beginPath();ctx.ellipse(hd[0],hd[1]+hd[2]*.12,hd[2]*.62,hd[2]*.74,0,0,6.29);ctx.fill();
        ctx.fillStyle='#20202a';ctx.fillRect(hd[0]-2.4,hd[1]-.6,1.5,1.2);ctx.fillRect(hd[0]+.9,hd[1]-.6,1.5,1.2);
      }else if(lo){ell2(ctx,lo[3][0],lo[3][1],2.8,2.2,'#ddd5bb');}
    }else if(m==='plume'){
      ctx.strokeStyle=acc;ctx.lineWidth=1.2;
      ctx.beginPath();
      var py=hd?hd[1]-hd[2]*1.15:lo?lo[3][1]-3:0;
      var px2=hd?hd[0]:lo?lo[3][0]:0;
      ctx.moveTo(px2,py);ctx.quadraticCurveTo(px2+2.4,py-5.6,px2-.6,py-9.4);
      ctx.stroke();
    }else if(m==='stump'){
      ell2(ctx,-4.2,-2.4,3.4,2.6,shade(col,-16));
      ell2(ctx,4.2,-2.4,3.4,2.6,shade(col,-16));
    }
  }
}
function ell2(ctx,cx,cy,rx,ry,fill){
  ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.29);ctx.fill();
}
function tri2(ctx,a,b,c,fill){
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);
  ctx.closePath();ctx.fill();
}
/* A named foe is the same named foe on every surface: the same gold crown over
   the brow in portrait, battle and billboard, or a gold halo above a thing that
   has no brow. */
var HEAD_TOP={humanoid:-25.4,dwarf:-26.6,elf:-30,highelf:-30,halfling:-19.6,
  skeleton:-24.4,rat:-11.4,spider:-9.6,wolf:-16.4,centipede:-8.6,insect:-8.6,
  beast:-17.4,dragon:-28.4,blob:-14,serpent:-17.4,orb:-22.6,bird:-19.4,bat:-19.4};
function regalia(ctx,shape){
  var hy=HEAD_TOP[shape];
  ctx.strokeStyle='#e3b54a';ctx.lineWidth=1.5;
  if(hy===undefined||shape==='blob'||shape==='orb'){
    ctx.beginPath();ctx.ellipse(0,-22,8.6,2.6,0,0,6.29);ctx.stroke();return;
  }
  var y0=hy-0.6;
  ctx.beginPath();
  ctx.moveTo(-4.4,y0);ctx.lineTo(-3,y0-4.4);ctx.lineTo(-1.2,y0-1.4);
  ctx.lineTo(0,y0-5.4);ctx.lineTo(1.2,y0-1.4);ctx.lineTo(3,y0-4.4);ctx.lineTo(4.4,y0);
  ctx.stroke();
}

/* ================= one recipe per creature =================
   Colour comes from tags first, so a troll is green wherever you meet it and a
   shade is cold in the bestiary and in your face alike. Untagged creatures get a
   stable hue hashed from their id — stable, not random, so the same goblin is the
   same goblin across a reload. */
var EARTH=['#7a5a4a','#6a7248','#5a6a7a','#7a4a5a','#5f5a72','#746249',
           '#6d5f3f','#4f6552','#7b5230','#55506b'];
function hashId(s){var h=0;s=String(s||'x');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
function monColor(id,def){
  def=def||(window.MONSTERS&&MONSTERS[id])||{};
  if(def.undead)return def.undead>=2?'#9fa0b4':'#a8a184';
  var t=def.tags||[];
  if(t.indexOf('troll')>=0||def.regen)return '#5d7d4a';
  if(t.indexOf('giantkin')>=0)return '#8a6a4a';
  if(t.indexOf('ogre')>=0)return '#7d6b4f';
  if(t.indexOf('vermin')>=0)return '#6b5a3c';
  if(t.indexOf('canine')>=0)return '#8d8378';
  if(t.indexOf('gnoll')>=0)return '#8a7a4e';
  if(t.indexOf('cult')>=0)return '#6b5560';
  if(t.indexOf('dragon')>=0||t.indexOf('wyrm')>=0)return '#8c4633';
  if(def.poison)return '#5f7a4a';
  return EARTH[hashId(id)%EARTH.length];
}
function monDesc(id,def){
  def=def||(window.MONSTERS&&MONSTERS[id])||{};
  var col=monColor(id,def);
  return {
    shape:def.fig||(def.undead?'skeleton':'humanoid'),
    color:col,
    accent:def.leader?'#e3b54a':(def.undead?'#e9e2cf':shade(col,40)),
    weapon:def.leader?'blade':null,
    leader:!!def.leader,
    marks:marksFor(id,def),
    size:def.size||'M'
  };
}
/* A large creature is 1.4× in the board, the vale and the in-view billboard —
   the same factor everywhere, so a troll towers consistently. */
var FIG_H=30;
function sizeOf(def){return (def&&def.size==='L')?1.4:((def&&def.size==='S')?0.72:1);}
/* Draw a likeness so its feet sit on cy and it stands hpx tall. */
function inBox(ctx,desc,cx,cy,hpx){drawFig(ctx,desc,cx,cy,Math.max(0.12,hpx/FIG_H));}

/* ================= the gait =================
   Four poses. The scene only repaints when something moves (the brief asks for
   paint-on-demand), so creatures step while you walk and hold a crisp pose when
   you stop — a shivering idle would need a timer nobody asked for. */
var FRAMES=4;
var GAIT=[{dy:0,lean:0},{dy:-1.6,lean:0.024},{dy:0,lean:0},{dy:-1.6,lean:-0.024}];
function gaitAt(i){return GAIT[((i%FRAMES)+FRAMES)%FRAMES];}
/* Feet on cy, whole figure bobbing and leaning about that point. */
function inBoxAnim(ctx,desc,cx,cy,hpx,frame){
  var g=gaitAt(frame),sc=Math.max(0.12,hpx/FIG_H);
  ctx.save();
  ctx.translate(cx,cy+g.dy*sc);
  ctx.rotate(g.lean);
  drawFig(ctx,desc,0,0,sc);
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
function monFigure(def,canvas,id){
  if(!canvas)return;
  bg(canvas);
  var g=canvas.getContext('2d'),h=canvas.height;
  var d=monDesc(id||(def&&def.id)||'',def);
  // a large creature is taller on the card too, but never cropped by it
  var tall=Math.min(h*0.9,h*0.62*sizeOf(def));
  inBox(g,d,canvas.width/2,h*.9,tall);
}
return{drawFig:drawFig,figForChar:figForChar,portrait:portrait,monFigure:monFigure,
  monDesc:monDesc,monColor:monColor,sizeOf:sizeOf,inBox:inBox,inBoxAnim:inBoxAnim,
  marksFor:marksFor,gaitAt:gaitAt,FRAMES:FRAMES,FIG_H:FIG_H};
})();
