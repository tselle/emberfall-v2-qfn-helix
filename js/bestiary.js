/* Emberfall — js/bestiary.js (scaffold).
 * Keyed by monster ID; records {seen,fought,slain}; encounter cards and the
 * discovery-gated bestiary screen. */
'use strict';
var Bestiary=(function(){
  function sight(monId){if(window.G&&G.bestiary&&!G.bestiary[monId])G.bestiary[monId]={seen:G.time,fought:0,slain:0};}
  function fought(monId){sight(monId);if(G.bestiary[monId])G.bestiary[monId].fought++;}
  function slain(monId,n){sight(monId);G.bestiary[monId].slain+=n||1;}
  function show(){}
  function card(monId){return null;}
  return{sight:sight,fought:fought,slain:slain,show:show,card:card};
})();
