/* PLANNER IMPORT — the import sheet (取り込む) for planner.js: Google Maps Takeout files, the
   Instagram export, the region filter, the unplaced tray, tap-to-place and Nominatim search.
   Loaded on demand after import.js (the parsers) and attaches to that same namespace as
   plimport.ui(ctx), so the page still has one import global. ctx is the planner's own state and
   helpers; nothing here touches storage except through ctx (pushHist, impChanged). */
(function(){
'use strict';
if(!window.plimport) return;
const PTI={
  impGmT:{ja:'Googleマップのリストを取り込む',en:'Import a Google Maps list'},
  impIgT:{ja:'Instagramの保存を取り込む',en:'Import your Instagram saves'},
  gm1:{ja:'Googleマップでリストを開く',en:'Open the list in Google Maps'},
  gm2:{ja:'共有 →「リンクをコピー」',en:'Share → Copy link'},
  gm3:{ja:'ここに貼る',en:'Paste it here'},
  impLink:{ja:'リストのリンク',en:'List link'}, impLinkGo:{ja:'読み込む',en:'Read'}, impLinkOn:{ja:'Googleマップで共有したリストのリンクを貼り付けます',en:'Paste the link of a list shared from Google Maps'}, linkFail:{ja:'リストを読めませんでした（{e}）',en:'Could not read the list ({e})'},
  soon:{ja:'準備中',en:'Coming soon'},
  linkSoon:{ja:'リストのリンクで取り込む（準備中）',en:'Import from a list link (coming soon)'},
  impLinkHint:{ja:'リンクからの読み込みはもうすぐ使えます。今は「その他の方法」から。',en:'Links will work soon. For now, use Other ways.'},
  otherWays:{ja:'その他の方法',en:'Other ways'},
  impGmFile:{ja:'Googleの書き出しファイルを選ぶ',en:'Choose a Google export file'},
  impGmFileS:{ja:'Google Takeout で書き出した「保存済み」のCSV、または「保存した場所.json」',en:'From Google Takeout: a CSV in Saved, or Saved Places.json'},
  ig1:{ja:'設定 → アカウントセンター →「情報をエクスポート」',en:'Settings → Accounts Center → Export your information'},
  ig2:{ja:'「保存済み」だけ・形式は JSON で作成（届くまで数分〜数時間）',en:'Pick Saved only, format JSON (it takes minutes to hours)'},
  ig3:{ja:'届いたZIPをここで選ぶ',en:'Choose the ZIP here'},
  impIgFile:{ja:'Instagramのデータ（ZIP）を選ぶ',en:'Choose the Instagram data (ZIP)'},
  impIgFileS:{ja:'ZIPを開いた中の saved_posts.json と saved_collections.json でも読めます',en:'The saved_posts.json and saved_collections.json inside it work too'},
  readFail:{ja:'このファイルは読めませんでした。CSV・JSON・ZIPを選んでください。',en:'Could not read that file. Choose a CSV, JSON or ZIP.'},
  nothingFound:{ja:'取り込める場所が見つかりませんでした。',en:'No places found in that file.'},
  impFound:{ja:'{n}件',en:'{n} items'},
  impArea:{ja:'地域',en:'Region'}, impOut:{ja:'ニュージーランド国外の {n}件は取り込みません',en:'{n} places outside New Zealand are left out'},
  impColl:{ja:'コレクション',en:'Collection'},
  unknownArea:{ja:'地域不明',en:'Unknown region'},
  gHas:{ja:'位置あり',en:'With location'},
  gNo:{ja:'位置なし',en:'No location'},
  gMatched:{ja:'一致',en:'Matched'},
  gSuggest:{ja:'候補あり',en:'Suggested'},
  gUnknown:{ja:'場所が不明',en:'Location unknown'},
  selAll:{ja:'すべて選ぶ',en:'Select all'},
  selNone:{ja:'選択を外す',en:'Clear'},
  skip:{ja:'取り込まない',en:'Skip'},
  toTray:{ja:'場所不明として取り込む',en:'Import without a place'},
  impGo:{ja:'{n}件を取り込む',en:'Import {n}'},
  imported2:{ja:'{n}件を取り込みました',en:'Imported {n}'},
  impTray:{ja:'未配置',en:'Not placed yet'},
  impTrayS:{ja:'地図をタップするか、名前で検索して置いてください。',en:'Tap the map or search by name to place them.'},
  placeOnMap:{ja:'地図で置く',en:'Place on map'},
  searchPlace:{ja:'場所を検索',en:'Search place'},
  searchGo:{ja:'検索',en:'Search'},
  searching:{ja:'検索中…',en:'Searching…'},
  noResult:{ja:'見つかりませんでした',en:'Nothing found'},
  searchFail:{ja:'検索できませんでした。オンラインで試してください。',en:'Search failed. Try again online.'},
  placingMsg:{ja:'地図をタップして「{name}」を置く',en:'Tap the map to place “{name}”'},
  placed:{ja:'「{name}」を置きました',en:'Placed “{name}”'},
  impDelAll:{ja:'取り込みをすべて削除',en:'Delete all imports'},
  impCount:{ja:'取り込み済み {n}件',en:'{n} imported'}
};
plimport.ui=function(c){
  const {S,DB,E,view,slug,SRC,pt,esc,ic,head,toast,undo,pushHist,impChanged,place,nm,hav,isCand,mapState,saveUI,select,afterRender,unprj,ja,showCands,closeSheet,stopPlacing}=c;
  const {LAT0,LAT1,LON0,LON1}=c.frame;
  c.addStrings(PTI);
  /* ---------- import: Google Maps (Takeout now, shared links once the backend exists) and the
     Instagram export. The parsers live in import.js (one global, plimport) and the region table in
     gm-regions.json; both load only when this sheet first opens. Files never leave the phone.
     A preview is S.ip = {src, items, on{key:bool}, choice{key:placeId|'tray'|''}, cc, regions:Set, coll}. ---------- */
  let REG=null;
  /* the parsers are loaded already; the region table comes once */
  let REGP=null;
  const needLib=()=>REGP||(REGP=fetch(SRC+'gm-regions.json').then(r=>r.ok?r.json():null).catch(()=>null).then(reg=>{ REG=reg; return window.plimport; }));
  const trayN=()=>S.imports.filter(m=>m.lat==null&&!m.placeId).length;
  const areaOf=it=>REG&&it.lat!=null&&window.plimport?window.plimport.gm.regionOf(it,REG):null;
  const areaName=a=>a?(ja()?a.regionJa||a.region||a.countryJa||a.country:a.region||a.country):pt('unknownArea');
  const steps=(a)=>`<ol class="pl-steps">${a.map((s,i)=>`<li><span class="pl-stepn" aria-hidden="true">${i+1}</span><span class="pl-stepi" aria-hidden="true">${ic(s[0])}</span><span>${s[1]}</span></li>`).join('')}</ol>`;
  function renderImport(){
    const box=E.sbody.querySelector('.pl-impbody'); if(!box||c.kind()!=='import') return;
    const y=E.sbody.scrollTop;
    box.innerHTML=S.ip?previewHTML():`
      <section class="pl-imsec"><h3>${ic('instagram','sm')}${pt('impIgT')}</h3>
        ${steps([['sliders',pt('ig1')],['bookmark',pt('ig2')],['download',pt('ig3')]])}
        <label class="pl-btn pl-btn--primary pl-file">${ic('download','sm')}${pt('impIgFile')}<input type="file" accept=".zip,.json,application/zip,application/json" multiple name="igfile" data-src="ig"></label>
        <p class="pl-hint">${pt('impIgFileS')}</p></section>
      <section class="pl-imsec"><h3>${ic('map-pin','sm')}${pt('impGmT')}</h3>
        <label class="pl-btn pl-btn--primary pl-file">${ic('download','sm')}${pt('impGmFile')}<input type="file" accept=".csv,.json,text/csv,application/json" multiple name="gmfile" data-src="gm"></label>
        <p class="pl-hint">${pt('impGmFileS')}</p>
        ${c.sync()&&c.sync().state().paired?`<div class="pl-linkrow"><input type="url" name="gmlink" class="pl-gmlink" placeholder="${esc(pt('impLink'))}" aria-describedby="pl-lh-${slug}" enterkeyhint="go"><button type="button" class="pl-btn pl-btn--secondary" data-act="gmgo">${pt('impLinkGo')}</button></div>
          <p class="pl-hint" id="pl-lh-${slug}">${pt('impLinkOn')}</p>`:`<details class="pl-other"><summary>${pt('linkSoon')}</summary>
          ${steps([['map',pt('gm1')],['share',pt('gm2')],['download',pt('gm3')]])}
          <div class="pl-linkrow"><input type="url" name="gmlink" disabled placeholder="${esc(pt('impLink'))}" aria-describedby="pl-lh-${slug}"><span class="pl-soon">${pt('soon')}</span></div>
          <p class="pl-hint" id="pl-lh-${slug}">${pt('impLinkHint')}</p></details>`}</section>
      ${trayHTML()}
      ${S.imports.length?`<div class="pl-impfoot"><span>${pt('impCount',{n:S.imports.length})}</span><button type="button" class="pl-btn pl-btn--ghost" data-act="impdelall">${ic('trash','sm')}${pt('impDelAll')}</button></div>`:''}`;
    E.sbody.scrollTop=y;
  }
  function trayHTML(){
    const t=S.imports.filter(m=>m.lat==null&&!m.placeId); if(!t.length) return '';
    return `<section class="pl-imsec pl-tray"><h3>${pt('impTray')}<small>${pt('count',{n:t.length})}</small></h3><p class="pl-hint">${pt('impTrayS')}</p>
      ${t.map(m=>`<div class="pl-trow" data-id="${esc(m.id)}">
        <div class="pl-tname"><b>${esc(m.name)}</b>${m.note?`<small>${esc(m.note)}</small>`:''}${m.url?`<a href="${esc(m.url)}" target="_blank" rel="noopener">${ic(m.src==='ig'?'instagram':'map-pin','xs')}${pt(m.src==='ig'?'openReel':'gmaps')}</a>`:''}</div>
        <div class="pl-tacts">
          <button type="button" class="pl-btn pl-btn--secondary" data-act="placeon" data-id="${esc(m.id)}">${ic('map-pin','sm')}${pt('placeOnMap')}</button>
          <button type="button" class="pl-btn pl-btn--secondary" data-act="nomopen" data-id="${esc(m.id)}">${ic('search','sm')}${pt('searchPlace')}</button>
          <button type="button" class="pl-btn pl-btn--icon" data-act="impdel" data-id="${esc(m.id)}">${ic('trash','sm')}<span class="sr">${pt('impDel')}</span></button>
        </div>
        <div class="pl-nom" hidden><div class="pl-field"><input type="search" name="nomq" value="${esc(m.name.replace(/^@/,''))}" enterkeyhint="search" aria-label="${esc(pt('searchPlace'))}"><button type="button" class="pl-btn pl-btn--primary" data-act="nomgo" data-id="${esc(m.id)}">${pt('searchGo')}</button></div><div class="pl-nomres"></div></div>
      </div>`).join('')}</section>`;
  }
  async function readFiles(files){
    const lib=await needLib(), G=lib.gm, I=lib.ig;
    await c.loadMore();   /* Instagram handles and tags ship in places-more */
    const box=E.sbody.querySelector('.pl-impbody'); if(box) box.innerHTML=`<p class="pl-hint">${pt('reading')}</p>`;
    let gm=[], posts=[], colls=[], bad=0;
    for(const f of files){
      try{
        const name=f.name.toLowerCase();
        if(/\.zip$/.test(name)||f.type==='application/zip'){
          const out=await I.unzipSaved(f);
          Object.keys(out).forEach(k=>{ if(/collections/.test(k)) colls=colls.concat(I.parseSavedCollections(out[k])); else posts=posts.concat(I.parseSavedPosts(out[k])); });
          continue;
        }
        const text=await f.text();
        if(/\.csv$/.test(name)||f.type==='text/csv'){ gm=gm.concat(G.parseTakeoutCsv(text)); continue; }
        const j=JSON.parse(text.replace(/^﻿/,''));
        if(j&&Array.isArray(j.features)) gm=gm.concat(G.parseSavedPlacesGeoJSON(j));
        else if(/collections/.test(name)||(j&&j.saved_saved_collections)) colls=colls.concat(I.parseSavedCollections(j));
        else { const p=I.parseSavedPosts(j); if(p.length) posts=posts.concat(p); else colls=colls.concat(I.parseSavedCollections(j)); }
      }catch(e){ bad++; }
    }
    if(gm.length&&c.sync()) gm=await resolveFids(gm);
    if(gm.length) startPreview('gm',gm.map(it=>gmItem(it,G)));
    else if(posts.length||colls.length) startPreview('ig',I.matchToPlaces(I.mergeSaved(posts,colls),DB.base).map(igItem));
    else { S.ip=null; renderImport(); toast(pt(bad?'readFail':'nothingFound')); }
  }
  /* paired: a shared list link is read by the sync backend (gmlist) into the same preview */
  async function readLink(u){ u=u.trim(); if(!u||!c.sync()) return;
    const lib=await needLib(), G=lib.gm, box=E.sbody.querySelector('.pl-impbody'); if(box) box.innerHTML=`<p class="pl-hint">${pt('reading')}</p>`;
    const r=await c.sync().call('gmlist',{url:u});
    if(!r.ok){ S.ip=null; renderImport(); toast(pt('linkFail',{e:r.error||'?'})); return; }
    const items=r.items||(r.place?[r.place]:[]); if(!items.length){ S.ip=null; renderImport(); toast(pt('nothingFound')); return; }
    startPreview('gm',items.map(it=>gmItem(it,G))); }
  /* Takeout CSV rows carry only a fid: gmplace resolves their name and position */
  async function resolveFids(gm){ const need=gm.filter(it=>it.lat==null&&it.fid).map(it=>it.fid); if(!need.length) return gm;
    const r=await c.sync().call('gmplace',{fids:need}); if(!r.ok) return gm;
    const by={}; (r.places||[]).forEach(p=>{ if(p&&p.fid&&p.lat!=null) by[p.fid]=p; });
    return gm.map(it=>it.lat==null&&by[it.fid]?Object.assign({},it,{name:it.name||by[it.fid].name,lat:by[it.fid].lat,lon:by[it.fid].lon,address:it.address||by[it.fid].address,cc:it.cc||by[it.fid].cc}):it); }
  /* A Google item close to a place we already have is that place: it adds a link, not a duplicate. */
  function gmItem(it,G){
    const raw=it.name+'@'+(it.lat==null?'':it.lat.toFixed(4)+','+it.lon.toFixed(4));
    let h=5381; for(let i=0;i<raw.length;i++) h=(h*33^raw.charCodeAt(i))>>>0;
    const key='gm-'+(it.cid||(it.fid?it.fid.replace(/[^0-9a-fx]/gi,''):'p'+h.toString(36)));
    let host=null;
    if(it.lat!=null){ let best=0.15; DB.base.forEach(p=>{ if(!isCand(p)) return; const d=hav(p,it); if(d<best){ best=d; host=p.id; } }); }
    return Object.assign({},it,{key,host,url:G.gmapsUrl(it),area:areaOf(it)});
  }
  function igItem(it){
    const p=it.placeId&&DB.baseMap.get(it.placeId);
    const line=String(it.caption||'').split(/\n/)[0].replace(/#\S+/g,'').trim().slice(0,60);
    return Object.assign({},it,{key:'ig-'+it.shortcode,line,lat:p?p.lat:null,lon:p?p.lon:null,area:p?areaOf(p):null});
  }
  function startPreview(src,items){
    /* the same place from two files (a list CSV and Saved Places.json) is one row; the copy with a position wins */
    const by=new Map(); items.forEach(it=>{ const o=by.get(it.key); if(!o||(o.lat==null&&it.lat!=null)) by.set(it.key,o&&!it.note?Object.assign({},it,{note:o.note}):it); });
    items=[...by.values()];
    const ip={src,items,on:{},choice:{},cc:null,regions:null,coll:null};
    items.forEach(it=>{ ip.on[it.key]=src==='gm'||it.status==='matched'; ip.choice[it.key]=''; });
    const ccs={}; items.forEach(it=>{ if(it.area) ccs[it.area.cc]=(ccs[it.area.cc]||0)+1; });
    ip.cc=slug; ip.abroad=items.filter(it=>it.lat!=null&&(!it.area||it.area.cc!==slug)).length;   /* the planner is one country's (docs/DESIGN.md) */
    if(src==='ig'){ const c=collections(items).find(c=>/nz|new zealand|ニュージーランド/i.test(c.name)); ip.coll=c?c.name:null; }
    S.ip=ip; renderImport();
  }
  function collections(items){ const m={}; items.forEach(it=>(it.collections||[]).forEach(c=>{ m[c]=(m[c]||0)+1; })); return Object.keys(m).map(k=>({name:k,n:m[k]})).sort((a,b)=>b.n-a.n); }
  function visible(){
    const ip=S.ip;
    return ip.items.filter(it=>{
      if(ip.src==='ig'&&ip.coll&&(it.collections||[]).indexOf(ip.coll)<0) return false;
      if(it.lat==null) return true;
      if(!it.area||it.area.cc!==ip.cc) return false;
      return !ip.regions||ip.regions.has(it.area.regionCode||'?');
    });
  }
  function picked(){ const ip=S.ip; return visible().filter(it=>ip.src==='ig'&&it.status!=='matched'&&it.status!=='unmatched'?!!ip.choice[it.key]:ip.on[it.key]); }
  function updGo(){ const go=E.sbody.querySelector('[data-act="imgo"]'); if(!go) return; const n=picked().length; go.disabled=!n; go.textContent=pt('impGo',{n}); }
  function previewHTML(){
    const ip=S.ip, G=window.plimport.gm, vis=visible(), n=picked().length;
    const located=ip.items.filter(it=>it.lat!=null&&(ip.src!=='ig'||!ip.coll||(it.collections||[]).indexOf(ip.coll)>=0));
    const cur=G.summarizeAreas(located,REG).find(c=>c.cc===ip.cc);
    const chip=(act,v,label,on)=>`<button type="button" class="pl-chip pl-chip--filter" data-act="${act}" data-v="${esc(v)}" aria-pressed="${on}">${label}</button>`;
    const filters=`${ip.src==='ig'?`<div class="pl-listhead">${pt('impColl')}</div><div class="pl-chips">${chip('imcoll','',pt('all')+' '+ip.items.length,!ip.coll)}${collections(ip.items).map(c=>chip('imcoll',c.name,esc(c.name)+' '+c.n,ip.coll===c.name)).join('')}</div>`:''}
      ${ip.abroad?`<p class="pl-hint">${pt('impOut',{n:ip.abroad})}</p>`:''}${cur&&cur.regions.length>1?`<div class="pl-listhead">${pt('impArea')}</div><div class="pl-chips">${cur.regions.map(r=>chip('imreg',r.code||'?',esc(r.code?(ja()?r.regionJa||r.region:r.region):pt('unknownArea'))+' '+r.n,!ip.regions||ip.regions.has(r.code||'?'))).join('')}</div>`:''}`;
    const row=it=>{
      const sub=it.lat==null?'':`<small>${esc(areaName(it.area))}</small>`;
      if(ip.src==='gm') return `<label class="pl-ckrow"><input type="checkbox" name="pick" class="pl-ck" data-k="${esc(it.key)}"${ip.on[it.key]?' checked':''}><span><b>${esc(it.name)}</b>${it.host?`<small>→ ${esc(nm(place(it.host)))}</small>`:sub}${it.note?`<small>${esc(it.note)}</small>`:''}</span></label>`;
      const who=`<b lang="en">@${esc(it.author||'?')}</b>${it.line?`<small>${esc(it.line)}</small>`:''}`;
      if(it.status==='matched') return `<label class="pl-ckrow"><input type="checkbox" name="pick" class="pl-ck" data-k="${esc(it.key)}"${ip.on[it.key]?' checked':''}><span>${who}<small>→ ${esc(nm(place(it.placeId)))}</small></span></label>`;
      if(it.status==='unmatched') return `<label class="pl-ckrow"><input type="checkbox" name="pick" class="pl-ck" data-k="${esc(it.key)}"${ip.on[it.key]?' checked':''}><span>${who}</span></label>`;
      return `<div class="pl-ckrow pl-sugg"><span>${who}</span><select class="pl-choice" name="choice" data-k="${esc(it.key)}" aria-label="@${esc(it.author||'')}">
        <option value="">${pt('skip')}</option>${(it.candidates||[]).filter(id=>DB.baseMap.has(id)).map(id=>`<option value="${id}"${ip.choice[it.key]===id?' selected':''}>${esc(nm(DB.baseMap.get(id)))}</option>`).join('')}
        <option value="tray"${ip.choice[it.key]==='tray'?' selected':''}>${pt('toTray')}</option></select></div>`;
    };
    const group=(title,list,toggle)=>list.length?`<section class="pl-imgrp"><div class="pl-clus__head"><h3>${title}<small>${pt('count',{n:list.length})}</small></h3>
      ${toggle?`<button type="button" class="pl-btn pl-btn--secondary pl-btn--s" data-act="imall" data-keys="${esc(list.map(i=>i.key).join(' '))}">${list.every(i=>ip.on[i.key])?pt('selNone'):pt('selAll')}</button>`:''}</div>${list.map(row).join('')}</section>`:'';
    const groups=ip.src==='gm'
      ?group(pt('gHas'),vis.filter(i=>i.lat!=null),true)+group(pt('gNo'),vis.filter(i=>i.lat==null),true)
      :group(pt('gMatched'),vis.filter(i=>i.status==='matched'),true)+group(pt('gSuggest'),vis.filter(i=>i.status==='suggested'||i.status==='ambiguous'),false)+group(pt('gUnknown'),vis.filter(i=>i.status==='unmatched'),true);
    return `<div class="pl-impsum"><b>${pt(ip.src==='gm'?'impGmT':'impIgT')}</b><span>${pt('impFound',{n:ip.items.length})}</span></div>${filters}${groups||`<p class="pl-hint">${pt('noMatch')}</p>`}
      <div class="pl-impgo"><button type="button" class="pl-btn pl-btn--ghost" data-act="imcancel">${pt('cancel')}</button><button type="button" class="pl-btn pl-btn--primary" data-act="imgo"${n?'':' disabled'}>${pt('impGo',{n})}</button></div>`;
  }
  function commitImport(){
    const ip=S.ip, add=[];
    picked().forEach(it=>{
      if(ip.src==='gm') add.push({id:it.key,src:'gmaps',name:it.name,lat:it.lat,lon:it.lon,url:it.url,ig:'',note:(it.note||'').slice(0,120),
        placeId:it.host||null,region:it.area&&it.area.regionCode||null,regionJa:it.area&&it.area.regionJa||null,cc:it.area&&it.area.cc||it.cc||null});
      else { const pid=it.status==='matched'?it.placeId:it.status==='unmatched'?null:(ip.choice[it.key]==='tray'?null:ip.choice[it.key]);
        add.push({id:it.key,src:'ig',name:'@'+(it.author||'instagram'),lat:null,lon:null,url:it.url,ig:'@'+(it.author||''),note:it.line||'',placeId:pid||null,region:null,cc:null,coll:it.collection||null}); }
    });
    if(!add.length) return;
    const ids=new Set(add.map(m=>m.id));
    pushHist();
    S.imports=S.imports.filter(m=>!ids.has(m.id)).concat(add); S.ip=null;
    impChanged(); renderImport(); toast(pt('imported2',{n:add.length}),undo);
  }
  function startPlacing(id){
    const m=S.imports.find(x=>x.id===id); if(!m) return;
    closeSheet(); S.placing=id; showCands(false);
    if(S.map==='closed'){ S.map='peek'; saveUI(); mapState(); }
    let bar=E.card.querySelector('.pl-placing');
    if(!bar){ bar=document.createElement('div'); bar.className='pl-placing'; E.card.querySelector('.pl-mapbox').appendChild(bar); }
    bar.innerHTML=`<span>${esc(pt('placingMsg',{name:m.name}))}</span><button type="button">${pt('cancel')}</button>`;
    bar.querySelector('button').onclick=stopPlacing;
    E.card.classList.add('pl-placemode');
    const top=view.getBoundingClientRect().top+scrollY; if(scrollY>top) scrollTo(0,top);
  }
  function setImportPos(id,lat,lon){
    if(!S.imports.some(x=>x.id===id)||!isFinite(lat)||!isFinite(lon)) return;
    pushHist();
    S.imports=S.imports.map(m=>{ if(m.id!==id) return m; const n=Object.assign({},m,{lat:Math.round(lat*1e5)/1e5,lon:Math.round(lon*1e5)/1e5});
      const a=areaOf(n); n.region=a&&a.regionCode||null; n.regionJa=a&&a.regionJa||null; n.cc=a&&a.cc||null; return n; });
    const m=S.imports.find(x=>x.id===id);
    impChanged(); afterRender(()=>select(id,'cand',true)); toast(pt('placed',{name:m.name}),undo);
  }
  function placeAt(x,y){
    const id=S.placing, ll=c.toLL(x,y); if(!ll) return;
    stopPlacing(); setImportPos(id,ll[0],ll[1]);
  }
  /* Nominatim: user-initiated, one request a second at most, inside the map frame. */
  let nomLast=0;
  async function nomSearch(qs){
    const wait=nomLast+1100-Date.now(); if(wait>0) await new Promise(r=>setTimeout(r,wait)); nomLast=Date.now();
    const u='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=nz&bounded=1&viewbox='+LON0+','+LAT1+','+LON1+','+LAT0+
      '&accept-language='+(ja()?'ja,en':'en')+'&q='+encodeURIComponent(qs);
    const r=await fetch(u); if(!r.ok) throw new Error(r.status);
    return (await r.json()).map(x=>({name:x.display_name,lat:+x.lat,lon:+x.lon})).filter(x=>x.lat>=LAT0&&x.lat<=LAT1&&x.lon>=LON0&&x.lon<=LON1);
  }


  return {
    render(){ needLib().then(renderImport); },
    placeAt, stopPlacing,
    change(t){
      if(t.type==='file'&&t.files&&t.files.length){ readFiles([...t.files]); return; }
      if(t.classList.contains('pl-ck')&&S.ip){ S.ip.on[t.dataset.k]=t.checked; updGo(); return; }
      if(t.classList.contains('pl-choice')&&S.ip){ S.ip.choice[t.dataset.k]=t.value; updGo(); }
    },
    click(act,b){
      switch(act){
        case 'imcancel': S.ip=null; renderImport(); break;
        case 'imgo': commitImport(); break;
        case 'gmgo': readLink((E.sbody.querySelector('.pl-gmlink')||{}).value||''); break;
        case 'imcoll': S.ip.coll=b.dataset.v||null; renderImport(); break;
        case 'imreg': { const ip=S.ip, G=window.plimport.gm, all=G.summarizeAreas(ip.items.filter(i=>i.lat!=null),REG).find(x=>x.cc===ip.cc).regions.map(r=>r.code||'?');
          const set=ip.regions||new Set(all), v=b.dataset.v; if(set.has(v)) set.delete(v); else set.add(v);
          ip.regions=set.size===all.length?null:set; renderImport(); break; }
        case 'imall': { const ks=b.dataset.keys.split(' '), on=!ks.every(k=>S.ip.on[k]); ks.forEach(k=>{ S.ip.on[k]=on; }); renderImport(); break; }
        case 'placeon': startPlacing(b.dataset.id); break;
        case 'nomopen': { const box=b.closest('.pl-trow').querySelector('.pl-nom'); box.hidden=!box.hidden; if(!box.hidden) box.querySelector('input').focus(); break; }
        case 'nomgo': { const row=b.closest('.pl-trow'), res=row.querySelector('.pl-nomres'), qv=row.querySelector('.pl-nom input').value.trim(); if(!qv) break;
          res.innerHTML=`<p class="pl-hint">${pt('searching')}</p>`;
          nomSearch(qv).then(list=>{ res.innerHTML=list.length?list.map(x=>`<button type="button" class="pl-nomhit" data-act="nomset" data-id="${esc(b.dataset.id)}" data-lat="${x.lat}" data-lon="${x.lon}">${ic('map-pin','xs')}<span>${esc(x.name)}</span></button>`).join(''):`<p class="pl-hint">${pt('noResult')}</p>`; },
            ()=>{ res.innerHTML=`<p class="pl-hint">${pt('searchFail')}</p>`; });
          break; }
        case 'nomset': setImportPos(b.dataset.id,+b.dataset.lat,+b.dataset.lon); renderImport(); break;
        case 'impdelall': pushHist(); S.imports=[]; impChanged(); renderImport(); toast(pt('impDeleted'),undo); break;
      }
    }
  };
};
})();
