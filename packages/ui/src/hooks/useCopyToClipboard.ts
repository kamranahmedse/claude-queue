import { useState, useCallback } from "react";

interface UseCopyToClipboardResult {
  copied: boolean;
  copy: (text: string) => void;
}

export function useCopyToClipboard(resetDelay = 2000): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    },
    [resetDelay]
  );

  return { copied, copy };
}
