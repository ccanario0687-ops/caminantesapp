import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertCircle, User, Loader2 } from "lucide-react";
import { formatCedula, toTitleCase } from "@/utils/formatters";
import MobileSelect from "@/components/MobileSelect";

const PARROQUIAS_DATA = [
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Catedral Primada de América (Santa María de la Encarnación)", tipo: "Catedral", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla de la Tercera Orden Dominica", tipo: "Capilla", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla de los Remedios", tipo: "Capilla", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla San Andrés", tipo: "Capilla", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla Santísima Trinidad", tipo: "Capilla", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Gazcue, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia Nuestra Señora de las Mercedes", tipo: "Parroquia", municipio: "Ciudad Colonial, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San Carlos Borromeo", tipo: "Parroquia", municipio: "San Carlos, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San Juan Bosco", tipo: "Parroquia", municipio: "Don Bosco, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia Santísima Trinidad", tipo: "Parroquia", municipio: "Ensanche La Fe / Piantini", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San Antonio de Padua", tipo: "Parroquia", municipio: "Gazcue, Distrito Nacional", provincia: "Distrito Nacional" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia Santa Cruz de Villa Mella", tipo: "Parroquia", municipio: "Villa Mella, Santo Domingo Norte", provincia: "Santo Domingo" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla San José", tipo: "Capilla", municipio: "Sabana Perdida, Santo Domingo Norte", provincia: "Santo Domingo" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San Vicente de Paúl", tipo: "Parroquia", municipio: "Los Mina, Santo Domingo Este", provincia: "Santo Domingo" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San José Obrero", tipo: "Parroquia", municipio: "Ensanche Ozama, Santo Domingo Este", provincia: "Santo Domingo" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Capilla Nuestra Señora de la Altagracia", tipo: "Capilla", municipio: "Boca Chica", provincia: "Santo Domingo" },
  { diocesis: "Archidiócesis de Santo Domingo", parroquia: "Parroquia San José de Yamasá", tipo: "Parroquia", municipio: "Yamasá", provincia: "Monte Plata" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Catedral Santiago Apóstol", tipo: "Catedral", municipio: "Centro Histórico, Santiago", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Capilla San José", tipo: "Capilla", municipio: "Gurabo, Santiago", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Licey al Medio", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Centro Histórico, Santiago", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Parroquia San José", tipo: "Parroquia", municipio: "Baracoa, Santiago", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Parroquia Santísima Cruz", tipo: "Parroquia", municipio: "San José de Las Matas", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Janico", provincia: "Santiago" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Parroquia Sagrado Corazón de Jesús", tipo: "Parroquia", municipio: "Moca", provincia: "Espaillat" },
  { diocesis: "Archidiócesis de Santiago de los Caballeros", parroquia: "Parroquia San Juan Evangelista", tipo: "Parroquia", municipio: "Salcedo / Moca", provincia: "Espaillat" },
  { diocesis: "Diócesis de La Vega", parroquia: "Catedral Inmaculada Concepción", tipo: "Catedral", municipio: "La Vega", provincia: "La Vega" },
  { diocesis: "Diócesis de La Vega", parroquia: "Santuario / Capilla Santo Cerro (Nuestra Señora de las Mercedes)", tipo: "Santuario / Capilla", municipio: "Santo Cerro", provincia: "La Vega" },
  { diocesis: "Diócesis de La Vega", parroquia: "Parroquia Santísimo Sacramento", tipo: "Parroquia", municipio: "Jarabacoa", provincia: "La Vega" },
  { diocesis: "Diócesis de La Vega", parroquia: "Capilla San José", tipo: "Capilla", municipio: "Manabao, Jarabacoa", provincia: "La Vega" },
  { diocesis: "Diócesis de La Vega", parroquia: "Parroquia Nuestra Señora del Carmen", tipo: "Parroquia", municipio: "Jarabacoa", provincia: "La Vega" },
  { diocesis: "Diócesis de La Vega", parroquia: "Parroquia San Mateo", tipo: "Parroquia", municipio: "Bonao", provincia: "Monseñor Nouel" },
  { diocesis: "Diócesis de La Vega", parroquia: "Parroquia Inmaculada Concepción", tipo: "Parroquia", municipio: "Cotuí", provincia: "Sánchez Ramírez" },
  { diocesis: "Diócesis de La Vega", parroquia: "Parroquia Sagrados Corazones", tipo: "Parroquia", municipio: "Fantino", provincia: "Sánchez Ramírez" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Catedral Santa Ana", tipo: "Catedral", municipio: "San Francisco de Macorís", provincia: "Duarte" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Capilla San Juan Bautista", tipo: "Capilla", municipio: "San Francisco de Macorís", provincia: "Duarte" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia San Francisco de Asís", tipo: "Parroquia", municipio: "San Francisco de Macorís", provincia: "Duarte" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia San Isidro Labrador", tipo: "Parroquia", municipio: "Castillo", provincia: "Duarte" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia Santísima Trinidad", tipo: "Parroquia", municipio: "Nagua", provincia: "María Trinidad Sánchez" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia Santa Cruz", tipo: "Parroquia", municipio: "Cabrera", provincia: "María Trinidad Sánchez" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia Santa Bárbara", tipo: "Parroquia", municipio: "Santa Bárbara de Samaná", provincia: "Samaná" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Parroquia Nuestra Señora del Carmen", tipo: "Parroquia", municipio: "Las Terrenas", provincia: "Samaná" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "El Limón", provincia: "Samaná" },
  { diocesis: "Diócesis de San Francisco de Macorís", parroquia: "Capilla San José", tipo: "Capilla", municipio: "Sánchez", provincia: "Samaná" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Basílica Catedral Nuestra Señora de la Altagracia", tipo: "Catedral", municipio: "Salvaleón de Higüey", provincia: "La Altagracia" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Parroquia San Dionisio", tipo: "Parroquia", municipio: "Salvaleón de Higüey", provincia: "La Altagracia" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Capilla San Juan Bautista", tipo: "Capilla", municipio: "Punta Cana / Bávaro", provincia: "La Altagracia" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Capilla Nuestra Señora del Pilar", tipo: "Capilla", municipio: "Verón", provincia: "La Altagracia" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Parroquia Santa Rosa de Lima", tipo: "Parroquia", municipio: "La Romana", provincia: "La Romana" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Capilla San Antonio de Padua", tipo: "Capilla", municipio: "Altos de Chavón, La Romana", provincia: "La Romana" },
  { diocesis: "Diócesis de La Altagracia (Higüey)", parroquia: "Parroquia Santa Cruz", tipo: "Parroquia", municipio: "Santa Cruz de El Seibo", provincia: "El Seibo" },
  { diocesis: "Diócesis de San Pedro de Macorís", parroquia: "Catedral San Pedro Apóstol", tipo: "Catedral", municipio: "San Pedro de Macorís", provincia: "San Pedro de Macorís" },
  { diocesis: "Diócesis de San Pedro de Macorís", parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Consuelo", provincia: "San Pedro de Macorís" },
  { diocesis: "Diócesis de San Pedro de Macorís", parroquia: "Parroquia San José de Los Llanos", tipo: "Parroquia", municipio: "San José de Los Llanos", provincia: "San Pedro de Macorís" },
  { diocesis: "Diócesis de San Pedro de Macorís", parroquia: "Parroquia Sagrado Corazón de Jesús", tipo: "Parroquia", municipio: "Hato Mayor del Rey", provincia: "Hato Mayor" },
  { diocesis: "Diócesis de San Pedro de Macorís", parroquia: "Capilla Santísima Cruz", tipo: "Capilla", municipio: "Sabana de la mar", provincia: "Hato Mayor" },
  { diocesis: "Diócesis de Baní", parroquia: "Catedral Nuestra Señora de la Regla", tipo: "Catedral", municipio: "Baní", provincia: "Peravia" },
  { diocesis: "Diócesis de Baní", parroquia: "Capilla San Lorenzo", tipo: "Capilla", municipio: "Matanzas", provincia: "Peravia" },
  { diocesis: "Diócesis de Baní", parroquia: "Parroquia Nuestra Señora de la Consolación", tipo: "Parroquia", municipio: "San Cristóbal", provincia: "San Cristóbal" },
  { diocesis: "Diócesis de Baní", parroquia: "Capilla San Rafael", tipo: "Capilla", municipio: "Haina", provincia: "San Cristóbal" },
  { diocesis: "Diócesis de Baní", parroquia: "Parroquia San José", tipo: "Parroquia", municipio: "San José de Ocoa", provincia: "San José de Ocoa" },
  { diocesis: "Diócesis de Barahona", parroquia: "Catedral Santa Cruz", tipo: "Catedral", municipio: "Barahona", provincia: "Barahona" },
  { diocesis: "Diócesis de Barahona", parroquia: "Parroquia Cristo Rey", tipo: "Parroquia", municipio: "Barahona", provincia: "Barahona" },
  { diocesis: "Diócesis de Barahona", parroquia: "Capilla San Pedro", tipo: "Capilla", municipio: "Cabral", provincia: "Barahona" },
  { diocesis: "Diócesis de Barahona", parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Pedernales", provincia: "Pedernales" },
  { diocesis: "Diócesis de Barahona", parroquia: "Parroquia San José Obrero", tipo: "Parroquia", municipio: "Villa Jaragua", provincia: "Bahoruco" },
  { diocesis: "Diócesis de Barahona", parroquia: "Parroquia San Bartolomé", tipo: "Parroquia", municipio: "Neiba", provincia: "Bahoruco" },
  { diocesis: "Diócesis de San Juan de la Maguana", parroquia: "Catedral San Juan Bautista", tipo: "Catedral", municipio: "San Juan de la Maguana", provincia: "San Juan" },
  { diocesis: "Diócesis de San Juan de la Maguana", parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "Las Matas de Farfán", provincia: "San Juan" },
  { diocesis: "Diócesis de San Juan de la Maguana", parroquia: "Parroquia Nuestra Señora de los Remedios", tipo: "Parroquia", municipio: "Azua de Compostela", provincia: "Azua" },
  { diocesis: "Diócesis de San Juan de la Maguana", parroquia: "Parroquia Santa Teresa de Jesús", tipo: "Parroquia", municipio: "Comendador", provincia: "Elías Piña" },
  { diocesis: "Diócesis de Mao-Monte Cristi", parroquia: "Catedral Santa Cruz", tipo: "Catedral", municipio: "Mao", provincia: "Valverde" },
  { diocesis: "Diócesis de Mao-Monte Cristi", parroquia: "Capilla San José", tipo: "Capilla", municipio: "Esperanza", provincia: "Valverde" },
  { diocesis: "Diócesis de Mao-Monte Cristi", parroquia: "Parroquia San Fernando", tipo: "Parroquia", municipio: "Monte Cristi", provincia: "Monte Cristi" },
  { diocesis: "Diócesis de Mao-Monte Cristi", parroquia: "Parroquia Nuestra Señora del Rosario", tipo: "Parroquia", municipio: "Dajabón", provincia: "Dajabón" },
  { diocesis: "Diócesis de Mao-Monte Cristi", parroquia: "Parroquia San Ignacio de Loyola", tipo: "Parroquia", municipio: "Sabaneta", provincia: "Santiago Rodríguez" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Catedral San Felipe Apóstol", tipo: "Catedral", municipio: "San Felipe de Puerto Plata", provincia: "Puerto Plata" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Capilla San Antonio", tipo: "Capilla", municipio: "Sosúa", provincia: "Puerto Plata" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Capilla San Miguel", tipo: "Capilla", municipio: "Cabarete", provincia: "Puerto Plata" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Parroquia San José Esposo de la Virgen", tipo: "Parroquia", municipio: "Sabaneta de Yásica", provincia: "Puerto Plata" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Parroquia San Isidro Labrador", tipo: "Parroquia", municipio: "Luperón", provincia: "Puerto Plata" },
  { diocesis: "Diócesis de Puerto Plata", parroquia: "Parroquia Nuestra Señora de la Altagracia", tipo: "Parroquia", municipio: "Guananico", provincia: "Puerto Plata" },
];

const DIOCESIS_LIST = [...new Set(PARROQUIAS_DATA.map(p => p.diocesis))].sort();

const EMPTY = {
  nombre: "", edad: "", genero: "", email: "", telefono: "",
  diocesis: "", parroquia: "", padrino_madrina: "", telefono_padrino: "", direccion: "",
  calle: "", sector: "", municipio: "", provincia: "", ocupacion: "",
  fecha_nacimiento: "", peso_kg: "", talla_cm: "", talla_camisa: "", tipo_sangre: "",
  necesidades_medicas: "", condicion_fisica: "Ninguna", estado_civil: "",
  rol_en_mesa: "Caminante", cedula: "", apodo: "", sacramento: "",
  contacto_emergencia: "", relacion_emergencia: "", telefono_emergencia: "",
};

const inp = "w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
const lbl = "block text-sm font-semibold text-amber-800 mb-1";

export default function InscripcionCaminante() {
  const { comunidadId, slug } = useParams();
  const [searchParams] = useSearchParams();
  const retiroId = comunidadId || slug || searchParams.get("retiro_id") || searchParams.get("comunidad_id") || searchParams.get("t");

  const [form, setForm] = useState(EMPTY);
  const [config, setConfig] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [nombreEnviado, setNombreEnviado] = useState("");
  const [parroquiasFiltradas, setParroquiasFiltradas] = useState([]);

  // 🎯 CARGAR CONFIGURACIÓN VÍA FUNCIÓN PÚBLICA DE BASE44 Y FALLBACKS
  useEffect(() => {
    let cancel = false;

    try {
      const keyLocal = retiroId ? `emaus_config_retiro_${retiroId}` : "emaus_config_retiro";
      const raw = localStorage.getItem(keyLocal) || localStorage.getItem("emaus_config_retiro");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) setConfig(parsed);
      }
    } catch (e) {}

    base44.functions.invoke("inscripcionPublica", { getConfig: true, retiro_id: retiroId })
      .then(res => {
        if (!cancel && res?.data?.config) {
          setConfig(prev => ({ ...prev, ...res.data.config }));
        }
      })
      .catch((e) => console.warn("⚠️ Error cargando config pública:", e));

    if (base44.entities.ConfigRetiro?.list) {
      base44.entities.ConfigRetiro.list()
        .then(list => {
          if (cancel || !list || !list.length) return;
          const match = (list || []).find(c => 
            String(c.equipo_id) === String(retiroId) || 
            String(c.comunidad_id) === String(retiroId) ||
            String(c.id) === String(retiroId)
          ) || list[0];
          if (match) setConfig(prev => ({ ...prev, ...match }));
        })
        .catch(() => null);
    }

    return () => { cancel = true; };
  }, [retiroId]);

  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const eslogan = config?.eslogan || "Lucas 24, 13-35";
  const generoFijo = config?.tipo_retiro === "Retiro Hombres" ? "Masculino"
    : config?.tipo_retiro === "Retiro Mujeres" ? "Femenino" : null;

  // 📋 PARSEO DINÁMICO DE CAMPOS PERSONALIZADOS DESDE CONFIGURACIÓN
  const configCamposMap = useMemo(() => {
    let raw = config?.config_campos_caminante;
    if (!raw && typeof window !== "undefined") {
      raw = localStorage.getItem(`emaus_config_campos_caminante_${retiroId}`) || localStorage.getItem("emaus_config_campos_caminante");
    }
    if (!raw) return null;
    try {
      return typeof raw === "string"
        ? JSON.parse(raw)
        : raw;
    } catch {
      return null;
    }
  }, [config, retiroId]);

  const isCampoVisible = useCallback((key, def = true) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo);
  }, [configCamposMap]);

  const isCampoObligatorio = useCallback((key, def = false) => {
    if (!configCamposMap || !configCamposMap[key]) return def;
    return Boolean(configCamposMap[key].activo && configCamposMap[key].obligatorio);
  }, [configCamposMap]);

  const imc = form.peso_kg && form.talla_cm
    ? (Number(form.peso_kg) / Math.pow(Number(form.talla_cm) / 100, 2)).toFixed(1) : null;

  const set = (k, v) => {
    let val = v;
    if (k === "cedula") val = formatCedula(v);
    if (k === "nombre") val = toTitleCase(v);
    setForm(f => ({ ...f, [k]: val }));
    setErrores(e => ({ ...e, [k]: undefined }));
  };

  const handleDiocesisChange = (valor) => {
    setForm(prev => ({ ...prev, diocesis: valor, parroquia: "", municipio: "", provincia: "" }));
    if (valor) {
      setParroquiasFiltradas(PARROQUIAS_DATA.filter(p => p.diocesis === valor));
    } else {
      setParroquiasFiltradas([]);
    }
    setErrores(e => ({ ...e, diocesis: undefined, parroquia: undefined }));
  };

  const handleParroquiaChange = (valor) => {
    const data = PARROQUIAS_DATA.find(p => p.diocesis === form.diocesis && p.parroquia === valor);
    setForm(prev => ({
      ...prev, parroquia: valor,
      municipio: data ? data.municipio : prev.municipio,
      provincia: data ? data.provincia : prev.provincia
    }));
    setErrores(e => ({ ...e, parroquia: undefined }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (isCampoVisible("cedula") && isCampoObligatorio("cedula", true) && !form.cedula.trim()) e.cedula = "Requerido";
    if (isCampoVisible("genero") && isCampoObligatorio("genero", true) && !generoFijo && !form.genero) e.genero = "Requerido";
    if (isCampoVisible("telefono") && isCampoObligatorio("telefono", true) && !form.telefono.trim()) e.telefono = "Requerido";
    if (isCampoVisible("parroquia") && isCampoObligatorio("parroquia", true) && !form.parroquia.trim()) e.parroquia = "Requerido";
    if (isCampoVisible("edad") && isCampoObligatorio("edad", true) && (!form.edad || isNaN(Number(form.edad)) || Number(form.edad) < 1)) e.edad = "Ingresa una edad válida";
    if (isCampoVisible("contacto_emergencia") && isCampoObligatorio("contacto_emergencia", true) && !form.contacto_emergencia.trim()) e.contacto_emergencia = "Requerido";
    if (isCampoVisible("apodo") && isCampoObligatorio("apodo") && !form.apodo.trim()) e.apodo = "Requerido";
    if (isCampoVisible("estado_civil") && isCampoObligatorio("estado_civil") && !form.estado_civil) e.estado_civil = "Requerido";
    if (isCampoVisible("profesion") && isCampoObligatorio("profesion") && !form.ocupacion.trim()) e.ocupacion = "Requerido";
    if (isCampoVisible("email") && isCampoObligatorio("email") && !form.email.trim()) e.email = "Requerido";
    if (isCampoVisible("talla_camisa") && isCampoObligatorio("talla_camisa") && !form.talla_camisa) e.talla_camisa = "Requerido";
    if (isCampoVisible("estatura") && isCampoObligatorio("estatura") && !form.talla_cm) e.talla_cm = "Requerido";
    if (isCampoVisible("peso") && isCampoObligatorio("peso") && !form.peso_kg) e.peso_kg = "Requerido";
    return e;
  };

  // 🎯 ENVIAR INSCRIPCIÓN VÍA FUNCIÓN PÚBLICA BASE44 (SIN LOGIN)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorEnvio(null);
    const errs = validar();
    if (Object.keys(errs).length > 0) { 
      setErrores(errs); 
      return; 
    }
    
    setEnviando(true);
    setNombreEnviado(form.nombre);
    
    const edicionMatch = config?.edicion ? String(config.edicion).match(/\d+/) : null;
    const idRetiroComunidad = retiroId || config?.equipo_id || "general";

    const payload = {
      ...form,
      tipo: "Caminante",
      rol_en_mesa: form.rol_en_mesa || "Caminante",
      genero: generoFijo || form.genero,
      edad: Number(form.edad),
      peso_kg: form.peso_kg ? Number(form.peso_kg) : undefined,
      talla_cm: form.talla_cm ? Number(form.talla_cm) : undefined,
      numero_retiro: edicionMatch ? Number(edicionMatch[0]) : undefined,
      // 🔒 Campos para aislamiento por comunidad
      equipo_id: idRetiroComunidad,
      retiro_id: idRetiroComunidad,
      comunidad_id: idRetiroComunidad,
      estado: "Pendiente",
    };
    
    Object.keys(payload).forEach(k => { 
      if (payload[k] === "" || payload[k] === undefined || Number.isNaN(payload[k])) delete payload[k]; 
    });
    
    console.log("📤 Enviando inscripción vía función pública de Base44:", payload);
    
    try {
      // 🎯 LLAMADA PÚBLICA A BASE44 SIN LOGIN
      const res = await base44.functions.invoke("inscripcionPublica", payload);
      
      if (res?.data?.ok || res?.data?.success) {
        setEnviado(true);
      } else if (res?.data?.duplicado) {
        setErrorEnvio(res.data.mensaje || "Ya existe una inscripción registrada con estos datos.");
      } else {
        setEnviado(true); // Tratamiento exitoso si devolvió respuesta válida
      }
    } catch (err) {
      console.error("❌ Error al enviar inscripción pública:", err);
      setErrorEnvio("Error al procesar la solicitud: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 rounded-full bg-white shadow" />}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">¡Solicitud Enviada!</h2>
          <p className="text-gray-700 text-base mb-4 leading-relaxed">
            ✅ <strong>{nombreEnviado}</strong>, tu solicitud de caminante fue enviada con éxito. Quedarás en lista de espera hasta la confirmación del pago.
          </p>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-4">
            <p className="text-amber-700 text-sm font-semibold">✝ {nombreRetiro}</p>
            {config?.edicion && <p className="text-amber-600 text-xs mt-0.5">Retiro #{config.edicion}</p>}
            <p className="text-amber-500 text-xs mt-1">{eslogan}</p>
          </div>
          <p className="text-gray-400 text-xs">El coordinador revisará tu solicitud y se comunicará contigo pronto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto mb-6 text-center">
        {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 rounded-full bg-white shadow" />}
        <h1 className="text-2xl font-bold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>✝ {nombreRetiro}</h1>
        {config?.edicion && <p className="text-amber-600 text-sm">Retiro #{config.edicion}</p>}
        <p className="text-amber-500 text-xs mt-1 tracking-widest uppercase">{eslogan}</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full">
          <User className="w-4 h-4" />
          <span className="text-sm font-semibold">Inscripción de Caminante</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Completa el formulario para solicitar tu participación como caminante.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
        <Card title="Datos Personales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre Completo - Siempre visible */}
            <div className="md:col-span-2">
              <label className={lbl}>Nombre Completo *</label>
              <input className={`${inp} ${errores.nombre ? "border-red-400" : ""}`} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Juan Carlos Pérez" />
              {errores.nombre && <p className="text-red-500 text-xs mt-1">{errores.nombre}</p>}
            </div>

            {isCampoVisible("cedula") && (
              <div>
                <label className={lbl}>Cédula {isCampoObligatorio("cedula", true) && "*"}</label>
                <input className={`${inp} ${errores.cedula ? "border-red-400" : ""}`} value={form.cedula} onChange={e => set("cedula", e.target.value)} placeholder="000-0000000-0" />
                {errores.cedula && <p className="text-red-500 text-xs mt-1">{errores.cedula}</p>}
              </div>
            )}

            {isCampoVisible("apodo") && (
              <div>
                <label className={lbl}>Apodo {isCampoObligatorio("apodo") && "*"}</label>
                <input className={`${inp} ${errores.apodo ? "border-red-400" : ""}`} value={form.apodo} onChange={e => set("apodo", e.target.value)} placeholder="Nombre con el que te conocen" />
                {errores.apodo && <p className="text-red-500 text-xs mt-1">{errores.apodo}</p>}
              </div>
            )}

            {isCampoVisible("estado_civil") && (
              <div>
                <label className={lbl}>Estado Civil {isCampoObligatorio("estado_civil") && "*"}</label>
                <MobileSelect className={`${inp} ${errores.estado_civil ? "border-red-400" : ""}`} value={form.estado_civil} onChange={(v) => set("estado_civil", v)} options={[{ value: "", label: "Seleccionar..." }, "Soltero(a)", "Casado(a) por la Iglesia", "Casado(a) por lo Civil", "Unión Libre", "Divorciado(a)", "Viudo(a)"]} />
                {errores.estado_civil && <p className="text-red-500 text-xs mt-1">{errores.estado_civil}</p>}
              </div>
            )}

            {isCampoVisible("profesion") && (
              <div>
                <label className={lbl}>Ocupación / Profesión {isCampoObligatorio("profesion") && "*"}</label>
                <input className={`${inp} ${errores.profesion ? "border-red-400" : ""}`} value={form.ocupacion} onChange={e => set("ocupacion", e.target.value)} placeholder="Ej: Médico, Ingeniero, Estudiante" />
                {errores.profesion && <p className="text-red-500 text-xs mt-1">{errores.profesion}</p>}
              </div>
            )}

            {isCampoVisible("edad") && (
              <div>
                <label className={lbl}>Edad {isCampoObligatorio("edad", true) && "*"}</label>
                <input type="number" min="1" max="120" className={`${inp} ${errores.edad ? "border-red-400" : ""}`} value={form.edad} onChange={e => set("edad", e.target.value)} />
                {errores.edad && <p className="text-red-500 text-xs mt-1">{errores.edad}</p>}
              </div>
            )}

            {isCampoVisible("genero") && (
              <div>
                <label className={lbl}>Género {isCampoObligatorio("genero", true) && "*"}</label>
                {generoFijo ? (
                  <div className={`${inp} bg-amber-50 font-semibold text-amber-800`}>{generoFijo} <span className="text-amber-500 text-xs font-normal">(definido por el retiro)</span></div>
                ) : (
                  <MobileSelect className={`${inp} ${errores.genero ? "border-red-400" : ""}`} value={form.genero} onChange={(v) => set("genero", v)} options={[{ value: "", label: "Seleccionar..." }, "Masculino", "Femenino"]} />
                )}
                {errores.genero && <p className="text-red-500 text-xs mt-1">{errores.genero}</p>}
              </div>
            )}

            {isCampoVisible("telefono") && (
              <div>
                <label className={lbl}>Teléfono {isCampoObligatorio("telefono", true) && "*"}</label>
                <input className={`${inp} ${errores.telefono ? "border-red-400" : ""}`} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="809-000-0000" />
                {errores.telefono && <p className="text-red-500 text-xs mt-1">{errores.telefono}</p>}
              </div>
            )}

            {isCampoVisible("email") && (
              <div>
                <label className={lbl}>Email {isCampoObligatorio("email") && "*"}</label>
                <input type="email" className={`${inp} ${errores.email ? "border-red-400" : ""}`} value={form.email} onChange={e => set("email", e.target.value)} />
                {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
              </div>
            )}

            {isCampoVisible("parroquia") && (
              <div className="md:col-span-2 mt-2">
                <label className="block text-sm font-bold text-amber-800 mb-2">Ubicación Eclesiástica</label>
                <p className="text-xs text-amber-600 -mt-1 mb-3">Selecciona tu diócesis y parroquia. El municipio y provincia se autocompletarán.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Diócesis / Arquidiócesis *</label>
                    <MobileSelect
                      className={`${inp} ${errores.diocesis ? "border-red-400" : ""}`}
                      value={form.diocesis}
                      onChange={handleDiocesisChange}
                      options={[{ value: "", label: "Seleccionar diócesis..." }, ...DIOCESIS_LIST.map(d => ({ value: d, label: d }))]}
                    />
                    {errores.diocesis && <p className="text-red-500 text-xs mt-1">{errores.diocesis}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Parroquia / Templo *</label>
                    <MobileSelect
                      className={`${inp} ${errores.parroquia ? "border-red-400" : ""}`}
                      value={form.parroquia}
                      onChange={handleParroquiaChange}
                      disabled={!form.diocesis}
                      options={[
                        { value: "", label: !form.diocesis ? "Primero seleccione una diócesis" : "Seleccionar parroquia..." }, 
                        ...parroquiasFiltradas.map(p => ({ value: p.parroquia, label: `${p.parroquia} (${p.tipo})` }))
                      ]}
                    />
                    {errores.parroquia && <p className="text-red-500 text-xs mt-1">{errores.parroquia}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Municipio</label>
                    <input className={`${inp} bg-amber-50/50 text-amber-700`} value={form.municipio} onChange={e => set("municipio", e.target.value)} placeholder="Se autocompleta" />
                  </div>
                  <div>
                    <label className={lbl}>Provincia</label>
                    <input className={`${inp} bg-amber-50/50 text-amber-700`} value={form.provincia} onChange={e => set("provincia", e.target.value)} placeholder="Se autocompleta" />
                  </div>
                </div>
              </div>
            )}

            {isCampoVisible("sacramento") && (
              <div className="md:col-span-2">
                <label className={lbl}>Sacramento {isCampoObligatorio("sacramento") && "*"}</label>
                <MobileSelect className={inp} value={form.sacramento} onChange={(v) => set("sacramento", v)} options={[{ value: "", label: "Seleccionar..." }, "Bautismo", "Primera Comunión", "Confirmación", "Matrimonio", "Ninguno"]} />
              </div>
            )}

            {isCampoVisible("direccion") && (
              <>
                <div>
                  <label className={lbl}>Calle</label>
                  <input className={inp} value={form.calle} onChange={e => set("calle", e.target.value)} placeholder="Calle / número" />
                </div>
                <div>
                  <label className={lbl}>Sector</label>
                  <input className={inp} value={form.sector} onChange={e => set("sector", e.target.value)} placeholder="Barrio o sector" />
                </div>
              </>
            )}

            {isCampoVisible("fecha_nacimiento") && (
              <div>
                <label className={lbl}>Fecha de Nacimiento {isCampoObligatorio("fecha_nacimiento") && "*"}</label>
                <input type="date" className={inp} value={form.fecha_nacimiento} onChange={e => set("fecha_nacimiento", e.target.value)} />
              </div>
            )}

            {isCampoVisible("padrino") && (
              <>
                <div>
                  <label className={lbl}>Padrino / Madrina {isCampoObligatorio("padrino") && "*"}</label>
                  <input className={inp} value={form.padrino_madrina} onChange={e => set("padrino_madrina", e.target.value)} placeholder="Nombre de quien te invita" />
                </div>
                <div>
                  <label className={lbl}>Teléfono del Padrino / Madrina</label>
                  <input className={inp} value={form.telefono_padrino} onChange={e => set("telefono_padrino", e.target.value)} placeholder="809-555-1234" />
                </div>
              </>
            )}

            {isCampoVisible("contacto_emergencia") && (
              <div className="md:col-span-2 mt-2">
                <label className="block text-sm font-bold text-amber-800 mb-2">Contacto de Emergencia</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>Nombre {isCampoObligatorio("contacto_emergencia", true) && "*"}</label>
                    <input className={`${inp} ${errores.contacto_emergencia ? "border-red-400" : ""}`} value={form.contacto_emergencia} onChange={e => set("contacto_emergencia", e.target.value)} placeholder="Nombre completo" />
                    {errores.contacto_emergencia && <p className="text-red-500 text-xs mt-1">{errores.contacto_emergencia}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Relación</label>
                    <input className={inp} value={form.relacion_emergencia} onChange={e => set("relacion_emergencia", e.target.value)} placeholder="Ej: Madre, Esposa" />
                  </div>
                  <div>
                    <label className={lbl}>Teléfono</label>
                    <input className={inp} value={form.telefono_emergencia} onChange={e => set("telefono_emergencia", e.target.value)} placeholder="809-555-1234" />
                  </div>
                </div>
              </div>
            )}

            {/* CAMPOS PERSONALIZADOS ADICIONALES DE CATEGORÍA PERSONAL Y CONTACTO */}
            <RenderCamposPersonalizados configCamposMap={configCamposMap} form={form} setForm={setForm} errores={errores} lbl={lbl} inp={inp} />
          </div>
        </Card>

        <Card title="Datos Físicos y Médicos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCampoVisible("peso") && (
              <div>
                <label className={lbl}>Peso (kg) {isCampoObligatorio("peso") && "*"}</label>
                <input type="number" min="20" max="300" className={inp} value={form.peso_kg} onChange={e => set("peso_kg", e.target.value)} placeholder="Ej: 70" />
              </div>
            )}

            {isCampoVisible("estatura") && (
              <div>
                <label className={lbl}>Estatura (cm) {isCampoObligatorio("estatura") && "*"}</label>
                <input type="number" min="100" max="250" className={inp} value={form.talla_cm} onChange={e => set("talla_cm", e.target.value)} placeholder="Ej: 170" />
              </div>
            )}

            {imc && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700"><span className="font-semibold">IMC:</span> {imc}
                  {Number(imc) >= 30 && <span className="text-orange-600 ml-2">(Primer piso sugerido)</span>}
                </p>
              </div>
            )}

            {isCampoVisible("talla_camisa") && (
              <div>
                <label className={lbl}>Talla de Camisa {isCampoObligatorio("talla_camisa") && "*"}</label>
                <MobileSelect className={inp} value={form.talla_camisa} onChange={(v) => set("talla_camisa", v)} options={[{ value: "", label: "Seleccionar..." }, "XS", "S", "M", "L", "XL", "XXL", "XXXL"]} />
              </div>
            )}
            <div>
              <label className={lbl}>Tipo de Sangre</label>
              <MobileSelect className={inp} value={form.tipo_sangre} onChange={(v) => set("tipo_sangre", v)} options={[{ value: "", label: "Seleccionar..." }, "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
            </div>
            <div>
              <label className={lbl}>Condición Física Especial</label>
              <MobileSelect className={inp} value={form.condicion_fisica} onChange={(v) => set("condicion_fisica", v)} options={["Ninguna", "Movilidad reducida", "Usa bastón/andador", "Silla de ruedas", "Otra"]} />
            </div>
            <div className="md:col-span-2">
              <label className={lbl}>Necesidades Médicas / Alergias</label>
              <textarea className={inp} rows={2} value={form.necesidades_medicas} onChange={e => set("necesidades_medicas", e.target.value)} placeholder="Condiciones médicas relevantes..." />
            </div>
          </div>
        </Card>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">Tu solicitud quedará en estado <strong>Pendiente</strong> hasta que el coordinador la revise y confirme.</p>
        </div>

        {errorEnvio && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {errorEnvio}</div>}

        <button type="submit" disabled={enviando}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-xl font-bold text-base transition-colors disabled:opacity-60 shadow-lg flex items-center justify-center gap-2">
          {enviando ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : "Enviar Solicitud de Caminante"}
        </button>
        <div className="pb-8" />
      </form>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
      <h3 className="text-sm font-bold text-amber-800 mb-4 border-b border-amber-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function RenderCamposPersonalizados({ configCamposMap, form, setForm, errores, lbl, inp, categoria }) {
  if (!configCamposMap) return null;
  const customFields = Object.entries(configCamposMap).filter(([k, cfg]) => {
    if (!k.startsWith("custom_") && !cfg?.esCustom) return false;
    if (!cfg?.activo) return false;
    if (categoria && cfg.cat !== categoria) return false;
    return true;
  });

  if (customFields.length === 0) return null;

  return (
    <>
      {customFields.map(([key, cfg]) => (
        <div key={key} className={cfg.type === "textarea" ? "md:col-span-2" : ""}>
          <label className={lbl}>
            {cfg.label} {cfg.obligatorio && <span className="text-red-500">*</span>}
          </label>

          {cfg.type === "boolean" ? (
            <MobileSelect
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(v) => setForm(f => ({ ...f, [key]: v }))}
              options={[{ value: "", label: "Seleccionar..." }, "Sí", "No"]}
            />
          ) : cfg.type === "select" ? (
            <MobileSelect
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(v) => setForm(f => ({ ...f, [key]: v }))}
              options={[{ value: "", label: "Seleccionar..." }, ...(cfg.options || [])]}
            />
          ) : (
            <input
              type={cfg.type === "number" ? "number" : "text"}
              className={`${inp} ${errores?.[key] ? "border-red-400" : ""}`}
              value={form[key] || ""}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={`Ingresa ${cfg.label.toLowerCase()}...`}
            />
          )}
          {errores?.[key] && <p className="text-red-500 text-xs mt-1">{errores[key]}</p>}
        </div>
      ))}
    </>
  );
}