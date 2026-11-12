/* 4.9.6 — visual transaction protection. Authorization must remain server-side. */
(()=>{'use strict';
const panel=document.getElementById('dashboardPanel');if(!panel)return;
const note=document.createElement('div');note.className='vv496-safety';note.setAttribute('role','note');note.innerHTML='<strong>Transaction safety:</strong> An accepted offer is not proof of payment. Only mark an item sold after independently confirming the agreement. Never rely on screenshots of transfers or share passwords, verification codes, or private addresses in listings.';
const dashboard=document.getElementById('marketplaceDashboard');if(dashboard)dashboard.append(note);
function enhance(){
 for(const card of panel.querySelectorAll('.offer-card')){
  if(card.dataset.vv496==='done')continue;
  const pill=card.querySelector('.pill');const status=(pill?.textContent||'').trim().toLowerCase();
  if(card.classList.contains('sale-history-card')){
   const info=card.querySelector('.sale-info');if(info){const tag=document.createElement('p');tag.className='vv496-transaction-tag';tag.textContent='Recorded sale · payment and delivery not independently verified';info.append(tag)}
  }else if(status==='accepted'){
   const soldButton=card.querySelector('[data-mark-sold]');
   const tag=document.createElement('div');tag.className='vv496-transaction-tag';tag.textContent=soldButton?'Accepted agreement · eligible for seller to record sale':'Accepted agreement · check sales history for any recorded sale';
   const warning=card.querySelector('.vv495-payment-note');(warning||card).insertAdjacentElement(warning?'beforebegin':'beforeend',tag);
  }else if(status==='countered'){
   const tag=document.createElement('p');tag.className='vv496-transaction-tag';tag.textContent='Negotiation in progress · no agreement yet';card.append(tag);
  }
  card.dataset.vv496='done';
 }
}
let running=false;const obs=new MutationObserver(()=>{if(running)return;running=true;try{enhance()}finally{running=false}});obs.observe(panel,{childList:true,subtree:true});enhance();
})();
