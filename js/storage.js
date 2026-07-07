// ---------- Shared state ----------
const state = {
  mode: 'surah',
  surahList: [],
  fontStep: 0,
  bookmarks: {},
  reciter: 'ar.alafasy',
  lastRead: null,
  playlist: [],
  playIndex: -1,
  isPlaying: false,
  playbackRate: 1,
  history: [],
  offlineSurahs: []
};

// ---------- localStorage persistence ----------
// All data (bookmarks, reciter choice, last-read position, listening history,
// downloaded-surah list) is kept in the browser's own localStorage, so it
// stays on the user's device between visits without needing any server or
// account, and remains fully readable offline.
const LS_KEYS = {
  bookmarks: 'qr_bookmarks',
  reciter: 'qr_reciter',
  lastRead: 'qr_last_read',
  history: 'qr_history',
  offlineSurahs: 'qr_offline_surahs',
  playbackRate: 'qr_playback_rate'
};

// Keep well above the "at least 10" requirement so older items don't get
// pushed out too quickly.
const HISTORY_MAX = 25;

function loadPrefs(){
  try{
    const raw = localStorage.getItem(LS_KEYS.bookmarks);
    if(raw) state.bookmarks = JSON.parse(raw);
  }catch(e){ state.bookmarks = {}; }

  try{
    const r = localStorage.getItem(LS_KEYS.reciter);
    if(r) state.reciter = r;
  }catch(e){}

  try{
    const raw = localStorage.getItem(LS_KEYS.lastRead);
    if(raw) state.lastRead = JSON.parse(raw);
  }catch(e){ state.lastRead = null; }

  try{
    const raw = localStorage.getItem(LS_KEYS.history);
    state.history = raw ? JSON.parse(raw) : [];
  }catch(e){ state.history = []; }

  try{
    const raw = localStorage.getItem(LS_KEYS.offlineSurahs);
    state.offlineSurahs = raw ? JSON.parse(raw) : [];
    migrateOfflineSurahs();
  }catch(e){ state.offlineSurahs = []; }

  try{
    const r = parseFloat(localStorage.getItem(LS_KEYS.playbackRate));
    if(r && r > 0) state.playbackRate = r;
  }catch(e){}
}

function saveBookmarks(){
  try{ localStorage.setItem(LS_KEYS.bookmarks, JSON.stringify(state.bookmarks)); }catch(e){}
}
function saveReciter(){
  try{ localStorage.setItem(LS_KEYS.reciter, state.reciter); }catch(e){}
}
function saveLastRead(){
  try{ localStorage.setItem(LS_KEYS.lastRead, JSON.stringify(state.lastRead)); }catch(e){}
}
function savePlaybackRate(){
  try{ localStorage.setItem(LS_KEYS.playbackRate, String(state.playbackRate)); }catch(e){}
}

// ---------- Listening history ----------
// Tracks the surahs the user has listened to (most recent first, de-duped by
// surah number) so at least the last several played surahs can be replayed
// instantly from local storage — no network needed to see or re-open them.
function addHistoryEntry(entry){
  state.history = state.history.filter(h => h.surah !== entry.surah);
  state.history.unshift(entry);
  if(state.history.length > HISTORY_MAX) state.history = state.history.slice(0, HISTORY_MAX);
  try{ localStorage.setItem(LS_KEYS.history, JSON.stringify(state.history)); }catch(e){}
}

// ---------- Offline-downloaded surah tracking ----------
// Each entry: { surah, reciter, urls, ayahCount, ts }. `urls` is kept so a
// download can later be removed cleanly from Cache Storage. Older versions
// of this app stored offlineSurahs as a plain array of numbers — migrate
// those transparently to the new object shape (with no urls, so removal
// just clears the tracking entry, not the cache; harmless).
function migrateOfflineSurahs(){
  if(!Array.isArray(state.offlineSurahs)){ state.offlineSurahs = []; return; }
  const cleaned = state.offlineSurahs
    .map(o => typeof o === 'number' ? { surah:o, reciter:null, urls:[], ayahCount:null, ts:Date.now() } : o)
    .filter(o => o && Number.isInteger(o.surah) && o.surah >= 1 && o.surah <= 114)
    .map(o => ({
      surah: o.surah,
      reciter: (typeof o.reciter === 'string' && o.reciter) ? o.reciter : null,
      urls: Array.isArray(o.urls) ? o.urls : [],
      ayahCount: (typeof o.ayahCount === 'number' && o.ayahCount > 0) ? o.ayahCount : null,
      ts: (typeof o.ts === 'number' && isFinite(o.ts)) ? o.ts : Date.now()
    }));
  state.offlineSurahs = cleaned;
  // Persist the sanitized shape immediately so this cleanup only has to run
  // once — any leftover/broken entries from earlier testing won't keep
  // reappearing on every load.
  try{ localStorage.setItem(LS_KEYS.offlineSurahs, JSON.stringify(state.offlineSurahs)); }catch(e){}
}
function findOfflineEntry(surahNum){
  return state.offlineSurahs.find(o => o.surah === surahNum);
}
function markSurahOffline(surahNum, reciter, urls, ayahCount){
  if(!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) return;
  state.offlineSurahs = state.offlineSurahs.filter(o => o.surah !== surahNum);
  state.offlineSurahs.push({ surah: surahNum, reciter: reciter || null, urls: urls || [], ayahCount: ayahCount || null, ts: Date.now() });
  try{ localStorage.setItem(LS_KEYS.offlineSurahs, JSON.stringify(state.offlineSurahs)); }catch(e){}
}
function isSurahOffline(surahNum){
  return state.offlineSurahs.some(o => o.surah === surahNum);
}
async function removeSurahOffline(surahNum){
  const entry = findOfflineEntry(surahNum);
  if(entry && entry.urls && entry.urls.length && 'caches' in window){
    try{
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await Promise.all(entry.urls.map(u => cache.delete(u)));
    }catch(e){ /* cache may already be gone; tracking entry is removed regardless */ }
  }
  state.offlineSurahs = state.offlineSurahs.filter(o => o.surah !== surahNum);
  try{ localStorage.setItem(LS_KEYS.offlineSurahs, JSON.stringify(state.offlineSurahs)); }catch(e){}
}

// ---------- Relative time in Bengali, for the history list ----------
function timeAgoBn(ts){
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if(diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if(diffMin < 60) return `${toBn(diffMin)} Minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if(diffHr < 24) return `${toBn(diffHr)} Hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if(diffDay < 30) return `${toBn(diffDay)} Days ago`;
  const diffMon = Math.floor(diffDay / 30);
  return `${toBn(diffMon)} Month ago`;
}
