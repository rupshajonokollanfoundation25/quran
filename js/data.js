// ---------- Static data & constants ----------
// NOTE: this file is loaded both as a normal <script> in index.html AND via
// importScripts() inside sw.js, so it must stay free of any `window`/`document`
// references — only plain constants and pure helper functions belong here.
const API = 'https://api.alquran.cloud/v1';
const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio/128';
const PRAYER_API = 'https://api.aladhan.com/v1';

// Bump the version suffix any time app-shell files change so the service
// worker picks up a fresh copy instead of serving a stale cached version.
const SW_VERSION = 'v14';
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
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)' },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Hussari' },
  { id: 'ar.minshawi', name: 'Muhammad Minshawi' },
  { id: 'ar.abdurrahmaansudais', name: 'Abdur Rahman As-Sudais' },

  { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shatri' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly' },
  { id: 'ar.saoodshuraym', name: 'Saud Ash-Shuraim' },
  { id: 'ar.ahmedajamy', name: 'Ahmed Al-Ajamy' },
  { id: 'ar.yasseraldossari', name: 'Yasser Al-Dosari' },
  { id: 'ar.nasseralqatami', name: 'Nasser Al-Qatami' },
  { id: 'ar.faresabad', name: 'Fares Abbad' },
  { id: 'ar.khaleelhusary', name: 'Khalil Al-Hussary' },
  { id: 'ar.ibrahimakhbar', name: 'Ibrahim Al-Akhdar' },
  { id: 'ar.abdullahbasfar', name: 'Abdullah Basfar' },
  { id: 'ar.hanirifai', name: 'Hani Ar-Rifai' },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub' },
  { id: 'ar.salahbukhatir', name: 'Salah Bukhatir' },
  { id: 'ar.alghamdi', name: 'Saad Al-Ghamdi' },
  { id: 'ar.tablawi', name: 'Mohamed Al-Tablawi' }
];

// ---------- Social / share links ----------
// TODO(Imran): এই লিংকগুলো আপনার আসল ওয়েবসাইট, ফেসবুক পেজ এবং ইউটিউব চ্যানেলের
// ঠিকানা দিয়ে পরিবর্তন করে নিন।
const SOCIAL_LINKS = {
  website: 'https://example.com',
  facebook: 'https://facebook.com/yourpage',
  youtube: 'https://youtube.com/@yourchannel'
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

// ---------- Simple UI translation dictionary (বাংলা / English) ----------
// Elements tagged with data-i18n="<key>" get their text swapped when the
// language is changed from Settings. Kept intentionally small — just the
// core navigation/menu strings — rather than a full app-wide translation.
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
    prayer_title: 'সালাতের সময়সূচি', prayer_locating: 'অবস্থান শনাক্ত করা হচ্ছে...', prayer_next: 'পরবর্তী নামাজ',
    prayer_manual: 'ম্যানুয়ালি শহর লিখুন', prayer_manual_go: 'খুঁজুন',
    dict_title: 'অভিধান', dict_search_ph: 'শব্দ খুঁজুন...',
    help_title: 'সাহায্য ও সহযোগিতা'
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
    prayer_title: 'Prayer Times', prayer_locating: 'Detecting your location...', prayer_next: 'Next prayer',
    prayer_manual: 'Enter city manually', prayer_manual_go: 'Search',
    dict_title: 'Dictionary', dict_search_ph: 'Search a word...',
    help_title: 'Help & Support'
  }
};