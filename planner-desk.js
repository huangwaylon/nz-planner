/* PLANNER DESK: the wide layouts (docs/WORKFLOW.md), loaded only when the planner itself is ≥1024 wide,
   after paint, so a phone never downloads it. planner.desk(ctx) adds:
   - ② a palette (unplaced musts, groups as blocks, then wants and if-times, each with its photo) and,
     from 1360, the 「6日」 board: six full-height lanes headed by the day's photo and its facts, the map
     beside them drawing every day in its colour; hovering a lane fits its day;
   - ① photo plates on the cards (srcset, the ratio reserved, the credit on the picture), the key
     handling (J K ↑ ↓, 1 2 3 0, ⌫, X, ⌘A, G, Enter) and a map fitted to the cards in view;
   - one pointer drag controller (mouse and pen; touch keeps the handle and the pickers): palette places,
     group blocks, board stops and ① cards onto a day slot, a lane, the trip strip, a calendar day or a ①
     tier/group section. Rects are measured once per drag, frames only translate, and the day is
     re-simulated only when the slot changes; the ghost reads 着 14:20・＋運転18分 and any ⚠. A clean drop
     commits; a ⚠ drop lands armed: ⏎ or 入れる commits, Esc or やめる reverts;
   - hover links rows, stops, cards and pins (fine pointers only); Alt+←/→ moves the focused stop a day. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.desk) return;
const PTD={
  mustOpen:{ja:'絶対・未配置',en:'Must, not placed'}, grps:{ja:'グループ',en:'Groups'}, d1:{ja:'1日',en:'1 day'}, d6:{ja:'6日',en:'6 days'},
  arr:{ja:'着 {t}',en:'arrive {t}'}, plusD:{ja:'＋運転{d}',en:'+{d} driving'}, goIn:{ja:'入れる',en:'Put it in'}, stop2:{ja:'やめる',en:'Cancel'},
  dropped:{ja:'{name} を {d} に',en:'{name} to {d}'}, filt:{ja:'絞る',en:'Filter'}, allIn:{ja:'すべて配置済み',en:'all placed'},
  more2:{ja:'ほか {n}件・絞る',en:'{n} more: filter'}, emptyDay:{ja:'この日は空です。左から置く',en:'Nothing on this day yet. Drop a place here'},
  sleepAt:{ja:'泊 {p}',en:'stay {p}'}, warnN:{ja:'⚠ 注意 {n}',en:'⚠ {n} alerts'}, depart2:{ja:'{t} 発',en:'leave {t}'}, arrive2:{ja:'{t} 着',en:'arrive {t}'},
  t_want:{ja:'行きたい',en:'Want'}, t_maybe:{ja:'時間があれば',en:'If time'}, t_must:{ja:'絶対行く',en:'Must go'}, t_skip:{ja:'見送り',en:'Skip'}, t_:{ja:'未仕分け',en:'To sort'},
  /* the desktop's own copy: keys, and click rather than tap */
  cS:{ja:'1・2・3・0 で仕分け、⌫ で戻す。J・K で移動、X で選択、G でグループへ',en:'1 2 3 0 to sort, ⌫ to unsort; J K to move, X to select, G to group'},
  emptyT:{ja:'まだありません。［{t}］か {n} キーで入ります',en:'None yet: press [{t}] or {n}'},
  intro:{ja:'6日間のNZ旅。左のパレットから日へドラッグして足せます。日付をクリックするとその日を開きます。',en:'Six days in New Zealand. Drag from the palette onto a day; click a date to open it.'}
};
planner.desk=function(c){
  const {S,DB,E,view,svg,pt,esc,ic,place,nm,nmLang,dlabel,dayStyle,hm,dur,plan,edit,openPlace,setDay,tierOf,cover,plannedMap,isCand,clone,
    breakLine,legSegments,geom,arc,pathD,glyphOf,tr,AREA}=c;
  c.addStrings(PTD);
  const sim=()=>c.sim(), o=()=>({deadline:S.dayEnd}), fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const groupOf=id=>S.trip.groups.find(g=>g.ids.indexOf(id)>=0), ph=p=>p&&DB.photos&&DB.photos[p.id];
  let q='';
  /* ---------- photos: ① plates and the small thumbs; the credit rides on the picture ---------- */
  const cred=x=>x.credit==='Travel book'?pt('creditBook'):x.credit||'';
  S.cardMedia=p=>{ const x=ph(p);
    return x?`<span class="pl-glyph pl-thumb pl-plate"><img src="${esc(x.thumb||x.src)}" srcset="${esc(x.thumb||x.src)} 208w, ${esc(x.src)} 480w${x.src2x?`, ${esc(x.src2x)} 960w`:''}" sizes="(min-width:1024px) 300px, 44px" width="3" height="2" alt="" loading="lazy" decoding="async">${x.credit?`<small class="pl-cred">${esc(cred(x))}</small>`:''}</span>`
      :`<span class="pl-glyph pl-plate pl-noph">${ic(glyphOf(p))}<small>${esc(tr(AREA,p.area))}</small></span>`; };
  const tn=(p,n)=>{ const x=ph(p); return x?`<img class="pl-tn" src="${esc(x.thumb||x.src)}" alt="" width="${n}" height="${n}" loading="lazy" decoding="async">`:`<span class="pl-tn">${ic(glyphOf(p),'xs')}</span>`; };
  /* ---------- the 1日|6日 toggle: 6日 from 1360 wide, the default from 1600 ---------- */
  const tg=document.createElement('div'); tg.className='pl-seg pl-dtog'; view.querySelector('.pl-tools').before(tg);
  const board=()=>view.clientWidth>=1360&&(S.board!=null?S.board:view.clientWidth>=1600);
  /* ---------- palette ---------- */
  function palette(){ const P=plan(), pm=plannedMap(P), seen=new Set(), f=x=>!q||(x.name+' '+(x.nameJa||'')).toLowerCase().indexOf(q)>=0;
    const item=p=>{ seen.add(p.id); return `<button type="button" class="pl-pi" data-drag="p:${p.id}" data-id="${p.id}">${tn(p,32)}<span${nmLang(p)}>${esc(nm(p))}</span></button>`; };
    const cv=cover(P), open=cv.open.filter(f), gs=S.trip.groups.map(g=>{ const n=g.ids.filter(i=>pm.has(i)).length;
      return `<div class="pl-pg" data-drag="g:${g.id}"><b>${esc(g.name)}</b><small>${n}/${g.ids.length}</small>${g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)).map(i=>item(place(i))).join('')}</div>`; }).join('');
    const tierList=t=>DB.list.filter(p=>isCand(p)&&!pm.has(p.id)&&!seen.has(p.id)&&!groupOf(p.id)&&tierOf(p.id)===t&&f(p));
    const sec=(h,body,n)=>body?`<h3 class="pl-ph3">${h}<small>${n}</small></h3>${body}`:'';
    E.palette.innerHTML=`<label class="pl-search"><span class="sr">${pt('filt')}</span><input class="pl-pq" type="search" value="${esc(q)}" placeholder="${esc(pt('filt'))}"></label>`+
      (cv.of&&!cv.open.length?`<h3 class="pl-ph3">${pt('mustOpen')}<small>0</small><em class="pl-ok">✓ ${pt('allIn')}</em></h3>`:sec(pt('mustOpen'),open.map(item).join(''),open.length))+
      sec(pt('grps'),gs,S.trip.groups.length)+
      ['want','maybe'].map(t=>{ const l=tierList(t); return sec(pt('t_'+t),l.slice(0,60).map(item).join('')+(l.length>60?`<button type="button" class="pl-pmore" data-pq>${pt('more2',{n:l.length-60})}</button>`:''),l.length); }).join(''); }
  /* ---------- the board: six lanes, each headed by its day's photo and facts, each a drop target ---------- */
  function renderBoard(){ const P=plan();
    E.board.innerHTML=DB.days.map((d,k)=>{ const sc=sim().schedule(d,null,P,o()), s=sc.rows[0], e=sc.rows[sc.rows.length-1], h=c.heroOf(sc), x=ph(h), n=sc.rows.length-2, sl=place(e.id);
      const head=`<button type="button" class="pl-bh" data-bday="${k}">${x?`<img class="pl-bhi" src="${esc(x.src)}" alt="" width="3" height="2" ${k===S.day?'':'loading="lazy" fetchpriority="low"'} decoding="async">`:''}
        <b>${+d.date.slice(8)}</b><span>${c.wdName(d.date)}</span><small>${esc(pt('sleepAt',{p:e.id==='akl'?'✈':nm(sl).replace(/\s*[(（].*?[)）]/g,'')}))}　${pt('stops',{n})}<br>🚗${dur(sc.drive)}　~${hm(e.arr)}${e.limit?` / ${hm(e.limit)}`:''}</small>${sc.warns?`<em>${pt('warnN',{n:sc.warns})}</em>`:''}</button>`;
      const rows=sc.rows.slice(1,-1).map((r,i)=>(i?`<p class="pl-bl">🚗 ${dur(r.leg.min)}</p>`:'')+`<button type="button" class="pl-bs${r.warns.length?' pl-bad':''}" data-drag="s:${d.date}:${r.id}" data-id="${r.id}">${tn(place(r.id),40)}<span>${hm(r.begin)}</span><b${nmLang(place(r.id))}>${esc(nm(place(r.id)))}</b></button>`).join('');
      return `<section class="pl-bc${k===S.day?' pl-cur':''}" data-dz="day" data-day="${k}" style="${dayStyle(k)}">${head}<p class="pl-bt">${pt('depart2',{t:hm(s.dep)})}</p>${rows||`<p class="pl-be">${pt('emptyDay')}</p>`}<p class="pl-bt">${pt('arrive2',{t:hm(e.arr)})}</p></section>`; }).join(''); }
  /* every day's route at once, each in its day colour */
  function allDays(on){ const g=svg.querySelector('.pl-alld'); svg.classList.toggle('pl-all',on); if(!on){ g.innerHTML=''; return; } const P=plan();
    g.innerHTML=DB.days.map((d,k)=>`<g data-day="${k}" style="${dayStyle(k)}">${legSegments(sim().schedule(d,null,P,o())).map(s=>{ const gm=s.kind==='drive'&&geom(s.a,s.b);
      return `<path class="pl-leg-${s.kind==='walk'||s.kind==='ferry'?s.kind:gm?'road':'est'}" d="${gm?pathD(gm.pts):arc(s.p0,s.p1).d}"/>`; }).join('')}</g>`).join(''); }
  /* ① the map shows the cards in view, not day 1's route */
  let fitK='';
  function fitCards(){ const ids=[...E.collect.querySelectorAll('.pl-cc')].map(x=>x.dataset.id), k=ids.join(); if(!ids.length||k===fitK) return; fitK=k;
    requestAnimationFrame(()=>c.fitDay(false,ids.map(id=>({id})))); }
  let was=null;
  function render(){ const wide=view.clientWidth>=1024, b=wide&&board();
    view.classList.toggle('pl-6',b); if(b!==was){ was=b; requestAnimationFrame(()=>c.fitDay()); } if(!wide) return;
    tg.innerHTML=`<button type="button" data-dt="0" aria-pressed="${!b}">${pt('d1')}</button><button type="button" data-dt="1" aria-pressed="${b}">${pt('d6')}</button>`;
    if(S.stage==='plan'){ palette(); if(b) renderBoard(); fitK=''; }
    allDays(b&&S.stage==='plan');
    svg.classList.toggle('pl-show-cands',S.stage==='collect'||S.browsing);
    if(S.stage==='collect'){ svg.querySelectorAll('.pl-cands .pl-pin').forEach(p=>p.setAttribute('data-t',tierOf(p.dataset.id))); fitCards(); } }
  tg.addEventListener('click',e=>{ const b=e.target.closest('[data-dt]'); if(!b) return; S.board=b.dataset.dt==='1'; c.saveUI(); render(); });
  E.palette.addEventListener('input',e=>{ q=e.target.value.toLowerCase(); palette(); E.palette.querySelector('.pl-pq').focus(); });
  E.palette.addEventListener('click',e=>{ if(e.target.closest('[data-pq]')){ E.palette.querySelector('.pl-pq').focus(); return; } const b=e.target.closest('.pl-pi'); if(b&&!moved) openPlace(b.dataset.id); });
  E.board.addEventListener('click',e=>{ const h=e.target.closest('[data-bday]'), s=e.target.closest('.pl-bs'); if(moved) return;
    if(h) setDay(+h.dataset.bday); else if(s) openPlace(s.dataset.id); });
  /* ---------- ① keys (by e.code, so a JIS keyboard works) ---------- */
  const T={Digit1:'must',Numpad1:'must',Digit2:'want',Numpad2:'want',Digit3:'maybe',Numpad3:'maybe',Digit0:'skip',Numpad0:'skip'};
  const cards=()=>[...E.collect.querySelectorAll('.pl-cc')].filter(x=>x.offsetParent!==null);
  function moveFocus(d,CM){ const a=cards(); if(!a.length) return; let i=a.findIndex(x=>x.dataset.id===CM.focus()); i=i<0?0:Math.max(0,Math.min(a.length-1,i+d));
    a.forEach(x=>x.tabIndex=-1); CM.focus(a[i].dataset.id); a[i].tabIndex=0; a[i].focus({preventScroll:true}); a[i].scrollIntoView({block:'nearest'}); }
  function colKey(e){ const CM=c.col(); if(!CM||S.stage!=='collect'||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||c.kind()) return;
    if((e.metaKey||e.ctrlKey)&&e.code!=='KeyA') return; const k=e.code, t=T[k], f=CM.focus();
    if(k==='KeyJ'||k==='ArrowDown'){ e.preventDefault(); moveFocus(1,CM); }
    else if(k==='KeyK'||k==='ArrowUp'){ e.preventDefault(); moveFocus(-1,CM); }
    else if(t||k==='Backspace'||k==='Delete'){ const ids=CM.targets(); if(!ids.length) return; e.preventDefault(); CM.setTier(ids,t||'',ids.length>1?pt('tiered',{n:ids.length,t:pt('t_'+(t||''))}):null); }
    else if(k==='KeyX'&&f){ e.preventDefault(); CM.toggle(f); }
    else if(k==='KeyA'&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); cards().forEach(x=>CM.sel.add(x.dataset.id)); CM.render(true); }
    else if(k==='KeyG'){ e.preventDefault(); const ids=CM.targets(); if(ids.length) c.needMore().then(m=>m.groupSheet(ids)); }
    else if(k==='Enter'&&f&&e.target.classList.contains('pl-cc')){ e.preventDefault(); openPlace(f); }
    else if(k==='Escape'&&CM.sel.size){ CM.sel.clear(); CM.render(true); } }
  /* ---------- the drag controller ---------- */
  let D=null, moved=false;
  const mk=k=>{ const x=document.createElement('div'); x.className=k; x.hidden=true; document.body.appendChild(x); return x; }, gh=mk('pl-dgh'), ar=mk('pl-armbar pl-layer'); ar.setAttribute('role','alertdialog');
  /* what is being dragged: ids, the day it comes from (a stop), or a group block */
  function payload(s){ const [k,a,b]=s.split(':'); if(k==='g'){ const g=S.trip.groups.find(x=>x.id===a), pm=plannedMap(plan()); return g&&{ids:g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)),group:g,label:g.name}; }
    if(k==='s') return {ids:[b],from:a,label:nm(place(b))}; return {ids:[a],label:nm(place(a))}; }
  function zones(){ const z=[];
    const add=(el,kind,day,rows)=>z.push({el,kind,day,r:el.getBoundingClientRect(),rows:rows.map(x=>x.getBoundingClientRect())});
    const list=E.main.querySelector('.pl-tl'); if(list&&!view.classList.contains('pl-6')&&S.stage==='plan') add(list,'slot',S.day,[...E.main.querySelectorAll('.pl-row')]);
    E.board.querySelectorAll('.pl-bc').forEach(el=>add(el,'slot',+el.dataset.day,[...el.querySelectorAll('.pl-bs')]));
    E.days.querySelectorAll('.pl-daybtn').forEach(el=>add(el,'day',+el.dataset.day,[]));
    document.querySelectorAll('[data-drop="day"]').forEach(el=>add(el,'cal',-1,[]));
    E.collect.querySelectorAll('.pl-cs').forEach(el=>add(el,'sec',-1,[]));
    return z.filter(x=>x.r.width&&x.r.height); }
  /* the change a drop would make, as an edit function, plus its preview */
  function plan2(t){ const p=D.p, P=plan();
    if(t.kind==='sec'){ const k=t.el.dataset.k, isT=S.cf.mode!=='group'; return {trip:x=>{ p.ids.forEach(id=>{ if(isT) x.tier[id]=k; else { x.groups.forEach(g=>{ g.ids=g.ids.filter(i=>i!==id); }); const g=x.groups.find(g=>g.id===k); if(g) g.ids.push(id); } }); },
      text:isT?pt('t_'+k):(S.trip.groups.find(g=>g.id===k)||{name:'—'}).name}; }
    if(t.kind==='cal') return {cal:true,text:''};
    const day=DB.days[t.day], fn=m=>{ if(p.from){ const a=m.days[p.from], i=a.indexOf(p.ids[0]); if(i>=0) a.splice(i,1); }
      const l=(m.days[day.date]=m.days[day.date]||[]).filter(x=>p.ids.indexOf(x)<0); m.days[day.date]=l;
      if(t.kind==='slot'&&!p.group) l.splice(Math.min(t.slot,l.length),0,...p.ids);
      else { const pv=sim().insertPlan(day,l,p.ids,m,o(),p.group||null); if(pv){ m.days[day.date]=pv.list.concat(l.filter(x=>!DB.places.has(x))); if(pv.start){ m.start=m.start||{}; m.start[day.date]=pv.start; } } } };
    const m=clone({id:'t',days:P.days,stay:P.stay||{},start:P.start||{},stayDay:P.stayDay||{},anchors:P.anchors||{}}); fn(m);
    const sc=sim().schedule(day,null,m,o()), base=sim().schedule(day,null,P,o()), r=sc.rows.find(x=>x.id===p.ids[0]), bs=c.trial(fn)||[];
    return {fn,day,bs,text:(r?pt('arr',{t:hm(r.begin)})+'・':'')+pt('plusD',{d:dur(Math.max(0,sc.drive-base.drive))})}; }
  function hit(x,y){ for(const z of D.z){ const r=z.r; if(x<r.left||x>r.right||y<r.top||y>r.bottom) continue;
      let slot=0; if(z.kind==='slot'){ slot=z.rows.length; for(let i=0;i<z.rows.length;i++) if(y<z.rows[i].top+z.rows[i].height/2){ slot=i; break; } }
      return {el:z.el,kind:z.kind,day:z.day,slot}; } return null; }
  function frame(){ D.raf=0; gh.style.transform=`translate(${D.x+14}px,${D.y+10}px)`;
    const t=hit(D.x,D.y), key=t?t.kind+t.day+':'+t.slot+(t.el.dataset.k||t.el.dataset.date||''):'';
    if(key===D.key) return; D.key=key; D.t=t; document.querySelectorAll('.pl-dzon').forEach(x=>x.classList.remove('pl-dzon'));
    if(!t){ D.pv=null; gh.innerHTML=`<b>${esc(D.p.label)}</b>`; return; }
    t.el.classList.add('pl-dzon'); D.pv=plan2(t);
    gh.innerHTML=`<b>${esc(D.p.label)}</b><small>${esc(D.pv.text)}</small>${D.pv.bs&&D.pv.bs.length?`<small class="pl-gw">⚠ ${esc(breakLine(D.pv.bs,D.pv.day))}</small>`:''}`; }
  function commit(pv,t){ if(pv.trip){ c.editTrip(pv.trip,null); return; }
    if(pv.cal){ t.el.dispatchEvent(new CustomEvent('pl-drop',{bubbles:true,detail:{ids:D0.ids,from:D0.from,group:D0.group&&D0.group.id}})); return; }
    if(edit(pv.fn,pt('dropped',{name:D0.label,d:dlabel(pv.day)}))&&pv.day!==DB.days[S.day]&&!view.classList.contains('pl-6')) setDay(DB.days.indexOf(pv.day)); }
  let D0=null, ARMED=null;
  function arm(pv,t){ ARMED={pv,t}; ar.hidden=false; ar.innerHTML=`<p>⚠ ${esc(breakLine(pv.bs,pv.day))}</p><div><button type="button" class="pl-btn pl-sec" data-ar="0">${pt('stop2')} <kbd>Esc</kbd></button><button type="button" class="pl-btn pl-pri" data-ar="1">${pt('goIn')} <kbd>⏎</kbd></button></div>`;
    const r=t.el.getBoundingClientRect(); ar.style.left=Math.max(8,Math.min(innerWidth-360,r.left))+'px'; ar.style.top=Math.min(innerHeight-140,r.top+20)+'px'; ar.querySelector('[data-ar="1"]').focus(); }
  function disarm(go){ const a=ARMED; ARMED=null; ar.hidden=true; if(go&&a) commit(a.pv,a.t); }
  ar.addEventListener('click',e=>{ const b=e.target.closest('[data-ar]'); if(b) disarm(b.dataset.ar==='1'); });
  document.addEventListener('keydown',e=>{ if(ARMED&&(e.key==='Escape'||e.key==='Enter')){ e.preventDefault(); e.stopPropagation(); disarm(e.key==='Enter'); return; }
    /* Alt+←/→: the focused stop to the day before or after, checked like any move */
    if(e.altKey&&(e.code==='ArrowLeft'||e.code==='ArrowRight')&&S.stage==='plan'){ const row=document.activeElement&&document.activeElement.closest('.pl-row,.pl-bs'); if(!row) return;
      const from=row.dataset.drag?row.dataset.drag.split(':')[1]:DB.days[S.day].date, fk=DB.days.findIndex(d=>d.date===from), k=fk+(e.code==='ArrowLeft'?-1:1); if(k<0||k>=DB.days.length) return; e.preventDefault();
      c.needMore().then(m=>{ c.guard(row,'alt'+row.dataset.id+k,m.moveFn(row.dataset.id,from,DB.days[k]),pt('movedTo',{d:dlabel(DB.days[k])})); }); return; }
    colKey(e); },true);
  view.addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||e.button) return; if(e.target.closest('input,a,select,textarea')) return;
    const src=e.target.closest('[data-drag],.pl-collect .pl-cc'); if(!src) return;
    if(e.target.closest('button')&&!e.target.closest('.pl-pi,.pl-bs')&&!(src.classList.contains('pl-cc')&&!e.target.closest('.pl-tseg,.pl-cbtn'))) return;
    const s=src.dataset.drag||'p:'+src.dataset.id, p=payload(s); if(!p||!p.ids.length) return;
    D={p,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,on:false,raf:0,key:null,src}; moved=false; });
  addEventListener('pointermove',e=>{ if(!D) return; D.x=e.clientX; D.y=e.clientY;
    if(!D.on){ if(Math.hypot(D.x-D.x0,D.y-D.y0)<5) return; D.on=true; moved=true; D.z=zones(); gh.hidden=false; view.classList.add('pl-dragging'); D.src.classList.add('pl-lift'); }
    e.preventDefault(); if(!D.raf) D.raf=requestAnimationFrame(frame); });
  const end=go=>{ if(!D) return; const d=D; D=null; cancelAnimationFrame(d.raf); gh.hidden=true; view.classList.remove('pl-dragging'); d.src.classList.remove('pl-lift');
    document.querySelectorAll('.pl-dzon').forEach(x=>x.classList.remove('pl-dzon')); setTimeout(()=>{ moved=false; },0);
    if(!go||!d.on||!d.pv) return; D0=d.p;
    if(d.pv.bs&&d.pv.bs.length) arm(d.pv,d.t); else commit(d.pv,d.t); };
  addEventListener('pointerup',()=>end(1)); addEventListener('pointercancel',()=>end(0));
  /* ---------- hover: rows, stops and cards light their pin; a lane fits its day ---------- */
  if(fine){ view.addEventListener('pointerover',e=>{ const x=e.target.closest('[data-id]'), id=x&&x.dataset.id;
      view.querySelectorAll('.pl-hot').forEach(y=>y.classList.remove('pl-hot')); if(!id) return;
      view.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(y=>y.classList.add('pl-hot')); });
    let lane=-1, lt=0;
    E.board.addEventListener('pointerover',e=>{ const col=e.target.closest('.pl-bc'), k=col?+col.dataset.day:-1; if(k===lane||D) return; lane=k; clearTimeout(lt);
      svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.toggle('pl-dim',k>=0&&+g.dataset.day!==k));
      lt=setTimeout(()=>{ c.fitDay(false,k>=0?sim().schedule(DB.days[k],null,plan(),o()).rows:null); },180); });
    E.board.addEventListener('pointerleave',()=>{ lane=-1; clearTimeout(lt); svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.remove('pl-dim')); lt=setTimeout(()=>c.fitDay(),180); }); }
  return {render};
};
})();
