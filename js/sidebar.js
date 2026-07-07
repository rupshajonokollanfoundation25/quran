// ---------- List renderers: surah / juz / bookmarks / history / offline ----------
// These render into whichever container is passed in (Home tab uses
// #homeListContainer, Library tab uses #libraryListContainer) so the same
// logic can be reused across both parts of the new bottom-nav layout.

async function fetchSurahList(){
  const container = document.getElementById('homeListContainer');
  try{
    const res = await fetch(`${API}/surah`);
    const data = await res.json();
    state.surahList = data.data;
    renderSurahList(container);
    renderHomeExtras();
  }catch(e){
    if(container) container.innerHTML = `<div class="error-box">Could not load the surah list.<br><button onclick="fetchSurahList()">Try again.</button></div>`;
  }
}

function renderSurahList(container){
  if(!container) return;
  container.innerHTML = '';
  state.surahList.forEach(s => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(s.number)}</div>
      <div class="li-text">
        <div class="li-title">${surahNamesBn[s.number-1] || s.englishName}${isSurahOffline(s.number) ? ' <span class="offline-dot" title="Saved offline">⬇</span>' : ''}</div>
        <div class="li-sub">${s.name}</div>
      </div>
      <div class="li-meta">${toBn(s.numberOfAyahs)} আয়াত</div>`;
    item.onclick = () => openSurah(s.number);
    container.appendChild(item);
  });
}

function renderJuzList(container){
  if(!container) return;
  container.innerHTML = '';
  for(let i=1;i<=30;i++){
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(i)}</div>
      <div class="li-text"><div class="li-title">পারা ${toBn(i)}</div></div>`;
    item.onclick = () => openJuz(i);
    container.appendChild(item);
  }
}

function renderHizbList(container){
  if(!container) return;
  container.innerHTML = '';
  for(let i=1;i<=60;i++){
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(i)}</div>
      <div class="li-text"><div class="li-title">হিজব ${toBn(i)}</div></div>`;
    item.onclick = () => openHizb(i);
    container.appendChild(item);
  }
}

function renderPageList(container){
  if(!container) return;
  container.innerHTML = '';
  for(let i=1;i<=604;i++){
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(i)}</div>
      <div class="li-text"><div class="li-title">পৃষ্ঠা ${toBn(i)}</div></div>`;
    item.onclick = () => openPage(i);
    container.appendChild(item);
  }
}

