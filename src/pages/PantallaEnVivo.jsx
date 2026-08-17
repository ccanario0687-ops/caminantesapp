import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import { Clock, Calendar, AlertTriangle, Maximize, Minimize, Utensils, HeartPulse, ChevronRight, Activity, Flame, ShieldAlert, Sparkles, X } from "lucide-react";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";

// Convierte "14:30" -> minutos desde medianoche
const horaAMinutos = (horaStr) => {
  if (!horaStr) return null;
  const [h, m] = String(horaStr).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Suma minutos a "HH:MM"
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

const formatHora12 = (horaStr) => {
  if (!horaStr) return "--:--";
  const [h, m] = String(horaStr).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return horaStr;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export default function PantallaEnVivo() {
  const { records: todasProgramaciones, reload: reloadProg } = useOffline("Programacion");
  const { records: todosCaminantes, reload: reloadCam } = useOffline("Caminante");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const [programacionesDirectas, setProgramacionesDirectas] = useState(null);

  // Consulta directa y continua a Base44 para garantizar sincronización en vivo cada 1.5s
  useEffect(() => {
    let cancel = false;
    const fetchDirecto = async () => {
      try {
        const list = await base44.entities.Programacion.list();
        if (!cancel && Array.isArray(list)) {
          setProgramacionesDirectas(list);
        }
      } catch (e) {}
    };

    fetchDirecto();
    const interval = setInterval(fetchDirecto, 1500);
    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, []);

  const listaBase = programacionesDirectas || todasProgramaciones || [];

  const programacionesFiltradas = listaBase.filter(p => 
    !equipoIdActivo || 
    p.equipo_id === equipoIdActivo || 
    p.comunidad_id === equipoIdActivo ||
    p.comunidad_slug === equipoIdActivo
  );
  const programaciones = programacionesFiltradas.length > 0 ? programacionesFiltradas : listaBase;

  const caminantes = (todosCaminantes || []).filter(c => 
    !equipoIdActivo || 
    c.equipo_id === equipoIdActivo || 
    c.comunidad_id === equipoIdActivo
  );

  const [horaActual, setHoraActual] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState("TODOS"); // 'TODOS' | 'COCINA' | 'MEDICO'
  const [actividadProyectadaLocal, setActividadProyectadaLocal] = useState(null);
  const [mostrarModalPedirTiempo, setMostrarModalPedirTiempo] = useState(false);
  const [diaManual, setDiaManual] = useState(null);

  // Escuchar cambios directo de la entidad Programacion via Base44 WebSocket / Realtime
  useEffect(() => {
    let unsub;
    try {
      if (base44?.entities?.Programacion?.subscribe) {
        unsub = base44.entities.Programacion.subscribe(() => {
          if (typeof reloadProg === "function") reloadProg();
        });
      }
    } catch (e) {}
    return () => { if (typeof unsub === "function") unsub(); };
  }, [reloadProg]);

  // Escucha en tiempo real de actividades proyectadas desde Programación
  useEffect(() => {
    const revisarProyeccion = () => {
      try {
        const storedKey = `emaus_actividad_proyectada_${equipoIdActivo || 'def'}`;
        const raw = localStorage.getItem("emaus_actividad_proyectada_global") || localStorage.getItem(storedKey);
        if (raw) {
          setActividadProyectadaLocal(JSON.parse(raw));
        } else {
          setActividadProyectadaLocal(null);
        }
      } catch (e) {}
    };

    revisarProyeccion();

    let bc;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("emaus_live_broadcast");
        bc.onmessage = (event) => {
          if (event.data?.type === "PROYECCION_TV") {
            setActividadProyectadaLocal(event.data.payload);
            if (typeof reloadProg === "function") reloadProg();
          } else if (event.data?.type === "PROGRAMACION_ACTUALIZADA") {
            if (typeof reloadProg === "function") reloadProg();
            revisarProyeccion();
          }
        };
      }
    } catch (e) {}

    const timerStorage = setInterval(() => {
      revisarProyeccion();
      if (typeof reloadProg === "function") reloadProg();
    }, 1000);

    const handleDataChanged = () => {
      revisarProyeccion();
      if (typeof reloadProg === "function") reloadProg();
    };

    window.addEventListener("storage", handleDataChanged);
    window.addEventListener("emaus_data_changed", handleDataChanged);

    return () => {
      clearInterval(timerStorage);
      if (bc) bc.close();
      window.removeEventListener("storage", handleDataChanged);
      window.removeEventListener("emaus_data_changed", handleDataChanged);
    };
  }, [equipoIdActivo, reloadProg]);

  // Reloj de tiempo real
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Fecha actual en formato YYYY-MM-DD local
  const hoyStr = new Date().toISOString().split("T")[0];

  // Actividad marcada como 'en_vivo' en Base44 o enviada manualmente por el coordinador
  const actividadManualmenteEnVivo = 
    programaciones.find(p => p.en_vivo === true) || 
    actividadProyectadaLocal;

  // Auto-detectar el día activo basándose en la actividad proyectada, el día de hoy o las disponibles
  const fechasDisponibles = [...new Set(programaciones.map(p => p.fecha).filter(Boolean))];
  const diaAuto = 
    actividadManualmenteEnVivo?.fecha || 
    fechasDisponibles.find(f => f === hoyStr) || 
    fechasDisponibles[0] || 
    hoyStr;

  const fechaFoco = diaManual || diaAuto;

  const actividadesDia = programaciones
    .filter(p => !fechaFoco || p.fecha === fechaFoco)
    .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));

  // 1. CÁLCULO DE DESVIACIÓN DE TIEMPO DEL RETIRO Y ÚLTIMA ACTIVIDAD DEL DÍA
  let totalDiffMinutos = 0;
  let completadas = 0;

  const actividadesEvaluadas = actividadesDia.length > 0 ? actividadesDia : programaciones;

  actividadesEvaluadas.forEach(p => {
    if (p.hora_fin_real || p.estado_actividad === "REALIZADA") {
      let horaProg = p.hora_fin;
      if (!horaProg && p.hora_inicio && p.tiempo_minutos) {
        horaProg = sumarMinutosAHora(p.hora_inicio, p.tiempo_minutos);
      }
      if (horaProg) {
        const mProg = horaAMinutos(horaProg);
        const mReal = horaAMinutos(p.hora_fin_real);
        if (mProg != null && mReal != null) {
          totalDiffMinutos += (mReal - mProg);
          completadas++;
        }
      }
    }
  });

  // Tomar la última actividad programada del día para proyectar el cierre final
  const ultimaActividadDia = actividadesEvaluadas.length > 0 ? actividadesEvaluadas[actividadesEvaluadas.length - 1] : null;
  let ultimaHoraProg = ultimaActividadDia?.hora_fin;
  if (!ultimaHoraProg && ultimaActividadDia?.hora_inicio && ultimaActividadDia?.tiempo_minutos) {
    ultimaHoraProg = sumarMinutosAHora(ultimaActividadDia.hora_inicio, ultimaActividadDia.tiempo_minutos);
  }

  let estadoRetiro = "EN_HORA";
  if (totalDiffMinutos > 3) estadoRetiro = "RETRASADO";
  else if (totalDiffMinutos < -3) estadoRetiro = "ADELANTADO";

  let horaCierreProyectada = null;
  if (ultimaHoraProg) {
    const horaFmt = sumarMinutosAHora(ultimaHoraProg, totalDiffMinutos);
    horaCierreProyectada = formatHora12(horaFmt);
  }

  // 2. ACTIVIDAD EN CURSO Y PRÓXIMA ACTIVIDAD
  const horaActualMins = horaActual.getHours() * 60 + horaActual.getMinutes();
  const segsActuales = horaActual.getSeconds();

  let actividadActual = null;
  let proximaActividad = null;

  if (actividadManualmenteEnVivo) {
    actividadActual = actividadManualmenteEnVivo;
    const listaRef = actividadesDia.length > 0 ? actividadesDia : programaciones;
    const idx = listaRef.findIndex(p => String(p.id) === String(actividadActual?.id));
    proximaActividad = idx !== -1 ? (listaRef[idx + 1] || null) : null;
  } else {
    // 🚀 PROYECCIÓN AUTOMÁTICA EN TIEMPO REAL SIN DELAY:
    // Se proyecta automáticamente la primera actividad pendiente del retiro (Cocina / TV)
    const pendienteEnCurso = actividadesDia.find(p => !p.hora_fin_real && p.estado_actividad !== "REALIZADA" && !p.completada);
    
    if (pendienteEnCurso) {
      actividadActual = pendienteEnCurso;
      const idx = actividadesDia.findIndex(p => String(p.id) === String(pendienteEnCurso.id));
      proximaActividad = actividadesDia[idx + 1] || null;
    } else if (actividadesDia.length > 0) {
      // Si todas fueron completadas, mantener la última del día en pantalla
      actividadActual = actividadesDia[actividadesDia.length - 1];
      proximaActividad = null;
    }
  }

  // Cuenta regresiva en segundos para la actividad actual
  let segundosRestantes = 0;
  if (actividadActual) {
    let mFin = horaAMinutos(actividadActual.hora_fin);
    if (mFin == null && actividadActual.hora_inicio && actividadActual.tiempo_minutos) {
      mFin = horaAMinutos(actividadActual.hora_inicio) + Number(actividadActual.tiempo_minutos);
    }
    if (mFin != null) {
      const finEnSegs = mFin * 60;
      const actualEnSegs = horaActualMins * 60 + segsActuales;
      segundosRestantes = Math.max(0, finEnSegs - actualEnSegs);
    }
  }

  const minsRestantes = Math.floor(segundosRestantes / 60);
  const segsRestantes = segundosRestantes % 60;

  // Porcentaje completado de la actividad actual
  let porcentajeActual = 0;
  if (actividadActual) {
    const mIni = horaAMinutos(actividadActual.hora_inicio);
    let mFin = horaAMinutos(actividadActual.hora_fin);
    if (mFin == null && mIni != null && actividadActual.tiempo_minutos) {
      mFin = mIni + Number(actividadActual.tiempo_minutos);
    }
    if (mIni != null && mFin != null && mFin > mIni) {
      const duracionSegs = (mFin - mIni) * 60;
      const transcurridoSegs = Math.max(0, (horaActualMins * 60 + segsActuales) - (mIni * 60));
      porcentajeActual = Math.min(100, Math.max(0, Math.round((transcurridoSegs / duracionSegs) * 100)));
    }
  }

  // 3. ALERTAS MÉDICAS Y DIETÉTICAS AGRUPADAS POR MESA
  const caminantesConAlerta = caminantes.filter(c => {
    const med = (c.necesidades_medicas || c.alergias || c.medicamentos || c.condicion_fisica || "").trim();
    return Boolean(med && med.toLowerCase() !== "ninguna");
  });

  const alertasPorMesa = caminantesConAlerta.reduce((acc, c) => {
    const mesa = c.numero_mesa ? `Mesa #${c.numero_mesa}` : "Sin Mesa Asignada";
    if (!acc[mesa]) acc[mesa] = [];
    acc[mesa].push(c);
    return acc;
  }, {});

  const mesasConAlerta = Object.keys(alertasPorMesa).sort();

  // Nombre de la Comunidad del Retiro proyectado
  const nombreComunidadMostrar = (() => {
    if (comunidadActual?.nombre) return comunidadActual.nombre;
    if (actividadProyectadaLocal?.nombre_comunidad) return actividadProyectadaLocal.nombre_comunidad;
    try {
      const stored = localStorage.getItem("emaus_comunidad_activa") || localStorage.getItem("comunidadActual");
      if (stored) {
        const p = JSON.parse(stored);
        if (p?.nombre) return p.nombre;
      }
      const config = localStorage.getItem("emaus_config_retiro");
      if (config) {
        const p = JSON.parse(config);
        if (p?.nombre_comunidad || p?.nombre_retiro) return p.nombre_comunidad || p.nombre_retiro;
      }
    } catch (e) {}
    return "Comunidad Emaús";
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 select-none flex flex-col justify-between overflow-hidden">
      
      {/* 🔝 HEADER CON RELOJ PRINCIPAL DE TV Y BOTÓN FULLSCREEN */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-8 h-8 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 font-black text-xs px-3 py-1 rounded-full border border-amber-500/30 uppercase tracking-widest">
                Emaús TV Bastidores
              </span>
              <span className="text-amber-300 font-black text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 uppercase tracking-wider">
                ⛪ {nombreComunidadMostrar}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5" style={{ fontFamily: "Georgia, serif" }}>
              {actividadActual ? `Proyección en Vivo: ${actividadActual.actividad}` : "Control de Tiempo y Cocina"}
            </h1>
          </div>
        </div>

        {/* RELOJ EN VIVO GIGANTE */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Hora Actual</p>
            <p className="text-4xl font-black tracking-tight font-mono text-amber-400 drop-shadow-md">
              {horaActual.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>

          <button
            onClick={() => setMostrarModalPedirTiempo(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs rounded-2xl transition border border-orange-400/40 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            title="Pedir tiempo adicional al personal de Salón / Coordinación"
          >
            <Utensils className="w-5 h-5 text-yellow-300" />
            <span>🍳 Pedir Tiempo a Salón</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition border border-slate-700 shadow-md"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* 📊 BANNER DE ESTADO DE SEGUIMIENTO EN TIEMPO REAL COMPACTO */}
      <div className="my-4">
        {estadoRetiro === "RETRASADO" ? (
          <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 border-2 border-red-500 rounded-3xl p-4 shadow-2xl shadow-red-900/30 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="bg-red-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ⚠️ ALERTA DE TIEMPO
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  RETIRO RETRASADO POR {formatMinutos(totalDiffMinutos)}
                </h2>
              </div>
            </div>

            {/* BLOQUE COMPACTO HORIZONTAL DE MÉTRICAS */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-400/30 text-center shadow-md">
                <span className="text-[9px] text-red-200 font-bold uppercase tracking-wider block">Avance</span>
                <span className="text-xs font-black text-white">{completadas} / {actividadesEvaluadas.length} Act.</span>
              </div>

              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-400/30 text-center shadow-md">
                <span className="text-[9px] text-red-200 font-bold uppercase tracking-wider block">Desviación</span>
                <span className="text-xs font-black text-red-300">+{totalDiffMinutos} min</span>
              </div>

              {horaCierreProyectada && (
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-red-400/50 text-center shadow-lg">
                  <span className="text-[9px] text-red-300 uppercase font-black block tracking-wider">
                    🏁 HORA FINAL CIERRE
                  </span>
                  <span className="text-base font-black text-yellow-300 font-mono tracking-tight">{horaCierreProyectada}</span>
                </div>
              )}
            </div>
          </div>
        ) : estadoRetiro === "ADELANTADO" ? (
          <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 border-2 border-blue-500 rounded-3xl p-4 shadow-2xl shadow-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="bg-blue-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ⏱️ TIEMPO A FAVOR
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  RETIRO ADELANTADO POR {formatMinutos(totalDiffMinutos)}
                </h2>
              </div>
            </div>

            {/* BLOQUE COMPACTO HORIZONTAL DE MÉTRICAS */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400/30 text-center shadow-md">
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider block">Avance</span>
                <span className="text-xs font-black text-white">{completadas} / {actividadesEvaluadas.length} Act.</span>
              </div>

              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-400/30 text-center shadow-md">
                <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wider block">Desviación</span>
                <span className="text-xs font-black text-blue-300">{totalDiffMinutos} min</span>
              </div>

              {horaCierreProyectada && (
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-blue-400/50 text-center shadow-lg">
                  <span className="text-[9px] text-blue-300 uppercase font-black block tracking-wider">
                    🏁 HORA FINAL CIERRE
                  </span>
                  <span className="text-base font-black text-yellow-300 font-mono tracking-tight">{horaCierreProyectada}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-slate-900 border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl shadow-green-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="bg-emerald-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  🟢 TIEMPO EN ORDEN
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  RETIRO TOTALMENTE EN HORA (0 MIN)
                </h2>
              </div>
            </div>

            {/* BLOQUE COMPACTO HORIZONTAL DE MÉTRICAS */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30 text-center shadow-md">
                <span className="text-[9px] text-emerald-200 font-bold uppercase tracking-wider block">Avance</span>
                <span className="text-xs font-black text-white">{completadas} / {actividadesEvaluadas.length} Act.</span>
              </div>

              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30 text-center shadow-md">
                <span className="text-[9px] text-emerald-200 font-bold uppercase tracking-wider block">Desviación</span>
                <span className="text-xs font-black text-emerald-300">0 min</span>
              </div>

              {horaCierreProyectada && (
                <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-emerald-400/50 text-center shadow-lg">
                  <span className="text-[9px] text-emerald-300 uppercase font-black block tracking-wider">
                    🏁 HORA FINAL CIERRE
                  </span>
                  <span className="text-base font-black text-yellow-300 font-mono tracking-tight">{horaCierreProyectada}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🎯 CUERPO PRINCIPAL EN 2 COLUMNAS (ACTIVIDAD ACTUAL Y ALERTAS DE COCINA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 my-2">
        
        {/* COLUMNA IZQUIERDA (7 COLS): ACTIVIDAD EN CURSO & CONTEO REGRESIVO */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* TARJETA GIGANTE DE ACTIVIDAD EN CURSO */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                  🔥 ACTIVIDAD EN CURSO
                </span>
                <span className="text-slate-400 text-sm font-bold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {formatHora12(actividadActual?.hora_inicio)} - {formatHora12(actividadActual?.hora_fin)}
                </span>
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
                {actividadActual ? actividadActual.actividad : "Sin actividad en curso"}
              </h3>

              {actividadActual?.descripcion && (
                <p className="text-slate-300 text-sm font-medium leading-relaxed bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                  {actividadActual.descripcion}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold">
                {actividadActual?.responsable && (
                  <div className="bg-slate-800 text-amber-300 px-3.5 py-1.5 rounded-xl border border-slate-700">
                    👤 {actividadActual.responsable} {actividadActual.responsable_2 ? `& ${actividadActual.responsable_2}` : ""}
                  </div>
                )}
                {actividadActual?.equipo && (
                  <div className="bg-slate-800 text-yellow-300 px-3.5 py-1.5 rounded-xl border border-slate-700">
                    🛡️ {actividadActual.equipo}
                  </div>
                )}
              </div>
            </div>

            {/* RELOJ CONTEO REGRESIVO Y BARRA DE PROGRESO */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Tiempo Restante de Actividad</span>
                <span className="text-xs font-bold text-amber-400">{porcentajeActual}% Transcurrido</span>
              </div>

              {/* RELOJ DE CUENTA REGRESIVA GIGANTE */}
              <div className="text-center bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-3 shadow-inner">
                <p className="text-5xl font-black text-amber-400 font-mono tracking-wider drop-shadow-md">
                  {String(minsRestantes).padStart(2, "0")}:{String(segsRestantes).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Minutos : Segundos</p>
              </div>

              {/* BARRA DE PROGRESO DE LA ACTIVIDAD */}
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000 shadow-lg"
                  style={{ width: `${porcentajeActual}%` }}
                />
              </div>
            </div>
          </div>

          {/* PRÓXIMA ACTIVIDAD */}
          {proximaActividad && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                  <ChevronRight className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">A Continuación</span>
                  <h4 className="text-lg font-black text-white">{proximaActividad.actividad}</h4>
                  {proximaActividad.responsable && (
                    <p className="text-xs text-amber-300 font-medium">Por: {proximaActividad.responsable}</p>
                  )}
                </div>
              </div>

              <div className="text-right bg-slate-800 px-4 py-2 rounded-2xl border border-slate-700">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Hora Inicio</span>
                <span className="text-sm font-black text-white">{formatHora12(proximaActividad.hora_inicio)}</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5 COLS): ALERTAS MÉDICAS Y DIETÉTICAS PARA COCINA */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Alertas de Cocina y Salud</h3>
                <p className="text-[11px] text-slate-400 font-medium">Restricciones de caminantes por mesa</p>
              </div>
            </div>

            <span className="bg-orange-500/20 text-orange-300 font-black text-xs px-3 py-1 rounded-full border border-orange-500/30">
              {caminantesConAlerta.length} Alerta(s)
            </span>
          </div>

          {/* LISTADO AGRUPADO POR MESA */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[52vh]">
            {mesasConAlerta.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No hay restricciones alimenticias ni médicas registradas.</p>
              </div>
            ) : (
              mesasConAlerta.map(mesa => (
                <div key={mesa} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" /> {mesa}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{alertasPorMesa[mesa].length} persona(s)</span>
                  </div>

                  <div className="space-y-2">
                    {alertasPorMesa[mesa].map(c => (
                      <div key={c.id} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                        <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                          <HeartPulse className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-white truncate">{c.nombre} {c.apodo ? `("${c.apodo}")` : ""}</p>
                          <p className="text-xs font-semibold text-orange-300 mt-0.5 leading-snug">
                            ⚠️ {c.necesidades_medicas || c.alergias || c.medicamentos || c.condicion_fisica}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sincronizado automáticamente</span>
            <span className="text-emerald-400 font-bold">🟢 En vivo</span>
          </div>
        </div>

      </div>

      {/* FOOTER PANTALLA COMPLETA */}
      <footer className="mt-4 text-center text-xs text-slate-500 font-semibold border-t border-slate-900 pt-3">
        ✝ Sistema Emaús — Pantalla de Bastidores, Cocina y Control de Tiempos
      </footer>

      {mostrarModalPedirTiempo && (
        <ModalPedirTiempoCocina
          equipoIdActivo={equipoIdActivo}
          onClose={() => setMostrarModalPedirTiempo(false)}
        />
      )}
    </div>
  );
}

function ModalPedirTiempoCocina({ equipoIdActivo, onClose }) {
  const [minutos, setMinutos] = useState(15);
  const [mensaje, setMensaje] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async (e) => {
    e.preventDefault();
    const payload = {
      id: Date.now(),
      minutos: Number(minutos) || 10,
      mensaje: mensaje.trim() || "La comida necesita unos minutos adicionales para ser servida.",
      horaSolicitud: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      atendida: false,
      equipo_id: equipoIdActivo || "general",
      comunidad_id: equipoIdActivo || "general"
    };

    // 1. Guardar en Base44 remota para que llegue a cualquier dispositivo / tablet / celular de Salón
    try {
      const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
      const cfgExistente = (cfgs || []).find(c => 
        !equipoIdActivo || 
        c.equipo_id === equipoIdActivo || 
        c.comunidad_id === equipoIdActivo
      ) || cfgs?.[0];

      if (cfgExistente && cfgExistente.id) {
        await base44.entities.ConfigRetiro.update(cfgExistente.id, {
          alerta_cocina: payload
        }).catch(() => {});
      } else {
        await base44.entities.ConfigRetiro.create({
          equipo_id: equipoIdActivo || "general",
          comunidad_id: equipoIdActivo || "general",
          alerta_cocina: payload
        }).catch(() => {});
      }
    } catch (errDb) {
      console.warn("Error enviando alerta de cocina a Base44:", errDb);
    }

    const storedKey = `emaus_alerta_cocina_${equipoIdActivo || 'def'}`;
    localStorage.setItem(storedKey, JSON.stringify(payload));
    localStorage.setItem("emaus_alerta_cocina_global", JSON.stringify(payload));

    // Emitir por BroadcastChannel a todas las ventanas/pestañas abiertas de forma instantánea
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("emaus_live_broadcast");
        bc.postMessage({ type: "ALERTA_COCINA", payload });
        bc.close();
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent("emaus_alerta_cocina", { detail: payload }));
    window.dispatchEvent(new CustomEvent("emaus_data_changed", {
      detail: { entidad: "AlertaCocina", equipoId: equipoIdActivo, timestamp: Date.now() }
    }));

    setEnviado(true);
    setTimeout(() => {
      setEnviado(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-orange-500/60 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-white animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-orange-700 to-amber-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-black">Solicitar Tiempo a Salón</h3>
              <p className="text-xs text-amber-200 font-medium">Alerta de Cocina para Coordinación</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {enviado ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/40 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-white">¡Alerta Enviada a Salón!</h4>
            <p className="text-xs text-slate-300">
              Coordinación recibirá la notificación de <strong>+{minutos} min</strong> inmediatamente en el panel de programación.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-black uppercase text-amber-300 mb-2">
                ⏱️ Tiempo Adicional Necesario
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[5, 10, 15, 20].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutos(m)}
                    className={`py-2.5 rounded-xl font-black text-sm transition border cursor-pointer ${
                      minutos === m
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    +{m} min
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Personalizado:</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={minutos}
                  onChange={e => setMinutos(Number(e.target.value))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-amber-300 text-center"
                />
                <span className="text-xs text-slate-400 font-bold">minutos</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-amber-300 mb-1.5">
                💬 Mensaje / Motivo para Salón (Opcional)
              </label>
              <input
                type="text"
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                placeholder="Ej: Emplatado de carnes listo en 15 min..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs shadow-lg transition cursor-pointer"
              >
                <Utensils className="w-4 h-4" /> Enviar Alerta a Salón
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
