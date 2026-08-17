import { useRef, useState } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const isMobile = useIsMobile();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  if (!isMobile) return <>{children}</>;

  const onTouchStart = (e) => {
    if (refreshing) return;
    startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 100));
  };
  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } catch {}
      await new Promise((r) => setTimeout(r, 600));
      setRefreshing(false);
      setPull(0);
    } else {
      setPull(0);
    }
  };

  const pct = Math.min(pull / THRESHOLD, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        style={{
          height: pull,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {refreshing ? (
          <RefreshCw className="w-5 h-5 text-amber-700 animate-spin" />
        ) : pull > 0 ? (
          <ChevronDown
            className="w-5 h-5 text-amber-700 transition-transform"
            style={{ transform: `rotate(${pct * 180}deg)` }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}