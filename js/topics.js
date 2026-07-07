// ---------- Topic-based verse browsing ----------
// This is a starter, hand-picked dataset (a handful of well-known references
// per topic) rather than a full topic-tagged index of all 6,236 ayahs —
// building/verifying a complete tagging set is a much bigger project on its
// own. Each topic can be expanded with more refs over time; the UI and data
// shape already support any number of entries per topic.
const TOPICS = [
  { id:'allah', icon:'🕋', label:'Allah', refs:[
    {s:2,a:255,note:'আয়াতুল কুরসী'}, {s:112,a:1,note:'আল-ইখলাস'}, {s:59,a:22,note:'সবচেয়ে সুন্দর নামসমূহ'}, {s:2,a:186,note:'নিকটবর্তী'}
  ]},
  { id:'aqidah', icon:'✨', label:"Aqidah (Belief)", refs:[
    {s:2,a:1,note:'গায়েবের প্রতি বিশ্বাস'}, {s:4,a:136,note:'ঈমানের রুকনসমূহ'}, {s:112,a:1,note:'তাওহীদ'}
  ]},
  { id:'ibadah', icon:'🤲', label:'Ibadah (worship of Allah)', refs:[
    {s:51,a:56,note:'সৃষ্টির উদ্দেশ্য'}, {s:2,a:43,note:'সালাত ও যাকাত'}, {s:2,a:183,note:'সিয়াম'}
  ]},
  { id:'akhirah', icon:'🌌', label:'Akhirah (Afterlife)', refs:[
    {s:99,a:7,note:'অণু পরিমাণ কর্মও দেখা যাবে'}, {s:75,a:1,note:'কিয়ামতের কসম'}, {s:21,a:47,note:'ন্যায়বিচারের মানদণ্ড'}
  ]},
  { id:'etiquette', icon:'🕰️', label:'Etiquette and manners', refs:[
    {s:49,a:11,note:'উপহাস না করা'}, {s:17,a:23,note:'পিতামাতার সাথে সদাচরণ'}, {s:31,a:19,note:'নম্র কণ্ঠস্বর'}
  ]},
  { id:'history', icon:'⏳', label:'History & Biographies', refs:[
    {s:12,a:3,note:'সূরা ইউসুফ'}, {s:18,a:9,note:'আসহাবে কাহফ'}, {s:28,a:3,note:'মূসা (আঃ)-এর কাহিনী'}
  ]},
  { id:'muamalat', icon:'⚖️', label:"Mu'amalat (dealings)", refs:[
    {s:2,a:282,note:'ঋণ লিখে রাখা'}, {s:2,a:275,note:'সুদ হারাম'}, {s:4,a:29,note:'পারস্পরিক সম্মতিতে ব্যবসা'}
  ]},
  { id:'family', icon:'👪', label:'Family', refs:[
    {s:30,a:21,note:'দাম্পত্য জীবনে প্রশান্তি'}, {s:4,a:1,note:'একই সত্তা থেকে সৃষ্টি'}, {s:17,a:23,note:'পিতামাতার হক'}
  ]},
  { id:'politics', icon:'🚩', label:'Politics', refs:[
    {s:4,a:58,note:'আমানত ও ন্যায়বিচার'}, {s:4,a:59,note:'কর্তৃপক্ষের আনুগত্য'}, {s:42,a:38,note:'পরামর্শ (শূরা)'}
  ]},
  { id:'emotions', icon:'💗', label:'Emotions', refs:[
    {s:94,a:5,note:'কষ্টের সাথে স্বস্তি'}, {s:13,a:28,note:'আল্লাহর স্মরণে প্রশান্তি'}, {s:2,a:286,note:'সাধ্যের অতিরিক্ত বোঝা নয়'}
  ]}
];

function renderTopicsList(){
  const listEl = document.getElementById('topicsListContainer');
  const detailEl = document.getElementById('topicDetailContainer');
  detailEl.style.display = 'none';
  listEl.style.display = 'block';
  listEl.innerHTML = '';
  TOPICS.forEach(t => {
    const item = document.createElement('div');
    item.className = 'list-item topic-item';
    item.innerHTML = `<div class="badge-num topic-ic">${t.icon}</div>
      <div class="li-text"><div class="li-title">${t.label}</div></div>`;
    item.onclick = () => openTopic(t.id);
    listEl.appendChild(item);
  });
}

function openTopic(id){
  const topic = TOPICS.find(t => t.id === id);
  if(!topic) return;
  const listEl = document.getElementById('topicsListContainer');
  const detailEl = document.getElementById('topicDetailContainer');
  const body = document.getElementById('topicDetailBody');
  listEl.style.display = 'none';
  detailEl.style.display = 'block';
  body.innerHTML = `<h2 class="topic-detail-title">${topic.icon} ${topic.label}</h2>`;
  topic.refs.forEach(r => {
    const surahName = surahNamesBn[r.s-1] || ('সূরা ' + r.s);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="badge-num">${toBn(r.s)}:${toBn(r.a)}</div>
      <div class="li-text">
        <div class="li-title">${surahName} — আয়াত ${toBn(r.a)}</div>
        <div class="li-sub">${r.note}</div>
      </div>`;
    item.onclick = () => openSurahAndScrollTo(r.s, r.a);
    body.appendChild(item);
  });
}

function initTopics(){
  document.getElementById('topicBackBtn').onclick = () => {
    document.getElementById('topicDetailContainer').style.display = 'none';
    document.getElementById('topicsListContainer').style.display = 'block';
  };
}
