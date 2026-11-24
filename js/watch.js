/* Emberfall — js/watch.js (scaffold).
 * Locates live set encounters on the grid, line-of-sight tests,
 * surprise/stealth, hearing, treasure guarding. */
'use strict';
var Watch=(function(){
  function bandsOn(mapId){return[];}
  function los(x0,y0,x1,y1){return false;}
  function checkArrival(){return null;}
  function surprise(){return{party:false,foes:false};}
  return{bandsOn:bandsOn,los:los,checkArrival:checkArrival,surprise:surprise};
})();
