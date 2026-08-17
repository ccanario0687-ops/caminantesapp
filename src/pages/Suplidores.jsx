import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PROVINCIAS_RD } from "@/utils/provincias";
import { formatTelefono } from "@/utils/formatters";
import useOffline from "@/hooks/useOffline";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";
import { PlusCircle, Search, Pencil, Trash2, MapPin, Printer, ChevronDown, ChevronRight, Phone, Mail, Eye, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import ImpresionSuplidorModal from "@/components/suplidores/ImpresionSuplidorModal";
import SuplidorDetalle from "@/components/suplidores/SuplidorDetalle";

const RENGLONES = [
  "Bebidas y Alimentos", "Logística", "Sonido y Audiovisual", "Papelería",
  "Transporte", "Imprenta", "Uniformes", "Decoración", "Tecnología", "Otro"
];

const RENGLON_META = {
  "Bebidas y Alimentos": { color: "bg-green-100 text-green-700 border-green-200", icon: "🍽️", header: "bg-green-700" },
  "Logística":           { color: "bg-blue-100 text-blue-700 border-blue-200",   icon: "📦", header: "bg-blue-700" },
  "Sonido y Audiovisual":{ color: "bg-purple-100 text-purple-700 border-purple-200", icon: "🎵", header: "bg-purple-700" },
  "Papelería":           { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "📄", header: "bg-yellow-600" },
  "Transporte":          { color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🚐", header: "bg-orange-600" },
  "Imprenta":            { color: "bg-pink-100 text-pink-700 border-pink-200",   icon: "🖨️", header: "bg-pink-600" },
  "Uniformes":           { color: "bg-cyan-100 text-cyan-700 border-cyan-200",   icon: "👕", header: "bg-cyan-700" },
  "Decoración":          { color: "bg-rose-100 text-rose-700 border-rose-200",   icon: "🎨", header: "bg-rose-600" },
  "Tecnología":          { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: "💻", header: "bg-indigo-700" },
  "Otro":                { color: "bg-gray-100 text-gray-700 border-gray-200",   icon: "📋", header: "bg-gray-600" },
};

const FORM_EMPTY = { nombre: "", contacto: "", telefono: "", provincia: "", renglon: "Otro", producto_servicio: "", email: "", direccion: "", notas: "" };

function imprimirDirectorio(suplidores) {
  const porRenglon = RENGLONES.reduce((acc, r) => {
    const lista = suplidores.filter(s => (s.renglon || "Otro") === r);
    if (lista.length > 0) acc[r] = lista;
    return acc;
  }, {});

  const secciones = Object.entries(porRenglon).map(([renglon, lista]) => {
    const meta = RENGLON_META[renglon] || RENGLON_META["Otro"];
    const filas = lista.map(s => `
      <tr>
        <td class="font-semibold">${s.nombre}</td>
        <td>${s.contacto || "—"}</td>
        <td>${s.telefono || "—"}</td>
        <td>${s.email || "—"}</td>
        <td>${s.provincia || "—"}</td>
        <td>${s.producto_servicio || "—"}</td>
      </tr>`).join("");
    return `
      <div class="avoid-break" style="margin-bottom:18px">
        <div class="section-title">${meta.icon} ${renglon} <span style="font-weight:400;font-size:9px;color:#888;margin-left:8px">${lista.length} suplidor(es)</span></div>
        <table class="print-table">
          <thead><tr>
            <th>Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Provincia</th><th>Servicio</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
  }).join("");

  const body = `
    ${printHeaderHTML({ titulo: "Directorio de Suplidores", total: suplidores.length })}
    ${secciones}
    ${printFooterHTML()}
  `;

  openPrintWindow(buildPrintDoc("Directorio de Suplidores", body, `
    .section-title { font-size:12px; font-weight:700; color:#1a1a2e; margin:18px 0 8px 0; padding:5px 10px; border-left:3px solid #1a1a2e; background:#f9fafb; text-transform:uppercase; letter-spacing:0.5px; }
  `));
}

export default function Suplidores() {
  const { records: suplidores, loading, online, create, update, remove } = useOffline("Suplidor");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRenglon, setFiltroRenglon] = useState("");
  const [filtroProvincia, setFiltroProvincia] = useState("");
  const [orden, setOrden] = useState("alfabetico");
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [expandidos, setExpandidos] = useState({});
  const [form, setForm] = useState(FORM_EMPTY);

  const provincias = [...new Set(suplidores.map(s => s.provincia).filter(Boolean))].sort();

  const filtrados = suplidores.filter(s => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !busqueda ||
      s.nombre?.toLowerCase().includes(q) ||
      s.producto_servicio?.toLowerCase().includes(q) ||
      s.contacto?.toLowerCase().includes(q) ||
      s.provincia?.toLowerCase().includes(q);
    const coincideRenglon = !filtroRenglon || s.renglon === filtroRenglon;
    const coincideProv = !filtroProvincia || s.provincia === filtroProvincia;
    return coincideBusqueda && coincideRenglon && coincideProv;
  }).sort((a, b) =>
    orden === "alfabetico" ? (a.nombre || "").localeCompare(b.nombre || "", "es") : 0
  );

  const porRenglon = RENGLONES.reduce((acc, r) => {
    const lista = filtrados.filter(s => (s.renglon || "Otro") === r);
    if (lista.length > 0) acc[r] = lista;
    return acc;
  }, {});

  const toggleExpandido = (r) => setExpandidos(prev => ({ ...prev, [r]: prev[r] === false ? true : false }));
  const isExpandido = (r) => expandidos[r] !== false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "telefono" ? formatTelefono(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.provincia || !form.producto_servicio) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    if (editando) {
      await update(editando.id, form);
      toast.success(online ? "Suplidor actualizado" : "Suplidor actualizado (local)");
    } else {
      await create(form);
      toast.success(online ? "Suplidor registrado" : "Suplidor registrado (local)");
    }
    cerrarForm();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este suplidor?")) return;
    await remove(id);
    toast.success(online ? "Suplidor eliminado" : "Suplidor eliminado (local)");
    setDetalle(null);
  };

  const abrirEdicion = (suplidor) => {
    setForm(suplidor);
    setEditando(suplidor);
    setDetalle(null);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // Dashboard: conteos por renglón (todos los suplidores, sin filtrar)
  const conteosPorRenglon = RENGLONES.map(r => ({
    renglon: r,
    count: suplidores.filter(s => (s.renglon || "Otro") === r).length,
    meta: RENGLON_META[r] || RENGLON_META["Otro"],
  })).filter(x => x.count > 0);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-amber-900">Directorio de Suplidores</h1>
            {online ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Wifi className="w-3 h-3" /> Online</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><WifiOff className="w-3 h-3" /> Offline</span>
            )}
          </div>
          <p className="text-amber-600 text-sm mt-1">{suplidores.length} suplidor(es) en {conteosPorRenglon.length} categoría(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => imprimirDirectorio(filtrados)}
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir Directorio
          </button>
          <button
            onClick={() => { setMostrarForm(true); setEditando(null); }}
            className="flex items-center gap-2 bg-amber-700 text-white hover:bg-amber-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Suplidor
          </button>
        </div>
      </div>

      {/* Dashboard por categorías */}
      {!loading && conteosPorRenglon.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          {conteosPorRenglon.map(({ renglon, count, meta }) => (
            <button
              key={renglon}
              onClick={() => setFiltroRenglon(filtroRenglon === renglon ? "" : renglon)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all text-sm font-semibold shadow-sm ${
                filtroRenglon === renglon
                  ? "border-amber-600 bg-amber-50 scale-[1.02]"
                  : "bg-white border-transparent hover:border-amber-200"
              }`}
            >
              <span className="text-2xl">{meta.icon}</span>
              <span className="text-xs text-gray-600 font-medium leading-tight">{renglon}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${meta.color}`}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
          <input type="text" placeholder="Buscar por nombre, contacto, producto o provincia..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
        </div>
        <select value={filtroRenglon} onChange={e => setFiltroRenglon(e.target.value)}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Todas las categorías</option>
          {RENGLONES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroProvincia} onChange={e => setFiltroProvincia(e.target.value)}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="">Todas las provincias</option>
          {provincias.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={orden} onChange={e => setOrden(e.target.value)}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="alfabetico">Ordenar Alfabéticamente</option>
        </select>
        {(filtroRenglon || filtroProvincia || busqueda) && (
          <button onClick={() => { setFiltroRenglon(""); setFiltroProvincia(""); setBusqueda(""); }}
            className="text-sm text-amber-600 hover:text-amber-800 px-3 py-2 border border-amber-200 rounded-lg hover:bg-amber-50">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <p className="text-amber-600 text-sm">Cargando suplidores...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>No se encontraron suplidores.</p>
          {(busqueda || filtroRenglon || filtroProvincia) && (
            <p className="text-sm mt-1">Intenta ajustar los filtros de búsqueda.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(porRenglon).map(([renglon, lista]) => {
            const meta = RENGLON_META[renglon] || RENGLON_META["Otro"];
            const expandido = isExpandido(renglon);
            return (
              <div key={renglon} className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                {/* Cabecera de categoría */}
                <button onClick={() => toggleExpandido(renglon)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors select-none">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <span className="font-bold text-gray-800 text-sm">{renglon}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                      {lista.length}
                    </span>
                  </div>
                  {expandido
                    ? <ChevronDown className="w-4 h-4 text-amber-500" />
                    : <ChevronRight className="w-4 h-4 text-amber-500" />
                  }
                </button>

                {/* Tarjetas de suplidores */}
                {expandido && (
                  <div className="border-t border-amber-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                    {lista.map(s => (
                      <div key={s.id}
                        className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
                        onClick={() => setDetalle(s)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-bold text-amber-900 text-sm leading-tight line-clamp-2 flex-1">{s.nombre}</p>
                          <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-1">
                          {s.contacto && (
                            <p className="text-xs text-gray-500 truncate">👤 {s.contacto}</p>
                          )}
                          {s.telefono && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-amber-400" /> {s.telefono}
                            </p>
                          )}
                          {s.provincia && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-400" /> {s.provincia}
                            </p>
                          )}
                          {s.producto_servicio && (
                            <p className="text-xs text-gray-400 italic truncate mt-1">{s.producto_servicio}</p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-amber-100">
                          <button onClick={e => { e.stopPropagation(); abrirEdicion(s); }}
                            className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-100 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); eliminar(s.id); }}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setImprimiendo(s); }}
                            className="text-amber-500 hover:text-amber-700 p-1 rounded hover:bg-amber-100 transition-colors">
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {detalle && (
        <SuplidorDetalle
          suplidor={detalle}
          onClose={() => setDetalle(null)}
          onEditar={(s) => { setDetalle(null); abrirEdicion(s); }}
          onEliminar={eliminar}
          onImprimir={(s) => { setDetalle(null); setImprimiendo(s); }}
        />
      )}

      {/* Modal imprimir ficha individual */}
      {imprimiendo && (
        <ImpresionSuplidorModal
          suplidor={imprimiendo}
          onClose={() => setImprimiendo(null)}
        />
      )}

      {/* Modal formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold">{editando ? "Editar" : "Registrar"} Suplidor</h2>
              <button onClick={cerrarForm} className="hover:opacity-75">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Empresa *</label>
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Contacto</label>
                  <input type="text" name="contacto" value={form.contacto} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Teléfono</label>
                  <input type="text" name="telefono" value={form.telefono} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Categoría / Renglón *</label>
                  <select name="renglon" value={form.renglon} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {RENGLONES.map(r => <option key={r} value={r}>{RENGLON_META[r]?.icon} {r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Provincia *</label>
                  <select name="provincia" value={form.provincia} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Seleccionar...</option>
                    {PROVINCIAS_RD.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Dirección</label>
                <input type="text" name="direccion" value={form.direccion} onChange={handleChange}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Producto / Servicio *</label>
                <textarea name="producto_servicio" value={form.producto_servicio} onChange={handleChange} rows={2}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Notas</label>
                <textarea name="notas" value={form.notas} onChange={handleChange} rows={2}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarForm}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}