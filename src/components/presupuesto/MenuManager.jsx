import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  PlusCircle, Trash2, Pencil, ArrowLeft, Utensils, Users, X, ChefHat,
  Calculator, ClipboardList, Printer
} from "lucide-react";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";
import usePrintGuard from "@/hooks/usePrintGuard";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";

const TIPOS = ["Desayuno", "Almuerzo", "Cena", "Merienda", "Otro"];
const fmt = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n || 0);
const fmtNum = (n) => (Number(n) || 0).toLocaleString("es-DO", { maximumFractionDigits: 2 });

function imprimirMenu(menu, ingredientes, numPersonas, configRetiro) {
  const filas = ingredientes.map(ing => {
    const total = (ing.cantidad_por_persona || 0) * numPersonas;
    const costo = total * (ing.costo_unitario || 0);
    return `<tr>
      <td class="font-semibold">${ing.nombre}</td>
      <td class="text-center">${fmtNum(ing.cantidad_por_persona)} ${ing.unidad || ''}</td>
      <td class="text-center font-bold">${fmtNum(total)} ${ing.unidad || ''}</td>
      <td class="text-right">${fmt(ing.costo_unitario)}</td>
      <td class="text-right font-semibold">${fmt(costo)}</td>
      <td class="text-center text-muted">${ing.suplidor_nombre || '—'}</td>
    </tr>`;
  }).join("");

  const totalEstimado = ingredientes.reduce((s, ing) => s + (ing.cantidad_por_persona || 0) * numPersonas * (ing.costo_unitario || 0), 0);

  const body = `
    ${printHeaderHTML({
      titulo: menu.nombre,
      subtitulo: configRetiro?.nombre_retiro || "",
      total: ingredientes.length,
      extraInfo: `${menu.tipo || ''} · ${numPersonas} persona(s)${menu.fecha ? ` · ${menu.fecha}` : ''}`
    })}
    <div class="summary-grid">
      <div class="summary-card"><p class="label">Personas</p><p class="value">${numPersonas}</p></div>
      <div class="summary-card"><p class="label">Productos</p><p class="value">${ingredientes.length}</p></div>
      <div class="summary-card" style="border:1px solid #fcd34d;background:#fffbeb"><p class="label">Total Estimado</p><p class="value">${fmt(totalEstimado)}</p></div>
    </div>
    <p class="section-title">Lista de Compras del Menú</p>
    <table class="print-table">
      <thead><tr>
        <th>Producto</th><th class="text-center">Por Persona</th><th class="text-center">Total Necesario</th>
        <th class="text-right">Costo Unit.</th><th class="text-right">Costo Total</th><th class="text-center">Suplidor</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr class="font-semibold" style="border-top:2px solid #1a1a2e;background:#f9fafb">
        <td colspan="4" style="padding:8px 10px">TOTAL ESTIMADO DEL MENÚ</td>
        <td class="text-right font-semibold">${fmt(totalEstimado)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    ${printFooterHTML()}
  `;

  openPrintWindow(buildPrintDoc(menu.nombre, body, `
    .section-title { font-size:11px; font-weight:700; color:#374151; margin:16px 0 8px 0; text-transform:uppercase; letter-spacing:0.5px; }
  `));
}

