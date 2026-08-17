import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const BREADCRUMB_LABELS = {
  "/dashboard": "Panel Principal",
  "/registro": "Registrar Caminante",
  "/caminantes": "Caminantes",
  "/servidores": "Servidores",
  "/configuracion": "Configuración",
  "/reportes": "Reportes",
  "/distribucion": "Distribución",
  "/distintivos": "Distintivos",
  "/impresiones": "Impresiones",
  "/ayuda": "Ayuda",
  "/finanzas": "Finanzas",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  const breadcrumbs = [
    { label: "Inicio", path: "/dashboard" },
  ];

  let currentPath = "";
  paths.forEach((path) => {
    currentPath += `/${path}`;
    const label = BREADCRUMB_LABELS[currentPath] || path;
    breadcrumbs.push({ label, path: currentPath });
  });

  if (location.pathname === "/dashboard") {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-6 px-4 py-3 bg-amber-50 rounded-lg border border-amber-200">
      <Link to="/dashboard" className="flex items-center gap-1 text-amber-700 hover:text-amber-900 transition-colors">
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.slice(1).map((crumb, idx) => (
        <div key={crumb.path} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-amber-400" />
          {idx === breadcrumbs.length - 2 ? (
            <span className="font-semibold text-amber-900">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-amber-700 hover:text-amber-900 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}