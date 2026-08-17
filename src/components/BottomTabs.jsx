import { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, UserCheck, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const TABS = [
  { key: "home", to: "/dashboard", icon: Home, label: "Inicio" },
  { key: "caminantes", to: "/caminantes", icon: Users, label: "Caminantes" },
  { key: "servidores", to: "/servidores", icon: UserCheck, label: "Servidores" },
  { key: "finanzas", to: "/finanzas", icon: DollarSign, label: "Finanzas" },
];

export default function BottomTabs() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const positions = useRef({});

  const activeKey =
    TABS.find((t) => (t.key === "home" ? pathname === t.to : pathname.startsWith(t.to)))?.key || "home";

  // Record the current position for the active tab so we can restore it later.
  useEffect(() => {
    positions.current[activeKey] = pathname;
  }, [pathname, activeKey]);

  if (!isMobile) return null;

  const handleTap = (tab) => {
    if (tab.key === activeKey) {
      // Tapping the already-active tab resets it to its root view.
      if (pathname !== tab.to) navigate(tab.to);
    } else {
      // Switching tabs restores the tab's last view (or its root if none).
      const stored = positions.current[tab.key];
      navigate(stored || tab.to);
    }
  };

  const isActive = (to) =>
    to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(to);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-amber-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.to);
          return (
            <button
              key={t.to}
              type="button"
              onClick={() => handleTap(t)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors min-h-[56px] ${
                active ? "text-amber-700" : "text-gray-500"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-amber-700" : "text-gray-400"}`} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}