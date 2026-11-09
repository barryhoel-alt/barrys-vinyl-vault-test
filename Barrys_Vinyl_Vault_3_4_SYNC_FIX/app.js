/* Barry's Vinyl Vault 2.1 - no external libraries */
const STORE='barry_vinyl_vault_v33_cloud_local', OLD='barry_vinyl_vault_v33_cloud_local';
const FIELDS=[['id','Inventory ID'],['mediaType','Media type (Vinyl / CD / Cassette / DVD / Blu-ray / Other)'],['genre','Genre'],['tags','Tags / keywords'],['artist','Artist'],['album','Album title'],['barcode','Barcode (UPC / EAN)'],['year','Release year'],['pressing','Pressing / edition'],['country','Pressing country'],['label','Record label'],['catalogNumber','Catalog number'],['matrixRunout','Matrix / runout (etched or stamped)','textarea'],['vinylSpeed','Speed (33⅓ / 45 / 78 RPM)'],['vinylFormat','Format / size (12-inch LP, 7-inch, etc.)'],['editionDetails','Edition / variant notes','textarea'],['signedBy','Signed by / autograph details'],['pressingVerified','Pressing verification (unverified / sleeve checked / runout checked)'],['originalOrReissue','Original pressing / reissue / unknown'],['musicbrainzReleaseId','MusicBrainz release ID'],['color','Vinyl colour'],['discs','Discs'],['condition','Media condition'],['sleeveCondition','Sleeve condition'],['playback','Playback / distortion notes','textarea'],['cleaned','Cleaning history'],['paid','Price paid (CAD)'],['quantity','Quantity'],['value','Estimated market value (CAD)'],['location','Storage location'],['cover','Front cover image URL'],['backCover','Back cover image URL'],['labelPhoto','Record label photo URL'],['signaturePhoto','Autograph photo URL'],['purchaseDate','Purchase date'],['purchaseSource','Purchased from'],['insuranceNotes','Insurance / provenance notes','textarea'],['tracks','Track listing','textarea'],['notes','Notes','textarea']];
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],editing=null,localCover=null,coverRemoved=false,installEvent=null;let lookupBusy=false,stopLookup=false,lookupCandidates=[];
const notify=msg=>{const t=$('toast');t.textContent=msg;t.style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.style.display='none',3200)};
function save(){try{localStorage.setItem(STORE,JSON.stringify(records));if(window.vaultCloudChanged)window.vaultCloudChanged();return true}catch(e){alert('Storage is full or unavailable. Export a backup before continuing.');return false}}
async function load(){try{const stored=localStorage.getItem(STORE);records=stored?JSON.parse(stored):[];if(!Array.isArray(records))records=[]}catch(e){records=[]}render();window.dispatchEvent(new Event('vaultLoaded'))}
function sortedRecords(){const q=$('search').value.trim().toLowerCase(),f=$('filter').value,s=$('sort').value;return records.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q))).filter(r=>f==='all'||(f==='covers'&&r.cover)||(f==='missing'&&!r.cover)||(f==='issues'&&r.playback)).sort((a,b)=>s==='year'?(Number(a.year)||9999)-(Number(b.year)||9999):String(a[s]||'').localeCompare(String(b[s]||''),undefined,{numeric:true,sensitivity:'base'}))}
function render(){const sum=records.reduce((n,r)=>n+(Number(r.value)||0),0);$('total').textContent=records.length;$('worth').textContent=sum?'$'+sum.toLocaleString('en-CA'):'—';$('issues').textContent=records.filter(r=>r.playback&&String(r.playback).trim()).length;const rows=sortedRecords();$('gallery').innerHTML=rows.map(r=>`<button class="album" data-id="${esc(r.id)}"><div class="cover">${r.cover?`<img loading="lazy" src="${esc(r.cover)}" alt="Cover of ${esc(r.album)}" onerror="this.style.display='none'">`:'<span class="placeholder">♫</span>'}<span class="id">${esc(r.id)}</span></div><div class="albuminfo"><span class="artist">${esc(r.artist)}</span><strong>${esc(r.album)}</strong><small>${esc(r.year)} · ${esc(r.pressing||'')}</small></div></button>`).join('')||'<div class="empty">No records match your search.</div>'}
function nextId(){return 'LP-'+String(Math.max(114,...records.map(r=>parseInt(String(r.id).replace('LP-',''),10)||0))+1).padStart(4,'0')}
function openEditor(id){editing=id;localCover=null;coverRemoved=false;const r=id?records.find(x=>x.id===id):{};$('editTitle').textContent=id?'Edit '+id:'Add a record';$('fields').innerHTML=FIELDS.map(([key,label,kind])=>`<label class="${kind==='textarea'?'wide':''}">${esc(label)}${kind==='textarea'?`<textarea name="${key}" rows="3">${esc(r[key]||'')}</textarea>`:`<input name="${key}" value="${esc(key==='id'&&!id?nextId():r[key]||'')}" ${key==='id'&&id?'readonly':''} ${['id','artist','album'].includes(key)?'required':''}>`}</label>`).join('');// Move barcode input into the scan-first panel while preserving its form name.
 const barcodeLabel=$('fields').querySelector('[name="barcode"]')?.closest('label');
 if(barcodeLabel)$('barcodeFieldSlot').replaceChildren(barcodeLabel);
 const advancedKeys=['pressing','country','label','catalogNumber','matrixRunout','vinylSpeed','vinylFormat','editionDetails','signedBy','pressingVerified','originalOrReissue','musicbrainzReleaseId','color','discs','condition','sleeveCondition','playback','cleaned','paid','quantity','value','location','backCover','labelPhoto','signaturePhoto','purchaseDate','purchaseSource','insuranceNotes','notes'];
 const details=document.createElement('details');details.className='pressing-details';
 const summary=document.createElement('summary');summary.textContent='Advanced pressing details, condition & value';details.append(summary);
 const advanced=document.createElement('div');advanced.className='advanced-grid';details.append(advanced);
 for(const key of advancedKeys){const label=$('fields').querySelector('[name="'+key+'"]')?.closest('label');if(label)advanced.append(label)}
 $('fields').append(details);
 $('editor').querySelector('.dialogbody').scrollTop=0;
 $('barcodeStatus').textContent='';$('barcodeMatches').replaceChildren();
 $('delete').hidden=!id;$('coverFile').value='';preview(r.cover||'');$('lookupResults').textContent='';$('editor').showModal()}
