/* eslint-disable @typescript-eslint/no-explicit-any */
interface HarkOptions {
  smoothing?: number;
  interval?: number;
  threshold?: number;
  play?: boolean;
  history?: number;
}

export class Hark {
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private sourceNode: MediaStreamAudioSourceNode;
  private fftBins: Float32Array;
  private speaking: boolean = false;
  private speakingHistory: number[] = [];
  private threshold: number;
  private interval: number;
  private smoothing: number;
  private history: number;
  private running: boolean = true;
  private events: { [event: string]: (...args: any[]) => void } = {};

  constructor(stream: MediaStream, options: HarkOptions = {}) {
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error("AudioContext is not supported in this browser.");
    }

    this.smoothing = options.smoothing || 0.1;
    this.interval = options.interval || 50;
    this.threshold = options.threshold || -50;
    this.history = options.history || 10;
    const play = options.play;

    this.audioContext = new ((window as any).AudioContext ||
      (window as any).webkitAudioContext)();

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 0;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = this.smoothing;
    this.fftBins = new Float32Array(this.analyser.fftSize);

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.sourceNode.connect(this.analyser);
    if (play) {
      this.analyser.connect(this.audioContext.destination);
    }

    for (let i = 0; i < this.history; i++) {
      this.speakingHistory.push(0);
    }

    this.looper();
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    this.events[event] = callback;
  }

  private emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event](...args);
    }
  }

  public setThreshold(t: number): void {
    this.threshold = t;
  }

  public setInterval(i: number): void {
    this.interval = i;
  }

  public stop(): void {
    this.running = false;
    this.emit("volume_change", -100, this.threshold);
    if (this.speaking) {
      this.speaking = false;
      this.emit("stopped_speaking");
    }
  }

  private looper(): void {
    setTimeout(() => {
      if (!this.running) {
        return;
      }

      const currentVolume = this.getMaxVolume();

      this.emit("volume_change", currentVolume, this.threshold);

      let history = 0;
      if (currentVolume > this.threshold && !this.speaking) {
        for (
          let i = this.speakingHistory.length - 3;
          i < this.speakingHistory.length;
          i++
        ) {
          history += this.speakingHistory[i];
        }
        if (history >= 2) {
          this.speaking = true;
          this.emit("speaking");
        }
      } else if (currentVolume < this.threshold && this.speaking) {
        for (let j = 0; j < this.speakingHistory.length; j++) {
          history += this.speakingHistory[j];
        }
        if (history === 0) {
          this.speaking = false;
          this.emit("stopped_speaking");
        }
      }
      this.speakingHistory.shift();
      this.speakingHistory.push(currentVolume > this.threshold ? 1 : 0);

      this.looper();
    }, this.interval);
  }

  private getMaxVolume(): number {
    this.analyser.getFloatFrequencyData(this.fftBins);
    let maxVolume = -Infinity;
    for (let i = 4; i < this.fftBins.length; i++) {
      if (this.fftBins[i] > maxVolume && this.fftBins[i] < 0) {
        maxVolume = this.fftBins[i];
      }
    }
    return maxVolume;
  }
}
