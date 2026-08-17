import { useState, useEffect, useMemo } from "react";
import { 
  PlusCircle, Search, Trash2, UserCheck, AlertCircle, Building2, MapPin, 
  Briefcase, RefreshCw, LayoutGrid, List, CheckCircle, ShieldCheck, Phone, Mail, Award, Users, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import useOffline from "@/hooks/useOffline";
import SelectorComunidad from "@/components/SelectorComunidad";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import DirectorioServidores from "./DirectorioServidores";
import ReporteEvaluaciones from "./ReporteEvaluaciones";

export default function Hermandad() {
  const { comunidadActual } = useComunidad();
  const { user: currentUser } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    currentUser?.equipo_id;

  // 1. OBTENER DATOS DE CAMINANTES Y SERVIDORES
  const { records: todosCaminantes = [] } = useOffline("Caminante");
  const { records: todosServidores = [] } = useOffline("Servidor");

  // Filtrar caminantes y servidores por comunidad activa
  const caminantes = useMemo(() => {
    return (todosCaminantes || []).filter(c => !equipoIdActivo || c.equipo_id === equipoIdActivo || c.comunidad_id === equipoIdActivo);
  }, [todosCaminantes, equipoIdActivo]);

  const servidores = useMemo(() => {
    return (todosServidores || []).filter(s => !equipoIdActivo || s.equipo_id === equipoIdActivo || s.comunidad_id === equipoIdActivo);
  }, [todosServidores, equipoIdActivo]);

  // 2. ESTADOS DEL MÓDULO
  const [hermandad, setHermandad] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroProvincia, setFiltroProvincia] = useState("");
  const [filtroProfesion, setFiltroProfesion] = useState("");
  const [personaSeleccionada, setPersonaSeleccionada] = useState("");
  const [vistaModo, setVistaModo] = useState("tabla"); // Vista exclusiva de lista/tabla
  const [moduloPestana, setModuloPestana] = useState("directorio"); // "directorio" | "evaluaciones" | "archivo"
  const [sincronizando, setSincronizando] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    cedula: "",
    telefono: "",
    parroquia: "",
    provincia: "",
    municipio: "",
    profesion: "",
    numero_retiro: "",
    fecha_retiro: "",
    rol_emaus: "Hermano",
    observaciones: ""
  });

  const storageKey = `hermandad_emaus_archivo_${equipoIdActivo || "general"}`;

  // 3. CARGAR DATOS AL INICIAR
  useEffect(() => {
    // 1. Cargar desde LocalStorage
    const datosGuardados = localStorage.getItem(storageKey);
    if (datosGuardados) {
      try { setHermandad(JSON.parse(datosGuardados)); } catch (e) {}
    }

    // 2. Intentar cargar desde Base44 si existe la entidad
    if (base44.entities.Hermandad?.list) {
      base44.entities.Hermandad.list().then(data => {
        const filtrados = (data || []).filter(h => !equipoIdActivo || h.equipo_id === equipoIdActivo);
        if (filtrados.length > 0) {
          setHermandad(filtrados);
          localStorage.setItem(storageKey, JSON.stringify(filtrados));
        }
      }).catch(() => {});
    }
  }, [equipoIdActivo, storageKey]);

  // 4. COMBINAR CAMINANTES Y SERVIDORES PARA AUTOCOMPLETADO
  const personasDisponibles = useMemo(() => {
    const c = caminantes.map(x => ({ ...x, tipo: "Caminante", id_origen: x.id }));
    const s = servidores.map(x => ({ ...x, tipo: "Servidor", id_origen: x.id }));
    return [...c, ...s].filter(p => p.nombre).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [caminantes, servidores]);

  // 5. GENERAR FILTROS Y AGRUPACIÓN POR CIUDAD / PROVINCIA
  const provinciasDisponibles = useMemo(() => {
    return [...new Set(hermandad.map(h => h.provincia || h.municipio).filter(Boolean))].sort();
  }, [hermandad]);

  const profesionesDisponibles = useMemo(() => {
    return [...new Set(hermandad.map(h => h.profesion).filter(Boolean))].sort();
  }, [hermandad]);

  // 6. AGRUPACIÓN POR CIUDAD
  const agrupadoPorCiudad = useMemo(() => {
    const grupos = {};
    hermandad.forEach(h => {
      const ciudad = h.provincia || h.municipio || "Sin Ciudad Especificada";
      if (!grupos[ciudad]) grupos[ciudad] = [];
      grupos[ciudad].push(h);
    });
    return grupos;
  }, [hermandad]);

  // 7. MANEJADORES DE EVENTOS
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const cargarDatosPersona = (idOrigen) => {
    if (!idOrigen) {
      setFormData({ nombre: "", cedula: "", telefono: "", parroquia: "", provincia: "", municipio: "", profesion: "", numero_retiro: "", fecha_retiro: "", rol_emaus: "Hermano", observaciones: "" });
      return;
    }
    const persona = personasDisponibles.find(p => p.id_origen === idOrigen);
    if (persona) {
      setFormData({
        nombre: persona.nombre || "",
        cedula: persona.cedula || "",
        telefono: persona.telefono || "",
        parroquia: persona.parroquia || "",
        provincia: persona.provincia || persona.ciudad || "",
        municipio: persona.municipio || "",
        profesion: persona.profesion || "",
        numero_retiro: persona.numero_retiro ? `#${persona.numero_retiro}` : "",
        fecha_retiro: "",
        rol_emaus: persona.tipo === "Servidor" ? "Servidor" : "Hermano",
        observaciones: ""
      });
      toast.success(`Datos de ${persona.nombre} cargados en el formulario.`);
    }
  };

  // 🔄 IMPORTE / SINCRONIZACIÓN AUTOMÁTICA EN BOTE
  const sincronizarTodosCaminantesYServidores = async () => {
    if (personasDisponibles.length === 0) {
      toast.error("No hay caminantes ni servidores registrados para importar.");
      return;
    }

    setSincronizando(true);
    let agregados = 0;
    const nuevosHermandad = [...hermandad];

    personasDisponibles.forEach(p => {
      const existe = nuevosHermandad.some(h => 
        (p.cedula && h.cedula === p.cedula) || 
        (p.telefono && h.telefono === p.telefono) ||
        (h.nombre.toLowerCase() === p.nombre.toLowerCase())
      );

      if (!existe) {
        nuevosHermandad.push({
          id: Date.now() + Math.random(),
          nombre: p.nombre,
          cedula: p.cedula || "No registrada",
          telefono: p.telefono || "",
          parroquia: p.parroquia || "",
          provincia: p.provincia || p.ciudad || "Distrito Nacional",
          municipio: p.municipio || "",
          profesion: p.profesion || "General",
          numero_retiro: p.numero_retiro ? `#${p.numero_retiro}` : "Retiro Actual",
          fecha_retiro: new Date().toISOString().slice(0, 10),
          rol_emaus: p.tipo === "Servidor" ? "Servidor" : "Hermano",
          equipo_id: equipoIdActivo,
          fecha_archivo: new Date().toISOString()
        });
        agregados++;
      }
    });

    setHermandad(nuevosHermandad);
    localStorage.setItem(storageKey, JSON.stringify(nuevosHermandad));

    if (base44.entities.Hermandad?.create) {
      for (const h of nuevosHermandad.slice(-agregados)) {
        await base44.entities.Hermandad.create(h).catch(() => {});
      }
    }

    setSincronizando(false);
    if (agregados > 0) {
      toast.success(`✅ Se importaron y segregaron ${agregados} hermanos exitosamente.`);
    } else {
      toast.info("Todos los caminantes y servidores ya estaban archivados en la Hermandad.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const esDuplicado = hermandad.some(h => 
      (formData.cedula && h.cedula === formData.cedula) || 
      (formData.telefono && h.telefono === formData.telefono)
    );

    if (esDuplicado) {
      toast.error("⚠️ Ya existe un registro con esta cédula o teléfono en la Hermandad.");
      return;
    }

    const nuevoRegistro = {
      id: Date.now(),
      ...formData,
      equipo_id: equipoIdActivo,
      fecha_archivo: new Date().toISOString()
    };

    const listaActualizada = [...hermandad, nuevoRegistro];
    setHermandad(listaActualizada);
    localStorage.setItem(storageKey, JSON.stringify(listaActualizada));

    if (base44.entities.Hermandad?.create) {
      await base44.entities.Hermandad.create(nuevoRegistro).catch(() => {});
    }
    
    setFormData({ nombre: "", cedula: "", telefono: "", parroquia: "", provincia: "", municipio: "", profesion: "", numero_retiro: "", fecha_retiro: "", rol_emaus: "Hermano", observaciones: "" });
    setPersonaSeleccionada("");
    setMostrarFormulario(false);
    toast.success("✅ Hermano archivado correctamente.");
  };

  const eliminarRegistro = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este registro del archivo de Hermandad?")) {
      const listaActualizada = hermandad.filter(h => h.id !== id);
      setHermandad(listaActualizada);
      localStorage.setItem(storageKey, JSON.stringify(listaActualizada));
      if (base44.entities.Hermandad?.delete) {
        await base44.entities.Hermandad.delete(id).catch(() => {});
      }
      toast.success("Registro eliminado del archivo.");
    }
  };

  // 8. FILTRADO INTELIGENTE DE LA TABLA
  const registrosFiltrados = useMemo(() => {
    return hermandad.filter(h => {
      const coincideBusqueda = 
        (h.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (h.cedula || "").includes(busqueda) ||
        (h.profesion || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (h.numero_retiro || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (h.provincia || "").toLowerCase().includes(busqueda.toLowerCase());
      
      const coincideProvincia = !filtroProvincia || h.provincia === filtroProvincia || h.municipio === filtroProvincia;
      const coincideProfesion = !filtroProfesion || h.profesion === filtroProfesion;
      
      return coincideBusqueda && coincideProvincia && coincideProfesion;
    });
  }, [hermandad, busqueda, filtroProvincia, filtroProfesion]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans">
      {/* PESTAÑAS PRINCIPALES DEL MÓDULO (HERMANDAD / BIBLIOTECA / DIRECTORIO) */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setModuloPestana("directorio")}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            moduloPestana === "directorio"
              ? "bg-amber-900 text-white shadow-md"
              : "bg-gray-50 text-gray-700 hover:bg-amber-50"
          }`}
        >
          <Users className="w-4 h-4 text-amber-300" /> 👥 Directorio de Servidores (Hermandad)
        </button>

        <button
          type="button"
          onClick={() => setModuloPestana("evaluaciones")}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            moduloPestana === "evaluaciones"
              ? "bg-amber-900 text-white shadow-md"
              : "bg-gray-50 text-gray-700 hover:bg-amber-50"
          }`}
        >
          <Award className="w-4 h-4 text-yellow-400" /> ⭐ Evaluaciones (Biblioteca)
        </button>

        <button
          type="button"
          onClick={() => setModuloPestana("archivo")}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            moduloPestana === "archivo"
              ? "bg-amber-900 text-white shadow-md"
              : "bg-gray-50 text-gray-700 hover:bg-amber-50"
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-300" /> 🏛️ Archivo General Hermandad
        </button>
      </div>

      {/* VISTA SEGÚN LA PESTAÑA SELECCIONADA */}
      {moduloPestana === "directorio" ? (
        <DirectorioServidores />
      ) : moduloPestana === "evaluaciones" ? (
        <ReporteEvaluaciones />
      ) : (
        <>
          {/* Selector de Comunidad en Cabecera */}
          <div className="mb-4">
            <SelectorComunidad />
          </div>

      {/* ENCABEZADO Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-blue-700" /> Archivo de Hermandad Emaús
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Directorio permanente segregado por ciudad y comunidad • {comunidadActual?.nombre || "Comunidad Activa"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={sincronizarTodosCaminantesYServidores}
            disabled={sincronizando}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando..." : "Sincronizar Caminantes & Servidores"}
          </button>

          <button 
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold text-xs shadow-sm transition"
          >
            {mostrarFormulario ? "Cancelar" : <><PlusCircle className="w-4 h-4" /> Agregar Registro</>}
          </button>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8 border border-blue-100 animate-in fade-in duration-300">
          <h2 className="text-lg font-bold mb-4 text-blue-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-700" /> Archivar Nuevo Hermano / Hermana
          </h2>
          
          {/* Selector Inteligente de Personas Existentes */}
          <div className="mb-6 p-4 bg-blue-50/70 rounded-xl border border-blue-200">
            <label className="block text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700" /> Auto-completar desde Caminantes / Servidores del Retiro:
            </label>
            <select 
              value={personaSeleccionada}
              onChange={(e) => {
                setPersonaSeleccionada(e.target.value);
                cargarDatosPersona(e.target.value);
              }}
              className="w-full border border-blue-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-semibold"
            >
              <option value="">-- Escribir manualmente o seleccionar de la lista --</option>
              {personasDisponibles.map(p => (
                <option key={p.id_origen} value={p.id_origen}>
                  {p.nombre} {p.cedula ? `(${p.cedula})` : ""} - {p.tipo}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <input name="nombre" placeholder="Ej: Juan Pérez" value={formData.nombre} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Cédula / DNI *</label>
              <input name="cedula" placeholder="001-0000000-0" value={formData.cedula} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
              <input name="telefono" placeholder="809-000-0000" value={formData.telefono} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Provincia / Ciudad *</label>
              <input name="provincia" placeholder="Ej: Santo Domingo / Boston" value={formData.provincia} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Municipio / Sector</label>
              <input name="municipio" placeholder="Ej: Distrito Nacional / South End" value={formData.municipio} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Parroquia</label>
              <input name="parroquia" placeholder="Ej: San Juan Bautista" value={formData.parroquia} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Profesión / Oficio *</label>
              <input name="profesion" placeholder="Ej: Ingeniero / Comerciante" value={formData.profesion} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Número de Retiro *</label>
              <input name="numero_retiro" placeholder="Ej: #12" value={formData.numero_retiro} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Rol de Emaús</label>
              <select name="rol_emaus" value={formData.rol_emaus} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="Hermano">Hermano / Hermana</option>
                <option value="Servidor">Servidor / Servidora</option>
                <option value="Sacerdote">Sacerdote / Asesor</option>
                <option value="Fundador">Fundador / Directivo</option>
              </select>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Observaciones</label>
              <textarea name="observaciones" placeholder="Notas especiales o compromisos..." value={formData.observaciones} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none" rows="2" />
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setMostrarFormulario(false); setPersonaSeleccionada(""); }} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition font-bold text-xs shadow-sm">Guardar en Hermandad</button>
            </div>
          </form>
        </div>
      )}

      {/* PANEL DE BARRA DE BÚSQUEDA Y VISTAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, ciudad, cédula o profesión..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 border border-blue-300 font-black text-xs px-3.5 py-1.5 rounded-full">
              📋 Vista Lista ({registrosFiltrados.length} Registros)
            </span>
          </div>
        </div>

        {/* FILTROS SECUNDARIOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">FILTRAR POR CIUDAD / PROVINCIA</label>
            <select 
              value={filtroProvincia}
              onChange={(e) => setFiltroProvincia(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las ciudades ({provinciasDisponibles.length})</option>
              {provinciasDisponibles.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">FILTRAR POR PROFESIÓN / OFICIO</label>
            <select 
              value={filtroProfesion}
              onChange={(e) => setFiltroProfesion(e.target.value)}
              className="w-full border border-slate-200 p-2 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las profesiones ({profesionesDisponibles.length})</option>
              {profesionesDisponibles.map(prof => (
                <option key={prof} value={prof}>{prof}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VISTA EXCLUSIVA: TABLA Y LISTADO CONSOLIDADO DE HERMANDAD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <List className="w-4 h-4 text-blue-700" /> Directorio en Lista Consolidada ({registrosFiltrados.length})
          </h2>
        </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Nombre / Cédula</th>
                  <th className="p-3">Ciudad / Ubicación</th>
                  <th className="p-3">Profesión</th>
                  <th className="p-3">Retiro</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Sin registros en este filtro
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((h) => (
                    <tr key={h.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{h.nombre}</div>
                        <div className="text-[10px] text-slate-500">{h.cedula} • {h.telefono}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{h.provincia || h.municipio}</div>
                        {h.parroquia && <div className="text-[10px] text-blue-600">{h.parroquia}</div>}
                      </td>
                      <td className="p-3">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200">
                          {h.profesion || 'No especificada'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-blue-900">{h.numero_retiro}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">
                          {h.rol_emaus || "Hermano"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => eliminarRegistro(h.id)} className="text-slate-400 hover:text-red-600 p-1 transition" title="Eliminar del archivo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}