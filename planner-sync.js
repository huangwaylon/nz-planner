/* planner-sync.js — phase-2 sync (docs/ARCH.md "Phase 2"), a lazy chunk loaded only when this phone is
   paired (LS plan-sync:<slug>) or a #pair= link is being opened. planner.sync(ctx) returns
   {saved, decor, box, call, pairText, unpair, state}.

   - Pairing: #pair=<64 hex> is read once and stripped from the URL at once (history.replaceState),
     verified with `whoami`, and stored as LS plan-sync:<slug> = {key, me, url}. The key is never
     logged, rendered or put in a link; it leaves this chunk only in the POST body.
   - Events (the client mints ids, so a retry is a server-side duplicate): day_set, tier_set,
     group_set, group_drop, note_set, booked_set, imp_add, imp_drop, plan_new, plan_rename, plan_drop,
     pref. They are found by diffing the saved state against B, what the server already knows, on
     every save; so the planner's edit paths need no sync code of their own.
   - Queue: LS plan-sync-q:<slug>, replayed in order with backoff; it survives a kill and never
     drops: an event the server rejects as malformed moves to plan-sync-dead:<slug>, kept.
   - Pull: `snapshot {since}` on open and on becoming visible (30 s floor). A changed `rev` (a hand
     edit of the sheet) refetches everything and rebuilds B; the queue is kept.
   - Merge: the newest event per key wins. A day_set from the other person whose base is not the
     version this phone had keeps both orders: the one that loses goes to a version of its own, and
     「{name}さんも{n}日目を変更しました。両方残しています」 says so. Group edits from different bases
     merge their ids. */
