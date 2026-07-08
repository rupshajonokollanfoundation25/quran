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
  offlineSurahs: [],
  language: 'bn',
  prayerMethod: 1,
  prayerNotify: false,
  prayerLocation: null,
  notes: {},
  searchCount: 0,
  ramadanMode: false,
  taraweeh: { goal: RAMADAN_DEFAULT_RAKAT_GOAL, days: {} },
  // ---- Account / cloud-sync related (see js/auth.js) ----
  // NOTE ON PRIVACY OF SYNCED DATA: only aggregate progress numbers ever get
  // written to Firestore (see buildSyncSnapshot in js/auth.js) — never which
  // surahs/ayahs were read, bookmarks, notes, or reading history. Those stay
  // in localStorage on this device only.
  ayahsRead: {},              // map "surah:ayah" -> 1, LOCAL ONLY (device-side dedup)
  ayahsReadFloor: 0,          // highest ayahs-read COUNT seen from the cloud, no ayah identities
  audioSurahsPlayed: [],      // LOCAL ONLY (device-side dedup for the audio badge)
  audioSurahsPlayedFloor: 0,  // highest unique-surahs-played COUNT seen from the cloud
  bestStreak: 0,               // longest daily-reading streak ever reached, kept even if the
                                // current streak later resets to 0
  user: null                    // set by auth.js on sign-in: { uid, name, email, position }
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
  playbackRate: 'qr_playback_rate',
  language: 'qr_language',
  prayerMethod: 'qr_prayer_method',
  prayerNotify: 'qr_prayer_notify',
  prayerLocation: 'qr_prayer_location',
  notes: 'qr_notes',
  searchCount: 'qr_search_count',
  audioSurahsPlayed: 'qr_audio_surahs_played',
  ramadanMode: 'qr_ramadan_mode',
  taraweeh: 'qr_taraweeh',
  ayahsRead: 'qr_ayahs_read',
  ayahsReadFloor: 'qr_ayahs_read_floor',
  audioSurahsPlayedFloor: 'qr_audio_surahs_played_floor',
  bestStreak: 'qr_best_streak'
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

  try{
    const l = localStorage.getItem(LS_KEYS.language);
    if(l === 'bn' || l === 'en') state.language = l;
  }catch(e){}

  try{
    const m = parseInt(localStorage.getItem(LS_KEYS.prayerMethod), 10);
    if(Number.isInteger(m)) state.prayerMethod = m;
  }catch(e){}

  try{
    state.prayerNotify = localStorage.getItem(LS_KEYS.prayerNotify) === '1';
  }catch(e){}

  try{
    const raw = localStorage.getItem(LS_KEYS.prayerLocation);
    if(raw) state.prayerLocation = JSON.parse(raw);
  }catch(e){ state.prayerLocation = null; }

  try{
    const raw = localStorage.getItem(LS_KEYS.notes);
    state.notes = raw ? JSON.parse(raw) : {};
  }catch(e){ state.notes = {}; }

  try{
    const n = parseInt(localStorage.getItem(LS_KEYS.searchCount), 10);
    state.searchCount = Number.isInteger(n) && n > 0 ? n : 0;
  }catch(e){ state.searchCount = 0; }

  try{
    const raw = localStorage.getItem(LS_KEYS.audioSurahsPlayed);
    state.audioSurahsPlayed = raw ? JSON.parse(raw) : [];
  }catch(e){ state.audioSurahsPlayed = []; }

  try{
    state.ramadanMode = localStorage.getItem(LS_KEYS.ramadanMode) === '1';
  }catch(e){}

  try{
    const raw = localStorage.getItem(LS_KEYS.taraweeh);
    state.taraweeh = raw ? JSON.parse(raw) : { goal: RAMADAN_DEFAULT_RAKAT_GOAL, days: {} };
    if(!state.taraweeh || typeof state.taraweeh !== 'object') state.taraweeh = { goal: RAMADAN_DEFAULT_RAKAT_GOAL, days: {} };
    if(!state.taraweeh.days) state.taraweeh.days = {};
    if(!state.taraweeh.goal) state.taraweeh.goal = RAMADAN_DEFAULT_RAKAT_GOAL;
  }catch(e){ state.taraweeh = { goal: RAMADAN_DEFAULT_RAKAT_GOAL, days: {} }; }

  try{
    const raw = localStorage.getItem(LS_KEYS.ayahsRead);
    state.ayahsRead = raw ? JSON.parse(raw) : {};
    if(!state.ayahsRead || typeof state.ayahsRead !== 'object') state.ayahsRead = {};
  }catch(e){ state.ayahsRead = {}; }

  try{
    const n = parseInt(localStorage.getItem(LS_KEYS.ayahsReadFloor), 10);
    state.ayahsReadFloor = Number.isInteger(n) && n > 0 ? n : 0;
  }catch(e){ state.ayahsReadFloor = 0; }

  try{
    const n = parseInt(localStorage.getItem(LS_KEYS.audioSurahsPlayedFloor), 10);
    state.audioSurahsPlayedFloor = Number.isInteger(n) && n > 0 ? n : 0;
  }catch(e){ state.audioSurahsPlayedFloor = 0; }

  try{
    const n = parseInt(localStorage.getItem(LS_KEYS.bestStreak), 10);
    state.bestStreak = Number.isInteger(n) && n > 0 ? n : 0;
  }catch(e){ state.bestStreak = 0; }
}

