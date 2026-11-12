/* PLANNER MORE — the planner's less-used sheets, loaded on first use so they stay off the critical
   path: reorder (順番を変える), quick swap (入れ替え), compare (くらべる) with 「この日を使う」, saving and
   renaming versions, and share links (create, open, paste). Attaches to the planner's own global
   as planner.more(ctx); ctx is the planner instance's state and helpers, so this file holds no
   state of its own and touches storage only through ctx. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.more) return;
const PTM={ galN2:{ja:'写真 {i}/{n}',en:'Photo {i}/{n}'}, tierOfN:{ja:'{name} の行きたさ',en:'How much for {name}'}, mark:{ja:'印',en:'Mark'}, allCands:{ja:'すべての候補',en:'All places'}, saveCardT:{ja:'案を保存すると、ここで並べてくらべられます',en:'Save a version to compare it here'}, seeReview:{ja:'③で全体を確認できます',en:'See it all in ③'}, look:{ja:'見る',en:'Look'}, verTools:{ja:'{name}の操作',en:'More for {name}'}, myEdit:{ja:'編集中',en:'Editing'}, autoN:{ja:'自動保存 {n}',en:'Autosaves {n}'}, saveNow:{ja:'今の日程を保存',en:'Save this plan'}, clearAll:{ja:'すべての日を空にする',en:'Clear every day'}, clearedAll:{ja:'すべての日を空にしました',en:'Every day cleared'}, more3:{ja:'その他',en:'More'}, nowOn:{ja:'{name}にしました',en:'Now on {name}'}, syncT2:{ja:'同期',en:'Sync'}, pairPh:{ja:'リンクを貼り付け',en:'Paste the pairing link'}, pairGo:{ja:'つなぐ',en:'Pair'}, selDone:{ja:'選択をやめる',en:'Stop selecting'}, toGroup:{ja:'グループへ',en:'To a group'}, toDays:{ja:'日程へ',en:'To the days'}, planList:{ja:'一覧',en:'All plans'}, inGroup:{ja:'→ {g}',en:'→ {g}'}, already:{ja:'{n}件はすでに{d}に入っています',en:'{n} already on {d}'},
sleepQ:{ja:'この夜に泊まる',en:'Stay this night'}, sleepS:{ja:'{d}の夜は{name}に泊まります',en:'{name} for the night of {d}'}, sleptOn:{ja:'{d}の夜に泊まる予定',en:'Staying the night of {d}'}, unsleep:{ja:'泊まるのをやめる',en:'Don’t stay here'}, unslept:{ja:'{name}に泊まるのをやめました',en:'No longer staying at {name}'},
bestDay:{ja:'最適 {d}',en:'Best {d}'}, placedN:{ja:'{n}/{of} 配置',en:'{n}/{of} placed'}, noDay:{ja:'⚠ どの日も崩れます',en:'⚠ breaks every day'}, grpSum:{ja:'約{d}・運転{m}',en:'about {d}, {m} driving'}, picks:{ja:'おすすめ',en:'Suggested'}, use:{ja:'使う',en:'Use'}, rename2:{ja:'名前を変える',en:'Rename'}, drop:{ja:'グループを解く',en:'Ungroup'}, noGroup:{ja:'グループなし',en:'Not in a group'},
mine:{ja:'わたしのリスト',en:'My list'}, mAll:{ja:'すべて',en:'All'}, m_must:{ja:'絶対',en:'Must'}, m_want:{ja:'行きたい',en:'Want'}, m_maybe:{ja:'余裕',en:'If time'}, mGrp:{ja:'グループ：{g}',en:'Group: {g}'}, picksH:{ja:'おすすめ',en:'Suggestions'}, mineNone:{ja:'①で分けた場所とグループがここに出ます',en:'Places you sort in ① and your groups show here'},
galT:{ja:'写真',en:'Photos'}, galZ:{ja:'写真を全体表示',en:'Show the whole photo'}, licSite:{ja:'公式サイト',en:'own site'}, galN:{ja:'{i} / {n}',en:'{i} of {n}'},

  broke:{ja:'{name}：{w}',en:'{name}: {w}'}, moveOpen:{ja:'朝に移す',en:'Move to its open hours'}, movedOpen:{ja:'{name}を開いている時間へ移しました',en:'Moved {name} into its open hours'}, endsAt:{ja:'{t}着',en:'ends {t}'}, storySoon:{ja:'ストーリー画像は準備中です',en:'Story images are coming soon'}, moveT:{ja:'別の日へ移す',en:'Move to another day'}, moveS:{ja:'移した日の中で、いちばん遠回りにならない位置に入ります',en:'Goes where it adds the least time that day'}, movedTo:{ja:'{d} に移しました',en:'Moved to {d}'}, added:{ja:'{d} に追加しました',en:'Added to {d}'}, addedN:{ja:'{n}件を {d} に追加しました',en:'Added {n} to {d}'}, nothingAdded:{ja:'すべて予定済みです',en:'All already planned'}, reset:{ja:'マイプランを消す',en:'Delete My plan'}, resetDone:{ja:'「{name}」に戻しました',en:'Back to “{name}”'}, all:{ja:'すべて',en:'All'}, count:{ja:'{n}件',en:'{n} places'}, noMatch:{ja:'条件に合う候補はありません。絞り込みを外してください。',en:'No places match. Clear a filter.'}, copiedC:{ja:'座標をコピーしました',en:'Coordinates copied'}, verDeleted:{ja:'「{name}」を削除しました',en:'Deleted “{name}”'}, impDel:{ja:'この取り込みを削除',en:'Delete this import'}, openReel:{ja:'リールを見る',en:'Open reel'},
  rvS:{ja:'日付をタップするとその日を組み立てます。表は案ごとの違い',en:'Tap a day to plan it; the table compares versions'}, pinK:{ja:'くらべる案',en:'Compare with'}, nowUsing:{ja:'「{name}」にしました',en:'Now using “{name}”'},
  groupName:{ja:'グループの名前',en:'Group name'}, newGroup:{ja:'新しいグループ',en:'New group'}, cSave:{ja:'保存',en:'Save'}, groupN:{ja:'グループ {n}',en:'Group {n}'}, grouped:{ja:'{n}件を「{g}」に',en:'{n} into “{g}”'},
  sharedGroup:{ja:'共有されたグループ {n}',en:'Shared group {n}'},
  warnsN:{ja:'注意 {n}',en:'{n} alerts'}, tapAgain:{ja:'もう一度タップで追加',en:'tap again to add'}, pillKey:{ja:'運転の増減・帰着',en:'added driving · day ends'}, addDrive:{ja:'運転 {d}',en:'driving {d}'}, closureAsk:{ja:'一部閉鎖があります。それでも追加しますか？',en:'Part of it is closed. Add anyway?'}, dayEnd:{ja:'1日の終わりの目安',en:'End-of-day guide'}, pasteT:{ja:'リンクを貼り付け',en:'Paste a link'}, pasteS:{ja:'ホーム画面のアプリでは、共有されたリンクをここに貼ります',en:'In the Home Screen app, paste a shared link here'}, pasteGo:{ja:'読み込む',en:'Open'}, pasteClip:{ja:'クリップボードから',en:'From clipboard'}, whichDay:{ja:'どの日に入れる？',en:'Which day?'}, planT:{ja:'プランを選ぶ',en:'Choose a plan'}, planS:{ja:'編集すると「マイプラン」に保存されます',en:'Edits are saved to My plan'}, presets:{ja:'用意したプラン',en:'Presets'}, basedOn:{ja:'「{name}」をもとに編集',en:'Edited from “{name}”'}, shareLink:{ja:'リンクで共有',en:'Share as link'}, inDay:{ja:'{d} に予定',en:'Planned on {d}'}, moveHere:{ja:'{d} に移す',en:'Move to {d}'}, removeFrom:{ja:'{d} から外す',en:'Remove from {d}'}, hoursDay:{ja:'この日の営業',en:'Hours that day'}, cost:{ja:'料金',en:'Cost'}, dur:{ja:'滞在目安',en:'Typical stay'}, booking:{ja:'予約',en:'Booking'}, noBook:{ja:'不要',en:'Not needed'}, best:{ja:'時間帯',en:'Best time'}, aesthetic:{ja:'写真映え',en:'Photogenic'}, of5:{ja:'5段階中{n}',en:'{n} of 5'}, why:{ja:'なぜ話題？',en:'Why it’s talked about'}, whyJa:{ja:'{n}件の記事・投稿で紹介されています（出典は下）',en:'{n} mentions'}, tagSearch:{ja:'#{t}',en:'#{t}'}, coords:{ja:'座標',en:'Coordinates'}, copy:{ja:'コピー',en:'Copy'}, backList:{ja:'候補一覧へ',en:'All places'}, versions:{ja:'保存した案',en:'Saved versions'}, renameN:{ja:'名前を変える：{name}',en:'Rename {name}'}, verDel:{ja:'「{name}」を削除',en:'Delete “{name}”'}, fromGm:{ja:'Googleマップから取り込み',en:'Imported from Google Maps'}, fromIg:{ja:'Instagramから取り込み',en:'Imported from Instagram'}, impGroup:{ja:'取り込んだ場所',en:'Imported places'},
  browseT:{ja:'候補',en:'Places'}, browseS:{ja:'{d} を表示中',en:'Showing {d}'}, searchPh:{ja:'名前・キーワードでさがす',en:'Search names and keywords'}, sortTrend:{ja:'話題順',en:'Trending'}, sortAes:{ja:'写真映え順',en:'Most photogenic'}, sortNear:{ja:'近い順',en:'Nearest'}, sortBy:{ja:'並び順',en:'Sort'}, clearFilters:{ja:'絞り込みを解除',en:'Clear filters'}, others:{ja:'そのほか',en:'Other'}, addAll:{ja:'まとめて追加',en:'Add all'}, addAllN:{ja:'{name} をまとめて追加',en:'Add all of {name}'}, clusterSum:{ja:'合計 {d}・{km}',en:'{d} in all, {km}'}, startAt:{ja:'{t}ごろ出発が目安',en:'start around {t}'},
  orderT:{ja:'順番を変える',en:'Change the order'}, orderS:{ja:'{name} を何番目にしますか',en:'Where should {name} go?'},
  up:{ja:'ひとつ上へ',en:'Move up'}, down:{ja:'ひとつ下へ',en:'Move down'}, nth:{ja:'{n}番目',en:'Position {n}'},
  swapT:{ja:'入れ替える候補',en:'Swap for'}, swapS:{ja:'{name} の代わりに。この時間に開いていて、近くて移動が30分以内の順',en:'Instead of {name}: open at that time, nearby, at most 30 min more travel'},
  sameCat:{ja:'同じ種類',en:'Same kind'}, otherCat:{ja:'ほかの種類',en:'Other kinds'}, more:{ja:'もっと見る（{n}件）',en:'Show more ({n})'},
  dayDelta:{ja:'1日が',en:'Day length'}, travelDelta:{ja:'移動の増減',en:'Travel change'}, restart:{ja:'出発 {a} → {b}',en:'Leave {a} → {b}'},
  dropsToo:{ja:'{name}も外れます（歩く区間がなくなるため）',en:'{name} goes too (its walk is gone)'}, noSwap:{ja:'この時間と場所に合う候補はありません',en:'Nothing fits this time and place'}, driveDelta:{ja:'移動 {d}',en:'Travel {d}'}, dayLen:{ja:'1日 {a} → {b}',en:'Day {a} → {b}'}, swapped:{ja:'{name} に入れ替えました',en:'Swapped in {name}'},
  verAsk:{ja:'この案の名前',en:'Name this version'}, verN:{ja:'案 {n}',en:'Version {n}'}, verSaved:{ja:'「{name}」を保存しました',en:'Saved “{name}”'},
  rename:{ja:'名前を変える',en:'Rename'}, renamed:{ja:'名前を変えました',en:'Renamed'}, nameNeeded:{ja:'名前を入れてください',en:'Enter a name'},
  verSugg:{ja:'カフェ多め|ゆったり|西海岸多め|雨の日用',en:'More cafes|Slow pace|West coast|Rainy day'},
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
  const pool=DB.list.filter(p=>!DB.bases.has(p.id)&&p.cat!=='ferry'&&!planned.has(p.id)&&isle(p)===home&&!(opt&&opt.skip&&opt.skip.has(p.id))).map(p=>[p,Math.min(hv(prev,p),hv(next,p))]).sort((a,b)=>a[1]-b[1]).slice(0,70).map(x=>x[0]);
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
  const {S,DB,E,slug,pt,esc,ic,head,doneBar,openSheet,closeSheet,toast,undo,pushHist,save,render,edit,plan,findPlan,planName,
    idsOf,schedule,dayStyle,dlabel,dayTitle,dur,hm,nm,nmLang,wbr,place,bodyOf,snapshot,renderTop,fitDay,isCand,plannedMap,FAMILY,
    thumb,tr,CAT,AREA,unverifiedHours,reorder,focusStop,afterRender,okHM,clone,switchToMe,savedTag,sigLine,BTN,IBTN,CHIP,SEG,FIELD,ROW,BADGE,STAT,EMPTY,hmm,foot}=c;
  c.addStrings(PTM);

  /* ---------- reorder ---------- */
  /* each position is simulated first: where the day would end, and ⚠ with the reason when it breaks something */
  function openOrder(id,focusD){
    const date=DB.days[S.day].date, ids=idsOf(date), i=ids.indexOf(id); if(i<0) return;
    const N=esc(nm(place(id))), day=DB.days[S.day], P=plan(), o={deadline:S.dayEnd}, sim=c.sim(), base=sim.schedule(day,ids,P,o);
    const at=k=>{ const l=ids.slice(); l.splice(i,1); l.splice(k,0,id); const sc=sim.schedule(day,l,P,o), br=sim.breaksOf(base,sc);
      return br.length?STAT('alert',esc(pt('endsAt',{t:hm(sc.end)})+'・'+[...new Set(br.map(x=>c.breakText(x,day)))].join('・')),{cls:'pl-stat--warn'}):STAT('clock',esc(pt('endsAt',{t:hm(sc.end)}))); };
    openSheet(head(pt('orderT'),pt('orderS',{name:N}))+`<div class="pl-orderud">
        ${BTN('secondary',pt('up'),{act:'ord','data-d':-1,disabled:i===0},'chevron-up')}${BTN('secondary',pt('down'),{act:'ord','data-d':1,disabled:i===ids.length-1},'chevron-down')}</div>
      <ol class="pl-orderlist">${ids.map((x,k)=>`<li>${ROW({media:`<span class="pl-marker">${k+1}</span>`,title:`<button type="button" class="pl-row__name" data-act="ordto" data-to="${k}" aria-current="${k===i}"${k===i?' disabled':''}${nmLang(place(x))}>${wbr(nm(place(x)))}</button>`,meta:k===i?pt('nth',{n:k+1}):at(k)})}</li>`).join('')}</ol>`,'order',{id,date});
    if(focusD){ const b=E.sbody.querySelector(`[data-act="ord"][data-d="${focusD}"]:not([disabled])`)||E.sbody.querySelector('[data-act="ord"]:not([disabled])'); if(b) b.focus(); }
  }

  /* ---------- versions: an in-app name sheet, never prompt() ---------- */
  function openVerName(id){
    const v=id&&findPlan(id), def=v?planName(v):pt('verN',{n:S.versions.filter(x=>!x.kind).length+1});
    openSheet(head(v?pt('rename'):pt('saveVer'),'')+FIELD({ico:'pencil',ph:pt('verAsk'),value:def,clear:pt('clear'),in:{cls:'pl-vname',name:'vname',type:'text',maxlength:40,enterkeyhint:'done','aria-describedby':'pl-vh-'+slug}})+`
      <p class="pl-hint" id="pl-vh-${slug}" hidden>${pt('nameNeeded')}</p>
      <div class="pl-chips">${pt('verSugg').split('|').map(s=>CHIP(esc(s),false,{act:'vsugg','data-v':s},'choice')).join('')}</div>
      ${foot(BTN('primary',pt('saveBtn'),{act:'vsave',id:v?v.id:''}))}`,'vername',{id:v?v.id:null});
    const i=E.sbody.querySelector('.pl-vname'); if(i){ i.focus(); i.select(); }
  }
  function nameState(){ const i=E.sbody.querySelector('.pl-vname'), b=E.sbody.querySelector('[data-act="vsave"]'), h=E.sbody.querySelector('#pl-vh-'+slug);
    if(!i||!b) return; const empty=!i.value.trim(); b.disabled=empty; i.setAttribute('aria-invalid',empty); if(h) h.hidden=!empty; }
  function saveVersionNamed(id,name){
    name=(name||'').trim().slice(0,40); if(!name){ nameState(); return; }
    pushHist();
    if(id){ S.versions=S.versions.map(x=>x.id===id?Object.assign({},x,{name,kind:undefined}):x); save(); toast(pt('renamed'),undo); }
    else { const v=snapshot(plan(),name); save(); toast(pt('verSaved',{name:planName(v)}),undo,{label:pt('planList'),fn:openPlans}); }
    renderTop(); closeSheet();
  }

  /* Copy one day of another version into the active plan: its stops leave any other day, and
     their stays, the day's start and their notes come along. */
  /* one day of version P, copied into the active plan: its stops leave their other days */
  const takeFn=(P,date)=>m=>{ const ids=idsOf(date,P);
      DB.days.forEach(x=>{ if(x.date!==date&&m.days[x.date]) m.days[x.date]=m.days[x.date].filter(id=>ids.indexOf(id)<0); });
      m.days[date]=ids.slice();
      ids.forEach(id=>{ if(P.stay&&P.stay[id]!=null) m.stay[id]=P.stay[id]; });
      if(P.start&&P.start[date]) m.start[date]=P.start[date]; else delete m.start[date]; };
  /* ---------- quick swap ---------- */
  const swapCands=id=>planner.swapRank(c.sim(),DB,plan(),DB.days[S.day],id,{deadline:S.dayEnd,skip:c.skipSet()});
  const signed=d=>(d>0.5?'+':d<-0.5?'−':'±')+hmm(d);
  /* the right-hand number is the travel change; the day's length shows only when it moves; what the
     swap breaks elsewhere, and a trailhead that leaves with the walk, are said on the row */
  let LASTSWAP=null;
  function altRow(x){
    const why=x.r.wait>0?pt('wait',{t:hm(x.r.begin),d:dur(x.r.wait)}):x.p.hours==='unknown'?pt('hoursUnknown'):'', day=DB.days[S.day];
    const br=x.breaks.map(b=>(b.kind==='stop'?nm(place(b.id))+'：':'')+c.warnText(b.w,day));
    return `<li>${ROW({media:thumb(x.p),title:`<button type="button" class="pl-row__name" data-act="doswap" data-id="${x.p.id}"${nmLang(x.p)}>${wbr(nm(x.p))}</button>`,
      meta:`${savedTag(x.p)}${hm(x.r.begin)}–${hm(x.r.dep)} · ${tr(CAT,x.p.cat)}${why?' · '+esc(why):''}`,
      extra:(Math.abs(x.dLen)>=1?STAT('clock',pt('dayLen',{a:hmm(x.len0),b:hmm(x.len)}),{cls:'pl-stat--soft'}):'')+(x.drop.length?STAT('walk',pt('dropsToo',{name:esc(nm(place(x.drop[0])))}),{cls:'pl-stat--soft'}):'')+(br.length?STAT('alert',esc(br.join('・')),{cls:'pl-stat--warn'}):''),
      trail:`<span class="pl-stat"><span class="sr">${pt('travelDelta')}</span>${signed(x.add)}</span>`})}</li>`;
  }
  function openSwap(id){
    const r=swapCands(id); if(!r) return; LASTSWAP=r;
    openSheet(head(pt('swapT'),pt('swapS',{name:esc(nm(r.cur))}))+
      (r.newStart?`<p class="pl-hint">${pt('restart',{a:r.start0,b:r.newStart})}</p>`:'')+
      (r.same.length?`<h3 class="pl-listhead">${pt('sameCat')}</h3><ul class="pl-list">${r.same.map(altRow).join('')}</ul>`:'')+
      (r.other.length?`<h3 class="pl-listhead">${pt('otherCat')}</h3><ul class="pl-list">${r.other.map(altRow).join('')}</ul>`:'')+
      (r.rest.length?`<details class="pl-fold"><summary>${pt('more',{n:r.rest.length})}</summary><ul class="pl-list">${r.rest.map(altRow).join('')}</ul></details>`:'')+
      (!r.same.length&&!r.other.length&&!r.rest.length?EMPTY('',pt('noSwap')):''),'swap',{id,date:DB.days[S.day].date});
  }

  /* ---------- share links: the version's name, notes, booked state and imported places travel
     with it; opening the same link twice is a no-op ---------- */
  function payload(){
    const p=plan(), ids=new Set(DB.days.flatMap(d=>idsOf(d.date,p))), booked={}, notes={};
    Object.keys(S.booked).forEach(k=>{ if(ids.has(k)) booked[k]=true; });
    /* the version's own notes travel as notes; hers (the trip's) as tn, so a preset's never becomes hers */
    const tn={}; Object.keys(p.notes||{}).forEach(k=>{ if(ids.has(k)) notes[k]=p.notes[k]; });
    Object.keys(S.trip.notes).forEach(k=>{ if(ids.has(k)) tn[k]=S.trip.notes[k]; });
    const imp=S.imports.filter(m=>ids.has(m.id)&&m.lat!=null).map(m=>({id:m.id,src:m.src,name:m.name,lat:m.lat,lon:m.lon,url:m.url||''}));
    const o={v:2,from:p.from||p.id,name:p.id==='my'&&!p.name?'':planName(p),   /* an unnamed My plan arrives as 「共有された案」, not as the receiver's マイプラン */
      days:p.days,stay:p.stay||{},start:p.start||{},notes,booked};
    if(p.anchors) o.anchors=p.anchors;
    if(p.stayDay) o.stayDay=p.stayDay;
    if(p.titles) o.titles=p.titles;
    if(imp.length) o.imp=imp;
    if(Object.keys(tn).length) o.tn=tn;
    /* v3: her tiers, and her groups as ids only (a group's name stays on her phone) */
    const t={}; Object.keys(S.trip.tier).forEach(k=>{ if(S.trip.tier[k]) t[k]=S.trip.tier[k]; });
    if(Object.keys(t).length) o.t=t;
    if(S.trip.groups.length) o.g=S.trip.groups.map(g=>({id:g.id,ids:g.ids}));
    o.v=3;
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
      if(Array.isArray(o.imp)){ const have=new Set(S.imports.map(m=>m.id)); const add=o.imp.filter(m=>m&&typeof m.id==='string'&&/^(gm|ig)-/.test(m.id)&&!have.has(m.id)&&typeof m.name==='string'&&isFinite(m.lat)&&isFinite(m.lon)&&c.home(m))
        .map(m=>({id:m.id,src:m.src==='ig'?'ig':'gmaps',name:m.name.slice(0,80),lat:+m.lat,lon:+m.lon,url:typeof m.url==='string'?m.url:'',ig:'',note:'',placeId:null,region:null,cc:null}));
        if(add.length){ pushHist(); S.imports=S.imports.concat(add); S.impVer++; c.rebuild(); nimp=add.length; } }
      const seen=new Set(), days={}, stay={}, start={}, notes={};
      DB.days.forEach(d=>{ const day1=new Set(); days[d.date]=(Array.isArray(o.days[d.date])?o.days[d.date]:[]).filter(id=>typeof id==='string'&&DB.places.has(id)&&!day1.has(id)&&day1.add(id)&&seen.add(id));
        if(okHM(o.start&&o.start[d.date])) start[d.date]=o.start[d.date]; });
      Object.keys(o.stay&&typeof o.stay==='object'?o.stay:{}).forEach(id=>{ const v=o.stay[id]; if(seen.has(id)&&typeof v==='number'&&v>0&&v<1440) stay[id]=Math.round(v); });
      Object.keys(o.notes&&typeof o.notes==='object'?o.notes:{}).forEach(id=>{ const v=o.notes[id]; if(seen.has(id)&&typeof v==='string') notes[id]=v.slice(0,300); });
      const sh=hash(canon({days,stay,start,notes,sd:o.stayDay||0,ti:o.titles||0,an:o.anchors||0,nm:o.name||''}));
      const dup=S.versions.find(v=>v.sh===sh);
      if(dup){ S.planId=dup.id; save(); render(true); fitDay(); switchToMe(); toast(pt('dupLink')); return true; }
      if(!nimp) pushHist();
      const name=typeof o.name==='string'&&o.name.trim()?o.name.trim().slice(0,40):'';
      const extra={}; if(o.stayDay&&typeof o.stayDay==='object') extra.stayDay=o.stayDay; if(o.titles&&typeof o.titles==='object') extra.titles=o.titles; if(o.anchors&&typeof o.anchors==='object') extra.anchors=o.anchors;
      const v=snapshot(Object.assign({days,stay,start,notes},extra),name,'shared');
      v.sh=sh; S.versions=S.versions.slice();
      /* v3: tiers fill only what she has not set; groups she does not have arrive unnamed; notes fill gaps */
      const T=clone(S.trip); let tn=0;
      Object.keys(o.t&&typeof o.t==='object'?o.t:{}).forEach(k=>{ if(DB.places.has(k)&&T.tier[k]==null&&['must','want','maybe','skip'].indexOf(o.t[k])>=0){ T.tier[k]=o.t[k]; tn++; } });
      const grouped=new Set(T.groups.flatMap(g=>g.ids));
      (Array.isArray(o.g)?o.g:[]).forEach(g=>{ if(!g||typeof g.id!=='string'||T.groups.some(x=>x.id===g.id)) return;
        const ids=(Array.isArray(g.ids)?g.ids:[]).filter(i=>typeof i==='string'&&DB.places.has(i)&&!grouped.has(i)); if(!ids.length) return;
        ids.forEach(i=>grouped.add(i)); T.groups.push({id:g.id,name:pt('sharedGroup',{n:T.groups.length+1}),ids}); });
      const tnx=o.tn&&typeof o.tn==='object'?o.tn:notes;
      Object.keys(tnx).forEach(k=>{ const v=tnx[k]; if(typeof v==='string'&&v.trim()&&DB.places.has(k)&&!T.notes[k]) T.notes[k]=v.slice(0,300); });
      S.trip=T;
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
  /* The drawer (docs/DESIGN.md rule 1, perf rules 1, 2, 7): her list first, then the filters under
     「すべての候補」, then the rest. ＋ adds to the day it was opened from, at once, with an undo
     toast; the place sheet offers 日程へ for another day. Rows render in windows; a search or a filter
     replaces the result lists only, and typing waits for ~100 ms of quiet. */
  function openBrowse(keep){
    const day=DB.days[S.day], all=DB.list.filter(isCand);
    const cats=Object.keys(CAT).filter(k=>all.some(p=>p.cat===k)), areas=Object.keys(AREA).filter(k=>all.some(p=>p.area===k));
    const chip=(k,v,label,gl)=>CHIP((gl?ic(gl,'sm'):'')+label,(S.f[k]||'')===v,{act:'f','data-k':k,'data-v':v});
    const y=keep?E.sbody.scrollTop:0;
    openSheet(head(pt('browseT'),pt('browseS',{d:dlabel(day)}))+
      `<div class="pl-browse__top">${FIELD({ph:pt('searchPh'),value:S.f.q,clear:pt('clear'),in:{cls:'pl-q',name:'q',type:'search',enterkeyhint:'search'}})}<span class="pl-browse__n" aria-live="polite"></span></div>
      <div class="pl-browse__mine"></div>
      <h3 class="pl-listhead">${pt('allCands')}</h3>
      <div class="pl-browse__filters"><div class="pl-chips">${chip('cat','',pt('all'))}${all.some(p=>p.saved)?chip('saved','1',pt('saved'),'bookmark'):''}${cats.map(c=>chip('cat',c,tr(CAT,c),GLYPH[c])).join('')}</div>
        <div class="pl-chips">${chip('area','',pt('all'))}${areas.map(a=>chip('area',a,tr(AREA,a))).join('')}</div>
        ${SEG(['trend','aes','near'].map(v=>({label:pt('sort'+v[0].toUpperCase()+v.slice(1)),on:S.f.sort===v,a:{act:'sort','data-v':v}})),{label:pt('sortBy')})}</div>
      <div class="pl-browse__list"></div>`,'browse',null,true);
    renderList(); if(keep) E.sbody.scrollTop=y;
    /* search keywords ship in places-more: re-filter once they land */
    if(!DB.more) loadMore().then(()=>{ if(c.kind()==='browse'&&S.f.q) renderList(); });
  }
  const searchText=p=>p._s||(p._s=fold([p.name,p.nameJa,p.igTag,tr(AREA,p.area),AREA[p.area]?AREA[p.area].en:'',(Array.isArray(p.kw)?p.kw:[p.kw||'']).join(' '),
    p.vibe,p.vibeJa,flagsOf(p).map(f=>FLAG[f].ja+' '+FLAG[f].en).join(' '),CAT[p.cat]?CAT[p.cat].ja+' '+CAT[p.cat].en:''].join(' ')));
  const bySaved=(a,b)=>(!!place(b).saved)-(!!place(a).saved);
  /* a row: the picture, the name (opens the place), one signal, and ＋ (or the day it is on) */
  function candRow(id,planned,day,dist){
    const p=place(id), on=planned.get(id);
    return ROW({media:thumb(p),title:`<button type="button" class="pl-row__name" data-act="open" data-id="${id}"${nmLang(p)}>${wbr(nm(p))}</button>`,
      meta:`${savedTag(p)}${p.imp||p.reels?`<span class="pl-badge">${pt('imp')}</span>`:''}<span>${dist!=null?uKm(Math.round(dist)):S.f.sort==='aes'&&p.aesthetic?'★'+p.aesthetic:p.imp?esc(ja()?p.imp.regionJa||p.imp.region||'':p.imp.region||''):tr(CAT,p.cat)}</span>`,
      trail:on!=null?`<span class="pl-marker" style="${dayStyle(on)}"><span class="sr">${esc(pt('inDay',{d:dlabel(DB.days[on])}))}</span>${+DB.days[on].date.slice(8)}</span>`
        :IBTN('plus',pt('addNTo',{name:nm(p),d:dlabel(day)}),{act:'addnow',id})},{cls:'pl-cand','data-id':id});
  }
  /* windowed: a list shows WIN rows and a sentinel; the sentinel grows it when it nears the screen */
  const WIN=24, LISTS=new Map(); let LIO=null, LN=0;
  function winList(ids,planned,day,dist){ const k='l'+(LN++); LISTS.set(k,{ids,planned,day,dist,n:WIN});
    return ids.slice(0,WIN).map(id=>candRow(id,planned,day,dist?dist.get(id):null)).join('')+(ids.length>WIN?`<i class="pl-cs__more" data-more="${k}"></i>`:''); }
  function watchLists(){ if(!('IntersectionObserver' in window)) return;
    if(!LIO) LIO=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return; LIO.unobserve(e.target); const s=e.target, x=LISTS.get(s.dataset.more); if(!x) return;
      const t=document.createElement('template'); t.innerHTML=x.ids.slice(x.n,x.n+WIN).map(id=>candRow(id,x.planned,x.day,x.dist?x.dist.get(id):null)).join('')+(x.ids.length>x.n+WIN?`<i class="pl-cs__more" data-more="${s.dataset.more}"></i>`:'');
      x.n+=WIN; const host=s.parentNode; s.remove(); host.appendChild(t.content); watchLists(); }),{rootMargin:'600px'});
    E.sbody.querySelectorAll('.pl-cs__more').forEach(x=>LIO.observe(x)); }
  function renderList(){
    const box=E.sbody.querySelector('.pl-browse__list'), mb=E.sbody.querySelector('.pl-browse__mine'); if(!box) return;
    LISTS.clear(); LN=0;
    const day=DB.days[S.day], planned=plannedMap(), pts=S.sc.rows.map(r=>place(r.id));
    const near=p=>Math.min(...pts.map(x=>hav(x,p)));
    const raw=S.f.q.trim().normalize('NFKC'), terms=raw?raw.split(/[\s　、,・]+|(?<=[^\sの])[のとでを](?=[^\s])/).map(w=>fold(w.replace(/^[のとでを]+|[のとでを]+$/g,''))).filter(Boolean):[];
    /* 見送り (skip) places stay out of the pool, but never leave a day they are on */
    const ok=DB.list.filter(p=>isCand(p)&&c.tierOf(p.id)!=='skip'&&(!S.f.cat||p.cat===S.f.cat)&&(!S.f.area||p.area===S.f.area)&&(!S.f.saved||p.saved)&&(!terms.length||terms.every(w=>searchText(p).indexOf(w)>=0)));
    E.sbody.querySelector('.pl-browse__n').textContent=pt('count',{n:ok.length});
    const mine=mineHTML(ok,planned,day); mb.innerHTML=mine.html;
    if(!ok.length){ box.innerHTML=EMPTY('',pt('noMatch'),BTN('secondary',pt('clearFilters'),{act:'clearf'})); return; }
    if(S.f.sort!=='trend'){       /* flat: nearest really is nearest */
      const sc=new Map(ok.map(p=>[p.id,S.f.sort==='near'?near(p):-((p.aesthetic||0)*10+(p.trend||0))]));
      const ids=ok.map(p=>p.id).sort((a,b)=>bySaved(a,b)||sc.get(a)-sc.get(b));
      box.innerHTML=`<section class="pl-clus">${winList(ids,planned,day,S.f.sort==='near'?sc:null)}</section>`; watchLists(); return;
    }
    const score=new Map(ok.map(p=>[p.id,-((p.trend||0)*10+(p.aesthetic||0))]));
    const groups=[], used=new Set(mine.ids);
    const imps=ok.filter(p=>p.imp).map(p=>p.id); imps.forEach(id=>used.add(id));
    if(imps.length) groups.push({c:{id:'_imp',name:pt('impGroup'),nameJa:pt('impGroup'),first:true},m:imps});
    DB.clusters.forEach(c=>{ const m=c.ids.filter(id=>score.has(id)&&!used.has(id)); m.forEach(id=>used.add(id)); if(m.length) groups.push({c,m}); });
    const rest=ok.filter(p=>!used.has(p.id)).map(p=>p.id);
    if(rest.length) groups.push({c:{id:'',name:pt('others'),nameJa:pt('others')},m:rest});
    groups.forEach(x=>{ x.m.sort((a,b)=>bySaved(a,b)||score.get(a)-score.get(b)); x.s=score.get(x.m[0]); x.sv=!!place(x.m[0]).saved; });
    groups.sort((a,b)=>(!!b.c.first)-(!!a.c.first)||(!a.c.id)-(!b.c.id)||b.sv-a.sv||a.s-b.s);
    box.innerHTML=groups.map(x=>{ const free=x.m.filter(id=>!planned.has(id)), cn=(ja()?x.c.nameJa:x.c.name)||x.c.name||x.c.id;
      return `<section class="pl-clus" data-arm><div class="pl-clus__head"><h3>${esc(cn)}<span class="pl-badge">${x.m.length}</span></h3>
        ${x.c.id&&free.length>1?BTN('secondary',`<span aria-hidden="true">${pt('addAll')} ${free.length}</span><span class="sr">${esc(pt('addAllN',{name:cn}))}</span>`,{act:'addall',id:x.c.id,'data-ids':free.join(' '),'aria-expanded':'false',cls:'pl-btn--s'},'plus'):''}</div>
        ${x.c.id&&x.c.id!=='_imp'?`<p class="pl-clus__sum">${clusterSum(x.m)}${x.c.startAt?` · ${pt('startAt',{t:x.c.startAt})}`:''}</p>`:''}
        ${winList(x.m,planned,day,null)}</section>`; }).join('');
    watchLists();
  }
  /* ① select mode's bulk bar: the count, the four tiers, グループへ, 日程へ, ×, in one row */
  /* ① select mode's action bar (docs/DESIGN.md): count + ✕ + 3 actions in one row that fits 320; the
     tiers sit in the 印 menu; every action is disabled at 0 */
  const cbar=(n,T)=>`<div class="pl-actionbar" role="toolbar" aria-label="${esc(pt('selN',{n}))}"><span class="pl-actionbar__n">${pt('selN',{n})}</span>${IBTN('x',pt('selDone'),{'data-ca':'selx'})}
      <details class="pl-menu pl-actionbar__tier"><summary class="pl-btn pl-btn--secondary${n?'':' is-disabled'}"${n?'':' aria-disabled="true"'}>${pt('mark')}${ic('chevron-down','sm')}</summary><div class="pl-menu__list">${T.map(k=>BTN('ghost',pt('t_'+k),{'data-ca':'bulk','data-t':k,disabled:!n})).join('')}</div></details>
      ${BTN('secondary',pt('toGroup'),{'data-ca':'group',disabled:!n})}${BTN('secondary',pt('toDays'),{'data-ca':'days',disabled:!n})}</div>`;
  /* after グループへ the selection is spent */
  const unsel=()=>{ if(S.csel&&S.csel.size){ S.csel.clear(); const m=c.col(); if(m) m.render(true); } };
  /* ---------- ① by group (planner-collect asks for this): her groups, simulated (time on foot and road,
     the cheapest day each fits cleanly), the おすすめ to adopt, each with a cover picture, then the rest ---------- */
  const BD=new Map();
  function bestDay(g){ const P=plan(), k=JSON.stringify([g.ids,P.days,S.dayEnd]); if(BD.has(k)) return BD.get(k);
    const pm=plannedMap(P), ids=g.ids.filter(i=>!pm.has(i)&&DB.places.has(i)); let best=null;
    if(ids.length) DB.days.forEach((d,i)=>{ const pv=SIMc().insertPlan(d,idsOf(d.date,P),ids,P,{deadline:S.dayEnd},g); if(pv&&!pv.breaks.length&&(!best||pv.dDrive<best.v)) best={i,v:pv.dDrive}; });
    const r=!ids.length?'':best?pt('bestDay',{d:dlabel(DB.days[best.i])}):pt('noDay'); BD.set(k,r); return r; }
  function gsum(ids){ let m=0, d=0; ids.forEach((id,k)=>{ const p=place(id); m+=p.dur||60; if(k){ const x=SIMc().legAt(ids[k-1],id,600,DB.days[0].date,[]); m+=x.min; d+=x.drove; } });
    return STAT('clock',hmm(m))+STAT('car',hmm(d)); }
  function cGroups(sec,cards,o,pm,groupOf){ const used=new Set(S.trip.groups.map(g=>g.from).filter(Boolean));
    const gs=S.trip.groups.map(g=>sec(g.id,esc(g.name),g.ids.length,cards(o.get(g.id)||[],'g'+g.id),`<span class="pl-cs__meta">${pt('placedN',{n:g.ids.filter(i=>pm.has(i)).length,of:g.ids.length})} ${gsum(g.ids)} <span data-bestday="${g.id}">…</span></span>
      <details class="pl-menu"><summary class="pl-btn pl-btn--icon">${ic('more')}<span class="sr">${esc(pt('verTools',{name:g.name}))}</span></summary><div class="pl-menu__list">${BTN('ghost',pt('rename2'),{'data-ca':'gname',id:g.id},'pencil')}${BTN('ghost',pt('del'),{'data-ca':'gdrop',id:g.id},'trash')}</div></details>`)).join('');
    /* each group's best day is simulated in idle slices after the paint (perf rule 8) */
    const q=S.trip.groups.slice(); const step=dl=>{ while(q.length&&(!dl||dl.timeRemaining()>2)){ const g=q.shift(), t=E.collect.querySelector(`[data-bestday="${CSS.escape(g.id)}"]`); if(t) t.textContent=bestDay(g); }
      if(q.length) (window.requestIdleCallback||(f=>setTimeout(f,0)))(step); }; (window.requestIdleCallback||(f=>setTimeout(f,0)))(step);
    const cover=x=>{ const id=x.ids.find(i=>c.gal(place(i)).length||DB.photos&&DB.photos[i])||x.ids[0]; return thumb(place(id)); };
    const picks=DB.clusters.filter(x=>!used.has(x.id)&&x.ids.some(i=>!groupOf(i))).map(x=>`<li>${ROW({media:cover(x),title:esc((ja()?x.nameJa:x.name)||x.id),meta:esc(x.ids.map(i=>nm(place(i))).join('・')),trail:BTN('secondary',pt('use'),{'data-ca':'guse',id:x.id,cls:'pl-btn--s'})})}</li>`).join('');
    return gs+(picks?`<section class="pl-cs pl-picks"><details><summary class="pl-cs__head"><h3>${pt('picks')}<span class="pl-badge">${DB.clusters.filter(x=>!used.has(x.id)).length}</span>${ic('chevron-down','sm')}</h3></summary><ul class="pl-list">${picks}</ul></details></section>`:'')+sec('',pt('noGroup'),(o.get('')||[]).length,cards(o.get('')||[],'g')); }
  /* わたしのリスト: her tiered places (絶対 / 行きたい / 余裕, one filter), then each of her groups with
     まとめて追加. The places listed here leave the おすすめ sections below. */
  const TR=['must','want','maybe'];
  function mineHTML(ok,planned,day){
    const tf=S.f.tier||'', okS=new Set(ok.map(p=>p.id));
    const ids=ok.filter(p=>{ const t=c.tierOf(p.id); return TR.indexOf(t)>=0&&(!tf||t===tf); }).map(p=>p.id)
      .sort((a,b)=>TR.indexOf(c.tierOf(a))-TR.indexOf(c.tierOf(b))||(planned.has(a)-planned.has(b)));
    const gs=S.trip.groups.map(g=>({g,m:g.ids.filter(i=>okS.has(i))})).filter(x=>x.m.length);
    const seg=SEG(['',...TR].map(k=>({label:pt(k?'t_'+k:'mAll'),on:tf===k,a:{act:'tf','data-v':k}})),{label:pt('mine')});
    if(!ids.length&&!gs.length&&!tf) return {html:'',ids:[]};
    const html=`<section class="pl-clus pl-mine"><div class="pl-clus__head"><h3>${pt('mine')}<span class="pl-badge">${ids.length}</span></h3></div>${seg}
        ${ids.length?winList(ids,planned,day,null):`<p class="pl-hint">${pt('mineNone')}</p>`}</section>`+
      gs.map(({g,m})=>{ const free=m.filter(id=>!planned.has(id));
        return `<section class="pl-clus pl-mine" data-arm><div class="pl-clus__head"><h3>${esc(pt('mGrp',{g:g.name}))}<span class="pl-badge">${m.length}</span></h3>
        ${free.length?BTN('secondary',`<span aria-hidden="true">${pt('addAll')} ${free.length}</span><span class="sr">${esc(pt('addAllN',{name:g.name}))}</span>`,{act:'addall',id:g.id,'data-ids':free.join(' '),'aria-expanded':'false',cls:'pl-btn--s'},'plus'):''}</div>
        <p class="pl-clus__sum">${clusterSum(m)}</p>${winList(m,planned,day,null)}</section>`; }).join('');
    return {html,ids}; }
  /* a cluster's total: stays plus the drive between its members in list order */
  function clusterSum(ids){ let m=0, km=0; ids.forEach((id,k)=>{ const p=place(id); m+=p.dur||60; if(k){ const a=place(ids[k-1]), w=DB.walks.find(x=>(x.a===a.id&&x.b===id)||(x.b===a.id&&x.a===id)); if(w){ m+=w.a===a.id?w.min:w.down!=null?w.down:w.min; return; } const d=eqKm(a,p)*1.35; km+=d; m+=d/50*60; } });
    return STAT('clock',hmm(m))+STAT('car',Math.round(km)+' km'); }
  function patchCand(id){
    const on=plannedMap().get(id); if(on==null) return;
    E.sbody.querySelectorAll(`.pl-cand[data-id="${CSS.escape(id)}"] .pl-row__trail`).forEach(t=>{
      t.innerHTML=`<span class="pl-marker" style="${dayStyle(on)}"><span class="sr">${esc(pt('inDay',{d:dlabel(DB.days[on])}))}</span>${+DB.days[on].date.slice(8)}</span>`; });
  }


  /* ---------- ③ 見直す: the month calendar and the versions grid (planner-cal.js, loaded when ③ opens).
     The model is planner.sim's: per day the sleep, stops, musts placed, driving, end against its limit,
     ⚠, bookings, sun at the first stop and one fixed fact (tools/cal_fixture.py is the field reference). */
  let CALP=null;
  const needCal=()=>CALP||(CALP=Promise.all([c.loadCss('pl-cal',c.view.dataset.calCss||'planner-cal.css'),planner.cal?0:c.loadJs(c.view.dataset.calSrc||'planner-cal.js')]).catch(e=>{ CALP=null; throw e; }));
  const bare=s=>String(s||'').replace(/\s*[(（].*?[)）]/g,'');
  const plus=m=>{ m=Math.round(m); return (m>=1440?'+':'')+hm(m%1440); };
  const musts=()=>DB.list.filter(p=>c.isCand(p)&&c.tierOf(p.id)==='must').map(p=>p.id);
  function dayModel2(P,d,i,mu){ const sc=schedule(d,null,P), ids=sc.rows.slice(1,-1).map(r=>r.id), e=sc.rows[sc.rows.length-1], an=e.an||{}, last=e.id==='akl';
    const warn=[]; sc.rows.forEach(r=>r.warns.forEach(w=>warn.push({kind:w.k,text:(r.kind==='stop'?nm(place(r.id))+'：':'')+c.warnText(w,d)}))); if(sc.long) warn.push({kind:'long',text:pt('longDrive',{d:dur(sc.drive)})});
    const first=place(ids[0]||e.id), sl=place(e.id), lb=d.labelJa||'';
    return {date:d.date,colorVar:'--d'+(i%6+1),inkVar:'--ink',sleep:last?{name:'In flight',nameJa:'機内'}:{name:bare(sl.name),nameJa:bare(sl.nameJa||sl.name)},
      stops:ids.length,ids,mustPlaced:ids.filter(x=>mu.indexOf(x)>=0).length,mustTotal:mu.length,driveMin:Math.round(sc.drive),endTime:plus(sc.end),
      limit:{time:an.time||c.hhmm(S.dayEnd),label:last?{ja:'返車',en:'car'}:''},warn,
      booked:{done:ids.filter(x=>S.booked[x]).length,total:ids.filter(x=>(place(x)||{}).book).length},
      sunrise:hm(c.sim().sunriseOf(first,d.date)),sunset:hm(c.sim().sunsetOf(first,d.date)),
      fact:i===0?{ja:d.start.time+' 着',en:'Land '+d.start.time}:lb.indexOf('・')>=0?{ja:lb.split('・').slice(1).join('・'),en:String(d.label||'').split(': ').pop()}:null}; }
  function calModel(){ const P=plan(), mu=musts(), days=DB.days.map((d,i)=>dayModel2(P,d,i,mu));
    const all=[S.my].concat(S.versions.filter(v=>v.kind!=='auto')), pin=(S.pin||[]).filter(id=>id!==P.id&&findPlan(id));
    const others=pin.length?pin:all.filter(x=>x.id!==P.id).slice(0,2).map(x=>x.id);
    const ver=x=>{ const ds=DB.days.map((d,i)=>dayModel2(x,d,i,mu)), placed=new Set(ds.flatMap(d=>d.ids.filter(i=>mu.indexOf(i)>=0)));
      return {id:x.id,name:planName(x),nameJa:planName(x),active:x.id===P.id,totals:{driveMin:ds.reduce((t,d)=>t+d.driveMin,0),warn:ds.reduce((t,d)=>t+d.warn.length,0),must:[placed.size,mu.length]},
        days:Object.fromEntries(ds.map((d,i)=>[d.date,{stops:d.ids.map(i=>nm(place(i))),endTime:d.endTime,warn:d.warn.length,label:c.titleT(d,x)}]))}; };
    return {trip:{start:DB.days[0].date,end:DB.days[DB.days.length-1].date,lang:c.lang()},days,versions:[P].concat(others.map(findPlan)).map(ver)}; }
  function renderReview(el){
    const all=[S.my].concat(S.versions.filter(v=>v.kind!=='auto')), cur=plan(), pin=new Set(S.pin||[]);
    if(!el._rv){ el._rv=1;
      /* the compare chips are the selection (no separate くらべる or 共有 here: share lives in the header) */
      el.innerHTML=`<div class="pl-rvh"><h2 class="sr">${pt('st_review')}</h2>${S.help?`<p class="pl-hint">${pt('rvS')}</p>`:''}<div class="pl-chips pl-rvpin"></div></div>
        <div class="pl-cal-pair"><div class="pl-rvcal"></div><div class="pl-rvver"></div></div>`;
      el.addEventListener('click',e=>{ const b=e.target.closest('[data-rv]'); if(!b) return;
        if(b.dataset.rv==='pin'){ const id=b.dataset.id, p=(S.pin||[]).filter(x=>x!==id); if(p.length===(S.pin||[]).length) p.push(id); S.pin=p.slice(-3); c.saveUI(); renderReview(el); }
        else if(b.dataset.rv==='save') openVerName(null); }); }
    const others=all.filter(x=>x.id!==cur.id);
    el.querySelector('.pl-rvpin').innerHTML=others.length>1?`<span class="pl-hint">${pt('pinK')}</span>`+others.map(x=>c.CHIP(esc(planName(x)),pin.has(x.id),{'data-rv':'pin','data-id':x.id})).join(''):'';
    const opts={
      onDay:date=>{ const k=DB.days.findIndex(d=>d.date===date); c.setStage('plan'); c.setDay(k); requestAnimationFrame(()=>{ const b=E.days.querySelector(`[data-day="${k}"]`); if(b) b.focus({preventScroll:true}); }); },
      onUseVersion:id=>{ if(!findPlan(id)) return; pushHist(); S.planId=id; save(); render(true); toast(pt('nowUsing',{name:planName(findPlan(id))}),undo); },
      onTakeDay:(id,date)=>{ const P=findPlan(id), d=DB.days.find(x=>x.date===date), btn=el.querySelector(`.pl-cal-c[data-v="${CSS.escape(id)}"][data-date="${date}"]`);
        if(P&&d) c.guard(btn,'take'+id+date,takeFn(P,date),pt('usedDayIn',{name:planName(P),d:dlabel(d),into:planName(S.my||{id:'my'})})); },
      /* a stop or a place dropped on a calendar day goes there, checked like any move */
      onDropStop:(date,p)=>{ const k=DB.days.findIndex(d=>d.date===date); if(k<0||!p||!p.ids) return;
        if(p.from) c.guard(null,'cal'+p.ids[0]+date,moveFn(p.ids[0],p.from,DB.days[k]),pt('movedTo',{d:dlabel(DB.days[k])}));
        else applyAdd(k,p.ids,p.group?c.clusterOf(p.group):null); }};
    /* fewer than 2 saved versions (docs/DESIGN.md "First run"): the calendar, and one card to save one */
    const saved=S.versions.filter(v=>v.kind!=='auto').length;
    needCal().then(()=>{ const m=calModel(); planner.cal.render(el.querySelector('.pl-rvcal'),m,opts);
      if(saved<2) el.querySelector('.pl-rvver').innerHTML=c.EMPTY(`${ic('compare','lg')}`,pt('saveCardT'),c.BTN('primary',pt('saveNow'),{'data-rv':'save'},'plus'));
      else planner.cal.renderVersions(el.querySelector('.pl-rvver'),m,opts); },
      ()=>{ el.querySelector('.pl-rvcal').textContent=pt('loadFail'); });
  }
  /* ---------- ①'s group sheets: into a group, or a new one; renaming ---------- */
  /* groups: one outing each; a place leaves its old group when it joins another */
  function intoGroup(ids,gid,name){ let g;
    c.editTrip(x=>{ x.groups.forEach(o=>{ o.ids=o.ids.filter(i=>ids.indexOf(i)<0); });
      g=gid&&x.groups.find(o=>o.id===gid); if(!g){ g={id:'g-'+Date.now().toString(36),name:name||pt('groupN',{n:x.groups.length+1}),ids:[]}; x.groups.push(g); }
      g.ids=g.ids.concat(ids); x.groups=x.groups.filter(o=>o.ids.length||o===g); },pt('grouped',{n:ids.length,g:name||(gid&&(S.trip.groups.find(o=>o.id===gid)||{}).name)||pt('groupN',{n:S.trip.groups.length+1})}));
    }
  function groupSheet(ids){
    openSheet(head(pt('toGroup'),pt('selN',{n:ids.length}))+`<div class="pl-list">${S.trip.groups.map(g=>ROW({title:`<button type="button" class="pl-row__name" data-act="cgto" data-id="${g.id}">${esc(g.name)}</button>`,trail:`<span class="pl-badge">${g.ids.length}</span>`})).join('')}</div>
      ${FIELD({ico:'pencil',ph:pt('groupN',{n:S.trip.groups.length+1}),clear:pt('clear'),in:{cls:'pl-cgname',type:'text',maxlength:40,enterkeyhint:'done'}})}
      ${foot(BTN('primary',pt('newGroup'),{act:'cgnew'},'plus'))}`,'cgroup',{ids}); }
  function nameSheet(g){ openSheet(head(pt('rename2'),'')+FIELD({ico:'pencil',ph:pt('groupName'),value:g.name,clear:pt('clear'),in:{cls:'pl-cgname',type:'text',maxlength:40,enterkeyhint:'done'}})+
      foot(BTN('primary',pt('cSave'),{act:'cgren',id:g.id})),'cgname',{id:g.id}); }
  /* ---------- adding ---------- */
  /* Apply an add; then name any earlier stop it broke, with a one-tap move to that stop's open slot. */
  function applyAdd(k,ids,grp){
    const day=DB.days[k]; let pv=null;
    const ok=edit(m=>{ const l=(m.days[day.date]=m.days[day.date]||[]); pv=c.sim().insertPlan(day,l,ids,m,{deadline:S.dayEnd},grp); if(!pv) throw new Error('nothing');
      m.days[day.date]=pv.list.concat(l.filter(x=>!DB.places.has(x))); if(pv.start){ m.start=m.start||{}; m.start[day.date]=pv.start; } },
      ids.length>1?pt('addedN',{n:ids.length,d:dlabel(day)}):pt('added',{d:dlabel(day)})+'：'+nm(place(ids[0])));
    if(!ok||!pv) return false;
    /* onboarding step 3 done: the first add points on to ③, once */
    if(!(S.hints||{}).add){ S.hints=Object.assign({},S.hints,{add:1}); c.saveUI(); toast(pt('seeReview'),undo,{label:pt('look'),fn:()=>c.setStage('review')}); return true; }
    const hurt=pv.breaks.find(b=>b.kind==='stop'&&ids.indexOf(b.id)<0&&(b.w.k==='closed'||b.w.k==='closedAt'));
    if(hurt){
      toast(pt('broke',{name:nm(place(hurt.id)),w:c.warnText(hurt.w,day)}),undo); }
    return true;
  }
  /* ---------- the story image: story.js (plstory.open(dayModel)) loads only when asked ---------- */
  /* The model story.js documents: {date, dayNo, title, titleJa, color, lang, stops:[{time, name,
     nameJa, cat, photo, lat, lon}], stats, tags, home}, plus the leg shapes in [lon,lat]. */
  function dayModel(){
    const day=DB.days[S.day], sc=S.sc, cs=getComputedStyle(c.main);
    const P=plan(), tt=c.titleT(day,P);
    return {slug, guide:c.g, lang:lang(), date:day.date, dayNo:S.day+1, title:tt&&tt.en||day.label, titleJa:tt&&tt.ja||day.labelJa,
      color:cs.getPropertyValue('--c').trim(), ink:cs.getPropertyValue('--ci').trim(),
      stops:sc.rows.filter(r=>r.kind==='stop').map(r=>{ const p=place(r.id); return {id:p.id,time:hm(r.begin),end:hm(r.dep),name:p.name,nameJa:p.nameJa||p.name,cat:p.cat,best:p.best||'',
        sun:(r.infos.find(x=>x.k==='sunrise'||x.k==='sunsetAt')||{}).t!=null?hm(r.infos.find(x=>x.k==='sunrise'||x.k==='sunsetAt').t):'',
        lat:p.lat,lon:p.lon,photo:DB.photos&&DB.photos[p.id]||commons(p)}; }),
      stats:pt('drive',{d:dur(sc.drive)})+' · '+Math.round(sc.km)+' km · '+pt('stops',{n:sc.rows.length-2}),
      home:(p=>p&&{lat:p.lat,lon:p.lon})(place(sc.rows[sc.rows.length-1].id)),
      tags:[...new Set(sc.rows.map(r=>place(r.id).igTag).filter(Boolean))].slice(0,3),
      legs:c.legSegments(sc).map(s=>({kind:s.kind,ll:legLL(s)}))};
  }
  /* a leg's shape in [lon,lat]: the road geometry for a drive (c.geomLL, the planner's route cache), else a straight line */
  function legLL(s){
    const g=s.kind==='drive'&&c.geomLL&&c.geomLL(s.a,s.b), pts=g&&(Array.isArray(g)?g:g.pts);
    if(pts&&pts.length>1) return pts;
    const A=place(s.a), B=place(s.b); return [[A.lon,A.lat],[B.lon,B.lat]];
  }
  /* a stop without its own photo may use the gallery's first Commons picture: the canvas needs CORS, which only Commons gives */
  const commons=p=>{ const G=c.gx(), x=c.gal(p).find(x=>G.isWM(x.u)); return x?{src:G.gw(x.u,640),src2x:x.u,credit:x.by}:null; };
  let STORY=null;
  function openStory(){
    if(!STORY) STORY=window.plstory?Promise.resolve(window.plstory):new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src=c.view.dataset.storySrc||'story.js'; s.onload=()=>window.plstory?res(window.plstory):rej(); s.onerror=rej; document.head.appendChild(s); });
    Promise.all([STORY,loadMore(),c.loadGallery()]).then(([st])=>st.open(dayModel(),c.g),()=>{ STORY=null; toast(pt('storySoon')); });
  }

  /* ---------- 日を移動 ---------- */
  /* 日を移動: out of this day, into the other day's cheapest open slot */
  const moveFn=(id,date,to)=>m=>{ const a=m.days[date], k=a.indexOf(id); if(k<0) throw new Error('gone'); a.splice(k,1);
    const l=(m.days[to.date]=m.days[to.date]||[]); l.splice(c.sim().bestPos(to,l,id,m,{deadline:S.dayEnd}).pos,0,id); };
  /* each day is simulated first, like the add picker: that day's end, and ⚠ with the reason */
  function openMove(id){
    const p=plan(), date=DB.days[S.day].date;
    openSheet(head(pt('moveT'),pt('moveS'))+`<div class="pl-list" data-arm>${DB.days.map((d,k)=>{ if(k===S.day) return '';
      const fn=moveFn(id,date,d), bs=c.trial(fn)||[], m=clone({id:'t',days:p.days,stay:p.stay||{},start:p.start||{},stayDay:p.stayDay||{},anchors:p.anchors||{}}); fn(m);
      const end=c.sim().schedule(d,null,m,{deadline:S.dayEnd}).end, why=bs.length?c.breakLine(bs,d):'';
      return ROW({media:`<span class="pl-marker" style="--day:var(--d${k%6+1})">${+d.date.slice(8)}</span>`,title:`<button type="button" class="pl-row__name" data-act="domove" data-day="${k}">${dlabel(d)}</button>`,
        meta:STAT('map-pin',String((p.days[d.date]||[]).length))+STAT('clock',esc(pt('endsAt',{t:hm(end)}))),extra:why?STAT('alert',esc(why),{cls:'pl-stat--warn'}):''}); }).join('')}</div>`,'move',{id,date});
  }
  /* ---------- the place sheet and the plans sheet ---------- */
  const {hoursText,photoHTML,colorCard,closeBtn,alt,altLang,latin,bestText,domain,addIds,clusterOf,closure,wdName,breakText}=c, SIMc=()=>c.sim();
  const preview=(k,ids,c)=>SIMc().insertPlan(DB.days[k],idsOf(DB.days[k].date),ids,plan(),{deadline:S.dayEnd},c);
  const cmin=m=>{ m=Math.round(m); return (m<0?'−':'+')+(Math.abs(m)<60?Math.abs(m)+(ja()?'分':'m'):Math.floor(Math.abs(m)/60)+':'+pad(Math.abs(m)%60)); };
  /* 「どの日に入れる？」: six day buttons, each simulated before it is shown: the added driving and
     the day's end, ⚠ when the add breaks something (closes, past the day's end or the flight, after
     dark, ferry, tide). A ⚠ day, or a partly closed place, takes a second tap; the first says why. */
  /* a camp or a hut is somewhere to sleep, not a 12-hour stop: the pills set the night's end anchor
     (and the next morning's start there), each simulated: arrival at the camp, ⚠ with the reason */
  const sleeps=p=>p&&p.cat==='camp';
  /* The next morning starts AT the bed: its leading stops that only led there (the hut's road end) go,
     and when the morning holds a sunrise stop, the start is set so the walk from the bed arrives first. */
  const sleepFn=(id,k)=>m=>{ const d=DB.days[k], n=DB.days[k+1]; m.anchors=m.anchors||{};
    DB.days.forEach(x=>{ const l=m.days[x.date]; if(l&&l.indexOf(id)>=0) l.splice(l.indexOf(id),1); });
    m.anchors[d.date]=Object.assign({},m.anchors[d.date],{end:{id}}); if(!n) return;
    m.anchors[n.date]=Object.assign({},m.anchors[n.date],{start:{id}});
    const re=(DB.noRoad||{})[id], l=m.days[n.date]||[]; while(re&&l[0]===re) l.shift();
    const sr=l.find(x=>/sunrise/.test(place(x).best||''));
    if(sr){ const S2=SIMc(), t=S2.sunriseOf(place(sr),n.date)-S2.legAt(id,sr,0,n.date,[]).min-10; if(t>0){ m.start=m.start||{}; m.start[n.date]=pad(Math.floor(t/5)*5/60|0)+':'+pad(Math.floor(t/5)*5%60); } } };
  const sleptK=id=>{ const P=plan(); return DB.days.findIndex(d=>((P.anchors||{})[d.date]||{}).end&&P.anchors[d.date].end.id===id); };
  function sleepPick(id,cls){ const P=plan(), k0=sleptK(id);
    const pills=DB.days.slice(0,-1).map((d,k)=>{ const fn=sleepFn(id,k), bs=k===k0?[]:c.trial(fn)||[], m=clone({id:'t',days:P.days,stay:P.stay||{},start:P.start||{},stayDay:P.stayDay||{},anchors:P.anchors||{}}); fn(m);
      const e=SIMc().schedule(d,null,m,{deadline:S.dayEnd}).end, why=bs.length?c.breakLine(bs,d):'';
      return `<button type="button" class="pl-chip pl-chip--choice pl-day" style="--day:var(--d${k%6+1})" data-act="sleep" data-id="${esc(id)}" data-day="${k}"${k===S.day?' aria-current="date"':''}${bs.length?' data-warn':''}${why?` data-why="${esc(dlabel(d)+'：'+why)}"`:''}${k===k0?' disabled':''}><b>${+d.date.slice(8)}</b><small>${hm(e)}</small><span class="sr">${esc(pt('sleepS',{d:dlabel(d),name:nm(place(id))}))}${why?esc('：'+why):''}</span></button>`; }).join('');
    return `<div class="pl-dayq ${cls||''}" data-arm role="group" aria-label="${esc(pt('sleepQ'))}"><p class="pl-dayq__k">${pt('sleepQ')}${k0>=0?` <small>${esc(pt('sleptOn',{d:dlabel(DB.days[k0])}))}</small>`:''}</p>
      <div class="pl-dayq__days">${pills}</div>${k0>=0?BTN('ghost',pt('unsleep'),{act:'unsleep',id,'data-day':k0}):''}</div>`; }
  function dayPick(id,cls,c){
    if(!c&&sleeps(place(id))) return sleepPick(id,cls);
    const ids=addIds(c,id), many=!!c, shut=ids.filter(x=>closure(place(x)));
    const pills=DB.days.map((d,k)=>{ const pv=ids.length?preview(k,ids,c):null, br=pv?pv.breaks:[], warn=br.length>0||shut.length>0;
      const why=[...new Set(br.map(b=>breakText(b,d)).concat(shut.map(x=>nm(place(x))+'：'+pt('closureAsk'))))].join('・');
      return `<button type="button" class="pl-chip pl-chip--choice pl-day" style="--day:var(--d${k%6+1})" data-act="${many?'addallday':'addday'}" data-id="${esc(id)}" data-day="${k}"${k===S.day?' aria-current="date"':''}${br.length?' data-warn':''}${warn?` data-why="${esc(dlabel(d)+'：'+why)}"`:''}${pv?'':' disabled'}><b>${+d.date.slice(8)}</b>`+
        (pv?`<small>${br.length?ic('alert','sm'):''}${cmin(pv.dDrive)}</small><small>${hm(pv.sc.end)}</small>`:'<small>—</small>')+
        `<span class="sr">${esc(pt('addNTo',{name:many?(ja()?c.nameJa||c.name:c.name)||pt('impGroup'):nm(place(id)),d:dlabel(d)}))}${pv?esc('（'+pt('addDrive',{d:cmin(pv.dDrive)})+'、'+pt('endsAt',{t:hm(pv.sc.end)})+'）'):''}${warn?esc('：'+why):''}</span></button>`; }).join('');
    return `<div class="pl-dayq ${cls||''}" data-arm role="group" aria-label="${esc(pt('whichDay'))}"><p class="pl-dayq__k">${pt('whichDay')} <small>${pt('pillKey')}</small></p>
      ${shut.length?STAT('alert',pt('closureAsk'),{cls:'pl-stat--warn'}):''}
      <div class="pl-dayq__days">${pills}</div></div>`;
  }
  function nowAdd(b,ids,cl,then){ const d=DB.days[S.day], pv=preview(S.day,ids,cl), br=pv?pv.breaks:[], shut=ids.filter(x=>closure(place(x)));
    const go=()=>{ if(applyAdd(S.day,ids,cl)) then(); };
    if(br.length||shut.length) c.arm(b,[...new Set(br.map(x=>breakText(x,d)).concat(shut.map(x=>nm(place(x))+'：'+pt('closureAsk'))))].join('・'),go); else go(); }
  /* a ⚠ day pill lands armed in its picker (確定 / やめる); a clean one acts at once */
  const viaPill=(b,go)=>{ if(b.dataset.why) c.arm(b,b.dataset.why,go); else go(); };

  const pad=n=>String(n).padStart(2,'0');
  function openPlace(id,back){
    const p=place(id); if(!p) return;
    const day=DB.days[S.day], on=plannedMap().get(id), isBase=!isCand(p), hrs=hoursText(p,day.date);
    const handle=p.ig?(/instagram\.com\/([^/?#]+)/.exec(p.ig)||[])[1]:'';
    const igBtn=p.imp&&p.imp.src==='ig'?`<a class="pl-btn pl-btn--secondary" href="${esc(p.imp.url)}" target="_blank" rel="noopener">${ic('instagram','sm')}${pt('openReel')}</a>`
      :p.ig?`<a class="pl-btn pl-btn--secondary" href="${esc(p.ig)}" target="_blank" rel="noopener">${ic('instagram','sm')}<span lang="en">@${esc(handle)}${p.igN?` · ${esc(p.igN)}`:''}</span></a>`
      :p.igTag?`<a class="pl-btn pl-btn--secondary" href="https://www.instagram.com/explore/tags/${encodeURIComponent(p.igTag)}/" target="_blank" rel="noopener">${ic('instagram','sm')}<span>${esc(pt('tagSearch',{t:p.igTag}))}</span></a>`:'';
    /* coordinates (or the place's own mapsAt, e.g. a car park), so the link works without a name search */
    const at=p.mapsAt&&isFinite(p.mapsAt.lat)?p.mapsAt:p, gmap=`https://www.google.com/maps/search/?api=1&query=${(+at.lat).toFixed(5)},${(+at.lon).toFixed(5)}`;
    const gmLabel=p.mapsAt&&p.mapsAt.label?(ja()?p.mapsAt.labelJa||p.mapsAt.label:p.mapsAt.label):nm(p);
    let action='';
    if(sleeps(p)) action=sleepPick(id,'pl-dayq-big');
    else if(!isBase){
      if(on===S.day) action=BTN('secondary',pt('removeFrom',{d:dlabel(day)}),{act:'unplan',id},'x');
      else if(on!=null) action=BTN('primary',pt('moveHere',{d:dlabel(day)}),{act:'movehere',id},'calendar')+`<p class="pl-hint">${pt('inDay',{d:dlabel(DB.days[on])})}</p>`;
      else action=dayPick(id,'pl-dayq-big');
    }
    const more=DB.more&&DB.more[id], evid=more&&(more.evidence||[]).filter(x=>!/^coords:/i.test(x)).slice(0,4);
    const G=c.gal(p);
    const ph=photoHTML(p,'pl-place__photo',!G.length)||colorCard(p,'pl-place__photo');
    const t=c.tierOf(id), tier=isBase||p.imp?'':`<div class="pl-tier" role="group" aria-label="${esc(pt('tierOfN',{name:nm(p)}))}">${['must','want','maybe','skip'].map(k=>`<button type="button" data-act="tiers" data-t="${k}" data-id="${id}" aria-pressed="${t===k}">${pt('t_'+k)}</button>`).join('')}</div>`;
    const bd=p.badge&&!(p.igN&&/^IG\b/.test(p.badge.ja||''))&&(p.badge[lang()]||p.badge.ja);   /* the IG count lives on the IG button */
    const fl=flagsOf(p).filter(f=>!(p.book&&/^book/.test(f))&&f!=='near-fully-booked');   /* booking is said once, by the 要予約 control */
    /* DOM order (docs/DESIGN.md P1-6): name → tier → the one action → gallery (shown on top by CSS) → details */
    openSheet(`<div class="pl-place">${back?BTN('ghost',pt('backList'),{act:'back'},'chevron-left'):''}
      <div class="pl-sheet__head"><h2 class="pl-sheet__title" id="pl-sht-${slug}"${nmLang(p)}>${wbr(nm(p))}</h2>${closeBtn()}</div>
      <p class="pl-sheet__sub">${p.imp?pt(p.imp.src==='ig'?'fromIg':'fromGm')+(p.imp.regionJa||p.imp.region?' · '+esc(ja()?p.imp.regionJa||p.imp.region:p.imp.region):''):`${alt(p)?`<span${altLang(p)}>${esc(alt(p))}</span> · `:''}${tr(CAT,p.cat)} · ${tr(AREA,p.area)}`}${savedTag(p)}${bd?` <span class="pl-badge">${esc(bd)}</span>`:''}</p>
      ${tier}
      <div class="pl-place__act">${action}</div>
      <div class="pl-place__media">${G.length?galHTML(G,ph):ph}</div>
      <div class="pl-place__links">${igBtn}<a class="pl-btn pl-btn--secondary" href="${esc(gmap)}" target="_blank" rel="noopener">${ic('map-pin','sm')}<span${latin(gmLabel)&&ja()?' lang="en"':''}>${esc(gmLabel)}</span><span class="sr">（${pt('gmaps')}）</span></a></div>
      ${p.vibe||p.vibeJa?`<p class="pl-place__vibe">${esc(ja()?(p.vibeJa||p.vibe):p.vibe)}</p>`:''}
      ${p.reels&&p.reels.length?`<div class="pl-list">${p.reels.map(m=>ROW({media:ic(m.src==='ig'?'instagram':'map-pin'),title:`<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.ig||m.name)}</a>`,meta:m.note?esc(m.note):''})).join('')}</div>`:''}
      ${isBase||p.imp?'':`<dl class="pl-facts">
        <div><dt>${pt('hoursDay')} ${dlabel(day,true)}</dt><dd${hrs===pt('closedToday')?' data-warn':''}>${hrs}</dd></div>
        <div><dt>${pt('cost')}</dt><dd>${p.cost==='free'?pt('free'):esc(p.cost||'—')}</dd></div>
        ${sleeps(p)?'':`<div><dt>${pt('dur')}</dt><dd>${hmm(p.dur||60)}</dd></div>`}
        <div><dt>${pt('booking')}</dt><dd>${p.book?CHIP(`${ic(S.booked[id]?'check':'bookmark','sm')}<span>${S.booked[id]?pt('booked'):pt('book')}</span>`,!!S.booked[id],{act:'booked',id}):pt('noBook')}</dd></div>
        ${p.best&&p.best!=='any'?`<div><dt>${pt('best')}</dt><dd>${bestText(p,day.date)}</dd></div>`:''}
        ${p.aesthetic?`<div><dt>${pt('aesthetic')}</dt><dd>★${p.aesthetic}<span class="sr">${pt('of5',{n:p.aesthetic})}</span></dd></div>`:''}
      </dl>
      ${fl.length?`<div class="pl-chips">${fl.map(f=>c.flagT(f,p)?`<span class="pl-badge">${c.flagT(f,p)}</span>`:'').join('')}</div>`:''}`}
      ${evid&&evid.length?`<section class="pl-place__why"><h3>${pt('why')}</h3>${ja()?`<p>${p.badge?esc(p.badge.ja):pt('whyJa',{n:evid.length})}</p>`:`<ul>${evid.map(x=>`<li lang="en">${esc(x.replace(/\s*—?\s*https?:\/\/\S+/g,''))}</li>`).join('')}</ul>`}
        ${(more.sources||[]).length?`<p>${[...new Set(more.sources.map(domain).filter(Boolean))].slice(0,5).map(dm=>`<a href="${esc(more.sources.find(u=>domain(u)===dm))}" target="_blank" rel="noopener">${esc(dm)}</a>`).join(' · ')}</p>`:''}</section>`:''}
      <p class="pl-place__coords"><span>${pt('coords')} <span lang="en">${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</span></span>${BTN('ghost',pt('copy'),{act:'copyc','data-v':`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`,cls:'pl-btn--s'})}</p>
      ${p.imp?BTN('secondary',pt('impDel'),{act:'impdel',id:p.imp.id},'trash'):''}</div>`,'place',{id,back});
    if(!DB.more) loadMore().then(()=>{ const a=c.arg(); if(c.kind()==='place'&&a&&a.id===id) openPlace(id,back); });
    if(!DB.gallery) c.loadGallery();
    const gl=E.sbody.querySelector('.pl-gal'); if(gl) wireGal(gl);
  }
  /* ---------- the place's gallery: a scroll-snap strip, one dot per picture, the credit on each.
     Tapping a picture shows it whole (uncropped, its own ratio); tapping again crops it back. A picture
     that fails is dropped (core) and the dots follow; with none left, the photo or the colour card. ---------- */
  const lic=x=>x.lic==='site'?pt('licSite'):x.lic||'';
  /* one region: the strip (pictures not focusable), one 「写真 1/6」 control that steps through them, one credit line */
  const galHTML=(G,fb)=>`<div class="pl-gal" role="group" aria-label="${esc(pt('galT'))}"><div class="pl-gtrack">${G.map(x=>`<figure class="pl-gf" data-gw data-by="${esc((x.by||'')+(lic(x)?' · '+lic(x):''))}" data-page="${esc(x.page||'')}">
      <button type="button" class="pl-gz" data-act="gzoom" tabindex="-1" aria-hidden="true" data-ar="${x.w&&x.h?x.w+'/'+x.h:'3/2'}">${c.gx().gimg(x,'(min-width:640px) 640px, 100vw')}</button></figure>`).join('')}</div>
    <div class="pl-gal__bar">${BTN('ghost','',{act:'gnext',cls:'pl-gal__n pl-btn--s'})}<a class="pl-gal__cap" target="_blank" rel="noopener"></a></div><div class="pl-gdots" aria-hidden="true"></div><div class="pl-gfb">${fb}</div></div>`;
  function wireGal(gl){
    const tr=gl.querySelector('.pl-gtrack'), dots=gl.querySelector('.pl-gdots');
    const at=()=>Math.round(tr.scrollLeft/Math.max(1,tr.clientWidth));
    const nb=gl.querySelector('.pl-gal__n'), cap=gl.querySelector('.pl-gal__cap');
    const paint=()=>{ const n=tr.children.length, i=Math.max(0,Math.min(at(),n-1)), f=tr.children[i];
      dots.innerHTML=n>1?[...tr.children].map((_,k)=>`<i${k===i?' aria-current="true"':''}></i>`).join(''):'';
      nb.textContent=pt('galN2',{i:i+1,n}); nb.hidden=n<2; if(f){ cap.textContent=f.dataset.by; if(f.dataset.page) cap.href=f.dataset.page; else cap.removeAttribute('href'); } };
    nb.addEventListener('click',()=>{ const n=tr.children.length; tr.scrollTo({left:((at()+1)%n)*tr.clientWidth,behavior:'smooth'}); });
    let q=0; tr.addEventListener('scroll',()=>{ if(!q) q=requestAnimationFrame(()=>{ q=0; paint(); }); },{passive:true});
    gl.addEventListener('error',()=>setTimeout(paint),true);
    paint();
  }

  /* ---------- the 「案」 menu (docs/DESIGN.md "First run"): マイプラン, her saved versions as photo
     rows, ＋ 今の日程を保存 (its one primary), autosaves folded away, すべての日を空にする with undo;
     then the paste-a-link and sync boxes and the day-end setting ---------- */
  function openPlans(){
    const cur=plan(), when=t=>{ const d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); };
    const row=(P,sub,tools)=>{ let d=0, w=0; DB.days.forEach(x=>{ const sc=schedule(x,null,P); d+=sc.drive; w+=sc.rows.reduce((t,r)=>t+r.warns.length,0); });
      const h=[...new Set(Object.values(P.days).flat())].map(place).filter(p=>p&&DB.photos&&DB.photos[p.id]).sort((a,b)=>(b.aesthetic||0)-(a.aesthetic||0))[0], ph=h&&DB.photos[h.id];
      return c.ROW({media:ph?`<img src="${esc(ph.thumb||ph.src)}" alt="" width="64" height="42" loading="lazy" decoding="async">`:ic('map'),
        title:`<button type="button" class="pl-row__name" data-act="plan" data-id="${P.id}" aria-pressed="${cur.id===P.id}">${esc(planName(P))}</button>`,
        meta:(sub?`<span>${esc(sub)}</span>`:'')+c.STAT('car',c.hmm(d))+(w?c.BADGE(w,true):''), trail:tools||''},{cls:cur.id===P.id?'pl-row--current':''}); };
    const vs=S.versions.filter(v=>v.kind!=='auto'), auto=S.versions.filter(v=>v.kind==='auto');
    const tools=v=>`<details class="pl-menu"><summary class="pl-btn pl-btn--icon">${ic('more')}<span class="sr">${esc(pt('verTools',{name:planName(v)}))}</span></summary><div class="pl-menu__list">
      ${c.BTN('ghost',pt('rename2'),{act:'vername',id:v.id},'pencil')}${c.BTN('ghost',pt('del'),{act:'verdel',id:v.id},'trash')}</div></details>`;
    openSheet(head(pt('planT'),'')+`<div class="pl-plans">${row(S.my,pt('myEdit'))}
        ${vs.map(v=>row(v,v.at?when(v.at):'',tools(v))).join('')}
        ${auto.length?`<details class="pl-plans__auto"><summary>${pt('autoN',{n:auto.length})}</summary>${auto.map(v=>row(v,'',tools(v))).join('')}</details>`:''}</div>
      ${c.BTN('primary',pt('saveNow'),{act:'savever'},'plus')}
      ${c.BTN('secondary',pt('clearAll'),{act:'reset'},'trash')}
      <details class="pl-plans__more"><summary>${pt('more3')}</summary>
      <section class="pl-pastebox"><h3>${pt('pasteT')}</h3><p class="pl-hint">${pt('pasteS')}</p>
        ${c.FIELD({ico:'download',ph:pt('pasteT'),clear:pt('clear'),in:{cls:'pl-paste',name:'paste',type:'url',inputmode:'url',enterkeyhint:'go'}})}
        ${c.BTN('secondary',pt('pasteClip'),{act:'pasteclip'})}${c.BTN('secondary',pt('pasteGo'),{act:'pastego'})}</section>
      <section class="pl-syncbox"></section>
      <label class="pl-dayend"><span>${pt('dayEnd')}</span><input class="pl-dayendin" name="dayend" type="time" step="900" value="${c.hhmm(S.dayEnd)}"></label></details>`,'plans');
    /* sync: the paired phone's box (planner-sync), else the one field that pairs an installed app */
    const sb=E.sbody.querySelector('.pl-syncbox'); if(c.sync()) c.sync().box(sb);
    else sb.innerHTML=`<h3>${pt('syncT2')}</h3>${c.FIELD({ico:'share',ph:pt('pairPh'),clear:pt('clear'),in:{cls:'pl-pairin',name:'pair',type:'text'}})}${c.BTN('secondary',pt('pairGo'),{act:'pairgo'})}`;
  }
  return {
    codeNow:()=>pack(payload()), moveFn,
    openBrowse, renderList, patchCand, openPlace, openPlans, dayPick, openMove, openStory, applyAdd, groupSheet, nameSheet, renderReview,
    cGroups, cbar, openOrder, openVerName, saveVersionNamed, openSwap, shareLink, importCode, codeOf,
    nameState,
    click(act,b,kind,arg){
      const day=DB.days[S.day], date=day.date;
      switch(act){
        case 'cgto': intoGroup(arg.ids,b.dataset.id); closeSheet(); unsel(); break;
        case 'cgnew': intoGroup(arg.ids,null,((E.sbody.querySelector('.pl-cgname')||{}).value||'').trim()); closeSheet(); unsel(); break;
        case 'cgren': { const v=((E.sbody.querySelector('.pl-cgname')||{}).value||'').trim(); if(v) c.editTrip(x=>{ const g=x.groups.find(o=>o.id===arg.id); if(g) g.name=v.slice(0,40); },null); closeSheet(); break; }
        case 'back': openBrowse(); break;
        case 'plan': { const was=S.planId; if(was===b.dataset.id){ closeSheet(); break; } pushHist(); S.planId=b.dataset.id; save(); closeSheet(); render(true); requestAnimationFrame(()=>fitDay());
          toast(pt('nowOn',{name:planName(plan())}),undo); break; }
        /* すべての日を空にする: no question first, an undo toast after (docs/DESIGN.md rule 4) */
        case 'reset': edit(m=>{ DB.days.forEach(d=>{ m.days[d.date]=[]; }); m.start={}; m.stayDay={}; m.anchors={}; },pt('clearedAll')); closeSheet(); break;
        case 'verdel': { const v=findPlan(b.dataset.id); if(!v) break; pushHist();
          S.versions=S.versions.filter(x=>x!==v); if(S.planId===v.id) S.planId='my';
          save(); render(); openPlans(); toast(pt('verDeleted',{name:planName(v)}),undo); break; }
        case 'savever': openVerName(null); break;
        case 'vername': openVerName(b.dataset.id); break;
        case 'domove': { if(kind!=='move'||arg.date!==date) break; const id=arg.id, to=DB.days[+b.dataset.day], i=idsOf(date).indexOf(id); if(i<0) break;
          if(c.guard(b,'mv'+id+to.date,moveFn(id,date,to),pt('movedTo',{d:dlabel(to)}),{focus:i})) closeSheet(); break; }
        case 'open': openPlace(b.dataset.id,kind==='browse'); break;
        /* ＋ in a day's drawer: added to that day at once; a ⚠ lands armed on the row first */
        case 'addnow': { const id=b.dataset.id; nowAdd(b,[id],null,()=>patchCand(id)); break; }
        case 'sleep': { const id=b.dataset.id, k=+b.dataset.day;
          viaPill(b,()=>{ if(edit(sleepFn(id,k),pt('sleepS',{d:dlabel(DB.days[k]),name:nm(place(id))}))){ if(kind==='place') openPlace(id,arg.back); else { const q=b.closest('.pl-dayq'); if(q) q.remove(); } } }); break; }
        case 'unsleep': { const id=b.dataset.id, k=+b.dataset.day, d=DB.days[k], n=DB.days[k+1];
          if(edit(m=>{ const a=m.anchors||{}; if(a[d.date]) delete a[d.date].end; if(n&&a[n.date]&&a[n.date].start&&a[n.date].start.id===id) delete a[n.date].start; },pt('unslept',{name:nm(place(id))}))&&kind==='place') openPlace(id,arg.back); break; }
        case 'addday': { const id=b.dataset.id, k=+b.dataset.day;
          viaPill(b,()=>{ if(!applyAdd(k,[id],null)) return; if(kind==='place') openPlace(id,arg.back); else patchCand(id); }); break; }
        case 'unplan': { const id=b.dataset.id, back=arg.back; if(c.guard(b,'un'+id,m=>{ const l=m.days[date], k=l.indexOf(id); if(k>=0) l.splice(k,1); },pt('removed',{name:nm(place(id))}))) openPlace(id,back); break; }
        case 'movehere': { const id=b.dataset.id, back=arg.back, on=plannedMap().get(id); if(on==null) break; const from=DB.days[on].date;
          if(c.guard(b,'mh'+id+date,m=>{ const a=m.days[from]; a.splice(a.indexOf(id),1); const l=(m.days[date]=m.days[date]||[]); l.splice(c.sim().bestPos(day,l,id,m,{deadline:S.dayEnd}).pos,0,id); },pt('movedTo',{d:dlabel(day)}))) openPlace(id,back); break; }
        /* まとめて追加: the members the list shows (and not yet placed), into this day at once */
        case 'addall': { const cl=clusterOf(b.dataset.id); if(!cl) break; const sub=b.dataset.ids?Object.assign({},cl,{ids:b.dataset.ids.split(' ')}):cl, add=addIds(sub);
          if(!add.length){ toast(pt('nothingAdded')); break; } nowAdd(b,add,sub,()=>add.forEach(patchCand)); break; }
        case 'addallday': { const c=S.clv&&S.clv.id===b.dataset.id?S.clv:clusterOf(b.dataset.id); if(!c) break;
          const add=addIds(c); if(!add.length){ toast(pt('nothingAdded')); break; }
          viaPill(b,()=>{ if(!applyAdd(+b.dataset.day,add,c)) return; add.forEach(patchCand); const q=b.closest('.pl-dayq'); if(q) q.remove(); }); break; }
        case 'clearf': S.f={q:'',cat:null,area:null,saved:null,sort:S.f.sort}; openBrowse(); break;
        case 'dayend': break;
        case 'pairgo': { const i=E.sbody.querySelector('.pl-pairin'), v=i?i.value:''; if(i) i.value=''; c.loadSync().then(()=>c.sync()&&c.sync().pairText(v)).then(ok=>{ if(ok&&c.kind()==='plans') openPlans(); }); break; }
        case 'tiers': { const id=b.dataset.id, t=b.dataset.t, now=c.tierOf(id); c.editTrip(x=>{ x.tier[id]=now===t?'':t; },null); openPlace(id,arg.back); break; }
        case 'gzoom': { const gl=b.closest('.pl-gal'), tr=gl.querySelector('.pl-gtrack'), i=[...tr.children].indexOf(b.parentNode);
          gl.style.setProperty('--ar',b.dataset.ar); gl.classList.toggle('pl-gfull'); tr.scrollLeft=i*tr.clientWidth; break; }
        case 'copyc': { const v=b.dataset.v; (navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast(pt('copiedC')),()=>toast(v)); break; }
        case 'f': { const k=b.dataset.k, v=b.dataset.v; S.f[k]=S.f[k]===v||!v?null:v;
          b.parentNode.querySelectorAll('.pl-chip').forEach(c=>c.setAttribute('aria-pressed',(S.f[c.dataset.k]||'')===c.dataset.v)); renderList(); break; }
        case 'tf': S.f.tier=b.dataset.v||null; renderList(); break;
        case 'sort': S.f.sort=b.dataset.v; b.parentNode.querySelectorAll('button').forEach(c=>c.setAttribute('aria-pressed',c===b)); renderList(); break;
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
        case 'pastego': { const i=E.sbody.querySelector('.pl-paste'); importCode(codeOf(i&&i.value)).then(ok=>{ if(ok) closeSheet(); }); break; }
        case 'pasteclip': pasteFromClipboard(); break;
      }
    }
  };
};
})();
