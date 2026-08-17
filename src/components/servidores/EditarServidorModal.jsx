import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, MapPin, Church } from "lucide-react";
import { formatTelefono } from "@/utils/formatters";
import { toast } from "sonner";
import AnimatedModal from "@/components/AnimatedModal";
import MobileSelect from "@/components/MobileSelect";
import CodigoAutorizacionModal from "@/components/CodigoAutorizacionModal";
import { registrarAccionAuditoria } from "@/utils/auditLogger";

const GENEROS = ["Masculino", "Femenino"];

// 📍 ESTRUCTURA JERÁRQUICA: Diócesis → Provincia → Municipio → Parroquia
// Basada en la organización eclesiástica real de República Dominicana
const UBICACION_ECLESIASTICA = {
  "Arquidiócesis de Santo Domingo": {
    provincias: {
      "Distrito Nacional": {
        municipios: {
          "Santo Domingo de Guzmán": [
            "Catedral Primada de América",
            "Santísima Trinidad",
            "San José Obrero",
            "Santa Bárbara",
            "Nuestra Señora de las Mercedes",
            "San Miguel Arcángel",
            "Sagrado Corazón de Jesús",
            "Nuestra Señora del Carmen",
            "San Judas Tadeo",
            "Santa Teresita del Niño Jesús"
          ]
        }
      },
      "Santo Domingo": {
        municipios: {
          "Santo Domingo Este": ["San Pablo Apóstol", "San Pedro Apóstol", "Santa Rosa de Lima", "Divino Niño", "María Madre"],
          "Santo Domingo Oeste": ["San Francisco de Asís", "Nuestra Señora de la Altagracia", "Inmaculada Concepción"],
          "Santo Domingo Norte": ["Santiago Apóstol", "Santa Cruz", "San Juan Bautista"],
          "Los Alcarrizos": ["San Lorenzo Mártir", "Santo Cristo de la Buena Muerte"],
          "Boca Chica": ["Nuestra Señora de la Altagracia", "San Rafael Arcángel"],
          "San Antonio de Guerra": ["San Antonio de Padua"],
          "Pedro Brand": ["San José Obrero"]
        }
      },
      "San Pedro de Macorís": {
        municipios: {
          "San Pedro de Macorís": ["San Pedro Apóstol", "Sagrado Corazón de Jesús", "Nuestra Señora del Carmen", "Santa Fe"],
          "Consuelo": ["Nuestra Señora de la Altagracia"],
          "Quisqueya": ["San Pablo Apóstol"],
          "Ramón Santana": ["Santa Cruz"],
          "San José de Los Llanos": ["San José Obrero"],
          "Bayaguana": ["San Juan Bautista", "Santísimo Sacramento"]
        }
      },
      "Hato Mayor": {
        municipios: {
          "Hato Mayor del Rey": ["San Pedro Apóstol", "Nuestra Señora de las Mercedes"],
          "El Valle": ["Santa Cruz"],
          "Sabana de la Mar": ["San Nicolás de Bari"]
        }
      },
      "El Seibo": {
        municipios: {
          "El Seibo": ["Santa Cruz del Seibo", "Nuestra Señora del Rosario"],
          "Miches": ["San Miguel Arcángel"]
        }
      },
      "Monte Plata": {
        municipios: {
          "Monte Plata": ["Nuestra Señora de las Mercedes"],
          "Bayaguana": ["San Juan Bautista"],
          "Yamasá": ["San Francisco de Asís"],
          "Peralvillo": ["Santa Cruz"]
        }
      }
    }
  },
  "Diócesis de Baní": {
    provincias: {
      "Peravia": {
        municipios: {
          "Baní": ["Nuestra Señora de la Altagracia", "San Juan Bautista", "Santa Cruz"],
          "Nizao": ["Nuestra Señora del Rosario"]
        }
      },
      "Azua": {
        municipios: {
          "Azua de Compostela": ["Nuestra Señora de los Remedios", "San Pedro Apóstol"],
          "Estebanía": ["Santa Cruz"],
          "Las Charcas": ["San José Obrero"],
          "Padre Las Casas": ["San Juan Bautista"],
          "Peralta": ["San Pablo Apóstol"],
          "Sabana Yegua": ["Nuestra Señora del Carmen"]
        }
      },
      "San José de Ocoa": {
        municipios: {
          "San José de Ocoa": ["San José Obrero", "Nuestra Señora de la Altagracia"],
          "Rancho Arriba": ["Santa Cruz"],
          "Sabana Larga": ["San Juan Bautista"]
        }
      }
    }
  },
  "Diócesis de San Juan de la Maguana": {
    provincias: {
      "San Juan": {
        municipios: {
          "San Juan de la Maguana": ["San Juan Bautista, R.S.J.", "San José Obrero", "Santa Cruz"],
          "Las Matas de Farfán": ["Nuestra Señora de las Mercedes"],
          "Bohechío": ["San Miguel Arcángel"],
          "El Cercado": ["Nuestra Señora del Carmen"],
          "Juan de Herrera": ["San Juan Bautista"],
          "Vallejuelo": ["Santa Cruz"]
        }
      },
      "Elías Piña": {
        municipios: {
          "Comendador": ["San Miguel Arcángel", "Nuestra Señora de la Altagracia"],
          "Bánica": ["San José Obrero"],
          "El Llano": ["Santa Cruz"],
          "Hondo Valle": ["San Juan Bautista"]
        }
      },
      "Independencia": {
        municipios: {
          "Jimaní": ["Nuestra Señora de la Altagracia"],
          "Cristóbal": ["San Cristóbal"],
          "Duvergé": ["Santa Cruz"],
          "La Descubierta": ["San Juan Bautista"],
          "Postrer Río": ["San Rafael Arcángel"]
        }
      }
    }
  },
  "Diócesis de Barahona": {
    provincias: {
      "Barahona": {
        municipios: {
          "Barahona": ["Nuestra Señora del Rosario", "Sagrado Corazón de Jesús"],
          "Cabral": ["San Rafael Arcángel"],
          "Enriquillo": ["San Enrique"],
          "Paraíso": ["Santa Cruz"],
          "Vicente Noble": ["San Vicente"],
          "Jaquimeyes": ["San José Obrero"],
          "La Ciénaga": ["Santa Cruz"],
          "Polo": ["San Pablo Apóstol"]
        }
      },
      "Bahoruco": {
        municipios: {
          "Neiba": ["San Bartolomé", "Nuestra Señora de la Altagracia"],
          "Galván": ["San Juan Bautista"],
          "Los Ríos": ["Santa Cruz"],
          "Tamayo": ["Santo Tomás Apóstol"],
          "Villa Jaragua": ["San José Obrero"]
        }
      },
      "Pedernales": {
        municipios: {
          "Pedernales": ["San Juan Bautista", "Nuestra Señora de la Altagracia"],
          "Oviedo": ["San José Obrero"]
        }
      }
    }
  },
  "Diócesis de Nuestra Señora de la Altagracia en Higüey": {
    provincias: {
      "La Altagracia": {
        municipios: {
          "Salvaleón de Higüey": ["Basílica Nuestra Señora de la Altagracia", "San Dionisio", "San José Obrero", "Sagrado Corazón de Jesús"],
          "San Rafael del Yuma": ["San Rafael Arcángel"],
          "Bávaro": ["Nuestra Señora de la Altagracia", "San Juan Pablo II"],
          "Verón": ["Nuestra Señora del Carmen"]
        }
      },
      "La Romana": {
        municipios: {
          "La Romana": ["Santa Rosa de Lima", "San José Obrero", "Sagrado Corazón de Jesús"],
          "Guaymate": ["San José Obrero"],
          "Villa Hermosa": ["Nuestra Señora de la Altagracia"]
        }
      }
    }
  },
  "Diócesis de Santiago de los Caballeros": {
    provincias: {
      "Santiago": {
        municipios: {
          "Santiago de los Caballeros": ["Catedral Santiago Apóstol", "Santiago Apóstol", "Santa Ana", "Sagrado Corazón de Jesús", "Nuestra Señora del Carmen", "San José Obrero", "Inmaculada Concepción"],
          "Tamboril": ["San Rafael Arcángel", "Santa Cruz"],
          "Licey al Medio": ["Nuestra Señora de las Mercedes"],
          "Villa González": ["San José Obrero", "Santa Cruz"],
          "Jánico": ["San Juan Bautista"],
          "Sabana Iglesia": ["Santa Cruz"],
          "Villa Bisonó (Navarrete)": ["San José Obrero"],
          "Baitoa": ["Santiago Apóstol-Arroyo al Medio", "Santiago apóstol"]
        }
      },
      "Espaillat": {
        municipios: {
          "Moca": ["Sagrado Corazón de Jesús", "Nuestra Señora del Rosario", "Santa Cruz"],
          "Cayetano Germosén": ["San José Obrero"],
          "Gaspar Hernández": ["San José Obrero"],
          "Jamao Afuera": ["Santa Cruz"]
        }
      }
    }
  },
  "Diócesis de Mao-Monte Cristi": {
    provincias: {
      "Monte Cristi": {
        municipios: {
          "Monte Cristi": ["Nuestra Señora de las Mercedes", "San Fernando Rey"],
          "Castañuelas": ["San José Obrero"],
          "Guayubín": ["San Juan Bautista"],
          "Las Matas de Santa Cruz": ["Santa Cruz"],
          "Pepillo Salcedo": ["San José Obrero"],
          "Villa Vásquez": ["San Juan Bautista"]
        }
      },
      "Dajabón": {
        municipios: {
          "Dajabón": ["Nuestra Señora del Rosario", "San José Obrero"],
          "El Pino": ["Santa Cruz"],
          "Loma de Cabrera": ["San Juan Bautista"],
          "Restauración": ["San José Obrero"]
        }
      },
      "Santiago Rodríguez": {
        municipios: {
          "San Ignacio de Sabaneta": ["San Ignacio de Loyola", "Nuestra Señora de las Mercedes"],
          "Monción": ["San José Obrero"],
          "Villa Los Almácigos": ["Santa Cruz"]
        }
      },
      "Valverde": {
        municipios: {
          "Mao": ["Santa Cruz", "San José Obrero", "Nuestra Señora del Rosario"],
          "Esperanza": ["Nuestra Señora de la Esperanza"],
          "Laguna Salada": ["San Juan Bautista"]
        }
      }
    }
  },
  "Diócesis de La Vega": {
    provincias: {
      "La Vega": {
        municipios: {
          "La Vega": ["Inmaculada Concepción", "Sagrado Corazón de Jesús", "San Miguel Arcángel"],
          "Constanza": ["Santa Ana-Constanza", "Santo Cerro"],
          "Jarabacoa": ["Nuestra Señora del Carmen", "Santa Cruz"],
          "Jima Abajo": ["San José Obrero"]
        }
      },
      "Monseñor Nouel": {
        municipios: {
          "Bonao": ["San Juan Bautista", "Nuestra Señora de las Mercedes", "Sagrado Corazón de Jesús"],
          "Maimón": ["Santa Cruz"],
          "Piedra Blanca": ["San José Obrero"]
        }
      },
      "Sánchez Ramírez": {
        municipios: {
          "Cotuí": ["San José Obrero", "Inmaculada Concepción"],
          "Cevicos": ["Santa Cruz"],
          "Fantino": ["San Juan Bautista"],
          "La Mata": ["Nuestra Señora de la Altagracia"]
        }
      }
    }
  },
  "Diócesis de San Francisco de Macorís": {
    provincias: {
      "Duarte": {
        municipios: {
          "San Francisco de Macorís": ["Santa Ana", "Sagrado Corazón de Jesús", "San Francisco de Asís", "Nuestra Señora del Carmen", "San José Obrero", "La Altagracia, La Joya, S.F.M.", "Divino Niño"],
          "Pimentel": ["San Juan Bautista"],
          "Villa Riva": ["Nuestra Señora del Rosario"],
          "Las Guáranas": ["San José Obrero"],
          "Arenoso": ["Santa Cruz"],
          "Castillo": ["San Rafael Arcángel"]
        }
      },
      "María Trinidad Sánchez": {
        municipios: {
          "Nagua": ["Santísima Trinidad", "Santísima Trinidad nagua", "San José Obrero"],
          "Cabrera": ["Santa Cruz-Cabrera", "Santa Cruz", "Nuestra Señora del Carmen"],
          "El Factor": ["San José Obrero"],
          "Río San Juan": ["San Juan Bautista"]
        }
      },
      "Samaná": {
        municipios: {
          "Samaná": ["Nuestra Señora del Carmen (Las Terrenas)", "Nuestra Señora del Carmen", "San Pedro Apóstol"],
          "Las Terrenas": ["Nuestra Señora del Carmen (Las Terrenas)"],
          "Sánchez": ["San José Obrero"]
        }
      },
      "Hermanas Mirabal": {
        municipios: {
          "Salcedo": ["San Francisco de Asís", "Inmaculada Concepción"],
          "Tenares": ["San José Obrero"],
          "Villa Tapia": ["San Rafael Arcángel, Villa Tapia", "San Rafael Arcángel"]
        }
      }
    }
  },
  "Diócesis de Puerto Plata": {
    provincias: {
      "Puerto Plata": {
        municipios: {
          "Puerto Plata": ["San Felipe Apóstol", "San Pedro Apóstol", "Sagrado Corazón de Jesús"],
          "Sosúa": ["Nuestra Señora de la Altagracia"],
          "Cabarete": ["San José Obrero"],
          "Imbert": ["San Rafael Arcángel"],
          "Altamira": ["Santa Cruz"],
          "Guananico": ["San Juan Bautista"],
          "Los Hidalgos": ["San José Obrero"],
          "Luperón": ["Nuestra Señora del Carmen"],
          "Villa Isabela": ["Santa Isabel"],
          "Villa Montellano": ["San José Obrero"]
        }
      }
    }
  }
};

