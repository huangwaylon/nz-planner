/* planner-cal.js: ③'s month calendar and versions grid, a lazy chunk (≤3.5 KB gz with its CSS).
   planner.cal.render(el, model, opts) and .renderVersions(el, model, opts) write HTML into el, bind
   once per el, and re-render on langchange. Day cells carry data-drop="day" data-date; the drag
   controller fires a bubbling 'pl-drop' CustomEvent (detail = payload) on one -> opts.onDropStop.
   model.marks = [[from, to, ja, en]] replaces MK, the known dates shown on quiet days. */
(P=>{
'use strict';
const D=document,live=new Set(),WD=['日月火水木金土','SunMonTueWedThuFriSat'],
  /* Waitangi Day is Sat 6 Feb 2027, so it is observed Mon 8 Feb; the Lantern Festival per research/jp-signal.md */
  MK=[['2027-02-06','2027-02-06','ワイタンギ・デー','Waitangi Day'],['2027-02-08','2027-02-08','ワイタンギ・デー振替休日','Waitangi Day observed'],['2027-02-18','2027-02-21','ランタン祭り','Lantern Festival']],
  T={st:['件',' stops'],sa:['か所',' stops'],mu:['絶対','Must'],dr:['運転','Drive'],sl:['泊','Stay'],bk:['予約','Booked'],
    same:['＝同じ','= same'],use:['この案にする','Use this plan'],take:['この日だけ取り込む','Take this day'],act:['使用中','In use'],tot:['合計','Total'],cmp:['案の比較','Versions']};
let E=0;
const t=k=>T[k][E],
  L=x=>x==null?'':typeof x=='object'?x[E?'en':'ja']||x.en||'':x,
  nm=o=>!E&&o.nameJa||L(o.name)||'',
  esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';'),
  p2=n=>(n<10?'0':'')+n,
  dur=m=>(m=Math.round(m||0),(m/60|0)+':'+p2(m%60)),
  tm=x=>typeof x=='number'?p2((x/60|0)%24)+':'+p2(Math.round(x%60)):x||'',
  mins=s=>(s=String(s||''),(s[0]=='+'?1440:0)+s.replace('+','').split(':').reduce((a,b)=>a*60+ +b,0)),
  ymd=s=>new Date(s+'T00:00Z'),
  wd=s=>ymd(s).getUTCDay(),
  wn=c=>E?WD[1].substr(c*3,3):WD[0][c],
  dn=s=>+s.slice(8),
  en=(d,o)=>d.toLocaleDateString('en-GB',Object.assign({timeZone:'UTC',month:'long'},o)),
  we=c=>c%6?'':' class="pl-cal-we"',
  sp=(c,h)=>`<span class="pl-cal-l${c}">${h}</span>`,
  warn=n=>n?`<b class="pl-cal-w">⚠︎${n}</b>`:'✓',
  /* Sunday-first weeks covering the month of `start`: [[iso × 7], …] */
  weeks=start=>{
    const f=ymd(start.slice(0,8)+'01'),m=f.getUTCMonth(),w=[];
    for(let d=new Date(f-f.getUTCDay()*864e5);!w.length||d.getUTCMonth()==m;){
      const r=[];
      for(let i=0;i<7;i++,d=new Date(+d+864e5)) r.push(d.toISOString().slice(0,10));
      w.push(r);
    }
    return w;
  },
  aria=d=>{ const x=ymd(d.date),n=(d.warn||[]).length;
    return (E?en(x,{weekday:'long',day:'numeric'}):x.getUTCMonth()+1+'月'+dn(d.date)+'日 '+wn(x.getUTCDay())+'曜日')+', '+d.stops+t('sa')+(n?E?`, ${n} warning${n>1?'s':''}`:', 注意'+n:''); },
  /* a cell's lines; each piece is an <i> that wraps whole, so a narrow cell breaks between them */
  ln=(c,a)=>sp(c,a.filter(x=>x).map(x=>`<i>${x}</i>`).join(' ')),
  det=d=>{ const b=d.booked||{},l=d.limit;
    return (d.fact?sp(' pl-cal-f',esc(L(d.fact))):'')+sp('',t('sl')+' '+esc(nm(d.sleep||{})))+
      ln('',[d.stops+t('st'),d.mustPlaced&&t('mu')+' '+d.mustPlaced,warn((d.warn||[]).length)])+
      ln('',[t('dr')+' '+dur(d.driveMin),b.total&&`${t('bk')} ${b.done}/${b.total}`])+
      ln(l&&mins(d.endTime)>mins(l.time)?' pl-cal-w':'',['~'+tm(d.endTime),l&&`<span class="pl-cal-lim">/ ${L(l.label)?esc(L(l.label))+' ':''}${tm(l.time)}</span>`])+
      ln(' pl-cal-sun',['↑'+tm(d.sunrise),'↓'+tm(d.sunset)]); },
  btn=(d,r,c)=>`<button type="button" class="pl-cal-d" data-act="day" data-drop="day" data-date="${d.date}" data-r="${r}" data-c="${c}" style="--c:var(${d.colorVar});--ci:var(${d.inkVar})" aria-label="${esc(aria(d))}" title="${esc((d.warn||[]).map(x=>x.text).join('\n'))}"><span class="pl-cal-h"><b class="pl-cal-n">${dn(d.date)}</b><span${we(wd(d.date))}>${wn(wd(d.date))}</span></span><span class="pl-cal-x">${det(d)}</span></button>`,
  month=(el,m)=>{
    const by={},M=m.marks||MK,mo=m.trip.start.slice(0,7),f=ymd(mo+'-01'),seen={},
      mark=x=>(M.find(a=>a[0]<=x&&x<=a[1])||[])[2+E]||'',
      flush=()=>{ const ds=fold.filter(x=>x.slice(0,7)==mo),a=ds[0],z=ds[ds.length-1];
        if(a) h+=`<tr class="pl-cal-fold"><td colspan="7">${E?dn(a)+'–'+dn(z)+' '+en(f,{}).slice(0,3):f.getUTCMonth()+1+'月'+dn(a)+'–'+dn(z)+'日'}${ds.map(x=>mark(x)?` · ${dn(x)} ${wn(wd(x))} ${esc(mark(x))}`:'').join('')}</td></tr>`;
        fold=[]; };
    let h='',fold=[],leg='',placed=0,total=0;
    m.days.forEach(d=>{ by[d.date]=d; placed+=d.mustPlaced||0; total=d.mustTotal||total; });
    weeks(m.trip.start).forEach((wk,r)=>{
      if(!wk.some(x=>by[x])) return fold.push(...wk);
      flush();
      h+='<tr>'+wk.map((x,c)=>{
        const k=by[x]?'':mark(x);
        if(k&&!seen[k]) seen[k]=leg+=` · ${dn(x)} ${wn(c)} ${esc(k)}`;
        return by[x]?`<td>${btn(by[x],r,c)}</td>`:`<td class="pl-cal-q${x.slice(0,7)==mo?'':' pl-cal-o'}"><span${we(c)}>${dn(x)}</span>${k?`<small>${esc(k)}</small>`:''}</td>`;
      }).join('')+'</tr>';
    });
    flush();
    el.innerHTML=`<ol class="pl-cal-ls" data-g>${m.days.map((d,i)=>`<li>${btn(d,i,0)}</li>`).join('')}</ol><table class="pl-cal-mo" data-g><caption>${E?en(f,{year:'numeric'}):f.getUTCFullYear()+'年'+(f.getUTCMonth()+1)+'月'}${total?`<small>${t('mu')} ${placed}/${total}</small>`:''}</caption><colgroup>${[0,1,2,3,4,5,6].map(c=>`<col${m.days.some(d=>wd(d.date)==c)?'':' class="pl-cal-k"'}>`).join('')}</colgroup><thead><tr>${[0,1,2,3,4,5,6].map(c=>`<th scope="col"${we(c)}>${wn(c)}</th>`).join('')}</tr></thead><tbody>${h}</tbody></table>${leg?`<p class="pl-cal-mk">${leg.slice(3)}</p>`:''}`;
  },
  key=x=>x?(x.stops||[]).join('|'):'',
  versions=(el,m)=>{
    const V=m.versions.slice().sort((a,b)=>b.active-a.active),A=V[0]&&V[0].active&&V[0],ac=v=>v.active?' class="pl-cal-a"':'',
      row=f=>V.map(f).join('');
    let h=`<tr><td></td>${row(v=>`<th scope="col"${ac(v)}>${esc(nm(v))}${v.active?`<small>${t('act')}</small>`:''}</th>`)}</tr><tr class="pl-cal-tot"><th scope="row">${t('tot')}</th>${row(v=>`<td${ac(v)}>${t('dr')} ${dur(v.totals.driveMin)} · ${warn(v.totals.warn)} · ${t('mu')} ${v.totals.must.join('/')}</td>`)}</tr></thead><tbody>`;
    m.days.forEach((d,r)=>{ const w=wd(d.date);
      h+=`<tr><th scope="row" style="--c:var(${d.colorVar});--ci:var(${d.inkVar})"><b class="pl-cal-n">${dn(d.date)}</b><span${we(w)}>${wn(w)}</span></th>${row((v,c)=>{
        const x=v.days[d.date]||{stops:[]};
        return A&&v!=A&&key(x)==key(A.days[d.date])?`<td class="pl-cal-same">${t('same')}</td>`:
          `<td${ac(v)}><button type="button" class="pl-cal-c" data-act="${v.active?'day':'take'}" data-v="${esc(v.id)}" data-date="${d.date}" data-r="${r}" data-c="${c}">${sp(' pl-cal-t',esc(L(x.label)))+sp('',x.stops.length+t('st')+' ~'+tm(x.endTime)+' '+warn(x.warn))+(v.active?'':sp(' pl-cal-hint',t('take')))}</button></td>`;
      })}</tr>`; });
    el.innerHTML=`<div class="pl-cal-vs" style="--n:${V.length}"><table class="pl-cal-vt" data-g><caption class="sr">${t('cmp')}</caption><thead>${h}</tbody><tfoot><tr><td></td>${row((v,c)=>`<td>${v.active?'':`<button type="button" class="pl-cal-use" data-act="use" data-v="${esc(v.id)}" data-r="${m.days.length}" data-c="${c}">${t('use')}</button>`}</td>`)}</tr></tfoot></table></div>`;
  },
  /* Arrows move focus within one [data-g]: left/right in reading order, up/down to the nearest
     button that way. Alt+arrows stay the planner's (move a stop between days). */
  nav=e=>{
    const k=e.key,x=k=='ArrowRight'?1:k=='ArrowLeft'?-1:0,y=k=='ArrowDown'?1:k=='ArrowUp'?-1:0,b=e.target.closest('[data-r]');
    let best,bs=1e9;
    if(!(x||y)||!b||e.altKey) return;
    b.closest('[data-g]').querySelectorAll('[data-r]').forEach(o=>{
      const R=o.dataset.r-b.dataset.r,C=o.dataset.c-b.dataset.c,s=y?R*y>0?R*R*99+C*C:1e9:(R*8+C)*x>0?(R*8+C)*x:1e9;
      if(s<bs){ bs=s; best=o; }
    });
    if(best){ e.preventDefault(); best.focus(); }
  },
  draw=el=>{ const s=el._plc; E=(D.documentElement.lang||s[1].trip.lang)=='en'?1:0; (s[0]?versions:month)(el,s[1]); },
  mount=k=>(el,model,opts)=>{
    if(!el._plc){
      el.classList.add('pl-cal');
      el.addEventListener('click',e=>{
        const b=e.target.closest('[data-act]'),a=b&&b.dataset,o=el._plc[2],f=a&&o[{day:'onDay',take:'onTakeDay',use:'onUseVersion'}[a.act]];
        if(f) a.act=='day'?f(a.date):a.act=='take'?f(a.v,a.date):f(a.v);
      });
      el.addEventListener('pl-drop',e=>{ const b=e.target.closest('[data-drop]'),f=el._plc[2].onDropStop; if(b&&f) f(b.dataset.date,e.detail); });
      el.addEventListener('keydown',nav);
      live.add(el);
    }
    el._plc=[k,model,opts||{}];
    draw(el);
  };
D.addEventListener('langchange',()=>live.forEach(el=>el.isConnected?draw(el):live.delete(el)));
P.cal={render:mount(0),renderVersions:mount(1),weeks};
})(planner);
