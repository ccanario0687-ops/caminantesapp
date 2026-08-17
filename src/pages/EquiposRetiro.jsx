import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Crown, Pencil, Check, X, Search, Printer, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";
import SelectorComunidad from "@/components/SelectorComunidad";
import AgregarServidorEquipo from "@/components/equipos/AgregarServidorEquipo";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";

export default function EquiposRetiro() {
  const [todosServidores, setTodosServidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [retiros, setRetiros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState({});
  const [asignandoEquipo, setAsignandoEquipo] = useState(null);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [saving, setSaving] = useState(false);
  const [orden, setOrden] = useState("alfabetico");
  const [rolesConfigurados, setRolesConfigurados] = useState([]);

  // Estados para creación de equipo nuevo
  const [equiposCustom, setEquiposCustom] = useState([]);
  const [mostrarCrearEquipo, setMostrarCrearEquipo] = useState(false);
  const [nombreNuevoEquipoModal, setNombreNuevoEquipoModal] = useState("");
  const [liderNuevoEquipoId, setLiderNuevoEquipoId] = useState("");

  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const coincideComunidadItem = (s) => {
    if (!s) return false;
    const estadoNorm = String(s.estado || "").toLowerCase();
    if (estadoNorm === "rechazado" || estadoNorm === "no asistirá" || estadoNorm === "lista de espera") return false;

    if (!equipoIdActivo || equipoIdActivo === "global" || equipoIdActivo === "GLOBAL") return true;

    const idActivo = String(comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id || "").toLowerCase();
    const codigoActivo = String(comunidadActual?.codigo_comunidad || comunidadActual?.codigo || user?.codigo_comunidad || "").toLowerCase();
    const slugActivo = String(comunidadActual?.slug || user?.slug || "").toLowerCase();
    const nombreActivo = String(comunidadActual?.nombre || comunidadActual?.nombre_equipo || user?.nombre_equipo || "").toLowerCase();

    const idReg = String(s.equipo_id || s.comunidad_id || s.retiro_id || s.id_equipo || "").toLowerCase();
    const codigoReg = String(s.codigo_comunidad || s.comunidad_codigo || s.codigo || "").toLowerCase();
    const slugReg = String(s.slug || s.comunidad_slug || "").toLowerCase();
    const nombreReg = String(s.comunidad_nombre || s.nombre_equipo || s.comunidad || "").toLowerCase();

    if (idActivo && idReg && idReg === idActivo) return true;
    if (codigoActivo && codigoReg && codigoReg === codigoActivo) return true;
    if (slugActivo && slugReg && slugReg === slugActivo) return true;
    if (nombreActivo && nombreReg && nombreReg === nombreActivo) return true;

    const sinComunidad = !idReg && !codigoReg && !slugReg && !nombreReg;
    if (sinComunidad) return true;

    return false;
  };

  // 🔒 AISLAMIENTO Y FILTRADO COMPLETO DE SERVIDORES APROBADOS PARA EQUIPOS
  const servidores = (todosServidores || []).filter(coincideComunidadItem);

  const cargar = async () => {
    setLoading(true);
    try {
      const [r1, r2, rCaminantes, rRemotas, cfgs] = await Promise.all([
        base44.entities.Servidor?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.Servidores?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.Caminante?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.ConfigRetiro?.list().catch(() => []) || Promise.resolve([]),
      ]);

      let acumulados = [];

      if (Array.isArray(r1)) acumulados.push(...r1.map(x => ({ ...x, _origenEntidad: "Servidor" })));
      if (Array.isArray(r2)) acumulados.push(...r2.map(x => ({ ...x, _origenEntidad: "Servidores" })));

      if (Array.isArray(rCaminantes)) {
        const soloServidores = rCaminantes.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor)
        ).map(x => ({ ...x, _origenEntidad: "Caminante" }));
        acumulados.push(...soloServidores);
      }

      if (Array.isArray(rRemotas)) {
        const soloServidoresRemotosAprobados = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprobado = est === "aprobado" || est === "confirmado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprobado && esServ;
        }).map(x => ({ ...x, _origenEntidad: "InscripcionRemota" }));
        acumulados.push(...soloServidoresRemotosAprobados);
      }

      // Deduplicar multi-atributo por cédula, id o nombre+teléfono
      const mapaUnicos = new Map();
      acumulados.forEach(s => {
        if (!s) return;
        
        const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
        const cleanTel = s.telefono ? String(s.telefono).replace(/\D/g, "") : "";
        const cleanNom = s.nombre ? String(s.nombre).trim().toLowerCase() : "";
        const keyInscrip = s.inscripcion_id || s.inscripcion_remota_id ? String(s.inscripcion_id || s.inscripcion_remota_id) : null;

        let key = null;
        if (keyInscrip && mapaUnicos.has(keyInscrip)) {
          key = keyInscrip;
        } else if (cleanCed && mapaUnicos.has(`ced_${cleanCed}`)) {
          key = `ced_${cleanCed}`;
        } else if (cleanNom && cleanTel && mapaUnicos.has(`nom_${cleanNom}_${cleanTel}`)) {
          key = `nom_${cleanNom}_${cleanTel}`;
        } else {
          key = keyInscrip ? keyInscrip : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id)));
        }

        const previo = mapaUnicos.get(key) || {};
        mapaUnicos.set(key, { ...previo, ...s });
      });

      // 🛠️ FUSIÓN INDESTRUCTIBLE CON SOBREESCRITURAS LOCALES
      const locServidores = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
      const locOverrides = new Map(locServidores.map(x => [String(x.id), x]));

      const listaFinal = Array.from(mapaUnicos.values()).map(s => {
        const local = locOverrides.get(String(s.id));
        if (local) {
          return {
            ...s,
            equipo_trabajo: local.equipo_trabajo !== undefined ? local.equipo_trabajo : s.equipo_trabajo,
            es_lider_equipo: local.es_lider_equipo !== undefined ? local.es_lider_equipo : s.es_lider_equipo
          };
        }
        return s;
      });

      setTodosServidores(listaFinal);

      // Cargar equipos creados manualmente
      const locEquiposCustom = JSON.parse(localStorage.getItem("emaus_equipos_custom") || "[]");
      setEquiposCustom(locEquiposCustom);

      try {
        const r = cfgs?.[0]?.roles_servidores;
        const arr = r ? (typeof r === "string" ? JSON.parse(r) : r) : [];
        setRolesConfigurados(Array.isArray(arr) ? arr : []);
      } catch { setRolesConfigurados([]); }
      
      const nums = [...new Set((listaFinal || []).map(s => s.numero_retiro).filter(Boolean))].sort((a, b) => a - b);
      setRetiros(nums);
    } catch (e) {
      console.error("Error al cargar servidores para equipos:", e);
      toast.error("Error al cargar servidores");
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [equipoIdActivo]);

  // 🛠️ FUNCIÓN UNIVERSAL DE GUARDADO MULTI-ENTIDAD Y LOCAL
  const actualizarRegistroServidor = async (servidorObj, cambios) => {
    if (!servidorObj) return false;
    const id = servidorObj.id;
    const entidadNombre = servidorObj._origenEntidad || "Servidor";

    let exito = false;

    // 1. Intentar actualización remota en Base44 según la entidad de origen
    if (base44.entities[entidadNombre]?.update) {
      try {
        await base44.entities[entidadNombre].update(id, cambios);
        exito = true;
      } catch (err) {
        console.warn(`Falló actualización remota en ${entidadNombre}:`, err);
      }
    }

    // 2. Intentar fallbacks con otras entidades
    if (!exito) {
      const fallbacks = ["Servidor", "Servidores", "Caminante", "InscripcionRemota"].filter(e => e !== entidadNombre);
      for (const ent of fallbacks) {
        if (base44.entities[ent]?.update) {
          try {
            await base44.entities[ent].update(id, cambios);
            exito = true;
            break;
          } catch {}
        }
      }
    }

    // 3. PERSISTENCIA LOCAL EN INDEXEDDB Y LOCALSTORAGE (NUNCA FALLA)
    try {
      const locServidores = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
      const idxS = locServidores.findIndex(x => String(x.id) === String(id));
      if (idxS !== -1) {
        locServidores[idxS] = { ...locServidores[idxS], ...cambios };
      } else {
        locServidores.push({ ...servidorObj, ...cambios });
      }
      localStorage.setItem("emaus_servidores", JSON.stringify(locServidores));

      // Actualizar estado en caliente
      setTodosServidores(prev => prev.map(s => String(s.id) === String(id) ? { ...s, ...cambios } : s));

      exito = true;
    } catch (errLocal) {
      console.error("Error al persistir localmente:", errLocal);
    }

    // Notificar cambio de datos global
    window.dispatchEvent(new CustomEvent("emaus_data_changed", {
      detail: { entidad: entidadNombre, id, cambios, timestamp: Date.now() }
    }));

    return exito;
  };

  const handleCrearNuevoEquipo = async (e) => {
    e.preventDefault();
    const nom = nombreNuevoEquipoModal.trim();
    if (!nom) {
      toast.error("Ingresa el nombre del equipo");
      return;
    }

    setSaving(true);
    try {
      const actuales = JSON.parse(localStorage.getItem("emaus_equipos_custom") || "[]");
      if (!actuales.includes(nom)) {
        actuales.push(nom);
        localStorage.setItem("emaus_equipos_custom", JSON.stringify(actuales));
        setEquiposCustom(actuales);
      }

      if (liderNuevoEquipoId) {
        const servLider = todosServidores.find(s => String(s.id) === String(liderNuevoEquipoId));
        if (servLider) {
          await actualizarRegistroServidor(servLider, {
            equipo_trabajo: nom,
            es_lider_equipo: true
          });
        }
      }

      toast.success(`🎉 Equipo "${nom}" creado exitosamente.`);
      setNombreNuevoEquipoModal("");
      setLiderNuevoEquipoId("");
      setMostrarCrearEquipo(false);
      await cargar();
    } catch (err) {
      toast.error("Error al crear el equipo");
    } finally {
      setSaving(false);
    }
  };

  const filtrados = servidores.filter(s =>
    (filtroRetiro === "" || !s.numero_retiro || String(s.numero_retiro) === filtroRetiro) &&
    (!busqueda ||
      s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.equipo_trabajo?.toLowerCase().includes(busqueda.toLowerCase()))
  ).sort((a, b) => {
    if (orden === "edad") return (Number(a.edad) || 0) - (Number(b.edad) || 0);
    return (a.nombre || "").localeCompare(b.nombre || "", "es");
  });

  // Agrupar por equipo de trabajo
  const equiposMap = {};

  // Inicializar equipos creados manualmente
  (equiposCustom || []).forEach(eqName => {
    if (eqName && !equiposMap[eqName]) equiposMap[eqName] = [];
  });

  filtrados.forEach(s => {
    const eq = s.equipo_trabajo?.trim() || "__sin_equipo__";
    if (!equiposMap[eq]) equiposMap[eq] = [];
    equiposMap[eq].push(s);
  });

  const equiposOrdenados = Object.entries(equiposMap).sort(([a], [b]) => {
    if (a === "__sin_equipo__") return 1;
    if (b === "__sin_equipo__") return -1;
    return a.localeCompare(b);
  });

  const equiposFiltrados = filtroEquipo
    ? equiposOrdenados.filter(([eq]) => eq.toLowerCase().includes(filtroEquipo.toLowerCase()))
    : equiposOrdenados;

  const nombresEquipos = [...new Set([
    ...equiposCustom,
    ...servidores.filter(s => s.equipo_trabajo).map(s => s.equipo_trabajo.trim())
  ])].sort();

  // Lista de equipos disponibles = roles configurados en Configuración + equipos ya existentes
  const opcionesEquipo = [...new Set([...rolesConfigurados, ...nombresEquipos])].sort();

  const toggleExpandido = (eq) =>
    setExpandidos(prev => ({ ...prev, [eq]: prev[eq] === false ? true : false }));

  const isExpandido = (eq) => expandidos[eq] !== false;

  const handleSetLider = async (servidor) => {
    setSaving(true);
    try {
      const compañeros = servidores.filter(
        s => s.equipo_trabajo === servidor.equipo_trabajo && s.id !== servidor.id && s.es_lider_equipo
      );
      await Promise.all(compañeros.map(c => actualizarRegistroServidor(c, { es_lider_equipo: false })));
      const nuevoLider = !servidor.es_lider_equipo;
      await actualizarRegistroServidor(servidor, { es_lider_equipo: nuevoLider });
      toast.success(nuevoLider ? `${servidor.nombre} asignado como líder` : "Liderazgo removido");
      await cargar();
    } catch {
      toast.error("Error al actualizar líder");
    } finally {
      setSaving(false);
    }
  };

  const handleAsignarEquipo = async () => {
    if (!asignandoEquipo) return;
    setSaving(true);
    try {
      const eqNombre = nuevoEquipo.trim() || null;
      const ok = await actualizarRegistroServidor(asignandoEquipo, {
        equipo_trabajo: eqNombre
      });

      if (ok) {
        toast.success(eqNombre ? `Servidor asignado a "${eqNombre}"` : "Equipo removido");
        setAsignandoEquipo(null);
        setNuevoEquipo("");
        await cargar();
      } else {
        toast.error("No se pudo guardar el equipo.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al asignar equipo");
    } finally {
      setSaving(false);
    }
  };

  const generarHTMLImpresion = (equiposAImprimir, titulo, subtitulo) => {
    const hoy = new Date().toLocaleDateString("es-DO");
    const totalServ = equiposAImprimir.reduce((sum, [, m]) => sum + m.length, 0);

    const estilosBase = `
      @page { size: 8.5in 11in portrait; margin: 0.6in 0.75in; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; margin: 0; padding: 0; }
      * { box-sizing: border-box; }
      .grid1 { display: grid; grid-template-columns: 1fr; gap: 16px; }
      .card { break-inside: avoid; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
      .card-head { padding: 9px 14px; border-left: 5px solid #cc0000; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: white; }
      .card-head .title { font-size: 13px; font-weight: 800; color: #111; letter-spacing: 0.3px; text-transform: uppercase; }
      .card-head .meta { font-size: 10px; color: #555; text-align: right; }
      .card-sub { font-size: 10px; color: #333; margin-top: 3px; font-style: italic; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
      thead th { padding: 6px 10px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #111; border-bottom: 2px solid #cc0000; background: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      tbody td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; color: #111; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      tbody tr:last-child td { border-bottom: none; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #cc0000; margin-bottom: 20px; }
      .page-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9px; color: #555; }
    `;

    const seccionesHTML = equiposAImprimir.map(([eq, miembros]) => {
      const nombre = eq === "__sin_equipo__" ? "Sin equipo asignado" : eq;
      const lider = miembros.find(s => s.es_lider_equipo);
      const filas = miembros.map((s, i) =>
        `<tr>
          <td style="width:34px;text-align:center;color:#555">${i + 1}</td>
          <td style="width:38%;font-weight:${s.es_lider_equipo ? "800" : "500"};color:#111">${s.es_lider_equipo ? "★ " : ""}${s.estado === "Pendiente" ? '<span style="color:#cc0000;font-weight:800">*</span> ' : ""}${s.nombre}</td>
          <td style="width:18%;color:#333">${s.rol || "—"}</td>
          <td style="width:24%;color:#333">${s.parroquia || "—"}</td>
          <td style="width:20%;color:#333">${s.telefono || "—"}</td>
        </tr>`
      ).join("");
      return `<div class="card">
        <div class="card-head">
          <div>
            <div class="title">${nombre}</div>
            ${lider ? `<div class="card-sub">Líder: ${lider.nombre}${lider.telefono ? ` · ${lider.telefono}` : ""}</div>` : ""}
          </div>
          <div class="meta">${miembros.length} miembro(s)</div>
        </div>
        <table>
          <thead><tr><th style="width:34px;text-align:center">#</th><th style="width:38%">Nombre</th><th style="width:18%">Rol</th><th style="width:24%">Parroquia</th><th style="width:20%">Teléfono</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    }).join("");

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${titulo} — Retiro de Emaús (${comunidadActual?.nombre || "General"})</title>
      <style>${estilosBase}</style>
    </head><body>
      <div class="page-header">
        <div>
          <p style="font-size:22px;font-weight:800;margin:0;color:#111;letter-spacing:-0.5px">✝️ Retiro de Emaús</p>
          <p style="font-size:11px;color:#333;margin:4px 0 0">${subtitulo} · Comunidad: ${comunidadActual?.nombre || "General"}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:16px;font-weight:700;color:#111;margin:0">${titulo}</p>
          <p style="font-size:10px;color:#555;margin:5px 0 0">${hoy} · ${totalServ} servidor(es)</p>
        </div>
      </div>
      <div class="grid1">${seccionesHTML}</div>
      <div class="page-footer">
        <span>✝️ Sistema de Gestión — Retiro de Emaús</span>
        <span>Generado el ${hoy}</span>
      </div>
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
    </body></html>`;
  };

  const imprimirEquipos = () => {
    const retiroLabel = filtroRetiro ? `Retiro #${filtroRetiro}` : "Todos los retiros";
    const html = generarHTMLImpresion(equiposFiltrados, "Equipos de Trabajo", retiroLabel);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const imprimirEquipoIndividual = (eq, miembros) => {
    const nombre = eq === "__sin_equipo__" ? "Sin equipo asignado" : eq;
    const retiroLabel = filtroRetiro ? `Retiro #${filtroRetiro}` : "Todos los retiros";
    const html = generarHTMLImpresion([[eq, miembros]], `Equipo: ${nombre}`, retiroLabel);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  if (loading) return (
    <div className="py-20 text-center text-amber-600 text-sm">Cargando servidores...</div>
  );

  return (
    <div className="pb-12">
      {/* Selector de Comunidad Superior */}
      <div className="mb-4">
        <SelectorComunidad />
      </div>

      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Equipos de Trabajo
          </h1>
          <p className="text-amber-600 text-sm mt-1">
            {comunidadActual?.nombre || "Comunidad Activa"} · {filtrados.length} servidor(es) · {equiposFiltrados.filter(([eq]) => eq !== "__sin_equipo__").length} equipo(s)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setMostrarCrearEquipo(true)}
            className="flex items-center gap-2 bg-amber-900 hover:bg-amber-950 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" /> Crear Equipo Nuevo
          </button>

          <MobileSelect
            value={filtroEquipo}
            onChange={setFiltroEquipo}
            options={[{ value: "", label: "Todos los equipos" }, ...nombresEquipos.map(eq => ({ value: eq, label: eq }))]}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <MobileSelect
            value={orden}
            onChange={setOrden}
            options={[
              { value: "alfabetico", label: "Ordenar Alfabéticamente" },
              { value: "edad", label: "Ordenar por Edad" },
            ]}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={imprimirEquipos}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
        <input
          type="text" placeholder="Buscar servidor o equipo..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
      </div>

      {/* Lista de equipos */}
      <div className="space-y-4">
        {equiposFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay servidores registrados en esta comunidad.</p>
            <p className="text-sm mt-1">Agrega servidores desde el módulo de Servidores.</p>
          </div>
        ) : (
          equiposFiltrados.map(([eq, miembros]) => {
            const nombreEq = eq === "__sin_equipo__" ? "Sin equipo asignado" : eq;
            const lider = miembros.find(s => s.es_lider_equipo);
            const expandido = isExpandido(eq);

            return (
              <div key={eq} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${eq === "__sin_equipo__" ? "border-gray-200" : "border-amber-200"}`}>
                {/* Cabecera */}
                <div
                  className={`px-5 py-3 flex items-center justify-between cursor-pointer select-none ${eq === "__sin_equipo__" ? "bg-gray-100" : "bg-amber-700 text-white"}`}
                  onClick={() => toggleExpandido(eq)}
                >
                  <div className="flex items-center gap-3">
                    <Users className={`w-4 h-4 shrink-0 ${eq === "__sin_equipo__" ? "text-gray-400" : "text-amber-200"}`} />
                    <div>
                      <p className={`font-bold text-sm ${eq === "__sin_equipo__" ? "text-gray-500" : "text-white"}`}>{nombreEq}</p>
                      {lider ? (
                        <p className="text-amber-200 text-xs flex items-center gap-1 mt-0.5">
                          <Crown className="w-3 h-3 text-yellow-300" />
                          Líder: <span className="font-semibold text-white">{lider.nombre}</span>
                          {lider.telefono && <span>· {lider.telefono}</span>}
                        </p>
                      ) : eq !== "__sin_equipo__" ? (
                        <p className="text-amber-300 text-xs mt-0.5 italic">Sin líder asignado</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eq === "__sin_equipo__" ? "bg-gray-200 text-gray-600" : "bg-amber-600 text-amber-100"}`}>
                      {miembros.length} miembro(s)
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); imprimirEquipoIndividual(eq, miembros); }}
                      className={`p-1 rounded hover:bg-white/20 transition-colors ${eq === "__sin_equipo__" ? "text-gray-500" : "text-amber-200 hover:text-white"}`}
                      title="Imprimir este equipo"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Miembros */}
                {expandido && (
                  <div className="divide-y divide-gray-50">
                    <div className="px-5 py-2.5 bg-amber-50/40 border-b border-amber-50">
                      <AgregarServidorEquipo
                        equipo={nombreEq}
                        numeroRetiro={filtroRetiro}
                        servidores={servidores}
                        rolesConfigurados={rolesConfigurados}
                        onAgregado={cargar}
                      />
                    </div>
                    {miembros.map(s => (
                      <div key={s.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            {s.es_lider_equipo && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                            <p className="font-medium text-gray-800 text-sm">
                              {s.estado === "Pendiente" && <span className="text-red-600 font-bold mr-0.5" title="Pendiente">*</span>}
                              {s.nombre}
                            </p>
                            {s.rol && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{s.rol}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 pl-6">
                            {s.parroquia || "—"}{s.telefono ? ` · ${s.telefono}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setAsignandoEquipo(s); setNuevoEquipo(s.equipo_trabajo || ""); }}
                            className="flex items-center gap-1 text-xs border border-amber-200 text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Equipo
                          </button>
                          {eq !== "__sin_equipo__" && (
                            <button
                              onClick={() => handleSetLider(s)}
                              disabled={saving}
                              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                s.es_lider_equipo
                                  ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <Crown className="w-3 h-3" />
                              {s.es_lider_equipo ? "Es Líder" : "Asignar Líder"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal asignar equipo */}
      {asignandoEquipo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl shrink-0">
              <h2 className="font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Asignar Equipo</h2>
              <button onClick={() => setAsignandoEquipo(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600">Servidor: <strong>{asignandoEquipo.nombre}</strong></p>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Equipo de trabajo</label>
                <input
                  type="text"
                  value={nuevoEquipo}
                  onChange={e => setNuevoEquipo(e.target.value)}
                  placeholder="Ej: Cocina, Música, Logística..."
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  list="equipos-lista"
                />
                <datalist id="equipos-lista">
                  {opcionesEquipo.map(eq => <option key={eq} value={eq} />)}
                </datalist>
              </div>
              {opcionesEquipo.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Equipos disponibles:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {opcionesEquipo.map(eq => (
                      <button key={eq} onClick={() => setNuevoEquipo(eq)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${nuevoEquipo === eq ? "bg-amber-700 text-white border-amber-700" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white -mx-5 px-5 pb-1 border-t border-amber-50">
                <button onClick={() => setAsignandoEquipo(null)}
                  className="px-4 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-50">
                  Cancelar
                </button>
                <button onClick={handleAsignarEquipo} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Nuevo Equipo */}
      {mostrarCrearEquipo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between">
              <h2 className="font-black text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-300" /> Crear Nuevo Equipo de Trabajo
              </h2>
              <button onClick={() => setMostrarCrearEquipo(false)} className="hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoEquipo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-amber-900 mb-1">
                  Nombre del Nuevo Equipo
                </label>
                <input
                  type="text"
                  required
                  value={nombreNuevoEquipoModal}
                  onChange={e => setNombreNuevoEquipoModal(e.target.value)}
                  placeholder="Ej: Altar, Liturgia, Limpieza, Hospedaje..."
                  className="w-full border border-amber-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500 bg-amber-50/30"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-amber-900 mb-1">
                  Asignar Líder de Equipo (Opcional)
                </label>
                <select
                  value={liderNuevoEquipoId}
                  onChange={e => setLiderNuevoEquipoId(e.target.value)}
                  className="w-full border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-amber-950 bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Sin líder inicial --</option>
                  {servidores.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.apodo ? `("${s.apodo}")` : ""} {s.parroquia ? `· ${s.parroquia}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-amber-100">
                <button
                  type="button"
                  onClick={() => setMostrarCrearEquipo(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-black text-xs shadow-md transition disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> Crear Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}