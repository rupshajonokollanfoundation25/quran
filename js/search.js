// ---------- Full-Quran search ----------
function initSearch(){
  const searchInput = document.getElementById('searchInput');
  const searchPanel = document.getElementById('searchPanel');
  document.getElementById('closeSearch').onclick = () => { searchPanel.style.display='none'; };

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if(!q){ searchPanel.style.display='none'; return; }
    searchTimer = setTimeout(() => runSearch(q), 500);
  });
}

async function runSearch(q){
  const searchPanel = document.getElementById('searchPanel');
  const searchResults = document.getElementById('searchResults');
  const searchTitle = document.getElementById('searchTitle');

  searchPanel.style.display='flex';
  searchTitle.textContent = `"${q}" এর জন্য ফলাফল`;
  searchResults.innerHTML = `<div class="loader"><div class="spinner"></div><span>খোঁজা হচ্ছে...</span></div>`;
  try{
    const res = await fetch(`${API}/search/${encodeURIComponent(q)}/all/bn.bengali`);
    const data = await res.json();
    const matches = (data.data && data.data.matches) || [];
    if(matches.length === 0){
      searchResults.innerHTML = `<div class="sr-empty">কোনো ফলাফল পাওয়া যায়নি।</div>`;
      return;
    }
    searchResults.innerHTML = '';
    matches.slice(0,40).forEach(m => {
      const div = document.createElement('div');
      div.className = 'search-result';
      const surahName = surahNamesBn[m.surah.number-1] || m.surah.englishName;
      div.innerHTML = `<div class="sr-ref">সূরা ${surahName} — আয়াত ${toBn(m.numberInSurah)}</div>
        <div class="sr-text">${m.text}</div>`;
      div.onclick = () => {
        searchPanel.style.display='none';
        openSurahAndScrollTo(m.surah.number, m.numberInSurah);
      };
      searchResults.appendChild(div);
    });
  }catch(e){
    searchResults.innerHTML = `<div class="sr-empty">Search failed, check internet connection.</div>`;
  }
}
