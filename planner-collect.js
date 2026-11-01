/* ① 集める (docs/WORKFLOW.md, docs/DESIGN.md): candidates as cards, sorted into tiers and grouped into
   outings. planner.collect(ctx); state is the planner's (S.trip, S.cf). Trip edits use ctx.editTrip
   (one undo stack). Keys by e.code (JIS-safe): J K, 1 2 3 0, ⌫, X, ⌘A, G, Enter.
   Performance (DESIGN "Performance rules"): each section renders a window of cards and grows on an
   IntersectionObserver sentinel; a search or filter replaces the list only, never the rail; a tier
   change moves one card through a Map(id → card); ① is released (emptied) when the stage changes. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.collect) return;
const T=['must','want','maybe','skip'], WIN=40;
const PTC={
  cT:{ja:'集める',en:'Collect'}, cS:{ja:'カードのボタンで仕分け、もう一度押すと戻ります',en:'Sort with the buttons on each card; press again to unsort'},
  byTier:{ja:'行きたさ',en:'Priority'}, byGroup:{ja:'グループ',en:'Group'}, byArea:{ja:'エリア',en:'Area'}, sortBy2:{ja:'並べ方',en:'Arrange by'},
  fromSaved:{ja:'保存済みから',en:'from your saves'}, tierOf:{ja:'{name} の行きたさ',en:'How much for {name}'},
  sel:{ja:'選択',en:'Select'}, selN:{ja:'{n}件選択',en:'{n} selected'}, handoff:{ja:'日程に組む →',en:'Plan the days →'}, inDay2:{ja:'{d}に配置',en:'on {d}'}, tiered:{ja:'{n}件を「{t}」に',en:'{n} set to “{t}”'},
  ungrouped:{ja:'「{g}」を削除しました',en:'Deleted “{g}”'}, made:{ja:'「{g}」を作りました',en:'Made “{g}”'}, nothingSel:{ja:'カードを選んでください',en:'Select some cards first'},
  allPlaced:{ja:'絶対の場所はすべて日程に入っています',en:'Every must is on a day'}, nextMust:{ja:'どの日も ⚠ ・最小は {d}',en:'Every day ⚠ · least on {d}'},
  none2:{ja:'該当なし',en:'Nothing matches'}, clearF:{ja:'絞り込みを外す',en:'Clear filters'}, emptyT:{ja:'まだありません',en:'None yet'},
  cSearch:{ja:'名前・キーワードで絞る',en:'Filter by name or keyword'}, hint1:{ja:'行きたい場所に印をつける',en:'Mark the places you want'}
};
planner.collect=function(c){
  const {S,DB,E,pt,esc,ic,head,openSheet,toast,editTrip,tierOf,seeded,place,nm,nmLang,wbr,tr,CAT,AREA,
    plannedMap,dlabel,ja,fold,isCand,cover,setStage,setDay,openPlace,saveUI,glyphOf,BTN,IBTN,CHIP,SEG,FIELD}=c;
  c.addStrings(PTC,1);   /* soft: the desktop's own copy (planner-desk) wins whichever loads first */
  const el=E.collect;
  let focus=null, selMode=false, skip=false, GM=null, KEY='', IO=null;
  const sel=S.csel||(S.csel=new Set());
  const cf=S.cf; cf.mode=cf.mode||'tier';
  const CARD=new Map();                            /* id → card element, rebuilt per list render */
  /* id → group, memoised on the groups array's identity (it is replaced, never mutated) */
  let GO=null, GOK=null;
  const groupOf=id=>{ if(GOK!==S.trip.groups){ GOK=S.trip.groups; GO=new Map(); GOK.forEach(g=>g.ids.forEach(i=>GO.set(i,g))); } return GO.get(id); };
  const sText=p=>p._c||(p._c=fold([p.name,p.nameJa,tr(AREA,p.area),(Array.isArray(p.kw)?p.kw:[]).join(' '),CAT[p.cat]?CAT[p.cat].ja+' '+CAT[p.cat].en:''].join(' ')));
  function pool(){ const q=fold((cf.q||'').trim());
    return DB.list.filter(p=>isCand(p)&&(!cf.cat||p.cat===cf.cat)&&(!cf.saved||p.saved)&&(!q||sText(p).indexOf(q)>=0))
      .sort((a,b)=>(!!b.saved)-(!!a.saved)||(b.trend||0)*10+(b.aesthetic||0)-(a.trend||0)*10-(a.aesthetic||0)); }
  /* note c1 */
  const band=p=>{ const ph=DB.photos&&DB.photos[p.id], G=c.gx();
    return G?G.thumb(p,ph,1):`<span class="pl-thumb pl-g1 pl-band">${ph?`<img src="${esc(ph.src)}" alt="" width="3" height="2" loading="lazy" decoding="async" data-gi>`:''}<span class="pl-gfb">${ic(glyphOf(p),'lg')}</span></span>`; };
  /* the tier control (docs/DESIGN.md "Tier control"): 4 equal segments, one label each */
  const tierHTML=(p,t,R)=>`<div class="pl-tier" role="group" aria-label="${esc(pt('tierOf',{name:nm(p)}))}">${T.map(k=>`<button type="button" data-ca="tier" data-t="${k}" data-id="${p.id}" aria-pressed="${t===k}"${R}>${pt('t_'+k)}</button>`).join('')}</div>`;
  /* note c2 */
  function card(p,pm){ const t=tierOf(p.id), on=pm.get(p.id), R=focus===p.id?'':' tabindex="-1"';
    const sig=on!=null?`${ic('calendar','sm')}${cf.mode==='group'?`<span class="sr">${pt('inDay2',{d:dlabel(DB.days[on])})}</span>`:pt('inDay2',{d:dlabel(DB.days[on])})}`:esc(tr(CAT,p.cat));
    return `<article class="pl-card" data-id="${p.id}" data-tier="${t}" aria-selected="${sel.has(p.id)}" tabindex="${focus===p.id?0:-1}">
      <button type="button" class="pl-card__media" data-ca="open" data-id="${p.id}" tabindex="-1" aria-hidden="true">${(S.cardMedia||band)(p)}${selMode||sel.size?`<i class="pl-card__check">${sel.has(p.id)?ic('check','sm'):''}</i>`:''}</button>
      <div class="pl-card__body"><button type="button" class="pl-card__title" data-ca="open" data-id="${p.id}"${nmLang(p)}${R}>${wbr(nm(p))}</button>
      <p class="pl-card__signal">${sig}${seeded(p.id)?`${ic('bookmark','sm')}<span class="sr">${pt('fromSaved')}</span>`:''}</p></div>
      ${tierHTML(p,t,R)}</article>`; }
  /* a section renders WIN cards, then a sentinel that asks for the next WIN when it scrolls near */
  const SECS=new Map();
  const sec=(k,title,n,body,extra,shut)=>`<section class="pl-cs" data-k="${esc(k)}">${shut?'<details>':''}<${shut?'summary':'div'} class="pl-cs__head"><h3>${title}<span class="pl-badge">${n}</span></h3>${extra||''}</${shut?'summary':'div'}><div class="pl-cs__list">${body}</div>${shut?'</details>':''}</section>`;
  function cardsOf(a,k,pm){ const key=String(k==null?'':k)+'|'+SECS.size; SECS.set(key,{a,pm,n:WIN});
    return a.length?a.slice(0,WIN).map(p=>card(p,pm)).join('')+(a.length>WIN?`<i class="pl-cs__more" data-more="${esc(key)}"></i>`:''):`<p class="pl-cs__none">${pt('emptyT')}</p>`; }
  function grow(s){ const key=s.dataset.more, x=SECS.get(key); if(!x) return; const list=x.a.slice(x.n,x.n+WIN); x.n+=WIN;
    const host=s.parentNode, box=document.createElement('template'); s.remove();
    box.innerHTML=list.map(p=>card(p,x.pm)).join('')+(x.a.length>x.n?`<i class="pl-cs__more" data-more="${esc(key)}"></i>`:'');
    if(host) host.appendChild(box.content); index(); watch(); }
  function sections(list,pm){ SECS.clear(); const by=f=>{ const o=new Map(); list.forEach(p=>{ const k=f(p); if(!o.has(k)) o.set(k,[]); o.get(k).push(p); }); return o; };
    const cards=(a,k)=>cardsOf(a,k,pm);
    if(cf.mode==='area'){ const o=by(p=>p.area); return [...o.keys()].map(k=>sec(k,esc(tr(AREA,k)),o.get(k).length,cards(o.get(k),'a'+k))).join(''); }
    /* グループ: the groups, おすすめ and the ungrouped come from planner-more (cGroups) */
    if(cf.mode==='group'){ if(!GM){ c.needMore().then(m=>{ GM=m; list0(); }); return ''; } return GM.cGroups(sec,cards,by(p=>(groupOf(p.id)||{}).id||''),pm,groupOf); }
    const o=by(p=>tierOf(p.id));
    return ['','must','want','maybe'].map(k=>sec(k,pt('t_'+k),(o.get(k)||[]).length,cards(o.get(k)||[],k))).join('')+sec('skip',pt('t_skip'),(o.get('skip')||[]).length,cards(o.get('skip')||[],'skip'),'',true); }
  function chips(){ const cats=Object.keys(CAT).filter(k=>DB.list.some(p=>isCand(p)&&p.cat===k));
    return SEG(['tier','group','area'].map(m=>({label:pt('by'+m[0].toUpperCase()+m.slice(1)),on:cf.mode===m,a:{'data-ca':'mode','data-v':m}})),{label:pt('sortBy2')})+
      `<div class="pl-chips">${CHIP(pt('saved'),!!cf.saved,{'data-ca':'f','data-k':'saved','data-v':'1'})}${cats.map(k=>CHIP(tr(CAT,k),cf.cat===k,{'data-ca':'f','data-k':'cat','data-v':k})).join('')}</div>`; }
  /* the action bar (select mode) is drawn by planner-more (cbar), loaded when selecting starts */
  const bar=()=>(sel.size||selMode)&&GM?GM.cbar(sel.size,T):'';
  const withMore=f=>c.needMore().then(m=>{ GM=m; f(); list0(); });
  const hint=()=>!(S.hints||{}).sort&&S.stage==='collect';
  /* the rail: built once per visit; the list below it is what a search, filter or tier replaces */
  function rail(){ return `<div class="pl-crail"><h2 class="sr">${pt('cT')}</h2>${S.help?`<p class="pl-hint">${pt('cS')}</p>`:''}
      ${FIELD({ph:pt('cSearch'),value:cf.q||'',clear:pt('clear'),in:{cls:'pl-cq',type:'search',enterkeyhint:'search'}})}
      <div class="pl-crail__filters">${chips()}</div>
      ${CHIP(pt('sel'),selMode,{'data-ca':'selmode'})}</div>
    <div class="pl-clist"></div>
    <div class="pl-chand">${BTN('primary',pt('handoff'),{'data-ca':'handoff',cls:(S.hints||{}).sort&&!(S.hints||{}).handoff?'is-hint':''})}</div><div class="pl-cbarhost"></div>`; }
  function render(force){
    if(!el.querySelector('.pl-clist')||force==='rail'){ el.innerHTML=rail(); }
    const P=c.plan(), k=JSON.stringify([cf,S.trip,P.days,sel.size,selMode,ja(),!!DB.photos,!!S.cardMedia]);
    if(skip&&!force){ skip=false; KEY=k; return; }
    if(k===KEY&&!force) return; KEY=k;
    list0();
  }
  function list0(){
    const P=c.plan(), pm=plannedMap(P), list=pool(), box=el.querySelector('.pl-clist'); if(!box) return render('rail');
    el.classList.toggle('is-selecting',selMode||sel.size>0);
    box.innerHTML=list.length?sections(list,pm):`<div class="pl-empty"><p class="pl-empty__text">${pt('none2')}</p>${BTN('secondary',pt('clearF'),{'data-ca':'clearf'})}</div>`;
    el.querySelector('.pl-cbarhost').innerHTML=bar(); el.querySelector('.pl-chand').hidden=selMode||sel.size>0;
    if(hint()){ const t=box.querySelector('.pl-tier'); if(t) t.insertAdjacentHTML('beforebegin',`<p class="pl-hint pl-hint--coach" role="note">${pt('hint1')}</p>`); }
    index(); watch();
    if(focus){ const f=CARD.get(focus); if(f&&document.activeElement===document.body) f.focus({preventScroll:true}); }
    if(!el.querySelector('.pl-card[tabindex="0"]')){ const f=el.querySelector('.pl-card'); if(f) f.tabIndex=0; }
  }
  const index=()=>{ CARD.clear(); el.querySelectorAll('.pl-card').forEach(x=>CARD.set(x.dataset.id,x)); };
  function watch(){ if(!('IntersectionObserver' in window)) return; if(!IO) IO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ IO.unobserve(e.target); grow(e.target); } }),{rootMargin:'800px'});
    el.querySelectorAll('.pl-cs__more').forEach(s=>IO.observe(s)); }
  /* leaving ①: its DOM goes, so ② and ③ never carry thousands of hidden cards */
  function release(){ if(IO) IO.disconnect(); el.textContent=''; CARD.clear(); SECS.clear(); KEY=''; }
  /* roving: one card in the Tab order; its own buttons join it while it is the active one */
  function rove(cc){ focus=cc.dataset.id; el.querySelectorAll('.pl-card[tabindex="0"],.pl-card [tabindex="0"]').forEach(x=>{ if(!cc.contains(x)) x.tabIndex=-1; });
    cc.tabIndex=0; cc.querySelectorAll('button').forEach(b=>{ b.tabIndex=0; }); }
  el.addEventListener('focusin',e=>{ const cc=e.target.closest('.pl-card'); if(cc) rove(cc); });
  /* a tier tap moves the one card (a Map lookup, one fragment per target section); the next render only recounts */
  function setTier(ids,t,msg){ if(!ids.length) return;
    editTrip(x=>{ ids.forEach(id=>{ x.tier[id]=t; }); },msg||null);
    const done=Object.keys(S.trip.tier).filter(k=>S.trip.tier[k]).length;
    if(done>=3&&!(S.hints||{}).sort){ S.hints=Object.assign({},S.hints,{sort:1}); saveUI(); const h=el.querySelector('.pl-hint--coach'); if(h) h.remove(); const b=el.querySelector('[data-ca="handoff"]'); if(b) b.classList.add('is-hint'); }
    if(cf.mode!=='tier'){ return; }
    skip=true; const to=el.querySelector(`.pl-cs[data-k="${t}"] .pl-cs__list`), frag=document.createDocumentFragment();
    ids.forEach(id=>{ const a=CARD.get(id); if(!a) return;
      const nx=ids.length===1&&a.contains(document.activeElement)&&a.parentNode!==to&&(a.nextElementSibling||a.previousElementSibling);
      a.dataset.tier=t; a.querySelectorAll('[data-ca="tier"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t));
      if(nx){ a.tabIndex=-1; a.querySelectorAll('button').forEach(b=>{ b.tabIndex=-1; }); }   /* it leaves the Tab order with the focus */
      if(to&&a.parentNode!==to) frag.appendChild(a);
      if(nx&&nx.classList.contains('pl-card')){ rove(nx); nx.focus(); nx.scrollIntoView({block:'nearest'}); } });
    if(to&&frag.childNodes.length){ to.prepend(frag); const e=to.querySelector('.pl-cs__none'); if(e) e.remove(); }
    const n={}; pool().forEach(p=>{ const k=tierOf(p.id); n[k]=(n[k]||0)+1; });
    el.querySelectorAll('.pl-cs').forEach(s=>{ const m=s.querySelector('.pl-cs__head .pl-badge'); if(m) m.textContent=n[s.dataset.k]||0; }); }
  const targets=()=>sel.size?[...sel]:focus?[focus]:[];
  /* 日程に組む →: ② on the day where the first unplaced must fits most cheaply, its picker open;
     the days are simulated in idle slices so the tap stays fast (DESIGN rule 8) */
  function handoff(){ const o=cover(c.plan()).open; S.hints=Object.assign({},S.hints,{handoff:1}); saveUI(); setStage('plan');
    if(!o.length){ toast(pt('allPlaced')); return; }
    const P=c.plan(); let best=null, i=0;
    const step=dl=>{ while(i<DB.days.length&&(!dl||dl.timeRemaining()>2)){ const d=DB.days[i], pv=c.sim().insertPlan(d,c.idsOf(d.date,P),[o[0].id],P,{deadline:S.dayEnd},null);
        if(pv&&(!best||(pv.breaks.length-best.b||pv.dDrive-best.v)<0)) best={i,b:pv.breaks.length,v:pv.dDrive}; i++; }
      if(i<DB.days.length){ (window.requestIdleCallback||(f=>setTimeout(f,0)))(step); return; }
      if(best){ setDay(best.i); if(best.b) toast(pt('nextMust',{d:dlabel(DB.days[best.i])})); }
      openPlace(o[0].id); };
    (window.requestIdleCallback||(f=>setTimeout(f,0)))(step); }
  function toggle(id){ withMore(()=>{ if(sel.has(id)) sel.delete(id); else sel.add(id); }); }
  el.addEventListener('click',e=>{ const b=e.target.closest('[data-ca]'), cc=e.target.closest('.pl-card');
    if(cc) focus=cc.dataset.id;
    if(!b){ if(cc&&(selMode||e.shiftKey||e.metaKey||e.ctrlKey)) toggle(cc.dataset.id); return; }
    const id=b.dataset.id;
    switch(b.dataset.ca){
      case 'tier': { const t=b.dataset.t, now=tierOf(id); setTier([id],now===t?'':t); break; }
      case 'open': if(selMode||e.shiftKey){ toggle(id); break; } openPlace(id); break;
      case 'mode': cf.mode=b.dataset.v; saveUI(); b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b)); list0(); break;
      case 'f': { const k=b.dataset.k, v=b.dataset.v; cf[k]=cf[k]===v||(k==='saved'&&cf[k])?null:v; saveUI();
        b.parentNode.querySelectorAll('[data-ca="f"]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k==='saved'?!!cf.saved:cf.cat===x.dataset.v)); list0(); break; }
      case 'selmode': withMore(()=>{ selMode=!selMode; if(!selMode) sel.clear(); b.setAttribute('aria-pressed',selMode); }); break;
      case 'selx': selMode=false; sel.clear(); { const s=el.querySelector('[data-ca="selmode"]'); if(s) s.setAttribute('aria-pressed',false); } list0(); break;
      case 'bulk': { const ids=[...sel]; if(!ids.length) break; setTier(ids,b.dataset.t,pt('tiered',{n:ids.length,t:pt('t_'+b.dataset.t)})); sel.clear(); selMode=false; list0(); break; }
      case 'group': { const ids=targets(); if(!ids.length){ toast(pt('nothingSel')); break; } c.needMore().then(m=>m.groupSheet(ids)); break; }
      case 'days': { const pm=plannedMap(c.plan()), ids=[...sel].filter(i=>!pm.has(i)), on=[...sel].filter(i=>pm.has(i)); if(!ids.length&&!on.length){ toast(pt('nothingSel')); break; }
        S.selc={id:'_sel',ids,name:pt('selN',{n:ids.length}),nameJa:pt('selN',{n:ids.length})};
        /* what is already on a day is said, not dropped */
        c.needMore().then(m=>openSheet(head(pt('toDays'),pt('selN',{n:ids.length})+(on.length?'　'+pt('already',{n:on.length,d:dlabel(DB.days[pm.get(on[0])])}):''))+(ids.length?m.dayPick('_sel','pl-dayq-big',S.selc):''),'cdays')); break; }
      case 'handoff': handoff(); break;
      case 'clearf': Object.assign(cf,{q:'',cat:null,saved:null}); saveUI(); render('rail'); break;
      case 'gname': { const g=S.trip.groups.find(x=>x.id===id); if(g) c.needMore().then(m=>m.nameSheet(g)); break; }
      case 'gdrop': { const g=S.trip.groups.find(x=>x.id===id); if(g) editTrip(x=>{ x.groups=x.groups.filter(o=>o.id!==id); },pt('ungrouped',{g:g.name})); break; }
      case 'guse': { const x=DB.clusters.find(o=>o.id===id); if(!x) break; const nmx=(ja()?x.nameJa:x.name)||x.id, ids=x.ids.filter(i=>!groupOf(i)&&DB.places.has(i));
        editTrip(t=>{ t.groups.push({id:'g-'+Date.now().toString(36),name:nmx,ids,from:x.id}); },pt('made',{g:nmx})); break; }
    }
  });
  /* typing: the handler only stores the query; the list (never the field) re-renders after ~100 ms of quiet */
  let qf=0;
  el.addEventListener('input',e=>{ if(!e.target.classList.contains('pl-cq')) return; cf.q=e.target.value; clearTimeout(qf); qf=setTimeout(list0,100); });
  /* note c3 */
  function media(){ const cs=[...el.querySelectorAll('.pl-card__media')]; let i=0;
    const step=()=>{ cs.slice(i,i+24).forEach(m=>{ const p=place(m.dataset.id); if(p){ const ck=m.querySelector('.pl-card__check'); m.innerHTML=(S.cardMedia||band)(p); if(ck) m.appendChild(ck); } }); i+=24; if(i<cs.length) requestAnimationFrame(step); }; step(); }
  return {
    render, media, release,
    /* note c4 */
    sel, setTier, targets, toggle, card:id=>CARD.get(id), focus:id=>{ if(id!==undefined) focus=id; return focus; }
  };
};
})();
