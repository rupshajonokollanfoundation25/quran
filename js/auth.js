// ---------- Firebase Auth + Firestore sync ----------
// Everything needed to connect this app's account system to Firebase lives
// in this one file (plus js/firebase-config.js, where the project keys go).
// Nothing here needs Firebase Hosting — it works fine served from anywhere,
// as long as the config in js/firebase-config.js is filled in and the
// domain is added under Authentication → Settings → Authorized domains.

let fbApp = null, fbAuth = null, fbDb = null;
let firebaseReady = false;
let authUnsub = null;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let suppressNextSync = false; // true while we're applying a just-downloaded cloud snapshot

function isFirebaseConfigured(){
  return typeof FIREBASE_CONFIG !== 'undefined'
    && FIREBASE_CONFIG.apiKey
    && !/PASTE_YOUR/.test(FIREBASE_CONFIG.apiKey);
}

function initAuth(){
  if(typeof firebase === 'undefined' || !isFirebaseConfigured()) return; // SDK not loaded / not configured yet
  try{
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    firebaseReady = true;
  }catch(e){ console.warn('Firebase init failed:', e); return; }

  authUnsub = fbAuth.onAuthStateChanged(async (fbUser) => {
    if(fbUser){
      await onSignedIn(fbUser);
    } else {
      state.user = null;
      refreshCurrentView();
    }
  });
}

function refreshCurrentView(){
  const statsView = document.getElementById('view-stats');
  if(statsView && statsView.classList.contains('active') && typeof renderStatsView === 'function') renderStatsView();
}

