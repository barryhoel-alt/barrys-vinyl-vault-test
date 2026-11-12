(()=>{'use strict';
const $=id=>document.getElementById(id);
const header=document.querySelector('header .brandbar')||document.querySelector('header');
const indicator=document.createElement('button');indicator.type='button';indicator.id='vvSessionIndicator';indicator.className='vv-session-indicator';indicator.setAttribute('aria-label','Open My Account');
indicator.innerHTML='<span class="vv-session-dot" aria-hidden="true"></span><span class="vv-session-text"><strong id="vvSessionLabel">Sign in</strong><small id="vvSessionIdentity">Collector account</small></span><span aria-hidden="true">◉</span>';
header.appendChild(indicator);
const account=$('connection');const welcome=document.createElement('div');welcome.id='vvWelcome';welcome.className='vv-welcome';welcome.setAttribute('role','status');
welcome.innerHTML='<div class="vv-welcome-heading"><span class="vv-welcome-symbol" aria-hidden="true">✓</span><div><h3 id="vvWelcomeTitle">Sign in to your account</h3><p id="vvWelcomeDetail">Access your listings, offers and sales.</p></div></div><div class="vv-welcome-actions"><button type="button" id="vvWelcomeDashboard">My dashboard</button><button type="button" id="vvWelcomeSignOut">Sign out</button></div>';
const auth=$('authStatus');auth.insertAdjacentElement('afterend',welcome);
const login=$('marketplaceLogin'),logout=$('marketplaceLogout'),connect=$('connect');
function signedIn(){return /^Marketplace Test: signed in as /i.test(auth.textContent||'') && !!login?.hidden;}
function identity(){const s=(auth.textContent||'').match(/^Marketplace Test: signed in as (.+)$/i);return s?s[1].trim():'';}
function update(){const active=signedIn();indicator.classList.toggle('is-signed-in',active);$('vvSessionLabel').textContent=active?'✓ Signed in':'Sign in';$('vvSessionIdentity').textContent=active?identity():'Collector account';$('vvWelcomeTitle').textContent=active?'You’re signed in!':'Welcome to Vinyl Vault';$('vvWelcomeDetail').textContent=active?'Signed in as '+identity()+'. You can manage your listings and offers.':'Sign in to view your listings, offers and marketplace activity.';$('vvWelcomeDashboard').hidden=!active;$('vvWelcomeSignOut').hidden=!active;if(connect)connect.hidden=active;}
indicator.addEventListener('click',()=>{const link=document.querySelector('[data-nav-view="account"]');if(link)link.click();else account.scrollIntoView({behavior:'smooth'});});
$('vvWelcomeDashboard').addEventListener('click',()=>{const link=document.querySelector('[data-nav-view="dashboard"]');if(link)link.click();else $('marketplaceDashboard').scrollIntoView({behavior:'smooth'});});
$('vvWelcomeSignOut').addEventListener('click',()=>{if(logout)logout.click();else {const link=document.querySelector('[data-nav-view="account"]');link?.click();}});
// Observe the existing authentication UI; do not create a second authentication system.
const observer=new MutationObserver(update);observer.observe(auth,{childList:true,characterData:true,subtree:true});if(login)observer.observe(login,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('pageshow',update);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});update();
})();
