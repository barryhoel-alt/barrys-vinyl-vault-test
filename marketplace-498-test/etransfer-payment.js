/* Vinyl Vault 4.15: direct e-Transfer panel. No banking integration.
 * Mount with a trusted authenticated Supabase client and a sale record.
 * Database RLS is authoritative. Do not mount for legacy/non-CAD sales.
 */
export async function mountEtransferPayment({container, supabase, sale, onChange = () => {}}) {
  if (!(container instanceof HTMLElement)) throw new Error("Payment container required");
  const el = (tag, text) => { const n = document.createElement(tag); if (text != null) n.textContent = text; return n; };
  const panel = el("section"); panel.className = "vv-payment-panel";
  container.replaceChildren(panel);
  const {data: auth, error: authError} = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (authError || !uid || !sale?.id || ![sale.buyer_id, sale.seller_id].includes(uid)) {
    panel.append(el("p", "Sign in as a transaction participant to view payment details.")); return;
  }
  if (sale.currency !== "CAD") { panel.append(el("p", "Direct e-Transfer is available for CAD transactions only.")); return; }
  const seller = uid === sale.seller_id;
  let pending = false;
  async function render() {
    const {data, error} = await supabase.from("marketplace_payment_events").select("event_type,transfer_email,total_cad,created_at,actor_id").eq("sale_id", sale.id);
    if (error) throw error;
    const events = new Map((data || []).map(e => [e.event_type,e]));
    panel.replaceChildren(el("h3", "Interac e-Transfer"), el("p", "Pay the seller directly through your bank. Vinyl Vault does not hold funds or verify bank deposits."));
    const status = el("p"); status.setAttribute("role","status");
    const act = async (event, extra = {}) => {
      if (pending) return; pending = true;
      panel.querySelectorAll("button,input").forEach(n => n.disabled = true);
      try {
        const {error} = await supabase.from("marketplace_payment_events").insert({sale_id:sale.id,event_type:event,...extra});
        if (error) throw error;
        await render(); await onChange();
      } catch (err) { status.textContent = err?.message || "Payment update failed. Refresh before retrying."; }
      finally { pending = false; panel.querySelectorAll("button,input").forEach(n => n.disabled = false); }
    };
    const button = (label, cb) => { const b = el("button", label); b.type="button"; b.addEventListener("click",cb); panel.append(b); };
    const instructions = events.get("instructions"), pickup=events.get("cash_pickup"), paid=events.has("received")||events.has("cash_received");
    const unread=(data||[]).filter(e=>e.actor_id!==uid);
    const {data:reads,error:readError}=await supabase.from("marketplace_payment_notification_reads").select("event_type").eq("sale_id",sale.id);
    if(!readError){
      const unseen=unread.filter(e=>!(reads||[]).some(r=>r.event_type===e.event_type));
      if(unseen.length){panel.append(el("p",unseen.length+" new payment update(s)"));button("Mark updates read",async()=>{try{for(const e of unseen){const {error}=await supabase.from("marketplace_payment_notification_reads").insert({sale_id:sale.id,event_type:e.event_type});if(error&&error.code!=="23505")throw error;}await render();}catch(error){status.textContent=error.message;}});}
    }
    if (!instructions&&!pickup) {
      panel.append(el("p","Awaiting seller payment instructions."));
      if (seller) {
        const email=el("input");email.type="email";email.required=true;email.maxLength=254;email.autocomplete="email";
        const total=el("input");total.type="number";total.min=String(sale.agreed_amount);total.step="0.01";total.required=true;total.value=String(sale.agreed_amount??"");
        const le=el("label","e-Transfer recipient email ");le.append(email);const lt=el("label","Agreed total CAD ");lt.append(total);
        panel.append(le,lt,el("p","Agree on payment method and total with buyer first. Instructions cannot be edited after submission."));
        const validTotal=()=>total.reportValidity()&&Number.isFinite(Number(total.value))&&Number(total.value)>0;
        button("Save e-Transfer instructions",()=>{if(email.reportValidity()&&validTotal()&&window.confirm("Confirm recipient and total including shipping?"))act("instructions",{transfer_email:email.value.trim(),total_cad:Number(total.value)});});
        button("Arrange cash pickup",()=>{if(validTotal()&&window.confirm("Both parties agreed to local pickup and this cash total? Shipping will be disabled."))act("cash_pickup",{total_cad:Number(total.value)});});
      }
    } else {
      panel.append(el("p",pickup?"Cash on local pickup":"Recipient: "+instructions.transfer_email),el("p","Total: "+new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(Number((pickup||instructions).total_cad))));
      if(events.has("refund_received"))panel.append(el("p","Buyer confirmed refund received. Not independently verified."));
      else if(events.has("refund_sent")){panel.append(el("p","Seller reports full refund issued."));if(!seller)button("Confirm full refund received",()=>{if(window.confirm("Have you actually received the full agreed refund?"))act("refund_received");});}
      else if(paid){panel.append(el("p","Seller confirmed receipt. Not independently verified by Vinyl Vault."));if(seller)button("Report full refund issued",()=>{if(window.confirm("Have you actually returned the entire payment to the buyer? This does not transfer funds."))act("refund_sent");});}
      else if(events.has(pickup?"cash_paid":"sent")){
        panel.append(el("p","Buyer reports payment made. Awaiting seller confirmation."));
        if(seller)button("Confirm funds received",()=>{if(window.confirm(pickup?"Have you received and counted the full cash payment?":"Have you checked your bank account and confirmed the full deposit?"))act(pickup?"cash_received":"received");});
      }else{
        panel.append(el("p",pickup?"Pay at the agreed pickup.":"Awaiting buyer payment. Verify the recipient independently."));
        if(!seller)button(pickup?"Mark cash paid":"Mark payment sent",()=>{if(window.confirm("Have you actually paid the full agreed amount?"))act(pickup?"cash_paid":"sent");});
      }
    }
    panel.append(status);
  }
  try { await render(); } catch (err) { panel.append(el("p",err?.message || "Unable to load payment status.")); }
}
