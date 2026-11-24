/* Emberfall — js/treasure.js (scaffold).
 * Enchanted item catalogue, wearable-effect helpers, weighted tables,
 * seeded Treasure.roll(rng, characterLevel, kind) -> {gold, items}. */
'use strict';
var Treasure=(function(){
  function tierFor(level){return Rules.clamp(Math.ceil(level/4),1,5);}
  function roll(rng,level,kind){return{gold:0,items:[]};}
  return{tierFor:tierFor,roll:roll};
})();
