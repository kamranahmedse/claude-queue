import { useEffect, useRef } from "react";
import type { Task } from "~/types";

const NORMAL_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2318181b"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%2327272a"/></svg>`;

const BLOCKED_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2318181b"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%2327272a"/><circle cx="85" cy="15" r="12" fill="%23ef4444"/></svg>`;

export function useBlockedIndicator(tasks: Task[]) {
  const hasBlockedTask = tasks.some((task) => task.blocked);
  const faviconRef = useRef<HTMLLinkElement | null>(null);
  const originalTitle = useRef<string>(document.title);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      document.head.appendChild(favicon);
    }
    faviconRef.current = favicon;

    originalTitle.current = document.title.replace(/^\(\!\) /, "");

    return () => {
      if (faviconRef.current) {
        faviconRef.current.href = NORMAL_FAVICON;
      }
      document.title = originalTitle.current;
    };
  }, []);

  useEffect(() => {
    if (faviconRef.current) {
      faviconRef.current.href = hasBlockedTask ? BLOCKED_FAVICON : NORMAL_FAVICON;
    }

    const baseTitle = originalTitle.current;
    if (hasBlockedTask) {
      document.title = `(!) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [hasBlockedTask]);

  return hasBlockedTask;
}
