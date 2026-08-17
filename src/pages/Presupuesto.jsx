import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import SelectorComunidad from "@/components/SelectorComunidad";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";
import { PlusCircle, ArrowLeft, FileText, Printer, Pencil, Trash2, BarChart2, ClipboardList, ChevronRight, CheckCircle, Clock, AlertCircle, Wifi, WifiOff, ChefHat } from "lucide-react";
import { toast } from "sonner";
import ResumenFinanciero from "@/components/presupuesto/ResumenFinanciero";
import ChecklistCategoria from "@/components/presupuesto/ChecklistCategoria";
import ItemPresupuestoForm from "@/components/presupuesto/ItemPresupuestoForm";
import PresupuestoForm from "@/components/presupuesto/PresupuestoForm";
import MenuManager from "@/components/presupuesto/MenuManager";
import MobileTopBar from "@/components/MobileTopBar";
import usePrintGuard from "@/hooks/usePrintGuard";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIAS = [
  "Alimentos y Bebidas", "Materiales Espirituales", "Uniformes y Vestimenta",
  "Logística y Transporte", "Sonido y Audiovisual", "Papelería e Imprenta",
  "Decoración", "Tecnología", "Misceláneos",
];

const ESTADO_COLORS = {
  "Borrador":    "bg-gray-100 text-gray-600",
  "En Revisión": "bg-yellow-100 text-yellow-700",
  "Aprobado":    "bg-green-100 text-green-700",
  "Ejecutado":   "bg-blue-100 text-blue-700",
};

const fmt = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n || 0);

