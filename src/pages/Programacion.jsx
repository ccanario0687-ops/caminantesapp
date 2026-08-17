import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";
import { Clock, PlusCircle, Pencil, Trash2, Calendar, Printer, X, Search, Wifi, WifiOff, Plus, User, Loader2, Sunrise, Sun, Moon, UserPlus, Bold, Eye, Download, Upload, FileSpreadsheet, Tv, Save, Check } from "lucide-react";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";
import MobileTopBar from "@/components/MobileTopBar";
import SelectorComunidad from "@/components/SelectorComunidad";
import usePrintGuard from "@/hooks/usePrintGuard";
import useOffline from "@/hooks/useOffline";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import ModeradoresDia from "@/components/programacion/ModeradoresDia";
import ResponsableInput from "@/components/programacion/ResponsableInput";
import VistaPreviaPrograma from "@/components/programacion/VistaPreviaPrograma";

// Convierte "edicion" (que puede ser texto como "9no Retiro...") en un número válido
const parsearNumeroRetiro = (ed) => {
  if (ed == null || ed === "") return "1";
  const m = String(ed).match(/\d+/);
  return m ? m[0] : "1";
};

// Una fila de actividad dentro del mismo horario
const filaVacia = () => ({ actividad: "", responsable: "", responsable_2: "", equipo: "" });

const FORM_VACIO = {
  fecha: "", hora_inicio: "", hora_fin: "", tiempo_minutos: "",
  materiales: "", descripcion: "", ubicacion: "", notas: "",
  actividades: [filaVacia()]
};