// ---------- Sign-in / sign-up / forgot-password overlay ----------
// A single full-screen overlay with four "screens" swapped in and out,
// mirroring the reference design: choice → (signup | login) → forgot.
function ensureAuthOverlay(){
  let overlay = document.getElementById('authOverlay');
  if(overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'authOverlay';
  overlay.className = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-screen" id="authScreenChoice">
      <div class="auth-topbar">
        <button class="auth-back" data-close="1"><i class="fa-solid fa-arrow-left"></i></button>
        <span>সাইন আপ / লগইন করুন</span>
      </div>
      <div class="auth-body">
        <div class="auth-scene auth-scene-choice">
          <div class="auth-icon-box"><i class="fa-solid fa-book-open"></i></div>
          <div class="auth-medal"><i class="fa-solid fa-star"></i></div>
          <i class="fa-solid fa-sparkles auth-spark s1"></i>
          <i class="fa-solid fa-sparkles auth-spark s2"></i>
          <span class="auth-dot" style="top:8px;left:6px;"></span>
        </div>
        <h2 class="auth-title">অ্যাকাউন্ট তৈরি করুন</h2>
        <p class="auth-sub">আপনার অর্জন ও পড়ার অগ্রগতি সুরক্ষিত রাখুন। আপনার সম্পূর্ণ পরিসংখ্যান এক জায়গায় দেখুন।</p>
        <button class="auth-cta-btn" id="authGoSignup">ইমেইল দিয়ে সাইন আপ করুন</button>
        <button class="auth-google-btn" id="authGoogleFromChoice"><i class="fa-brands fa-google"></i> গুগল দিয়ে সাইন ইন করুন</button>
        <div class="auth-switch">অলরেডি অ্যাকাউন্ট আছে? <a href="javascript:void(0)" id="authGoLogin">লগইন করুন</a></div>
      </div>
    </div>

    <div class="auth-screen" id="authScreenSignup" style="display:none;">
      <div class="auth-topbar">
        <button class="auth-back" data-back="choice"><i class="fa-solid fa-arrow-left"></i></button>
        <span>সাইন আপ</span>
      </div>
      <div class="auth-body">
        <div class="auth-scene auth-scene-signup">
          <div class="auth-card-tile"></div>
          <div class="auth-plus-mock">
            <div class="auth-plus-circle"><i class="fa-solid fa-plus"></i></div>
            <div class="auth-plus-row"><span class="dot"></span><span class="bar"></span></div>
            <div class="auth-plus-row"><span class="dot"></span><span class="bar short"></span></div>
          </div>
        </div>
        <h2 class="auth-title">কুরআন বাংলা অ্যাকাউন্ট তৈরি করুন</h2>
        <p class="auth-sub">আমাদের যেকোনো অ্যাপে এই অ্যাকাউন্ট দিয়ে লগইন এবং সিঙ্ক করুন।</p>
        <input class="auth-field" id="suName" type="text" placeholder="নাম">
        <input class="auth-field" id="suPosition" type="text" placeholder="পদবি (ঐচ্ছিক)">
        <input class="auth-field" id="suEmail" type="email" placeholder="ইমেইল">
        <input class="auth-field" id="suPassword" type="password" placeholder="পাসওয়ার্ড">
        <input class="auth-field" id="suPasswordConfirm" type="password" placeholder="পাসওয়ার্ড নিশ্চিত করুন">
        <div class="auth-error" id="suError"></div>
        <button class="auth-cta-btn has-icon" id="suSubmit"><span>সাইন আপ</span><span class="cta-icon-dot"><i class="fa-solid fa-plus"></i></span></button>
      </div>
    </div>

    <div class="auth-screen" id="authScreenLogin" style="display:none;">
      <div class="auth-topbar">
        <button class="auth-back" data-back="choice"><i class="fa-solid fa-arrow-left"></i></button>
        <span>লগইন করুন</span>
      </div>
      <div class="auth-body">
        <div class="auth-scene auth-scene-login">
          <div class="auth-icon-box"><i class="fa-solid fa-right-to-bracket"></i></div>
          <span class="auth-leaf l1"></span>
          <span class="auth-leaf l2"></span>
          <i class="fa-solid fa-sparkles auth-spark s3"></i>
        </div>
        <h2 class="auth-title">বিদ্যমান অ্যাকাউন্টে লগইন করুন</h2>
        <input class="auth-field" id="liEmail" type="email" placeholder="ইমেইল">
        <input class="auth-field" id="liPassword" type="password" placeholder="পাসওয়ার্ড">
        <div class="auth-error" id="liError"></div>
        <button class="auth-cta-btn" id="liSubmit">লগইন করুন</button>
        <div class="auth-switch"><a href="javascript:void(0)" id="liForgot">পাসওয়ার্ড ভুলে গেছেন?</a></div>
        <button class="auth-google-btn" id="authGoogleFromLogin"><i class="fa-brands fa-google"></i> গুগল দিয়ে সাইন ইন করুন</button>
      </div>
    </div>

    <div class="auth-screen" id="authScreenForgot" style="display:none;">
      <div class="auth-topbar">
        <button class="auth-back" data-back="login"><i class="fa-solid fa-arrow-left"></i></button>
        <span>পাসওয়ার্ড পুনরুদ্ধার করুন</span>
      </div>
      <div class="auth-body">
        <h2 class="auth-title">পুনরুদ্ধার করতে নিবন্ধিত ইমেইলটি প্রবেশ করুন</h2>
        <p class="auth-sub">চিন্তা করবেন না, আমরা আপনার ইমেইলে একটি পাসওয়ার্ড পুনরুদ্ধারের লিঙ্ক পাঠাবো।</p>
        <input class="auth-field" id="fgEmail" type="email" placeholder="ইমেইল">
        <div class="auth-error" id="fgError"></div>
        <button class="auth-cta-btn" id="fgSubmit">পুনরুদ্ধারের লিঙ্ক ইমেইল করুন</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-close]').forEach(b => b.onclick = closeAuthFlow);
  overlay.querySelectorAll('[data-back]').forEach(b => b.onclick = () => showAuthScreen(b.getAttribute('data-back')));

  document.getElementById('authGoSignup').onclick = () => showAuthScreen('signup');
  document.getElementById('authGoLogin').onclick = () => showAuthScreen('login');
  document.getElementById('liForgot').onclick = () => showAuthScreen('forgot');
  document.getElementById('authGoogleFromChoice').onclick = handleGoogleSignIn;
  document.getElementById('authGoogleFromLogin').onclick = handleGoogleSignIn;
  document.getElementById('suSubmit').onclick = handleEmailSignup;
  document.getElementById('liSubmit').onclick = handleEmailLogin;
  document.getElementById('fgSubmit').onclick = handlePasswordReset;

  return overlay;
}

