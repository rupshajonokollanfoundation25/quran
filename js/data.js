// ---------- Static data & constants ----------
// NOTE: this file is loaded both as a normal <script> in index.html AND via
// importScripts() inside sw.js, so it must stay free of any `window`/`document`
// references — only plain constants and pure helper functions belong here.
const API = 'https://api.alquran.cloud/v1';
const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio/128';
const PRAYER_API = 'https://api.aladhan.com/v1';

// ---------- Theme gallery ----------
// Each theme is a full, self-consistent design (colors, corner shape, and a
// background glow), not just a light/dark recolor — see the matching
// body[data-theme="..."] block in css/style.css for the actual values.
// `dark` marks themes that sit on a dark base, which also adds the
// .theme-dark-accent class to body so a handful of accent colors switch to
// gold for contrast, same as the old dedicated "night mode" toggle did.
// `swatch` is 3 representative colors, used to draw the little preview
// strip on each card in the theme picker.
const THEMES = [
  { id:'emerald', nameKey:'theme_emerald', descKey:'theme_emerald_desc', dark:false, swatch:['#FBF6EC','#0E3B36','#C0973A'] },
  { id:'night',   nameKey:'theme_night',   descKey:'theme_night_desc',   dark:true,  swatch:['#0F1F1B','#123A34','#D9B45E'] },
  { id:'royal',   nameKey:'theme_royal',   descKey:'theme_royal_desc',   dark:true,  swatch:['#170F26','#3D2470','#E3B854'] },
  { id:'desert',  nameKey:'theme_desert',  descKey:'theme_desert_desc',  dark:false, swatch:['#FBF1E4','#B5581F','#C9932F'] },
  { id:'ocean',   nameKey:'theme_ocean',   descKey:'theme_ocean_desc',   dark:false, swatch:['#EEF6F8','#116E8C','#E0A94B'] },
  { id:'amoled',  nameKey:'theme_amoled',  descKey:'theme_amoled_desc',  dark:true,  swatch:['#000000','#101010','#E6B94D'] },
  { id:'rose',    nameKey:'theme_rose',    descKey:'theme_rose_desc',    dark:false, swatch:['#FDF3F5','#B5476B','#CDA15A'] }
];

// Bump the version suffix any time app-shell files change so the service
// worker picks up a fresh copy instead of serving a stale cached version.
const SW_VERSION = 'v25';
const SHELL_CACHE_NAME = `qr-shell-${SW_VERSION}`;
const API_CACHE_NAME = `qr-api-${SW_VERSION}`;
const AUDIO_CACHE_NAME = `qr-audio-${SW_VERSION}`;
const FONT_CACHE_NAME = `qr-fonts-${SW_VERSION}`;

const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/storage.js',
  './js/firebase-config.js',
  './js/auth.js',
  './js/player.js',
  './js/reader.js',
  './js/sidebar.js',
  './js/search.js',
  './js/topics.js',
  './js/planner.js',
  './js/stats.js',
  './js/ramadan.js',
  './js/nav.js',
  './js/menu.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
function toBn(n){ return String(n).split('').map(d => /[0-9]/.test(d) ? bnDigits[+d] : d).join(''); }

// A curated pool used for the "Ayah of the Day" home card — one is picked
// deterministically per calendar day so it stays the same all day and
// changes at midnight.
const AYAH_OF_DAY_POOL = [
  {s:2,a:255}, {s:94,a:5}, {s:94,a:6}, {s:13,a:28}, {s:2,a:286},
  {s:65,a:3}, {s:3,a:159}, {s:39,a:53}, {s:2,a:152}, {s:16,a:97},
  {s:29,a:69}, {s:9,a:40}, {s:2,a:216}, {s:20,a:114}, {s:17,a:23},
  {s:31,a:14}, {s:49,a:13}, {s:59,a:22}, {s:59,a:23}, {s:59,a:24},
  {s:112,a:1}, {s:21,a:35}, {s:6,a:162}, {s:3,a:139}, {s:33,a:41},
  {s:8,a:2}, {s:24,a:35}, {s:4,a:1}, {s:30,a:21}, {s:41,a:34}
];
function ayahOfTheDay(){
  const d = new Date();
  const dayNum = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return AYAH_OF_DAY_POOL[dayNum % AYAH_OF_DAY_POOL.length];
}

const RAMADAN_DEFAULT_RAKAT_GOAL = 20;

const surahNamesBn = ["আল-ফাতিহা","আল-বাকারা","আলে ইমরান","আন-নিসা","আল-মায়িদা","আল-আনআম","আল-আরাফ","আল-আনফাল","আত-তাওবা","ইউনুস","হুদ","ইউসুফ","আর-রাদ","ইব্রাহীম","আল-হিজর","আন-নাহল","বনী ইসরাঈল (আল-ইসরা)","আল-কাহফ","মারইয়াম","ত্বা-হা","আল-আম্বিয়া","আল-হাজ্জ","আল-মুমিনূন","আন-নূর","আল-ফুরকান","আশ-শুআরা","আন-নামল","আল-কাসাস","আল-আনকাবূত","আর-রূম","লুকমান","আস-সাজদাহ","আল-আহযাব","সাবা","ফাতির","ইয়াসীন","আস-সাফফাত","সোয়াদ","আয-যুমার","গাফির","হা-মীম আস-সাজদাহ (ফুসসিলাত)","আশ-শূরা","আয-যুখরুফ","আদ-দুখান","আল-জাসিয়া","আল-আহকাফ","মুহাম্মাদ","আল-ফাতহ","আল-হুজুরাত","ক্বাফ","আয-যারিয়াত","আত-তূর","আন-নাজম","আল-ক্বামার","আর-রাহমান","আল-ওয়াকিয়া","আল-হাদীদ","আল-মুজাদালা","আল-হাশর","আল-মুমতাহিনা","আস-সফ","আল-জুমুআ","আল-মুনাফিকুন","আত-তাগাবুন","আত-তালাক","আত-তাহরীম","আল-মুলক","আল-কলম","আল-হাক্কাহ","আল-মাআরিজ","নূহ","আল-জ্বিন","আল-মুয্যাম্মিল","আল-মুদ্দাসসির","আল-কিয়ামাহ","আদ-দাহর (আল-ইনসান)","আল-মুরসালাত","আন-নাবা","আন-নাযিআত","আবাসা","আত-তাকভীর","আল-ইনফিতার","আল-মুতাফফিফীন","আল-ইনশিকাক","আল-বুরূজ","আত-তারিক","আল-আ'লা","আল-গাশিয়া","আল-বালাদ","আশ-শামস","আল-লাইল","আদ-দুহা","আশ-শারহ","আত-তীন","আল-আলাক","আল-ক্বদর","আল-বাইয়্যিনা","আয-যিলযাল","আল-আদিয়াত","আল-ক্বারিয়া","আত-তাকাসুর","আল-আসর","আল-হুমাযাহ","আল-ফীল","কুরাইশ","আল-মাউন","আল-কাওসার","আল-কাফিরুন","আন-নসর","আল-লাহাব","আল-ইখলাস","আল-ফালাক","আন-নাস"];




