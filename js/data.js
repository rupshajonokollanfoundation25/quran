// ---------- Static data & constants ----------
// NOTE: this file is loaded both as a normal <script> in index.html AND via
// importScripts() inside sw.js, so it must stay free of any `window`/`document`
// references — only plain constants and pure helper functions belong here.
const API = 'https://api.alquran.cloud/v1';
const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio/128';

// Bump the version suffix any time app-shell files change so the service
// worker picks up a fresh copy instead of serving a stale cached version.
const SW_VERSION = 'v2';
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
  './js/player.js',
  './js/reader.js',
  './js/sidebar.js',
  './js/search.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
function toBn(n){ return String(n).split('').map(d => /[0-9]/.test(d) ? bnDigits[+d] : d).join(''); }

const surahNamesBn = ["আল-ফাতিহা","আল-বাকারা","আলে ইমরান","আন-নিসা","আল-মায়িদা","আল-আনআম","আল-আরাফ","আল-আনফাল","আত-তাওবা","ইউনুস","হুদ","ইউসুফ","আর-রাদ","ইব্রাহীম","আল-হিজর","আন-নাহল","বনী ইসরাঈল (আল-ইসরা)","আল-কাহফ","মারইয়াম","ত্বা-হা","আল-আম্বিয়া","আল-হাজ্জ","আল-মুমিনূন","আন-নূর","আল-ফুরকান","আশ-শুআরা","আন-নামল","আল-কাসাস","আল-আনকাবূত","আর-রূম","লুকমান","আস-সাজদাহ","আল-আহযাব","সাবা","ফাতির","ইয়াসীন","আস-সাফফাত","সোয়াদ","আয-যুমার","গাফির","হা-মীম আস-সাজদাহ (ফুসসিলাত)","আশ-শূরা","আয-যুখরুফ","আদ-দুখান","আল-জাসিয়া","আল-আহকাফ","মুহাম্মাদ","আল-ফাতহ","আল-হুজুরাত","ক্বাফ","আয-যারিয়াত","আত-তূর","আন-নাজম","আল-ক্বামার","আর-রাহমান","আল-ওয়াকিয়া","আল-হাদীদ","আল-মুজাদালা","আল-হাশর","আল-মুমতাহিনা","আস-সফ","আল-জুমুআ","আল-মুনাফিকুন","আত-তাগাবুন","আত-তালাক","আত-তাহরীম","আল-মুলক","আল-কলম","আল-হাক্কাহ","আল-মাআরিজ","নূহ","আল-জ্বিন","আল-মুয্যাম্মিল","আল-মুদ্দাসসির","আল-কিয়ামাহ","আদ-দাহর (আল-ইনসান)","আল-মুরসালাত","আন-নাবা","আন-নাযিআত","আবাসা","আত-তাকভীর","আল-ইনফিতার","আল-মুতাফফিফীন","আল-ইনশিকাক","আল-বুরূজ","আত-তারিক","আল-আ'লা","আল-গাশিয়া","আল-বালাদ","আশ-শামস","আল-লাইল","আদ-দুহা","আশ-শারহ","আত-তীন","আল-আলাক","আল-ক্বদর","আল-বাইয়্যিনা","আয-যিলযাল","আল-আদিয়াত","আল-ক্বারিয়া","আত-তাকাসুর","আল-আসর","আল-হুমাযাহ","আল-ফীল","কুরাইশ","আল-মাউন","আল-কাওসার","আল-কাফিরুন","আন-নসর","আল-লাহাব","আল-ইখলাস","আল-ফালাক","আন-নাস"];

const reciters = [
  { id:'ar.alafasy', name:'মিশারী আলাফাসি' },
  { id:'ar.abdulbasitmurattal', name:'আব্দুল বাসিত' },
  { id:'ar.husary', name:'মাহমুদ খলিল আল-হুসারি' },
  { id:'ar.minshawi', name:'মুহাম্মাদ মিনশাবি' },
  { id:'ar.abdurrahmaansudais', name:'আব্দুর রহমান আস-সুদাইস' }
];
