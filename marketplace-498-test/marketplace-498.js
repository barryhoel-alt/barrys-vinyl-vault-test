/* Marketplace 4.9.8: in-app activity bell. Local browser read state, no DB migration. */
(()=>{'use strict';
const KEY='vv498_notifications_';let currentUid='',events=[],seen={},panelOpen=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const header=document.querySelector('header .brandbar')||document.querySelector('header');
if(!header)return;
const wrap=document.createElement('div');wrap.className='vv498-wrap';wrap.innerHTML='<button type="button" id="vv498Bell" aria-expanded="false" aria-controls="vv498Panel" aria-label="Notifications">🔔 <span id="vv498Count" hidden>0</span></button><div id="vv498Panel" class="vv498-panel" hidden><div class="vv498-head"><strong>Notifications</strong><button type="button" id="vv498Read">Mark all read</button></div><p class="vv498-note">Updates appear when the marketplace refreshes (about every 60 seconds while open). Read status is saved in this browser only.</p><div id="vv498Items"></div></div>';
header.appendChild(wrap);
const css=document.createElement('style');css.textContent=`.vv498-wrap{position:relative;margin-left:auto;z-index:35}.vv498-wrap #vv498Bell{border:1px solid #b88a42;background:#211a11;color:#ffe0a0;border-radius:12px;min-width:68px;min-height:45px;font-size:20px!important}.vv498-wrap #vv498Count{font-size:12px;background:#c03d35;color:white;border-radius:20px;padding:2px 6px;vertical-align:top}.vv498-panel{position:absolute;right:0;top:calc(100% + 10px);width:min(390px,calc(100vw - 28px));max-height:65vh;overflow:auto;background:#17191e;border:1px solid #9b753a;border-radius:14px;padding:14px;box-shadow:0 16px 40px #000b;color:#f4eee3}.vv498-panel[hidden]{display:none!important}.vv498-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.vv498-head button{font-size:12px!important;padding:6px 9px}.vv498-note{font-size:12px;color:#bcb4a6}.vv498-entry{display:block;width:100%;text-align:left;background:#23201c;border:1px solid #4c4131;margin:7px 0;border-radius:10px;padding:11px;color:#eee}.vv498-entry[data-unread="true"]{border-left:4px solid #e8bc63}.vv498-entry small{display:block;color:#bdb3a5;margin-top:3px}.vv498-empty{color:#bdb3a5}`;document.head.appendChild(css);
const bell=document.getElementById('vv498Bell'),panel=document.getElementById('vv498Panel');
function store(){try{localStorage.setItem(KEY+currentUid,JSON.stringify(seen))}catch{}}
function render(){const unread=events.filter(x=>!seen[x.id]).length;const count=document.getElementById('vv498Count');count.textContent=String(unread);count.hidden=!unread;bell.setAttribute('aria-label',unread+' unread notifications');document.getElementById('vv498Items').innerHTML=events.length?events.slice(0,60).map(x=>'<button type="button" class="vv498-entry" data-nid="'+esc(x.id)+'" data-tab="'+esc(x.tab)+'" data-unread="'+(!seen[x.id])+'"><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail)+'</small></button>').join(''):'<p class="vv498-empty">No activity notifications yet.</p>'}
function openPanel(open){panelOpen=open;panel.hidden=!open;bell.setAttribute('aria-expanded',String(open));if(open)render()}
bell.addEventListener('click',()=>openPanel(!panelOpen));document.getElementById('vv498Read').addEventListener('click',()=>{events.forEach(x=>seen[x.id]=true);store();render()});
panel.addEventListener('click',e=>{const b=e.target.closest('[data-nid]');if(!b)return;seen[b.dataset.nid]=true;store();render();openPanel(false);const tab={incoming:'dashIncoming',sent:'dashSent',sales:'dashSales'}[b.dataset.tab];const btn=document.getElementById(tab);if(btn)btn.click();const nav=document.querySelector('[data-view="dashboard"], [data-nav="dashboard"], a[href="#marketplaceDashboard"]');if(nav)nav.click();else document.getElementById('marketplaceDashboard')?.scrollIntoView({behavior:'smooth',block:'start'})});
document.addEventListener('click',e=>{if(panelOpen&&!wrap.contains(e.target))openPanel(false)});
window.vv498Clear=()=>{currentUid='';events=[];seen={};openPanel(false);render()};
window.vv498Update=({uid,offers=[],sales=[],owned=[]})=>{
 if(!uid)return;const mine=new Set(owned.map(x=>x.id));const next=[];
 for(const o of offers){const seller=mine.has(o.listing_id),buyer=o.buyer_id===uid;if(!seller&&!buyer)continue;let title='',tab=seller?'incoming':'sent';
 if(seller&&o.status==='pending')title='New offer received';
 else if(seller&&o.status==='accepted')title='Offer accepted';
 else if(seller&&o.status==='countered')title='Counteroffer awaiting buyer';
 else if(buyer&&o.status==='countered')title='Seller sent a counteroffer';
 else if(buyer&&o.status==='accepted')title='Your offer was accepted';
 else if(buyer&&o.status==='declined')title='Your offer was declined';
 if(!title)continue;
 const l=owned.find(x=>x.id===o.listing_id);const name=l?l.artist+' — '+l.album:'Listing '+String(o.listing_id).slice(0,8);
 next.push({id:'offer:'+o.id+':'+o.status+':'+(o.counter_amount??'')+':'+(o.counter_currency??''),title,detail:name+(o.counter_amount!=null?' · '+o.counter_amount+' '+(o.counter_currency||o.currency||'CAD'):(o.offer_amount!=null?' · '+o.offer_amount+' '+(o.currency||'CAD'):'')),tab,sort:o.created_at||''});
 }
 for(const sale of sales){if(sale.buyer_id!==uid&&sale.seller_id!==uid)continue;next.push({id:'sale:'+sale.id,title:sale.seller_id===uid?'Sale recorded':'Purchase marked sold',detail:(sale.artist||'')+' — '+(sale.album||'')+' · '+(sale.agreed_amount??'')+' '+(sale.currency||'CAD'),tab:'sales',sort:sale.completed_at||''})}
 next.sort((a,b)=>String(b.sort).localeCompare(String(a.sort)));
 if(uid!==currentUid){currentUid=uid;try{seen=JSON.parse(localStorage.getItem(KEY+uid)||'null')||{}}catch{seen={}};if(!localStorage.getItem(KEY+uid)){// Existing historical activity starts read; future status changes become unread.
 next.forEach(x=>seen[x.id]=true);store();}}
 events=next;render();
};
})();
