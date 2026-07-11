// ---------- Custom Theme Builder (js/theme-builder.js) ----------
// Lets the user hand-pick their own theme colors instead of choosing from
// the 7 built-in THEMES (js/data.js). Gated behind a 30-day reading streak
// so it functions like an unlockable reward rather than a plain setting.
//
// UNLOCK RULE: uses the user's BEST-EVER streak (state.bestStreak, the same
// number the streak badges in js/stats.js are keyed off), not just today's
// live streak. That means once someone has genuinely read 30 days in a row
// even once, the builder stays unlocked for good — exactly like every other
// milestone badge in this app, which are also kept after a streak resets.
// Re-locking it the moment a streak breaks would take away something the
// user already earned, which felt punitive rather than motivating.
//
// Only 5 colors are asked of the user (background, panel, primary, accent,
// text) — the remaining CSS variables every theme in base.css needs
// (ink-soft, teal-deep, gold-soft, sage, line) are mathematically derived
// from those 5 so a random color choice still looks cohesive instead of
// clashing.

// ---- Tiny color math (hex <-> rgb, mix, darken, luminance) ----
function tbHexToRgb(hex){
  hex = String(hex||'#000000').replace('#','');
  if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  const num = parseInt(hex, 16) || 0;
  return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
}
function tbRgbToHex({r,g,b}){
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function tbMix(hexA, hexB, weightA){
  const a = tbHexToRgb(hexA), b = tbHexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightA));
  return tbRgbToHex({ r:a.r*w+b.r*(1-w), g:a.g*w+b.g*(1-w), b:a.b*w+b.b*(1-w) });
}
function tbDarken(hex, amount){
  const c = tbHexToRgb(hex);
  const f = 1 - amount;
  return tbRgbToHex({ r:c.r*f, g:c.g*f, b:c.b*f });
}
function tbLuminance(hex){
  const {r,g,b} = tbHexToRgb(hex);
  const lin = (v) => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}

