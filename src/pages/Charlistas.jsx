import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { formatTelefono } from "@/utils/formatters";
import useOffline from "@/hooks/useOffline";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";
import { PlusCircle, Search, Pencil, Trash2, CheckCircle, Clock, Printer, X, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import ImpresionCharlista from "@/components/charlistas/ImpresionCharlista";
import MobileSelect from "@/components/MobileSelect";
import MobileTopBar from "@/components/MobileTopBar";
import usePrintGuard from "@/hooks/usePrintGuard";

export default function Charlistas() {
  const { records: charlistas, loading, online, create, update, remove, reload } = useOffline("Charlista");
  const { guardedPrint } = usePrintGuard();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [orden, setOrden] = useState("alfabetico");
  const [numeroRetiro, setNumeroRetiro] = useState("");
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    profesion: "",
    email: "",
    telefono: "",
    parroquia: "",
    temas: "",
    experiencia: "",
    fecha_charla: "",
    hora_charla: "",
    duracion_minutos: "",
    estado: "Pendiente",
    notas: ""
  });

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        const ed = cfgs[0].edicion ? String(cfgs[0].edicion) : "";
        setNumeroRetiro(ed);
        setFiltroRetiro(ed);
      }
    }).catch(() => {});
  }, []);

  const filtrados = charlistas.filter(c => {
    const coincideBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.profesion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.temas?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = !filtroEstado || c.estado === filtroEstado;
    const coincideRetiro = !filtroRetiro || String(c.numero_retiro) === filtroRetiro;
    return coincideBusqueda && coincideEstado && coincideRetiro;
  }).sort((a, b) =>
    orden === "alfabetico" ? (a.nombre || "").localeCompare(b.nombre || "", "es") : 0
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formatted = name === "telefono" ? formatTelefono(value) : value;
    setForm({ ...form, [name]: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const data = {
      ...form,
      numero_retiro: form.numero_retiro ? Number(form.numero_retiro) : undefined,
      duracion_minutos: form.duracion_minutos ? Number(form.duracion_minutos) : undefined
    };
    if (editando) {
      await update(editando.id, data);
      toast.success(online ? "Charlista actualizado" : "Charlista actualizado (local)");
    } else {
      await create(data);
      toast.success(online ? "Charlista registrado" : "Charlista registrado (local)");
    }
    cerrarForm();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este charlista?")) return;
    await remove(id);
    toast.success(online ? "Charlista eliminado" : "Charlista eliminado (local)");
  };

  const abrirEdicion = (charlista) => {
    setForm(charlista);
    setEditando(charlista);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setForm({ nombre: "", profesion: "", email: "", telefono: "", parroquia: "", temas: "", experiencia: "", numero_retiro: filtroRetiro || "", fecha_charla: "", hora_charla: "", duracion_minutos: "", estado: "Pendiente", notas: "" });
  };

  const estadoColor = (estado) => {
    if (estado === "Confirmado") return "bg-green-100 text-green-700";
    if (estado === "Cancelado") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div>
      <MobileTopBar title="Charlistas" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-amber-900">Charlistas y Conferencistas</h1>
            {online ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Wifi className="w-3 h-3" /> Online</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><WifiOff className="w-3 h-3" /> Offline</span>
            )}
          </div>
          <p className="text-amber-600 text-sm mt-1">{charlistas.length} charlista(s) registrado(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => guardedPrint(() => setImprimiendo("reporte"))}
            className="flex items-center gap-2 bg-amber-700 text-white hover:bg-amber-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow">
            <Printer className="w-4 h-4" />
            Reporte
          </button>
          <button onClick={() => { setMostrarForm(true); setEditando(null); }}
            className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow border border-amber-200">
            <PlusCircle className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
          <input type="text" placeholder="Buscar por nombre, profesión o temas..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
        </div>
        <MobileSelect
          value={filtroEstado}
          onChange={setFiltroEstado}
          options={[{ value: "", label: "Todos los estados" }, { value: "Confirmado", label: "Confirmado" }, { value: "Pendiente", label: "Pendiente" }, { value: "Cancelado", label: "Cancelado" }]}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <MobileSelect
          value={orden}
          onChange={setOrden}
          options={[{ value: "alfabetico", label: "Ordenar Alfabéticamente" }]}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Tabla */}
      {loading ? <p className="text-amber-600 text-sm">Cargando...</p> : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎤</p>
          <p>No se encontraron charlistas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-700 text-white">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Profesión</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Charla</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-amber-50"}>
                    <td className="px-4 py-3 font-medium text-amber-900">{c.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{c.profesion || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">{c.fecha_charla ? `${c.fecha_charla} ${c.hora_charla || ""}` : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{c.telefono || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor(c.estado)}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEdicion(c)} className="text-amber-600 hover:text-amber-800">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminar(c.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => guardedPrint(() => setImprimiendo(c))} className="text-amber-500 hover:text-amber-700">
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {imprimiendo === "reporte" && (
        <ReporteCharlistas charlistas={filtrados} onClose={() => setImprimiendo(null)} />
      )}

      {imprimiendo && imprimiendo !== "reporte" && (
        <ImpresionCharlista
          charlista={imprimiendo}
          onClose={() => setImprimiendo(null)}
        />
      )}

      {/* Modal */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold">{editando ? "Editar" : "Registrar"} Charlista</h2>
              <button onClick={cerrarForm} className="hover:opacity-75">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Nombre *</label>
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Profesión</label>
                  <input type="text" name="profesion" value={form.profesion} onChange={handleChange}
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
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Parroquia</label>
                <input type="text" name="parroquia" value={form.parroquia} onChange={handleChange}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Temas</label>
                <textarea name="temas" value={form.temas} onChange={handleChange} rows={2}
                  placeholder="Temas sobre los que puede hablar"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Experiencia</label>
                <textarea name="experiencia" value={form.experiencia} onChange={handleChange} rows={2}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Fecha de Charla</label>
                  <input type="date" name="fecha_charla" value={form.fecha_charla} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Hora de Charla</label>
                  <input type="time" name="hora_charla" value={form.hora_charla} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Duración (minutos)</label>
                  <input type="number" name="duracion_minutos" value={form.duracion_minutos} onChange={handleChange}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Estado</label>
                  <MobileSelect
                    name="estado"
                    value={form.estado}
                    onChange={(v) => handleChange({ target: { name: "estado", value: v } })}
                    options={[{ value: "Pendiente", label: "Pendiente" }, { value: "Confirmado", label: "Confirmado" }, { value: "Cancelado", label: "Cancelado" }]}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarForm} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium">
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

function ReporteCharlistas({ charlistas, onClose }) {
  const handlePrint = () => {
    const filas = charlistas.map(c => `
      <tr>
        <td class="font-semibold">${c.nombre}</td>
        <td>${c.profesion || "—"}</td>
        <td class="text-center">${c.fecha_charla || "—"}</td>
        <td class="text-center">${c.hora_charla || "—"}</td>
        <td class="text-center">${c.duracion_minutos ? c.duracion_minutos + " min" : "—"}</td>
        <td><span class="badge ${c.estado === 'Confirmado' ? 'badge-success' : c.estado === 'Cancelado' ? 'badge-danger' : 'badge-warning'}">${c.estado}</span></td>
      </tr>
    `).join("");

    const body = `
      ${printHeaderHTML({ titulo: "Reporte de Charlistas", total: charlistas.length })}
      <table class="print-table">
        <thead><tr>
          <th>Nombre</th><th>Profesión</th><th class="text-center">Fecha Charla</th><th class="text-center">Hora</th><th class="text-center">Duración</th><th>Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      ${printFooterHTML()}
    `;

    const html = buildPrintDoc("Reporte de Charlistas", body);
    openPrintWindow(html);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <h2 className="text-lg font-bold">Reporte de Charlistas</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">Se imprimirá un reporte completo con todos los charlistas registrados.</p>
          <p className="text-xs text-gray-500 mb-4">{charlistas.length} charlista(s)</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
              Cancelar
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}