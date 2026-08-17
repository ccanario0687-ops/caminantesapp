import { createContext, useContext, useState, useEffect } from "react";
import BackArrow from "@/components/BackArrow";
import { useIsMobile } from "@/hooks/use-mobile";
import { Globe } from "lucide-react";

// 1. DICCIONARIO BILINGÜE COMPLETO (ES / EN)
export const DICCIONARIO = {
  es: {
    app_title: "Retiro de Emaús",
    dashboard: "Panel General",
    caminantes: "Caminantes",
    servidores: "Servidores",
    distribucion: "Distribución",
    finanzas: "Finanzas",
    historial: "Historial",
    hermandad: "Hermandad",
    mesas: "Mesas",
    habitaciones: "Habitaciones",
    lideres: "Líderes de Mesa",
    search: "Buscar...",
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Eliminar",
    edit: "Editar",
    print: "Imprimir",
    backup: "Backup JSON",
    restore: "Restaurar",
    city: "Ciudad / Provincia",
    profession: "Profesión",
    overloaded: "Sobrecargada",
    conflict: "Conflicto",
    auto_resolve: "Resolver Automáticamente",
    paid: "Pagado",
    pending: "Pendiente",
    balance: "Balance Neto",
    income: "Ingresos",
    expenses: "Gastos",
  },
  en: {
    app_title: "Emmaus Retreat",
    dashboard: "Dashboard",
    caminantes: "Participants",
    servidores: "Volunteers / Servers",
    distribucion: "Seating & Rooms",
    finanzas: "Finances",
    historial: "History & Archives",
    hermandad: "Brotherhood Directory",
    mesas: "Tables",
    habitaciones: "Rooms",
    lideres: "Table Leaders",
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    print: "Print",
    backup: "Backup JSON",
    restore: "Restore",
    city: "City / State",
    profession: "Occupation",
    overloaded: "Overloaded",
    conflict: "Conflict",
    auto_resolve: "Auto Resolve",
    paid: "Paid",
    pending: "Pending",
    balance: "Net Balance",
    income: "Income",
    expenses: "Expenses",
  }
};

// 2. CONTEXTO GLOBAL DE IDIOMA
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("emaus_lang") || "es");

  useEffect(() => {
    localStorage.setItem("emaus_lang", lang);
  }, [lang]);

  const t = (key) => DICCIONARIO[lang]?.[key] || DICCIONARIO["es"]?.[key] || key;
  const toggleLang = () => setLang(prev => (prev === "es" ? "en" : "es"));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx || { lang: "es", t: (k) => k, setLang: () => {}, toggleLang: () => {} };
}

// 3. COMPONENTE SELECTOR CON BANDERAS (🇪🇸 ES / 🇺🇸 EN)
export function LanguageSelector({ light = false }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`inline-flex items-center p-0.5 rounded-lg border text-xs ${
      light ? "bg-white/20 border-white/30 text-white" : "bg-slate-100 border-slate-200 text-slate-700"
    }`}>
      <Globe className="w-3.5 h-3.5 ml-1.5 mr-1 opacity-80" />
      <button
        type="button"
        onClick={() => setLang("es")}
        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
          lang === "es"
            ? light ? "bg-white text-amber-900 shadow-xs" : "bg-amber-800 text-white shadow-xs"
            : "opacity-75 hover:opacity-100"
        }`}
      >
        <span>🇪🇸</span> ES
      </button>

      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all flex items-center gap-1 ${
          lang === "en"
            ? light ? "bg-white text-amber-900 shadow-xs" : "bg-amber-800 text-white shadow-xs"
            : "opacity-75 hover:opacity-100"
        }`}
      >
        <span>🇺🇸</span> EN
      </button>
    </div>
  );
}

// 4. BARRA DE NAVEGACIÓN MOBILE CON SELECTOR DE IDIOMA
export default function MobileTopBar({ title, to = "/dashboard" }) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  if (!isMobile) return null;

  return (
    <div className="md:hidden sticky top-[env(safe-area-inset-top)] z-30 flex items-center justify-between bg-amber-700 text-white px-4 py-3 rounded-xl mb-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <BackArrow to={to} className="text-white hover:opacity-80 transition-opacity shrink-0" />
        <h1 className="text-base font-bold truncate">{title ? (t(title) !== title ? t(title) : title) : t("app_title")}</h1>
      </div>

      <div className="shrink-0">
        <LanguageSelector light={true} />
      </div>
    </div>
  );
}