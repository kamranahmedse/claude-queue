import { useEffect, useCallback } from "react";

interface KeyboardShortcuts {
  onHelp?: () => void;
  onAddTask?: () => void;
  onAddTemplate?: () => void;
  onCloseModal?: () => void;
  onTroubleshooting?: () => void;
  onStats?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  const {
    onHelp,
    onAddTask,
    onAddTemplate,
    onCloseModal,
    onTroubleshooting,
    onStats,
  } = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputFocused) {
        if (event.key === "Escape" && onCloseModal) {
          onCloseModal();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "?":
        case "h":
          event.preventDefault();
          onHelp?.();
          break;
        case "n":
        case "a":
          event.preventDefault();
          onAddTask?.();
          break;
        case "t":
          event.preventDefault();
          onAddTemplate?.();
          break;
        case "escape":
          event.preventDefault();
          onCloseModal?.();
          break;
        case "d":
          event.preventDefault();
          onTroubleshooting?.();
          break;
        case "s":
          event.preventDefault();
          onStats?.();
          break;
      }
    },
    [onHelp, onAddTask, onAddTemplate, onCloseModal, onTroubleshooting, onStats]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
