/* GMLIST — pure parsers for importing Google Maps saved places, plus an offline area lookup.
   No DOM, no network, no dependencies: the same file runs in the page, in node (the test loads it
   with vm) and pasted verbatim into the Apps Script project as gmlist.gs, so client and server
   parse identically. Field paths are documented, with evidence, in research/gmaps-lists.md.
   Every parser returns items of one shape:
     {name, lat, lon, fid, note, address, cid, cc, url}
   lat/lon are null when the source has no coordinates (Takeout CSV): resolve them by fid with
   the Apps Script `gmplace` action. fid is Google's feature id "0x…:0x…"; cid is its decimal
   second half, which is what maps.google.com/?cid= takes. */
var gmlist=(function(){
'use strict';

/* ---------- small helpers ---------- */
// at(x, 1, 5, 2): a nested index read that never throws.
function at(x){ for(let i=1;i<arguments.length;i++){ if(x==null) return null; x=x[arguments[i]]; } return x===undefined?null:x; }
const str=v=>typeof v==='string'?v.trim():'';
const num=v=>{ const n=typeof v==='number'?v:parseFloat(v); return Number.isFinite(n)?n:null; };
const okLatLon=(lat,lon)=>lat!=null&&lon!=null&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&!(lat===0&&lon===0);

// Google's XSSI guard: )]}' then a newline.
function stripXssi(text){ return String(text||'').replace(/^\uFEFF?\s*\)\]\}'\s*/,''); }
function parseJsonSafe(text){ try{ return JSON.parse(stripXssi(text)); }catch(e){ return null; } }

// getlist carries the feature id as two signed 64-bit decimals; places and URLs as hex.
function fidFromPair(hi,lo){
  if(hi==null||lo==null) return null;
  try{ return '0x'+BigInt.asUintN(64,BigInt(hi)).toString(16)+':0x'+BigInt.asUintN(64,BigInt(lo)).toString(16); }
  catch(e){ return null; }
}
function cidFromFid(fid){
  const m=/^0x[0-9a-f]+:0x([0-9a-f]+)$/i.exec(fid||'');
  return m?BigInt('0x'+m[1]).toString(10):null;
}
function item(o){
  const lat=num(o.lat), lon=num(o.lon), ok=okLatLon(lat,lon), fid=o.fid||null;
  return {name:str(o.name), lat:ok?lat:null, lon:ok?lon:null, fid, note:str(o.note), address:str(o.address),
    cid:o.cid||cidFromFid(fid), cc:str(o.cc).toLowerCase()||null, url:o.url||null};
}

/* ---------- URLs ---------- */
// The list id of a resolved list URL: …/data=!4m3!11m2!2s<id>!3e3 or /maps/placelists/list/<id>.
function listIdFromUrl(url){
  const m=/!11m\d+!2s([A-Za-z0-9_-]{10,})|\/placelists\/list\/([A-Za-z0-9_-]{10,})/.exec(String(url||''));
  return m?(m[1]||m[2]):null;
}
// Whatever one Maps URL says about one place. Precedence: the place pin (!3d!4d), an explicit
// query point (?q=lat,lon or /search/lat,lon), then the viewport centre (@lat,lon) — the last one
// is the camera, not the place, and is flagged approx.
function parseMapsUrl(url){
  let u=String(url||''); try{ u=decodeURIComponent(u); }catch(e){}
  const out={fid:null,cid:null,lat:null,lon:null,name:'',approx:false,list:listIdFromUrl(u)};
  let m=/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i.exec(u)||/[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i.exec(u);
  if(m) out.fid=m[1].toLowerCase();
  if((m=/[?&]cid=(\d+)/.exec(u))) out.cid=m[1]; else out.cid=cidFromFid(out.fid);
  const LL='(-?\\d{1,2}(?:\\.\\d+)?),\\s*(-?\\d{1,3}(?:\\.\\d+)?)';
  if((m=/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(u))) { out.lat=+m[1]; out.lon=+m[2]; }
  else if((m=new RegExp('[?&](?:q|query|ll)='+LL+'(?:&|$)').exec(u))||(m=new RegExp('/search/'+LL+'(?:[/?]|$)').exec(u))) { out.lat=+m[1]; out.lon=+m[2]; }
  else if((m=new RegExp('/@'+LL).exec(u))) { out.lat=+m[1]; out.lon=+m[2]; out.approx=true; }
  if(!okLatLon(out.lat,out.lon)) { out.lat=out.lon=null; out.approx=false; }
  if((m=/\/maps\/place\/([^/@?]+)/.exec(u))&&!/^data=/.test(m[1])) out.name=m[1].replace(/\+/g,' ');
  else if((m=/[?&]q=([^&]+)/.exec(u))&&out.lat==null) out.name=m[1].replace(/\+/g,' ');
  return out;
}
// The one stable link for an imported place: ?cid= opens the place card, in the app on iPhone.
function gmapsUrl(it){
  if(it.cid) return 'https://maps.google.com/?cid='+it.cid;
  if(it.lat!=null) return 'https://www.google.com/maps/search/?api=1&query='+it.lat+','+it.lon;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(it.name);
}

/* ---------- shared list: /maps/preview/entitylist/getlist ---------- */
// d[0] list; d[0][4] title, [5] description, [12] item count, [8] items.
// item: [1][5] = [null,null,lat,lon], [1][6] = [hiSigned, loSigned], [1][4] (or [1][2]) address,
// [2] name, [3] note. d[1] is the next page's token (standard base64); it is empty on the last page.
function parseListMeta(text){
  const d=parseJsonSafe(text), L=at(d,0);
  if(!Array.isArray(L)) return {ok:false, error:at(d,2,0)===5?'not-found':'unreadable'};
  const items=at(L,8)||[], count=num(at(L,12));
  const token=str(at(d,1));
  return {ok:true, id:str(at(L,0,0)), title:str(at(L,4)), description:str(at(L,5)), count:count==null?items.length:count,
    returned:items.length, truncated:!!token, token:token||null};
}
// The getlist pb for one page of a list. Page 1 has no token; page n+1 puts the previous
// response's d[1], made URL-safe (+ -> -, / -> _, '=' stripped), as !5B right after !4i500.
// Verified on a 3,345-place list: 7 pages, no duplicates, the last page's d[1] empty.
const LIST_PAGE=500;
function pageToken(token){ return String(token||'').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function listPb(id,token){
  const t=pageToken(token);
  return '!1m4!1s'+id+'!2e1!3m1!1e1!2e2!3e2!4i'+LIST_PAGE+(t?'!5B'+t:'')+'!16b1';
}
function nextPagePb(id,token){ return token?listPb(id,token):null; }
function parseListPayload(text){
  const d=parseJsonSafe(text), rows=at(d,0,8);
  if(!Array.isArray(rows)) return [];
  return rows.map(r=>{
    const fid=fidFromPair(at(r,1,6,0),at(r,1,6,1));
    return item({name:at(r,2), note:at(r,3), lat:at(r,1,5,2), lon:at(r,1,5,3), fid,
      address:str(at(r,1,4))||str(at(r,1,2)), url:null});
  }).filter(it=>it.name||it.lat!=null);
}

/* ---------- one place: /maps/preview/place?pb=!1m1!1s<fid> (resolves Takeout CSV rows) ---------- */
// d[6] place: [11] name, [9] = [null,null,lat,lon], [10] fid, [39] address, [78] place id (ChIJ…),
// [243] country code; d[4][0] = [altitude, lon, lat] is the camera on the place.
function parsePlacePayload(text){
  const d=parseJsonSafe(text), p=at(d,6);
  if(!Array.isArray(p)) return null;
  const it=item({name:at(p,11), lat:at(p,9,2), lon:at(p,9,3), fid:str(at(p,10))||null,
    address:str(at(p,39))||(at(p,2)||[]).join(', '), cc:str(at(p,243))||str(at(p,183,1,6))});
  it.placeId=str(at(p,78))||null;
  return it;
}

/* ---------- Takeout: Saved/<list>.csv ---------- */
// RFC 4180: quoted fields, "" escapes, CRLF or LF, newlines inside quotes, optional BOM.
function csvRows(text){
  const s=String(text||'').replace(/^\uFEFF/,''), rows=[]; let row=[], f='', q=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(q){ if(c==='"'){ if(s[i+1]==='"'){ f+='"'; i++; } else q=false; } else if(!(c==='\r'&&s[i+1]==='\n')) f+=c; }
    else if(c==='"') q=true;
    else if(c===',') { row.push(f); f=''; }
    else if(c==='\n'||c==='\r') { if(c==='\r'&&s[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; }
    else f+=c;
  }
  if(f!==''||row.length) { row.push(f); rows.push(row); }
  return rows;
}
// The header is localized (en Title,Note,URL,Tags,Comment / ja タイトル,メモ,URL,タグ,コメント);
// the column order is not, so unknown headers fall back to position.
const CSV_COLS={title:['title','タイトル','名前'], note:['note','メモ'], url:['url'], tags:['tags','タグ'], comment:['comment','コメント']};
function parseTakeoutCsv(text){
  const rows=csvRows(text); if(!rows.length) return [];
  const head=rows[0].map(h=>h.trim().toLowerCase()), col={};
  Object.keys(CSV_COLS).forEach((k,pos)=>{ const i=head.findIndex(h=>CSV_COLS[k].indexOf(h)>=0); col[k]=i>=0?i:pos; });
  return rows.slice(1).map(r=>{
    const url=str(r[col.url]), u=parseMapsUrl(url);
    const note=[str(r[col.note]),str(r[col.comment])].filter(Boolean).join(' — ');
    return item({name:str(r[col.title])||u.name, note, lat:u.approx?null:u.lat, lon:u.approx?null:u.lon, fid:u.fid, cid:u.cid, url:url||null});
  }).filter(it=>it.name||it.url);
}

/* ---------- Takeout: Maps (your places)/Saved Places.json (ja: 保存した場所.json) ---------- */
// GeoJSON Points [lon,lat]. Current: properties.{date, google_maps_url, location{name,address,country_code}}.
// Older exports: properties.{Title, "Google Maps URL", Location{"Business Name", Address, "Country Code",
// "Geo Coordinates"{Latitude,Longitude}}}. A place with no position is [0,0] plus a Comment; its
// URL is then ?q=lat,lon (use it) or ?cid= (resolve it).
function parseSavedPlacesGeoJSON(text){
  let d; try{ d=typeof text==='string'?JSON.parse(text.replace(/^\uFEFF/,'')):text; }catch(e){ return []; }
  const fs=at(d,'features'); if(!Array.isArray(fs)) return [];
  return fs.map(f=>{
    const p=f.properties||{}, loc=p.location||p.Location||{}, geo=loc['Geo Coordinates']||{};
    const url=p.google_maps_url||p['Google Maps URL']||'', u=parseMapsUrl(url);
    let lon=num(at(f,'geometry','coordinates',0)), lat=num(at(f,'geometry','coordinates',1));
    if(!okLatLon(lat,lon)) { lat=num(geo.Latitude); lon=num(geo.Longitude); }
    if(!okLatLon(lat,lon)&&!u.approx) { lat=u.lat; lon=u.lon; }
    const name=str(loc.name)||str(loc['Business Name'])||str(p.Title)||u.name||(lat!=null?lat.toFixed(5)+', '+lon.toFixed(5):'');
    return item({name, lat, lon, fid:u.fid, cid:u.cid, address:loc.address||loc.Address,
      cc:loc.country_code||loc['Country Code'], note:'', url:url||null});
  }).filter(it=>it.name||it.url);
}

/* ---------- area: offline point-in-polygon against research/gm-regions.json ---------- */
// table = {v:1, areas:[{level:2|4, cc, code, name, nameJa, bbox:[w,s,e,n], rings:[[lon,lat,…],…]}]}.
// Even-odd across all of an area's rings, so holes and islands need no special case.
function inRings(rings,x,y){
  let inside=false;
  for(const r of rings){
    for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){
      const xi=r[i], yi=r[i+1], xj=r[j], yj=r[j+1];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
    }
  }
  return inside;
}
// → {cc, country, countryJa, region, regionCode, regionJa} or null when no area holds the point
// (then ask nominatimReverseUrl, or trust item.cc if the source gave one).
function regionOf(it,table){
  if(!it||it.lat==null||!table||!Array.isArray(table.areas)) return it&&it.cc?{cc:it.cc,country:it.cc.toUpperCase(),countryJa:'',region:null,regionCode:null,regionJa:null}:null;
  const x=it.lon, y=it.lat; let c=null, r=null;
  for(const a of table.areas){
    if(x<a.bbox[0]||x>a.bbox[2]||y<a.bbox[1]||y>a.bbox[3]) continue;
    if(a.level===2&&c) continue;
    if(a.level===4&&r) continue;
    if(inRings(a.rings,x,y)) { if(a.level===2) c=a; else r=a; }
  }
  if(!c&&r) c=table.areas.find(a=>a.level===2&&a.cc===r.cc)||{cc:r.cc,code:r.cc.toUpperCase(),name:r.cc.toUpperCase(),nameJa:''};
  if(!c) return it.cc?{cc:it.cc,country:it.cc.toUpperCase(),countryJa:'',region:null,regionCode:null,regionJa:null}:null;
  return {cc:c.cc, country:c.name, countryJa:c.nameJa, region:r?r.name:null, regionCode:r?r.code:null, regionJa:r?r.nameJa:null};
}
// Online fallback for points outside the table. Nominatim allows 1 request/s and sends CORS
// headers; zoom=5 is enough for country + state. The caller throttles and caches.
function nominatimReverseUrl(lat,lon,lang){
  return 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=5&addressdetails=1&accept-language='+(lang||'en')+'&lat='+(+lat).toFixed(4)+'&lon='+(+lon).toFixed(4);
}
function parseNominatimReverse(json){
  const a=json&&json.address; if(!a||!a.country_code) return null;
  return {cc:a.country_code, country:a.country||a.country_code.toUpperCase(), countryJa:'',
    region:a.state||a.province||a.region||null, regionCode:a['ISO3166-2-lvl4']||null, regionJa:null};
}
// The chooser in the preview: one row per country, then its regions, with counts.
function summarizeAreas(items,table){
  const out={}, none={cc:null,country:'?',n:0,regions:{}};
  for(const it of items){
    const a=it.area||regionOf(it,table);
    const c=a?(out[a.cc]=out[a.cc]||{cc:a.cc,country:a.country,countryJa:a.countryJa,n:0,regions:{}}):none;
    c.n++;
    const k=a&&a.regionCode||'?';
    const rg=c.regions[k]=c.regions[k]||{code:a&&a.regionCode,region:a&&a.region,regionJa:a&&a.regionJa,n:0};
    rg.n++;
  }
  const list=Object.keys(out).map(k=>out[k]); if(none.n) list.push(none);
  list.forEach(c=>{ c.regions=Object.keys(c.regions).map(k=>c.regions[k]).sort((a,b)=>b.n-a.n); });
  return list.sort((a,b)=>b.n-a.n);
}
// filter: {cc:'nz'} or {cc:'nz', regions:['NZ-AUK','NZ-NTL']}.
function filterByArea(items,table,filter){
  return items.filter(it=>{
    const a=it.area||regionOf(it,table);
    if(!a||a.cc!==filter.cc) return false;
    return !filter.regions||!filter.regions.length||filter.regions.indexOf(a.regionCode)>=0;
  });
}

return {parseListPayload, parseListMeta, listPb, nextPagePb, pageToken, parsePlacePayload, parseTakeoutCsv, parseSavedPlacesGeoJSON,
  parseMapsUrl, listIdFromUrl, fidFromPair, cidFromFid, gmapsUrl, csvRows,
  regionOf, nominatimReverseUrl, parseNominatimReverse, summarizeAreas, filterByArea};
})();
