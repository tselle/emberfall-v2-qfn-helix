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
  /* The company's kit goes over the shared silhouette - arms, mail, helm, shield,
     weapon. Creatures carry no `kit` and are drawn exactly as before. */
  if(desc.kit&&PERSON[shape])drawKit(ctx,desc,shape);
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

/* ================= the company =================
   Six adventurers used to be the same tunic silhouette in six hues with a grey
   stick for a weapon, which is how a fighter, a paladin and a mage came to be
   indistinguishable at the size a roster row allows. What separates a level-1
   company is its KIT: mail or plate, nasal or great helm, round or kite shield,
   sword, mace, bow or staff. So the kit is drawn, and the character's own colour
   becomes LIVERY - surcoat, shield face, trim - instead of the whole body.
   Only descriptions carrying a `kit` take this path, so the 251 creatures are
   exactly as they were. */
var FIG_W=25;                    // widest reach of a kit-bearer, in design units
var PERSON={
  humanoid:{sh:-16.4,waist:-8.6,hip:-7.2,shx:5.0,arm:8.4,hx:0,hy:-21,hw:4.4},
  dwarf:   {sh:-13.4,waist:-5.4,hip:-4.4,shx:6.6,arm:6.2,hx:0,hy:-19.4,hw:6.0},
  elf:     {sh:-19.6,waist:-9.6,hip:-8.2,shx:5.4,arm:9.2,hx:0,hy:-25,hw:5.0},
  highelf: {sh:-19.6,waist:-9.6,hip:-8.2,shx:5.4,arm:9.2,hx:0,hy:-25,hw:5.0},
  halfling:{sh:-11.2,waist:-4.6,hip:-3.8,shx:5.8,arm:5.6,hx:0,hy:-15.4,hw:5.0}
};
var CLASS_KIT={
  F:{garb:'#7b828d',armour:'mail',helm:'nasal',shield:'round',weapon:'sword'},
  P:{garb:'#969ca7',armour:'plate',helm:'great',shield:'kite',weapon:'sword',holy:1},
  C:{garb:'#b3ab9b',armour:'leather',helm:'coif',shield:'round',weapon:'mace',holy:1},
  R:{garb:'#5d6b4c',armour:'studded',helm:'hood',shield:'buckler',weapon:'bow'},
  T:{garb:'#4b4d55',armour:'leather',helm:'hood',shield:'buckler',weapon:'dagger',cloak:1},
  M:{garb:'#5f5680',armour:'cloth',helm:'wizard',weapon:'staff'}
};
/* What the sheet actually carries beats what the class usually buys. */
var WEAPON_ART={longsword:'sword',broadsword:'sword',shortsword:'sword',scimitar:'sword',
  greatsword:'sword',battleaxe:'axe',axe:'axe',handaxe:'axe',mace:'mace',morningstar:'mace',
  flail:'mace',warhammer:'hammer',spear:'spear',lance:'spear',longbow:'bow',shortbow:'bow',
  staff:'staff',quarterstaff:'staff',dagger:'dagger',knife:'dagger'};
var SKIN={H:'#c79b73',HE:'#cfa87f',E:'#dcc3a2',D:'#c1906a',HL:'#cba277',HF:'#c9a06e',
  G:'#8fae86',O:'#93a883',HN:'#c79b73'};
var HAIR=['#3b2a1a','#5b3d22','#7a5a34','#241d18','#8a6a3a'];

function figForChar(c){
  var cls=(c&&c.cls)||'F',base=CLASS_KIT[cls]||CLASS_KIT.F;
  var kit={armour:base.armour,helm:base.helm,shield:base.shield,weapon:base.weapon,
           holy:base.holy,cloak:base.cloak};
  var w=WEAPON_ART[c&&c.eq&&c.eq.melee];
  if(!w&&c&&c.eq&&c.eq.missile&&c.eq.missile.indexOf('bow')>0)w='bow';
  if(w)kit.weapon=w;
  kit.garb=base.garb;
  return{shape:RACE_SHAPE[(c&&c.race)||'H']||'humanoid',
    color:base.garb,                    // what they are wearing
    accent:(c&&c.color)||'#8888aa',     // their own colours: livery, not flesh
    skin:SKIN[(c&&c.race)||'H']||'#c79b73',
    hair:HAIR[hashId(c&&c.id)%HAIR.length],
    kit:kit,race:c&&c.race,cls:cls,lvl:c&&c.lvl};
}