const EMPTY = {
  nombre: "", edad: "", genero: "", telefono: "",
  parroquia: "",
  fecha_nacimiento: "",
  numero_retiro: "",
  contacto_emergencia_nombre: "",
  contacto_emergencia_telefono: "",
  dificultades_medicas: "",
  notas: "",
  diocesis: "",
  provincia: "",
  municipio: "",
  puestos_servidos: "",
  proposito_servir: "",
};

const toCapitalize = (str) => {
  if (!str) return "";
  const excepciones = ["de", "la", "del", "los", "las", "y"];
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (excepciones.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

const normalizarPuestos = (texto) => {
  if (!texto) return "";
  return texto
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join(", ");
};

export default function EditarServidorModal({ servidor, onClose, onGuardado, onConfirmarConAutorizacion }) {
  const [form, setForm] = useState(servidor ? { ...EMPTY, ...servidor } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [showCodigo, setShowCodigo] = useState(false);
  const [estadoAnterior] = useState(servidor?.estado || "Pendiente");
  const [comunidades, setComunidades] = useState([]);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(configs => {
      if (Array.isArray(configs)) {
        const mapeados = configs.map(c => ({
          id: c.equipo_id || c.comunidad_id || c.id || c.slug,
          nombre: c.nombre_retiro || c.nombre_equipo || c.parroquia || c.nombre || "Comunidad"
        }));
        setComunidades(mapeados);
      }

      const config = configs?.[0];
      
      if (!servidor) {
        setForm(prev => {
          const nuevoForm = { ...prev };
          
          if (config?.edicion) {
            nuevoForm.numero_retiro = String(config.edicion);
          }
          
          if (config?.tipo_retiro && !prev.genero) {
            const tipoLower = String(config.tipo_retiro).toLowerCase();
            if (tipoLower.includes("hombre") || tipoLower.includes("varon")) {
              nuevoForm.genero = "Masculino";
            } else if (tipoLower.includes("mujer") || tipoLower.includes("femen")) {
              nuevoForm.genero = "Femenino";
            }
          }
          
          return nuevoForm;
        });
      }
    }).catch(() => {});
  }, [servidor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let formatted = value;
    if (name === "telefono" || name === "contacto_emergencia_telefono") {
      formatted = formatTelefono(value);
    }
    
    if (name === "fecha_nacimiento") {
      setForm(prev => ({ 
        ...prev, 
        fecha_nacimiento: value, 
        edad: calcularEdad(value) 
      }));
    } else if (name === "diocesis") {
      // 🔄 Al cambiar diócesis → resetear provincia, municipio y parroquia
      setForm(prev => ({ 
        ...prev, 
        diocesis: value, 
        provincia: "", 
        municipio: "", 
        parroquia: "" 
      }));
    } else if (name === "provincia") {
      // 🔄 Al cambiar provincia → resetear municipio y parroquia
      setForm(prev => ({ 
        ...prev, 
        provincia: value, 
        municipio: "", 
        parroquia: "" 
      }));
    } else if (name === "municipio") {
      // 🔄 Al cambiar municipio → resetear parroquia
      setForm(prev => ({ 
        ...prev, 
        municipio: value, 
        parroquia: "" 
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: formatted }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const camposACapitalizar = ["nombre", "contacto_emergencia_nombre"];
    if (camposACapitalizar.includes(name)) {
      setForm(prev => ({ ...prev, [name]: toCapitalize(value) }));
    }
    if (name === "puestos_servidos") {
      setForm(prev => ({ ...prev, [name]: normalizarPuestos(value) }));
    }
  };

  const buildData = () => {
    const data = {};
    
    const camposTexto = [
      "nombre", "telefono", "email", "parroquia", "genero", "notas",
      "contacto_emergencia_nombre", "contacto_emergencia_telefono", 
      "dificultades_medicas", "diocesis", "provincia", "municipio",
      "puestos_servidos", "proposito_servir"
    ];
    
    camposTexto.forEach(campo => {
      const valor = form[campo];
      if (valor === "" || valor === undefined || valor === null) {
        data[campo] = null;
      } else if (typeof valor === "string") {
        data[campo] = valor.trim() || null;
      } else {
        data[campo] = valor;
      }
    });
    
    data.fecha_nacimiento = form.fecha_nacimiento ? form.fecha_nacimiento : null;
    data.edad = form.edad !== "" && form.edad !== null && form.edad !== undefined 
      ? Number(form.edad) : null;
    data.numero_retiro = form.numero_retiro !== "" && form.numero_retiro !== null && form.numero_retiro !== undefined 
      ? Number(form.numero_retiro) : null;
    data.estado = servidor?.estado || "Pendiente";
    
    data.equipo_id = form.equipo_id || null;
    data.comunidad_id = form.comunidad_id || form.equipo_id || null;
    data.comunidad_nombre = form.comunidad_nombre || null;

    return data;
  };

  const guardarServidor = async () => {
    setSaving(true);
    try {
      const data = buildData();
      console.log("📤 Datos a guardar:", data);
      
      if (!data.nombre) {
        toast.error("El nombre es obligatorio.");
        setSaving(false);
        return;
      }
      
      if (servidor) {
        await base44.entities.Servidor.update(servidor.id, data);
        registrarAccionAuditoria({
          accion: "MODIFICACION",
          modulo: "Servidores",
          detalle: `Modificada ficha de servidor ${data.nombre}`,
          entidad: "Servidor",
          entidad_id: servidor.id,
          datos_previos: servidor,
          datos_nuevos: data
        });
        toast.success("¡Servidor actualizado correctamente!");
      } else {
        const res = await base44.entities.Servidor.create(data);
        registrarAccionAuditoria({
          accion: "CREACION",
          modulo: "Servidores",
          detalle: `Registrado nuevo servidor ${data.nombre}`,
          entidad: "Servidor",
          entidad_id: res?.id || "",
          datos_nuevos: data
        });
        toast.success("¡Servidor registrado correctamente!");
      }
      
      if (onGuardado) onGuardado();
      if (onClose) onClose();
    } catch (e) {
      console.error("❌ Error al guardar servidor:", e);
      const errorMsg = e?.message || e?.error?.message || e?.details || JSON.stringify(e) || "Error desconocido";
      toast.error("No se pudo guardar: " + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nombre || form.nombre.trim() === "") { 
      toast.error("El nombre es obligatorio."); 
      return; 
    }

    const cambioEstado = servidor && form.estado !== estadoAnterior;

    if (cambioEstado && form.estado === "Confirmado") {
      if (onConfirmarConAutorizacion) {
        onConfirmarConAutorizacion(buildData());
      } else {
        setShowCodigo(true);
      }
      return;
    }

    if (cambioEstado && form.estado !== "Pendiente") {
      setShowCodigo(true);
      return;
    }

    await guardarServidor();
  };

  // 🔄 Cálculos para la cascada Diócesis → Provincia → Municipio → Parroquia
  const diocesisOptions = Object.keys(UBICACION_ECLESIASTICA);
  
  const provinciasOptions = form.diocesis && UBICACION_ECLESIASTICA[form.diocesis]
    ? Object.keys(UBICACION_ECLESIASTICA[form.diocesis].provincias)
    : [];
  
  const municipiosOptions = form.diocesis && form.provincia && UBICACION_ECLESIASTICA[form.diocesis]?.provincias[form.provincia]
    ? Object.keys(UBICACION_ECLESIASTICA[form.diocesis].provincias[form.provincia].municipios)
    : [];
  
  const parroquiasOptions = form.diocesis && form.provincia && form.municipio && 
    UBICACION_ECLESIASTICA[form.diocesis]?.provincias[form.provincia]?.municipios[form.municipio]
    ? UBICACION_ECLESIASTICA[form.diocesis].provincias[form.provincia].municipios[form.municipio]
    : [];

  return (
    <>
      <AnimatedModal>
        <div className="flex items-center justify-between bg-amber-700 text-white px-5 py-4 rounded-t-xl">
          <h2 className="text-lg font-bold">{servidor ? "Editar Servidor" : "Registrar Servidor"}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* === SECCIÓN 1: DATOS PERSONALES === */}
          <div>
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              👤 Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre Completo *" name="nombre" value={form.nombre} onChange={handleChange} onBlur={handleBlur} />
              <SelectField label="Género (Automático)" name="genero" value={form.genero} onChange={handleChange} options={GENEROS} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Field label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} type="date" />
              <Field label="Edad" name="edad" value={form.edad} onChange={handleChange} type="number" readOnly />
            </div>
          </div>

          {/* === SECCIÓN 2: CONTACTO === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              📞 Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="809-000-0000" />
              <Field label="Correo Electrónico" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" type="email" />
            </div>
          </div>

          {/* === SECCIÓN 3: UBICACIÓN ECLESIÁSTICA (CASCADA) === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Church className="w-3.5 h-3.5" /> Ubicación Eclesiástica
            </h3>
            
            {/* Paso 1: Diócesis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField 
                label="1️⃣ Diócesis" 
                name="diocesis" 
                value={form.diocesis} 
                onChange={handleChange} 
                options={diocesisOptions}
                placeholder="Seleccionar diócesis..."
              />
              <SelectField 
                label="2️⃣ Provincia" 
                name="provincia" 
                value={form.provincia} 
                onChange={handleChange} 
                options={provinciasOptions}
                disabled={!form.diocesis}
                placeholder={form.diocesis ? "Seleccionar provincia..." : "Primero selecciona una diócesis"}
              />
            </div>

            {/* Paso 2: Municipio y Parroquia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <SelectField 
                label="3️⃣ Municipio" 
                name="municipio" 
                value={form.municipio} 
                onChange={handleChange} 
                options={municipiosOptions}
                disabled={!form.provincia}
                placeholder={form.provincia ? "Seleccionar municipio..." : "Primero selecciona una provincia"}
              />
              <SelectField 
                label="4️⃣ Parroquia" 
                name="parroquia" 
                value={form.parroquia} 
                onChange={handleChange} 
                options={parroquiasOptions}
                disabled={!form.municipio}
                placeholder={form.municipio ? "Seleccionar parroquia..." : "Primero selecciona un municipio"}
              />
            </div>

            {/* Indicador visual de la cascada */}
            {form.diocesis && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <strong>Ruta:</strong> {form.diocesis}
                  {form.provincia && <> → {form.provincia}</>}
                  {form.municipio && <> → {form.municipio}</>}
                  {form.parroquia && <> → {form.parroquia}</>}
                </p>
              </div>
            )}
          </div>

          {/* === SECCIÓN 4: CONTACTO DE EMERGENCIA === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              🚨 Contacto de Emergencia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field 
                label="Nombre del Contacto" 
                name="contacto_emergencia_nombre" 
                value={form.contacto_emergencia_nombre} 
                onChange={handleChange} 
                onBlur={handleBlur}
                placeholder="Ej: María Pérez (Madre)"
              />
              <Field 
                label="Teléfono de Emergencia" 
                name="contacto_emergencia_telefono" 
                value={form.contacto_emergencia_telefono} 
                onChange={handleChange}
                placeholder="809-000-0000"
              />
            </div>
          </div>

          {/* === SECCIÓN 5: SALUD === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              ⚕️ Información de Salud
            </h3>
            <div>
              <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Dificultades Médicas / Condiciones de Salud
              </label>
              <textarea
                name="dificultades_medicas"
                value={form.dificultades_medicas}
                onChange={handleChange}
                rows="2"
                className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
                placeholder="Ej: Diabetes, asma, alergias a medicamentos, hipertensión, etc."
              />
            </div>
          </div>

          {/* === SECCIÓN 6: EXPERIENCIA EN RETIROS === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              🎖️ Experiencia en Retiros
            </h3>
            <div>
              <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Puestos que ha servido
              </label>
              <input
                type="text"
                name="puestos_servidos"
                value={form.puestos_servidos}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
                placeholder="Ej: Cocina, Música, Logística, Servidor de Mesa"
              />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-1">
                💡 Separa cada puesto con una coma (,). Se ordenarán automáticamente al guardar.
              </p>
              {form.puestos_servidos && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {normalizarPuestos(form.puestos_servidos).split(", ").map((puesto, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                    >
                      {puesto}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* === SECCIÓN 7: PROPÓSITO DE SERVIR (NUEVO) === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              ✝️ Vocación y Propósito
            </h3>
            <div>
              <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                <span className="text-amber-600">💬</span>
                Propósito de servir en este retiro
              </label>
              <textarea
                name="proposito_servir"
                value={form.proposito_servir}
                onChange={handleChange}
                rows="3"
                className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
                placeholder="Comparte brevemente tu motivación para servir en este retiro. ¿Qué te impulsa a dar este servicio? ¿Qué esperanza o compromiso traes al equipo?"
              />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                📖 Tu respuesta será considerada al momento de asignarte responsabilidades dentro del retiro.
              </p>
            </div>
          </div>

          {/* === SECCIÓN 8: NOTAS === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              📝 Notas Adicionales
            </h3>
            <div>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                rows="2"
                className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
                placeholder="Otra información relevante..."
              />
            </div>
          </div>

          {/* === SECCIÓN 9: ASIGNACIÓN DE COMUNIDAD Y DESVINCULACIÓN === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Church className="w-4 h-4 text-amber-700" /> Comunidad / Retiro Asignado
            </h3>
            <div className="bg-amber-50/80 dark:bg-zinc-800 border border-amber-200 dark:border-zinc-700 p-3.5 rounded-xl space-y-2">
              <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                Comunidad o Retiro actual del Servidor:
              </label>
              <select
                name="equipo_id"
                value={form.equipo_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val || val === "DESVINCULAR") {
                    setForm(prev => ({ ...prev, equipo_id: null, comunidad_id: null, comunidad_nombre: "" }));
                  } else {
                    const selectedCom = comunidades.find(c => String(c.id) === String(val));
                    setForm(prev => ({
                      ...prev,
                      equipo_id: val,
                      comunidad_id: val,
                      comunidad_nombre: selectedCom?.nombre || ""
                    }));
                  }
                }}
                className="w-full px-3 py-2 border border-amber-300 dark:border-zinc-600 rounded-lg text-xs font-black bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
              >
                <option value="DESVINCULAR">🚫 DESVINCULAR DE ESTA COMUNIDAD (Sacar del grupo)</option>
                {comunidades.map(c => (
                  <option key={c.id} value={c.id}>
                    ⛪ {c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 italic font-medium">
                * Al seleccionar "DESVINCULAR", este servidor se remueve de la comunidad actual y dejará de aparecer en este retiro.
              </p>
            </div>
          </div>
          
          {/* === BOTONES === */}
          <div className="flex justify-end gap-3 pt-4 border-t border-amber-100 dark:border-zinc-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" /> 
              {saving ? "Guardando..." : servidor ? "Actualizar" : "Registrar"}
            </button>
          </div>
        </form>
      </AnimatedModal>
      
      {showCodigo && (
        <CodigoAutorizacionModal
          titulo={`Autorizar cambio a ${form.estado}`}
          onClose={() => setShowCodigo(false)}
          onAceptar={() => { 
            setShowCodigo(false); 
            guardarServidor(); 
          }}
        />
      )}
    </>
  );
}

function Field({ label, name, value, onChange, onBlur, type = "text", readOnly = false, placeholder = "" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
        {label}
      </label>
      <input 
        type={type} 
        name={name} 
        value={value || ""} 
        onChange={onChange} 
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 ${
          readOnly ? "bg-gray-100 dark:bg-zinc-900 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, disabled = false, placeholder = "Seleccionar..." }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
        {label}
      </label>
      <MobileSelect
        name={name}
        value={value}
        onChange={(val) => onChange({ target: { name, value: val } })}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-amber-400 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
}