function preview(src){$('preview').src=src||'';$('preview').classList.toggle('hidden',!src)}
$('coverFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/'))return alert('Choose an image file');try{const img=await createImageBitmap(f);const canvas=document.createElement('canvas');const scale=Math.min(1,700/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);localCover=canvas.toDataURL('image/jpeg',.72);coverRemoved=false;preview(localCover)}catch(err){alert('Could not read the image: '+err.message)}};
$('removeCover').onclick=()=>{coverRemoved=true;localCover=null;preview('')};
$('recordForm').onsubmit=e=>{e.preventDefault();const r=Object.fromEntries(new FormData($('recordForm')).entries());r.id=r.id.trim().toUpperCase();if(!/^LP-\d{4,}$/.test(r.id))return alert('Use an ID like LP-0115');if(records.some(x=>x.id===r.id&&x.id!==editing))return alert('That inventory ID is already used');if(localCover)r.cover=localCover;else if(coverRemoved)r.cover='';if(editing){const i=records.findIndex(x=>x.id===editing);if(i>=0)records[i]={...records[i],...r}}else records.push(r);if(save()){$('editor').close();render();notify('Record saved')}};
$('delete').onclick=()=>{if(editing&&confirm('Delete '+editing+'? This inventory number will not be automatically reused.')){records=records.filter(r=>r.id!==editing);save();$('editor').close();render()}};
$('cancel').onclick=$('close').onclick=()=>$('editor').close();$('add').onclick=()=>openEditor(null);$('gallery').onclick=e=>{const card=e.target.closest('[data-id]');if(card)openEditor(card.dataset.id)};$('search').oninput=$('sort').onchange=$('filter').onchange=render;
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('backup').onclick=()=>download('Barrys_Vinyl_Vault_Backup.json',JSON.stringify({format:'BarrysVinylVault',version:3,exported:new Date().toISOString(),records},null,2),'application/json');
$('csv').onclick=()=>{const keys=FIELDS.map(f=>f[0]);const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download('Barrys_Vinyl_Vault.csv',[keys.map(q).join(','),...records.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n'),'text/csv')};
$('import').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text()),arr=Array.isArray(obj)?obj:obj.records;if(!Array.isArray(arr)||!arr.every(r=>r&&typeof r.id==='string'&&typeof r.artist==='string'&&typeof r.album==='string'))throw Error('Not a valid Vinyl Vault backup');if(new Set(arr.map(r=>r.id)).size!==arr.length)throw Error('Duplicate LP numbers');if(confirm('Replace all '+records.length+' current records with '+arr.length+' records from this backup?')){records=arr;save();render();notify('Backup restored')}}catch(err){alert('Restore failed: '+err.message)}e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('install').classList.remove('hidden')});$('install').onclick=async()=>{if(installEvent){installEvent.prompt();await installEvent.userChoice;installEvent=null;$('install').classList.add('hidden')}};
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
load();


