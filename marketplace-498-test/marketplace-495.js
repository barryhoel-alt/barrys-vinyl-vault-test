/* Vinyl Vault Marketplace 4.9.5 — presentation-only dashboard enhancements.
   Existing Supabase queries, permissions, and transaction handlers remain unchanged. */
(()=>{'use strict';
const panel=document.getElementById('dashboardPanel');if(!panel)return;
function enhance(){
 const cards=[...document.querySelectorAll('#listings .listing')];
 const art=new Map(cards.map(card=>{const title=card.querySelector('h3')?.textContent.trim();const img=card.querySelector('.cover-frame img');return [title,img?.getAttribute('src')||''];}));
 for(const card of panel.querySelectorAll('.offer-card')){
  if(card.dataset.vv495==='done')continue;
  const heading=card.querySelector('h3');const title=heading?.textContent.trim()||'';
  const badge=card.querySelector('.pill');const state=badge?.textContent.trim().toLowerCase();
  const isHistory=card.classList.contains('sale-history-card');
  if(!isHistory&&!badge&&title===''){
   // Active listing cards in 4.9.4 use <b> rather than <h3>.
   const b=card.querySelector(':scope > b');const listingTitle=b?.textContent.trim();
   if(listingTitle){card.classList.add('vv495-listing');
    const frame=document.createElement('div');frame.className='vv495-cover';
    const url=art.get(listingTitle);
    if(url&&/^https:\/\//i.test(url)){const img=document.createElement('img');img.src=url;img.alt='Cover artwork for '+listingTitle;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{frame.textContent='♫';frame.classList.add('vv495-empty')};frame.append(img)}else{frame.textContent='♫';frame.classList.add('vv495-empty')}
    card.prepend(frame);const info=document.createElement('div');info.className='vv495-listing-info';while(frame.nextSibling)info.append(card.childNodes[1]);card.append(info);
    const tag=document.createElement('span');tag.className='vv495-status';tag.textContent='Active listing';info.append(tag);
   }
  }else if(!isHistory&&badge){
   card.classList.add('vv495-offer');
   const amount=card.querySelector('.offer-amount');const counter=[...card.querySelectorAll('p')].find(p=>p.textContent.trim().startsWith('Seller counteroffer:'));
   const counterText=counter?.textContent.trim().replace(/^Seller counteroffer:\s*/,'');
   if(amount){const original=amount.textContent.trim();const originalLabel=document.createElement('div');originalLabel.className='vv495-amount-label';originalLabel.textContent='Original buyer offer';amount.before(originalLabel);
    if(state==='accepted'&&counterText){amount.textContent=counterText;originalLabel.textContent='Agreed price · accepted counteroffer';amount.classList.add('vv495-agreed');const detail=document.createElement('p');detail.className='vv495-original';detail.textContent='Original buyer offer: '+original;amount.after(detail);counter?.remove();}
    else if(state==='accepted'){originalLabel.textContent='Accepted offer · agreed price';amount.classList.add('vv495-agreed');}
    else if(state==='countered'&&counterText){const detail=document.createElement('div');detail.className='vv495-counter';detail.innerHTML='<small>Seller counteroffer</small><strong></strong>';detail.querySelector('strong').textContent=counterText;amount.after(detail);counter?.remove();}
   }
   const states={pending:'Awaiting seller response',countered:'Awaiting buyer response',accepted:'Offer accepted · payment not verified',declined:'Offer declined',withdrawn:'Offer withdrawn'};
   if(states[state]){const note=document.createElement('p');note.className='vv495-status-note';note.textContent=states[state];badge.after(note)}
   if(state==='accepted'){const note=document.createElement('p');note.className='vv495-payment-note';note.textContent='Agreement recorded only. Payment, shipment and delivery have not been verified.';card.append(note)}
  }
  card.dataset.vv495='done';
 }
}
let busy=false;const obs=new MutationObserver(()=>{if(busy)return;busy=true;try{enhance()}finally{busy=false}});
obs.observe(panel,{childList:true,subtree:true});const browse=document.getElementById('listings');if(browse)obs.observe(browse,{childList:true});enhance();
})();
