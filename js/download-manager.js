// ---------- Offline Download Manager (js/download-manager.js) ----------
// A dedicated modal (opened from the drawer, or from Library → Offline) that
// lets the user browse ALL 114 surahs — not just ones already opened — and
// download/delete their tilawat audio for offline use, with a live storage
// summary and per-surah progress. Builds on the existing offline-tracking
// primitives already in js/storage.js (state.offlineSurahs, markSurahOffline,
// removeSurahOffline, isSurahOffline) and the CACHE_AUDIO service-worker
// message already used by the single "Save offline" button in the reader
// (js/player.js) — this just generalizes that flow to any surah number,
// whether or not it has ever been opened.

// Very rough size estimate only (128kbps audio, ~8s average ayah) — shown
// with an "আনুমানিক" (approximate) label everywhere so it's never presented
// as an exact figure.
const DLM_AVG_MB_PER_AYAH = 0.15;

function dlmEstimateMB(ayahCount){
  return (ayahCount || 0) * DLM_AVG_MB_PER_AYAH;
}
function dlmFormatMB(mb){
  if(mb < 1) return `${Math.max(1, Math.round(mb*1000))} KB`;
  return `${mb.toFixed(1)} MB`;
}

// Fetches just the global ayah numbers for a surah (used to build audio
// URLs) without going through the full reader/translation pipeline — this
// lets the manager download a surah the user has never opened yet.
async function dlmFetchGlobalNumbers(surahNum){
  const res = await fetch(`${API}/surah/${surahNum}`);
  const data = await res.json();
  if(!data || !data.data || !Array.isArray(data.data.ayahs)) throw new Error('bad-response');
  return data.data.ayahs.map(a => a.number);
}
function dlmAudioUrls(globalNumbers, reciter){
  return globalNumbers.map(n => `${AUDIO_CDN}/${reciter}/${n}.mp3`);
}

// ---------- Storage summary (whole-origin estimate; browsers don't expose
// per-cache size, so this is labelled as the app's total on-device storage,
// not audio-only) ----------
async function dlmStorageEstimate(){
  if(!(navigator.storage && navigator.storage.estimate)) return null;
  try{ return await navigator.storage.estimate(); }catch(e){ return null; }
}
function dlmBytesToMB(bytes){ return bytes / (1024*1024); }

async function dlmRenderSummary(){
  const box = document.getElementById('dlmSummary');
  if(!box) return;
  const count = (state.offlineSurahs||[]).length;
  const estimatedMB = (state.offlineSurahs||[]).reduce((sum, o) => sum + dlmEstimateMB(o.ayahCount || 0), 0);
  let deviceLine = '';
  const est = await dlmStorageEstimate();
  if(est && est.quota){
    const usedMB = dlmBytesToMB(est.usage||0);
    const quotaMB = dlmBytesToMB(est.quota||1);
    const pct = Math.min(100, Math.round((usedMB/quotaMB)*100));
    deviceLine = `<div class="dlm-summary-bar">
      <div class="planner-progress-row">
        <div class="planner-progress-bar"><div class="planner-progress-fill" style="width:${pct}%"></div></div>
        <span>${dlmFormatMB(usedMB)} / ${dlmFormatMB(quotaMB)}</span>
      </div>
    </div>`;
  }
  box.innerHTML = `
    <div class="dlm-summary-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
    <div class="dlm-summary-text">
      <div class="dlm-summary-title">${toBn(count)} টি সূরা অফলাইনে সংরক্ষিত</div>
      <div class="dlm-summary-sub">আনুমানিক ${dlmFormatMB(estimatedMB)} · এই ডিভাইসেই সংরক্ষিত থাকে</div>
      ${deviceLine}
    </div>
    <button class="dlm-clear-btn" id="dlmClearAll" ${count ? '' : 'disabled style="opacity:.4"'}>সব মুছুন</button>`;
  const clearBtn = document.getElementById('dlmClearAll');
  if(clearBtn) clearBtn.onclick = dlmClearAll;
}

async function dlmClearAll(){
  const entries = [...(state.offlineSurahs||[])];
  if(!entries.length) return;
  const btn = document.getElementById('dlmClearAll');
  if(btn){ btn.disabled = true; btn.textContent = 'মুছে ফেলা হচ্ছে...'; }
  for(const entry of entries){ await removeSurahOffline(entry.surah); }
  await dlmRenderSummary();
  dlmRenderList();
  showToast('সব অফলাইন ডাউনলোড মুছে ফেলা হয়েছে');
}

