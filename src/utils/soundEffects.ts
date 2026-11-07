import { useState, useEffect, useCallback } from 'react';
import { speakEcuadorSpanish } from './tts';

const SFX_STORAGE_KEY = 'es_sfx_enabled_v1';
const SFX_SYNC_EVENT = 'es-sfx-sync';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function getSfxEnabled(): boolean {
  try {
    const val = localStorage.getItem(SFX_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setSfxEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SFX_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new Event(SFX_SYNC_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function useSoundEffects() {
  const [sfxEnabled, setSfxEnabledState] = useState<boolean>(() =>
    getSfxEnabled()
  );

  useEffect(() => {
    const onSync = () => setSfxEnabledState(getSfxEnabled());
    window.addEventListener(SFX_SYNC_EVENT, onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener(SFX_SYNC_EVENT, onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  const toggleSfx = useCallback(() => {
    const next = !getSfxEnabled();
    setSfxEnabled(next);
    setSfxEnabledState(next);
  }, []);

  return { sfxEnabled, toggleSfx };
}

/**
 * 4. 스피드 탭 정답: "띠링!" (맑은 2음 차임벨)
 */
export function playSpeedCorrectSound(): void {
  if (!getSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 659.25, start: 0, dur: 0.14 }, // E5 ("띠-")
    { freq: 987.77, start: 0.09, dur: 0.32 }, // B5 ("-링!")
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.26, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}

/**
 * 5. 오답 효과음: "띠딕!" (낮은 2연타 버저음)
 */
export function playWrongSound(): void {
  if (!getSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [
    { freq: 311.13, start: 0, dur: 0.11 }, // D#4 ("띠-")
    { freq: 233.08, start: 0.11, dur: 0.22 }, // A#3 ("-딕!")
  ];

  tones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.linearRampToValueAtTime(0.28, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}

/**
 * 6. 철자 탭 타이핑 정답: "띠링!"보다 한층 더 경쾌한 상승 아르페지오 차임 사운드
 */
export function playWriteCorrectSound(): void {
  if (!getSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, start: 0.0, dur: 0.14 }, // C5
    { freq: 659.25, start: 0.06, dur: 0.16 }, // E5
    { freq: 783.99, start: 0.12, dur: 0.2 }, // G5
    { freq: 1046.5, start: 0.18, dur: 0.42 }, // C6
    { freq: 1318.5, start: 0.24, dur: 0.45 }, // E6 sparkle
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.24, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}

/**
 * 7. 시험 80점 이상 통과 시: 환영의 박수 소리 + 축하 팡파르
 */
export function playExamPassApplauseSound(): void {
  if (!getSfxEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1) Triumphant fanfare chord progression
  const fanfare = [
    { freq: 523.25, start: 0.0, dur: 0.18 }, // C5
    { freq: 659.25, start: 0.12, dur: 0.18 }, // E5
    { freq: 783.99, start: 0.24, dur: 0.18 }, // G5
    { freq: 1046.5, start: 0.36, dur: 0.75 }, // C6
    { freq: 783.99, start: 0.36, dur: 0.75 }, // G5 harmony
    { freq: 1318.5, start: 0.52, dur: 0.85 }, // E6 top note
  ];

  fanfare.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });

  // 2) Synthesized multi-person applause bursts (filtered noise claps over 2.4s)
  const bufferSize = Math.floor(ctx.sampleRate * 0.09);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
  }

  const totalClaps = 38;
  for (let i = 0; i < totalClaps; i++) {
    const clapStart = now + 0.08 + (i / totalClaps) * 2.1 + Math.random() * 0.06;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950 + Math.random() * 1100, clapStart);
    filter.Q.setValueAtTime(1.8, clapStart);

    const gain = ctx.createGain();
    const fadeOut = 1 - (i / totalClaps) * 0.45;
    gain.gain.setValueAtTime(0.16 * fadeOut, clapStart);
    gain.gain.exponentialRampToValueAtTime(0.001, clapStart + 0.085);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(clapStart);
  }
}

/**
 * 효과음 재생 직후 스페인어 원어민 발음을 이어서 재생
 */
export function playFeedbackAndSpeak(
  type: 'speed-correct' | 'write-correct' | 'wrong',
  spanishWord: string
): void {
  if (type === 'speed-correct') {
    playSpeedCorrectSound();
  } else if (type === 'write-correct') {
    playWriteCorrectSound();
  } else {
    playWrongSound();
  }

  const delayMs = getSfxEnabled()
    ? type === 'write-correct'
      ? 330
      : 260
    : 0;

  setTimeout(() => {
    speakEcuadorSpanish(spanishWord);
  }, delayMs);
}
