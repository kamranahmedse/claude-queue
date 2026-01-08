import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  maxWidth?: number;
}

export function Tooltip(props: TooltipProps) {
  const { content, children, delay = 300, maxWidth = 300 } = props;

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipTop = rect.top - 8;
        let tooltipLeft = rect.left + rect.width / 2;

        if (tooltipLeft + maxWidth / 2 > window.innerWidth) {
          tooltipLeft = window.innerWidth - maxWidth / 2 - 16;
        }
        if (tooltipLeft - maxWidth / 2 < 0) {
          tooltipLeft = maxWidth / 2 + 16;
        }

        setPosition({ top: tooltipTop, left: tooltipLeft });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="contents"
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -100%)",
              maxWidth,
            }}
          >
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 shadow-lg">
              {content}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-zinc-800 border-r border-b border-zinc-700 rotate-45" />
          </div>,
          document.body
        )}
    </>
  );
}
