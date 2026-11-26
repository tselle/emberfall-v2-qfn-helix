/* Emberfall — js/treasure.js
 * Enchanted item catalogue helpers and the seeded treasure generator.
 * Treasure.roll(rng, characterLevel, kind) -> {gold, items[]} —
 * tier = clamp(ceil(level/4),1,5); category then weighted entry at or
 * below tier; coin scale 25 × level^1.45 × 0.6–1.4 with kind multipliers
 * chest 1 / cache 2 / hoard 6, rounded to 5 gp. Caches guarantee magic;
 * hoards roll several magics, may reach one tier higher, and add potions
 * and valuables. Same seed, same contents — stashes never reroll. */
'use strict';
var Treasure=(function(){
var CATS=[['potion',20],['scroll',15],['ring',5],['device',5],['misc',15],
          ['armor',15],['sword',11],['weapon',14]];
function tierFor(level){return Rules.clamp(Math.ceil(level/4),1,5);}
function totalW(){var t=0;CATS.forEach(function(c){t+=c[1];});return t;}
/* rough power tier of a catalogue item, 1..6 */
function itemTier(it){
  var t=1+(it.ench||0)+(it.pow?1:0)+(it.charges?2:0)+(it.ring?2:0);
  if(it.t==='a'||it.t==='s')t=1+(it.ench||0)+((it.ac||10)<=4?2:(it.ac||10)<=6?1:0);
  if(it.t==='w'&&it.d){var sides=parseInt(String(it.d).split('d')[1],10)||6;t=1+(it.ench||0)+(sides>=10?2:sides>=8?1:0);}
  return Rules.clamp(t,1,6);
}
function pool(cat,tier){
  var out=[];
  Object.keys(ITEMS).forEach(function(id){
    var it=ITEMS[id];if(!it)return;
    var ok=(cat==='potion'&&it.t==='p')||(cat==='scroll'&&it.t==='x')||
      (cat==='ring'&&it.ring)||(cat==='device'&&it.t==='d')||
      (cat==='misc'&&(it.t==='g'||it.valuable))||
      (cat==='armor'&&(it.t==='a'||it.t==='s'))||
      (cat==='sword'&&it.t==='w'&&/sword|blade|dagger/.test(it.fam||id))||
      /* The spec fixes the category weights, so bows join 'other weapons'
         rather than getting a category of their own. */
      (cat==='weapon'&&((it.t==='w'&&!/sword|blade|dagger/.test(it.fam||id))||
                        (it.t==='r'&&!it.ammo)));
    if(ok&&itemTier(it)<=tier)out.push(id);
  });
  return out;
}
/* A bow kept in a barrow comes with a quiver; a sling with a pouch. Ammunition
   is not a treasure roll of its own - it is what the weapon was stored with. */
function ammoMate(id){
  var it=ITEMS[id];
  if(!it||it.t!=='r'||it.ammo)return null;
  if(id.indexOf('bow')>=0)return 'arrow';
  if(id==='sling')return 'bullet';
  return null;                       // a thrown weapon is its own ammunition
}
function pickCat(rng){
  var r=rng.next()*totalW(),acc=0;
  for(var i=0;i<CATS.length;i++){acc+=CATS[i][1];if(r<acc)return CATS[i][0];}
  return 'potion';
}
function rollOne(rng,level,tierCap){
  var tier=tierCap||tierFor(level);
  var cat=pickCat(rng);
  var p=pool(cat,tier);
  if(!p.length){p=pool('potion',tier);if(!p.length)return null;}
  return rng.pick(p);
}
function roll(rng,level,kind){
  kind=kind||'chest';
  var mult=kind==='hoard'?6:(kind==='cache'?2:1);
  var base=25*Math.pow(Math.max(1,level),1.45)*(0.6+rng.next()*0.8)*mult;
  var gold=Math.max(5,Math.round(base/5)*5);
  var items=[];
  var n=kind==='hoard'?3+rng.int(0,2):(kind==='cache'?1+(rng.chance(.5)?1:0):1);
  var cap=tierFor(level)+(kind==='hoard'?1:0);
  for(var i=0;i<n;i++){
    var it=rollOne(rng,level,cap);
    if(!it)continue;
    items.push(it);
    var mate=ammoMate(it);
    if(mate&&ITEMS[mate])items.push(mate);
  }
  if(kind==='cache'&&!items.length){var p=pool('potion',cap);if(p.length)items.push(rng.pick(p));}
  if(kind==='hoard'){
    var pv=pool('potion',cap);if(pv.length)items.push(rng.pick(pv));
    var gem=Object.keys(ITEMS).filter(function(id){return ITEMS[id].valuable;});
    if(gem.length)items.push(rng.pick(gem));
  }
  return {gold:gold,items:items};
}
return{tierFor:tierFor,roll:roll,itemTier:itemTier,ammoMate:ammoMate};
})();
