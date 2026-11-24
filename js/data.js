/* Emberfall — js/data.js (scaffold).
 * Milestone 1+ fills: ITEMS, SHOPS, SPELLS (40 wizard / 34 priest), MONSTERS,
 * MAPS (Emberfall town, crypt1, crypt2, tower, wild), QUESTS, RUMORS, PREGENS.
 * item(id) resolves equipment, consumables, 'scroll:<spellId>', 'deviceId#charges'. */
'use strict';
var ITEMS={},SHOPS={},SPELLS={},MONSTERS={},MAPS={},QUESTS={},PREGENS=[],RUMORS={};
function item(id){
  if(!id)return null;
  var it=ITEMS[id];
  if(it)return it;
  var h=String(id||'').split('#'),base=h[0];
  if(base.indexOf('scroll:')===0){var sp=SPELLS[base.slice(7)];return sp?{id:id,n:'Scroll: '+sp.name,t:'x',spell:base.slice(7),price:100}:null;}
  var d=ITEMS[base];
  if(d&&d.charges){var c=h.length>1?+h[1]:d.charges;return Object.assign({},d,{id:id,chargesLeft:c});}
  return null;
}
function itemName(id){var it=item(id);return it?it.n:String(id);}
