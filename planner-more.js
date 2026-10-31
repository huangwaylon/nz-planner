/* PLANNER MORE — the planner's less-used sheets, loaded on first use so they stay off the critical
   path: reorder (順番を変える), quick swap (入れ替え), compare (くらべる) with 「この日を使う」, saving and
   renaming versions, and share links (create, open, paste). Attaches to the planner's own global
   as planner.more(ctx); ctx is the planner instance's state and helpers, so this file holds no
   state of its own and touches storage only through ctx. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.more) return;
const PTM={
  warnsN:{ja:'注意 {n}',en:'{n} alerts'}, tapAgain:{ja:'もう一度タップで追加',en:'tap again to add'}, pillKey:{ja:'運転の増減・帰着',en:'added driving · day ends'}, addDrive:{ja:'運転 {d}',en:'driving {d}'}, closureAsk:{ja:'一部閉鎖があります。それでも追加しますか？',en:'Part of it is closed. Add anyway?'}, dayEnd:{ja:'1日の終わりの目安',en:'End-of-day guide'}, pasteT:{ja:'リンクを貼り付け',en:'Paste a link'}, pasteS:{ja:'ホーム画面のアプリでは、共有されたリンクをここに貼ります',en:'In the Home Screen app, paste a shared link here'}, pasteGo:{ja:'読み込む',en:'Open'}, pasteClip:{ja:'クリップボードから',en:'From clipboard'}, whichDay:{ja:'どの日に入れる？',en:'Which day?'}, addNTo:{ja:'{name} を {d} に追加',en:'Add {name} to {d}'}, planT:{ja:'プランを選ぶ',en:'Choose a plan'}, planS:{ja:'編集すると「マイプラン」に保存されます',en:'Edits are saved to My plan'}, presets:{ja:'用意したプラン',en:'Presets'}, basedOn:{ja:'「{name}」をもとに編集',en:'Edited from “{name}”'}, shareLink:{ja:'リンクで共有',en:'Share as link'}, inDay:{ja:'{d} に予定',en:'Planned on {d}'}, moveHere:{ja:'{d} に移す',en:'Move to {d}'}, removeFrom:{ja:'{d} から外す',en:'Remove from {d}'}, hoursDay:{ja:'この日の営業',en:'Hours that day'}, cost:{ja:'料金',en:'Cost'}, dur:{ja:'滞在目安',en:'Typical stay'}, booking:{ja:'予約',en:'Booking'}, noBook:{ja:'不要',en:'Not needed'}, best:{ja:'時間帯',en:'Best time'}, aesthetic:{ja:'写真映え',en:'Photogenic'}, of5:{ja:'5段階中{n}',en:'{n} of 5'}, why:{ja:'なぜ話題？',en:'Why it’s talked about'}, whyJa:{ja:'{n}件の記事・投稿で紹介されています（出典は下）',en:'{n} mentions'}, tagSearch:{ja:'#{t}',en:'#{t}'}, coords:{ja:'座標',en:'Coordinates'}, copy:{ja:'コピー',en:'Copy'}, backList:{ja:'候補一覧へ',en:'All places'}, versions:{ja:'保存した案',en:'Saved versions'}, renameN:{ja:'名前を変える：{name}',en:'Rename {name}'}, verDel:{ja:'「{name}」を削除',en:'Delete “{name}”'}, fromGm:{ja:'Googleマップから取り込み',en:'Imported from Google Maps'}, fromIg:{ja:'Instagramから取り込み',en:'Imported from Instagram'}, impGroup:{ja:'取り込んだ場所',en:'Imported places'},
  browseT:{ja:'候補',en:'Places'}, browseS:{ja:'{d} を表示中',en:'Showing {d}'}, searchPh:{ja:'名前・キーワードでさがす',en:'Search names and keywords'}, sortTrend:{ja:'話題順',en:'Trending'}, sortAes:{ja:'写真映え順',en:'Most photogenic'}, sortNear:{ja:'近い順',en:'Nearest'}, sortBy:{ja:'並び順',en:'Sort'}, clearFilters:{ja:'絞り込みを解除',en:'Clear filters'}, others:{ja:'そのほか',en:'Other'}, addAll:{ja:'まとめて追加',en:'Add all'}, addAllN:{ja:'{name} をまとめて追加',en:'Add all of {name}'}, clusterSum:{ja:'合計 {d}・{km}',en:'{d} in all, {km}'}, startAt:{ja:'{t}ごろ出発が目安',en:'start around {t}'},
  orderT:{ja:'順番を変える',en:'Change the order'}, orderS:{ja:'{name} を何番目にしますか',en:'Where should {name} go?'},
  up:{ja:'ひとつ上へ',en:'Move up'}, down:{ja:'ひとつ下へ',en:'Move down'}, nth:{ja:'{n}番目',en:'Position {n}'},
  swapT:{ja:'入れ替える候補',en:'Swap for'}, swapS:{ja:'{name} の代わりに。この時間に開いていて、近くて移動が30分以内の順',en:'Instead of {name}: open at that time, nearby, at most 30 min more travel'},
  sameCat:{ja:'同じ種類',en:'Same kind'}, otherCat:{ja:'ほかの種類',en:'Other kinds'}, more:{ja:'もっと見る（{n}件）',en:'Show more ({n})'},
  dayDelta:{ja:'1日が',en:'Day length'}, travelDelta:{ja:'移動の増減',en:'Travel change'}, restart:{ja:'出発 {a} → {b}',en:'Leave {a} → {b}'},
  dropsToo:{ja:'{name}も外れます（歩く区間がなくなるため）',en:'{name} goes too (its walk is gone)'}, noSwap:{ja:'この時間と場所に合う候補はありません',en:'Nothing fits this time and place'}, driveDelta:{ja:'移動 {d}',en:'Travel {d}'}, dayLen:{ja:'1日 {a} → {b}',en:'Day {a} → {b}'}, swapped:{ja:'{name} に入れ替えました',en:'Swapped in {name}'},
  verAsk:{ja:'この案の名前',en:'Name this version'}, verN:{ja:'案 {n}',en:'Version {n}'}, verSaved:{ja:'「{name}」を保存しました',en:'Saved “{name}”'},
  rename:{ja:'名前を変える',en:'Rename'}, renamed:{ja:'名前を変えました',en:'Renamed'}, nameNeeded:{ja:'名前を入れてください',en:'Enter a name'},
  verSugg:{ja:'カフェ多め|ホビット村あり|ゆったり|西海岸多め|雨の日用',en:'More cafes|With Hobbiton|Slow pace|West coast|Rainy day'},
  saveBtn:{ja:'保存',en:'Save'},
  compareT:{ja:'案をくらべる',en:'Compare versions'}, onlyHere:{ja:'● がこの案だけにある場所',en:'● marks a place only in that version'},
  onlyThis:{ja:'この案だけ',en:'only in this version'}, cmpA:{ja:'左の案',en:'Left version'}, cmpB:{ja:'右の案',en:'Right version'},
  sameDay:{ja:'同じ内容（{n}か所）',en:'Identical ({n} stops)'}, useDay:{ja:'この日を使う',en:'Use this day'},
  useDayN:{ja:'「{name}」の {d} を使う',en:'Use {d} from “{name}”'}, usedDay:{ja:'「{name}」の {d} を使いました',en:'Used {d} from “{name}”'}, usedDayIn:{ja:'「{into}」の {d} を「{name}」と同じにしました',en:'“{into}” {d} now matches “{name}”'},
  isActive:{ja:'表示中の案',en:'Active version'},
  shareText:{ja:'NZ 2027・6日間・{n}か所（アプリで開くときは「リンクを貼り付け」）',en:'NZ 2027 · 6 days · {n} stops (in the installed app, use Paste link)'},
  copied:{ja:'リンクをコピーしました',en:'Link copied'}, copyFail:{ja:'リンクをコピーできませんでした',en:'Could not copy the link'},
  imported:{ja:'共有された案「{name}」を追加しました',en:'Added the shared plan “{name}”'},
  importedSkip:{ja:'（取り込みの場所 {n}件も追加）',en:' (and {n} imported places)'},
  dupLink:{ja:'同じ案がすでにあります。その案を表示しています',en:'You already have this plan; showing it'},
  badLink:{ja:'このリンクの案は読み込めませんでした',en:'Could not read the plan in that link'},
  noClip:{ja:'クリップボードを読めませんでした。欄に貼り付けてください',en:'Could not read the clipboard. Paste into the field'}
};
const esc0=s=>String(s==null?'':s);
/* a small stable hash, so opening the same link twice is a no-op */
function hash(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(36); }
const canon=o=>JSON.stringify(o,Object.keys(o).sort());
const b64u=u8=>{ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
const unb64u=s=>{ const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(b,c=>c.charCodeAt(0)); };
async function pack(o){
  const raw=new TextEncoder().encode(JSON.stringify(o));
  if(!window.CompressionStream) return 'j'+b64u(raw);
  const st=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'z'+b64u(new Uint8Array(await new Response(st).arrayBuffer()));
}
async function unpack(s){
  const bytes=unb64u(s.slice(1));
  if(s[0]==='j') return JSON.parse(new TextDecoder().decode(bytes));
  const st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(st).text());
}

