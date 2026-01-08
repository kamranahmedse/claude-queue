import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const SOUND_ENABLED_KEY = "claude-kanban-sound-enabled";

type SoundType = "complete" | "question";

const soundFiles: Record<SoundType, string> = {
  complete: "/sounds/complete.aiff",
  question: "/sounds/question.aiff",
};

function getSoundEnabled(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === null) {
    return true;
  }
  return stored === "true";
}

function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  window.dispatchEvent(new Event("sound-settings-changed"));
}

const audioCache = new Map<SoundType, HTMLAudioElement>();

function getOrCreateAudio(type: SoundType): HTMLAudioElement {
  let audio = audioCache.get(type);
  if (!audio) {
    audio = new Audio(soundFiles[type]);
    audioCache.set(type, audio);
  }
  return audio;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("sound-settings-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("sound-settings-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSoundEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribe,
    getSoundEnabled,
    () => true
  );

  return [enabled, setSoundEnabled];
}

export function usePlaySound(): (type: SoundType) => void {
  const enabledRef = useRef(getSoundEnabled());

  useEffect(() => {
    const updateEnabled = () => {
      enabledRef.current = getSoundEnabled();
    };
    window.addEventListener("sound-settings-changed", updateEnabled);
    window.addEventListener("storage", updateEnabled);
    return () => {
      window.removeEventListener("sound-settings-changed", updateEnabled);
      window.removeEventListener("storage", updateEnabled);
    };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) {
      return;
    }

    const audio = getOrCreateAudio(type);
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
    });
  }, []);

  return playSound;
}
