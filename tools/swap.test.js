/* Quick-swap regression test: node tools/swap.test.js (no dependencies).
   Loads planner.js and planner-more.js in a vm, builds the same DB the app builds, and checks the
   ranking for the trip's most delicate slot: Pouākai Tarns on Feb 14.
   - the first section never offers a Waikato place (another region two hours away)
   - a longer day is never labelled as a saving (the shown delta has the sign of the day change)
   - nothing offered is closed on arrival, and first-section costs stay within +30 min */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..'), D=path.join(ROOT,'data','nz');
const ctx={console,Math,JSON,Date,Set,Map,Object,Array,String,Number,isFinite,
  matchMedia:()=>({matches:false}), document:{documentElement:{lang:'ja'}}, LS:{get:()=>null,set(){}},
  requestAnimationFrame:f=>setTimeout(f,0), setTimeout, CSS:{escape:s=>s}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'planner.js'),'utf8')+'\n;this.planner=planner;this.makeSim=typeof makeSim!=="undefined"?makeSim:null;',ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'planner-more.js'),'utf8'),ctx);
const planner=ctx.planner;
if(!planner.swapRank||!planner.sim) throw new Error('planner.swapRank / planner.sim missing');
const places=JSON.parse(fs.readFileSync(path.join(D,'places.json'))), plans=JSON.parse(fs.readFileSync(path.join(D,'plans.json'))), travel=JSON.parse(fs.readFileSync(path.join(D,'travel.json')));
const have=new Set(places.map(p=>p.id)), list=places.concat((plans.basePlaces||[]).filter(p=>!have.has(p.id)));
const DB={places:new Map(list.map(p=>[p.id,p])),list,days:plans.days,bases:new Set(plans.bases||[]),ferries:plans.ferries||[],walks:plans.walks||[],noRoad:plans.noRoad||{},
  tides:Object.fromEntries(Object.entries(plans.tides||{}).filter(([k])=>k[0]!=='_')),travel,tIdx:Object.fromEntries(travel.ids.map((id,i)=>[id,i]))};