(function(){
'use strict';
if(typeof planner!=='function'||planner.sync) return;
const PS={
  syncOk:{ja:'同期済み',en:'Synced'}, syncQ:{ja:'未送信 {n}件',en:'{n} unsent'}, syncOff:{ja:'オフライン',en:'Offline'},
  edited:{ja:'{w}・{t}に編集',en:'{w} · edited {t}'}, agoNow:{ja:'たった今',en:'just now'}, agoM:{ja:'{n}分前',en:'{n} min ago'},
  agoH:{ja:'{n}時間前',en:'{n} h ago'}, agoD:{ja:'{n}日前',en:'{n} d ago'},
  both:{ja:'{name}さんも{n}日目を変更しました。両方残しています',en:'{name} also changed day {n}. Both are kept'},
  bothV:{ja:'{name}さんの{n}日目',en:'{name}’s day {n}'}, prePair:{ja:'ペアリング前のマイプラン',en:'My plan before pairing'},
  paired:{ja:'{name}として同期しています',en:'Syncing as {name}'}, pairFail:{ja:'リンクを確認できませんでした',en:'Could not verify the link'},
  syncT:{ja:'同期',en:'Sync'}, nameA:{ja:'Aの名前',en:'Name for A'}, nameB:{ja:'Bの名前',en:'Name for B'},
  unpair:{ja:'この端末の同期をやめる',en:'Stop syncing on this device'}, unpaired:{ja:'同期をやめました',en:'Sync stopped'}
};
const iso=()=>new Date().toISOString();
planner.sync=function(c){
  const {S,DB,slug,pt,esc,toast,view,E,SRC}=c;
  c.addStrings(PS);
  const KS='plan-sync:'+slug, KQ='plan-sync-q:'+slug, KM='plan-sync-m:'+slug, KD='plan-sync-dead:'+slug;
  const rd=(k,d)=>{ try{ const v=JSON.parse(LS.get(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
  const wr=(k,v)=>LS.set(k,JSON.stringify(v));
  let K=null, me=null, url=null;                     /* the key lives only here and in LS KS */
  { const s=rd(KS,null); if(s&&/^[0-9a-f]{64}$/.test(s.key)){ K=s.key; me=s.me; url=s.url; } }
  /* meta: since (server time of the last row read), rev, B (what the server knows, per key), seen (the
     newest event id per key), ed (who edited each plan day, and when), names {a,b} */
  let M=rd(KM,null)||{since:'',rev:'',B:{},seen:{},my:{},ed:{},names:{}}; M.my=M.my||{};
  let Q=rd(KQ,[]), RB=false, busy=false, fails=0, pumpT=0, online=navigator.onLine!==false, lastPull=0;
  const saveM=()=>wr(KM,M), saveQ=()=>wr(KQ,Q);
  const uid=()=>me+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  const clone=o=>JSON.parse(JSON.stringify(o));

  /* ---------- transport ---------- */
  function cfgUrl(){ return url?Promise.resolve(url):fetch(SRC+'config.json').then(r=>r.json()).then(j=>{ url=j&&j.syncUrl||null; return url; }); }
  function call(action,body){
    if(!K) return Promise.resolve({ok:false,error:'unpaired'});
    return cfgUrl().then(u=>u?fetch(u,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({},body,{key:K,action}))}):Promise.reject(new Error('no url')))
      .then(r=>r.json()).then(j=>{ online=true; dot(); return j; },e=>{ online=false; dot(); return {ok:false,error:'offline'}; });
  }

  /* ---------- pairing ---------- */
  function pairText(t){ const m=/(?:#pair=)?\b([0-9a-f]{64})\b/.exec(String(t||'')); return m?pair(m[1]):Promise.resolve(false); }
  function pair(key){ const was=[K,me]; K=key;
    return call('whoami',{}).then(r=>{ if(!r.ok||(r.me!=='a'&&r.me!=='b')){ K=was[0]; me=was[1]; toast(pt('pairFail')); return false; }
      me=r.me; wr(KS,{key:K,me,url}); M={since:'',rev:'',B:{},seen:{},my:{},ed:{},names:M.names||{}}; saveM(); toast(pt('paired',{name:nameOf(me)})); pull(true); return true; }); }
  function unpair(){ K=null; LS.set(KS,''); dot(); toast(pt('unpaired')); }
  { const h=/#pair=([0-9a-f]{64})/.exec(location.hash);
    if(h){ history.replaceState(null,'',location.pathname+location.search); pair(h[1]); } }

  /* ---------- the local state, keyed the way events are ---------- */
  const synced=v=>v&&!v.kind;                                  /* My plan and named versions; autosaves stay local */
  const plans=()=>[S.my].filter(Boolean).concat(S.versions.filter(synced));
  const planOf=id=>id==='my'?S.my:S.versions.find(v=>v.id===id);
  function dayVal(P,date){ const ids=(P.days[date]||[]).slice(), sd={};
    ids.forEach(id=>{ const v=P.stayDay&&P.stayDay[date]&&P.stayDay[date][id]!=null?P.stayDay[date][id]:P.stay&&P.stay[id]; if(v!=null) sd[id]=v; });
    const o={ids,stayDay:sd,start:P.start&&P.start[date]||null};
    if(P.anchors&&P.anchors[date]) o.anchors=P.anchors[date];
    if(P.titles&&P.titles[date]) o.titles=P.titles[date];
    return o; }
  const J=JSON.stringify;
  const grp=g=>J({name:g.name,ids:g.ids});

  /* ---------- outgoing: diff the saved state against B ---------- */
  function emit(type,data,key){ const id=uid(); Q.push({id,type,data}); if(key){ M.seen[key]=id; M.my[key]=1; } return id; }
  function saved(){
    if(!K) return;
    const B=M.B, have=new Set();
    plans().forEach(P=>{ const pk='p|'+P.id, nm=P.name||''; have.add(pk);
      if(B[pk]==null){ emit('plan_new',{plan:P.id,name:nm,from:P.from||null}); B[pk]=nm; }
      else if(B[pk]!==nm){ emit('plan_rename',{plan:P.id,name:nm}); B[pk]=nm; }
      DB.days.forEach(d=>{ const k=P.id+'|'+d.date, v=dayVal(P,d.date), s=J(v); if(B[k]===s) return;
        if(B[k]==null&&!v.ids.length&&!v.start&&!v.anchors) { B[k]=s; return; }
        emit('day_set',Object.assign({plan:P.id,date:d.date},v,{base:M.seen[k]||null}),k); B[k]=s; M.ed[k]=[me,iso()]; }); });
    Object.keys(B).filter(k=>k.startsWith('p|')&&!have.has(k)).forEach(k=>{ emit('plan_drop',{plan:k.slice(2)}); delete B[k]; });
    const T=S.trip;
    new Set(Object.keys(T.tier).concat(Object.keys(B).filter(k=>k.startsWith('t|')).map(k=>k.slice(2)))).forEach(id=>{
      const v=T.tier[id]==null?null:T.tier[id]; if((B['t|'+id]??null)===v) return; emit('tier_set',{id,tier:v}); if(v==null) delete B['t|'+id]; else B['t|'+id]=v; });
    const gs=new Set(); T.groups.forEach(g=>{ gs.add('g|'+g.id); const s=grp(g); if(B['g|'+g.id]===s) return;
      emit('group_set',{id:g.id,name:g.name,ids:g.ids,base:M.seen['g|'+g.id]||null},'g|'+g.id); B['g|'+g.id]=s; });
    Object.keys(B).filter(k=>k.startsWith('g|')&&!gs.has(k)).forEach(k=>{ emit('group_drop',{id:k.slice(2)}); delete B[k]; });
    new Set(Object.keys(T.notes).concat(Object.keys(B).filter(k=>k.startsWith('n|')).map(k=>k.slice(2)))).forEach(id=>{
      const v=T.notes[id]||null; if((B['n|'+id]||null)===v) return; emit('note_set',{id,text:v}); if(v) B['n|'+id]=v; else delete B['n|'+id]; });
    new Set(Object.keys(S.booked).concat(Object.keys(B).filter(k=>k.startsWith('b|')).map(k=>k.slice(2)))).forEach(id=>{
      const v=!!S.booked[id]; if(!!B['b|'+id]===v) return; emit('booked_set',{id,on:v}); if(v) B['b|'+id]=1; else delete B['b|'+id]; });
    const is=new Set(S.imports.map(m=>m.id));
    S.imports.forEach(m=>{ if(!B['i|'+m.id]){ emit('imp_add',{imp:m}); B['i|'+m.id]=1; } });
    Object.keys(B).filter(k=>k.startsWith('i|')&&!is.has(k.slice(2))).forEach(k=>{ emit('imp_drop',{id:k.slice(2)}); delete B[k]; });
    saveM(); saveQ(); dot(); pump();
  }
  function setPref(o){ M.names=Object.assign({},M.names,o); emit('pref',{names:M.names}); saveM(); saveQ(); dot(); pump(); decor(); }

  /* ---------- the queue: in order, with backoff, never dropped ---------- */
  function pump(){
    if(busy||!Q.length||!K) return; busy=true; clearTimeout(pumpT);
    const e=Q[0];
    call('event',e).then(r=>{ busy=false;
      if(r.ok){ Q.shift(); saveQ(); fails=0; dot(); if(Q.length) pump(); else pull(); return; }
      if(r.error==='bad_request'||r.error==='too_large'){ const d=rd(KD,[]); d.push(Object.assign({error:r.error},e)); wr(KD,d); Q.shift(); saveQ(); dot(); pump(); return; }
      fails++; dot(); pumpT=setTimeout(pump,Math.min(300000,2000*Math.pow(2,fails))); });
  }

  /* ---------- incoming ---------- */
  function pull(force){
    if(!K) return Promise.resolve();
    const now=Date.now(); if(!force&&now-lastPull<30000) return Promise.resolve(); lastPull=now;
    return call('snapshot',{since:M.since}).then(r=>{
      if(!r.ok) return;
      if(M.rev&&r.rev!==M.rev){ M={since:'',rev:r.rev,B:{},seen:{},my:{},ed:{},names:M.names||{},kept:1,rb:1}; saveM(); lastPull=0; return pull(true); }
      M.rev=r.rev;
      if(!M.since&&(r.rows||[]).some(x=>x[3]==='day_set')&&S.my&&!M.kept){ keepCopy(S.my,pt('prePair')); M.kept=1; }
      RB=!!M.rb; (r.rows||[]).forEach(apply);
      /* after a rebuild, what is still queued is known too: B takes it, so nothing is sent twice */
      if(RB){ Q.forEach(e=>apply([iso(),me,e.id,e.type,J(e.data)])); RB=false; delete M.rb; }
      if(r.rows&&r.rows.length) M.since=r.rows[r.rows.length-1][0];
      saveM(); c.save(); c.render(true); dot(); });
  }
  function keepCopy(P,name){ S.versions=[Object.assign(clone(P),{id:'v-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name,at:Date.now()})].concat(S.versions); }
  const nameOf=p=>(M.names||{})[p]||p.toUpperCase();
  function ensure(id,from){ let P=planOf(id); if(P) return P;
    const src=planOf(from)||{days:{}}, base={days:clone(src.days),stay:clone(src.stay||{}),start:clone(src.start||{}),notes:{},stayDay:clone(src.stayDay||{}),anchors:clone(src.anchors||{})}; if(from) base.from=from;
    if(id==='my') P=S.my=Object.assign({id:'my'},base); else { P=Object.assign({id,name:'',at:Date.now()},base); S.versions=S.versions.concat([P]); }
    DB.days.forEach(d=>{ M.B[id+'|'+d.date]=J(dayVal(P,d.date)); }); M.B['p|'+id]=P.name||''; return P; }
  function setDay(P,date,v){ P.days=Object.assign({},P.days,{[date]:v.ids.slice()});
    P.stayDay=Object.assign({},P.stayDay); if(Object.keys(v.stayDay||{}).length) P.stayDay[date]=v.stayDay; else delete P.stayDay[date];
    P.start=Object.assign({},P.start); if(v.start) P.start[date]=v.start; else delete P.start[date];
    P.anchors=Object.assign({},P.anchors); if(v.anchors) P.anchors[date]=v.anchors; else delete P.anchors[date];
    if(v.titles){ P.titles=Object.assign({},P.titles,{[date]:v.titles}); } }
  function apply(row){
    const [at,person,id,type]=row; let d; try{ d=JSON.parse(row[4]); }catch(e){ return; }
    if(!d||typeof d!=='object') return;
    const mine=person===me, T=S.trip;
    /* this phone's own events (a rebuild, or the echo) only tell B what the server knows; S already has them */
    if(mine){ switch(type){
      case 'plan_new': M.B['p|'+d.plan]=d.name||''; break;   case 'plan_rename': M.B['p|'+d.plan]=d.name; break;   case 'plan_drop': delete M.B['p|'+d.plan]; break;
      case 'day_set': { const k=d.plan+'|'+d.date, o={ids:d.ids||[],stayDay:d.stayDay||{},start:d.start||null}; if(d.anchors) o.anchors=d.anchors; if(d.titles) o.titles=d.titles;
        M.B[k]=J(o); M.seen[k]=id; M.ed[k]=[person,at]; break; }
      case 'tier_set': if(d.tier==null) delete M.B['t|'+d.id]; else M.B['t|'+d.id]=d.tier; break;
      case 'group_set': M.B['g|'+d.id]=grp({name:d.name,ids:d.ids||[]}); M.seen['g|'+d.id]=id; break;   case 'group_drop': delete M.B['g|'+d.id]; break;
      case 'note_set': if(d.text) M.B['n|'+d.id]=String(d.text).slice(0,300); else delete M.B['n|'+d.id]; break;
      case 'booked_set': if(d.on) M.B['b|'+d.id]=1; else delete M.B['b|'+d.id]; break;
      case 'imp_add': if(d.imp&&d.imp.id) M.B['i|'+d.imp.id]=1; break;   case 'imp_drop': delete M.B['i|'+d.id]; break;
      case 'pref': if(d.names) M.names=Object.assign({},M.names,d.names); break; }
      return; }
    switch(type){
      case 'plan_new': ensure(d.plan,d.from); if(d.name!=null&&d.plan!=='my'){ const P=planOf(d.plan); if(P) P.name=d.name; M.B['p|'+d.plan]=d.name||''; } break;
      case 'plan_rename': { const P=planOf(d.plan); if(P){ P.name=d.name; S.versions=S.versions.slice(); } M.B['p|'+d.plan]=d.name; break; }
      case 'plan_drop': if(d.plan==='my') break; S.versions=S.versions.filter(v=>v.id!==d.plan); if(S.planId===d.plan) S.planId='my'; delete M.B['p|'+d.plan]; break;
      case 'day_set': { const k=d.plan+'|'+d.date, P=ensure(d.plan,null), n=DB.days.findIndex(x=>x.date===d.date)+1;
        if(mine){ M.seen[k]=id; break; }
        const local=J(dayVal(P,d.date)), pend=Q.some(e=>e.type==='day_set'&&e.data.plan===d.plan&&e.data.date===d.date);
        /* a rebuild replays the log: newest wins, no conflict copies, a queued local edit stays */
        if(RB){ if(!pend) setDay(P,d.date,d); M.B[k]=J(dayVal(P,d.date)); M.seen[k]=id; M.ed[k]=[person,at]; break; }
        /* their edit did not start from the version this phone had, and this phone had changed the day */
        const clash=(d.base||null)!==(M.seen[k]||null)&&(M.my[k]||local!==(M.B[k]||local))||pend;
        if(clash){ const who=nameOf(person);
          if(pend){ const cp=Object.assign(clone(P)); setDay(cp,d.date,d); keepCopy(cp,pt('bothV',{name:who,n})); }
          else { keepCopy(P,pt('bothV',{name:nameOf(me),n})); setDay(P,d.date,d); M.B[k]=J(dayVal(P,d.date)); }
          toast(pt('both',{name:who,n})); }
        else { setDay(P,d.date,d); M.B[k]=J(dayVal(P,d.date)); }
        M.seen[k]=id; delete M.my[k]; M.ed[k]=[person,at]; break; }
      case 'tier_set': if(mine) break; S.trip=clone(T); if(d.tier==null) delete S.trip.tier[d.id]; else S.trip.tier[d.id]=d.tier; if(d.tier==null) delete M.B['t|'+d.id]; else M.B['t|'+d.id]=d.tier; break;
      case 'group_set': { if(mine){ M.seen['g|'+d.id]=id; break; } const t=clone(T), g=t.groups.find(x=>x.id===d.id);
        let ids=(d.ids||[]).filter(x=>typeof x==='string');
        if(g&&(d.base||null)!==(M.seen['g|'+d.id]||null)&&M.my['g|'+d.id]) ids=[...new Set(g.ids.concat(ids))];     /* different bases: merge the ids */
        t.groups.forEach(x=>{ if(x.id!==d.id) x.ids=x.ids.filter(i=>ids.indexOf(i)<0); });
        if(g){ g.name=d.name; g.ids=ids; } else t.groups.push({id:d.id,name:d.name||'',ids});
        S.trip=t; M.B['g|'+d.id]=grp({name:d.name,ids}); M.seen['g|'+d.id]=id; delete M.my['g|'+d.id]; break; }
      case 'group_drop': if(mine) break; S.trip=clone(T); S.trip.groups=S.trip.groups.filter(x=>x.id!==d.id); delete M.B['g|'+d.id]; break;
      case 'note_set': if(mine) break; S.trip=clone(T); if(d.text) S.trip.notes[d.id]=String(d.text).slice(0,300); else delete S.trip.notes[d.id]; if(d.text) M.B['n|'+d.id]=S.trip.notes[d.id]; else delete M.B['n|'+d.id]; break;
      case 'booked_set': if(mine) break; S.booked=Object.assign({},S.booked); if(d.on) S.booked[d.id]=true; else delete S.booked[d.id]; if(d.on) M.B['b|'+d.id]=1; else delete M.B['b|'+d.id]; break;
      case 'imp_add': { const m=d.imp; if(mine||!m||typeof m.id!=='string'||!c.home(m)||S.imports.some(x=>x.id===m.id)){ if(m&&m.id) M.B['i|'+m.id]=1; break; }
        S.imports=S.imports.concat([m]); M.B['i|'+m.id]=1; c.rebuild(); break; }
      case 'imp_drop': if(mine) break; S.imports=S.imports.filter(x=>x.id!==d.id); delete M.B['i|'+d.id]; c.rebuild(); break;
      case 'pref': if(d.names&&typeof d.names==='object') M.names=Object.assign({},M.names,d.names); break;
    }
  }

  /* ---------- UI: the dot, the day's last editor (in the day header only), the settings box ---------- */
  let D=null;
  function dot(){ if(!D){ const t=view.querySelector('[data-r="tools"]'); if(!t) return; D=document.createElement('span'); D.className='pl-sync'; D.setAttribute('role','status'); t.prepend(D); }
    const st=!K?'':!online?'off':Q.length?'q':'ok'; D.dataset.st=st; D.hidden=!K;
    D.innerHTML=`<i aria-hidden="true"></i>${st==='off'?pt('syncOff'):st==='q'?pt('syncQ',{n:Q.length}):pt('syncOk')}`; }
  const ago=t=>{ const m=Math.max(0,Math.round((Date.now()-Date.parse(t))/60000)); return m<1?pt('agoNow'):m<60?pt('agoM',{n:m}):m<1440?pt('agoH',{n:Math.round(m/60)}):pt('agoD',{n:Math.round(m/1440)}); };
  function decor(){ const h=E.main&&E.main.querySelector('.pl-dayhead'); if(!h) return;
    const P=c.plan(), e=K&&M.ed[P.id+'|'+DB.days[S.day].date]; let w=h.querySelector('.pl-who');
    if(!e){ if(w) w.remove(); return; }
    if(!w){ w=document.createElement('p'); w.className='pl-who'; const r=h.querySelector('.pl-dayhead__title'); if(r) r.after(w); else h.append(w); }
    w.textContent=pt('edited',{w:nameOf(e[0]),t:ago(e[1])}); }
  function box(el){ if(!el) return;
    el.innerHTML=`<h3>${pt('syncT')}</h3><p class="pl-hint">${K?esc(pt('paired',{name:nameOf(me)})):''}</p>
      <label class="pl-field"><span class="sr">${pt('nameA')}</span><input class="pl-syname" name="nameA" data-p="a" maxlength="20" value="${esc((M.names||{}).a||'')}" placeholder="${esc(pt('nameA'))}"></label>
      <label class="pl-field"><span class="sr">${pt('nameB')}</span><input class="pl-syname" name="nameB" data-p="b" maxlength="20" value="${esc((M.names||{}).b||'')}" placeholder="${esc(pt('nameB'))}"></label>
      <button type="button" class="pl-btn pl-btn--secondary" data-syn="unpair">${pt('unpair')}</button>`;
    el.querySelectorAll('.pl-syname').forEach(i=>i.addEventListener('change',()=>setPref({[i.dataset.p]:i.value.trim().slice(0,20)})));
    el.querySelector('[data-syn="unpair"]').addEventListener('click',()=>{ unpair(); el.innerHTML=''; }); }

  addEventListener('online',()=>{ online=true; dot(); pump(); pull(); });
  addEventListener('offline',()=>{ online=false; dot(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ pull(); pump(); } });
  dot(); if(K){ pull(true); pump(); }
  return {saved, decor, box, call, pairText, unpair, setPref, pull, state:()=>({paired:!!K, me, queue:Q.length, online, since:M.since})};
};
})();
