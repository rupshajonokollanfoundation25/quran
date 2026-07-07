// ---------- Sidebar: surah / juz / bookmarks lists, tabs, mobile drawer ----------
const listContainer = document.getElementById('listContainer');

async function fetchSurahList(){
  try{
    const res = await fetch(`${API}/surah`);
    const data = await res.json();
    state.surahList = data.data;
    renderSurahList();
    renderHero();
  }catch(e){
    listContainer.innerHTML = `<div class="error-box">সূরার তালিকা লোড করা যায়নি।<br><button onclick="fetchSurahList()">আবার চেষ্টা করুন</button></div>`;
  }
}

function renderSurahList(){
  listContainer.innerHTML = '';
  state.surahList.forEach(s => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(s.number)}</div>
      <div class="li-text">
        <div class="li-title">${surahNamesBn[s.number-1] || s.englishName}${isSurahOffline(s.number) ? ' <span class="offline-dot" title="অফলাইনে সংরক্ষিত">⬇</span>' : ''}</div>
        <div class="li-sub">${s.name}</div>
      </div>
      <div class="li-meta">${toBn(s.numberOfAyahs)} আয়াত</div>`;
    item.onclick = () => { openSurah(s.number); closeSidebarMobile(); };
    listContainer.appendChild(item);
  });
}

function renderJuzList(){
  listContainer.innerHTML = '';
  for(let i=1;i<=30;i++){
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(i)}</div>
      <div class="li-text"><div class="li-title">পারা ${toBn(i)}</div></div>`;
    item.onclick = () => { openJuz(i); closeSidebarMobile(); };
    listContainer.appendChild(item);
  }
}

