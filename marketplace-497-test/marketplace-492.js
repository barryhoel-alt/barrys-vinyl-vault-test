(()=>{'use strict';
const $=id=>document.getElementById(id);
const views=new Set(['home','browse','sell','dashboard','account']);
function navigate(view,{hash=true}={}){
 if(!views.has(view))view='home';document.body.dataset.currentView=view;
 document.querySelectorAll('[data-nav-view]').forEach(a=>{if(a.dataset.navView===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 if(hash){const ids={home:'top',browse:'browse',sell:'publish',dashboard:'marketplaceDashboard',account:'connection'};history.replaceState(null,'','#'+ids[view]);}
 window.scrollTo({top:0,behavior:'instant'});
 if(view==='home')updateHome();
}
function updateHome(){const source=$('listings'),target=$('homeListings');if(!source||!target)return;
 // Copy only actual rendered listings, never fabricated items or prices.
 target.innerHTML='';const nodes=[...source.querySelectorAll('.listing')].slice(0,6);
 if(nodes.length){nodes.forEach(n=>target.appendChild(n.cloneNode(true)));}else{const p=document.createElement('p');p.className='muted';p.textContent=source.textContent.trim()||'Sign in to view current listings.';target.appendChild(p);}
}
function routeFromHash(){const h=location.hash;return {'#browse':'browse','#publish':'sell','#marketplaceDashboard':'dashboard','#connection':'account'}[h]||'home'}
document.addEventListener('click',e=>{
 const nav=e.target.closest('a[href^="#"]');if(nav){const h=nav.getAttribute('href');const v={'#top':'home','#browse':'browse','#publish':'sell','#marketplaceDashboard':'dashboard','#connection':'account'}[h];if(v){e.preventDefault();navigate(v);if(nav.dataset.dashboardTab==='sales')$('dashSales')?.click();return;}}
 const category=e.target.closest('[data-shop-format],[data-format-link]');if(category){e.preventDefault();const txt=category.textContent.toLowerCase();const select=$('formatFilter');if(select&&category.hasAttribute('data-shop-format')){select.value=category.dataset.shopFormat;select.dispatchEvent(new Event('change'));}else if(select){const match=[...select.options].find(o=>o.text.toLowerCase().includes(txt.includes('vinyl')?'vinyl':txt.includes('cassette')?'cassette':txt.includes('blu')?'blu':txt.includes('memorabilia')?'memorabilia':txt.includes('cd')?'cd':'all formats'));select.value=match?.value||'';select.dispatchEvent(new Event('change'));}navigate('browse');return;}
 if(e.target.closest('#homeBrowseMore,#railBrowse')){navigate('browse');return;}
 // Cloned home cards delegate to the original listings handler by clicking the corresponding original action.
 const action=e.target.closest('#homeListings [data-details],#homeListings [data-edit],#homeListings [data-offer],#homeListings [data-close]');if(action){const attr=['data-details','data-edit','data-offer','data-close'].find(a=>action.hasAttribute(a));const val=action.getAttribute(attr);const orig=[...$('listings').querySelectorAll('['+attr+']')].find(x=>x.getAttribute(attr)===val);if(orig)orig.click();}
});
const source=$('listings');if(source){const observer=new MutationObserver(()=>{if(document.body.dataset.currentView==='home')updateHome()});observer.observe(source,{childList:true});}
window.addEventListener('hashchange',()=>navigate(routeFromHash(),{hash:false}));
// Existing dashboard actions can scroll to a hidden view: switch to it first.
$('myOffers')?.addEventListener('click',()=>navigate('dashboard'));
navigate(routeFromHash(),{hash:false});
})();