// ---------- Ramadan mode + Taraweeh tracker ----------
// Ramadan mode is a purely visual theme layer (a data-ramadan="on" attribute
// on <body>, styled in style.css) plus it surfaces the Taraweeh tracker.
// The tracker itself works year-round though — no need to gate it strictly
// to the month of Ramadan, since users may want to log Qiyam/Tarawih any time.

function applyRamadanVisual(){
  document.body.setAttribute('data-ramadan', state.ramadanMode ? 'on' : 'off');
}

function initRamadanToggle(){
  const chk = document.getElementById('settingsRamadanMode');
  if(!chk) return;
  chk.checked = state.ramadanMode;
  applyRamadanVisual();
  chk.onchange = () => {
    state.ramadanMode = chk.checked;
    saveRamadanMode();
    applyRamadanVisual();
    showToast(state.ramadanMode ? '🌙 রমজান মোড চালু হয়েছে' : 'রমজান মোড বন্ধ করা হয়েছে');
  };
}

// ---------- Taraweeh tracker modal ----------
function initTaraweehModal(){
  wireModalBackdrop('taraweehModal');
  document.getElementById('taraweehClose').onclick = () => closeModal('taraweehModal');
}

function openTaraweehModal(){
  renderTaraweehBody();
  openModal('taraweehModal');
}

function taraweehCompletedCount(){
  const goal = state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL;
  return Object.values(state.taraweeh.days).filter(r => r >= goal).length;
}

function renderTaraweehBody(){
  const body = document.getElementById('taraweehBody');
  const goal = state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL;
  const completedNights = taraweehCompletedCount();

  let grid = '';
  for(let day = 1; day <= 30; day++){
    const rakats = state.taraweeh.days[day] || 0;
    const done = rakats >= goal;
    grid += `<div class="tw-day${done ? ' done' : (rakats>0 ? ' partial' : '')}" data-day="${day}">
      <div class="tw-day-num">${toBn(day)}</div>
      <div class="tw-day-rakat">${toBn(rakats)}/${toBn(goal)}</div>
    </div>`;
  }

  body.innerHTML = `
    <div class="tw-summary">
      <div class="tw-summary-big">${toBn(completedNights)}<span>/৩০</span></div>
      <div class="tw-summary-label">রাত সম্পন্ন হয়েছে</div>
    </div>
    <div class="tw-goal-row">
      <span>প্রতি রাতের রাকাত লক্ষ্য</span>
      <div class="tw-goal-controls">
        <button id="twGoalDec">−</button>
        <span id="twGoalVal">${toBn(goal)}</span>
        <button id="twGoalInc">+</button>
      </div>
    </div>
    <div class="tw-grid">${grid}</div>
    <div class="tw-hint">প্রতিটি রাতের ঘরে চাপ দিয়ে সে রাতের সম্পন্ন করা রাকাত সংখ্যা বসান।</div>
  `;

  document.getElementById('twGoalDec').onclick = () => {
    state.taraweeh.goal = Math.max(2, (state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL) - 2);
    saveTaraweeh();
    renderTaraweehBody();
  };
  document.getElementById('twGoalInc').onclick = () => {
    state.taraweeh.goal = Math.min(40, (state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL) + 2);
    saveTaraweeh();
    renderTaraweehBody();
  };

  body.querySelectorAll('.tw-day').forEach(el => {
    el.onclick = () => {
      const day = parseInt(el.getAttribute('data-day'), 10);
      const current = state.taraweeh.days[day] || 0;
      const g = state.taraweeh.goal || RAMADAN_DEFAULT_RAKAT_GOAL;
      const input = window.prompt(`${toBn(day)} নং রাতে কত রাকাত তারাবীহ পড়েছেন? (০ - ${toBn(g)})`, String(current));
      if(input === null) return;
      const n = parseInt(input, 10);
      if(!Number.isInteger(n)) return;
      setTaraweehDay(day, n);
      renderTaraweehBody();
    };
  });
}

function initRamadan(){
  initRamadanToggle();
  initTaraweehModal();
}
