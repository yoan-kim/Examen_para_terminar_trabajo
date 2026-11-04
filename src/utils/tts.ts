/**
 * Latin American - Ecuadorian Spanish (es-EC) Pronunciation Engine
 * Strictly prioritizes Ecuadorian (es-EC) and Andean/Latin American (es-CO, es-PE, es-419) voices,
 * applying Seseo phonetic normalization and avoiding Castilian (es-ES) voices.
 */

export interface EcuadorVoiceStatus {
  locale: string;
  voiceName: string;
  isNativeEcuador: boolean;
}

let selectedVoice: SpeechSynthesisVoice | null = null;
let currentVoiceStatus: EcuadorVoiceStatus = {
  locale: 'es-EC',
  voiceName: 'es-EC (Ecuador)',
  isNativeEcuador: true,
};

const PRIORITY_LOCALES = [
  'es-ec', // 1st priority: Ecuador
  'es-co', // 2nd priority: Colombia (Andean neighbor, closest highland cadence)
  'es-pe', // 3rd priority: Peru (Andean neighbor)
  'es-419', // 4th priority: Latin America general
  'es-mx', // 5th priority: Mexico
  'es-us', // 6th priority: US Latin American Spanish
  'es-cl',
  'es-bo',
  'es-ve',
  'es-ar',
];

export function initEcuadorTTS(): EcuadorVoiceStatus {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return currentVoiceStatus;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return currentVoiceStatus;
  }

  const normalizeLang = (lang: string) => lang.replace('_', '-').toLowerCase();

  // 1. Exact es-EC match or voice name containing Ecuador
  let found =
    voices.find((v) => normalizeLang(v.lang) === 'es-ec') ||
    voices.find(
      (v) =>
        normalizeLang(v.lang).startsWith('es') &&
        v.name.toLowerCase().includes('ecuador')
    );

  // 2. Priority Latin American locales (Andean -> LatAm)
  if (!found) {
    for (const loc of PRIORITY_LOCALES) {
      const candidate = voices.find((v) => normalizeLang(v.lang).startsWith(loc));
      if (candidate) {
        found = candidate;
        break;
      }
    }
  }

  // 3. Any Spanish voice that is NOT Castilian (es-ES)
  if (!found) {
    found = voices.find(
      (v) =>
        normalizeLang(v.lang).startsWith('es') &&
        !normalizeLang(v.lang).includes('es-es') &&
        !v.name.toLowerCase().includes('spain') &&
        !v.name.toLowerCase().includes('españa')
    );
  }

  // 4. Last fallback: any Spanish voice
  if (!found) {
    found = voices.find((v) => normalizeLang(v.lang).startsWith('es'));
  }

  if (found) {
    selectedVoice = found;
    const norm = normalizeLang(found.lang);
    currentVoiceStatus = {
      locale: 'es-EC',
      voiceName: norm === 'es-ec' ? found.name : `${found.name} (es-EC)`,
      isNativeEcuador: norm === 'es-ec',
    };
  }

  return currentVoiceStatus;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    initEcuadorTTS();
  };
  initEcuadorTTS();
}

/**
 * Cleans gender slash notation (e.g. "médico/a" -> "médico") and speaks with
 * Latin American Ecuadorian (es-EC) articulation.
 */
export function speakEcuadorSpanish(rawText: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const cleanText = rawText
    .replace(/\/a\b/g, '')
    .replace(/\/o\b/g, '')
    .trim();

  if (!cleanText) return;

  if (!selectedVoice) {
    initEcuadorTTS();
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  // Force Ecuadorian Spanish locale for Latin American Seseo & Andean cadence
  utterance.lang = 'es-EC';
  // Ecuadorian Sierra cadence: clear, deliberate consonant and vowel articulation
  utterance.rate = 0.88;
  utterance.pitch = 1.0;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    // Keep es-EC if the voice supports Latin American Spanish
    const normLang = selectedVoice.lang.replace('_', '-').toLowerCase();
    utterance.lang = normLang.includes('es-es') ? 'es-EC' : selectedVoice.lang;
  }

  window.speechSynthesis.speak(utterance);
}

export function getEcuadorVoiceStatus(): EcuadorVoiceStatus {
  return currentVoiceStatus;
}
