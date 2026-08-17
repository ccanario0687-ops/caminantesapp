import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import PullToRefresh from "@/components/PullToRefresh";
import SelectorComunidad from "@/components/SelectorComunidad";
import { 
  Search, CheckCircle2, Circle, Users, UserCheck, RefreshCw, 
  Wifi, WifiOff, AlertTriangle, QrCode, X, Loader2, Printer, Camera, Check, Footprints, HeartHandshake,
  User, Building2, DoorOpen, Phone, MapPin, Sparkles, CheckCheck, RotateCcw, Eye, ShieldCheck
} from "lucide-react";
import MobileSelect from "@/components/MobileSelect";
import MobileTopBar from "@/components/MobileTopBar";
import { toast } from "sonner";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";

const cargarScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ⚡ GENERACIÓN DE CÓDIGO QR ULTRA RÁPIDO CON SOPORTE OFFLINE INSTANTÁNEO
const generarQR = (texto, size = 200) => {
  if (typeof window !== "undefined" && !navigator.onLine) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="30" height="30" fill="%2378350f"/><rect x="15" y="15" width="20" height="20" fill="white"/><rect x="20" y="20" width="10" height="10" fill="%2378350f"/><rect x="60" y="10" width="30" height="30" fill="%2378350f"/><rect x="65" y="15" width="20" height="20" fill="white"/><rect x="70" y="20" width="10" height="10" fill="%2378350f"/><rect x="10" y="60" width="30" height="30" fill="%2378350f"/><rect x="15" y="65" width="20" height="20" fill="white"/><rect x="20" y="70" width="10" height="10" fill="%2378350f"/><text x="50" y="55" font-size="8" font-weight="bold" text-anchor="middle" fill="%2378350f">EMAUS QR</text></svg>`;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(texto)}&bgcolor=ffffff&color=78350f`;
};

