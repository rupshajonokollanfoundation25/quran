// ---------- Qibla direction (compass bearing to the Kaaba) ----------
const KAABA_LAT = 21.4225241;
const KAABA_LNG = 39.8261818;

function computeQiblaBearing(lat, lon){
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const phi1 = toRad(lat), phi2 = toRad(KAABA_LAT);
  const dLambda = toRad(KAABA_LNG - lon);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

let qiblaBearing = null;
let qiblaOrientationHandler = null;

function initQiblaModal(){
  wireModalBackdrop('qiblaModal');
  document.getElementById('qiblaClose').onclick = () => { closeModal('qiblaModal'); stopQiblaCompass(); };
}

function openQiblaModal(){
  openModal('qiblaModal');
  const body = document.getElementById('qiblaBody');
  if(state.prayerLocation){
    setupQibla(state.prayerLocation);
    return;
  }
  if(!('geolocation' in navigator)){
    body.innerHTML = `<div class="prayer-error">এই ব্রাউজারে অবস্থান শনাক্তকরণ সমর্থিত নয়।</div>`;
    return;
  }
  body.innerHTML = `<div class="prayer-status"><i class="fa-solid fa-location-crosshairs"></i> অবস্থান শনাক্ত করা হচ্ছে...</div>`;
  navigator.geolocation.getCurrentPosition(
    (pos) => setupQibla({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => {
      body.innerHTML = `<div class="prayer-error">অবস্থানের অনুমতি পাওয়া যায়নি। ব্রাউজারের সেটিংস থেকে লোকেশন অনুমতি দিন, অথবা আগে "সালাতের সময়সূচি"-তে শহর সেট করুন।</div>`;
    },
    { timeout: 10000 }
  );
}

function setupQibla(loc){
  qiblaBearing = computeQiblaBearing(loc.lat, loc.lon);
  markQiblaUsed();
  const body = document.getElementById('qiblaBody');
  body.innerHTML = `
    <div class="qibla-wrap">
      <div class="qibla-compass" id="qiblaCompass">
        <div class="qibla-ring">
          <span class="qibla-tick qibla-tick-n">N</span>
          <span class="qibla-tick qibla-tick-e">E</span>
          <span class="qibla-tick qibla-tick-s">S</span>
          <span class="qibla-tick qibla-tick-w">W</span>
        </div>
        <div class="qibla-needle" id="qiblaNeedle"><i class="fa-solid fa-kaaba"></i></div>
      </div>
      <div class="qibla-deg">কিবলা: ${toBn(Math.round(qiblaBearing))}° (উত্তর থেকে)</div>
      <div class="qibla-hint" id="qiblaHint">ফোনটি সমতলভাবে ধরে ঘুরুন — উপরের কাবা আইকনটি যেদিকে স্থির থাকবে, সেদিকেই কিবলা।</div>
      <button class="settings-btn" id="qiblaEnableCompassBtn"><i class="fa-solid fa-compass"></i> কম্পাস চালু করুন</button>
    </div>`;
  const btn = document.getElementById('qiblaEnableCompassBtn');
  if(btn) btn.onclick = enableQiblaCompass;
}

function enableQiblaCompass(){
  if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
    DeviceOrientationEvent.requestPermission().then(res => {
      if(res === 'granted') startQiblaCompass();
      else showToast('কম্পাস ব্যবহারের অনুমতি পাওয়া যায়নি');
    }).catch(() => showToast('এই ডিভাইসে কম্পাস চালু করা যায়নি'));
  } else if('DeviceOrientationEvent' in window){
    startQiblaCompass();
  } else {
    showToast('এই ডিভাইস/ব্রাউজারে কম্পাস সমর্থিত নয়');
  }
}

function startQiblaCompass(){
  if(qiblaOrientationHandler) return;
  const btn = document.getElementById('qiblaEnableCompassBtn');
  if(btn) btn.style.display = 'none';
  qiblaOrientationHandler = (e) => {
    let heading;
    if(typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
    else if(e.alpha != null) heading = 360 - e.alpha;
    else return;
    const needle = document.getElementById('qiblaNeedle');
    if(needle && qiblaBearing != null){
      needle.style.transform = `rotate(${(qiblaBearing - heading + 360) % 360}deg)`;
    }
    const hint = document.getElementById('qiblaHint');
    if(hint) hint.textContent = 'কাবা আইকনটি যেদিকে নির্দেশ করছে, সেদিকেই কিবলা।';
  };
  window.addEventListener('deviceorientationabsolute', qiblaOrientationHandler, true);
  window.addEventListener('deviceorientation', qiblaOrientationHandler, true);
}

function stopQiblaCompass(){
  if(!qiblaOrientationHandler) return;
  window.removeEventListener('deviceorientationabsolute', qiblaOrientationHandler, true);
  window.removeEventListener('deviceorientation', qiblaOrientationHandler, true);
  qiblaOrientationHandler = null;
}