// MusicBrainz + Cover Art Archive: network lookups are opt-in; existing values are preserved.
const MB='https://musicbrainz.org/ws/2';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastMB=0;
async function mbFetch(path){
  const elapsed=Date.now()-lastMB;if(elapsed<1250)await wait(1250-elapsed);
  lastMB=Date.now();
  const response=await fetch(MB+path,{headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('MusicBrainz returned '+response.status);
  return response.json();
}
function clean(s){return String(s||'').normalize('NFKD').replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase()}
function scoreRelease(r,artist,album){
  const a=clean(r.title),target=clean(album),credits=(r['artist-credit']||[]).map(x=>x.name||'').join(' ');
  let score=Number(r.score||0);
  if(a===target)score+=55;else if(a.includes(target)||target.includes(a))score+=10;
  if(clean(credits)===clean(artist))score+=35;
  if((r.media||[]).some(m=>/vinyl/i.test(m.format||'')))score+=25;
  return score;
}
async function searchReleases(artist,album){
  const query='artist:"'+artist.replace(/"/g,'')+'" AND release:"'+album.replace(/"/g,'')+'"';
  const data=await mbFetch('/release/?query='+encodeURIComponent(query)+'&fmt=json&limit=15');
  return (data.releases||[]).sort((a,b)=>scoreRelease(b,artist,album)-scoreRelease(a,artist,album));
}
function releaseLabel(r){
  const media=(r.media||[]).map(m=>m.format).filter(Boolean).join(', ');
  return [r.date||'Unknown year',r.country||'Unknown country',media||'Format unspecified',r['label-info']?.[0]?.['catalog-number']||''].filter(Boolean).join(' · ');
}
async function coverForRelease(id,groupId){
  for(const path of [id?'release/'+id:null,groupId?'release-group/'+groupId:null].filter(Boolean)){
    try{const res=await fetch('https://coverartarchive.org/'+path,{headers:{Accept:'application/json'}});
      if(!res.ok)continue;
      const data=await res.json();const front=(data.images||[]).find(x=>x.front)||(data.images||[])[0];
      if(front)return front.thumbnails?.['500']||front.thumbnails?.large||front.thumbnails?.small||front.image||'';
    }catch(e){} 
  }
  return '';
}
async function releaseDetails(candidate){
  const data=await mbFetch('/release/'+encodeURIComponent(candidate.id)+'?inc=recordings+artist-credits&fmt=json');
  const tracks=[];
  for(let i=0;i<(data.media||[]).length;i++){
    const medium=data.media[i],items=medium.tracks||[];
    if(!items.length)continue;
    const disc=(data.media||[]).length>1?'Disc '+(i+1)+' — ':'';
    const side=medium.format&&/vinyl/i.test(medium.format)?'Vinyl — ':'';
    tracks.push(disc+side+(medium.title||'Track listing'));
    for(const t of items){
      const duration=t.length?` (${Math.floor(t.length/60000)}:${String(Math.floor(t.length/1000)%60).padStart(2,'0')})`:'';
      tracks.push((t.number||t.position||'')+'. '+(t.title||t.recording?.title||'Unknown track')+duration);
    }
    tracks.push('');
  }
  return {tracks:tracks.join('\n').trim(),cover:await coverForRelease(candidate.id,candidate['release-group']?.id)};
}
function formRecord(){return Object.fromEntries(new FormData($('recordForm')).entries())}
$('lookup').onclick=async()=>{
  if(lookupBusy)return;
  const r=formRecord(),out=$('lookupResults');
  if(!r.artist?.trim()||!r.album?.trim())return notify('Enter an artist and album first');
  lookupBusy=true;$('lookup').disabled=true;out.textContent='Searching for matching releases…';
  try{
    lookupCandidates=await searchReleases(r.artist,r.album);
    if(!lookupCandidates.length){out.textContent='No matching release found. Try simplifying the album title or use your own artwork.';return}
    out.innerHTML='<p class="hint">Select the release that matches your LP. Different countries and reissues can have different tracks.</p>'+lookupCandidates.slice(0,8).map((x,i)=>`<button type="button" class="lookup-choice" data-release="${i}">${esc(x.title)}<small>${esc(releaseLabel(x))}</small></button>`).join('');
  }catch(e){out.textContent='Lookup failed: '+e.message+'. Check your internet connection.'}
  finally{lookupBusy=false;$('lookup').disabled=false}
};
$('lookupResults').onclick=async e=>{
  const button=e.target.closest('[data-release]');if(!button||lookupBusy)return;
  const candidate=lookupCandidates[Number(button.dataset.release)],out=$('lookupResults');
  lookupBusy=true;$('lookup').disabled=true;out.textContent='Retrieving tracks and artwork…';
  try{
    const details=await releaseDetails(candidate),r=formRecord();
    let applied=[];
    if(details.tracks){
      const field=$('fields').querySelector('[name="tracks"]');
      if(!field.value.trim()||confirm('Replace the existing track listing with this release’s track listing?')){field.value=details.tracks;applied.push('tracks')}
    }
    if(details.cover){
      const field=$('fields').querySelector('[name="cover"]');
      if((!field.value.trim()&&!localCover)||confirm('Replace the existing cover with the artwork from this release?')){
        field.value=details.cover;localCover=null;coverRemoved=false;preview(details.cover);applied.push('cover')
      }
    }
    out.innerHTML='<p class="lookup-warn">'+esc(applied.length?'Added '+applied.join(' and ')+'. Click Save record to keep the changes.':'No new artwork or tracks were available for this release.')+'</p><p class="hint">Match: '+esc(candidate.title+' · '+releaseLabel(candidate))+'</p>';
  }catch(err){out.textContent='Could not retrieve release details: '+err.message}
  finally{lookupBusy=false;$('lookup').disabled=false}
};
// Bulk lookup deliberately selects only a high-confidence title+artist match.
// No existing track listing or cover is overwritten; progress is saved after each record.
$('enrich').onclick=async()=>{
  if(lookupBusy)return;
  if(!confirm('Search MusicBrainz for missing covers and track listings? This may take several minutes and requires internet. Check results afterward, especially original and special pressings.'))return;
  stopLookup=false;lookupBusy=true;$('enrich').disabled=true;$('stopEnrich').classList.remove('hidden');
  const targets=records.filter(r=>!r.cover||!r.tracks);let updated=0,errors=0;
  try{
    for(let i=0;i<targets.length;i++){
      if(stopLookup)break;
      const r=targets[i];$('lookupStatus').textContent=`Searching ${i+1} of ${targets.length}: ${r.artist} — ${r.album} (${updated} updated)`;
      try{
        const candidates=await searchReleases(r.artist,r.album);
        const chosen=candidates.find(c=>clean(c.title)===clean(r.album)&&clean((c['artist-credit']||[]).map(x=>x.name||'').join(' '))===clean(r.artist)&&(c.media||[]).some(m=>/vinyl/i.test(m.format||'')));
        if(!chosen)continue;
        const details=await releaseDetails(chosen);
        let changed=false;
        if(!r.cover&&details.cover){r.cover=details.cover;changed=true}
        if(!r.tracks&&details.tracks){r.tracks=details.tracks;changed=true}
        if(changed){updated++;save();render()}
      }catch(e){errors++}
    }
  }finally{
    lookupBusy=false;$('enrich').disabled=false;$('stopEnrich').classList.add('hidden');
    $('lookupStatus').textContent=`Lookup ${stopLookup?'stopped':'finished'}: ${updated} records updated; ${errors} lookup errors. Review tracks against your actual LP pressing. Export a backup.`;
  }
};
$('stopEnrich').onclick=()=>{stopLookup=true;$('lookupStatus').textContent='Stopping after the current album…'};


// Vinyl Vault 2.3.1 — Canadian values, listening history and optional cloud sync.
const cad=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
$('valuation').onclick=()=>{
 const paid=records.reduce((a,r)=>a+(Number(r.paid)||0),0),estimated=records.reduce((a,r)=>a+(Number(r.value)||0),0);
 const priced=records.filter(r=>Number(r.value)>0).length;
 alert('Canadian vinyl valuation (your estimates, not live market quotes)\n\nAlbums with estimates: '+priced+'/'+records.length+'\nTotal entered purchase prices: '+cad(paid)+'\nTotal entered estimated values: '+cad(estimated)+'\nDifference: '+cad(estimated-paid)+'\n\nEdit any album to enter its purchase price and estimated CAD value.');
};
function historyRender(){
 const id=$('historyAlbum').value,r=records.find(x=>x.id===id),entries=r?.listens||[];
 $('historyEntries').innerHTML='<h3>'+esc(r?.artist||'')+' — '+esc(r?.album||'')+'</h3>'+(!entries.length?'<p class="hint">No listening sessions yet.</p>':entries.slice().reverse().map(x=>'<div style="padding:10px;border-bottom:1px solid #455369"><strong>'+esc(x.date)+' · '+esc(x.condition)+'</strong><div>'+esc(x.note)+'</div></div>').join(''));
}
$('history').onclick=()=>{const sel=$('historyAlbum');sel.innerHTML=records.slice().sort((a,b)=>a.artist.localeCompare(b.artist)).map(r=>'<option value="'+esc(r.id)+'">'+esc(r.artist+' — '+r.album+' ('+r.id+')')+'</option>').join('');$('historyDate').value=new Date().toISOString().slice(0,10);historyRender();$('historyDialog').showModal()};
$('historyAlbum').onchange=historyRender;
$('historyClose').onclick=()=>$('historyDialog').close();
$('historyAdd').onclick=()=>{const r=records.find(x=>x.id===$('historyAlbum').value);if(!r)return;const date=$('historyDate').value;if(!date)return alert('Select a date');(r.listens??=[]).push({date,condition:$('historyCondition').value,note:$('historyNote').value.trim()});if(save()){render();historyRender();$('historyNote').value='';notify('Listening session saved')}};
// Cloud backend: Supabase Auth + owner-only RLS-protected JSON row.
// Cloud sync intentionally disabled in 2.6 TEST. No Supabase credentials or writes.
// Cloud synchronization is implemented in cloud.js; no writes before explicit cloud download.

// Barcode features: native camera scanner when available; manual entry always works.
let barcodeStream=null,barcodeScanActive=false,barcodeMatches=[];
const barcodeStatus=message=>{$('barcodeStatus').textContent=message};
const barcodeField=()=>$('recordForm').querySelector('[name="barcode"]');
const normalizeBarcode=value=>String(value||'').replace(/[\s-]/g,'');
const validBarcode=value=>/^\d{8,14}$/.test(value);
function barcodeReleaseText(r){
 const artist=(r['artist-credit']||[]).map(x=>typeof x==='string'?x:(x.name||x.artist?.name||'')).join('').trim();
 return {artist,album:r.title||'',year:(r.date||'').slice(0,4),pressing:[r.country,(r.media||[]).map(x=>x.format).filter(Boolean).join(', '),r['label-info']?.[0]?.['catalog-number']].filter(Boolean).join(' · '),country:r.country||'',label:r['label-info']?.[0]?.label?.name||'',catalogNumber:r['label-info']?.[0]?.['catalog-number']||'',vinylFormat:(r.media||[]).map(x=>x.format).filter(Boolean).join(', '),musicbrainzReleaseId:r.id||''};
}
$('findBarcode').onclick=async()=>{
 const value=normalizeBarcode(barcodeField()?.value);
 if(!validBarcode(value))return barcodeStatus('Enter a UPC/EAN barcode containing 8 to 14 digits.');
 barcodeField().value=value;
 const output=$('barcodeMatches');output.replaceChildren();barcodeStatus('Searching MusicBrainz for barcode '+value+'…');$('findBarcode').disabled=true;
 try{
  const data=await mbFetch('/release/?query='+encodeURIComponent('barcode:'+value)+'&fmt=json&limit=20');
  barcodeMatches=(data.releases||[]).filter(r=>normalizeBarcode(r.barcode)===value);
  if(!barcodeMatches.length){barcodeStatus('No exact barcode match found. You can still enter the album manually.');return}
  barcodeStatus(barcodeMatches.length+' matching releases. Select the correct pressing; nothing is saved automatically.');
  output.innerHTML=barcodeMatches.slice(0,12).map((r,i)=>{const d=barcodeReleaseText(r);return '<button type="button" class="lookup-choice" data-barcode-match="'+i+'">'+esc(d.artist+' — '+d.album)+'<small>'+esc([d.year,d.pressing].filter(Boolean).join(' · '))+'</small></button>'}).join('');
 }catch(e){barcodeStatus('Lookup failed: '+e.message+'. Enter details manually if necessary.')}
 finally{$('findBarcode').disabled=false}
};
$('barcodeMatches').onclick=async e=>{
 const button=e.target.closest('[data-barcode-match]');if(!button||button.disabled)return;
 const r=barcodeMatches[Number(button.dataset.barcodeMatch)];if(!r)return;
 const d=barcodeReleaseText(r),form=$('fields');
 const changes=[['artist',d.artist],['album',d.album],['year',d.year],['pressing',d.pressing],['country',d.country],['label',d.label],['catalogNumber',d.catalogNumber],['vinylFormat',d.vinylFormat],['musicbrainzReleaseId',d.musicbrainzReleaseId]];
 const existing=changes.some(([key,val])=>val&&form.querySelector('[name="'+key+'"]')?.value.trim());
 if(existing&&!confirm('Replace existing album details with this barcode match? Inventory ID and other fields are preserved.'))return;
 for(const [key,val] of changes)if(val){const field=form.querySelector('[name="'+key+'"]');if(field)field.value=val;}
 barcodeStatus('Album details filled. Retrieving matching pressing artwork and tracks…');
 const buttons=[...$('barcodeMatches').querySelectorAll('[data-barcode-match]')];buttons.forEach(b=>b.disabled=true);
 try{
  const details=await releaseDetails(r);
  let applied=[];
  const tracks=form.querySelector('[name="tracks"]');
  if(details.tracks){
   if(!tracks.value.trim()||confirm('Replace the existing track listing with the track listing for this pressing?')){
    tracks.value=details.tracks;applied.push('track listing');
   }
  }
  const cover=form.querySelector('[name="cover"]');
  if(details.cover){
   if((!cover.value.trim()&&!localCover)||confirm('Replace the existing album cover with artwork for this pressing?')){
    cover.value=details.cover;localCover=null;coverRemoved=false;preview(details.cover);applied.push('cover artwork');
   }
  }
  barcodeStatus('Selected '+d.album+'. Verify country, label and catalog number against your sleeve; inspect the actual runout to confirm an original pressing. '+(applied.length?'Added '+applied.join(' and ')+'. ':'No new artwork or tracks were available. ')+'Verify the pressing and click Save record when ready.');
 }catch(err){barcodeStatus('Album details filled, but artwork/tracks could not be retrieved: '+err.message+'. You can still use Search this album.');}
 finally{buttons.forEach(b=>b.disabled=false)}
};
async function stopBarcodeCamera(){
 barcodeScanActive=false;
 if(barcodeStream){barcodeStream.getTracks().forEach(t=>t.stop());barcodeStream=null}
 $('barcodeVideo').srcObject=null;
 if($('scannerDialog').open)$('scannerDialog').close();
}
$('scannerClose').onclick=stopBarcodeCamera;
$('scannerCancel').onclick=stopBarcodeCamera;
$('scannerDialog').addEventListener('close',()=>{if(barcodeStream)stopBarcodeCamera()});
$('editor').addEventListener('close',()=>{if(barcodeStream)stopBarcodeCamera()});
$('scanBarcode').onclick=async()=>{
 if(!('BarcodeDetector'in window)){barcodeStatus('Live scanning is not supported by this browser. Type the barcode instead, or use compatible Android Chrome over HTTPS.');return}
 if(!navigator.mediaDevices?.getUserMedia){barcodeStatus('Camera scanning requires HTTPS (or localhost) and camera permission. Use the hosted site on your phone, or enter the barcode manually.');return}
 try{
  const formats=await BarcodeDetector.getSupportedFormats();
  const allowed=['ean_13','ean_8','upc_a','upc_e'].filter(f=>formats.includes(f));
  if(!allowed.length)throw Error('UPC/EAN camera scanning is not supported');
  const detector=new BarcodeDetector({formats:allowed});
  $('scannerStatus').textContent='Point your camera at the barcode on the sleeve.';
  $('scannerDialog').showModal();
  barcodeStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  $('barcodeVideo').srcObject=barcodeStream;await $('barcodeVideo').play();barcodeScanActive=true;
  while(barcodeScanActive){
   try{
    const results=await detector.detect($('barcodeVideo'));
    const code=results.map(x=>normalizeBarcode(x.rawValue)).find(validBarcode);
    if(code){barcodeField().value=code;await stopBarcodeCamera();barcodeStatus('Scanned '+code+'. Searching for matching pressings…');await $('findBarcode').onclick();break}
   }catch(e){if(barcodeScanActive)$('scannerStatus').textContent='Scanning… Hold the barcode steady and improve lighting.'}
   await wait(200);
  }
 }catch(e){await stopBarcodeCamera();barcodeStatus('Camera unavailable: '+e.message+'. Type the barcode manually.')}
};