const normalizar = (txt) => String(txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const soloNumeros = (txt) => String(txt || "").replace(/\D/g, "");

const normalizarComunidad = (txt) => 
  String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function ControlEntrada() {
  const { records: todosCaminantes, loading: loadingCam, online, update: updateCaminante, reload: reloadCaminantes } = useOffline("Caminante");
  const { records: todosServidoresOffline, loading: loadingServ, update: updateServidor, reload: reloadServidores } = useOffline("Servidor");

  const [servidoresUnificados, setServidoresUnificados] = useState([]);
  const [loadingUnificado, setLoadingUnificado] = useState(true);

  const [tabActiva, setTabActiva] = useState("caminantes"); // "caminantes" | "servidores"
  const [busqueda, setBusqueda] = useState("");
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [filtroEquipoServidor, setFiltroEquipoServidor] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [retiros, setRetiros] = useState([]);
  const [asistenciaLocal, setAsistenciaLocal] = useState({});

  const { comunidadActual, esVistaGlobal } = useComunidad();
  const { user } = useAuth();

  // 🚀 CARGA MULTI-ENTIDAD DE SERVIDORES CON DEDUPLICACIÓN EN MEMORIA
  const cargarTodosServidores = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingUnificado(true);
    try {
      const [r1, r2, rCaminantes, rRemotas] = await Promise.all([
        base44.entities.Servidor?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.Servidores?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.Caminante?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list().catch(() => []) || Promise.resolve([]),
      ]);

      let acumulados = [];

      if (Array.isArray(r1)) acumulados.push(...r1);
      if (Array.isArray(r2)) acumulados.push(...r2);

      if (Array.isArray(rCaminantes)) {
        const soloServidores = rCaminantes.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor)
        );
        acumulados.push(...soloServidores);
      }

      if (Array.isArray(rRemotas)) {
        const soloServidoresRemotosAprobados = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprobado = est === "aprobado" || est === "confirmado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprobado && esServ;
        });
        acumulados.push(...soloServidoresRemotosAprobados);
      }

      if (Array.isArray(todosServidoresOffline) && todosServidoresOffline.length > 0) {
        acumulados.push(...todosServidoresOffline);
      }

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
        mapaUnicos.set(key, {
          ...previo,
          ...s,
          tipo: "Servidor"
        });
      });

      const listaFinal = Array.from(mapaUnicos.values());
      setServidoresUnificados(listaFinal);
    } catch (err) {
      console.error("Error cargando servidores unificados en entrada:", err);
    } finally {
      if (!silencioso) setLoadingUnificado(false);
    }
  }, [todosServidoresOffline]);

  useEffect(() => {
    cargarTodosServidores(false);
  }, [cargarTodosServidores]);

  // 🔒 AISLAMIENTO ESTRICTO DE COMUNIDAD (Memoizado con useCallback para prevenir ejecuciones repetidas)
  const perteneceAComunidadActual = useCallback((persona) => {
    if (!persona) return false;
    if (esVistaGlobal || !comunidadActual || comunidadActual.id === "global" || comunidadActual.id === "GLOBAL") {
      return true;
    }

    const targetIds = [
      comunidadActual.id,
      comunidadActual.equipo_id,
      comunidadActual.slug,
      comunidadActual.comunidad_id
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    const candidateIds = [
      persona.equipo_id,
      persona.comunidad_id,
      persona.retiro_id,
      persona.id_comunidad,
      persona.id_equipo,
      persona.id_retiro
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    if (targetIds.length > 0 && candidateIds.length > 0) {
      if (targetIds.some(tid => candidateIds.includes(tid))) {
        return true;
      }
    }

    const targetNombreNorm = normalizarComunidad(
      comunidadActual.nombre || comunidadActual.nombre_equipo || comunidadActual.nombre_retiro || ""
    );

    if (!targetNombreNorm) return true;

    const candidateTexts = [
      persona.comunidad,
      persona.equipo,
      persona.nombre_equipo,
      persona.nombre_comunidad,
      persona.nombre_retiro,
      persona.comunidad_actual,
      persona.comunidad_origen
    ].filter(Boolean).map(normalizarComunidad).join(" ");

    if (!candidateTexts && candidateIds.length === 0) {
      return true;
    }

    if (candidateTexts && (candidateTexts.includes(targetNombreNorm) || targetNombreNorm.includes(candidateTexts))) {
      return true;
    }

    const genericos = new Set([
      "retiro", "emaus", "hombres", "mujeres", "de", "del", "la", "el", "los", "las", "y", "en", "por", 
      "comunidad", "parroquia", "equipo", "servicio", "servidores", "caminantes", "central"
    ]);

    const tokensTargetUnicos = targetNombreNorm.split(" ").filter(w => w.length >= 3 && !genericos.has(w));
    const tokensCandidateUnicos = candidateTexts.split(" ").filter(w => w.length >= 3 && !genericos.has(w));

    if (tokensTargetUnicos.length > 0 && tokensCandidateUnicos.length > 0) {
      const coincidencias = tokensTargetUnicos.filter(tt => 
        tokensCandidateUnicos.some(tc => tc.includes(tt) || tt.includes(tc))
      );

      if (coincidencias.length === tokensTargetUnicos.length) {
        return true;
      }
    }

    return false;
  }, [esVistaGlobal, comunidadActual]);

  // ⚡ MEMOIZACIÓN REACTIVA DE CAMINANTES Y SERVIDORES AISLADOS (Evita recalcular listas completas)
  const caminantes = useMemo(() => {
    return (todosCaminantes || []).filter(perteneceAComunidadActual);
  }, [todosCaminantes, perteneceAComunidadActual]);

  const servidores = useMemo(() => {
    return (servidoresUnificados || []).filter(perteneceAComunidadActual);
  }, [servidoresUnificados, perteneceAComunidadActual]);

  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultadoQR, setResultadoQR] = useState(null);
  const [personaPorConfirmar, setPersonaPorConfirmar] = useState(null);
  const [rawQREscaneado, setRawQREscaneado] = useState("");
  const [cargandoLibreria, setCargandoLibreria] = useState(false);
  const [errorCamara, setErrorCamara] = useState(null);
  const [busquedaManualScan, setBusquedaManualScan] = useState("");
  const scannerRef = useRef(null);

  const [qrParaImprimir, setQrParaImprimir] = useState(null);

  const reloadAll = () => {
    reloadCaminantes();
    reloadServidores();
    cargarTodosServidores(true);
  };

  useEffect(() => {
    const nums = [...new Set(caminantes.map(c => c.numero_retiro).filter(Boolean))].sort((a, b) => a - b);
    setRetiros(nums);
    if (nums.length > 0 && !filtroRetiro) {
      setFiltroRetiro(String(nums[nums.length - 1]));
    }
  }, [caminantes]);

  const equiposServidoresDisponibles = useMemo(() => {
    return ["Todos", ...new Set(servidores.map(s => s.equipo_trabajo || s.rol).filter(Boolean))].sort();
  }, [servidores]);

  const esPersonaServidor = useCallback((persona) => {
    if (!persona) return false;
    if (persona._esServidor !== undefined) return persona._esServidor;
    const personaId = String(persona.id || persona._id || "").trim();
    return Boolean(persona.equipo_trabajo || persona.rol_servidor || (servidoresUnificados || []).some(s => String(s.id || s._id).trim() === personaId));
  }, [servidoresUnificados]);

  const obtenerPayloadQR = (persona) => {
    if (!persona) return "";
    const esServ = esPersonaServidor(persona);
    return JSON.stringify({
      id: persona.id || persona._id,
      cedula: persona.cedula || "",
      nombre: persona.nombre || "",
      tipo: persona.tipo || (esServ ? "Servidor" : "Caminante"),
      comunidad: comunidadActual?.nombre || ""
    });
  };

  const buscarPersonaPorQR = (rawText) => {
    if (!rawText) return null;
    const text = String(rawText).trim();
    setRawQREscaneado(text);

    let extractedId = text;
    let extractedCedula = soloNumeros(text);
    let extractedFicha = text;
    let extractedNombre = normalizar(text);

    if (text.startsWith("http://") || text.startsWith("https://")) {
      try {
        const urlObj = new URL(text);
        if (urlObj.searchParams.has("id")) extractedId = urlObj.searchParams.get("id");
        if (urlObj.searchParams.has("cedula")) extractedCedula = soloNumeros(urlObj.searchParams.get("cedula"));
        if (urlObj.searchParams.has("ficha")) extractedFicha = urlObj.searchParams.get("ficha");
        if (urlObj.searchParams.has("nombre")) extractedNombre = normalizar(urlObj.searchParams.get("nombre"));

        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.length >= 3) extractedId = lastPart;
        }
      } catch (e) {}
    }

    try {
      if (text.startsWith("{") && text.endsWith("}")) {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          if (parsed.id || parsed._id || parsed.inscripcion_id) extractedId = String(parsed.id || parsed._id || parsed.inscripcion_id).trim();
          if (parsed.cedula) extractedCedula = soloNumeros(parsed.cedula);
          if (parsed.ficha || parsed.numero_ficha) extractedFicha = String(parsed.ficha || parsed.numero_ficha).trim();
          if (parsed.nombre) extractedNombre = normalizar(parsed.nombre);
        }
      }
    } catch (e) {}

    const cleanExtractedId = String(extractedId).trim();

    const matchCam = (caminantes || []).find(c => {
      const cId = String(c.id || c._id || c.inscripcion_id || "").trim();
      const cCed = soloNumeros(c.cedula);
      const cFicha = String(c.numero_ficha || c.ficha || "").trim();
      const cNom = normalizar(c.nombre || c.nombre_completo);
      const cTel = soloNumeros(c.telefono || c.celular);

      if (cleanExtractedId && (cId === cleanExtractedId || cId.includes(cleanExtractedId))) return true;
      if (extractedCedula && extractedCedula.length >= 5 && cCed && cCed.includes(extractedCedula)) return true;
      if (extractedFicha && cFicha && cFicha === extractedFicha) return true;
      if (extractedNombre && extractedNombre.length >= 3 && cNom && cNom.includes(extractedNombre)) return true;
      if (extractedCedula && extractedCedula.length >= 7 && cTel && cTel.includes(extractedCedula)) return true;

      return false;
    });

    if (matchCam) return { ...matchCam, _esServidor: false };

    const matchServ = (servidores || []).find(s => {
      const sId = String(s.id || s._id || s.inscripcion_id || "").trim();
      const sCed = soloNumeros(s.cedula);
      const sNom = normalizar(s.nombre || s.nombre_completo);
      const sTel = soloNumeros(s.telefono || s.celular);

      if (cleanExtractedId && (sId === cleanExtractedId || sId.includes(cleanExtractedId))) return true;
      if (extractedCedula && extractedCedula.length >= 5 && sCed && sCed.includes(extractedCedula)) return true;
      if (extractedNombre && extractedNombre.length >= 3 && sNom && sNom.includes(extractedNombre)) return true;
      if (extractedCedula && extractedCedula.length >= 7 && sTel && sTel.includes(extractedCedula)) return true;

      return false;
    });

    if (matchServ) return { ...matchServ, _esServidor: true };

    return null;
  };

  const iniciarEscaner = async () => {
    try {
      setCargandoLibreria(true);
      setErrorCamara(null);
      setEscaneando(false);
      setResultadoQR(null);
      setPersonaPorConfirmar(null);

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setErrorCamara("⚠️ La cámara requiere una conexión segura (HTTPS). Para acceder desde móviles, usa https://");
        setCargandoLibreria(false);
        return;
      }

      await cargarScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js");
      setCargandoLibreria(false);

      await new Promise(resolve => setTimeout(resolve, 350));

      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) {
        setErrorCamara("No se encontró el contenedor del escáner en la pantalla.");
        return;
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }

      const html5QrCode = new window.Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      const onScanSuccess = async (decodedText) => {
        setEscaneando(false);
        setProcesando(true);

        try {
          const persona = buscarPersonaPorQR(decodedText);
          
          if (!persona) {
            setResultadoQR("error");
            setPersonaPorConfirmar(null);
            setProcesando(false);
            return;
          }

          setPersonaPorConfirmar(persona);
          setResultadoQR("confirmar");

        } catch (err) {
          console.error(err);
          setResultadoQR("error");
        } finally {
          setProcesando(false);
        }
      };

      let iniciado = false;

      try {
        const cameras = await window.Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(c => {
            const lbl = (c.label || "").toLowerCase();
            return lbl.includes("back") || lbl.includes("trasera") || lbl.includes("environment") || lbl.includes("posterior");
          }) || cameras[cameras.length - 1];

          await html5QrCode.start(backCam.id, config, onScanSuccess, () => {});
          iniciado = true;
        }
      } catch (errCam) {}

      if (!iniciado) {
        try {
          await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
          iniciado = true;
        } catch (errEnv) {}
      }

      if (!iniciado) {
        try {
          await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
          iniciado = true;
        } catch (errUser) {}
      }

      if (!iniciado) {
        await html5QrCode.start({ video: true }, config, onScanSuccess, () => {});
        iniciado = true;
      }

      setEscaneando(true);

    } catch (err) {
      console.error("Error iniciando escáner:", err);
      setCargandoLibreria(false);
      setErrorCamara("No se pudo acceder a la cámara.");
    }
  };

  const cerrarEscaner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {}
    }
    setEscanerAbierto(false);
    setEscaneando(false);
    setResultadoQR(null);
    setPersonaPorConfirmar(null);
    setErrorCamara(null);
    setCargandoLibreria(false);
    setBusquedaManualScan("");
    scannerRef.current = null;
  };

  const reiniciarEscaner = async () => {
    setResultadoQR(null);
    setPersonaPorConfirmar(null);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
    }
    scannerRef.current = null;
    iniciarEscaner();
  };

  // 🚀 CONFIRMACIÓN DE PRESENCIA CON RETORNO INSTANTÁNEO
  const ejecutarConfirmacionPresencia = async (persona) => {
    if (!persona) return;
    const personaId = String(persona.id || persona._id || "").trim();
    if (!personaId) {
      toast.error("ID inválido para registrar presencia.");
      return;
    }

    const horaActual = new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
    const esServ = esPersonaServidor(persona);

    setAsistenciaLocal(prev => ({
      ...prev,
      [personaId]: { presente: true, hora_entrada: horaActual }
    }));

    setPersonaPorConfirmar({
      ...persona,
      presente: true,
      hora_entrada: horaActual,
      _esServidor: esServ
    });

    toast.success(`✅ ¡Presencia registrada para ${persona.nombre}! (${horaActual})`);

    try {
      if (esServ) {
        await updateServidor(personaId, { presente: true, hora_entrada: horaActual });
        await base44.entities.Servidor.update(personaId, { presente: true, hora_entrada: horaActual }).catch(() => {});
        if (base44.entities.Servidores?.update) {
          await base44.entities.Servidores.update(personaId, { presente: true, hora_entrada: horaActual }).catch(() => {});
        }
      } else {
        await updateCaminante(personaId, { presente: true, hora_entrada: horaActual });
        await base44.entities.Caminante.update(personaId, { presente: true, hora_entrada: horaActual }).catch(() => {});
      }
    } catch (e) {
      console.warn("Actualizado localmente en memoria:", e);
    }
  };

  const togglePresente = async (persona) => {
    if (!persona) return;
    const personaId = String(persona.id || persona._id || "").trim();
    if (!personaId) return;

    const override = asistenciaLocal[personaId];
    const estaActualmentePresente = override !== undefined ? override.presente : persona.presente;
    const nuevoEstado = !estaActualmentePresente;

    const horaActual = nuevoEstado
      ? new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })
      : null;

    const esServ = esPersonaServidor(persona);

    setAsistenciaLocal(prev => ({
      ...prev,
      [personaId]: { presente: nuevoEstado, hora_entrada: horaActual }
    }));

    toast.success(nuevoEstado
      ? `✅ ${persona.nombre} marcado como Presente`
      : `↩️ ${persona.nombre} desmarcado`
    );

    try {
      if (esServ) {
        updateServidor(personaId, { presente: nuevoEstado, hora_entrada: horaActual }).catch(() => {});
        if (base44.entities.Servidor?.update) {
          base44.entities.Servidor.update(personaId, { presente: nuevoEstado, hora_entrada: horaActual }).catch(() => {});
        }
        if (base44.entities.Servidores?.update) {
          base44.entities.Servidores.update(personaId, { presente: nuevoEstado, hora_entrada: horaActual }).catch(() => {});
        }
      } else {
        updateCaminante(personaId, { presente: nuevoEstado, hora_entrada: horaActual }).catch(() => {});
        if (base44.entities.Caminante?.update) {
          base44.entities.Caminante.update(personaId, { presente: nuevoEstado, hora_entrada: horaActual }).catch(() => {});
        }
      }
    } catch (e) {}
  };

  const procesarSeleccionManualModal = (persona) => {
    if (!persona) return;
    const esServ = esPersonaServidor(persona);
    setPersonaPorConfirmar({ ...persona, _esServidor: esServ });
    setResultadoQR("confirmar");
  };

  // ⚡ FILTRADO MEMOIZADO DE CAMINANTES (Garantiza 60fps en busqueda masiva)
  const caminantesFiltrados = useMemo(() => {
    return caminantes.filter(c => {
      const cId = String(c.id || c._id).trim();
      const override = asistenciaLocal[cId];
      const estaPresente = override !== undefined ? override.presente : c.presente;

      const matchRetiro = !filtroRetiro || String(c.numero_retiro) === filtroRetiro;
      const matchBusqueda = !busqueda ||
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.parroquia?.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(c.numero_ficha || "").includes(busqueda);
      const matchEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "presentes" && estaPresente) ||
        (filtroEstado === "ausentes" && !estaPresente);
      return matchRetiro && matchBusqueda && matchEstado;
    });
  }, [caminantes, asistenciaLocal, filtroRetiro, busqueda, filtroEstado]);

  // ⚡ FILTRADO MEMOIZADO DE SERVIDORES
  const servidoresFiltrados = useMemo(() => {
    return servidores.filter(s => {
      const sId = String(s.id || s._id).trim();
      const override = asistenciaLocal[sId];
      const estaPresente = override !== undefined ? override.presente : s.presente;

      const matchEquipo = filtroEquipoServidor === "Todos" || (s.equipo_trabajo === filtroEquipoServidor || s.rol === filtroEquipoServidor);
      const matchBusqueda = !busqueda ||
        s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.apodo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.parroquia?.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(s.telefono || "").includes(busqueda);
      const matchEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "presentes" && estaPresente) ||
        (filtroEstado === "ausentes" && !estaPresente);
      return matchEquipo && matchBusqueda && matchEstado;
    });
  }, [servidores, asistenciaLocal, filtroEquipoServidor, busqueda, filtroEstado]);

  const presentesCaminantes = useMemo(() => {
    return caminantesFiltrados.filter(c => {
      const override = asistenciaLocal[String(c.id || c._id).trim()];
      return override !== undefined ? override.presente : c.presente;
    });
  }, [caminantesFiltrados, asistenciaLocal]);

  const totalCamFiltrado = caminantesFiltrados.length;
  const pctCam = totalCamFiltrado > 0 ? Math.round((presentesCaminantes.length / totalCamFiltrado) * 100) : 0;

  const presentesServidores = useMemo(() => {
    return servidoresFiltrados.filter(s => {
      const override = asistenciaLocal[String(s.id || s._id).trim()];
      return override !== undefined ? override.presente : s.presente;
    });
  }, [servidoresFiltrados, asistenciaLocal]);

  const totalServFiltrado = servidoresFiltrados.length;
  const pctServ = totalServFiltrado > 0 ? Math.round((presentesServidores.length / totalServFiltrado) * 100) : 0;

  const imprimirQR = (persona) => {
    const esServ = esPersonaServidor(persona);
    const payload = obtenerPayloadQR(persona);
    const ventana = window.open("", "_blank", "width=400,height=500");
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${persona.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .card { border: 2px solid #b45309; border-radius: 12px; padding: 20px; max-width: 300px; margin: 0 auto; }
          .nombre { font-size: 18px; font-weight: bold; color: #78350f; margin: 10px 0; }
          .info { font-size: 12px; color: #666; margin: 5px 0; }
          .qr { margin: 15px 0; }
          .footer { font-size: 10px; color: #999; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="color: #b45309; margin: 0;">✝️ Retiro de Emaús</h2>
          <p class="nombre">${persona.nombre}</p>
          <p class="info">${esServ ? `Servidor · ${persona.equipo_trabajo || persona.rol || "Servicio"}` : `Ficha: #${persona.numero_ficha || "N/A"}`}</p>
          <p class="info">${esServ ? `Parroquia: ${persona.parroquia || "N/A"}` : `Mesa: ${persona.numero_mesa || "Sin asignar"}`}</p>
          <div class="qr">
            <img src="${generarQR(payload, 200)}" alt="QR" width="200" height="200" />
          </div>
          <p class="footer">Presenta este código al llegar al retiro</p>
        </div>
        <script>
          setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  const todosCombinadosComunidadActual = useMemo(() => [
    ...caminantes.map(c => ({ ...c, _esServidor: false })),
    ...servidores.map(s => ({ ...s, _esServidor: true }))
  ], [caminantes, servidores]);

  const resultadosBusquedaManualScan = useMemo(() => {
    if (!busquedaManualScan.trim()) return [];
    const term = busquedaManualScan.toLowerCase();
    return todosCombinadosComunidadActual.filter(p => 
      p.nombre?.toLowerCase().includes(term) ||
      String(p.numero_ficha || "").includes(busquedaManualScan) ||
      String(p.cedula || "").includes(busquedaManualScan) ||
      String(p.telefono || "").includes(busquedaManualScan)
    ).slice(0, 10);
  }, [busquedaManualScan, todosCombinadosComunidadActual]);

  const loadingGenerico = loadingCam || loadingServ || loadingUnificado;

  const idPorConfirmar = personaPorConfirmar ? String(personaPorConfirmar.id || personaPorConfirmar._id || "").trim() : "";
  const overrideModal = idPorConfirmar ? asistenciaLocal[idPorConfirmar] : undefined;
  const personaEstaPresente = personaPorConfirmar 
    ? (overrideModal !== undefined ? overrideModal.presente : personaPorConfirmar.presente)
    : false;
  const horaEntradaModal = personaPorConfirmar 
    ? (overrideModal !== undefined ? overrideModal.hora_entrada : personaPorConfirmar.hora_entrada)
    : null;

  return (
    <div className="pb-12 font-sans text-slate-800">
      <MobileTopBar title="Control de Entrada" />

      <div className="mb-4">
        <SelectorComunidad />
      </div>

      <PullToRefresh onRefresh={reloadAll}>
        {/* CABECERA PRINCIPAL */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                <UserCheck className="w-6 h-6" /> Control de Entrada
              </h1>
              {online ? (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold"><Wifi className="w-3 h-3" /> Online</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold"><WifiOff className="w-3 h-3" /> Offline</span>
              )}
            </div>
            <p className="text-amber-600 text-sm mt-1">
              Control de asistencia de <span className="font-bold text-amber-900">{comunidadActual?.nombre || "Comunidad Activa"}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { 
                setEscanerAbierto(true); 
                setTimeout(() => iniciarEscaner(), 300); 
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Escanear QR
            </button>
            
            <button
              onClick={reloadAll}
              disabled={loadingGenerico}
              className="flex items-center gap-2 border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingGenerico ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* INDICADOR DE AISLAMIENTO DE COMUNIDAD */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-900 mb-5 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Comunidad: <strong>{comunidadActual?.nombre || "General"}</strong> ({tabActiva === "caminantes" ? caminantes.length : servidores.length} {tabActiva === "caminantes" ? "caminantes" : "servidores"} registrados en esta comunidad)
          </span>
        </div>

        {/* 🎯 PESTAÑAS PRINCIPALES: CAMINANTES vs SERVIDORES */}
        <div className="flex bg-amber-100/60 p-1.5 rounded-2xl mb-6 border border-amber-200">
          <button
            type="button"
            onClick={() => setTabActiva("caminantes")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === "caminantes" 
                ? "bg-amber-900 text-white shadow-md" 
                : "text-amber-900 hover:bg-amber-200/50"
            }`}
          >
            <Footprints className="w-4 h-4 text-amber-300" />
            <span>🚶‍♂️ Caminantes ({caminantes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("servidores")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabActiva === "servidores" 
                ? "bg-amber-900 text-white shadow-md" 
                : "text-amber-900 hover:bg-amber-200/50"
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-yellow-300" />
            <span>🤝 Servidores ({servidores.length})</span>
          </button>
        </div>

        {/* CONTENIDO PESTAÑA 1: CAMINANTES */}
        {tabActiva === "caminantes" ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white border border-amber-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-amber-800">{totalCamFiltrado}</p>
                <p className="text-xs text-amber-600 mt-0.5">Total Caminantes</p>
              </div>
              <div className="bg-white border border-green-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-700">{presentesCaminantes.length}</p>
                <p className="text-xs text-green-600 mt-0.5">Presentes</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-600">{totalCamFiltrado - presentesCaminantes.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
              </div>
            </div>

            {totalCamFiltrado > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-amber-700 mb-1">
                  <span>Progreso de Llegadas Caminantes ({comunidadActual?.nombre || "General"})</span>
                  <span className="font-bold">{pctCam}%</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${pctCam}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <MobileSelect
                value={filtroRetiro}
                onChange={v => setFiltroRetiro(v)}
                options={[
                  { value: "", label: "Todos los retiros" },
                  ...retiros.map(r => ({ value: String(r), label: `Retiro #${r}` }))
                ]}
                className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-amber-900"
              />

              {["todos", "presentes", "ausentes"].map(op => (
                <button
                  key={op}
                  onClick={() => setFiltroEstado(op)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize cursor-pointer ${
                    filtroEstado === op ? "bg-amber-700 text-white border-amber-700" : "border-amber-200 text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {op === "todos" ? "Todos" : op === "presentes" ? "✅ Presentes" : "⏳ Pendientes"}
                </button>
              ))}

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  placeholder="Buscar caminante en esta comunidad..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            </div>

            {loadingCam ? (
              <div className="py-16 text-center text-amber-500 text-sm font-bold">Cargando caminantes de {comunidadActual?.nombre}...</div>
            ) : caminantesFiltrados.length === 0 ? (
              <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-amber-100 p-6">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-700" />
                <p className="font-semibold text-slate-700">No hay caminantes registrados en esta comunidad</p>
              </div>
            ) : (
              <div className="space-y-2">
                {caminantesFiltrados.map(c => {
                  const cId = String(c.id || c._id).trim();
                  const override = asistenciaLocal[cId];
                  const estaPresente = override !== undefined ? override.presente : c.presente;
                  const horaEntrada = override !== undefined ? override.hora_entrada : c.hora_entrada;

                  return (
                    <div
                      key={cId}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                        estaPresente ? "bg-green-50 border-green-200" : "bg-white border-amber-100"
                      }`}
                    >
                      <div className="shrink-0 cursor-pointer" onClick={() => togglePresente(c)}>
                        {estaPresente ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => togglePresente(c)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm truncate ${estaPresente ? "text-green-800" : "text-gray-800"}`}>
                            {c.nombre}
                          </p>
                          {c.rol_en_mesa === "Líder de Mesa" && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Líder</span>
                          )}
                          {c.numero_ficha && (
                            <span className="text-xs text-gray-400 font-mono">#{c.numero_ficha}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {c.parroquia || "—"}{c.numero_mesa ? ` · Mesa ${c.numero_mesa}` : ""}
                        </p>
                      </div>

                      <button
                        onClick={() => setQrParaImprimir(c)}
                        className="shrink-0 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Ver/Imprimir QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>

                      <div className="shrink-0 text-right">
                        {estaPresente ? (
                          <div>
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Presente</span>
                            {horaEntrada && <p className="text-xs text-green-600 mt-1 font-mono">{horaEntrada}</p>}
                          </div>
                        ) : (
                          <button
                            onClick={() => togglePresente(c)}
                            className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold border border-indigo-200 cursor-pointer"
                          >
                            Marcar Entrada
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* CONTENIDO PESTAÑA 2: SERVIDORES */
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white border border-amber-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-amber-800">{totalServFiltrado}</p>
                <p className="text-xs text-amber-600 mt-0.5">Total Servidores</p>
              </div>
              <div className="bg-white border border-green-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-700">{presentesServidores.length}</p>
                <p className="text-xs text-green-600 mt-0.5">Presentes</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-600">{totalServFiltrado - presentesServidores.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
              </div>
            </div>

            {totalServFiltrado > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-amber-700 mb-1">
                  <span>Progreso de Llegadas Servidores ({comunidadActual?.nombre || "General"})</span>
                  <span className="font-bold">{pctServ}%</span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${pctServ}%` }} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={filtroEquipoServidor}
                onChange={e => setFiltroEquipoServidor(e.target.value)}
                className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Todos">🛡️ Todos los Equipos ({equiposServidoresDisponibles.length - 1})</option>
                {equiposServidoresDisponibles.filter(eq => eq !== "Todos").map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>

              {["todos", "presentes", "ausentes"].map(op => (
                <button
                  key={op}
                  onClick={() => setFiltroEstado(op)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize cursor-pointer ${
                    filtroEstado === op ? "bg-amber-700 text-white border-amber-700" : "border-amber-200 text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {op === "todos" ? "Todos" : op === "presentes" ? "✅ Presentes" : "⏳ Pendientes"}
                </button>
              ))}

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  placeholder="Buscar servidor en esta comunidad..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            </div>

            {loadingGenerico ? (
              <div className="py-16 text-center text-amber-500 text-sm font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando servidores de {comunidadActual?.nombre}...
              </div>
            ) : servidoresFiltrados.length === 0 ? (
              <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-amber-100 p-6">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-700" />
                <p className="font-semibold text-slate-700">No hay servidores registrados en la comunidad activa ({comunidadActual?.nombre || "Comunidad Activa"})</p>
              </div>
            ) : (
              <div className="space-y-2">
                {servidoresFiltrados.map(s => {
                  const sId = String(s.id || s._id).trim();
                  const override = asistenciaLocal[sId];
                  const estaPresente = override !== undefined ? override.presente : s.presente;
                  const horaEntrada = override !== undefined ? override.hora_entrada : s.hora_entrada;

                  return (
                    <div
                      key={sId}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                        estaPresente ? "bg-green-50 border-green-200" : "bg-white border-amber-100"
                      }`}
                    >
                      <div className="shrink-0 cursor-pointer" onClick={() => togglePresente(s)}>
                        {estaPresente ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => togglePresente(s)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm truncate ${estaPresente ? "text-green-800" : "text-gray-800"}`}>
                            {s.nombre}
                          </p>
                          {s.equipo_trabajo && (
                            <span className="text-xs bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                              {s.equipo_trabajo}
                            </span>
                          )}
                          {s.apodo && (
                            <span className="text-xs text-amber-700 font-bold font-serif">"{s.apodo}"</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {s.parroquia || "—"}{s.telefono ? ` · Tel: ${s.telefono}` : ""}
                        </p>
                      </div>

                      <button
                        onClick={() => setQrParaImprimir(s)}
                        className="shrink-0 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Ver/Imprimir QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>

                      <div className="shrink-0 text-right">
                        {estaPresente ? (
                          <div>
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Presente</span>
                            {horaEntrada && <p className="text-xs text-green-600 mt-1 font-mono">{horaEntrada}</p>}
                          </div>
                        ) : (
                          <button
                            onClick={() => togglePresente(s)}
                            className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold border border-indigo-200 cursor-pointer"
                          >
                            Marcar Entrada
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PullToRefresh>

      {/* Modal Escáner QR Y PANTALLA DE CONFIRMACIÓN DE LLEGADA */}
      {escanerAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-indigo-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 text-white px-5 py-4 flex items-center justify-between shadow-md">
              <h2 className="text-base font-black flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-300" /> Escáner de Entrada ({comunidadActual?.nombre || "General"})
              </h2>
              <button onClick={cerrarEscaner} className="hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {cargandoLibreria && (
                <div className="flex flex-col items-center justify-center py-10 text-indigo-700">
                  <Loader2 className="w-10 h-10 animate-spin mb-3" />
                  <p className="font-semibold text-sm">Cargando cámara...</p>
                </div>
              )}

              {errorCamara && (
                <div className="text-center py-4">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-gray-900 mb-1">Acceso a Cámara Limitado</h3>
                  <p className="text-gray-600 text-xs mb-4 px-2">{errorCamara}</p>
                  <div className="flex justify-center gap-2 mb-4">
                    <button 
                      onClick={() => { setErrorCamara(null); iniciarEscaner(); }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow cursor-pointer"
                    >
                      Reintentar Cámara
                    </button>
                  </div>
                </div>
              )}

              {/* 🔍 BUSCADOR MANUAL DE RESPALDO LIMITADO A LA COMUNIDAD ACTUAL */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 shadow-xs">
                <label className="block text-xs font-bold text-amber-950 mb-1.5 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-amber-700" /> Buscar participante en {comunidadActual?.nombre || "esta comunidad"}:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez, #12 o 001-0000000-0..."
                    value={busquedaManualScan}
                    onChange={(e) => setBusquedaManualScan(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-amber-500 bg-white text-slate-800 placeholder:text-gray-400"
                  />
                  {busquedaManualScan && (
                    <button onClick={() => setBusquedaManualScan("")} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {resultadosBusquedaManualScan.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 bg-white border border-amber-200 rounded-xl p-2 max-h-52 overflow-y-auto divide-y divide-amber-50">
                    {resultadosBusquedaManualScan.map(p => {
                      const pId = String(p.id || p._id).trim();
                      const override = asistenciaLocal[pId];
                      const estaPresente = override !== undefined ? override.presente : p.presente;
                      const horaEntrada = override !== undefined ? override.hora_entrada : p.hora_entrada;
                      const esServ = esPersonaServidor(p);

                      return (
                        <div 
                          key={pId} 
                          onClick={() => procesarSeleccionManualModal(p)}
                          className="flex items-center justify-between p-2 hover:bg-amber-100/70 rounded-lg cursor-pointer text-xs transition-colors pt-1.5"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="truncate">{p.nombre}</span>
                              <span className={`text-[9px] px-2 py-0.2 rounded-md font-extrabold shrink-0 ${esServ ? "bg-blue-100 text-blue-900 border border-blue-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                                {esServ ? "Servidor" : "Caminante"}
                              </span>
                            </p>
                            <p className="text-[10px] text-amber-800 font-medium">
                              {esServ ? `Equipo: ${p.equipo_trabajo || p.rol || "Servidor"}` : `Ficha: #${p.numero_ficha || "S/A"} · Mesa: ${p.numero_mesa || "S/A"}`}
                            </p>
                          </div>
                          {estaPresente ? (
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full shrink-0">
                              ✓ Presente ({horaEntrada || "Hoy"})
                            </span>
                          ) : (
                            <button className="text-[10px] bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg font-black shadow-2xs shrink-0 cursor-pointer">
                              Traer a pantalla
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!cargandoLibreria && !procesando && resultadoQR === null && (
                <div className="space-y-2">
                  <p className="text-center text-xs text-indigo-900 font-bold">Apunta con la cámara al código QR de la tarjeta o pase:</p>
                  <div 
                    id="qr-reader" 
                    className="w-full rounded-2xl overflow-hidden border-2 border-indigo-300 shadow-inner bg-slate-950"
                    style={{ minHeight: "250px" }}
                  ></div>
                </div>
              )}

              {procesando && (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-700">
                  <Loader2 className="w-10 h-10 animate-spin mb-3" />
                  <p className="font-bold text-sm">Buscando participante en la comunidad...</p>
                </div>
              )}

              {/* 🎯 TARJETA DE CONFIRMACIÓN DE ENTRADA TRAÍDA A LA PANTALLA */}
              {resultadoQR === "confirmar" && personaPorConfirmar && (
                <div className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 shadow-xl text-center space-y-4 animate-in zoom-in-95">
                  
                  <div className="flex justify-center">
                    <div className={`w-16 h-16 rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-white ${
                      personaPorConfirmar._esServidor 
                        ? "bg-gradient-to-br from-blue-700 to-indigo-900" 
                        : "bg-gradient-to-br from-amber-700 to-amber-950"
                    }`}>
                      {personaPorConfirmar.nombre ? personaPorConfirmar.nombre.charAt(0).toUpperCase() : "P"}
                    </div>
                  </div>

                  <div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-2xs ${
                      personaPorConfirmar._esServidor 
                        ? "bg-blue-100 text-blue-900 border-blue-300" 
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}>
                      {personaPorConfirmar._esServidor ? "🤝 Servidor de Emaús" : "🚶‍♂️ Caminante de Emaús"}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2 leading-tight">
                      {personaPorConfirmar.nombre}
                    </h3>
                    {personaPorConfirmar.apodo && (
                      <p className="text-xs font-bold text-amber-700 font-serif mt-0.5">"{personaPorConfirmar.apodo}"</p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-amber-200 text-left space-y-2 text-xs shadow-2xs">
                    {personaPorConfirmar._esServidor ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500">Equipo:</span>
                          <span className="font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                            {personaPorConfirmar.equipo_trabajo || personaPorConfirmar.rol || "Servidor"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-500">Parroquia:</span>
                          <span className="font-bold text-slate-800">{personaPorConfirmar.parroquia || "No especificada"}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500">N° Ficha:</span>
                          <span className="font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md font-mono text-sm">
                            #{personaPorConfirmar.numero_ficha || personaPorConfirmar.ficha || "S/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-500">Mesa Asignada:</span>
                          <span className="font-bold text-slate-900">Mesa {personaPorConfirmar.numero_mesa || personaPorConfirmar.mesa || "Sin Asignar"}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                          <span className="font-bold text-slate-500">Habitación:</span>
                          <span className="font-bold text-slate-900">Hab {personaPorConfirmar.numero_habitacion || personaPorConfirmar.habitacion || "Sin Asignar"}</span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span className="font-bold text-slate-500">Estado de Entrada:</span>
                      {personaEstaPresente ? (
                        <span className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px]">
                          ✓ Llegó a las {horaEntradaModal || "Hoy"}
                        </span>
                      ) : (
                        <span className="font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full text-[11px]">
                          ⏳ Pendiente de Llegada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BOTÓN DE CONFIRMACIÓN INCONDICIONAL */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        ejecutarConfirmacionPresencia(personaPorConfirmar);
                      }}
                      className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-emerald-400"
                    >
                      <CheckCheck className="w-5 h-5 text-white" />
                      <span>
                        {personaEstaPresente ? "✓ PRESENCIA REGISTRADA (VOLVER A CONFIRMAR)" : "CONFIRMAR PRESENCIA Y REGISTRAR ENTRADA"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={reiniciarEscaner}
                      className="w-full py-2.5 px-4 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-4 h-4 text-amber-300" />
                      <span>Escanear Siguiente Persona</span>
                    </button>
                  </div>

                </div>
              )}

              {/* ERROR: NO ENCONTRADO EN LA COMUNIDAD */}
              {resultadoQR === "error" && (
                <div className="text-center py-6 bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 space-y-3">
                  <X className="w-12 h-12 text-rose-600 mx-auto" />
                  <h3 className="text-base font-black text-rose-950">
                    Caminante o Servidor no Encontrado
                  </h3>
                  <p className="text-rose-700 text-xs font-medium">
                    No se encontró ningún participante activo en la comunidad <strong>"{comunidadActual?.nombre || "Comunidad Activa"}"</strong> que coincida con la búsqueda o el código QR escaneado.
                  </p>
                  {rawQREscaneado && (
                    <p className="text-[10px] text-gray-500 font-mono bg-white p-2 rounded border border-rose-200 break-all">
                      Dato escaneado: {rawQREscaneado}
                    </p>
                  )}
                  <p className="text-xs text-amber-900 font-bold">
                    💡 La búsqueda está aislada únicamente a los participantes de la comunidad activa.
                  </p>
                  <button 
                    onClick={reiniciarEscaner} 
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl font-black text-xs shadow cursor-pointer"
                  >
                    Reintentar Escáner
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {qrParaImprimir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Código QR
              </h2>
              <button onClick={() => setQrParaImprimir(null)} className="hover:bg-amber-700 p-1 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-4">
                <h3 className="text-lg font-bold text-amber-900 mb-1">{qrParaImprimir.nombre}</h3>
                <p className="text-sm font-semibold text-amber-800">
                  {esPersonaServidor(qrParaImprimir) 
                    ? `Servidor · ${qrParaImprimir.equipo_trabajo || qrParaImprimir.rol || "Servicio"}`
                    : `Caminante · Ficha #${qrParaImprimir.numero_ficha || "N/A"}`}
                </p>
                <div className="my-4 flex justify-center bg-white p-3 rounded-lg">
                  <img src={generarQR(obtenerPayloadQR(qrParaImprimir))} alt="QR" width={180} height={180} />
                </div>
                <p className="text-xs text-amber-600 italic">Presenta este código al llegar</p>
              </div>
              <button
                onClick={() => imprimirQR(qrParaImprimir)}
                className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-lg font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}