export default function MenuManager({ configRetiro }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inscritos, setInscritos] = useState(0);
  const [menuActivo, setMenuActivo] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [mostrarFormMenu, setMostrarFormMenu] = useState(false);
  const [editandoMenu, setEditandoMenu] = useState(null);
  const [mostrarFormIng, setMostrarFormIng] = useState(false);
  const [editandoIng, setEditandoIng] = useState(null);

  const numRetiro = configRetiro?.edicion && !isNaN(Number(configRetiro.edicion)) ? Number(configRetiro.edicion) : null;
  const { guardedPrint } = usePrintGuard();

  const cargarMenus = useCallback(async () => {
    try {
      let lista = await base44.entities.MenuRetiro.list("-created_date");
      if (numRetiro !== null) lista = lista.filter(m => m.numero_retiro === numRetiro);
      setMenus(lista);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [numRetiro]);

  const cargarInscritos = useCallback(async () => {
    try {
      const [cams, servs] = await Promise.all([
        base44.entities.Caminante.list(),
        base44.entities.Servidor.list()
      ]);
      const filtro = (r) => numRetiro !== null ? r.numero_retiro === numRetiro : true;
      const camsConf = cams.filter(c => filtro(c) && c.estado === "Confirmado").length;
      const servsConf = servs.filter(s => filtro(s) && s.estado === "Confirmado").length;
      setInscritos(camsConf + servsConf);
    } catch (e) {
      console.error(e);
    }
  }, [numRetiro]);

  const cargarIngredientes = useCallback(async (menuId) => {
    try {
      const ings = await base44.entities.IngredienteMenu.filter({ menu_id: menuId });
      setIngredientes(ings);
    } catch (e) {
      console.error(e);
      setIngredientes([]);
    }
  }, []);

  useEffect(() => {
    cargarMenus();
    cargarInscritos();
  }, [cargarMenus, cargarInscritos]);

  useEffect(() => {
    if (menuActivo) {
      cargarIngredientes(menuActivo.id);
    } else {
      setIngredientes([]);
    }
  }, [menuActivo, cargarIngredientes]);

  // Personas a usar para el cálculo
  const getNumPersonas = (menu) => {
    if (!menu) return 0;
    if (menu.usar_inscritos === false && menu.num_personas) return menu.num_personas;
    return inscritos;
  };

  // ── CRUD Menús ──
  const guardarMenu = async (data, id) => {
    const payload = { ...data, numero_retiro: numRetiro ?? undefined };
    try {
      if (id) {
        await base44.entities.MenuRetiro.update(id, payload);
        toast.success("Menú actualizado");
      } else {
        await base44.entities.MenuRetiro.create(payload);
        toast.success("Menú creado");
      }
      setMostrarFormMenu(false);
      setEditandoMenu(null);
      cargarMenus();
    } catch (e) {
      toast.error("Error al guardar el menú");
    }
  };

  const eliminarMenu = async (menu) => {
    if (!confirm(`¿Eliminar el menú "${menu.nombre}" y todos sus productos?`)) return;
    try {
      const ings = await base44.entities.IngredienteMenu.filter({ menu_id: menu.id });
      await Promise.all(ings.map(i => base44.entities.IngredienteMenu.delete(i.id)));
      await base44.entities.MenuRetiro.delete(menu.id);
      toast.success("Menú eliminado");
      if (menuActivo?.id === menu.id) setMenuActivo(null);
      cargarMenus();
    } catch (e) {
      toast.error("Error al eliminar el menú");
    }
  };

  // ── CRUD Ingredientes ──
  const guardarIngrediente = async (data, id) => {
    try {
      if (id) {
        await base44.entities.IngredienteMenu.update(id, data);
        toast.success("Producto actualizado");
      } else {
        await base44.entities.IngredienteMenu.create(data);
        toast.success("Producto agregado");
      }
      setMostrarFormIng(false);
      setEditandoIng(null);
      cargarIngredientes(menuActivo.id);
      recalcularTotalMenu();
    } catch (e) {
      toast.error("Error al guardar el producto");
    }
  };

  const eliminarIngrediente = async (ing) => {
    if (!confirm(`¿Eliminar "${ing.nombre}"?`)) return;
    try {
      await base44.entities.IngredienteMenu.delete(ing.id);
      toast.success("Producto eliminado");
      cargarIngredientes(menuActivo.id);
      recalcularTotalMenu();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const recalcularTotalMenu = async () => {
    if (!menuActivo) return;
    const numPers = getNumPersonas(menuActivo);
    const total = ingredientes.reduce((s, ing) => s + (ing.cantidad_por_persona || 0) * numPers * (ing.costo_unitario || 0), 0);
    try {
      await base44.entities.MenuRetiro.update(menuActivo.id, { total_estimado: total });
    } catch (e) { /* no crítico */ }
  };

  // Totales del menú activo
  const numPersonasActivo = getNumPersonas(menuActivo);
  const totalEstimadoActivo = ingredientes.reduce((s, ing) =>
    s + (ing.cantidad_por_persona || 0) * numPersonasActivo * (ing.costo_unitario || 0), 0);

  if (loading) {
    return <div className="py-20 text-center text-amber-600">Cargando menús...</div>;
  }

  // ── Vista: Lista de menús ──
  if (!menuActivo) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5" /> Menús del Retiro
            </h2>
            <p className="text-amber-600 text-sm mt-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {inscritos} inscrito(s) confirmado(s) — base para el cálculo
            </p>
          </div>
          <button
            onClick={() => { setEditandoMenu(null); setMostrarFormMenu(true); }}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow"
          >
            <PlusCircle className="w-4 h-4" /> Crear Menú
          </button>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium">No hay menús creados</p>
            <p className="text-sm mt-1">Crea un menú para calcular los productos necesarios según los inscritos.</p>
            <button onClick={() => setMostrarFormMenu(true)}
              className="mt-4 bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-800">
              Crear Primer Menú
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map(m => {
              const numPers = getNumPersonas(m);
              return (
                <div key={m.id}
                  className="bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
                  onClick={() => setMenuActivo(m)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{m.tipo}</span>
                        <p className="font-bold text-amber-900 leading-tight mt-1.5">{m.nombre}</p>
                        {m.fecha && <p className="text-xs text-gray-400 mt-0.5">{m.fecha}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setEditandoMenu(m); setMostrarFormMenu(true); }}
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); eliminarMenu(m); }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center mt-3">
                      <div className="bg-amber-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">Personas</p>
                        <p className="text-sm font-bold text-amber-700 flex items-center justify-center gap-1">
                          <Users className="w-3 h-3" /> {numPers}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">Total Estimado</p>
                        <p className="text-sm font-bold text-green-700">{fmt(m.total_estimado || 0)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-amber-50 pt-3 mt-3">
                      <span className="text-xs text-amber-600 group-hover:font-semibold transition-all">
                        Ver productos <Calculator className="w-3 h-3 inline" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mostrarFormMenu && (
          <MenuForm
            menu={editandoMenu}
            inscritos={inscritos}
            onGuardado={guardarMenu}
            onCerrar={() => { setMostrarFormMenu(false); setEditandoMenu(null); }}
          />
        )}
      </div>
    );
  }

  // ── Vista: Detalle del menú activo ──
  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <button onClick={() => setMenuActivo(null)}
            className="mt-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{menuActivo.tipo}</span>
              {menuActivo.fecha && <span className="text-xs text-gray-400">{menuActivo.fecha}</span>}
            </div>
            <h1 className="text-xl font-bold text-amber-900 leading-tight mt-1">{menuActivo.nombre}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => guardedPrint(() => imprimirMenu(menuActivo, ingredientes, numPersonasActivo, configRetiro))}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir Lista
          </button>
          <button
            onClick={() => { setEditandoMenu(menuActivo); setMostrarFormMenu(true); }}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button
            onClick={() => { setEditandoIng(null); setMostrarFormIng(true); }}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow"
          >
            <PlusCircle className="w-4 h-4" /> Agregar Producto
          </button>
        </div>
      </div>

      {/* Resumen de cálculo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Personas</p>
          <p className="text-xl font-bold text-blue-700">{numPersonasActivo}</p>
          <p className="text-xs text-gray-400">
            {menuActivo.usar_inscritos === false ? "(manual)" : "(inscritos)"}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Productos</p>
          <p className="text-xl font-bold text-amber-700">{ingredientes.length}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center col-span-2 sm:col-span-2">
          <p className="text-xs text-gray-500">Total Estimado del Menú</p>
          <p className="text-2xl font-bold text-green-700">{fmt(totalEstimadoActivo)}</p>
        </div>
      </div>

      {/* Tabla de productos con cálculo */}
      {ingredientes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Agrega productos al menú para ver el cálculo automático.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-amber-50 border-b border-amber-100">
              <tr>
                <th className="text-left px-4 py-3 text-amber-700 font-semibold">Producto</th>
                <th className="text-center px-3 py-3 text-amber-700 font-semibold">Por Persona</th>
                <th className="text-center px-3 py-3 text-amber-700 font-semibold">Total Necesario</th>
                <th className="text-right px-3 py-3 text-amber-700 font-semibold">Costo Unit.</th>
                <th className="text-right px-3 py-3 text-amber-700 font-semibold">Costo Total</th>
                <th className="text-center px-3 py-3 text-amber-700 font-semibold hidden md:table-cell">Suplidor</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ing, i) => {
                const total = (ing.cantidad_por_persona || 0) * numPersonasActivo;
                const costo = total * (ing.costo_unitario || 0);
                return (
                  <tr key={ing.id} className={`${i % 2 === 0 ? "bg-white" : "bg-amber-50/40"} border-b border-amber-50`}>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{ing.nombre}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 text-xs">
                      {fmtNum(ing.cantidad_por_persona)} <span className="text-gray-400">{ing.unidad}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-amber-800 font-bold text-xs">
                      {fmtNum(total)} <span className="text-gray-400 font-normal">{ing.unidad}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600 text-xs">{fmt(ing.costo_unitario)}</td>
                    <td className="px-3 py-2.5 text-right text-green-700 font-bold">{fmt(costo)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-400 text-xs hidden md:table-cell">{ing.suplidor_nombre || "—"}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditandoIng(ing); setMostrarFormIng(true); }}
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => eliminarIngrediente(ing)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-amber-200 bg-amber-50">
                <td colSpan="4" className="px-4 py-3 font-bold text-gray-700 text-right">TOTAL ESTIMADO</td>
                <td className="px-3 py-3 text-right font-bold text-green-700 text-base">{fmt(totalEstimadoActivo)}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {mostrarFormMenu && (
        <MenuForm
          menu={editandoMenu}
          inscritos={inscritos}
          onGuardado={guardarMenu}
          onCerrar={() => { setMostrarFormMenu(false); setEditandoMenu(null); }}
        />
      )}

      {mostrarFormIng && (
        <IngredienteForm
          ingrediente={editandoIng}
          onGuardado={guardarIngrediente}
          onCerrar={() => { setMostrarFormIng(false); setEditandoIng(null); }}
        />
      )}
    </div>
  );
}

// ── Formulario de Menú ──
function MenuForm({ menu, inscritos, onGuardado, onCerrar }) {
  const [form, setForm] = useState({
    nombre: menu?.nombre || "",
    tipo: menu?.tipo || "Almuerzo",
    fecha: menu?.fecha || "",
    usar_inscritos: menu?.usar_inscritos !== false,
    num_personas: menu?.num_personas || inscritos || 0,
    notas: menu?.notas || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    onGuardado({
      ...form,
      num_personas: form.usar_inscritos ? inscritos : Number(form.num_personas) || 0,
    }, menu?.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
          <h3 className="font-bold text-amber-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5" /> {menu ? "Editar Menú" : "Crear Menú"}
          </h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Nombre del Menú *</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Almuerzo Sábado"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Tipo</label>
              <MobileSelect
                value={form.tipo}
                onChange={(v) => setForm({ ...form, tipo: v })}
                options={TIPOS.map(t => ({ value: t, label: t }))}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.usar_inscritos} onChange={e => setForm({ ...form, usar_inscritos: e.target.checked })}
                className="rounded border-blue-300 text-blue-700 focus:ring-blue-500 w-4 h-4" />
              <span className="text-sm font-semibold text-blue-800">Usar inscritos confirmados ({inscritos} personas)</span>
            </label>
            {!form.usar_inscritos && (
              <div className="mt-2">
                <label className="block text-xs font-semibold text-blue-800 mb-1">Cantidad manual de personas</label>
                <input type="number" min="0" value={form.num_personas}
                  onChange={e => setForm({ ...form, num_personas: e.target.value })}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
              placeholder="Observaciones del menú..."
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <PlusCircle className="w-4 h-4" /> {menu ? "Guardar" : "Crear Menú"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Formulario de Ingrediente/Producto ──
function IngredienteForm({ ingrediente, onGuardado, onCerrar }) {
  const [form, setForm] = useState({
    nombre: ingrediente?.nombre || "",
    cantidad_por_persona: ingrediente?.cantidad_por_persona || "",
    unidad: ingrediente?.unidad || "unidad",
    costo_unitario: ingrediente?.costo_unitario || "",
    suplidor_nombre: ingrediente?.suplidor_nombre || "",
    notas: ingrediente?.notas || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    onGuardado({
      nombre: form.nombre,
      cantidad_por_persona: Number(form.cantidad_por_persona) || 0,
      unidad: form.unidad,
      costo_unitario: Number(form.costo_unitario) || 0,
      suplidor_nombre: form.suplidor_nombre,
      notas: form.notas,
    }, ingrediente?.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
          <h3 className="font-bold text-amber-900 flex items-center gap-2">
            <Utensils className="w-5 h-5" /> {ingrediente ? "Editar Producto" : "Agregar Producto"}
          </h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Producto / Ingrediente *</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Arroz, Pollo, Pan, Agua 5L"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Cant. por persona</label>
              <input type="number" step="0.01" min="0" value={form.cantidad_por_persona}
                onChange={e => setForm({ ...form, cantidad_por_persona: e.target.value })}
                placeholder="0.5"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Unidad</label>
              <input value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}
                placeholder="libra, onza, unidad"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-800 mb-1">Costo Unit. (RD$)</label>
              <input type="number" step="0.01" min="0" value={form.costo_unitario}
                onChange={e => setForm({ ...form, costo_unitario: e.target.value })}
                placeholder="0.00"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Suplidor (opcional)</label>
            <input value={form.suplidor_nombre} onChange={e => setForm({ ...form, suplidor_nombre: e.target.value })}
              placeholder="Nombre del suplidor"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <PlusCircle className="w-4 h-4" /> {ingrediente ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}