// ---------- Per-row download/delete ----------
async function dlmStartDownload(surahNum, rowEl){
  const actionSlot = rowEl.querySelector('.dlm-row-action');
  const reciter = document.getElementById('dlmReciterSelect')?.value || state.reciter;
  actionSlot.innerHTML = `<div class="dlm-progress-ring" style="--p:0">০%</div>`;
  let globalNumbers;
  try{
    globalNumbers = await dlmFetchGlobalNumbers(surahNum);
  }catch(e){
    showToast('ডাউনলোড শুরু করা যায়নি, আবার চেষ্টা করুন');
    dlmRenderRowAction(actionSlot, surahNum);
    return;
  }
  const urls = dlmAudioUrls(globalNumbers, reciter);
  const finish = () => {
    markSurahOffline(surahNum, reciter, urls, urls.length);
    dlmRenderRowAction(actionSlot, surahNum);
    dlmRenderSummary();
  };
  const setProgress = (done, total) => {
    const ring = actionSlot.querySelector('.dlm-progress-ring');
    if(!ring) return;
    const pct = total ? Math.round((done/total)*100) : 0;
    ring.style.setProperty('--p', pct);
    ring.textContent = `${toBn(pct)}%`;
  };
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    const requestId = `dlm-${surahNum}-${Date.now()}`;
    const onMsg = (event) => {
      const msg = event.data || {};
      if(msg.requestId !== requestId) return;
      if(msg.type === 'CACHE_AUDIO_PROGRESS') setProgress(msg.done, msg.total);
      else if(msg.type === 'CACHE_AUDIO_DONE'){
        navigator.serviceWorker.removeEventListener('message', onMsg);
        finish();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_AUDIO', urls, requestId });
    return;
  }
  // Fallback with no active service worker: cache directly from the page.
  if(!('caches' in window)){ showToast('এই ব্রাউজারে অফলাইন সংরক্ষণ সাপোর্ট নেই'); dlmRenderRowAction(actionSlot, surahNum); return; }
  const cache = await caches.open(AUDIO_CACHE_NAME);
  let done = 0;
  for(const url of urls){
    try{
      const existing = await cache.match(url);
      if(!existing){ const res = await fetch(url, { mode:'no-cors' }); if(res) await cache.put(url, res.clone()); }
    }catch(e){}
    done++; setProgress(done, urls.length);
  }
  finish();
}

async function dlmRemoveDownload(surahNum, rowEl){
  const actionSlot = rowEl.querySelector('.dlm-row-action');
  const btn = actionSlot.querySelector('.dlm-btn');
  if(btn){ btn.disabled = true; btn.classList.add('deleting'); }
  await removeSurahOffline(surahNum);
  dlmRenderRowAction(actionSlot, surahNum);
  dlmRenderSummary();
}

function dlmRenderRowAction(actionSlot, surahNum){
  const downloaded = isSurahOffline(surahNum);
  actionSlot.innerHTML = `<button class="dlm-btn${downloaded ? ' saved' : ''}" title="${downloaded ? 'মুছে ফেলুন' : 'ডাউনলোড করুন'}">
    <i class="fa-solid ${downloaded ? 'fa-trash' : 'fa-arrow-down'}"></i>
  </button>`;
  const btn = actionSlot.querySelector('.dlm-btn');
  const row = actionSlot.closest('.dlm-row');
  btn.onclick = () => downloaded ? dlmRemoveDownload(surahNum, row) : dlmStartDownload(surahNum, row);
}

// ---------- List ----------
function dlmRenderList(filterText){
  const container = document.getElementById('dlmList');
  if(!container) return;
  const q = (filterText||'').trim().toLowerCase();
  const list = (state.surahList||[]).filter(s => {
    if(!q) return true;
    const bnName = surahNamesBn[s.number-1] || '';
    return bnName.toLowerCase().includes(q) || s.englishName.toLowerCase().includes(q) || String(s.number) === q;
  });
  if(!list.length){
    container.innerHTML = `<div class="dlm-empty-hint">${state.surahList.length ? 'কোনো সূরা পাওয়া যায়নি' : 'সূরার তালিকা লোড হচ্ছে...'}</div>`;
    return;
  }
  container.innerHTML = '';
  list.forEach(s => {
    const row = document.createElement('div');
    row.className = 'dlm-row';
    const sizeMB = dlmEstimateMB(s.numberOfAyahs);
    row.innerHTML = `
      <div class="badge-num">${toBn(s.number)}</div>
      <div class="dlm-row-text">
        <div class="dlm-row-title">${surahNamesBn[s.number-1] || s.englishName}</div>
        <div class="dlm-row-sub">${toBn(s.numberOfAyahs)} আয়াত · আনুমানিক ${dlmFormatMB(sizeMB)}</div>
      </div>
      <div class="dlm-row-action"></div>`;
    container.appendChild(row);
    dlmRenderRowAction(row.querySelector('.dlm-row-action'), s.number);
  });
}

// ---------- Modal open/build ----------
function openDownloadManager(){
  let modal = document.getElementById('downloadManagerModal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.id = 'downloadManagerModal';
    modal.innerHTML = `
      <div class="app-modal-box">
        <div class="app-modal-head">
          <h3><i class="fa-solid fa-cloud-arrow-down"></i> ডাউনলোড ম্যানেজার</h3>
          <button class="app-modal-close" id="dlmClose">✕</button>
        </div>
        <div class="app-modal-body">
          <div class="dlm-summary" id="dlmSummary"></div>
          <div class="dlm-controls">
            <div class="dlm-search">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input type="text" id="dlmSearchInput" placeholder="সূরা খুঁজুন...">
            </div>
            <select class="dlm-reciter-select" id="dlmReciterSelect"></select>
          </div>
          <div class="dlm-list" id="dlmList"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    wireModalBackdrop('downloadManagerModal');
    document.getElementById('dlmClose').onclick = () => closeModal('downloadManagerModal');
    document.getElementById('dlmSearchInput').oninput = (e) => dlmRenderList(e.target.value);
    const reciterSelect = document.getElementById('dlmReciterSelect');
    reciterSelect.innerHTML = reciters.map(r => `<option value="${r.id}">${r.bn || r.name}</option>`).join('');
    reciterSelect.value = state.reciter;
  }
  dlmRenderSummary();
  dlmRenderList(document.getElementById('dlmSearchInput').value);
  openModal('downloadManagerModal');
}
