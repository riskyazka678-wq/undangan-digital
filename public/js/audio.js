let audioCtx = null, isPlayingBgm = false, bgmInterval = null, customAudioObj = null, currentTheme = 'wedding';

const THEME_MELODIES = {
  wedding: { tempo: 650, notes: [261.63, 329.63, 392.00, 523.25, 220.00, 261.63, 329.63, 440.00, 174.61, 220.00, 261.63, 349.23, 196.00, 246.94, 293.66, 392.00] },
  birthday: { tempo: 420, notes: [261.63, 261.63, 293.66, 261.63, 349.23, 329.63, 261.63, 261.63, 293.66, 261.63, 392.00, 349.23] },
  khitan: { tempo: 600, notes: [293.66, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63] },
  party: { tempo: 350, notes: [329.63, 392.00, 493.88, 523.25, 493.88, 392.00, 329.63, 392.00] }
};

function initAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSfx(type = 'click') {
  try {
    initAudioContext();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
    if (type === 'open') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.4);
      gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'coin') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(987.77, now); osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.35);
    } else {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 0.08);
    }
  } catch (_) {}
}

function playPianoNote(freq, durationSec) {
  if (!audioCtx || !isPlayingBgm) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
  osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.001, now); gain.gain.linearRampToValueAtTime(0.12, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + durationSec);
}

function startBacksound(theme) {
  currentTheme = theme || 'wedding'; stopBacksound(); isPlayingBgm = true;
  if (customAudioObj) { customAudioObj.loop = true; customAudioObj.play().catch(() => {}); return; }
  initAudioContext();
  const track = THEME_MELODIES[currentTheme] || THEME_MELODIES.wedding;
  let step = 0;
  playPianoNote(track.notes[0], 1.4);
  bgmInterval = setInterval(() => {
    if (!isPlayingBgm) return;
    step = (step + 1) % track.notes.length;
    playPianoNote(track.notes[step], 1.4);
  }, track.tempo);
}

function stopBacksound() {
  isPlayingBgm = false;
  if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
  if (customAudioObj) customAudioObj.pause();
}

function toggleAudio() {
  const btn = document.getElementById('btnAudioToggle');
  if (isPlayingBgm) { stopBacksound(); btn.innerHTML = '<i data-lucide="volume-x"></i>'; }
  else { startBacksound(currentTheme); btn.innerHTML = '<i data-lucide="volume-2"></i>'; }
  lucide.createIcons();
}

function handleCustomAudio(event) {
  const file = event.target.files[0];
  if (file) { customAudioObj = new Audio(URL.createObjectURL(file)); showToast('Musik MP3 berhasil dimuat!'); }
}
