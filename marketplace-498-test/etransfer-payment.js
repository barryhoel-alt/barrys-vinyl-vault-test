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
    const {data, error} = await supabase.from("marketplace_payment_events").select("event_type,transfer_email,total_cad,created_at").eq("sale_id", sale.id);
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
    const instructions = events.get("instructions");
    if (!instructions) {
      panel.append(el("p","Awaiting seller payment instructions."));
      if (seller) {
        const email = el("input"); email.type="email"; email.required=true; email.maxLength=254; email.autocomplete="email";
        const total = el("input"); total.type="number"; total.min=String(sale.agreed_amount); total.step="0.01"; total.required=true;
        total.value=String(sale.agreed_amount ?? "");
        const le=el("label","e-Transfer recipient email ");le.append(email);
        const lt=el("label","Total CAD including agreed shipping ");lt.append(total);
        panel.append(le,lt,el("p","Check the address and agreed total carefully. Instructions cannot be edited after submission."));
        button("Save payment instructions",()=>{if(!email.reportValidity()||!total.reportValidity()||!Number.isFinite(Number(total.value)))return; if(!window.confirm("Confirm this exact recipient and total?"))return; act("instructions",{transfer_email:email.value.trim(),total_cad:Number(total.value)});});
      }
    } else {
      panel.append(el("p","Recipient: "+instructions.transfer_email),el("p","Total: "+new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(Number(instructions.total_cad))));
      if(events.has("received")) panel.append(el("p","Seller confirmed receipt. Not independently verified by Vinyl Vault."));
      else if(events.has("sent")) {
        panel.append(el("p","Buyer reports payment sent. Awaiting seller bank confirmation."));
        if(seller) button("Confirm funds received",()=>{if(window.confirm("Have you independently checked your bank account and confirmed the full deposit?"))act("received");});
      } else {
        panel.append(el("p","Awaiting buyer payment. Confirm the recipient through a trusted channel before sending."));
        if(!seller) button("Mark payment sent",()=>{if(window.confirm("Have you actually sent the full amount through your bank?"))act("sent");});
      }
    }
    panel.append(status);
  }
  try { await render(); } catch (err) { panel.append(el("p",err?.message || "Unable to load payment status.")); }
}