// ---- Persistence (own IDBKV key, kept separate from the built-in theme system) ----
const TB_STORAGE_KEY = 'qr_custom_theme';
function tbLoadRaw(){
  try{ const raw = IDBKV.get(TB_STORAGE_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function tbSaveRaw(cfg){
  try{ IDBKV.set(TB_STORAGE_KEY, JSON.stringify(cfg)); }catch(e){}
}

// ---- Derive the full CSS-variable set from the 5 picked colors ----
function tbDeriveVars(cfg){
  return {
    parchment: cfg.parchment, panel: cfg.panel, ink: cfg.ink,
    inkSoft: tbMix(cfg.ink, cfg.parchment, 0.55),
    teal: cfg.teal, tealDeep: tbDarken(cfg.teal, 0.28),
    gold: cfg.gold, goldSoft: tbMix(cfg.gold, cfg.panel, 0.32),
    sage: tbMix(cfg.panel, cfg.teal, 0.12),
    line: tbMix(cfg.panel, cfg.ink, 0.16),
    radius: cfg.radius || 14
  };
}
function tbApplyCSS(vars){
  let tag = document.getElementById('customThemeStyleTag');
  if(!tag){ tag = document.createElement('style'); tag.id = 'customThemeStyleTag'; document.head.appendChild(tag); }
  tag.textContent = `body[data-theme="custom"]{
    --parchment:${vars.parchment}; --panel:${vars.panel}; --ink:${vars.ink}; --ink-soft:${vars.inkSoft};
    --teal:${vars.teal}; --teal-deep:${vars.tealDeep}; --gold:${vars.gold}; --gold-soft:${vars.goldSoft};
    --sage:${vars.sage}; --line:${vars.line}; --radius:${vars.radius}px; --bg-texture:none;
  }`;
  if(typeof THEME_COLORS !== 'undefined') THEME_COLORS.custom = vars.tealDeep;
}
function tbRegisterInThemesList(cfg){
  const meta = { id:'custom', nameKey:'theme_custom', descKey:'theme_custom_desc', dark: !!cfg.dark, swatch:[cfg.parchment, cfg.teal, cfg.gold] };
  const idx = THEMES.findIndex(th => th.id === 'custom');
  if(idx >= 0) THEMES[idx] = meta; else THEMES.push(meta);
}

// Called once at startup (from js/app.js, BEFORE initTheme() paints the
// saved theme) so that if "custom" was the last-selected theme, its CSS
// variables already exist by the time it gets applied.
function loadCustomTheme(){
  const cfg = tbLoadRaw();
  if(!cfg) return;
  tbApplyCSS(tbDeriveVars(cfg));
  tbRegisterInThemesList(cfg);
}

// Small Bengali/English label patch so the custom card can use the same
// t(key) lookup pattern as every built-in theme, without editing all 14
// per-language files in js/i18n/.
(function patchI18nForCustomTheme(){
  if(typeof I18N === 'undefined') return;
  Object.keys(I18N).forEach(lang => {
    if(I18N[lang].theme_custom === undefined) I18N[lang].theme_custom = (lang === 'bn') ? 'কাস্টম থিম' : 'Custom theme';
    if(I18N[lang].theme_custom_desc === undefined) I18N[lang].theme_custom_desc = (lang === 'bn') ? 'আপনার নিজের বাছাই করা রঙে তৈরি থিম' : 'A theme built from your own hand-picked colors';
  });
})();

// ---- Unlock gate ----
function tbCurrentStreak(){
  try{
    const s = computeStreak(loadActivity());
    if(s > (state.bestStreak||0) && typeof updateBestStreak === 'function') updateBestStreak(s);
    return Math.max(s, state.bestStreak||0);
  }catch(e){ return state.bestStreak||0; }
}
function customThemeUnlocked(){ return tbCurrentStreak() >= 30; }

// ---- The card appended to the end of the theme-picker grid (see js/app.js openThemePicker) ----
function appendCustomThemeCard(grid, t){
  if(!grid) return;
  const unlocked = customThemeUnlocked();
  const cfg = tbLoadRaw();
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'theme-picker-card theme-picker-card-custom';
  card.setAttribute('data-theme-id', 'custom');

  if(!unlocked){
    const streak = tbCurrentStreak();
    card.classList.add('locked');
    card.innerHTML = `
      <span class="theme-picker-swatch tb-locked-swatch"><i class="fa-solid fa-lock"></i></span>
      <span class="theme-picker-name">${t('theme_custom')}</span>
      <span class="theme-picker-desc">৩০ দিনের রিডিং স্ট্রিক প্রয়োজন (${toBn(streak)}/৩০ দিন)</span>`;
    card.onclick = () => showToast(`আর ${toBn(Math.max(0, 30-streak))} দিন পড়লে কাস্টম থিম আনলক হবে`);
  } else if(!cfg){
    card.innerHTML = `
      <span class="theme-picker-swatch tb-add-swatch"><i class="fa-solid fa-palette"></i></span>
      <span class="theme-picker-name">${t('theme_custom')} <i class="fa-solid fa-lock-open"></i></span>
      <span class="theme-picker-desc">নিজের পছন্দমতো রঙে থিম তৈরি করুন</span>`;
    card.onclick = () => openThemeBuilder();
  } else {
    const active = state.theme === 'custom';
    card.classList.toggle('active', active);
    card.innerHTML = `
      <span class="theme-picker-swatch">${[cfg.parchment, cfg.teal, cfg.gold].map(c => `<span style="background:${c}"></span>`).join('')}</span>
      <span class="theme-picker-name">${t('theme_custom')}${active ? ' <i class="fa-solid fa-circle-check"></i>' : ''} <button type="button" class="tb-edit-btn" title="সম্পাদনা করুন"><i class="fa-solid fa-pen"></i></button></span>
      <span class="theme-picker-desc">${t('theme_custom_desc')}</span>`;
    card.onclick = (e) => { if(e.target.closest('.tb-edit-btn')) return; applyTheme('custom'); };
  }
  grid.appendChild(card);
  const editBtn = card.querySelector('.tb-edit-btn');
  if(editBtn) editBtn.onclick = (e) => { e.stopPropagation(); openThemeBuilder(); };
}

// ---- Builder modal (live preview + save/cancel) ----
let tbPrevThemeId = null;
let tbDraft = null;
let tbSavedFlag = false;

function tbDefaultDraft(){
  return tbLoadRaw() || { parchment:'#FBF6EC', panel:'#F3ECDC', teal:'#0E3B36', gold:'#C0973A', ink:'#1E2A26', dark:false, radius:14 };
}
function tbPreview(){
  tbApplyCSS(tbDeriveVars(tbDraft));
  tbRegisterInThemesList(tbDraft);
  document.body.setAttribute('data-theme', 'custom');
  document.body.classList.toggle('theme-dark-accent', !!tbDraft.dark);
}
// Hooked from js/menu.js closeModal() so every close path (✕ button,
// backdrop tap, Escape key) reverts an unsaved preview the same way.
function tbCancelIfUnsaved(){
  if(tbSavedFlag){ tbSavedFlag = false; return; }
  if(tbPrevThemeId) applyTheme(tbPrevThemeId, { save:false });
}
function tbSave(){
  tbSaveRaw(tbDraft);
  tbRegisterInThemesList(tbDraft);
  tbSavedFlag = true;
  closeModal('themeBuilderModal');
  applyTheme('custom');
  showToast('কাস্টম থিম সংরক্ষিত হয়েছে ✓');
}

function tbFieldRow(id, label, value){
  return `<div class="tb-row">
    <label for="${id}">${label}</label>
    <input type="color" id="${id}" value="${value}">
  </div>`;
}

function openThemeBuilder(){
  if(!customThemeUnlocked()){
    showToast(`৩০ দিনের স্ট্রিক প্রয়োজন (বর্তমানে ${toBn(tbCurrentStreak())} দিন)`);
    return;
  }
  tbPrevThemeId = state.theme;
  tbDraft = tbDefaultDraft();

  let modal = document.getElementById('themeBuilderModal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.id = 'themeBuilderModal';
    modal.innerHTML = `
      <div class="app-modal-box">
        <div class="app-modal-head">
          <h3><i class="fa-solid fa-palette"></i> কাস্টম থিম তৈরি করুন</h3>
          <button class="app-modal-close" id="tbClose">✕</button>
        </div>
        <div class="app-modal-body">
          <div class="tb-fields" id="tbFields"></div>
          <div class="tb-row tb-row-radius">
            <label for="tbRadius">কোণা গোলাকার (Radius)</label>
            <input type="range" id="tbRadius" min="4" max="26" step="1">
          </div>
          <label class="tb-dark-toggle">
            <input type="checkbox" id="tbDarkChk"> এটি একটি ডার্ক থিম (ব্যাকগ্রাউন্ড অনুযায়ী auto-নির্ধারিত, প্রয়োজনে বদলে দিন)
          </label>
          <div class="tb-preview-note"><i class="fa-solid fa-eye"></i> রঙ বদলানোর সাথে সাথে পুরো অ্যাপে লাইভ প্রিভিউ দেখা যাবে</div>
          <div class="input-box-actions" style="margin-top:14px;">
            <button class="tw-cancel-btn" id="tbCancelBtn">বাতিল</button>
            <button class="tw-save-btn" id="tbSaveBtn">সংরক্ষণ করুন</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    wireModalBackdrop('themeBuilderModal');
    document.getElementById('tbClose').onclick = () => closeModal('themeBuilderModal');
    document.getElementById('tbCancelBtn').onclick = () => closeModal('themeBuilderModal');
    document.getElementById('tbSaveBtn').onclick = () => tbSave();
  }

  const fields = document.getElementById('tbFields');
  fields.innerHTML = [
    tbFieldRow('tbParchment', 'ব্যাকগ্রাউন্ড', tbDraft.parchment),
    tbFieldRow('tbPanel', 'প্যানেল / কার্ড', tbDraft.panel),
    tbFieldRow('tbTeal', 'প্রধান রঙ (হেডার)', tbDraft.teal),
    tbFieldRow('tbGold', 'সোনালি অ্যাকসেন্ট', tbDraft.gold),
    tbFieldRow('tbInk', 'লেখার রঙ', tbDraft.ink)
  ].join('');

  const onColorChange = (key, id) => {
    document.getElementById(id).oninput = (e) => {
      tbDraft[key] = e.target.value;
      if(key === 'parchment') tbDraft.dark = tbLuminance(tbDraft.parchment) < 0.35;
      document.getElementById('tbDarkChk').checked = !!tbDraft.dark;
      tbPreview();
    };
  };
  onColorChange('parchment', 'tbParchment');
  onColorChange('panel', 'tbPanel');
  onColorChange('teal', 'tbTeal');
  onColorChange('gold', 'tbGold');
  onColorChange('ink', 'tbInk');

  const radiusEl = document.getElementById('tbRadius');
  radiusEl.value = tbDraft.radius;
  radiusEl.oninput = (e) => { tbDraft.radius = parseInt(e.target.value, 10); tbPreview(); };

  const darkChk = document.getElementById('tbDarkChk');
  darkChk.checked = !!tbDraft.dark;
  darkChk.onchange = (e) => { tbDraft.dark = e.target.checked; tbPreview(); };

  tbPreview();
  openModal('themeBuilderModal');
}
