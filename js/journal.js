/* Emberfall — js/journal.js (scaffold).
 * Derives commission states/progress, dated notes, past adventures. */
'use strict';
var Journal=(function(){
  function note(text,kind){if(window.G&&G.journal)G.journal.push({t:G.time,m:G.module,text:text,kind:kind||''});}
  function show(){}
  function commissions(){return[];}
  return{note:note,show:show,commissions:commissions};
})();