function renderRukuList(container){
  if(!container) return;
  container.innerHTML = '';
  for(let i=1;i<=556;i++){
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(i)}</div>
      <div class="li-text"><div class="li-title">রুকু ${toBn(i)}</div></div>`;
    item.onclick = () => openRuku(i);
    container.appendChild(item);
  }
}

function renderBookmarksList(container){
  if(!container) return;
  const keys = Object.keys(state.bookmarks);
  if(keys.length === 0){
    container.innerHTML = `<div class="empty-list-msg">এখনও কোনো আয়াত সংরক্ষণ করা হয়নি।<br>একটি আয়াত পড়ার সময় "☆ সংরক্ষণ করুন" বাটনে চাপুন।</div>`;
    return;
  }
  container.innerHTML = '';
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
    item.onclick = () => openSurahAndScrollTo(surahNum, ayahInSurah);
    container.appendChild(item);
  });
}

// Shows the last several surahs the user has actually listened to, so they
// can jump back into recent tilawat instantly — even fully offline, since
// this list is read straight from localStorage.
function renderHistoryList(container){
  if(!container) return;
  if(!state.history.length){
    container.innerHTML = `<div class="empty-list-msg">এখনও কোনো তিলাওয়াত শোনা হয়নি।<br>একটি আয়াত বা সূরা চালু করলে এখানে দেখা যাবে, পরে দ্রুত আবার শোনার জন্য।</div>`;
    return;
  }
  container.innerHTML = '';
  state.history.forEach(h => {
    const reciterName = (reciters.find(r => r.id === h.reciter) || {}).name || '';
    const item = document.createElement('div');
    item.className = 'list-item history-item';
    item.innerHTML = `<div class="badge-num">${toBn(h.surah)}</div>
      <div class="li-text">
        <div class="li-title">${h.title}${isSurahOffline(h.surah) ? ' <span class="offline-dot" title="Saved offline">⬇</span>' : ''}</div>
        <div class="li-sub">আয়াত ${toBn(h.ayah)} · ${reciterName}</div>
      </div>
      <div class="li-meta">${timeAgoBn(h.ts)}</div>`;
    item.onclick = () => openSurahAndScrollTo(h.surah, h.ayah);
    container.appendChild(item);
  });
}

// Shows surahs that have been downloaded for offline listening, so the
// user can see at a glance what's actually saved on this device (and undo
// a download to free up space) — separate from the plain surah/juz lists.
function renderOfflineList(container){
  if(!container) return;
  const validEntries = state.offlineSurahs.filter(o => Number.isInteger(o.surah) && o.surah >= 1 && o.surah <= 114);
  if(!validEntries.length){
    container.innerHTML = `<div class="empty-list-msg">এখনও কোনো সূরা অফলাইনে সংরক্ষণ করা হয়নি।<br>একটি সূরা খুলে "⬇ অফলাইনে সংরক্ষণ করুন" বাটনে চাপুন।</div>`;
    return;
  }
  const sorted = [...validEntries].sort((a,b) => b.ts - a.ts);
  container.innerHTML = '';
  sorted.forEach(entry => {
    const s = state.surahList.find(x => x.number === entry.surah);
    const title = s ? (surahNamesBn[entry.surah-1] || s.englishName) : ('সূরা ' + entry.surah);
    const reciterName = (reciters.find(r => r.id === entry.reciter) || {}).name || '';
    const ayahCount = entry.ayahCount || (s ? s.numberOfAyahs : null);
    const item = document.createElement('div');
    item.className = 'list-item offline-item';
    item.innerHTML = `<div class="badge-num">${toBn(entry.surah)}</div>
      <div class="li-text">
        <div class="li-title">${title} <span class="offline-dot" title="Saved offline">⬇</span></div>
        <div class="li-sub">${ayahCount ? toBn(ayahCount) + ' আয়াত' : ''}${reciterName ? ' · ' + reciterName : ''}</div>
      </div>
      <div class="li-meta">${timeAgoBn(entry.ts)}</div>
      <button class="offline-remove-btn" title="Delete from offline">Delete</button>`;
    item.querySelector('.li-text').onclick = () => openSurah(entry.surah);
    item.querySelector('.badge-num').onclick = () => openSurah(entry.surah);
    item.querySelector('.offline-remove-btn').onclick = async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      await removeSurahOffline(entry.surah);
      renderOfflineList(container);
      const openOfflineBtn = document.getElementById('offlineBtn');
      if(openOfflineBtn && state.playlist.length && state.playlist[0].surah === entry.surah){
        openOfflineBtn.classList.remove('downloaded');
        openOfflineBtn.disabled = false;
        openOfflineBtn.textContent = '⬇ Save offline';
      }
    };
    container.appendChild(item);
  });
}

function markSelected(idx, container){
  const scope = container || document.getElementById('homeListContainer');
  if(!scope) return;
  scope.querySelectorAll('.list-item').forEach((el,i)=>el.classList.toggle('selected', i===idx));
}

// ---------- Home tab: last-read chips + quick links ----------
const QUICK_LINKS = [
  { label: 'আল-মুলক', surah: 67 },
  { label: 'আল-কাহফ', surah: 18 },
  { label: 'আয়াতুল কুরসী', surah: 2, ayah: 255 },
  { label: 'ইয়াসীন', surah: 36 },
  { label: 'আর-রাহমান', surah: 55 }
];

function renderHomeExtras(){
  const lastChips = document.getElementById('lastReadChips');
  const lastTitle = document.getElementById('lastReadTitle');
  if(lastChips){
    lastChips.innerHTML = '';
    const recents = state.history.slice(0, 4);
    if(recents.length){
      lastTitle.style.display = '';
      recents.forEach(h => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = `${h.title} ${toBn(h.surah)}:${toBn(h.ayah)}`;
        chip.onclick = () => openSurahAndScrollTo(h.surah, h.ayah);
        lastChips.appendChild(chip);
      });
    } else {
      lastTitle.style.display = 'none';
    }
  }
  const qlChips = document.getElementById('quickLinkChips');
  if(qlChips){
    qlChips.innerHTML = '';
    QUICK_LINKS.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = q.label;
      chip.onclick = () => q.ayah ? openSurahAndScrollTo(q.surah, q.ayah) : openSurah(q.surah);
      qlChips.appendChild(chip);
    });
  }
}
