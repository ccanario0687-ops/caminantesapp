import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Archive, Users, Heart, ChevronRight, ChevronLeft, Search, Church, 
  Printer, Download, PlusCircle, RefreshCw, FileText, DollarSign, CheckCircle
} from "lucide-react";
import MobileTopBar from "@/components/MobileTopBar";
import SelectorComunidad from "@/components/SelectorComunidad";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

// 📄 GENERADOR DEL INFORME OFICIAL EN PDF PARA IMPRESIÓN / DESCARGA
function generarPDFRetiroCompleto(h) {
  const parsear = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  const caminantes = parsear(h.caminantes);
  const servidores = parsear(h.servidores);
  const finanzas = parsear(h.movimientos || h.finanzas || h.transacciones);
  const distribucion = parsear(h.distribucion);

  const hoy = new Date().toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' });
  const esc = (str) => String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const totalIngresos = finanzas.filter(f => f.tipo === "Ingreso" || f.tipo === "ingreso").reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalEgresos = finanzas.filter(f => f.tipo === "Egreso" || f.tipo === "egreso").reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const balanceNeto = totalIngresos - totalEgresos;

  const estilosPDF = `
    @page { size: 8.5in 11in portrait; margin: 0.5in; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; background: white; margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    .header-banner { border-bottom: 3px solid #78350f; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title-main { font-size: 18px; font-weight: 800; color: #78350f; margin: 0; }
    .subtitle { font-size: 11px; color: #92400e; font-weight: 700; margin-top: 2px; }
    .section-title { font-size: 12px; font-weight: 800; color: #78350f; border-bottom: 2px solid #fde68a; padding-bottom: 4px; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
    .metric-card { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px; text-align: center; }
    .metric-val { font-size: 13px; font-weight: 800; color: #92400e; }
    .metric-lbl { font-size: 8px; font-weight: 700; color: #78350f; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; }
    th { background: #fef3c7; color: #78350f; font-weight: 800; text-align: left; padding: 5px 6px; border-bottom: 2px solid #fde68a; text-transform: uppercase; font-size: 8px; }
    td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .footer-signatures { margin-top: 35px; border-top: 1px solid #cbd5e1; pt-6; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
    .sig-line { border-top: 1.5px solid #64748b; margin-top: 30px; pt-1; font-size: 8.5px; font-weight: 700; color: #334155; }
    .page-break { page-break-before: always; }
  `;

  const filasCaminantes = caminantes.map((c, i) => `
    <tr>
      <td><strong>#${esc(c.numero_ficha || c.f || i + 1)}</strong></td>
      <td><strong>${esc(c.nombre || c.n)}</strong></td>
      <td>${esc(c.telefono || c.t || "—")}</td>
      <td>${esc(c.padrino_madrina || c.pm || "—")}</td>
      <td>${esc(c.parroquia || c.p || "—")}</td>
      <td><span class="badge ${c.estado === "Confirmado" || c.e === "Confirmado" ? "badge-success" : "badge-pending"}">${esc(c.estado || c.e || "Pendiente")}</span></td>
    </tr>
  `).join("");

  const filasServidores = servidores.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(s.nombre || s.n)}</strong></td>
      <td>${esc(s.telefono || s.t || "—")}</td>
      <td>${esc(s.rol || s.r || s.lugares_servido || "Servidor")}</td>
      <td>${esc(s.parroquia || s.p || "—")}</td>
    </tr>
  `).join("");

  const filasFinanzas = finanzas.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(f.concepto || f.descripcion || "Transacción")}</strong></td>
      <td>${esc(f.categoria || "General")}</td>
      <td><span class="badge ${f.tipo === "Ingreso" || f.tipo === "ingreso" ? "badge-success" : "badge-danger"}">${esc(f.tipo)}</span></td>
      <td><strong>RD$ ${Number(f.monto || 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong></td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Retiro #${h.numero_retiro || "1"} — ${esc(h.parroquia || "Emaús")}</title>
      <style>${estilosPDF}</style>
    </head>
    <body>
      <div class="header-banner">
        <div>
          <h1 class="title-main">✝️ RETIRO DE EMAÚS — DOSSIER COMPLETO</h1>
          <div class="subtitle">Parroquia: ${esc(h.parroquia || "General")} · Retiro #${esc(h.numero_retiro || "1")}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 800; color: #78350f;">EMITIDO EL</div>
          <div style="font-size: 11px; font-weight: 700; color: #1e293b;">${hoy}</div>
          <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Lucas 24, 13-35</div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-val">${caminantes.length}</div>
          <div class="metric-lbl">Total Caminantes</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">${servidores.length}</div>
          <div class="metric-lbl">Total Servidores</div>
        </div>
        <div class="metric-card">
          <div class="metric-val">RD$ ${totalIngresos.toLocaleString("es-DO")}</div>
          <div class="metric-lbl">Total Ingresos</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color: ${balanceNeto >= 0 ? '#166534' : '#991b1b'};">RD$ ${balanceNeto.toLocaleString("es-DO")}</div>
          <div class="metric-lbl">Balance Neto</div>
        </div>
      </div>

      <div class="section-title">1. Listado Oficial de Caminantes</div>
      <table>
        <thead>
          <tr>
            <th>Ficha</th>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Padrino / Madrina</th>
            <th>Parroquia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filasCaminantes || `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Sin registros de caminantes</td></tr>`}
        </tbody>
      </table>

      <div class="section-title">2. Listado Oficial de Servidores</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre Completo</th>
            <th>Teléfono</th>
            <th>Rol / Área de Servicio</th>
            <th>Parroquia</th>
          </tr>
        </thead>
        <tbody>
          ${filasServidores || `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Sin registros de servidores</td></tr>`}
        </tbody>
      </table>

      ${finanzas.length > 0 ? `
        <div class="page-break"></div>
        <div class="section-title">3. Movimientos Financieros Registrados</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${filasFinanzas}
          </tbody>
        </table>
      ` : ""}

      <div class="footer-signatures">
        <div><div class="sig-line">Coordinador General</div></div>
        <div><div class="sig-line">Tesorero / Administración</div></div>
        <div><div class="sig-line">Director Espiritual</div></div>
      </div>

      <script>
        window.onload = () => { window.print(); window.onafterprint = () => window.close(); };
      </script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

export default function Historial() {
  const [historiales, setHistoriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivando, setArchivando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [parroquiaSeleccionada, setParroquiaSeleccionada] = useState(null);
  const [retiroExpandido, setRetiroExpandido] = useState(null);
  const [tabActiva, setTabActiva] = useState({});
  const [datosExpandidos, setDatosExpandidos] = useState({});

  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  useEffect(() => {
    cargarHistoriales();
  }, []);

  const cargarHistoriales = () => {
    setLoading(true);
    base44.entities.HistorialRetiro.list("-fecha_archivo").then(data => {
      setHistoriales(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  // 🔒 AISLAMIENTO MULTI-TENANT DE HISTORIAL
  const historialesActivos = (historiales || []).filter(h => 
    !equipoIdActivo || 
    h.equipo_id === equipoIdActivo || 
    h.comunidad_id === equipoIdActivo || 
    h.retiro_id === equipoIdActivo
  );

  // Agrupar por parroquia
  const parroquias = historialesActivos.reduce((acc, h) => {
    const key = h.parroquia || "Sin Parroquia";
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const parroquiasFiltradas = Object.entries(parroquias).filter(([nombre]) =>
    !busqueda || nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const retirosDeLaParroquia = parroquiaSeleccionada
    ? (parroquias[parroquiaSeleccionada] || [])
    : [];

  const cargarDatos = (h) => {
    if (datosExpandidos[h.id]) return;
    const parsear = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };
    setDatosExpandidos(prev => ({
      ...prev,
      [h.id]: {
        caminantes: parsear(h.caminantes),
        servidores: parsear(h.servidores),
        finanzas: parsear(h.movimientos || h.finanzas),
        distribucion: parsear(h.distribucion),
      }
    }));
  };

  const toggleRetiro = (id, h) => {
    const yaAbierto = retiroExpandido === id;
    setRetiroExpandido(yaAbierto ? null : id);
    setTabActiva(prev => ({ ...prev, [id]: prev[id] || "caminantes" }));
    if (!yaAbierto) cargarDatos(h);
  };

  // 📦 ARCHIVAR Y CONGELAR EL RETIRO ACTIVO EN EL HISTORIAL
  const archivarRetiroActivo = async () => {
    if (!window.confirm("¿Deseas guardar y archivar la totalidad del retiro actual en el historial?")) {
      return;
    }

    setArchivando(true);
    try {
      const [cfgs, cams, servs, trans] = await Promise.all([
        base44.entities.ConfigRetiro.list().catch(() => []),
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor.list().catch(() => []),
        base44.entities.Transaccion.list().catch(() => []),
      ]);

      const cfgActivo = cfgs.find(c => c.equipo_id === equipoIdActivo) || cfgs[0];
      const camsFiltrados = equipoIdActivo ? cams.filter(c => c.equipo_id === equipoIdActivo) : cams;
      const servsFiltrados = equipoIdActivo ? servs.filter(s => s.equipo_id === equipoIdActivo) : servs;
      const transFiltradas = equipoIdActivo ? trans.filter(t => t.equipo_id === equipoIdActivo) : trans;

      const payload = {
        parroquia: comunidadActual?.nombre || cfgActivo?.parroquia || "General",
        numero_retiro: cfgActivo?.edicion ? Number(String(cfgActivo.edicion).replace(/\D/g, "")) || 1 : 1,
        total_caminantes: camsFiltrados.length,
        total_servidores: servsFiltrados.length,
        fecha_archivo: new Date().toISOString().slice(0, 10),
        equipo_id: equipoIdActivo,
        comunidad_id: equipoIdActivo,
        caminantes: JSON.stringify(camsFiltrados),
        servidores: JSON.stringify(servsFiltrados),
        movimientos: JSON.stringify(transFiltradas),
      };

      await base44.entities.HistorialRetiro.create(payload);
      toast.success("¡Retiro archivado exitosamente en el Historial!");
      cargarHistoriales();
    } catch (err) {
      console.error("Error al archivar retiro:", err);
      toast.error("No se pudo archivar el retiro.");
    } finally {
      setArchivando(false);
    }
  };

  // 💾 DESCARGAR BACKUP JSON COMPLETO
  const descargarBackupJSON = (h) => {
    try {
      const datos = datosExpandidos[h.id] || { caminantes: [], servidores: [] };
      const nombreArchivo = `backup_retiro_${h.parroquia || "Emaus"}_#${h.numero_retiro || 1}.json`;
      const blob = new Blob([JSON.stringify({ meta: h, ...datos }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Backup descargado: ${nombreArchivo}`);
    } catch (err) {
      toast.error("Error al descargar backup.");
    }
  };

  if (loading) return <p className="text-amber-600 text-sm py-10 text-center font-bold">Cargando historial...</p>;

  // ─── Vista: Lista de parroquias ───────────────────────────────────────────
  if (!parroquiaSeleccionada) {
    return (
      <div className="pb-12">
        <MobileTopBar title="Historial" />

        {/* Selector de Comunidad en la cabecera */}
        <div className="mb-4">
          <SelectorComunidad />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Archive className="w-6 h-6" /> Historial de Retiros
            </h1>
            <p className="text-amber-600 text-sm mt-1">
              {comunidadActual?.nombre || "Comunidad Activa"} · {Object.keys(parroquias).length} parroquia(s) · {historialesActivos.length} retiro(s) archivado(s)
            </p>
          </div>

          <button
            onClick={archivarRetiroActivo}
            disabled={archivando}
            className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <PlusCircle className={`w-4 h-4 ${archivando ? "animate-spin" : ""}`} />
            {archivando ? "Archivando..." : "Archivar Retiro Activo"}
          </button>
        </div>

        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
          <input
            type="text"
            placeholder="Buscar parroquia..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
          />
        </div>

        {parroquiasFiltradas.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-lg font-medium">No hay retiros archivados en esta comunidad</p>
            <p className="text-sm mt-1">Haz clic en "Archivar Retiro Activo" para guardar el retiro actual aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parroquiasFiltradas.map(([nombre, retiros]) => {
              const totalCaminantes = retiros.reduce((s, r) => s + (r.total_caminantes || 0), 0);
              const totalServidores = retiros.reduce((s, r) => s + (r.total_servidores || 0), 0);
              return (
                <button
                  key={nombre}
                  onClick={() => { setParroquiaSeleccionada(nombre); setRetiroExpandido(null); }}
                  className="bg-white rounded-xl shadow-md border border-amber-100 p-5 text-left hover:border-amber-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-amber-100 rounded-full p-2.5">
                      <Church className="w-5 h-5 text-amber-700" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400 group-hover:text-amber-700 transition-colors mt-1" />
                  </div>
                  <h2 className="font-bold text-amber-900 text-base leading-tight mb-2">{nombre}</h2>
                  <p className="text-amber-600 text-xs font-medium mb-3">
                    {retiros.length} retiro(s) archivado(s)
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-500" /> {totalCaminantes} caminantes
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-red-400" /> {totalServidores} servidores
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Vista: Retiros de una parroquia ─────────────────────────────────────
  return (
    <div className="pb-12">
      <MobileTopBar title="Historial" />

      <div className="mb-4">
        <SelectorComunidad />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setParroquiaSeleccionada(null); setBusqueda(""); }}
          className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Todas las parroquias
        </button>
        <span className="text-amber-300">/</span>
        <h1 className="text-xl font-bold text-amber-900 flex items-center gap-2">
          <Church className="w-5 h-5" /> {parroquiaSeleccionada}
        </h1>
      </div>
      <p className="text-amber-600 text-sm mb-5 font-medium">{retirosDeLaParroquia.length} retiro(s) en {comunidadActual?.nombre || "esta comunidad"}</p>

      <div className="space-y-4">
        {retirosDeLaParroquia.map(h => {
          const datos = datosExpandidos[h.id] || { caminantes: [], servidores: [] };
          const abierto = retiroExpandido === h.id;
          const tab = tabActiva[h.id] || "caminantes";

          return (
            <div key={h.id} className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
              <button
                onClick={() => toggleRetiro(h.id, h)}
                className="w-full flex items-center justify-between px-5 py-4 bg-amber-800 text-white hover:bg-amber-900 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-amber-700 rounded-lg px-3 py-1">
                    <span className="text-lg font-bold">Retiro #{h.numero_retiro}</span>
                  </div>
                  <div className="flex items-center gap-4 text-amber-200 text-sm flex-wrap font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> {h.total_caminantes || 0} caminantes
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {h.total_servidores || 0} servidores
                    </span>
                    {h.fecha_archivo && (
                      <span className="text-amber-300 text-xs">
                        {new Date(h.fecha_archivo + "T12:00:00").toLocaleDateString("es-ES")}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${abierto ? "rotate-90" : ""}`} />
              </button>

              {abierto && (
                <div>
                  {/* BARRA SUPERIOR DE ACCIONES DE PDF Y BACKUP EN EL ACORDEÓN */}
                  <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
                    {h.notas ? (
                      <div className="text-xs text-amber-800 font-medium">
                        <span className="font-bold">Notas: </span>{h.notas}
                      </div>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generarPDFRetiroCompleto({ ...h, ...datos })}
                        className="bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir PDF Completo
                      </button>

                      <button
                        onClick={() => descargarBackupJSON(h)}
                        className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Backup JSON
                      </button>
                    </div>
                  </div>

                  <div className="flex border-b border-amber-100">
                    <button
                      onClick={() => setTabActiva(prev => ({ ...prev, [h.id]: "caminantes" }))}
                      className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "caminantes" ? "border-amber-700 text-amber-800 font-bold" : "border-transparent text-gray-500 hover:text-amber-700"}`}
                    >
                      <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Caminantes ({datos.caminantes.length})</span>
                    </button>
                    <button
                      onClick={() => setTabActiva(prev => ({ ...prev, [h.id]: "servidores" }))}
                      className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "servidores" ? "border-amber-700 text-amber-800 font-bold" : "border-transparent text-gray-500 hover:text-amber-700"}`}
                    >
                      <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" /> Servidores ({datos.servidores.length})</span>
                    </button>
                  </div>

                  {tab === "caminantes" && (
                    <TablaParticipantes
                      datos={datos.caminantes}
                      tipo="caminantes"
                    />
                  )}
                  {tab === "servidores" && (
                    <TablaParticipantes
                      datos={datos.servidores}
                      tipo="servidores"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TablaParticipantes({ datos, tipo }) {
  if (datos.length === 0) {
    return <p className="text-center py-6 text-gray-400 text-sm font-medium">Sin registros guardados</p>;
  }

  if (tipo === "caminantes") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-50">
            <tr>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold">#</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold">Nombre</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold">Teléfono</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden md:table-cell">Padrino/Madrina</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden md:table-cell">Tel. Padrino</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden md:table-cell">Parroquia</th>
              <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden lg:table-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((c, i) => {
              const ficha = c.numero_ficha ?? c.f;
              const nombre = c.nombre ?? c.n;
              const telefono = c.telefono ?? c.t;
              const padrino = c.padrino_madrina ?? c.pm;
              const telPadrino = c.telefono_padrino ?? c.tp;
              const parroquia = c.parroquia ?? c.p;
              const estado = c.estado ?? c.e;
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/50"}>
                  <td className="px-4 py-2 font-bold text-amber-700">{ficha || "-"}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{nombre}</td>
                  <td className="px-4 py-2 text-gray-600">{telefono || "-"}</td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{padrino || "-"}</td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{telPadrino || "-"}</td>
                  <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{parroquia || "-"}</td>
                  <td className="px-4 py-2 hidden lg:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estado === "Confirmado" ? "bg-green-100 text-green-700" : estado === "Cancelado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {estado || "Pendiente"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-amber-50">
          <tr>
            <th className="text-left px-4 py-2 text-amber-700 font-semibold">Nombre</th>
            <th className="text-left px-4 py-2 text-amber-700 font-semibold">Teléfono</th>
            <th className="text-left px-4 py-2 text-amber-700 font-semibold">Rol</th>
            <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden md:table-cell">Parroquia</th>
            <th className="text-left px-4 py-2 text-amber-700 font-semibold hidden lg:table-cell">Estado</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((s, i) => {
            const nombre = s.nombre ?? s.n;
            const telefono = s.telefono ?? s.t;
            const rol = s.rol ?? s.r ?? s.lugares_servido;
            const parroquia = s.parroquia ?? s.p;
            const estado = s.estado ?? s.e;
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-amber-50/50"}>
                <td className="px-4 py-2 font-medium text-gray-800">{nombre}</td>
                <td className="px-4 py-2 text-gray-600">{telefono || "-"}</td>
                <td className="px-4 py-2 text-gray-600">{rol || "-"}</td>
                <td className="px-4 py-2 text-gray-500 hidden md:table-cell">{parroquia || "-"}</td>
                <td className="px-4 py-2 hidden lg:table-cell">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estado === "Confirmado" ? "bg-green-100 text-green-700" : estado === "Cancelado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {estado || "Pendiente"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}