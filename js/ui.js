/* Emberfall — js/ui.js (scaffold: modals, toasts, dialog stack).
 * Full screens (sheets, shops, services, creation, roster) land with later milestones. */
'use strict';
var UI=(function(){
var stack=[];
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

/* Modal dialog stack. opts:{title, body, actions:[{label,cls,on,primary,closable}], closable} */
function modal(opts){
  var host=document.getElementById('modals');
  host.classList.add('on');
  var back=el('div','mback');
  var m=el('div','modal');
  if(opts.title)m.appendChild(el('h3',null,esc(opts.title)));
  var body=el('div','body');
  if(typeof opts.body==='string')body.innerHTML=opts.body;else if(opts.body)body.appendChild(opts.body);
  m.appendChild(body);
  var bar=el('div','bar');
  (opts.actions||[{label:'Close'}]).forEach(function(a){
    var b=el('button',a.cls||(a.primary?'primary':''),esc(a.label));
    b.onclick=function(){if(a.on)a.on();if(a.keepOpen)return;close(entry);};
    bar.appendChild(b);
  });
  if((opts.closable!==false))bar.appendChild(Object.assign(el('button',null,'Esc'),{onclick:function(){close(entry);}}));
  m.appendChild(bar);
  var entry={root:m,back:back,closable:opts.closable!==false,onKey:opts.onKey};
  back.addEventListener('click',function(){if(entry.closable)close(entry);});
  host.appendChild(back);host.appendChild(m);
  stack.push(entry);
  var prim=bar.querySelector('.primary');if(prim&&opts.focusPrimary!==false)prim.focus();
  return entry;
}
function close(entry){
  var i=stack.indexOf(entry);if(i<0)return;
  stack.splice(i,1);
  entry.root.remove();entry.back.remove();
  if(!stack.length)document.getElementById('modals').classList.remove('on');
}
function closeAll(){stack.slice().forEach(close);}
function top(){return stack[stack.length-1]||null;}
/* Key routing: dialogs own the keyboard while open. */
document.addEventListener('keydown',function(e){
  var t=top();if(!t)return;
  if(e.key==='Enter'){
    var ae=document.activeElement;
    if(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName))return;
    var p=t.root.querySelector('.bar .primary');
    if(p&&!p.disabled){e.preventDefault();p.click();}
  }else if(e.key==='Escape'){
    if(t.closable){e.preventDefault();close(t);}
    else if(t.onKey)t.onKey(e);
  }else if(t.onKey)t.onKey(e);
},true);

var toastT=null;
function toast(msg){
  var host=document.getElementById('modals');
  var t=document.getElementById('ui-toast');
  if(!t){t=el('div');t.id='ui-toast';t.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#171922ee;border:1px solid #e3b54a;color:#e9e2cf;padding:8px 18px;border-radius:6px;z-index:99;max-width:80vw;text-align:center';}
  t.textContent=msg;host.appendChild(t);
  clearTimeout(toastT);toastT=setTimeout(function(){t.remove();},2400);
}

/* Stubs replaced by later milestones — referenced by index.html inline handlers. */
function toggleParty(){toast('Company drawer arrives with milestone 1.');}
function menu(){toast('Menu arrives with milestone 1.');}
function importCompany(){toast('Save import arrives with milestone 1.');}
function createHero(){toast('Character creation arrives with milestone 1.');}
function log(kind,msg){return null;}

return{el:el,esc:esc,modal:modal,close:close,closeAll:closeAll,top:top,toast:toast,
  toggleParty:toggleParty,menu:menu,importCompany:importCompany,createHero:createHero,log:log};
})();
