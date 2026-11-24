/* Emberfall — js/navpad.js (scaffold).
 * Remembered on-screen direction pads (off → right → left → both → off),
 * pointer repeat (~60ms) /cancel, placement persisted in emberfall.navpad. */
'use strict';
var Navpad=(function(){
  var mode='auto';
  function cycle(){UI.toast('Touch pads arrive with milestone 5.');}
  function place(){}
  function hide(){}
  function show(){}
  return{cycle:cycle,place:place,hide:hide,show:show,get mode(){return mode;}};
})();