function renderBookmarksList(){
  const keys = Object.keys(state.bookmarks);
  if(keys.length === 0){
    listContainer.innerHTML = `<div class="empty-list-msg">এখনও কোনো আয়াত সংরক্ষণ করা হয়নি।<br>একটি আয়াত পড়ার সময় "☆ সংরক্ষণ করুন" বাটনে চাপুন।</div>`;
    return;
  }
  listContainer.innerHTML = '';
  keys.forEach(key => {
    const [surahNum, ayahInSurah] = key.split(':').map(Number);
    const s = state.surahList.find(x => x.number === surahNum);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(surahNum)}</div>
      <div class="li-text">
        <div class="li-title">${(s ? (surahNamesBn[surahNum-1]||s.englishName) : 'সূরা '+surahNum)}</div>
        <div class="li-sub">আয়াত ${toBn(ayahInSurah)}</div>
      </div>`;
    item.onclick = () => {
      openSurahAndScrollTo(surahNum, ayahInSurah);
      closeSidebarMobile();
    };
    listContainer.appendChild(item);
  });
}

// Shows the last several surahs the user has actually listened to, so they
// can jump back into recent tilawat instantly — even fully offline, since
// this list is read straight from localStorage.
function renderHistoryList(){
  if(!state.history.length){
    listContainer.innerHTML = `<div class="empty-list-msg">এখনও কোনো তিলাওয়াত শোনা হয়নি।<br>একটি আয়াত বা সূরা চালু করলে এখানে দেখা যাবে, পরে দ্রুত আবার শোনার জন্য।</div>`;
    return;
  }
  listContainer.innerHTML = '';
  state.history.forEach(h => {
    const reciterName = (reciters.find(r => r.id === h.reciter) || {}).name || '';
    const item = document.createElement('div');
    item.className = 'list-item history-item';
    item.innerHTML = `<div class="badge-num">${toBn(h.surah)}</div>
      <div class="li-text">
        <div class="li-title">${h.title}${isSurahOffline(h.surah) ? ' <span class="offline-dot" title="অফলাইনে সংরক্ষিত">⬇</span>' : ''}</div>
        <div class="li-sub">আয়াত ${toBn(h.ayah)} · ${reciterName}</div>
      </div>
      <div class="li-meta">${timeAgoBn(h.ts)}</div>`;
    item.onclick = () => {
      openSurahAndScrollTo(h.surah, h.ayah);
      closeSidebarMobile();
    };
    listContainer.appendChild(item);
  });
}

// Shows surahs that have been downloaded for offline listening, so the
// user can see at a glance what's actually saved on this device (and undo
// a download to free up space) — separate from the plain surah/juz lists.
function renderOfflineList(){
  const validEntries = state.offlineSurahs.filter(o => Number.isInteger(o.surah) && o.surah >= 1 && o.surah <= 114);
  if(!validEntries.length){
    listContainer.innerHTML = `<div class="empty-list-msg">এখনও কোনো সূরা অফলাইনে সংরক্ষণ করা হয়নি।<br>একটি সূরা খুলে "⬇ অফলাইনে সংরক্ষণ করুন" বাটনে চাপুন।</div>`;
    return;
  }
  const sorted = [...validEntries].sort((a,b) => b.ts - a.ts);
  listContainer.innerHTML = '';
  sorted.forEach(entry => {
    const s = state.surahList.find(x => x.number === entry.surah);
    const title = s ? (surahNamesBn[entry.surah-1] || s.englishName) : ('সূরা ' + entry.surah);
    const reciterName = (reciters.find(r => r.id === entry.reciter) || {}).name || '';
    const ayahCount = entry.ayahCount || (s ? s.numberOfAyahs : null);
    const item = document.createElement('div');
    item.className = 'list-item offline-item';
    item.innerHTML = `<div class="badge-num">${toBn(entry.surah)}</div>
      <div class="li-text">
        <div class="li-title">${title} <span class="offline-dot" title="অফলাইনে সংরক্ষিত">⬇</span></div>
        <div class="li-sub">${ayahCount ? toBn(ayahCount) + ' আয়াত' : ''}${reciterName ? ' · ' + reciterName : ''}</div>
      </div>
      <div class="li-meta">${timeAgoBn(entry.ts)}</div>
      <button class="offline-remove-btn" title="অফলাইন থেকে মুছুন">মুছুন</button>`;
    item.querySelector('.li-text').onclick = () => { openSurah(entry.surah); closeSidebarMobile(); };
    item.querySelector('.badge-num').onclick = () => { openSurah(entry.surah); closeSidebarMobile(); };
    item.querySelector('.offline-remove-btn').onclick = async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'মুছে ফেলা হচ্ছে...';
      await removeSurahOffline(entry.surah);
      renderOfflineList();
      const openOfflineBtn = document.getElementById('offlineBtn');
      if(openOfflineBtn && state.playlist.length && state.playlist[0].surah === entry.surah){
        openOfflineBtn.classList.remove('downloaded');
        openOfflineBtn.disabled = false;
        openOfflineBtn.textContent = '⬇ অফলাইনে সংরক্ষণ করুন';
      }
    };
    listContainer.appendChild(item);
  });
}

function markSelected(idx){
  document.querySelectorAll('.list-item').forEach((el,i)=>el.classList.toggle('selected', i===idx));
}

function initSidebarTabs(){
  document.getElementById('tabSurah').onclick = () => {
    state.mode='surah';
    setActiveTab('tabSurah');
    renderSurahList();
  };
  document.getElementById('tabJuz').onclick = () => {
    state.mode='juz';
    setActiveTab('tabJuz');
    renderJuzList();
  };
  document.getElementById('tabBookmarks').onclick = () => {
    state.mode='bookmarks';
    setActiveTab('tabBookmarks');
    renderBookmarksList();
  };
  document.getElementById('tabHistory').onclick = () => {
    state.mode='history';
    setActiveTab('tabHistory');
    renderHistoryList();
  };
  document.getElementById('tabOffline').onclick = () => {
    state.mode='offline';
    setActiveTab('tabOffline');
    renderOfflineList();
  };
}

function setActiveTab(activeId){
  ['tabSurah','tabJuz','tabBookmarks','tabHistory','tabOffline'].forEach(id => {
    document.getElementById(id).classList.toggle('active', id === activeId);
  });
}

// ---------- Mobile sidebar drawer ----------
const sidebarEl = document.getElementById('sidebar');
const scrimEl = document.getElementById('scrim');

function closeSidebarMobile(){ sidebarEl.classList.remove('open'); scrimEl.style.display='none'; }

function initMobileSidebar(){
  document.getElementById('menuBtn').onclick = () => { sidebarEl.classList.add('open'); scrimEl.style.display='block'; };
  scrimEl.onclick = () => closeSidebarMobile();
}