/* ---------- quick swap ranking: pure, so tools/swap.test.js runs it in node ----------
   Cost = added travel minutes, plus any wait over an hour (a long wait is a cost, never a saving).
   The first section is the same area as the neighbouring stops and costs at most +30; within a
   section her saved places come first. A slot that set the day's start (a sunrise stop, or a first
   stop whose start was set for it) re-times the day from 08:00 (or a later anchor), and no candidate
   may make that day longer than now. A stop that was only there for a walk to the replaced place
   (a trailhead whose walk leg is gone) leaves with it. Outdoor places that would land before dawn or
   after dark, and cafes with unconfirmed hours outside 07:00-22:00, are not offered; what a swap
   breaks elsewhere in the day (tide, ferry, closing, the day's end) rides on the row. */
const MORNING=8*60;
planner.swapRank=function(sim,DB,P,day,id,opt){
  const date=day.date, list=sim.idsOf(date,P), i=list.indexOf(id); if(i<0) return null;
  const place=sim.place, cur=place(id), b0=sim.schedule(day,list,P,opt), rows=b0.rows, an=sim.anchorsOf(day,P);
  const travel=sc=>sc.rows.reduce((t,r)=>t+(r.leg?r.leg.min:0),0), t0=travel(b0), len0=b0.end-b0.start;
  const fam=c=>c==='cafe'||c==='food'?'eat':c, planned=new Set(DB.days.flatMap(d=>P.days[d.date]||[]));
  const prev=place(rows[i].id), next=place(rows[i+2].id), areas=new Set([prev&&prev.area,next&&next.area,cur.area].filter(Boolean));
  const startDriven=(String(cur.best).split(',').indexOf('sunrise')>=0&&rows[i+1].begin<720)||(i===0&&P.start&&!!P.start[date]);
  const st0=sim.startOf(day,P), base=an.start.time?toM(an.start.time):MORNING, st1=startDriven?Math.max(base,MORNING):st0;
  const newStart=st1!==st0?hhmm(st1):null, P2=newStart?Object.assign({},P,{start:Object.assign({},P.start,{[date]:newStart})}):P;
  const walk=(a,b)=>DB.walks.some(w=>(w.a===a&&w.b===b)||(w.a===b&&w.b===a));
  /* walks run from a road end (a trailhead: only ever a walk's `a`) to places reached on foot only */
  const roadEnd=new Set(DB.walks.map(w=>w.a).filter(a=>!DB.walks.some(w=>w.b===a)));
  const nr=DB.noRoad||{}, footOnly=new Set(DB.walks.flatMap(w=>[w.a,w.b]).filter(x=>!roadEnd.has(x)&&!nr[x]));   /* noRoad places are walked to via their road end */
  const seq=l=>[an.start.id].concat(l,[an.end.id]), touches=(s,j)=>walk(s[j],s[j+1])||walk(s[j+1],s[j+2]);
  const s0=seq(list), roadless=s=>s.map((x,j)=>j&&(footOnly.has(x)||footOnly.has(s[j-1]))&&!walk(s[j-1],x)?s[j-1]+'>'+x:null).filter(Boolean), bad0=roadless(s0);
  const hv=(a,b)=>{ const r=Math.PI/180, x=(b.lon-a.lon)*r*Math.cos((a.lat+b.lat)/2*r); return Math.hypot(x,(b.lat-a.lat)*r); };
  /* an island stop is swapped for the same island only: the day's sailings were planned around it */
  const isle=p=>DB.ferries.find(f=>(f.ids||[]).indexOf(p.id)>=0||(p.area&&(f.areas||[]).indexOf(p.area)>=0))||null, home=isle(cur);
  const pool=DB.list.filter(p=>!DB.bases.has(p.id)&&p.cat!=='ferry'&&!planned.has(p.id)&&isle(p)===home).map(p=>[p,Math.min(hv(prev,p),hv(next,p))]).sort((a,b)=>a[1]-b[1]).slice(0,70).map(x=>x[0]);
  const out=[];
  pool.forEach(p=>{ let l=list.slice(); l[i]=p.id; const s1=seq(l);
    const drop=l.filter((x,j)=>j!==i&&roadEnd.has(x)&&touches(s0,j)&&!touches(s1,j));
    if(drop.length) l=l.filter((x,j)=>j===i||drop.indexOf(x)<0);
    const s2=seq(l); if(roadless(s2).some(k=>bad0.indexOf(k)<0)) return;   /* no new road to a hut */
    const sc=sim.schedule(day,l,P2,opt), r=sc.rows[l.indexOf(p.id)+1];
    if(r.warns.some(w=>w.k==='closed'||w.k==='closedAt'||w.k==='dark')) return;
    if(sim.OUTDOOR.has(p.cat)&&String(p.best).indexOf('night')<0&&r.begin<sim.sunriseOf(p,date)-30) return;
    if((p.cat==='cafe'||p.cat==='food')&&(!p.hours||typeof p.hours!=='object')&&(r.begin<420||r.dep>1320)) return;
    const len=sc.end-sc.start, add=travel(sc)-t0, cost=add+(r.wait>60?r.wait:0);
    if(startDriven&&len>len0) return;
    const breaks=sim.breaksOf(b0,sc).filter(b=>b.id!==p.id);
    out.push({p,r,list:l,start:newStart,drop,breaks,len,len0,dLen:len-len0,add,cost,same:fam(p.cat)===fam(cur.cat),near:areas.has(p.area)}); });
  /* a swap that breaks another stop sinks; her saved places lead each section; then cost */
  const key=x=>x.cost+x.breaks.length*120;
  out.sort((a,b)=>key(a)-key(b)||(!!b.p.saved)-(!!a.p.saved)||Math.abs(a.dLen)-Math.abs(b.dLen));
  const lead=xs=>xs.filter(x=>x.p.saved).concat(xs.filter(x=>!x.p.saved));
  const first=out.filter(x=>x.near&&x.cost<=30);
  return {cur,i,len0,startDriven,start0:hhmm(st0),newStart,same:lead(first.filter(x=>x.same)),other:lead(first.filter(x=>!x.same)),
    rest:lead(out.filter(x=>!(x.near&&x.cost<=30)).slice(0,30))};
};
const toM=s=>{ const m=/^(\d{1,2}):(\d{2})/.exec(s||''); return m?+m[1]*60+ +m[2]:0; };
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

