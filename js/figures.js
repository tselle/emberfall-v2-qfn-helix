/* Emberfall — js/figures.js (scaffold).
 * Shared procedural drawFig(ctx,desc,x,y,scale), figForChar(c), portrait(c,canvas).
 * Distinct shapes: humanoid, rat, spider, wolf, centipede, beast, dragon,
 * blob, serpent, orb, bird, insect. */
'use strict';
var Figures=(function(){
  function drawFig(ctx,desc,x,y,s){ctx.save();ctx.fillStyle=(desc&&desc.color)||'#9a917c';ctx.fillRect(x-6*s,y-20*s,12*s,20*s);ctx.restore();}
  function figForChar(c){return{shape:'humanoid',color:(c&&c.color)||'#8888aa',race:c&&c.race,cls:c&&c.cls};}
  function portrait(c,canvas){
    if(canvas){var g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);drawFig(g,figForChar(c),canvas.width/2,canvas.height-4,Math.min(canvas.width,canvas.height)/24);}
  }
  return{drawFig:drawFig,figForChar:figForChar,portrait:portrait};
})();
