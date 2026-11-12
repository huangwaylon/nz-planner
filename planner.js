/* PLANNER: planner(g), the book's planner tab. The contract (what it assumes of the book, its data and storage) is in docs/FOLD.md "The core". */
var planner=(function(){
'use strict';

/* ---------- strings: {key:{ja,en}}; {x} placeholders ---------- */
const PT={
  saveVer:{ja:'この案を保存',en:'Save this version'}, st_collect:{ja:'集める',en:'Collect'}, st_plan:{ja:'組み立てる',en:'Plan'}, st_review:{ja:'見直す',en:'Review'},
  impAbroad:{ja:'ニュージーランド国外の取り込み {n}件を外しました',en:'Removed {n} imported places outside New Zealand'},
  inboxN:{ja:'未仕分け {n}',en:'{n} to sort'}, daysN:{ja:'{n}日・{s}件',en:'{n} days, {s} stops'}, mustN:{ja:'絶対 {n}/{of}',en:'Must {n}/{of}'}, otherTab:{ja:'別のタブの変更を読み込みました',en:'Loaded the changes from another tab'},
  plan:{ja:'プラン',en:'Plan'}, my:{ja:'マイプラン',en:'My plan'}, share:{ja:'共有',en:'Share'}, browse:{ja:'候補をさがす',en:'Browse places'},
  zoomIn:{ja:'拡大',en:'Zoom in'}, zoomOut:{ja:'縮小',en:'Zoom out'}, fit:{ja:'この日に合わせる',en:'Fit to day'},
  expand:{ja:'地図を大きく',en:'Enlarge map'}, shrink:{ja:'地図を小さく',en:'Shrink map'},
  mapHide:{ja:'地図をたたむ',en:'Hide map'}, mapShow:{ja:'地図をひらく',en:'Show map'}, mapTitle:{ja:'ニュージーランド北島と行き先',en:'North Island and the stops'},
  estRoute:{ja:'≈ の線は道路の形が未取得',en:'≈ lines are not road-shaped yet'},
  mapFail:{ja:'地図を読み込めません',en:'Map unavailable'}, mapRetry:{ja:'もう一度',en:'Try again'}, mapOffline:{ja:'地図はオフライン — ルートのみ',en:'Map offline: route only'}, mapLost:{ja:'地図を一時的に表示できません',en:'Map paused'},
  days:{ja:'日付',en:'Days'}, depart:{ja:'出発',en:'Start'}, arrive:{ja:'到着',en:'End'}, startTime:{ja:'出発時刻',en:'Start time'},
  stops:{ja:'{n}か所',en:'{n} stops'}, drive:{ja:'運転 {d}',en:'Drive {d}'}, ends:{ja:'着 {t}',en:'In by {t}'},
  slack:{ja:'{t}まで 余裕{d}',en:'{d} spare before {t}'}, over:{ja:'{t}を{d}超過',en:'{d} past {t}'}, overFlight:{ja:'フライト（{t}）に間に合いません',en:'Misses the flight ({t})'},
    confirm:{ja:'確定',en:'Confirm'}, cancel:{ja:'やめる',en:'Cancel'}, clear:{ja:'消去',en:'Clear'},   wait:{ja:'{t}開店まで待ち {d}',en:'{d} wait until {t}'}, estT:{ja:'直線距離からの概算',en:'Estimate from straight-line distance'},
  ferry:{ja:'フェリー',en:'Ferry'}, board:{ja:'乗船 {d}前',en:'board {d} before'}, sail:{ja:'{t}発 {d}',en:'{t}, {d}'}, sailAny:{ja:'{d}',en:'{d}'},
  unverified:{ja:'未確認',en:'Unverified'},   closed:{ja:'{w}曜は定休日',en:'Closed on {w}'}, closedAt:{ja:'{t}閉店に間に合いません',en:'Closes {t} before the visit ends'},
  hoursUnknown:{ja:'営業時間 未確認',en:'Hours unverified'}, more2:{ja:'詳しく',en:'Details'}, overnight:{ja:'日付をまたぎます',en:'Runs past midnight'},
  dark:{ja:'日没（{t}）後まで屋外',en:'Outdoors after sunset ({t})'}, darkDrive:{ja:'日没（{t}）後の運転',en:'Driving after sunset ({t})'},
  tide:{ja:'干潮（{t}）から外れています',en:'Outside low tide ({t})'}, tideCheck:{ja:'潮位を確認',en:'Check the tide'},
  ferryMiss:{ja:'{t}の便に間に合いません',en:'Misses the {t} sailing'}, ferryBack:{ja:'帰りの便（{t}）に間に合いません',en:'Misses the last sailing back ({t})'},
  ferryDay:{ja:'{w}曜は運航なし',en:'No sailing on {w}'}, longDrive:{ja:'運転が長い日 {d}',en:'Long driving day: {d}'},
  tight:{ja:'余裕 {d}',en:'{d} to spare'}, sunrise:{ja:'日の出 {t}',en:'Sunrise {t}'}, sunsetAt:{ja:'日没 {t}',en:'Sunset {t}'},
  book:{ja:'要予約',en:'Book ahead'}, booked:{ja:'予約済み',en:'Booked'}, 
  markBooked:{ja:'予約済みにする：{name}',en:'Mark booked: {name}'},
  free:{ja:'無料',en:'Free'}, always:{ja:'終日',en:'All day'}, closedToday:{ja:'休業',en:'Closed'},
  stay:{ja:'滞在',en:'Stay'}, walkN:{ja:'徒歩 {d}',en:'Walk {d}'}, tideOk:{ja:'干潮 {t} に合っています',en:'Fits low tide {t}'},
  landed:{ja:'着陸',en:'Land'}, limitHint:{ja:'{t} = 1日の終わりの目安（設定で変更）',en:'{t} is the end-of-day guide (change it in Plan)'}, limitFlight:{ja:'{t} = フライトに間に合う空港着',en:'{t} = at the airport in time for the flight'}, limitAnchor:{ja:'{t} = {name}に着く期限（このプランの設定）',en:'{t} = this plan’s time to reach {name}'},
  overAt:{ja:'{name}の期限{t}を{d}超過',en:'{d} past the {t} limit at {name}'}, dawn:{ja:'日の出（{t}）前に屋外',en:'Outdoors before sunrise ({t})'}, missRise:{ja:'日の出（{t}）に間に合いません',en:'Misses sunrise ({t})'}, pastRise:{ja:'日の出（{t}）を過ぎています',en:'Past sunrise ({t})'}, leaveFor:{ja:'{t}出発で日の出に間に合う',en:'leave {t} for sunrise'}, missSet:{ja:'日の入り（{t}）に間に合いません',en:'Misses sunset ({t})'},
  goldRise:{ja:'日の出（{t}）の時間帯から外れています',en:'Not at sunrise ({t})'}, goldSet:{ja:'夕日（{t}）の時間帯から外れています',en:'Not at sunset ({t})'},
  clearDay:{ja:'空にする',en:'Clear day'}, t_must:{ja:'絶対',en:'Must'}, t_want:{ja:'行きたい',en:'Want'}, t_maybe:{ja:'できれば',en:'If time'}, t_skip:{ja:'見送り',en:'Skip'}, t_:{ja:'未仕分け',en:'Inbox'}, toolsN:{ja:'{name}の操作',en:'Tools for {name}'}, save:{ja:'保存',en:'Save'}, addNTo:{ja:'{name}を{d}に追加',en:'Add {name} to {d}'}, pickIn1:{ja:'①で選ぶ',en:'Pick in ①'}, fromCands:{ja:'候補から追加',en:'Add from places'}, hint3:{ja:'ドラッグかタップで日に入れる',en:'Drag or tap to put it on a day'}, cleared:{ja:'{d} を空にしました',en:'Cleared {d}'},       stayDec:{ja:'{name} の滞在を15分短く',en:'15 min shorter at {name}'}, stayInc:{ja:'{name} の滞在を15分長く',en:'15 min longer at {name}'},
  swap:{ja:'入れ替え',en:'Swap'}, move:{ja:'日を移動',en:'Move day'}, del:{ja:'外す',en:'Remove'}, note:{ja:'メモ',en:'Note'},
  swapN:{ja:'入れ替え：{name}',en:'Swap {name}'}, moveN:{ja:'日を移動：{name}',en:'Move {name} to another day'}, delN:{ja:'外す：{name}',en:'Remove {name}'},
  noteN:{ja:'メモ：{name}',en:'Note for {name}'}, notePh:{ja:'メモ（ふたりで共有）',en:'A note for both of you'},
  orderN:{ja:'並べ替え：{name}',en:'Reorder {name}'},     focus:{ja:'地図で見る：{name}',en:'Show {name} on the map'}, 
  prevDay:{ja:'前の日',en:'Previous day'}, nextDay:{ja:'次の日',en:'Next day'}, story:{ja:'ストーリー画像',en:'Story image'},           reordered:{ja:'順番を変えました',en:'Reordered'},
  removed:{ja:'{name} を外しました',en:'Removed {name}'},       undo:{ja:'元に戻す',en:'Undo'},
                    creditBook:{ja:'写真：旅のしおり',en:'Photo: travel book'}, saved:{ja:'保存済み',en:'Saved'}, savedS:{ja:'Google マップに保存済み',en:'Saved in Google Maps'},               gmaps:{ja:'Google マップ',en:'Google Maps'},       loadFail:{ja:'データを読み込めませんでした。再読み込みしてください。',en:'Could not load the data. Reload the page.'},
  close:{ja:'閉じる',en:'Close'}, done:{ja:'完了',en:'Done'},
    autoSaved:{ja:'自動保存 {t}',en:'Autosave {t}'},
        shared:{ja:'共有された案 {t}',en:'Shared {t}'},   compare:{ja:'くらべる',en:'Compare'},       noUndo:{ja:'これ以上は戻せません',en:'Nothing left to undo'}, undone:{ja:'元に戻しました',en:'Undone'},
  saveFail:{ja:'保存できませんでした（容量）。古い自動保存を消すと空きます。',en:'Could not save (storage full). Deleting old autosaves frees space.'},
  purgeAuto:{ja:'自動保存を消す',en:'Delete autosaves'}, purged:{ja:'自動保存を消しました',en:'Autosaves deleted'},
  lineMsg:{ja:'LINE のブラウザでは保存や地図の操作がうまく動きません。Safari で開いてください。',en:'LINE’s browser breaks saving and the map. Open this in Safari.'},
  lineBtn:{ja:'Safariで開く',en:'Open in Safari'},
  installMsg:{ja:'ホーム画面に追加すると、オフラインでも開けて、保存した案が消えにくくなります。共有ボタン →「ホーム画面に追加」。',en:'Add to Home Screen to open offline and keep your saved versions. Share → Add to Home Screen.'},
  
  foot:{ja:'時刻はすべて NZ 夏時間。運転時間は渋滞なしの目安で、オークランドの朝夕は20〜40分増えます。距離は概算です。',
        en:'All times NZDT. Drive times are free-flow; Auckland peak adds 20–40 min. Distances are approximate.'},
  imp:{ja:'取り込み',en:'Imported'}, impT:{ja:'取り込む',en:'Import'},
  impS:{ja:'保存しておいた場所を候補に足します。ファイルはこの端末の中だけで読みます。',en:'Add places you saved elsewhere. Files are read on this phone only.'},
                          reading:{ja:'読み込み中…',en:'Reading…'},                           impDeleted:{ja:'取り込みを削除しました',en:'Import deleted'},
      
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
/* note 1 in docs/FOLD.md "Core notes" */
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
/* note 10 */
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
/* ---------- components (docs/DESIGN.md "Class contract"): every UI element is emitted by these ---------- */
const ic=(n,c)=>`<svg class="pl-ico pl-ico--${c==='sm'||c==='xs'?16:c==='lg'?24:20}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
/* attributes: act → data-act, id → data-id, cls joins the class; null/false are left out */
const at=a=>{ let o=''; for(const k in a){ const v=a[k]; if(k==='cls'||v==null||v===false) continue; o+=' '+(k==='act'?'data-act':k==='id'?'data-id':k)+'="'+esc(String(v))+'"'; } return o; };
const cx=(b,a)=>a&&a.cls?b+' '+a.cls:b;
const BTN=(v,label,a={},icon)=>`<button type="button" class="${cx('pl-btn pl-btn--'+v,a)}"${at(a)}>${icon?ic(icon,v==='icon'?'':'sm'):''}${label}</button>`;
const IBTN=(icon,name,a={})=>BTN('icon',`<span class="sr">${name}</span>`,a,icon);
const CHIP=(label,on,a={},kind)=>`<button type="button" class="${cx('pl-chip pl-chip--'+(kind||'filter'),a)}" aria-pressed="${!!on}"${at(a)}>${label}</button>`;
const SEG=(items,a={})=>`<div class="${cx('pl-seg',a)}" role="group"${a.label?` aria-label="${esc(a.label)}"`:''}>${items.map(x=>`<button type="button" aria-pressed="${!!x.on}"${at(x.a||{})}>${x.label}</button>`).join('')}</div>`;
const FIELD=(f,a={})=>`<label class="${cx('pl-field',a)}">${ic(f.ico||'search','sm')}<span class="sr">${esc(f.ph)}</span><input${f.in&&f.in.cls?` class="${f.in.cls}"`:''}${at(f.in)} placeholder="${esc(f.ph)}" value="${esc(f.value||'')}" autocomplete="off"><button type="button" class="pl-field__clear"${f.value?'':' hidden'}>${ic('x','sm')}<span class="sr">${esc(f.clear)}</span></button></label>`;
const ROW=(o,a={})=>`<${o.tag||'div'} class="${cx('pl-row',a)}"${at(a)}>${o.media!=null?`<span class="pl-row__media">${o.media}</span>`:''}<div class="pl-row__body"><div class="pl-row__title">${o.title}</div>${o.meta?`<div class="pl-row__meta">${o.meta}</div>`:''}${o.extra||''}</div>${o.trail!=null?`<div class="pl-row__trail">${o.trail}</div>`:''}</${o.tag||'div'}>`;
const BADGE=(n,warn)=>`<span class="pl-badge${warn?' pl-badge--warn':''}">${warn?ic('alert','sm'):''}${n}</span>`;
const STAT=(icon,txt,a={})=>`<span class="${cx('pl-stat',a)}"${at(a)}>${ic(icon,'sm')}<span>${txt}</span></span>`;
const EMPTY=(media,text,act)=>`<div class="pl-empty">${media?`<div class="pl-empty__media">${media}</div>`:''}<p class="pl-empty__text">${text}</p>${act||''}</div>`;
/* durations are always H:MM in stats (docs/DESIGN.md "Stat") */
const hmm=m=>{ m=Math.round(Math.abs(m)); return Math.floor(m/60)+':'+pad(m%60); };
const clone=o=>JSON.parse(JSON.stringify(o));
function wdOf(date){ const [y,m,d]=date.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)).getUTCDay(); }
const wdName=date=>ja()?WDJA[wdOf(date)]:WDEN[wdOf(date)];
function dlabel(day,short){ const [,m,d]=day.date.split('-').map(Number);
  return ja()?(short?'':m+'月')+d+'日('+WDJA[wdOf(day.date)]+')':WDEN[wdOf(day.date)]+' '+d+(short?'':' Feb'); }
/* A day's two colours: the bright --dN for lines and swatches, the ink for text and fills under white. */
const dayStyle=i=>`--c:var(--d${i%6+1})`;
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

/* ---------- the day simulation (note 11) ---------- */
function makeSim(DB){
  const place=id=>DB.places.get(id);
  const idsOf=(date,P)=>(P.days[date]||[]).filter(id=>DB.places.has(id));
  /* stayDay {date:{id:min}} beats stay {id:min}: one place can be visited on two days for different lengths */
  const stayOf=(id,P,date)=>{ const p=place(id), sd=date&&P.stayDay&&P.stayDay[date]; return sd&&sd[id]!=null?sd[id]:P.stay&&P.stay[id]!=null?P.stay[id]:(p&&p.dur!=null?p.dur:60); };
  /* note 12 */
  function anchorsOf(day,P){ const A=P.anchors||{}, o=A[day.date]||{}, i=DB.days.findIndex(d=>d.date===day.date), pe=i>0&&(A[DB.days[i-1].date]||{}).end;
    return {start:Object.assign({},day.start,!o.start&&pe&&pe.id?{id:pe.id}:{},o.start||{}), end:Object.assign({},day.end,o.end||{})}; }
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
  /* note 13 */
  const walkOf=(a,b)=>{ for(const w of DB.walks){ if(w.a===a&&w.b===b) return {w,min:w.min}; if(w.b===a&&w.a===b) return {w,min:w.down!=null?w.down:w.min}; } return null; };
  /* note 2 in docs/FOLD.md "Core notes" */
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
        else { const w=String(span).split(',')[0].split('-').map(toMin), o=w[0], c=w[1]<=o?w[1]+1440:w[1];   /* 16:00-00:00: a close at or before the opening is the next day */
          if(arr<o) arr=o;
          if(arr+Math.min(stay,45)>c) ws.push({k:'closedAt',t:c}); }
      } else if(h==='unknown') inf.push({k:'hoursUnknown'});
      const dep=arr+stay;
      if(hasFlag(p,'tide')){ const lows=(DB.tides[p.area]||{})[date];
        if(!lows) inf.push({k:'tideCheck'});
        else if(!lows.some(x=>Math.abs(arr+stay/2-toMin(x))<=TIDE_WINDOW)) ws.push({k:'tide',t:lows.join(' / ')});
        else inf.push({k:'tideOk',t:lows.find(x=>Math.abs(arr+stay/2-toMin(x))<=TIDE_WINDOW)}); }
      /* note 3 in docs/FOLD.md "Core notes" */
      const ss=sunsetOf(p,date), sr=sunriseOf(p,date), best=new Set(String(p.best||'any').split(',')), out=OUTDOOR.has(p.cat);
      if(out&&dep>ss+1&&!best.has('sunset')&&!best.has('night')) ws.push({k:'dark',t:ss});
      const forDawn=list.slice(list.indexOf(id)+1).some(x=>String(place(x).best).indexOf('sunrise')>=0);
      if(out&&arr<sr-30&&!best.has('sunrise')&&!best.has('night')&&!forDawn) ws.push({k:'dawn',t:sr});
      const morning=arr<720, only=k=>best.size===1&&best.has(k), miss=(e,t)=>(p.mustSun?ws:inf).push({k:p.mustSun?'sunMiss':'golden',e,t});
      if(best.has('sunrise')&&(morning||only('sunrise'))&&!(arr<=sr+10&&dep>=sr)) miss('rise',sr);
      /* a sunrise-or-sunset place visited between the two has missed the sunrise, not the sunset */
      if(best.has('sunset')&&(!morning||only('sunset'))&&!(arr<=ss+15&&dep>=ss-30)){ if(best.has('sunrise')&&arr>sr&&dep<ss-30) miss('past',sr); else miss('set',ss); }
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
  /* note 4 in docs/FOLD.md "Core notes" */
  function insertPlan(day,list,ids,P,opt,c){
    list=list.filter(id=>DB.places.has(id)); ids=ids.filter((id,k)=>DB.places.has(id)&&list.indexOf(id)<0&&ids.indexOf(id)===k);
    if(!ids.length) return null;
    const base=schedule(day,list,P,opt), tries=[];
    if(ids.length===1){ const bp=bestPos(day,list,ids[0],P,opt), l=list.slice(); l.splice(bp.pos,0,ids[0]); tries.push({list:l,P,fits:bp.fits}); }
    else { const an=anchorsOf(day,P), sa=c&&c.startAt?toMin(c.startAt):null;
      for(let k=0;k<=list.length;k++){ const l=list.slice(); l.splice(k,0,...ids); tries.push({list:l,P,k});
        if(k===0&&sa!=null&&!an.start.buffer&&sa>startOf(day,P)){ const s=pad(Math.floor(sa/60))+':'+pad(sa%60);
          tries.push({list:l,P:Object.assign({},P,{start:Object.assign({},P.start,{[day.date]:s})}),k,start:s}); } }
      /* note 14 */
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

/* ---------- saved state (note 15) ---------- */
const ST={
  obj:o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{},
  plan(p,keepId,env){
    if(!p||typeof p!=='object'||!p.days||typeof p.days!=='object'||Array.isArray(p.days)) return null;
    const days={}, obj=ST.obj;
    env.days.forEach(d=>{ const a=p.days[d.date], seen=new Set(); days[d.date]=(Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&!seen.has(x)&&seen.add(x)); });
    const stay={}, start={}, notes={};
    Object.entries(obj(p.stay)).forEach(([k,v])=>{ if(typeof v==='number'&&v>0&&v<1440) stay[k]=Math.round(v); });
    Object.entries(obj(p.start)).forEach(([k,v])=>{ if(okHM(v)) start[k]=v; });
    Object.entries(obj(p.notes)).forEach(([k,v])=>{ if(typeof v==='string'&&v.trim()) notes[k]=v.slice(0,300); });
    const out={id:keepId||p.id,days,stay,start,notes}; if(typeof p.from==='string') out.from=p.from;
    if(p.anchors&&typeof p.anchors==='object') out.anchors=p.anchors;
    /* stayDay {date:{id:min}}: minutes only, the simulation reads it directly */
    if(p.stayDay&&typeof p.stayDay==='object'&&!Array.isArray(p.stayDay)){ const sd={};
      Object.entries(p.stayDay).forEach(([d,o])=>{ Object.entries(obj(o)).forEach(([k,v])=>{ if(typeof v==='number'&&v>0&&v<1440) (sd[d]=sd[d]||{})[k]=Math.round(v); }); });
      if(Object.keys(sd).length) out.stayDay=sd; }
    if(typeof p.name==='string') out.name=p.name.slice(0,40);
    if(typeof p.at==='number') out.at=p.at;
    if(p.kind==='auto'||p.kind==='shared') out.kind=p.kind; else if(p.auto) out.kind='auto';
    if(typeof p.sh==='string') out.sh=p.sh;
    if(p.titles&&typeof p.titles==='object') out.titles=p.titles;
    return out;
  },
  /* note 8 in docs/FOLD.md "Core notes" */
  trip(t){ const o=ST.obj(t), tier={}, groups=[], notes={}, seen=new Set(), gid=new Set();
    Object.entries(ST.obj(o.tier)).forEach(([k,v])=>{ if(v===''||TIERS.indexOf(v)>=0) tier[k]=v; });
    (Array.isArray(o.groups)?o.groups:[]).forEach(g=>{ if(!g||typeof g.id!=='string'||gid.has(g.id)) return; gid.add(g.id);
      const x={id:g.id,name:typeof g.name==='string'?g.name.slice(0,40):'',ids:(Array.isArray(g.ids)?g.ids:[]).filter(i=>typeof i==='string'&&!seen.has(i)&&seen.add(i))};
      if(typeof g.from==='string') x.from=g.from; groups.push(x); });
    Object.entries(ST.obj(o.notes)).forEach(([k,v])=>{ if(typeof v==='string'&&v.trim()) notes[k]=v.slice(0,300); });
    return {tier,groups,notes}; },
  /* a preset's own note for that place (any preset): it stays with its version, never the trip's */
  pre(env,k,v){ return ((env&&env.presets)||[]).some(P=>P.notes&&P.notes[k]===v); },   /* env.presets: the old curated plans, when known (tests pass the fixture) */
  /* note 16 */
  lift(r,env){ const notes={}, add=o=>Object.keys(o||{}).forEach(k=>{ if(notes[k]==null&&!ST.pre(env,k,o[k])) notes[k]=o[k]; });
    if(r.my){ add(r.my.notes); Object.keys(notes).forEach(k=>{ delete r.my.notes[k]; }); }
    r.versions.slice().sort((a,b)=>(b.at||0)-(a.at||0)).forEach(v=>add(v.notes));
    r.trip={tier:{},groups:[],notes}; },
  /* note 9 in docs/FOLD.md "Core notes" */
  merge(r,b){ const t=b.trip;
    Object.keys(t.tier).forEach(k=>{ if(r.trip.tier[k]==null) r.trip.tier[k]=t.tier[k]; });
    const have=new Set(r.trip.groups.flatMap(g=>g.ids));
    t.groups.forEach(g=>{ if(!r.trip.groups.some(x=>x.id===g.id)) r.trip.groups.push(Object.assign({},g,{ids:g.ids.filter(i=>!have.has(i))})); });
    /* her v2 notes win over what the old app lifted */
    Object.keys(t.notes).forEach(k=>{ if(r.migrated||r.trip.notes[k]==null) r.trip.notes[k]=t.notes[k]; });
    if(!r.my&&b.my) r.my=b.my; else if(b.my&&r.my&&JSON.stringify(b.my.days)!==JSON.stringify(r.my.days)) r.versions.unshift(Object.assign({},b.my,{id:'v-k'+Date.now().toString(36),kind:'auto',at:Date.now()}));
    b.versions.forEach(v=>{ if(!r.versions.some(x=>x.id===v.id)) r.versions.push(v); });
    b.imports.forEach(m=>{ if(!r.imports.some(x=>x.id===m.id)) r.imports.push(m); });
    Object.assign(r.booked,b.booked); r.merged=true; },
  imps(a){ return Array.isArray(a)?a.filter(m=>m&&typeof m.id==='string'&&typeof m.name==='string'&&(m.lat==null?m.lon==null:isFinite(m.lat)&&isFinite(m.lon))):[]; },
  /* the planner is one country's: an import whose country or position is elsewhere is dropped */
  home(m){ return m.cc?m.cc==='nz':m.lat==null||(m.lat>-47.6&&m.lat<-34&&m.lon>165.8&&m.lon<178.9); },
  read(raw,env,broken){
    const r={my:null,versions:[],imports:[],booked:{},active:null,broken:false,loaded:false,trip:{tier:{},groups:[],notes:{}},v:0};
    let saved=null;
    if(raw!=null){ try{ saved=JSON.parse(raw); }catch(e){ r.broken=true; } }
    if(saved&&(typeof saved!=='object'||(saved.v!==1&&saved.v!==2))){ r.broken=true; saved=null; }
    if(saved) ST.fill(r,saved,env);
    if(broken!=null&&(!saved||saved.v===1)){ let b=null; try{ b=JSON.parse(broken); }catch(e){}
      if(b&&b.v===2){ const x={my:null,versions:[],imports:[],booked:{},trip:null}; ST.fill(x,b,env); ST.merge(r,x); r.loaded=true; } }
    return r;
  },
  fill(r,saved,env){
    r.loaded=true; r.v=saved.v;
    if(saved.my!=null){ r.my=ST.plan(saved.my,'my',env); if(!r.my) r.broken=true; }
    r.versions=(Array.isArray(saved.versions)?saved.versions:[]).map(v=>v&&typeof v.id==='string'&&v.id.startsWith('v-')?ST.plan(v,v.id,env):null).filter(Boolean);
    if(Array.isArray(saved.versions)&&r.versions.length<saved.versions.length) r.broken=true;
    r.imports=ST.imps(saved.imports);
    Object.keys(ST.obj(saved.booked)).forEach(k=>{ if(saved.booked[k]===true) r.booked[k]=true; });
    r.active=typeof saved.active==='string'?saved.active:null;
    if(saved.v===2){ r.trip=ST.trip(saved.trip); const n=r.trip.notes; Object.keys(n).forEach(k=>{ if(ST.pre(env,k,n[k])) delete n[k]; }); }
    else { ST.lift(r,env); r.migrated=true; }
  }
};
const TIERS=['must','want','maybe','skip'];

const plannerFn=function planner(g){
  const view=g.querySelector('.v-plan'); if(!view) return;
  const slug=g.dataset.guide||'nz', SRC=view.dataset.src||('data/'+slug+'/');
  const KP='plan:'+slug, KU='plan-ui:'+slug, KB=KP+':broken', KI=KP+':imp';
  const UI=LSJ.get(KU,null);
  const ui=UI&&typeof UI==='object'?UI:{};
  const S={
    raw:LSJ.raw(KP), vw:view.clientWidth, planId:null, my:null, versions:[], imports:[], booked:{}, trip:{tier:{},groups:[],notes:{}},
    impVer:1, placing:null, ip:null,
    day:Number.isInteger(+ui.day)?+ui.day:0, map:ui.map==='closed'||ui.map===false?'closed':'peek',
    hideInstall:!!ui.hideInstall, hideIntro:true, help:!ui.hideIntro, hints:ui.hints&&typeof ui.hints==='object'?ui.hints:{}, saveFail:false,   /* help text (intro, hints) shows in the first session only */
    sel:null, sc:null, f:{q:'',cat:null,area:null,saved:null,sort:'trend'}, hist:[], browsing:false, drafts:{}, noteOpen:null,
    dayEnd:okHM(ui.dayEnd)?toMin(ui.dayEnd):DEADLINE,
    stage:['collect','plan','review'].indexOf(ui.stage)>=0?ui.stage:'plan', board:typeof ui.board==='boolean'?ui.board:null, pin:Array.isArray(ui.pin)?ui.pin.filter(x=>typeof x==='string').slice(0,3):null, cf:ui.cf&&typeof ui.cf==='object'?ui.cf:{}
  };
  /* road geometry cache, LRU, in plan-ui */
  const RC={map:ui.routes&&typeof ui.routes==='object'?ui.routes:{}, order:Array.isArray(ui.rorder)?ui.rorder.filter(k=>typeof k==='string'):[]};
  let DB=null, DRAG=null, PENDING=false;

  /* ---------- chrome: built once ---------- */
  view.innerHTML=`<div class="pl-shell">
    <div class="pl-bar">
      <button class="pl-btn pl-btn--secondary" type="button" data-r="plan" aria-haspopup="dialog"><span data-r="plank"></span><b data-r="planv"></b>${ic('chevron-down','sm')}</button>
      <span class="pl-bar__tools" data-r="tools">
        <button class="pl-btn pl-btn--icon" type="button" data-r="undo" disabled>${ic('undo')}<span class="sr" data-pt="undo"></span></button>
        <button class="pl-btn pl-btn--icon" type="button" data-r="share">${ic('share')}<span class="sr" data-pt="share"></span></button>
      </span>
    </div>
    <nav class="pl-stages pl-seg" data-pt-label="stages">${['collect','plan','review'].map((k,i)=>`<button type="button" data-stage="${k}" aria-pressed="false"><b aria-hidden="true">${'①②③'[i]}</b><span data-pt="st_${k}"></span><i class="pl-stages__n"></i></button>`).join('')}</nav>
    <div class="pl-stick">
      <nav class="pl-days"></nav>
      <section class="pl-mapcard">
        <div class="pl-mapbox">
          <div class="pl-map" role="img"></div>
          <p class="pl-mapnote" role="status" hidden></p>
          <div class="pl-mapctl">
            <button type="button" class="pl-btn pl-btn--icon" data-zoom="in">${ic('plus')}<span class="sr" data-pt="zoomIn"></span></button>
            <button type="button" class="pl-btn pl-btn--icon" data-zoom="out">${ic('minus')}<span class="sr" data-pt="zoomOut"></span></button>
            <button type="button" class="pl-btn pl-btn--icon" data-zoom="fit">${ic('fit')}<span class="sr" data-pt="fit"></span></button>
            <button type="button" class="pl-btn pl-btn--icon" data-zoom="full">${ic('maximize')}<span class="sr"></span></button>
          </div>
          <p class="pl-estnote" hidden></p>
        </div>
        <div class="pl-mapfoot">
          <button class="pl-btn pl-btn--secondary" type="button" data-r="maptoggle" aria-expanded="true">${ic('map','sm')}<span></span></button>
          <button class="pl-btn pl-btn--primary" type="button" data-r="browse">${ic('search','sm')}<span data-pt="browse"></span></button>
        </div>
      </section>
    </div>
    <div class="pl-notice"></div>
    <div class="pl-main" aria-live="off"></div>
    <section class="pl-collect"></section><section class="pl-review"></section>
    <aside class="pl-palette"></aside><section class="pl-board"></section></div>`;
  const layer=document.createElement('div');
  layer.innerHTML=`<div class="pl-layer pl-scrim" hidden></div>
    <div class="pl-layer pl-sheet" role="dialog" aria-modal="true" tabindex="-1" id="pl-sheet-${slug}" aria-labelledby="pl-sht-${slug}" hidden inert><div class="pl-sheet__grab" aria-hidden="true"></div><div class="pl-sheet__body"></div></div>
    <div class="pl-layer pl-toast" role="status" aria-live="polite"></div>`;
  [...layer.children].forEach(el=>g.appendChild(el));
  const q=s=>view.querySelector(s);
  const E={bar:q('[data-r="plan"]'), days:q('.pl-days'), card:q('.pl-mapcard'), mapEl:q('.pl-map'), mapnote:q('.pl-mapnote'), main:q('.pl-main'),
    notice:q('.pl-notice'), undo:q('[data-r="undo"]'), stages:q('.pl-stages'), collect:q('.pl-collect'), review:q('.pl-review'),
    palette:q('.pl-palette'), board:q('.pl-board'), shell:q('.pl-shell'), stick:q('.pl-stick'), toggle:q('[data-r="maptoggle"]'), estnote:q('.pl-estnote'),
    scrim:g.querySelector('.pl-scrim'), sheet:g.querySelector('.pl-sheet'), sbody:g.querySelector('.pl-sheet__body'), toast:g.querySelector('.pl-toast')};
  const svg=E.mapEl, main=E.main;      /* svg: the map's host (the name the other chunks know) */

  /* note 5 in docs/FOLD.md "Core notes" */
  const place=id=>DB.places.get(id);
  const nm=p=>p?(ja()?(p.nameJa||p.name):p.name):'?';
  const alt=p=>ja()?(p.nameJa&&p.name!==p.nameJa?p.name:''):(p.nameJa&&p.nameJa!==p.name?p.nameJa:'');
  const nmLang=p=>{ const n=nm(p); return ja()&&latin(n)?' lang="en"':(!ja()&&!latin(n)?' lang="ja"':''); };
  const altLang=p=>ja()?' lang="en"':' lang="ja"';
  const glyphOf=p=>p.id==='akl'?'plane-landing':p.cat==='ferry'?'sailboat':DB.bases.has(p.id)?'home':(GLYPH[p.cat]||'sparkles');
  const isCand=p=>!DB.bases.has(p.id)&&p.cat!=='ferry';
  /* no premade plans (docs/DESIGN.md): マイプラン, always there, and her own versions */
  function findPlan(id){ if(id==='my') return S.my; return S.versions.find(v=>v.id===id)||null; }
  const plan=()=>findPlan(S.planId)||S.my;
  const myEmpty=()=>!DB.days.some(d=>(S.my.days[d.date]||[]).length);
  /* An autosave or a received version is named when shown, so its name follows the language. */
  const atTxt=t=>{ const d=new Date(t||0); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); };
  const planName=p=>p.id==='my'?(p.name||pt('my')):p.id.startsWith('v-')?(p.name||pt(p.kind==='shared'?'shared':'autoSaved',{t:atTxt(p.at)})):(ja()?p.nameJa:p.name);
  /* plan.titles[date] {ja,en} names a version's day before the default day label */
  /* note 17 */
  const titleT=(day,P)=>{ P=P||plan(); const t=P.titles&&P.titles[day.date], src=P.id==='my'||String(P.id).startsWith('v-')?findPlan(P.from)||P:P,
      a=idsOf(day.date,P), b=idsOf(day.date,src), n=a.filter(x=>b.indexOf(x)>=0).length, u=new Set(a.concat(b)).size;
    if(t&&(!u||n/u>=.6)) return t; if(!a.length) return null;
    const two=k=>a.slice(0,2).map(id=>{ const p=place(id); return (k?p.nameJa||p.name:p.name).replace(/\s*[(（].*?[)）]/g,''); }).join(k?'・':' · ');
    return {ja:two(1),en:two(0)}; };
  const dayTitle=(day,P)=>{ const t=titleT(day,P); return t?t[lang()]||t.ja||t.en:(ja()?day.labelJa:day.label); };
  /* notes in plans.json are "JA / EN"; the travellers' own are one language */
  /* her note on a place is the trip's (every version shows it); a preset's own "JA / EN" note otherwise */
  const noteText=(P,id)=>{ const n=S.trip.notes[id]||P.notes&&P.notes[id]; if(!n) return ''; const k=n.indexOf(' / '); return k<0?n:(ja()?n.slice(0,k):n.slice(k+3)); };
  const presetName=id=>{ const p=findPlan(id); return p?planName(p):''; };
  const idsOf=(date,P)=>SIM.idsOf(date,P||plan());
  const stayOf=(id,P,date)=>SIM.stayOf(id,P||plan(),date||DB.days[S.day].date);
  function plannedMap(P){ const m=new Map(); P=P||plan(); DB.days.forEach((d,i)=>(P.days[d.date]||[]).forEach(id=>{ if(!m.has(id)) m.set(id,i); })); return m; }
  /* note 18 */
  /* note 19 */
  let saveQ=0, impW=null, lastW=null;
  const body=()=>JSON.stringify({v:2,active:S.planId,trip:S.trip,my:S.my,versions:S.versions,booked:S.booked});
  function saveNow(){ saveQ=0; let ok=true;
    if(impW!==S.imports){ ok=LSJ.set(KI,S.imports); if(ok) impW=S.imports; }
    const b=body(); if(b!==lastW){ LS.set(KP,b); const k=LS.get(KP)===b; if(k) lastW=b; ok=ok&&k; }
    noteSave(ok); if(SY) SY.saved(); return ok; }
  function save(){ if(!saveQ) saveQ=idle(saveNow,1000); return true; }
  /* the plan, and a UI save still waiting for idle (the day picked just before the tab hides) */
  const flushSave=()=>{ if(saveQ){ (window.cancelIdleCallback||clearTimeout)(saveQ); saveNow(); } if(uiP){ clearTimeout(uiT); saveUI(); } };
  /* sync (planner-sync.js) loads only on a paired phone, or to read a #pair= link */
  let SY=null, SYP=null; const loadSync=()=>SYP||(SYP=Promise.all([loadCss('pl-sync',view.dataset.syncCss||'planner-sync.css'),loadJs(view.dataset.syncSrc||'planner-sync.js')]).then(()=>SY=planner.sync(ctx()),()=>{ SYP=null; }));
  let uiT=0, uiP=false; const saveUISoon=()=>{ uiP=true; clearTimeout(uiT); uiT=setTimeout(()=>idle(()=>{ if(uiP) saveUI(); },2000),400); };
  function saveUI(){ uiP=false; LSJ.set(KU,{v:1,stage:S.stage,cf:S.cf,board:S.board,pin:S.pin,day:S.day,map:S.map==='full'?'peek':S.map,dayEnd:S.dayEnd!==DEADLINE?hhmm(S.dayEnd):undefined,hideInstall:S.hideInstall,hideIntro:S.hideIntro,hints:S.hints,routes:RC.map,rorder:RC.order}); }
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
  const state=()=>({planId:S.planId,my:S.my?clone(S.my):null,versions:S.versions,imports:S.imports,booked:S.booked,trip:S.trip});
  /* note 20 */
  function editTrip(fn,msg){ const before=state(), t=clone(S.trip);
    try{ fn(t); }catch(e){ console.error(e); return false; }
    S.trip=t; S.hist.push(before); if(S.hist.length>100) S.hist.shift(); save(); dirty('stages','top','desk','cands','collect','review'); if(msg) toast(msg,undo); return true; }
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
  /* note 21 */
  let ARMD=null;
  function arm(el,why,go){ disarm();
    const box=document.createElement('div'); box.className='pl-armed'; box.setAttribute('role','alert');
    box.innerHTML=`<p class="pl-armed__text">${ic('alert','sm')}<span>${esc(why)}</span></p>${BTN('primary',pt('confirm'),{act:'armok',cls:'pl-btn--s'})}${BTN('ghost',pt('cancel'),{act:'armno',cls:'pl-btn--s'})}`;
    /* on the item: inside a one-row host (a stop, an anchor), or straight after the row in a list of them */
    const host=el&&el.closest?el.closest('[data-arm]')||el.parentNode:main, row=el&&el.closest&&el.closest('.pl-row');
    if(row&&host.contains(row)&&host.querySelectorAll('.pl-row').length>1) row.after(box); else host.appendChild(box);
    ARMD={box,go,el}; box.querySelector('[data-act="armok"]').focus({preventScroll:true}); }
  function disarm(go){ const a=ARMD; ARMD=null; if(!a) return; a.box.remove(); if(go) a.go(); else if(a.el&&a.el.isConnected&&a.el.focus) a.el.focus({preventScroll:true}); }
  function guard(el,key,fn,msg,opt){
    const bs=trial(fn);
    if(bs&&bs.length){ arm(el,breakLine(bs),()=>{ if(edit(fn,msg,opt)&&sheetKind) refreshSheet(); }); return false; }
    return edit(fn,msg,opt);
  }
  /* an edit changes the active plan in place: マイプラン itself, or a saved version replaced by its changed clone */
  function edit(fn,msg,opt){
    if(DRAG) DRAG.cancel();
    const before=state();
    /* the active plan is edited in place: マイプラン, or her own version (replaced by a changed copy,
       so an undo entry keeps the old one) */
    let P;
    try{
      if(S.planId==='my'){ P=S.my; }
      else { const v=findPlan(S.planId); P=clone(v); S.versions=S.versions.map(x=>x===v?P:x); }
      fn(P);
    }catch(e){ S.my=before.my; S.versions=before.versions; console.error(e); return false; }
    S.hist.push(before); if(S.hist.length>100) S.hist.shift();
    /* name what the change broke, on every day it touched */
    const was=before.planId==='my'?before.my:before.versions.find(v=>v.id===S.planId), bs=was?dayBreaks(was,P):[];
    S.lastBreaks=bs;
    /* the toast names only what the screen does not already show: breaks on days out of view */
    const off=view.classList.contains('pl-6')?[]:bs.filter(b=>b.day!==DB.days[S.day]); if(off.length&&msg) msg+=' — ⚠ '+breakLine(off);
    save();
    if(opt&&opt.quick&&S.sc) patchDay(); else dirty('top','days','main','map','stages','desk','collect','review');
    /* the day's set of stops changed: the map refits it */
    const dk=DB.days[S.day].date; if(!was||String((was.days||{})[dk])!==String(P.days[dk]||[])) (soon?afterRender:raf)(()=>fitDay());
    if(msg) toast(msg,undo);
    if(opt&&opt.focus!=null) afterRender(()=>focusStop(opt.focus));
    return true;
  }
  function undo(){
    if(DRAG) DRAG.cancel();
    const s=S.hist.pop(); if(!s){ toast(pt('noUndo')); return; }
    const fk=focusKey();
    S.planId=s.planId; S.my=s.my; S.versions=s.versions; S.imports=s.imports; S.booked=s.booked; S.trip=s.trip; S.impVer++;
    save(); render(); refreshSheet(); toast(pt('undone'));
    /* back to the same control if it still exists, else the undo button, else the first stop */
    if(!sheetKind){ const t=fk&&main.querySelector(fk); if(t) t.focus({preventScroll:true}); else if(!E.undo.disabled) E.undo.focus({preventScroll:true}); else focusStop(0); }
  }

  /* note 22 */
  const ENV=()=>({days:DB.days});
  function loadState(){
    const r=ST.read(S.raw,ENV(),LS.get(KB)), ri=LS.get(KI);
    if(ri!=null){ let a=null; try{ a=JSON.parse(ri); }catch(e){} if(Array.isArray(a)){ r.imports=ST.imps(a); r.loaded=true; } }
    const n0=r.imports.length; r.imports=r.imports.filter(ST.home); S.impDropped=n0-r.imports.length;
    if(S.impDropped) r.merged=true;
    S.my=r.my; S.versions=r.versions; S.imports=r.imports; S.booked=r.booked; S.planId=r.active; S.trip=r.trip;
    if(r.loaded) S.impVer++;
    /* never lose the v1 string: it is copied aside once, before anything writes v2 over it */
    if(r.migrated&&S.raw!=null&&LS.get(KP+':v1')==null) LS.set(KP+':v1',S.raw);
    if(r.broken&&S.raw!=null){ LS.set(KB,S.raw); }
    if(r.merged) S.mergedBack=true;
    if(!S.my) S.my={id:'my',days:{},stay:{},start:{},notes:{}};      /* マイプラン always exists, empty at first */
    if(!findPlan(S.planId)) S.planId='my';
    if(!(S.day>=0&&S.day<DB.days.length)) S.day=0;
    return r.broken;
  }

  /* note 23 */
  function impPlace(m){
    return {id:m.id,name:m.name,nameJa:m.name,cat:'imp',area:'imported',lat:m.lat,lon:m.lon,dur:60,hours:'always',
      gmaps:m.src==='gmaps'&&m.url?m.url:null,ig:'',igTag:'',vibe:m.note||'',vibeJa:m.note||'',best:'any',cost:'',book:false,flags:[],trend:0,outdoor:0,aesthetic:0,imp:m};
  }
  /* note 24 */
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

  /* ---------- tiers (note 25) ---------- */
  const tierOf=id=>{ const t=S.trip.tier[id]; if(t!=null) return t; const p=place(id); return p&&p.saved?'want':''; };
  const seeded=id=>S.trip.tier[id]==null&&!!(place(id)||{}).saved;
  const skipSet=()=>new Set(Object.keys(S.trip.tier).filter(k=>S.trip.tier[k]==='skip'));
  /* how many musts a version places: 「絶対 7/9」; an unplaced must is a to-do, never a block */
  function cover(P){ const m=plannedMap(P), all=DB.list.filter(p=>isCand(p)&&tierOf(p.id)==='must'); return {n:all.filter(p=>m.has(p.id)).length,of:all.length,open:all.filter(p=>!m.has(p.id))}; }
  let WK=null;
  function warnCount(P){ const k=bodyOf(P)+S.dayEnd+(lazy.travel?1:0); if(WK&&WK.k===k) return WK.n;
    const n=DB.days.reduce((t,d)=>t+schedule(d,null,P).warns,0); WK={k,n}; return n; }
  /* ---------- stages (note 26) ---------- */
  function renderStages(){ const P=plan(), cv=cover(P), inbox=DB.list.filter(p=>isCand(p)&&tierOf(p.id)==='').length, w=warnCount(P);
    const txt={collect:pt('inboxN',{n:inbox}),plan:cv.of?pt('mustN',{n:cv.n,of:cv.of}):pt('daysN',{n:DB.days.length,s:DB.days.reduce((t,d)=>t+idsOf(d.date,P).length,0)}),review:w?'⚠ '+w:'✓'};
    E.stages.querySelectorAll('[data-stage]').forEach(b=>{ const k=b.dataset.stage; b.setAttribute('aria-current',k===S.stage?'step':'false'); b.setAttribute('aria-pressed',k===S.stage); b.querySelector('.pl-stages__n').textContent=txt[k]; }); }
  function setStage(st,quiet){ if(st===S.stage) return; if(S.stage==='collect'&&CM) CM.release(); disarm(); if(S.csel) S.csel.clear(); S.stage=st; view.dataset.stage=st; saveUISoon(); if(sheetKind) closeSheet(); scrollTo(0,0); if(st==="plan") needFit=true, setTimeout(()=>fitDay(),60);
    renderStages(); syncCands(); renderLegs(); syncURL();
    if(st==='collect') needCollect().then(c=>c.render(),()=>{});
    else if(st==='review') needMore().then(m=>m.renderReview(E.review));
    else render();
    if(quiet==='key') E.stages.querySelector(`[data-stage="${st}"]`).focus({preventScroll:true}); }
  /* the wide layouts' code: only once the planner itself is ≥1024 wide, after first paint (a phone never asks) */
  let DKP=null, DK=null;
  function needDesk(){ if(DKP||S.vw<1024) return; DKP=Promise.all([loadCss('pl-desk',view.dataset.deskCss||'planner-desk.css'),planner.desk?0:loadJs(view.dataset.deskSrc||'planner-desk.js')])
    .then(()=>{ DK=planner.desk(ctx()); render(); }).catch(e=>{ console.error(e); DKP=null; }); }
  let COLP=null, CM=null;
  function needCollect(){ return COLP||(COLP=Promise.all([loadCss('pl-col',view.dataset.collectCss||'planner-collect.css'),planner.collect?0:loadJs(view.dataset.collectSrc||'planner-collect.js')])
    .then(()=>(CM=planner.collect(ctx())),e=>{ COLP=null; toast(pt('loadFail')); throw e; })); }

  /* ---------- render: toolbar, day strip ---------- */
  function renderTop(){
    const p=plan();
    E.bar.querySelector('[data-r="plank"]').textContent=pt('plan');
    E.bar.querySelector('[data-r="planv"]').textContent=planName(p);
    E.undo.disabled=!S.hist.length;
  }
  function renderDays(){
    const p=plan();
    E.days.innerHTML=DB.days.map((d,i)=>{ const n=(p.days[d.date]||[]).filter(id=>DB.places.has(id)).length;
      /* a day pill: a choice chip with the numeral, the weekday and a dot per stop in the day's hue (an empty day: a hollow ring) */
      return `<button type="button" class="pl-chip pl-chip--choice pl-day" style="--day:var(--d${i%6+1})" data-day="${i}" aria-pressed="${i===S.day}"${i===S.day?' aria-current="date"':''}>
        <b>${+d.date.slice(8)}</b><small>${wdName(d.date)}</small><span class="pl-day__dots"><span class="sr">${pt('stops',{n})}</span>${n?'<i></i>'.repeat(Math.min(n,6)):'<i class="pl-day__empty"></i>'}</span></button>`;
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
      case 'sunMiss': return pt(w.e==='rise'?'missRise':w.e==='past'?'pastRise':'missSet',{t:hm(w.t)});
      default: return '';
    }
  }
  function infoText(x){
    switch(x.k){
      case 'overnight': return pt('overnight'); case 'hoursUnknown': return pt('hoursUnknown'); case 'tideCheck': return pt('tideCheck');
      case 'sunrise': return pt('sunrise',{t:hm(x.t)}); case 'sunsetAt': return pt('sunsetAt',{t:hm(x.t)});
      case 'golden': return pt(x.e==='rise'?'goldRise':'goldSet',{t:hm(x.t)});
      case 'ferryUnverified': return pt('ferry')+' '+pt('unverified'); case 'tideOk': return pt('tideOk',{t:x.t}); case 'tight': return pt('tight',{d:dur(x.m)}); case 'darkDrive': return pt('darkDrive',{t:hm(x.t)});
      default: return '';
    }
  }
  /* note 27 */
  const flagT=(f,p)=>{ if(!/^start-[\d:]+-for-sunrise$/.test(f)) return tr(FLAG,f);
    const k=plannedMap().get(p.id), day=DB.days[k]; if(!day) return '';
    const sr=sunriseOf(p,day.date), l=SIM.legAt(SIM.anchorsOf(day,plan()).start.id,p.id,0,day.date,[]);
    return pt('leaveFor',{s:hm(sr),t:hm(Math.floor((sr-l.min-10)/5)*5)}); };
  const unverifiedHours=p=>hasFlag(p,'hours-times-unverified')||p.hours==='unknown';
  /* the hours the simulation uses, always: listed but unverified ones say so after the times */
  function hoursText(p,date){
    const h=p.hours; if(h==='unknown') return pt('hoursUnknown'); if(!h||typeof h!=='object') return pt('always');
    const v=h[WD[wdOf(date)]]; if(!v) return pt('closedToday');
    return String(v).split(',').map(s=>s.split('-').map(x=>hm(toMin(x))).join('–')).join(', ')+(unverifiedHours(p)?'（'+pt('unverified')+'）':'');
  }
  /* ---------- ② the day: header, anchors, stops (list rows), legs; every element from the components ---------- */
  const chip=(cls,icon,txt)=>STAT(icon||'sparkles',txt,{cls});
  /* a leg, as stats: drive, walk and ferry glyphs (no emoji), durations H:MM; a waiting gap after it */
  function legInner(l,to){
    const gap=to.wait>0?STAT('clock',pt('wait',{t:hm(to.begin),d:hmm(to.wait)}),{cls:'pl-stat--soft'}):'';
    if(l.kind==='ferry'){
      const f=l.f;
      return STAT('car',hmm(l.d1))+STAT('sailboat',l.listed?pt('sail',{t:hm(l.dep),d:hmm(l.sail)}):pt('sailAny',{d:hmm(l.sail)}))+
        (l.listed&&l.way==='out'?STAT('clock',pt('board',{d:hmm(f.board!=null?f.board:15)}),{cls:'pl-stat--soft'}):'')+
        STAT('car',hmm(l.d2))+(f.verified===false?STAT('alert',pt('unverified'),{cls:'pl-stat--soft'}):'')+gap+
        (f.note||f.noteJa?fnote(ja()?f.noteJa||f.note:f.note||f.noteJa):'');
    }
    if(l.combo){ const w=m=>m?STAT('walk',hmm(m),{title:pt('walkN',{d:dur(m)})}):''; return w(l.wa)+(l.sub?legInner(l.sub,{wait:0}):'')+w(l.wb)+gap; }
    if(l.kind==='walk'){ const wn=l.w&&(ja()?l.w.noteJa||l.w.note:l.w.note||l.w.noteJa); return STAT('walk',hmm(l.min),{title:pt('walkN',{d:dur(l.min)})})+gap+(wn?fnote(wn):''); }
    return STAT('car',(l.est?`<span title="${esc(pt('estT'))}">≈</span>`:'')+hmm(l.min))+`<span class="pl-stat pl-stat--soft">${uKm(Math.round(l.km))}</span>`+gap;
  }
  /* a leg's note (the walk, the ferry) opens on a tap: the line itself stays one line */
  const fnote=t=>`<details class="pl-leg__note"><summary>${ic('chevron-down','sm')}<span class="sr">${esc(pt('more2'))}</span></summary><p>${esc(t)}</p></details>`;
  const whenText=r=>`${hm(r.begin)}–${hm(r.dep)}`;
  const bookBtn=(p,N)=>CHIP(`${ic(S.booked[p.id]?'check':'bookmark','sm')}<span>${S.booked[p.id]?pt('booked'):pt('book')}</span><span class="sr">${pt('markBooked',{name:N})}</span>`,!!S.booked[p.id],{act:'booked',id:p.id});
  const infosHTML=r=>r.infos.map(x=>STAT(x.k==='sunrise'||x.k==='sunsetAt'?'sunset':'sparkles',infoText(x),{cls:'pl-stat--soft'})).join('');
  /* a warning: one short line on the item it concerns, in --pl-warn */
  const warnsHTML=(r,day)=>r.warns.map(w=>STAT('alert',warnText(w,day),{cls:'pl-stat--warn'})).join('');
  /* note 28 */
  function stopHTML(r,n,day){
    const p=place(r.id), fl=flagsOf(p).filter(f=>/-for-sunrise$/.test(f)), N=esc(nm(p)), P=plan();
    const noteTxt=noteText(P,p.id), open=S.noteOpen===p.id, draft=open&&S.drafts[p.id]!=null?S.drafts[p.id]:noteTxt, eid=`pl-ne-${slug}-${p.id}`;
    const meta=`<span class="pl-stop__when">${whenText(r)}</span>${ic(glyphOf(p),'sm')}<span class="sr">${tr(CAT,p.cat)}</span>${savedTag(p)}${fl.map(f=>flagT(f,p)?STAT('sunset',flagT(f,p),{cls:'pl-stat--soft'}):'').join('')}${infosHTML(r)}`;
    return ROW({media:`<button type="button" class="pl-marker" data-act="focus" data-id="${p.id}"><span class="sr">${pt('focus',{name:N})}</span>${n}</button>${thumb(p)}`,
        title:`<button type="button" class="pl-row__name" data-act="open" data-id="${p.id}"${nmLang(p)}>${wbr(nm(p))}</button>`, meta,
        extra:`${r.warns.length?`<div class="pl-row__warn">${warnsHTML(r,day)}</div>`:''}${p.book?bookBtn(p,N):''}`,
        trail:IBTN('grip',pt('orderN',{name:N}),{act:'order',id:p.id,cls:'pl-stop__handle'})},{act:'sel',id:p.id})+
      `<div class="pl-stop__acts" role="group" aria-label="${esc(pt('toolsN',{name:nm(p)}))}">
        <div class="pl-seg pl-stop__stay" role="group" aria-label="${esc(pt('stay'))}">${IBTN('minus',pt('stayDec',{name:N}),{act:'stay','data-d':-15,id:p.id})}<output>${pt('stay')} <span class="pl-stop__sv">${hmm(r.stay)}</span></output>${IBTN('plus',pt('stayInc',{name:N}),{act:'stay','data-d':15,id:p.id})}</div>
        ${BTN('ghost',`<span aria-hidden="true">${pt('swap')}</span><span class="sr">${pt('swapN',{name:N})}</span>`,{act:'swap',id:p.id},'swap')}
        ${BTN('ghost',`<span aria-hidden="true">${pt('move')}</span><span class="sr">${pt('moveN',{name:N})}</span>`,{act:'move',id:p.id},'calendar')}
        ${BTN('ghost',`<span aria-hidden="true">${pt('note')}</span><span class="sr">${pt('noteN',{name:N})}${noteTxt?'：'+esc(noteTxt):''}</span>`,{act:'note',id:p.id,cls:noteTxt?'pl-stop__note--has':'', 'aria-expanded':open,'aria-controls':eid},'pencil')}
        ${BTN('ghost',`<span aria-hidden="true">${pt('del')}</span><span class="sr">${pt('delN',{name:N})}</span>`,{act:'del',id:p.id,cls:'pl-stop__del'},'x')}
      </div>
      <div class="pl-stop__noteed" id="${eid}"${open?'':' hidden'}><textarea name="note" rows="2" maxlength="300" placeholder="${esc(pt('notePh'))}" data-id="${p.id}" aria-label="${esc(pt('noteN',{name:N}))}">${esc(draft)}</textarea>
        ${BTN('secondary',pt('save'),{act:'notesave',id:p.id})}</div>`;
  }
  /* every end limit says what it is: the day-end setting, the flight, or this plan's anchor */
  function endSmall(e){
    if(!e.explicit&&!e.warns.length) return '';
    const hint=!e.explicit?pt('limitHint',{t:hm(e.limit)}):e.id==='akl'?pt('limitFlight',{t:hm(e.limit)}):pt('limitAnchor',{t:hm(e.limit),name:nm(place(e.id))});
    const w=e.warns.find(x=>x.k==='over');
    return w?STAT('alert',w.flight?pt('overFlight',{t:hm(e.limit)}):pt('over',{t:hm(e.limit),d:hmm(w.m)}),{cls:'pl-stat--warn',title:hint}):STAT('clock',pt('slack',{t:hm(e.limit),d:hmm(e.limit-e.arr)}),{cls:'pl-stat--soft',title:hint});
  }
  /* The day's photo: a stop with one, preferring sunrise/sunset heroes, then the most photogenic. */
  function heroOf(sc){
    if(!DB.photos) return null;
    const c=sc.rows.filter(r=>r.kind==='stop'&&DB.photos[r.id]).map(r=>place(r.id))
      .sort((a,b)=>((b.best==='sunrise'||b.best==='sunset')-(a.best==='sunrise'||a.best==='sunset'))||(b.aesthetic||0)-(a.aesthetic||0));
    return c[0]||null;
  }
  const srcset=ph=>ph.src2x?` srcset="${esc(ph.src)} 1x, ${esc(ph.src2x)} 2x"`:'';
  /* gallery.json and its chunk, on first need, never on the first screen (docs/FOLD.md "Gallery") */
  let GAL=null, GX=null;
  function loadGallery(){ return GAL||(GAL=Promise.all([fetch(SRC+'gallery.json').then(r=>r.ok?r.json():{}),loadCss('pl-gal',view.dataset.galleryCss||'planner-gallery.css'),planner.gallery?0:loadJs(view.dataset.gallerySrc||'planner-gallery.js')])
    .then(([j])=>{ DB.gallery=j&&typeof j==='object'?j:{}; GX=planner.gallery(ctx()); if(CM) CM.media(); if(sheetKind==='place'&&DB.gallery[sheetArg.id]) refreshSheet(); return DB.gallery; },()=>{ GAL=null; return {}; })); }
  /* the empty day's frame photo (data/nz/frames.json, one credited Commons image per day), lazy like the gallery */
  let FRP=null;
  const loadFrames=()=>FRP||(FRP=fetch(SRC+'frames.json').then(r=>r.ok?r.json():{}).catch(()=>{ FRP=null; return {}; }).then(j=>{ DB.frames=j||{}; dirty('main'); return DB.frames; }));
  const thumb=p=>{ const ph=p&&DB.photos&&DB.photos[p.id]; if(GX&&GX.gal(p).length) return GX.thumb(p,ph);
    return ph?`<span class="pl-thumb"><img src="${esc(ph.thumb||ph.src)}" alt="" loading="lazy" decoding="async" width="40" height="40"></span>`:`<span class="pl-thumb pl-thumb--glyph">${ic(glyphOf(p))}</span>`; };
  const photoHTML=(p,cls,eager)=>{ const ph=p&&DB.photos&&DB.photos[p.id]; if(!ph) return '';
    return `<figure class="${cls}"><img src="${esc(ph.src)}"${srcset(ph)} width="${ph.w||480}" height="${ph.h||320}" alt="" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">
      <figcaption>${ph.page?`<a href="${esc(ph.page)}" target="_blank" rel="noopener">${esc(ph.credit||'Wikimedia Commons')}</a>`:esc(ph.credit==='Travel book'?pt('creditBook'):ph.credit||'')}</figcaption></figure>`; };
  /* a cafe's own line (sig/sigJa) set large on its colour card, like a menu card */
  const colorCard=(p,cls)=>{ const sg=p&&(ja()?p.sigJa||p.sig:p.sig||p.sigJa);
    return `<div class="${cls}${sg?' pl-sigcard':''}"${sg?'':' aria-hidden="true"'}>${sg?`<span class="pl-sigtxt">${esc(sg)}</span>`:''}${ic(p?glyphOf(p):'map','lg')}</div>`; };
  /* day facts once, as icon + figure (docs/DESIGN.md "Stat"); a long drive marks the drive figure */
  const statsHTML=(sc,n)=>{ const bk=bookedCount(sc);
    return STAT(sc.long?'alert':'car',`<span class="sr">${pt('drive',{d:''})}</span>${sc.est?'≈':''}${hmm(sc.drive)}`,sc.long?{cls:'pl-stat--warn',title:pt('longDrive',{d:dur(sc.drive)})}:{})+
      `<span class="pl-stat">${uKm(Math.round(sc.km))}</span>`+STAT('map-pin',`<span aria-hidden="true">${n}</span><span class="sr">${pt('stops',{n})}</span>`)+(bk.b?STAT('ticket',bk.a+'/'+bk.b):''); };
  /* the day's warnings live on their stops (and the end row); the header shows their count */
  const headWarns=sc=>{ const n=sc.rows.reduce((t,r)=>t+r.warns.length,0); return n?BADGE(n,true):''; };
  function startLine(s){
    if(!s.an.buffer) return '';
    const nt=esc(ja()?s.an.noteJa||s.an.note||'':s.an.note||'');
    return `${pt('landed')} ${hm(s.arr)} → ${nt} ${hmm(s.an.buffer)} → ${pt('depart')} <b>${hm(s.dep)}</b>`;
  }
  const anchorBook=r=>{ const p=place(r.id); return p&&p.book?bookBtn(p,esc(nm(p))):''; };
  /* note 29 */
  function emptyHTML(day,sc){ const fr=DB.frames&&DB.frames[day.date], s=sc.rows[0];
    const pm=plannedMap(), pool=DB.list.filter(p=>isCand(p)&&(tierOf(p.id)==='must'||tierOf(p.id)==='want')&&!pm.has(p.id));
    const d=new Map(pool.map(p=>[p.id,SIM.drive(s.id,p.id).min])), top=pool.sort((a,b)=>tierRank(a)-tierRank(b)||d.get(a.id)-d.get(b.id)).slice(0,3);
    const media=fr?`<figure class="pl-empty__photo"><img src="${esc(fr.u.replace('/960px-','/500px-'))}" srcset="${esc(fr.u.replace('/960px-','/500px-'))} 500w, ${esc(fr.u)} 960w" sizes="(min-width:640px) 440px, 100vw" width="${fr.w}" height="${fr.h}" alt="${esc(ja()?fr.altJa||fr.alt:fr.alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"${/upload\.wikimedia/.test(fr.u)?' crossorigin="anonymous"':''}><figcaption><a href="${esc(fr.page)}" target="_blank" rel="noopener">${esc(fr.by)} · ${esc(fr.lic)}</a></figcaption></figure>`:colorCard(null,'pl-empty__photo');
    const sug=top.map(p=>ROW({media:thumb(p),title:`<span${nmLang(p)}>${esc(nm(p))}</span>`,meta:STAT('car',hmm(d.get(p.id))),trail:IBTN('plus',pt('addNTo',{name:nm(p),d:dlabel(day)}),{act:'addhere',id:p.id})})).join('');
    return EMPTY(media,esc(fr?(ja()?fr.regionJa||fr.region:fr.region)+' · ':'')+esc(ja()?day.labelJa:day.label),
      (sug?`${(S.hints||{}).add?'':`<p class="pl-hint pl-hint--coach" role="note">${pt('hint3')}</p>`}<div class="pl-empty__list">${sug}</div>`:BTN('secondary',pt('pickIn1'),{act:'tocollect'}))+BTN('primary',pt('fromCands'),{act:'browse'},'plus')); }
  const tierRank=p=>['must','want','maybe'].indexOf(tierOf(p.id));
  function renderMain(anim){
    const day=DB.days[S.day], sc=schedule(day), rows=sc.rows, n=rows.length-2, P=plan();
    S.sc=sc;
    const s=rows[0], e=rows[rows.length-1], sp=place(s.id), ep=place(e.id), d=+day.date.slice(8), w=wdOf(day.date);
    const hero=heroOf(sc);
    if(!n&&!DB.frames) loadFrames();
    const head=`<header class="pl-dayhead" style="--day:var(--d${S.day%6+1})">
        ${n?`<div class="pl-dayhead__media">${hero?photoHTML(hero,'pl-dayhead__photo',S.stage==='plan'):colorCard(place(rows[1].id),'pl-dayhead__photo')}
          ${IBTN('camera',pt('story'),{act:'story',cls:'pl-dayhead__story'})}</div>`:''}
        <div class="pl-dayhead__row"><span class="pl-dayhead__num" aria-hidden="true">${d}</span><span class="pl-dayhead__wd">${ja()?WDJA[w]+'曜日':WDLONG[w]}</span>
          <span class="pl-dayhead__stats">${statsHTML(sc,n)}${headWarns(sc)}</span></div>
        <h2 class="pl-dayhead__title">${wbr(dayTitle(day,P))}</h2>
      </header>`;
    const anchor=(r,p,k,trail,extra)=>`<div class="pl-anchor pl-anchor--${k}" data-arm>${ROW({media:ic(glyphOf(p)),title:`<span${nmLang(p)}>${wbr(nm(p))}</span>`,meta:extra,trail})}${anchorBook(r)}</div>`;
    const start=anchor(s,sp,'start',`<label class="pl-anchor__time"><span class="sr">${s.an.buffer?pt('landed'):pt('startTime')}</span><span class="pl-anchor__tv" aria-hidden="true">${hm(s.arr)}</span><input name="start" type="time" step="300" value="${hhmm(s.arr)}" data-act="start"></label>`,
      (s.an.buffer?pt('landed'):pt('depart'))+(s.an.buffer?' · '+startLine(s):''));
    const list=rows.slice(1,-1).map((r,k)=>`<li class="pl-stop${S.selStop===r.id?' pl-stop--open':''}" data-id="${r.id}" data-arm>${stopHTML(r,k+1,day)}<div class="pl-leg">${legInner(rows[k+2].leg,rows[k+2])}</div></li>`).join('');
    const end=anchor(e,ep,'end',`<span class="pl-anchor__at">${hm(e.arr)}</span>`,`${pt('arrive')}${e.infos.length?' · '+e.infos.map(x=>infoText(x)).join(' · '):''}<span class="pl-anchor__lim">${endSmall(e)}</span>`);
    const prev=S.day>0, next=S.day<DB.days.length-1;
    main.setAttribute('style',dayStyle(S.day));
    main.innerHTML=head+`<div class="pl-tl">${start}`+
      (n?`<div class="pl-leg pl-leg--first">${legInner(rows[1].leg,rows[1])}</div><ol class="pl-stops">${list}</ol>`
        :`<div class="pl-leg"></div>${emptyHTML(day,sc)}<div class="pl-leg pl-leg--first">${legInner(e.leg,e)}</div>`)+
      `${end}</div>`+(n?BTN('ghost',pt('clearDay'),{act:'clearday',cls:'pl-tl__clear'},'trash'):'')+
      `<nav class="pl-daynav">${prev?BTN('secondary',ic('chevron-left','sm')+pt('prevDay'),{act:'day','data-day':S.day-1}):'<span></span>'}
        ${next?BTN('secondary',pt('nextDay')+ic('chevron-right','sm'),{act:'day','data-day':S.day+1}):'<span></span>'}</nav>`+
      `<p class="pl-foot">${pt('foot')}</p>`;
    if(anim&&!reduced.matches&&main.animate) main.animate([{opacity:0},{opacity:1}],{duration:200,easing:'cubic-bezier(.2,0,0,1)'});
  }
  /* note 30 */
  function patchDay(){
    const day=DB.days[S.day], sc=schedule(day), rows=sc.rows, ol=main.querySelector('.pl-stops');
    const lis=ol?[...ol.children]:[];
    if(lis.length!==rows.length-2||lis.some((li,k)=>li.dataset.id!==rows[k+1].id)){ render(); return; }
    S.sc=sc;
    lis.forEach((li,k)=>{ const r=rows[k+1], body=li.querySelector('.pl-row__body'), wr=body.querySelector('.pl-row__warn');
      li.querySelector('.pl-stop__when').textContent=whenText(r);
      li.querySelector('.pl-stop__sv').textContent=hmm(r.stay);
      body.querySelectorAll('.pl-row__meta .pl-stat--soft').forEach(x=>x.remove()); body.querySelector('.pl-row__meta').insertAdjacentHTML('beforeend',infosHTML(r));
      if(wr) wr.remove(); if(r.warns.length) body.querySelector('.pl-row__meta').insertAdjacentHTML('afterend',`<div class="pl-row__warn">${warnsHTML(r,day)}</div>`);
      li.querySelector('.pl-leg').innerHTML=legInner(rows[k+2].leg,rows[k+2]);
      li.querySelectorAll('[data-act="booked"]').forEach(b=>syncBook(b,r.id)); });
    const l0=main.querySelector('.pl-leg--first'); if(l0) l0.innerHTML=legInner(rows[1].leg,rows[1]);
    const s=rows[0], e=rows[rows.length-1];
    const tv=main.querySelector('.pl-anchor__tv'), ti=main.querySelector('.pl-anchor--start input'); if(tv) tv.textContent=hm(s.arr); if(ti&&document.activeElement!==ti) ti.value=hhmm(s.arr);
    main.querySelectorAll('.pl-anchor [data-act="booked"]').forEach(b=>syncBook(b,b.dataset.id));
    const at=main.querySelector('.pl-anchor__at'); if(at) at.textContent=hm(e.arr);
    const lim=main.querySelector('.pl-anchor__lim'); if(lim) lim.innerHTML=endSmall(e);
    main.querySelector('.pl-dayhead__stats').innerHTML=statsHTML(sc,rows.length-2)+headWarns(sc);
    renderTop(); renderStages();
  }
  function syncBook(b,id){ const on=!!S.booked[id]; b.setAttribute('aria-pressed',on); b.querySelector('use').setAttribute('href','#i-'+(on?'check':'bookmark')); b.querySelector('span').textContent=on?pt('booked'):pt('book'); }
  /* Live times during a drag: text in place only, so the dragged row keeps its pointer. */
  function liveTimes(ids){
    const day=DB.days[S.day], sc=schedule(day,ids), rows=sc.rows, ol=main.querySelector('.pl-stops'); if(!ol) return;
    const by=new Map([...ol.children].map(li=>[li.dataset.id,li]));
    ids.forEach((id,p)=>{ const li=by.get(id), r=rows[p+1]; if(!li||!r) return;
      li.querySelector('.pl-marker').lastChild.textContent=p+1;
      li.querySelector('.pl-stop__when').textContent=whenText(r);
      li.querySelector('.pl-leg').innerHTML=legInner(rows[p+2].leg,rows[p+2]); });
    const l0=main.querySelector('.pl-leg--first'); if(l0) l0.innerHTML=legInner(rows[1].leg,rows[1]);
    const e=rows[rows.length-1], at=main.querySelector('.pl-anchor__at'); if(at) at.textContent=hm(e.arr);
  }
  function focusStop(i){
    const names=main.querySelectorAll('.pl-row__name');
    const t=names[Math.min(i,names.length-1)]||main.querySelector('.pl-empty .pl-btn--primary');
    if(t) t.focus({preventScroll:false});
  }

  /* ---------- map layers (planner-map.js: MapLibre over OpenFreeMap, loaded on first need). The day's stops and
     bases are HTML markers (the pin markup and classes below); candidates, other days' places, the legs and the
     all-days routes are GL sources fed through mapData(). Pins are not focusable. ---------- */
  function routeKey(a,b){ return a+'>'+b; }
  function geom(a,b){
    const k=routeKey(a,b), r=k in DB.routes?DB.routes[k]:k in RC.map?RC.map[k]:null;
    if(r!=null){ const d=decPoly(r); if(d){ if(k in RC.map) touchRoute(k); return {pts:d}; } }
    const k2=routeKey(b,a), r2=k2 in DB.routes?DB.routes[k2]:k2 in RC.map?RC.map[k2]:null;
    if(r2!=null){ const d=decPoly(r2); if(d&&typeof d!=='string') return {pts:d.slice().reverse()}; if(typeof d==='string') return {pts:d}; }
    return null;
  }
  /* stored shapes stay in map units (routes.json, the cache); a tolerated SVG path is read as its points */
  const ptsOf=pts=>{ if(typeof pts!=='string') return pts; const n=(pts.match(/-?[\d.]+/g)||[]).map(Number), o=[]; for(let i=0;i+1<n.length;i+=2) o.push([n[i],n[i+1]]); return o; };
  const ll=xy=>{ const r=unprj(xy[0],xy[1]); return [r[1],r[0]]; };      /* map units -> [lon,lat] */
  /* the road shape between two places as [[lon,lat],…], or null (story.js draws it) */
  function geomLL(a,b){ const g=geom(a,b); return g?ptsOf(g.pts).map(ll):null; }
  /* A leg with no road geometry yet is a gentle arc (sampled), so it never reads as a boat. */
  function arc(p0,p1){
    const dx=p1[0]-p0[0], dy=p1[1]-p0[1], k=0.12, mx=(p0[0]+p1[0])/2-dy*k, my=(p0[1]+p1[1])/2+dx*k, pts=[];
    for(let i=0;i<=16;i++){ const t=i/16, u=1-t; pts.push([u*u*p0[0]+2*u*t*mx+t*t*p1[0], u*u*p0[1]+2*u*t*my+t*t*p1[1]]); }
    return {pts, mid:[(p0[0]+2*mx+p1[0])/4,(p0[1]+2*my+p1[1])/4], len:Math.hypot(dx,dy)};
  }
  function legSegments(sc){
    const segs=[];
    for(let k=1;k<sc.rows.length;k++){ const r=sc.rows[k], l=r.leg, a=sc.rows[k-1].id;
      (l.parts||[{a,b:r.id,kind:'drive'}]).forEach(pp=>{ if(pp.a===pp.b) return; const A=place(pp.a), B=place(pp.b); if(!A||!B) return;
        segs.push({a:pp.a,b:pp.b,kind:pp.kind,p0:prj(A.lat,A.lon),p1:prj(B.lat,B.lon),ll0:[A.lon,A.lat],ll1:[B.lon,B.lat]}); }); }
    return segs;
  }
  const FC=features=>({type:'FeatureCollection',features:features||[]});
  const lineF=(c,properties)=>({type:'Feature',properties,geometry:{type:'LineString',coordinates:c}});
  const pointF=(c,properties)=>({type:'Feature',properties,geometry:{type:'Point',coordinates:c}});
  /* the tokens a GL paint needs, resolved (GL cannot read custom properties); the day hues --d1…--d6 */
  let COL=null;
  function tok(){
    if(COL) return COL;
    const cs=getComputedStyle(view), v=n=>cs.getPropertyValue('--'+n).trim();
    const hex=s=>{ const m=/^#([\da-f]{6})$/i.exec(s); return m?[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)):null; };
    const mix=(a,b,t)=>{ const A=hex(a), B=hex(b); return A&&B?'rgb('+A.map((x,i)=>Math.round(x+(B[i]-x)*t)).join(',')+')':a; };
    COL={d:[1,2,3,4,5,6].map(i=>v('d'+i)), ink:v('ink'), surface:v('surface'), muted:v('muted'), acc:v('acc')};
    COL.want=mix(COL.ink,COL.surface,.45);
    return COL;
  }
  const dayCol=i=>tok().d[i%6];
  /* a schedule's legs as GL lines in one colour (+ the ≈ marks of the ones not road-shaped yet) */
  function legFeatures(sc,color){
    const lines=[], marks=[]; let anyEst=false; const segs=legSegments(sc);
    segs.forEach(s=>{
      if(s.kind==='ferry'){ lines.push(lineF([s.ll0,s.ll1],{kind:'ferry',color})); return; }
      if(s.kind==='walk'){ lines.push(lineF(arc(s.p0,s.p1).pts.map(ll),{kind:'walk',color})); return; }
      const gm=geom(s.a,s.b);
      if(gm){ lines.push(lineF(ptsOf(gm.pts).map(ll),{kind:'road',color})); return; }
      const a=arc(s.p0,s.p1); anyEst=true; lines.push(lineF(a.pts.map(ll),{kind:'est',color}));
      if(a.len>14) marks.push(pointF(ll(a.mid),{text:'≈',color:tok().ink}));
    });
    return {lines,marks,anyEst,segs};
  }
  /* the 6日 board draws every day instead (planner-desk.js allDays), and ① shows no route */
  let ALLD=false;
  function renderLegs(){
    if(!S.sc) return;
    const r=legFeatures(S.sc,dayCol(S.day)), hide=ALLD||S.stage==='collect';
    mapData('legs',FC(hide?[]:r.lines)); mapData('marks',FC(hide?[]:r.marks));
    mapData('alld',ALLD&&S.stage==='plan'&&ALLFC||FC());
    E.estnote.hidden=hide||!r.anyEst||!DB.routesLoaded; E.estnote.textContent=pt('estRoute');
    if(r.anyEst) queueRoutes(r.segs);
  }
  /* the day's pins: HTML markers, rebuilt with the day (a dozen at most) */
  let PINS=[];
  const pinHTML=(cls,id,k,inner)=>`<div class="pl-pin${cls}" data-id="${esc(id)}" data-k="${k}"><svg class="pl-pinsvg" viewBox="-20 -20 40 40" aria-hidden="true"><g class="pl-s">${inner}</g></svg></div>`;
  function setPins(list){
    PINS.forEach(m=>m.remove()); PINS=[];
    if(!EN) return;
    const tmp=document.createElement('div');
    list.forEach(x=>{ tmp.innerHTML=x.html; const el=tmp.firstChild, p=place(x.id); if(p) PINS.push(EN.marker(el,p.lon,p.lat)); });
  }
  function renderMap(){
    if(!S.sc) return;
    const sc=S.sc, planned=plannedMap(), cur=new Set(sc.rows.map(r=>r.id));
    E.mapEl.setAttribute('style',dayStyle(S.day));
    renderLegs();
    const pins=[], seen=new Set();
    sc.rows.forEach(r=>{ if(r.kind==='stop'||seen.has(r.id)) return; seen.add(r.id);
      pins.push({id:r.id,html:pinHTML(' pl-anc',r.id,'anc',`<circle class="pl-hit" r="18"/><circle class="pl-ring" r="15"/><circle class="pl-mk" r="10"/><use href="#i-${glyphOf(place(r.id))}" x="-6.5" y="-6.5" width="13" height="13"/>`)}); });
    for(let k=sc.rows.length-2;k>=1;k--)   /* later stops underneath, so 1 sits on top */
      pins.push({id:sc.rows[k].id,html:pinHTML('',sc.rows[k].id,'stop',`<circle class="pl-hit" r="20"/><circle class="pl-ring" r="16"/><circle class="pl-mk" r="11"/><text class="pl-num">${k}</text>${place(sc.rows[k].id).saved?SVMARK.replace('translate(4 -13)','translate(7 -18)'):''}`)});
    setPins(pins);
    const ot=[];
    planned.forEach((di,id)=>{ if(cur.has(id)) return; const p=place(id); if(!p||!isCand(p)) return;
      ot.push(pointF([p.lon,p.lat],{id,fill:dayCol(di),stroke:tok().surface,r:4.5})); });
    mapData('others',FC(ot));
    syncCands(planned,cur);
    if(S.sel) select(S.sel.id,S.sel.k,true);
  }
  /* note 31: candidates show only while browsing or placing (and on ①), so the day's own pins read first;
     MapLibre clusters them (planner-map.js) */
  let CANDON=false, CANDK='';
  function candProps(p){
    const c=tok(), t=tierOf(p.id);
    if(p.imp) return {id:p.id,fill:c.surface,stroke:c.acc,r:5,sw:2};
    const s={id:p.id,fill:c.surface,stroke:p.saved?c.ink:c.muted,r:4.5,sw:1.6};
    if(t==='must'){ s.fill=c.ink; s.stroke=c.surface; } else if(t==='want') s.fill=c.want;
    if(t==='skip') s.op=.35;
    return s;
  }
  function syncCands(planned,cur,force){
    const on=S.browsing||!!S.placing||S.stage==='collect';
    if(!on){ if(CANDON){ mapData('cands',FC()); CANDON=false; CANDK=''; } return; }
    planned=planned||plannedMap(); cur=cur||new Set();
    const list=DB.list.filter(p=>isCand(p)&&!planned.has(p.id)&&!cur.has(p.id));
    const key=DB.impVer+'|'+list.length+'|'+planned.size+'|'+S.trip.tier;
    if(CANDON&&key===CANDK&&!force) return; CANDON=true; CANDK=key;
    mapData('cands',FC(list.map(p=>pointF([p.lon,p.lat],candProps(p)))));
  }
  function showCands(on){ S.browsing=on; raf(()=>syncCands()); }
  const inSrc=(src,id)=>!!(DATA[src]&&DATA[src].features.some(f=>f.properties.id===id));
  /* Selection toggles one class (a pin) or one feature state (a candidate) and moves the one shared label;
     it never rebuilds pins. */
  function select(id,k,quiet){
    const prev=E.mapEl.querySelector('.pl-pin.pl-sel'); if(prev) prev.classList.remove('pl-sel');
    if(LAB) LAB.el.hidden=true; if(EN) EN.select(null); S.sel=null;
    if(!id) return;
    const p=place(id); if(!p) return;
    const q=`.pl-pin[data-id="${CSS.escape(id)}"]`, pin=E.mapEl.querySelector(q+`[data-k="${k}"]`)||E.mapEl.querySelector(q);
    const gl=!pin&&(inSrc('cands',id)||inSrc('others',id));
    if(!pin&&!gl&&EN) return;
    S.sel={id,k};
    if(pin) pin.classList.add('pl-sel'); else if(EN) EN.select(id);
    if(EN&&LAB){ const xy=EN.project(p.lon,p.lat), t=LAB.el.firstChild, small=!pin;
      t.textContent=nm(p); t.className='pl-lab'+(xy[0]>E.mapEl.clientWidth*0.62?' pl-lab--r':'')+(small?' pl-lab--sm':'');
      LAB.set(p.lon,p.lat); LAB.el.hidden=false; }
    if(!quiet) ensureVisible(id);
  }

  /* ---------- road geometry (note 32) ---------- */
  const RQ={q:[],busy:false,dead:0};
  function touchRoute(k){ const i=RC.order.indexOf(k); if(i>=0&&i<RC.order.length-1){ RC.order.splice(i,1); RC.order.push(k); } }
  function queueRoutes(segs){
    segs.forEach(s=>{ if(s.kind!=='drive') return; const k=routeKey(s.a,s.b);
      if(!geom(s.a,s.b)&&RQ.q.indexOf(k)<0) RQ.q.push(k); });
    pumpRoutes();
  }
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

  /* note 6 in docs/FOLD.md "Core notes": the map is MapLibre's camera (planner-map.js). The engine starts once the
     map has a size; until then every layer's data waits in DATA and is handed over on start. */
  let EN=null, ENP=null, LAB=null, needFit=false;
  const DATA={};
  function mapData(src,fc){ DATA[src]=fc||FC(); if(EN) EN.setData(src,DATA[src]); }
  const libMap=()=>window.plmap?Promise.resolve(window.plmap):new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src=view.dataset.mapSrc||'planner-map.js'; s.onload=()=>window.plmap?res(window.plmap):rej(new Error('plmap')); s.onerror=rej; document.head.appendChild(s); });
  function startMap(){
    if(EN||ENP) return ENP;
    mapNote('loading');
    ENP=libMap().then(m=>m.create(E.mapEl,{lang:lang(),onClick:mapClick,onMove:()=>setTimeout(afterUI,0),onMode:mapNote})).then(en=>{
      EN=en; const d=document.createElement('div'); d.className='pl-labm'; d.hidden=true; d.innerHTML='<span class="pl-lab"></span>'; LAB=EN.marker(d,174.76,-36.85);
      Object.keys(DATA).forEach(k=>EN.setData(k,DATA[k])); renderMap(); fitDay(true); return en;
    },err=>{ ENP=null; console.error(err); mapNote('failed'); return null; });
    return ENP;
  }
  /* what the map shows: loading, ready, offline (no basemap tile came), lost (iOS took the WebGL context), failed */
  function mapNote(m){
    E.card.dataset.mode=m; const n=E.mapnote;
    if(m==='failed'){ n.hidden=false; n.innerHTML=`<span>${esc(pt('mapFail'))}</span><button type="button" class="pl-btn pl-btn--secondary" data-act="mapretry">${esc(pt('mapRetry'))}</button>`; }
    else if(m==='offline'||m==='lost'){ n.hidden=false; n.innerHTML=`<span>${esc(pt(m==='lost'?'mapLost':'mapOffline'))}</span>`; }
    else n.hidden=true;
  }
  function fitDay(instant,only){
    if(!EN||S.map==='closed'||!S.sc){ needFit=true; return; }
    needFit=false;
    const ps=(only||(view.classList.contains('pl-6')?DB.days.flatMap(d=>schedule(d).rows):S.sc.rows)).map(r=>place(r.id)).filter(Boolean);   /* the board fits every day */
    if(!ps.length) return;
    const lo=ps.map(p=>p.lon), la=ps.map(p=>p.lat), w=E.mapEl.clientWidth, h=E.mapEl.clientHeight;
    /* clear of the zoom buttons (right) and the map footer (bottom), shrunk on a small map */
    const k=Math.min(1,w/360,h/220), pad={top:44*k,right:62*k,bottom:76*k,left:24*k};
    /* a map taller than the window (the wide layout's card runs to 100vh from where it starts): fit in the part on screen */
    const r=E.mapEl.getBoundingClientRect(), off=Math.max(0,r.bottom-innerHeight);
    if(off>0&&h-off>=160) pad.bottom+=off;
    EN.fit([[Math.min(...lo),Math.min(...la)],[Math.max(...lo),Math.max(...la)]],{padding:pad,instant:instant===true,oneZoom:10.5,maxZoom:14});
  }
  function ensureVisible(id){ const p=place(id); if(!EN||!p) return; const [x,y]=EN.project(p.lon,p.lat), w=E.mapEl.clientWidth, h=E.mapEl.clientHeight, m=Math.min(w,h)*0.12;
    if(x<m||x>w-m||y<m||y>h-m) EN.ease(p.lon,p.lat); }
  /* a client point as [lat,lon] (placing an import) */
  function toLL(x,y){ if(!EN) return null; const r=E.mapEl.getBoundingClientRect(); return EN.unproject(x-r.left,y-r.top); }
  /* a tap on the map's GL layers (candidates, other days' places) or on nothing; a pin's tap is the marker listener's */
  function mapClick(h){
    if(h.target&&h.target.closest&&h.target.closest('.pl-pin,.pl-labm')) return;
    if(S.placing){ const r=E.mapEl.getBoundingClientRect(); placeAt(r.left+h.x,r.top+h.y); return; }
    if(!h.id){ select(null); return; }
    select(h.id,h.kind,true); openPlace(h.id);
  }
  /* the 6日 board: every day's route at once (planner-desk.js), one day's lit while its lane is hovered */
  let ALLFC=null;
  function setAllDays(on,fc){ ALLD=on; ALLFC=on?fc:null; renderLegs(); }
  function dimDays(k){ if(EN) EN.map.setPaintProperty('alld','line-opacity',k>=0?['case',['==',['get','day'],k],.85,.15]:.55); }
  const busyUI=()=>!!(DRAG||(EN&&EN.moving()));
  function afterUI(){ if(busyUI()) return; if(RQ.redraw){ RQ.redraw=false; renderLegs(); } setTimeout(pumpRoutes,300); }
  function wireMap(){
    let pd=null;
    E.mapEl.addEventListener('pointerdown',e=>{ pd=[e.clientX,e.clientY]; },true);
    E.mapEl.addEventListener('click',e=>{
      const pin=e.target.closest('.pl-pin'); if(!pin) return;
      if(pd&&Math.hypot(e.clientX-pd[0],e.clientY-pd[1])>6) return;      /* a pan of the map is not a tap */
      if(S.placing){ placeAt(e.clientX,e.clientY); return; }
      const id=pin.dataset.id, k=pin.dataset.k;
      select(id,k,true);
      if(k==='stop'){ const card=main.querySelector(`.pl-stop[data-id="${CSS.escape(id)}"]`);
        if(card){ card.scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'}); flash(card); } }
      else if(k!=='anc') openPlace(id);
    });
    E.mapnote.addEventListener('click',e=>{ if(e.target.closest('[data-act="mapretry"]')) startMap(); });
    view.querySelector('.pl-mapctl').addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      if(b.dataset.zoom==='full'){ setFull(S.map!=='full'); return; }
      if(!EN) return;
      if(b.dataset.zoom==='fit') fitDay();
      else EN.zoomBy(b.dataset.zoom==='in'?1.7:1/1.7);
    });
    /* the engine starts once the map has a size (a phone's ① keeps it hidden); MapLibre follows its own resizes */
    if(window.ResizeObserver) new ResizeObserver(es=>{ const c=es[es.length-1].contentRect; if(c.width>=40&&c.height>=40){ if(!EN&&!ENP) idle(startMap,1500); else if(needFit) fitDay(true); } }).observe(E.mapEl);
    else startMap();
    E.toggle.addEventListener('click',()=>{ S.map=S.map==='closed'?'peek':'closed'; saveUI(); mapState(); if(S.map!=='closed') setTimeout(()=>fitDay(),380); });
    /* the sticky map shrinks to a strip once the list scrolls under it */
    if(window.IntersectionObserver){ const sen=document.createElement('div'); sen.className='pl-sentinel'; E.notice.before(sen);
      new IntersectionObserver(es=>{ E.stick.classList.toggle('pl-scrolled',!es[0].isIntersecting&&es[0].boundingClientRect.top<0); }).observe(sen); }
  }
  function setFull(on){
    if(on===(S.map==='full')) return;
    S.map=on?'full':'peek'; mapState(); setTimeout(()=>fitDay(),380);
    if(on){ try{ history.pushState({plFull:slug},''); }catch(e){} }
    else if(history.state&&history.state.plFull===slug){ try{ backing=true; history.back(); }catch(e){ backing=false; } }
  }
  function mapState(){
    E.card.classList.toggle('pl-closed',S.map==='closed'); E.card.classList.toggle('pl-full',S.map==='full');
    E.toggle.setAttribute('aria-expanded',S.map!=='closed');
    E.toggle.querySelector('span').textContent=pt(S.map==='closed'?'mapShow':'mapHide');
    const fb=view.querySelector('[data-zoom="full"]'); fb.querySelector('use').setAttribute('href','#i-'+(S.map==='full'?'minimize':'maximize'));
    fb.querySelector('.sr').textContent=pt(S.map==='full'?'shrink':'expand');
  }
  /* a brief opacity pulse (transform and opacity only, docs/DESIGN.md "Motion") */
  function flash(el){ if(el.animate&&!reduced.matches) el.animate([{opacity:.4},{opacity:1}],{duration:280,easing:'cubic-bezier(.2,0,0,1)'}); }

  /* note 7 in docs/FOLD.md "Core notes" */
  let suppressClick=false;
  function wireDrag(){
    main.addEventListener('pointerdown',e=>{
      const h=e.target.closest('[data-act="order"]'); if(!h||e.button>0||DRAG) return;
      const ol=main.querySelector('.pl-stops'); if(!ol) return;
      const rows=[...ol.children]; if(rows.length<2) return;
      const row=h.closest('.pl-stop'), from=rows.indexOf(row), date=DB.days[S.day].date, ids=idsOf(date);
      const D={from,to:from,y0:e.clientY,s0:scrollY,y:e.clientY,raf:0,on:false,id:e.pointerId,rects:null,h:0,top:0};
      const order=()=>{ const o=ids.slice(); o.splice(D.to,0,o.splice(D.from,1)[0]); return o; };
      const begin=()=>{
        D.on=true; D.rects=rows.map(r=>r.getBoundingClientRect()); D.h=D.rects[from].height; D.top=E.stick.getBoundingClientRect().bottom;
        ol.classList.add('is-sorting'); row.classList.add('is-lifted'); row.style.willChange='transform'; view.classList.add('is-dragging');
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
        cancelAnimationFrame(D.raf); view.classList.remove('is-dragging'); ol.classList.remove('is-sorting'); row.classList.remove('is-lifted'); row.style.willChange='';
        rows.forEach(r=>{ r.style.transform=''; }); DRAG=null;
        setTimeout(afterUI,0);
      };
      const up=ev=>{ if(ev&&ev.pointerId!=null&&ev.pointerId!==D.id||!DRAG) return;
        const was=D.on, a=D.from, b=D.to; cleanup();
        if(was){ suppressClick=true; setTimeout(()=>{ suppressClick=false; },400); }
        if(was&&a!==b){ const id=ids[a]; guard(row,'ord',m=>{ const l=m.days[date]; const i=l.indexOf(id); if(i<0) throw new Error('gone'); l.splice(i,1); l.splice(b,0,id); },pt('reordered'),{focus:b}); }
        else if(PENDING) render(); else if(DIRTY.size) dirty();
      };
      const cancel=()=>{ if(!DRAG) return; cleanup(); render(); };
      DRAG={cancel};
      try{ h.setPointerCapture(e.pointerId); }catch(x){}
      addEventListener('pointermove',move,{passive:false}); addEventListener('pointerup',up); addEventListener('pointercancel',cancel); h.addEventListener('lostpointercapture',up);
    });
    /* hardware keys: the same move */
    main.addEventListener('keydown',e=>{
      const h=e.target.closest('[data-act="order"]'); if(!h||(e.key!=='ArrowUp'&&e.key!=='ArrowDown')) return;
      e.preventDefault(); reorder(h.dataset.id,e.key==='ArrowUp'?-1:1,true);
    });
  }
  function reorder(id,delta,keepFocus,to,el){
    const date=DB.days[S.day].date, ids=idsOf(date), i=ids.indexOf(id); if(i<0) return;
    const j=to!=null?to:i+delta; if(j<0||j>=ids.length||j===i) return;
    if(!guard(el||document.activeElement,'ord'+id+j,m=>{ const l=m.days[date], k=l.indexOf(id); l.splice(k,1); l.splice(j,0,id); },pt('reordered'))) return false;
    if(keepFocus) afterRender(()=>{ const nh=main.querySelector(`[data-act="order"][data-id="${id}"]`); if(nh) nh.focus(); });
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
        /* a tap on a stop selects it: its action row opens, one stop at a time */
        case 'sel': { const li=b.closest('.pl-stop'), on=S.selStop!==id; S.selStop=on?id:null;
          main.querySelectorAll('.pl-stop--open').forEach(x=>x.classList.remove('pl-stop--open')); if(on) li.classList.add('pl-stop--open'); break; }
        case 'addhere': needMore().then(m=>m.applyAdd(S.day,[id],null)); break;
        case 'tocollect': setStage('collect'); break;
        case 'order': if(suppressClick) break; openOrder(id); break;
        case 'swap': openSwap(id); break;
        case 'move': needMore().then(x=>x.openMove(id)); break;
        case 'del': { const i=idsOf(date).indexOf(id); if(i<0) break; edit(m=>{ const l=m.days[date]; l.splice(l.indexOf(id),1); },pt('removed',{name:nm(p)}),{focus:i});
          afterRender(()=>{ const u=E.toast.querySelector('button'); if(u) u.focus({preventScroll:true}); }); break; }
        case 'open': openPlace(id); break;
        case 'focus': select(id,'stop'); if(S.map==='closed'){ S.map='peek'; saveUI(); mapState(); } break;
        case 'browse': openBrowse(); break;
        case 'day': setDay(+b.dataset.day); break;
        case 'story': needMore().then(x=>x.openStory()); break;
        case 'booked': toggleBooked(id,b); break;
        case 'note': { const ed=b.closest('.pl-stop').querySelector('.pl-stop__noteed'), open=ed.hidden; ed.hidden=!open; b.setAttribute('aria-expanded',open);
          S.noteOpen=open?id:null; if(open) ed.querySelector('textarea').focus(); break; }
        case 'notesave': saveNote(id,b.closest('.pl-stop__noteed').querySelector('textarea').value); break;
        case 'clearday': { const n=idsOf(date).length; if(!n) break; edit(m=>{ m.days[date]=[]; },pt('cleared',{d:dlabel(day)})); afterRender(()=>focusStop(0)); break; }
      }
    });
    main.addEventListener('change',e=>{
      const t=e.target; if(t.dataset.act!=='start'||!okHM((t.value||'').slice(0,5))) return;
      const date=DB.days[S.day].date, v=t.value.slice(0,5);
      guard(t,'start',m=>{ m.start[date]=v; },pt('startTime')+' '+v,{quick:true});
    });
    /* an unsaved note survives any re-render */
    main.addEventListener('input',e=>{ const t=e.target; if(t.tagName==='TEXTAREA'&&t.dataset.id){ S.drafts[t.dataset.id]=t.value; S.noteOpen=t.dataset.id; } });
  }
  function saveNote(id,v){
    v=String(v||'').trim().slice(0,300); const P=plan(), cur=noteText(P,id), raw=(P.notes||{})[id]||'';
    S.noteOpen=null; delete S.drafts[id];
    const done=()=>{ const ed=main.querySelector(`#pl-ne-${slug}-${id}`); if(ed) ed.hidden=true; const nb=main.querySelector(`[data-act="note"][data-id="${id}"]`); if(nb){ nb.setAttribute('aria-expanded','false'); nb.focus({preventScroll:true}); } };
    if(v===cur||v===raw){ done(); return; }
    editTrip(t=>{ if(v) t.notes[id]=v; else delete t.notes[id]; },pt('note')+' ✓');
    done();
  }
  function toggleBooked(id,btn){
    pushHist(); const nb=Object.assign({},S.booked); if(nb[id]) delete nb[id]; else nb[id]=true; S.booked=nb; save();
    if(btn) syncBook(btn,id);
    if(sheetKind) return;
    patchDay(); const t=main.querySelector(`[data-act="booked"][data-id="${id}"]`); if(t&&document.activeElement!==t) t.focus({preventScroll:true});
  }

  /* ---------- rendering cadence ---------- */
  let soon=0, after=[];
  function renderSoon(){ if(soon) return; soon=raf(()=>{ soon=0; render(); }); }
  /* note 34 */
  const DIRTY=new Set(); let dq=0;
  function dirty(...rs){ rs.forEach(r=>r&&DIRTY.add(r)); if(!dq&&!soon) dq=raf(flushDirty); }
  function flushDirty(){ dq=0; if(DRAG||S.ddrag) return;   /* a drag keeps its DOM and its measured zones: dragDone() flushes */ if(soon){ DIRTY.clear(); return; }
    const d=new Set(DIRTY); DIRTY.clear(); rebuildPlaces();
    if(d.has('top')) renderTop(); if(d.has('days')) renderDays();
    if(d.has('main')) renderMain(); if(d.has('map')) renderMap(); else if(d.has('cands')) syncCands(null,null,true);
    if(d.has('stages')) renderStages();
    if(d.has('collect')&&S.stage==='collect'&&CM) CM.render(); if(d.has('review')&&S.stage==='review'&&MM) MM.renderReview(E.review);
    if(d.has('desk')&&DK) DK.render(); if(SY) SY.decor();
    const f=after; after=[]; f.forEach(x=>x()); }
  function afterRender(f){ after.push(f); }
  function dragDone(){ S.ddrag=false; if(PENDING){ PENDING=false; render(); } else if(DIRTY.size) dirty(); }
  /* The focused control, as a selector, so a re-render can put focus back where it was. */
  function focusKey(){ const a=document.activeElement; if(!a||!main.contains(a)) return null;
    const b=a.closest('[data-act]'); if(!b) return null;
    return `[data-act="${b.dataset.act}"]`+(b.dataset.id?`[data-id="${b.dataset.id}"]`:'')+(b.dataset.d?`[data-d="${b.dataset.d}"]`:'')+(b.dataset.day?`[data-day="${b.dataset.day}"]`:''); }
  function render(anim){
    if(DRAG||S.ddrag){ PENDING=true; return; }          /* a drag in progress keeps its DOM */
    PENDING=false; cancelAnimationFrame(soon); soon=0;
    const fk=focusKey(), ta=document.activeElement&&document.activeElement.tagName==='TEXTAREA'?document.activeElement:null, sel=ta?[ta.selectionStart,ta.selectionEnd]:null;
    rebuildPlaces(); renderTop(); renderDays(); renderMain(anim); renderMap(); renderStages();
    if(S.stage==='collect'&&CM) CM.render(); else if(S.stage==='review'&&MM) MM.renderReview(E.review);
    if(DK) DK.render();
    if(SY) SY.decor();
    if(fk&&!main.contains(document.activeElement)){ const t=main.querySelector(fk); if(t) t.focus({preventScroll:true}); }
    if(ta&&S.noteOpen){ const t=main.querySelector(`#pl-ne-${slug}-${S.noteOpen} textarea`); if(t){ t.focus({preventScroll:true}); try{ t.setSelectionRange(sel[0],sel[1]); }catch(e){} } }
    const f=after; after=[]; f.forEach(x=>x());
  }

  /* ---------- sheets (note 35) ---------- */
  let sheetKind=null, sheetArg=null, lastFocus=null, closeT=0;
  /* note 36 */
  const OURS=/^#(collect|review|plan(\/\d+)?|place=[\w.-]+)?$/; let backing=false;
  const urlNow=()=>S.stage==='collect'?'#collect':S.stage==='review'?'#review':'#plan/'+(+DB.days[S.day].date.slice(8));
  function syncURL(){ if(!OURS.test(location.hash||"#")) return; const h=sheetKind==='place'?'#place='+sheetArg.id:urlNow();
    if(location.hash!==h) try{ history.replaceState(history.state,'',h); }catch(e){} }
  function openSheet(html,kind,arg,tall){
    clearTimeout(closeT);
    const fresh=!(history.state&&history.state.plSheet===slug);
    sheetKind=kind; sheetArg=arg||{};
    E.sheet.setAttribute('style',dayStyle(S.day)); E.sheet.lang=lang();
    E.sbody.innerHTML=html; E.sbody.scrollTop=0;
    E.sheet.classList.toggle('pl-sheet--tall',!!tall); hideToast();
    E.sheet.inert=false; view.inert=true;
    showCands(kind==='browse'||kind==='place'||kind==='import');
    if(E.sheet.hidden){
      lastFocus=document.activeElement; E.sheet.hidden=false; E.scrim.hidden=false;
      raf(()=>raf(()=>{ E.sheet.classList.add('is-open'); E.scrim.classList.add('is-open'); }));
    }
    E.sheet.style.transform='';
    E.sheet.focus({preventScroll:true});
    if(fresh&&OURS.test(location.hash||"#")) try{ history.pushState({plSheet:slug},''); }catch(e){}
    syncURL();
  }
  function closeSheet(focusEl){
    if(E.sheet.hidden||E.sheet.inert) return;
    E.sheet.inert=true; view.inert=false; sheetKind=null; sheetArg=null; S.ip=null; showCands(false);
    E.sheet.classList.remove('is-open'); E.scrim.classList.remove('is-open'); E.sheet.style.transform='';
    closeT=setTimeout(()=>{ if(!E.sheet.classList.contains('is-open')){ E.sheet.hidden=true; E.scrim.hidden=true; } },reduced.matches?0:360);
    const t=focusEl||lastFocus; if(t&&t.focus&&t.isConnected) t.focus({preventScroll:true});
    /* a sheet closed by its own controls takes its history entry with it, unless another opens in the same task */
    setTimeout(()=>{ if(!sheetKind&&history.state&&history.state.plSheet===slug){ backing=true; history.back(); } else syncURL(); },0);
  }
  function refreshSheet(){
    if(sheetKind==='browse') openBrowse(true);
    else if(sheetKind==='place') openPlace(sheetArg.id,sheetArg.back);
    else if(sheetKind==='plans') openPlans();
    else if(sheetKind==='import') { const h=E.sbody.querySelector('.pl-sh-h'); if(h) h.outerHTML=head(pt('impT'),pt('impS')); renderImport(); }
    else if(sheetKind) closeSheet();
  }
  /* sheet chrome: [title · ×] on one line; the × only (no 完了 duplicate); an optional foot with one primary */
  const closeBtn=()=>IBTN('x',pt('close'),{act:'close',cls:'pl-sheet__close'});
  const head=(t,s)=>`<div class="pl-sheet__head"><h2 class="pl-sheet__title" id="pl-sht-${slug}">${t}</h2>${closeBtn()}</div>${s?`<p class="pl-sheet__sub">${s}</p>`:''}`;
  const doneBar=()=>'';
  const foot=h=>`<div class="pl-sheet__foot">${h}</div>`;


  /* Adding inserts at the cheapest slot where the place is open (SIM.bestPos). */
  const closure=p=>(p.flags||[]).some(f=>/^(track-closed|partial-closure|partial-track-closures|loop-closed)/.test(f));
  /* An add, simulated first (SIM.insertPlan); c is a grouping or null. */
  const addIds=(c,id)=>{ const planned=plannedMap(); return (c?c.ids:[id]).filter(x=>DB.places.has(x)&&!planned.has(x)); };
  const clusterOf=id=>id==='_imp'?{id,ids:DB.list.filter(p=>p.imp).map(p=>p.id)}:id==='_sel'?S.selc:id.startsWith('g-')?S.trip.groups.find(x=>x.id===id):DB.clusters.find(x=>x.id===id);
  /* a break in words: whose, and what */
  function breakText(b,day){ const who=b.kind==='stop'?nm(place(b.id))+'：':''; return who+warnText(b.w,day); }
  /* note 37 */
  /* saved:true = the traveller saved it in her own Google Maps list, the strongest signal we have */
  /* a cafe's signature item ("サワードウ") as a small line on list rows */
  function sigLine(p){ const t=p&&(ja()?p.sigJa||p.sig:p.sig||p.sigJa); return t?`<small class="pl-sigl">${esc(t)}</small>`:''; }
  function savedTag(p){ return p&&p.saved?`<span class="pl-saved" title="${esc(pt('savedS'))}">${ic('bookmark','xs')}<span class="sr">${pt('saved')}</span></span>`:''; }
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
    /* note 38 */
    E.scrim.addEventListener('click',e=>{
      const hit=[...E.days.querySelectorAll('[data-day]')].find(b=>{ const r=b.getBoundingClientRect(); return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom; });
      if(hit){ const k=+hit.dataset.day, kind=sheetKind; if(kind==='browse'){ setDay(k,true); openBrowse(true); return; } closeSheet(); setDay(k); return; }
      closeSheet();
    });
    document.addEventListener('keydown',e=>{
      if(ARMD&&(e.key==='Enter'||e.key==='Escape')){ e.preventDefault(); disarm(e.key==='Enter'); return; }
      if(e.key==='Escape'){ if(sheetKind) closeSheet(); else if(S.placing) stopPlacing(); else if(S.map==='full') setFull(false); return; }
      if(e.key==='Tab'&&sheetKind){ const f=[...E.sheet.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select,textarea,summary,[tabindex="0"]')].filter(x=>x.offsetParent!==null);
        if(!f.length) return; const a=f[0], z=f[f.length-1];
        if(e.shiftKey&&(document.activeElement===a||document.activeElement===E.sheet)){ e.preventDefault(); z.focus(); }
        else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } }
    });
    wireSwipe();
    E.sbody.addEventListener('change',e=>{ const t=e.target;
      if((t.type==='file'&&t.files&&t.files.length)||t.classList.contains('pl-ck')||t.classList.contains('pl-choice')){ needImp().then(u=>u.change(t)); return; } });
    E.sbody.addEventListener('input',e=>{ if(e.target.classList.contains('pl-vname')) needMore().then(m=>m.nameState()); });
    E.sbody.addEventListener('change',e=>{ const t=e.target; if(!t.classList.contains('pl-dayendin')||!okHM((t.value||'').slice(0,5))) return;
      S.dayEnd=toMin(t.value.slice(0,5)); saveUI(); render(); });
    E.sbody.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      if(e.target.closest('.pl-nom')){ e.preventDefault(); const b=e.target.closest('.pl-trow').querySelector('[data-act="nomgo"]'); b&&b.click(); return; }
      if(e.target.classList.contains('pl-cgname')){ e.preventDefault(); const b=E.sbody.querySelector('[data-act="cgnew"],[data-act="cgren"]'); if(b) b.click(); return; }
      if(e.target.classList.contains('pl-vname')){ e.preventDefault(); const id=sheetArg&&sheetArg.id; needMore().then(m=>m.saveVersionNamed(id,e.target.value)); }
      if(e.target.classList.contains('pl-paste')){ e.preventDefault(); needMore().then(m=>m.click('pastego',e.target,sheetKind,sheetArg)); }
    });
    let qf=0;
    /* typing in 候補: store the query now, re-filter after ~100 ms of quiet (perf rule 7) */
    E.sbody.addEventListener('input',e=>{ if(!e.target.classList.contains('pl-q')) return; S.f.q=e.target.value; clearTimeout(qf); qf=setTimeout(renderList,100); });
    E.sbody.addEventListener('click',e=>{
      const b=e.target.closest('[data-act]'); if(!b||E.sheet.inert) return;
      const day=DB.days[S.day], date=day.date, kind=sheetKind, arg=sheetArg||{};
      if(/^(gmgo|imcancel|imgo|imcoll|imcc|imreg|imall|placeon|nomopen|nomgo|nomset|impdelall)$/.test(b.dataset.act)){ needImp().then(u=>u.click(b.dataset.act,b)); return; }
      switch(b.dataset.act){
        case 'close': closeSheet(); break;
        case 'import': S.ip=null; openImport(); break;
        case 'impdel': { const id=b.dataset.id; pushHist(); S.imports=S.imports.filter(m=>m.id!==id); impChanged();
          if(kind==='place') closeSheet(); else renderImport(); toast(pt('impDeleted'),undo); break; }
        case 'booked': toggleBooked(b.dataset.id,b); break;
        default: if(MM) MM.click(b.dataset.act,b,kind,arg); else needMore().then(m=>m.click(b.dataset.act,b,kind,arg));
      }
    });
  }

  /* ---------- import (note 39) ---------- */
  let IMPUI=null;
  function needImp(){
    if(IMPUI) return IMPUI;
    /* its stylesheet loads alongside; a failed sheet still lets the import run, unstyled */
    IMPUI=Promise.all([needMore(),loadCss('pl-imp',view.dataset.importCss||'planner-import.css'),(window.plimport?Promise.resolve():loadJs(view.dataset.importSrc||'import.js'))
      .then(()=>window.plimport.ui?0:loadJs(view.dataset.importUiSrc||'planner-import.js'))])
      .then(()=>window.plimport.ui(ctx()));
    IMPUI.catch(()=>{ IMPUI=null; });
    return IMPUI;
  }
  const trayN=()=>S.imports.filter(m=>m.lat==null&&!m.placeId).length;
  function openImport(){
    openSheet(head(pt('impT'),pt('impS'))+`<div class="pl-impbody"><p class="pl-hint">${pt('reading')}</p></div>`,'import',null,true);
    needImp().then(u=>u.render(),()=>{ const b=E.sbody.querySelector('.pl-impbody'); if(b) b.innerHTML=`<p class="pl-hint">${pt('loadFail')}</p>`; });
  }
  const renderImport=()=>{ if(IMPUI) IMPUI.then(u=>u.render()); };
  function stopPlacing(){ S.placing=null; showCands(false); E.card.classList.remove('pl-placemode'); const b=E.card.querySelector('.pl-placing'); if(b) b.remove(); }
  const placeAt=(x,y)=>{ needImp().then(u=>u.placeAt(x,y)); };

  /* ---------- toast: 44 px undo, held 10 s, and kept while focused or touched ---------- */
  let toastT=0, toastHold=false;
  function toast(msg,action,extra){
    /* one line, a result or 元に戻す (docs/DESIGN.md "Toast"); extra is one follow-up such as 「一覧」 */
    E.toast.innerHTML=`<span class="pl-toast__text">${esc(msg)}</span>`+(extra?BTN('ghost',esc(extra.label),{act:'tx'}):'')+(action?BTN('ghost',pt('undo'),{act:'tu'}):'');
    if(action) E.toast.querySelector('[data-act="tu"]').onclick=()=>{ hideToast(); action(); };
    if(extra) E.toast.querySelector('[data-act="tx"]').onclick=()=>{ hideToast(); extra.fn(); };
    E.toast.classList.add('is-open'); armToast(action?10000:3000);
  }
  function armToast(ms){ clearTimeout(toastT); E.toast._ms=ms; toastT=setTimeout(()=>{ if(!toastHold) hideToast(); },ms); }
  function hideToast(){ clearTimeout(toastT); E.toast.classList.remove('is-open'); }
  ['focusin','pointerenter'].forEach(t=>E.toast.addEventListener(t,()=>{ toastHold=true; clearTimeout(toastT); }));
  ['focusout','pointerleave'].forEach(t=>E.toast.addEventListener(t,()=>{ toastHold=false; if(E.toast.classList.contains('is-open')) armToast(4000); }));

  /* ---------- share: a link adds a version, it never overwrites ---------- */
  /* ---------- the less-used sheets live in planner-more.js, loaded on first use ---------- */
  let MOREP=null;
  /* a stylesheet once per name; a failed one still resolves, so the sheet opens unstyled rather than never */
  const loadCss=(k,href)=>document.querySelector(`link[data-pl="${k}"]`)?Promise.resolve():new Promise(res=>{ const l=document.createElement('link');
    l.rel='stylesheet'; l.href=href; l.dataset.pl=k; l.onload=l.onerror=res; document.head.appendChild(l); });
  const loadJs=src=>new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src=src; sc.onload=res; sc.onerror=rej; document.head.appendChild(sc); });
  function needMore(quiet){
    if(MOREP) return MOREP;
    /* its stylesheet comes with it, so a sheet never paints unstyled */
    MOREP=Promise.all([loadCss('pl-more',view.dataset.moreCss||'planner-more.css'),planner.more?0:loadJs(view.dataset.moreSrc||'planner-more.js'),loadGroups()]).then(()=>(MM=planner.more(ctx())));
    MOREP.catch(()=>{ MOREP=null; if(!quiet) toast(pt('loadFail')); });
    return MOREP;
  }
  function ctx(){ return {home:ST.home,saveNow,dirty,dragDone,S,DB,E,view,svg,slug,SRC,pt,esc,ic,head,doneBar,openSheet,closeSheet,toast,undo,pushHist,save,render,edit,plan,findPlan,planName,presetName,
    idsOf,schedule,dayStyle,dlabel,dayTitle,dur,hm,nm,nmLang,wbr,place,bodyOf,snapshot,renderTop,fitDay,isCand,plannedMap,FAMILY,thumb,tr,CAT,AREA,
    unverifiedHours,reorder,focusStop,afterRender,okHM,clone,switchToMe,hav,mapState,saveUI,select,unprj,ja,showCands,stopPlacing,impChanged,
    savedTag,sigLine,titleT,flagT,warnText,breakText,guard,arm,disarm,trial,breakLine,BTN,IBTN,CHIP,SEG,FIELD,ROW,BADGE,STAT,EMPTY,hmm,foot,legSegments,geom,geomLL,legFeatures,dayCol,mapData,setAllDays,dimDays,toLL,syncCands,arc,g,main,heroOf,thumb,glyphOf,ic,col:()=>CM,gal:p=>GX?GX.gal(p):[],gx:()=>GX,loadGallery,sync:()=>SY,loadSync,toggleBooked,setDay,tierOf,seeded,skipSet,cover,editTrip,setStage,warnCount,openPlace,needMore,loadCss,loadJs,hoursText,photoHTML,colorCard,closeBtn,alt,altLang,latin,bestText,domain,hhmm,arg:()=>sheetArg,addIds,clusterOf,closure,wdName,GLYPH,fold,flagsOf,FLAG,eqKm,uKm,trayN,lang,loadMore:()=>loadMore(),rebuild:()=>rebuildPlaces(),sim:()=>SIM,frame:{LAT0,LAT1,LON0,LON1},kind:()=>sheetKind,addStrings:(o,soft)=>Object.keys(o).forEach(k=>{ if(!soft||!PT[k]) PT[k]=o[k]; })}; }
  const openOrder=id=>needMore().then(m=>m.openOrder(id));
  const openSwap=id=>needMore().then(m=>m.openSwap(id));
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

  /* ---------- notices: storage failure, LINE, Home Screen (as list rows); onboarding is the three coach marks ---------- */
  function renderNotice(){
    if(!DB) return;
    const ua=navigator.userAgent, isLine=/\bLine\//i.test(ua), ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    let h='';
    if(S.saveFail) h+=ROW({media:ic('alert'),title:pt('saveFail'),trail:BTN('secondary',pt('purgeAuto'),{act:'purge'})},{role:'alert',cls:'pl-row--warn'});
    if(isLine){ const u=new URL(location.href); u.searchParams.set('openExternalBrowser','1');   /* LINE honours this and hands off to Safari */
      h+=ROW({title:pt('lineMsg'),trail:`<a class="pl-btn pl-btn--primary" href="${esc(u.href)}">${pt('lineBtn')}</a>`}); }
    else if(ios&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches&&!S.hideInstall)
      h+=ROW({media:ic('share'),title:pt('installMsg'),trail:IBTN('x',pt('close'),{act:'hideinstall'})});
    E.notice.innerHTML=h;
  }

  /* ---------- boot ---------- */
  function labels(){
    view.querySelectorAll('[data-pt]').forEach(el=>{ el.textContent=pt(el.dataset.pt); });
    E.mapEl.setAttribute('aria-label',pt('mapTitle'));
    E.days.setAttribute('aria-label',pt('days'));
    g.querySelectorAll('.pl-layer').forEach(el=>{ el.lang=lang(); });
    mapState();
  }
  function setDay(i,keepSheet){
    if(i===S.day||!(i>=0&&i<DB.days.length)) return;
    /* note 40 */
    const sy=scrollY, top=keepSheet?0:view.getBoundingClientRect().top+sy+view.querySelector('.pl-bar').offsetHeight;
    S.day=i; select(null);
    /* a day switch touches only what shows the day: the strip, the day list, the map (and the 6日 board's current lane) */
    if(DRAG||soon) render(true); else { renderDays(); renderMain(true); renderMap(); if(DK&&view.classList.contains('pl-6')) DK.render(); if(SY) SY.decor(); const f=after; after=[]; f.forEach(x=>x()); }
    fitDay();
    if(!keepSheet&&sy>top) raf(()=>scrollTo(0,top));      /* in the frame, not the tap: reading or setting scroll after the DOM change forces layout */
    saveUISoon(); syncURL();
  }
  /* note 41 */
  const lazy={travel:false,routes:false,photos:false};
  /* new minutes: the candidates list re-ranks, but an open day picker keeps its place and only re-simulates */
  function refreshPicks(){ if(sheetKind==='browse') renderList(); }
  function loadLazy(){
    /* a phone on ① waits for its first scroll (or a sheet) before the 56 KB gallery */
    if(S.stage!=='collect'||view.clientWidth>=1024) loadGallery(); else addEventListener('scroll',()=>loadGallery(),{once:true,passive:true});
    if(!MOREP) needMore(true).catch(()=>{});      /* the drawer and the other sheets, before the first tap on them */
    if(!lazy.travel) fetch(SRC+'travel.json').then(r=>r.ok?r.json():null).then(t=>{
      if(!t||!Array.isArray(t.ids)||!Array.isArray(t.min)) return;
      lazy.travel=true; DB.travel=t; DB.tIdx={}; t.ids.forEach((id,i)=>{ DB.tIdx[id]=i; }); dirty('main','map','stages','desk','review'); refreshPicks(); }).catch(()=>{});
    if(!lazy.routes) fetch(SRC+'routes.json').then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{
      if(j&&typeof j==='object'&&!Array.isArray(j)){ DB.routes=j; lazy.routes=true; } DB.routesLoaded=true; if(S.sc&&!DRAG) renderLegs(); });
    loadMore();
    loadPhotos();
    /* the map's engine (planner-map.js, then MapLibre itself), warmed for when the map first shows */
    if(!EN) idle(()=>libMap().then(m=>m.preload()).catch(()=>{}),6000);
  }
  /* the day's hero is on the first screen (it is the LCP), so its index loads right after boot */
  function loadPhotos(){ if(!lazy.photos&&!lazy.photosP) lazy.photosP=fetch(SRC+'photos.json').then(r=>r.ok?r.json():null).then(j=>{ if(j&&typeof j==='object'){ DB.photos=j; lazy.photos=true; dirty('main','desk'); if(CM) CM.media(); } }).catch(()=>{}).then(()=>{ lazy.photosP=null; }); }
  let MORE=null;
  /* note 42 */
  /* the curated clusters, whole, from groups.json (loaded with planner-more; the ① tier view never needs them) */
  let GROUPS=null;
  function loadGroups(){ return GROUPS||(GROUPS=fetch(SRC+'groups.json').then(r=>r.ok?r.json():{}).catch(()=>{ GROUPS=null; return {}; })
    .then(j=>{ DB.clusters=Object.keys(j||{}).filter(k=>j[k]&&Array.isArray(j[k].ids)).map(k=>Object.assign({id:k},j[k])); return j; })); }
  function loadMore(){ return MORE||(MORE=fetch(SRC+'places-more.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(j=>{ DB.more=j||{}; DB.base.forEach(p=>{ const m=DB.more[p.id]; if(m){ if(m.vibe&&!p.vibe) p.vibe=m.vibe; if(m.vibeJa&&!p.vibeJa) p.vibeJa=m.vibeJa; ['kw','ig','igTag','cost','mapsAt','igN','badge'].forEach(k=>{ if(m[k]&&!p[k]) p[k]=m[k]; }); } delete p._s; }); return DB.more; })
    .catch(()=>{ MORE=null; return {}; })); }
  function init(res){
    const [list,plans]=res;
    /* Bases and ferry terminals ship in plans.json; a place record of the same id wins. */
    const have=new Set(list.map(p=>p.id)), places=list.concat((plans.basePlaces||[]).filter(p=>!have.has(p.id)));
    DB={base:places,baseMap:new Map(places.map(p=>[p.id,p])),places:null,list:null,impVer:0,days:plans.days,bases:new Set(plans.bases||[]),
        clusters:[],ferries:Array.isArray(plans.ferries)?plans.ferries:[],walks:Array.isArray(plans.walks)?plans.walks.filter(w=>w&&w.a&&w.b&&w.min>=0):[],noRoad:plans.noRoad&&typeof plans.noRoad==='object'?plans.noRoad:{},
        tides:Object.fromEntries(Object.entries(plans.tides||LOW_TIDE).filter(([k])=>k[0]!=='_')),
        travel:{ids:[],min:[]},tIdx:{},routes:{},routesLoaded:false,photos:null,more:null};
    SIM=makeSim(DB); rebuildPlaces();
    const broken=loadState();
    const now=new Date(), today=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate()), ti=DB.days.findIndex(d=>d.date===today);
    if(ti>=0) S.day=ti;          /* during the trip, open on today */
    /* note 43 */
    /* note 44 */
    const early=e=>{ if(wired) return; const t=e.target.closest('button,a,[data-act]'); if(!t) return;
      e.preventDefault(); e.stopPropagation(); pendingTap=t; };
    view.addEventListener('click',early,true);
    labels(); rebuildPlaces(); renderTop(); renderDays();
    try{ renderMain(); }catch(e){ console.error(e); LS.set(KB,S.raw||''); S.my={id:'my',days:{},stay:{},start:{},notes:{}}; S.versions=[]; S.planId='my'; saveNow(); renderTop(); renderDays(); renderMain(); }
    if(broken||S.mergedBack) saveNow();
    if(S.impDropped) afterPaint(()=>toast(pt('impAbroad',{n:S.impDropped})));
    if(myEmpty()) S.stage='collect';   /* first run, and whenever マイプラン is empty: ① (docs/DESIGN.md) */
    const uh=/^#(collect|review|plan)(?:\/(\d+))?$|^#place=([\w.-]+)$/.exec(location.hash);
    if(uh&&uh[1]){ S.stage=uh[1]; const di=uh[2]?DB.days.findIndex(d=>+d.date.slice(8)===+uh[2]):-1; if(di>=0&&di!==S.day){ S.day=di; renderDays(); renderMain(); } }
    if(uh&&uh[3]&&DB.places.has(uh[3])) afterWire=()=>openPlace(uh[3]);
    view.dataset.stage=S.stage; renderStages(); syncURL();
    if(S.stage==='collect') needCollect().then(c=>c.render(),()=>{}); else if(S.stage==='review') needMore(true).then(m=>m.renderReview(E.review));
    setTimeout(()=>{ renderMap(); setTimeout(wire,0); },0);
    /* photos (6 KB gz) and flag labels (5 KB) wait for the first paint, so they stay off the first screen's bytes (tools/budget.test.js) */
    afterPaint(()=>{ loadPhotos(); loadFlags(); if(LS.get('plan-sync:'+slug)||/#pair=/.test(location.hash)) loadSync(); });
  }
  const afterPaint=f=>raf(()=>setTimeout(f,0));
  const loadFlags=()=>fetch(SRC+'flags.json').then(r=>r.ok?r.json():null).then(o=>{ if(!o) return; setFlags(o); DB.list.forEach(p=>{ delete p._s; }); if(sheetKind==='place') refreshSheet(); }).catch(()=>{});
  /* third boot task: listeners, notices, share links, then the lazy loads on idle */
  let wired=false, pendingTap=null, afterWire=null;
  function wire(){
    /* ⚠ armed: 確定 / やめる wherever the item is; a field's × clears it */
    document.addEventListener('click',e=>{ const b=e.target.closest('.pl-armed [data-act]'); if(b&&ARMD){ e.stopPropagation(); e.preventDefault(); disarm(b.dataset.act==='armok'); return; }
      const x=e.target.closest('.pl-field__clear'); if(x){ const i=x.parentNode.querySelector('input'); i.value=''; x.hidden=true; i.dispatchEvent(new Event('input',{bubbles:true})); i.focus(); } },true);
    document.addEventListener('input',e=>{ const f=e.target.closest&&e.target.closest('.pl-field'); if(f){ const x=f.querySelector('.pl-field__clear'); if(x) x.hidden=!e.target.value; } },true);
    if(S.help) saveUI();   /* seen once: the next launch hides the help */
    queueMicrotask(()=>{ wired=true; const t=pendingTap; pendingTap=null; if(t&&t.isConnected) t.click(); if(afterWire){ afterWire(); afterWire=null; } });
    E.days.addEventListener('click',e=>{ const b=e.target.closest('[data-day]'); if(b) setDay(+b.dataset.day); });
    E.bar.addEventListener('click',openPlans);
    /* the view's width comes from the observer (perf rule 4), and the desk re-renders only when it crosses a layout step */
    const bucket=w=>w>=1760?3:w>=1024?2:1;
    let rz=0; if(window.ResizeObserver) new ResizeObserver(es=>{ const w=es[es.length-1].contentRect.width, was=bucket(S.vw); S.vw=w; if(bucket(w)===was&&DK) return;
      if(!rz) rz=raf(()=>{ rz=0; needDesk(); if(DK) DK.render(); }); }).observe(view); else needDesk();
    E.stages.addEventListener('click',e=>{ const b=e.target.closest('[data-stage]'); if(b) setStage(b.dataset.stage); });
    /* [ and ] step between the stages (by e.code, so a JIS keyboard works); ① owns its own keys */
    document.addEventListener('keydown',e=>{ if(sheetKind||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const st=['collect','plan','review'], i=st.indexOf(S.stage), mod=e.metaKey||e.ctrlKey;
      if(mod&&e.code==='KeyZ'&&!e.shiftKey){ e.preventDefault(); undo(); }
      else if(!mod&&e.code==='BracketLeft'&&i>0){ e.preventDefault(); setStage(st[i-1],'key'); }
      else if(!mod&&e.code==='BracketRight'&&i<2){ e.preventDefault(); setStage(st[i+1],'key'); }
      });
    view.querySelector('[data-r="share"]').addEventListener('click',shareLink);
    view.querySelector('[data-r="browse"]').addEventListener('click',()=>openBrowse());
    E.undo.addEventListener('click',undo);
    E.notice.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(!b) return;
      if(b.dataset.act==='hideinstall'){ S.hideInstall=true; saveUI(); renderNotice(); }
      if(b.dataset.act==='purge'){ S.versions=S.versions.filter(v=>v.kind!=='auto'); S.hist=[]; if(saveNow()) toast(pt('purged')); renderTop(); } });
    document.addEventListener('langchange',()=>{ labels(); if(EN) EN.setLang(lang()); DB.list.forEach(p=>{ delete p._s; }); render(); renderNotice(); select(null); if(!DRAG) refreshSheet(); });
    addEventListener('hashchange',()=>{ importHash(); const u=/^#(collect|review|plan)(?:\/(\d+))?$|^#place=([\w.-]+)$/.exec(location.hash); if(!u) return;
      if(u[3]){ if(DB.places.has(u[3])&&!(sheetKind==='place'&&sheetArg.id===u[3])) openPlace(u[3]); return; }
      setStage(u[1]); const di=u[2]?DB.days.findIndex(d=>+d.date.slice(8)===+u[2]):-1; if(di>=0) setDay(di); });
    /* another tab saved: take its state rather than overwrite it on our next save */
    addEventListener('storage',e=>{ if((e.key!==KP&&e.key!==KI)||e.newValue==null||e.newValue===lastW||e.key===KI&&e.newValue===JSON.stringify(S.imports)) return;
      if(e.key===KP) S.raw=e.newValue; saveQ=0; loadState(); impW=S.imports; lastW=body(); S.hist=[]; render(); if(sheetKind) refreshSheet(); toast(pt('otherTab')); });
    addEventListener('popstate',e=>{ if(backing){ backing=false; syncURL(); return; } const st=e.state||{};
      if(sheetKind&&st.plSheet!==slug) closeSheet();
      else if(S.map==='full'&&st.plFull!==slug){ S.map='peek'; mapState(); setTimeout(()=>fitDay(),380); syncURL(); } });   /* a typed hash also pops: hashchange routes it */
    addEventListener('online',()=>{ loadLazy(); pumpRoutes(); });
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ loadLazy(); pumpRoutes(); } else flushSave(); });
    addEventListener('pagehide',flushSave);
    wireMain(); wireDrag(); wireSheet(); wireMap(); renderNotice(); importHash();
    /* note 45 */
    const go=()=>{ ['pointerdown','keydown','scroll'].forEach(t=>removeEventListener(t,go,true)); clearTimeout(goT); idle(loadLazy); };
    ['pointerdown','keydown','scroll'].forEach(t=>addEventListener(t,go,{capture:true,passive:true}));
    const goT=setTimeout(go,2500);
    /* for tools/check_plans.py parity checks in a console: view._pl.sim('classic') */
    Object.defineProperty(view,'_pl',{value:{sim:id=>DB.days.map(d=>{ const sc=schedule(d,null,findPlan(id)||plan());
      return {date:d.date,drive:Math.round(sc.drive),end:hm(sc.end),rows:sc.rows.slice(1).map(r=>[r.kind==='end'?hm(r.arr):hm(r.begin),r.kind==='end'?'':hm(r.dep),r.id,Math.round(r.leg.min)]),
        warns:sc.rows.flatMap(r=>r.warns.map(w=>w.k)).concat(sc.long?['long']:[])}; }), ready:()=>lazy.travel,
      /* tools/e2e.html: is a camera move still thought to be running; what the map shows and holds */
      busy:()=>busyUI(), engine:()=>EN, map:()=>({mode:E.card.dataset.mode||'',ready:!!EN,pins:PINS.length,feats:Object.fromEntries(Object.keys(DATA).map(k=>[k,DATA[k].features.length]))}), places:()=>DB.places.size,
      code:()=>needMore(true).then(m=>m.codeNow()), tier:id=>tierOf(id), trip:()=>S.trip, gal:loadGallery, open:openPlace, more:()=>needMore(), sync:loadSync, flush:flushSave}});
    if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }
  const get=u=>fetch(u).then(r=>{ if(!r.ok) throw new Error(u+' '+r.status); return r.json(); });
  Promise.all([get(SRC+'places.json'),get(SRC+'plans.json')]).then(init)
    .catch(err=>{ main.innerHTML=`<p class="pl-hint">${pt('loadFail')}</p>`; console.error(err); });
};
plannerFn.sim=makeSim; plannerFn.state=ST;
return plannerFn;
})();
