/* Emberfall — js/monsters.js (scaffold).
 * Wider creature catalogue (~191 entries beyond the 40 saga monsters);
 * blocks constructed from HD + overrides. Source for generated encounters. */
'use strict';
var MONSTER_LORE={};
function monsterBlock(id){return MONSTERS[id]||null;}
function makeMonster(def){return def;}
