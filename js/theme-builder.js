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
//
// ---- PREMIUM EXTENSIONS ----
// Beyond the 5 colors, the same unlock/builder now also covers:
//   - font pair (which typefaces the whole app's Bengali UI/heading text use)
//   - background pattern (a subtle full-screen tiled pattern behind everything)
//   - floating decorations (lantern / star ambience, opacity-light and
//     pointer-events:none so they never get in the way of tapping anything)
//   - which home-page sections are shown at all (ayah-of-day card, streak
//     ring, "last read" row, quick links row)
// These four extras are intentionally NOT scoped to body[data-theme="custom"]
// — unlike the 5 colors, they're personal layout/ambience preferences, so
// they keep applying no matter which color theme (emerald, ocean, custom...)
// is currently active. Only the 5-color palette itself is theme-scoped.

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

// ==== PREMIUM EXTENSION: font pairs ====
// Each pair sets the two CSS variables every stylesheet in css/*.css now
// reads (var(--font-ui,'Hind Siliguri') / var(--font-heading,'Noto Serif
// Bengali')), so switching a pair re-skins every screen in the app at once.
// Arabic ayah text keeps its own fixed 'Amiri' font regardless — this picker
// is only for the Bengali UI/heading typefaces, not the Quran script itself.
const TB_FONT_PAIRS = {
  classic:     { ui:"'Hind Siliguri'",  heading:"'Noto Serif Bengali'", sample:'বাংলা', name:'ক্লাসিক (ডিফল্ট)' },
  round:       { ui:"'Baloo Da 2'",     heading:"'Baloo Da 2'",         sample:'বাংলা', name:'গোলগাল (রাউন্ড)' },
  serif:       { ui:"'Tiro Bangla'",    heading:"'Tiro Bangla'",        sample:'বাংলা', name:'সাবেকি (সেরিফ)' },
  mixedserif:  { ui:"'Hind Siliguri'",  heading:"'Tiro Bangla'",        sample:'বাংলা', name:'মিশ্র (হেডিং সেরিফ)' }
};
function tbApplyFont(pairId){
  const f = TB_FONT_PAIRS[pairId] || TB_FONT_PAIRS.classic;
  document.documentElement.style.setProperty('--font-ui', f.ui);
  document.documentElement.style.setProperty('--font-heading', f.heading);
}

// ==== PREMIUM EXTENSION: background patterns ====
// CSS-only tiled patterns (no image assets, so they work fully offline) on
// a fixed full-screen layer behind the app-shell. Opacity is user-controlled.
const TB_PATTERNS = {
  none: { image:'none', size:'auto', name:'কোনোটিই না' },
  dots: { image:"radial-gradient(var(--line) 1.4px, transparent 1.4px)", size:'22px 22px', name:'বিন্দু' },
  grid: { image:"linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)", size:'26px 26px, 26px 26px', name:'গ্রিড' },
  geo:  { image:"repeating-linear-gradient(45deg, var(--gold) 0 1.5px, transparent 1.5px 26px), repeating-linear-gradient(-45deg, var(--gold) 0 1.5px, transparent 1.5px 26px)", size:'auto', name:'জ্যামিতিক' }
};

// ==== PREMIUM EXTENSION: floating decorations ====
// Scattered, low-opacity, pointer-events:none spans — pure ambience, never
// blocks a tap. Positions are hand-picked (not a grid) so they read as
// natural placement rather than a repeating pattern.
const TB_LANTERN_SPOTS = [ {top:'8%',left:'6%'}, {top:'24%',left:'88%'}, {top:'54%',left:'4%'}, {top:'70%',left:'91%'} ];
const TB_STAR_SPOTS = [ {top:'14%',left:'46%'}, {top:'34%',left:'12%'}, {top:'58%',left:'80%'}, {top:'80%',left:'32%'}, {top:'4%',left:'68%'} ];

