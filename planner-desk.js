/* PLANNER DESK: the wide layouts (docs/WORKFLOW.md), loaded only when the planner itself is ≥1024
   wide, after paint. ② palette and the 6日 board (all days on the map); one pointer drag controller
   (mouse/pen; touch keeps the handle and pickers): rects measured once, the day re-simulated per
   slot change, a ⚠ drop armed (⏎ commits, Esc reverts); hover links rows and pins; Alt+←/→. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.desk) return;
const PTD={
  mustOpen:{ja:'絶対・未配置',en:'Must, not placed'}, grps:{ja:'グループ',en:'Groups'}, d1:{ja:'1日',en:'1 day'}, d6:{ja:'6日',en:'6 days'},
  arr:{ja:'着 {t}',en:'arrive {t}'}, plusD:{ja:'＋運転{d}',en:'+{d} driving'}, goIn:{ja:'入れる',en:'Put it in'}, stop2:{ja:'やめる',en:'Cancel'},
  dropped:{ja:'{name} を {d} に',en:'{name} to {d}'}, t_want:{ja:'行きたい',en:'Want'}, t_maybe:{ja:'時間があれば',en:'If time'}, t_must:{ja:'絶対行く',en:'Must go'}, t_skip:{ja:'見送り',en:'Skip'}, t_:{ja:'未仕分け',en:'To sort'}, filt:{ja:'絞る',en:'Filter'}
};
planner.desk=function(c){
  const {S,DB,E,view,svg,pt,esc,place,nm,nmLang,dlabel,dayStyle,hm,dur,plan,edit,openPlace,setDay,tierOf,cover,plannedMap,isCand,clone,breakLine,legSegments,geom,arc,pathD}=c;
  c.addStrings(PTD);
  const sim=()=>c.sim(), o=()=>({deadline:S.dayEnd}), fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  const groupOf=id=>S.trip.groups.find(g=>g.ids.indexOf(id)>=0);
  let q='';
  const tg=document.createElement('div'); tg.className='pl-seg pl-dtog'; view.querySelector('.pl-tools').before(tg);
  const board=()=>view.clientWidth>=1440&&(S.board!=null?S.board:view.clientWidth>=1600);
  function palette(){ const P=plan(), pm=plannedMap(P), seen=new Set(), f=x=>!q||(x.name+' '+(x.nameJa||'')).toLowerCase().indexOf(q)>=0;
    const item=p=>{ seen.add(p.id); return `<button type="button" class="pl-pi" data-drag="p:${p.id}" data-id="${p.id}"${nmLang(p)}>${esc(nm(p))}</button>`; };
    const open=cover(P).open.filter(f), gs=S.trip.groups.map(g=>{ const n=g.ids.filter(i=>pm.has(i)).length;
      return `<div class="pl-pg" data-drag="g:${g.id}"><b>${esc(g.name)}</b><small>${n}/${g.ids.length}</small>${g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)).map(i=>item(place(i))).join('')}</div>`; }).join('');
    const tierList=t=>DB.list.filter(p=>isCand(p)&&!pm.has(p.id)&&!seen.has(p.id)&&!groupOf(p.id)&&tierOf(p.id)===t&&f(p));
    const sec=(h,body,n)=>body?`<h3 class="pl-ph3">${h}<small>${n}</small></h3>${body}`:'';
    E.palette.innerHTML=`<label class="pl-search"><span class="sr">${pt('filt')}</span><input class="pl-pq" type="search" value="${esc(q)}" placeholder="${esc(pt('filt'))}"></label>`+
      sec(pt('mustOpen'),open.map(item).join(''),open.length)+sec(pt('grps'),gs,S.trip.groups.length)+
      ['want','maybe'].map(t=>{ const l=tierList(t); return sec(pt('t_'+t),l.slice(0,60).map(item).join(''),l.length); }).join(''); }
  function renderBoard(){ const P=plan();
    E.board.innerHTML=DB.days.map((d,k)=>{ const sc=sim().schedule(d,null,P,o()), s=sc.rows[0], e=sc.rows[sc.rows.length-1];
      return `<section class="pl-bc${k===S.day?' pl-cur':''}" data-dz="day" data-day="${k}" style="${dayStyle(k)}"><button type="button" class="pl-bh" data-bday="${k}"><b>${+d.date.slice(8)}</b> ${c.wdName(d.date)}${sc.warns?` <i>⚠${sc.warns}</i>`:''}</button>
        <p class="pl-bt">${hm(s.dep)}</p>${sc.rows.slice(1,-1).map(r=>`<div class="pl-bs${r.warns.length?' pl-bad':''}" data-drag="s:${d.date}:${r.id}" data-id="${r.id}"><span>${hm(r.begin)}</span>${esc(nm(place(r.id)))}</div>`).join('')}
        <p class="pl-bt">~${hm(e.arr)}　🚗${dur(sc.drive)}</p></section>`; }).join(''); }
  function allDays(on){ const g=svg.querySelector('.pl-alld'); svg.classList.toggle('pl-all',on); if(!on){ g.innerHTML=''; return; } const P=plan();
    g.innerHTML=DB.days.map((d,k)=>`<g data-day="${k}" style="${dayStyle(k)}">${legSegments(sim().schedule(d,null,P,o())).map(s=>{ const gm=s.kind==='drive'&&geom(s.a,s.b);
      return `<path class="pl-leg-${s.kind==='walk'||s.kind==='ferry'?s.kind:gm?'road':'est'}" d="${gm?pathD(gm.pts):arc(s.p0,s.p1).d}"/>`; }).join('')}</g>`).join(''); }
  let was=null;
  function render(){ const wide=view.clientWidth>=1024, b=wide&&board();
    view.classList.toggle('pl-6',b); if(b!==was){ was=b; requestAnimationFrame(()=>c.fitDay()); } if(!wide) return;
    tg.innerHTML=`<button type="button" data-dt="0" aria-pressed="${!b}">${pt('d1')}</button><button type="button" data-dt="1" aria-pressed="${b}">${pt('d6')}</button>`;
    if(S.stage==='plan'){ palette(); if(b) renderBoard(); }
    allDays(b&&S.stage==='plan');
    svg.classList.toggle('pl-show-cands',S.stage==='collect'||S.browsing);
    if(S.stage==='collect') svg.querySelectorAll('.pl-cands .pl-pin').forEach(p=>p.setAttribute('data-t',tierOf(p.dataset.id))); }
  tg.addEventListener('click',e=>{ const b=e.target.closest('[data-dt]'); if(!b) return; S.board=b.dataset.dt==='1'; render(); });
  E.palette.addEventListener('input',e=>{ q=e.target.value.toLowerCase(); palette(); E.palette.querySelector('.pl-pq').focus(); });
  E.palette.addEventListener('click',e=>{ const b=e.target.closest('.pl-pi'); if(b&&!moved) openPlace(b.dataset.id); });
  E.board.addEventListener('click',e=>{ const h=e.target.closest('[data-bday]'), s=e.target.closest('.pl-bs'); if(moved) return;
    if(h) setDay(+h.dataset.bday); else if(s) openPlace(s.dataset.id); });
  let D=null, moved=false;
  const mk=k=>{ const x=document.createElement('div'); x.className=k; x.hidden=true; document.body.appendChild(x); return x; }, gh=mk('pl-dgh'), ar=mk('pl-armbar pl-layer'); ar.setAttribute('role','alertdialog');
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
    if(e.altKey&&(e.code==='ArrowLeft'||e.code==='ArrowRight')&&S.stage==='plan'){ const row=document.activeElement&&document.activeElement.closest('.pl-row'); if(!row) return;
      const k=S.day+(e.code==='ArrowLeft'?-1:1); if(k<0||k>=DB.days.length) return; e.preventDefault();
      c.needMore().then(m=>{ const date=DB.days[S.day].date; c.guard(row,'alt'+row.dataset.id+k,m.moveFn(row.dataset.id,date,DB.days[k]),pt('movedTo',{d:dlabel(DB.days[k])})); }); } },true);
  view.addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||e.button) return; if(e.target.closest('button:not(.pl-pi),input,a,select,textarea')&&!e.target.closest('.pl-pi')) return;
    const src=e.target.closest('[data-drag],.pl-collect .pl-cc'); if(!src) return;
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
  if(fine) view.addEventListener('pointerover',e=>{ const x=e.target.closest('[data-id]'), id=x&&x.dataset.id;
    view.querySelectorAll('.pl-hot').forEach(y=>y.classList.remove('pl-hot')); if(!id) return;
    view.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(y=>y.classList.add('pl-hot')); });
  E.board.addEventListener('pointerover',e=>{ const col=e.target.closest('.pl-bc'); svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.toggle('pl-dim',!!col&&g.dataset.day!==col.dataset.day)); });
  E.board.addEventListener('pointerleave',()=>svg.querySelectorAll('.pl-alld>g').forEach(g=>g.classList.remove('pl-dim')));
  return {render};
};
})();
