// node tools/gmlist.test.js — gmlist.js against the fixtures in tools/fixtures/.
// gmlist.js is a classic script (no exports), so it is loaded into a vm context, as a page would.
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
const ROOT=path.join(__dirname,'..'), FX=f=>fs.readFileSync(path.join(ROOT,'tools','fixtures',f),'utf8');
const ctx={BigInt}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'gmlist.js'),'utf8'),ctx,{filename:'gmlist.js'});
const G=ctx.gmlist, TABLE=JSON.parse(fs.readFileSync(path.join(ROOT,'research','gm-regions.json'),'utf8'));

let pass=0, fail=0;
function t(name,fn){ try{ fn(); pass++; console.log('ok   '+name); }catch(e){ fail++; console.log('FAIL '+name+'\n     '+(e.message||e)); } }
// Values from the vm realm have foreign prototypes; compare them as plain JSON.
const plain=v=>v===undefined?v:JSON.parse(JSON.stringify(v));
const eq=(a,b,m)=>m===undefined?assert.deepStrictEqual(plain(a),plain(b)):assert.deepStrictEqual(plain(a),plain(b),m);

/* shared list */
const LIST=FX('getlist-auckland-skateparks.txt');
t('list meta', ()=>{
  const m=G.parseListMeta(LIST);
  eq([m.ok,m.id,m.title,m.count,m.returned,m.truncated],[true,'68_EV1Wa-SSrL5EmTF88uA','Auckland Skateparks',59,59,false]);
});
t('list items: 59 with name, coordinates and fid', ()=>{
  const it=G.parseListPayload(LIST);
  eq(it.length,59);
  assert(it.every(x=>x.name&&x.lat<-34&&x.lat>-38&&x.lon>173&&x.lon<176&&/^0x[0-9a-f]+:0x[0-9a-f]+$/.test(x.fid)));
});
t('list item fields', ()=>{
  const it=G.parseListPayload(LIST);
  const maz=it[0];
  eq([maz.name,maz.lat,maz.lon,maz.note,maz.fid,maz.cid],
     ['MAZ Skate Park',-36.1028526,174.5857853,'Epic','0x6d0c954873066fdf:0x7f838154da309983','9188329866203797891']);
  const onehunga=it.find(x=>x.name==='Onehunga Vert Ramp Skatepark');
  eq(onehunga.fid,'0x6d0d48ab4c310519:0x8d576d511c204533', 'negative low half wraps to unsigned');
  const bob=it.find(x=>x.name==='Bob Hill Reserve Skate Park');
  eq(bob.address,'83 Portage Road, New Lynn, Auckland 0600');
  eq(it.filter(x=>x.address).length,8);
});
t('truncated page exposes its continuation token', ()=>{
  const m=G.parseListMeta(FX('getlist-page10.txt'));
  eq([m.returned,m.count,m.truncated,typeof m.token],[10,59,true,'string']);
  eq(G.parseListPayload(FX('getlist-page10.txt')).length,10);
});
t('next page: token goes URL-safe as !5B right after !4i500; the rest of the pb is unchanged', ()=>{
  const id='68_EV1Wa-SSrL5EmTF88uA', m=G.parseListMeta(FX('getlist-page10.txt'));
  eq(G.listPb(id),'!1m4!1s'+id+'!2e1!3m1!1e1!2e2!3e2!4i500!16b1');
  const pb=G.nextPagePb(id,m.token), safe=m.token.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  eq(pb,'!1m4!1s'+id+'!2e1!3m1!1e1!2e2!3e2!4i500!5B'+safe+'!16b1');
  eq(/[+/=]/.test(pb.slice(pb.indexOf('!5B'))),false,'no +, / or = left in the token');
  eq(m.token.indexOf('/')>=0,true,'the fixture token exercises the / -> _ rule');
  eq(G.pageToken('ab+c/d=='),'ab-c_d');
  eq(G.nextPagePb(id,null),null);
});
t('last page: empty d[1] means no token and no next page', ()=>{
  const m=G.parseListMeta(FX('getlist-lastpage.txt'));
  eq([m.ok,m.token,m.truncated],[true,null,false]);
  eq(G.nextPagePb(m.id,m.token),null);
});
t('missing list', ()=>{
  eq(G.parseListMeta(FX('getlist-missing.txt')),{ok:false,error:'not-found'});
  eq(G.parseListPayload(FX('getlist-missing.txt')),[]);
  eq(G.parseListPayload('<html>consent</html>'),[]);
});

