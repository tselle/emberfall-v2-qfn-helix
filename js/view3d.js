/* Emberfall — js/view3d.js (scaffold).
 * View3D.init/prepare/render/minimap/figTex: packed textures+geometry, DDA
 * raycast, billboard projection, grid map painting. No rule side effects. */
'use strict';
var View3D=(function(){
  function init(canvas){}
  function prepare(mapDef){return null;}
  function render(prep,x,y,dir,opts){}
  function minimap(ctx,prep,x,y,dir,seen){}
  function figTex(desc,key){return null;}
  return{init:init,prepare:prepare,render:render,minimap:minimap,figTex:figTex};
})();