export default function Programacion() {
  const { records: todasProgramaciones, loading, online, create: createProg, update: updateProg, remove: removeProg, reload } = useOffline("Programacion");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  // 🔒 AISLAMIENTO MULTI-TENANT ROBUSTO Y FLEXIBLE PARA TODAS LAS COMUNIDADES
  const programaciones = (todasProgramaciones || []).filter(p => {
    if (!equipoIdActivo) return true;
    const eqTarget = String(equipoIdActivo).toLowerCase();
    const pEq = String(p.equipo_id || "").toLowerCase();
    const pCom = String(p.comunidad_id || "").toLowerCase();
    const pRet = String(p.retiro_id || "").toLowerCase();
    const pNom = String(p.comunidad_nombre || "").toLowerCase();
    const nomTarget = String(comunidadActual?.nombre || "").toLowerCase();

    return pEq === eqTarget || pCom === eqTarget || pRet === eqTarget || (nomTarget && pNom === nomTarget);
  });

  const { guardedPrint } = usePrintGuard();
  const [busqueda, setBusqueda] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [numeroRetiro, setNumeroRetiro] = useState("");
  const [configRetiro, setConfigRetiro] = useState(null);
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [modoSeguimiento, setModoSeguimiento] = useState(true);
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [importando, setImportando] = useState(false);
  
  // Ref para el input de archivo oculto
  const fileInputRef = useRef(null);

  // Equipos disponibles según los roles de servidores configurados en Configuración
  const equiposConfigurados = (() => {
    try {
      const r = configRetiro?.roles_servidores;
      const arr = r ? (typeof r === "string" ? JSON.parse(r) : r) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  })();

  const [moderadores, setModeradores] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargarModeradores = async () => {
    const nr = numeroRetiro || parsearNumeroRetiro(configRetiro?.edicion);
    if (!nr) { setModeradores([]); return; }
    try {
      const data = await base44.entities.ModeradorDia.filter({ numero_retiro: Number(nr) });
      const modsFiltrados = (data || []).filter(m => 
        !equipoIdActivo || 
        m.equipo_id === equipoIdActivo || 
        m.comunidad_id === equipoIdActivo
      );
      setModeradores(modsFiltrados);
    } catch { setModeradores([]); }
  };

  useEffect(() => { cargarModeradores(); }, [numeroRetiro, equipoIdActivo]);

  const moderadoresPorFecha = moderadores.reduce((acc, m) => {
    if (!acc[m.fecha]) acc[m.fecha] = [];
    acc[m.fecha].push(m);
    return acc;
  }, {});

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setConfigRetiro(cfgs[0]);
        setNumeroRetiro(parsearNumeroRetiro(cfgs[0].edicion));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.Servidor.list("-created_date").then(srvs => {
      const servsFiltrados = (srvs || []).filter(s => 
        !equipoIdActivo || 
        s.equipo_id === equipoIdActivo || 
        s.comunidad_id === equipoIdActivo
      );
      setServidores(servsFiltrados);
    }).catch(() => {});
  }, [equipoIdActivo]);

  // Días disponibles según retiro actual
  const diasDisponibles = [...new Set(
    programaciones
      .filter(p => !numeroRetiro || String(p.numero_retiro) === numeroRetiro)
      .map(p => p.fecha)
  )].sort();

  // Búsqueda segura tolerante a mayúsculas/minúsculas y campos vacíos
  const filtrados = programaciones.filter(p => {
    const termino = busqueda.toLowerCase();
    const coincideBusqueda = !busqueda ||
      (p.actividad && String(p.actividad).toLowerCase().includes(termino)) ||
      (p.responsable && String(p.responsable).toLowerCase().includes(termino)) ||
      (p.equipo && String(p.equipo).toLowerCase().includes(termino));

    const coincideRetiro = !numeroRetiro || String(p.numero_retiro) === numeroRetiro;
    const coincideDia = !filtroDia || p.fecha === filtroDia;
    return coincideBusqueda && coincideRetiro && coincideDia;
  });

  // Agrupar por fecha
  const porFecha = filtrados.reduce((acc, p) => {
    if (!acc[p.fecha]) acc[p.fecha] = [];
    acc[p.fecha].push(p);
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(porFecha).sort();

  const calcularTiempo = (inicio, fin) => {
    if (!inicio || !fin) return "";
    const [h1, m1] = inicio.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return diff > 0 ? String(diff) : "";
  };

  // ⏱️ UTILIDADES DE SEGUIMIENTO EN TIEMPO REAL DEL RETIRO
  const horaAMinutos = (horaStr) => {
    if (!horaStr) return null;
    const [h, m] = String(horaStr).split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const sumarMinutosAHora = (horaStr, minutos) => {
    const minsBase = horaAMinutos(horaStr);
    if (minsBase == null || !minutos) return horaStr;
    let total = minsBase + Number(minutos);
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const formatMinutos = (mins) => {
    const abs = Math.abs(mins);
    if (abs < 60) return `${abs} min`;
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const calcularDiferenciaMinutos = (p) => {
    if (!p?.hora_fin_real) return null;
    let horaProg = p.hora_fin;
    if (!horaProg && p.hora_inicio && p.tiempo_minutos) {
      horaProg = sumarMinutosAHora(p.hora_inicio, p.tiempo_minutos);
    }
    if (!horaProg) return null;
    const mProg = horaAMinutos(horaProg);
    const mReal = horaAMinutos(p.hora_fin_real);
    if (mProg == null || mReal == null) return null;
    return mReal - mProg;
  };

  const obtenerResumenSeguimiento = (listadoActividades) => {
    if (!listadoActividades || listadoActividades.length === 0) {
      return { completadas: 0, total: 0, totalDiff: 0, estado: "EN_HORA", horaCierreProyectada: null };
    }
    let totalDiff = 0;
    let completadas = 0;
    let ultimaHoraProg = null;

    listadoActividades.forEach(p => {
      const diff = calcularDiferenciaMinutos(p);
      if (diff !== null) {
        totalDiff += diff;
        completadas++;
      }
      if (p.hora_fin) ultimaHoraProg = p.hora_fin;
    });

    let estado = "EN_HORA";
    if (totalDiff > 3) estado = "RETRASADO";
    else if (totalDiff < -3) estado = "ADELANTADO";

    let horaCierreProyectada = null;
    if (ultimaHoraProg) {
      const horaFmt = sumarMinutosAHora(ultimaHoraProg, totalDiff);
      if (horaFmt) {
        const [hh, mm] = horaFmt.split(":").map(Number);
        const ampm = hh < 12 ? "AM" : "PM";
        const h12 = hh % 12 || 12;
        horaCierreProyectada = `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
      }
    }

    return {
      completadas,
      total: listadoActividades.length,
      totalDiff,
      estado,
      horaCierreProyectada
    };
  };

  const getHoraActualHHMM = () => {
    const ahora = new Date();
    const h = String(ahora.getHours()).padStart(2, "0");
    const m = String(ahora.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const abrirTV = () => {
    const url = `${window.location.origin}/pantalla-envivo`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const proyectarEnVivo = async (p) => {
    try {
      const nuevoEstadoEnVivo = !p.en_vivo;

      // Si se activa este, quitar en_vivo de otras actividades
      if (nuevoEstadoEnVivo) {
        for (const item of (programaciones || [])) {
          if (item.en_vivo && item.id !== p.id) {
            await updateProg(item.id, { en_vivo: false }).catch(() => {});
          }
        }
      }

      await updateProg(p.id, { en_vivo: nuevoEstadoEnVivo });

      const payload = nuevoEstadoEnVivo ? { ...p, en_vivo: true } : null;
      const storedKey = `emaus_actividad_proyectada_${equipoIdActivo || 'def'}`;
      if (nuevoEstadoEnVivo) {
        localStorage.setItem(storedKey, JSON.stringify(payload));
        localStorage.setItem("emaus_actividad_proyectada_global", JSON.stringify(payload));
        toast.success(`📺 Proyectando "${p.actividad}" en Pantalla TV en Vivo!`);
      } else {
        localStorage.removeItem(storedKey);
        localStorage.removeItem("emaus_actividad_proyectada_global");
        toast.info(`TV volvió a la secuencia de reloj normal.`);
      }

      // Emitir por BroadcastChannel a todas las pantallas TV abiertas
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "PROYECCION_TV", payload, timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));
    } catch (err) {
      toast.error("Error al proyectar en TV: " + err.message);
    }
  };

  const [alertaCocina, setAlertaCocina] = useState(null);

  useEffect(() => {
    const revisarAlertaCocina = async () => {
      try {
        // 1. Revisar Base44 ConfigRetiro remota (funciona entre diferentes computadoras/celulares)
        if (base44?.entities?.ConfigRetiro?.list) {
          const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
          const cfg = (cfgs || []).find(c => 
            !equipoIdActivo || 
            c.equipo_id === equipoIdActivo || 
            c.comunidad_id === equipoIdActivo
          ) || cfgs?.[0];

          if (cfg?.alerta_cocina) {
            const alerta = cfg.alerta_cocina;
            if (!alerta.atendida && (Date.now() - (alerta.timestamp || 0)) < 45 * 60 * 1000) {
              setAlertaCocina(alerta);
              return;
            }
          }
        }

        // 2. Fallback a localStorage local
        const storedKey = `emaus_alerta_cocina_${equipoIdActivo || 'def'}`;
        const raw = localStorage.getItem(storedKey) || localStorage.getItem("emaus_alerta_cocina_global");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!parsed.atendida && (Date.now() - (parsed.timestamp || 0)) < 45 * 60 * 1000) {
            setAlertaCocina(parsed);
          } else {
            setAlertaCocina(null);
          }
        } else {
          setAlertaCocina(null);
        }
      } catch (e) {}
    };

    revisarAlertaCocina();
    const timerStorage = setInterval(revisarAlertaCocina, 1500);

    let bc;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("emaus_live_broadcast");
        bc.onmessage = (event) => {
          if (event.data?.type === "ALERTA_COCINA") {
            setAlertaCocina(event.data.payload);
            toast.warning(`🍳 ALERTA DE COCINA: Solicitan +${event.data.payload.minutos} min!`, { duration: 8000 });
          } else if (event.data?.type === "DESCARTO_ALERTA_COCINA") {
            setAlertaCocina(null);
          }
        };
      }
    } catch (e) {}

    const handleEvent = (e) => {
      if (e?.detail) setAlertaCocina(e.detail);
      else revisarAlertaCocina();
    };

    window.addEventListener("storage", revisarAlertaCocina);
    window.addEventListener("emaus_alerta_cocina", handleEvent);
    window.addEventListener("emaus_data_changed", revisarAlertaCocina);

    return () => {
      clearInterval(timerStorage);
      if (bc) bc.close();
      window.removeEventListener("storage", revisarAlertaCocina);
      window.removeEventListener("emaus_alerta_cocina", handleEvent);
      window.removeEventListener("emaus_data_changed", revisarAlertaCocina);
    };
  }, [equipoIdActivo]);

  const handleAceptarAlertaCocina = async (alerta) => {
    try {
      const minAdd = Number(alerta?.minutos) || 15;
      if (filtrados && filtrados.length > 0) {
        const objetivo = filtrados.find(p => !p.hora_fin_real) || filtrados[0];
        if (objetivo) {
          const mIni = objetivo.hora_inicio;
          const prevMins = Number(objetivo.tiempo_minutos) || 30;
          const nuevoTiempo = prevMins + minAdd;
          let nuevoHoraFin = objetivo.hora_fin;
          if (mIni) {
            nuevoHoraFin = sumarMinutosAHora(mIni, nuevoTiempo);
          }

          await updateProg(objetivo.id, {
            tiempo_minutos: nuevoTiempo,
            hora_fin: nuevoHoraFin,
            notas: (objetivo.notas ? objetivo.notas + " · " : "") + `[🍳 +${minAdd} min solicitados por Cocina]`
          }).catch(() => {});
        }
      }

      // Limpiar en Base44 remota
      try {
        const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
        const cfg = (cfgs || []).find(c => 
          !equipoIdActivo || 
          c.equipo_id === equipoIdActivo || 
          c.comunidad_id === equipoIdActivo
        ) || cfgs?.[0];

        if (cfg && cfg.id) {
          await base44.entities.ConfigRetiro.update(cfg.id, { alerta_cocina: null }).catch(() => {});
        }
      } catch (e) {}

      const storedKey = `emaus_alerta_cocina_${equipoIdActivo || 'def'}`;
      localStorage.removeItem(storedKey);
      localStorage.removeItem("emaus_alerta_cocina_global");
      setAlertaCocina(null);

      // Notificar por BroadcastChannel
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "DESCARTO_ALERTA_COCINA", timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      toast.success(`✅ Solicitud de Cocina aceptada: +${minAdd} min agregados al programa.`);

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));
    } catch (e) {
      toast.error("Error al procesar la alerta de cocina.");
    }
  };

  const handleDescartarAlertaCocina = async () => {
    try {
      const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
      const cfg = (cfgs || []).find(c => 
        !equipoIdActivo || 
        c.equipo_id === equipoIdActivo || 
        c.comunidad_id === equipoIdActivo
      ) || cfgs?.[0];

      if (cfg && cfg.id) {
        await base44.entities.ConfigRetiro.update(cfg.id, { alerta_cocina: null }).catch(() => {});
      }
    } catch (e) {}

    const storedKey = `emaus_alerta_cocina_${equipoIdActivo || 'def'}`;
    localStorage.removeItem(storedKey);
    localStorage.removeItem("emaus_alerta_cocina_global");
    setAlertaCocina(null);
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("emaus_live_broadcast");
        bc.postMessage({ type: "DESCARTO_ALERTA_COCINA", timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {}
    toast.info("Alerta de cocina atendida.");
  };

  const marcarComoTerminada = async (p, customHoraFin) => {
    try {
      const horaFinal = customHoraFin || p.hora_fin_real || getHoraActualHHMM();
      await updateProg(p.id, {
        hora_fin_real: horaFinal,
        estado_actividad: "REALIZADA",
        completada: true
      });
      toast.success(`🔒 Hora de término registrada (${horaFinal}). Actividad bloqueada.`);

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "PROGRAMACION_ACTUALIZADA", timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));
    } catch (e) {
      toast.error("Error al marcar la actividad como terminada.");
    }
  };

  const desmarcarTerminada = async (p) => {
    try {
      await updateProg(p.id, {
        hora_fin_real: null,
        estado_actividad: "PENDIENTE",
        completada: false
      });
      toast.info(`Actividad "${p.actividad}" desbloqueada y reabierta.`);

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "PROGRAMACION_ACTUALIZADA", timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));
    } catch (e) {
      toast.error("Error al reabrir la actividad.");
    }
  };

  const guardarHoraFinReal = async (id, val) => {
    const horaVal = (val || "").trim();
    if (!horaVal) return;
    try {
      await updateProg(id, { 
        hora_fin_real: horaVal,
        estado_actividad: "REALIZADA",
        completada: true
      });
      toast.success(`🔒 Hora de término fija registrada (${horaVal}). Actividad bloqueada.`);

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "PROGRAMACION_ACTUALIZADA", timestamp: Date.now() });
          bc.close();
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));
    } catch (e) {
      toast.error("Error al fijar la hora de término.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === "hora_inicio" || name === "hora_fin") {
        updated.tiempo_minutos = calcularTiempo(
          name === "hora_inicio" ? value : prev.hora_inicio,
          name === "hora_fin" ? value : prev.hora_fin
        );
      }
      return updated;
    });
  };

  const handleFilaChange = (idx, campo, valor) => {
    setForm(prev => {
      const nuevas = [...prev.actividades];
      nuevas[idx] = { ...nuevas[idx], [campo]: valor };
      return { ...prev, actividades: nuevas };
    });
  };

  const agregarFila = () => {
    setForm(prev => ({ ...prev, actividades: [...prev.actividades, filaVacia()] }));
  };

  const eliminarFila = (idx) => {
    setForm(prev => {
      if (prev.actividades.length === 1) return prev;
      return { ...prev, actividades: prev.actividades.filter((_, i) => i !== idx) };
    });
  };

  const abrirNuevoForm = () => {
    const fechaPorDefecto = filtroDia || (fechasOrdenadas.length > 0 ? fechasOrdenadas[0] : new Date().toISOString().split("T")[0]);
    const horaPorDefecto = getHoraActualHHMM();
    setForm({
      fecha: fechaPorDefecto,
      hora_inicio: horaPorDefecto,
      hora_fin: sumarMinutosAHora(horaPorDefecto, 30),
      tiempo_minutos: 30,
      materiales: "",
      descripcion: "",
      ubicacion: "",
      notas: "",
      actividades: [filaVacia()]
    });
    setEditando(null);
    setMostrarForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fecha || !form.hora_inicio) {
      toast.error("Completa la fecha y hora de inicio de la actividad.");
      return;
    }
    const filasValidas = form.actividades.filter(f => f.actividad && f.actividad.trim() !== "");
    if (filasValidas.length === 0) {
      toast.error("Por favor digita al menos el nombre de la actividad.");
      return;
    }

    const numRetiro = numeroRetiro || parsearNumeroRetiro(configRetiro?.edicion);
    const baseData = {
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin || "",
      tiempo_minutos: form.tiempo_minutos ? Number(form.tiempo_minutos) : null,
      materiales: form.materiales || "",
      descripcion: form.descripcion || "",
      ubicacion: form.ubicacion || "",
      notas: form.notas || "",
      numero_retiro: Number(numRetiro) || 1,
      equipo_id: equipoIdActivo ? String(equipoIdActivo) : (user?.equipo_id ? String(user.equipo_id) : null),
      comunidad_id: equipoIdActivo ? String(equipoIdActivo) : null,
      comunidad_nombre: comunidadActual?.nombre || null,
      retiro_id: equipoIdActivo ? String(equipoIdActivo) : null
    };

    setGuardando(true);
    try {
      if (editando) {
        const f = filasValidas[0];
        await updateProg(editando.id, {
          ...baseData,
          actividad: f.actividad.trim(),
          responsable: f.responsable || "",
          responsable_2: f.responsable_2 || "",
          equipo: f.equipo || ""
        });
        for (let i = 1; i < filasValidas.length; i++) {
          const f = filasValidas[i];
          await createProg({ 
            ...baseData, 
            actividad: f.actividad.trim(), 
            responsable: f.responsable || "", 
            responsable_2: f.responsable_2 || "", 
            equipo: f.equipo || "" 
          });
        }
        toast.success("Programación actualizada exitosamente.");
      } else {
        for (const f of filasValidas) {
          await createProg({ 
            ...baseData, 
            actividad: f.actividad.trim(), 
            responsable: f.responsable || "", 
            responsable_2: f.responsable_2 || "", 
            equipo: f.equipo || "" 
          });
        }
        toast.success(`✅ ${filasValidas.length} actividad(es) guardada(s) correctamente.`);
      }

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("emaus_live_broadcast");
          bc.postMessage({ type: "PROGRAMACION_ACTUALIZADA", timestamp: Date.now() });
          bc.close();
        }
      } catch (errBc) {}

      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Programacion", equipoId: equipoIdActivo, timestamp: Date.now() }
      }));

      cerrarForm();
      reload();
    } catch (err) {
      console.error("❌ Error guardando actividad:", err);
      toast.error("Error al guardar: " + (err?.message || "Revisa la conexión."));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await removeProg(id);
    toast.success(online ? "Actividad eliminada" : "Actividad eliminada (se sincronizará al conectar).");
  };

  const toggleResaltar = async (p) => {
    const nuevoValor = !p.resaltar;
    await updateProg(p.id, { resaltar: nuevoValor });
    toast.success(nuevoValor ? "Actividad resaltada" : "Resaltado quitado");
  };

  const abrirEdicion = (prog) => {
    setForm({
      fecha: prog.fecha || "",
      hora_inicio: prog.hora_inicio || "",
      hora_fin: prog.hora_fin || "",
      tiempo_minutos: prog.tiempo_minutos || "",
      materiales: prog.materiales || "",
      descripcion: prog.descripcion || "",
      ubicacion: prog.ubicacion || "",
      notas: prog.notas || "",
      actividades: [{ actividad: prog.actividad || "", responsable: prog.responsable || "", responsable_2: prog.responsable_2 || "", equipo: prog.equipo || "" }]
    });
    setEditando(prog);
    setMostrarForm(true);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setForm({ ...FORM_VACIO, actividades: [filaVacia()] });
  };

  const formatFecha = (f) => {
    const d = new Date(f + "T12:00:00");
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const formatHora = (h) => {
    if (!h) return "-";
    const [hh, mm] = h.split(":").map(Number);
    const ampm = hh < 12 ? "AM" : "PM";
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
  };

  const shiftOf = (h) => {
    const hh = Number((h || "0").split(":")[0]);
    if (hh < 12) return "Mañana";
    if (hh < 18) return "Tarde";
    return "Noche";
  };

  const modDe = (fecha, turno) => {
    const m = (moderadoresPorFecha[fecha] || []).find(x => x.turno === turno);
    return m?.nombre || "";
  };

  const SHIFT_META = {
    "Mañana": { Icon: Sunrise, cls: "text-amber-500" },
    "Tarde": { Icon: Sun, cls: "text-orange-500" },
    "Noche": { Icon: Moon, cls: "text-indigo-500" },
  };

  const dividerTurno = (fecha, turno) => {
    const meta = SHIFT_META[turno] || SHIFT_META["Mañana"];
    const Icon = meta.Icon;
    const nombre = modDe(fecha, turno);
    return (
      <tr key={`div-${fecha}-${turno}`}>
        <td colSpan={10} className="bg-amber-50 border-y border-amber-200 px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={`w-4 h-4 ${meta.cls}`} />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">{turno}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-700">
              Moderador: <strong className={nombre ? "text-amber-800" : "text-gray-400"}>{nombre || "Sin asignar"}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(`mod-input-${fecha}-${turno}`);
                if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
              }}
              className="ml-auto flex items-center gap-1 text-xs bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded-lg font-medium"
            >
              <UserPlus className="w-3 h-3" /> {nombre ? "Editar" : "Agregar"} moderador
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ─── FUNCIONES DE EXPORTAR / IMPORTAR ──────────────────────────────────────

  const descargarPlantilla = () => {
    const csvContent = "Fecha,Hora Inicio,Hora Fin,Actividad,Responsable,Responsable 2,Equipo,Materiales,Descripcion,Notas\n2024-10-25,08:00,09:00,Laudes,Juan Perez,Maria Lopez,Equipo Liturgia,Biblias,Canto inicial,Revisar micrófonos";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Plantilla_Programacion.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada. Ábrela en Excel, llena los datos y guarda como CSV.");
  };

  const exportarAExcel = () => {
    if (filtrados.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Programación</title>
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th { background-color: #78350f; color: white; font-weight: bold; padding: 6px 8px; text-align: left; font-size: 10pt; border: 1px solid #451a03; }
        td { border: 1px solid #d1d5db; padding: 4px 8px; font-size: 9pt; color: #1f2937; vertical-align: top; }
        tr:nth-child(even) td { background-color: #fffbeb; }
        .resaltado { background-color: #fef3c7 !important; font-weight: bold; }
      </style>
      </head><body>
      <h2 style="font-size: 14pt; font-weight: bold; color: #78350f; margin-bottom: 8px;">Programación del Retiro (${comunidadActual?.nombre || "General"})</h2>
      <p style="font-size: 9pt; color: #666; margin-bottom: 12px;">Total: ${filtrados.length} actividades | Fecha: ${new Date().toLocaleDateString("es-ES")}</p>
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Hora Inicio</th><th>Hora Fin</th><th>Tiempo</th>
            <th>Actividad</th><th>Descripción</th><th>Responsable</th><th>Responsable 2</th>
            <th>Equipo</th><th>Materiales</th><th>Notas</th>
          </tr>
        </thead>
        <tbody>
          ${filtrados.map(p => `
            <tr class="${p.resaltar ? 'resaltado' : ''}">
              <td>${p.fecha || '-'}</td>
              <td>${p.hora_inicio || '-'}</td>
              <td>${p.hora_fin || '-'}</td>
              <td>${p.tiempo_minutos ? p.tiempo_minutos + ' min' : '-'}</td>
              <td>${p.actividad || '-'}</td>
              <td>${p.descripcion || '-'}</td>
              <td>${p.responsable || '-'}</td>
              <td>${p.responsable_2 || '-'}</td>
              <td>${p.equipo || '-'}</td>
              <td>${p.materiales || '-'}</td>
              <td>${p.notas || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Programacion_Retiro_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Archivo Excel generado exitosamente");
  };

  const procesarImportacion = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      toast.error("Por favor, sube un archivo CSV o Excel");
      return;
    }

    setImportando(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        // Parser CSV simple que maneja comillas
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length < 2) {
          toast.error("El archivo está vacío o no tiene el formato correcto");
          setImportando(false);
          return;
        }

        // Extraer headers (primera línea)
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        
        let exitosos = 0;
        let errores = 0;
        const numRetiro = numeroRetiro || parsearNumeroRetiro(configRetiro?.edicion);

        // Procesar desde la segunda línea
        for (let i = 1; i < lines.length; i++) {
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const row = matches.map(val => val.replace(/^"|"$/g, '').trim());
          
          if (row.length < 4) continue; // Saltar filas incompletas

          const getVal = (key) => {
            const idx = headers.findIndex(h => h.includes(key));
            return idx !== -1 ? row[idx] : "";
          };

          const fecha = getVal("fecha");
          const horaInicio = getVal("hora inicio") || getVal("inicio");
          const actividad = getVal("actividad");

          if (!fecha || !horaInicio || !actividad) {
            errores++;
            continue;
          }

          const [h1, m1] = horaInicio.split(":").map(Number);
          const horaFin = getVal("hora fin") || getVal("fin");
          let tiempo = getVal("tiempo");
          
          if (!tiempo && horaFin) {
            const [h2, m2] = horaFin.split(":").map(Number);
            const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff > 0) tiempo = String(diff);
          }

          try {
            await createProg({
              fecha,
              hora_inicio: horaInicio,
              hora_fin: horaFin || "",
              tiempo_minutos: tiempo ? Number(tiempo) : undefined,
              actividad,
              responsable: getVal("responsable"),
              responsable_2: getVal("responsable 2"),
              equipo: getVal("equipo"),
              materiales: getVal("materiales"),
              descripcion: getVal("descripcion") || getVal("descripción"),
              notas: getVal("notas"),
              numero_retiro: Number(numRetiro),
              equipo_id: equipoIdActivo || user?.equipo_id || null,
              comunidad_id: equipoIdActivo || null,
              resaltar: false
            });
            exitosos++;
          } catch (err) {
            console.error("Error importando fila", i, err);
            errores++;
          }
        }

        if (exitosos > 0) {
          toast.success(`Se importaron ${exitosos} actividades exitosamente.`);
          if (errores > 0) toast.warning(`${errores} filas fueron omitidas por datos incompletos.`);
          reload();
        } else {
          toast.error("No se pudo importar ninguna actividad. Revisa el formato.");
        }
      } catch (err) {
        toast.error("Error al procesar el archivo: " + err.message);
      } finally {
        setImportando(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  // ─── RENDERIZADO ───────────────────────────────────────────────────────────

  const nombreRetiro = configRetiro?.nombre_retiro || "Retiro de Emaús";
  const edicion = configRetiro?.edicion ? `Retiro #${configRetiro.edicion}` : "";

  return (
    <div className="pb-12">
      <MobileTopBar title="Programación" />

      {/* Selector de Comunidad Superior */}
      <div className="mb-4">
        <SelectorComunidad />
      </div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-amber-900">Programación del Retiro</h1>
            {online ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
          <p className="text-amber-600 text-sm mt-1">
            {nombreRetiro}{edicion ? ` · ${edicion}` : ""} · Agenda para {comunidadActual?.nombre || "la comunidad activa"}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={descargarPlantilla} title="Descargar formato base"
            className="flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow border border-gray-200">
            <FileSpreadsheet className="w-4 h-4" /> Plantilla
          </button>
          
          <button onClick={exportarAExcel} title="Exportar datos actuales"
            className="flex items-center gap-2 bg-green-700 text-white hover:bg-green-800 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          
          <label className="flex items-center gap-2 bg-blue-700 text-white hover:bg-blue-800 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow cursor-pointer">
            <Upload className="w-4 h-4" /> 
            {importando ? "Importando..." : "Importar"}
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv,.xls,.xlsx" 
              onChange={procesarImportacion} 
              className="hidden" 
              disabled={importando}
            />
          </label>

          <button onClick={() => setModoSeguimiento(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow ${
              modoSeguimiento
                ? "bg-amber-900 text-white shadow-md border border-yellow-500/40"
                : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-50"
            }`}>
            <Clock className="w-4 h-4 text-yellow-400" />
            {modoSeguimiento ? "⏱️ Seguimiento Activo" : "⏱️ Activar Seguimiento"}
          </button>

          <button
            type="button"
            onClick={abrirTV}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-900 to-amber-950 text-amber-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow border border-amber-500/40 hover:scale-105"
            title="Abrir pantalla gigante de TV para bastidores y cocina"
          >
            <Tv className="w-4 h-4 text-amber-400" /> 📺 TV Bastidores
          </button>

          <button onClick={() => setMostrarPreview(true)}
            className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-100 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow border border-amber-200">
            <Eye className="w-4 h-4" /> Vista Previa
          </button>
          
          <button onClick={() => guardedPrint(() => setMostrarReporte(true))}
            className="flex items-center gap-2 bg-amber-700 text-white hover:bg-amber-800 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          
          <button onClick={abrirNuevoForm}
            className="flex items-center gap-2 bg-amber-800 text-white hover:bg-amber-900 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow cursor-pointer">
            <PlusCircle className="w-4 h-4" /> Nueva
          </button>
        </div>
      </div>

      {/* BANNER DE ALERTA DE COCINA (SOLICITUD DE TIEMPO) */}
      <BannerAlertaCocina
        alerta={alertaCocina}
        onAceptar={handleAceptarAlertaCocina}
        onDescartar={handleDescartarAlertaCocina}
      />

      {/* BANNER DINÁMICO DE SEGUIMIENTO EN TIEMPO REAL DE ESTADO DEL RETIRO */}
      {modoSeguimiento && (() => {
        const diaTarget = filtroDia || (fechasOrdenadas.length > 0 ? fechasOrdenadas[0] : null);
        const actsTarget = diaTarget ? (porFecha[diaTarget] || []) : filtrados;
        const resumen = obtenerResumenSeguimiento(actsTarget);
        return (
          <BannerSeguimiento
            resumen={resumen}
            diaTexto={diaTarget ? formatFecha(diaTarget) : "General del Retiro"}
          />
        );
      })()}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
          <input type="text" placeholder="Buscar actividad, responsable o equipo..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
        </div>
        <MobileSelect
          value={filtroDia}
          onChange={setFiltroDia}
          options={[{ value: "", label: "Todos los días" }, ...diasDisponibles.map(d => ({ value: d, label: formatFecha(d) }))]}
          className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Vista horizontal agrupada por día */}
      {loading ? (
        <p className="text-amber-600 text-sm">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p>No hay actividades programadas en esta comunidad.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {fechasOrdenadas.map(fecha => (
            <div key={fecha} className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
              <div className="bg-amber-700 text-white px-5 py-3 flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 opacity-80" />
                <span className="font-bold text-sm capitalize">{formatFecha(fecha)}</span>
                <span className="ml-auto text-amber-200 text-xs">{porFecha[fecha].length} actividad(es)</span>
              </div>
              
              <ModeradoresDia
                fecha={fecha}
                numeroRetiro={numeroRetiro || parsearNumeroRetiro(configRetiro?.edicion)}
                registros={moderadoresPorFecha[fecha] || []}
                onGuardado={cargarModeradores}
              />
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 border-b border-amber-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">#</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Hora Desde</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Hora Hasta</th>
                      {modoSeguimiento && (
                        <th className="text-left px-4 py-2 text-amber-900 font-bold whitespace-nowrap bg-amber-100/70 border-x border-amber-200">
                          ⏱️ Fin Real / Desviación
                        </th>
                      )}
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Tiempo</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Actividad</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Responsable</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Equipo</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Materiales</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const acts = [...porFecha[fecha]].sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));
                      let turnoAnterior = null;
                      let idx = 0;
                      const rows = [];
                      acts.forEach((p) => {
                        const turnoActual = shiftOf(p.hora_inicio);
                        if (turnoActual !== turnoAnterior) {
                          rows.push(dividerTurno(fecha, turnoActual));
                          turnoAnterior = turnoActual;
                        }
                        const i = idx++;
                        const esRealizada = Boolean(p.hora_fin_real || p.estado_actividad === "REALIZADA" || p.completada);
                        const rowClass = esRealizada
                          ? "bg-red-50/90 border-l-4 border-red-600 text-red-950 font-bold shadow-xs"
                          : p.resaltar
                            ? "bg-amber-100/70"
                            : i % 2 === 0
                              ? "bg-white"
                              : "bg-amber-50/50";

                        rows.push(
                          <tr key={p.id} className={rowClass}>
                            <td className="px-2.5 py-2 text-amber-600 font-bold text-center text-xs">{i + 1}</td>
                            <td className="px-2.5 py-2 font-medium text-amber-900 whitespace-nowrap text-xs">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-50" />{formatHora(p.hora_inicio)}</span>
                            </td>
                            <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap text-xs">{formatHora(p.hora_fin)}</td>

                            {/* COLUMNA DINÁMICA DE HORA FIN REAL Y CÁLCULO DE DESVIACIÓN COMPACTA */}
                            {modoSeguimiento && (
                              <td className="px-2.5 py-1.5 whitespace-nowrap bg-amber-50/40 border-x border-amber-100">
                                <div className="flex flex-col gap-1 items-start min-w-[160px]">
                                  {/* Botón Terminar situado ARRIBA del selector de tiempo */}
                                  <div className="flex items-center gap-1 w-full">
                                    <button
                                      type="button"
                                      onClick={() => esRealizada ? desmarcarTerminada(p) : marcarComoTerminada(p, getHoraActualHHMM())}
                                      title={esRealizada ? "Reabrir actividad" : "Dar por terminada esta actividad con la hora actual"}
                                      className={`px-2 py-0.5 rounded text-[11px] font-black transition border cursor-pointer ${
                                        esRealizada
                                          ? "bg-red-600 text-white border-red-700 shadow-2xs"
                                          : "bg-amber-800 hover:bg-amber-900 text-white border-amber-900 shadow-2xs"
                                      }`}
                                    >
                                      {esRealizada ? "🔴 REALIZADA" : "🔴 Terminar"}
                                    </button>
                                    {esRealizada && (
                                      <button
                                        type="button"
                                        onClick={() => desmarcarTerminada(p)}
                                        title="Reabrir / Desmarcar hora de término"
                                        className="text-gray-400 hover:text-red-600 text-xs font-bold cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {/* Selector de Hora Fin Real (Guardado Automático al seleccionar, digitar o presionar Enter) */}
                                  <div className="flex items-center gap-1 w-full">
                                    <input
                                      id={`input-hora-fin-${p.id}`}
                                      type="time"
                                      disabled={esRealizada}
                                      readOnly={esRealizada}
                                      value={p.hora_fin_real || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val && val.length === 5) {
                                          guardarHoraFinReal(p.id, val);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const val = e.target.value;
                                        if (val && val.length === 5 && val !== p.hora_fin_real) {
                                          guardarHoraFinReal(p.id, val);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && e.target.value && e.target.value.length === 5) {
                                          guardarHoraFinReal(p.id, e.target.value);
                                        }
                                      }}
                                      title={esRealizada ? "Actividad finalizada y fijada. Presione ✏️ Editar para modificar." : "Seleccione o digite la hora de fin real (se guarda automáticamente al elegir)"}
                                      className={`w-full border rounded px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs ${
                                        esRealizada ? "border-red-400 bg-red-100/90 text-red-950 font-black cursor-not-allowed opacity-90" : "border-amber-300 bg-white text-gray-800"
                                      }`}
                                    />
                                  </div>

                                  {/* Badge de estado de la actividad con botón Editar */}
                                  {(() => {
                                    if (esRealizada) {
                                      const diff = calcularDiferenciaMinutos(p);
                                      let diffBadge = "";
                                      if (diff > 0) diffBadge = ` (+${diff}m)`;
                                      else if (diff < 0) diffBadge = ` (${diff}m)`;
                                      return (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-black text-red-800 bg-red-100 px-1.5 py-0.5 rounded border border-red-300 flex items-center gap-1">
                                            🔒 REALIZADA {p.hora_fin_real ? `(${p.hora_fin_real})` : ""}{diffBadge}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => desmarcarTerminada(p)}
                                            title="Desbloquear para modificar hora de término"
                                            className="text-[10px] text-red-700 hover:text-red-900 font-bold hover:underline cursor-pointer"
                                          >
                                            ✏️ Editar
                                          </button>
                                        </div>
                                      );
                                    }
                                    return <span className="text-[10px] text-gray-400 font-medium">Pendiente</span>;
                                  })()}
                                </div>
                              </td>
                            )}

                            <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap text-xs">{p.tiempo_minutos ? `${p.tiempo_minutos} min` : "-"}</td>
                            
                            {/* COLUMNA ACTIVIDAD CON ANCHO HORIZONTAL EXPANDIDO */}
                            <td className="px-3 py-2 min-w-[300px] max-w-[500px]">
                              <span className={esRealizada ? "font-black text-red-950 text-sm leading-snug block" : p.resaltar ? "font-bold text-amber-900 text-sm leading-snug block" : "font-medium text-gray-800 text-sm leading-snug block"}>
                                {esRealizada && <span className="mr-1 text-red-600">🔒</span>}
                                {p.actividad}
                              </span>
                              {p.descripcion && <span className="block text-xs font-normal text-gray-500 mt-0.5 leading-relaxed">{p.descripcion}</span>}
                            </td>

                            <td className="px-2.5 py-2 text-gray-600 font-medium text-xs">
                              {p.responsable || "-"}
                              {p.responsable_2 && <span className="block text-[11px] text-amber-600">{p.responsable_2}</span>}
                            </td>
                            <td className="px-2.5 py-2 whitespace-nowrap">
                              {p.equipo ? <span className="inline-block bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-xs">{p.equipo}</span> : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-2.5 py-2 text-gray-600 text-xs max-w-[180px]">{p.materiales || "-"}</td>
                            
                            {/* COLUMNA DE ACCIONES LIMPIA Y SIN BOTÓN DUPLICADO */}
                            <td className="px-2.5 py-2 whitespace-nowrap">
                              <div className="flex gap-2 items-center">
                                <button
                                  type="button"
                                  onClick={() => proyectarEnVivo(p)}
                                  title={p.en_vivo ? "En Vivo en Pantalla TV (Haga clic para des-proyectar)" : "Proyectar esta actividad en vivo en la pantalla de TV"}
                                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-black transition-all border shadow-xs ${
                                    p.en_vivo
                                      ? "bg-red-600 text-white border-red-500 shadow-md animate-pulse"
                                      : "bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200"
                                  }`}
                                >
                                  <Tv className="w-3.5 h-3.5" />
                                  {p.en_vivo ? "EN VIVO 📺" : "Proyectar"}
                                </button>
                                <button 
                                  onClick={() => {
                                    if (esRealizada) {
                                      toast.warning("Esta actividad está finalizada y bloqueada. Haz clic en ✕ o Reabrir para desbloquearla antes de editar.");
                                    } else {
                                      abrirEdicion(p);
                                    }
                                  }} 
                                  className={esRealizada ? "text-gray-300 cursor-not-allowed" : "text-amber-600 hover:text-amber-800"} 
                                  title={esRealizada ? "Actividad Bloqueada (Finalizada)" : "Editar"}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => toggleResaltar(p)} title={p.resaltar ? "Quitar resaltado" : "Resaltar actividad"} className={p.resaltar ? "text-amber-700 bg-amber-200 rounded px-1" : "text-gray-400 hover:text-amber-700"}><Bold className="w-4 h-4" /></button>
                                <button 
                                  onClick={() => {
                                    if (esRealizada) {
                                      toast.warning("Esta actividad está finalizada y bloqueada. Debe reabrirla antes de eliminarla.");
                                    } else {
                                      eliminar(p.id);
                                    }
                                  }} 
                                  className={esRealizada ? "text-gray-300 cursor-not-allowed" : "text-red-400 hover:text-red-600"} 
                                  title={esRealizada ? "Actividad Bloqueada" : "Eliminar"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarReporte && (
        <ReporteDiario programaciones={filtrados} configRetiro={configRetiro} numeroRetiro={numeroRetiro} moderadoresPorFecha={moderadoresPorFecha} onClose={() => setMostrarReporte(false)} />
      )}

      {mostrarPreview && (
        <VistaPreviaPrograma
          programaciones={filtrados}
          configRetiro={configRetiro}
          numeroRetiro={numeroRetiro}
          moderadoresPorFecha={moderadoresPorFecha}
          onClose={() => setMostrarPreview(false)}
          onPrint={() => { setMostrarPreview(false); guardedPrint(() => setMostrarReporte(true)); }}
        />
      )}

      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold">{editando ? "Editar" : "Nueva"} Actividad ({comunidadActual?.nombre || "General"})</h2>
              <button onClick={cerrarForm} className="hover:opacity-75"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Fecha *</label>
                  <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Hora Desde *</label>
                  <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={handleChange} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Hora Hasta</label>
                  <input type="time" name="hora_fin" value={form.hora_fin} onChange={handleChange} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-800 mb-1">Tiempo (min)</label>
                  <input type="number" name="tiempo_minutos" value={form.tiempo_minutos} onChange={handleChange} placeholder="Ej: 60" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-amber-800">Actividades en este horario ({form.actividades.length})</label>
                  <button type="button" onClick={agregarFila} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    <Plus className="w-3 h-3" /> Otra actividad
                  </button>
                </div>
                {form.actividades.map((fila, idx) => (
                  <div key={idx} className="bg-white border border-amber-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700">Actividad #{idx + 1}</span>
                      {form.actividades.length > 1 && (
                        <button type="button" onClick={() => eliminarFila(idx)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Quitar
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-amber-800 mb-1 font-semibold">Actividad *</label>
                      <input type="text" value={fila.actividad} onChange={e => handleFilaChange(idx, "actividad", e.target.value)} placeholder="Ej: Charla, Oración, Comida..." className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-amber-800 mb-1 font-semibold">Responsable 1</label>
                        <ResponsableInput value={fila.responsable} servidores={servidores} onChange={v => handleFilaChange(idx, "responsable", v)} onSelect={(s) => { handleFilaChange(idx, "responsable", s.nombre); if (s.equipo_trabajo && !fila.equipo) handleFilaChange(idx, "equipo", s.equipo_trabajo); }} />
                      </div>
                      <div>
                        <label className="block text-xs text-amber-800 mb-1 font-semibold">Responsable 2</label>
                        <ResponsableInput value={fila.responsable_2} servidores={servidores} onChange={v => handleFilaChange(idx, "responsable_2", v)} onSelect={(s) => { handleFilaChange(idx, "responsable_2", s.nombre); if (s.equipo_trabajo && !fila.equipo) handleFilaChange(idx, "equipo", s.equipo_trabajo); }} />
                      </div>
                      <div>
                        <label className="block text-xs text-amber-800 mb-1 font-semibold">Equipo (editable)</label>
                        <input type="text" list={`equipos-${idx}`} value={fila.equipo} onChange={e => handleFilaChange(idx, "equipo", e.target.value)} placeholder="Escribe o elige el equipo..." className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <datalist id={`equipos-${idx}`}>{equiposConfigurados.map(eq => (<option key={eq} value={eq} />))}</datalist>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Materiales a Utilizar</label>
                <textarea name="materiales" value={form.materiales} onChange={handleChange} rows={2} placeholder="Lista de materiales necesarios..." className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-800 mb-1">Descripción / Notas</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarForm} className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center gap-2">
                  {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReporteDiario({ programaciones, configRetiro, numeroRetiro, moderadoresPorFecha, onClose }) {
  const agrupadosPorDia = programaciones.reduce((acc, p) => {
    if (!acc[p.fecha]) acc[p.fecha] = [];
    acc[p.fecha].push(p);
    return acc;
  }, {});
  const dias = Object.keys(agrupadosPorDia).sort();

  const formatFechaLarga = (f) => {
    const d = new Date(f + "T12:00:00");
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const nombreRetiro = configRetiro?.nombre_retiro || "Retiro de Emaús";
  const edicion = configRetiro?.edicion ? `Retiro #${configRetiro.edicion}` : (numeroRetiro ? `Retiro #${numeroRetiro}` : "");

  const handlePrint = () => {
    const fmtH = (h) => {
      if (!h) return "—";
      const [hh, mm] = h.split(":").map(Number);
      const ap = hh < 12 ? "AM" : "PM";
      return `${hh % 12 || 12}:${String(mm).padStart(2,"0")} ${ap}`;
    };

    const secciones = dias.map(fecha => {
      const acts = agrupadosPorDia[fecha];
      const filas = acts.map(a => `
        <tr>
          <td class="text-center">${fmtH(a.hora_inicio)}</td>
          <td class="text-center">${fmtH(a.hora_fin)}</td>
          <td class="text-center">${a.tiempo_minutos ? a.tiempo_minutos + " min" : "—"}</td>
          <td class="${a.resaltar ? 'font-bold' : 'font-semibold'}" ${a.resaltar ? 'style="background:#fef3c7;color:#78350f"' : ''}>${a.actividad}${a.descripcion ? `<br><span style="color:#6b7280;font-size:9px">${a.descripcion}</span>` : ""}</td>
          <td>${a.responsable || "—"}${a.responsable_2 ? `<br><span style="font-size:9px;color:#b45309">${a.responsable_2}</span>` : ""}</td>
          <td class="font-semibold" style="color:#b45309;">${a.equipo || "—"}</td>
          <td style="font-size:9px">${a.materiales || "—"}</td>
        </tr>
      `).join("");
      const mods = moderadoresPorFecha?.[fecha] || [];
      const lineaMods = ["Mañana","Tarde","Noche"].map(t => {
        const m = mods.find(x => x.turno === t);
        return m?.nombre ? `${t}: ${m.nombre}` : null;
      }).filter(Boolean).join("  ·  ");
      const modsHTML = lineaMods
        ? `<div style="font-size:10px;color:#444;margin:4px 0 8px;padding:5px 10px;background:#fffbeb;border-radius:4px"><strong>Moderadores:</strong> ${lineaMods}</div>`
        : "";
      return `
        <div style="margin-bottom:18px">
          <div class="section-title">📅 ${formatFechaLarga(fecha)} <span style="font-weight:400;font-size:9px;color:#888;margin-left:8px">${acts.length} actividad(es)</span></div>
          ${modsHTML}
          <table class="print-table">
            <thead><tr>
              <th class="text-center">Hora Desde</th><th class="text-center">Hora Hasta</th><th class="text-center">Tiempo</th>
              <th>Actividad</th><th>Responsable</th><th>Equipo</th><th>Materiales</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>`;
    }).join("");

    const body = `
      ${printHeaderHTML({
        titulo: "Programación del Retiro",
        subtitulo: nombreRetiro,
        numeroRetiro: numeroRetiro || undefined,
        total: programaciones.length,
        extraInfo: edicion,
        coordinador: configRetiro?.coordinador,
        sub_coordinador: configRetiro?.sub_coordinador
      })}
      ${secciones}
      ${printFooterHTML()}
    `;

    openPrintWindow(buildPrintDoc("Programación del Retiro", body, `
      .section-title { font-size:12px; font-weight:700; color:#1a1a2e; margin:18px 0 8px 0; padding:5px 10px; border-left:3px solid #1a1a2e; background:#f9fafb; text-transform:capitalize; letter-spacing:0.5px; }
    `));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <h2 className="text-lg font-bold">Imprimir Programa</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-2">Se imprimirán las actividades agrupadas por día en formato horizontal (A4 apaisado).</p>
          <p className="text-xs text-gray-500 mb-4">{dias.length} día(s) · {programaciones.length} actividad(es)</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerSeguimiento({ resumen, diaTexto }) {
  const { completadas, total, totalDiff, estado, horaCierreProyectada } = resumen;

  if (total === 0) return null;

  const absMins = Math.abs(totalDiff);
  const formatMins = absMins < 60 ? `${absMins} min` : `${Math.floor(absMins / 60)}h ${absMins % 60}min`;

  let bgClass = "from-emerald-700 via-green-800 to-emerald-900 border-emerald-500 shadow-emerald-900/20";
  let badgeText = "🟢 RETIRO EN HORA";
  let badgeSubText = `El programa (${diaTexto}) se está cumpliendo según lo planificado.`;

  if (estado === "RETRASADO") {
    bgClass = "from-red-800 via-amber-900 to-red-950 border-red-500 shadow-red-900/30";
    badgeText = `🔴 RETIRO RETRASADO POR ${formatMins}`;
    badgeSubText = `Se han acumulado ${formatMins} de retraso en las actividades completadas.`;
  } else if (estado === "ADELANTADO") {
    bgClass = "from-blue-800 via-indigo-900 to-blue-950 border-blue-500 shadow-blue-900/30";
    badgeText = `🔵 RETIRO ADELANTADO POR ${formatMins}`;
    badgeSubText = `El retiro tiene ${formatMins} a favor sobre el horario previsto.`;
  }

  return (
    <div className={`mb-4 rounded-xl bg-gradient-to-r ${bgClass} text-white px-4 py-3 shadow-lg border relative overflow-hidden transition-all`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 shrink-0">
          <Clock className="w-5 h-5 text-amber-300 animate-spin-slow shrink-0" />
          <div>
            <h2 className="text-base font-black tracking-tight uppercase leading-tight">{badgeText}</h2>
            <p className="text-[11px] text-amber-100/90 font-medium">{badgeSubText}</p>
          </div>
        </div>

        {/* 📊 BLOQUE COMPACTO HORIZONTAL DE MÉTRICAS AL LADO DE LA HORA FINAL */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-center min-w-[110px]">
            <span className="text-[9px] uppercase font-bold text-amber-200 block tracking-wider">Avance</span>
            <span className="text-xs font-black text-white">{completadas} / {total} Act.</span>
          </div>

          <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/15 text-center min-w-[115px]">
            <span className="text-[9px] uppercase font-bold text-amber-200 block tracking-wider">Desviación</span>
            <span className={`text-xs font-black ${totalDiff > 0 ? "text-red-300" : totalDiff < 0 ? "text-blue-300" : "text-green-300"}`}>
              {totalDiff > 0 ? `+${totalDiff} min` : totalDiff < 0 ? `${totalDiff} min` : "0 min"}
            </span>
          </div>

          {horaCierreProyectada && (
            <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-amber-400/50 text-center shadow-md min-w-[170px]">
              <span className="text-[9px] uppercase font-black text-amber-300 block tracking-wider">
                🏁 HORA FINAL CIERRE ({diaTexto})
              </span>
              <span className="text-sm font-black text-yellow-300 font-mono">{horaCierreProyectada}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BannerAlertaCocina({ alerta, onAceptar, onDescartar }) {
  if (!alerta || alerta.atendida) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-orange-950 via-amber-900 to-red-950 border-2 border-amber-400 rounded-2xl p-5 shadow-2xl text-white animate-pulse relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black text-2xl">
            🍳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                🍳 ALERTA URGENTE DE COCINA ({alerta.horaSolicitud || "Ahora"})
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              Cocina solicita <span className="text-yellow-300 font-extrabold">+{alerta.minutos} MINUTOS ADICIONALES</span>
            </h3>
            <p className="text-xs text-amber-200 mt-0.5 italic">
              "{alerta.mensaje || "La comida requiere tiempo adicional antes de ser servida."}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => onAceptar(alerta)}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition hover:scale-105 cursor-pointer"
          >
            ✅ Aceptar y Sumar +{alerta.minutos} Min
          </button>
          <button
            onClick={() => onDescartar(alerta)}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs border border-white/20 transition cursor-pointer"
          >
            👁️ Entendido
          </button>
        </div>
      </div>
    </div>
  );
}