function openAuthFlow(screen){
  if(!firebaseReady){
    showToast(typeof isFirebaseConfigured === 'function' && !isFirebaseConfigured()
      ? 'এখনো এই ফিউচারটি উপলব্ধ করা হয়নি'
      : 'সাইন ইন এখন লোড করা যায়নি, একটু পর আবার চেষ্টা করুন');
    return;
  }
  ensureAuthOverlay();
  showAuthScreen(screen || 'choice');
  document.getElementById('authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAuthFlow(){
  const overlay = document.getElementById('authOverlay');
  if(overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}
function showAuthScreen(name){
  ['choice','signup','login','forgot'].forEach(n => {
    const el = document.getElementById('authScreen' + n.charAt(0).toUpperCase() + n.slice(1));
    if(el) el.style.display = (n === name) ? 'block' : 'none';
  });
}

// ---------- Actions ----------
async function handleGoogleSignIn(){
  const provider = new firebase.auth.GoogleAuthProvider();
  try{
    await fbAuth.signInWithPopup(provider);
    closeAuthFlow();
  }catch(e){
    // Popups are blocked inside some installed-PWA / in-app browser contexts —
    // fall back to a full-page redirect, which always works.
    if(e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment' || e.code === 'auth/cancelled-popup-request')){
      try{ await fbAuth.signInWithRedirect(provider); }catch(e2){ showToast('গুগল সাইন-ইন ব্যর্থ হয়েছে'); }
    } else if(e && e.code !== 'auth/popup-closed-by-user'){
      showToast('গুগল সাইন-ইন ব্যর্থ হয়েছে');
    }
  }
}

async function handleEmailSignup(){
  const name = document.getElementById('suName').value.trim();
  const position = document.getElementById('suPosition').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const pass = document.getElementById('suPassword').value;
  const pass2 = document.getElementById('suPasswordConfirm').value;
  const errBox = document.getElementById('suError');
  errBox.textContent = '';

  if(!name || !email || !pass){ errBox.textContent = 'সব ঘর পূরণ করুন।'; return; }
  if(pass.length < 6){ errBox.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'; return; }
  if(pass !== pass2){ errBox.textContent = 'পাসওয়ার্ড দুটি মিলছে না।'; return; }

  const btn = document.getElementById('suSubmit');
  const btnOriginal = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'অপেক্ষা করুন...';
  try{
    const cred = await fbAuth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    await fbDb.collection('users').doc(cred.user.uid).set({
      name, position, email, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    closeAuthFlow();
  }catch(e){
    errBox.textContent = authErrorMessageBn(e);
  }finally{
    btn.disabled = false; btn.innerHTML = btnOriginal;
  }
}

async function handleEmailLogin(){
  const email = document.getElementById('liEmail').value.trim();
  const pass = document.getElementById('liPassword').value;
  const errBox = document.getElementById('liError');
  errBox.textContent = '';
  if(!email || !pass){ errBox.textContent = 'ইমেইল ও পাসওয়ার্ড দিন।'; return; }

  const btn = document.getElementById('liSubmit');
  btn.disabled = true; btn.textContent = 'অপেক্ষা করুন...';
  try{
    await fbAuth.signInWithEmailAndPassword(email, pass);
    closeAuthFlow();
  }catch(e){
    errBox.textContent = authErrorMessageBn(e);
  }finally{
    btn.disabled = false; btn.textContent = 'লগইন করুন';
  }
}

async function handlePasswordReset(){
  const email = document.getElementById('fgEmail').value.trim();
  const errBox = document.getElementById('fgError');
  errBox.textContent = '';
  if(!email){ errBox.textContent = 'ইমেইল দিন।'; return; }
  const btn = document.getElementById('fgSubmit');
  btn.disabled = true; btn.textContent = 'পাঠানো হচ্ছে...';
  try{
    await fbAuth.sendPasswordResetEmail(email);
    showToast('পুনরুদ্ধারের লিঙ্ক ইমেইলে পাঠানো হয়েছে');
    closeAuthFlow();
  }catch(e){
    errBox.textContent = authErrorMessageBn(e);
  }finally{
    btn.disabled = false; btn.textContent = 'পুনরুদ্ধারের লিঙ্ক ইমেইল করুন';
  }
}

function authErrorMessageBn(e){
  const code = e && e.code;
  const map = {
    'auth/email-already-in-use': 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে।',
    'auth/invalid-email': 'সঠিক ইমেইল দিন।',
    'auth/weak-password': 'পাসওয়ার্ড খুবই দুর্বল।',
    'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।',
    'auth/wrong-password': 'পাসওয়ার্ড সঠিক নয়।',
    'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
    'auth/too-many-requests': 'অনেকবার চেষ্টা করা হয়েছে, একটু পর আবার চেষ্টা করুন।',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ পরীক্ষা করুন।'
  };
  return map[code] || 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।';
}

function confirmLogout(){
  const old = document.getElementById('logoutConfirmModal');
  if(old) old.remove();
  const wrap = document.createElement('div');
  wrap.className = 'app-modal';
  wrap.id = 'logoutConfirmModal';
  wrap.style.display = 'flex';
  wrap.innerHTML = `
    <div class="app-modal-box input-box-modal">
      <div class="app-modal-head"><h3>লগ আউট করবেন?</h3><button class="app-modal-close" id="logoutClose">✕</button></div>
      <div class="app-modal-body">
        <p style="margin:0 0 14px;color:var(--ink-soft);font-size:14px;">আপনার এই ডিভাইসের ডেটা থাকবে, তবে ক্লাউড সিঙ্ক বন্ধ হয়ে যাবে যতক্ষণ না আবার লগইন করেন।</p>
        <div class="input-box-actions">
          <button class="tw-cancel-btn" id="logoutCancel">বাতিল</button>
          <button class="tw-save-btn" id="logoutYes">লগ আউট করুন</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const remove = () => wrap.remove();
  wrap.addEventListener('click', (e) => { if(e.target === wrap) remove(); });
  document.getElementById('logoutClose').onclick = remove;
  document.getElementById('logoutCancel').onclick = remove;
  document.getElementById('logoutYes').onclick = async () => {
    remove();
    try{ await fbAuth.signOut(); }catch(e){}
    showToast('লগ আউট করা হয়েছে');
  };
}

// ---------- Firestore sync ----------
// On sign-in: pull the cloud copy (if any), merge it with whatever is
// already on this device, save the merged result locally, then push it
// back up — so both directions end up consistent.
async function onSignedIn(fbUser){
  state.user = {
    uid: fbUser.uid,
    name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'ব্যবহারকারী'),
    email: fbUser.email || ''
  };
  refreshCurrentView();

  try{
    const doc = await fbDb.collection('users').doc(fbUser.uid).get();
    if(doc.exists){
      const cloud = doc.data();
      if(cloud.name && !fbUser.displayName){ state.user.name = cloud.name; }
      mergeCloudIntoLocal(cloud.progress || {});
    }
  }catch(e){ console.warn('Cloud fetch failed:', e); }

  refreshCurrentView();
  queueCloudSync(true); // push the merged result back up immediately
}

// Combines a downloaded Firestore `progress` object into the local `state` +
// localStorage. IMPORTANT: the cloud document only ever contains aggregate
// progress numbers (streaks, counts, daily reading seconds) — never which
// surahs/ayahs were read, bookmarks, notes, or reading history, so there is
// nothing "content-shaped" here to merge, only numbers to take the max of.
function mergeCloudIntoLocal(cloud){
  if(!cloud || typeof cloud !== 'object') return;
  suppressNextSync = true;

  // Daily reading time (date -> seconds). Dates alone reveal nothing about
  // which surah was read, so this is safe to merge by date.
  if(cloud.activity && typeof cloud.activity === 'object'){
    const local = loadActivity();
    const merged = { ...cloud.activity };
    Object.keys(local).forEach(k => { merged[k] = Math.max(merged[k] || 0, local[k] || 0); });
    saveActivity(merged);
  }

  if(typeof cloud.searchCount === 'number'){
    state.searchCount = Math.max(state.searchCount || 0, cloud.searchCount);
    try{ IDBKV.set(LS_KEYS.searchCount, String(state.searchCount)); }catch(e){}
  }
  if(typeof cloud.bestStreak === 'number'){
    state.bestStreak = Math.max(state.bestStreak || 0, cloud.bestStreak);
    try{ IDBKV.set(LS_KEYS.bestStreak, String(state.bestStreak)); }catch(e){}
  }
  // Aggregate counts only — the actual sets of which ayahs/surahs stay local
  // on each device and are never uploaded.
  if(typeof cloud.ayahsReadCount === 'number'){
    state.ayahsReadFloor = Math.max(state.ayahsReadFloor || 0, cloud.ayahsReadCount);
    try{ IDBKV.set(LS_KEYS.ayahsReadFloor, String(state.ayahsReadFloor)); }catch(e){}
  }
  if(typeof cloud.audioSurahsPlayedCount === 'number'){
    state.audioSurahsPlayedFloor = Math.max(state.audioSurahsPlayedFloor || 0, cloud.audioSurahsPlayedCount);
    try{ IDBKV.set(LS_KEYS.audioSurahsPlayedFloor, String(state.audioSurahsPlayedFloor)); }catch(e){}
  }
  // Taraweeh tracker: per-Ramadan-day rakat counts. Not surah-related, so
  // it's treated as progress and merged (cloud as base, local wins on conflict).
  if(cloud.taraweeh && typeof cloud.taraweeh === 'object'){
    state.taraweeh.days = { ...(cloud.taraweeh.days||{}), ...(state.taraweeh.days||{}) };
    state.taraweeh.goal = state.taraweeh.goal || cloud.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL;
    saveTaraweeh();
  }

  // Extra badge-progress fields — same aggregate-only, no-content-identity rule.
  if(typeof cloud.topicsExploredCount === 'number'){
    state.topicsExploredFloor = Math.max(state.topicsExploredFloor || 0, cloud.topicsExploredCount);
    try{ IDBKV.set(LS_KEYS.topicsExploredFloor, String(state.topicsExploredFloor)); }catch(e){}
  }
  if(Array.isArray(cloud.themesTried)){
    state.themesTried = Array.from(new Set([...(state.themesTried||[]), ...cloud.themesTried]));
    try{ IDBKV.set(LS_KEYS.themesTried, JSON.stringify(state.themesTried)); }catch(e){}
  }
  if(Array.isArray(cloud.languagesUsed)){
    state.languagesUsed = Array.from(new Set([...(state.languagesUsed||[]), ...cloud.languagesUsed]));
    try{ IDBKV.set(LS_KEYS.languagesUsed, JSON.stringify(state.languagesUsed)); }catch(e){}
  }
  const boolFlags = ['qiblaUsed','tajweedModeUsed','hafezModeUsed','translationCompareUsed','ramadanModeUsed','prayerNotifyEverEnabled','nightOwlDone','earlyBirdDone'];
  boolFlags.forEach(flag => {
    if(cloud[flag] === true && !state[flag]){
      state[flag] = true;
      try{ IDBKV.set(LS_KEYS[flag], '1'); }catch(e){}
    }
  });
  if(typeof cloud.shareCount === 'number'){
    state.shareCount = Math.max(state.shareCount || 0, cloud.shareCount);
    try{ IDBKV.set(LS_KEYS.shareCount, String(state.shareCount)); }catch(e){}
  }

  suppressNextSync = false;
}

// Builds the plain-object snapshot that gets written to users/{uid}.progress
// in Firestore. Deliberately contains ONLY aggregate progress numbers —
// no bookmarks, notes, reading history, last-read position, or which
// surahs/ayahs were involved. Those remain in localStorage on-device only.
function buildSyncSnapshot(){
  return {
    activity: loadActivity(),                 // { "YYYY-MM-DD": secondsReadThatDay }
    searchCount: state.searchCount,
    bestStreak: state.bestStreak,
    ayahsReadCount: ayahsReadCount(),
    audioSurahsPlayedCount: (state.audioSurahsPlayed||[]).length,
    taraweeh: state.taraweeh,
    // Extra badge-progress fields, aggregate-only (see mergeCloudIntoLocal for the privacy rule)
    topicsExploredCount: (state.topicsExplored||[]).length,
    themesTried: state.themesTried || [],
    languagesUsed: state.languagesUsed || [],
    qiblaUsed: !!state.qiblaUsed,
    tajweedModeUsed: !!state.tajweedModeUsed,
    hafezModeUsed: !!state.hafezModeUsed,
    translationCompareUsed: !!state.translationCompareUsed,
    ramadanModeUsed: !!state.ramadanModeUsed,
    prayerNotifyEverEnabled: !!state.prayerNotifyEverEnabled,
    nightOwlDone: !!state.nightOwlDone,
    earlyBirdDone: !!state.earlyBirdDone,
    shareCount: state.shareCount || 0
  };
}

// Debounced push so rapid local changes (e.g. scrolling through several
// ayahs, ticking off several taraweeh days) collapse into one Firestore write.
function queueCloudSync(immediate){
  if(!firebaseReady || !state.user || suppressNextSync) return;
  clearTimeout(cloudSyncTimer);
  const run = async () => {
    if(cloudSyncInFlight) return;
    cloudSyncInFlight = true;
    try{
      await fbDb.collection('users').doc(state.user.uid).set({
        progress: buildSyncSnapshot(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }catch(e){ console.warn('Cloud sync failed:', e); }
    cloudSyncInFlight = false;
  };
  if(immediate) run();
  else cloudSyncTimer = setTimeout(run, 2500);
}
