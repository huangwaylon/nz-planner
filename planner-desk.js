/* PLANNER DESK: the wide layouts (docs/WORKFLOW.md), loaded only when the planner itself is ≥1024 wide,
   after paint, so a phone never downloads it. planner.desk(ctx) adds:
   - ② a palette (unplaced musts, groups as blocks, then wants and if-times, each with its photo) and,
     from 1760, the 「6日」 board: six lanes of at least 180 px headed by the day's photo and its facts, the map
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
  palMore:{ja:'ほか {n}件・絞る',en:'{n} more: filter'}, laneEmpty:{ja:'この日は空です。左から置く',en:'Nothing on this day yet. Drop a place here'},
  sleepAt:{ja:'泊 {p}',en:'stay {p}'}, warnN:{ja:'⚠ 注意 {n}',en:'⚠ {n} alerts'}, depart2:{ja:'{t} 発',en:'leave {t}'}, arrive2:{ja:'{t} 着',en:'arrive {t}'},
};
planner.desk=function(c){
  const {S,DB,E,view,svg,pt,esc,ic,place,nm,nmLang,dlabel,dayStyle,hm,dur,plan,edit,openPlace,setDay,tierOf,cover,plannedMap,isCand,clone,
    breakLine,legSegments,geom,arc,pathD,glyphOf,tr,AREA,gal,BTN,IBTN,SEG,FIELD,ROW,BADGE,STAT,hmm}=c; const gimg=(...a)=>c.gx().gimg(...a);
  c.addStrings(PTD);
  const sim=()=>c.sim(), o=()=>({deadline:S.dayEnd}), fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  /* id → group, memoised on the groups array's identity (perf rule 6) */
  let GO=null, GOK=null; const groupOf=id=>{ if(GOK!==S.trip.groups){ GOK=S.trip.groups; GO=new Map(); GOK.forEach(g=>g.ids.forEach(i=>GO.set(i,g))); } return GO.get(id); };
  const ph=p=>p&&DB.photos&&DB.photos[p.id];
  let q='';
  /* ---------- photos: ① plates and the small thumbs; the credit rides on the picture ---------- */
  const cred=x=>x.credit==='Travel book'?pt('creditBook'):x.credit||'';
  /* the gallery's three as a mosaic over the plate; the plate shows only if none of them loads */
  S.cardMedia=p=>{ const g=gal(p).slice(0,3); if(!g.length) return plate(p);
    return `<span class="pl-plate pl-mos">${g.map((x,i)=>gimg(x,i?'110px':'220px',i?320:640)).join('')}<small class="pl-cred">${esc([...new Set(g.map(x=>x.by))].join(' · '))}</small><span class="pl-mfb">${plate(p)}</span></span>`; };
  const plate=p=>{ const x=ph(p);
    return x?`<span class="pl-plate"><img src="${esc(x.thumb||x.src)}" srcset="${esc(x.thumb||x.src)} 208w, ${esc(x.src)} 480w${x.src2x?`, ${esc(x.src2x)} 960w`:''}" sizes="(min-width:1024px) 300px, 44px" width="3" height="2" alt="" loading="lazy" decoding="async">${x.credit?`<small class="pl-cred">${esc(cred(x))}</small>`:''}</span>`
      :`<span class="pl-plate pl-noph">${ic(glyphOf(p))}<small>${esc(tr(AREA,p.area))}</small></span>`; };
  const tn=(p,n)=>{ const x=ph(p), g=gal(p)[0];
    return `<span class="pl-thumb pl-g1">${x?`<img src="${esc(x.thumb||x.src)}" alt="" width="${n}" height="${n}" loading="lazy" decoding="async" data-gi>`:''}${g?gimg(g,n+'px',120):''}<span class="pl-gfb">${ic(glyphOf(p),'sm')}</span></span>`; };
  /* a board leg in the 1日 timeline's terms: on foot, by ferry, by road */
  const legT=l=>!l?'':l.kind==='ferry'?STAT('sailboat',hmm(l.sail))+(l.d1+l.d2?STAT('car',hmm(l.d1+l.d2)):''):l.combo?[l.wa&&STAT('walk',hmm(l.wa)),l.sub&&legT(l.sub),l.wb&&STAT('walk',hmm(l.wb))].filter(Boolean).join(''):l.kind==='walk'?STAT('walk',hmm(l.min)):STAT('car',hmm(l.min));
  /* ---------- the 1日|6日 toggle: 6日 only from 1760 wide (six 180 px lanes), on by default there ---------- */
  const tg=document.createElement('div'); tg.className='pl-dtog'; view.querySelector('[data-r="tools"]').before(tg);
  const board=()=>S.vw>=1760&&(S.board!=null?S.board:true);
  /* ---------- palette ---------- */
  function palette(){ const P=plan(), pm=plannedMap(P), seen=new Set(), f=x=>!q||(x.name+' '+(x.nameJa||'')).toLowerCase().indexOf(q)>=0;
    if(!E.palette.querySelector('.pl-palette__list')) E.palette.innerHTML=FIELD({ph:pt('filt'),value:q,clear:pt('clear'),in:{cls:'pl-pq',name:'pq',type:'search'}})+'<div class="pl-palette__list"></div>';
    const item=p=>{ seen.add(p.id); return ROW({media:tn(p,32),title:`<button type="button" class="pl-row__name" data-act="popen" data-id="${p.id}"${nmLang(p)}>${esc(nm(p))}</button>`},{'data-drag':'p:'+p.id,id:p.id}); };
    const cv=cover(P), open=cv.open.filter(f), gs=S.trip.groups.map(g=>{ const n=g.ids.filter(i=>pm.has(i)).length;
      return `<div class="pl-palette__group" data-drag="g:${g.id}"><h4>${esc(g.name)} <span class="pl-badge">${n}/${g.ids.length}</span></h4>${g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)).map(i=>item(place(i))).join('')}</div>`; }).join('');
    const tierList=t=>DB.list.filter(p=>isCand(p)&&!pm.has(p.id)&&!seen.has(p.id)&&!groupOf(p.id)&&tierOf(p.id)===t&&f(p));
    const sec=(h,body,n)=>body?`<h3 class="pl-listhead">${h} <span class="pl-badge">${n}</span></h3>${body}`:'';
    E.palette.querySelector('.pl-palette__list').innerHTML=
      (cv.of&&!cv.open.length?`<h3 class="pl-listhead">${pt('mustOpen')} ${STAT('check',pt('allIn'))}</h3>`:sec(pt('mustOpen'),open.map(item).join(''),open.length))+
      sec(pt('grps'),gs,S.trip.groups.length)+
      ['want','maybe'].map(t=>{ const l=tierList(t); return sec(pt('t_'+t),l.slice(0,60).map(item).join('')+(l.length>60?BTN('ghost',pt('palMore',{n:l.length-60}),{'data-pq':''}):''),l.length); }).join(''); }
  /* ---------- the board: six lanes, each headed by its day's photo and facts, each a drop target ---------- */
  function renderBoard(){ const P=plan();
    E.board.innerHTML=DB.days.map((d,k)=>{ const sc=sim().schedule(d,null,P,o()), s=sc.rows[0], e=sc.rows[sc.rows.length-1], h=c.heroOf(sc), x=ph(h), n=sc.rows.length-2, sl=place(e.id);
      const head=`<header class="pl-dayhead" style="--day:var(--d${k%6+1})">${x?`<div class="pl-dayhead__media"><img class="pl-dayhead__photo" src="${esc(x.src)}" alt="" width="3" height="2" ${k===S.day?'':'loading="lazy" fetchpriority="low"'} decoding="async"></div>`:''}
        <button type="button" class="pl-dayhead__row" data-bday="${k}"><span class="pl-dayhead__num">${+d.date.slice(8)}</span><span class="pl-dayhead__wd">${c.wdName(d.date)}</span></button>
        <p class="pl-dayhead__stats">${STAT(e.id==='akl'?'plane':'home',esc(e.id==='akl'?'':nm(sl).replace(/\s*[(（].*?[)）]/g,'')))}${STAT('car',hmm(sc.drive))}${STAT('clock',hm(s.dep)+'–'+hm(e.arr))}${sc.warns?BADGE(sc.warns,true):''}</p></header>`;
      const rows=sc.rows.slice(1,-1).map((r,i)=>(i?`<p class="pl-leg">${legT(r.leg)}</p>`:'')+ROW({media:tn(place(r.id),40),title:`<button type="button" class="pl-row__name" data-act="bopen" data-id="${r.id}"${nmLang(place(r.id))} title="${esc(nm(place(r.id)))}">${esc(nm(place(r.id)))}</button>`,meta:`<span>${hm(r.begin)}</span>${r.warns.length?STAT('alert','',{cls:'pl-stat--warn'}):''}`},{'data-drag':`s:${d.date}:${r.id}`,id:r.id})).join('');
      return `<section class="pl-bc${k===S.day?' is-current':''}" data-dz="day" data-day="${k}" data-arm style="${dayStyle(k)}" role="group" aria-label="${esc(dlabel(d))}">${head}${rows||`<p class="pl-hint">${pt('laneEmpty')}</p>`}</section>`; }).join(''); }
  /* every day's route at once, each in its day colour */
  function allDays(on){ const g=svg.querySelector('.pl-alld'); svg.classList.toggle('pl-all',on); if(!on){ g.innerHTML=''; return; } const P=plan();
    g.innerHTML=DB.days.map((d,k)=>`<g data-day="${k}" style="${dayStyle(k)}">${legSegments(sim().schedule(d,null,P,o())).map(s=>{ const gm=s.kind==='drive'&&geom(s.a,s.b);
      return `<path class="pl-leg-${s.kind==='walk'||s.kind==='ferry'?s.kind:gm?'road':'est'}" d="${gm?pathD(gm.pts):arc(s.p0,s.p1).d}"/>`; }).join('')}</g>`).join(''); }
  /* ① the map shows the cards in view, not day 1's route */
  let fitK='';
  function fitCards(){ const ids=[...E.collect.querySelectorAll('.pl-card')].map(x=>x.dataset.id), k=ids.join(); if(!ids.length||k===fitK) return; fitK=k;
    requestAnimationFrame(()=>c.fitDay(false,ids.map(id=>({id})))); }
  let was=null;
  function render(){ const wide=S.vw>=1024, b=wide&&board();
    view.classList.toggle('pl-6',b); if(b!==was){ was=b; requestAnimationFrame(()=>c.fitDay()); } if(!wide) return;
    tg.innerHTML=SEG([{label:pt('d1'),on:!b,a:{'data-dt':0}},{label:pt('d6'),on:b,a:{'data-dt':1}}]);
    if(S.stage==='plan'){ palette(); if(b) renderBoard(); fitK=''; }
    /* the all-days map in its own task, so the board's first paint is not one long one */
    const ad=b&&S.stage==='plan'; if(ad) setTimeout(()=>allDays(view.classList.contains('pl-6')&&S.stage==='plan')); else allDays(false);
    svg.classList.toggle('pl-show-cands',S.stage==='collect'||S.browsing);
    if(S.stage==='collect') fitCards(); }
  tg.addEventListener('click',e=>{ const b=e.target.closest('[data-dt]'); if(!b) return; S.board=b.dataset.dt==='1'; c.saveUI(); render(); });
  /* typing in the palette field: the list (never the field) re-renders once per frame */
  let pqf=0; E.palette.addEventListener('input',e=>{ if(!e.target.classList.contains('pl-pq')) return; q=e.target.value.toLowerCase(); if(!pqf) pqf=requestAnimationFrame(()=>{ pqf=0; palette(); }); });
  E.palette.addEventListener('click',e=>{ if(e.target.closest('[data-pq]')){ E.palette.querySelector('.pl-pq').focus(); return; } const b=e.target.closest('[data-act="popen"]'); if(b&&!moved) openPlace(b.dataset.id); });
  E.board.addEventListener('click',e=>{ const h=e.target.closest('[data-bday]'), s=e.target.closest('[data-act="bopen"]'); if(moved) return;
    if(h) setDay(+h.dataset.bday); else if(s) openPlace(s.dataset.id); });
  /* ---------- ① keys (by e.code, so a JIS keyboard works) ---------- */
  const T={Digit1:'must',Numpad1:'must',Digit2:'want',Numpad2:'want',Digit3:'maybe',Numpad3:'maybe',Digit0:'skip',Numpad0:'skip'};
  const cards=()=>[...E.collect.querySelectorAll('.pl-card')];
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
    else if(k==='Enter'&&f&&e.target.classList.contains('pl-card')){ e.preventDefault(); openPlace(f); }
    else if(k==='Escape'&&CM.sel.size){ CM.sel.clear(); CM.render(true); } }
  /* ---------- the drag controller ---------- */
  let D=null, moved=false;
  const gh=document.createElement('div'); gh.className='pl-dragghost pl-layer'; gh.hidden=true; c.g.appendChild(gh);
  /* what is being dragged: ids, the day it comes from (a stop), or a group block */
  function payload(s){ const [k,a,b]=s.split(':'); if(k==='g'){ const g=S.trip.groups.find(x=>x.id===a), pm=plannedMap(plan()); return g&&{ids:g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)),group:g,label:g.name}; }
    if(k==='s') return {ids:[b],from:a,label:nm(place(b))}; return {ids:[a],label:nm(place(a))}; }
  function zones(){ const z=[];
    const add=(el,kind,day,rows)=>z.push({el,kind,day,r:el.getBoundingClientRect(),rows:rows.map(x=>x.getBoundingClientRect())});
    const list=E.main.querySelector('.pl-tl'); if(list&&!view.classList.contains('pl-6')&&S.stage==='plan') add(list,'slot',S.day,[...E.main.querySelectorAll('.pl-stop')]);
    E.board.querySelectorAll('.pl-bc').forEach(el=>add(el,'slot',+el.dataset.day,[...el.querySelectorAll('.pl-row')]));
    E.days.querySelectorAll('[data-day]').forEach(el=>add(el,'day',+el.dataset.day,[]));
    document.querySelectorAll('[data-drop="day"]').forEach(el=>add(el,'cal',-1,[]));
    E.collect.querySelectorAll('.pl-cs').forEach(el=>add(el,'sec',-1,[]));
    return z.filter(x=>x.r.width&&x.r.height); }
  /* the change a drop would make, as an edit function, plus its preview */
  function plan2(t){ const p=D.p, P=plan();
    if(t.kind==='sec'){ const k=t.el.dataset.k, isT=S.cf.mode!=='group'; return {trip:x=>{ p.ids.forEach(id=>{ if(isT) x.tier[id]=k; else { x.groups.forEach(g=>{ g.ids=g.ids.filter(i=>i!==id); }); const g=x.groups.find(g=>g.id===k); if(g) g.ids.push(id); } }); },
      text:isT?pt('t_'+k):(S.trip.groups.find(g=>g.id===k)||{name:'—'}).name}; }
    if(t.kind==='cal') return {cal:true,text:''};
    /* the slot was measured with the dragged row still in place: moving down its own day, it counts once too many */
    const day=DB.days[t.day], fn=m=>{ let own=-1; if(p.from){ const a=m.days[p.from], i=a.indexOf(p.ids[0]); if(i>=0){ a.splice(i,1); if(p.from===day.date) own=i; } }
      const l=(m.days[day.date]=m.days[day.date]||[]).filter(x=>p.ids.indexOf(x)<0); m.days[day.date]=l;
      if(t.kind==='slot'&&!p.group) l.splice(Math.min(t.slot-(own>=0&&own<t.slot?1:0),l.length),0,...p.ids);
      else { const pv=sim().insertPlan(day,l,p.ids,m,o(),p.group||null); if(pv){ m.days[day.date]=pv.list.concat(l.filter(x=>!DB.places.has(x))); if(pv.start){ m.start=m.start||{}; m.start[day.date]=pv.start; } } } };
    const m=clone({id:'t',days:P.days,stay:P.stay||{},start:P.start||{},stayDay:P.stayDay||{},anchors:P.anchors||{}}); fn(m);
    const sc=sim().schedule(day,null,m,o()), base=sim().schedule(day,null,P,o()), r=sc.rows.find(x=>x.id===p.ids[0]), bs=c.trial(fn)||[];
    return {fn,day,bs,text:(r?pt('arr',{t:hm(r.begin)})+'・':'')+pt('plusD',{d:dur(Math.max(0,sc.drive-base.drive))})}; }
  function hit(x,y){ for(const z of D.z){ const r=z.r; if(x<r.left||x>r.right||y<r.top||y>r.bottom) continue;
      let slot=0; if(z.kind==='slot'){ slot=z.rows.length; for(let i=0;i<z.rows.length;i++) if(y<z.rows[i].top+z.rows[i].height/2){ slot=i; break; } }
      return {el:z.el,kind:z.kind,day:z.day,slot}; } return null; }
  function frame(){ D.raf=0; gh.style.transform=`translate(${D.x+14}px,${D.y+10}px)`;
    const t=hit(D.x,D.y), key=t?t.kind+t.day+':'+t.slot+(t.el.dataset.k||t.el.dataset.date||''):'';
    if(key===D.key) return; D.key=key; D.t=t; if(D.zon) D.zon.classList.remove('is-dropzone');
    if(!t){ D.pv=null; gh.innerHTML=`<b>${esc(D.p.label)}</b>`; return; }
    D.zon=t.el; t.el.classList.add('is-dropzone'); D.pv=plan2(t);
    gh.innerHTML=`<b>${esc(D.p.label)}</b><small>${esc(D.pv.text)}</small>${D.pv.bs&&D.pv.bs.length?STAT('alert',esc(breakLine(D.pv.bs,D.pv.day)),{cls:'pl-stat--warn'}):''}`; }
  function commit(pv,t){ if(pv.trip){ c.editTrip(pv.trip,null); return; }
    if(pv.cal){ t.el.dispatchEvent(new CustomEvent('pl-drop',{bubbles:true,detail:{ids:D0.ids,from:D0.from,group:D0.group&&D0.group.id}})); return; }
    if(edit(pv.fn,pv.msg||pt('dropped',{name:D0.label,d:dlabel(pv.day)}))&&pv.day!==DB.days[S.day]&&!view.classList.contains('pl-6')) setDay(DB.days.indexOf(pv.day)); }
  /* a ⚠ drop lands armed on the target (the core's one confirm: 確定 / やめる, Enter / Esc) */
  let D0=null;
  const arm=(pv,t)=>{ const p0=D0; c.arm(t.el,breakLine(pv.bs,pv.day),()=>{ D0=p0; commit(pv,t); }); };
  document.addEventListener('keydown',e=>{ if(D&&D.on&&e.key==='Escape'){ e.preventDefault(); end(0); return; }
    /* Alt+←/→: the focused stop to the day before or after, checked like any move */
    if(e.altKey&&(e.code==='ArrowLeft'||e.code==='ArrowRight')&&S.stage==='plan'){ const row=document.activeElement&&document.activeElement.closest('.pl-stop,.pl-bc .pl-row'); if(!row) return;
      const from=row.dataset.drag?row.dataset.drag.split(':')[1]:DB.days[S.day].date, fk=DB.days.findIndex(d=>d.date===from), k=fk+(e.code==='ArrowLeft'?-1:1); if(k<0||k>=DB.days.length) return; e.preventDefault();
      /* clean: it moves at once; ⚠: the armed bar asks (Enter / Esc), no timer */
      c.needMore().then(m=>{ const fn=m.moveFn(row.dataset.id,from,DB.days[k]), bs=c.trial(fn)||[], pv={fn,bs,day:DB.days[k],msg:pt('movedTo',{d:dlabel(DB.days[k])})};
        if(bs.length) c.arm(row,breakLine(bs,pv.day),()=>edit(fn,pv.msg)); else edit(fn,pv.msg); }); return; }
    colKey(e); },true);
  view.addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||e.button) return; if(e.target.closest('input,a,select,textarea')) return;
    const src=e.target.closest('[data-drag],.pl-collect .pl-card'); if(!src) return;
    if(e.target.closest('button')&&!e.target.closest('.pl-row__name,.pl-card__media,.pl-card__title')) return;
    const s=src.dataset.drag||'p:'+src.dataset.id, p=payload(s); if(!p||!p.ids.length) return;
    D={p,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,on:false,raf:0,key:null,src}; moved=false; });
  addEventListener('pointermove',e=>{ if(!D) return; D.x=e.clientX; D.y=e.clientY;
    /* read, then write: the zones are measured before any class changes the layout */
    if(!D.on){ if(Math.hypot(D.x-D.x0,D.y-D.y0)<5) return; D.on=true; moved=true; S.ddrag=true; D.z=zones(); gh.hidden=false; gh.style.willChange='transform'; D.src.classList.add('is-lifted'); }
    e.preventDefault(); if(!D.raf) D.raf=requestAnimationFrame(frame); });
  const end=go=>{ if(!D) return; const d=D; D=null; if(d.on) c.dragDone(); cancelAnimationFrame(d.raf); gh.hidden=true; gh.style.willChange=''; d.src.classList.remove('is-lifted');
    if(d.zon) d.zon.classList.remove('is-dropzone'); setTimeout(()=>{ moved=false; },0);
    if(!go||!d.on||!d.pv) return; D0=d.p;
    if(d.pv.bs&&d.pv.bs.length) arm(d.pv,d.t); else commit(d.pv,d.t); };
  addEventListener('pointerup',()=>end(1)); addEventListener('pointercancel',()=>end(0));
  /* the drop zones were measured for this layout: a resize mid-drag cancels rather than drop on a lane that moved */
  addEventListener('resize',()=>{ if(D&&D.on) end(0); });
  /* ---------- hover: rows, stops and cards light their pin; a lane fits its day ---------- */
  if(fine){ let hot=null, hotEls=[], hq=0, hn=null;
    view.addEventListener('pointerover',e=>{ hn=e.target; if(hq) return; hq=requestAnimationFrame(()=>{ hq=0; const x=hn&&hn.closest&&hn.closest('[data-id]'), id=x&&x.dataset.id||null; if(id===hot) return;
      hotEls.forEach(y=>y.classList.remove('is-hot')); hot=id; hotEls=id?[...view.querySelectorAll(`[data-id="${CSS.escape(id)}"]`)]:[]; hotEls.forEach(y=>y.classList.add('is-hot')); }); });
    let lane=-1, lt=0;
    E.board.addEventListener('pointerover',e=>{ const col=e.target.closest('.pl-bc'), k=col?+col.dataset.day:-1; if(k===lane||D) return; lane=k; clearTimeout(lt);
      svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.toggle('pl-dim',k>=0&&+g.dataset.day!==k));
      lt=setTimeout(()=>{ c.fitDay(false,k>=0?sim().schedule(DB.days[k],null,plan(),o()).rows:null); },180); });
    E.board.addEventListener('pointerleave',()=>{ lane=-1; clearTimeout(lt); svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.remove('pl-dim')); lt=setTimeout(()=>c.fitDay(),180); }); }
  return {render};
};
})();
