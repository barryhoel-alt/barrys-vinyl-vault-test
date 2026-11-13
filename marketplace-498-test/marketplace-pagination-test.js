(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FORMAT_MARKER=/^\[Format: (Vinyl|CD|Cassette|DVD \/ Blu-ray|Memorabilia)\]\n?/;
 function itemFormat(r){return (String(r.description||'').match(FORMAT_MARKER)||[])[1]||'Vinyl'}
 function cleanDescription(v){return String(v||'').replace(FORMAT_MARKER,'')}
 function taggedDescription(v,format){return '[Format: '+format+']\n'+cleanDescription(v)}
 const SETTINGS='barry_marketplace_test_connection_v1', AUTH='barry_marketplace_test_session_v1', LOCAL='barry_vinyl_vault_v33_cloud_local';
let config=null,listings=[],chosen=null,offerRows=[],salesRows=[],reviewRows=[],reviewSaleId=null,dashboardTab="incoming",counterId=null,buyerRevisionId=null;
function status(s){$('authStatus').textContent=s}
function validUrl(s){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(s)}
function readJson(store,key){try{return JSON.parse(store.getItem(key)||'null')}catch{return null}}
function persistSession(){if(config?.refreshToken)sessionStorage.setItem(AUTH,JSON.stringify({url:config.url,refreshToken:config.refreshToken}));}
function showLogin(){ $('marketplaceLogin').hidden=false; }
function hideLogin(){ $('marketplaceLogin').hidden=true; }
function createLogin(){
 const panel=document.createElement('section');panel.id='marketplaceLogin';panel.hidden=true;
 panel.style.cssText='border:1px solid #777;border-radius:10px;padding:16px;margin:12px 0;max-width:580px';
 panel.innerHTML='<h3>Marketplace Test — separate sign-in</h3><p>Use the NEW Marketplace Test project, not your private Vault project. Only use the publishable key; never enter a secret/service-role key.</p><form id="marketplaceLoginForm"><label>Marketplace Test Project URL<br><input name="url" type="url" required placeholder="https://your-project.supabase.co" style="width:100%"></label><br><label>Publishable key<br><input name="pub" type="text" required autocomplete="off" placeholder="sb_publishable_..." style="width:100%"></label><br><label>Test account email<br><input name="email" type="email" required autocomplete="username" style="width:100%"></label><br><label>Test account password<br><input name="password" type="password" required autocomplete="current-password" style="width:100%"></label><br><button type="submit">Sign in to Marketplace Test</button> <button type="button" id="marketplaceLogout">Sign out</button></form><p id="marketplaceLoginMessage" role="status"></p>';
 $('connect').closest('.row').insertAdjacentElement('afterend',panel);
const saved=readJson(localStorage,SETTINGS)||{};
 for(const field of ['url','pub','email'])if(saved[field])panel.querySelector('[name="'+field+'"]').value=saved[field];
 $('marketplaceLoginForm').onsubmit=async e=>{
  e.preventDefault();const loginForm=e.currentTarget;const f=Object.fromEntries(new FormData(loginForm).entries());
  const msg=$('marketplaceLoginMessage');msg.textContent='Signing in…';
  const url=f.url.trim().replace(/\/$/,'');const pub=f.pub.trim();
  if(!validUrl(url)||!pub.startsWith('sb_publishable_')){msg.textContent='Enter a valid Supabase Project URL and sb_publishable_ key.';return}
  try{
   const res=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:pub,'Content-Type':'application/json'},body:JSON.stringify({email:f.email.trim(),password:f.password})});
   const data=await res.json();if(!res.ok||!data.access_token||!data.user?.id)throw Error(data.msg||data.error_description||data.message||'Sign-in failed');
   config={url,pub,email:f.email.trim(),uid:data.user.id,token:data.access_token,refreshToken:data.refresh_token};
   localStorage.setItem(SETTINGS,JSON.stringify({url,pub,email:config.email}));persistSession();
   loginForm.elements.password.value='';msg.textContent='Signed in successfully.';hideLogin();status('Marketplace Test: signed in as '+config.email);await load();
  }catch(err){msg.textContent='Sign-in failed: '+err.message}
 };
 $('marketplaceLogout').onclick=()=>{if(window.vv498Clear)window.vv498Clear();config=null;sessionStorage.removeItem(AUTH);resetModeration();blockedOfferIds.clear();++blockStatusRequest;blockedAccountsButton.hidden=true;if(blockedAccountsDialog.open)blockedAccountsDialog.close();blockedAccountsDialog.querySelector('ul').replaceChildren();listings=[];offerRows=[];offerListings.clear();ownedListings=[];render();renderDashboard();status('Signed out of Marketplace Test.');showLogin();load()};
}
async function connect(){
 const saved=readJson(localStorage,SETTINGS),session=readJson(sessionStorage,AUTH);
 if(!saved?.url||!saved?.pub||!session?.refreshToken||session.url!==saved.url){status('Marketplace Test is not signed in. Click Connect to sign in.');return false}
 if(!validUrl(saved.url)||!saved.pub.startsWith('sb_publishable_')){status('Invalid Marketplace Test configuration.');return false}
 try{
  const res=await fetch(saved.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:saved.pub,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refreshToken})});
  const data=await res.json();if(!res.ok||!data.access_token||!data.user?.id)throw Error(data.error_description||data.msg||'Session expired');
  config={...saved,uid:data.user.id,token:data.access_token,refreshToken:data.refresh_token};persistSession();
  status('Marketplace Test: signed in as '+(config.email||'collector'));hideLogin();return true;
 }catch(err){sessionStorage.removeItem(AUTH);status('Marketplace session expired. Please sign in again.');return false}
}
async function api(table,method='GET',payload=null,query=''){if(!config?.token)throw Error('Connect your account first');const res=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/'+table+query,{method,headers:{apikey:config.pub,Authorization:'Bearer '+config.token,'Content-Type':'application/json',Prefer:'return=representation'},body:payload?JSON.stringify(payload):undefined});const body=await res.text();let obj;try{obj=body?JSON.parse(body):null}catch{obj=body}if(!res.ok)throw Error(obj?.message||obj?.error||'HTTP '+res.status);return obj}
let releaseResults=[], selectedReleaseId=null;
async function lookupAlbum(){
 const f=$('listingForm');const artist=f.elements.artist.value.trim(),album=f.elements.album.value.trim();
 if(!artist||!album){$('lookupStatus').textContent='Enter an artist and album title first.';return}
 $('lookupStatus').textContent='Searching MusicBrainz…';$('releaseSelect').innerHTML='<option value="">Searching…</option>';
 try{
  const query='artist:"'+artist.replace(/"/g,'')+'" AND release:"'+album.replace(/"/g,'')+'"';
  const url='https://musicbrainz.org/ws/2/release/?query='+encodeURIComponent(query)+'&fmt=json&limit=25';
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('MusicBrainz returned '+response.status);
  const data=await response.json();releaseResults=(data.releases||[]).filter(r=>r.id);
  $('releaseSelect').innerHTML='<option value="">Choose the correct release…</option>'+releaseResults.map((r,i)=>'<option value="'+i+'">'+esc([r.title,r.date,r.country,r['packaging'],(r['label-info']||[]).map(x=>x['catalog-number']).filter(Boolean).join(', ')].filter(Boolean).join(' · '))+'</option>').join('');
  $('lookupStatus').textContent=releaseResults.length?releaseResults.length+' possible releases. Select the correct pressing.':'No matching release found. Enter cover and tracks manually.';
 }catch(e){$('lookupStatus').textContent='Lookup unavailable: '+e.message+'. You can enter the information manually.';$('releaseSelect').innerHTML='<option value="">No results</option>'}
}
async function applyRelease(){
 const index=$('releaseSelect').value,r=releaseResults[Number(index)];if(index===''||!r){$('lookupStatus').textContent='Select a release first.';return}
 $('lookupStatus').textContent='Loading release details…';
 try{
  const response=await fetch('https://musicbrainz.org/ws/2/release/'+encodeURIComponent(r.id)+'?inc=recordings+artist-credits&fmt=json',{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Release details returned '+response.status);
  const data=await response.json(),lines=[];
  (data.media||[]).forEach((disc,di)=>{lines.push('Disc '+(disc.position||di+1)+':');(disc.tracks||[]).forEach(t=>lines.push((t.number||t.position||'')+'. '+(t.title||t.recording?.title||'Unknown')))});
  const f=$('listingForm');f.elements.tracklist_editor.value=lines.join('\n');
  if(!f.elements.pressing.value.trim())f.elements.pressing.value=[r.date,r.country,(r['label-info']||[]).map(x=>x['catalog-number']).filter(Boolean).join(', ')].filter(Boolean).join(' · ').slice(0,200);
  selectedReleaseId=r.id;
  const imageUrl='https://coverartarchive.org/release/'+encodeURIComponent(r.id)+'/front-250';
  f.elements.image_url.value=imageUrl;
  const preview=$('coverPreview');preview.innerHTML='<p class="muted">Cover preview (if available):</p><img id="lookupCover" alt="Selected album cover" style="max-width:190px;max-height:190px;object-fit:contain" src="'+esc(imageUrl)+'">';
  $('lookupCover').onerror=()=>{preview.textContent='No cover found for this pressing. Clear the cover URL or supply your own.';f.elements.image_url.value=''};
  $('lookupStatus').textContent='Loaded '+lines.filter(x=>!x.endsWith(':')).length+' tracks. Review the pressing, artwork and tracks before publishing.';
 }catch(e){$('lookupStatus').textContent='Could not load this release: '+e.message+'. Enter details manually.'}
}
function fillRecords(){let rows=[];try{rows=JSON.parse(localStorage.getItem(LOCAL)||'[]');if(!Array.isArray(rows))rows=[]}catch{}$('recordSelect').innerHTML='<option value="">Manual listing</option>'+rows.map((r,i)=>'<option value="'+i+'">'+esc((r.artist||'')+' — '+(r.album||'')+' ('+(r.id||'')+')')+'</option>').join('');$('recordSelect').onchange=()=>{const r=rows[Number($('recordSelect').value)];if($('recordSelect').value===''||!r)return;const f=$('listingForm');for(const [k,v] of Object.entries({artist:r.artist,album:r.album,pressing:r.pressing,condition:r.condition,region:r.country,image_url:/^https:\/\//i.test(r.cover||'')?r.cover:''})){if(f.elements[k])f.elements[k].value=v||''}}}
const PAGE_SIZE=24;
let browsePage=0,browseTotal=0,browseLoading=false,browseRequest=0,browseDebounce=null;
function ensureBrowseControls(){
 if($('vvPaginationControls'))return;
 const area=$('listings');if(!area)return;
 const bar=document.createElement('div');bar.id='vvPaginationControls';
 bar.style.cssText='display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:16px 0;padding:12px;border:1px solid #65512d;border-radius:8px';
 bar.innerHTML='<label for="vvBrowseSort">Sort by <select id="vvBrowseSort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="artist">Artist A–Z</option><option value="price_low">Lowest price</option><option value="price_high">Highest price</option></select></label><span id="vvPageInfo" aria-live="polite"></span><div><button type="button" id="vvPagePrev">Previous</button> <button type="button" id="vvPageNext">Next</button></div>';
 area.insertAdjacentElement('afterend',bar);
 $('vvBrowseSort').onchange=()=>{browsePage=0;load()};
 $('vvPagePrev').onclick=()=>{if(browsePage>0&&!browseLoading){browsePage--;load()}};
 $('vvPageNext').onclick=()=>{if((browsePage+1)*PAGE_SIZE<browseTotal&&!browseLoading){browsePage++;load()}};
}
function updateBrowseControls(){
 const bar=$('vvPaginationControls');if(!bar)return;
 $('vvPageInfo').textContent=browseLoading?'Loading…':('Page '+(browsePage+1)+' of '+Math.max(1,Math.ceil(browseTotal/PAGE_SIZE)));
 $('vvPagePrev').disabled=browseLoading||browsePage===0;
 $('vvPageNext').disabled=browseLoading||(browsePage+1)*PAGE_SIZE>=browseTotal;
}
function browseQuery(signedIn){
 const q=new URLSearchParams();
 q.set('select','id,'+(signedIn?'seller_id,':'')+'artist,album,listing_type,asking_price,currency,condition,pressing,region,description,image_url,tracklist,release_mbid,created_at,photo_paths,allow_offers');
 const term=$('search').value.trim();
 if(term){
  // Escape PostgREST OR-expression punctuation to avoid altering the filter structure.
  const safe=term.replace(/[(),.*\\"%]/g,' ').trim();
  if(safe){const pattern='*'+safe+'*';q.set('or','(artist.ilike.'+pattern+',album.ilike.'+pattern+',pressing.ilike.'+pattern+',region.ilike.'+pattern+')')}
 }
 const type=$('type').value;
 if(type==='sale'||type==='trade')q.set('listing_type','in.('+type+',both)');
 if(type==='both')q.set('listing_type','eq.both');
 const fmt=$('formatFilter').value;
 // Media format is stored as a [Format: ...] prefix in description, not a separate column.
 if(fmt==='Vinyl'){
  const otherFormats=['CD','Cassette','DVD / Blu-ray','Memorabilia'];
  const exclusions=otherFormats.map(format=>'description.not.like.[Format: '+format+']*');
  q.set('and','(or(description.is.null,and('+exclusions.join(',')+')))');
 }else if(fmt){
  q.set('description','like.[Format: '+fmt+']*');
 }
 const order={newest:'created_at.desc',oldest:'created_at.asc',artist:'artist.asc,album.asc',price_low:'asking_price.asc.nullslast',price_high:'asking_price.desc.nullslast'}[$('vvBrowseSort')?.value]||'created_at.desc';
 q.set('order',order+',id.asc');q.set('limit',String(PAGE_SIZE));q.set('offset',String(browsePage*PAGE_SIZE));
 return '?'+q.toString();
}
async function load(){
 ensureBrowseControls();const request=++browseRequest;browseLoading=true;updateBrowseControls();
 $('listingStatus').textContent='Loading public listings…';
 try{
  const saved={...window.VV_MARKETPLACE_PUBLIC_CONFIG,...(readJson(localStorage,SETTINGS)||{})};
  const project=config?.token?config:saved;
  if(!project?.url||!project?.pub||!validUrl(project.url)||!project.pub.startsWith('sb_publishable_')){
   if(request!==browseRequest)return;
   listings=[];browseTotal=0;browseLoading=false;render();
   $('listingStatus').textContent='Public connection settings are unavailable.';return;
  }
  const endpoint=config?.token?'marketplace_listings':'marketplace_public_listings';
  const query=browseQuery(config?.token)+(config?.token?'&status=eq.active':'');
  const headers={apikey:project.pub,Prefer:'count=exact'};
  if(config?.token)headers.Authorization='Bearer '+config.token;
  const response=await fetch(project.url.replace(/\/$/,'')+'/rest/v1/'+endpoint+query,{headers});
  const result=await response.json();
  if(request!==browseRequest)return;
  const count=response.headers.get('content-range')?.match(/\/(\d+)$/);
  const lastPage=count?Math.max(0,Math.ceil(Number(count[1])/PAGE_SIZE)-1):0;
  if(browsePage>0 && (response.status===416 || (response.ok && !result.length))){
   browsePage=Math.min(browsePage-1,lastPage);
   return load();
  }
  if(!response.ok)throw Error(result?.message||'HTTP '+response.status);
  listings=Array.isArray(result)?result:[];
  browseTotal=count?Number(count[1]):browsePage*PAGE_SIZE+listings.length;
  browseLoading=false;render();
  if(config?.token)await refreshDashboard();
 }catch(e){if(request!==browseRequest)return;listings=[];browseTotal=0;browseLoading=false;render();$('listingStatus').textContent='Could not load public listings: '+e.message;}
}
function price(r){return r.listing_type==='trade'?'Trade offers welcome':new Intl.NumberFormat('en-CA',{style:'currency',currency:r.currency||'CAD'}).format(Number(r.asking_price||0))}
function tracks(r){return Array.isArray(r.tracklist)?r.tracklist.map(x=>typeof x==='string'?x:String(x?.title||'')).filter(Boolean):[]}
function sellerRating(sellerId){const rr=reviewRows.filter(r=>r.seller_id===sellerId);return rr.length?'<p class="review-stars">★ '+(rr.reduce((a,r)=>a+Number(r.rating),0)/rr.length).toFixed(1)+' / 5 <small>('+rr.length+' verified review'+(rr.length===1?'':'s')+')</small></p>':''}
const photos = window.vvListingPhotos;
const newPhotos = photos.editor($('listingForm'));
const editPhotos = photos.editor($('editListingForm'));
function photoProject() {
 return config?.url || ({...window.VV_MARKETPLACE_PUBLIC_CONFIG,...(readJson(localStorage,SETTINGS)||{})}).url;
}
function listingPhotoUrls(listing) {
 return (Array.isArray(listing.photo_paths) ? listing.photo_paths : [])
   .map(path => photos.photoUrl(photoProject(), path)).filter(Boolean);
}
function showSellerPhotos(container, urls) {
 if (!urls.length) return;
 const gallery=document.createElement('section');
 gallery.setAttribute('aria-label','Seller photos');
 gallery.innerHTML='<h3>Seller photos</h3><a target="_blank" rel="noopener noreferrer">'+
   '<img style="display:block;width:min(100%,360px);height:260px;object-fit:contain"></a>'+
   '<div class="row" style="margin-top:8px"><button type="button" aria-label="Previous seller photo">←</button>'+
   '<span aria-live="polite"></span><button type="button" aria-label="Next seller photo">→</button></div>';
 const link=gallery.querySelector('a');
 const image=gallery.querySelector('img');
 const count=gallery.querySelector('span');
 const [previous,next]=gallery.querySelectorAll('button');
 let index=0;
 function displayPhoto() {
   link.href=urls[index];
   link.setAttribute('aria-label','Open seller photo '+(index+1)+' at full size');
   image.src=urls[index];
   image.alt='Seller photo '+(index+1);
   count.textContent=(index+1)+' of '+urls.length;
   previous.disabled=index===0;
   next.disabled=index===urls.length-1;
 }
 previous.onclick=()=>{if(index>0){index--;displayPhoto();}};
 next.onclick=()=>{if(index<urls.length-1){index++;displayPhoto();}};
 previous.hidden=next.hidden=urls.length===1;
 displayPhoto();
 container.replaceWith(gallery);
}
const reportReasons = {
 counterfeit: 'Suspected counterfeit',
 misleading: 'Misleading photos or description',
 spam: 'Spam',
 other: 'Other',
};

function addReportForm(listing) {
 if (listing.seller_id === config?.uid && config?.uid) return;
 const section=document.createElement('section');
 section.innerHTML='<button type="button">Report listing</button><form hidden>'+
   '<label>Reason <select name="reason" required>'+
   '<option value="">Choose a reason</option>'+
   Object.entries(reportReasons).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+
   '</select></label><label>Note (optional)<textarea name="note" maxlength="500"></textarea></label>'+
   '<button type="submit">Send report</button></form><p role="status"></p>';
 const button=section.querySelector('button');
 const form=section.querySelector('form');
 const feedback=section.querySelector('[role=status]');
 button.onclick=()=>{
  if(!config?.uid){
   $('detailsDialog').close();
   alert('Sign in to report a listing.');
   document.querySelector('[data-nav-view="account"]')?.click();
   return;
  }
  form.hidden=!form.hidden;
  if(!form.hidden)form.elements.reason.focus();
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  const submit=form.querySelector('[type=submit]');
  submit.disabled=true;
  try{
   await api('rpc/marketplace_report_listing','POST',{
    p_listing_id:listing.id,p_reason:form.elements.reason.value,p_note:form.elements.note.value
   });
   form.hidden=true;
   button.disabled=true;
   feedback.textContent='Report received for review.';
  }catch(error){feedback.textContent='Could not send report: '+error.message;}
  finally{submit.disabled=false;}
 };
 $('detailsContent').append(section);
}

const moderationButton=document.createElement('button');
moderationButton.type='button';
moderationButton.textContent='Moderation queue';
moderationButton.hidden=true;
$('dashboardPanel').before(moderationButton);
const moderationDialog=document.createElement('dialog');
moderationDialog.setAttribute('aria-label','Moderation queue');
moderationDialog.innerHTML='<h2>Moderation queue</h2><button type="button" data-open-reports>Open reports</button> <button type="button" data-hidden-listings>Hidden listings</button><p role="status"></p><div></div><button type="button" data-close-moderation>Close</button>';
document.body.append(moderationDialog);
moderationDialog.querySelector('[data-close-moderation]').onclick=()=>moderationDialog.close();
const moderationStatus=moderationDialog.querySelector('[role=status]');
const moderationRows=moderationDialog.querySelector('div');
let moderationSession=null;

async function checkModerator(session) {
 if(moderationSession===session)return;
 moderationSession=session;
 moderationButton.hidden=true;
 try{
  const allowed=await api('rpc/marketplace_can_moderate','POST',{});
  if(config===session)moderationButton.hidden=allowed!==true;
 }catch{
  if(moderationSession===session)moderationSession=null;
 }
}

function resetModeration(){
 moderationSession=null;
 moderationButton.hidden=true;
 moderationRows.replaceChildren();
 if(moderationDialog.open)moderationDialog.close();
}

let moderationRequest=0;
async function loadModeration(hidden=false){
 const request=++moderationRequest;
 const session=config;
 moderationDialog.querySelector('[data-open-reports]').disabled=!hidden;
 moderationDialog.querySelector('[data-hidden-listings]').disabled=hidden;
 moderationRows.replaceChildren();
 moderationStatus.textContent=hidden?'Loading hidden listings…':'Loading reports…';
 try{
  const rows=await api(hidden?'rpc/marketplace_hidden_listings':'rpc/marketplace_report_queue','POST',{});
  if(config!==session||request!==moderationRequest||!moderationDialog.open)return;
  moderationStatus.textContent=rows.length?'':hidden?'No hidden listings.':'No open reports.';
  for(const report of rows){
   const card=document.createElement('article');
   card.className='offer-card';
   const heading=document.createElement('h3');
   heading.textContent=report.artist+' — '+report.album;
   const reason=document.createElement('p');
   reason.textContent=reportReasons[report.reason]||report.reason;
   const note=document.createElement('p');
   note.textContent=report.note;
   const date=document.createElement('small');
   date.textContent=new Date(hidden?report.hidden_at:report.created_at).toLocaleString();
   const actions=document.createElement('div');
   actions.className='row';
   card.append(heading,...(hidden?[]:[reason,note]),date,actions);
   for(const [action,label] of (hidden?[['restore','Restore listing']]:[['dismissed','Dismiss report'],['hidden','Hide listing']])){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.onclick=async ()=>{
     if(!confirm(hidden?'Restore this listing to Browse?':action==='hidden'?'Hide this listing from Browse?':'Dismiss this report?'))return;
     for(const control of actions.children)control.disabled=true;
     try{
      if(hidden)await api('rpc/marketplace_restore_listing','POST',{p_listing_id:report.id});
      else await api('rpc/marketplace_resolve_report','POST',{p_report_id:report.id,p_action:action});
      if(config!==session)return;
      if(request===moderationRequest&&moderationDialog.open)await loadModeration(hidden);
      if(hidden||action==='hidden')await load();
     }catch(error){
      moderationStatus.textContent='Could not resolve report: '+error.message;
      for(const control of actions.children)control.disabled=false;
     }
    };
    actions.append(button);
   }
   moderationRows.append(card);
  }
 }catch(error){
  if(config===session&&request===moderationRequest)moderationStatus.textContent='Could not load moderation queue: '+error.message;
 }
}
moderationDialog.querySelector('[data-open-reports]').onclick=()=>loadModeration();
moderationDialog.querySelector('[data-hidden-listings]').onclick=()=>loadModeration(true);
moderationButton.onclick=()=>{moderationDialog.showModal();loadModeration();};

let blockedOfferIds=new Set();
let blockStatusRequest=0;
async function refreshBlockStatus(){
 const session=config;
 const request=++blockStatusRequest;
 const ids=offerRows.map(offer=>offer.id);
 const rows=ids.length?await api('rpc/marketplace_my_blocked_offer_ids','POST',{p_offer_ids:ids}):[];
 if(config!==session||request!==blockStatusRequest)return;
 blockedOfferIds=new Set(rows.map(row=>row.offer_id));
 renderDashboard();
}

const blockedAccountsButton=document.createElement('button');
blockedAccountsButton.type='button';
blockedAccountsButton.textContent='Blocked accounts';
blockedAccountsButton.hidden=true;
$('connect').after(blockedAccountsButton);
const blockedAccountsDialog=document.createElement('dialog');
blockedAccountsDialog.setAttribute('aria-label','Blocked accounts');
blockedAccountsDialog.innerHTML='<h2>Blocked accounts</h2><p role="status"></p><ul></ul><button type="button">Close</button>';
document.body.append(blockedAccountsDialog);
blockedAccountsDialog.querySelector('button').onclick=()=>blockedAccountsDialog.close();

async function loadBlockedAccounts(){
 const session=config;
 const status=blockedAccountsDialog.querySelector('[role=status]');
 const list=blockedAccountsDialog.querySelector('ul');
 list.replaceChildren();
 status.textContent='Loading blocked accounts…';
 try{
  const rows=await api('rpc/marketplace_my_blocked_accounts','POST',{});
  if(config!==session||!blockedAccountsDialog.open)return;
  status.textContent=rows.length?'':'No blocked accounts.';
  for(const row of rows){
   const item=document.createElement('li');
   const label=document.createElement('span');
   label.textContent='Account '+row.blocked_id.slice(0,8)+' · Blocked '+new Date(row.created_at).toLocaleString()+' ';
   const button=document.createElement('button');
   button.type='button';
   button.textContent='Unblock';
   button.setAttribute('aria-label','Unblock account '+row.blocked_id.slice(0,8));
   button.onclick=async ()=>{
    button.disabled=true;
    try{
     await api('rpc/marketplace_unblock_account','POST',{p_blocked_id:row.blocked_id});
     if(config===session){
      blockedOfferIds.clear();
      renderDashboard();
      if(blockedAccountsDialog.open)await loadBlockedAccounts();
      refreshBlockStatus().catch(()=>{status.textContent='Account unblocked. Offer cards will update on the next refresh.';});
     }
    }catch(error){
     if(config===session)status.textContent='Could not unblock account: '+error.message;
     button.disabled=false;
    }
   };
   item.append(label,button);
   list.append(item);
  }
 }catch(error){
  if(config===session)status.textContent='Could not load blocked accounts: '+error.message;
 }
}
blockedAccountsButton.onclick=()=>{blockedAccountsDialog.showModal();loadBlockedAccounts();};

async function blockOfferAccount(button){
 const offerId=button.dataset.blockOffer;
 const session=config;
 if(!config?.uid||!offerRows.some(offer=>offer.id===offerId))return;
 if(!confirm('Block the other account on this offer? Neither account can send new offers or purchase requests to the other.'))return;
 button.disabled=true;
 try{
  await api('rpc/marketplace_block_offer_account','POST',{p_offer_id:offerId});
  if(config!==session)return;
  blockedOfferIds.add(offerId);
  renderDashboard();
  refreshBlockStatus().catch(()=>{});
 }catch(error){
  alert('Could not block account: '+error.message);
  button.disabled=false;
 }
}

function buyerActions(listing) {
 const active=offerRows.find(row=>row.listing_id===listing.id&&row.buyer_id===config?.uid&&
   ['pending','countered','accepted'].includes(row.status));
 if(active) return '<button class="vv497-pending" disabled>'+
   (active.is_purchase_request?'Purchase request':'Offer')+' '+esc(active.status)+' · View dashboard</button>';
 const id=esc(listing.id);
 const request=canRequestPurchase(listing)?
   '<button type="button" data-request-buy="'+id+'">Request to Buy · '+
     esc(money(listing.asking_price,listing.currency))+'</button>':'';
 const canBuy=canMakeOffer(listing,'buy');
 const canTrade=canMakeOffer(listing,'trade');
 const offer=canBuy||canTrade?
   '<button data-offer="'+id+'">'+(canBuy?'Make an offer':'Offer a trade')+'</button>':'';
 return request+offer;
}
function canMakeOffer(listing,type) {
 if(type==='buy')return listing.allow_offers!==false&&['sale','both'].includes(listing.listing_type);
 return type==='trade'&&['trade','both'].includes(listing.listing_type);
}
function canRequestPurchase(listing) {
 return ['sale','both'].includes(listing.listing_type)&&Number(listing.asking_price)>0;
}
async function requestPurchase(button) {
 const listing=listings.find(row=>row.id===button.dataset.requestBuy);
 if(!listing||!canRequestPurchase(listing))return;
 if(!config?.uid){
   alert('Sign in to request to buy. Open My Account to sign in.');
   document.querySelector('[data-nav-view="account"]')?.click();
   return;
 }
 if(!confirm('Request to buy at '+money(listing.asking_price,listing.currency)+
   '? The seller will confirm availability and shipping or pickup terms. No payment is collected.'))return;
 button.disabled=true;
 try{
   await api('marketplace_offers','POST',{
     listing_id:listing.id,buyer_id:config.uid,offer_type:'buy',is_purchase_request:true,
     offer_amount:listing.asking_price,currency:listing.currency,message:'Requested at the asking price.'
   });
   await refreshDashboard();
   alert('Purchase request sent. Track it under Offers I sent.');
 }catch(error){
   alert('Could not send purchase request: '+error.message);
   button.disabled=false;
 }
}
function render(){const filtered=listings;$('listingStatus').textContent=browseTotal+' matching public listing(s) · showing '+(filtered.length?browsePage*PAGE_SIZE+1:0)+'–'+(browsePage*PAGE_SIZE+filtered.length);updateBrowseControls();$('listings').innerHTML=filtered.map(r=>{const coverUrl=r.image_url;const cover='<div class="cover-frame">'+(coverUrl&&/^https:\/\//i.test(coverUrl)?'<img alt="Album cover for '+esc(r.artist+' — '+r.album)+'" loading="lazy" src="'+esc(coverUrl)+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="cover-placeholder" hidden><div class="mini-record"></div><span>Artwork unavailable</span></div>':'<div class="cover-placeholder"><div class="mini-record"></div><span>Cover not added yet</span></div>')+'</div>';return '<article class="listing">'+cover+'<h3>'+esc(r.artist)+' — '+esc(r.album)+'</h3><span class="format-tag">'+esc(itemFormat(r))+'</span>'+sellerRating(r.seller_id)+'<p class="price">'+esc(price(r))+'</p><p>'+esc(r.listing_type)+' · '+esc(r.condition||'Condition not specified')+'</p><small>'+esc(r.pressing||'')+' · '+esc(r.region||'')+'</small><div class="listing-actions"><button data-details="'+esc(r.id)+'">'+ (listingPhotoUrls(r).length?'View details &amp; photos':'View Album Details')+'</button>'+((config?.uid&&config.uid===r.seller_id)?'<button data-edit="'+esc(r.id)+'">Edit / add photos</button><button data-close="'+esc(r.id)+'">Withdraw</button>':buyerActions(r))+'</div></article>'}).join('')||'<p class="muted">No matching listings yet.</p>'}
let editingId=null;
function openDetails(r){const lines=tracks(r);const urls=listingPhotoUrls(r);$('detailsContent').innerHTML='<h2>'+esc(r.artist)+' — '+esc(r.album)+'</h2>'+(r.image_url&&/^https:\/\//i.test(r.image_url)?'<img alt="Album cover" style="max-width:260px;width:100%;object-fit:contain" src="'+esc(r.image_url)+'" onerror="this.remove()">':'')+(urls.length?'<div data-seller-photos></div>':'')+'<p class="price">'+esc(price(r))+'</p><p><b>Condition:</b> '+esc(r.condition||'Not specified')+'</p><p><b>Pressing:</b> '+esc(r.pressing||'Not specified')+'</p><p><b>Region:</b> '+esc(r.region||'Not specified')+'</p><p><b>Listing type:</b> '+esc(r.listing_type)+'</p><p>'+esc(cleanDescription(r.description))+'</p><h3>Track listing</h3>'+(lines.length?'<div style="white-space:pre-line">'+lines.map(esc).join('\n')+'</div>':'<p class="muted">No tracks supplied.</p>');if(urls.length)showSellerPhotos($('detailsContent').querySelector('[data-seller-photos]'),urls);addReportForm(r);$('detailsDialog').showModal()}
function openEdit(r){if(r.seller_id!==config?.uid)return;editingId=r.id;editPhotos.reset(r.photo_paths||[],photoProject());const f=$('editListingForm');f.elements.allow_offers.checked=r.allow_offers!==false;f.elements.media_format.value=itemFormat(r);for(const name of ['artist','album','listing_type','asking_price','currency','condition','pressing','region','description','image_url'])f.elements[name].value=name==='description'?cleanDescription(r[name]):(r[name]??'');f.elements.tracklist_editor.value=tracks(r).join('\n');$('editStatus').textContent='';$('editDialog').showModal()}
$('editListingForm').onsubmit=async e=>{e.preventDefault();if(!editingId)return;const f=Object.fromEntries(new FormData(e.currentTarget).entries());const payload={artist:f.artist.trim(),album:f.album.trim(),listing_type:f.listing_type,allow_offers:f.allow_offers==='on',asking_price:Number(f.asking_price),currency:f.currency,condition:f.condition.trim(),pressing:f.pressing.trim(),region:f.region.trim(),description:taggedDescription(f.description.trim(),f.media_format),image_url:f.image_url.trim()||null,tracklist:f.tracklist_editor.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)};if(payload.tracklist.length>300){$('editStatus').textContent='Track listing exceeds 300 lines.';return}try{
 const id=editingId;
 await photos.save(e.currentTarget,editPhotos,config,payload.listing_type,false,async paths=>{
   const updated=await api('marketplace_listings','PATCH',{...payload,photo_paths:paths},'?id=eq.'+encodeURIComponent(id)+'&seller_id=eq.'+encodeURIComponent(config.uid));
   if (!updated?.length) throw Error('This listing could not be updated.');
 });
 $('editDialog').close();editingId=null;await load()}catch(err){$('editStatus').textContent='Could not save: '+err.message}};
$('closeDetails').onclick=()=>$('detailsDialog').close();$('cancelEdit').onclick=()=>$('editDialog').close();
$('listings').onclick=async e=>{const request=e.target.closest('[data-request-buy]');if(request){await requestPurchase(request);return;}const offer=e.target.closest('[data-offer]'),close=e.target.closest('[data-close]'),details=e.target.closest('[data-details]'),edit=e.target.closest('[data-edit]');if(details){const r=listings.find(x=>x.id===details.dataset.details);if(r)openDetails(r)}if(edit){const r=listings.find(x=>x.id===edit.dataset.edit);if(r)openEdit(r)}if(offer){if(!config?.uid){alert('Sign in to make an offer. Open My Account to sign in.');document.querySelector('[data-nav-view="account"]')?.click();return;}chosen=listings.find(r=>r.id===offer.dataset.offer);if(!chosen)return;if(chosen.seller_id===config?.uid){alert('You cannot offer on your own listing.');return}const existing=offerRows.find(o=>o.listing_id===chosen.id&&o.buyer_id===config?.uid&&['pending','countered','accepted'].includes(o.status));if(existing){alert(existing.status==='countered'?'Seller responded. Open Offers I’ve sent to answer or revise your counteroffer.':'You already have an '+existing.status+' offer for this listing. Check Offers I’ve sent.');return}$('offerTitle').textContent=chosen.artist+' — '+chosen.album;$('offerStatus').textContent='';const type=$('offerForm').elements.offer_type;
for(const option of type.options)option.disabled=!canMakeOffer(chosen,option.value);
type.value=[...type.options].find(option=>!option.disabled)?.value||'';
if(!type.value)return;
type.dispatchEvent(new Event('change'));
$('offerDialog').showModal()}if(close&&confirm('Withdraw this public listing?')){try{await api('marketplace_listings','PATCH',{status:'withdrawn'},'?id=eq.'+encodeURIComponent(close.dataset.close));await load()}catch(err){alert(err.message)}}};
$('listingForm').onsubmit=async e=>{e.preventDefault();if(!config?.uid)return alert('Connect your account first');const f=Object.fromEntries(new FormData(e.target).entries());if(!confirm('Publish '+f.artist+' — '+f.album+' to the PUBLIC marketplace? The listing details and item photos will be public.'))return;const payload={seller_id:config.uid,artist:f.artist.trim(),album:f.album.trim(),listing_type:f.listing_type,allow_offers:f.allow_offers==='on',asking_price:Number(f.asking_price),currency:f.currency,condition:f.condition.trim(),pressing:f.pressing.trim(),region:f.region.trim(),description:taggedDescription(f.description.trim(),f.media_format),image_url:f.image_url.trim()||null,tracklist:f.tracklist_editor.trim()?f.tracklist_editor.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[],release_mbid:selectedReleaseId};try{
 await photos.save(e.currentTarget,newPhotos,config,payload.listing_type,true,
   paths=>api('marketplace_listings','POST',{...payload,photo_paths:paths}));
 $('publishStatus').textContent='Published successfully.';e.target.reset();selectedReleaseId=null;$('coverPreview').textContent='';await load()}catch(err){$('publishStatus').textContent='Not published: '+err.message}};
$('offerForm').onsubmit=async e=>{e.preventDefault();if(!chosen)return;const f=Object.fromEntries(new FormData(e.target).entries());if(!canMakeOffer(chosen,f.offer_type)){$('offerStatus').textContent='This listing does not accept that offer type.';return;}if(offerRows.some(o=>o.listing_id===chosen.id&&o.buyer_id===config?.uid&&['pending','countered','accepted'].includes(o.status))){$('offerStatus').textContent='You already have an active offer for this listing. Check Offers I’ve sent.';return;}if(f.offer_type==='buy'&&(!f.offer_amount||Number(f.offer_amount)<=0)){ $('offerStatus').textContent='Enter a dollar amount for a purchase offer.';return;}try{await api('marketplace_offers','POST',{listing_id:chosen.id,buyer_id:config.uid,offer_type:f.offer_type,offer_amount:f.offer_amount?Number(f.offer_amount):null,currency:f.currency,message:(f.message||'').trim()});$('offerDialog').close();await refreshDashboard();alert('Offer sent. You can track it under Offers I’ve sent.')}catch(err){$('offerStatus').textContent='Offer not sent: '+err.message}};

 function money(amount,currency){if(amount===null||amount===undefined||amount==='')return 'Trade / no amount';try{return new Intl.NumberFormat('en-CA',{style:'currency',currency:currency||'CAD'}).format(Number(amount))+' '+(currency||'CAD')}catch{return esc(amount)+' '+esc(currency||'')}}
 let offerListings=new Map();
 function offerListing(offer){
   const id=offer.listing_id;
   return offerListings.get(id)||ownedListings.find(row=>row.id===id)||
     listings.find(row=>row.id===id)||salesRows.find(row=>row.listing_id===id);
 }
 let ownedListings=[];
 async function refreshDashboard(){if(!config?.uid){offerRows=[];offerListings.clear();ownedListings=[];salesRows=[];reviewRows=[];renderDashboard();return}const session=config;blockedAccountsButton.hidden=false;checkModerator(session);try{
   const [offers,mine,sales,reviews]=await Promise.all([api('marketplace_offers','GET',null,'?select=id,listing_id,buyer_id,offer_type,offer_amount,currency,message,status,created_at,counter_amount,counter_currency,is_purchase_request,shipping_terms&order=created_at.desc&limit=200'),api('marketplace_listings','GET',null,'?select=id,seller_id,artist,album,asking_price,currency,image_url,status,listing_type,condition,pressing,region,description,tracklist,photo_paths,allow_offers&seller_id=eq.'+encodeURIComponent(config.uid)+'&limit=200'),api('marketplace_sales','GET',null,'?select=id,listing_id,offer_id,seller_id,buyer_id,artist,album,image_url,agreed_amount,currency,completed_at&order=completed_at.desc&limit=200'),api('marketplace_reviews','GET',null,'?select=id,sale_id,seller_id,rating,review_text,created_at&order=created_at.desc&limit=1000')]);
   if(config!==session)return;
   const ids=(offers||[]).map(offer=>offer.id);
   const details=ids.length
     ? await api('rpc/marketplace_offer_listing_details','POST',{p_offer_ids:ids}).catch(()=>[])
     : [];
   if(config!==session)return;
   offerListings=new Map((details||[]).map(listing=>[listing.id,listing]));
   offerRows=offers||[];ownedListings=mine||[];salesRows=sales||[];reviewRows=reviews||[];refreshBlockStatus().catch(()=>{});$('dashboardStatus').textContent='Updated '+new Date().toLocaleTimeString();renderDashboard();render();if(window.vv498Update)window.vv498Update({uid:config.uid,offers:offerRows,sales:salesRows,owned:ownedListings});
 }catch(err){$('dashboardStatus').textContent='Offers could not be loaded: '+err.message+' (check the 4.5 SQL update)';}}
 function renderDashboard(){const mineIds=new Set(ownedListings.map(x=>x.id));const incoming=offerRows.filter(x=>mineIds.has(x.listing_id)&&x.buyer_id!==config?.uid);const sent=offerRows.filter(x=>x.buyer_id===config?.uid);const pending=incoming.filter(x=>x.status==='pending').length;const awaitingBuyer=sent.filter(x=>x.status==='countered').length;
  $('incomingCount').textContent=incoming.length+' total · '+pending+' new';$('sentCount').textContent=sent.length+(awaitingBuyer?' · '+awaitingBuyer+' to answer':'');$('mineCount').textContent=ownedListings.filter(x=>x.status==='active').length;$('offerBadge').textContent='('+pending+')';$('salesCount').textContent=salesRows.length;
  const panel=$('dashboardPanel');if(!config?.uid){panel.innerHTML='<p class="muted">Sign in to see offers and listings.</p>';return}
  if(dashboardTab==='sales'){panel.innerHTML='<h3>Completed sales & purchases</h3><p class="muted">Records marked sold by sellers. This is a marketplace record, not proof of payment or shipment.</p>'+(salesRows.map(s=>'<article class="offer-card sale-history-card"><div class="sale-cover">'+(s.image_url&&/^https:\/\//i.test(s.image_url)?'<img src="'+esc(s.image_url)+'" alt="Cover artwork for '+esc(s.artist+' — '+s.album)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="sale-cover-empty" hidden>♫<small>Artwork unavailable</small></span>':'<span class="sale-cover-empty">♫<small>No artwork saved</small></span>')+'</div><div class="sale-info"><h3>'+esc(s.artist)+' — '+esc(s.album)+'</h3><span class="pill">'+(s.seller_id===config.uid?'Sold':'Purchased')+'</span><p class="offer-amount">'+esc(s.agreed_amount==null?'Trade agreement':money(s.agreed_amount,s.currency))+'</p><small>Marked sold: '+esc(new Date(s.completed_at).toLocaleString())+'</small>'+(reviewRows.find(r=>r.sale_id===s.id)?'<div class="review-item"><div class="review-stars">'+'★'.repeat(Number(reviewRows.find(r=>r.sale_id===s.id).rating))+'☆'.repeat(5-Number(reviewRows.find(r=>r.sale_id===s.id).rating))+'</div><p>'+esc(reviewRows.find(r=>r.sale_id===s.id).review_text||'No written review')+'</p><small>Verified buyer review</small></div>':(s.buyer_id===config.uid?'<p><button data-review-sale="'+esc(s.id)+'">Leave seller review</button></p>':'<p class="muted">No buyer review yet.</p>'))+'</div></article>').join('')||'<p class="muted">No completed transactions yet.</p>');return}
  if(dashboardTab==='listings'){panel.innerHTML='<h3>My active listings</h3>'+ownedListings.filter(x=>x.status==='active').map(x=>'<div class="offer-card"><b>'+esc(x.artist)+' — '+esc(x.album)+'</b><p>'+esc(money(x.asking_price,x.currency))+'</p><button type="button" data-edit-owned="'+esc(x.id)+'">Edit / add photos</button></div>').join('')||'<p>No active listings.</p>';return}
  const arr=dashboardTab==='sent'?sent:incoming;panel.innerHTML='<h3>'+(dashboardTab==='sent'?'Offers I sent':'Offers received')+'</h3>'+(arr.map(r=>{const l=offerListing(r),isSeller=mineIds.has(r.listing_id),canAct=isSeller&&r.status==='pending',canBuyerAct=dashboardTab==='sent'&&r.buyer_id===config?.uid&&r.status==='countered';return '<article class="offer-card">'+(l?.image_url&&/^https:\/\//i.test(l.image_url)?'<img src="'+esc(l.image_url)+'" alt="Album cover" loading="lazy" onerror="this.remove()">':'')+'<h3>'+esc(l?l.artist+' — '+l.album:'Listing '+r.listing_id.slice(0,8))+'</h3><span class="pill">'+esc(r.status||'pending')+'</span><p class="muted">'+esc(r.is_purchase_request?'Purchase request':r.offer_type==='trade'?'Trade offer':'Purchase offer')+'</p><div class="offer-amount">'+esc(money(r.offer_amount,r.currency))+'</div>'+(l?.asking_price!=null?'<p class="muted">Asking price: '+esc(money(l.asking_price,l.currency))+'</p>':'')+(r.counter_amount!=null?'<p><b>Seller counteroffer: '+esc(money(r.counter_amount,r.counter_currency||r.currency))+'</b></p>':'')+(r.shipping_terms?'<p><b>Shipping / pickup:</b> '+esc(r.shipping_terms)+'</p>':'')+'<p>'+esc(r.message||'No message')+'</p><small>'+esc(new Date(r.created_at).toLocaleString())+'</small>'+(canAct?'<div class="row"><button data-respond="accepted" data-id="'+esc(r.id)+'">Accept</button>'+(r.is_purchase_request?'':'<button data-counter="'+esc(r.id)+'">Counteroffer</button>')+'<button data-respond="declined" data-id="'+esc(r.id)+'">Decline</button></div>':'')+(isSeller&&r.status==='accepted'&&!salesRows.some(s=>s.listing_id===r.listing_id)?'<div class="row"><button data-mark-sold="'+esc(r.id)+'">Mark record sold</button></div>':'')+(canBuyerAct?'<div class="row"><button data-buyer-action="accept" data-id="'+esc(r.id)+'">Accept counteroffer</button><button data-buyer-revise="'+esc(r.id)+'">Make another offer</button><button data-buyer-action="decline" data-id="'+esc(r.id)+'">Decline</button></div>':'')+'<p><button type="button" data-block-offer="'+esc(r.id)+'"'+(blockedOfferIds.has(r.id)?' disabled>Account blocked':'>Block this account')+'</button></p></article>'}).join('')||'<p class="muted">No offers here yet.</p>');
 }
 $('dashIncoming').onclick=()=>{dashboardTab='incoming';renderDashboard()};$('dashSent').onclick=()=>{dashboardTab='sent';renderDashboard()};$('dashListings').onclick=()=>{dashboardTab='listings';renderDashboard()};$('dashSales').onclick=()=>{dashboardTab='sales';renderDashboard()};
 $('dashboardPanel').onclick=async e=>{
   const blockButton=e.target.closest('[data-block-offer]');
   if(blockButton){await blockOfferAccount(blockButton);return;}
   const editButton=e.target.closest('[data-edit-owned]');
   if(editButton){
     const listing=ownedListings.find(row=>row.id===editButton.dataset.editOwned);
     if(listing)openEdit(listing);
     return;
   }
   const reviewButton=e.target.closest('[data-review-sale]');if(reviewButton){const sale=salesRows.find(s=>s.id===reviewButton.dataset.reviewSale);if(!sale||sale.buyer_id!==config?.uid||reviewRows.some(r=>r.sale_id===sale.id))return;reviewSaleId=sale.id;$('reviewForm').reset();$('reviewTitle').textContent=sale.artist+' — '+sale.album;$('reviewStatus').textContent='';$('reviewDialog').showModal();return}const markSold=e.target.closest('[data-mark-sold]');if(markSold){const o=offerRows.find(x=>x.id===markSold.dataset.markSold);if(!o||o.status!=='accepted'||!ownedListings.some(l=>l.id===o.listing_id&&l.status==='active')){alert('This listing is not eligible to mark sold.');return}if(salesRows.some(s=>s.listing_id===o.listing_id)){alert('This listing already has a recorded sale. Refresh the dashboard.');return}if(!confirm('FINAL RECORD ACTION: Mark this listing sold to the buyer of this accepted offer? This removes it from public listings. No payment, shipping or delivery is verified.'))return;markSold.disabled=true;markSold.textContent='Recording sale…';try{await api('rpc/marketplace_mark_sold','POST',{p_offer_id:o.id});await load();dashboardTab='sales';renderDashboard()}catch(err){alert('Could not mark sold: '+err.message);markSold.disabled=false;markSold.textContent='Mark record sold'}return}const respond=e.target.closest('[data-respond]'),counter=e.target.closest('[data-counter]'),buyerAction=e.target.closest('[data-buyer-action]'),buyerRevise=e.target.closest('[data-buyer-revise]');if(buyerAction){const action=buyerAction.dataset.buyerAction;const offer=offerRows.find(r=>r.id===buyerAction.dataset.id);if(!offer||offer.buyer_id!==config?.uid||offer.status!=='countered')return;if(!confirm((action==='accept'?'Accept':'Decline')+' the seller counteroffer of '+money(offer.counter_amount,offer.counter_currency||offer.currency)+'? This records a decision but does not transfer money.'))return;try{await api('rpc/marketplace_buyer_respond_offer','POST',{p_offer_id:offer.id,p_action:action});await refreshDashboard()}catch(err){alert('Could not respond: '+err.message)}return}if(buyerRevise){const offer=offerRows.find(r=>r.id===buyerRevise.dataset.buyerRevise);if(!offer||offer.buyer_id!==config?.uid||offer.status!=='countered')return;buyerRevisionId=offer.id;$('buyerRevisionForm').reset();$('buyerRevisionForm').elements.currency.value=offer.counter_currency||offer.currency||'CAD';$('buyerRevisionTitle').textContent='Seller counteroffer: '+money(offer.counter_amount,offer.counter_currency||offer.currency);$('buyerRevisionStatus').textContent='';$('buyerRevisionDialog').showModal();return}if(respond){const action=respond.dataset.respond;
 const offer=offerRows.find(row=>row.id===respond.dataset.id);
 if(action==='accepted'&&offer?.is_purchase_request){
   const terms=prompt('Confirm availability and enter the shipping cost and currency, or describe local pickup.','');
   if(terms===null)return;
   if(!terms.trim()||terms.trim().length>500){alert('Enter shipping or pickup terms up to 500 characters.');return;}
   respond.disabled=true;
   try{
     await api('rpc/marketplace_accept_purchase_request','POST',{p_offer_id:offer.id,p_shipping_terms:terms.trim()});
     await load();
   }catch(error){alert('Could not accept request: '+error.message);respond.disabled=false;}
   return;
 }
if(!confirm((action==='accepted'?'Accept':'Decline')+' this offer? This does not process a payment or complete a sale.'))return;try{await api('rpc/marketplace_respond_offer','POST',{p_offer_id:respond.dataset.id,p_action:action});await refreshDashboard()}catch(err){alert('Could not update offer: '+err.message)}return}
 if(counter){counterId=counter.dataset.counter;const r=offerRows.find(x=>x.id===counterId);$('counterTitle').textContent=r?money(r.offer_amount,r.currency):'';$('counterForm').reset();$('counterForm').elements.counter_currency.value=r?.currency||'CAD';$('counterStatus').textContent='';$('counterDialog').showModal()}};
 $('counterForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());try{await api('rpc/marketplace_respond_offer','POST',{p_offer_id:counterId,p_action:'countered',p_counter_amount:Number(f.counter_amount),p_counter_currency:f.counter_currency});$('counterDialog').close();await refreshDashboard()}catch(err){$('counterStatus').textContent='Could not counter: '+err.message}};
 $('reviewForm').onsubmit=async e=>{e.preventDefault();if(!reviewSaleId)return;const f=Object.fromEntries(new FormData(e.currentTarget).entries());const submit=e.currentTarget.querySelector('[type=submit]');submit.disabled=true;try{await api('rpc/marketplace_submit_review','POST',{p_sale_id:reviewSaleId,p_rating:Number(f.rating),p_review_text:f.review_text.trim()});$('reviewDialog').close();reviewSaleId=null;await refreshDashboard();render()}catch(err){$('reviewStatus').textContent='Could not post review: '+err.message}finally{submit.disabled=false}};$('cancelReview').onclick=()=>$('reviewDialog').close();
$('cancelCounter').onclick=()=>$('counterDialog').close();
  $('cancelBuyerRevision').onclick=()=>$('buyerRevisionDialog').close();
  $('buyerRevisionForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());const amount=Number(f.amount);if(!buyerRevisionId||!Number.isFinite(amount)||amount<=0||amount>999999){$('buyerRevisionStatus').textContent='Enter a valid amount.';return}try{await api('rpc/marketplace_buyer_respond_offer','POST',{p_offer_id:buyerRevisionId,p_action:'revise',p_amount:amount,p_currency:f.currency});$('buyerRevisionDialog').close();buyerRevisionId=null;await refreshDashboard()}catch(err){$('buyerRevisionStatus').textContent='Could not revise: '+err.message}};
 $('myOffers').onclick=()=>{dashboardTab='incoming';renderDashboard();$('marketplaceDashboard').scrollIntoView({behavior:'smooth',block:'start'})};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&config?.uid)refreshDashboard()});setInterval(()=>{if(!document.hidden&&config?.uid)refreshDashboard()},60000);
$('listingForm').elements.artist.addEventListener('input',()=>selectedReleaseId=null);$('listingForm').elements.album.addEventListener('input',()=>selectedReleaseId=null);$('lookupAlbum').onclick=lookupAlbum;$('applyRelease').onclick=applyRelease;$('closeOffer').onclick=()=>$('offerDialog').close();$('closeOffers').onclick=()=>$('offersDialog').close();$('connect').textContent='Connect to Marketplace Test';$('connect').onclick=()=>{showLogin();};$('refresh').onclick=load;$('search').oninput=()=>{clearTimeout(browseDebounce);browseDebounce=setTimeout(()=>{browsePage=0;load()},350)};$('type').onchange=()=>{browsePage=0;load()};$('formatFilter').onchange=()=>{browsePage=0;load()};fillRecords();createLogin();const oldHelp=$('connect').closest('.row').nextElementSibling;if(oldHelp && oldHelp.classList.contains('muted'))oldHelp.textContent='Use your separate Marketplace Test Supabase account. Your private Vault sign-in is not used here.';connect().then(ok=>{if(!ok)showLogin();load()});
})();
