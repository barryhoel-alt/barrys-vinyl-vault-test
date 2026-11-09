// Vinyl Vault 3.0 extra tools. This TEST does not communicate with Supabase.
(() => {
 const $=id=>document.getElementById(id);
 const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const originalRender=render;
 render=function(){originalRender(); const f=$('filter').value;if(f==='signed'||f==='unverified'){$('gallery').querySelectorAll('[data-id]').forEach(el=>{const r=records.find(x=>x.id===el.dataset.id);el.style.display=(f==='signed'?!!r?.signedBy:!r?.pressingVerified||/unverified/i.test(r.pressingVerified))?'':'none'})}};
 $('printCollection').addEventListener('click',()=>window.print());
 $('statsReport').addEventListener('click',()=>{
  const el=$('collectionReport');el.classList.toggle('hidden');if(el.classList.contains('hidden'))return;
  const countBy=key=>Object.entries(records.reduce((a,r)=>{const v=String(r[key]||'Not specified').trim();a[v]=(a[v]||0)+1;return a},{})).sort((a,b)=>b[1]-a[1]);
  const line=(title,items)=>`<h3>${title}</h3><p>${items.slice(0,15).map(([k,n])=>`${escapeHTML(k)}: <b>${n}</b>`).join(' · ')}</p>`;
  const sum=k=>records.reduce((n,r)=>n+(Number(r[k])||0),0);
  el.innerHTML=`<h2>Collection report</h2><p><b>${records.length}</b> records · <b>${records.filter(r=>r.cover).length}</b> with covers · <b>${records.filter(r=>r.signedBy).length}</b> signed · <b>${records.filter(r=>r.matrixRunout).length}</b> with runout details</p><p>Paid: <b>$${sum('paid').toLocaleString('en-CA')}</b> CAD · Estimated value: <b>$${sum('value').toLocaleString('en-CA')}</b> CAD (user-entered estimates)</p>${line('Media types',countBy('mediaType'))}${line('Countries',countBy('country'))}${line('Genres',countBy('genre'))}${line('Condition',countBy('condition'))}`;
 });
 // Provide a warning if a user attempts to save a record whose barcode is already catalogued.
 $('recordForm').addEventListener('submit',e=>{
  if(e.defaultPrevented)return;
  const fd=new FormData($('recordForm'));const code=String(fd.get('barcode')||'').replace(/\D/g,'');
  if(code&&records.some(r=>r.id!==editing&&String(r.barcode||'').replace(/\D/g,'')===code)){
   if(!confirm('This barcode is already in your test collection. Continue anyway?')){e.preventDefault();e.stopImmediatePropagation()}
  }
 },true);
})();
