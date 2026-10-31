/* HOST SHIM — stands in for what ../travel-plans/index.html already provides, with the same names
   and behaviour, so planner.js runs unchanged in both. Deleted at fold time.
   - LS.get(k) / LS.set(k, v): strings, try/catch (the book's exact wrapper)
   - the language sweep: <html lang>, [data-en]/[data-ja], .lang-toggle, the 'langchange' event
   - the units sweep: span.u, .unit-toggle, LS 'units'
   - the service worker with the refresh banner (the book's pattern; this POC has its own sw.js) */
var LS={
  get:function(k){try{return localStorage.getItem(k);}catch(e){return null;}},
  set:function(k,v){try{localStorage.setItem(k,v);}catch(e){}}
};
function press(b,on){b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}

(function(){
  function apply(lang){
    document.documentElement.lang=lang;
    document.querySelectorAll('[data-en],[data-ja]').forEach(function(el){
      var cur=el._lang||(el.dataset.ja===undefined?'ja':'en');
      if(cur===lang) return;
      if(el.dataset[cur]===undefined) el.dataset[cur]=el.innerHTML;
      el.innerHTML=el.dataset[lang]; el._lang=lang;
    });
    document.querySelectorAll('.lang-toggle button').forEach(function(b){press(b,b.dataset.lang===lang);});
    document.dispatchEvent(new CustomEvent('langchange',{detail:lang}));
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('.lang-toggle button');
    if(!b||b.dataset.lang===document.documentElement.lang) return;
    LS.set('lang',b.dataset.lang); apply(b.dataset.lang);
  });
  apply(LS.get('lang')==='en'?'en':'ja');
})();

(function(){
  function apply(sys){
    document.querySelectorAll('span.u').forEach(function(s){ var v=s.dataset[sys]; if(v) s.innerHTML=v; });
    document.querySelectorAll('.unit-toggle button').forEach(function(b){press(b,b.dataset.unit===sys);});
  }
  function current(){return LS.get('units')==='imperial'?'imperial':'metric';}
  document.addEventListener('click',function(e){
    var b=e.target.closest('.unit-toggle button'); if(!b) return;
    LS.set('units',b.dataset.unit); apply(b.dataset.unit);
  });
  document.addEventListener('langchange',function(){apply(current());});
  apply(current());
})();

/* Service worker. A waiting worker raises the refresh banner; never auto-skipWaiting. A first
   install's clients.claim() also fires controllerchange, so only an already-controlled page (or
   one whose reader tapped Refresh) reloads on takeover. */
if('serviceWorker' in navigator&&location.protocol!=='file:'&&!/[?&]nosw\b/.test(location.search)) (function(){   /* ?nosw: development without the cache */
  var had=!!navigator.serviceWorker.controller, asked=false, refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(!(had||asked)||refreshing) return; refreshing=true; window.location.reload();
  });
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(reg){
      function showUpdate(worker){
        var banner=document.getElementById('updateBanner'), btn=document.getElementById('updateBtn');
        if(!worker||!banner||!btn) return;
        banner.hidden=false;
        btn.onclick=function(){btn.disabled=true;asked=true;worker.postMessage({type:'SKIP_WAITING'});};
      }
      if(reg.waiting&&navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound',function(){
        var nw=reg.installing; if(!nw) return;
        nw.addEventListener('statechange',function(){ if(nw.state==='installed'&&navigator.serviceWorker.controller) showUpdate(nw); });
      });
      document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') reg.update().catch(function(){}); });
    }).catch(function(){});
  });
})();
