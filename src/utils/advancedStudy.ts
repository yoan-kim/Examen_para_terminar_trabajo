import { useState, useEffect, useCallback } from 'react';

const ADVANCED_MODE_KEY = 'es_advanced_study_enabled_v1';
const WORD_NOTES_KEY = 'es_word_tip_notes_v1';
const SYNC_EVENT = 'es-advanced-study-sync';

export function getStoredAdvancedMode(): boolean {
  try {
    return localStorage.getItem(ADVANCED_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAdvancedMode(enabled: boolean): void {
  try {
    localStorage.setItem(ADVANCED_MODE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function getStoredWordNotes(): Record<number, string> {
  try {
    const raw = localStorage.getItem(WORD_NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setStoredWordNote(wordId: number, note: string): void {
  try {
    const current = getStoredWordNotes();
    const trimmed = note.trim();
    if (trimmed) {
      current[wordId] = note;
    } else {
      delete current[wordId];
    }
    localStorage.setItem(WORD_NOTES_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function useAdvancedStudy() {
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(() =>
    getStoredAdvancedMode()
  );
  const [wordNotes, setWordNotes] = useState<Record<number, string>>(() =>
    getStoredWordNotes()
  );

  useEffect(() => {
    const handleSync = () => {
      setIsAdvancedMode(getStoredAdvancedMode());
      setWordNotes(getStoredWordNotes());
    };
    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggleAdvancedMode = useCallback(() => {
    const next = !getStoredAdvancedMode();
    setStoredAdvancedMode(next);
    setIsAdvancedMode(next);
  }, []);

  const saveWordNote = useCallback((wordId: number, note: string) => {
    setStoredWordNote(wordId, note);
    setWordNotes(getStoredWordNotes());
  }, []);

  return {
    isAdvancedMode,
    toggleAdvancedMode,
    wordNotes,
    saveWordNote,
  };
}