const reciters = [
  { id: 'ar.alafasy', name: 'Mishary Alafasy' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Hussari' },
  { id: 'ar.minshawi', name: 'Muhammad Minshawi' },
  { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shatri' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly' },
  { id: 'ar.ahmedajamy', name: 'Ahmed Al-Ajamy' },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub' }
];


// ---------- Social / share links ----------
// TODO(Imran): এই লিংকগুলো আপনার আসল ওয়েবসাইট, ফেসবুক পেজ এবং ইউটিউব চ্যানেলের
// ঠিকানা দিয়ে পরিবর্তন করে নিন।
const SOCIAL_LINKS = {
  website: 'https://rupshajf.vercel.app',
  facebook: 'https://facebook.com/rupshajonokollanfoundation',
  youtube: 'https://youtube.com/@rupshajonokollanfoundation'
};

// ---------- Prayer time calculation methods (Aladhan API) ----------
const PRAYER_METHODS = [
  { id: 1,  name: 'ইউনিভার্সিটি অব ইসলামিক সায়েন্সেস, করাচি' },
  { id: 3,  name: 'Muslim World League' },
  { id: 2,  name: 'ISNA (উত্তর আমেরিকা)' },
  { id: 4,  name: 'উম্মুল কুরা, মক্কা' },
  { id: 5,  name: 'মিশরীয় সাধারণ জরিপ কর্তৃপক্ষ' },
  { id: 8,  name: 'উপসাগরীয় অঞ্চল' },
  { id: 13, name: 'দিয়ানেত, তুরস্ক' },
  { id: 20, name: 'কেমেনাগ, ইন্দোনেশিয়া' }
];

// ---------- Simple built-in Islamic / Qur'anic term dictionary ----------
// A lightweight glossary so common words met while reading can be looked up
// instantly, fully offline (plain data, no network call needed).
const DICTIONARY_DATA = [
  { term: 'আল্লাহ', meaning: 'সৃষ্টিকর্তা, একমাত্র উপাস্য; ইসলামে ব্যবহৃত সর্বোচ্চ নাম।' },
  { term: 'আয়াত', meaning: 'কুরআনের একটি বাক্য বা নিদর্শন; কুরআনের ক্ষুদ্রতম অংশবিশেষ।' },
  { term: 'সূরা', meaning: 'কুরআনের একটি অধ্যায়; মোট ১১৪টি সূরা রয়েছে।' },
  { term: 'পারা (জুয)', meaning: 'গোটা কুরআনকে সমান ৩০ ভাগে ভাগ করা প্রতিটি অংশ।' },
  { term: 'রুকু', meaning: 'সূরার মধ্যে একটি ছোট অনুচ্ছেদ বা বিভাজন, তিলাওয়াতে বিরতির জন্য ব্যবহৃত।' },
  { term: 'তিলাওয়াত', meaning: 'কুরআন সুন্দর সুরে ও নিয়ম মেনে পাঠ করা।' },
  { term: 'তাজবীদ', meaning: 'কুরআন সঠিক উচ্চারণ ও নিয়মে পড়ার বিজ্ঞান।' },
  { term: 'তাফসীর', meaning: 'কুরআনের আয়াতের বিস্তারিত ব্যাখ্যা ও বিশ্লেষণ।' },
  { term: 'হাদীস', meaning: 'রাসূলুল্লাহ (সা.)-এর কথা, কাজ ও অনুমোদন সম্পর্কিত বর্ণনা।' },
  { term: 'সুন্নাহ', meaning: 'রাসূলুল্লাহ (সা.)-এর দেখানো পথ ও জীবনাদর্শ।' },
  { term: 'সালাত (নামাজ)', meaning: 'দৈনিক পাঁচ ওয়াক্ত ফরজ ইবাদত।' },
  { term: 'ফজর', meaning: 'ভোরবেলার প্রথম নামাজের ওয়াক্ত, সুবহে সাদিক থেকে সূর্যোদয় পর্যন্ত।' },
  { term: 'যোহর', meaning: 'দুপুরের নামাজের ওয়াক্ত, সূর্য হেলে যাওয়ার পর শুরু হয়।' },
  { term: 'আসর', meaning: 'বিকেলের নামাজের ওয়াক্ত।' },
  { term: 'মাগরিব', meaning: 'সূর্যাস্তের পরপরই আদায় করা নামাজের ওয়াক্ত।' },
  { term: 'ইশা', meaning: 'রাতের নামাজের ওয়াক্ত।' },
  { term: 'কিবলা', meaning: 'নামাজে মুখ করার নির্দিষ্ট দিক, কাবা শরীফের দিক।' },
  { term: 'হিজরত', meaning: 'রাসূলুল্লাহ (সা.)-এর মক্কা থেকে মদীনায় স্থানান্তর; ইসলামি বর্ষপঞ্জির সূচনা বিন্দু।' },
  { term: 'হিজরী সন', meaning: 'চন্দ্র মাস অনুসারে গণনাকৃত ইসলামি বর্ষপঞ্জি।' },
  { term: 'রমজান', meaning: 'ইসলামি বর্ষপঞ্জির নবম মাস, যে মাসে সিয়াম পালন করা হয় ও কুরআন নাজিল হয়েছিল।' },
  { term: 'সিয়াম (রোজা)', meaning: 'ভোর থেকে সূর্যাস্ত পর্যন্ত পানাহার ও যাবতীয় নিষিদ্ধ কাজ থেকে বিরত থাকা।' },
  { term: 'যাকাত', meaning: 'নির্দিষ্ট পরিমাণ সম্পদের ওপর ফরজ বার্ষিক দান।' },
  { term: 'হজ্জ', meaning: 'সামর্থ্যবানদের জন্য জীবনে একবার মক্কায় গিয়ে নির্দিষ্ট নিয়মে পালনীয় ইবাদত।' },
  { term: 'উমরাহ', meaning: 'নির্দিষ্ট সময় ছাড়াই যেকোনো সময় করা যায় এমন ছোট হজ্জ।' },
  { term: 'দুআ', meaning: 'আল্লাহর কাছে প্রার্থনা বা মিনতি।' },
  { term: 'জিকির', meaning: 'আল্লাহর নাম বা প্রশংসাসূচক বাক্য বারবার স্মরণ করা।' },
  { term: 'তাওবা', meaning: 'গুনাহ থেকে অনুতপ্ত হয়ে আল্লাহর কাছে ফিরে আসা।' },
  { term: 'ইস্তিগফার', meaning: 'আল্লাহর কাছে ক্ষমা প্রার্থনা করা।' },
  { term: 'তাওহীদ', meaning: 'আল্লাহর একত্ববাদে বিশ্বাস; ইসলামের মূল ভিত্তি।' },
  { term: 'শিরক', meaning: 'আল্লাহর সাথে অন্য কিছুকে শরিক করা; সবচেয়ে বড় গুনাহ।' },
  { term: 'ইমান', meaning: 'আল্লাহ, ফেরেশতা, কিতাব, রাসূল, আখিরাত ও তাকদীরে বিশ্বাস।' },
  { term: 'ইসলাম', meaning: 'আল্লাহর ইচ্ছার কাছে আত্মসমর্পণ; শান্তির ধর্ম।' },
  { term: 'নবী', meaning: 'আল্লাহর পক্ষ থেকে ওহী প্রাপ্ত ব্যক্তি, যাকে নতুন শরিয়ত দেওয়া হয়নি।' },
  { term: 'রাসূল', meaning: 'আল্লাহর পক্ষ থেকে নতুন শরিয়তসহ প্রেরিত বার্তাবাহক।' },
  { term: 'ওহী', meaning: 'আল্লাহর পক্ষ থেকে নবী-রাসূলদের কাছে প্রেরিত বার্তা বা নির্দেশনা।' },
  { term: 'ফেরেশতা', meaning: 'নূর দ্বারা সৃষ্ট আল্লাহর একনিষ্ঠ অনুগত সৃষ্টি।' },
  { term: 'জিন', meaning: 'আগুন দ্বারা সৃষ্ট প্রাণী, যাদেরও ইবাদতের নির্দেশ দেওয়া হয়েছে।' },
  { term: 'আখিরাত', meaning: 'মৃত্যুর পরের অনন্ত জীবন।' },
  { term: 'জান্নাত', meaning: 'পরকালে মুমিনদের জন্য প্রতিশ্রুত চিরস্থায়ী শান্তির স্থান।' },
  { term: 'জাহান্নাম', meaning: 'পরকালে অবাধ্যদের জন্য নির্ধারিত শাস্তির স্থান।' },
  { term: 'কিয়ামত', meaning: 'সৃষ্টিজগৎ ধ্বংস হয়ে পুনরুত্থানের দিন।' },
  { term: 'মিজান', meaning: 'কিয়ামতের দিন প্রত্যেকের কাজ ওজন করার দাঁড়িপাল্লা।' },
  { term: 'সিরাত', meaning: 'জাহান্নামের ওপর স্থাপিত পুল, যা পার হয়ে জান্নাতে যেতে হবে।' },
  { term: 'বিসমিল্লাহ', meaning: '"আল্লাহর নামে" — যেকোনো ভালো কাজ শুরুর আগে বলা বাক্য।' },
  { term: 'আলহামদুলিল্লাহ', meaning: '"সমস্ত প্রশংসা আল্লাহর জন্য" — কৃতজ্ঞতা প্রকাশক বাক্য।' },
  { term: 'সুবহানাল্লাহ', meaning: '"আল্লাহ পবিত্র" — আল্লাহর মহিমা প্রকাশক বাক্য।' },
  { term: 'আল্লাহু আকবার', meaning: '"আল্লাহ সবচেয়ে বড়" — তাকবীর হিসেবে ব্যবহৃত হয়।' },
  { term: 'ইনশাআল্লাহ', meaning: '"আল্লাহ চাইলে" — ভবিষ্যতের কোনো কাজের কথা বলার সময় ব্যবহৃত হয়।' },
  { term: 'মাশাআল্লাহ', meaning: '"আল্লাহ যা চেয়েছেন তাই হয়েছে" — প্রশংসা বা বিস্ময় প্রকাশে ব্যবহৃত হয়।' },
  { term: 'জাযাকাল্লাহ', meaning: '"আল্লাহ আপনাকে উত্তম প্রতিদান দিন" — কৃতজ্ঞতা প্রকাশক বাক্য।' },
  { term: 'উম্মাহ', meaning: 'বিশ্বের সকল মুসলমানের সমষ্টিগত জাতি বা সম্প্রদায়।' },
  { term: 'মসজিদ', meaning: 'মুসলমানদের নামাজ ও ইবাদতের জন্য নির্ধারিত স্থান।' },
  { term: 'ইমাম', meaning: 'যিনি জামাতে নামাজের নেতৃত্ব দেন।' },
  { term: 'খুতবা', meaning: 'জুমা বা ঈদের নামাজের আগে দেওয়া বক্তৃতা।' },
  { term: 'তারাবীহ', meaning: 'রমজান মাসে ইশার নামাজের পর জামাতে পড়া অতিরিক্ত নামাজ।' },
  { term: 'ইতিকাফ', meaning: 'বিশেষত রমজানের শেষ দশকে মসজিদে অবস্থান করে ইবাদতে মগ্ন থাকা।' },
  { term: 'সাদাকা', meaning: 'স্বেচ্ছায় দেওয়া দান, যা ফরজ নয়।' },
  { term: 'হালাল', meaning: 'শরিয়তে বৈধ বা অনুমোদিত।' },
  { term: 'হারাম', meaning: 'শরিয়তে নিষিদ্ধ বা অবৈধ।' }
];

// ---------- Simple UI translation dictionary ----------
// Elements tagged with data-i18n="<key>" get their text swapped when the
// language is changed from Settings. Covers the core navigation/menu/settings
// strings for a broad set of major world languages (kept intentionally
// smaller than the Qur'an-translation edition list below, since every string
// here is hand-translated rather than pulled from an API). Any UI language
// not listed here can be added later by copying one block and translating
// its values — the rendering code (js/menu.js) already loops generically
// over whatever languages exist in this object. Missing keys always fall
// back to English (see applyLanguage in js/menu.js).
const I18N = {
  bn: {
    app_name: 'কুরআন বাংলা',
    nav_home: 'হোম', nav_planner: 'প্ল্যানার', nav_topics: 'বিষয়ভিত্তিক', nav_library: 'লাইব্রেরি', nav_stats: 'পরিসংখ্যান',
    menu_goto_ayah: 'নির্দিষ্ট আয়াতে যান', menu_prayer_times: 'সালাতের সময়সূচি', menu_dictionary: 'অভিধান',
    menu_other_apps: 'আমাদের অন্যান্য অ্যাপস', menu_settings: 'সেটিংস', menu_translation_help: 'অনুবাদে সহায়তা করুন',
    menu_share: 'অ্যাপটি শেয়ার করুন', menu_help: 'সাহায্য ও সহযোগিতা', menu_feedback: 'ফীডব্যাক শেয়ার করুন',
    menu_search_ph: 'মেনুতে খুঁজুন...',
    settings_title: 'সেটিংস', settings_language: 'ভাষা', settings_theme: 'থিম', settings_theme_light: 'দিনের মোড',
    settings_theme_dark: 'রাতের মোড', settings_reciter: 'ডিফল্ট ক্বারী', settings_font: 'ফন্ট সাইজ',
    settings_prayer_method: 'নামাজের সময় হিসাবের পদ্ধতি', settings_prayer_notify: 'নামাজের সময় বিজ্ঞপ্তি',
    settings_translation: 'কুরআনের অনুবাদের ভাষা',
    prayer_title: 'সালাতের সময়সূচি', prayer_locating: 'অবস্থান শনাক্ত করা হচ্ছে...', prayer_next: 'পরবর্তী নামাজ',
    prayer_manual: 'ম্যানুয়ালি শহর লিখুন', prayer_manual_go: 'খুঁজুন',
    dict_title: 'অভিধান', dict_search_ph: 'শব্দ খুঁজুন...',
    help_title: 'সাহায্য ও সহযোগিতা',
    translation_picker_title: 'অনুবাদের ভাষা নির্বাচন করুন', lang_search_ph: 'ভাষা খুঁজুন...',
    theme_picker_title: 'থিম বাছাই করুন', settings_theme_pick: 'থিম বাছাই করুন',
    theme_emerald: 'পান্না', theme_emerald_desc: 'উষ্ণ পার্চমেন্ট, তিল ও সোনালি — মূল ডিজাইন',
    theme_night: 'রাত্রি', theme_night_desc: 'গাঢ় সবুজ পটভূমিতে নরম সোনালি — চোখের আরাম',
    theme_royal: 'রাজকীয়', theme_royal_desc: 'গাঢ় বেগুনি ও সোনালি, জমকালো গোলাকার নকশা',
    theme_desert: 'মরুভূমি', theme_desert_desc: 'উষ্ণ বালুরঙ ও পোড়ামাটি, ধারালো জ্যামিতিক কোণ',
    theme_ocean: 'সাগর', theme_ocean_desc: 'শান্ত নীল-সবুজ, নরম কাচের মতো গোলাকার নকশা',
    theme_amoled: 'মিডনাইট', theme_amoled_desc: 'নিখাদ কালো পটভূমি, উজ্জ্বল সোনালি হাইলাইট',
    theme_rose: 'গোলাপবাগ', theme_rose_desc: 'কোমল গোলাপি আভা, স্বপ্নিল গোলাকার নকশা'
  },
  en: {
    app_name: 'Quran Bangla',
    nav_home: 'Home', nav_planner: 'Planner', nav_topics: 'Topics', nav_library: 'Library', nav_stats: 'Stats',
    menu_goto_ayah: 'Go to a specific ayah', menu_prayer_times: 'Prayer times', menu_dictionary: 'Dictionary',
    menu_other_apps: 'Our other apps', menu_settings: 'Settings', menu_translation_help: 'Help with translation',
    menu_share: 'Share this app', menu_help: 'Help & support', menu_feedback: 'Share feedback',
    menu_search_ph: 'Search the menu...',
    settings_title: 'Settings', settings_language: 'Language', settings_theme: 'Theme', settings_theme_light: 'Light mode',
    settings_theme_dark: 'Dark mode', settings_reciter: 'Default reciter', settings_font: 'Font size',
    settings_prayer_method: 'Prayer time calculation method', settings_prayer_notify: 'Prayer time notifications',
    settings_translation: 'Quran translation language',
    prayer_title: 'Prayer Times', prayer_locating: 'Detecting your location...', prayer_next: 'Next prayer',
    prayer_manual: 'Enter city manually', prayer_manual_go: 'Search',
    dict_title: 'Dictionary', dict_search_ph: 'Search a word...',
    help_title: 'Help & Support',
    translation_picker_title: 'Select translation language', lang_search_ph: 'Search language...',
    theme_picker_title: 'Choose a theme', settings_theme_pick: 'Choose a theme',
    theme_emerald: 'Emerald', theme_emerald_desc: 'Warm parchment, teal & gold — the original design',
    theme_night: 'Night', theme_night_desc: 'Deep teal background with soft gold — easy on the eyes',
    theme_royal: 'Royal', theme_royal_desc: 'Deep purple & gold, plush rounded design',
    theme_desert: 'Desert', theme_desert_desc: 'Warm sand & terracotta, crisp geometric corners',
    theme_ocean: 'Ocean', theme_ocean_desc: 'Calm blue-teal, soft glassy rounded design',
    theme_amoled: 'Midnight', theme_amoled_desc: 'True black background with vivid gold highlights',
    theme_rose: 'Rose Garden', theme_rose_desc: 'Soft blush pink glow, dreamy rounded design'
  },
  ar: {
    app_name: 'القرآن الكريم',
    nav_home: 'الرئيسية', nav_planner: 'المخطط', nav_topics: 'المواضيع', nav_library: 'المكتبة', nav_stats: 'الإحصائيات',
    menu_goto_ayah: 'الذهاب إلى آية محددة', menu_prayer_times: 'مواقيت الصلاة', menu_dictionary: 'القاموس',
    menu_other_apps: 'تطبيقاتنا الأخرى', menu_settings: 'الإعدادات', menu_translation_help: 'المساعدة في الترجمة',
    menu_share: 'مشاركة التطبيق', menu_help: 'المساعدة والدعم', menu_feedback: 'إرسال ملاحظات',
    menu_search_ph: 'بحث في القائمة...',
    settings_title: 'الإعدادات', settings_language: 'اللغة', settings_theme: 'المظهر', settings_theme_light: 'الوضع النهاري',
    settings_theme_dark: 'الوضع الليلي', settings_reciter: 'القارئ الافتراضي', settings_font: 'حجم الخط',
    settings_prayer_method: 'طريقة حساب مواقيت الصلاة', settings_prayer_notify: 'إشعارات مواقيت الصلاة',
    settings_translation: 'لغة ترجمة القرآن',
    prayer_title: 'مواقيت الصلاة', prayer_locating: 'جارٍ تحديد موقعك...', prayer_next: 'الصلاة القادمة',
    prayer_manual: 'أدخل المدينة يدويًا', prayer_manual_go: 'بحث',
    dict_title: 'القاموس', dict_search_ph: 'ابحث عن كلمة...',
    help_title: 'المساعدة والدعم',
    translation_picker_title: 'اختر لغة الترجمة', lang_search_ph: 'ابحث عن لغة...'
  },
  ur: {
    app_name: 'قرآن مجید',
    nav_home: 'ہوم', nav_planner: 'پلانر', nav_topics: 'موضوعات', nav_library: 'لائبریری', nav_stats: 'اعداد و شمار',
    menu_goto_ayah: 'مخصوص آیت پر جائیں', menu_prayer_times: 'نماز کے اوقات', menu_dictionary: 'لغت',
    menu_other_apps: 'ہماری دیگر ایپس', menu_settings: 'ترتیبات', menu_translation_help: 'ترجمے میں مدد کریں',
    menu_share: 'ایپ شیئر کریں', menu_help: 'مدد و معاونت', menu_feedback: 'رائے بھیجیں',
    menu_search_ph: 'مینو میں تلاش کریں...',
    settings_title: 'ترتیبات', settings_language: 'زبان', settings_theme: 'تھیم', settings_theme_light: 'دن کا موڈ',
    settings_theme_dark: 'رات کا موڈ', settings_reciter: 'ڈیفالٹ قاری', settings_font: 'فونٹ سائز',
    settings_prayer_method: 'نماز کے اوقات کا طریقہ', settings_prayer_notify: 'نماز کے اوقات کی اطلاعات',
    settings_translation: 'قرآن ترجمہ کی زبان',
    prayer_title: 'نماز کے اوقات', prayer_locating: 'آپ کا مقام معلوم کیا جا رہا ہے...', prayer_next: 'اگلی نماز',
    prayer_manual: 'شہر خود درج کریں', prayer_manual_go: 'تلاش کریں',
    dict_title: 'لغت', dict_search_ph: 'لفظ تلاش کریں...',
    help_title: 'مدد و معاونت',
    translation_picker_title: 'ترجمہ کی زبان منتخب کریں', lang_search_ph: 'زبان تلاش کریں...'
  },
  hi: {
    app_name: 'क़ुरआन',
    nav_home: 'होम', nav_planner: 'प्लानर', nav_topics: 'विषय', nav_library: 'लाइब्रेरी', nav_stats: 'आँकड़े',
    menu_goto_ayah: 'किसी विशेष आयत पर जाएँ', menu_prayer_times: 'नमाज़ के समय', menu_dictionary: 'शब्दकोश',
    menu_other_apps: 'हमारे अन्य ऐप्स', menu_settings: 'सेटिंग्स', menu_translation_help: 'अनुवाद में मदद करें',
    menu_share: 'ऐप शेयर करें', menu_help: 'सहायता और समर्थन', menu_feedback: 'फ़ीडबैक भेजें',
    menu_search_ph: 'मेनू में खोजें...',
    settings_title: 'सेटिंग्स', settings_language: 'भाषा', settings_theme: 'थीम', settings_theme_light: 'दिन मोड',
    settings_theme_dark: 'रात मोड', settings_reciter: 'डिफ़ॉल्ट क़ारी', settings_font: 'फ़ॉन्ट आकार',
    settings_prayer_method: 'नमाज़ समय गणना विधि', settings_prayer_notify: 'नमाज़ समय सूचनाएं',
    settings_translation: 'क़ुरआन अनुवाद भाषा',
    prayer_title: 'नमाज़ के समय', prayer_locating: 'आपका स्थान पता लगाया जा रहा है...', prayer_next: 'अगली नमाज़',
    prayer_manual: 'शहर मैन्युअल रूप से लिखें', prayer_manual_go: 'खोजें',
    dict_title: 'शब्दकोश', dict_search_ph: 'शब्द खोजें...',
    help_title: 'सहायता और समर्थन',
    translation_picker_title: 'अनुवाद भाषा चुनें', lang_search_ph: 'भाषा खोजें...'
  },
  id: {
    app_name: 'Al-Quran',
    nav_home: 'Beranda', nav_planner: 'Perencana', nav_topics: 'Topik', nav_library: 'Perpustakaan', nav_stats: 'Statistik',
    menu_goto_ayah: 'Buka ayat tertentu', menu_prayer_times: 'Waktu salat', menu_dictionary: 'Kamus',
    menu_other_apps: 'Aplikasi kami lainnya', menu_settings: 'Pengaturan', menu_translation_help: 'Bantu menerjemahkan',
    menu_share: 'Bagikan aplikasi ini', menu_help: 'Bantuan & dukungan', menu_feedback: 'Kirim masukan',
    menu_search_ph: 'Cari di menu...',
    settings_title: 'Pengaturan', settings_language: 'Bahasa', settings_theme: 'Tema', settings_theme_light: 'Mode terang',
    settings_theme_dark: 'Mode gelap', settings_reciter: 'Qari default', settings_font: 'Ukuran font',
    settings_prayer_method: 'Metode perhitungan waktu salat', settings_prayer_notify: 'Notifikasi waktu salat',
    settings_translation: 'Bahasa terjemahan Al-Quran',
    prayer_title: 'Waktu Salat', prayer_locating: 'Mendeteksi lokasi Anda...', prayer_next: 'Salat berikutnya',
    prayer_manual: 'Masukkan kota secara manual', prayer_manual_go: 'Cari',
    dict_title: 'Kamus', dict_search_ph: 'Cari kata...',
    help_title: 'Bantuan & Dukungan',
    translation_picker_title: 'Pilih bahasa terjemahan', lang_search_ph: 'Cari bahasa...'
  },
  tr: {
    app_name: "Kur'an-ı Kerim",
    nav_home: 'Ana Sayfa', nav_planner: 'Planlayıcı', nav_topics: 'Konular', nav_library: 'Kitaplık', nav_stats: 'İstatistikler',
    menu_goto_ayah: 'Belirli bir ayete git', menu_prayer_times: 'Namaz vakitleri', menu_dictionary: 'Sözlük',
    menu_other_apps: 'Diğer uygulamalarımız', menu_settings: 'Ayarlar', menu_translation_help: 'Çeviriye yardım edin',
    menu_share: 'Uygulamayı paylaş', menu_help: 'Yardım ve destek', menu_feedback: 'Geri bildirim gönder',
    menu_search_ph: 'Menüde ara...',
    settings_title: 'Ayarlar', settings_language: 'Dil', settings_theme: 'Tema', settings_theme_light: 'Gündüz modu',
    settings_theme_dark: 'Gece modu', settings_reciter: 'Varsayılan kari', settings_font: 'Yazı boyutu',
    settings_prayer_method: 'Namaz vakti hesaplama yöntemi', settings_prayer_notify: 'Namaz vakti bildirimleri',
    settings_translation: "Kur'an çeviri dili",
    prayer_title: 'Namaz Vakitleri', prayer_locating: 'Konumunuz belirleniyor...', prayer_next: 'Sıradaki namaz',
    prayer_manual: 'Şehri manuel girin', prayer_manual_go: 'Ara',
    dict_title: 'Sözlük', dict_search_ph: 'Kelime ara...',
    help_title: 'Yardım ve Destek',
    translation_picker_title: 'Çeviri dilini seçin', lang_search_ph: 'Dil ara...'
  },
  fr: {
    app_name: 'Le Coran',
    nav_home: 'Accueil', nav_planner: 'Planificateur', nav_topics: 'Thèmes', nav_library: 'Bibliothèque', nav_stats: 'Statistiques',
    menu_goto_ayah: 'Aller à un verset précis', menu_prayer_times: 'Heures de prière', menu_dictionary: 'Dictionnaire',
    menu_other_apps: 'Nos autres applications', menu_settings: 'Paramètres', menu_translation_help: 'Aider à la traduction',
    menu_share: "Partager l'application", menu_help: 'Aide et support', menu_feedback: 'Envoyer un avis',
    menu_search_ph: 'Rechercher dans le menu...',
    settings_title: 'Paramètres', settings_language: 'Langue', settings_theme: 'Thème', settings_theme_light: 'Mode clair',
    settings_theme_dark: 'Mode sombre', settings_reciter: 'Récitateur par défaut', settings_font: 'Taille de police',
    settings_prayer_method: 'Méthode de calcul des heures de prière', settings_prayer_notify: 'Notifications des heures de prière',
    settings_translation: 'Langue de traduction du Coran',
    prayer_title: 'Heures de Prière', prayer_locating: 'Localisation en cours...', prayer_next: 'Prochaine prière',
    prayer_manual: 'Saisir la ville manuellement', prayer_manual_go: 'Rechercher',
    dict_title: 'Dictionnaire', dict_search_ph: 'Rechercher un mot...',
    help_title: 'Aide et Support',
    translation_picker_title: 'Choisir la langue de traduction', lang_search_ph: 'Rechercher une langue...'
  },
  es: {
    app_name: 'El Corán',
    nav_home: 'Inicio', nav_planner: 'Planificador', nav_topics: 'Temas', nav_library: 'Biblioteca', nav_stats: 'Estadísticas',
    menu_goto_ayah: 'Ir a una aleya específica', menu_prayer_times: 'Horarios de oración', menu_dictionary: 'Diccionario',
    menu_other_apps: 'Nuestras otras aplicaciones', menu_settings: 'Ajustes', menu_translation_help: 'Ayudar con la traducción',
    menu_share: 'Compartir la aplicación', menu_help: 'Ayuda y soporte', menu_feedback: 'Enviar comentarios',
    menu_search_ph: 'Buscar en el menú...',
    settings_title: 'Ajustes', settings_language: 'Idioma', settings_theme: 'Tema', settings_theme_light: 'Modo claro',
    settings_theme_dark: 'Modo oscuro', settings_reciter: 'Recitador predeterminado', settings_font: 'Tamaño de fuente',
    settings_prayer_method: 'Método de cálculo de horarios de oración', settings_prayer_notify: 'Notificaciones de horarios de oración',
    settings_translation: 'Idioma de traducción del Corán',
    prayer_title: 'Horarios de Oración', prayer_locating: 'Detectando tu ubicación...', prayer_next: 'Próxima oración',
    prayer_manual: 'Introducir ciudad manualmente', prayer_manual_go: 'Buscar',
    dict_title: 'Diccionario', dict_search_ph: 'Buscar una palabra...',
    help_title: 'Ayuda y Soporte',
    translation_picker_title: 'Elegir idioma de traducción', lang_search_ph: 'Buscar idioma...'
  },
  ru: {
    app_name: 'Коран',
    nav_home: 'Главная', nav_planner: 'Планировщик', nav_topics: 'Темы', nav_library: 'Библиотека', nav_stats: 'Статистика',
    menu_goto_ayah: 'Перейти к аяту', menu_prayer_times: 'Время намаза', menu_dictionary: 'Словарь',
    menu_other_apps: 'Другие наши приложения', menu_settings: 'Настройки', menu_translation_help: 'Помочь с переводом',
    menu_share: 'Поделиться приложением', menu_help: 'Помощь и поддержка', menu_feedback: 'Отправить отзыв',
    menu_search_ph: 'Поиск в меню...',
    settings_title: 'Настройки', settings_language: 'Язык', settings_theme: 'Тема', settings_theme_light: 'Дневной режим',
    settings_theme_dark: 'Ночной режим', settings_reciter: 'Чтец по умолчанию', settings_font: 'Размер шрифта',
    settings_prayer_method: 'Метод расчёта времени намаза', settings_prayer_notify: 'Уведомления о времени намаза',
    settings_translation: 'Язык перевода Корана',
    prayer_title: 'Время Намаза', prayer_locating: 'Определение местоположения...', prayer_next: 'Следующий намаз',
    prayer_manual: 'Ввести город вручную', prayer_manual_go: 'Найти',
    dict_title: 'Словарь', dict_search_ph: 'Поиск слова...',
    help_title: 'Помощь и Поддержка',
    translation_picker_title: 'Выберите язык перевода', lang_search_ph: 'Поиск языка...'
  },
  sw: {
    app_name: "Qur'ani Tukufu",
    nav_home: 'Nyumbani', nav_planner: 'Mpangaji', nav_topics: 'Mada', nav_library: 'Maktaba', nav_stats: 'Takwimu',
    menu_goto_ayah: 'Nenda kwenye aya maalum', menu_prayer_times: 'Nyakati za sala', menu_dictionary: 'Kamusi',
    menu_other_apps: 'Programu zetu nyingine', menu_settings: 'Mipangilio', menu_translation_help: 'Saidia kutafsiri',
    menu_share: 'Shiriki programu hii', menu_help: 'Msaada na usaidizi', menu_feedback: 'Tuma maoni',
    menu_search_ph: 'Tafuta kwenye menyu...',
    settings_title: 'Mipangilio', settings_language: 'Lugha', settings_theme: 'Mandhari', settings_theme_light: 'Hali ya mchana',
    settings_theme_dark: 'Hali ya usiku', settings_reciter: 'Msomaji chaguomsingi', settings_font: 'Ukubwa wa fonti',
    settings_prayer_method: 'Njia ya kuhesabu nyakati za sala', settings_prayer_notify: 'Arifa za nyakati za sala',
    settings_translation: "Lugha ya tafsiri ya Qur'ani",
    prayer_title: 'Nyakati za Sala', prayer_locating: 'Inatafuta eneo lako...', prayer_next: 'Sala inayofuata',
    prayer_manual: 'Andika jiji mwenyewe', prayer_manual_go: 'Tafuta',
    dict_title: 'Kamusi', dict_search_ph: 'Tafuta neno...',
    help_title: 'Msaada na Usaidizi',
    translation_picker_title: 'Chagua lugha ya tafsiri', lang_search_ph: 'Tafuta lugha...'
  },
  zh: {
    app_name: '古兰经',
    nav_home: '首页', nav_planner: '计划', nav_topics: '主题', nav_library: '资料库', nav_stats: '统计',
    menu_goto_ayah: '前往指定经文', menu_prayer_times: '礼拜时间', menu_dictionary: '词典',
    menu_other_apps: '我们的其他应用', menu_settings: '设置', menu_translation_help: '帮助翻译',
    menu_share: '分享此应用', menu_help: '帮助与支持', menu_feedback: '发送反馈',
    menu_search_ph: '搜索菜单...',
    settings_title: '设置', settings_language: '语言', settings_theme: '主题', settings_theme_light: '日间模式',
    settings_theme_dark: '夜间模式', settings_reciter: '默认诵读者', settings_font: '字体大小',
    settings_prayer_method: '礼拜时间计算方法', settings_prayer_notify: '礼拜时间通知',
    settings_translation: '古兰经翻译语言',
    prayer_title: '礼拜时间', prayer_locating: '正在定位...', prayer_next: '下一次礼拜',
    prayer_manual: '手动输入城市', prayer_manual_go: '搜索',
    dict_title: '词典', dict_search_ph: '搜索单词...',
    help_title: '帮助与支持',
    translation_picker_title: '选择翻译语言', lang_search_ph: '搜索语言...'
  },
  fa: {
    app_name: 'قرآن کریم',
    nav_home: 'خانه', nav_planner: 'برنامه‌ریز', nav_topics: 'موضوعات', nav_library: 'کتابخانه', nav_stats: 'آمار',
    menu_goto_ayah: 'رفتن به آیه‌ای خاص', menu_prayer_times: 'اوقات نماز', menu_dictionary: 'واژه‌نامه',
    menu_other_apps: 'برنامه‌های دیگر ما', menu_settings: 'تنظیمات', menu_translation_help: 'کمک به ترجمه',
    menu_share: 'اشتراک‌گذاری برنامه', menu_help: 'راهنما و پشتیبانی', menu_feedback: 'ارسال بازخورد',
    menu_search_ph: 'جستجو در منو...',
    settings_title: 'تنظیمات', settings_language: 'زبان', settings_theme: 'پوسته', settings_theme_light: 'حالت روز',
    settings_theme_dark: 'حالت شب', settings_reciter: 'قاری پیش‌فرض', settings_font: 'اندازه فونت',
    settings_prayer_method: 'روش محاسبه اوقات نماز', settings_prayer_notify: 'اعلان اوقات نماز',
    settings_translation: 'زبان ترجمه قرآن',
    prayer_title: 'اوقات نماز', prayer_locating: 'در حال یافتن موقعیت شما...', prayer_next: 'نماز بعدی',
    prayer_manual: 'وارد کردن شهر به‌صورت دستی', prayer_manual_go: 'جستجو',
    dict_title: 'واژه‌نامه', dict_search_ph: 'جستجوی واژه...',
    help_title: 'راهنما و پشتیبانی',
    translation_picker_title: 'زبان ترجمه را انتخاب کنید', lang_search_ph: 'جستجوی زبان...'
  },
  ms: {
    app_name: 'Al-Quran',
    nav_home: 'Utama', nav_planner: 'Perancang', nav_topics: 'Topik', nav_library: 'Perpustakaan', nav_stats: 'Statistik',
    menu_goto_ayah: 'Pergi ke ayat tertentu', menu_prayer_times: 'Waktu solat', menu_dictionary: 'Kamus',
    menu_other_apps: 'Aplikasi kami yang lain', menu_settings: 'Tetapan', menu_translation_help: 'Bantu menterjemah',
    menu_share: 'Kongsi aplikasi ini', menu_help: 'Bantuan & sokongan', menu_feedback: 'Hantar maklum balas',
    menu_search_ph: 'Cari dalam menu...',
    settings_title: 'Tetapan', settings_language: 'Bahasa', settings_theme: 'Tema', settings_theme_light: 'Mod terang',
    settings_theme_dark: 'Mod gelap', settings_reciter: 'Qari lalai', settings_font: 'Saiz fon',
    settings_prayer_method: 'Kaedah pengiraan waktu solat', settings_prayer_notify: 'Pemberitahuan waktu solat',
    settings_translation: 'Bahasa terjemahan Al-Quran',
    prayer_title: 'Waktu Solat', prayer_locating: 'Mengesan lokasi anda...', prayer_next: 'Solat seterusnya',
    prayer_manual: 'Masukkan bandar secara manual', prayer_manual_go: 'Cari',
    dict_title: 'Kamus', dict_search_ph: 'Cari perkataan...',
    help_title: 'Bantuan & Sokongan',
    translation_picker_title: 'Pilih bahasa terjemahan', lang_search_ph: 'Cari bahasa...'
  }
};

// Interface-language picker metadata: controls the order/labels shown in the
// "Language" picker in Settings. `dir` marks languages written right-to-left.
const UI_LANG_META = [
  { code: 'bn', label: 'বাংলা' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'zh', label: '中文' },
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
  { code: 'ms', label: 'Bahasa Melayu' }
];

// 2-letter language codes that are written right-to-left — used both for the
// interface language (UI_LANG_META above) and for whichever Qur'an
// translation edition the user picks (see loadTranslationEditions in
// js/reader.js), since a Sindhi or Pashto translation should render RTL too
// even though there's no full UI dictionary for it yet.
const RTL_LANG_CODES = ['ar','ur','fa','ps','he','sd','ckb','dv'];