function imprimirPresupuesto(presupuesto, items) {
  const fmtNum = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n || 0);
  const totalPresup = items.reduce((s, i) => s + (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0), 0);
  const totalAdicional = items.reduce((s, i) => {
    const diff = Math.max(0, (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0));
    return s + diff * (i.costo_unitario || 0);
  }, 0);
  const totalExistente = totalPresup - totalAdicional;

  const porCategoria = CATEGORIAS.reduce((acc, cat) => {
    const lista = items.filter(i => (i.categoria || "Misceláneos") === cat);
    if (lista.length > 0) acc[cat] = lista;
    return acc;
  }, {});

  const seccionesHTML = Object.entries(porCategoria).map(([cat, lista]) => {
    const filas = lista.map(item => {
      const diferencia = (item.cantidad_presupuestada || 0) - (item.cantidad_en_existencia || 0);
      const costoTotal = (item.cantidad_presupuestada || 0) * (item.costo_unitario || 0);
      const costoAdicional = Math.max(0, diferencia) * (item.costo_unitario || 0);
      return `
        <tr>
          <td class="font-semibold" style="${item.completado ? 'text-decoration:line-through;opacity:0.6' : ''}">${item.nombre}</td>
          <td class="text-center">${item.cantidad_presupuestada || 0} ${item.unidad || ''}</td>
          <td class="text-center">${item.cantidad_en_existencia || 0} ${item.unidad || ''}</td>
          <td class="text-center ${diferencia > 0 ? 'text-danger' : 'text-success'}">${diferencia > 0 ? diferencia : '✓'}</td>
          <td class="text-right">${fmtNum(item.costo_unitario)}</td>
          <td class="text-right font-semibold">${fmtNum(costoTotal)}</td>
          <td class="text-right ${costoAdicional > 0 ? 'text-danger' : 'text-success'}">${costoAdicional > 0 ? fmtNum(costoAdicional) : '—'}</td>
          <td class="text-center text-muted">${item.suplidor_nombre || '—'}</td>
          <td class="text-center">${item.completado ? '✓' : '—'}</td>
        </tr>`;
    }).join("");
    const subtotalPresup = lista.reduce((s, i) => s + (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0), 0);
    return `
      <div class="avoid-break" style="margin-bottom:18px">
        <div class="section-title">${cat} <span style="font-weight:400;font-size:9px;color:#888;margin-left:8px">${lista.length} ítem(s) · ${fmtNum(subtotalPresup)}</span></div>
        <table class="print-table">
          <thead><tr>
            <th>Ítem</th><th class="text-center">Presup.</th><th class="text-center">Exist.</th><th class="text-center">Dif.</th><th class="text-right">Costo Unit.</th><th class="text-right">Total</th><th class="text-right">Adicional</th><th class="text-center">Suplidor</th><th class="text-center">OK</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
  }).join("");

  const summaryCards = `
    <div class="summary-grid">
      <div class="summary-card"><p class="label">Total Presupuestado</p><p class="value">${fmtNum(totalPresup)}</p></div>
      <div class="summary-card"><p class="label">Valor en Existencia</p><p class="value success">${fmtNum(totalExistente)}</p></div>
      <div class="summary-card"><p class="label">Adicional Requerido</p><p class="value danger">${fmtNum(totalAdicional)}</p></div>
    </div>
  `;

  const body = `
    ${printHeaderHTML({ titulo: presupuesto.nombre, subtitulo: presupuesto.numero_retiro ? "Retiro #" + presupuesto.numero_retiro : "", total: items.length, extraInfo: presupuesto.estado })}
    ${summaryCards}
    ${seccionesHTML}
    ${printFooterHTML()}
  `;

  openPrintWindow(buildPrintDoc(presupuesto.nombre, body, `
    .section-title { font-size:12px; font-weight:700; color:#1a1a2e; margin:18px 0 8px 0; padding:5px 10px; border-left:3px solid #1a1a2e; background:#f9fafb; text-transform:uppercase; letter-spacing:0.5px; }
  `));
}

export default function Presupuesto() {
  const { records: todosPresupuestos, loading, online, create: createPresup, update: updatePresup, remove: removePresup } = useOffline("PresupuestoRetiro");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  // 🔒 AISLAMIENTO MULTI-TENANT DE PRESUPUESTOS
  const presupuestos = (todosPresupuestos || []).filter(p => 
    !equipoIdActivo || 
    p.equipo_id === equipoIdActivo || 
    p.comunidad_id === equipoIdActivo || 
    p.retiro_id === equipoIdActivo
  );

  const { guardedPrint } = usePrintGuard();
  const [items, setItems] = useState([]);
  const [suplidores, setSuplidores] = useState([]);
  const [presupuestoActivo, setPresupuestoActivo] = useState(null);
  const [tab, setTab] = useState("checklist");
  const [vista, setVista] = useState("presupuestos");
  const [configRetiro, setConfigRetiro] = useState(null);
  const [mostrarFormPresup, setMostrarFormPresup] = useState(false);
  const [editandoPresup, setEditandoPresup] = useState(null);
  const [mostrarFormItem, setMostrarFormItem] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [categoriaInicial, setCategoriaInicial] = useState(null);

  useEffect(() => {
    base44.entities.Suplidor.list().then(setSuplidores).catch(() => {});
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) setConfigRetiro(cfgs[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (presupuestoActivo) {
      if (online) {
        base44.entities.ItemPresupuesto.filter({ presupuesto_id: presupuestoActivo.id }).then(setItems).catch(() => {});
      }
    } else {
      setItems([]);
    }
  }, [presupuestoActivo, online]);

  // ── PRESUPUESTOS ──
  const handleGuardarPresupuesto = async (data, id) => {
    const dataConComunidad = {
      ...data,
      equipo_id: equipoIdActivo || user?.equipo_id || null,
      comunidad_id: equipoIdActivo || null
    };

    if (id) {
      await updatePresup(id, dataConComunidad);
      toast.success(online ? "Presupuesto actualizado" : "Presupuesto actualizado (local)");
    } else {
      await createPresup(dataConComunidad);
      toast.success(online ? "Presupuesto creado" : "Presupuesto creado (local)");
    }
    setMostrarFormPresup(false);
    setEditandoPresup(null);
  };

  const eliminarPresupuesto = async (id) => {
    if (!confirm("¿Eliminar este presupuesto y todos sus ítems?")) return;
    if (online) {
      const itemsAsoc = await base44.entities.ItemPresupuesto.filter({ presupuesto_id: id });
      await Promise.all(itemsAsoc.map(i => base44.entities.ItemPresupuesto.delete(i.id)));
    }
    await removePresup(id);
    toast.success(online ? "Presupuesto eliminado" : "Presupuesto eliminado (local)");
    if (presupuestoActivo?.id === id) setPresupuestoActivo(null);
  };

  // ── ITEMS ──
  const handleGuardarItem = async (data, id) => {
    if (id) {
      await base44.entities.ItemPresupuesto.update(id, data);
      toast.success("Ítem actualizado");
    } else {
      await base44.entities.ItemPresupuesto.create(data);
      toast.success("Ítem agregado");
    }
    setMostrarFormItem(false);
    setEditandoItem(null);
    setCategoriaInicial(null);
    base44.entities.ItemPresupuesto.filter({ presupuesto_id: presupuestoActivo.id }).then(setItems).catch(() => {});
  };

  const eliminarItem = async (id) => {
    if (!confirm("¿Eliminar este ítem?")) return;
    await base44.entities.ItemPresupuesto.delete(id);
    toast.success("Ítem eliminado");
    base44.entities.ItemPresupuesto.filter({ presupuesto_id: presupuestoActivo.id }).then(setItems).catch(() => {});
  };

  const toggleCompletado = async (item) => {
    await base44.entities.ItemPresupuesto.update(item.id, { completado: !item.completado });
    base44.entities.ItemPresupuesto.filter({ presupuesto_id: presupuestoActivo.id }).then(setItems).catch(() => {});
  };

  const abrirFormItem = (categoria) => {
    setCategoriaInicial(categoria || null);
    setEditandoItem(null);
    setMostrarFormItem(true);
  };

  const abrirEdicionItem = (item) => {
    setEditandoItem(item);
    setCategoriaInicial(null);
    setMostrarFormItem(true);
  };

  // ── Ítems agrupados por categoría ──
  const itemsPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    const lista = items.filter(i => (i.categoria || "Misceláneos") === cat);
    acc[cat] = lista;
    return acc;
  }, {});

  const totalItems = items.length;
  const completados = items.filter(i => i.completado).length;
  const conFaltante = items.filter(i => (i.cantidad_presupuestada || 0) > (i.cantidad_en_existencia || 0)).length;
  const totalPresupuestado = items.reduce((s, i) => s + (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0), 0);
  const totalAdicional = items.reduce((s, i) => {
    const diff = Math.max(0, (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0));
    return s + diff * (i.costo_unitario || 0);
  }, 0);

  if (loading) return (
    <div className="py-20 text-center text-amber-600">Cargando presupuestos...</div>
  );

  // ── Vista: Lista de presupuestos ──
  if (!presupuestoActivo) {
    return (
      <div className="pb-12">
        <MobileTopBar title="Presupuesto" />

        {/* Selector de Comunidad Superior */}
        <div className="mb-4">
          <SelectorComunidad />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                <FileText className="w-6 h-6" /> Módulo de Presupuesto
              </h1>
              {online ? (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Wifi className="w-3 h-3" /> Online</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><WifiOff className="w-3 h-3" /> Offline</span>
              )}
            </div>
            <p className="text-amber-600 text-sm mt-1">Planifica y controla los recursos de {comunidadActual?.nombre || "la comunidad activa"}</p>
          </div>
          {vista === "presupuestos" && (
            <button
              onClick={() => { setEditandoPresup(null); setMostrarFormPresup(true); }}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow"
            >
              <PlusCircle className="w-4 h-4" /> Nuevo Presupuesto
            </button>
          )}
        </div>

        {/* Conmutador de vista: Presupuestos / Menú */}
        <div className="flex gap-2 mb-6 border-b border-amber-200">
          <button
            onClick={() => setVista("presupuestos")}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${vista === "presupuestos" ? "border-amber-700 text-amber-800" : "border-transparent text-gray-600 hover:text-amber-700"}`}
          >
            <ClipboardList className="w-4 h-4" /> Presupuestos ({presupuestos.length})
          </button>
          <button
            onClick={() => setVista("menu")}
            className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors ${vista === "menu" ? "border-amber-700 text-amber-800" : "border-transparent text-gray-600 hover:text-amber-700"}`}
          >
            <ChefHat className="w-4 h-4" /> Crear Menú
          </button>
        </div>

        {vista === "menu" ? (
          <MenuManager configRetiro={configRetiro} equipoIdActivo={equipoIdActivo} />
        ) : presupuestos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No hay presupuestos registrados en esta comunidad</p>
            <p className="text-sm mt-1">Crea tu primer presupuesto para comenzar a planificar el retiro.</p>
            <button onClick={() => setMostrarFormPresup(true)}
              className="mt-4 bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-800">
              Crear Presupuesto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presupuestos.map(p => (
              <div key={p.id}
                className="bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
                onClick={() => setPresupuestoActivo(p)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-amber-900 leading-tight">{p.nombre}</p>
                      {p.numero_retiro && (
                        <p className="text-xs text-amber-600 mt-0.5">Retiro #{p.numero_retiro}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${ESTADO_COLORS[p.estado] || ESTADO_COLORS["Borrador"]}`}>
                      {p.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center mb-3">
                    <div className="bg-amber-50 rounded-lg py-2">
                      <p className="text-xs text-gray-500">Presupuestado</p>
                      <p className="text-sm font-bold text-amber-700">{fmt(p.total_presupuestado)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg py-2">
                      <p className="text-xs text-gray-500">Adicional Req.</p>
                      <p className="text-sm font-bold text-red-600">{fmt(p.total_adicional_requerido)}</p>
                    </div>
                  </div>

                  {p.notas && (
                    <p className="text-xs text-gray-400 italic truncate mb-3">{p.notas}</p>
                  )}

                  <div className="flex justify-between items-center border-t border-amber-50 pt-3">
                    <span className="text-xs text-amber-600 flex items-center gap-1 group-hover:font-semibold transition-all">
                      Ver detalle <ChevronRight className="w-3 h-3" />
                    </span>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setEditandoPresup(p); setMostrarFormPresup(true); }}
                        className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); eliminarPresupuesto(p.id); }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mostrarFormPresup && (
          <PresupuestoForm
            presupuesto={editandoPresup}
            onGuardado={handleGuardarPresupuesto}
            onCerrar={() => { setMostrarFormPresup(false); setEditandoPresup(null); }}
          />
        )}
      </div>
    );
  }

  // ── Vista: Detalle del presupuesto activo ──
  return (
    <div className="pb-12">
      <MobileTopBar title="Presupuesto" />

      <div className="mb-4">
        <SelectorComunidad />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <button onClick={() => setPresupuestoActivo(null)}
            className="mt-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-amber-900 leading-tight">{presupuestoActivo.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {presupuestoActivo.numero_retiro && (
                <span className="text-xs text-amber-600">Retiro #{presupuestoActivo.numero_retiro}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLORS[presupuestoActivo.estado] || ESTADO_COLORS["Borrador"]}`}>
                {presupuestoActivo.estado}
              </span>
              <span className="text-xs text-gray-400">{totalItems} ítem(s) · {completados} completados</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => guardedPrint(() => imprimirPresupuesto(presupuestoActivo, items))}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button
            onClick={() => { setEditandoPresup(presupuestoActivo); setMostrarFormPresup(true); }}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button
            onClick={() => abrirFormItem(null)}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow"
          >
            <PlusCircle className="w-4 h-4" /> Agregar Ítem
          </button>
        </div>
      </div>

      {/* Mini resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Total Ítems</p>
          <p className="text-xl font-bold text-amber-700">{totalItems}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Completados</p>
          <p className="text-xl font-bold text-green-700">{completados}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Con Faltante</p>
          <p className="text-xl font-bold text-red-600">{conFaltante}</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Adicional Req.</p>
          <p className="text-lg font-bold text-red-600">{fmt(totalAdicional)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("checklist")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "checklist" ? "bg-amber-700 text-white" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
          <ClipboardList className="w-4 h-4" /> Checklist de Materiales
        </button>
        <button onClick={() => setTab("resumen")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "resumen" ? "bg-amber-700 text-white" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
          <BarChart2 className="w-4 h-4" /> Análisis Financiero
        </button>
      </div>

      {/* Contenido */}
      {tab === "checklist" && (
        <div className="space-y-3">
          {CATEGORIAS.map(cat => (
            <ChecklistCategoria
              key={cat}
              categoria={cat}
              items={itemsPorCategoria[cat] || []}
              onAgregar={(c) => abrirFormItem(c)}
              onEditar={abrirEdicionItem}
              onEliminar={eliminarItem}
              onToggleCompletado={toggleCompletado}
            />
          ))}
        </div>
      )}

      {tab === "resumen" && (
        <ResumenFinanciero items={items} />
      )}

      {/* Modales */}
      {mostrarFormPresup && (
        <PresupuestoForm
          presupuesto={editandoPresup}
          onGuardado={async (data, id) => {
            await handleGuardarPresupuesto(data, id);
            if (id === presupuestoActivo?.id) {
              setPresupuestoActivo({ ...presupuestoActivo, ...data });
            }
          }}
          onCerrar={() => { setMostrarFormPresup(false); setEditandoPresup(null); }}
        />
      )}

      {mostrarFormItem && (
        <ItemPresupuestoForm
          item={editandoItem ? { ...editandoItem, categoria: editandoItem.categoria } : (categoriaInicial ? { categoria: categoriaInicial } : null)}
          presupuestoId={presupuestoActivo.id}
          suplidores={suplidores}
          onGuardado={handleGuardarItem}
          onCerrar={() => { setMostrarFormItem(false); setEditandoItem(null); setCategoriaInicial(null); }}
        />
      )}
    </div>
  );
}