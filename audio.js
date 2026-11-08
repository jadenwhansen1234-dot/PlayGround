// Lightweight synthesized soundscape for Shattered Realms. No downloads or large assets.
export function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return { start() {}, cue() {}, setRealm() {}, setMuted() {} };

  const context = new AudioContext();
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  master.gain.value = 0.34;
  limiter.threshold.value = -18;
  limiter.knee.value = 16;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.008;
  limiter.release.value = 0.22;
  master.connect(limiter);
  limiter.connect(context.destination);

  let started = false;
  let muted = false;
  let droneNodes = [];
  const moods = {
    city: [110, 164.81, 220], forest: [98, 146.83, 196], shrine: [130.81, 196, 261.63],
    inferno: [82.41, 123.47, 164.81], ice: [138.59, 207.65, 277.18], void: [73.42, 110, 155.56]
  };

  function start() {
    if (started) { if (context.state === 'suspended') context.resume(); return; }
    started = true;
    if (context.state === 'suspended') context.resume();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 540;
    filter.Q.value = 0.55;
    const pad = context.createGain();
    pad.gain.value = 0;
    filter.connect(pad);
    pad.connect(master);
    const now = context.currentTime;
    pad.gain.setTargetAtTime(0.095, now + 0.2, 2.4);
    droneNodes = [filter, pad];
    setRealm('city', true);
  }

  function setRealm(realm, immediate = false) {
    if (!started) return;
    const notes = moods[realm] || moods.city;
    const now = context.currentTime;
    const fade = immediate ? 0.04 : 1.8;
    droneNodes.slice(2).forEach(node => { try { node.stop(now + fade * 4); } catch {} });
    droneNodes = droneNodes.slice(0, 2);
    const filter = droneNodes[0];
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setTargetAtTime(realm === 'ice' ? 760 : realm === 'inferno' ? 390 : 540, now, fade);
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 2 ? 3 : -2;
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start(now);
      gain.gain.setTargetAtTime(index === 0 ? 0.22 : 0.075, now, fade);
      droneNodes.push(oscillator, gain);
    });
  }

  function tone(frequency, duration, type = 'sine', volume = 0.12, delay = 0, endFrequency = null) {
    if (!started || muted) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.025, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  function cue(name) {
    if (!started || muted) return;
    switch (name) {
      case 'attack': tone(360, 0.09, 'triangle', 0.045, 0, 190); break;
      case 'hit': tone(115, 0.16, 'sawtooth', 0.09, 0, 54); tone(520, 0.1, 'triangle', 0.035, 0.015, 180); break;
      case 'dodge': tone(620, 0.22, 'sine', 0.065, 0, 220); break;
      case 'rift': tone(150, 0.48, 'sawtooth', 0.08, 0, 620); tone(420, 0.34, 'sine', 0.055, 0.04, 90); break;
      case 'pickup': tone(523.25, 0.17, 'sine', 0.07); tone(783.99, 0.25, 'sine', 0.06, 0.11); break;
      case 'choice': tone(392, 0.2, 'triangle', 0.07); tone(587.33, 0.32, 'sine', 0.06, 0.12); break;
      case 'boss': tone(92.5, 0.8, 'sawtooth', 0.11, 0, 48); tone(138.59, 0.7, 'sine', 0.08, 0.18, 55); break;
      case 'awakening': [261.63, 392, 523.25, 783.99].forEach((n, i) => tone(n, 0.7, 'sine', 0.055, i * 0.1)); break;
      case 'realm': tone(440, 0.36, 'sine', 0.055, 0, 659.25); break;
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    master.gain.setTargetAtTime(muted ? 0 : 0.34, context.currentTime, 0.08);
  }

  return { start, cue, setRealm, setMuted };
}
