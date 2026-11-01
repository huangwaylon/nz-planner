/* ① 集める (docs/WORKFLOW.md): candidates as cards, sorted into tiers and grouped into outings.
   planner.collect(ctx); state is the planner's (S.trip, S.cf). Trip edits use ctx.editTrip: one undo
   stack, never a fork. Keys by e.code (JIS-safe): J K, 1 2 3 0, ⌫, X, ⌘A, G, Enter. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.collect) return;
const T=['must','want','maybe','skip'];
const PTC={
  t_must:{ja:'絶対行く',en:'Must go'}, t_want:{ja:'行きたい',en:'Want'}, t_maybe:{ja:'時間があれば',en:'If time'}, t_skip:{ja:'見送り',en:'Skip'}, t_:{ja:'未仕分け',en:'To sort'},
  s_must:{ja:'絶対',en:'Must'}, s_want:{ja:'行きたい',en:'Want'}, s_maybe:{ja:'時間あれば',en:'If time'}, s_skip:{ja:'見送り',en:'Skip'},
  cT:{ja:'集める',en:'Collect'}, cS:{ja:'カードのボタンで仕分け、もう一度押すと戻ります',en:'Sort with the buttons on each card; tap again to unsort'},
  byTier:{ja:'ティア',en:'Tier'}, byGroup:{ja:'グループ',en:'Group'}, byArea:{ja:'エリア',en:'Area'}, sortBy2:{ja:'並べ方',en:'Arrange by'},
  fromSaved:{ja:'保存済みから',en:'from your saves'}, tierOf:{ja:'{name} の行きたさ',en:'How much for {name}'},
  sel:{ja:'選択',en:'Select'}, selN:{ja:'{n}件選択',en:'{n} selected'}, selDone:{ja:'選択をやめる',en:'Stop selecting'},
  toGroup:{ja:'グループへ',en:'To a group'}, toDays:{ja:'日程へ',en:'To the days'}, handoff:{ja:'日程に組む →',en:'Plan the days →'},
    make:{ja:'作る',en:'Create'},
  inGroup:{ja:'→ {g}',en:'→ {g}'}, inDay2:{ja:'{d}に配置',en:'on {d}'}, tiered:{ja:'{n}件を「{t}」に',en:'{n} set to “{t}”'},   ungrouped:{ja:'「{g}」を解きました',en:'Ungrouped “{g}”'}, made:{ja:'「{g}」を作りました',en:'Made “{g}”'}, nothingSel:{ja:'カードを選んでください',en:'Select some cards first'},
  allPlaced:{ja:'絶対行く場所はすべて日程に入っています',en:'Every must is on a day'}, nextMust:{ja:'どの日も ⚠ — いちばん近いのは {d}',en:'Every day breaks — {d} comes closest'},
  none2:{ja:'該当なし・絞り込みを外す',en:'Nothing matches: clear the filters'}, emptyT:{ja:'まだありません。カードの［{t}］で入ります',en:'None yet: tap [{t}] on a card'}, emptyG:{ja:'まだありません',en:'None yet'}, ss_maybe:{ja:'余裕',en:'If time'}, cSearch:{ja:'名前・キーワードで絞る',en:'Filter by name or keyword'}, };
planner.collect=function(c){
  const {S,DB,E,pt,esc,ic,head,doneBar,openSheet,closeSheet,toast,editTrip,tierOf,seeded,place,nm,nmLang,wbr,thumb,tr,CAT,AREA,
    plannedMap,dlabel,dur,ja,fold,isCand,cover,setStage,setDay,openPlace,saveUI,clone}=c;
  c.addStrings(PTC,1);   /* soft: the desktop's own copy (planner-desk) wins whichever loads first */
  const el=E.collect;
  let focus=null, selMode=false, KEY='', skip=false, GM=null;
  const sel=S.csel||(S.csel=new Set());
  const cf=S.cf; cf.mode=cf.mode||'tier';
  const groupOf=id=>S.trip.groups.find(g=>g.ids.indexOf(id)>=0);
  const sText=p=>p._c||(p._c=fold([p.name,p.nameJa,tr(AREA,p.area),(Array.isArray(p.kw)?p.kw:[]).join(' '),CAT[p.cat]?CAT[p.cat].ja+' '+CAT[p.cat].en:''].join(' ')));
  function pool(){ const q=fold((cf.q||'').trim());
    return DB.list.filter(p=>isCand(p)&&(!cf.cat||p.cat===cf.cat)&&(!cf.saved||p.saved)&&(!q||sText(p).indexOf(q)>=0))
      .sort((a,b)=>(!!b.saved)-(!!a.saved)||(b.trend||0)*10+(b.aesthetic||0)-(a.trend||0)*10-(a.aesthetic||0)); }
  /* one card: the place, where it already is, and the four tier buttons (44 px each, the word always shown) */
  function card(p,pm){ const t=tierOf(p.id), g=groupOf(p.id), on=pm.get(p.id), R=focus===p.id?'':' tabindex="-1"';
    return `<article class="pl-cc${sel.has(p.id)?' pl-csel':''}" data-id="${p.id}" data-tier="${t}" tabindex="${focus===p.id?0:-1}"><button type="button" class="pl-ccm" data-ca="open" data-id="${p.id}" tabindex="-1" aria-hidden="true">${(S.cardMedia||thumb)(p)}</button>
      <div class="pl-ccb"><button type="button" class="pl-ccn" data-ca="open" data-id="${p.id}"${nmLang(p)}${R}>${wbr(nm(p))}</button>
      <small>${on!=null?`<span class="pl-ccd">${ic('calendar','xs')}${pt('inDay2',{d:dlabel(DB.days[on])})}</span>`:`<span>${tr(CAT,p.cat)}</span>`}${seeded(p.id)?`<span class="pl-ccs">${ic('bookmark','xs')}<span class="sr">${pt('fromSaved')}</span></span>`:''}${sel.has(p.id)?`<span class="sr">${pt('selN',{n:''})}</span>`:''}</small></div>
      <div class="pl-tseg" role="group" aria-label="${esc(pt('tierOf',{name:nm(p)}))}">${T.map(k=>`<button type="button" data-ca="tier" data-t="${k}" data-id="${p.id}" aria-pressed="${t===k}"${R} title="${esc(pt('t_'+k))}">${k==='maybe'?`<span class="pl-tl">${pt('s_maybe')}</span><span class="pl-ts">${pt('ss_maybe')}</span>`:pt('s_'+k)}</button>`).join('')}</div></article>`; }
  const sec=(k,title,n,body,extra,shut)=>`<section class="pl-cs" data-k="${esc(k)}">${shut?'<details>':''}<${shut?'summary':'div'} class="pl-csh"><h3>${title}<small>${n}</small></h3>${extra||''}</${shut?'summary':'div'}><div class="pl-csl">${body}</div>${shut?'</details>':''}</section>`;
  function sections(list,pm){ const by=f=>{ const o=new Map(); list.forEach(p=>{ const k=f(p); if(!o.has(k)) o.set(k,[]); o.get(k).push(p); }); return o; };
    const cards=(a,k)=>a.map(p=>card(p,pm)).join('')||`<p class="pl-cn">${k?pt('emptyT',{t:pt('s_'+k),n:'1230'[T.indexOf(k)]}):pt('emptyG')}</p>`;
    if(cf.mode==='area'){ const o=by(p=>p.area); return [...o.keys()].map(k=>sec(k,esc(tr(AREA,k)),o.get(k).length,cards(o.get(k)))).join(''); }
    /* グループ: the groups, おすすめ and the ungrouped come from planner-more (cGroups) */
    if(cf.mode==='group'){ if(!GM){ c.needMore().then(m=>{ GM=m; render(true); }); return ''; } return GM.cGroups(sec,cards,by(p=>(groupOf(p.id)||{}).id||''),pm,groupOf); }
    const o=by(p=>tierOf(p.id));
    return ['','must','want','maybe'].map(k=>sec(k,pt('t_'+k),(o.get(k)||[]).length,cards(o.get(k)||[],k))).join('')+sec('skip',pt('t_skip'),(o.get('skip')||[]).length,cards(o.get('skip')||[]),'',true); }
  function chips(){ const cats=Object.keys(CAT).filter(k=>DB.list.some(p=>isCand(p)&&p.cat===k));
    const ch=(k,v,l,on)=>`<button type="button" class="pl-chip" data-ca="f" data-k="${k}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
    return `<div class="pl-seg" role="group" aria-label="${esc(pt('sortBy2'))}">${['tier','group','area'].map(m=>`<button type="button" data-ca="mode" data-v="${m}" aria-pressed="${cf.mode===m}">${pt('by'+m[0].toUpperCase()+m.slice(1))}</button>`).join('')}</div>
      <div class="pl-chips">${ch('saved','1',pt('saved'),!!cf.saved)}${cats.map(k=>ch('cat',k,tr(CAT,k),cf.cat===k)).join('')}</div>`; }
  function bar(){ const n=sel.size;
    return n||selMode?`<div class="pl-cbar" role="toolbar" aria-label="${esc(pt('selN',{n}))}"><span>${pt('selN',{n})}</span>${T.map((k,i)=>`<button type="button" data-ca="bulk" data-t="${k}"><b>${'1230'[i]}</b> ${pt('s_'+k)}</button>`).join('')}
      <button type="button" data-ca="group">${pt('toGroup')}</button><button type="button" data-ca="days">${pt('toDays')}</button><button type="button" data-ca="selx" aria-label="${esc(pt('selDone'))}">${ic('x','sm')}</button></div>`:''; }
  function render(force){
    const P=c.plan(), k=JSON.stringify([cf,S.trip,P.days,sel.size,selMode,ja(),S.hist.length>0,!!DB.photos,!!S.cardMedia]);
    if(skip&&!force){ skip=false; KEY=k; return; }
    if(k===KEY&&!force) return; KEY=k;
    const pm=plannedMap(P), list=pool(), y=el.querySelector('.pl-clist')?scrollY:null;
    el.innerHTML=`<div class="pl-crail"><div class="pl-ctop2"><div><h2 class="pl-cl-t">${pt('cT')}</h2>${S.help?`<p class="pl-hint">${pt('cS')}</p>`:''}</div>
        <span><button type="button" class="pl-cbtn" data-ca="undo"${S.hist.length?'':' disabled'}>${ic('undo','sm')}<span class="sr">${pt('undo')}</span></button> <button type="button" class="pl-cbtn${selMode?' pl-on':''}" data-ca="selmode" aria-pressed="${selMode}">${pt('sel')}</button></span></div>
      <label class="pl-search">${ic('search','sm')}<span class="sr">${pt('cSearch')}</span><input class="pl-cq" type="search" value="${esc(cf.q||'')}" placeholder="${esc(pt('cSearch'))}" autocomplete="off" enterkeyhint="search"></label>
      ${chips()}${sel.size||selMode?'':`<div class="pl-cbar pl-chand"><button type="button" class="pl-btn pl-pri" data-ca="handoff">${pt('handoff')}</button></div>`}</div>
      <div class="pl-clist">${list.length?sections(list,pm):`<button type="button" class="pl-cn" data-ca="clearf">${pt('none2')}</button>`}</div>${bar()}`;
    if(y!=null) scrollTo(0,y);
    if(focus){ const f=el.querySelector(`.pl-cc[data-id="${focus}"]`); if(f&&document.activeElement===document.body) f.focus({preventScroll:true}); }
    if(!el.querySelector('.pl-cc[tabindex="0"]')){ const f=el.querySelector('.pl-cc'); if(f) f.tabIndex=0; }
  }
  /* roving: one card in the Tab order; its own buttons join it while it is the active one */
  function rove(cc){ focus=cc.dataset.id; el.querySelectorAll('.pl-cc[tabindex="0"],.pl-cc [tabindex="0"]').forEach(x=>{ if(!cc.contains(x)) x.tabIndex=-1; });
    cc.tabIndex=0; cc.querySelectorAll('button').forEach(b=>{ b.tabIndex=0; }); }
  el.addEventListener('focusin',e=>{ const cc=e.target.closest('.pl-cc'); if(cc) rove(cc); });
  /* a tier tap moves the one card, and the next render only recounts */
  function setTier(ids,t,msg){ if(!ids.length) return;
    editTrip(x=>{ ids.forEach(id=>{ x.tier[id]=t; }); },msg||null);
    if(cf.mode!=='tier'){ return; }
    skip=true; const u=el.querySelector('[data-ca="undo"]'); if(u) u.disabled=false; ids.forEach(id=>{ const a=el.querySelector(`.pl-cc[data-id="${id}"]`), to=el.querySelector(`.pl-cs[data-k="${t}"] .pl-csl`); if(!a) return;
      const nx=ids.length===1&&a.contains(document.activeElement)&&a.parentNode!==to&&(a.nextElementSibling||a.previousElementSibling);
      a.dataset.tier=t; a.querySelectorAll('[data-ca="tier"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t)); a.querySelector('.pl-ccs')&&a.querySelector('.pl-ccs').remove();
      if(to&&a.parentNode!==to){ to.prepend(a); const e=to.querySelector('.pl-cn'); if(e) e.remove(); }
      if(nx&&nx.classList.contains('pl-cc')){ nx.focus(); nx.scrollIntoView({block:'nearest'}); } });
    el.querySelectorAll('.pl-cs').forEach(s=>{ const n=s.querySelectorAll('.pl-cc').length, m=s.querySelector('h3 small'); if(m) m.textContent=n; }); }
  const targets=()=>sel.size?[...sel]:focus?[focus]:[];
  /* 日程に組む →: ② on the day where the first unplaced must fits most cheaply, its picker open */
  function handoff(){ const o=cover(c.plan()).open; setStage('plan');
    if(!o.length){ toast(pt('allPlaced')); return; }
    const P=c.plan(); let best=null;
    DB.days.forEach((d,i)=>{ const pv=c.sim().insertPlan(d,c.idsOf(d.date,P),[o[0].id],P,{deadline:S.dayEnd},null); if(pv&&(!best||(pv.breaks.length-best.b||pv.dDrive-best.v)<0)) best={i,b:pv.breaks.length,v:pv.dDrive}; });
    if(best){ setDay(best.i); if(best.b) toast(pt('nextMust',{d:dlabel(DB.days[best.i])})); }   /* the sheet's pills say the rest */
    openPlace(o[0].id); }
  function toggle(id){ if(sel.has(id)) sel.delete(id); else sel.add(id); render(true); }
  el.addEventListener('click',e=>{ const b=e.target.closest('[data-ca]'), cc=e.target.closest('.pl-cc');
    if(cc) focus=cc.dataset.id;
    if(!b){ if(cc&&(selMode||e.shiftKey||e.metaKey||e.ctrlKey)) toggle(cc.dataset.id); return; }
    const id=b.dataset.id;
    switch(b.dataset.ca){
      case 'tier': { const t=b.dataset.t, now=tierOf(id); setTier([id],now===t?'':t); break; }
      case 'open': if(selMode||e.shiftKey){ toggle(id); break; } openPlace(id); break;
      case 'mode': cf.mode=b.dataset.v; saveUI(); render(true); break;
      case 'f': { const k=b.dataset.k, v=b.dataset.v; cf[k]=cf[k]===v||(k==='saved'&&cf[k])?null:v; saveUI(); render(true); break; }
      case 'selmode': selMode=!selMode; if(!selMode) sel.clear(); render(true); break;
      case 'selx': selMode=false; sel.clear(); render(true); break;
      case 'bulk': { const ids=[...sel]; setTier(ids,b.dataset.t,pt('tiered',{n:ids.length,t:pt('t_'+b.dataset.t)})); break; }
      case 'group': { const ids=targets(); if(!ids.length){ toast(pt('nothingSel')); break; } c.needMore().then(m=>m.groupSheet(ids)); break; }
      case 'days': { const pm=plannedMap(c.plan()), ids=[...sel].filter(i=>!pm.has(i)), on=[...sel].filter(i=>pm.has(i)); if(!ids.length&&!on.length){ toast(pt('nothingSel')); break; }
        S.selc={id:'_sel',ids,name:pt('selN',{n:ids.length}),nameJa:pt('selN',{n:ids.length})};
        /* what is already on a day is said, not dropped */
        c.needMore().then(m=>openSheet(head(pt('toDays'),pt('selN',{n:ids.length})+(on.length?'　'+pt('already',{n:on.length,d:dlabel(DB.days[pm.get(on[0])])}):''))+(ids.length?m.dayPick('_sel','pl-dayq-big',S.selc):'')+doneBar(),'cdays')); break; }
      case 'handoff': handoff(); break;
      case 'clearf': Object.assign(cf,{q:'',cat:null,saved:null}); saveUI(); render(true); break;
      case 'undo': c.undo(); break;
      case 'gname': { const g=S.trip.groups.find(x=>x.id===id); if(g) c.needMore().then(m=>m.nameSheet(g)); break; }
      case 'gdrop': { const g=S.trip.groups.find(x=>x.id===id); if(g) editTrip(x=>{ x.groups=x.groups.filter(o=>o.id!==id); },pt('ungrouped',{g:g.name})); break; }
      case 'guse': { const x=DB.clusters.find(o=>o.id===id); if(!x) break; const nmx=(ja()?x.nameJa:x.name)||x.id, ids=x.ids.filter(i=>!groupOf(i)&&DB.places.has(i));
        editTrip(t=>{ t.groups.push({id:'g-'+Date.now().toString(36),name:nmx,ids,from:x.id}); },pt('made',{g:nmx})); break; }
    }
  });
  let qf=0;
  el.addEventListener('input',e=>{ if(!e.target.classList.contains('pl-cq')) return; cf.q=e.target.value; clearTimeout(qf);
    qf=setTimeout(()=>{ const pos=e.target.selectionStart; render(true); const i=el.querySelector('.pl-cq'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(x){} } },120); });
  /* the gallery arrived: swap each card's picture in, a few dozen per frame, not one long re-render */
  function media(){ const cs=[...el.querySelectorAll('.pl-ccm')]; let i=0;
    const step=()=>{ cs.slice(i,i+24).forEach(m=>{ const p=place(m.dataset.id); if(p) m.innerHTML=(S.cardMedia||thumb)(p); }); i+=24; if(i<cs.length) requestAnimationFrame(step); }; step(); }
  return {
    render, media,
    /* for planner-desk's keys (J K 1 2 3 0 ⌫ X ⌘A G Enter): the selection, the focused card, the moves */
    sel, setTier, targets, toggle, focus:id=>{ if(id!==undefined) focus=id; return focus; }
  };
};
})();
