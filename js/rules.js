/* Emberfall — js/rules.js
 * Dice, seeded RNG, races, classes, ability modifiers, THAC0, saves, spell
 * slots, thief skills, character generation, XP and advancement.
 * No DOM, no game state, no drawing. Loaded first. */
'use strict';
var Rules=(function(){

/* ================= Dice & RNG ================= */
// Fixed 32-bit seeded generator (Mulberry32) — content generation only.
function RNG(seed){this.s=(seed>>>0)||2166136261;}
RNG.prototype.next=function(){
  this.s=(this.s+0x6D2B79F5)>>>0;
  var t=this.s;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
};
RNG.prototype.int=function(a,b){return a+Math.floor(this.next()*(b-a+1));};
RNG.prototype.chance=function(p){return this.next()<p;};
RNG.prototype.pick=function(a){return a[Math.floor(this.next()*a.length)];};
RNG.prototype.shuffle=function(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(this.next()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;};

// Nondeterministic play rolls. Tests may pin Rules.play via Rules.setPlay().
var play={
  d:function(n,s,lo,hi){lo=lo||1;hi=hi||s;var t=0;for(var i=0;i<n;i++)t+=lo+Math.floor(Math.random()*(hi-lo+1));return t;},
  d4:function(){return this.d(1,4);},d6:function(){return this.d(1,6);},
  d8:function(){return this.d(1,8);},d10:function(){return this.d(1,10);},
  d12:function(){return this.d(1,12);},d20:function(){return this.d(1,20);},
  d100:function(){return this.d(1,100);},
  chance:function(p){return Math.random()<p;},
  pick:function(a){return a[Math.floor(Math.random()*a.length)];}
};
function setPlay(p){
  // Mutate the exported object: Rules.play is handed out by reference at
  // export time, so rebinding the local would leave callers on Math.random.
  for(var k in p)if(typeof p[k]==='function')play[k]=p[k];
}

/* Roll a dice spec: 'NdS', 'NdS+K', 'NdS-K', 'dS', or a plain number. */
function dice(spec,rng){
  if(typeof spec==='number')return spec;
  var m=/^(\d*)d(\d+)([+-]\d+)?(?:x(\d+))?$/i.exec(String(spec).replace(/\s/g,'').replace(/[\u00d7\u2715*]/g,'x'));
  if(!m)return 0;
  var n=m[1]?+m[1]:1,s=+m[2],k=m[3]?+m[3]:0,x=m[4]?+m[4]:1,t=0;
  if(rng){for(var i=0;i<n;i++)t+=rng.int(1,s);}else{t=play.d(n,s);}
  return Math.max(0,(t+k)*x);
}
/* Monster HD notation: 4.3 = 4d8+3, 0.5 = 1d4, 0.9 = 1d8-1, 3 = 3d8. */
function hdHP(hd,rng){
  if(typeof hd==='string')return dice(hd,rng);
  var whole=Math.floor(hd+1e-6),frac=Math.round((hd-whole)*10);
  if(whole===0){
    if(frac===5)return dice('1d4',rng);
    var mo=frac-10;
    return Math.max(1,dice('1d8'+(mo>0?'+'+mo:mo<0?String(mo):''),rng));
  }
  return dice(whole+'d8'+(frac?(frac>0?'+':'')+frac:''),rng);
}
function clamp(v,a,b){return v<a?a:v>b?b:v;}

/* ================= Ability modifiers ================= */
var ABIL=['str','dex','con','int','wis','cha'];
var ABIL_NAME={str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'};

function strAdj(score,strx){ // returns {hit,dmg,openDoors}
  if(score<4)return{hit:-3,dmg:-2,openDoors:1};
  if(score<6)return{hit:-2,dmg:-2,openDoors:1};
  if(score<9)return{hit:-1,dmg:-1,openDoors:2};
  if(score<13)return{hit:0,dmg:0,openDoors:2};
  if(score<16)return{hit:0,dmg:1,openDoors:3};
  if(score<18)return{hit:1,dmg:2,openDoors:4};
  if(score===18){
    var p=strx||0;
    if(p===0||p>=100)return{hit:1,dmg:3,openDoors:5};           // 18/00 shown as 18/00 below at pct>=100 handled
    if(p<=50)return{hit:1,dmg:3,openDoors:5};
    if(p<=70)return{hit:2,dmg:4,openDoors:6};
    if(p<=90)return{hit:3,dmg:4,openDoors:7};
    if(p<=99)return{hit:3,dmg:5,openDoors:8};
    return{hit:4,dmg:6,openDoors:9};
  }
  if(score===19)return{hit:3,dmg:5,openDoors:10};
  if(score===20)return{hit:3,dmg:6,openDoors:11};
  return{hit:4,dmg:8,openDoors:15};
}
function strDisplay(score,strx){
  if(score===18&&strx) return '18/'+(strx===100?'00':(strx<10?'0'+strx:strx));
  return String(score);
}
function dexAdj(score){ // {ac,missile}
  if(score<4)return{ac:-3,missile:-3};
  if(score<6)return{ac:-2,missile:-2};
  if(score<9)return{ac:-1,missile:-1};
  if(score<16)return{ac:0,missile:0};
  if(score<18)return{ac:1,missile:1};
  if(score===18)return{ac:3,missile:2};
  if(score===19)return{ac:4,missile:3};
  if(score===20)return{ac:5,missile:4};
  return{ac:6,missile:5};
}
function conAdj(score){ // 2e HP adjustment: CON 16 → +2
  if(score<4)return-3; if(score<6)return-2; if(score<9)return-1; if(score<15)return 0;
  if(score<16)return 1; if(score<18)return 2; if(score<20)return 3; if(score<22)return 4; return 5;
}
function intAdj(score){ // {maxLevels: extra 9th-level capability, learn: learn-spell %, maxSpells}
  var a = score<4?-3:score<6?-2:score<9?-1:score<13?0:score<16?1:score<18?2:score<20?3:4;
  return {mod:a,
    learn: score<3?0:clamp(15+score*5,5,95),
    maxSpells: score<4?1:score<7?3:score<10?4:score<12?5:score<14?6:score<16?7:score<18?9:score<19?11:score<20?12:14};
}
function wisAdj(score){return score<4?-3:score<6?-2:score<9?-1:score<13?0:score<16?1:score<17?2:score<19?3:4;}
function chaAdj(score){return score<4?-3:score<6?-2:score<9?-1:score<13?0:score<16?1:score<17?2:score<19?3:4;}
/* Cleric spell failure below WIS 13 (2e-style). */
function divineFail(wis){return wis>=13?0:wis<9?25:wis===9?23:wis===10?19:wis===11?15:11;}

/* ================= Races ================= */
var RACES={
  H:{id:'H',name:'Human',adj:{},mv:12,
     bounds:{str:18,dex:18,con:18,int:18,wis:18,cha:18},
     classes:'FPRMCT',traits:{},blurb:'Ambitious and adaptable; no limits, no gifts.'},
  D:{id:'D',name:'Dwarf',adj:{con:1,cha:-1},mv:10,
     bounds:{str:18,dex:17,con:19,int:18,wis:20,cha:17},
     classes:'FCT',traits:{infravision:60,secretDoor:3,vsHumanoid:1,vsLarge:1,savePoison:2,saveMagic:1,saveGaze:1,saveWand:1,pick:-5,findTrap:5},
     blurb:'Stoneborn and stubborn; +1 CON, hardy against poison and magic.'},
  E:{id:'E',name:'Elf',adj:{dex:1,con:-1},mv:12,
     bounds:{str:18,dex:20,con:18,int:20,wis:18,cha:18},
     classes:'FRMCT',traits:{secretDoor:2,passSecret:6,sleepResist:.9,paralysisResist:1,weaponBonus:'swordbow',saveWand:-1},
     blurb:'Graceful and ancient; +1 DEX, resists sleep, keen for secret doors, +1 sword and bow.'},
  G:{id:'G',name:'Gnome',adj:{int:1,wis:-1},mv:10,
     bounds:{str:18,dex:19,con:20,int:20,wis:14,cha:18},
     classes:'FCT',traits:{infravision:60,vsHumanoid:1,vsLarge:1,saveMagic:1,saveWand:1,pick:5,illusionResist:.5},
     blurb:'Small illusionists of the deep; +1 INT, brave against giants.'},
  HE:{id:'HE',name:'Half-Elf',adj:{},mv:12,
     bounds:{str:18,dex:19,con:18,int:19,wis:19,cha:19},
     classes:'FRMCT',traits:{secretDoor:2,passSecret:6,sleepResist:.3,infravision:30},
     blurb:'Between two worlds; +1 DEX, half elven senses.'},
  HL:{id:'HL',name:'Halfling',adj:{dex:1,str:-1},mv:10,
     bounds:{str:16,dex:20,con:19,int:18,wis:17,cha:17},
     classes:'FCT',traits:{savePoison:2,saveMagic:1,saveBreath:1,missileBonus:1,vsLarge:1,silent:5,hide:5,pick:-5,size:'S'},
     blurb:'Nimble folk of the south; +1 DEX, uncanny with slings and shadow.'}
};

/* ================= Classes ================= */
/* xp[i] = threshold for level i+1. saves: table group. gold: class gold roll (×10 gp). */
var CLASSES={
  F:{id:'F',name:'Fighter',hd:'d10',mv:12,prime:['str'],min:{str:9},
     gold:'5d4',aligns:'LG NG CG LN N CN LE NE CE',save:'war',
     desc:'Master of weapons. Pick one melee weapon family to specialize in.'},
  P:{id:'P',name:'Paladin',hd:'d10',mv:12,prime:['str','cha'],min:{str:12,con:9,wis:13,cha:17},
     gold:'5d4',aligns:'LG',race:'H',save:'war',
     desc:'Holy knight. Human lawful good only. +2 saves, lay on hands, turns undead from level 3, priest spells from level 9.'},
  R:{id:'R',name:'Ranger',hd:'d10',mv:12,prime:['str','dex','wis'],min:{str:13,dex:13,con:14,wis:14},
     gold:'5d4',aligns:'LG NG CG',save:'war',
     desc:'Warden of the wild. Choose a species enemy: +4 to hit and +1 damage/level vs it.'},
  M:{id:'M',name:'Mage',hd:'d4',mv:12,prime:['int'],min:{int:9},
     gold:'1d4+1',aligns:'LG NG CG LN N CN LE NE CE',save:'ma',
     desc:'Student of the arcane. Spellbook; no ordinary armor or shields.'},
  C:{id:'C',name:'Cleric',hd:'d8',mv:12,prime:['wis'],min:{wis:9},
     gold:'3d6',aligns:'LG NG CG LN N CN LE NE CE',save:'pri',
     desc:'Servant of the dawn. Blunt weapons, armor, priest spells, turns undead.'},
  T:{id:'T',name:'Thief',hd:'d6',mv:12,prime:['dex'],min:{dex:9},
     gold:'2d6',aligns:'NG CG LN N CN LE NE CE',save:'ma',
     desc:'Silent hand. Locks, traps, shadows, backstabs.'}
};
var XPT={
  F:[0,2000,4000,8000,14000,23000,35000,51000,75000,110000,155000,210000,270000,340000,425000,525000,640000,775000,925000,1100000],
  P:[0,2250,4500,9000,13500,27000,55000,110000,175000,250000,340000,440000,560000,695000,850000,1020000,1210000,1425000,1665000,1930000],
  R:[0,2250,4500,9000,13500,27000,55000,110000,175000,250000,340000,440000,560000,695000,850000,1020000,1210000,1425000,1665000,1930000],
  M:[0,2500,5000,10000,20000,40000,60000,90000,135000,250000,375000,750000,1125000,1500000,1875000,2250000,2625000,3000000,3375000,3750000],
  C:[0,1500,3000,6000,13000,27500,50000,90000,150000,250000,350000,500000,650000,850000,1100000,1350000,1650000,1975000,2325000,2700000],
  T:[0,1250,2500,5000,10000,20000,40000,70000,110000,160000,220000,290000,380000,475000,575000,700000,850000,1000000,1150000,1350000]
};
var KIT_LEVELS=[3,5,9,13,17];          // class kit thresholds
var KIT_GOLD=[150,500,2000,6000,12000]; // extra gold for freshly-made higher-level heroes
var SAVE_NAMES=['Paralyzation or Poison or Death Magic','Rod, Staff or Wand','Petrification or Polymorph','Breath Weapon','Spell'];

/* Saving throw target arrays (index = level-1). Fighter row fixed by spec:
   level 1 = 14/16/15/17/17. Groups improve per their cadence. */
function saveTargets(group,lvl){
  lvl=clamp(lvl,1,20);
  var base=[14,16,15,17,17],b;
  if(group==='war')      b=Math.floor(lvl/2);                 // reaches 4/6/5/7/7 at 20
  else if(group==='pri') b=Math.floor((lvl+1)/3)+ (lvl>=20?1:0); // priests trail warriors slightly
  else                   b=Math.floor(lvl/3);                 // mages and thieves trail further
  return base.map(function(v){return v-b;});
}
function THAC0(cls,lvl){
  lvl=clamp(lvl,1,20);var n=lvl-1;
  if(cls==='F'||cls==='P'||cls==='R')return 20-n;
  if(cls==='C')return 20-2*Math.floor(n/3);
  if(cls==='T')return 20-Math.floor(n/2);
  return 20-Math.floor(n/3); // mage
}
/* Melee attacks per round given current battle round (1-based).
   Warriors: 1 → 3/2 at 7 (half attack on even rounds) → 2 at 13.
   Fighters with a specialization in the wielded family gain another half attack. */
function attacksPerRound(char,round,weaponFamily){
  var n=1,half=0;
  if(char.cls==='F'||char.cls==='P'||char.cls==='R'){
    if(char.lvl>=13)n=2;
    if(char.lvl>=7)half+=1;                 // base warrior half attack from level 7
    // Fighter specialization in the wielded family: extra half attack at any level.
    if(char.cls==='F'&&char.spec&&weaponFamily===char.spec)half+=1;
  }
  var total=n+(half%2&&round%2===0?1:0)+Math.floor(half/2);
  if(char.fx&&char.fx.haste)total*=2;
  return Math.max(1,total);
}
/* Weapon specialization: a fighter wielding his chosen family gains +1 to hit. */
function specAdj(char,weaponFamily){
  return (char&&char.cls==='F'&&char.spec&&weaponFamily&&weaponFamily===char.spec)?1:0;
}
/* Missile rate of fire: 1 per round for most, 2 for bows at high level kept simple: 1. */
function missileROF(char){return (char.cls==='F'||char.cls==='P'||char.cls==='R')&&char.lvl>=7?2:1;}

/* Spell slots: rings 1..9 per caster level (base only; bonuses added below). */
var MAGE_SLOTS=[[1],[2],[2,1],[3,2],[4,2,1],[4,3,2],[4,3,2,1],[4,3,3,2],
 [5,4,3,2,1],[5,4,3,2,1],[5,4,4,3,2,1],[5,5,4,3,2,1],[5,5,4,4,3,2,1],[5,5,5,4,3,2,1],
 [6,5,5,4,3,2,1],[6,5,5,4,3,2,1],[6,5,5,4,4,3,2,1],[6,5,5,5,4,3,2,1],[6,5,5,5,4,3,2,2],[6,5,5,5,5,4,3,2,2]];
var PRIEST_SLOTS=[[1],[2],[2,1],[3,2],[4,2,1],[4,3,2],[4,3,2,1],[4,3,3,2],
 [5,4,3,2,1],[5,4,3,3,2],[5,4,4,3,2,1],[5,5,4,3,2,1],[5,5,4,4,3,2,1],[5,5,5,4,3,2,1],
 [6,5,5,4,3,2,1],[6,5,5,4,4,3,2,1],[6,5,5,5,4,3,2,1],[7,6,5,5,4,3,2,1],[7,6,5,5,4,4,2,1,1],[7,7,6,5,4,4,3,2,2]];
/* Bonus slots from 13+ prime ability: ring index per point. */
var BONUS_RING=[0,1,2,3,4,5,6];
function bonusSlots(score){ // returns array of ring indices (0-based) granted
  if(score<13)return[];
  var out=[];
  out.push(0); if(score>=15)out.push(1); if(score>=16)out.push(2);
  if(score>=17)out.push(3); if(score>=18)out.push(4);
  if(score>=19)out.push(1,3); if(score>=20)out.push(0,2);
  if(score>=25)out.push(5);
  return out;
}
function slotsFor(cls,lvl,score,ringCapOverride){
  lvl=clamp(lvl,1,20);var rings;
  if(cls==='M')rings=MAGE_SLOTS[lvl-1].slice();
  else if(cls==='C')rings=PRIEST_SLOTS[lvl-1].slice();
  else if(cls==='P'){
    var cl=clamp(lvl-8,1,9);
    if(cl<1)return[];
    rings=PRIEST_SLOTS[cl-1].slice(0,4); // paladins: four rings only
    return pad(rings,9,ringCapOverride||4);
  }
  else return[];
  bonusSlots(score||0).forEach(function(r){if(r<rings.length)rings[r]++;});
  // Ring capacity by caster level: max ring = slot table length.
  return pad(rings,9,ringCapOverride);
}
function pad(a,n,cap){var o=[];for(var i=0;i<n;i++)o.push(i<a.length&&(!cap||i<cap)?a[i]:0);return o;}
function maxRing(cls,lvl){var s=slotsFor(cls,lvl,0);for(var i=8;i>=0;i--)if(s[i])return i+1;return 0;}

/* ================= Character generation ================= */
function rollScores(rng){ // 4d6 drop lowest, in order STR DEX CON INT WIS CHA
  return ABIL.map(function(){
    var d=[rng.d6?rng.d6():rng.int(1,6),0,0,0];
    d[1]=rng.int(1,6);d[2]=rng.int(1,6);d[3]=rng.int(1,6);
    d.sort(function(a,b){return a-b;});
    return d[1]+d[2]+d[3];
  });
}
function genScores(rng,raceId,clsId){
  var race=RACES[raceId];
  for(var tries=0;tries<60;tries++){
    var raw=rollScores(rng),ok=true,adj={};
    for(var i=0;i<6;i++){
      var k=ABIL[i];
      if(raw[k==='str'?0:k==='dex'?1:k==='con'?2:k==='int'?3:k==='wis'?4:5]>race.bounds[k]){ok=false;break;}
    }
    if(!ok)continue;
    ABIL.forEach(function(k,idx){adj[k]=clamp(raw[idx]+(race.adj[k]||0),3,25);});
    var mins=CLASSES[clsId].min;
    for(var m in mins){if(adj[m]<mins[m]){ok=false;break;}}
    if(ok)return{raw:raw,scores:adj,rerolls:tries};
  }
  // bounded fallback: hand out minimum legal scores
  var s={};ABIL.forEach(function(k){s[k]=Math.min(race.bounds[k],Math.max(9,(CLASSES[clsId].min[k]||8)+1));});
  return{raw:s,scores:s,rerolls:60,fallback:true};
}
function rollClassGold(clsId,rng){return dice(CLASSES[clsId].gold,rng||null)*10;}
/* First level HP = full (maximum) class hit die + CON modifier, minimum 1. */
function firstLevelHP(clsId,con){
  var faces={F:10,P:10,R:10,C:8,T:6,M:4}[clsId]||6;
  return Math.max(1,faces+conAdj(con==null?10:con));
}
function rollHP(clsId,rng,con,level){
  var c=CLASSES[clsId];
  var rollUp=level<=( (clsId==='T'||clsId==='M')?10:9 );
  if(rollUp)return Math.max(1,dice('1'+c.hd,rng)+conAdj(con));
  return ({F:3,P:3,R:3,C:2,T:2,M:1})[clsId];
}
function pcStrength(rng,clsId,score){ // exceptional strength at 18 for warriors/thieves
  if(score===18&&(clsId==='F'||clsId==='P'||clsId==='R'||clsId==='T')){
    var p=(rng?rng.int(1,100):play.d100());
    return p; // 100 displayed 18/00
  }
  return 0;
}

/* ================= Advancement ================= */
function primeOK(char){
  var primes=CLASSES[char.cls].prime;
  return primes.every(function(p){return abilityScore(char,p)>=16;});
}
function xpModifier(char){return primeOK(char)?1.10:1;}
function nextXP(char){var t=XPT[char.cls];return char.lvl>=20?Infinity:t[char.lvl];}
function xpAward(char,amount){ // apply prime modifier and train-gate cap
  var t=XPT[char.cls],mod=Math.floor(amount*xpModifier(char));
  var capIdx=Math.min(char.lvl+1,19); // cannot cross more than one level untrained
  var cap=t[capIdx]-char.xp-1;
  if(char.lvl>=20)return 0;
  return Math.max(0,Math.min(mod,cap<0?0:cap));
}
function trainCost(lvl){return 100*lvl;}
function canTrain(char){return char.lvl<20&&char.xp>=nextXP(char);}
/* Apply one level: rolls HP, sets readiness. Returns {hpGained} */
function gainLevel(char,rng){
  var gain=rollHP(char.cls,rng,char.scores?char.scores.con:char.con,clamp(char.lvl+1,1,20));
  char.lvl+=1;char.maxhp+=gain;char.hp=Math.min(char.maxhp,char.hp+gain);
  return{hpGained:gain};
}

/* ================= Ability access ================= */
function abilityScore(c,k){return c.scores?c.scores[k]:(c[k]||10);}
function strOf(c){return strAdj(abilityScore(c,'str'),c.strx||0);}
function dexOf(c){return dexAdj(abilityScore(c,'dex'));}
function conOf(c){return conAdj(abilityScore(c,'con'));}
function intOf(c){return intAdj(abilityScore(c,'int'));}
function wisOf(c){return wisAdj(abilityScore(c,'wis'));}
function chaOf(c){return chaAdj(abilityScore(c,'cha'));}

/* Armor class and to-hit summary. Reads equipment via global item() when present. */
function armorAC(c){
  var it=typeof item==='function'?item(c.eq&&c.eq.armor):null;
  if(!it||it.t!=='a')return 10;
  return (it.ac||10)-(it.ench||0);
}
function shieldAC(c){
  var it=typeof item==='function'?item(c.eq&&c.eq.shield):null;
  if(!it||it.t!=='s')return 0;
  return 1+(it.ench||0);
}
function theAC(c){
  // AC 10 base; armor substitutes; DEX defense and shield subtract (lower is better).
  var ac=armorAC(c)-shieldAC(c)-dexOf(c).ac;
  var it,eq=c.eq||{};
  if(typeof item==='function'){
    ['ring1','ring2','cloak','boots','gloves','belt','neck','charm'].forEach(function(sl){
      it=item(eq[sl]);
      if(it&&it.bonus)ac-=it.bonus;
      if(it&&it.acBonus)ac-=it.acBonus;
    });
  }
  if(c.fx&&c.fx.armorField)ac=Math.min(ac,c.fx.armorField.ac);
  if(c.fx&&c.fx.haste)ac-=1;
  return ac;
}
function toHitRoll(char,targetAC,bonus){
  var th=THAC0(char.cls,char.lvl);
  var need=th-targetAC;
  var roll=play.d20();
  var total=roll+(bonus||0);
  var hit=(roll===20)||(roll!==1&&total>=need);
  return{roll:roll,total:total,need:need,hit:hit};
}
/* ================= Thief skills ================= */
function thiefSkills(c){
  if(c.cls!=='T')return null;
  var race=RACES[c.race].traits||{};
  var lvl=clamp(c.lvl,1,15);
  var dexB=abilityScore(c,'dex')>=13?(abilityScore(c,'dex')>=17?10:5):0;
  function sk(base,raceB){return clamp(base+(raceB||0)+dexB,0,95);}
  return{
    pick:   sk(15+2*(lvl-1),(race.pick||0)),
    findTrap:sk(10+2*(lvl-1),(race.findTrap||0)),
    removeTrap:sk(10+2*(lvl-1),(race.findTrap||0)),
    silent: sk(10+2*(lvl-1),(race.silent||0)),
    hide:   sk(10+2*(lvl-1),(race.hide||0)),
    hear:   sk(5+2*(lvl-1),0)
  };
}

/* ================= Turning undead ================= */
/* Authoritative turning check: d20 vs undead HD rank and cleric level.
   Up to 2d6 creatures affected, weakest first; caller applies. */
function turnResult(lvl,rank){
  var d=play.d20(),diff=lvl-rank;
  if(d===20||diff>=4)return'destroy';
  if(d>=12||diff>=2)return'turn';
  if(d>=8||diff>=0)return'hold';
  return'none';
}

/* ================= Alignment ================= */
var ALIGNMENTS={LG:'Lawful Good',NG:'Neutral Good',CG:'Chaotic Good',
  LN:'Lawful Neutral',N:'True Neutral',CN:'Chaotic Neutral',
  LE:'Lawful Evil',NE:'Neutral Evil',CE:'Chaotic Evil'};
function alignmentsFor(cls,race){
  return CLASSES[cls].aligns.split(' ').filter(function(a){
    if(cls==='P'&&!(race==='H'&&a==='LG'))return false;
    return true;
  });
}

return{
  RNG:RNG,play:play,setPlay:setPlay,dice:dice,hdHP:hdHP,clamp:clamp,
  ABIL:ABIL,ABIL_NAME:ABIL_NAME,
  strAdj:strAdj,strDisplay:strDisplay,dexAdj:dexAdj,conAdj:conAdj,intAdj:intAdj,wisAdj:wisAdj,chaAdj:chaAdj,divineFail:divineFail,
  RACES:RACES,CLASSES:CLASSES,XPT:XPT,KIT_LEVELS:KIT_LEVELS,KIT_GOLD:KIT_GOLD,
  SAVE_NAMES:SAVE_NAMES,saveTargets:saveTargets,THAC0:THAC0,
  attacksPerRound:attacksPerRound,specAdj:specAdj,missileROF:missileROF,
  MAGE_SLOTS:MAGE_SLOTS,PRIEST_SLOTS:PRIEST_SLOTS,slotsFor:slotsFor,maxRing:maxRing,bonusSlots:bonusSlots,
  rollScores:rollScores,genScores:genScores,rollClassGold:rollClassGold,rollHP:rollHP,firstLevelHP:firstLevelHP,pcStrength:pcStrength,
  abilityScore:abilityScore,strOf:strOf,dexOf:dexOf,conOf:conOf,intOf:intOf,wisOf:wisOf,chaOf:chaOf,
  armorAC:armorAC,shieldAC:shieldAC,theAC:theAC,toHitRoll:toHitRoll,thiefSkills:thiefSkills,
  turnResult:turnResult,ALIGNMENTS:ALIGNMENTS,alignmentsFor:alignmentsFor,
  primeOK:primeOK,xpModifier:xpModifier,nextXP:nextXP,xpAward:xpAward,trainCost:trainCost,canTrain:canTrain,gainLevel:gainLevel
};
})();
