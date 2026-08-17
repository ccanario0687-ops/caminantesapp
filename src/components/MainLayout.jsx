import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import BottomTabs from "./BottomTabs.jsx";
import Breadcrumbs from "./Breadcrumbs";
import BuscadorGlobalModal from "./BuscadorGlobalModal.jsx";

export default function MainLayout() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isK = e.code === "KeyK" || e.key?.toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };

    const handleCustomOpen = () => setSearchOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open_global_search", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open_global_search", handleCustomOpen);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-amber-50">
      <Sidebar />
      <main className="flex-1 w-full md:w-auto">
        <div className="max-w-7xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-24 md:pt-8 md:pb-8">
          <Breadcrumbs />
          <div key={location.pathname} className="page-slide-in">
            <Outlet />
          </div>
        </div>
      </main>
      <BottomTabs />
      <BuscadorGlobalModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}