/* URLs */
t('list id from resolved URLs', ()=>{
  eq(G.listIdFromUrl('https://www.google.com/maps/@/data=!3m1!4b1!4m3!11m2!2s68_EV1Wa-SSrL5EmTF88uA!3e3?entry=tts'),'68_EV1Wa-SSrL5EmTF88uA');
  eq(G.listIdFromUrl('https://www.google.com/maps/placelists/list/68_EV1Wa-SSrL5EmTF88uA'),'68_EV1Wa-SSrL5EmTF88uA');
  eq(G.listIdFromUrl('https://www.google.com/maps/place/Orbit/data=!4m6!3m5!1s0x6d0d47f06d5557d7:0xe90ddd02b60f34ad!16s%2Fg%2F1tgx263s'),null);
});
t('single-place share URLs', ()=>{
  const a=G.parseMapsUrl('https://www.google.com/maps/place/Orbit+360%C2%B0+Dining/@-36.8484982,174.7596047,615m/data=!3m2!1e3!4b1!4m6!3m5!1s0x6d0d47f06d5557d7:0xe90ddd02b60f34ad!8m2!3d-36.8484982!4d174.7621796!16s%2Fg%2F1tgx263s');
  eq([a.name,a.lat,a.lon,a.fid,a.approx],['Orbit 360° Dining',-36.8484982,174.7621796,'0x6d0d47f06d5557d7:0xe90ddd02b60f34ad',false]);
  const b=G.parseMapsUrl("https://maps.google.com/?q=Hot+'n'+Cold+201+Waiotapu+Loop+Road,+Waiotapu+3073,+New+Zealand&ftid=0x6d6ea46e181b94ef:0x3071fb2115d77ad8&entry=gps");
  eq([b.fid,b.lat,b.cid],['0x6d6ea46e181b94ef:0x3071fb2115d77ad8',null,'3490847305707780824']);
  const c=G.parseMapsUrl("https://www.google.com/maps/place/Okinawa+Prefectural+People's+Forest/@26.438974,127.3379816,190057m/data=!3m1");
  eq([c.lat,c.approx],[26.438974,true], '@ is the camera, flagged approx');
});

/* place payload */
t('place payload', ()=>{
  const p=G.parsePlacePayload(FX('place-orbit.txt'));
  eq([p.name,p.lat,p.lon,p.fid,p.cc,p.placeId],['Orbit 360° Dining',-36.8484982,174.7621796,'0x6d0d47f06d5557d7:0xe90ddd02b60f34ad','nz','ChIJ11dVbfBHDW0RrTQPtgLdDek']);
  assert(/Victoria Street West/.test(p.address));
});

/* Takeout CSV */
t('takeout csv (en): quotes, embedded newline, blank row, dropped pin', ()=>{
  const r=G.parseTakeoutCsv(FX('takeout-saved-en.csv'));
  eq(r.length,4);
  eq([r[0].name,r[0].note,r[0].fid,r[0].lat],['Orbit 360° Dining','Sky Tower','0x6d0d47f06d5557d7:0xe90ddd02b60f34ad',null]);
  eq([r[1].name,r[1].note],['Hot n Cold, Waiotapu','Free hot stream; "swim" at dusk']);
  eq(r[2].note,'two-line\nnote');
  eq([r[3].lat,r[3].lon,r[3].fid],[-39.2387,174.0421,null]);
});
t('takeout csv (ja header, BOM)', ()=>{
  const r=G.parseTakeoutCsv(FX('takeout-saved-ja.csv'));
  eq(r.map(x=>x.name),['ワインショップ イデア','99 Station Road']);
  eq(r[0].note,'芦屋');
  eq(r[0].fid,'0x6000ef9644d05703:0xee952ee36963f3d2');
});