function saveLanguage(){
  try{ localStorage.setItem(LS_KEYS.language, state.language); }catch(e){}
}
function savePrayerMethod(){
  try{ localStorage.setItem(LS_KEYS.prayerMethod, String(state.prayerMethod)); }catch(e){}
}
function savePrayerNotify(){
  try{ localStorage.setItem(LS_KEYS.prayerNotify, state.prayerNotify ? '1' : '0'); }catch(e){}
}
function savePrayerLocation(){
  try{ localStorage.setItem(LS_KEYS.prayerLocation, JSON.stringify(state.prayerLocation)); }catch(e){}
}

// ---------- Per-ayah notes ----------
function noteKey(surah, ayah){ return `${surah}:${ayah}`; }
function getNote(surah, ayah){ return state.notes[noteKey(surah, ayah)] || ''; }
function saveNote(surah, ayah, text){
  const key = noteKey(surah, ayah);
  const trimmed = (text || '').trim();
  if(trimmed) state.notes[key] = trimmed;
  else delete state.notes[key];
  try{ localStorage.setItem(LS_KEYS.notes, JSON.stringify(state.notes)); }catch(e){}
}
function deleteNote(surah, ayah){ saveNote(surah, ayah, ''); }
function allNoteEntries(){
  return Object.keys(state.notes).map(key => {
    const [s, a] = key.split(':').map(Number);
    return { surah: s, ayah: a, text: state.notes[key] };
  });
}

// ---------- Search usage counter (used by the "Search Explorer" badge) ----------
function incrementSearchCount(){
  state.searchCount = (state.searchCount || 0) + 1;
  try{ localStorage.setItem(LS_KEYS.searchCount, String(state.searchCount)); }catch(e){}
  queueCloudSync();
}

// ---------- Unique surahs listened to (used by the "Audio Explorer" badge) ----------
function trackAudioSurahPlayed(surahNum){
  if(!Number.isInteger(surahNum)) return;
  if(!state.audioSurahsPlayed.includes(surahNum)){
    state.audioSurahsPlayed.push(surahNum);
    try{ localStorage.setItem(LS_KEYS.audioSurahsPlayed, JSON.stringify(state.audioSurahsPlayed)); }catch(e){}
    queueCloudSync();
  }
}

// ---------- Ramadan mode + Taraweeh tracker ----------
function saveRamadanMode(){
  try{ localStorage.setItem(LS_KEYS.ramadanMode, state.ramadanMode ? '1' : '0'); }catch(e){}
}
function saveTaraweeh(){
  try{ localStorage.setItem(LS_KEYS.taraweeh, JSON.stringify(state.taraweeh)); }catch(e){}
  queueCloudSync();
}
function setTaraweehDay(dayNum, rakats){
  const goal = state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL;
  const clamped = Math.max(0, Math.min(goal, rakats));
  if(clamped <= 0) delete state.taraweeh.days[dayNum];
  else state.taraweeh.days[dayNum] = clamped;
  saveTaraweeh();
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

// ---------- Unique ayahs actually read (used by the "আয়াত পাঠ" lifetime stat) ----------
// Marked by an on-screen dwell-time check in js/reader.js (see initAyahReadTracking),
// so opening a surah alone doesn't count every ayah in it as "read".
function markAyahRead(key){
  if(!key || state.ayahsRead[key]) return;
  state.ayahsRead[key] = 1;
  try{ localStorage.setItem(LS_KEYS.ayahsRead, JSON.stringify(state.ayahsRead)); }catch(e){}
  queueCloudSync();
}
function ayahsReadCount(){
  return Math.max(Object.keys(state.ayahsRead || {}).length, state.ayahsReadFloor || 0);
}

// ---------- Best (longest-ever) streak, kept separately so it survives streak resets ----------
function updateBestStreak(currentStreak){
  if(currentStreak > (state.bestStreak || 0)){
    state.bestStreak = currentStreak;
    try{ localStorage.setItem(LS_KEYS.bestStreak, String(state.bestStreak)); }catch(e){}
    queueCloudSync();
  }
}

// ---------- Cloud sync hook ----------
// js/auth.js defines the real queueCloudSync() (debounced Firestore write) once a
// user is signed in. Before that script runs, or while signed out, this is a
// harmless no-op so every save*()/mark*() call above can call it unconditionally.
function queueCloudSync(){}

// ---------- Relative time in Bengali, for the history list ----------
function timeAgoBn(ts){
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if(diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if(diffMin < 60) return `${toBn(diffMin)} Minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if(diffHr < 24) return `${toBn(diffHr)} Hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if(diffDay < 30) return `${toBn(diffDay)} Days ago`;
  const diffMon = Math.floor(diffDay / 30);
  return `${toBn(diffMon)} Month ago`;
}
