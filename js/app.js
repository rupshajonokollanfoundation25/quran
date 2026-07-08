// ---------- Theme toggle ----------
function initTheme(){
  document.getElementById('themeBtn').onclick = () => {
    const body = document.body;
    const dark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', dark ? 'light' : 'dark');
    document.getElementById('themeLabel').textContent = dark ? 'night mode' : 'light mode';
  };
}

// ---------- Font size buttons (reader toolbar) ----------
function initFontControls(){
  document.getElementById('incFont').onclick = () => { state.fontStep = Math.min(state.fontStep+1, 6); applyFontSize(); };
  document.getElementById('decFont').onclick = () => { state.fontStep = Math.max(state.fontStep-1, -3); applyFontSize(); };
}

// ---------- Offline / online status pill in the header ----------
function initConnectionStatus(){
  const pill = document.getElementById('connStatus');
  if(!pill) return;
  const update = () => {
    const online = navigator.onLine;
    pill.textContent = online ? '' : '⚠ You Are Offline';
    pill.classList.toggle('visible', !online);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ---------- Service worker registration: this is what makes the whole app,
// its Quran text, and previously played tilawat work with no internet at all. ----------
function initServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support just won't be available */ });
  });
  // Ask the browser not to evict cached Quran audio/text under storage pressure.
  if(navigator.storage && navigator.storage.persist){
    navigator.storage.persist().catch(() => {});
  }
}

// ---------- "Install app" button (PWA), the most reliable way to get heavy
// offline use + steady background/lock-screen audio on mobile. ----------
function initInstallPrompt(){
  const btn = document.getElementById('installBtn');
  if(!btn) return;
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = 'inline-flex';
  });
  btn.onclick = async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.style.display = 'none';
  };
  window.addEventListener('appinstalled', () => { btn.style.display = 'none'; });
}

// ---------- Keep header fixed on top: measure its real height (it can
// wrap to two lines on small screens) and push page content down by
// exactly that much, so nothing is hidden underneath it. ----------
function initHeaderOffset(){
  const header = document.querySelector('header');
  if(!header) return;
  const setOffset = () => {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  };
  setOffset();
  window.addEventListener('resize', setOffset);
  window.addEventListener('orientationchange', setOffset);
  // Re-measure once web fonts finish loading, since font swap can change header height.
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(setOffset);
}

// ---------- App init ----------
(async function init(){
  loadPrefs();
  if(typeof initAuth === 'function') initAuth();
  initTheme();
  initFontControls();
  initHeaderOffset();
  initNav();
  initMenu();
  initTopics();
  initPlanner();
  initStats();
  initRamadan();
  initConnectionStatus();
  initInstallPrompt();
  initServiceWorker();
  if(typeof initForegroundPush === 'function') initForegroundPush();
  initSearch();
  initPlayer();
  fetchSurahList();
  renderHomeExtras();
})();
