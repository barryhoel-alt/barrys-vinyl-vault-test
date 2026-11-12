/* 4.9.7 — optional offer notes and active-negotiation visibility.
   Supabase migration must be applied before testing blank notes. */
(()=>{'use strict';const d=document.getElementById('marketplaceDashboard');if(!d)return;const p=document.createElement('p');p.className='vv497-alert';p.textContent='Offer updates: check Offers I’ve sent for seller replies. A pending or accepted offer blocks additional offers on the same listing; respond to a counteroffer in your dashboard.';d.insertBefore(p,d.querySelector('#dashboardPanel'));})();