const sim=planner.sim(DB);
let fails=0, checks=0;
const ok=(c,msg)=>{ checks++; if(!c){ fails++; console.log('FAIL',msg); } };
const day=DB.days.find(d=>d.date==='2027-02-14');
const cur0=()=>DB.places.get('pouakai-tarns');
for(const pid of ['hut','classic']){
  const P=plans.plans.find(p=>p.id===pid); if(!P){ console.log('skip: no plan',pid); continue; }
  const ids=sim.idsOf(day.date,P);
  if(ids.indexOf('pouakai-tarns')<0){ console.log('skip:',pid,'has no pouakai-tarns on Feb 14'); continue; }
  const r=planner.swapRank(sim,DB,P,day,'pouakai-tarns');
  const first=r.same.concat(r.other), all=first.concat(r.rest);
  first.forEach(x=>{ ok(x.p.area!=='waikato',`${pid}: first section offers Waikato place ${x.p.id}`);
    ok(x.cost<=30,`${pid}: first section cost ${Math.round(x.cost)} > 30 for ${x.p.id}`); });
  all.forEach(x=>{ const shown=(x.dLen>0.5?'+':x.dLen<-0.5?'−':'±');
    ok(!(x.len>x.len0+0.5&&shown==='−'),`${pid}: longer day shown as a saving for ${x.p.id}`);
    ok(!x.r.warns.some(w=>w.k==='closed'||w.k==='closedAt'),`${pid}: offers closed ${x.p.id}`);
    if(r.startDriven) ok(x.len<=x.len0+0.5,`${pid}: start-driven slot made the day longer with ${x.p.id}`); });
  // a sunrise slot re-times the day from 08:00, and what the row shows is what the swap applies
  if(String(cur0(P).best).indexOf('sunrise')>=0&&r.startDriven){ ok(r.newStart==='08:00'||r.start0>='08:00',`${pid}: sunrise slot kept the ${r.start0} start`);
    all.forEach(x=>{ const P2=Object.assign({},P,{start:Object.assign({},P.start,x.start?{[day.date]:x.start}:{})});
      const sc=sim.schedule(day,x.list,P2), row=sc.rows[x.list.indexOf(x.p.id)+1];
      ok(row.begin===x.r.begin&&row.dep===x.r.dep,`${pid}: preview ${x.r.begin} differs from applied ${row.begin} for ${x.p.id}`);
      ok(!(planner.sim(DB).OUTDOOR.has(x.p.cat)&&x.p.best!=='night'&&row.begin<sim.sunriseOf(x.p,day.date)-30),`${pid}: ${x.p.id} offered before dawn at ${row.begin}`);
      ok(!x.r.warns.some(w=>w.k==='dark'),`${pid}: ${x.p.id} offered after dark`);
      // a trailhead only there for the walk to the replaced tarns leaves with them
      ok(x.list.indexOf('mangorei-trailhead')<0,`${pid}: ${x.p.id} keeps the orphaned trailhead`); }); }
  // from the hut, nothing is offered that would need a road
  if(pid==='hut') all.forEach(x=>{ const sc=sim.schedule(day,x.list,Object.assign({},P,{start:Object.assign({},P.start,x.start?{[day.date]:x.start}:{})})), lg=sc.rows[1].leg;
    ok(sc.rows[0].id!=='pouakai-hut'||lg.kind==='walk'||lg.combo&&lg.walk>=120,`hut: ${x.p.id} is reached from the hut without the walk down`); });
  // knock-on breaks (tide, ferry, closing) ride on the row and are other stops only
  all.forEach(x=>ok(Array.isArray(x.breaks)&&x.breaks.every(b=>b.id!==x.p.id),`${pid}: breaks list wrong for ${x.p.id}`));
  // equal cost: a place she saved in her own Google Maps list comes first
  [r.same,r.other,r.rest].forEach(sec=>sec.forEach((x,k)=>{ const y=sec[k+1]; if(!y||Math.abs(x.cost-y.cost)>1e-9) return;
    ok(!!x.p.saved||!y.p.saved,`${pid}: unsaved ${x.p.id} ranked above saved ${y.p.id} at equal cost`); }));
  const sec=all, k=sec.findIndex((x,i)=>i>0&&Math.abs(sec[i-1].cost-x.cost)<1e-9&&!x.p.saved&&!sec[i-1].p.saved);
  if(k>0){ const a=sec[k-1].p, b=sec[k].p; b.saved=true;
    const r2=planner.swapRank(sim,DB,P,day,'pouakai-tarns'), all2=r2.same.concat(r2.other,r2.rest).map(x=>x.p.id);
    ok(all2.indexOf(b.id)<all2.indexOf(a.id),`${pid}: marking ${b.id} saved did not lift it above equal-cost ${a.id}`); delete b.saved;
  } else console.log(`${pid}: no equal-cost unsaved pair to exercise the saved tie-break`);
  if(process.env.SWAP_DEBUG) all.slice(0,8).forEach(x=>console.log('  ',x.p.id,x.r.begin,x.r.dep,'start',x.start,'drop',x.drop.join(','),'breaks',x.breaks.map(b=>b.id+':'+b.w.k).join(','),'cost',Math.round(x.cost),'saved',!!x.p.saved));
  console.log(`${pid}: ${first.length} in the first section, ${r.rest.length} more; start-driven ${r.startDriven}`);
}
// an island stop is swapped for the same island only (R4: Waiheke offered mainland cafes)
{ const isle=p=>DB.ferries.find(f=>(f.ids||[]).indexOf(p.id)>=0||(p.area&&(f.areas||[]).indexOf(p.area)>=0))||null; let n=0;
  plans.plans.forEach(P=>DB.days.forEach(d=>sim.idsOf(d.date,P).forEach(id=>{ const f=isle(DB.places.get(id)); if(!f) return;
    const r=planner.swapRank(sim,DB,P,d,id); if(!r) return; n++;
    r.same.concat(r.other,r.rest).forEach(x=>ok(isle(x.p)===f,`${P.id} ${d.date}: island stop ${id} offered ${x.p.id} off the island`)); })));
  ok(n>0,'no island stop found to test'); }
console.log(fails?`${fails} of ${checks} checks failed`:`${checks} checks passed`);
process.exit(fails?1:0);