function tbEnsureAmbientLayers(){
  let pat = document.getElementById('tbBgPatternLayer');
  if(!pat){
    pat = document.createElement('div');
    pat.id = 'tbBgPatternLayer';
    pat.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(pat, document.body.firstChild);
  }
  let dec = document.getElementById('tbDecorLayer');
  if(!dec){
    dec = document.createElement('div');
    dec.id = 'tbDecorLayer';
    dec.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(dec, pat.nextSibling);
  }
  return { pat, dec };
}
function tbApplyAmbient(cfg){
  cfg = cfg || {};
  const { pat, dec } = tbEnsureAmbientLayers();
  const key = cfg.bgPattern || 'none';
  const p = TB_PATTERNS[key] || TB_PATTERNS.none;
  pat.style.backgroundImage = p.image;
  pat.style.backgroundSize = p.size;
  pat.style.opacity = key === 'none' ? 0 : (cfg.bgPatternOpacity != null ? cfg.bgPatternOpacity : 0.25);

  dec.innerHTML = '';
  const items = [];
  if(cfg.decorLantern) TB_LANTERN_SPOTS.forEach(s => items.push({ spot:s, emoji:'🏮', cls:'tb-decor-lantern' }));
  if(cfg.decorStars) TB_STAR_SPOTS.forEach(s => items.push({ spot:s, emoji:'✨', cls:'tb-decor-star' }));
  items.forEach((it, i) => {
    const span = document.createElement('span');
    span.className = it.cls;
    span.textContent = it.emoji;
    span.style.top = it.spot.top;
    span.style.left = it.spot.left;
    span.style.animationDelay = (i * 0.35) + 's';
    dec.appendChild(span);
  });
}

// ==== PREMIUM EXTENSION: home-section show/hide ====
// Targets the actual home-page elements by id and hides them with a class
// (not inline style), so it never fights with the app's own logic that
// already toggles some of these (e.g. lastReadTitle only auto-shows when
// there's data) — .tb-hide-section wins with !important either way.
function tbApplyHomeSections(cfg){
  cfg = cfg || {};
  const hs = cfg.homeSections || {};
  const set = (id, visible) => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('tb-hide-section', visible === false);
  };
  set('ayahOfDayCard', hs.ayah !== false);
  set('homeStreakRing', hs.streak !== false);
  set('lastReadTitle', hs.lastread !== false);
  set('lastReadChips', hs.lastread !== false);
  set('quickLinkTitle', hs.quicklinks !== false);
  set('quickLinkChips', hs.quicklinks !== false);
}

// ---- Full draft defaults (merges an older saved config missing the newer
// premium fields with sane defaults, so nothing breaks for anyone who saved
// a custom theme before these extensions existed) ----
function tbDefaults(){
  return {
    parchment:'#FBF6EC', panel:'#F3ECDC', teal:'#0E3B36', gold:'#C0973A', ink:'#1E2A26', dark:false, radius:14,
    fontPair:'classic', bgPattern:'none', bgPatternOpacity:0.25,
    decorLantern:false, decorStars:false,
    homeSections:{ ayah:true, streak:true, lastread:true, quicklinks:true }
  };
}
function tbMergeWithDefaults(saved){
  const d = tbDefaults();
  if(!saved) return d;
  return Object.assign({}, d, saved, { homeSections: Object.assign({}, d.homeSections, saved.homeSections || {}) });
}

