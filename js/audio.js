window.PA = window.PA || {};

PA.Audio = (function () {
  let ctx = null;
  let noiseBuffer = null;
  let murmurNodes = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function initAudio() {
    ensureCtx();
  }

  function getNoiseBuffer() {
    if (!ctx) return null;
    if (noiseBuffer) return noiseBuffer;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
    return noiseBuffer;
  }

  function playGoalHorn() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.35);
    osc.frequency.linearRampToValueAtTime(330, now + 0.6);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  function playWhistle() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function startCrowdMurmur() {
    const c = ensureCtx();
    if (!c || murmurNodes) return;
    const buf = getNoiseBuffer();
    if (!buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.6;
    const gain = c.createGain();
    gain.gain.value = 0.05;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    murmurNodes = { src, gain };
  }

  function stopCrowdMurmur() {
    if (!murmurNodes || !ctx) return;
    const now = ctx.currentTime;
    murmurNodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    murmurNodes.src.stop(now + 0.65);
    murmurNodes = null;
  }

  function playNoiseBurst({ duration = 0.4, filterFreqStart = 800, filterFreqEnd = 1500, gainPeak = 0.3 } = {}) {
    const c = ensureCtx();
    if (!c) return;
    const buf = getNoiseBuffer();
    if (!buf) return;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreqStart, now);
    filter.frequency.linearRampToValueAtTime(filterFreqEnd, now + duration);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  function playCrowdCheer() {
    playNoiseBurst({ duration: 0.9, filterFreqStart: 600, filterFreqEnd: 2200, gainPeak: 0.28 });
  }

  function playCrowdGroan() {
    playNoiseBurst({ duration: 0.7, filterFreqStart: 500, filterFreqEnd: 200, gainPeak: 0.22 });
  }

  function playSaveThud() {
    const c = ensureCtx();
    if (!c) return;
    playNoiseBurst({ duration: 0.25, filterFreqStart: 300, filterFreqEnd: 150, gainPeak: 0.3 });
  }

  function playMissWhoosh() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // --- Beşiktaş special celebration: mp3 first, TTS fallback, silent-safe ---
  function speakBesiktas() {
    if (!('speechSynthesis' in window)) return;
    try {
      const utter = new SpeechSynthesisUtterance('Babanız Beşiktaş ulan!');
      utter.lang = 'tr-TR';
      utter.rate = 1.3;
      utter.pitch = 1.6;
      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('tr'));
      if (trVoice) utter.voice = trVoice;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // never let TTS break the game
    }
  }

  function playBesiktasCelebration() {
    let fallbackUsed = false;
    const fallback = () => {
      if (fallbackUsed) return;
      fallbackUsed = true;
      speakBesiktas();
    };
    try {
      const audioEl = new Audio('babaniz-besiktas.mp3');
      audioEl.addEventListener('error', fallback);
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(fallback);
      }
    } catch (e) {
      fallback();
    }
  }

  return {
    initAudio, playGoalHorn, playWhistle, startCrowdMurmur, stopCrowdMurmur,
    playCrowdCheer, playCrowdGroan, playSaveThud, playMissWhoosh,
    playBesiktasCelebration
  };
})();
