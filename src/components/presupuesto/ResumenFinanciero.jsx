import { DollarSign, TrendingUp, TrendingDown, CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n || 0);

export default function ResumenFinanciero({ items }) {
  const totalPresupuestado = items.reduce((s, i) => s + (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0), 0);
  const totalExistente = items.reduce((s, i) => s + (i.cantidad_en_existencia || 0) * (i.costo_unitario || 0), 0);
  const totalAdicional = items.reduce((s, i) => {
    const diff = Math.max(0, (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0));
    return s + diff * (i.costo_unitario || 0);
  }, 0);
  const totalItems = items.length;
  const completados = items.filter(i => i.completado).length;
  const porcentaje = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;
  const faltantes = items.filter(i => {
    const diff = (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0);
    return diff > 0 && !i.completado;
  }).length;

  const cards = [
    {
      label: "Total Presupuestado",
      value: fmt(totalPresupuestado),
      icon: DollarSign,
      color: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
      textColor: "text-amber-900",
    },
    {
      label: "Valor en Existencia",
      value: fmt(totalExistente),
      icon: CheckCircle,
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
      textColor: "text-green-900",
    },
    {
      label: "Dinero Adicional Requerido",
      value: fmt(totalAdicional),
      icon: ShoppingCart,
      color: "bg-red-50 border-red-200",
      iconColor: "text-red-500",
      textColor: "text-red-700",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.iconColor}`} />
              <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            </div>
            <p className={`text-xl font-bold ${c.textColor}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      <div className="bg-white border border-amber-100 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-700">Progreso del Checklist</p>
          <span className="text-sm font-bold text-amber-700">{completados}/{totalItems} ítems completados</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${porcentaje}%`,
              background: porcentaje === 100 ? "#16a34a" : porcentaje > 60 ? "#d97706" : "#ef4444"
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{porcentaje}% completado</span>
          {faltantes > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" /> {faltantes} ítem(s) con faltante
            </span>
          )}
        </div>
      </div>

      {/* Análisis por categoría */}
      {items.length > 0 && <AnalisisCategorias items={items} />}
    </div>
  );
}

function AnalisisCategorias({ items }) {
  const COLORES = [
    "#d97706", "#16a34a", "#2563eb", "#9333ea", "#ea580c",
    "#db2777", "#0891b2", "#65a30d", "#6b7280"
  ];

  const porCategoria = {};
  items.forEach(i => {
    const cat = i.categoria || "Misceláneos";
    if (!porCategoria[cat]) porCategoria[cat] = { presupuestado: 0, adicional: 0 };
    porCategoria[cat].presupuestado += (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0);
    const diff = Math.max(0, (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0));
    porCategoria[cat].adicional += diff * (i.costo_unitario || 0);
  });

  const total = Object.values(porCategoria).reduce((s, v) => s + v.presupuestado, 0);
  const entradas = Object.entries(porCategoria).sort((a, b) => b[1].presupuestado - a[1].presupuestado);

  if (entradas.length === 0) return null;

  return (
    <div className="bg-white border border-amber-100 rounded-xl p-4">
      <p className="text-sm font-bold text-gray-700 mb-3">Distribución por Categoría</p>
      <div className="space-y-2">
        {entradas.map(([cat, vals], idx) => {
          const pct = total > 0 ? Math.round((vals.presupuestado / total) * 100) : 0;
          const color = COLORES[idx % COLORES.length];
          return (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-600 font-medium">{cat}</span>
                <span className="text-gray-500">
                  {new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 0 }).format(vals.presupuestado)} · {pct}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}