// Called once at startup (from js/app.js, BEFORE initTheme() paints the
// saved theme) so that if "custom" was the last-selected theme, its CSS
// variables already exist by the time it gets applied — and so the font /
// background pattern / decorations / home-section prefs are live from the
// very first paint, regardless of which color theme ends up active.
function loadCustomTheme(){
  const cfg = tbLoadRaw();
  if(!cfg) return;
  const full = tbMergeWithDefaults(cfg);
  tbApplyCSS(tbDeriveVars(full));
  tbRegisterInThemesList(full);
  tbApplyFont(full.fontPair);
  tbApplyAmbient(full);
  tbApplyHomeSections(full);
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
      <span class="theme-picker-desc">৩০ দিনের রিডিং স্ট্রিক প্রয়োজন (${toBn(streak)}/৩০ দিন) — রঙ, ফন্ট, ব্যাকগ্রাউন্ড ও হোমপেজ সাজানোর প্রিমিয়াম সুবিধা আনলক হবে</span>`;
    card.onclick = () => showToast(`আর ${toBn(Math.max(0, 30-streak))} দিন পড়লে প্রিমিয়াম কাস্টমাইজেশন আনলক হবে`);
  } else if(!cfg){
    card.innerHTML = `
      <span class="theme-picker-swatch tb-add-swatch"><i class="fa-solid fa-palette"></i></span>
      <span class="theme-picker-name">${t('theme_custom')} <i class="fa-solid fa-lock-open"></i></span>
      <span class="theme-picker-desc">রঙ, ফন্ট, ব্যাকগ্রাউন্ড প্যাটার্ন, ডেকোরেশন ও হোমপেজ — নিজের মনমতো সাজান</span>`;
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
  return tbMergeWithDefaults(tbLoadRaw());
}
function tbPreview(){
  tbApplyCSS(tbDeriveVars(tbDraft));
  tbRegisterInThemesList(tbDraft);
  document.body.setAttribute('data-theme', 'custom');
  document.body.classList.toggle('theme-dark-accent', !!tbDraft.dark);
  tbApplyFont(tbDraft.fontPair);
  tbApplyAmbient(tbDraft);
  tbApplyHomeSections(tbDraft);
}
// Hooked from js/menu.js closeModal() so every close path (✕ button,
// backdrop tap, Escape key) reverts an unsaved preview the same way —
// including the font / background / decoration / home-section previews,
// not just the color theme.
function tbCancelIfUnsaved(){
  if(tbSavedFlag){ tbSavedFlag = false; return; }
  if(tbPrevThemeId) applyTheme(tbPrevThemeId, { save:false });
  const saved = tbMergeWithDefaults(tbLoadRaw());
  tbApplyFont(saved.fontPair);
  tbApplyAmbient(saved);
  tbApplyHomeSections(saved);
}
function tbSave(){
  tbSaveRaw(tbDraft);
  tbRegisterInThemesList(tbDraft);
  tbSavedFlag = true;
  closeModal('themeBuilderModal');
  applyTheme('custom');
  tbApplyFont(tbDraft.fontPair);
  tbApplyAmbient(tbDraft);
  tbApplyHomeSections(tbDraft);
  showToast('প্রিমিয়াম কাস্টমাইজেশন সংরক্ষিত হয়েছে ✓');
}

function tbFieldRow(id, label, value){
  return `<div class="tb-row">
    <label for="${id}">${label}</label>
    <input type="color" id="${id}" value="${value}">
  </div>`;
}
function tbCheckRow(id, emoji, label, desc, checked){
  return `<label class="tb-check-row" for="${id}">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
    <span class="tcr-emoji">${emoji}</span>
    <span><span>${label}</span><span class="tcr-desc">${desc}</span></span>
  </label>`;
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
          <h3><i class="fa-solid fa-palette"></i> প্রিমিয়াম কাস্টমাইজেশন</h3>
          <button class="app-modal-close" id="tbClose">✕</button>
        </div>
        <div class="app-modal-body">
          <div class="tb-section-label"><i class="fa-solid fa-droplet"></i> রঙ</div>
          <div class="tb-fields" id="tbFields"></div>
          <div class="tb-row tb-row-radius">
            <label for="tbRadius">কোণা গোলাকার (Radius)</label>
            <input type="range" id="tbRadius" min="4" max="26" step="1">
          </div>
          <label class="tb-dark-toggle">
            <input type="checkbox" id="tbDarkChk"> এটি একটি ডার্ক থিম (ব্যাকগ্রাউন্ড অনুযায়ী auto-নির্ধারিত, প্রয়োজনে বদলে দিন)
          </label>

          <div class="tb-section-label"><i class="fa-solid fa-font"></i> ফন্ট স্টাইল</div>
          <div class="tb-font-grid" id="tbFontGrid"></div>

          <div class="tb-section-label"><i class="fa-solid fa-brush"></i> ব্যাকগ্রাউন্ড প্যাটার্ন</div>
          <div class="tb-pattern-grid" id="tbPatternGrid"></div>
          <div class="tb-row tb-row-opacity" id="tbOpacityRow">
            <label for="tbOpacity">প্যাটার্নের গাঢ়ত্ব</label>
            <input type="range" id="tbOpacity" min="0.1" max="0.6" step="0.05">
          </div>

          <div class="tb-section-label"><i class="fa-solid fa-wand-magic-sparkles"></i> ডেকোরেটিভ এলিমেন্ট</div>
          <div id="tbDecorChecks"></div>

          <div class="tb-section-label"><i class="fa-solid fa-house"></i> হোমপেজে যা দেখাবে</div>
          <div id="tbHomeChecks"></div>

          <div class="tb-preview-note"><i class="fa-solid fa-eye"></i> বদলানোর সাথে সাথে পুরো অ্যাপে লাইভ প্রিভিউ দেখা যাবে</div>
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

  // ---- Colors ----
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

  // ---- Font pair ----
  const fontGrid = document.getElementById('tbFontGrid');
  const renderFontGrid = () => {
    fontGrid.innerHTML = Object.keys(TB_FONT_PAIRS).map(id => {
      const f = TB_FONT_PAIRS[id];
      return `<button type="button" class="tb-font-card${tbDraft.fontPair === id ? ' active' : ''}" data-font-id="${id}">
        <span class="tfc-sample" style="font-family:${f.heading}">${f.sample}</span>
        <span class="tfc-name">${f.name}</span>
      </button>`;
    }).join('');
    fontGrid.querySelectorAll('.tb-font-card').forEach(card => {
      card.onclick = () => { tbDraft.fontPair = card.getAttribute('data-font-id'); renderFontGrid(); tbPreview(); };
    });
  };
  renderFontGrid();

  // ---- Background pattern ----
  const patternGrid = document.getElementById('tbPatternGrid');
  const opacityRow = document.getElementById('tbOpacityRow');
  const opacityEl = document.getElementById('tbOpacity');
  const renderPatternGrid = () => {
    patternGrid.innerHTML = Object.keys(TB_PATTERNS).map(id => {
      const p = TB_PATTERNS[id];
      const style = id === 'none' ? '' : `background-image:${p.image};background-size:${p.size};opacity:.7`;
      return `<button type="button" class="tb-pattern-card${tbDraft.bgPattern === id ? ' active' : ''}" data-pattern-id="${id}" style="${style}">
        <span>${p.name}</span>
      </button>`;
    }).join('');
    patternGrid.querySelectorAll('.tb-pattern-card').forEach(card => {
      card.onclick = () => {
        tbDraft.bgPattern = card.getAttribute('data-pattern-id');
        opacityRow.style.display = tbDraft.bgPattern === 'none' ? 'none' : 'flex';
        renderPatternGrid();
        tbPreview();
      };
    });
  };
  renderPatternGrid();
  opacityRow.style.display = tbDraft.bgPattern === 'none' ? 'none' : 'flex';
  opacityEl.value = tbDraft.bgPatternOpacity;
  opacityEl.oninput = (e) => { tbDraft.bgPatternOpacity = parseFloat(e.target.value); tbPreview(); };

  // ---- Decorations ----
  const decorWrap = document.getElementById('tbDecorChecks');
  decorWrap.innerHTML = [
    tbCheckRow('tbDecorLantern', '🏮', 'লন্ঠন', 'পুরো অ্যাপে হালকা ভাসমান লন্ঠন', tbDraft.decorLantern),
    tbCheckRow('tbDecorStars', '✨', 'তারা', 'পুরো অ্যাপে হালকা জ্বলজ্বলে তারা', tbDraft.decorStars)
  ].join('');
  document.getElementById('tbDecorLantern').onchange = (e) => { tbDraft.decorLantern = e.target.checked; tbPreview(); };
  document.getElementById('tbDecorStars').onchange = (e) => { tbDraft.decorStars = e.target.checked; tbPreview(); };

  // ---- Home sections ----
  const homeWrap = document.getElementById('tbHomeChecks');
  homeWrap.innerHTML = [
    tbCheckRow('tbHomeAyah', '📖', 'আজকের আয়াত কার্ড', 'হোমপেজের উপরে আয়াত কার্ড', tbDraft.homeSections.ayah),
    tbCheckRow('tbHomeStreak', '🔥', 'স্ট্রিক রিং', 'পড়ার ধারাবাহিকতার রিং', tbDraft.homeSections.streak),
    tbCheckRow('tbHomeLastRead', '🕓', 'সর্বশেষ পড়া', '"সর্বশেষ পড়েছিলেন" সারি', tbDraft.homeSections.lastread),
    tbCheckRow('tbHomeQuick', '🔗', 'কুইক লিংক', 'কুইক লিংক সারি', tbDraft.homeSections.quicklinks)
  ].join('');
  const homeMap = { tbHomeAyah:'ayah', tbHomeStreak:'streak', tbHomeLastRead:'lastread', tbHomeQuick:'quicklinks' };
  Object.keys(homeMap).forEach(id => {
    document.getElementById(id).onchange = (e) => { tbDraft.homeSections[homeMap[id]] = e.target.checked; tbPreview(); };
  });

  tbPreview();
  openModal('themeBuilderModal');
}
