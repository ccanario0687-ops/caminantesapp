import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Check, X, MessageSquare, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import { puedeVer, puedeEditar } from "@/lib/permisos";
import { registrarAuditoria } from "@/lib/auditoria";

const ESTADOS_COLOR = {
  Pendiente: "bg-amber-100 text-amber-700 font-bold",
  Aprobado: "bg-green-100 text-green-700 font-bold",
  Rechazado: "bg-red-100 text-red-700 font-bold",
  "En Contacto": "bg-blue-100 text-blue-700 font-bold",
};

const PLANES_COLOR = {
  Gratuito: "bg-gray-100 text-gray-600 font-bold",
  Básico: "bg-amber-100 text-amber-700 font-bold",
  Premium: "bg-purple-100 text-purple-700 font-bold",
};

export default function GestionSolicitudes() {
  const { user } = useAuth();
  const { comunidadActual } = useComunidad();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("Pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [procesando, setProcesando] = useState(null);

  const tieneAcceso = puedeVer(user, "solicitudes");
  const puedeModificar = puedeEditar(user, "solicitudes");

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SolicitudAcceso.list("-created_date");
      setSolicitudes(data || []);
    } catch (e) {
      toast.error("Error cargando solicitudes de acceso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtradas = solicitudes.filter(s => {
    const matchEstado = !filtroEstado || s.estado === filtroEstado;
    const matchBusqueda = !busqueda ||
      s.nombre_comunidad?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.nombre_contacto?.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const pendientes = solicitudes.filter(s => s.estado === "Pendiente").length;

  const cambiarEstado = async (s, estado, notas = "") => {
    setProcesando(s.id);
    await base44.entities.SolicitudAcceso.update(s.id, { estado, notas_admin: notas });
    setSolicitudes(prev => prev.map(x => x.id === s.id ? { ...x, estado, notas_admin: notas } : x));
    
    registrarAuditoria({
      usuario: user,
      accion: `Cambio Estado Solicitud (${estado})`,
      entidad: "SolicitudAcceso",
      detalles: `Solicitud de ${s.nombre_contacto} (${s.nombre_comunidad} - ${s.email}) actualizada a ${estado}`,
      equipo_id: comunidadActual?.equipo_id
    });

    toast.success(`Solicitud actualizada a: ${estado}`);
    setProcesando(null);
    setDetalle(null);
  };

  // Provisiona una nueva comunidad: crea el equipo aislado, invita al coordinador
  // como admin de su propio entorno limpio y marca la solicitud como Aprobada.
  const aprobarYProvisionar = async (s) => {
    setProcesando(s.id);
    try {
      const res = await base44.functions.invoke("gestionUsuarios", {
        action: "provisionarComunidad",
        solicitud_id: s.id,
      });
      if (res?.data?.ok) {
        registrarAuditoria({
          usuario: user,
          accion: "Aprobar y Provisionar Comunidad",
          entidad: "SolicitudAcceso",
          detalles: `Comunidad "${res.data.nombre_equipo}" provisionada exitosamente. Invitación enviada a ${s.email}`,
          equipo_id: res.data.equipo_id || comunidadActual?.equipo_id
        });

        toast.success(`Comunidad provisionada: ${res.data.nombre_equipo}. Invitación enviada a ${s.email}.`);
        cargar();
      } else {
        toast.error(res?.data?.error || "Error al provisionar la comunidad.");
      }
    } catch (e) {
      toast.error(e?.message || "Error al provisionar la comunidad.");
    }
    setProcesando(null);
    setDetalle(null);
  };

  if (loading) return (
    <div className="py-20 text-center text-amber-600">
      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
      Cargando solicitudes...
    </div>
  );

  if (!tieneAcceso) return (
    <div className="py-16 text-center text-amber-800 max-w-md mx-auto">
      <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-3" />
      <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
      <p className="text-sm text-amber-700">
        No tienes permisos para visualizar o aprobar solicitudes de ingreso de nuevos usuarios. Contacta al administrador para otorgar el permiso de <strong>"Aprobar Usuarios / Solicitudes"</strong>.
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Solicitudes de Acceso</h1>
          <p className="text-amber-600 text-sm mt-1">
            {pendientes} pendiente(s) · {solicitudes.length} total
          </p>
        </div>
        <a href="/landing" target="_blank"
          className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-100 font-medium">
          Ver página pública →
        </a>
      </div>

      {/* Resumen por plan */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {["Gratuito", "Básico", "Premium"].map(plan => {
          const count = solicitudes.filter(s => s.plan_solicitado === plan).length;
          return (
            <div key={plan} className="bg-white rounded-xl border border-amber-100 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-800">{count}</p>
              <p className="text-xs text-amber-600 font-medium">{plan}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
          <input type="text" placeholder="Buscar por comunidad, email o contacto..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "Pendiente", "En Contacto", "Aprobado", "Rechazado"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filtroEstado === e ? "bg-amber-700 text-white" : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
              {e || "Todos"}
              {e === "Pendiente" && pendientes > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendientes}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>No hay solicitudes {filtroEstado.toLowerCase()} en este momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-amber-900 text-amber-100 uppercase text-[10px] font-black tracking-wider border-b border-amber-800">
                <tr>
                  <th className="py-3 px-4">Comunidad / Retiro</th>
                  <th className="py-3 px-4">Contacto & Email</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium text-slate-700">
                {filtradas.map(s => (
                  <tr key={s.id} className="hover:bg-amber-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.nombre_comunidad}
                      {s.pais && <p className="text-[10px] text-gray-500 font-normal">{s.pais}{s.ciudad ? ` · ${s.ciudad}` : ""}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{s.nombre_contacto}</p>
                      <p className="text-[11px] text-amber-700">{s.email} {s.telefono ? `· ${s.telefono}` : ""}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${PLANES_COLOR[s.plan_solicitado] || "bg-gray-100 text-gray-600"}`}>
                        {s.plan_solicitado}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${ESTADOS_COLOR[s.estado] || "bg-gray-100 text-gray-600"}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(s.created_date).toLocaleDateString("es-ES")}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setDetalle(s)} className="text-amber-700 hover:text-amber-900 text-xs font-bold border border-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-50">
                          Detalle
                        </button>
                        {s.estado === "Pendiente" && (
                          <>
                            <button onClick={() => cambiarEstado(s, "En Contacto")} disabled={procesando === s.id}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-60">
                              <MessageSquare className="w-3 h-3" /> Contactar
                            </button>
                            <button onClick={() => aprobarYProvisionar(s)} disabled={procesando === s.id}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-60">
                              <Check className="w-3 h-3" /> Aprobar
                            </button>
                            <button onClick={() => cambiarEstado(s, "Rechazado")} disabled={procesando === s.id}
                              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold disabled:opacity-60">
                              <X className="w-3 h-3" /> Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detalle && (
        <DetalleModal solicitud={detalle} onClose={() => setDetalle(null)}
          onCambiarEstado={cambiarEstado} onAprobar={aprobarYProvisionar} procesando={procesando === detalle.id} />
      )}
    </div>
  );
}

function DetalleModal({ solicitud: s, onClose, onCambiarEstado, onAprobar, procesando }) {
  const [notas, setNotas] = useState(s.notas_admin || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between sticky top-0">
          <h2 className="font-bold">Solicitud — {s.nombre_comunidad}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${PLANES_COLOR[s.plan_solicitado] || "bg-gray-100"}`}>{s.plan_solicitado}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADOS_COLOR[s.estado] || "bg-gray-100"}`}>{s.estado}</span>
          </div>
          {[["Comunidad", s.nombre_comunidad], ["Contacto", s.nombre_contacto], ["Email", s.email],
            ["Teléfono", s.telefono], ["País", s.pais], ["Ciudad", s.ciudad], ["Mensaje", s.mensaje]
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-2 py-1 border-b border-gray-50">
              <span className="text-gray-400 w-28 shrink-0">{k}:</span>
              <span className="text-gray-800 font-medium">{v}</span>
            </div>
          ))}
          <p className="text-xs text-gray-400">Enviado: {new Date(s.created_date).toLocaleString("es-ES")}</p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notas internas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Notas del administrador..." />
          </div>

          <div className="flex gap-2 flex-wrap justify-end pt-2">
            {["En Contacto", "Aprobado", "Rechazado"].map(estado => (
              <button key={estado} onClick={() => estado === "Aprobado" ? onAprobar(s) : onCambiarEstado(s, estado, notas)} disabled={procesando}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60 ${
                  estado === "Aprobado" ? "bg-green-600 hover:bg-green-700" :
                  estado === "Rechazado" ? "bg-red-500 hover:bg-red-600" :
                  "bg-blue-500 hover:bg-blue-600"
                }`}>
                {estado === "En Contacto" ? <MessageSquare className="w-3 h-3" /> : estado === "Aprobado" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {estado}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}