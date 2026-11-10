(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SETTINGS='barry_marketplace_test_connection_v1', AUTH='barry_marketplace_test_session_v1', LOCAL='barry_vinyl_vault_v33_cloud_local';
let config=null,listings=[],chosen=null;
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
 $('connect').insertAdjacentElement('afterend',panel);
 const saved=readJson(localStorage,SETTINGS)||{};
 for(const field of ['url','pub','email'])if(saved[field])panel.querySelector('[name="'+field+'"]').value=saved[field];
 $('marketplaceLoginForm').onsubmit=async e=>{
  e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget).entries());
  const msg=$('marketplaceLoginMessage');msg.textContent='Signing in…';
  const url=f.url.trim().replace(/\/$/,'');const pub=f.pub.trim();
  if(!validUrl(url)||!pub.startsWith('sb_publishable_')){msg.textContent='Enter a valid Supabase Project URL and sb_publishable_ key.';return}
  try{
   const res=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:pub,'Content-Type':'application/json'},body:JSON.stringify({email:f.email.trim(),password:f.password})});
   const data=await res.json();if(!res.ok||!data.access_token||!data.user?.id)throw Error(data.msg||data.error_description||data.message||'Sign-in failed');
   config={url,pub,email:f.email.trim(),uid:data.user.id,token:data.access_token,refreshToken:data.refresh_token};
   localStorage.setItem(SETTINGS,JSON.stringify({url,pub,email:config.email}));persistSession();
   e.currentTarget.elements.password.value='';msg.textContent='Signed in successfully.';hideLogin();status('Marketplace Test: signed in as '+config.email);await load();
  }catch(err){msg.textContent='Sign-in failed: '+err.message}
 };
 $('marketplaceLogout').onclick=()=>{config=null;sessionStorage.removeItem(AUTH);listings=[];render();status('Signed out of Marketplace Test.');showLogin()};
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
function fillRecords(){let rows=[];try{rows=JSON.parse(localStorage.getItem(LOCAL)||'[]');if(!Array.isArray(rows))rows=[]}catch{}$('recordSelect').innerHTML='<option value="">Manual listing</option>'+rows.map((r,i)=>'<option value="'+i+'">'+esc((r.artist||'')+' — '+(r.album||'')+' ('+(r.id||'')+')')+'</option>').join('');$('recordSelect').onchange=()=>{const r=rows[Number($('recordSelect').value)];if($('recordSelect').value===''||!r)return;const f=$('listingForm');for(const [k,v] of Object.entries({artist:r.artist,album:r.album,pressing:r.pressing,condition:r.condition,region:r.country,image_url:/^https:\/\//i.test(r.cover||'')?r.cover:''})){if(f.elements[k])f.elements[k].value=v||''}}}
async function load(){if(!config?.token)return;$('listingStatus').textContent='Loading public listings…';try{listings=await api('marketplace_listings','GET',null,'?select=id,seller_id,artist,album,listing_type,asking_price,currency,condition,pressing,region,description,image_url,created_at&status=eq.active&order=created_at.desc&limit=100');render()}catch(e){$('listingStatus').textContent='Marketplace not ready: '+e.message+'. See SETUP_MARKETPLACE.sql.'}}
function render(){const q=$('search').value.trim().toLowerCase(),t=$('type').value;const filtered=listings.filter(r=>(!t||r.listing_type===t||r.listing_type==='both')&&[r.artist,r.album,r.pressing,r.region].some(x=>String(x||'').toLowerCase().includes(q)));$('listingStatus').textContent=filtered.length+' public listing(s)';$('listings').innerHTML=filtered.map(r=>'<article class="listing">'+(r.image_url?'<img alt="Album cover" loading="lazy" src="'+esc(r.image_url)+'" onerror="this.remove()">':'')+'<h3>'+esc(r.artist)+' — '+esc(r.album)+'</h3><p class="price">'+(r.listing_type==='trade'?'Trade offers welcome':new Intl.NumberFormat('en-CA',{style:'currency',currency:r.currency}).format(Number(r.asking_price||0)))+'</p><p>'+esc(r.listing_type)+' · '+esc(r.condition||'Condition not specified')+'</p><small>'+esc(r.pressing||'')+' · '+esc(r.region||'')+'</small><p>'+esc(r.description||'')+'</p><button data-offer="'+esc(r.id)+'">Make an offer</button>'+((config?.uid===r.seller_id)?' <button data-close="'+esc(r.id)+'">Withdraw my listing</button>':'')+'</article>').join('')||'<p class="muted">No matching listings yet.</p>'}
$('listings').onclick=async e=>{const offer=e.target.closest('[data-offer]'),close=e.target.closest('[data-close]');if(offer){chosen=listings.find(r=>r.id===offer.dataset.offer);if(!chosen)return;if(chosen.seller_id===config?.uid){alert('You cannot offer on your own listing.');return}$('offerTitle').textContent=chosen.artist+' — '+chosen.album;$('offerStatus').textContent='';$('offerDialog').showModal()}if(close&&confirm('Withdraw this public listing?')){try{await api('marketplace_listings','PATCH',{status:'withdrawn'},'?id=eq.'+encodeURIComponent(close.dataset.close));await load()}catch(err){alert(err.message)}}};
$('listingForm').onsubmit=async e=>{e.preventDefault();if(!config?.uid)return alert('Connect your account first');const f=Object.fromEntries(new FormData(e.target).entries());if(!confirm('Publish '+f.artist+' — '+f.album+' to the PUBLIC marketplace? Only listing form fields will be shared.'))return;const payload={seller_id:config.uid,artist:f.artist.trim(),album:f.album.trim(),listing_type:f.listing_type,asking_price:Number(f.asking_price),currency:f.currency,condition:f.condition.trim(),pressing:f.pressing.trim(),region:f.region.trim(),description:f.description.trim(),image_url:f.image_url.trim()||null};try{await api('marketplace_listings','POST',payload);$('publishStatus').textContent='Published successfully.';e.target.reset();await load()}catch(err){$('publishStatus').textContent='Not published: '+err.message}};
$('offerForm').onsubmit=async e=>{e.preventDefault();if(!chosen)return;const f=Object.fromEntries(new FormData(e.target).entries());try{await api('marketplace_offers','POST',{listing_id:chosen.id,buyer_id:config.uid,offer_type:f.offer_type,offer_amount:f.offer_amount?Number(f.offer_amount):null,currency:f.currency,message:f.message.trim()});$('offerDialog').close();alert('Offer sent. The seller can view it in their offers inbox.')}catch(err){$('offerStatus').textContent='Offer not sent: '+err.message}};
$('myOffers').onclick=async()=>{try{const rows=await api('marketplace_offers','GET',null,'?select=id,listing_id,buyer_id,offer_type,offer_amount,currency,message,status,created_at&order=created_at.desc&limit=100');$('offersList').innerHTML=rows.map(r=>'<section><b>'+esc(r.offer_type)+' · '+esc(r.status)+'</b><p>'+esc(r.message)+'</p><small>Listing '+esc(r.listing_id)+' · '+new Date(r.created_at).toLocaleDateString()+'</small></section>').join('')||'<p>No offers yet.</p>';$('offersDialog').showModal()}catch(e){alert('Cannot load offers: '+e.message)}};
$('closeOffer').onclick=()=>$('offerDialog').close();$('closeOffers').onclick=()=>$('offersDialog').close();$('connect').onclick=()=>{showLogin();};$('refresh').onclick=load;$('search').oninput=render;$('type').onchange=render;fillRecords();createLogin();connect().then(ok=>{if(ok)load();else showLogin()});
})();
