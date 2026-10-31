/* PLANNER — an editable day-by-day itinerary for one book, as a tab (.v-plan) of its guide.
   One function, planner(g), like packing(g) and map(g): it returns early when the guide has no
   .v-plan, and everything it touches is scoped by the guide's slug. It assumes only what the book
   provides: LS.get/LS.set (strings), <html lang> plus the document 'langchange' event, span.u for
   distances (and LS 'units'), and the #i-* sprite. Runtime strings live in PT.
   Data (data-src, default data/<slug>/): places.json + plans.json first; travel.json, routes.json,
   photos.json and places-more.json after first paint. Times match tools/check_plans.py exactly.
   Storage: LS 'plan:<slug>' {v:1, active, my, versions, imports, booked} and
            'plan-ui:<slug>' {v:1, day, map, hideInstall, hideIntro, routes, rorder}. */
var planner=(function(){
'use strict';

/* ---------- strings: {key:{ja,en}}; {x} placeholders ---------- */
const PT={
  plan:{ja:'プラン',en:'Plan'}, my:{ja:'マイプラン',en:'My plan'}, share:{ja:'共有',en:'Share'}, browse:{ja:'候補をさがす',en:'Browse places'},
  zoomIn:{ja:'拡大',en:'Zoom in'}, zoomOut:{ja:'縮小',en:'Zoom out'}, fit:{ja:'この日に合わせる',en:'Fit to day'},
  expand:{ja:'地図を大きく',en:'Enlarge map'}, shrink:{ja:'地図を小さく',en:'Shrink map'},
  mapHide:{ja:'地図をたたむ',en:'Hide map'}, mapShow:{ja:'地図をひらく',en:'Show map'}, mapTitle:{ja:'ニュージーランド北島と行き先',en:'North Island and the stops'},
  estRoute:{ja:'≈ の線は道路の形が未取得',en:'≈ lines are not road-shaped yet'},
  days:{ja:'日付',en:'Days'}, depart:{ja:'出発',en:'Start'}, arrive:{ja:'到着',en:'End'}, startTime:{ja:'出発時刻',en:'Start time'},
  dayN:{ja:'{n}日目',en:'Day {n}'}, stops:{ja:'{n}か所',en:'{n} stops'}, drive:{ja:'運転 {d}',en:'Drive {d}'}, ends:{ja:'着 {t}',en:'In by {t}'},
  slack:{ja:'{t}まで 余裕{d}',en:'{d} spare before {t}'}, over:{ja:'{t}を{d}超過',en:'{d} past {t}'}, overFlight:{ja:'フライト（{t}）に間に合いません',en:'Misses the flight ({t})'},
  broke:{ja:'{name}：{w}',en:'{name}: {w}'}, moveOpen:{ja:'朝に移す',en:'Move to its open hours'}, movedOpen:{ja:'{name}を開いている時間へ移しました',en:'Moved {name} into its open hours'},
  tapAgainDo:{ja:'もう一度タップで確定',en:'tap again to go ahead'}, thisOrder:{ja:'この並びだと：{w}',en:'With this order: {w}'}, keepIt:{ja:'このままにする',en:'Keep it'}, endsAt:{ja:'{t}着',en:'ends {t}'},   wait:{ja:'{t}開店まで待ち {d}',en:'{d} wait until {t}'}, estT:{ja:'直線距離からの概算',en:'Estimate from straight-line distance'},
  ferry:{ja:'フェリー',en:'Ferry'}, board:{ja:'乗船 {d}前',en:'board {d} before'}, sail:{ja:'{t}発 ⛴ {d}',en:'⛴ {t}, {d}'}, sailAny:{ja:'⛴ {d}',en:'⛴ {d}'},
  unverified:{ja:'未確認',en:'Unverified'}, toTerm:{ja:'港まで',en:'to the wharf'}, fromTerm:{ja:'港から',en:'from the wharf'},
  closed:{ja:'{w}曜は定休日',en:'Closed on {w}'}, closedAt:{ja:'{t}閉店に間に合いません',en:'Closes {t} before the visit ends'},
  hoursUnknown:{ja:'営業時間 未確認',en:'Hours unverified'}, overnight:{ja:'日付をまたぎます',en:'Runs past midnight'},
  dark:{ja:'日没（{t}）後まで屋外',en:'Outdoors after sunset ({t})'}, darkDrive:{ja:'日没（{t}）後の運転',en:'Driving after sunset ({t})'},
  tide:{ja:'干潮（{t}）から外れています',en:'Outside low tide ({t})'}, tideCheck:{ja:'潮位を確認',en:'Check the tide'},
  ferryMiss:{ja:'{t}の便に間に合いません',en:'Misses the {t} sailing'}, ferryBack:{ja:'帰りの便（{t}）に間に合いません',en:'Misses the last sailing back ({t})'},
  ferryDay:{ja:'{w}曜は運航なし',en:'No sailing on {w}'}, longDrive:{ja:'運転が長い日 {d}',en:'Long driving day: {d}'},
  tight:{ja:'余裕 {d}',en:'{d} to spare'}, sunrise:{ja:'日の出 {t}',en:'Sunrise {t}'}, sunsetAt:{ja:'日没 {t}',en:'Sunset {t}'},
  book:{ja:'要予約',en:'Book ahead'}, booked:{ja:'予約済み',en:'Booked'}, bookedN:{ja:'予約 {a}/{b}',en:'Booked {a}/{b}'},
  markBooked:{ja:'予約済みにする：{name}',en:'Mark booked: {name}'},
  free:{ja:'無料',en:'Free'}, always:{ja:'終日',en:'All day'}, closedToday:{ja:'休業',en:'Closed'},
  stay:{ja:'滞在',en:'Stay'}, walkN:{ja:'徒歩 {d}',en:'Walk {d}'}, tideOk:{ja:'干潮 {t} に合っています',en:'Fits low tide {t}'},
  landed:{ja:'着陸',en:'Land'}, limitHint:{ja:'{t} = 1日の終わりの目安（設定で変更）',en:'{t} is the end-of-day guide (change it in Plan)'}, limitFlight:{ja:'{t} = フライトに間に合う空港着',en:'{t} = at the airport in time for the flight'}, limitAnchor:{ja:'{t} = {name}に着く期限（このプランの設定）',en:'{t} = this plan’s time to reach {name}'},
  overAt:{ja:'{name}の期限{t}を{d}超過',en:'{d} past the {t} limit at {name}'}, dawn:{ja:'日の出（{t}）前に屋外',en:'Outdoors before sunrise ({t})'}, missRise:{ja:'日の出（{t}）に間に合いません',en:'Misses sunrise ({t})'}, missSet:{ja:'日の入り（{t}）に間に合いません',en:'Misses sunset ({t})'},
  goldRise:{ja:'日の出（{t}）の時間帯から外れています',en:'Not at sunrise ({t})'}, goldSet:{ja:'夕日（{t}）の時間帯から外れています',en:'Not at sunset ({t})'},
  clearDay:{ja:'この日を空にする',en:'Clear this day'}, cleared:{ja:'{d} を空にしました',en:'Cleared {d}'},   noFit:{ja:'開いている時間に入りません',en:'No slot while it is open'},
    stayDec:{ja:'{name} の滞在を15分短く',en:'15 min shorter at {name}'}, stayInc:{ja:'{name} の滞在を15分長く',en:'15 min longer at {name}'},
  swap:{ja:'入れ替え',en:'Swap'}, move:{ja:'日を移動',en:'Move day'}, del:{ja:'外す',en:'Remove'}, note:{ja:'メモ',en:'Note'},
  swapN:{ja:'入れ替え：{name}',en:'Swap {name}'}, moveN:{ja:'日を移動：{name}',en:'Move {name} to another day'}, delN:{ja:'外す：{name}',en:'Remove {name}'},
  noteN:{ja:'メモ：{name}',en:'Note for {name}'}, notePh:{ja:'メモ（ふたりで共有）',en:'A note for both of you'},
  orderN:{ja:'並べ替え：{name}',en:'Reorder {name}'},     focus:{ja:'地図で見る：{name}',en:'Show {name} on the map'}, emptyDay:{ja:'この日はまだ空いています。',en:'Nothing planned yet.'}, addHere:{ja:'この日に追加',en:'Add to this day'},
  prevDay:{ja:'前の日',en:'Previous day'}, nextDay:{ja:'次の日',en:'Next day'}, story:{ja:'ストーリー画像',en:'Story image'}, storySoon:{ja:'ストーリー画像は準備中です',en:'Story images are coming soon'},
        moveT:{ja:'別の日へ移す',en:'Move to another day'}, moveS:{ja:'移した日の中で、いちばん遠回りにならない位置に入ります',en:'Goes where it adds the least time that day'},
  movedTo:{ja:'{d} に移しました',en:'Moved to {d}'}, reordered:{ja:'順番を変えました',en:'Reordered'},
  removed:{ja:'{name} を外しました',en:'Removed {name}'}, added:{ja:'{d} に追加しました',en:'Added to {d}'},
  addedN:{ja:'{n}件を {d} に追加しました',en:'Added {n} to {d}'}, nothingAdded:{ja:'すべて予定済みです',en:'All already planned'},
    undo:{ja:'元に戻す',en:'Undo'}, forked:{ja:'マイプランに保存',en:'Saved to My plan'}, keptAs:{ja:'前のマイプランは「{name}」に残しています',en:'your previous My plan is kept as “{name}”'},
  editedName:{ja:'{name}（編集）',en:'{name} (edited)'},
      reset:{ja:'マイプランを消す',en:'Delete My plan'}, resetDone:{ja:'「{name}」に戻しました',en:'Back to “{name}”'},             all:{ja:'すべて',en:'All'},   creditBook:{ja:'写真：旅のしおり',en:'Photo: travel book'}, saved:{ja:'保存済み',en:'Saved'}, savedS:{ja:'Google マップに保存済み',en:'Saved in Google Maps'}, count:{ja:'{n}件',en:'{n} places'},
    noMatch:{ja:'条件に合う候補はありません。絞り込みを外してください。',en:'No places match. Clear a filter.'},
      needBook:{ja:'必要',en:'Required'},     gmaps:{ja:'Google マップ',en:'Google Maps'}, insta:{ja:'Instagram',en:'Instagram'},   copiedC:{ja:'座標をコピーしました',en:'Coordinates copied'},
  offlineLink:{ja:'電波がないと開けません',en:'Needs a connection'},
  loadFail:{ja:'データを読み込めませんでした。再読み込みしてください。',en:'Could not load the data. Reload the page.'},
  close:{ja:'閉じる',en:'Close'}, done:{ja:'完了',en:'Done'},
    autoSaved:{ja:'自動保存 {t}',en:'Autosave {t}'},
        shared:{ja:'共有された案 {t}',en:'Shared {t}'}, verDeleted:{ja:'「{name}」を削除しました',en:'Deleted “{name}”'},
  compare:{ja:'くらべる',en:'Compare'},       noUndo:{ja:'これ以上は戻せません',en:'Nothing left to undo'}, undone:{ja:'元に戻しました',en:'Undone'},
  saveFail:{ja:'保存できませんでした（容量）。古い自動保存を消すと空きます。',en:'Could not save (storage full). Deleting old autosaves frees space.'},
  purgeAuto:{ja:'自動保存を消す',en:'Delete autosaves'}, purged:{ja:'自動保存を消しました',en:'Autosaves deleted'},
  intro:{ja:'6日間のNZ旅。日付をタップして予定を見て、「候補をさがす」から足せます。',en:'Six days in New Zealand. Tap a date to see its plan, and add places from Browse.'},
  lineMsg:{ja:'LINE のブラウザでは保存や地図の操作がうまく動きません。Safari で開いてください。',en:'LINE’s browser breaks saving and the map. Open this in Safari.'},
  lineBtn:{ja:'Safariで開く',en:'Open in Safari'},
  installMsg:{ja:'ホーム画面に追加すると、オフラインでも開けて、保存した案が消えにくくなります。共有ボタン →「ホーム画面に追加」。',en:'Add to Home Screen to open offline and keep your saved versions. Share → Add to Home Screen.'},
  dismiss:{ja:'閉じる',en:'Dismiss'},
  foot:{ja:'時刻はすべて NZ 夏時間。運転時間は渋滞なしの目安で、オークランドの朝夕は20〜40分増えます。距離は概算です。',
        en:'All times NZDT. Drive times are free-flow; Auckland peak adds 20–40 min. Distances are approximate.'},
  imp:{ja:'取り込み',en:'Imported'}, impT:{ja:'取り込む',en:'Import'},
  impS:{ja:'保存しておいた場所を候補に足します。ファイルはこの端末の中だけで読みます。',en:'Add places you saved elsewhere. Files are read on this phone only.'},
                          reading:{ja:'読み込み中…',en:'Reading…'},                           impDel:{ja:'この取り込みを削除',en:'Delete this import'}, impDeleted:{ja:'取り込みを削除しました',en:'Import deleted'},
      openReel:{ja:'リールを見る',en:'Open reel'}, 
};
const CAT={imp:{ja:'取り込み',en:'Imported'},hike:{ja:'ハイク',en:'Hike'},beach:{ja:'ビーチ',en:'Beach'},view:{ja:'眺め',en:'View'},cafe:{ja:'カフェ',en:'Cafe'},food:{ja:'食',en:'Food'},
  sight:{ja:'名所',en:'Sight'},activity:{ja:'体験',en:'Activity'},town:{ja:'町',en:'Town'},camp:{ja:'キャンプ',en:'Camp'},swim:{ja:'泳ぐ',en:'Swim'}};
/* Category glyphs reuse the book's sprite ids where it has one. */
const GLYPH={imp:'download',hike:'mountain',beach:'waves',view:'sunset',cafe:'teacup',food:'bowl',sight:'sparkles',activity:'ticket',town:'building',camp:'tent',swim:'droplets'};
const FAMILY=c=>c==='cafe'||c==='food'?'eat':c;            /* 食 and カフェ swap for each other */
const AREA={imported:{ja:'取り込み',en:'Imported'},west:{ja:'西オークランド',en:'West Auckland'},city:{ja:'市内',en:'City'},east:{ja:'東',en:'East'},north:{ja:'北',en:'North Shore'},south:{ja:'南',en:'South'},
  waiheke:{ja:'ワイヘキ島',en:'Waiheke'},gulf:{ja:'ハウラキ湾',en:'Hauraki Gulf'},waikato:{ja:'ワイカト',en:'Waikato'},coromandel:{ja:'コロマンデル',en:'Coromandel'},
  taranaki:{ja:'タラナキ',en:'Taranaki'},taupo:{ja:'タウポ',en:'Taupō'},northland:{ja:'ノースランド',en:'Northland'},rotorua:{ja:'ロトルア',en:'Rotorua'}};
const BEST={morning:{ja:'朝',en:'Morning'},midday:{ja:'昼',en:'Midday'},afternoon:{ja:'午後',en:'Afternoon'},sunset:{ja:'夕暮れ',en:'Sunset'},
  sunrise:{ja:'日の出',en:'Sunrise'},lowtide:{ja:'干潮',en:'Low tide'},any:{ja:'いつでも',en:'Any time'},night:{ja:'夜',en:'Night'}};
/* Research flags are free-form notes; only these are shown, the rest stay in the data. */
/* Flag labels and levels live in data/nz/flags.json ({flag:{ja,en,level}}), loaded right after first
   paint; safety flags come first, in that file's order; 'hidden' ones are said elsewhere (hours, the
   booking toggle) or are authoring notes. tools/check_plans.py --gate fails on any unlabelled flag. */
const FLAG={}, SAFETY=[], FLAGHIDE=new Set();
function setFlags(o){ Object.keys(o||{}).forEach(k=>{ const v=o[k]; if(!v||!v.ja) return; FLAG[k]={ja:v.ja,en:v.en||v.ja};
  if(v.level==='safety') SAFETY.push(k); else if(v.level==='hidden') FLAGHIDE.add(k); }); }
const rankFlag=f=>{ const i=SAFETY.indexOf(f); return i<0?99:i; };
const flagKey=f=>{ f=String(f); const k=FLAG[f]?f:f.split(':')[0]; return FLAG[k]&&!FLAGHIDE.has(k)?k:null; };
const flagsOf=p=>[...new Set((p.flags||[]).map(flagKey).filter(Boolean))].sort((a,b)=>rankFlag(a)-rankFlag(b));
const hasFlag=(p,s)=>(p.flags||[]).some(f=>String(f).indexOf(s)>=0);
const WD=['sun','mon','tue','wed','thu','fri','sat'], WDJA=['日','月','火','水','木','金','土'], WDEN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WDLONG=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---------- the simulation constants, identical to tools/check_plans.py ---------- */
/* Sunrise and sunset at a place: tools/sun.py (NOAA), term for term; minutes after midnight NZDT. */
function sunEv(date,lat,lon){
  const d=new Date(date+'T00:00:00Z'), n=Math.round((d-Date.UTC(d.getUTCFullYear(),0,1))/864e5)+1, g=2*Math.PI/365*(n-1+0.5), C=Math.cos, S=Math.sin;
  const eqt=229.18*(0.000075+0.001868*C(g)-0.032077*S(g)-0.014615*C(2*g)-0.040849*S(2*g));
  const decl=0.006918-0.399912*C(g)+0.070257*S(g)-0.006758*C(2*g)+0.000907*S(2*g)-0.002697*C(3*g)+0.00148*S(3*g);
  const la=lat*Math.PI/180, ch=C(90.833*Math.PI/180)/(C(la)*C(decl))-Math.tan(la)*Math.tan(decl), h=Math.acos(Math.max(-1,Math.min(1,ch)))*180/Math.PI;
  return [720-4*(lon+h)-eqt+780,720-4*(lon-h)-eqt+780];
}
/* Low tides by area (NZDT), copied from tools/check_plans.py; plans.json `tides` overrides it, so the
   table should move there to stop the two drifting. */
const LOW_TIDE={taranaki:{'2027-02-13':['08:42','21:10'],'2027-02-14':['09:36','22:06']},
  west:{'2027-02-11':['07:46','20:09'],'2027-02-12':['08:24','20:49'],'2027-02-13':['09:07','21:33'],'2027-02-14':['09:56','22:25'],'2027-02-15':['10:58','23:30'],'2027-02-16':['12:15']},
  city:{'2027-02-11':['05:03','17:33'],'2027-02-12':['05:42','18:13'],'2027-02-13':['06:26','18:57'],'2027-02-14':['07:14','19:45'],'2027-02-15':['08:10','20:40'],'2027-02-16':['09:14','21:43']}};
const TIDE_WINDOW=90, DEADLINE=22*60+30, LONG_DRIVE=270, OUTDOOR=new Set(['hike','beach','view','swim']);
/* the warnings that make an add or a swap ask twice: closes, past the day's end, after dark, ferry, tide */
const BREAKS=new Set(['closed','closedAt','over','dark','dawn','sunMiss','tide','ferryMiss','ferryBack','ferryDay']);

/* ---------- projection: the book's .map/nz.py prj(), so a pin lands on the book's pixel ---------- */
const LAT0=-40.45, LAT1=-34.30, LON0=172.40, LON1=178.90, W=692, H=824;
const KC=Math.cos((LAT0+LAT1)/2*Math.PI/180), SC=W/((LON1-LON0)*KC);
const prj=(lat,lon)=>[(lon-LON0)*KC*SC,(LAT1-lat)*SC];
const unprj=(x,y)=>[LAT1-y/SC, x/(KC*SC)+LON0];

/* ---------- pure helpers ---------- */
const lang=()=>document.documentElement.lang==='en'?'en':'ja';
const ja=()=>lang()==='ja';
function pt(k,o){ const e=PT[k]; let s=e?e[lang()]:k; if(o) s=s.replace(/\{(\w+)\}/g,(m,x)=>o[x]!=null?o[x]:m); return s; }
const tr=(tbl,k)=>tbl[k]?tbl[k][lang()]:(k||'');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const toMin=s=>{ const m=/^(\d{1,2}):(\d{2})/.exec(s||''); return m?+m[1]*60+ +m[2]:0; };
const okHM=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const hhmm=m=>{ m=((Math.round(m)%1440)+1440)%1440; return pad(Math.floor(m/60))+':'+pad(m%60); };   /* for <input type=time> */
function hm(m){ m=Math.round(m); const d=Math.floor(m/1440), r=((m%1440)+1440)%1440, s=pad(Math.floor(r/60))+':'+pad(r%60);
  return d>0?(ja()?'翌':'+1 ')+s:s; }
function dur(m){ m=Math.round(Math.abs(m)); const h=Math.floor(m/60), r=m%60;
  if(ja()) return h?h+'時間'+(r?r+'分':''):r+'分';
  return h?h+'h'+(r?' '+r+'m':''):r+' min'; }
/* a small bookmark tab at a pin's shoulder: 「保存済み」 on the map */
const SVMARK='<path class="pl-svm" transform="translate(4 -13)" d="M0 0h6v8.5l-3-2.2-3 2.2z"/>';
const ic=(n,c)=>`<svg class="ic${c?' '+c:''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const clone=o=>JSON.parse(JSON.stringify(o));
function wdOf(date){ const [y,m,d]=date.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)).getUTCDay(); }
const wdName=date=>ja()?WDJA[wdOf(date)]:WDEN[wdOf(date)];
function dlabel(day,short){ const [,m,d]=day.date.split('-').map(Number);
  return ja()?(short?'':m+'月')+d+'日('+WDJA[wdOf(day.date)]+')':WDEN[wdOf(day.date)]+' '+d+(short?'':' Feb'); }
/* A day's two colours: the bright --dN for lines and swatches, the ink for text and fills under white. */
const dayStyle=i=>`--c:var(--d${i%6+1});--ci:var(--pl-d${i%6+1}-ink)`;
const latin=s=>!/[぀-ヿ㐀-鿿]/.test(s||'');
/* Break points for Japanese names, since Safari has no word-break:auto-phrase. */
const wbr=s=>esc(s).replace(/・/g,'・<wbr>').replace(/（/g,'<wbr>（').replace(/ &amp; /g,' <wbr>&amp; ').replace(/／/g,'／<wbr>');
function hav(a,b){ const R=6371, r=Math.PI/180, dLa=(b.lat-a.lat)*r, dLo=(b.lon-a.lon)*r;
  const x=Math.sin(dLa/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
/* check_plans.py's straight-line distance, so the ≈ minutes match it to the second */
function eqKm(a,b){ const r=Math.PI/180, x=(b.lon-a.lon)*r*Math.cos((a.lat+b.lat)/2*r); return 6371*Math.hypot(x,(b.lat-a.lat)*r); }
const imperial=()=>LS.get('units')==='imperial';
const uKm=km=>{ const m=km+' km', i=Math.round(km*0.621371)+' mi'; return `<span class="u" data-metric="${m}" data-imperial="${i}">${imperial()?i:m}</span>`; };
/* Search folds case, accents and kana, so ほびっと finds ホビット. */
const fold=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
/* LS stores strings in the book, so JSON is ours, and so is noticing that a write failed. */
const LSJ={get(k,d){ const v=LS.get(k); if(v==null) return d; try{ return JSON.parse(v); }catch(e){ return d; } },
  raw(k){ return LS.get(k); }, set(k,v){ const s=JSON.stringify(v); LS.set(k,s); return LS.get(k)===s; }};
let uidN=0;
const uid=()=>Date.now().toString(36)+(uidN++).toString(36)+Math.random().toString(36).slice(2,5);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const raf=f=>requestAnimationFrame(f);
const idle=(f,t)=>(window.requestIdleCallback||(g=>setTimeout(g,60)))(f,{timeout:t||1200});
const domain=u=>{ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } };

/* ---------- encoded polylines (Google's algorithm) over map units in tenths: routes.json and the cache ---------- */
function encPoly(pts){
  let px=0, py=0, out='';
  const one=v=>{ v=v<0?~(v<<1):v<<1; while(v>=0x20){ out+=String.fromCharCode((0x20|(v&0x1f))+63); v>>=5; } out+=String.fromCharCode(v+63); };
  pts.forEach(([x,y])=>{ const X=Math.round(x*10), Y=Math.round(y*10); one(X-px); one(Y-py); px=X; py=Y; });
  return out;
}
function decPoly(s){
  if(Array.isArray(s)) return s;
  if(typeof s!=='string'||!s) return null;
  if(/^M/.test(s)) return s;                 /* tolerated: an SVG path in map units */
  const pts=[]; let i=0, x=0, y=0;
  const one=()=>{ let r=0, sh=0, b; do{ b=s.charCodeAt(i++)-63; r|=(b&0x1f)<<sh; sh+=5; }while(b>=0x20&&i<=s.length); return r&1?~(r>>1):r>>1; };
  while(i<s.length){ x+=one(); y+=one(); pts.push([x/10,y/10]); }
  return pts.length>1?pts:null;
}
function simplify(pts,tol){
  if(pts.length<3) return pts;
  const keep=new Uint8Array(pts.length); keep[0]=keep[pts.length-1]=1; const st=[[0,pts.length-1]];
  while(st.length){ const [a,b]=st.pop(), [x1,y1]=pts[a], [x2,y2]=pts[b], dx=x2-x1, dy=y2-y1, n=Math.hypot(dx,dy)||1; let mi=-1, md=0;
    for(let i=a+1;i<b;i++){ const d=Math.abs(dy*(pts[i][0]-x1)-dx*(pts[i][1]-y1))/n; if(d>md){ md=d; mi=i; } }
    if(md>tol){ keep[mi]=1; st.push([a,mi],[mi,b]); } }
  return pts.filter((_,i)=>keep[i]);
}

/* ---------- the day simulation: tools/check_plans.py, line for line. Pure: no DOM, no storage.
   DB = {places:Map, days, ferries, walks, tides, travel:{ids,min}, tIdx}; P is a plan record. ---------- */
function makeSim(DB){
  const place=id=>DB.places.get(id);
  const idsOf=(date,P)=>(P.days[date]||[]).filter(id=>DB.places.has(id));
  /* stayDay {date:{id:min}} beats stay {id:min}: one place can be visited on two days for different lengths */
  const stayOf=(id,P,date)=>{ const p=place(id), sd=date&&P.stayDay&&P.stayDay[date]; return sd&&sd[id]!=null?sd[id]:P.stay&&P.stay[id]!=null?P.stay[id]:(p&&p.dur!=null?p.dur:60); };
  function anchorsOf(day,P){ const o=P.anchors&&P.anchors[day.date]||{};
    return {start:Object.assign({},day.start,o.start||{}), end:Object.assign({},day.end,o.end||{})}; }
  const startOf=(day,P)=>toMin(P.start&&P.start[day.date]||anchorsOf(day,P).start.time||'09:00');
  function drive(a,b){
    const t=DB.travel, i=DB.tIdx[a], j=DB.tIdx[b];
    if(i!=null&&j!=null&&t.min[i]&&t.min[i][j]!=null) return {min:t.min[i][j],est:false};
    const pa=place(a), pb=place(b); if(!pa||!pb) return {min:0,est:true};
    return {min:eqKm(pa,pb)*1.35/50*60,est:true};
  }
  const kmOf=(a,b)=>{ const pa=place(a), pb=place(b); return pa&&pb?eqKm(pa,pb)*1.35:0; };
  const ferryOf=p=>p&&DB.ferries.find(f=>(f.ids||[]).indexOf(p.id)>=0||(p.area&&(f.areas||[]).indexOf(p.area)>=0))||null;
  function sailing(f,way,date,ready,ws){
    const wd=WD[wdOf(date)];
    if(f.days&&f.days.indexOf(wd)<0) ws.push({k:'ferryDay'});
    const sched=f[way]||{}, weekday=['mon','tue','wed','thu','fri'].indexOf(wd)>=0;
    const times=sched.all||(weekday?sched['mon-fri']:sched['sat-sun']);
    if(!times) return {dep:ready,listed:false};
    for(const s of times) if(toMin(s)>=ready) return {dep:toMin(s),listed:true};
    ws.push({k:way==='out'?'ferryMiss':'ferryBack',t:times[times.length-1]});
    return {dep:ready,listed:true};
  }
  /* Minutes from a to b leaving at t: a walk from plans.json `walks` (either way; `down` the other
     way), an island crossing through its ferry, or a drive. kind 'drive' only for matrix minutes. */
  const walkOf=(a,b)=>{ for(const w of DB.walks){ if(w.a===a&&w.b===b) return {w,min:w.min}; if(w.b===a&&w.a===b) return {w,min:w.down!=null?w.down:w.min}; } return null; };
  /* drove: the minutes that count as driving (matrix or ≈), never walks or sailings. A leg into or
     out of a no-road place (plans.json noRoad: id -> road end) with no walk of its own is walk to its
     road end + the leg between road ends + walk from the other road end, as check_plans.leg(). */
  function legAt(a,b,t,date,ws){
    const nr=DB.noRoad||{}, ea=nr[a], eb=nr[b], wk=walkOf(a,b);
    if((ea||eb)&&!wk){
      let m=0, x=a, km=0, est=false, kind='walk', drove=0, parts=[], walk=0, sub=null, wa=0, wb=0;
      if(ea&&ea!==b){ const w=walkOf(a,ea); m+=w.min; walk+=w.min; wa=w.min; km+=kmOf(a,ea); parts.push({a,b:ea,kind:'walk'}); x=ea; }
      const y=eb&&eb!==x?eb:b;
      if(x!==y){ sub=legAt(x,y,t+m,date,ws); m+=sub.min; drove+=sub.drove; km+=sub.km; est=sub.est; kind=sub.kind; parts=parts.concat(sub.parts); }
      if(eb&&y!==b){ const w=walkOf(y,b); m+=w.min; walk+=w.min; wb=w.min; km+=kmOf(y,b); parts.push({a:y,b,kind:'walk'}); }
      return Object.assign({},sub||{},{kind,min:m,km,est,drove,parts,combo:true,walk,wa,wb,sub});
    }
    if(wk) return {kind:'walk',min:wk.min,km:kmOf(a,b),est:false,w:wk.w,drove:0,parts:[{a,b,kind:'walk'}]};
    const fa=ferryOf(place(a)), fb=ferryOf(place(b));
    if(fa===fb){ const d=drive(a,b); return {kind:d.est?'est':'drive',min:d.min,km:kmOf(a,b),est:d.est,drove:d.min,parts:[{a,b,kind:'drive'}]}; }
    if(fb){ const d1=drive(a,fb.from), ready=t+d1.min+(fb.board!=null?fb.board:15), s=sailing(fb,'out',date,ready,ws), d2=drive(fb.to,b);
      return {kind:'ferry',drove:0,f:fb,way:'out',min:(s.dep-t)+fb.min+d2.min,d1:d1.min,dep:s.dep,listed:s.listed,wait:s.dep-ready,sail:fb.min,d2:d2.min,
        km:kmOf(a,fb.from)+kmOf(fb.to,b),est:d1.est||d2.est,parts:[{a,b:fb.from,kind:'drive'},{a:fb.from,b:fb.to,kind:'ferry'},{a:fb.to,b,kind:'drive'}]}; }
    const d1=drive(a,fa.to), ready=t+d1.min+10, s=sailing(fa,'back',date,ready,ws), d2=drive(fa.from,b);
    return {kind:'ferry',drove:0,f:fa,way:'back',min:(s.dep-t)+fa.min+d2.min,d1:d1.min,dep:s.dep,listed:s.listed,wait:s.dep-ready,sail:fa.min,d2:d2.min,
      km:kmOf(a,fa.to)+kmOf(fa.from,b),est:d1.est||d2.est,parts:[{a,b:fa.to,kind:'drive'},{a:fa.to,b:fa.from,kind:'ferry'},{a:fa.from,b,kind:'drive'}]};
  }
  const SUNC={}, sunOf=(p,date,k)=>{ if(!p) return k?1220:409; const key=p.id+date; return (SUNC[key]||(SUNC[key]=sunEv(date,p.lat,p.lon)))[k]; };
  const sunsetOf=(p,date)=>sunOf(p,date,1), sunriseOf=(p,date)=>sunOf(p,date,0);
  function schedule(day,list,P,opt){
    list=(list||idsOf(day.date,P)).filter(id=>DB.places.has(id));   /* an id no place resolves is skipped */
    const date=day.date, an=anchorsOf(day,P), buf=an.start.buffer||0, t0=startOf(day,P), rows=[];
    let t=t0+buf, cur=an.start.id, driving=0, km=0, est=false, nwarn=0;
    rows.push({kind:'start',id:an.start.id,arr:t0,dep:t,warns:[],infos:[],an:an.start});
    list.forEach((id,i)=>{
      const p=place(id), ws=[], inf=[], l=legAt(cur,id,t,date,ws);
      driving+=l.drove;
      km+=l.km; est=est||l.est;
      const arrival=t+l.min; let arr=arrival;
      const stay=stayOf(id,P,date), h=p.hours;
      if(arrival>=1440) inf.push({k:'overnight'});
      if(h&&typeof h==='object'){            /* after midnight too: 翌01:02 at a 22:00 close is closed */
        const span=h[WD[wdOf(date)]];
        if(!span) ws.push({k:'closed'});
        else { const w=String(span).split(',')[0].split('-').map(toMin), o=w[0], c=w[1];
          if(arr<o) arr=o;
          if(arr+Math.min(stay,45)>c) ws.push({k:'closedAt',t:c}); }
      } else if(h==='unknown') inf.push({k:'hoursUnknown'});
      const dep=arr+stay;
      if(hasFlag(p,'tide')){ const lows=(DB.tides[p.area]||{})[date];
        if(!lows) inf.push({k:'tideCheck'});
        else if(!lows.some(x=>Math.abs(arr+stay/2-toMin(x))<=TIDE_WINDOW)) ws.push({k:'tide',t:lows.join(' / ')});
        else inf.push({k:'tideOk',t:lows.find(x=>Math.abs(arr+stay/2-toMin(x))<=TIDE_WINDOW)}); }
      /* the sun at the place itself; best may be "sunrise,sunset" (judged by the end of the day the
         visit falls on: before noon = sunrise). mustSun places exist for it, so missing it is a ⚠;
         for the rest best is a preference and missing it a golden-hour hint. Before dawn is fine on
         the approach to a sunrise stop later that day. */
      const ss=sunsetOf(p,date), sr=sunriseOf(p,date), best=new Set(String(p.best||'any').split(',')), out=OUTDOOR.has(p.cat);
      if(out&&dep>ss+1&&!best.has('sunset')&&!best.has('night')) ws.push({k:'dark',t:ss});
      const forDawn=list.slice(list.indexOf(id)+1).some(x=>String(place(x).best).indexOf('sunrise')>=0);
      if(out&&arr<sr-30&&!best.has('sunrise')&&!best.has('night')&&!forDawn) ws.push({k:'dawn',t:sr});
      const morning=arr<720, only=k=>best.size===1&&best.has(k), miss=(e,t)=>(p.mustSun?ws:inf).push({k:p.mustSun?'sunMiss':'golden',e,t});
      if(best.has('sunrise')&&(morning||only('sunrise'))&&!(arr<=sr+10&&dep>=sr)) miss('rise',sr);
      if(best.has('sunset')&&(!morning||only('sunset'))&&!(arr<=ss+15&&dep>=ss-30)) miss('set',ss);
      if(best.has('sunrise')&&morning) inf.push({k:'sunrise',t:sr});
      if(best.has('sunset')&&!morning) inf.push({k:'sunsetAt',t:ss});
      if(l.kind==='ferry'&&l.f.verified===false) inf.push({k:'ferryUnverified'});
      rows.push({kind:'stop',id,i,arr:arrival,begin:arr,dep,stay,leg:l,wait:arr-arrival,warns:ws,infos:inf});
      t=dep; cur=id; nwarn+=ws.length;
    });
    const ws=[], inf=[], l=legAt(cur,an.end.id,t,date,ws);
    driving+=l.drove;
    km+=l.km; est=est||l.est;
    const dl=opt&&opt.deadline!=null?opt.deadline:DEADLINE;
    const fin=t+l.min, limit=an.end.time?toMin(an.end.time):dl, explicit=!!an.end.time;
    if(fin>limit) ws.push({k:'over',m:fin-limit,t:limit,soft:!explicit,flight:explicit&&an.end.id==='akl',at:an.end.id});
    else if(limit-fin<30) inf.push({k:'tight',m:limit-fin});
    const ss=sunsetOf(place(an.end.id),date); if(fin>ss&&t<fin&&l.drove>0) inf.push({k:'darkDrive',t:ss});
    rows.push({kind:'end',id:an.end.id,arr:fin,leg:l,limit,explicit,warns:ws,infos:inf,an:an.end});
    const long=driving>LONG_DRIVE;
    return {rows,drive:driving,km,est,long,warns:nwarn+ws.length+(long?1:0),end:fin,start:t0,len:fin-t0};
  }
  /* Cheapest insertion among the slots where the place is open; fits:false when none is. */
  /* Positions are into the list as given; ids no place resolves are stepped over. */
  function bestPos(day,list,id,P,opt){
    const at=list.map((x,k)=>DB.places.has(x)?k:-1).filter(k=>k>=0), known=at.map(k=>list[k]);
    let best=-1, bt=Infinity, any=known.length, ae=Infinity;
    for(let k=0;k<=known.length;k++){ const l=known.slice(); l.splice(k,0,id); const sc=schedule(day,l,P,opt), r=sc.rows[k+1];
      if(sc.end<ae){ ae=sc.end; any=k; }
      if(!r.warns.some(w=>w.k==='closed'||w.k==='closedAt')&&sc.end<bt){ bt=sc.end; best=k; } }
    const raw=k=>k<at.length?at[k]:list.length;
    return best>=0?{pos:raw(best),fits:true}:{pos:raw(any),fits:false};
  }
  /* What a change breaks: warnings on the new day that the old day did not have. */
  function breaksOf(a,b){
    const had=new Set(); a.rows.forEach(r=>r.warns.forEach(w=>had.add(r.kind+r.id+'|'+w.k)));
    const out=[]; b.rows.forEach(r=>r.warns.forEach(w=>{ if(BREAKS.has(w.k)&&!had.has(r.kind+r.id+'|'+w.k)) out.push({id:r.id,kind:r.kind,w}); }));
    return out;
  }
  /* The day with ids added, simulated before anything is shown: one place goes to its cheapest open
     slot; a grouping (c) goes in as one block, placed by its best (sunset: the last stop ends at
     sunset; sunrise: the first starts at it) or its startAt, and an empty morning leaves at startAt.
     A block that breaks less always wins over one that is closer to its hour. */
  function insertPlan(day,list,ids,P,opt,c){
    list=list.filter(id=>DB.places.has(id)); ids=ids.filter((id,k)=>DB.places.has(id)&&list.indexOf(id)<0&&ids.indexOf(id)===k);
    if(!ids.length) return null;
    const base=schedule(day,list,P,opt), tries=[];
    if(ids.length===1){ const bp=bestPos(day,list,ids[0],P,opt), l=list.slice(); l.splice(bp.pos,0,ids[0]); tries.push({list:l,P,fits:bp.fits}); }
    else { const an=anchorsOf(day,P), sa=c&&c.startAt?toMin(c.startAt):null;
      for(let k=0;k<=list.length;k++){ const l=list.slice(); l.splice(k,0,...ids); tries.push({list:l,P,k});
        if(k===0&&sa!=null&&!an.start.buffer&&sa>startOf(day,P)){ const s=pad(Math.floor(sa/60))+':'+pad(sa%60);
          tries.push({list:l,P:Object.assign({},P,{start:Object.assign({},P.start,{[day.date]:s})}),k,start:s}); } }
      /* and the members one by one, each into the cheapest free gap: a day with room between fixed
         stops takes a grouping there rather than at its start */
      let l=list.slice(); ids.forEach(id=>{ l.splice(bestPos(day,l,id,P,opt).pos,0,id); }); tries.push({list:l,P,spread:true}); }
    const cb=c&&(c.best||(place(ids[ids.length-1]).best==='sunset'?'sunset':place(ids[0]).best==='sunrise'?'sunrise':null));
    let best=null;
    tries.forEach(t=>{ const sc=schedule(day,t.list,t.P,opt), br=breaksOf(base,sc); let dev=0;
      if(t.k!=null&&c){ const first=sc.rows[t.k+1], last=sc.rows[t.k+ids.length];
        dev=cb==='sunset'?Math.abs(last.dep-sunsetOf(place(last.id),day.date)):cb==='sunrise'?Math.abs(first.begin-sunriseOf(place(first.id),day.date))
          :c.startAt?Math.abs(sc.rows[t.k].dep-toMin(c.startAt)):0; }
      const score=br.length*1e5+dev*2+(sc.end-base.end);
      if(!best||score<best.score) best={score,list:t.list,start:t.start||null,sc,breaks:br,fits:t.fits!==false}; });
    return Object.assign(best,{base,ids,dDrive:best.sc.drive-base.drive});
  }
  return {place,idsOf,stayOf,anchorsOf,startOf,drive,legAt,schedule,bestPos,sunsetOf,sunriseOf,breaksOf,insertPlan,OUTDOOR};
}

const plannerFn=function planner(g){
  const view=g.querySelector('.v-plan'); if(!view) return;
  const slug=g.dataset.guide||'nz', SRC=view.dataset.src||('data/'+slug+'/');
  const KP='plan:'+slug, KU='plan-ui:'+slug, KB=KP+':broken';
  const UI=LSJ.get(KU,null);
  const ui=UI&&typeof UI==='object'?UI:{};
  const S={
    raw:LSJ.raw(KP), planId:null, my:null, versions:[], imports:[], booked:{},
    impVer:1, placing:null, ip:null,
    day:Number.isInteger(+ui.day)?+ui.day:0, map:ui.map==='closed'||ui.map===false?'closed':'peek',
    hideInstall:!!ui.hideInstall, hideIntro:!!ui.hideIntro, saveFail:false,
    sel:null, sc:null, f:{q:'',cat:null,area:null,saved:null,sort:'trend'}, hist:[], browsing:false, drafts:{}, noteOpen:null,
    dayEnd:okHM(ui.dayEnd)?toMin(ui.dayEnd):DEADLINE
  };
  /* road geometry cache, LRU, in plan-ui */
  const RC={map:ui.routes&&typeof ui.routes==='object'?ui.routes:{}, order:Array.isArray(ui.rorder)?ui.rorder.filter(k=>typeof k==='string'):[]};
  let DB=null, DRAG=null, PENDING=false;

  /* ---------- chrome: built once ---------- */
  view.innerHTML=`
    <div class="pl-bar">
      <button class="pl-planbtn" type="button" aria-haspopup="dialog"><span class="pl-planbtn-k"></span><span class="pl-planbtn-v"></span>${ic('chevron-down','sm')}</button>
      <span class="pl-tools">
        <button class="pl-iconbtn pl-savebtn" type="button">${ic('bookmark')}<span class="sr" data-pt="saveVer"></span></button>
        <button class="pl-iconbtn pl-sharebtn" type="button">${ic('share')}<span class="sr" data-pt="share"></span></button>
      </span>
    </div>
    <div class="pl-stick">
      <nav class="pl-days"></nav>
      <section class="pl-mapcard">
        <div class="pl-mapbox">
          <svg class="pl-map" viewBox="0 0 ${W} ${H}" role="img"><title></title>
            <rect class="pl-sea" x="-2000" y="-2000" width="4692" height="4824"/>
            <g class="pl-world">
              <g class="pl-land"></g><g class="pl-others"></g><g class="pl-cands"></g>
              <g class="pl-legs"></g><g class="pl-stops"></g>
              <g class="pl-labg" visibility="hidden"><g class="pl-s"><text class="pl-lab" x="16" y="4.5"></text></g></g>
            </g>
          </svg>
          <div class="pl-mapctl">
            <button type="button" data-zoom="in">${ic('plus')}<span class="sr" data-pt="zoomIn"></span></button>
            <button type="button" data-zoom="out">${ic('minus')}<span class="sr" data-pt="zoomOut"></span></button>
            <button type="button" data-zoom="fit">${ic('fit')}<span class="sr" data-pt="fit"></span></button>
            <button type="button" data-zoom="full" class="pl-fullbtn">${ic('maximize')}<span class="sr"></span></button>
          </div>
          <p class="pl-estnote" hidden></p>
        </div>
        <div class="pl-mapfoot">
          <button class="pl-maptoggle" type="button" aria-expanded="true">${ic('map','sm')}<span></span></button>
          <span class="pl-footr">
            <button class="pl-undobtn" type="button" disabled>${ic('undo','sm')}<span class="sr" data-pt="undo"></span></button>
            <button class="pl-browsebtn" type="button">${ic('search','sm')}<span data-pt="browse"></span></button>
          </span>
        </div>
      </section>
    </div>
    <div class="pl-notice"></div>
    <div class="pl-main" aria-live="off"></div>`;
  const layer=document.createElement('div');
  layer.innerHTML=`<div class="pl-layer pl-scrim" hidden></div>
    <div class="pl-layer pl-sheet" role="dialog" aria-modal="true" tabindex="-1" id="pl-sheet-${slug}" aria-labelledby="pl-sht-${slug}" hidden inert><div class="pl-grab" aria-hidden="true"></div><div class="pl-sbody"></div></div>
    <div class="pl-layer pl-toast" role="status" aria-live="polite"></div>`;
  [...layer.children].forEach(el=>g.appendChild(el));
  const q=s=>view.querySelector(s);
  const E={bar:q('.pl-planbtn'), days:q('.pl-days'), card:q('.pl-mapcard'), svg:q('.pl-map'), world:q('.pl-world'), main:q('.pl-main'),
    notice:q('.pl-notice'), undo:q('.pl-undobtn'), stick:q('.pl-stick'), toggle:q('.pl-maptoggle'), estnote:q('.pl-estnote'),
    scrim:g.querySelector('.pl-scrim'), sheet:g.querySelector('.pl-sheet'), sbody:g.querySelector('.pl-sbody'), toast:g.querySelector('.pl-toast')};
  const svg=E.svg, main=E.main;

  /* ---------- plans ----------
     Three kinds, one shape {id,days,stay,start,notes,anchors?}: presets (plans.json), saved versions
     (frozen, ids "v-…") and My plan, the one working copy. Editing a preset or a version forks it
     into My plan, and the My plan it replaces is kept as an autosave first: nothing is overwritten.
     Plans hold place ids, minutes, HH:MM and the travellers' own notes only. */
  const place=id=>DB.places.get(id);
  const nm=p=>p?(ja()?(p.nameJa||p.name):p.name):'?';
  const alt=p=>ja()?(p.nameJa&&p.name!==p.nameJa?p.name:''):(p.nameJa&&p.nameJa!==p.name?p.nameJa:'');
  const nmLang=p=>{ const n=nm(p); return ja()&&latin(n)?' lang="en"':(!ja()&&!latin(n)?' lang="ja"':''); };
  const altLang=p=>ja()?' lang="en"':' lang="ja"';
  const glyphOf=p=>p.id==='akl'?'plane-landing':p.cat==='ferry'?'sailboat':DB.bases.has(p.id)?'home':(GLYPH[p.cat]||'sparkles');
  const isCand=p=>!DB.bases.has(p.id)&&p.cat!=='ferry';
  function findPlan(id){ if(id==='my') return S.my; return DB.presets.find(p=>p.id===id)||S.versions.find(v=>v.id===id)||null; }
  const plan=()=>findPlan(S.planId)||DB.presets[0];
  /* An autosave or a received version is named when shown, so its name follows the language. */
  const atTxt=t=>{ const d=new Date(t||0); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); };
  const planName=p=>p.id==='my'?(p.name||pt('my')):p.id.startsWith('v-')?(p.name||pt(p.kind==='shared'?'shared':'autoSaved',{t:atTxt(p.at)})):(ja()?p.nameJa:p.name);
  /* plan.titles[date] {ja,en} names a version's day before the default day label */
  const dayTitle=(day,P)=>{ const t=(P||plan()).titles&&(P||plan()).titles[day.date]; return t&&(t[lang()]||t.ja||t.en)||(ja()?day.labelJa:day.label); };
  /* notes in plans.json are "JA / EN"; the travellers' own are one language */
  const noteText=(P,id)=>{ const n=P.notes&&P.notes[id]; if(!n) return ''; const k=n.indexOf(' / '); return k<0?n:(ja()?n.slice(0,k):n.slice(k+3)); };
  const presetName=id=>{ const p=findPlan(id); return p?planName(p):''; };
  const idsOf=(date,P)=>SIM.idsOf(date,P||plan());
  const stayOf=(id,P,date)=>SIM.stayOf(id,P||plan(),date||DB.days[S.day].date);
  function plannedMap(P){ const m=new Map(); P=P||plan(); DB.days.forEach((d,i)=>(P.days[d.date]||[]).forEach(id=>{ if(!m.has(id)) m.set(id,i); })); return m; }
  function save(){ const ok=LSJ.set(KP,{v:1,active:S.planId,my:S.my,versions:S.versions,imports:S.imports,booked:S.booked}); noteSave(ok); return ok; }
  let uiT=0; const saveUISoon=()=>{ clearTimeout(uiT); uiT=setTimeout(()=>idle(saveUI,2000),400); };
  function saveUI(){ LSJ.set(KU,{v:1,day:S.day,map:S.map==='full'?'peek':S.map,dayEnd:S.dayEnd!==DEADLINE?hhmm(S.dayEnd):undefined,hideInstall:S.hideInstall,hideIntro:S.hideIntro,routes:RC.map,rorder:RC.order}); }
  function noteSave(ok){ if(ok===!S.saveFail) return; S.saveFail=!ok; renderNotice(); }
  const bodyOf=p=>JSON.stringify([p.days,p.stay||{},p.start||{},p.notes||{},p.stayDay||{}]);
  const nowHM=()=>{ const d=new Date(); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); };
  /* Versions are immutable once saved, so every change makes a new array: undo entries can share it. */
  /* kind: '' a named version, 'auto' an autosave, 'shared' received through a link */
  function snapshot(P,name,kind){
    const v={id:'v-'+uid(),name:name||'',from:P.from||P.id,at:Date.now(),days:clone(P.days),stay:clone(P.stay||{}),start:clone(P.start||{}),notes:clone(P.notes||{})};
    if(P.anchors) v.anchors=clone(P.anchors);
    if(P.titles) v.titles=clone(P.titles);
    if(P.stayDay) v.stayDay=clone(P.stayDay);
    if(kind) v.kind=kind;
    let list=[v,...S.versions];
    if(kind==='auto'){ let n=0; list=list.filter(x=>x.kind!=='auto'||++n<=10); }      /* the newest 10 autosaves */
    S.versions=list; return v;
  }
  function keepMy(){ if(S.my&&!S.versions.some(v=>bodyOf(v)===bodyOf(S.my))) return snapshot(S.my,'','auto'); return null; }
  const state=()=>({planId:S.planId,my:S.my?clone(S.my):null,versions:S.versions,imports:S.imports,booked:S.booked});
  function pushHist(){ S.hist.push(state()); if(S.hist.length>100) S.hist.shift(); }
  const emptyPlanBits=()=>({stay:{},start:{},notes:{}});
  /* Every edit goes through here. A drag in progress is cancelled first, and history is pushed only
     when the change goes through. */
  /* ---------- every change is checked: what it breaks, on the days it touches ---------- */
  const dayKey=(P,d)=>{ const l=P.days[d.date]||[]; return JSON.stringify([l,P.start&&P.start[d.date],P.stayDay&&P.stayDay[d.date],P.anchors&&P.anchors[d.date],l.map(id=>P.stay&&P.stay[id])]); };
  function dayBreaks(A,B){ const out=[], o={deadline:S.dayEnd};
    DB.days.forEach(d=>{ if(dayKey(A,d)!==dayKey(B,d)) SIM.breaksOf(SIM.schedule(d,null,A,o),SIM.schedule(d,null,B,o)).forEach(x=>out.push(Object.assign({day:d},x))); });
    return out; }
  /* worst first (the flight or the day's end, the sun, closing), grouped by day, at most three */
  const BRANK=['over','sunMiss','closed','closedAt','ferryMiss','ferryBack','ferryDay','tide','dark','dawn'];
  const breakLine=(bs,home)=>{ const o=bs.slice().sort((a,b)=>BRANK.indexOf(a.w.k)-BRANK.indexOf(b.w.k)).slice(0,3), by=new Map();
    o.forEach(b=>{ const k=b.day.date; if(!by.has(k)) by.set(k,{d:b.day,t:new Set()}); by.get(k).t.add(breakText(b,b.day)); });
    return [...by.values()].map(x=>(x.d!==(home||DB.days[S.day])?dlabel(x.d)+'：':'')+[...x.t].join('・')).join(' / '); };
  /* the change applied to a copy of the active plan, never to the plan itself */
  function trial(fn){ const P=plan(), m=clone({id:'trial',days:P.days,stay:P.stay||{},start:P.start||{},notes:{},stayDay:P.stayDay||{},anchors:P.anchors||{}});
    try{ fn(m); }catch(e){ return null; } return dayBreaks(P,m); }
  /* Commit, unless it breaks something: then the first tap says what and arms the control, and a
     second tap on it within 15 s commits. Same rule as the day picker. */
  /* after a drop or a typed start time: what the new day breaks, with keep or undo, inline */
  function confirmBar(bs){ if(!bs||!bs.length) return; (soon?afterRender:raf)(()=>{ const l=main.querySelector('.pl-list'); if(!l) return;
    const d=document.createElement('div'); d.className='pl-confirm'; d.setAttribute('role','alert');
    d.innerHTML=`<p>${ic('alert','sm')}<span>${esc(pt('thisOrder',{w:breakLine(bs)}))}</span></p><div><button type="button" class="pl-btn pl-sec" data-act="keep">${pt('keepIt')}</button><button type="button" class="pl-btn pl-pri" data-act="undoit">${pt('undo')}</button></div>`;
    main.querySelectorAll('.pl-confirm').forEach(x=>x.remove()); l.before(d); }); }
  let ARM=null;
  function guard(el,key,fn,msg,opt){
    const bs=trial(fn);
    if(bs&&bs.length&&!(ARM&&ARM.key===key&&Date.now()-ARM.t<15000)){
      ARM={key,t:Date.now()}; document.querySelectorAll('.pl-armed').forEach(x=>x.classList.remove('pl-armed')); if(el) el.classList.add('pl-armed');
      toast('⚠ '+breakLine(bs)+' — '+pt('tapAgainDo')); return false; }
    ARM=null; return edit(fn,msg,opt);
  }
  function edit(fn,msg,opt){
    if(DRAG) DRAG.cancel();
    const before=state(); let forked=false;
    try{
      if(S.planId!=='my'||!S.my){
        /* Editing a preset or a saved/received version makes My plan a copy of it. A version's copy
           is named 「〇〇（編集）」, and the My plan it replaces is kept as an autosave: never silent. */
        const src=plan(), kept=keepMy(), fromVer=src.id.startsWith('v-');
        S.my=Object.assign({id:'my',from:src.from||src.id,days:clone(src.days)},emptyPlanBits(),
          {stay:clone(src.stay||{}),start:clone(src.start||{}),notes:clone(src.notes||{})}, src.anchors?{anchors:clone(src.anchors)}:{}, src.titles?{titles:clone(src.titles)}:{}, src.stayDay?{stayDay:clone(src.stayDay)}:{});
        if(fromVer) S.my.name=pt('editedName',{name:planName(src)});
        S.planId='my'; forked=kept?{kept}:true;
      }
      fn(S.my);
    }catch(e){ S.planId=before.planId; S.my=before.my; S.versions=before.versions; console.error(e); return false; }
    S.hist.push(before); if(S.hist.length>100) S.hist.shift();
    /* name what the change broke, on every day it touched */
    const was=before.planId==='my'?before.my:findPlan(before.planId), bs=was?dayBreaks(was,S.my):[];
    S.lastBreaks=bs; if(bs.length&&msg) msg+=' — ⚠ '+breakLine(bs);
    save();
    if(opt&&opt.quick&&S.sc) patchDay(); else renderSoon();
    if(msg) toast(S.saveFail?msg:forked&&forked.kept?msg+' — '+pt('keptAs',{name:planName(forked.kept)}):forked?msg+' — '+pt('forked'):msg,undo);
    if(opt&&opt.focus!=null) afterRender(()=>focusStop(opt.focus));
    return true;
  }
  function undo(){
    if(DRAG) DRAG.cancel();
    const s=S.hist.pop(); if(!s){ toast(pt('noUndo')); return; }
    const fk=focusKey();
    S.planId=s.planId; S.my=s.my; S.versions=s.versions; S.imports=s.imports; S.booked=s.booked; S.impVer++;
    save(); render(); refreshSheet(); toast(pt('undone'));
    /* back to the same control if it still exists, else the undo button, else the first stop */
    if(!sheetKind){ const t=fk&&main.querySelector(fk); if(t) t.focus({preventScroll:true}); else if(!E.undo.disabled) E.undo.focus({preventScroll:true}); else focusStop(0); }
  }

  /* Validate what storage gave us. Anything malformed falls back to the seed, and the raw string
     is kept under plan:<slug>:broken so nothing is lost silently. */
  function normPlan(p,keepId){
    if(!p||typeof p!=='object'||!p.days||typeof p.days!=='object'||Array.isArray(p.days)) return null;
    const days={};
    DB.days.forEach(d=>{ const a=p.days[d.date], seen=new Set(); days[d.date]=(Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&!seen.has(x)&&seen.add(x)); });
    const obj=o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{};
    const stay={}, start={}, notes={};
    Object.entries(obj(p.stay)).forEach(([k,v])=>{ if(typeof v==='number'&&v>0&&v<1440) stay[k]=Math.round(v); });
    Object.entries(obj(p.start)).forEach(([k,v])=>{ if(okHM(v)) start[k]=v; });
    Object.entries(obj(p.notes)).forEach(([k,v])=>{ if(typeof v==='string'&&v.trim()) notes[k]=v.slice(0,300); });
    const out={id:keepId||p.id,from:typeof p.from==='string'?p.from:DB.presets[0].id,days,stay,start,notes};
    if(p.anchors&&typeof p.anchors==='object') out.anchors=p.anchors;
    if(p.stayDay&&typeof p.stayDay==='object'&&!Array.isArray(p.stayDay)) out.stayDay=p.stayDay;
    if(typeof p.name==='string') out.name=p.name.slice(0,40);
    if(typeof p.at==='number') out.at=p.at;
    if(p.kind==='auto'||p.kind==='shared') out.kind=p.kind; else if(p.auto) out.kind='auto';
    if(typeof p.sh==='string') out.sh=p.sh;
    if(p.titles&&typeof p.titles==='object') out.titles=p.titles;
    return out;
  }
  function loadState(){
    let saved=null, broken=false;
    if(S.raw!=null){ try{ saved=JSON.parse(S.raw); }catch(e){ broken=true; } }
    if(saved&&(typeof saved!=='object'||saved.v!==1)) { broken=true; saved=null; }
    if(saved){
      if(saved.my!=null){ S.my=normPlan(saved.my,'my'); if(!S.my) broken=true; }
      S.versions=(Array.isArray(saved.versions)?saved.versions:[]).map(v=>v&&typeof v.id==='string'&&v.id.startsWith('v-')?normPlan(v,v.id):null).filter(Boolean);
      if(Array.isArray(saved.versions)&&S.versions.length<saved.versions.length) broken=true;
      S.imports=Array.isArray(saved.imports)?saved.imports.filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&(m.lat==null?m.lon==null:isFinite(m.lat)&&isFinite(m.lon))):[];
      S.booked={}; if(saved.booked&&typeof saved.booked==='object') Object.keys(saved.booked).forEach(k=>{ if(saved.booked[k]===true) S.booked[k]=true; });
      S.planId=typeof saved.active==='string'?saved.active:null;
      S.impVer++;
    }
    if(broken&&S.raw!=null){ LS.set(KB,S.raw); }
    if(S.planId==='my'&&!S.my) S.planId=null;
    if(!findPlan(S.planId)) S.planId=DB.presets[0].id;
    if(!(S.day>=0&&S.day<DB.days.length)) S.day=0;
    return broken;
  }

  /* Imported candidates join the place list as records of their own, unless one was matched to a
     place we already have, which then carries it as a link. Rebuilt only when imports change. */
  function impPlace(m){
    return {id:m.id,name:m.name,nameJa:m.name,cat:'imp',area:'imported',lat:m.lat,lon:m.lon,dur:60,hours:'always',
      gmaps:m.src==='gmaps'&&m.url?m.url:null,ig:'',igTag:'',vibe:m.note||'',vibeJa:m.note||'',best:'any',cost:'',book:false,flags:[],trend:0,outdoor:0,aesthetic:0,imp:m};
  }
  /* keyed on the version and the array itself: loadState() swaps in the saved imports after the
     first build, and a reload once lost every imported place that way */
  function rebuildPlaces(){
    if(DB.impVer===S.impVer&&DB.impRef===S.imports) return;
    DB.impVer=S.impVer; DB.impRef=S.imports;
    DB.base.forEach(p=>{ delete p.reels; });
    const extra=[];
    S.imports.forEach(m=>{ const host=m.placeId&&DB.baseMap.get(m.placeId);
      if(host) (host.reels=host.reels||[]).push(m); else if(m.lat!=null&&m.lon!=null) extra.push(impPlace(m)); });
    DB.list=DB.base.concat(extra); DB.places=new Map(DB.list.map(p=>[p.id,p]));
  }
  const impChanged=()=>{ S.impVer++; save(); render(); };

  /* the simulation lives in makeSim (module level, pure), so node tests run the same code */
  let SIM=null;
  const schedule=(day,list,P)=>SIM.schedule(day,list,P||plan(),{deadline:S.dayEnd});
  const bestPos=(day,list,id,P)=>SIM.bestPos(day,list,id,P||plan(),{deadline:S.dayEnd}).pos;
  const fitsOf=(day,list,id)=>SIM.bestPos(day,list,id,plan(),{deadline:S.dayEnd});
  const sunsetOf=(p,date)=>SIM.sunsetOf(p,date), sunriseOf=(p,date)=>SIM.sunriseOf(p,date);
  /* best is a comma list ("sunrise,sunset"); each part with its own time at this place */
  const bestText=(p,date)=>String(p.best).split(',').map(b=>tr(BEST,b)+(b==='sunrise'?' '+hm(sunriseOf(p,date)):b==='sunset'?' '+hm(sunsetOf(p,date)):'')).join('・');
  function bookedCount(sc){ let a=0, b=0; const seen=new Set(); sc.rows.forEach(r=>{ const p=place(r.id); if(!p||!p.book||seen.has(r.id)) return; seen.add(r.id); b++; if(S.booked[r.id]) a++; }); return {a,b}; }

  /* ---------- render: toolbar, day strip ---------- */
  function renderTop(){
    const p=plan();
    E.bar.querySelector('.pl-planbtn-k').textContent=pt('plan');
    E.bar.querySelector('.pl-planbtn-v').textContent=planName(p);
    E.bar.classList.toggle('pl-mine',p.id==='my');
    E.undo.disabled=!S.hist.length;
  }
  function renderDays(){
    const p=plan();
    E.days.innerHTML=DB.days.map((d,i)=>{ const n=(p.days[d.date]||[]).filter(id=>DB.places.has(id)).length;
      return `<button type="button" class="pl-daybtn" style="${dayStyle(i)}" data-day="${i}" aria-pressed="${i===S.day}">
        <span class="pl-dn">${+d.date.slice(8)}</span><span class="pl-dw">${wdName(d.date)}</span><span class="pl-dc"><span class="sr">${pt('stops',{n})}</span>${n?'<i></i>'.repeat(Math.min(n,6)):'<i class="pl-no"></i>'}</span></button>`;
    }).join('');
  }

  /* ---------- render: the day ---------- */
  function warnText(w,day){
    switch(w.k){
      case 'closed': return pt('closed',{w:wdName(day.date)});
      case 'closedAt': return pt('closedAt',{t:hm(w.t)});
      case 'dark': return pt('dark',{t:hm(w.t)});
      case 'tide': return pt('tide',{t:w.t});
      case 'ferryMiss': return pt('ferryMiss',{t:w.t});
      case 'ferryBack': return pt('ferryBack',{t:w.t});
      case 'ferryDay': return pt('ferryDay',{w:wdName(day.date)});
      case 'over': return w.flight?pt('overFlight',{t:hm(w.t)}):w.soft?pt('over',{t:hm(w.t),d:dur(w.m)}):pt('overAt',{name:nm(place(w.at)),t:hm(w.t),d:dur(w.m)});
      case 'dawn': return pt('dawn',{t:hm(w.t)});
      case 'sunMiss': return pt(w.e==='rise'?'missRise':'missSet',{t:hm(w.t)});
      default: return '';
    }
  }
  function infoText(x){
    switch(x.k){
      case 'overnight': return pt('overnight'); case 'hoursUnknown': return pt('hoursUnknown'); case 'tideCheck': return pt('tideCheck');
      case 'sunrise': return pt('sunrise',{t:hm(x.t)}); case 'sunsetAt': return pt('sunsetAt',{t:hm(x.t)});
      case 'golden': return pt(x.e==='rise'?'goldRise':'goldSet',{t:hm(x.t)});
      case 'ferryUnverified': return '⛴ '+pt('unverified'); case 'tideOk': return pt('tideOk',{t:x.t}); case 'tight': return pt('tight',{d:dur(x.m)}); case 'darkDrive': return pt('darkDrive',{t:hm(x.t)});
      default: return '';
    }
  }
  const unverifiedHours=p=>hasFlag(p,'hours-times-unverified')||p.hours==='unknown';
  function hoursText(p,date){
    if(unverifiedHours(p)) return pt('hoursUnknown');
    const h=p.hours; if(!h||typeof h!=='object') return pt('always');
    const v=h[WD[wdOf(date)]]; if(!v) return pt('closedToday');
    return String(v).split(',').map(s=>s.split('-').map(x=>hm(toMin(x))).join('–')).join(', ');
  }
  const chip=(cls,icon,txt)=>`<span class="${cls}">${icon?ic(icon):''}${txt}</span>`;
  function legInner(l,to){
    const gap=to.wait>0?`<span class="pl-gap">${pt('wait',{t:hm(to.begin),d:dur(to.wait)})}</span>`:'';
    if(l.kind==='ferry'){
      const f=l.f;
      return `<span class="pl-lp">${ic('car')}${dur(l.d1)}</span><span class="pl-lp pl-boat">${l.listed?pt('sail',{t:hm(l.dep),d:dur(l.sail)}):pt('sailAny',{d:dur(l.sail)})}</span>`+
        (l.listed&&l.way==='out'?`<span class="pl-km">${pt('board',{d:dur(f.board!=null?f.board:15)})}</span>`:'')+
        `<span class="pl-lp">${ic('car')}${dur(l.d2)}</span>`+(f.verified===false?`<span class="pl-unv">${pt('unverified')}</span>`:'')+gap+
        (f.note||f.noteJa?`<span class="pl-fnote">${esc(ja()?f.noteJa||f.note:f.note||f.noteJa)}</span>`:'');
    }
    /* a no-road place: on foot to or from its road end, the road leg between */
    if(l.combo){ const w=m=>m?`<span class="pl-lp pl-walk">🥾 ${pt('walkN',{d:dur(m)})}</span>`:''; return w(l.wa)+(l.sub?legInner(l.sub,{wait:0}):'')+w(l.wb)+gap; }
    if(l.kind==='walk'){ const wn=l.w&&(ja()?l.w.noteJa||l.w.note:l.w.note||l.w.noteJa); return `<span class="pl-lp pl-walk">🥾 ${pt('walkN',{d:dur(l.min)})}</span>`+gap+(wn?`<span class="pl-fnote">${esc(wn)}</span>`:''); }
    return `${ic('car')}<span>${l.est?`<span class="pl-est" title="${esc(pt('estT'))}">≈</span>`:''}${dur(l.min)}</span><span class="pl-km">${uKm(Math.round(l.km))}</span>`+gap;
  }
  const whenText=r=>`${hm(r.begin)}–${hm(r.dep)}`;
  const bookBtn=(p,N)=>`<button type="button" class="pl-bookt" data-act="booked" data-id="${p.id}" aria-pressed="${!!S.booked[p.id]}">${ic(S.booked[p.id]?'check':'bookmark')}<span>${S.booked[p.id]?pt('booked'):pt('book')}</span><span class="sr">${pt('markBooked',{name:N})}</span></button>`;
  const infosHTML=r=>r.infos.length?`<div class="pl-infos">${r.infos.map(x=>chip('pl-info',x.k==='sunrise'||x.k==='sunsetAt'?'sunset':'',infoText(x))).join('')}</div>`:'';
  const warnsHTML=(r,day)=>r.warns.length?`<div class="pl-warns">${r.warns.map(w=>chip('pl-warn','alert',warnText(w,day))).join('')}</div>`:'';
  /* The note editor keeps its draft across any re-render: S.noteOpen + S.drafts. */
  function stopHTML(r,n,day){
    const p=place(r.id), h=hoursText(p,day.date), fl=flagsOf(p).filter(f=>f!=='ferry'), N=esc(nm(p)), P=plan();
    const noteTxt=noteText(P,p.id), open=S.noteOpen===p.id, draft=open&&S.drafts[p.id]!=null?S.drafts[p.id]:noteTxt, eid=`pl-ne-${slug}-${p.id}`;
    return `<article class="pl-stop" data-id="${p.id}">
      <button type="button" class="pl-node" data-act="focus" data-id="${p.id}"><span class="sr">${pt('focus',{name:N})}</span><span class="pl-n">${n}</span></button>
      <div class="pl-body">
        <div class="pl-when">${whenText(r)}</div>
        <h3 class="pl-h3"><button type="button" class="pl-nm" data-act="open" data-id="${p.id}"${nmLang(p)}>${wbr(nm(p))}</button></h3>
        ${alt(p)?`<div class="pl-sub"${altLang(p)}>${esc(alt(p))}</div>`:''}
        <div class="pl-meta">
          <span class="pl-m">${ic(glyphOf(p))}${tr(CAT,p.cat)}</span>
          ${p.hours&&p.hours!=='always'&&h!==pt('closedToday')?`<span class="pl-m">${ic('clock')}${h}</span>`:''}
          ${p.cost&&p.cost!=='free'?`<span class="pl-m">${esc(p.cost)}</span>`:''}
          ${p.badge?`<span class="pl-sig">${esc(p.badge[lang()]||p.badge.ja)}</span>`:''}${savedTag(p)}
        </div>
        ${fl.length?`<div class="pl-flagrow">${fl.map(f=>`<span class="pl-flag${rankFlag(f)<99?' pl-safe':''}">${tr(FLAG,f)}</span>`).join('')}</div>`:''}
        ${p.book?bookBtn(p,N):''}
        <div class="pl-ri">${infosHTML(r)}</div><div class="pl-rw">${warnsHTML(r,day)}</div>
        <button type="button" class="pl-notebtn${noteTxt?' pl-has':''}" data-act="note" data-id="${p.id}" aria-expanded="${open}" aria-controls="${eid}"><span aria-hidden="true">${ic('pencil','xs')}${noteTxt?esc(noteTxt):pt('note')}</span><span class="sr">${pt('noteN',{name:N})}${noteTxt?'：'+esc(noteTxt):''}</span></button>
      </div>
      <button type="button" class="pl-handle" data-act="order" data-id="${p.id}">${ic('grip')}<span class="sr">${pt('orderN',{name:N})}</span></button>
      <div class="pl-acts">
        <div class="pl-stay" role="group" aria-label="${esc(pt('stay'))}">
          <button type="button" class="pl-ab" data-act="stay" data-d="-15" data-id="${p.id}">${ic('minus','sm')}<span class="sr">${pt('stayDec',{name:N})}</span></button>
          <output><small aria-hidden="true">${pt('stay')}</small><span class="pl-sv">${dur(r.stay)}</span></output>
          <button type="button" class="pl-ab" data-act="stay" data-d="15" data-id="${p.id}">${ic('plus','sm')}<span class="sr">${pt('stayInc',{name:N})}</span></button>
        </div>
        <span class="pl-sp"></span>
        <button type="button" class="pl-ab pl-lbl" data-act="swap" data-id="${p.id}">${ic('swap','sm')}<span aria-hidden="true">${pt('swap')}</span><span class="sr">${pt('swapN',{name:N})}</span></button>
        <button type="button" class="pl-ab pl-lbl" data-act="move" data-id="${p.id}">${ic('calendar','sm')}<span aria-hidden="true">${pt('move')}</span><span class="sr">${pt('moveN',{name:N})}</span></button>
        <button type="button" class="pl-ab pl-lbl pl-del" data-act="del" data-id="${p.id}">${ic('x','sm')}<span aria-hidden="true">${pt('del')}</span><span class="sr">${pt('delN',{name:N})}</span></button>
      </div>
      <div class="pl-noteed" id="${eid}"${open?'':' hidden'}><textarea name="note" rows="2" maxlength="300" placeholder="${esc(pt('notePh'))}" data-id="${p.id}" aria-label="${esc(pt('noteN',{name:N}))}">${esc(draft)}</textarea>
        <button type="button" class="pl-btn pl-sec" data-act="notesave" data-id="${p.id}">${pt('done')}</button></div>
    </article>`;
  }
  /* every end limit says what it is: the day-end setting, the flight, or this plan's anchor */
  function endSmall(e){
    if(!e.explicit&&!e.warns.length) return '';
    const hint=!e.explicit?pt('limitHint',{t:hm(e.limit)}):e.id==='akl'?pt('limitFlight',{t:hm(e.limit)}):pt('limitAnchor',{t:hm(e.limit),name:nm(place(e.id))});
    const w=e.warns.find(x=>x.k==='over');
    return `<small${w?' class="pl-bad"':''} title="${esc(hint)}">${w?(w.flight?pt('overFlight',{t:hm(e.limit)}):pt('over',{t:hm(e.limit),d:dur(w.m)})):pt('slack',{t:hm(e.limit),d:dur(e.limit-e.arr)})}<span class="pl-hintl">${hint}</span></small>`;
  }
  /* The day's photo: a stop with one, preferring sunrise/sunset heroes, then the most photogenic. */
  function heroOf(sc){
    if(!DB.photos) return null;
    const c=sc.rows.filter(r=>r.kind==='stop'&&DB.photos[r.id]).map(r=>place(r.id))
      .sort((a,b)=>((b.best==='sunrise'||b.best==='sunset')-(a.best==='sunrise'||a.best==='sunset'))||(b.aesthetic||0)-(a.aesthetic||0));
    return c[0]||null;
  }
  const srcset=ph=>ph.src2x?` srcset="${esc(ph.src)} 1x, ${esc(ph.src2x)} 2x"`:'';
  const thumb=p=>{ const ph=p&&DB.photos&&DB.photos[p.id];
    return ph?`<span class="pl-glyph pl-thumb"><img src="${esc(ph.thumb||ph.src)}" alt="" loading="lazy" decoding="async" width="40" height="40"></span>`:`<span class="pl-glyph">${ic(glyphOf(p))}</span>`; };
  const photoHTML=(p,cls,eager)=>{ const ph=p&&DB.photos&&DB.photos[p.id]; if(!ph) return '';
    return `<figure class="${cls}"><img src="${esc(ph.src)}"${srcset(ph)} width="${ph.w||480}" height="${ph.h||320}" alt="" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">
      <figcaption>${ph.page?`<a href="${esc(ph.page)}" target="_blank" rel="noopener">${esc(ph.credit||'Wikimedia Commons')}</a>`:esc(ph.credit==='Travel book'?pt('creditBook'):ph.credit||'')}</figcaption></figure>`; };
  /* a cafe's own line (sig/sigJa) set large on its colour card, like a menu card */
  const colorCard=(p,cls)=>{ const sg=p&&(ja()?p.sigJa||p.sig:p.sig||p.sigJa);
    return `<div class="${cls}${sg?' pl-sigcard':''}"${sg?'':' aria-hidden="true"'}>${sg?`<span class="pl-sigtxt">${esc(sg)}</span>`:''}${ic(p?glyphOf(p):'map')}</div>`; };
  const statsHTML=(sc,n,e)=>{ const bk=bookedCount(sc), st=[`${ic('car','xs')}${sc.est?'≈':''}${pt('drive',{d:dur(sc.drive)})}`, uKm(Math.round(sc.km)), pt('stops',{n}), pt('ends',{t:hm(e.arr)})];
    if(bk.b) st.push(pt('bookedN',{a:bk.a,b:bk.b})); return st.map(x=>`<span class="pl-stat">${x}</span>`).join(''); };
  const headWarns=(sc,e,day)=>sc.long||e.warns.length?`${sc.long?chip('pl-warn','alert',pt('longDrive',{d:dur(sc.drive)})):''}${e.warns.map(x=>chip('pl-warn','alert',warnText(x,day))).join('')}`:'';
  function startLine(s){
    if(!s.an.buffer) return '';
    const nt=esc(ja()?s.an.noteJa||s.an.note||'':s.an.note||'');
    return `<div class="pl-ax">${pt('landed')} ${hm(s.arr)} → ${nt} ${dur(s.an.buffer)} → ${pt('depart')} <b>${hm(s.dep)}</b></div>`;
  }
  const anchorBook=r=>{ const p=place(r.id); return p&&p.book?bookBtn(p,esc(nm(p))):''; };
  function renderMain(anim){
    const day=DB.days[S.day], sc=schedule(day), rows=sc.rows, n=rows.length-2, P=plan();
    S.sc=sc;
    const s=rows[0], e=rows[rows.length-1], sp=place(s.id), ep=place(e.id), d=+day.date.slice(8), w=wdOf(day.date);
    const hero=heroOf(sc);
    const head=`<header class="pl-dayhead">
        <div class="pl-dayband">${hero?photoHTML(hero,'pl-dayphoto',true):colorCard(n?place(rows[1].id):null,'pl-daycard')}
          <button type="button" class="pl-storybtn" data-act="story">${ic('camera','sm')}${pt('story')}</button></div>
        <div class="pl-dh-row"><span class="pl-dh-num" aria-hidden="true">${d}</span>
        <div class="pl-dh-txt">
          <div class="pl-dh-mon"><span>${ja()?`2月${d}日 ${WDJA[w]}曜日`:`${WDLONG[w]} ${d} February`}</span><span class="pl-dh-n">${pt('dayN',{n:S.day+1})}</span></div>
          <h2 class="pl-dh-title">${wbr(dayTitle(day,P))}</h2>
        </div></div>
        <p class="pl-dh-stats">${statsHTML(sc,n,e)}</p>
        <div class="pl-warns pl-hw">${headWarns(sc,e,day)}</div>
      </header>`;
    const start=`<div class="pl-anchor pl-start">
        <div class="pl-aic">${ic(glyphOf(sp))}</div>
        <div><div class="pl-ak">${s.an.buffer?pt('landed'):pt('depart')}</div><div class="pl-an"${nmLang(sp)}>${wbr(nm(sp))}</div><div class="pl-sl">${startLine(s)}</div>${anchorBook(s)}</div>
        <label class="pl-timeset"><span class="sr">${s.an.buffer?pt('landed'):pt('startTime')}</span><span class="pl-tv" aria-hidden="true">${hm(s.arr)}</span><input class="pl-timein" name="start" type="time" step="300" value="${hhmm(s.arr)}" data-act="start"></label>
      </div>`;
    const list=rows.slice(1,-1).map((r,k)=>`<li class="pl-row" data-id="${r.id}">${stopHTML(r,k+1,day)}<div class="pl-leg">${legInner(rows[k+2].leg,rows[k+2])}</div></li>`).join('');
    const end=`<div class="pl-anchor pl-end${e.warns.length?' pl-bad':''}">
        <div class="pl-aic">${ic(glyphOf(ep))}</div>
        <div><div class="pl-ak">${pt('arrive')}</div><div class="pl-an"${nmLang(ep)}>${wbr(nm(ep))}</div>
          <div class="pl-ei">${e.infos.length?`<div class="pl-infos">${e.infos.map(x=>chip('pl-info','',infoText(x))).join('')}</div>`:''}</div>${anchorBook(e)}</div>
        <div class="pl-at">${hm(e.arr)}${endSmall(e)}</div>
      </div>`;
    const prev=S.day>0, next=S.day<DB.days.length-1;
    main.setAttribute('style',dayStyle(S.day));
    main.innerHTML=head+`<div class="pl-tl">${start}`+
      (n?`<div class="pl-leg pl-leg0">${legInner(rows[1].leg,rows[1])}</div><ol class="pl-list">${list}</ol>`
        :`<div class="pl-leg"></div><div class="pl-empty">${pt('emptyDay')}<button type="button" class="pl-btn pl-pri" data-act="browse">${ic('plus','sm')}${pt('addHere')}</button></div><div class="pl-leg pl-leg0">${legInner(e.leg,e)}</div>`)+
      `${end}</div>`+(n?`<button type="button" class="pl-addstop" data-act="browse">${ic('plus','sm')}${pt('addHere')}</button>
        <button type="button" class="pl-btn pl-ghost pl-clearday" data-act="clearday">${ic('trash','sm')}${pt('clearDay')}</button>`:'')+
      `<nav class="pl-daynav">${prev?`<button type="button" class="pl-btn pl-sec" data-act="day" data-day="${S.day-1}">${ic('chevron-left','sm')}${pt('prevDay')}</button>`:'<span></span>'}
        ${next?`<button type="button" class="pl-btn pl-sec" data-act="day" data-day="${S.day+1}">${pt('nextDay')}${ic('chevron-right','sm')}</button>`:'<span></span>'}</nav>`+
      `<p class="pl-foot">${pt('foot')}</p>`;
    if(anim&&!reduced.matches&&main.animate) main.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  /* A change that moves times but not places (stay ±, start time, a note, a booking) patches the
     day in place: no list rebuild, no map work. Falls back to a full render if the rows differ. */
  function patchDay(){
    const day=DB.days[S.day], sc=schedule(day), rows=sc.rows, ol=main.querySelector('.pl-list');
    const lis=ol?[...ol.children]:[];
    if(lis.length!==rows.length-2||lis.some((li,k)=>li.dataset.id!==rows[k+1].id)){ render(); return; }
    S.sc=sc;
    const P=plan();
    lis.forEach((li,k)=>{ const r=rows[k+1], p=place(r.id), nt=noteText(P,r.id);
      li.querySelector('.pl-when').textContent=whenText(r);
      li.querySelector('.pl-sv').textContent=dur(r.stay);
      li.querySelector('.pl-ri').innerHTML=infosHTML(r); li.querySelector('.pl-rw').innerHTML=warnsHTML(r,day);
      li.querySelector('.pl-leg').innerHTML=legInner(rows[k+2].leg,rows[k+2]);
      const nb=li.querySelector('.pl-notebtn'); if(nb&&S.noteOpen!==r.id){ nb.classList.toggle('pl-has',!!nt); nb.querySelector('[aria-hidden]').innerHTML=ic('pencil','xs')+(nt?esc(nt):pt('note')); nb.querySelector('.sr').textContent=pt('noteN',{name:nm(p)})+(nt?'：'+nt:''); }
      const bb=li.querySelector('.pl-bookt'); if(bb) syncBook(bb,r.id); });
    const l0=main.querySelector('.pl-leg0'); if(l0) l0.innerHTML=legInner(rows[1].leg,rows[1]);
    const s=rows[0], e=rows[rows.length-1];
    const tv=main.querySelector('.pl-start .pl-tv'), ti=main.querySelector('.pl-start .pl-timein'); if(tv) tv.textContent=hm(s.arr); if(ti&&document.activeElement!==ti) ti.value=hhmm(s.arr);
    const sl=main.querySelector('.pl-start .pl-sl'); if(sl) sl.innerHTML=startLine(s);
    main.querySelectorAll('.pl-anchor .pl-bookt').forEach(b=>syncBook(b,b.dataset.id));
    const at=main.querySelector('.pl-end .pl-at'); if(at) at.innerHTML=hm(e.arr)+endSmall(e);
    const ei=main.querySelector('.pl-end .pl-ei'); if(ei) ei.innerHTML=e.infos.length?`<div class="pl-infos">${e.infos.map(x=>chip('pl-info','',infoText(x))).join('')}</div>`:'';
    main.querySelector('.pl-end').classList.toggle('pl-bad',!!e.warns.length);
    main.querySelector('.pl-dh-stats').innerHTML=statsHTML(sc,rows.length-2,e);
    main.querySelector('.pl-hw').innerHTML=headWarns(sc,e,day);
    renderTop(); renderDays();
  }
  function syncBook(b,id){ const on=!!S.booked[id]; b.setAttribute('aria-pressed',on); b.querySelector('use').setAttribute('href','#i-'+(on?'check':'bookmark')); b.querySelector('span').textContent=on?pt('booked'):pt('book'); }
  /* Live times during a drag: text in place only, so the dragged row keeps its pointer. */
  function liveTimes(ids){
    const day=DB.days[S.day], sc=schedule(day,ids), rows=sc.rows, ol=main.querySelector('.pl-list'); if(!ol) return;
    ids.forEach((id,p)=>{ const li=ol.querySelector(`.pl-row[data-id="${id}"]`), r=rows[p+1]; if(!li||!r) return;
      li.querySelector('.pl-n').textContent=p+1;
      li.querySelector('.pl-when').textContent=whenText(r);
      li.querySelector('.pl-leg').innerHTML=legInner(rows[p+2].leg,rows[p+2]); });
    const l0=main.querySelector('.pl-leg0'); if(l0) l0.innerHTML=legInner(rows[1].leg,rows[1]);
    const e=rows[rows.length-1], at=main.querySelector('.pl-end .pl-at'); if(at) at.innerHTML=hm(e.arr)+endSmall(e);
  }
  function focusStop(i){
    const names=main.querySelectorAll('.pl-nm');
    const t=names[Math.min(i,names.length-1)]||main.querySelector('.pl-addstop')||main.querySelector('.pl-empty .pl-btn');
    if(t) t.focus({preventScroll:false});
  }

  /* ---------- map layers. One delegated listener on the svg; pins are not focusable ---------- */
  function routeKey(a,b){ return a+'>'+b; }
  function geom(a,b){
    const k=routeKey(a,b), r=k in DB.routes?DB.routes[k]:k in RC.map?RC.map[k]:null;
    if(r!=null){ const d=decPoly(r); if(d){ if(k in RC.map) touchRoute(k); return {pts:d}; } }
    const k2=routeKey(b,a), r2=k2 in DB.routes?DB.routes[k2]:k2 in RC.map?RC.map[k2]:null;
    if(r2!=null){ const d=decPoly(r2); if(d&&typeof d!=='string') return {pts:d.slice().reverse()}; if(typeof d==='string') return {pts:d}; }
    return null;
  }
  const pathD=pts=>typeof pts==='string'?pts:'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
  /* A leg with no road geometry yet is a gentle solid arc, so it never reads as a boat. */
  function arc(p0,p1){
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], k=0.12, mx=(p0[0]+p1[0])/2-dy*k, my=(p0[1]+p1[1])/2+dx*k;
    return {d:`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`, mid:[(p0[0]+2*mx+p1[0])/4,(p0[1]+2*my+p1[1])/4], len:Math.hypot(dx,dy)};
  }
  function legSegments(sc){
    const segs=[];
    for(let k=1;k<sc.rows.length;k++){ const r=sc.rows[k], l=r.leg, a=sc.rows[k-1].id;
      (l.parts||[{a,b:r.id,kind:'drive'}]).forEach(pp=>{ if(pp.a===pp.b) return; const A=place(pp.a), B=place(pp.b); if(!A||!B) return;
        segs.push({a:pp.a,b:pp.b,kind:pp.kind,p0:prj(A.lat,A.lon),p1:prj(B.lat,B.lon)}); }); }
    return segs;
  }
  function renderLegs(){
    const segs=legSegments(S.sc); let html='', anyEst=false;
    segs.forEach(s=>{
      if(s.kind==='ferry'){ html+=`<path class="pl-leg-ferry" d="M${s.p0[0].toFixed(1)} ${s.p0[1].toFixed(1)}L${s.p1[0].toFixed(1)} ${s.p1[1].toFixed(1)}"/>`; return; }
      if(s.kind==='walk'){ const a=arc(s.p0,s.p1); html+=`<path class="pl-leg-walk" d="${a.d}"/>`+(a.len>10?`<g class="pl-estmk pl-boot" transform="translate(${a.mid[0].toFixed(1)} ${a.mid[1].toFixed(1)})"><g class="pl-s"><text>🥾</text></g></g>`:''); return; }
      const gm=geom(s.a,s.b);
      if(gm) html+=`<path class="pl-leg-road" d="${pathD(gm.pts)}"/>`;
      else { const a=arc(s.p0,s.p1); anyEst=true;
        html+=`<path class="pl-leg-est" d="${a.d}"/>`+(a.len>14?`<g class="pl-estmk" transform="translate(${a.mid[0].toFixed(1)} ${a.mid[1].toFixed(1)})"><g class="pl-s"><text>≈</text></g></g>`:''); }
    });
    svg.querySelector('.pl-legs').innerHTML=html;
    E.estnote.hidden=!anyEst||!DB.routesLoaded; E.estnote.textContent=pt('estRoute');
    if(anyEst) queueRoutes(segs);
  }
  const tfxy=xy=>`transform="translate(${xy[0].toFixed(1)} ${xy[1].toFixed(1)})"`;
  function renderMap(){
    if(!S.sc) return;
    const sc=S.sc, planned=plannedMap(), cur=new Set(sc.rows.map(r=>r.id));
    svg.setAttribute('style',dayStyle(S.day)+(svg.style.getPropertyValue('--z')?';--z:'+svg.style.getPropertyValue('--z'):''));
    const pts=sc.rows.map(r=>{ const p=place(r.id); return prj(p.lat,p.lon); });
    renderLegs();
    let st=''; const seen=new Set();
    sc.rows.forEach((r,k)=>{ if(r.kind==='stop'||seen.has(r.id)) return; seen.add(r.id);
      st+=`<g class="pl-pin pl-anc" data-id="${r.id}" data-k="anc" ${tfxy(pts[k])}><g class="pl-s"><circle class="pl-hit" r="18"/><circle class="pl-ring" r="15"/><circle class="pl-mk" r="10"/><use href="#i-${glyphOf(place(r.id))}" x="-6.5" y="-6.5" width="13" height="13"/></g></g>`; });
    for(let k=sc.rows.length-2;k>=1;k--)   /* later stops underneath, so 1 sits on top */
      st+=`<g class="pl-pin" data-id="${sc.rows[k].id}" data-k="stop" ${tfxy(pts[k])}><g class="pl-s"><circle class="pl-hit" r="20"/><circle class="pl-ring" r="16"/><circle class="pl-mk" r="11"/><text class="pl-num">${k}</text>${place(sc.rows[k].id).saved?SVMARK.replace('translate(4 -13)','translate(7 -18)'):''}</g></g>`;
    svg.querySelector('.pl-stops').innerHTML=st;
    let ot='';
    planned.forEach((di,id)=>{ if(cur.has(id)) return; const p=place(id); if(!p||!isCand(p)) return;
      ot+=`<g class="pl-pin" data-id="${id}" data-k="other" style="${dayStyle(di)}" ${tfxy(prj(p.lat,p.lon))}><g class="pl-s"><circle class="pl-hit" r="14"/><circle class="pl-mk" r="4.5"/></g></g>`; });
    svg.querySelector('.pl-others').innerHTML=ot;
    syncCands(planned,cur);
    if(S.sel) select(S.sel.id,S.sel.k,true);
  }
  /* The ~180 candidate pins are built once per place list (CANDV), then only their pl-off class
     changes as places join or leave the plan; while not browsing the whole layer is display:none. */
  let CANDV=-1, CANDOFF=new Set();
  function syncCands(planned,cur){
    const layer=svg.querySelector('.pl-cands');
    if(CANDV!==DB.impVer){ CANDV=DB.impVer; CANDOFF=new Set();
      layer.innerHTML=DB.list.filter(isCand).map(p=>p.imp
        ?`<g class="pl-pin pl-impin" data-id="${p.id}" data-k="cand" ${tfxy(prj(p.lat,p.lon))}><g class="pl-s"><circle class="pl-hit" r="16"/><circle class="pl-ring" r="12"/><rect class="pl-mk" x="-4.6" y="-4.6" width="9.2" height="9.2" transform="rotate(45)"/></g></g>`
        :`<g class="pl-pin${p.saved?' pl-svpin':''}" data-id="${p.id}" data-k="cand" ${tfxy(prj(p.lat,p.lon))}><g class="pl-s"><circle class="pl-hit" r="16"/><circle class="pl-ring" r="11"/><circle class="pl-mk" r="4"/>${p.saved?SVMARK:''}</g></g>`).join(''); }
    const off=new Set(); planned.forEach((_,id)=>off.add(id)); cur.forEach(id=>off.add(id));
    const flip=id=>{ const g=layer.querySelector(`.pl-pin[data-id="${CSS.escape(id)}"]`); if(g) g.classList.toggle('pl-off',off.has(id)); };
    off.forEach(id=>{ if(!CANDOFF.has(id)) flip(id); }); CANDOFF.forEach(id=>{ if(!off.has(id)) flip(id); });
    CANDOFF=off;
  }
  /* Candidates show only while browsing or placing, so the day's own pins read first. */
  function showCands(on){ S.browsing=on; svg.classList.toggle('pl-show-cands',on||!!S.placing); }
  /* Selection toggles one class and moves the one shared label; it never rebuilds pins. */
  function select(id,k,quiet){
    const prev=svg.querySelector('.pl-pin.pl-sel'); if(prev) prev.classList.remove('pl-sel');
    const lab=svg.querySelector('.pl-labg'); lab.setAttribute('visibility','hidden'); S.sel=null;
    if(!id) return;
    const pin=svg.querySelector(`.pl-pin[data-id="${id}"][data-k="${k}"]`)||svg.querySelector(`.pl-pin[data-id="${id}"]`); if(!pin) return;
    S.sel={id,k}; pin.classList.add('pl-sel');
    lab.setAttribute('transform',pin.getAttribute('transform'));
    const t=lab.querySelector('text'), x=prj(place(id).lat,place(id).lon)[0], right=x>M.cur[0]+M.cur[2]*0.62;
    t.textContent=nm(place(id)); t.setAttribute('text-anchor',right?'end':'start');
    const off=pin.dataset.k==='cand'||pin.dataset.k==='other'?11:16; t.setAttribute('x',right?-off:off);
    lab.setAttribute('visibility','visible');
    if(!quiet) ensureVisible(id);
  }

  /* ---------- road geometry: routes.json first, then the OSRM demo server, one leg at a time when
     idle and online, cached LRU (200) in plan-ui ---------- */
  const RQ={q:[],busy:false,dead:0};
  function touchRoute(k){ const i=RC.order.indexOf(k); if(i>=0&&i<RC.order.length-1){ RC.order.splice(i,1); RC.order.push(k); } }
  function queueRoutes(segs){
    segs.forEach(s=>{ if(s.kind!=='drive') return; const k=routeKey(s.a,s.b);
      if(!geom(s.a,s.b)&&RQ.q.indexOf(k)<0) RQ.q.push(k); });
    pumpRoutes();
  }
  const busyUI=()=>!!(DRAG||gest||M.tw||M.wm||M.frame);
  function pumpRoutes(){
    if(RQ.busy||!RQ.q.length||!navigator.onLine||Date.now()<RQ.dead||!DB.routesLoaded||busyUI()) return;
    RQ.busy=true;
    idle(()=>{
      if(busyUI()){ RQ.busy=false; return; }      /* resumed from the drag's or gesture's end */
      const k=RQ.q.shift(), [a,b]=k.split('>'), A=place(a), B=place(b);
      if(!A||!B||geom(a,b)){ RQ.busy=false; pumpRoutes(); return; }
      fetch(`https://router.project-osrm.org/route/v1/driving/${A.lon},${A.lat};${B.lon},${B.lat}?overview=simplified&geometries=geojson`)
        .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
        .then(j=>{ const c=j&&j.routes&&j.routes[0]&&j.routes[0].geometry&&j.routes[0].geometry.coordinates; if(!c||c.length<2) throw new Error('empty');
          RC.map[k]=encPoly(simplify(c.map(([lon,lat])=>prj(lat,lon)),0.25)); RC.order.push(k);
          while(RC.order.length>200) delete RC.map[RC.order.shift()];
          saveUISoon(); if(!busyUI()) renderLegs(); else RQ.redraw=true; })
        .catch(()=>{ RQ.dead=Date.now()+60000; RQ.q.unshift(k); })
        .then(()=>{ RQ.busy=false; setTimeout(pumpRoutes,1100); });
    },3000);
  }

  /* ---------- zoom and pan ----------
     Every move — a gesture, the +/− buttons, a fit — moves .pl-world by a CSS transform and writes
     viewBox and --z once, when it ends, so no frame restyles the pins. --z is screen px per map
     unit; `scale(1/--z)` on each pin's inner group holds pins, labels and strokes at screen size. */
  const M={vb:[0,0,W,H],cur:[0,0,W,H],A:W/H,pxw:343,frame:0,tw:0,wheel:0,wm:null,ready:false,needFit:false};
  const maxW=()=>Math.max(W,H*M.A);
  const fin=b=>b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
  function clampBox(cx,cy,w){
    w=Math.max(W/60,Math.min(maxW(),w)); const h=w/M.A;
    cx=w>=W?W/2:Math.max(w/2,Math.min(W-w/2,cx)); cy=h>=H?H/2:Math.max(h/2,Math.min(H-h/2,cy));
    return [cx-w/2,cy-h/2,w,h];
  }
  function commit(){ if(!fin(M.vb)) return; svg.setAttribute('viewBox',M.vb.map(n=>n.toFixed(2)).join(' ')); svg.style.setProperty('--z',(M.pxw/M.vb[2]).toFixed(4)); }
  function setNow(box){ if(!fin(box)) return; cancelAnimationFrame(M.frame); M.frame=0; M.vb=box.slice(); M.cur=box.slice(); E.world.style.transform=''; commit(); }
  function paintLive(){ M.frame=0; const v=M.vb, c=M.cur, k=v[2]/c[2]; E.world.style.transform=`matrix(${k},0,0,${k},${v[0]-c[0]*k},${v[1]-c[1]*k})`; }
  function live(cx,cy,w){ const b=clampBox(cx,cy,w); if(!fin(b)) return; M.cur=b; if(!M.frame) M.frame=raf(paintLive); }
  function settle(){ M.wm=null; setNow(M.cur); if(!gest) setTimeout(afterUI,0); }
  const centre=()=>[M.cur[0]+M.cur[2]/2,M.cur[1]+M.cur[3]/2];
  /* M.tw is the tween's frame id while one runs and 0 otherwise: busyUI() reads it, so it must be
     zeroed on the last frame and on every cancel, or routes and the coastline wait forever */
  const stopTw=()=>{ if(M.tw){ cancelAnimationFrame(M.tw); M.tw=0; } };
  function animateTo(cx,cy,w){
    stopTw();
    const to=clampBox(cx,cy,w); if(!fin(to)) return;
    if(reduced.matches||S.map==='closed'){ setNow(to); return; }
    if(M.cur.some((v,i)=>v!==M.vb[i])) setNow(M.cur);
    const [ax,ay]=centre(), w0=M.cur[2], bx=to[0]+to[2]/2, by=to[1]+to[3]/2, t0=performance.now();
    const step=now=>{ const t=Math.min(1,(now-t0)/420), e=1-Math.pow(1-t,3);
      M.cur=clampBox(ax+(bx-ax)*e, ay+(by-ay)*e, w0*Math.pow(to[2]/w0,e)); paintLive();
      if(t<1) M.tw=raf(step); else { M.tw=0; setNow(to); setTimeout(afterUI,0); } };
    M.tw=raf(step);
  }
  function fitDay(instant){
    if(!M.ready||S.map==='closed'||!S.sc){ M.needFit=true; return; }
    M.needFit=false;
    const xs=[], ys=[];
    S.sc.rows.forEach(r=>{ const p=place(r.id), xy=prj(p.lat,p.lon); xs.push(xy[0]); ys.push(xy[1]); });
    const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys), pw=M.pxw, ph=pw/M.A;
    const PL=24, PR=62, PT=26, PB=58;   /* clear of the zoom buttons (right) and the map footer (bottom) */
    const floor=x1-x0<1&&y1-y0<1?120:16;  /* one place only: a city-sized frame, not 43× on a roof */
    const w=Math.max(floor,(x1-x0)*pw/Math.max(60,pw-PL-PR),(y1-y0)*pw/Math.max(60,ph-PT-PB)), u=w/pw;
    const cx=(x0+x1)/2+(PR-PL)/2*u, cy=(y0+y1)/2+(PB-PT)/2*u;
    if(instant===true) setNow(clampBox(cx,cy,w)); else animateTo(cx,cy,w);
  }
  function ensureVisible(id){ const p=place(id), [x,y]=prj(p.lat,p.lon), v=M.cur, m=v[2]*0.12;
    if(x<v[0]+m||x>v[0]+v[2]-m||y<v[1]+m||y>v[1]+v[3]-m) animateTo(x,y,v[2]); }
  function measure(w,h){
    if(w==null){ const r=svg.getBoundingClientRect(); w=r.width; h=r.height; }
    if(!(h>=40&&w>=40)) return;
    const c=centre(), cw=M.cur[2]; M.A=w/h; M.pxw=w;
    if(!M.ready||M.needFit){ M.ready=true; fitDay(true); return; }
    const b=clampBox(c[0],c[1],cw); fin(b)?setNow(b):fitDay(true);
  }
  /* A gesture reads getScreenCTM() once, at its start, and works in map units from there. */
  let gest=null, dragged=false;
  function ctm(){ const m=svg.getScreenCTM(); return {a:m.a,e:m.e,f:m.f}; }
  const toMap=(m,x,y)=>[(x-m.e)/m.a,(y-m.f)/m.a];
  const tMid=t=>({clientX:(t[0].clientX+t[1].clientX)/2,clientY:(t[0].clientY+t[1].clientY)/2});
  const tGap=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  function gStart(ts){
    stopTw();
    if(M.cur.some((v,i)=>v!==M.vb[i])) settle();      /* the CTM must describe the committed box */
    const m=ctm(); gest={m,vb:M.cur.slice(),pts:ts.map(t=>({clientX:t.clientX,clientY:t.clientY}))};
    if(ts.length===2){ const mid=tMid(ts), p=toMap(m,mid.clientX,mid.clientY); gest.gap=tGap(ts)||1;
      gest.ax=p[0]; gest.ay=p[1]; gest.fx=(p[0]-gest.vb[0])/gest.vb[2]; gest.fy=(p[1]-gest.vb[1])/gest.vb[3]; }
  }
  function gMove(ts){
    if(!gest) return false;
    if(ts.length===1&&gest.pts.length===1){
      const dx=ts[0].clientX-gest.pts[0].clientX, dy=ts[0].clientY-gest.pts[0].clientY;
      if(!dragged&&Math.hypot(dx,dy)<6) return false;
      live(gest.vb[0]+gest.vb[2]/2-dx/gest.m.a, gest.vb[1]+gest.vb[3]/2-dy/gest.m.a, gest.vb[2]); return true;
    }
    if(ts.length===2&&gest.pts.length===2){
      const w=Math.max(W/60,Math.min(maxW(),gest.vb[2]*gest.gap/(tGap(ts)||1))), h=w/M.A;
      live(gest.ax-gest.fx*w+w/2, gest.ay-gest.fy*h+h/2, w); return true;
    }
    return false;
  }
  function gEnd(){ if(gest){ gest=null; settle(); afterUI(); } }
  function afterUI(){ if(busyUI()) return; if(RQ.redraw){ RQ.redraw=false; renderLegs(); } if(LANDQ) putLand(LANDQ); setTimeout(pumpRoutes,300); }
  function wireMap(){
    const arr=e=>Array.prototype.slice.call(e.touches);
    svg.addEventListener('touchstart',e=>{ dragged=false; gest=null; gStart(arr(e)); },{passive:true});
    svg.addEventListener('touchmove',e=>{ if(!gMove(arr(e))) return; dragged=true; e.preventDefault(); },{passive:false});
    svg.addEventListener('touchend',e=>{ gEnd(); if(e.touches.length) gStart(arr(e)); });   /* a finger lifted mid-pinch */
    svg.addEventListener('touchcancel',gEnd);
    svg.addEventListener('wheel',e=>{
      e.preventDefault(); stopTw();
      if(!M.wm){ if(M.cur.some((v,i)=>v!==M.vb[i])) setNow(M.cur); M.wm=ctm(); }
      const p=toMap(M.wm,e.clientX,e.clientY), base=M.vb, c=M.cur;
      const fx=(p[0]-base[0])/base[2], fy=(p[1]-base[1])/base[3], ax=c[0]+fx*c[2], ay=c[1]+fy*c[3];
      const w=Math.max(W/60,Math.min(maxW(),c[2]/Math.exp(-e.deltaY*(e.deltaMode?0.05:0.0022)))), h=w/M.A;
      live(ax-fx*w+w/2, ay-fy*h+h/2, w);
      clearTimeout(M.wheel); M.wheel=setTimeout(settle,160);
    },{passive:false});
    svg.addEventListener('mousedown',e=>{
      if(e.button) return; dragged=false; gStart([e]);
      const mv=ev=>{ if(gMove([ev])) dragged=true; };
      const up=()=>{ gEnd(); removeEventListener('mousemove',mv); removeEventListener('mouseup',up); };
      addEventListener('mousemove',mv); addEventListener('mouseup',up);
    });
    svg.addEventListener('click',e=>{
      if(dragged){ dragged=false; return; }      /* a pan of the map is not a tap */
      if(S.placing){ placeAt(e.clientX,e.clientY); return; }
      const pin=e.target.closest('.pl-pin'); if(!pin){ select(null); return; }
      const id=pin.dataset.id, k=pin.dataset.k;
      select(id,k,true);
      if(k==='stop'){ const b=[...main.querySelectorAll('.pl-nm')].find(x=>x.dataset.id===id);
        if(b){ const card=b.closest('.pl-stop'); card.scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'}); flash(card); } }
      else if(k!=='anc') openPlace(id);
    });
    view.querySelector('.pl-mapctl').addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return; const c=centre();
      if(b.dataset.zoom==='fit') fitDay();
      else if(b.dataset.zoom==='full') setFull(S.map!=='full');
      else animateTo(c[0],c[1],M.cur[2]/(b.dataset.zoom==='in'?1.7:1/1.7));
    });
    if(window.ResizeObserver) new ResizeObserver(es=>{ const c=es[es.length-1].contentRect; measure(c.width,c.height); }).observe(svg);
    else { addEventListener('resize',()=>measure()); raf(()=>measure()); }
    E.toggle.addEventListener('click',()=>{ S.map=S.map==='closed'?'peek':'closed'; saveUI(); mapState(); if(S.map!=='closed') setTimeout(()=>fitDay(),380); });
    /* the sticky map shrinks to a strip once the list scrolls under it */
    if(window.IntersectionObserver){ const sen=document.createElement('div'); sen.className='pl-sentinel'; view.insertBefore(sen,E.notice);
      new IntersectionObserver(es=>{ E.stick.classList.toggle('pl-scrolled',!es[0].isIntersecting&&es[0].boundingClientRect.top<0); }).observe(sen); }
  }
  function setFull(on){
    if(on===(S.map==='full')) return;
    S.map=on?'full':'peek'; mapState(); setTimeout(()=>fitDay(),380);
    if(on){ try{ history.pushState({plFull:slug},''); }catch(e){} }
    else if(history.state&&history.state.plFull===slug){ try{ history.back(); }catch(e){} }
  }
  function mapState(){
    E.card.classList.toggle('pl-closed',S.map==='closed'); E.card.classList.toggle('pl-full',S.map==='full');
    E.toggle.setAttribute('aria-expanded',S.map!=='closed');
    E.toggle.querySelector('span').textContent=pt(S.map==='closed'?'mapShow':'mapHide');
    const fb=view.querySelector('.pl-fullbtn'); fb.querySelector('use').setAttribute('href','#i-'+(S.map==='full'?'minimize':'maximize'));
    fb.querySelector('.sr').textContent=pt(S.map==='full'?'shrink':'expand');
  }
  function flash(el){ if(el.animate&&!reduced.matches) el.animate([{boxShadow:'0 0 0 3px var(--c)'},{boxShadow:'0 0 0 0 transparent'}],{duration:900,easing:'ease-out'}); }

  /* ---------- reorder: drag the handle (pointer events, iOS has no HTML5 DnD), or tap it for the
     上へ/下へ/位置 sheet, which is also the VoiceOver and glove path. Transforms only while moving,
     layout measured once, one recompute per frame at most, and nothing re-renders under the finger. ---------- */
  let suppressClick=false;
  function wireDrag(){
    main.addEventListener('pointerdown',e=>{
      const h=e.target.closest('.pl-handle'); if(!h||e.button>0||DRAG) return;
      const ol=main.querySelector('.pl-list'); if(!ol) return;
      const rows=[...ol.children]; if(rows.length<2) return;
      const row=h.closest('.pl-row'), from=rows.indexOf(row), date=DB.days[S.day].date, ids=idsOf(date);
      const D={from,to:from,y0:e.clientY,s0:scrollY,y:e.clientY,raf:0,on:false,id:e.pointerId,rects:null,h:0,top:0};
      const order=()=>{ const o=ids.slice(); o.splice(D.to,0,o.splice(D.from,1)[0]); return o; };
      const begin=()=>{
        D.on=true; D.rects=rows.map(r=>r.getBoundingClientRect()); D.h=D.rects[from].height; D.top=E.stick.getBoundingClientRect().bottom;
        ol.classList.add('pl-sorting'); row.classList.add('pl-lifted'); view.classList.add('pl-dragging');
      };
      const tick=()=>{
        D.raf=0; if(!D.on) return;
        let v=0;
        if(D.y<D.top+56) v=-Math.min(16,(D.top+56-D.y)/4); else if(D.y>innerHeight-90) v=Math.min(16,(D.y-innerHeight+90)/4);
        if(v) scrollBy(0,v);
        const dy=D.y-D.y0+(scrollY-D.s0), mid=D.rects[from].top+D.h/2+dy;
        row.style.transform=`translate3d(0,${dy}px,0)`;
        let to=from;
        for(let j=from+1;j<rows.length;j++) if(mid>D.rects[j].top+D.rects[j].height/2) to=j;
        for(let j=from-1;j>=0;j--) if(mid<D.rects[j].top+D.rects[j].height/2) to=j;
        if(to!==D.to){
          D.to=to;
          rows.forEach((r,j)=>{ if(j===from) return; const s=from<to&&j>from&&j<=to?-D.h:to<from&&j>=to&&j<from?D.h:0; r.style.transform=s?`translate3d(0,${s}px,0)`:''; });
          liveTimes(order());
        }
        if(v) D.raf=raf(tick);
      };
      const move=ev=>{ if(ev.pointerId!==D.id) return; D.y=ev.clientY;
        if(!D.on){ if(Math.abs(D.y-D.y0)<6) return; begin(); }
        ev.preventDefault(); if(!D.raf) D.raf=raf(tick); };
      const cleanup=()=>{
        removeEventListener('pointermove',move); removeEventListener('pointerup',up); removeEventListener('pointercancel',cancel); h.removeEventListener('lostpointercapture',up);
        cancelAnimationFrame(D.raf); view.classList.remove('pl-dragging'); ol.classList.remove('pl-sorting'); row.classList.remove('pl-lifted');
        rows.forEach(r=>{ r.style.transform=''; }); DRAG=null;
        setTimeout(afterUI,0);
      };
      const up=ev=>{ if(ev&&ev.pointerId!=null&&ev.pointerId!==D.id||!DRAG) return;
        const was=D.on, a=D.from, b=D.to; cleanup();
        if(was){ suppressClick=true; setTimeout(()=>{ suppressClick=false; },400); }
        if(was&&a!==b){ const id=ids[a]; if(edit(m=>{ const l=m.days[date]; const i=l.indexOf(id); if(i<0) throw new Error('gone'); l.splice(i,1); l.splice(b,0,id); },pt('reordered'),{focus:b})) confirmBar(S.lastBreaks); }
        else if(PENDING) render();
      };
      const cancel=()=>{ if(!DRAG) return; cleanup(); render(); };
      DRAG={cancel};
      try{ h.setPointerCapture(e.pointerId); }catch(x){}
      addEventListener('pointermove',move,{passive:false}); addEventListener('pointerup',up); addEventListener('pointercancel',cancel); h.addEventListener('lostpointercapture',up);
    });
    /* hardware keys: the same move */
    main.addEventListener('keydown',e=>{
      const h=e.target.closest('.pl-handle'); if(!h||(e.key!=='ArrowUp'&&e.key!=='ArrowDown')) return;
      e.preventDefault(); reorder(h.dataset.id,e.key==='ArrowUp'?-1:1,true);
    });
  }
  function reorder(id,delta,keepFocus,to,el){
    const date=DB.days[S.day].date, ids=idsOf(date), i=ids.indexOf(id); if(i<0) return;
    const j=to!=null?to:i+delta; if(j<0||j>=ids.length||j===i) return;
    if(!guard(el||document.activeElement,'ord'+id+j,m=>{ const l=m.days[date], k=l.indexOf(id); l.splice(k,1); l.splice(j,0,id); },pt('reordered'))) return false;
    if(keepFocus) afterRender(()=>{ const nh=main.querySelector(`.pl-handle[data-id="${id}"]`); if(nh) nh.focus(); });
  }

  /* ---------- day actions (ids, never indices) ---------- */
  function wireMain(){
    main.addEventListener('click',e=>{
      const b=e.target.closest('[data-act]');
      if(b&&b.tagName==='INPUT'){ try{ b.showPicker&&b.showPicker(); }catch(x){} return; }
      if(!b) return;
      const day=DB.days[S.day], date=day.date, id=b.dataset.id, p=id&&place(id);
      switch(b.dataset.act){
        case 'stay': { const v=Math.max(15,stayOf(id)+ +b.dataset.d), P=plan(), two=DB.days.filter(d=>(P.days[d.date]||[]).indexOf(id)>=0).length>1;
          /* a place on two days (the tarns at sunset, then sunrise) changes this day's visit only */
          guard(b,'stay'+id+date+v,m=>{ if(two||m.stayDay&&m.stayDay[date]&&m.stayDay[date][id]!=null){ m.stayDay=m.stayDay||{}; (m.stayDay[date]=m.stayDay[date]||{})[id]=v; } else m.stay[id]=v; },`${nm(p)} ${dur(v)}`,{quick:true}); break; }
        case 'keep': { const c=b.closest('.pl-confirm'); if(c) c.remove(); break; }
        case 'undoit': undo(); break;
        case 'order': if(suppressClick) break; openOrder(id); break;
        case 'swap': openSwap(id); break;
        case 'move': openMove(id); break;
        case 'del': { const i=idsOf(date).indexOf(id); if(i<0) break; edit(m=>{ const l=m.days[date]; l.splice(l.indexOf(id),1); },pt('removed',{name:nm(p)}),{focus:i});
          afterRender(()=>{ const u=E.toast.querySelector('button'); if(u) u.focus({preventScroll:true}); }); break; }
        case 'open': openPlace(id); break;
        case 'focus': select(id,'stop'); if(S.map==='closed'){ S.map='peek'; saveUI(); mapState(); } break;
        case 'browse': openBrowse(); break;
        case 'day': setDay(+b.dataset.day); break;
        case 'story': openStory(); break;
        case 'booked': toggleBooked(id,b); break;
        case 'note': { const ed=b.closest('.pl-stop').querySelector('.pl-noteed'), open=ed.hidden; ed.hidden=!open; b.setAttribute('aria-expanded',open);
          S.noteOpen=open?id:null; if(open) ed.querySelector('textarea').focus(); break; }
        case 'notesave': saveNote(id,b.closest('.pl-noteed').querySelector('textarea').value); break;
        case 'clearday': { const n=idsOf(date).length; if(!n) break; edit(m=>{ m.days[date]=[]; },pt('cleared',{d:dlabel(day)})); afterRender(()=>focusStop(0)); break; }
      }
    });
    main.addEventListener('change',e=>{
      const t=e.target; if(t.dataset.act!=='start'||!okHM((t.value||'').slice(0,5))) return;
      const date=DB.days[S.day].date, v=t.value.slice(0,5);
      if(edit(m=>{ m.start[date]=v; },pt('startTime')+' '+v,{quick:true})) confirmBar(S.lastBreaks);
    });
    /* an unsaved note survives any re-render */
    main.addEventListener('input',e=>{ const t=e.target; if(t.tagName==='TEXTAREA'&&t.dataset.id){ S.drafts[t.dataset.id]=t.value; S.noteOpen=t.dataset.id; } });
  }
  function saveNote(id,v){
    v=String(v||'').trim().slice(0,300); const P=plan(), cur=noteText(P,id), raw=(P.notes||{})[id]||'';
    S.noteOpen=null; delete S.drafts[id];
    const done=()=>{ const ed=main.querySelector(`#pl-ne-${slug}-${id}`); if(ed) ed.hidden=true; const nb=main.querySelector(`.pl-notebtn[data-id="${id}"]`); if(nb){ nb.setAttribute('aria-expanded','false'); nb.focus({preventScroll:true}); } };
    if(v===cur||v===raw){ done(); return; }
    edit(m=>{ if(v) m.notes[id]=v; else delete m.notes[id]; },pt('note')+' ✓',{quick:true});
    done();
  }
  function toggleBooked(id,btn){
    pushHist(); const nb=Object.assign({},S.booked); if(nb[id]) delete nb[id]; else nb[id]=true; S.booked=nb; save();
    if(btn) syncBook(btn,id);
    if(sheetKind) return;
    patchDay(); const t=main.querySelector(`.pl-bookt[data-id="${id}"]`); if(t&&document.activeElement!==t) t.focus({preventScroll:true});
  }

  /* ---------- rendering cadence ---------- */
  let soon=0, after=[];
  function renderSoon(){ if(soon) return; soon=raf(()=>{ soon=0; render(); }); }
  function afterRender(f){ after.push(f); }
  /* The focused control, as a selector, so a re-render can put focus back where it was. */
  function focusKey(){ const a=document.activeElement; if(!a||!main.contains(a)) return null;
    const b=a.closest('[data-act]'); if(!b) return a.classList.contains('pl-timein')?'.pl-timein':null;
    return `[data-act="${b.dataset.act}"]`+(b.dataset.id?`[data-id="${b.dataset.id}"]`:'')+(b.dataset.d?`[data-d="${b.dataset.d}"]`:'')+(b.dataset.day?`[data-day="${b.dataset.day}"]`:''); }
  function render(anim){
    if(DRAG){ PENDING=true; return; }          /* a drag in progress keeps its DOM */
    PENDING=false; cancelAnimationFrame(soon); soon=0;
    const fk=focusKey(), ta=document.activeElement&&document.activeElement.tagName==='TEXTAREA'?document.activeElement:null, sel=ta?[ta.selectionStart,ta.selectionEnd]:null;
    rebuildPlaces(); renderTop(); renderDays(); renderMain(anim); renderMap();
    if(fk&&!main.contains(document.activeElement)){ const t=main.querySelector(fk); if(t) t.focus({preventScroll:true}); }
    if(ta&&S.noteOpen){ const t=main.querySelector(`#pl-ne-${slug}-${S.noteOpen} textarea`); if(t){ t.focus({preventScroll:true}); try{ t.setSelectionRange(sel[0],sel[1]); }catch(e){} } }
    const f=after; after=[]; f.forEach(x=>x());
  }

  /* ---------- sheets: the background is inert, the dialog is named by its heading, Tab stays inside,
     and closing makes it inert at once so a second tap cannot act twice ---------- */
  let sheetKind=null, sheetArg=null, lastFocus=null, closeT=0;
  function openSheet(html,kind,arg,tall){
    clearTimeout(closeT);
    sheetKind=kind; sheetArg=arg||{};
    E.sheet.setAttribute('style',dayStyle(S.day)); E.sheet.lang=lang();
    E.sbody.innerHTML=html; E.sbody.scrollTop=0;
    E.sheet.classList.toggle('pl-tall',!!tall);
    E.sheet.inert=false; view.inert=true;
    showCands(kind==='browse'||kind==='place'||kind==='import');
    if(E.sheet.hidden){
      lastFocus=document.activeElement; E.sheet.hidden=false; E.scrim.hidden=false;
      raf(()=>raf(()=>{ E.sheet.classList.add('pl-on'); E.scrim.classList.add('pl-on'); }));
    }
    E.sheet.style.transform='';
    E.sheet.focus({preventScroll:true});
  }
  function closeSheet(focusEl){
    if(E.sheet.hidden||E.sheet.inert) return;
    E.sheet.inert=true; view.inert=false; sheetKind=null; sheetArg=null; S.ip=null; showCands(false);
    E.sheet.classList.remove('pl-on'); E.scrim.classList.remove('pl-on'); E.sheet.style.transform='';
    closeT=setTimeout(()=>{ if(!E.sheet.classList.contains('pl-on')){ E.sheet.hidden=true; E.scrim.hidden=true; } },reduced.matches?0:360);
    const t=focusEl||lastFocus; if(t&&t.focus&&t.isConnected) t.focus({preventScroll:true});
  }
  function refreshSheet(){
    if(sheetKind==='browse') openBrowse(true);
    else if(sheetKind==='place') openPlace(sheetArg.id,sheetArg.back);
    else if(sheetKind==='plans') openPlans();
    else if(sheetKind==='compare') openCompare(sheetArg.a,sheetArg.b);
    else if(sheetKind==='import') { const h=E.sbody.querySelector('.pl-sh-h'); if(h) h.outerHTML=head(pt('impT'),pt('impS')); renderImport(); }
    else if(sheetKind) closeSheet();
  }
  const closeBtn=()=>`<button type="button" class="pl-close" data-act="close">${ic('x')}<span class="sr">${pt('close')}</span></button>`;
  const head=(t,s)=>`<div class="pl-sh-h"><div><h2 class="pl-sh-t" id="pl-sht-${slug}">${t}</h2>${s?`<div class="pl-sh-s">${s}</div>`:''}</div>${closeBtn()}</div>`;
  const doneBar=()=>`<div class="pl-donebar"><button type="button" class="pl-btn pl-sec" data-act="close">${pt('done')}</button></div>`;


  /* 日を移動: out of this day, into the other day's cheapest open slot */
  const moveFn=(id,date,to)=>m=>{ const a=m.days[date], k=a.indexOf(id); if(k<0) throw new Error('gone'); a.splice(k,1);
    const l=(m.days[to.date]=m.days[to.date]||[]); l.splice(SIM.bestPos(to,l,id,m,{deadline:S.dayEnd}).pos,0,id); };
  /* each day is simulated first, like the add picker: that day's end, and ⚠ with the reason */
  function openMove(id){
    const p=plan(), date=DB.days[S.day].date;
    openSheet(head(pt('moveT'),pt('moveS'))+`<div class="pl-dpick">${DB.days.map((d,k)=>{ if(k===S.day) return `<button type="button" class="pl-daybtn" style="${dayStyle(k)}" disabled><span class="pl-dn">${+d.date.slice(8)}</span><span class="pl-dw">${wdName(d.date)}</span></button>`;
      const fn=moveFn(id,date,d), bs=trial(fn)||[], m=clone({id:'t',days:p.days,stay:p.stay||{},start:p.start||{},stayDay:p.stayDay||{},anchors:p.anchors||{}}); fn(m);
      const end=SIM.schedule(d,null,m,{deadline:S.dayEnd}).end, why=bs.length?breakLine(bs,d):'';
      return `<button type="button" class="pl-daybtn${bs.length?' pl-nofit':''}" style="${dayStyle(k)}" data-act="domove" data-day="${k}"><span class="pl-dn">${+d.date.slice(8)}</span>
        <span class="pl-dw">${wdName(d.date)}　${pt('stops',{n:(p.days[d.date]||[]).length})}　${esc(pt('endsAt',{t:hm(end)}))}</span>${why?`<span class="pl-dwhy">⚠ ${esc(why)}</span>`:''}</button>`; }).join('')}</div>`,'move',{id,date});
  }
  /* Adding inserts at the cheapest slot where the place is open (SIM.bestPos). */
  const closure=p=>(p.flags||[]).some(f=>/^(track-closed|partial-closure|partial-track-closures|loop-closed)/.test(f));
  /* An add, simulated first (SIM.insertPlan); c is a grouping or null. */
  const addIds=(c,id)=>{ const planned=plannedMap(); return (c?c.ids:[id]).filter(x=>DB.places.has(x)&&!planned.has(x)); };
  const clusterOf=id=>id==='_imp'?{id,ids:DB.list.filter(p=>p.imp).map(p=>p.id)}:DB.clusters.find(x=>x.id===id);
  /* a break in words: whose, and what */
  function breakText(b,day){ const who=b.kind==='stop'?nm(place(b.id))+'：':''; return who+warnText(b.w,day); }
  /* Apply an add; then name any earlier stop it broke, with a one-tap move to that stop's open slot. */
  function applyAdd(k,ids,c){
    const day=DB.days[k]; let pv=null;
    const ok=edit(m=>{ const l=(m.days[day.date]=m.days[day.date]||[]); pv=SIM.insertPlan(day,l,ids,m,{deadline:S.dayEnd},c); if(!pv) throw new Error('nothing');
      m.days[day.date]=pv.list.concat(l.filter(x=>!DB.places.has(x))); if(pv.start){ m.start=m.start||{}; m.start[day.date]=pv.start; } },
      ids.length>1?pt('addedN',{n:ids.length,d:dlabel(day)}):pt('added',{d:dlabel(day)})+'：'+nm(place(ids[0])));
    if(!ok||!pv) return false;
    const hurt=pv.breaks.find(b=>b.kind==='stop'&&ids.indexOf(b.id)<0&&(b.w.k==='closed'||b.w.k==='closedAt'));
    if(hurt){ const fix=SIM.bestPos(day,idsOf(day.date).filter(x=>x!==hurt.id),hurt.id,plan(),{deadline:S.dayEnd});
      /* 朝に移す is checked like any change: if it breaks another stop, it says so and asks again */
      const fixFn=m=>{ const l=m.days[day.date], j=l.indexOf(hurt.id); if(j<0) return; l.splice(j,1); l.splice(SIM.bestPos(day,l,hurt.id,m,{deadline:S.dayEnd}).pos,0,hurt.id); };
      const key='fix'+hurt.id+day.date, doFix=()=>{ const bs=trial(fixFn);
        if(bs&&bs.length&&!(ARM&&ARM.key===key)){ ARM={key,t:Date.now()}; toast('⚠ '+breakLine(bs)+' — '+pt('tapAgainDo'),undo,{label:pt('moveOpen'),fn:doFix}); return; }
        ARM=null; edit(fixFn,pt('movedOpen',{name:nm(place(hurt.id))})); };
      toast(pt('broke',{name:nm(place(hurt.id)),w:warnText(hurt.w,day)}),undo,fix.fits?{label:pt('moveOpen'),fn:doFix}:null); }
    return true;
  }
  /* Candidates: header once per open, the list on every filter change (so the search keeps focus),
     and adding patches one row instead of rebuilding them all. */
  /* saved:true = the traveller saved it in her own Google Maps list, the strongest signal we have */
  /* a cafe's signature item ("サワードウ") as a small line on list rows */
  function sigLine(p){ const t=p&&(ja()?p.sigJa||p.sig:p.sig||p.sigJa); return t?`<small class="pl-sigl">${esc(t)}</small>`:''; }
  function savedTag(p){ return p&&p.saved?`<span class="pl-saved" title="${esc(pt('savedS'))}">${ic('bookmark','xs')}${pt('saved')}</span>`:''; }
  /* the place sheet and the plans sheet live in planner-more.js, fetched before the first tap */
  const openPlace=(id,back)=>needMore().then(m=>m.openPlace(id,back));
  const openPlans=()=>needMore().then(m=>m.openPlans());
  /* The candidate drawer (候補をさがす) lives in planner-more.js, fetched on the first touch. */
  let MM=null;
  const openBrowse=keep=>needMore().then(m=>m.openBrowse(keep));
  const renderList=()=>{ if(MM) MM.renderList(); };
  const patchCand=id=>{ if(MM) MM.patchCand(id); };
  /* swipe down on the grab bar or the heading closes a sheet */
  function wireSwipe(){
    let sy=null, dy=0, pid=null;
    E.sheet.addEventListener('pointerdown',e=>{ if(!e.target.closest('.pl-grab,.pl-sh-h')||e.target.closest('button,input,select,a')) return; sy=e.clientY; dy=0; pid=e.pointerId; try{ E.sheet.setPointerCapture(pid); }catch(x){} });
    E.sheet.addEventListener('pointermove',e=>{ if(sy==null||e.pointerId!==pid) return; dy=Math.max(0,e.clientY-sy); E.sheet.style.transform=`translateY(${dy}px)`; });
    const end=e=>{ if(sy==null) return; sy=null; if(dy>90) closeSheet(); else E.sheet.style.transform=''; };
    E.sheet.addEventListener('pointerup',end); E.sheet.addEventListener('pointercancel',end);
  }
  function wireSheet(){
    /* A tap on the dimmer over a day button switches the day (keeping the sheet when it is the
       candidates list); anywhere else it closes. */
    E.scrim.addEventListener('click',e=>{
      const hit=[...E.days.querySelectorAll('.pl-daybtn')].find(b=>{ const r=b.getBoundingClientRect(); return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom; });
      if(hit){ const k=+hit.dataset.day, kind=sheetKind; if(kind==='browse'){ setDay(k,true); openBrowse(true); return; } closeSheet(); setDay(k); return; }
      closeSheet();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){ if(sheetKind) closeSheet(); else if(S.placing) stopPlacing(); else if(S.map==='full') setFull(false); return; }
      if(e.key==='Tab'&&sheetKind){ const f=[...E.sheet.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,summary,[tabindex="0"]')].filter(x=>x.offsetParent!==null);
        if(!f.length) return; const a=f[0], z=f[f.length-1];
        if(e.shiftKey&&(document.activeElement===a||document.activeElement===E.sheet)){ e.preventDefault(); z.focus(); }
        else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } }
    });
    wireSwipe();
    E.sbody.addEventListener('change',e=>{ const t=e.target;
      if((t.type==='file'&&t.files&&t.files.length)||t.classList.contains('pl-ck')||t.classList.contains('pl-choice')){ needImp().then(u=>u.change(t)); return; }
      if(!t.classList.contains('pl-cmpsel')||sheetKind!=='compare') return;
      openCompare(t.dataset.k==='a'?t.value:sheetArg.a, t.dataset.k==='b'?t.value:sheetArg.b); });
    E.sbody.addEventListener('input',e=>{ if(e.target.classList.contains('pl-vname')) needMore().then(m=>m.nameState()); });
    E.sbody.addEventListener('change',e=>{ const t=e.target; if(!t.classList.contains('pl-dayendin')||!okHM((t.value||'').slice(0,5))) return;
      S.dayEnd=toMin(t.value.slice(0,5)); saveUI(); render(); });
    E.sbody.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      if(e.target.closest('.pl-nom')){ e.preventDefault(); const b=e.target.closest('.pl-trow').querySelector('[data-act="nomgo"]'); b&&b.click(); return; }
      if(e.target.classList.contains('pl-vname')){ e.preventDefault(); const id=sheetArg&&sheetArg.id; needMore().then(m=>m.saveVersionNamed(id,e.target.value)); }
      if(e.target.classList.contains('pl-paste')){ e.preventDefault(); needMore().then(m=>m.click('pastego',e.target,sheetKind,sheetArg)); }
    });
    let qf=0;
    E.sbody.addEventListener('input',e=>{ if(!e.target.classList.contains('pl-q')) return; S.f.q=e.target.value; if(!qf) qf=raf(()=>{ qf=0; renderList(); }); });
    E.sbody.addEventListener('click',e=>{
      const b=e.target.closest('[data-act]'); if(!b||E.sheet.inert) return;
      const day=DB.days[S.day], date=day.date, kind=sheetKind, arg=sheetArg||{};
      if(/^(imcancel|imgo|imcoll|imcc|imreg|imall|placeon|nomopen|nomgo|nomset|impdelall)$/.test(b.dataset.act)){ needImp().then(u=>u.click(b.dataset.act,b)); return; }
      if(/^(ord|ordto|doswap|vsugg|vsave|useday|pastego|pasteclip)$/.test(b.dataset.act)){ needMore().then(m=>m.click(b.dataset.act,b,kind,arg)); return; }
      switch(b.dataset.act){
        case 'close': closeSheet(); break;
        case 'import': S.ip=null; openImport(); break;
        case 'impdel': { const id=b.dataset.id; pushHist(); S.imports=S.imports.filter(m=>m.id!==id); impChanged();
          if(kind==='place') closeSheet(); else renderImport(); toast(pt('impDeleted'),undo); break; }
        case 'back': openBrowse(); break;
        case 'plan': S.planId=b.dataset.id; save(); render(true); openPlans(); raf(()=>fitDay()); break;
        case 'reset': { const from=S.my.from; pushHist(); keepMy();
          S.my=null; S.planId=findPlan(from)?from:DB.presets[0].id; save(); render(); openPlans(); toast(pt('resetDone',{name:presetName(S.planId)}),undo); break; }
        case 'verdel': { const v=findPlan(b.dataset.id); if(!v) break; pushHist();
          S.versions=S.versions.filter(x=>x!==v); if(S.planId===v.id) S.planId=S.my?'my':DB.presets[0].id;
          save(); render(); openPlans(); toast(pt('verDeleted',{name:planName(v)}),undo); break; }
        case 'savever': openVerName(null); break;
        case 'vername': openVerName(b.dataset.id); break;
        case 'compare': openCompare(plan().id); break;
        case 'share': shareLink(); break;
        case 'domove': { if(kind!=='move'||arg.date!==date) break; const id=arg.id, to=DB.days[+b.dataset.day], i=idsOf(date).indexOf(id); if(i<0) break;
          const fn=moveFn(id,date,to); if(trial(fn)&&trial(fn).length&&!(ARM&&ARM.key==='mv'+id+to.date)){ guard(b,'mv'+id+to.date,fn); break; }
          closeSheet(); ARM=null; edit(fn,pt('movedTo',{d:dlabel(to)}),{focus:i}); break; }
        case 'open': openPlace(b.dataset.id,kind==='browse'); break;
        case 'pick': { const row=b.closest('.pl-cand'), ex=row.querySelector('.pl-dayq');
          E.sbody.querySelectorAll('.pl-cand .pl-dayq').forEach(x=>{ if(x!==ex){ x.remove(); } });
          E.sbody.querySelectorAll('.pl-addbtn[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false'));
          if(ex){ ex.remove(); break; }
          row.insertAdjacentHTML('beforeend',MM.dayPick(b.dataset.id)); b.setAttribute('aria-expanded','true');
          const c=row.querySelector('.pl-dq.pl-cur'); if(c) c.focus(); break; }
        case 'addday': { const id=b.dataset.id, k=+b.dataset.day; if(MM.armPill(b)||!applyAdd(k,[id],null)) break;
          if(kind==='place') openPlace(id,arg.back); else patchCand(id); break; }
        case 'unplan': { const id=b.dataset.id, back=arg.back; edit(m=>{ const l=m.days[date], k=l.indexOf(id); if(k>=0) l.splice(k,1); },pt('removed',{name:nm(place(id))})); openPlace(id,back); break; }
        case 'movehere': { const id=b.dataset.id, back=arg.back, on=plannedMap().get(id); if(on==null) break; const from=DB.days[on].date;
          edit(m=>{ const a=m.days[from]; a.splice(a.indexOf(id),1); const l=(m.days[date]=m.days[date]||[]); l.splice(bestPos(day,l,id),0,id); },pt('movedTo',{d:dlabel(day)}));
          openPlace(id,back); break; }
        case 'addall': { const sec=b.closest('.pl-clus'), ex=sec.querySelector(':scope > .pl-dayq');
          if(ex){ ex.remove(); b.setAttribute('aria-expanded','false'); break; }
          b.closest('.pl-clus-h').insertAdjacentHTML('afterend',MM.dayPick(b.dataset.id,'pl-dayq-clus',clusterOf(b.dataset.id))); b.setAttribute('aria-expanded','true');
          const cur=sec.querySelector('.pl-dq.pl-cur'); if(cur) cur.focus(); break; }
        case 'addallday': { const c=clusterOf(b.dataset.id); if(!c) break;
          const add=addIds(c); if(!add.length){ toast(pt('nothingAdded')); break; }
          if(MM.armPill(b)||!applyAdd(+b.dataset.day,add,c)) break;
          add.forEach(patchCand); const q=b.closest('.pl-dayq'); if(q) q.remove(); break; }
        case 'clearf': S.f={q:'',cat:null,area:null,saved:null,sort:S.f.sort}; openBrowse(); break;
        case 'dayend': break;
        case 'booked': toggleBooked(b.dataset.id,b); break;
        case 'copyc': { const v=b.dataset.v; (navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast(pt('copiedC')),()=>toast(v)); break; }
        case 'f': { const k=b.dataset.k, v=b.dataset.v; S.f[k]=S.f[k]===v||!v?null:v;
          b.parentNode.querySelectorAll('.pl-chip').forEach(c=>c.setAttribute('aria-pressed',(S.f[c.dataset.k]||'')===c.dataset.v)); renderList(); break; }
        case 'sort': S.f.sort=b.dataset.v; b.parentNode.querySelectorAll('button').forEach(c=>c.setAttribute('aria-pressed',c===b)); renderList(); break;
      }
    });
  }

  /* ---------- import: the sheet's code and strings live in planner-import.js, loaded with the
     parsers (import.js) and the region table only when the sheet first opens. ---------- */
  let IMPUI=null;
  function needImp(){
    if(IMPUI) return IMPUI;
    /* its stylesheet loads alongside; a failed sheet still lets the import run, unstyled */
    const css=document.querySelector('link[data-pl-imp]')?Promise.resolve():new Promise(res=>{ const l=document.createElement('link');
      l.rel='stylesheet'; l.href=view.dataset.importCss||'planner-import.css'; l.dataset.plImp=''; l.onload=l.onerror=res; document.head.appendChild(l); });
    IMPUI=Promise.all([css,(window.plimport?Promise.resolve():loadJs(view.dataset.importSrc||'import.js'))
      .then(()=>window.plimport.ui?0:loadJs(view.dataset.importUiSrc||'planner-import.js'))])
      .then(()=>window.plimport.ui(ctx()));
    IMPUI.catch(()=>{ IMPUI=null; });
    return IMPUI;
  }
  const trayN=()=>S.imports.filter(m=>m.lat==null&&!m.placeId).length;
  function openImport(){
    openSheet(head(pt('impT'),pt('impS'))+`<div class="pl-impbody"><p class="pl-none">${pt('reading')}</p></div>${doneBar()}`,'import',null,true);
    needImp().then(u=>u.render(),()=>{ const b=E.sbody.querySelector('.pl-impbody'); if(b) b.innerHTML=`<p class="pl-none">${pt('loadFail')}</p>`; });
  }
  const renderImport=()=>{ if(IMPUI) IMPUI.then(u=>u.render()); };
  function stopPlacing(){ S.placing=null; showCands(false); E.card.classList.remove('pl-placemode'); const b=E.card.querySelector('.pl-placing'); if(b) b.remove(); }
  const placeAt=(x,y)=>{ needImp().then(u=>u.placeAt(x,y)); };

  /* ---------- toast: 44 px undo, held 10 s, and kept while focused or touched ---------- */
  let toastT=0, toastHold=false;
  function toast(msg,action,extra){
    E.toast.innerHTML=`<span>${esc(msg)}</span>`+(extra?`<button type="button" class="pl-tx">${esc(extra.label)}</button>`:'')+(action?`<button type="button" class="pl-tu">${pt('undo')}</button>`:'');
    if(action) E.toast.querySelector('.pl-tu').onclick=()=>{ hideToast(); action(); };
    if(extra) E.toast.querySelector('.pl-tx').onclick=()=>{ hideToast(); extra.fn(); };
    E.toast.classList.add('pl-on'); armToast(action?10000:3000);
  }
  function armToast(ms){ clearTimeout(toastT); E.toast._ms=ms; toastT=setTimeout(()=>{ if(!toastHold) hideToast(); },ms); }
  function hideToast(){ clearTimeout(toastT); E.toast.classList.remove('pl-on'); }
  ['focusin','pointerenter'].forEach(t=>E.toast.addEventListener(t,()=>{ toastHold=true; clearTimeout(toastT); }));
  ['focusout','pointerleave'].forEach(t=>E.toast.addEventListener(t,()=>{ toastHold=false; if(E.toast.classList.contains('pl-on')) armToast(4000); }));

  /* ---------- share: a link adds a version, it never overwrites ---------- */
  /* ---------- the less-used sheets live in planner-more.js, loaded on first use ---------- */
  let MOREP=null;
  const loadJs=src=>new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=src; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc); });
  function needMore(quiet){
    if(MOREP) return MOREP;
    MOREP=(planner.more?Promise.resolve():loadJs(view.dataset.moreSrc||'planner-more.js')).then(()=>(MM=planner.more(ctx())));
    MOREP.catch(()=>{ MOREP=null; if(!quiet) toast(pt('loadFail')); });
    return MOREP;
  }
  function ctx(){ return {S,DB,E,view,svg,slug,SRC,pt,esc,ic,head,doneBar,openSheet,closeSheet,toast,undo,pushHist,save,render,edit,plan,findPlan,planName,presetName,
    idsOf,schedule,dayStyle,dlabel,dayTitle,dur,hm,nm,nmLang,wbr,place,bodyOf,snapshot,renderTop,fitDay,isCand,plannedMap,FAMILY,thumb,tr,CAT,AREA,
    unverifiedHours,reorder,focusStop,afterRender,okHM,clone,switchToMe,hav,mapState,saveUI,select,unprj,ja,showCands,stopPlacing,impChanged,
    savedTag,sigLine,warnText,breakText,guard,hoursText,photoHTML,colorCard,closeBtn,alt,altLang,latin,bestText,domain,hhmm,arg:()=>sheetArg,addIds,clusterOf,closure,wdName,GLYPH,fold,flagsOf,FLAG,eqKm,uKm,trayN,lang,loadMore:()=>loadMore(),rebuild:()=>rebuildPlaces(),sim:()=>SIM,frame:{LAT0,LAT1,LON0,LON1},kind:()=>sheetKind,addStrings:o=>Object.assign(PT,o)}; }
  const openOrder=id=>needMore().then(m=>m.openOrder(id));
  const openSwap=id=>needMore().then(m=>m.openSwap(id));
  const openCompare=(a,b)=>needMore().then(m=>m.openCompare(a,b));
  const openVerName=id=>needMore().then(m=>m.openVerName(id));
  const shareLink=()=>needMore().then(m=>m.shareLink());
  function importHash(){
    const m=new RegExp('^#plan-'+slug+'=([\\w-]+)').exec(location.hash); if(!m) return;
    history.replaceState(null,'',location.pathname+location.search);
    needMore().then(x=>x.importCode(m[1]));
  }
  /* In the book a share link must land in this guide's plan tab, not on the shelf. */
  function switchToMe(){
    const h=document.documentElement;
    if(h.dataset.place&&h.dataset.place!==slug){ h.dataset.place=slug; try{ LS.set('place',slug); }catch(e){} }
    const r=g.querySelector('input.t-plan'); if(r&&!r.checked){ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); }
  }

  /* ---------- notices: storage failure, LINE, Home Screen, a first-time hello ---------- */
  function renderNotice(){
    if(!DB) return;
    const ua=navigator.userAgent, isLine=/\bLine\//i.test(ua), ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    let h='';
    if(S.saveFail) h+=`<div class="pl-note pl-fail" role="alert"><span class="pl-glyph">${ic('alert')}</span><p>${pt('saveFail')}</p><button type="button" class="pl-btn pl-sec" data-act="purge">${pt('purgeAuto')}</button></div>`;
    if(isLine){ const u=new URL(location.href); u.searchParams.set('openExternalBrowser','1');   /* LINE honours this and hands off to Safari */
      h+=`<div class="pl-note pl-line"><p>${pt('lineMsg')}</p><a class="pl-btn pl-pri" href="${esc(u.href)}">${pt('lineBtn')}</a></div>`; }
    else if(ios&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches&&!S.hideInstall)
      h+=`<div class="pl-note"><span class="pl-glyph">${ic('share')}</span><p>${pt('installMsg')}</p><button type="button" class="pl-close" data-act="hideinstall">${ic('x','sm')}<span class="sr">${pt('dismiss')}</span></button></div>`;
    if(!S.hideIntro&&!S.my&&!S.versions.length)
      h+=`<div class="pl-note pl-intro"><p>${pt('intro')}</p><button type="button" class="pl-close" data-act="hideintro">${ic('x','sm')}<span class="sr">${pt('dismiss')}</span></button></div>`;
    E.notice.innerHTML=h;
  }

  /* ---------- the story image: story.js (plstory.open(dayModel)) loads only when asked ---------- */
  /* The model story.js documents: {date, dayNo, title, titleJa, color, lang, stops:[{time, name,
     nameJa, cat, photo, lat, lon}], stats, tags}, plus the leg shapes in map units. */
  function dayModel(){
    const day=DB.days[S.day], sc=S.sc, cs=getComputedStyle(main);
    const P=plan(), tt=P.titles&&P.titles[day.date];
    return {slug, guide:g, lang:lang(), date:day.date, dayNo:S.day+1, title:tt&&tt.en||day.label, titleJa:tt&&tt.ja||day.labelJa,
      color:cs.getPropertyValue('--c').trim(), ink:cs.getPropertyValue('--ci').trim(),
      stops:sc.rows.filter(r=>r.kind==='stop').map(r=>{ const p=place(r.id); return {id:p.id,time:hm(r.begin),end:hm(r.dep),name:p.name,nameJa:p.nameJa||p.name,cat:p.cat,best:p.best||'',
        sun:(r.infos.find(x=>x.k==='sunrise'||x.k==='sunsetAt')||{}).t!=null?hm(r.infos.find(x=>x.k==='sunrise'||x.k==='sunsetAt').t):'',
        lat:p.lat,lon:p.lon,photo:DB.photos&&DB.photos[p.id]||null}; }),
      stats:pt('drive',{d:dur(sc.drive)})+' · '+Math.round(sc.km)+' km · '+pt('stops',{n:sc.rows.length-2}),
      tags:[...new Set(sc.rows.map(r=>place(r.id).igTag).filter(Boolean))].slice(0,3),
      legs:legSegments(sc).map(s=>({kind:s.kind,pts:(s.kind==='drive'&&geom(s.a,s.b)||{pts:[s.p0,s.p1]}).pts}))};
  }
  let STORY=null;
  function openStory(){
    if(!STORY) STORY=window.plstory?Promise.resolve(window.plstory):new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src=view.dataset.storySrc||'story.js'; s.onload=()=>window.plstory?res(window.plstory):rej(); s.onerror=rej; document.head.appendChild(s); });
    Promise.all([STORY,loadMore()]).then(([st])=>st.open(dayModel(),g),()=>{ STORY=null; toast(pt('storySoon')); });
  }

  /* ---------- boot ---------- */
  function labels(){
    view.querySelectorAll('[data-pt]').forEach(el=>{ el.textContent=pt(el.dataset.pt); });
    svg.querySelector('title').textContent=pt('mapTitle');
    E.days.setAttribute('aria-label',pt('days'));
    g.querySelectorAll('.pl-layer').forEach(el=>{ el.lang=lang(); });
    mapState();
  }
  function setDay(i,keepSheet){
    if(i===S.day||!(i>=0&&i<DB.days.length)) return;
    /* read layout before the DOM changes, and write storage after the frame: no forced reflow, no
       200-route JSON on the tap's critical path */
    const sy=scrollY, top=keepSheet?0:view.getBoundingClientRect().top+sy+view.querySelector('.pl-bar').offsetHeight;
    S.day=i; select(null); render(true); fitDay();
    if(!keepSheet&&sy>top) raf(()=>scrollTo(0,top));      /* in the frame, not the tap: reading or setting scroll after the DOM change forces layout */
    saveUISoon();
  }
  /* After first paint, idle: the drive matrix, road shapes, photos and the evidence. A failed fetch
     retries when the phone comes back online or to the foreground. */
  const lazy={travel:false,routes:false,photos:false};
  /* the coastline is written only between gestures: a write that lands mid-pan waits for afterUI() */
  let LANDQ=null;
  function putLand(t){ if(!t) return; if(busyUI()){ LANDQ=t; return; } LANDQ=null; svg.querySelector('.pl-land').innerHTML=t; }
  function loadLazy(){
    if(!MOREP) needMore(true).catch(()=>{});      /* the drawer and the other sheets, before the first tap on them */
    if(!lazy.land){ lazy.land=true; idle(()=>fetch(SRC+'land.svg.html').then(r=>r.ok?r.text():'').then(putLand).catch(()=>{ lazy.land=false; }),4000); }
    if(!lazy.travel) fetch(SRC+'travel.json').then(r=>r.ok?r.json():null).then(t=>{
      if(!t||!Array.isArray(t.ids)||!Array.isArray(t.min)) return;
      lazy.travel=true; DB.travel=t; DB.tIdx={}; t.ids.forEach((id,i)=>{ DB.tIdx[id]=i; }); render(); if(sheetKind==='browse') renderList(); }).catch(()=>{});
    if(!lazy.routes) fetch(SRC+'routes.json').then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{
      if(j&&typeof j==='object'&&!Array.isArray(j)){ DB.routes=j; lazy.routes=true; } DB.routesLoaded=true; if(S.sc&&!DRAG) renderLegs(); });
    loadMore();
    loadPhotos();
  }
  /* the day's hero is on the first screen (it is the LCP), so its index loads right after boot */
  function loadPhotos(){ if(!lazy.photos&&!lazy.photosP) lazy.photosP=fetch(SRC+'photos.json').then(r=>r.ok?r.json():null).then(j=>{ if(j&&typeof j==='object'){ DB.photos=j; lazy.photos=true; if(!DRAG) renderSoon(); } }).catch(()=>{}).then(()=>{ lazy.photosP=null; }); }
  let MORE=null;
  /* places-more.json: the vibe lines, evidence and sources, off the critical path. The vibe joins
     its place record (and the search index) when it arrives. */
  function loadMore(){ return MORE||(MORE=fetch(SRC+'places-more.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(j=>{ DB.more=j||{}; DB.base.forEach(p=>{ const m=DB.more[p.id]; if(m){ if(m.vibe&&!p.vibe) p.vibe=m.vibe; if(m.vibeJa&&!p.vibeJa) p.vibeJa=m.vibeJa; ['kw','ig','igTag'].forEach(k=>{ if(m[k]&&!p[k]) p[k]=m[k]; }); } delete p._s; }); return DB.more; })
    .catch(()=>{ MORE=null; return {}; })); }
  function init(res){
    const [list,plans]=res;
    /* Bases and ferry terminals ship in plans.json; a place record of the same id wins. */
    const have=new Set(list.map(p=>p.id)), places=list.concat((plans.basePlaces||[]).filter(p=>!have.has(p.id)));
    DB={base:places,baseMap:new Map(places.map(p=>[p.id,p])),places:null,list:null,impVer:0,days:plans.days,bases:new Set(plans.bases||[]),
        presets:plans.plans,clusters:plans.clusters||[],ferries:Array.isArray(plans.ferries)?plans.ferries:[],walks:Array.isArray(plans.walks)?plans.walks.filter(w=>w&&w.a&&w.b&&w.min>=0):[],noRoad:plans.noRoad&&typeof plans.noRoad==='object'?plans.noRoad:{},
        tides:Object.fromEntries(Object.entries(plans.tides||LOW_TIDE).filter(([k])=>k[0]!=='_')),
        travel:{ids:[],min:[]},tIdx:{},routes:{},routesLoaded:false,photos:null,more:null};
    SIM=makeSim(DB); rebuildPlaces();
    const broken=loadState();
    const now=new Date(), today=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate()), ti=DB.days.findIndex(d=>d.date===today);
    if(ti>=0) S.day=ti;          /* during the trip, open on today */
    /* Boot in two tasks so neither runs long: the day list first, the map's pins next. A render
       error from bad saved state drops to the preset rather than bricking the app. */
    labels(); rebuildPlaces(); renderTop(); renderDays();
    try{ renderMain(); }catch(e){ console.error(e); LS.set(KB,S.raw||''); S.my=null; S.versions=[]; S.planId=DB.presets[0].id; save(); renderTop(); renderDays(); renderMain(); }
    if(broken) save();
    setTimeout(()=>{ renderMap(); setTimeout(wire,0); },0);
    loadPhotos();
    /* flag labels (5 KB gz) follow the first paint; the day re-renders once with them */
    fetch(SRC+'flags.json').then(r=>r.ok?r.json():null).then(o=>{ if(!o) return; setFlags(o); DB.list.forEach(p=>{ delete p._s; }); if(!DRAG) renderSoon(); if(sheetKind==='place') refreshSheet(); }).catch(()=>{});
  }
  /* third boot task: listeners, notices, share links, then the lazy loads on idle */
  function wire(){
    E.days.addEventListener('click',e=>{ const b=e.target.closest('.pl-daybtn'); if(b) setDay(+b.dataset.day); });
    E.bar.addEventListener('click',openPlans);
    view.querySelector('.pl-sharebtn').addEventListener('click',shareLink);
    view.querySelector('.pl-browsebtn').addEventListener('click',()=>openBrowse());
    E.undo.addEventListener('click',undo);
    view.querySelector('.pl-savebtn').addEventListener('click',()=>openVerName(null));
    E.notice.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(!b) return;
      if(b.dataset.act==='hideinstall'){ S.hideInstall=true; saveUI(); renderNotice(); }
      if(b.dataset.act==='hideintro'){ S.hideIntro=true; saveUI(); renderNotice(); }
      if(b.dataset.act==='purge'){ S.versions=S.versions.filter(v=>v.kind!=='auto'); S.hist=[]; if(save()) toast(pt('purged')); renderTop(); } });
    document.addEventListener('langchange',()=>{ labels(); DB.list.forEach(p=>{ delete p._s; }); render(); renderNotice(); select(null); if(!DRAG) refreshSheet(); });
    addEventListener('hashchange',importHash);
    addEventListener('popstate',()=>{ if(S.map==='full'){ S.map='peek'; mapState(); setTimeout(()=>fitDay(),380); } });
    addEventListener('online',()=>{ loadLazy(); pumpRoutes(); });
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ loadLazy(); pumpRoutes(); } });
    wireMain(); wireDrag(); wireSheet(); wireMap(); renderNotice(); importHash();
    /* the matrix, road shapes, photos index and full coastline wait for her first touch or for a
       quiet moment after load, so the first screen downloads only what it draws */
    const go=()=>{ ['pointerdown','keydown','scroll'].forEach(t=>removeEventListener(t,go,true)); clearTimeout(goT); idle(loadLazy); };
    ['pointerdown','keydown','scroll'].forEach(t=>addEventListener(t,go,{capture:true,passive:true}));
    const goT=setTimeout(go,2500);
    /* for tools/check_plans.py parity checks in a console: view._pl.sim('classic') */
    Object.defineProperty(view,'_pl',{value:{sim:id=>DB.days.map(d=>{ const sc=schedule(d,null,findPlan(id)||plan());
      return {date:d.date,drive:Math.round(sc.drive),end:hm(sc.end),rows:sc.rows.slice(1).map(r=>[r.kind==='end'?hm(r.arr):hm(r.begin),r.kind==='end'?'':hm(r.dep),r.id,Math.round(r.leg.min)]),
        warns:sc.rows.flatMap(r=>r.warns.map(w=>w.k)).concat(sc.long?['long']:[])}; }), ready:()=>lazy.travel,
      /* tools/e2e.html: is a gesture or tween still thought to be running; how much coastline is drawn */
      busy:()=>busyUI(), land:()=>svg.querySelectorAll('.pl-land path').length, places:()=>DB.places.size}});
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }
  const get=u=>fetch(u).then(r=>{ if(!r.ok) throw new Error(u+' '+r.status); return r.json(); });
  /* A light coastline (5 KB gz) paints first; the full one replaces it when the page is idle. */
  fetch(SRC+'land-lo.svg.html').then(r=>r.ok?r.text():'').then(putLand).catch(()=>{});
  Promise.all([get(SRC+'places.json'),get(SRC+'plans.json')]).then(init)
    .catch(err=>{ main.innerHTML=`<p class="pl-none">${pt('loadFail')}</p>`; console.error(err); });
};
plannerFn.sim=makeSim;
return plannerFn;
})();
