import { useEffect, useRef, useState } from "react";
import type { Task } from "~/types";

const LIGHT_NORMAL_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23fafafa"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%23e4e4e7"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%23e4e4e7"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%23e4e4e7"/></svg>`;

const LIGHT_BLOCKED_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23fafafa"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%23e4e4e7"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%23e4e4e7"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%23e4e4e7"/><circle cx="85" cy="15" r="12" fill="%23ef4444"/></svg>`;

const DARK_NORMAL_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2318181b"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%2327272a"/></svg>`;

const DARK_BLOCKED_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2318181b"/><rect x="15" y="25" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="45" width="70" height="10" rx="3" fill="%2327272a"/><rect x="15" y="65" width="70" height="10" rx="3" fill="%2327272a"/><circle cx="85" cy="15" r="12" fill="%23ef4444"/></svg>`;

function useColorScheme() {
  const [isDark, setIsDark] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDark;
}

export function useBlockedIndicator(tasks: Task[]) {
  const hasBlockedTask = tasks.some((task) => task.blocked);
  const isDark = useColorScheme();
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
        const normalFavicon = isDark ? LIGHT_NORMAL_FAVICON : DARK_NORMAL_FAVICON;
        faviconRef.current.href = normalFavicon;
      }
      document.title = originalTitle.current;
    };
  }, [isDark]);

  useEffect(() => {
    if (faviconRef.current) {
      const normalFavicon = isDark ? LIGHT_NORMAL_FAVICON : DARK_NORMAL_FAVICON;
      const blockedFavicon = isDark ? LIGHT_BLOCKED_FAVICON : DARK_BLOCKED_FAVICON;
      faviconRef.current.href = hasBlockedTask ? blockedFavicon : normalFavicon;
    }

    const baseTitle = originalTitle.current;
    if (hasBlockedTask) {
      document.title = `(!) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [hasBlockedTask, isDark]);

  return hasBlockedTask;
}
