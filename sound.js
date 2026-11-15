export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.muted;
  }

  playTone(freq, endFreq, duration, type = 'sine', volume = 0.18) {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playJump() {
    this.playTone(220, 580, 0.22, 'triangle', 0.22);
  }

  playLaneSwitch() {
    this.playTone(300, 420, 0.08, 'sine', 0.1);
  }

  playRaspberry() {
    this.playTone(523.25, 659.25, 0.12, 'sine', 0.2);
    setTimeout(() => this.playTone(783.99, 1046.5, 0.22, 'triangle', 0.22), 90);
  }

  playHit() {
    this.playTone(150, 42, 0.35, 'sawtooth', 0.28);
  }

  playLava() {
    this.playTone(110, 35, 0.5, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(90, 30, 0.4, 'square', 0.15), 80);
  }

  playRevive() {
    const notes = [330, 440, 554.37, 659.25, 880];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, n * 1.15, 0.22, 'triangle', 0.2), i * 70);
    });
  }

  startBGM() {
    if (this.muted || this.bgmInterval) return;
    this.init();
    const bassNotes = [110, 110, 130.81, 98, 110, 146.83, 130.81, 98];
    let step = 0;
    this.bgmInterval = setInterval(() => {
      if (this.muted) return;
      const note = bassNotes[step % bassNotes.length];
      this.playTone(note, note * 0.98, 0.38, 'sine', 0.06);
      step++;
    }, 420);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}
