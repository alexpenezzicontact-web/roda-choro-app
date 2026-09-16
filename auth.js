(() => {
'use strict';

const cfg = window.RODA_AUTH_CONFIG || {};
const KEYS = ['roda.favorites','roda.setlist','roda.userSongs','roda.font','roda.cols'];
const $ = id => document.getElementById(id);
let client = null;
let session = null;
let persistTimer = null;
let initialized = false;
let emailMode = 'signin';

const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;

function configured(){
  return Boolean(cfg.url && cfg.publishableKey && window.supabase?.createClient);
}
function setStatus(text, kind=''){
  const el = $('authStatus');
  if(!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind;
}
function localState(){
  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  return {
    favorites: parse('roda.favorites', []),
    setlist: parse('roda.setlist', []),
    user_songs: parse('roda.userSongs', []),
    preferences: {
      font: localStorage.getItem('roda.font') || '18',
      cols: localStorage.getItem('roda.cols') || '4'
    }
  };
}
function silentSet(key, value){
  nativeSetItem.call(localStorage, key, value);
}
function updateLocalFromState(state){
  if(!state) return;
  if(Array.isArray(state.favorites)) silentSet('roda.favorites', JSON.stringify(state.favorites));
  if(Array.isArray(state.setlist)) silentSet('roda.setlist', JSON.stringify(state.setlist));
  if(Array.isArray(state.user_songs)) silentSet('roda.userSongs', JSON.stringify(state.user_songs));
  if(state.preferences?.font) silentSet('roda.font', String(state.preferences.font));
  if(state.preferences?.cols) silentSet('roda.cols', String(state.preferences.cols));
}
function mergeById(remote=[], local=[]){
  const map = new Map();
  [...remote, ...local].forEach(item => {
    if(item && item.id) map.set(item.id, item);
  });
  return [...map.values()];
}
function union(a=[], b=[]){
  return [...new Set([...(Array.isArray(a)?a:[]), ...(Array.isArray(b)?b:[])])];
}

async function persistState(){
  if(!client || !session?.user) return;
  const state = localState();
  const payload = {
    user_id: session.user.id,
    favorites: state.favorites,
    setlist: state.setlist,
    user_songs: state.user_songs,
    preferences: state.preferences,
    updated_at: new Date().toISOString()
  };
  const { error } = await client.from('user_state').upsert(payload, { onConflict: 'user_id' });
  if(error) console.warn('RODA sync upload:', error.message);
}
function schedulePersist(){
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistState, 650);
}
Storage.prototype.setItem = function(key, value){
  const result = nativeSetItem.call(this, key, value);
  if(this === localStorage && KEYS.includes(key) && initialized) schedulePersist();
  return result;
};
Storage.prototype.removeItem = function(key){
  const result = nativeRemoveItem.call(this, key);
  if(this === localStorage && KEYS.includes(key) && initialized) schedulePersist();
  return result;
};

async function syncFromCloud(){
  if(!client || !session?.user) return false;
  const { data, error } = await client
    .from('user_state')
    .select('favorites,setlist,user_songs,preferences')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if(error){
    console.warn('RODA sync download:', error.message);
    return false;
  }

  const local = localState();
  if(!data){
    await persistState();
    return false;
  }

  const merged = {
    favorites: union(data.favorites, local.favorites),
    setlist: union(data.setlist, local.setlist),
    user_songs: mergeById(data.user_songs, local.user_songs),
    preferences: {
      ...(data.preferences || {}),
      ...(local.preferences || {})
    }
  };

  const before = JSON.stringify(local);
  updateLocalFromState(merged);
  await persistState();
  return before !== JSON.stringify(merged);
}

function displayName(user){
  const m = user?.user_metadata || {};
  return m.full_name || m.name || m.preferred_username || (user?.email ? user.email.split('@')[0] : 'Músico');
}
function avatar(user){
  const m = user?.user_metadata || {};
  return m.avatar_url || m.picture || '';
}
function providerLabel(user){
  const p = user?.app_metadata?.provider || user?.identities?.[0]?.provider || 'email';
  return p === 'google' ? 'Google' : p === 'apple' ? 'Apple' : 'E-mail';
}
function countLocal(key){
  try { return (JSON.parse(localStorage.getItem(key)||'[]')||[]).length; }
  catch { return 0; }
}
function renderAccount(){
  const signed = Boolean(session?.user);
  $('authGuest').classList.toggle('hidden', signed);
  $('authUser').classList.toggle('hidden', !signed);

  const btn = $('profileBtn');
  if(btn){
    btn.classList.toggle('signed', signed);
    btn.setAttribute('aria-label', signed ? 'Abrir perfil' : 'Entrar no RODA');
    const av = signed ? avatar(session.user) : '';
    btn.innerHTML = av ? `<img src="${av}" alt="">` : (signed ? '●' : '◌');
  }

  if(!signed) return;
  const user = session.user;
  $('profileName').textContent = displayName(user);
  $('profileEmail').textContent = user.email || 'Conta Apple';
  $('profileProvider').textContent = `Conectado com ${providerLabel(user)}`;
  const av = avatar(user);
  const avatarEl = $('profileAvatar');
  if(av){
    avatarEl.innerHTML = `<img src="${av}" alt="">`;
  }else{
    avatarEl.textContent = displayName(user).slice(0,1).toUpperCase();
  }
  $('profileFavCount').textContent = countLocal('roda.favorites');
  $('profileListCount').textContent = countLocal('roda.setlist');
  $('profileSongCount').textContent = countLocal('roda.userSongs');
}
function openSheet(){
  $('authSheet').classList.remove('hidden');
  document.body.classList.add('auth-open');
  renderAccount();
  setStatus(configured() ? '' : 'A interface de conta está pronta. Falta conectar o projeto Supabase.', configured() ? '' : 'setup');
}
function closeSheet(){
  $('authSheet').classList.add('hidden');
  document.body.classList.remove('auth-open');
  resetEmailPanel();
}
function resetEmailPanel(){
  emailMode = 'signin';
  $('authChooser').classList.remove('hidden');
  $('emailPanel').classList.add('hidden');
  $('emailAuthTitle').textContent = 'Entrar com e-mail';
  $('emailSubmit').textContent = 'Entrar';
  $('emailSwitch').textContent = 'Criar uma conta';
  $('emailPassword').value = '';
}
function ensureConfigured(){
  if(configured()) return true;
  setStatus('Conecte o Supabase para ativar contas reais. Seus dados locais continuam funcionando.', 'setup');
  return false;
}
async function oauth(provider){
  if(!ensureConfigured()) return;
  setStatus('Abrindo autenticação…');
  const redirectTo = `${location.origin}${location.pathname}?auth=return`;
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if(error) setStatus(error.message, 'error');
}
function openEmail(){
  $('authChooser').classList.add('hidden');
  $('emailPanel').classList.remove('hidden');
  setStatus('');
  setTimeout(()=>$('emailAddress').focus(), 50);
}
async function submitEmail(e){
  e.preventDefault();
  if(!ensureConfigured()) return;
  const email = $('emailAddress').value.trim();
  const password = $('emailPassword').value;
  if(!email || password.length < 6){
    setStatus('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.', 'error');
    return;
  }
  setStatus(emailMode === 'signup' ? 'Criando conta…' : 'Entrando…');
  let result;
  if(emailMode === 'signup'){
    result = await client.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${location.origin}${location.pathname}?auth=return` }
    });
  }else{
    result = await client.auth.signInWithPassword({ email, password });
  }
  if(result.error){
    setStatus(result.error.message, 'error');
    return;
  }
  if(emailMode === 'signup' && !result.data?.session){
    setStatus('Conta criada. Confira seu e-mail para confirmar o acesso.', 'ok');
  }else{
    setStatus('Conta conectada.', 'ok');
  }
}
function switchEmailMode(){
  emailMode = emailMode === 'signin' ? 'signup' : 'signin';
  const signup = emailMode === 'signup';
  $('emailAuthTitle').textContent = signup ? 'Criar conta com e-mail' : 'Entrar com e-mail';
  $('emailSubmit').textContent = signup ? 'Criar conta' : 'Entrar';
  $('emailSwitch').textContent = signup ? 'Já tenho uma conta' : 'Criar uma conta';
  setStatus('');
}
async function resetPassword(){
  if(!ensureConfigured()) return;
  const email = $('emailAddress').value.trim();
  if(!email){ setStatus('Digite seu e-mail primeiro.', 'error'); return; }
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname}?reset=password`
  });
  setStatus(error ? error.message : 'Enviamos um link de recuperação para seu e-mail.', error ? 'error' : 'ok');
}
async function signOut(){
  if(!client) return;
  await client.auth.signOut();
  sessionStorage.removeItem('roda.auth.synced');
  session = null;
  renderAccount();
  setStatus('Você saiu da conta.', 'ok');
}
async function init(){
  initialized = true;
  $('profileBtn')?.addEventListener('click', openSheet);
  $('authClose')?.addEventListener('click', closeSheet);
  $('authBackdrop')?.addEventListener('click', closeSheet);
  $('googleLogin')?.addEventListener('click', ()=>oauth('google'));
  $('appleLogin')?.addEventListener('click', ()=>oauth('apple'));
  $('emailLogin')?.addEventListener('click', openEmail);
  $('emailBack')?.addEventListener('click', resetEmailPanel);
  $('emailForm')?.addEventListener('submit', submitEmail);
  $('emailSwitch')?.addEventListener('click', switchEmailMode);
  $('forgotPassword')?.addEventListener('click', resetPassword);
  $('signOutBtn')?.addEventListener('click', signOut);

  if(!configured()){
    renderAccount();
    return;
  }

  client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.RODA_AUTH = {
    get client(){ return client; },
    get session(){ return session; },
    persistState,
    open: openSheet
  };

  const { data } = await client.auth.getSession();
  session = data?.session || null;
  renderAccount();

  if(session?.user){
    const changed = await syncFromCloud();
    if(changed && !sessionStorage.getItem('roda.auth.synced')){
      sessionStorage.setItem('roda.auth.synced','1');
      location.reload();
      return;
    }
  }

  client.auth.onAuthStateChange(async (event, newSession) => {
    session = newSession;
    renderAccount();
    if(event === 'SIGNED_IN' && session?.user){
      const changed = await syncFromCloud();
      setStatus('Conta conectada e dados sincronizados.', 'ok');
      if(changed && !sessionStorage.getItem('roda.auth.synced')){
        sessionStorage.setItem('roda.auth.synced','1');
        setTimeout(()=>location.reload(), 250);
      }
    }
    if(event === 'SIGNED_OUT'){
      sessionStorage.removeItem('roda.auth.synced');
      setStatus('Você saiu da conta.', 'ok');
    }
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
