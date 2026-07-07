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
    const raw = localStorage.getItem(STATS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveActivity(a){
  try{ localStorage.setItem(STATS_LS_KEY, JSON.stringify(a)); }catch(e){}
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

function nextMilestone(streak){
  return STREAK_MILESTONES.find(m => m > streak) || (streak + 30);
}

function renderStatsView(){
  const container = document.getElementById('statsContainer');
  const activity = loadActivity();
  const todaySec = activity[todayStr()] || 0;
  const todayMin = Math.floor(todaySec / 60);
  const streak = computeStreak(activity);
  const milestone = nextMilestone(streak);

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

    <div class="badges-head">
      <span>ব্যাজ</span><span class="badges-see-all">সবগুলো দেখুন</span>
    </div>
    <div class="badges-row">
      <div class="badge-item"><div class="badge-circle">🔒</div><div class="badge-label">অডিও এক্সপ্লোরার</div></div>
      <div class="badge-item"><div class="badge-circle">🔒</div><div class="badge-label">অনুসন্ধান এক্সপ্লোরার</div></div>
      <div class="badge-item"><div class="badge-circle">🔒</div><div class="badge-label">হার্ট অব রমযান</div></div>
    </div>
  `;
}

function initStats(){
  initReadingTimer();
}
