// Web Audio API 기반 디지털 노이즈 및 앰비언스 사운드 합성 엔진

export type NoiseType = 'white' | 'pink' | 'brown' | 'rain' | 'wind' | 'campfire';

export interface SoundTrackState {
  id: NoiseType;
  name: string;
  description: string;
  volume: number; // 0 ~ 1
  enabled: boolean;
}

export const INITIAL_TRACKS: SoundTrackState[] = [
  { id: 'white', name: '화이트 노이즈', description: '전 주파수 균일 노이즈 (잡음 차단)', volume: 0.5, enabled: false },
  { id: 'pink', name: '핑크 노이즈', description: '자연스럽고 부드러운 중저음 (집중력 향상)', volume: 0.5, enabled: false },
  { id: 'brown', name: '브라운 노이즈', description: '깊고 웅장한 극저음 (깊은 수면 및 이완)', volume: 0.5, enabled: false },
  { id: 'rain', name: '빗소리', description: '창가를 두드리는 빗방울 사운드', volume: 0.5, enabled: false },
  { id: 'wind', name: '바람 소리', description: '스쳐 지나가는 잔잔한 숲바람', volume: 0.5, enabled: false },
  { id: 'campfire', name: '모닥불 타닥 소리', description: '따뜻한 불꽃과 나무 장작 튀는 소리', volume: 0.5, enabled: false },
];

/**
 * 브라우저 Web Audio API 기반 앰비언스 오디오 합성 엔진
 */
export class NoiseEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;

  // 채널별 Gain 노드
  private gains: Partial<Record<NoiseType, GainNode>> = {};
  // 오디오 소스 노드들
  private sources: AudioNode[] = [];
  // 모닥불 타이머
  private crackleInterval: number | null = null;

  public init(): void {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public async start(tracks: SoundTrackState[]): Promise<void> {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stopSources();
    this.isRunning = true;

    // 각 트랙 합성 시작
    tracks.forEach((track) => {
      this.createTrackNode(track);
    });
  }

  public stop(): void {
    this.stopSources();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
    this.isRunning = false;
  }

  /**
   * 컴포넌트 언마운트 시 오디오 컨텍스트 자원을 완전 해제합니다.
   */
  public dispose(): void {
    this.stopSources();
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close();
        }
      } catch {
        // 무시
      }
      this.ctx = null;
    }
    this.masterGain = null;
    this.isRunning = false;
  }

  public setMasterVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setTrackVolume(trackId: NoiseType, vol: number, enabled: boolean): void {
    if (!this.ctx) return;
    const gainNode = this.gains[trackId];
    if (gainNode) {
      const targetVol = enabled ? Math.max(0, Math.min(1, vol)) : 0;
      gainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
    }
  }

  private stopSources(): void {
    this.sources.forEach((src) => {
      try {
        if ('stop' in src && typeof (src as AudioScheduledSourceNode).stop === 'function') {
          (src as AudioScheduledSourceNode).stop();
        }
        src.disconnect();
      } catch {
        // 무시
      }
    });
    this.sources = [];
    this.gains = {};

    if (this.crackleInterval) {
      window.clearInterval(this.crackleInterval);
      this.crackleInterval = null;
    }
  }

  private createTrackNode(track: SoundTrackState): void {
    if (!this.ctx || !this.masterGain) return;

    const trackGain = this.ctx.createGain();
    const currentVol = track.enabled ? track.volume : 0;
    trackGain.gain.setValueAtTime(currentVol, this.ctx.currentTime);
    trackGain.connect(this.masterGain);
    this.gains[track.id] = trackGain;

    // 트랙별 합성 로직
    switch (track.id) {
      case 'white':
        this.generateWhiteNoise(trackGain);
        break;
      case 'pink':
        this.generatePinkNoise(trackGain);
        break;
      case 'brown':
        this.generateBrownNoise(trackGain);
        break;
      case 'rain':
        this.generateRainSound(trackGain);
        break;
      case 'wind':
        this.generateWindSound(trackGain);
        break;
      case 'campfire':
        this.generateCampfireSound(trackGain);
        break;
    }
  }

  private generateWhiteNoise(destination: GainNode): void {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    whiteNoise.connect(destination);
    whiteNoise.start();
    this.sources.push(whiteNoise);
  }

  private generatePinkNoise(destination: GainNode): void {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const pinkNoise = this.ctx.createBufferSource();
    pinkNoise.buffer = noiseBuffer;
    pinkNoise.loop = true;
    pinkNoise.connect(destination);
    pinkNoise.start();
    this.sources.push(pinkNoise);
  }

  private generateBrownNoise(destination: GainNode): void {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;
    brownNoise.connect(destination);
    brownNoise.start();
    this.sources.push(brownNoise);
  }

  private generateRainSound(destination: GainNode): void {
    if (!this.ctx) return;
    // 핑크 노이즈 기반 + 저역 통과 및 고역 통과 필터로 물 쏟아지는 소리 합성
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1000, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(200, this.ctx.currentTime);

    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(destination);

    src.start();
    this.sources.push(src, highpass, lowpass);
  }

  private generateWindSound(destination: GainNode): void {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(450, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // LFO 주파수 스윕으로 흔들리는 바람 효과
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);

    src.connect(bandpass);
    bandpass.connect(destination);

    src.start();
    lfo.start();
    this.sources.push(src, bandpass, lfo, lfoGain);
  }

  private generateCampfireSound(destination: GainNode): void {
    if (!this.ctx) return;
    // 부드러운 저음 브라운 노이즈 (장작 타는 배경음)
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
    }
    const bgSrc = this.ctx.createBufferSource();
    bgSrc.buffer = noiseBuffer;
    bgSrc.loop = true;
    bgSrc.connect(destination);
    bgSrc.start();
    this.sources.push(bgSrc);

    // 주기적인 무작위 팝(크랙클) 노이즈 발생
    this.crackleInterval = window.setInterval(() => {
      if (!this.ctx || !this.isRunning) return;
      if (Math.random() < 0.6) {
        const pop = this.ctx.createBufferSource();
        const popBuffer = this.ctx.createBuffer(1, 200, this.ctx.sampleRate);
        const data = popBuffer.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / 30);
        }
        pop.buffer = popBuffer;
        pop.connect(destination);
        pop.start();
      }
    }, 180);
  }
}

export interface NoisePreset {
  title: string;
  description: string;
  activeTracks: Partial<Record<NoiseType, number>>;
}

export const NOISE_PRESETS: NoisePreset[] = [
  {
    title: '비 내리는 카페',
    description: '빗소리와 부드러운 핑크 노이즈의 집중 사운드',
    activeTracks: { rain: 0.6, pink: 0.3 },
  },
  {
    title: '깊은 수면 & 이완',
    description: '낮고 웅장한 브라운 노이즈와 모닥불 장작 소리',
    activeTracks: { brown: 0.7, campfire: 0.4 },
  },
  {
    title: '독서실 초집중 모드',
    description: '주변 대화와 생활 소음을 완벽 차단하는 화이트+핑크 노이즈',
    activeTracks: { white: 0.4, pink: 0.5 },
  },
  {
    title: '자연의 숲과 바람',
    description: '선선한 바람 소리와 촉촉한 비',
    activeTracks: { wind: 0.5, rain: 0.4 },
  },
];
