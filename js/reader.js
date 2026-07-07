// ---------- Reader: surah/juz/page/hizb/ruku fetch & render, bookmarks, font size ----------
const mainContent = document.getElementById('mainContent');
const readerToolbar = document.getElementById('readerToolbar');
const homeLanding = document.getElementById('homeLanding');
const readerArea = document.getElementById('readerArea');

function showReaderArea(){
  homeLanding.style.display = 'none';
  readerArea.style.display = 'block';
}
function showHomeLanding(){
  readerArea.style.display = 'none';
  homeLanding.style.display = 'block';
}

function initReaderBack(){
  document.getElementById('readerBackBtn').onclick = showHomeLanding;
}

function showLoader(){
  showReaderArea();
  mainContent.innerHTML = `<div class="loader"><div class="spinner"></div><span>Loading verses...</span></div>`;
  readerToolbar.style.display='none';
}

function openSurahAndScrollTo(surahNum, ayahInSurah){
  goToView('home');
  openSurah(surahNum).then(() => {
    setTimeout(() => {
      const el = document.getElementById(`ayah-${surahNum}-${ayahInSurah}`);
      if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 250);
  });
}

async function openSurah(num){
  showLoader();
  try{
    const [arRes, bnRes] = await Promise.all([
      fetch(`${API}/surah/${num}/quran-uthmani`),
      fetch(`${API}/surah/${num}/bn.bengali`)
    ]);
    const arData = (await arRes.json()).data;
    const bnData = (await bnRes.json()).data;
    const ayahs = arData.ayahs.map((a,i)=>({ number:a.number, numberInSurah:a.numberInSurah, surah:num, arabic:a.text, bengali:(bnData.ayahs[i]||{}).text || '' }));
    renderReader({
      header: { arName: arData.name, bnName: surahNamesBn[num-1] || arData.englishName, meta: `${arData.revelationType === 'Meccan' ? 'মাক্কী' : 'মাদানী'} · ${toBn(arData.numberOfAyahs)} আয়াত`, playLabel: `সম্পূর্ণ সূরা শুনুন` },
      showBismillah: num !== 1 && num !== 9,
      ayahs
    });
    state.lastRead = { surah: num, ayah: ayahs[0] ? ayahs[0].numberInSurah : 1 };
    saveLastRead();
    recordActivityToday();
  }catch(e){
    mainContent.innerHTML = `<div class="error-box">${offlineAwareErrorMsg('সূরা')}<br><button onclick="openSurah(${num})">Try again.</button></div>`;
  }
}

function offlineAwareErrorMsg(label){
  if(typeof navigator !== 'undefined' && navigator.onLine === false){
    return `You are now offline and this ${label} The file was not previously saved, so it could not be loaded. Please try again when you have an internet connection.`;
  }
  return `${label} Could not load, check internet connection.`;
}

async function openJuz(num){
  showLoader();
  try{
    const [arRes, bnRes] = await Promise.all([
      fetch(`${API}/juz/${num}/quran-uthmani`),
      fetch(`${API}/juz/${num}/bn.bengali`)
    ]);
    const arData = (await arRes.json()).data;
    const bnData = (await bnRes.json()).data;
    const ayahs = arData.ayahs.map((a,i)=>({ number:a.number, numberInSurah:a.numberInSurah, surah:a.surah.number, arabic:a.text, bengali:(bnData.ayahs[i]||{}).text || '' }));
    renderReader({
      header: { arName: `الجزء ${num}`, bnName: `পারা ${toBn(num)}`, meta: `${toBn(arData.ayahs.length)} আয়াত`, playLabel: `সম্পূর্ণ পারা শুনুন` },
      showBismillah: false,
      ayahs
    });
    recordActivityToday();
  }catch(e){
    mainContent.innerHTML = `<div class="error-box">${offlineAwareErrorMsg('পারা')}<br><button onclick="openJuz(${num})">আবার চেষ্টা করুন</button></div>`;
  }
}

async function openPage(num){
  showLoader();
  try{
    const [arRes, bnRes] = await Promise.all([
      fetch(`${API}/page/${num}/quran-uthmani`),
      fetch(`${API}/page/${num}/bn.bengali`)
    ]);
    const arData = (await arRes.json()).data;
    const bnData = (await bnRes.json()).data;
    const ayahs = arData.ayahs.map((a,i)=>({ number:a.number, numberInSurah:a.numberInSurah, surah:a.surah.number, arabic:a.text, bengali:(bnData.ayahs[i]||{}).text || '' }));
    renderReader({
      header: { arName: `صفحة ${num}`, bnName: `পৃষ্ঠা ${toBn(num)}`, meta: `${toBn(arData.ayahs.length)} আয়াত`, playLabel: `সম্পূর্ণ পৃষ্ঠা শুনুন` },
      showBismillah: false,
      ayahs
    });
    recordActivityToday();
  }catch(e){
    mainContent.innerHTML = `<div class="error-box">${offlineAwareErrorMsg('পৃষ্ঠা')}<br><button onclick="openPage(${num})">আবার চেষ্টা করুন</button></div>`;
  }
}

async function openHizb(num){
  showLoader();
  try{
    const [arRes, bnRes] = await Promise.all([
      fetch(`${API}/hizbQuarter/${num}/quran-uthmani`),
      fetch(`${API}/hizbQuarter/${num}/bn.bengali`)
    ]);
    const arData = (await arRes.json()).data;
    const bnData = (await bnRes.json()).data;
    const ayahs = arData.ayahs.map((a,i)=>({ number:a.number, numberInSurah:a.numberInSurah, surah:a.surah.number, arabic:a.text, bengali:(bnData.ayahs[i]||{}).text || '' }));
    renderReader({
      header: { arName: `حزب ${num}`, bnName: `হিজব ${toBn(num)}`, meta: `${toBn(arData.ayahs.length)} আয়াত`, playLabel: `সম্পূর্ণ হিজব শুনুন` },
      showBismillah: false,
      ayahs
    });
    recordActivityToday();
  }catch(e){
    mainContent.innerHTML = `<div class="error-box">${offlineAwareErrorMsg('হিজব')}<br><button onclick="openHizb(${num})">আবার চেষ্টা করুন</button></div>`;
  }
}

async function openRuku(num){
  showLoader();
  try{
    const [arRes, bnRes] = await Promise.all([
      fetch(`${API}/ruku/${num}/quran-uthmani`),
      fetch(`${API}/ruku/${num}/bn.bengali`)
    ]);
    const arData = (await arRes.json()).data;
    const bnData = (await bnRes.json()).data;
    const ayahs = arData.ayahs.map((a,i)=>({ number:a.number, numberInSurah:a.numberInSurah, surah:a.surah.number, arabic:a.text, bengali:(bnData.ayahs[i]||{}).text || '' }));
    renderReader({
      header: { arName: `ركوع ${num}`, bnName: `রুকু ${toBn(num)}`, meta: `${toBn(arData.ayahs.length)} আয়াত`, playLabel: `সম্পূর্ণ রুকু শুনুন` },
      showBismillah: false,
      ayahs
    });
    recordActivityToday();
  }catch(e){
    mainContent.innerHTML = `<div class="error-box">${offlineAwareErrorMsg('রুকু')}<br><button onclick="openRuku(${num})">আবার চেষ্টা করুন</button></div>`;
  }
}

function renderReader({header, showBismillah, ayahs}){
  showReaderArea();
  readerToolbar.style.display='flex';
  state.playlist = ayahs.map(a => ({ key:`${a.surah}:${a.numberInSurah}`, globalNumber:a.number, surah:a.surah, numberInSurah:a.numberInSurah, title:(surahNamesBn[a.surah-1]||('সূরা '+a.surah)) }));
  const singleSurah = ayahs.length && ayahs.every(a => a.surah === ayahs[0].surah) ? ayahs[0].surah : null;
  const alreadyOffline = singleSurah && isSurahOffline(singleSurah);
  let html = `<div class="surah-header">
    <div class="ar-name">${header.arName}</div>
    <div class="bn-name">${header.bnName}</div>
    <div class="meta">${header.meta}</div>
    <div class="header-btn-row">
      <button class="play-all-btn" id="playAllBtn">▶ ${header.playLabel}</button>
      <button class="offline-btn${alreadyOffline ? ' downloaded' : ''}" id="offlineBtn">${alreadyOffline ? '✓ Saved offline' : '⬇ Save offline'}</button>
    </div>
  </div>`;
  if(showBismillah) html += `<div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
  ayahs.forEach(a => {
    const key = `${a.surah}:${a.numberInSurah}`;
    const isBookmarked = !!state.bookmarks[key];
    html += `<div class="ayah-card" id="ayah-${key.replace(':','-')}" data-key="${key}">
      <div class="medallion">
        ${starSvg()}
        <span>${toBn(a.numberInSurah)}</span>
      </div>
      <div class="ayah-body">
        <div class="ar-text">${a.arabic}</div>
        <div class="bn-text">${a.bengali}</div>
        <div class="ayah-actions">
          <button class="play-toggle" data-key="${key}">▶ Listen.</button>
          <button class="${isBookmarked?'bookmarked':''}" onclick="toggleBookmark('${key}', this)">${isBookmarked?'★ Reserved':'☆ Save'}</button>
        </div>
      </div>
    </div>`;
  });
  mainContent.innerHTML = html;
  applyFontSize();

  document.getElementById('playAllBtn').onclick = () => playAtIndex(0, true);
  const offlineBtn = document.getElementById('offlineBtn');
  if(offlineBtn) offlineBtn.onclick = () => downloadCurrentAudioForOffline(offlineBtn);
  document.querySelectorAll('.play-toggle').forEach(btn => {
    btn.onclick = () => {
      const key = btn.getAttribute('data-key');
      const idx = state.playlist.findIndex(p => p.key === key);
      if(idx === -1) return;
      if(state.isPlaying && state.playIndex === idx){ pausePlayback(); }
      else { playAtIndex(idx, true); }
    };
  });
  syncPlayingUI();
}

function starSvg(){
  return `<svg width="38" height="38" viewBox="0 0 38 38"><polygon points="19,2 22,12 33,9 25,17 33,25 22,22 19,33 16,22 5,25 13,17 5,9 16,12"
    fill="var(--gold-soft)" stroke="var(--gold)" stroke-width="1"/></svg>`;
}

// Bookmarks are stored via localStorage (see storage.js) so starred ayahs
// stay saved on the user's own device between visits.
function toggleBookmark(key, btn){
  if(state.bookmarks[key]){ delete state.bookmarks[key]; btn.classList.remove('bookmarked'); btn.textContent='☆ Save'; }
  else { state.bookmarks[key] = true; btn.classList.add('bookmarked'); btn.textContent='★ Reserved'; }
  saveBookmarks();
  const libList = document.getElementById('libraryListContainer');
  if(libList && document.getElementById('libTabBookmarks').classList.contains('active')) renderBookmarksList(libList);
}

function applyFontSize(){
  const arBase = 26 + state.fontStep*2;
  const bnBase = 16 + state.fontStep*1;
  document.documentElement.style.setProperty('--ar-size', arBase+'px');
  document.documentElement.style.setProperty('--bn-size', bnBase+'px');
}
