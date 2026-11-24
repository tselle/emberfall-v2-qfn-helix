/* Emberfall — js/combat.js (scaffold).
 * Combat.start(spec) -> Promise<{result:'win'|'lose'|'fled', xp, left}>.
 * 14×10 isometric tactical board, initiative, AI, targeting, effects. */
'use strict';
var Combat=(function(){
  var active=false;
  function isActive(){return active;}
  function start(spec){
    // Milestone 2 implements the tactical board. Resolve immediately for now.
    return Promise.resolve({result:'fled',xp:0,left:[]});
  }
  function onKey(e){return false;}
  return{start:start,isActive:isActive,onKey:onKey};
})();