planner.more=function(c){
  const {S,DB,E,slug,pt,esc,ic,head,doneBar,openSheet,closeSheet,toast,undo,pushHist,save,render,edit,plan,findPlan,planName,presetName,
    idsOf,schedule,dayStyle,dlabel,dayTitle,dur,hm,nm,nmLang,wbr,place,bodyOf,snapshot,renderTop,fitDay,isCand,plannedMap,FAMILY,
    thumb,tr,CAT,AREA,unverifiedHours,reorder,focusStop,afterRender,okHM,clone,switchToMe,savedTag,sigLine}=c;
  c.addStrings(PTM);

  /* ---------- reorder ---------- */
  /* each position is simulated first: where the day would end, and ⚠ with the reason when it breaks something */
  function openOrder(id,focusD){
    const date=DB.days[S.day].date, ids=idsOf(date), i=ids.indexOf(id); if(i<0) return;
    const N=esc(nm(place(id))), day=DB.days[S.day], P=plan(), o={deadline:S.dayEnd}, sim=c.sim(), base=sim.schedule(day,ids,P,o);
    const at=k=>{ const l=ids.slice(); l.splice(i,1); l.splice(k,0,id); const sc=sim.schedule(day,l,P,o), br=sim.breaksOf(base,sc);
      return `<small class="${br.length?'pl-altbr':''}">${br.length?ic('alert','xs'):''}${esc(pt('endsAt',{t:hm(sc.end)})+(br.length?'・'+[...new Set(br.map(x=>c.breakText(x,day)))].join('・'):''))}</small>`; };
    openSheet(head(pt('orderT'),pt('orderS',{name:N}))+`<div class="pl-orderud">
        <button type="button" class="pl-btn pl-sec" data-act="ord" data-d="-1"${i===0?' disabled':''}>${ic('chevron-up','sm')}${pt('up')}</button>
        <button type="button" class="pl-btn pl-sec" data-act="ord" data-d="1"${i===ids.length-1?' disabled':''}>${ic('chevron-down','sm')}${pt('down')}</button></div>
      <ol class="pl-orderlist">${ids.map((x,k)=>`<li><button type="button" class="pl-alt" data-act="ordto" data-to="${k}" aria-current="${k===i}"${k===i?' disabled':''}>
        <span class="pl-ordn">${k+1}</span><span><b${nmLang(place(x))}>${wbr(nm(place(x)))}</b>${k===i?`<small>${pt('nth',{n:k+1})}</small>`:at(k)}</span></button></li>`).join('')}</ol>${doneBar()}`,'order',{id,date});
    if(focusD){ const b=E.sbody.querySelector(`[data-act="ord"][data-d="${focusD}"]:not([disabled])`)||E.sbody.querySelector('[data-act="ord"]:not([disabled])'); if(b) b.focus(); }
  }

  /* ---------- versions: an in-app name sheet, never prompt() ---------- */
  function openVerName(id){
    const v=id&&findPlan(id), def=v?planName(v):pt('verN',{n:S.versions.filter(x=>!x.kind).length+1});
    openSheet(head(v?pt('rename'):pt('saveVer'),'')+`<label class="pl-search pl-namef"><span class="sr">${pt('verAsk')}</span><input class="pl-vname" name="vname" type="text" maxlength="40" value="${esc(def)}" enterkeyhint="done" aria-describedby="pl-vh-${slug}"></label>
      <p class="pl-hint" id="pl-vh-${slug}" hidden>${pt('nameNeeded')}</p>
      <div class="pl-chips">${pt('verSugg').split('|').map(s=>`<button type="button" class="pl-chip" data-act="vsugg" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div class="pl-sheet-acts pl-one"><button type="button" class="pl-btn pl-pri" data-act="vsave" data-id="${v?v.id:''}">${pt('saveBtn')}</button></div>`,'vername',{id:v?v.id:null});
    const i=E.sbody.querySelector('.pl-vname'); if(i){ i.focus(); i.select(); }
  }
  function nameState(){ const i=E.sbody.querySelector('.pl-vname'), b=E.sbody.querySelector('[data-act="vsave"]'), h=E.sbody.querySelector('#pl-vh-'+slug);
    if(!i||!b) return; const empty=!i.value.trim(); b.disabled=empty; i.setAttribute('aria-invalid',empty); if(h) h.hidden=!empty; }
  function saveVersionNamed(id,name){
    name=(name||'').trim().slice(0,40); if(!name){ nameState(); return; }
    pushHist();
    if(id){ S.versions=S.versions.map(x=>x.id===id?Object.assign({},x,{name,kind:undefined}):x); save(); toast(pt('renamed'),undo); }
    else { const v=snapshot(plan(),name); save(); toast(pt('verSaved',{name:planName(v)}),undo); }
    renderTop(); openPlans();
  }

  /* ---------- compare, with 「この日を使う」 ---------- */
  const allPlans=()=>[S.my,...S.versions,...DB.presets].filter(Boolean);
  function openCompare(a,b){
    const ps=allPlans(); if(!findPlan(a)) a=plan().id;
    if(!findPlan(b)||b===a){ const A0=findPlan(a); b=(ps.find(p=>p.id!==a&&bodyOf(p)!==bodyOf(A0))||ps.find(p=>p.id!==a)||ps[0]).id; }
    const A=findPlan(a), B=findPlan(b), active=plan().id;
    const sel=(k,v)=>`<select class="pl-cmpsel" name="cmp-${k}" data-k="${k}" aria-label="${esc(pt(k==='a'?'cmpA':'cmpB'))}">${ps.map(p=>`<option value="${p.id}"${p.id===v?' selected':''}>${esc(planName(p))}</option>`).join('')}</select>`;
    const tot=P=>DB.days.reduce((t,d)=>{ const sc=schedule(d,null,P); t.drive+=sc.drive; t.n+=sc.rows.length-2; t.w+=sc.warns; return t; },{drive:0,n:0,w:0});
    const sum=t=>`<span>${pt('drive',{d:dur(t.drive)})}<br>${pt('stops',{n:t.n})}${t.w?`<br><b>${pt('warnsN',{n:t.w})}</b>`:''}</span>`;
    const col=(P,Q,d)=>{ const other=new Set(idsOf(d.date,Q));
      return `<ol class="pl-cmpl">${idsOf(d.date,P).map(id=>other.has(id)?`<li class="pl-shared"${nmLang(place(id))}>${wbr(nm(place(id)))}</li>`:`<li class="pl-diff"${nmLang(place(id))}>${wbr(nm(place(id)))}<span class="sr">（${pt('onlyThis')}）</span></li>`).join('')||'<li class="pl-nil">—</li>'}</ol>`; };
    const use=(P,d)=>P.id===active?`<span class="pl-cmpact">${pt('isActive')}</span>`
      :`<button type="button" class="pl-btn pl-sec pl-useday" data-act="useday" data-p="${P.id}" data-date="${d.date}">${pt('useDay')}<span class="sr">${esc(pt('useDayN',{name:planName(P),d:dlabel(d)}))}</span></button>`;
    const days=DB.days.map((d,i)=>{ const sa=schedule(d,null,A), sb=schedule(d,null,B), same=idsOf(d.date,A).join()===idsOf(d.date,B).join()&&Math.round(sa.end)===Math.round(sb.end);
      if(same) return `<section class="pl-cmpday pl-same" style="${dayStyle(i)}"><h3>${dlabel(d)}<small>${pt('sameDay',{n:idsOf(d.date,A).length})}</small></h3></section>`;
      return `<section class="pl-cmpday" style="${dayStyle(i)}"><h3>${dlabel(d)}<small>${esc(dayTitle(d,A))}</small></h3>
        <div class="pl-cmpcols">${col(A,B,d)}${col(B,A,d)}</div>
        <div class="pl-cmpcols pl-cmpend"><span>${pt('ends',{t:hm(sa.end)})}<br>${pt('drive',{d:dur(sa.drive)})}</span><span>${pt('ends',{t:hm(sb.end)})}<br>${pt('drive',{d:dur(sb.drive)})}</span></div>
        <div class="pl-cmpcols pl-cmpuse">${use(A,d)}${use(B,d)}</div></section>`; }).join('');
    openSheet(head(pt('compareT'),pt('onlyHere'))+`<div class="pl-cmpcols">${sel('a',a)}${sel('b',b)}</div><div class="pl-cmpcols pl-cmpsum">${sum(tot(A))}${sum(tot(B))}</div>${days}${doneBar()}`,'compare',{a,b},true);
  }
  /* Copy one day of another version into the active plan: its stops leave any other day, and
     their stays, the day's start and their notes come along. */
  /* checked like any change: what it breaks asks for a second tap */
  function useDay(pid,date,arg,btn){
    const P=findPlan(pid), d=DB.days.find(x=>x.date===date); if(!P||!d) return;
    const ids=idsOf(date,P);
    if(c.guard(btn,'use'+pid+date,m=>{
      DB.days.forEach(x=>{ if(x.date!==date&&m.days[x.date]) m.days[x.date]=m.days[x.date].filter(id=>ids.indexOf(id)<0); });
      m.days[date]=ids.slice();
      ids.forEach(id=>{ if(P.stay&&P.stay[id]!=null) m.stay[id]=P.stay[id]; if(P.notes&&P.notes[id]) m.notes[id]=P.notes[id]; });
      if(P.start&&P.start[date]) m.start[date]=P.start[date]; else delete m.start[date];
    },pt('usedDayIn',{name:planName(P),d:dlabel(d),into:planName(S.my||{id:'my'})}))){
      /* the day went into the active plan (forked into My plan when that was a preset or a
         version), so the side that was not the source becomes My plan; then on to the next difference */
      const a=arg.a===pid?pid:'my', b=arg.a===pid?'my':pid;
      openCompare(a,b);
      const next=[...E.sbody.querySelectorAll('[data-act=useday]')], f=next.find(x=>x.dataset.date>date)||next[0];
      (f||E.sbody.querySelector('h2')||E.sbody).focus({preventScroll:false});
    }
  }

  /* ---------- quick swap ---------- */
  const swapCands=id=>planner.swapRank(c.sim(),DB,plan(),DB.days[S.day],id,{deadline:S.dayEnd});
  const signed=d=>(d>0.5?'+':d<-0.5?'−':'±')+dur(d);
  /* the right-hand number is the travel change; the day's length shows only when it moves; what the
     swap breaks elsewhere, and a trailhead that leaves with the walk, are said on the row */
  let LASTSWAP=null;
  function altRow(x){
    const why=x.r.wait>0?pt('wait',{t:hm(x.r.begin),d:dur(x.r.wait)}):unverifiedHours(x.p)?pt('hoursUnknown'):'', day=DB.days[S.day];
    const br=x.breaks.map(b=>(b.kind==='stop'?nm(place(b.id))+'：':'')+c.warnText(b.w,day));
    return `<li><button type="button" class="pl-alt${br.length?' pl-altw':''}" data-act="doswap" data-id="${x.p.id}">${thumb(x.p)}
      <span><b${nmLang(x.p)}>${wbr(nm(x.p))}</b>${sigLine(x.p)}<small>${savedTag(x.p)}${hm(x.r.begin)}–${hm(x.r.dep)}　${tr(CAT,x.p.cat)}　${tr(AREA,x.p.area)}${why?`　<em>${esc(why)}</em>`:''}</small>
        ${Math.abs(x.dLen)>=1?`<small class="pl-dlen">${pt('dayLen',{a:dur(x.len0),b:dur(x.len)})}</small>`:''}
        ${x.drop.length?`<small class="pl-dlen">${pt('dropsToo',{name:esc(nm(place(x.drop[0])))})}</small>`:''}
        ${br.length?`<small class="pl-altbr">${ic('alert','xs')}${esc(br.join('・'))}</small>`:''}</span>
      <span class="pl-delta${x.add>60?' pl-big':''}"><span class="sr">${pt('travelDelta')}</span>${signed(x.add)}</span></button></li>`;
  }
  function openSwap(id){
    const r=swapCands(id); if(!r) return; LASTSWAP=r;
    openSheet(head(pt('swapT'),pt('swapS',{name:esc(nm(r.cur))}))+
      (r.newStart?`<p class="pl-hint">${pt('restart',{a:r.start0,b:r.newStart})}</p>`:'')+
      (r.same.length?`<div class="pl-altsep">${pt('sameCat')}</div><ul class="pl-alts">${r.same.map(altRow).join('')}</ul>`:'')+
      (r.other.length?`<div class="pl-altsep">${pt('otherCat')}</div><ul class="pl-alts">${r.other.map(altRow).join('')}</ul>`:'')+
      (r.rest.length?`<details class="pl-more"><summary>${pt('more',{n:r.rest.length})}</summary><ul class="pl-alts">${r.rest.map(altRow).join('')}</ul></details>`:'')+
      (!r.same.length&&!r.other.length&&!r.rest.length?`<p class="pl-none">${pt('noSwap')}</p>`:'')+doneBar(),'swap',{id,date:DB.days[S.day].date});
  }

  /* ---------- share links: the version's name, notes, booked state and imported places travel
     with it; opening the same link twice is a no-op ---------- */
  function payload(){
    const p=plan(), ids=new Set(DB.days.flatMap(d=>idsOf(d.date,p))), booked={}, notes={};
    Object.keys(S.booked).forEach(k=>{ if(ids.has(k)) booked[k]=true; });
    Object.keys(p.notes||{}).forEach(k=>{ if(ids.has(k)) notes[k]=p.notes[k]; });
    const imp=S.imports.filter(m=>ids.has(m.id)&&m.lat!=null).map(m=>({id:m.id,src:m.src,name:m.name,lat:m.lat,lon:m.lon,url:m.url||''}));
    const o={v:2,from:p.from||p.id,name:planName(p),days:p.days,stay:p.stay||{},start:p.start||{},notes,booked};
    if(p.anchors) o.anchors=p.anchors;
    if(p.stayDay) o.stayDay=p.stayDay;
    if(p.titles) o.titles=p.titles;
    if(imp.length) o.imp=imp;
    return o;
  }
  async function shareLink(){
    const p=plan(), n=DB.days.reduce((t,d)=>t+idsOf(d.date,p).length,0);
    const url=location.origin+location.pathname+'#plan-'+slug+'='+await pack(payload());
    const text=pt('shareText',{n});
    if(navigator.share){ try{ await navigator.share({title:planName(p),text,url}); return; }catch(e){ if(e.name==='AbortError') return; } }
    try{ await navigator.clipboard.writeText(text+' '+url); toast(pt('copied')); }catch(e){ toast(pt('copyFail')); }
  }
  /* A full URL, the #plan-… fragment, or just the code. */
  const codeOf=s=>{ s=String(s||'').trim(); const m=new RegExp('#plan-'+slug+'=([\\w-]+)').exec(s)||/^([zj][\w-]{8,})$/.exec(s); return m?m[1]:null; };
  async function importCode(code){
    try{
      if(!code) throw new Error('none');
      const o=await unpack(code); if(!o||typeof o.days!=='object'||Array.isArray(o.days)) throw new Error('shape');
      /* imported places first, so their ids resolve */
      let nimp=0;
      if(Array.isArray(o.imp)){ const have=new Set(S.imports.map(m=>m.id)); const add=o.imp.filter(m=>m&&typeof m.id==='string'&&/^(gm|ig)-/.test(m.id)&&!have.has(m.id)&&typeof m.name==='string'&&isFinite(m.lat)&&isFinite(m.lon))
        .map(m=>({id:m.id,src:m.src==='ig'?'ig':'gmaps',name:m.name.slice(0,80),lat:+m.lat,lon:+m.lon,url:typeof m.url==='string'?m.url:'',ig:'',note:'',placeId:null,region:null,cc:null}));
        if(add.length){ pushHist(); S.imports=S.imports.concat(add); S.impVer++; c.rebuild(); nimp=add.length; } }
      const seen=new Set(), days={}, stay={}, start={}, notes={};
      DB.days.forEach(d=>{ const day1=new Set(); days[d.date]=(Array.isArray(o.days[d.date])?o.days[d.date]:[]).filter(id=>typeof id==='string'&&DB.places.has(id)&&!day1.has(id)&&day1.add(id)&&seen.add(id));
        if(okHM(o.start&&o.start[d.date])) start[d.date]=o.start[d.date]; });
      Object.keys(o.stay&&typeof o.stay==='object'?o.stay:{}).forEach(id=>{ const v=o.stay[id]; if(seen.has(id)&&typeof v==='number'&&v>0&&v<1440) stay[id]=Math.round(v); });
      Object.keys(o.notes&&typeof o.notes==='object'?o.notes:{}).forEach(id=>{ const v=o.notes[id]; if(seen.has(id)&&typeof v==='string') notes[id]=v.slice(0,300); });
      const sh=hash(canon({days,stay,start,notes}));
      const dup=S.versions.find(v=>v.sh===sh);
      if(dup){ S.planId=dup.id; save(); render(true); fitDay(); switchToMe(); toast(pt('dupLink')); return true; }
      if(!nimp) pushHist();
      const name=typeof o.name==='string'&&o.name.trim()?o.name.trim().slice(0,40):'';
      const extra={}; if(o.stayDay&&typeof o.stayDay==='object') extra.stayDay=o.stayDay; if(o.titles&&typeof o.titles==='object') extra.titles=o.titles; if(o.anchors&&typeof o.anchors==='object') extra.anchors=o.anchors;
      const v=snapshot(Object.assign({from:findPlan(o.from)&&!String(o.from).startsWith('v-')?o.from:DB.presets[0].id,days,stay,start,notes},extra),name,'shared');
      v.sh=sh; S.versions=S.versions.slice();
      if(o.booked&&typeof o.booked==='object'){ const nb=Object.assign({},S.booked); Object.keys(o.booked).forEach(k=>{ if(o.booked[k]===true&&seen.has(k)) nb[k]=true; }); S.booked=nb; }
      S.planId=v.id; save(); render(true); fitDay(); switchToMe();
      toast(pt('imported',{name:planName(v)})+(nimp?pt('importedSkip',{n:nimp}):''),undo);
      return true;
    }catch(e){ toast(pt('badLink')); return false; }
  }
  async function pasteFromClipboard(){
    let t=''; try{ t=await navigator.clipboard.readText(); }catch(e){ toast(pt('noClip')); return; }
    const i=E.sbody.querySelector('.pl-paste'); if(i) i.value=t;
    if(await importCode(codeOf(t))) closeSheet();
  }

  /* ---------- the candidate drawer (候補をさがす) ---------- */
  const {GLYPH,fold,flagsOf,FLAG,eqKm,uKm,trayN,lang,ja,loadMore,hav}=c;
  function openBrowse(keep){
    const day=DB.days[S.day], all=DB.list.filter(isCand);
    const cats=Object.keys(CAT).filter(k=>all.some(p=>p.cat===k)), areas=Object.keys(AREA).filter(k=>all.some(p=>p.area===k));
    const chip=(k,v,label,gl)=>`<button type="button" class="pl-chip" data-act="f" data-k="${k}" data-v="${v}" aria-pressed="${(S.f[k]||'')===v}">${gl?ic(gl):''}${label}</button>`;
    const y=keep?E.sbody.scrollTop:0;
    openSheet(`<div class="pl-ctop">${head(pt('browseT'),pt('browseS',{d:dlabel(day)}))}
        <label class="pl-search">${ic('search','sm')}<span class="sr">${pt('searchPh')}</span><input class="pl-q" name="q" type="search" placeholder="${esc(pt('searchPh'))}" value="${esc(S.f.q)}" autocomplete="off" enterkeyhint="search"></label>
        <div class="pl-chips">${chip('cat','',pt('all'))}${all.some(p=>p.saved)?chip('saved','1',pt('saved'),'bookmark').replace('pl-chip"','pl-chip pl-savedchip"'):''}${cats.map(c=>chip('cat',c,tr(CAT,c),GLYPH[c])).join('')}</div>
        <div class="pl-chips">${chip('area','',pt('all'))}${areas.map(a=>chip('area',a,tr(AREA,a))).join('')}</div>
        <div class="pl-sortrow"><span class="pl-sortl"><button type="button" class="pl-impbtn" data-act="import">${ic('download','sm')}${pt('impT')}${trayN()?`<i class="pl-trayn">${trayN()}</i>`:''}</button><span class="pl-ccount"></span></span>
          <div class="pl-seg" role="group" aria-label="${esc(pt('sortBy'))}">
          <button type="button" data-act="sort" data-v="trend" aria-pressed="${S.f.sort==='trend'}">${pt('sortTrend')}</button>
          <button type="button" data-act="sort" data-v="aes" aria-pressed="${S.f.sort==='aes'}">${pt('sortAes')}</button>
          <button type="button" data-act="sort" data-v="near" aria-pressed="${S.f.sort==='near'}">${pt('sortNear')}</button></div></div>
      </div><div class="pl-clist"></div>${doneBar()}`,'browse',null,true);
    renderList(); if(keep) E.sbody.scrollTop=y;
    /* search keywords ship in places-more: re-filter once they land */
    if(!DB.more) loadMore().then(()=>{ if(c.kind()==='browse'&&S.f.q) renderList(); });
  }
  const searchText=p=>p._s||(p._s=fold([p.name,p.nameJa,p.igTag,tr(AREA,p.area),AREA[p.area]?AREA[p.area].en:'',(Array.isArray(p.kw)?p.kw:[p.kw||'']).join(' '),
    p.vibe,p.vibeJa,flagsOf(p).map(f=>FLAG[f].ja+' '+FLAG[f].en).join(' '),CAT[p.cat]?CAT[p.cat].ja+' '+CAT[p.cat].en:''].join(' ')));
  const bySaved=(a,b)=>(!!place(b).saved)-(!!place(a).saved);
  function candRow(id,planned,day,dist){
    const p=place(id), on=planned.get(id);
    const sig=S.f.sort==='aes'&&p.aesthetic?`<span class="pl-sig">${pt('aesthetic')} ${p.aesthetic}/5</span>`:p.badge?`<span class="pl-sig">${esc(p.badge[lang()]||p.badge.ja)}</span>`:'';
    return `<div class="pl-cand" data-id="${id}">${thumb(p)}
      <button type="button" class="pl-open" data-act="open" data-id="${id}"><b${nmLang(p)}>${wbr(nm(p))}</b>${sigLine(p)}
        <small>${savedTag(p)}${p.imp||p.reels?`<span class="pl-impbadge">${pt('imp')}</span>`:''}${p.imp?(p.imp.regionJa||p.imp.region?`<span>${esc(ja()?p.imp.regionJa||p.imp.region:p.imp.region)}</span>`:''):`<span>${tr(CAT,p.cat)}</span><span>${tr(AREA,p.area)}</span>`}${dist!=null?`<span>${uKm(Math.round(dist))}</span>`:''}${p.book?`<span>${pt('book')}</span>`:''}${sig}</small></button>
      ${on!=null?`<span class="pl-inplan" style="${dayStyle(on)}"><span class="sr">${esc(pt('inDay',{d:dlabel(DB.days[on])}))}</span><i aria-hidden="true">${+DB.days[on].date.slice(8)}</i></span>`
        :`<button type="button" class="pl-addbtn" data-act="pick" data-id="${id}" aria-expanded="false">${ic('plus')}<span class="sr">${esc(pt('addNTo',{name:nm(p),d:'…'}))}</span></button>`}</div>`;
  }
  function renderList(){
    const box=E.sbody.querySelector('.pl-clist'); if(!box) return;
    const day=DB.days[S.day], planned=plannedMap(), qy=fold(S.f.q.trim()), pts=S.sc.rows.map(r=>place(r.id));
    const near=p=>Math.min(...pts.map(x=>hav(x,p)));
    const raw=S.f.q.trim().normalize('NFKC'), terms=raw?raw.split(/[\s　、,・]+|(?<=[^\sの])[のとでを](?=[^\s])/).map(w=>fold(w.replace(/^[のとでを]+|[のとでを]+$/g,''))).filter(Boolean):[];
    const ok=DB.list.filter(p=>isCand(p)&&(!S.f.cat||p.cat===S.f.cat)&&(!S.f.area||p.area===S.f.area)&&(!S.f.saved||p.saved)&&terms.every(w=>searchText(p).indexOf(w)>=0));
    E.sbody.querySelector('.pl-ccount').textContent=pt('count',{n:ok.length});
    if(!ok.length){ box.innerHTML=`<div class="pl-none"><p>${pt('noMatch')}</p><button type="button" class="pl-btn pl-sec" data-act="clearf">${pt('clearFilters')}</button></div>`; return; }
    if(S.f.sort!=='trend'){       /* flat: nearest really is nearest */
      const sc=new Map(ok.map(p=>[p.id,S.f.sort==='near'?near(p):-((p.aesthetic||0)*10+(p.trend||0))]));
      const ids=ok.map(p=>p.id).sort((a,b)=>bySaved(a,b)||sc.get(a)-sc.get(b));
      fill(box,[`<section class="pl-clus">${ids.map(id=>candRow(id,planned,day,S.f.sort==='near'?sc.get(id):null)).join('')}</section>`]); return;
    }
    const score=new Map(ok.map(p=>[p.id,-((p.trend||0)*10+(p.aesthetic||0))]));
    const groups=[], used=new Set();
    const imps=ok.filter(p=>p.imp).map(p=>p.id); imps.forEach(id=>used.add(id));
    if(imps.length) groups.push({c:{id:'_imp',name:pt('impGroup'),nameJa:pt('impGroup'),first:true},m:imps});
    DB.clusters.forEach(c=>{ const m=c.ids.filter(id=>score.has(id)&&!used.has(id)); m.forEach(id=>used.add(id)); if(m.length) groups.push({c,m}); });
    const rest=ok.filter(p=>!used.has(p.id)).map(p=>p.id);
    if(rest.length) groups.push({c:{id:'',name:pt('others'),nameJa:pt('others')},m:rest});
    groups.forEach(x=>{ x.m.sort((a,b)=>bySaved(a,b)||score.get(a)-score.get(b)); x.s=score.get(x.m[0]); x.sv=!!place(x.m[0]).saved; });
    groups.sort((a,b)=>(!!b.c.first)-(!!a.c.first)||(!a.c.id)-(!b.c.id)||b.sv-a.sv||a.s-b.s);
    fill(box,groups.map(x=>{ const free=x.m.filter(id=>!planned.has(id)).length, cn=ja()?x.c.nameJa:x.c.name;
      return `<section class="pl-clus"><div class="pl-clus-h"><h3>${esc(cn)}<small>${pt('count',{n:x.m.length})}</small></h3>
        ${x.c.id&&free>1?`<button type="button" class="pl-addall" data-act="addall" data-id="${x.c.id}" aria-expanded="false">${ic('plus','xs')}<span aria-hidden="true">${pt('addAll')}</span><span class="sr">${esc(pt('addAllN',{name:cn}))}</span></button>`:''}</div>
        ${x.c.id&&x.c.id!=='_imp'?`<p class="pl-clsum">${clusterSum(x.m)}${x.c.startAt?`　${pt('startAt',{t:x.c.startAt})}`:''}</p>`:''}
        ${x.m.map(id=>candRow(id,planned,day,null)).join('')}</section>`; }));
  }
  /* The first screenful goes in now, the rest after the frame: the sheet opens without parsing
     ~170 rows in the tap. A newer list call cancels a pending tail. */
  let fillT=0;
  function fill(box,parts){
    clearTimeout(fillT);
    const html=parts.join(''), cut=html.indexOf('<div class="pl-cand"',(()=>{ let i=0, n=0; while(n<14&&(i=html.indexOf('<div class="pl-cand"',i+1))>0) n++; return i>0?i:html.length; })());
    if(cut<0||cut>=html.length-1){ box.innerHTML=html; return; }
    /* split at a row boundary inside a section: close it and reopen the rest in a continuation */
    const head=html.slice(0,cut), tail=html.slice(cut);
    box.innerHTML=head+'</section>';
    fillT=setTimeout(()=>{ if(!box.isConnected) return; box.insertAdjacentHTML('beforeend','<section class="pl-clus pl-cont">'+tail); },60);
  }
  /* a cluster's total: stays plus the drive between its members in list order */
  function clusterSum(ids){ let m=0, km=0; ids.forEach((id,k)=>{ const p=place(id); m+=p.dur||60; if(k){ const a=place(ids[k-1]), w=DB.walks.find(x=>(x.a===a.id&&x.b===id)||(x.b===a.id&&x.a===id)); if(w){ m+=w.a===a.id?w.min:w.down!=null?w.down:w.min; return; } const d=eqKm(a,p)*1.35; km+=d; m+=d/50*60; } });
    return pt('clusterSum',{d:dur(m),km:Math.round(km)+' km'}); }
  function patchCand(id){
    const row=E.sbody.querySelector(`.pl-cand[data-id="${id}"]`); if(!row) return;
    const on=plannedMap().get(id), q=row.querySelector('.pl-dayq'); if(q) q.remove();
    const btn=row.querySelector('.pl-addbtn'); if(on==null||!btn) return;
    const s=document.createElement('span'); s.className='pl-inplan'; s.setAttribute('style',dayStyle(on));
    s.innerHTML=`<span class="sr">${esc(pt('inDay',{d:dlabel(DB.days[on])}))}</span><i aria-hidden="true">${+DB.days[on].date.slice(8)}</i>`;
    btn.replaceWith(s);
  }


  /* ---------- the place sheet and the plans sheet ---------- */
  const {hoursText,photoHTML,colorCard,closeBtn,alt,altLang,latin,bestText,domain,addIds,clusterOf,closure,wdName,breakText}=c, SIMc=()=>c.sim();
  const preview=(k,ids,c)=>SIMc().insertPlan(DB.days[k],idsOf(DB.days[k].date),ids,plan(),{deadline:S.dayEnd},c);
  const cmin=m=>{ m=Math.round(m); return (m<0?'−':'+')+(Math.abs(m)<60?Math.abs(m)+(ja()?'分':'m'):Math.floor(Math.abs(m)/60)+':'+pad(Math.abs(m)%60)); };
  /* 「どの日に入れる？」: six day buttons, each simulated before it is shown: the added driving and
     the day's end, ⚠ when the add breaks something (closes, past the day's end or the flight, after
     dark, ferry, tide). A ⚠ day, or a partly closed place, takes a second tap; the first says why. */
  function dayPick(id,cls,c){
    const ids=addIds(c,id), many=!!c, shut=ids.filter(x=>closure(place(x)));
    const pills=DB.days.map((d,k)=>{ const pv=ids.length?preview(k,ids,c):null, br=pv?pv.breaks:[], warn=br.length>0||shut.length>0;
      const why=[...new Set(br.map(b=>breakText(b,d)).concat(shut.map(x=>nm(place(x))+'：'+pt('closureAsk'))))].join('・');
      return `<button type="button" class="pl-dq${k===S.day?' pl-cur':''}${br.length?' pl-nofit':''}" style="${dayStyle(k)}" data-act="${many?'addallday':'addday'}" data-id="${esc(id)}" data-day="${k}"${warn?` data-why="${esc(dlabel(d)+'：'+why)}"`:''}${pv?'':' disabled'}><b>${+d.date.slice(8)}</b>`+
        (pv?`<small>${br.length?'⚠':''}${cmin(pv.dDrive)}</small><small>${hm(pv.sc.end)}</small>`:'<small>—</small>')+
        `<span class="sr">${esc(pt('addNTo',{name:many?(ja()?c.nameJa||c.name:c.name)||pt('impGroup'):nm(place(id)),d:dlabel(d)}))}${pv?esc('（'+pt('addDrive',{d:cmin(pv.dDrive)})+'、'+pt('endsAt',{t:hm(pv.sc.end)})+'）'):''}${warn?esc('：'+why):''}</span></button>`; }).join('');
    return `<div class="pl-dayq ${cls||''}" role="group" aria-label="${esc(pt('whichDay'))}"><span class="pl-dayqk">${pt('whichDay')}<small>${pt('pillKey')}</small></span>
      ${shut.length?`<span class="pl-dayqw">${ic('alert','xs')}${pt('closureAsk')}</span>`:''}
      <span class="pl-dayqb">${pills}</span><span class="pl-dayqm" role="status" aria-live="polite"></span></div>`;
  }
  /* first tap on a ⚠ day says why; the second adds */
  function armPill(b){ const q=b.closest('.pl-dayq'); if(!b.dataset.why||b.classList.contains('pl-armed')) return false;
    q.querySelectorAll('.pl-armed').forEach(x=>x.classList.remove('pl-armed')); b.classList.add('pl-armed');
    q.querySelector('.pl-dayqm').textContent='⚠ '+b.dataset.why+' — '+pt('tapAgain'); return true; }

  const pad=n=>String(n).padStart(2,'0');
  function openPlace(id,back){
    const p=place(id); if(!p) return;
    const day=DB.days[S.day], on=plannedMap().get(id), isBase=!isCand(p), hrs=hoursText(p,day.date);
    const handle=p.ig?(/instagram\.com\/([^/?#]+)/.exec(p.ig)||[])[1]:'';
    const igBtn=p.imp&&p.imp.src==='ig'?`<a class="pl-igbtn" href="${esc(p.imp.url)}" target="_blank" rel="noopener">${ic('instagram','sm')}${pt('openReel')}</a>`
      :p.ig?`<a class="pl-igbtn" href="${esc(p.ig)}" target="_blank" rel="noopener">${ic('instagram','sm')}<span lang="en">@${esc(handle)}${p.igN?`<span class="pl-ign"> · ${esc(p.igN)}</span>`:''}</span></a>`
      :p.igTag?`<a class="pl-igbtn" href="https://www.instagram.com/explore/tags/${encodeURIComponent(p.igTag)}/" target="_blank" rel="noopener">${ic('instagram','sm')}<span>${esc(pt('tagSearch',{t:p.igTag}))}</span></a>`:'';
    /* coordinates (or the place's own mapsAt, e.g. a car park), so the link works without a name search */
    const at=p.mapsAt&&isFinite(p.mapsAt.lat)?p.mapsAt:p, gmap=`https://www.google.com/maps/search/?api=1&query=${(+at.lat).toFixed(5)},${(+at.lon).toFixed(5)}`;
    const gmLabel=p.mapsAt&&p.mapsAt.label?(ja()?p.mapsAt.labelJa||p.mapsAt.label:p.mapsAt.label):nm(p);
    let action='';
    if(!isBase){
      if(on===S.day) action=`<button type="button" class="pl-btn pl-ghost" data-act="unplan" data-id="${id}">${ic('x','sm')}${pt('removeFrom',{d:dlabel(day)})}</button>`;
      else if(on!=null) action=`<button type="button" class="pl-btn pl-pri" data-act="movehere" data-id="${id}">${ic('calendar','sm')}${pt('moveHere',{d:dlabel(day)})}</button><div class="pl-sh-s pl-center">${pt('inDay',{d:dlabel(DB.days[on])})}</div>`;
      else action=dayPick(id,'pl-dayq-big');
    }
    const more=DB.more&&DB.more[id], evid=more&&(more.evidence||[]).filter(x=>!/^coords:/i.test(x)).slice(0,4);
    const ph=photoHTML(p,'pl-photo',true);
    openSheet(`${back?`<button type="button" class="pl-back" data-act="back"><span class="pl-chev" aria-hidden="true">‹</span>${pt('backList')}</button>`:''}
      ${ph||colorCard(p,'pl-colorcard')}
      <div class="pl-ph">
        <div><h2 class="pl-sh-t" id="pl-sht-${slug}"${nmLang(p)}>${wbr(nm(p))}</h2><div class="pl-sh-s">${p.imp?pt(p.imp.src==='ig'?'fromIg':'fromGm')+(p.imp.regionJa||p.imp.region?'　'+esc(ja()?p.imp.regionJa||p.imp.region:p.imp.region):''):`${alt(p)?`<span${altLang(p)}>${esc(alt(p))}</span>　`:''}${tr(CAT,p.cat)}　${tr(AREA,p.area)}`}</div></div>${closeBtn()}</div>
      ${p.badge||p.saved?`<p class="pl-sigline">${savedTag(p)}${p.badge?`<span class="pl-sig">${esc(p.badge[lang()]||p.badge.ja)}</span>`:''}</p>`:''}
      <div class="pl-links">${igBtn}<a class="pl-gmbtn" href="${esc(gmap)}" target="_blank" rel="noopener">${ic('map-pin','sm')}<span${latin(gmLabel)&&ja()?' lang="en"':''}>${esc(gmLabel)}</span><span class="sr">（${pt('gmaps')}）</span></a></div>
      ${p.vibe||p.vibeJa?`<p class="pl-vibe">${esc(ja()?(p.vibeJa||p.vibe):p.vibe)}</p>`:''}
      ${p.reels&&p.reels.length?`<div class="pl-reels"><div class="pl-plansep">${pt('imp')}</div>${p.reels.map(m=>`<a href="${esc(m.url)}" target="_blank" rel="noopener">${ic(m.src==='ig'?'instagram':'map-pin','sm')}<span>${esc(m.ig||m.name)}${m.note?` <small>${esc(m.note)}</small>`:''}</span></a>`).join('')}</div>`:''}
      ${action}
      ${isBase||p.imp?'':`<dl class="pl-facts">
        <div class="pl-fact"><dt>${pt('hoursDay')} ${dlabel(day,true)}</dt><dd class="${hrs===pt('closedToday')?'pl-bad':''}">${hrs}</dd></div>
        <div class="pl-fact"><dt>${pt('cost')}</dt><dd>${p.cost==='free'?pt('free'):esc(p.cost||'—')}</dd></div>
        <div class="pl-fact"><dt>${pt('dur')}</dt><dd>${dur(p.dur||60)}</dd></div>
        <div class="pl-fact"><dt>${pt('booking')}</dt><dd>${p.book?`<button type="button" class="pl-bookt" data-act="booked" data-id="${id}" aria-pressed="${!!S.booked[id]}">${ic(S.booked[id]?'check':'bookmark')}<span>${S.booked[id]?pt('booked'):pt('book')}</span></button>`:pt('noBook')}</dd></div>
        ${p.best&&p.best!=='any'?`<div class="pl-fact"><dt>${pt('best')}</dt><dd>${bestText(p,day.date)}</dd></div>`:''}
        ${p.aesthetic?`<div class="pl-fact"><dt>${pt('aesthetic')}</dt><dd><span class="pl-meter" style="--v:${p.aesthetic}" aria-hidden="true"></span> ${p.aesthetic}/5<span class="sr">${pt('of5',{n:p.aesthetic})}</span></dd></div>`:''}
      </dl>
      ${flagsOf(p).length?`<div class="pl-flags">${flagsOf(p).map(f=>`<span class="pl-flag">${tr(FLAG,f)}</span>`).join('')}</div>`:''}`}
      ${evid&&evid.length?`<section class="pl-why"><h3>${pt('why')}</h3>${ja()?`<p class="pl-whyja">${p.badge?esc(p.badge.ja):pt('whyJa',{n:evid.length})}</p>`:`<ul>${evid.map(x=>`<li lang="en">${esc(x.replace(/\s*—?\s*https?:\/\/\S+/g,''))}</li>`).join('')}</ul>`}
        ${(more.sources||[]).length?`<p class="pl-src">${[...new Set(more.sources.map(domain).filter(Boolean))].slice(0,5).map((dm,k)=>`<a href="${esc(more.sources.find(u=>domain(u)===dm))}" target="_blank" rel="noopener">${esc(dm)}</a>`).join('')}</p>`:''}</section>`:''}
      <p class="pl-coords"><span>${pt('coords')} <span lang="en">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span></span><button type="button" class="pl-ab pl-lbl" data-act="copyc" data-v="${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}">${pt('copy')}</button></p>
      ${p.imp?`<button type="button" class="pl-btn pl-ghost" data-act="impdel" data-id="${esc(p.imp.id)}">${ic('trash','sm')}${pt('impDel')}</button>`:''}
      ${doneBar()}`,'place',{id,back});
    if(!DB.more) loadMore().then(()=>{ const a=c.arg(); if(c.kind()==='place'&&a&&a.id===id) openPlace(id,back); });
  }

  function openPlans(){
    const cur=plan(), when=t=>{ const d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); };
    const opt=(id,name,sub)=>`<button type="button" class="pl-planopt" data-act="plan" data-id="${id}" aria-pressed="${cur.id===id}"><b>${esc(name)}</b><span>${esc(sub)}</span><i class="pl-chk"></i></button>`;
    openSheet(head(pt('planT'),pt('planS'))+`<div class="pl-plans">
        ${S.my?opt('my',planName(S.my),pt('basedOn',{name:presetName(S.my.from)})):''}
        ${S.versions.length?`<div class="pl-plansep">${pt('versions')}</div>`+S.versions.map(v=>`<div class="pl-verrow">${opt(v.id,planName(v),(v.at?when(v.at)+'　':'')+pt('basedOn',{name:presetName(v.from)}))}
          <button type="button" class="pl-ab" data-act="vername" data-id="${v.id}">${ic('pencil','sm')}<span class="sr">${esc(pt('renameN',{name:planName(v)}))}</span></button>
          <button type="button" class="pl-ab" data-act="verdel" data-id="${v.id}">${ic('trash','sm')}<span class="sr">${esc(pt('verDel',{name:planName(v)}))}</span></button></div>`).join(''):''}
        <div class="pl-plansep">${pt('presets')}</div>
        ${DB.presets.map(p=>opt(p.id,ja()?p.nameJa:p.name,ja()?p.blurbJa:p.blurb)).join('')}
      </div>
      <section class="pl-pastebox"><h3>${pt('pasteT')}</h3><p class="pl-hint">${pt('pasteS')}</p>
        <label class="pl-search"><span class="sr">${pt('pasteT')}</span><input class="pl-paste" name="paste" type="url" inputmode="url" autocomplete="off" placeholder="https://…#plan-${slug}=…" enterkeyhint="go"></label>
        <div class="pl-sheet-acts"><button type="button" class="pl-btn pl-sec" data-act="pasteclip">${pt('pasteClip')}</button><button type="button" class="pl-btn pl-pri" data-act="pastego">${pt('pasteGo')}</button></div></section>
      <label class="pl-dayend"><span>${pt('dayEnd')}</span><input class="pl-dayendin" name="dayend" type="time" step="900" value="${c.hhmm(S.dayEnd)}"></label>
      <div class="pl-sheet-acts">
        <button type="button" class="pl-btn pl-sec" data-act="savever">${ic('bookmark','sm')}${pt('saveVer')}</button>
        <button type="button" class="pl-btn pl-sec" data-act="compare">${ic('compare','sm')}${pt('compare')}</button>
        <button type="button" class="pl-btn pl-sec" data-act="share">${ic('share','sm')}${pt('shareLink')}</button>
      </div>
      ${S.my?`<button type="button" class="pl-btn pl-danger" data-act="reset">${ic('trash','sm')}${pt('reset')}</button>`:''}`,'plans');
  }
  return {
    openBrowse, renderList, patchCand, openPlace, openPlans, dayPick, armPill,
    openOrder, openVerName, saveVersionNamed, openCompare, openSwap, shareLink, importCode, codeOf,
    nameState,
    click(act,b,kind,arg){
      const date=DB.days[S.day].date;
      switch(act){
        case 'ord': if(kind==='order'&&reorder(arg.id,+b.dataset.d,false,null,b)!==false) afterRender(()=>openOrder(arg.id,b.dataset.d)); break;
        case 'ordto': if(kind==='order'){ const to=+b.dataset.to; if(reorder(arg.id,0,false,to,b)===false) break; closeSheet(); afterRender(()=>focusStop(to)); } break;
        case 'doswap': { if(kind!=='swap'||arg.date!==date||!LASTSWAP) break; const old=arg.id, p=place(b.dataset.id), i=idsOf(date).indexOf(old); if(i<0) break;
          const r=LASTSWAP, x=r.same.concat(r.other,r.rest).find(y=>y.p.id===p.id); if(!x) break;
          /* exactly what the row showed: the same list (trailheads gone with the walk) and start */
          closeSheet(); edit(m=>{ const l=m.days[date]; if(!l||l.indexOf(old)<0) throw new Error('gone');
            m.days[date]=x.list.concat(l.filter(y=>!DB.places.has(y))); if(x.start){ m.start=m.start||{}; m.start[date]=x.start; } },
            pt('swapped',{name:nm(p)})+(x.start?' — '+pt('restart',{a:r.start0,b:x.start}):''),{focus:x.list.indexOf(p.id)}); break; }
        case 'vsugg': { const i=E.sbody.querySelector('.pl-vname'); if(i){ i.value=b.dataset.v; i.focus(); nameState(); } break; }
        case 'vsave': saveVersionNamed(b.dataset.id,E.sbody.querySelector('.pl-vname').value); break;
        case 'useday': if(kind==='compare') useDay(b.dataset.p,b.dataset.date,arg,b); break;
        case 'pastego': { const i=E.sbody.querySelector('.pl-paste'); importCode(codeOf(i&&i.value)).then(ok=>{ if(ok) closeSheet(); }); break; }
        case 'pasteclip': pasteFromClipboard(); break;
      }
    }
  };
};
})();