/* Arms, mail, helms, shields and weapons, anchored to the same head the base
   painter already drew - marks and regalia hang off those anchors, so moving a
   head would slide a horn off a gnoll. */
function drawKit(ctx,desc,shape){
  var p=PERSON[shape];if(!p)return;
  var kit=desc.kit||{},col=desc.color,acc=desc.accent||shade(col,30);
  var skin=desc.skin||'#c79b73',hair=desc.hair||'#3b2a1a';
  var steel='#aeb5c0',steelD='#6d737d',iron='#4d525a',leather='#6a4a2c',
      leatherD='#4a3320',wood='#7a5a34',gold='#e3b54a';
  var tier=kit.armour||'cloth';
  function ell(cx,cy,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.29);ctx.fill();}
  function bar(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  function seg(x0,y0,x1,y1,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
  function quad(a,b,c2,d2,f){ctx.fillStyle=f;ctx.beginPath();ctx.moveTo(a[0],a[1]);
    ctx.lineTo(b[0],b[1]);ctx.lineTo(c2[0],c2[1]);ctx.lineTo(d2[0],d2[1]);ctx.closePath();ctx.fill();}
  var dark=shade(col,-22),litA=shade(col,26);
  var shX=p.shx,hy=p.hy,hw=p.hw;

  /* --- legs: boots for everyone, greaves for the armoured --- */
  var lx=shX*0.62;
  if(tier==='plate'||tier==='mail'){
    seg(-lx,-6.6,-lx-0.4,-2.2,3.6,tier==='plate'?steel:steelD);
    seg(lx,-6.6,lx+0.4,-2.2,3.6,tier==='plate'?shade(steel,-8):shade(steelD,-6));
  }
  ell(-lx-0.5,-1.7,2.7,1.7,leatherD);ell(lx+0.5,-1.7,2.7,1.7,leatherD);
  bar(-lx-3.0,-2.4,5.2,1.5,leather);bar(lx-2.2,-2.4,5.2,1.5,shade(leather,10));

  /* --- the livery: a surcoat or tabard down the middle of the man --- */
  quad([-hw*0.92,p.sh+0.6],[hw*0.92,p.sh+0.6],[hw*1.02,p.waist+1.6],[-hw*1.02,p.waist+1.6],acc);
  quad([-hw*0.42,p.sh+0.6],[hw*0.42,p.sh+0.6],[hw*0.5,p.waist+1.2],[-hw*0.5,p.waist+1.2],
       shade(acc,20));

  /* --- the armour below the belt --- */
  if(tier==='mail'){
    quad([-hw*1.06,p.waist],[hw*1.06,p.waist],[hw*1.24,p.hip+2.6],[-hw*1.24,p.hip+2.6],steelD);
    for(var mi=0;mi<3;mi++)for(var mj=-2;mj<3;mj++)
      ell(mj*1.7,p.waist+1.1+mi*1.7,0.5,0.5,shade(steelD,26));
  }else if(tier==='plate'){
    quad([-hw*1.04,p.waist],[hw*1.04,p.waist],[hw*1.18,p.hip+2.2],[-hw*1.18,p.hip+2.2],steel);
    bar(-hw*1.16,p.waist+1.6,hw*2.32,1.2,steelD);
    bar(-hw*1.16,p.waist+3.4,hw*2.32,1.2,steelD);
  }else if(tier==='studded'){
    quad([-hw*1.02,p.waist],[hw*1.02,p.waist],[hw*1.14,p.hip+1.8],[-hw*1.14,p.hip+1.8],leather);
    for(var si=-2;si<3;si++)ell(si*1.9,p.waist+2.0,0.62,0.62,shade(leather,40));
  }else if(tier==='cloth'){
    quad([-hw*1.1,p.waist],[hw*1.1,p.waist],[hw*1.5,-0.6],[-hw*1.5,-0.6],col);
    for(var fi=-1;fi<2;fi++)seg(fi*2.6,p.waist+1,fi*3.4,-1,0.9,dark);
    bar(-hw*1.5,-1.6,hw*3.0,1.6,shade(col,18));
  }else{                                   /* leather */
    quad([-hw*1.0,p.waist],[hw*1.0,p.waist],[hw*1.1,p.hip+1.4],[-hw*1.1,p.hip+1.4],leather);
  }
  bar(-hw*1.1,p.waist-1.4,hw*2.2,1.8,tier==='plate'?steelD:leatherD);
  bar(-1.1,p.waist-1.6,2.2,2.2,tier==='plate'?gold:shade(leather,24));   // buckle

  /* --- arms: the shield arm cantileers out, the weapon arm holds its ground --- */
  var shHand=[-shX-2.4,p.waist+0.4],wHand=[shX+1.8,p.waist+0.2];
  seg(-shX+0.8,p.sh+1.0,shHand[0]+0.4,shHand[1]-2.2,2.5,dark);
  seg(shX-0.8,p.sh+1.0,wHand[0]-0.2,wHand[1]-2.4,2.5,litA);
  if(tier==='mail'||tier==='plate'){
    seg(-shX+0.6,p.sh+1.6,shHand[0]+0.2,shHand[1]-2.8,3.0,tier==='plate'?steel:steelD);
    seg(shX-0.6,p.sh+1.6,wHand[0]-0.1,wHand[1]-3.0,3.0,tier==='plate'?shade(steel,-6):steelD);
  }else if(tier!=='cloth'){
    seg(-shX+0.7,p.sh+2.4,shHand[0]+0.3,shHand[1]-2.0,2.6,leather);
    seg(shX-0.7,p.sh+2.4,wHand[0]-0.1,wHand[1]-2.2,2.6,leather);
  }
  if(tier==='plate'||tier==='mail'){
    ell(-shX+0.4,p.sh+0.8,3.0,2.3,tier==='plate'?steel:steelD);
    ell(shX-0.4,p.sh+0.8,3.0,2.3,tier==='plate'?shade(steel,-8):shade(steelD,-4));
  }
  ell(shHand[0],shHand[1],1.5,1.4,skin);ell(wHand[0],wHand[1],1.5,1.4,skin);

  /* --- a cloak, if the trade warrants one --- */
  if(kit.cloak){
    quad([-shX-0.4,p.sh-0.4],[shX+0.4,p.sh-0.4],[shX+2.4,-0.6],[-shX-2.4,-0.6],dark);
    ell(0,p.sh-0.6,1.5,1.3,gold);
  }

  /* --- the face: the base painter left a helmet-coloured blank where a person
     should be, so put flesh and an eye line in before the helm covers the top --- */
  ell(p.hx,hy+0.5,hw*0.84,hw*0.92,skin);
  ell(p.hx,hy-hw*0.42,hw*0.72,hw*0.42,hair);                 // hairline
  ell(p.hx-hw*0.34,hy+0.6,0.62,0.72,'#1d1a20');
  ell(p.hx+hw*0.34,hy+0.6,0.62,0.72,'#1d1a20');
  seg(p.hx,hy+1.7,p.hx,hy+2.4,0.55,shade(skin,-26));

  /* --- helms --- */
  var hr=hw*1.02;
  if(kit.helm==='nasal'){
    ctx.fillStyle=steel;ctx.beginPath();
    ctx.arc(p.hx,hy-0.4,hr,Math.PI,0);ctx.closePath();ctx.fill();
    bar(p.hx-hr,hy-0.6,hr*2,1.5,shade(steel,-16));
    bar(p.hx-0.6,hy-0.2,1.2,hr*1.35,shade(steel,12));         // the nasal
    bar(p.hx-hr*0.9,hy+hr*0.72,hr*1.8,1.6,steelD);            // neck guard
    seg(p.hx-hr*0.55,hy-hr*0.72,p.hx+hr*0.2,hy-hr*0.86,0.8,shade(steel,38));
  }else if(kit.helm==='great'){
    bar(p.hx-hr,hy-hr*1.05,hr*2,hr*2.05,steel);
    bar(p.hx-hr,hy-hr*1.05,hr*2,1.6,shade(steel,24));
    bar(p.hx-hr,hy+hr*0.5,hr*2,1.5,steelD);
    bar(p.hx-hr*0.78,hy+0.1,hr*1.56,1.25,iron);               // visor slit
    bar(p.hx-0.55,hy-0.4,1.1,2.6,iron);
    for(var gi=0;gi<3;gi++)bar(p.hx+hr*0.34,hy+1.6+gi*1.3,1.0,0.7,iron);  // breaths
    bar(p.hx-hr,hy-hr*0.2,1.4,hr*1.2,shade(steel,18));
  }else if(kit.helm==='coif'){
    ctx.fillStyle=steelD;ctx.beginPath();
    ctx.arc(p.hx,hy-0.2,hr,Math.PI,0.06);ctx.closePath();ctx.fill();
    for(var ci=0;ci<7;ci++)ell(-hr*0.8+ci*hr*0.27,hy-hr*0.55,0.42,0.42,shade(steel,24));
    bar(p.hx-hr*0.9,hy+hr*0.62,hr*1.8,1.5,steelD);
  }else if(kit.helm==='hood'){
    ctx.fillStyle=shade(col,-10);ctx.beginPath();
    ctx.moveTo(p.hx-hr*1.14,hy+hr*0.9);ctx.quadraticCurveTo(p.hx-hr*1.2,hy-hr*1.5,
      p.hx+hr*0.2,hy-hr*1.25);
    ctx.quadraticCurveTo(p.hx+hr*1.3,hy-hr*0.9,p.hx+hr*1.06,hy+hr*0.95);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(14,12,18,.5)';ctx.beginPath();
    ctx.ellipse(p.hx,hy+0.7,hw*0.62,hw*0.66,0,0,6.29);ctx.fill();
    ell(p.hx-hw*0.34,hy+0.7,0.55,0.66,'#0f0e14');
    ell(p.hx+hw*0.34,hy+0.7,0.55,0.66,'#0f0e14');
  }else if(kit.helm==='wizard'){
    bar(p.hx-hr*1.5,hy-hr*0.62,hr*3.0,1.9,shade(col,-18));    // brim
    ctx.fillStyle=shade(col,10);ctx.beginPath();
    ctx.moveTo(p.hx-hr*0.86,hy-hr*0.5);ctx.lineTo(p.hx+hr*0.3,hy-hr*2.05);
    ctx.lineTo(p.hx+hr*0.92,hy-hr*0.5);ctx.closePath();ctx.fill();
    bar(p.hx-hr*0.72,hy-hr*0.92,hr*1.5,1.4,gold);
    ell(p.hx+hr*0.36,hy-hr*2.05,1.0,1.0,acc);
  }

  /* --- what they carry for the gods, or for dinner --- */
  if(kit.holy){
    seg(p.hx-1.6,p.sh+1.2,p.hx,hy+hr*1.5,0.7,gold);
    seg(p.hx+1.6,p.sh+1.2,p.hx,hy+hr*1.5,0.7,gold);
    bar(p.hx-0.5,hy+hr*1.5-0.6,1.0,3.4,gold);
    bar(p.hx-1.6,hy+hr*1.5+0.4,3.2,1.0,gold);
  }

  /* --- the shield, on the shield arm --- */
  var sc=[shHand[0]-0.9,(p.sh+p.waist)/2+0.6];
  if(kit.shield==='round'){
    ell(sc[0],sc[1],4.6,4.6,steelD);
    ell(sc[0],sc[1],3.8,3.8,acc);
    ell(sc[0],sc[1],1.3,1.3,steel);
    ctx.strokeStyle=shade(acc,-26);ctx.lineWidth=0.7;
    ctx.beginPath();ctx.arc(sc[0],sc[1],2.7,0,6.29);ctx.stroke();
    seg(sc[0]-2.2,sc[1],sc[0]+2.2,sc[1],0.9,shade(acc,34));
  }else if(kit.shield==='kite'){
    ctx.fillStyle=steelD;ctx.beginPath();
    ctx.moveTo(sc[0]-4.4,sc[1]-4.8);ctx.lineTo(sc[0]+4.4,sc[1]-4.8);
    ctx.quadraticCurveTo(sc[0]+3.4,sc[1]+3.2,sc[0],sc[1]+6.4);
    ctx.quadraticCurveTo(sc[0]-3.4,sc[1]+3.2,sc[0]-4.4,sc[1]-4.8);
    ctx.closePath();ctx.fill();
    ctx.fillStyle=acc;ctx.beginPath();
    ctx.moveTo(sc[0]-3.3,sc[1]-3.8);ctx.lineTo(sc[0]+3.3,sc[1]-3.8);
    ctx.quadraticCurveTo(sc[0]+2.5,sc[1]+2.4,sc[0],sc[1]+4.9);
    ctx.quadraticCurveTo(sc[0]-2.5,sc[1]+2.4,sc[0]-3.3,sc[1]-3.8);
    ctx.closePath();ctx.fill();
    bar(sc[0]-0.6,sc[1]-3.0,1.2,6.6,gold);bar(sc[0]-2.4,sc[1]-1.0,4.8,1.2,gold);
  }else if(kit.shield==='buckler'){
    ell(sc[0],sc[1],2.9,2.9,steelD);ell(sc[0],sc[1],2.2,2.2,acc);ell(sc[0],sc[1],0.9,0.9,steel);
  }

  /* --- the weapon, in the weapon hand --- */
  var wh=wHand;
  if(kit.weapon==='sword'){
    bar(wh[0]-0.55,wh[1]-2.4,1.1,2.2,leather);                 // grip
    bar(wh[0]-2.2,wh[1]-3.2,4.4,1.3,gold);                     // crossguard
    ctx.fillStyle=steel;ctx.beginPath();                       // blade
    ctx.moveTo(wh[0]-0.85,wh[1]-3.4);ctx.lineTo(wh[0]+0.85,wh[1]-3.4);
    ctx.lineTo(wh[0]+0.85,wh[1]-13.6);ctx.lineTo(wh[0],wh[1]-15.2);
    ctx.lineTo(wh[0]-0.85,wh[1]-13.2);ctx.closePath();ctx.fill();
    seg(wh[0]+0.1,wh[1]-4.0,wh[0]+0.1,wh[1]-13.6,0.55,shade(steel,34));  // fuller
    ell(wh[0],wh[1]+0.3,0.9,0.9,gold);                         // pommel
  }else if(kit.weapon==='axe'){
    seg(wh[0],wh[1]+0.4,wh[0]+0.4,wh[1]-13.0,1.4,wood);
    ctx.fillStyle=steel;ctx.beginPath();
    ctx.moveTo(wh[0]+0.2,wh[1]-12.6);ctx.quadraticCurveTo(wh[0]+5.4,wh[1]-11.4,
      wh[0]+3.4,wh[1]-7.2);
    ctx.lineTo(wh[0]+0.2,wh[1]-8.2);ctx.closePath();ctx.fill();
    bar(wh[0]-0.9,wh[1]-13.4,1.9,1.3,iron);
  }else if(kit.weapon==='mace'){
    seg(wh[0],wh[1]+0.4,wh[0],wh[1]-10.4,1.4,wood);
    ell(wh[0],wh[1]-12.0,2.4,2.4,iron);
    for(var mqi=0;mqi<4;mqi++){var qa=mqi*Math.PI/2+0.78;
      tri2(ctx,[wh[0],wh[1]-12.0],[wh[0]+Math.cos(qa)*4.0,wh[1]-12.0+Math.sin(qa)*4.0],
           [wh[0]+Math.cos(qa+0.8)*2.2,wh[1]-12.0+Math.sin(qa+0.8)*2.2],steel);
    }
    ell(wh[0],wh[1]-12.0,1.0,1.0,shade(steel,24));
    bar(wh[0]-1.3,wh[1]-9.6,2.6,1.2,iron);
  }else if(kit.weapon==='hammer'){
    seg(wh[0],wh[1]+0.4,wh[0],wh[1]-11.0,1.4,wood);
    bar(wh[0]-2.6,wh[1]-14.2,5.2,3.4,iron);
    bar(wh[0]-2.6,wh[1]-14.2,5.2,1.2,steel);
  }else if(kit.weapon==='spear'){
    seg(wh[0],wh[1]+1.0,wh[0]+0.5,wh[1]-18.4,1.4,wood);
    ctx.fillStyle=steel;ctx.beginPath();
    ctx.moveTo(wh[0]+0.5,wh[1]-16.2);ctx.lineTo(wh[0]+1.9,wh[1]-19.6);
    ctx.lineTo(wh[0]+0.6,wh[1]-22.6);ctx.lineTo(wh[0]-0.7,wh[1]-19.4);
    ctx.closePath();ctx.fill();
    bar(wh[0]-1.0,wh[1]-16.8,2.2,1.2,iron);
  }else if(kit.weapon==='bow'){
    ctx.strokeStyle=wood;ctx.lineWidth=1.3;ctx.beginPath();
    ctx.moveTo(wh[0]+1.4,wh[1]-8.4);ctx.quadraticCurveTo(wh[0]+6.2,wh[1]-1.6,
      wh[0]+1.4,wh[1]+4.2);ctx.stroke();
    ctx.strokeStyle='rgba(226,220,198,.75)';ctx.lineWidth=0.55;
    ctx.beginPath();ctx.moveTo(wh[0]+1.4,wh[1]-8.4);ctx.lineTo(wh[0]+1.4,wh[1]+4.2);
    ctx.stroke();
    bar(wh[0]+0.6,wh[1]-1.8,1.6,3.6,leatherD);                 // the grip wrap
  }else if(kit.weapon==='dagger'){
    bar(wh[0]-0.5,wh[1]-1.8,1.0,2.0,leather);
    bar(wh[0]-1.7,wh[1]-2.5,3.4,1.0,iron);
    ctx.fillStyle=steel;ctx.beginPath();
    ctx.moveTo(wh[0]-0.7,wh[1]-2.6);ctx.lineTo(wh[0]+0.7,wh[1]-2.6);
    ctx.lineTo(wh[0],wh[1]-8.6);ctx.closePath();ctx.fill();
  }else if(kit.weapon==='staff'){
    seg(wh[0]-0.4,1.0,wh[0]+0.5,-25.6,1.6,wood);
    bar(wh[0]-0.9,-3.4,1.9,1.6,iron);bar(wh[0]-0.7,-25.0,2.0,1.6,iron);
    ell(wh[0]+0.6,-26.8,1.8,1.8,acc);ell(wh[0]+0.2,-27.2,0.8,0.8,shade(acc,40));
  }
}

function portrait(c,canvas){
  if(!canvas)return;
  fitDpi(canvas);
  var g=bg(canvas),w=canvas.width,h=canvas.height;
  var d=figForChar(c);
  /* Fit the whole likeness - helm crest, shield rim, staff head - inside the
     frame with margin. Scaling by the box's short side alone slid helms off the
     top edge and cut shields at the sides, which is what made six adventurers
     look like six clipped blobs. */
  var s=Math.max(0.14,Math.min(h*0.79/FIG_H,(w*0.82)/FIG_W));
  var fy=h*0.90;
  g.fillStyle='rgba(227,181,74,.10)';
  g.beginPath();g.ellipse(w/2,fy,w*.30,h*.035,0,0,6.29);g.fill();
  g.strokeStyle='rgba(233,226,207,.12)';g.lineWidth=1;
  g.beginPath();g.moveTo(w*.12,fy+.5);g.lineTo(w*.88,fy+.5);g.stroke();
  drawFig(g,d,w/2,fy,s);
  if(c&&c.cls){
    /* The class tag used to be printed straight over the figure's own feet. It
       goes on a plate in the free top corner now. */
    var fs=Math.max(9,Math.round(h*0.115)),lab=(c.cls||'')+' '+(c.lvl||1);
    g.font=fs+'px Georgia';
    var tw=g.measureText(lab).width;
    g.fillStyle='rgba(8,9,13,.78)';g.fillRect(0,0,tw+fs*0.95,fs*1.55);
    g.fillStyle='rgba(227,181,74,.5)';g.fillRect(0,fs*1.55-1,tw+fs*0.95,1);
    g.fillStyle='rgba(233,226,207,.86)';g.fillText(lab,fs*0.48,fs*1.16);
  }
}

/* Roster and party portraits are 44×52 in CSS. On a retina screen a 44-pixel
   bitmap is then stretched to 88, which is why the company looked soft while the
   text beside it was crisp. The bitmap follows the device; the CSS size stays. */
function fitDpi(canvas){
  var d=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  var cw=canvas.clientWidth||canvas.width,ch=canvas.clientHeight||canvas.height;
  if(!cw||!ch)return;
  var bw=Math.round(cw*d),bh=Math.round(ch*d);
  if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
}
function bg(canvas){
  var g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  var gr=g.createLinearGradient(0,0,0,h);
  gr.addColorStop(0,'#181a24');gr.addColorStop(1,'#0b0c11');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(227,181,74,.18)';g.strokeRect(.5,.5,w-1,h-1);
  return g;
}
function monFigure(def,canvas,id){
  if(!canvas)return;
  fitDpi(canvas);
  bg(canvas);
  var g=canvas.getContext('2d'),h=canvas.height;
  var d=monDesc(id||(def&&def.id)||'',def);
  // a large creature is taller on the card too, but never cropped by it
  var tall=Math.min(h*0.9,h*0.62*sizeOf(def));
  inBox(g,d,canvas.width/2,h*.9,tall);
}
return{drawFig:drawFig,figForChar:figForChar,portrait:portrait,monFigure:monFigure,
  monDesc:monDesc,monColor:monColor,sizeOf:sizeOf,inBox:inBox,inBoxAnim:inBoxAnim,
  marksFor:marksFor,gaitAt:gaitAt,FRAMES:FRAMES,FIG_H:FIG_H,FIG_W:FIG_W,
  classKit:function(c){return figForChar(c);}};
})();
