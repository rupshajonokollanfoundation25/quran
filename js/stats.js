// ---------- Reading statistics: streak, weekly chart, badges ----------
// Activity is tracked as seconds-read-per-date in localStorage. There's no
// server or account, so this is purely a local, on-device streak — it
// resets if the user clears site data, same as bookmarks/history.
const STATS_LS_KEY = 'qr_activity';
const DAILY_GOAL_MIN = 1; // matches the "0 min / 1 min" style daily goal
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];
const WEEKDAY_LABELS_BN = ['S','M','Tu','W','Th','F','S'];

function loadActivity(){
  try{
    const raw = IDBKV.get(STATS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveActivity(a){
  try{ IDBKV.set(STATS_LS_KEY, JSON.stringify(a)); }catch(e){}
  queueCloudSync();
}

// Called from openSurah/openJuz/openPage/openHizb/openRuku, from audio
// playback, and from marking a planner day — i.e. any real reading/listening
// activity — so the streak reflects actual use, not just opening the app.
function recordActivityToday(){
  const activity = loadActivity();
  const key = todayStr();
  activity[key] = (activity[key] || 0) + 15; // nominal bump per action
  saveActivity(activity);
}

// A lightweight ticking timer that only accumulates while the reader is
// actually open and the tab is focused, for a more realistic minutes count.
function initReadingTimer(){
  setInterval(() => {
    if(document.hidden) return;
    if(!readerArea || readerArea.style.display === 'none') return;
    const activity = loadActivity();
    const key = todayStr();
    activity[key] = (activity[key] || 0) + 20;
    saveActivity(activity);
  }, 20000);
}

function computeStreak(activity){
  let streak = 0;
  const d = new Date();
  while(true){
    const key = d.toISOString().slice(0,10);
    if((activity[key] || 0) > 0){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

// Total seconds ever recorded across all dates — the "অতিবাহিত সময়" lifetime stat.
function totalTimeSpentSeconds(activity){
  return Object.values(activity || {}).reduce((sum, s) => sum + (s || 0), 0);
}
function formatDurationBn(totalSeconds){
  const totalMin = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if(h <= 0) return `${toBn(m)} মিনিট`;
  return `${toBn(h)} ঘন্টা ${toBn(m)} মিনিট`;
}

function nextMilestone(streak){
  return STREAK_MILESTONES.find(m => m > streak) || (streak + 30);
}

// ---------- Badges: real unlock logic tied to actual app usage ----------
const BADGE_ICON_SVGS = {
  audio: '<path d="M4.5 13.5a7.5 7.5 0 0 1 15 0"/><rect x="3.2" y="13.5" width="4.2" height="7" rx="1.6"/><rect x="16.6" y="13.5" width="4.2" height="7" rx="1.6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.8"/><path d="M20 20l-4.3-4.3"/>',
  ramadan: '<path d="M12 3a9 9 0 1 0 8.9 10.4A6.5 6.5 0 0 1 12 3z"/><path d="M18 3.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/>'
};
function badgeIconSvg(id){
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BADGE_ICON_SVGS[id]||''}</svg>`;
}
const AUDIO_BADGE_GOAL = 5;
const SEARCH_BADGE_GOAL = 5;
// Effective unique-surahs-played count = whichever is higher between this
// device's own local list and the aggregate count last synced from the
// cloud (see js/auth.js) — never the cloud's actual surah list, since that's
// never uploaded in the first place.
function audioSurahsPlayedEffectiveCount(){
  return Math.max((state.audioSurahsPlayed||[]).length, state.audioSurahsPlayedFloor || 0);
}
const BADGES = [
  {
    id: 'audio', label: 'অডিও এক্সপ্লোরার',
    progress: () => Math.min(audioSurahsPlayedEffectiveCount(), AUDIO_BADGE_GOAL),
    goal: AUDIO_BADGE_GOAL,
    caption: () => `${toBn(Math.min(audioSurahsPlayedEffectiveCount(), AUDIO_BADGE_GOAL))}/${toBn(AUDIO_BADGE_GOAL)} সূরা শোনা`
  },
  {
    id: 'search', label: 'সার্চ এক্সপ্লোরার',
    progress: () => Math.min(state.searchCount||0, SEARCH_BADGE_GOAL),
    goal: SEARCH_BADGE_GOAL,
    caption: () => `${toBn(Math.min(state.searchCount||0, SEARCH_BADGE_GOAL))}/${toBn(SEARCH_BADGE_GOAL)} সার্চ`
  },
  {
    id: 'ramadan', label: 'হার্ট অব রমযান',
    progress: () => Math.min(taraweehCompletedCount ? taraweehCompletedCount() : 0, 1),
    goal: 1,
    caption: () => (taraweehCompletedCount && taraweehCompletedCount() > 0) ? 'তারাবীহ লগ করা হয়েছে' : 'তারাবীহ ট্র্যাকার ব্যবহার করুন'
  }
];
function renderBadges(){
  return BADGES.map(b => {
    const progress = b.progress();
    const unlocked = progress >= b.goal;
    return `<div class="badge-card${unlocked?' unlocked':''}">
      <div class="badge-ic-box">${badgeIconSvg(b.id)}${unlocked?'':'<span class="badge-lock-dot"><i class="fa-solid fa-lock"></i></span>'}</div>
      <div class="badge-name-v2">${b.label}</div>
      <div class="badge-progress-v2">${b.caption()}</div>
    </div>`;
  }).join('');
}

// "সবগুলো দেখুন" — a small modal describing every badge and how to unlock it,
// reusing the app's existing generic .app-modal look (see js/menu.js).
function openAllBadgesModal(){
  const old = document.getElementById('allBadgesModal');
  if(old) old.remove();
  const wrap = document.createElement('div');
  wrap.className = 'app-modal';
  wrap.id = 'allBadgesModal';
  wrap.style.display = 'flex';
  wrap.innerHTML = `
    <div class="app-modal-box">
      <div class="app-modal-head">
        <h3><i class="fa-solid fa-award"></i> সকল ব্যাজ</h3>
        <button class="app-modal-close" id="allBadgesClose">✕</button>
      </div>
      <div class="app-modal-body">
        <div class="badges-grid badges-grid-modal">${renderBadges()}</div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const remove = () => wrap.remove();
  wrap.addEventListener('click', (e) => { if(e.target === wrap) remove(); });
  document.getElementById('allBadgesClose').onclick = remove;
}

// ---------- Sign-up / login prompt + signed-in account strip ----------
function renderAccountArea(){
  const user = state.user;
  if(user){
    const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
    return `
      <div class="stats-card account-strip">
        <div class="account-avatar">${initial}</div>
        <div class="account-info">
          <div class="account-name">${escapeHtml(user.name || 'ব্যবহারকারী')}</div>
          <div class="account-email">${escapeHtml(user.email || '')}</div>
        </div>
        <button class="account-logout-btn" id="statsLogoutBtn"><i class="fa-solid fa-right-from-bracket"></i></button>
      </div>`;
  }
  return `
    <div class="stats-card auth-prompt-card">
      <div class="auth-prompt-text">আপনার ব্যাজগুলো হারাবেন না! লগ ইন করুন যাতে আপনার অগ্রগতি এবং ব্যাজগুলি সংরক্ষিত থাকে।</div>
      <button class="auth-cta-btn" id="statsAuthBtn">সাইন আপ / লগ ইন</button>
    </div>`;
}

// ---------- Lifetime activity row ----------
function renderLifetimeActivity(activity, streak){
  const loggedIn = !!state.user;
  const ayahCount = loggedIn ? toBn(ayahsReadCount()) : '--';
  const timeSpent = loggedIn ? formatDurationBn(totalTimeSpentSeconds(activity)) : '--';
  const best = loggedIn ? toBn(Math.max(state.bestStreak || 0, streak)) : '--';
  return `
    <div class="section-title-sm">লাইফটাইম অ্যাকটিভিটি</div>
    <div class="lifetime-grid">
      <div class="lifetime-box">
        <i class="fa-solid fa-bolt"></i>
        <div class="lifetime-val">${ayahCount}</div>
        <div class="lifetime-label">আয়াত পাঠ</div>
      </div>
      <div class="lifetime-box">
        <i class="fa-regular fa-clock"></i>
        <div class="lifetime-val">${timeSpent}</div>
        <div class="lifetime-label">অতিবাহিত সময়</div>
      </div>
      <div class="lifetime-box">
        <i class="fa-solid fa-medal"></i>
        <div class="lifetime-val">${best}</div>
        <div class="lifetime-label">সেরা স্ট্রিক</div>
      </div>
    </div>
    ${loggedIn ? '' : '<div class="lifetime-login-hint">আপনার পরিসংখ্যান ট্র্যাক করতে লগ ইন করুন।</div>'}`;
}

// ---------- Mini "আজকের আয়াত" card for the stats page, with share/copy/refresh ----------
let statsAodState = null;
async function fetchAyahPair(s, a){
  const [arRes, bnRes] = await Promise.all([
    fetch(`${API}/ayah/${s}:${a}/quran-uthmani`).then(r => r.json()),
    fetch(`${API}/ayah/${s}:${a}/${state.translationEdition}`).then(r => r.json())
  ]);
  return {
    s, a,
    arabic: arRes && arRes.data ? arRes.data.text : '',
    bengali: bnRes && bnRes.data ? bnRes.data.text : ''
  };
}
function renderStatsAodCard(){
  const box = document.getElementById('statsAodBox');
  if(!box) return;
  if(!statsAodState){
    box.innerHTML = `<div class="aod-loading">লোড হচ্ছে...</div>`;
    return;
  }
  const surahName = surahNamesBn[statsAodState.s-1] || ('সূরা ' + statsAodState.s);
  box.innerHTML = `
    <div class="aod-arabic" style="font-size:18px;">${statsAodState.arabic || ''}</div>
    <div class="aod-bengali" style="color:var(--ink-soft);">${statsAodState.bengali || ''}</div>
    <div class="aod-ref">সূরা ${surahName} — আয়াত ${toBn(statsAodState.a)}</div>
    <div class="stats-aod-actions">
      <button id="statsAodShare" title="শেয়ার করুন"><i class="fa-solid fa-share"></i></button>
      <button id="statsAodCopy" title="কপি করুন"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
      <button id="statsAodRefresh" title="নতুন আয়াত"><i class="fa-solid fa-rotate-right"></i></button>
    </div>`;
  const shareText = () => `${statsAodState.arabic}\n\n${statsAodState.bengali}\n— সূরা ${surahName}, আয়াত ${toBn(statsAodState.a)}`;
  document.getElementById('statsAodShare').onclick = async () => {
    if(navigator.share){ try{ await navigator.share({ text: shareText() }); }catch(e){} }
    else { try{ await navigator.clipboard.writeText(shareText()); showToast('কপি করা হয়েছে'); }catch(e){} }
  };
  document.getElementById('statsAodCopy').onclick = () => openSurahAndScrollTo(statsAodState.s, statsAodState.a);
  document.getElementById('statsAodRefresh').onclick = () => loadStatsAod(true);
}
async function loadStatsAod(forceRandom){
  let s, a;
  if(forceRandom){
    const pick = AYAH_OF_DAY_POOL[Math.floor(Math.random() * AYAH_OF_DAY_POOL.length)];
    s = pick.s; a = pick.a;
  } else {
    const today = ayahOfTheDay();
    s = today.s; a = today.a;
  }
  statsAodState = null;
  renderStatsAodCard();
  try{
    statsAodState = await fetchAyahPair(s, a);
  }catch(e){
    const box = document.getElementById('statsAodBox');
    if(box) box.innerHTML = `<div class="aod-loading">লোড করা যায়নি, ইন্টারনেট সংযোগ পরীক্ষা করুন।</div>`;
    return;
  }
  renderStatsAodCard();
}

function renderStatsView(){
  const container = document.getElementById('statsContainer');
  const activity = loadActivity();
  const todaySec = activity[todayStr()] || 0;
  const todayMin = Math.floor(todaySec / 60);
  const streak = computeStreak(activity);
  const milestone = nextMilestone(streak);
  updateBestStreak(streak);

  // This week's per-day minutes (Sun..Sat)
  const now = new Date();
  const dow = now.getDay();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow);
  const weekMinutes = [];
  for(let i=0;i<7;i++){
    const d = new Date(weekStart); d.setDate(weekStart.getDate()+i);
    const key = d.toISOString().slice(0,10);
    weekMinutes.push(Math.floor((activity[key]||0)/60));
  }
  const maxWeekMin = Math.max(1, ...weekMinutes);

  container.innerHTML = `
    ${renderAccountArea()}

    <div class="badges-head">
      <span>ব্যাজ</span>
      <a href="javascript:void(0)" id="statsSeeAllBadges">সবগুলো দেখুন</a>
    </div>
    <div class="badges-grid">
      ${renderBadges()}
    </div>

    <div class="section-title-sm">আজকের আয়াত</div>
    <div class="stats-card stats-aod-card" id="statsAodBox">
      <div class="aod-loading">লোড হচ্ছে...</div>
    </div>

    ${renderLifetimeActivity(activity, streak)}

    <div class="stats-card">
      <div class="stats-top-row">
        <div>
          <div class="stats-label">আজকে পড়ুন</div>
          <div class="stats-big">${toBn(todayMin)} min <span class="stats-goal">/ ${toBn(DAILY_GOAL_MIN)} min</span></div>
          <div class="stats-label" style="margin-top:14px;">বর্তমান স্ট্রিক</div>
          <div class="stats-big">${toBn(streak)} দিন</div>
        </div>
        <div class="stats-ring${todayMin>0?' active':''}">⚡</div>
      </div>
    </div>

    <div class="stats-card">
      <div class="stats-label">এই সপ্তাহ</div>
      <div class="week-chart">
        ${weekMinutes.map((m,i) => `
          <div class="week-col">
            <div class="week-bar-track"><div class="week-bar-fill" style="height:${Math.round((m/maxWeekMin)*70)}px"></div></div>
            <div class="week-day${i===dow?' today':''}">${WEEKDAY_LABELS_BN[i]}</div>
            <div class="week-min">${toBn(m)}m</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="stats-card">
      <div class="streak-range-row">
        <div><div class="stats-big-sm">${toBn(streak)}d</div><div class="stats-label">বর্তমান স্ট্রিক</div></div>
        <div style="text-align:right;"><div class="stats-big-sm">${toBn(milestone)}d</div><div class="stats-label">পরবর্তী লক্ষ্য</div></div>
      </div>
      <div class="planner-progress-bar" style="margin-top:8px;"><div class="planner-progress-fill" style="width:${Math.min(100,Math.round((streak/milestone)*100))}%"></div></div>
    </div>
  `;

  document.getElementById('statsSeeAllBadges').onclick = openAllBadgesModal;
  const authBtn = document.getElementById('statsAuthBtn');
  if(authBtn) authBtn.onclick = () => openAuthFlow('choice');
  const logoutBtn = document.getElementById('statsLogoutBtn');
  if(logoutBtn) logoutBtn.onclick = () => confirmLogout();
  loadStatsAod(false);
}

function initStats(){
  initReadingTimer();
}
