(()=>{'use strict';
const $=id=>document.getElementById(id);
const SETTINGS='barry_marketplace_test_connection_v1';
function settings(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'null')||{}}catch{return {}}}
function valid(s){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(s.url||'')&&/^sb_publishable_/.test(s.pub||'')}
const login=$('marketplaceLogin');if(!login)return;
const loginForm=$('marketplaceLoginForm');
const heading=document.createElement('div');heading.className='account-quickstart';heading.innerHTML='<h3>Welcome back, collector.</h3><p>Sign in with your Marketplace Test email and password. New here? Create a test account below.</p><div class="account-tools"><button type="button" id="vvCreate">Create account</button><button type="button" id="vvReset">Forgot password?</button></div><p class="account-safety-note">Test marketplace only. No payments, escrow, shipping guarantees or buyer protection are active.</p>';
login.insertBefore(heading,loginForm);
const urlField=loginForm.querySelector('[name="url"]');const pubField=loginForm.querySelector('[name="pub"]');
const urlLabel=urlField.closest('label'),pubLabel=pubField.closest('label');
const adv=document.createElement('details');adv.className='connection-advanced';adv.innerHTML='<summary>Marketplace Test connection settings (administrator setup)</summary><p class="muted">Needed only when connecting a new browser. Use the public publishable key, never a service-role key.</p>';
urlLabel.parentNode.insertBefore(adv,urlLabel);adv.appendChild(urlLabel);adv.appendChild(pubLabel);
// Preserve the current sign-in logic and the owner's saved test configuration.
function sync(){const s=settings();if(s.url&&!urlField.value)urlField.value=s.url;if(s.pub&&!pubField.value)pubField.value=s.pub;if(valid(s)){adv.open=false;urlField.required=false;pubField.required=false;}else{adv.open=true;urlField.required=true;pubField.required=true;}}
sync();
const note=document.createElement('div');note.className='vv-account-status';note.textContent='Account creation requires Supabase email confirmation to be enabled in your project. Seller verification, server-side email gating and moderation are not yet enforced.';heading.appendChild(note);
const dialog=$('vvAuthDialog'),form=$('vvAuthForm'),msg=$('vvAuthMessage');let mode='signup';
function open(which){mode=which;form.reset();msg.textContent='';$('vvPasswordFields').hidden=which==='reset';$('vvAuthTitle').textContent=which==='signup'?'Create a collector account':'Reset your password';$('vvAuthIntro').textContent=which==='signup'?'Register with an email address. Check your inbox for a confirmation link if email confirmation is enabled.':'We will request a password recovery email. Use the link in your inbox to continue securely.';$('vvAuthSubmit').textContent=which==='signup'?'Create test account':'Send reset email';dialog.showModal();}
$('vvCreate').onclick=()=>open('signup');$('vvReset').onclick=()=>open('reset');$('vvAuthClose').onclick=()=>dialog.close();
form.onsubmit=async e=>{e.preventDefault();const s=settings();if(!valid(s)){msg.textContent='First set up your Marketplace Test project URL and publishable key in the connection settings, then try again.';adv.open=true;dialog.close();return;}
 const data=Object.fromEntries(new FormData(form));if(mode==='signup'&&(data.password.length<8||data.password!==data.confirm)){msg.textContent='Passwords must match and contain at least 8 characters.';return;}
 const submit=$('vvAuthSubmit');submit.disabled=true;msg.textContent='Submitting request…';
 try{const endpoint=mode==='signup'?'/auth/v1/signup':'/auth/v1/recover';const payload=mode==='signup'?{email:data.email.trim(),password:data.password}:{email:data.email.trim()};
 const res=await fetch(s.url.replace(/\/$/,'')+endpoint,{method:'POST',headers:{apikey:s.pub,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw Error(body.msg||body.error_description||body.message||'Request failed');
 msg.textContent=mode==='signup'?'Request received. Check your email for a confirmation message if enabled. Account permissions must be configured before public use.':'If the address is registered, recovery instructions will be emailed. Follow the secure link to reset your password.';
 form.reset();}catch(err){msg.textContent='Could not complete request: '+err.message;}finally{submit.disabled=false;}};
})();