/* Takeout GeoJSON */
t('saved places geojson: current, [0,0] with ?q=, [0,0] with cid only, legacy', ()=>{
  const r=G.parseSavedPlacesGeoJSON(FX('saved-places.json'));
  eq(r.length,4);
  eq([r[0].name,r[0].lat,r[0].lon,r[0].cc,r[0].cid],['Orbit 360° Dining',-36.8484982,174.7621796,'nz','16793321589248570541']);
  eq([r[1].lat,r[1].lon],[-39.0556,174.0752]);
  eq([r[2].lat,r[2].cid],[null,'3490847305707780824']);
  eq([r[3].name,r[3].lat,r[3].cc],['Hot n Cold',-38.3577,'nz']);
});

/* area */
t('regionOf: offline table', ()=>{
  const R=(lat,lon)=>{ const a=G.regionOf({lat,lon},TABLE); return a&&[a.cc,a.regionCode]; };
  eq(R(-36.90939,174.68405),['nz','NZ-AUK'],'New Lynn');
  eq(R(-36.79,175.04),['nz','NZ-AUK'],'Waiheke');
  eq(R(-36.1028526,174.5857853),['nz','NZ-NTL'],'MAZ (Mangawhai) is Northland');
  eq(R(-39.0556,174.0752),['nz','NZ-TKI'],'New Plymouth');
  eq(R(-38.6857,176.0702),['nz','NZ-WKO'],'Taupō');
  eq(R(-37.8736,175.6833),['nz','NZ-WKO'],'Hobbiton');
  eq(R(35.6812,139.7671),['jp',null],'Tokyo');
  eq(R(34.7370,135.3074),['jp',null],'Ashiya');
  eq(R(-33.8688,151.2093),['au',null],'Sydney');
  eq(R(47.6062,-122.3321),null,'Seattle is outside the table');
  eq(G.regionOf({lat:null,lon:null,cc:'nz'},TABLE).cc,'nz','falls back to the source cc');
});
t('summarize and filter the real list', ()=>{
  const it=G.parseListPayload(LIST);
  const s=G.summarizeAreas(it,TABLE);
  eq(s.length,1); eq(s[0].cc,'nz'); eq(s[0].n,59);
  const codes=s[0].regions.map(r=>r.code);
  assert(codes.indexOf('NZ-AUK')>=0&&codes.indexOf('NZ-NTL')>=0, codes.join());
  const auk=G.filterByArea(it,TABLE,{cc:'nz',regions:['NZ-AUK']});
  const n=s[0].regions.find(r=>r.code==='NZ-AUK').n;
  eq(auk.length,n); assert(n<59&&n>40);
  eq(G.filterByArea(it,TABLE,{cc:'jp'}).length,0);
});
t('nominatim fallback helpers', ()=>{
  assert(/reverse\?format=jsonv2&zoom=5.*lat=-36\.1029&lon=174\.5858$/.test(G.nominatimReverseUrl(-36.1028526,174.5857853)));
  eq(G.parseNominatimReverse({address:{county:'Kaipara District',state:'Northland','ISO3166-2-lvl4':'NZ-NTL',country:'New Zealand',country_code:'nz'}}),
     {cc:'nz',country:'New Zealand',countryJa:'',region:'Northland',regionCode:'NZ-NTL',regionJa:null});
  eq(G.parseNominatimReverse({address:{province:'Tokyo','ISO3166-2-lvl4':'JP-13',country:'Japan',country_code:'jp'}}).regionCode,'JP-13');
});

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
