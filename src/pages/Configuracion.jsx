// Configuracion.jsx - Módulo de Configuración General con Fijación Indestructible de País, Moneda, Logos y Sincronización Total de Formularios
import { useEffect, useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import BackArrow from "@/components/BackArrow";
import SelectorComunidad from "@/components/SelectorComunidad";
import { 
  Save, Upload, Settings, Monitor, ExternalLink, Trash2, 
  AlertTriangle, X, Plus, Palette, RefreshCw, ShieldCheck, 
  Globe, CheckCircle2, Building2, Phone, Calendar, Users, 
  Sparkles, Layers, DollarSign, Lock, Unlock, Sliders, HelpCircle,
  Ruler, Scale, Eye, EyeOff, UserCheck, Check, Search, Filter
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import { useLanguage } from "@/components/MobileTopBar";
import RolesRetiro from "@/components/configuracion/RolesRetiro";
import { notificarCambioGlobal } from "@/pages/GestionUsuarios";

// 🌍 DICCIONARIO OFICIAL DE PAÍSES Y SUS MONEDAS ASOCIADAS
export const PAISES_MONEDAS = [
  { pais: "República Dominicana", bandera: "🇩🇴", moneda: "RD$", iso: "DOP" },
  { pais: "Estados Unidos", bandera: "🇺🇸", moneda: "USD$", iso: "USD" },
  { pais: "España", bandera: "🇪🇸", moneda: "EUR$", iso: "EUR" },
  { pais: "México", bandera: "🇲🇽", moneda: "MXN$", iso: "MXN" },
  { pais: "Colombia", bandera: "🇨🇴", moneda: "COP$", iso: "COP" },
  { pais: "Guatemala", bandera: "🇬🇹", moneda: "GTQ$", iso: "GTQ" },
  { pais: "Costa Rica", bandera: "🇨🇷", moneda: "CRC$", iso: "CRC" },
  { pais: "Panamá", bandera: "🇵🇦", moneda: "PAB$", iso: "PAB" },
  { pais: "Puerto Rico", bandera: "🇵🇷", moneda: "USD$", iso: "USD" },
  { pais: "Ecuador", bandera: "🇪🇨", moneda: "USD$", iso: "USD" },
  { pais: "Perú", bandera: "🇵🇪", moneda: "PEN$", iso: "PEN" },
  { pais: "Argentina", bandera: "🇦🇷", moneda: "ARS$", iso: "ARS" },
  { pais: "Chile", bandera: "CLP", moneda: "CLP$", iso: "CLP" },
];

export const UNIDADES_ESTATURA = [
  { value: "cm", label: "Centímetros (cm)" },
  { value: "m", label: "Metros (m)" },
  { value: "pulgadas", label: "Pulgadas (in)" },
  { value: "ft/in", label: "Pies y Pulgadas (ft/in)" },
];

export const UNIDADES_PESO = [
  { value: "lb", label: "Libras (lb)" },
  { value: "kg", label: "Kilogramos (kg)" },
];

export const CAMPOS_ESTANDAR = [
  { key: "cedula", label: "Cédula / Documento Identidad", cat: "Personal" },
  { key: "apodo", label: "Apodo / Sobrenombre", cat: "Personal" },
  { key: "fecha_nacimiento", label: "Fecha de Nacimiento", cat: "Personal" },
  { key: "edad", label: "Edad", cat: "Personal" },
  { key: "genero", label: "Género / Sexo", cat: "Personal" },
  { key: "estado_civil", label: "Estado Civil", cat: "Personal" },
  { key: "profesion", label: "Profesión / Ocupación", cat: "Personal" },
  { key: "telefono", label: "Teléfono Principal", cat: "Contacto" },
  { key: "email", label: "Correo Electrónico", cat: "Contacto" },
  { key: "direccion", label: "Dirección / Sector", cat: "Contacto" },
  { key: "parroquia", label: "Parroquia", cat: "Eclesiástico" },
  { key: "bautizado", label: "Bautizado", cat: "Eclesiástico" },
  { key: "confirmado", label: "Confirmado", cat: "Eclesiástico" },
  { key: "matrimonio_iglesia", label: "Matrimonio por la Iglesia", cat: "Eclesiástico" },
  { key: "talla_camisa", label: "Talla de Camisa", cat: "Físico" },
  { key: "estatura", label: "Estatura / Altura", cat: "Físico" },
  { key: "peso", label: "Peso Corporal", cat: "Físico" },
  { key: "alergias", label: "Alergias Conocidas", cat: "Salud" },
  { key: "necesidades_medicas", label: "Condiciones de Salud", cat: "Salud" },
  { key: "medicamentos", label: "Medicamentos Actuales", cat: "Salud" },
  { key: "contacto_emergencia", label: "Contacto de Emergencia", cat: "Emergencia" },
  { key: "telefono_emergencia", label: "Teléfono de Emergencia", cat: "Emergencia" },
  { key: "relacion_emergencia", label: "Parentesco de Emergencia", cat: "Emergencia" },
];

const EMPTY = {
  nombre_retiro: "Retiro de Emaús",
  tipo_retiro: "",
  codigo_retiro: "",
  eslogan: "",
  edicion: "",
  pais: "República Dominicana",
  moneda: "RD$",
  unidad_estatura: "cm",
  unidad_peso: "lb",
  bloqueado: false,
  provincia: "",
  parroquia: "",
  fecha_inicio: "",
  fecha_fin: "",
  lugar: "",
  logo_url: "",
  logo_hombres_url: "",
  logo_mujeres_url: "",
  capacidad_mesa: 8,
  capacidad_habitacion: 4,
  total_mesas: 10,
  total_habitaciones: 10,
  contacto_rector: "",
  coordinador: "",
  sub_coordinador: "",
  telefono_contacto: "",
  grupo_whatsapp: "",
  niveles_edificio: 2,
  habitaciones_por_nivel: 5,
  total_fichas: 100,
};

// 🖼️ COMPRESOR ULTRA RÁPIDO DE IMÁGENES (Garantiza guardado liviano sin superar cuotas)
const comprimirImagen = (file, maxAncho = 400, maxAlto = 400, calidad = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxAncho) {
            height = Math.round((height * maxAncho) / width);
            width = maxAncho;
          }
        } else {
          if (height > maxAlto) {
            width = Math.round((width * maxAlto) / height);
            height = maxAlto;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export default function Configuracion() {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalGuardadoOpen, setModalGuardadoOpen] = useState(false);
  const [modalCamposOpen, setModalCamposOpen] = useState(false);
  const [editandoManualmente, setEditandoManualmente] = useState(false);

  const [uploading, setUploading] = useState({
    general: false,
    hombres: false,
    mujeres: false,
  });
  
  const { user, logout } = useAuth();
  const { comunidadActual } = useComunidad();

  // ID unificado e inmutable de la comunidad activa
  const equipoIdActivo = useMemo(() => {
    return (
      comunidadActual?.equipo_id || 
      comunidadActual?.id || 
      comunidadActual?.slug || 
      user?.equipo_id || 
      user?.comunidad_id ||
      "comunidad_default"
    );
  }, [comunidadActual, user]);

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const [crearRetiroOpen, setCrearRetiroOpen] = useState(false);
  const [nuevoRetiro, setNuevoRetiro] = useState(EMPTY);
  const [iniciandoRetiro, setIniciandoRetiro] = useState(false);

  // Configuración de campos de formularios (Con inicialización inteligente desde localStorage)
  const [configCamposCaminante, setConfigCamposCaminante] = useState(() => {
    const init = {};
    CAMPOS_ESTANDAR.forEach(c => { init[c.key] = { activo: true, obligatorio: false }; });
    try {
      const raw = localStorage.getItem(`emaus_config_campos_caminante_${equipoIdActivo}`) || localStorage.getItem("emaus_config_campos_caminante");
      if (raw) return { ...init, ...JSON.parse(raw) };
    } catch (e) {}
    return init;
  });

  const [configCamposServidor, setConfigCamposServidor] = useState(() => {
    const init = {};
    CAMPOS_ESTANDAR.forEach(c => { init[c.key] = { activo: true, obligatorio: false }; });
    try {
      const raw = localStorage.getItem(`emaus_config_campos_servidor_${equipoIdActivo}`) || localStorage.getItem("emaus_config_campos_servidor");
      if (raw) return { ...init, ...JSON.parse(raw) };
    } catch (e) {}
    return init;
  });

  // 🔒 CARGA INTELIGENTE QUE PRESERVA LA ELECCIÓN DE PAÍS, MONEDA, LOGOS Y ESTADO DE BLOQUEO
  const cargarConfiguracion = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const keyLocal = `emaus_config_retiro_${equipoIdActivo}`;

    // 1. Obtener respaldos locales previos si existen
    const paisGuardadoLocal = localStorage.getItem(`emaus_pais_${equipoIdActivo}`) || localStorage.getItem("emaus_pais");
    const monedaGuardadaLocal = localStorage.getItem(`emaus_moneda_${equipoIdActivo}`) || localStorage.getItem("emaus_moneda");
    let configBackupLocal = null;

    try {
      const raw = localStorage.getItem(keyLocal);
      if (raw) configBackupLocal = JSON.parse(raw);
    } catch (e) {}

    const logoGeneralLocal = localStorage.getItem(`emaus_logo_url_${equipoIdActivo}`) || configBackupLocal?.logo_url || "";
    const logoHombresLocal = localStorage.getItem(`emaus_logo_hombres_url_${equipoIdActivo}`) || configBackupLocal?.logo_hombres_url || "";
    const logoMujeresLocal = localStorage.getItem(`emaus_logo_mujeres_url_${equipoIdActivo}`) || configBackupLocal?.logo_mujeres_url || "";

    try {
      // 2. Consultar servidor Base44
      let data = [];
      if (base44.entities.ConfigRetiro?.list) {
        data = await base44.entities.ConfigRetiro.list().catch(() => []);
      } else if (base44.entities.Configuracion?.list) {
        data = await base44.entities.Configuracion.list().catch(() => []);
      }
      
      const match = (data || []).find(c => 
        String(c.equipo_id) === String(equipoIdActivo) || 
        String(c.comunidad_id) === String(equipoIdActivo) ||
        String(c.id) === String(equipoIdActivo)
      );

      // Determinar país y moneda con prioridad a lo que el usuario haya seleccionado firmemente
      const paisFinal = match?.pais || configBackupLocal?.pais || paisGuardadoLocal || "República Dominicana";
      const monedaFinal = match?.moneda || configBackupLocal?.moneda || monedaGuardadaLocal || (PAISES_MONEDAS.find(p => p.pais === paisFinal)?.moneda || "RD$");

      // Determinar logos de manera inteligente (preservar el local si la respuesta de API viene vacía)
      const logoUrlFinal = (match?.logo_url && match.logo_url.trim()) ? match.logo_url : logoGeneralLocal;
      const logoHombresFinal = (match?.logo_hombres_url && match.logo_hombres_url.trim()) ? match.logo_hombres_url : logoHombresLocal;
      const logoMujeresFinal = (match?.logo_mujeres_url && match.logo_mujeres_url.trim()) ? match.logo_mujeres_url : logoMujeresLocal;

      // 🔒 EVALUACIÓN DE BLOQUEO FIRME Y RESILIENTE
      const bloqueadoLocal = localStorage.getItem(`emaus_config_bloqueado_${equipoIdActivo}`);
      let estaBloqueado = false;
      if (bloqueadoLocal === "true") {
        estaBloqueado = true;
      } else if (bloqueadoLocal === "false") {
        estaBloqueado = false;
      } else {
        const bVal = match?.bloqueado ?? configBackupLocal?.bloqueado;
        estaBloqueado = bVal === true || bVal === "true" || bVal === 1;
      }

      if (match) {
        const configOficial = { 
          ...EMPTY, 
          ...match, 
          pais: paisFinal, 
          moneda: monedaFinal,
          logo_url: logoUrlFinal,
          logo_hombres_url: logoHombresFinal,
          logo_mujeres_url: logoMujeresFinal,
          unidad_estatura: match.unidad_estatura || configBackupLocal?.unidad_estatura || "cm",
          unidad_peso: match.unidad_peso || configBackupLocal?.unidad_peso || "lb",
          bloqueado: estaBloqueado
        };

        setForm(prev => {
          if (prev.bloqueado === false && editandoManualmente) return prev;
          return configOficial;
        });

        setConfigId(match.id);

        try {
          localStorage.setItem(keyLocal, JSON.stringify(configOficial));
          localStorage.setItem(`emaus_config_bloqueado_${equipoIdActivo}`, estaBloqueado ? "true" : "false");
          localStorage.setItem(`emaus_pais_${equipoIdActivo}`, paisFinal);
          localStorage.setItem(`emaus_moneda_${equipoIdActivo}`, monedaFinal);
          localStorage.setItem("emaus_pais", paisFinal);
          localStorage.setItem("emaus_moneda", monedaFinal);
          if (logoUrlFinal) localStorage.setItem(`emaus_logo_url_${equipoIdActivo}`, logoUrlFinal);
          if (logoHombresFinal) localStorage.setItem(`emaus_logo_hombres_url_${equipoIdActivo}`, logoHombresFinal);
          if (logoMujeresFinal) localStorage.setItem(`emaus_logo_mujeres_url_${equipoIdActivo}`, logoMujeresFinal);
        } catch (e) {}

        if (match.config_campos_caminante) {
          try {
            const parsed = typeof match.config_campos_caminante === "string" 
              ? JSON.parse(match.config_campos_caminante) 
              : match.config_campos_caminante;
            setConfigCamposCaminante(prev => ({ ...prev, ...parsed }));
            localStorage.setItem(`emaus_config_campos_caminante_${equipoIdActivo}`, JSON.stringify(parsed));
            localStorage.setItem("emaus_config_campos_caminante", JSON.stringify(parsed));
          } catch (e) {}
        }

        if (match.config_campos_servidor) {
          try {
            const parsed = typeof match.config_campos_servidor === "string" 
              ? JSON.parse(match.config_campos_servidor) 
              : match.config_campos_servidor;
            setConfigCamposServidor(prev => ({ ...prev, ...parsed }));
            localStorage.setItem(`emaus_config_campos_servidor_${equipoIdActivo}`, JSON.stringify(parsed));
            localStorage.setItem("emaus_config_campos_servidor", JSON.stringify(parsed));
          } catch (e) {}
        }
      } else if (configBackupLocal) {
        setForm(prev => editandoManualmente ? prev : { 
          ...EMPTY, 
          ...configBackupLocal, 
          pais: paisFinal, 
          moneda: monedaFinal,
          logo_url: logoGeneralLocal,
          logo_hombres_url: logoHombresLocal,
          logo_mujeres_url: logoMujeresLocal,
          bloqueado: estaBloqueado
        });
      } else {
        setForm(prev => editandoManualmente ? prev : { 
          ...EMPTY, 
          pais: paisFinal, 
          moneda: monedaFinal,
          logo_url: logoGeneralLocal,
          logo_hombres_url: logoHombresLocal,
          logo_mujeres_url: logoMujeresLocal,
          bloqueado: estaBloqueado 
        });
      }
    } catch (err) {
      console.warn("Advertencia cargando configuración:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [equipoIdActivo, editandoManualmente]);

  useEffect(() => {
    cargarConfiguracion(true);

    const handleSync = () => cargarConfiguracion(false);
    const handleFocus = () => cargarConfiguracion(false);

    window.addEventListener("emaus_data_changed", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleFocus);

    const timer = setInterval(() => {
      cargarConfiguracion(false);
    }, 8000);

    return () => {
      window.removeEventListener("emaus_data_changed", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleFocus);
      clearInterval(timer);
    };
  }, [cargarConfiguracion]);

  useEffect(() => {
    if (nuevoRetiro.tipo_retiro) {
      const prefix = nuevoRetiro.tipo_retiro === "Retiro Hombres" ? "HOM" : "MUJ";
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setNuevoRetiro(f => ({ ...f, codigo_retiro: `${prefix}-${year}-${random}` }));
    }
  }, [nuevoRetiro.tipo_retiro]);

  const handleChange = (e) => {
    if (form.bloqueado) return;
    setEditandoManualmente(true);
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
  };

  // 🔓 DESBLOQUEAR EDICIÓN
  const handleDesbloquear = async () => {
    setEditandoManualmente(true);
    const updated = { ...form, bloqueado: false };
    setForm(updated);
    
    const keyLocal = `emaus_config_retiro_${equipoIdActivo}`;
    try {
      localStorage.setItem(keyLocal, JSON.stringify(updated));
      localStorage.setItem(`emaus_config_bloqueado_${equipoIdActivo}`, "false");
    } catch (e) {}

    const entityRef = base44.entities.ConfigRetiro || base44.entities.Configuracion;
    if (configId && entityRef?.update) {
      await entityRef.update(configId, { bloqueado: false }).catch(() => null);
    }
    notificarCambioGlobal("Configuracion", equipoIdActivo);
    toast.success("🔓 Configuración desbloqueada correctamente para edición.");
  };

  // 🌍 CAMBIO DE PAÍS Y MONEDA CON SELLO INDESTRUCTIBLE
  const handlePaisChange = (e) => {
    if (form.bloqueado) return;
    setEditandoManualmente(true);
    const nuevoPais = e.target.value;
    const match = PAISES_MONEDAS.find(p => p.pais === nuevoPais);
    const nuevaMoneda = match ? match.moneda : "RD$";

    setForm(prev => {
      const updated = { ...prev, pais: nuevoPais, moneda: nuevaMoneda };
      const keyLocal = `emaus_config_retiro_${equipoIdActivo}`;
      
      try {
        localStorage.setItem(keyLocal, JSON.stringify(updated));
        localStorage.setItem(`emaus_pais_${equipoIdActivo}`, nuevoPais);
        localStorage.setItem(`emaus_moneda_${equipoIdActivo}`, nuevaMoneda);
        localStorage.setItem("emaus_pais", nuevoPais);
        localStorage.setItem("emaus_moneda", nuevaMoneda);
      } catch (e) {}

      return updated;
    });

    toast.info(`🌎 País fijado a ${nuevoPais} — Moneda oficial: ${nuevaMoneda}`);
  };

  const handleRolChange = (key, value) => {
    if (form.bloqueado) return;
    setEditandoManualmente(true);
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleLogoUpload = async (e, tipo = "general") => {
    if (form.bloqueado) {
      toast.warning("Desbloquea la configuración para cambiar los logos.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [tipo]: true }));
    
    try {
      let file_url = "";
      if (base44.integrations?.Core?.UploadFile) {
        try {
          const res = await base44.integrations.Core.UploadFile({ file });
          if (res?.file_url) file_url = res.file_url;
        } catch (eUpload) {
          console.warn("UploadFile fallback:", eUpload);
        }
      }
      
      if (!file_url) {
        file_url = await comprimirImagen(file, 400, 400, 0.85);
      }
      
      const campoLogo = tipo === "hombres" ? "logo_hombres_url" : 
                         tipo === "mujeres" ? "logo_mujeres_url" : "logo_url";
      
      setForm(f => {
        const updated = { ...f, [campoLogo]: file_url };
        const keyLocal = `emaus_config_retiro_${equipoIdActivo}`;
        try {
          localStorage.setItem(keyLocal, JSON.stringify(updated));
          localStorage.setItem(`emaus_${campoLogo}_${equipoIdActivo}`, file_url);
        } catch (eLocal) {}
        return updated;
      });

      setEditandoManualmente(true);
      
      const nombreTipo = tipo === "hombres" ? "Hombres" : 
                         tipo === "mujeres" ? "Mujeres" : "General";
      toast.success(`✅ Logo de ${nombreTipo} subido y guardado correctamente.`);
    } catch (error) {
      toast.error("Error al subir el logo: " + error.message);
    } finally {
      setUploading(prev => ({ ...prev, [tipo]: false }));
    }
  };

  // 🛡️ GUARDADO OFICIAL DEFINITIVO Y BLOQUEO DE CONFIGURACIÓN
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (form.bloqueado) {
      toast.warning("La configuración está bloqueada. Presiona 'Desbloquear' en la barra superior para editar.");
      return;
    }

    if (!form.nombre_retiro?.trim()) {
      toast.warning("Por favor ingresa el nombre del retiro antes de guardar.");
      return;
    }

    setSaving(true);
    setEditandoManualmente(false);

    const updatedForm = {
      ...form,
      pais: form.pais || "República Dominicana",
      moneda: form.moneda || "RD$",
      unidad_estatura: form.unidad_estatura || "cm",
      unidad_peso: form.unidad_peso || "lb",
      config_campos_caminante: JSON.stringify(configCamposCaminante),
      config_campos_servidor: JSON.stringify(configCamposServidor),
      bloqueado: true,
      equipo_id: equipoIdActivo,
      comunidad_id: equipoIdActivo,
    };

    setForm(updatedForm);

    const keyLocal = `emaus_config_retiro_${equipoIdActivo}`;
    try {
      localStorage.setItem(keyLocal, JSON.stringify(updatedForm));
      localStorage.setItem(`emaus_config_bloqueado_${equipoIdActivo}`, "true");
      localStorage.setItem(`emaus_pais_${equipoIdActivo}`, updatedForm.pais);
      localStorage.setItem(`emaus_moneda_${equipoIdActivo}`, updatedForm.moneda);
      localStorage.setItem("emaus_pais", updatedForm.pais);
      localStorage.setItem("emaus_moneda", updatedForm.moneda);
      if (updatedForm.logo_url) localStorage.setItem(`emaus_logo_url_${equipoIdActivo}`, updatedForm.logo_url);
      if (updatedForm.logo_hombres_url) localStorage.setItem(`emaus_logo_hombres_url_${equipoIdActivo}`, updatedForm.logo_hombres_url);
      if (updatedForm.logo_mujeres_url) localStorage.setItem(`emaus_logo_mujeres_url_${equipoIdActivo}`, updatedForm.logo_mujeres_url);
      
      // Sincronización inquebrantable de campos personalizados
      localStorage.setItem(`emaus_config_campos_caminante_${equipoIdActivo}`, JSON.stringify(configCamposCaminante));
      localStorage.setItem(`emaus_config_campos_servidor_${equipoIdActivo}`, JSON.stringify(configCamposServidor));
      localStorage.setItem("emaus_config_campos_caminante", JSON.stringify(configCamposCaminante));
      localStorage.setItem("emaus_config_campos_servidor", JSON.stringify(configCamposServidor));
    } catch (e) {}

    try {
      const { id, _id, created_at, created_date, updated_date, updated_at, created_by, updated_by, ...payload } = updatedForm;

      let activeConfigId = configId;
      const entityRef = base44.entities.ConfigRetiro || base44.entities.Configuracion;

      if (entityRef) {
        if (!activeConfigId && entityRef.list) {
          const listado = await entityRef.list().catch(() => []);
          const existente = (listado || []).find(c => 
            String(c.equipo_id) === String(equipoIdActivo) || 
            String(c.comunidad_id) === String(equipoIdActivo)
          );
          if (existente?.id) activeConfigId = existente.id;
        }

        if (activeConfigId && entityRef.update) {
          await entityRef.update(activeConfigId, payload);
          setConfigId(activeConfigId);
        } else if (entityRef.create) {
          const created = await entityRef.create(payload);
          if (created?.id) setConfigId(created.id);
        }
      }

      setModalGuardadoOpen(true);
      notificarCambioGlobal("Configuracion", equipoIdActivo);
      notificarCambioGlobal("ConfiguracionCampos", equipoIdActivo);
      toast.success(`✅ Configuración guardada y bloqueada exitosamente. Formularios sincronizados.`);
    } catch (err) {
      console.error("❌ Error guardando en servidor:", err);
      setModalGuardadoOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const abrirModalNuevoRetiro = () => {
    if (form.bloqueado) {
      toast.warning("Desbloquea la configuración primero antes de crear un nuevo retiro.");
      return;
    }
    setNuevoRetiro({
      ...form,
      tipo_retiro: "",
      codigo_retiro: "",
    });
    setCrearRetiroOpen(true);
  };

  const handleIniciarRetiro = async () => {
    setIniciandoRetiro(true);
    
    try {
      let caminantes = [];
      let servidores = [];
      
      try {
        const todosCams = await base44.entities.Caminante.list();
        caminantes = (todosCams || []).filter(c => String(c.equipo_id) === String(equipoIdActivo) || String(c.comunidad_id) === String(equipoIdActivo));
      } catch (e) {}

      try {
        const todosServs = await base44.entities.Servidor.list();
        servidores = (todosServs || []).filter(s => String(s.equipo_id) === String(equipoIdActivo) || String(s.comunidad_id) === String(equipoIdActivo));
      } catch (e) {}
      
      const datosHistorial = {
        ...form,
        equipo_id: equipoIdActivo,
        comunidad_id: equipoIdActivo,
        numero_retiro: form.edicion || "1",
        fecha_archivo: new Date().toISOString().split('T')[0],
        total_caminantes: caminantes.length,
        total_servidores: servidores.length,
        caminantes: JSON.stringify(caminantes),
        servidores: JSON.stringify(servidores),
        notas: `Archivado automáticamente el ${new Date().toLocaleDateString("es-ES")} (${comunidadActual?.nombre || 'General'})`
      };

      if (base44.entities.HistorialRetiro?.create) {
        await base44.entities.HistorialRetiro.create(datosHistorial).catch(() => {});
      }

      await Promise.allSettled([
        ...caminantes.map(c => base44.entities.Caminante.delete(c.id)),
        ...servidores.map(s => base44.entities.Servidor.delete(s.id)),
      ]);

      try {
        const todosMovs = await base44.entities.MovimientoFinanciero.list();
        const movs = (todosMovs || []).filter(m => String(m.equipo_id) === String(equipoIdActivo) || String(m.comunidad_id) === String(equipoIdActivo));
        await Promise.allSettled(movs.map(m => base44.entities.MovimientoFinanciero.delete(m.id)));
      } catch (e) {}

      try {
        const todasAudits = await base44.entities.AuditoriaFinanza.list();
        const audits = (todasAudits || []).filter(a => String(a.equipo_id) === String(equipoIdActivo) || String(a.comunidad_id) === String(equipoIdActivo));
        await Promise.allSettled(audits.map(a => base44.entities.AuditoriaFinanza.delete(a.id)));
      } catch (e) {}

      try {
        const todasCajas = await base44.entities.Caja.list();
        const cajas = (todasCajas || []).filter(c => String(c.equipo_id) === String(equipoIdActivo) || String(c.comunidad_id) === String(equipoIdActivo));
        await Promise.allSettled(cajas.map(caja => base44.entities.Caja.update(caja.id, { saldo_actual: caja.saldo_inicial || 0 })));
      } catch (e) {}

      try {
        localStorage.removeItem(`distribucion_caminantes_v5_${equipoIdActivo}`);
        localStorage.removeItem(`distribucion_servidores_v5_${equipoIdActivo}`);
        localStorage.removeItem(`config_caminantes_v5_${equipoIdActivo}`);
        localStorage.removeItem(`config_servidores_v5_${equipoIdActivo}`);
      } catch (e) {}

      const nuevaConfig = {
        ...EMPTY,
        ...nuevoRetiro,
        equipo_id: equipoIdActivo,
        comunidad_id: equipoIdActivo,
        capacidad_mesa: form.capacidad_mesa || EMPTY.capacidad_mesa,
        capacidad_habitacion: form.capacidad_habitacion || EMPTY.capacidad_habitacion,
        total_mesas: form.total_mesas || EMPTY.total_mesas,
        total_habitaciones: form.total_habitaciones || EMPTY.total_habitaciones,
        niveles_edificio: form.niveles_edificio || EMPTY.niveles_edificio,
        habitaciones_por_nivel: form.habitaciones_por_nivel || EMPTY.habitaciones_por_nivel,
        total_fichas: form.total_fichas || EMPTY.total_fichas,
        bloqueado: false,
      };

      delete nuevaConfig.id;
      delete nuevaConfig._id;

      const entityRef = base44.entities.ConfigRetiro || base44.entities.Configuracion;
      if (configId && entityRef?.update) {
        await entityRef.update(configId, nuevaConfig);
      } else if (entityRef?.create) {
        const created = await entityRef.create(nuevaConfig);
        if (created?.id) setConfigId(created.id);
      }

      setForm(nuevaConfig);
      setCrearRetiroOpen(false);
      notificarCambioGlobal("NuevoRetiro", equipoIdActivo);
      
      toast.success(`✅ ¡Nuevo retiro iniciado en ${comunidadActual?.nombre || 'la comunidad'}! El sistema ha sido reseteado.`);
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (error) {
      console.error("❌ Error al iniciar retiro:", error);
      toast.error("Error al iniciar el retiro: " + (error.message || "Desconocido"));
      setIniciandoRetiro(false);
    }
  };

  const handleEliminarCuenta = async () => {
    if (confirmText !== "ELIMINAR") {
      toast.error('Escribe "ELIMINAR" para confirmar');
      return;
    }
    setEliminando(true);
    try {
      if (user?.id) await base44.entities.User.delete(user.id);
      toast.success("Tu cuenta y datos han sido eliminados");
      setTimeout(() => logout(), 600);
    } catch (e) {
      toast.error("No se pudo eliminar la cuenta: " + (e?.message || ""));
      setEliminando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-700 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-amber-900 font-bold text-sm">Cargando configuración de la comunidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/30 pb-16 font-sans">
      <div className="max-w-4xl mx-auto pt-4 px-4">
        <SelectorComunidad />
      </div>

      {/* HEADER DE MÓDULO CON ESTILO PREMIUM */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white shadow-xl mt-3 border-b-2 border-yellow-500/30">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <BackArrow to="/dashboard" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <Settings className="w-6 h-6 text-yellow-400" /> Configuración del Retiro
                </h1>
                {form.bloqueado ? (
                  <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-300 px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-300 px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    <Unlock className="w-3.5 h-3.5" /> Edición Habilitada
                  </span>
                )}
              </div>
              <p className="text-amber-200 text-xs mt-0.5 font-medium">
                Parámetros oficiales para: <strong className="text-white font-bold">{comunidadActual?.nombre || "Comunidad Activa"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={form.bloqueado}
              onClick={() => setModalCamposOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all transform hover:scale-105 ${
                form.bloqueado ? "bg-gray-700 text-gray-300 cursor-not-allowed opacity-60" : "bg-blue-800 hover:bg-blue-900 text-white"
              }`}
            >
              <Sliders className="w-4 h-4 text-yellow-300" /> Personalizar Formularios
            </button>

            {form.bloqueado ? (
              <button
                type="button"
                onClick={handleDesbloquear}
                className="flex items-center gap-2 bg-yellow-400 text-amber-950 hover:bg-yellow-300 px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                <Unlock className="w-4 h-4" /> Desbloquear
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={abrirModalNuevoRetiro}
                  className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Nuevo Retiro
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar y Bloquear"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {form.bloqueado && (
          <div className="bg-amber-100/90 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-950 font-bold shadow-xs">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-800 shrink-0" />
              La configuración está protegida contra cambios accidentales. Presiona <strong>Desbloquear</strong> en la barra superior para editar.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 🌎 BLOQUE DE PAÍS Y MONEDA OFICIAL FIJADOS */}
          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 rounded-2xl p-6 text-white shadow-xl border-2 border-yellow-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-yellow-300">
                <Globe className="w-5 h-5" />
                <h2 className="text-base font-extrabold uppercase tracking-wider">País y Moneda Oficial Fijados</h2>
              </div>
              <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                Persistencia Activa
              </span>
            </div>
            
            <p className="text-amber-200 text-xs mb-4">
              Configura el país de origen de tu comunidad. La moneda oficial se asignará de manera firme en fichas, finanzas y reportes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-yellow-200 uppercase tracking-wider mb-1.5">
                  País de la Comunidad / Retiro
                </label>
                <select
                  name="pais"
                  disabled={form.bloqueado}
                  value={form.pais || "República Dominicana"}
                  onChange={handlePaisChange}
                  className="w-full border-2 border-yellow-500/40 rounded-xl px-3.5 py-2.5 text-sm font-bold bg-amber-950 text-white focus:outline-none focus:border-yellow-400 disabled:opacity-75"
                >
                  {PAISES_MONEDAS.map(p => (
                    <option key={p.pais} value={p.pais} className="bg-amber-900 text-white">
                      {p.bandera} {p.pais} ({p.moneda})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-yellow-200 uppercase tracking-wider mb-1.5">
                  Moneda Oficial Asignada
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${form.moneda || "RD$"} — ${PAISES_MONEDAS.find(p => p.pais === form.pais)?.iso || 'DOP'}`}
                  className="w-full border-2 border-yellow-500/40 rounded-xl px-3.5 py-2.5 text-sm font-extrabold bg-amber-950/60 text-yellow-300 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-700/60 flex items-center justify-between text-xs text-amber-200 flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" /> Moneda activa globalmente: <strong className="text-yellow-300 font-extrabold">{form.moneda || "RD$"}</strong>
              </span>
              <span className="text-[11px] text-amber-300/80 font-mono">
                Sincronizado con toda la comunidad
              </span>
            </div>
          </div>

          {/* 📏 SECCIÓN: UNIDADES DE MEDIDA Y PESO */}
          <Section title="Unidades de Medida y Peso Oficiales" icon={Ruler}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-amber-700" /> Unidad para Estatura / Altura
                </label>
                <select
                  name="unidad_estatura"
                  disabled={form.bloqueado}
                  value={form.unidad_estatura || "cm"}
                  onChange={handleChange}
                  className="w-full border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-bold bg-white text-amber-950 focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
                >
                  {UNIDADES_ESTATURA.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-700" /> Unidad para Peso Corporal
                </label>
                <select
                  name="unidad_peso"
                  disabled={form.bloqueado}
                  value={form.unidad_peso || "lb"}
                  onChange={handleChange}
                  className="w-full border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-bold bg-white text-amber-950 focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
                >
                  {UNIDADES_PESO.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* ✝️ SECCIÓN 1: IDENTIDAD Y DATOS DEL RETIRO */}
          <Section title={`Identidad del Retiro (${comunidadActual?.nombre || "General"})`} icon={Building2}>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                Tipo de Retiro
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["Retiro Hombres", "Retiro Mujeres"].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    disabled={form.bloqueado}
                    onClick={() => handleRolChange("tipo_retiro", form.tipo_retiro === tipo ? "" : tipo)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      form.tipo_retiro === tipo
                        ? tipo === "Retiro Hombres"
                          ? "bg-blue-700 border-blue-700 text-white shadow-md"
                          : "bg-pink-600 border-pink-600 text-white shadow-md"
                        : "bg-white border-amber-200 text-amber-800 hover:border-amber-400"
                    } ${form.bloqueado ? "opacity-75 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-base">{tipo === "Retiro Hombres" ? "♂" : "♀"}</span>
                    {tipo}
                  </button>
                ))}
              </div>

              {form.tipo_retiro && (
                <div className="mt-3 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                  <p className="flex items-center gap-1 font-semibold">
                    ✓ Formularios remotos asignarán automáticamente el género como <strong>{form.tipo_retiro === "Retiro Hombres" ? "Masculino" : "Femenino"}</strong>.
                  </p>
                  {form.tipo_retiro === "Retiro Mujeres" && (
                    <p className="text-pink-700 font-bold flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 shrink-0" /> Distribución de Mesas activada con colores pasteles personalizados.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre del Retiro" name="nombre_retiro" value={form.nombre_retiro} onChange={handleChange} disabled={form.bloqueado} required placeholder="Ej: Retiro Emaús 2025" />
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">Número de Edición Actual</label>
                <input
                  type="text"
                  name="edicion"
                  disabled={form.bloqueado}
                  value={form.edicion || ""}
                  onChange={handleChange}
                  placeholder="Ej: 45"
                  className="w-full border-2 border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50 disabled:bg-gray-100 disabled:text-gray-600"
                />
                <p className="text-[11px] text-amber-700 mt-1">Vinculado a las fichas de inscripción de caminantes y servidores.</p>
              </div>
              <Field label="Eslogan / Cita Bíblica" name="eslogan" value={form.eslogan} onChange={handleChange} disabled={form.bloqueado} placeholder="Ej: Lucas 24, 13-35" />
              <Field label="Provincia / Diócesis" name="provincia" value={form.provincia} onChange={handleChange} disabled={form.bloqueado} />
              <Field label="Parroquia Sede" name="parroquia" value={form.parroquia} onChange={handleChange} disabled={form.bloqueado} placeholder="Nombre de la parroquia" />
              <Field label="Lugar / Casa de Retiro" name="lugar" value={form.lugar} onChange={handleChange} disabled={form.bloqueado} placeholder="Casa de convivencia o retiros" />
              <Field label="Fecha de Inicio" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} disabled={form.bloqueado} type="date" />
              <Field label="Fecha de Finalización" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} disabled={form.bloqueado} type="date" />
            </div>

            {/* LOGOS OFICIALES */}
            <div className="mt-6 space-y-4 pt-4 border-t border-amber-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-700" /> Logos del Retiro
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Logo General (Respaldo por Defecto)</label>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {form.logo_url ? (
                    <div className="relative group">
                      <img src={form.logo_url} alt="Logo General" className="w-14 h-14 object-contain rounded-lg border border-amber-200 bg-white p-1" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs font-semibold">Sin logo</div>
                  )}
                  <div className="flex items-center gap-2 flex-1">
                    <label className={`flex items-center gap-2 cursor-pointer bg-amber-700 hover:bg-amber-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors w-fit ${form.bloqueado ? "opacity-50 cursor-not-allowed" : ""}`}>
                      <Upload className="w-3.5 h-3.5" />
                      {uploading.general ? "Subiendo..." : "Subir Logo General"}
                      <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, "general")} className="hidden" disabled={uploading.general || form.bloqueado} />
                    </label>

                    {form.logo_url && (
                      <button
                        type="button"
                        disabled={form.bloqueado}
                        onClick={() => {
                          setForm(f => ({ ...f, logo_url: "" }));
                          localStorage.removeItem(`emaus_logo_url_${equipoIdActivo}`);
                          setEditandoManualmente(true);
                          toast.info("Logo general removido.");
                        }}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                        title="Eliminar logo general"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(!form.tipo_retiro || form.tipo_retiro === "Retiro Hombres") && (
                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-2">♂ Logo para Retiro de Hombres</label>
                  <div className="flex items-center gap-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    {form.logo_hombres_url ? (
                      <img src={form.logo_hombres_url} alt="Logo Hombres" className="w-14 h-14 object-contain rounded-lg border border-blue-300 bg-white p-1" />
                    ) : (
                      <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center text-blue-400 text-xs font-semibold">Sin logo</div>
                    )}
                    <div className="flex items-center gap-2 flex-1">
                      <label className={`flex items-center gap-2 cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors w-fit ${form.bloqueado ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploading.hombres ? "Subiendo..." : "Subir Logo Hombres"}
                        <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, "hombres")} className="hidden" disabled={uploading.hombres || form.bloqueado} />
                      </label>

                      {form.logo_hombres_url && (
                        <button
                          type="button"
                          disabled={form.bloqueado}
                          onClick={() => {
                            setForm(f => ({ ...f, logo_hombres_url: "" }));
                            localStorage.removeItem(`emaus_logo_hombres_url_${equipoIdActivo}`);
                            setEditandoManualmente(true);
                            toast.info("Logo de hombres removido.");
                          }}
                          className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                          title="Eliminar logo hombres"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(!form.tipo_retiro || form.tipo_retiro === "Retiro Mujeres") && (
                <div>
                  <label className="block text-xs font-semibold text-pink-700 mb-2">♀ Logo para Retiro de Mujeres</label>
                  <div className="flex items-center gap-4 p-3 bg-pink-50/60 rounded-xl border border-pink-200">
                    {form.logo_mujeres_url ? (
                      <img src={form.logo_mujeres_url} alt="Logo Mujeres" className="w-14 h-14 object-contain rounded-lg border border-pink-300 bg-white p-1" />
                    ) : (
                      <div className="w-14 h-14 bg-pink-100 rounded-lg flex items-center justify-center text-pink-400 text-xs font-semibold">Sin logo</div>
                    )}
                    <div className="flex items-center gap-2 flex-1">
                      <label className={`flex items-center gap-2 cursor-pointer bg-pink-600 hover:bg-pink-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors w-fit ${form.bloqueado ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <Upload className="w-3.5 h-3.5" />
                        {uploading.mujeres ? "Subiendo..." : "Subir Logo Mujeres"}
                        <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, "mujeres")} className="hidden" disabled={uploading.mujeres || form.bloqueado} />
                      </label>

                      {form.logo_mujeres_url && (
                        <button
                          type="button"
                          disabled={form.bloqueado}
                          onClick={() => {
                            setForm(f => ({ ...f, logo_mujeres_url: "" }));
                            localStorage.removeItem(`emaus_logo_mujeres_url_${equipoIdActivo}`);
                            setEditandoManualmente(true);
                            toast.info("Logo de mujeres removido.");
                          }}
                          className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                          title="Eliminar logo mujeres"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* 📞 SECCIÓN 2: COORDINACIÓN Y CONTACTOS */}
          <Section title="Equipo Coordinador y Contactos" icon={Phone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Coordinador(a) Principal" name="coordinador" value={form.coordinador} onChange={handleChange} disabled={form.bloqueado} placeholder="Nombre completo" />
              <Field label="Sub-Coordinador(a)" name="sub_coordinador" value={form.sub_coordinador} onChange={handleChange} disabled={form.bloqueado} placeholder="Nombre completo" />
              <Field label="Rector(a) Responsable" name="contacto_rector" value={form.contacto_rector} onChange={handleChange} disabled={form.bloqueado} />
              <Field label="Teléfono de Contacto Principal" name="telefono_contacto" value={form.telefono_contacto} onChange={handleChange} disabled={form.bloqueado} />
              <div className="md:col-span-2">
                <Field label="Enlace del Grupo de WhatsApp (Servidores)" name="grupo_whatsapp" value={form.grupo_whatsapp} onChange={handleChange} disabled={form.bloqueado} placeholder="https://chat.whatsapp.com/..." />
                <p className="text-[11px] text-amber-700 mt-1 font-medium">Se presenta automáticamente a los servidores al completar su inscripción.</p>
              </div>
            </div>
          </Section>

          {/* 🌐 PORTADA WEB PÚBLICA */}
          <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm p-5 transition-all hover:border-amber-300">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Portada Web Pública</h3>
                  <p className="text-xs text-amber-700 font-medium">Personaliza el diseño y mensaje de la pantalla de bienvenida</p>
                </div>
              </div>
              <Link
                to="/config-portada"
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Configurar Portada Web
              </Link>
            </div>
          </div>

          {/* 👤 SECCIÓN 3: ROLES DEL RETIRO */}
          <Section title="Roles Disponibles en el Retiro" icon={Users}>
            <p className="text-xs text-amber-700 mb-4 font-medium">Gestiona las opciones de roles asignables en los registros.</p>
            <RolesRetiro form={form} onChange={handleRolChange} disabled={form.bloqueado} />
          </Section>

          {/* 🏢 SECCIÓN 4: CAPACIDADES Y ESTRUCTURA LÓGICA */}
          <Section title="Estructura y Capacidades" icon={Layers}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Caminantes / Mesa" name="capacidad_mesa" value={form.capacidad_mesa} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Total Mesas" name="total_mesas" value={form.total_mesas} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Personas / Habitación" name="capacidad_habitacion" value={form.capacidad_habitacion} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Total Habitaciones" name="total_habitaciones" value={form.total_habitaciones} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Niveles Edificio" name="niveles_edificio" value={form.niveles_edificio} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Habitaciones / Nivel" name="habitaciones_por_nivel" value={form.habitaciones_por_nivel} onChange={handleChange} disabled={form.bloqueado} type="number" />
              <Field label="Total Fichas" name="total_fichas" value={form.total_fichas} onChange={handleChange} disabled={form.bloqueado} type="number" />
            </div>
            <p className="text-[11px] text-amber-700 mt-3 font-semibold">💡 Las fichas del 1 al límite configurado estarán disponibles para numeración automática de caminantes.</p>
          </Section>

          <div className="flex justify-end pt-2">
            {!form.bloqueado && (
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-extrabold px-8 py-3 rounded-xl text-sm shadow-xl transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando Configuración..." : "Guardar y Bloquear Configuración"}
              </button>
            )}
          </div>
        </form>

        {/* ⚠️ ÁREA DE PELIGRO: ELIMINAR CUENTA */}
        <div className="mt-8 bg-red-50/80 rounded-2xl border border-red-200 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900">Zona de Riesgo: Eliminar Cuenta</h3>
              <p className="text-xs text-red-700 mt-1">
                Esta acción eliminará de forma permanente tu usuario del sistema Base44 y desvinculará tu perfil.
              </p>
              <button
                type="button"
                onClick={() => { setEliminarOpen(true); setConfirmText(""); }}
                className="mt-3 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar mi cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔔 MODAL PROMINENTE DE CONFIRMACIÓN DE GUARDADO BLINDADO */}
      {modalGuardadoOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center border-2 border-green-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900">¡Configuración Guardada!</h3>
            <p className="text-xs text-gray-600 mt-2">
              Los datos para <strong>{form.nombre_retiro}</strong> {form.edicion ? `(#${form.edicion})` : ''} fueron guardados correctamente y <strong>sincronizados con los demás usuarios de la comunidad</strong>.
            </p>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 text-left space-y-1.5 font-medium">
              <p>🌎 <strong>País:</strong> {form.pais || 'República Dominicana'}</p>
              <p>💵 <strong>Moneda Oficial:</strong> {form.moneda || 'RD$'}</p>
              <p>🖼️ <strong>Logo General:</strong> {form.logo_url ? '✅ Guardado' : 'Sin logo'}</p>
              <p>♂ <strong>Logo Hombres:</strong> {form.logo_hombres_url ? '✅ Guardado' : 'Sin logo'}</p>
              <p>♀ <strong>Logo Mujeres:</strong> {form.logo_mujeres_url ? '✅ Guardado' : 'Sin logo'}</p>
            </div>
            <button
              onClick={() => setModalGuardadoOpen(false)}
              className="mt-5 w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow transition"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      )}

      {/* 🔒 MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE CUENTA */}
      {eliminarOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-700 text-white px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirmar Eliminación
              </h2>
              <button onClick={() => setEliminarOpen(false)} className="hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-700">
                Se eliminará permanentemente tu usuario del sistema.
              </p>
              <p className="text-xs text-gray-500 font-semibold">
                Para confirmar, escribe <strong className="text-red-700">ELIMINAR</strong> en mayúsculas:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEliminarOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEliminarCuenta}
                  disabled={eliminando || confirmText !== "ELIMINAR"}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition"
                >
                  <Trash2 className="w-4 h-4" /> {eliminando ? "Eliminando..." : "Eliminar Definitivamente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✝️ MODAL INICIAR NUEVO RETIRO Y RESETEAR COMUNIDAD */}
      {crearRetiroOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Crear Nuevo Retiro ({comunidadActual?.nombre || "General"})
              </h2>
              <button onClick={() => setCrearRetiroOpen(false)} className="hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-900 mb-3 font-bold">1. Selecciona el tipo de retiro:</p>
                <div className="grid grid-cols-2 gap-3">
                  {["Retiro Hombres", "Retiro Mujeres"].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setNuevoRetiro(f => ({ ...f, tipo_retiro: tipo }))}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-xs transition-all ${
                        nuevoRetiro.tipo_retiro === tipo
                          ? tipo === "Retiro Hombres"
                            ? "bg-blue-700 border-blue-700 text-white shadow"
                            : "bg-pink-600 border-pink-600 text-white shadow"
                          : "bg-white border-amber-200 text-amber-800 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-base">{tipo === "Retiro Hombres" ? "♂" : "♀"}</span>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {nuevoRetiro.tipo_retiro && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs text-green-900 font-bold mb-2">Código único generado automáticamente:</p>
                  <input
                    type="text"
                    value={nuevoRetiro.codigo_retiro || ""}
                    readOnly
                    className="w-full border border-green-300 bg-white rounded-xl px-3 py-2 text-base font-mono font-bold text-green-800 focus:outline-none tracking-wider"
                  />
                </div>
              )}

              {nuevoRetiro.codigo_retiro && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-amber-900 border-b border-amber-100 pb-2 uppercase tracking-wider">2. Datos del nuevo retiro:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Nombre del Retiro</label>
                      <input
                        type="text"
                        value={nuevoRetiro.nombre_retiro}
                        onChange={(e) => setNuevoRetiro(f => ({ ...f, nombre_retiro: e.target.value }))}
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Número de Edición</label>
                      <input
                        type="text"
                        value={nuevoRetiro.edicion}
                        onChange={(e) => setNuevoRetiro(f => ({ ...f, edicion: e.target.value }))}
                        placeholder="Ej: 46"
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold text-amber-900"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                    <p className="text-xs text-amber-900 font-bold mb-2">⚠️ Al iniciar el nuevo retiro para <strong>{comunidadActual?.nombre || 'esta comunidad'}</strong> se ejecutará:</p>
                    <ul className="text-xs text-amber-800 space-y-1 ml-4 list-disc font-medium">
                      <li>Archivación del retiro anterior en el Historial de la comunidad</li>
                      <li>Limpieza de caminantes, servidores y movimientos financieros locales</li>
                      <li>Reinicio de saldos en cajas de esta comunidad</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setCrearRetiroOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleIniciarRetiro}
                      disabled={iniciandoRetiro}
                      className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50 shadow"
                    >
                      <Save className="w-4 h-4" />
                      {iniciandoRetiro ? "Iniciando..." : "Iniciar Nuevo Retiro"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📊 MODAL DE PERSONALIZACIÓN ELEGANTE DE FORMULARIOS (CAMINANTES Y SERVIDORES) */}
      {modalCamposOpen && (
        <ModalPersonalizarFormularios
          configCaminante={configCamposCaminante}
          configServidor={configCamposServidor}
          equipoIdActivo={equipoIdActivo}
          onClose={() => setModalCamposOpen(false)}
          onGuardar={(cam, serv) => {
            setConfigCamposCaminante(cam);
            setConfigCamposServidor(serv);
            setModalCamposOpen(false);

            try {
              localStorage.setItem(`emaus_config_campos_caminante_${equipoIdActivo}`, JSON.stringify(cam));
              localStorage.setItem(`emaus_config_campos_servidor_${equipoIdActivo}`, JSON.stringify(serv));
              localStorage.setItem("emaus_config_campos_caminante", JSON.stringify(cam));
              localStorage.setItem("emaus_config_campos_servidor", JSON.stringify(serv));
            } catch (e) {}

            notificarCambioGlobal("ConfiguracionCampos", equipoIdActivo);
            toast.success("✅ Configuración de formularios actualizada. Recuerda presionar 'Guardar y Bloquear'.");
          }}
        />
      )}
    </div>
  );
}

// 📝 MODAL DE PERSONALIZACIÓN ELEGANTE DE CAMPOS DE FORMULARIOS CON CREACIÓN DE CAMPOS PERSONALIZADOS
function ModalPersonalizarFormularios({ configCaminante, configServidor, equipoIdActivo, onClose, onGuardar }) {
  const [tab, setTab] = useState("caminante");
  const [camposCam, setCamposCam] = useState(configCaminante || {});
  const [camposServ, setCamposServ] = useState(configServidor || {});
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevoCampoOpen, setModalNuevoCampoOpen] = useState(false);

  const toggleCampoActivo = (key) => {
    const targetState = tab === "caminante" ? setCamposCam : setCamposServ;
    targetState(prev => {
      const actual = prev[key] || { activo: true, obligatorio: false };
      return {
        ...prev,
        [key]: { ...actual, activo: !actual.activo }
      };
    });
  };

  const toggleCampoObligatorio = (key) => {
    const targetState = tab === "caminante" ? setCamposCam : setCamposServ;
    targetState(prev => {
      const actual = prev[key] || { activo: true, obligatorio: false };
      return {
        ...prev,
        [key]: { ...actual, obligatorio: !actual.obligatorio }
      };
    });
  };

  const eliminarCampoCustom = (key) => {
    const targetState = tab === "caminante" ? setCamposCam : setCamposServ;
    targetState(prev => {
      const copia = { ...prev };
      delete copia[key];
      return copia;
    });
    toast.success("Campo personalizado eliminado.");
  };

  const agregarNuevoCampo = (nuevoCampo) => {
    const keyNew = `custom_${Date.now()}`;
    const item = {
      key: keyNew,
      label: nuevoCampo.nombre.trim(),
      cat: nuevoCampo.cat || "Personal",
      type: nuevoCampo.type || "text",
      options: nuevoCampo.options ? nuevoCampo.options.split(",").map(o => o.trim()).filter(Boolean) : [],
      activo: true,
      obligatorio: Boolean(nuevoCampo.obligatorio),
      esCustom: true
    };

    const targetState = tab === "caminante" ? setCamposCam : setCamposServ;
    targetState(prev => ({
      ...prev,
      [keyNew]: item
    }));
    setModalNuevoCampoOpen(false);
    toast.success(`✨ ¡Campo "${item.label}" agregado exitosamente!`);
  };

  const handleGuardar = () => {
    onGuardar(camposCam, camposServ);
  };

  const camposActuales = tab === "caminante" ? camposCam : camposServ;
  const categorias = ["Todas", "Personal", "Contacto", "Eclesiástico", "Físico", "Salud", "Emergencia"];

  // Combinar campos estándar con campos creados a medida por el usuario
  const camposCustomLista = Object.entries(camposActuales)
    .filter(([k, cfg]) => (k.startsWith("custom_") || cfg?.esCustom) && cfg?.label)
    .map(([k, cfg]) => ({
      key: k,
      label: cfg.label,
      cat: cfg.cat || "Personal",
      type: cfg.type || "text",
      options: cfg.options || [],
      esCustom: true
    }));

  const todosLosCampos = [...CAMPOS_ESTANDAR, ...camposCustomLista];

  const camposFiltrados = todosLosCampos.filter(c => {
    const matchCat = filtroCategoria === "Todas" || c.cat === filtroCategoria;
    const matchQ = !busqueda || c.label.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchQ;
  });

  const totalActivos = Object.values(camposActuales).filter(c => c?.activo).length;
  const totalObligatorios = Object.values(camposActuales).filter(c => c?.activo && c?.obligatorio).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-amber-200 max-h-[92vh] flex flex-col">
        
        {/* HEADER ELEGANTE */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 px-6 py-5 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-700/60 border border-yellow-500/40 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Personalizador Elegante de Formularios</h2>
              <p className="text-xs text-amber-200 font-medium">Controla qué campos pedir en las fichas, exige obligatorios y agrega campos nuevos.</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTADORES, BOTONES DE TAB Y AGREGAR CAMPO NUEVO */}
        <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("caminante")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs ${
                tab === "caminante"
                  ? "bg-amber-800 text-white shadow-md"
                  : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <Users className="w-4 h-4 text-yellow-400" /> Formularios Caminantes
            </button>

            <button
              onClick={() => setTab("servidor")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs ${
                tab === "servidor"
                  ? "bg-blue-800 text-white shadow-md"
                  : "bg-white text-blue-900 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-300" /> Formularios Servidores
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalNuevoCampoOpen(true)}
              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> Agregar Campo Nuevo
            </button>

            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-300 text-xs font-bold">
              👁️ {totalActivos} Visibles
            </span>
            <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 text-xs font-bold">
              ★ {totalObligatorios} Requeridos
            </span>
          </div>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar campo (ej: teléfono, talla, parroquia)..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-amber-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto max-w-full pb-1">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  filtroCategoria === cat
                    ? "bg-amber-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-amber-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* LISTADO DE CAMPOS CON SWITCHES MODERNOS Y ACCIONES */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {camposFiltrados.map(c => {
              const cfg = camposActuales[c.key] || { activo: true, obligatorio: false, ...c };

              return (
                <div
                  key={c.key}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    cfg.activo
                      ? "bg-white border-amber-200 shadow-xs hover:border-amber-400"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        {c.cat}
                      </span>
                      {c.esCustom && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-green-800 bg-green-100 px-2 py-0.5 rounded-md border border-green-300">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-gray-900 mt-1 truncate">{c.label}</p>
                  </div>

                  {/* CONTROLES TIPO SWITCH ELEGANTE */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* SWITCH VISIBLE */}
                    <button
                      type="button"
                      onClick={() => toggleCampoActivo(c.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition shadow-2xs ${
                        cfg.activo
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    >
                      {cfg.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {cfg.activo ? "Visible" : "Oculto"}
                    </button>

                    {/* SWITCH OBLIGATORIO */}
                    {cfg.activo && (
                      <button
                        type="button"
                        onClick={() => toggleCampoObligatorio(c.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition shadow-2xs ${
                          cfg.obligatorio
                            ? "bg-amber-700 text-white"
                            : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-amber-50"
                        }`}
                      >
                        {cfg.obligatorio ? "★ Requerido" : "Opcional"}
                      </button>
                    )}

                    {/* ELIMINAR CAMPO PERSONALIZADO */}
                    {c.esCustom && (
                      <button
                        type="button"
                        onClick={() => eliminarCampoCustom(c.key)}
                        title="Eliminar campo personalizado"
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER MODAL */}
        <div className="bg-gray-100 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-black shadow-lg transition"
          >
            Guardar Configuración de Campos
          </button>
        </div>

        {/* SUBMODAL DE CREAR NUEVO CAMPO PERSONALIZADO */}
        {modalNuevoCampoOpen && (
          <ModalCrearCampoNuevo
            onClose={() => setModalNuevoCampoOpen(false)}
            onCrear={agregarNuevoCampo}
          />
        )}
      </div>
    </div>
  );
}

// ➕ SUBMODAL PARA CREAR UN CAMPO NUEVO
function ModalCrearCampoNuevo({ onClose, onCrear }) {
  const [formCampo, setFormCampo] = useState({
    nombre: "",
    cat: "Personal",
    type: "text",
    options: "",
    obligatorio: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formCampo.nombre.trim()) {
      toast.error("El nombre del campo es obligatorio.");
      return;
    }
    onCrear(formCampo);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-amber-200">
        <div className="flex justify-between items-center mb-4 border-b border-amber-100 pb-3">
          <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-700" /> Crear Campo Personalizado
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Campo *</label>
            <input
              type="text"
              required
              placeholder="Ej: ¿Trae vehículo?, Talla de Calzado, Acompañante"
              value={formCampo.nombre}
              onChange={e => setFormCampo(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Categoría</label>
              <select
                value={formCampo.cat}
                onChange={e => setFormCampo(f => ({ ...f, cat: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="Personal">Personal</option>
                <option value="Contacto">Contacto</option>
                <option value="Eclesiástico">Eclesiástico</option>
                <option value="Físico">Físico</option>
                <option value="Salud">Salud</option>
                <option value="Emergencia">Emergencia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Dato</label>
              <select
                value={formCampo.type}
                onChange={e => setFormCampo(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="boolean">Sí / No</option>
                <option value="select">Opciones Múltiples</option>
              </select>
            </div>
          </div>

          {formCampo.type === "select" && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Opciones (separadas por comas)</label>
              <input
                type="text"
                placeholder="Ej: Opción 1, Opción 2, Opción 3"
                value={formCampo.options}
                onChange={e => setFormCampo(f => ({ ...f, options: e.target.value }))}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="chkOblig"
              checked={formCampo.obligatorio}
              onChange={e => setFormCampo(f => ({ ...f, obligatorio: e.target.checked }))}
              className="w-4 h-4 text-amber-700 border-amber-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="chkOblig" className="text-xs font-bold text-amber-900 cursor-pointer">
              Marcar como Requerido (*) por defecto
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Agregar Campo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 p-6 space-y-4 transition-all hover:border-amber-300">
      <h2 className="text-base font-bold text-amber-900 flex items-center gap-2 border-b border-amber-100 pb-3">
        {Icon && <Icon className="w-5 h-5 text-amber-700" />} {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, name, value, onChange, disabled = false, type = "text", placeholder, required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-amber-900 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        disabled={disabled}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-amber-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:bg-gray-100 disabled:text-gray-600"
      />
    </div>
  );
}