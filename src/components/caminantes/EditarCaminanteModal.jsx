import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save } from "lucide-react";
import { formatTelefono } from "@/utils/formatters";
import { toast } from "sonner";
import AnimatedModal from "@/components/AnimatedModal";
import MobileSelect from "@/components/MobileSelect";
import CodigoAutorizacionModal from "@/components/CodigoAutorizacionModal";
import { registrarAccionAuditoria } from "@/utils/auditLogger";

const ESTADOS = ["Pendiente", "Confirmado", "Cancelado"];
const GENEROS = ["Masculino", "Femenino"];
const ROLES_MESA = ["Caminante", "Líder de Mesa"];
const TALLAS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TIPOS_SANGRE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ESTADOS_CIVILES = ["Soltero(a)", "Casado(a) por la Iglesia", "Casado(a) por lo Civil", "Unión Libre", "Divorciado(a)", "Viudo(a)"];
const CONDICION_FISICA = ["Ninguna", "Movilidad reducida", "Usa bastón/andador", "Silla de ruedas", "Otra"];

export default function EditarCaminanteModal({ caminante, onClose, onGuardado, onConfirmarConAutorizacion }) {
  const [showCodigo, setShowCodigo] = useState(false);
  const [estadoAnterior] = useState(caminante.estado);
  const [fichasOcupadas, setFichasOcupadas] = useState({});
  const [totalFichasDisponible, setTotalFichasDisponible] = useState(0);
  const [errorFicha, setErrorFicha] = useState("");
  const [form, setForm] = useState({
    numero_ficha: caminante.numero_ficha || "",
    nombre: caminante.nombre || "",
    apodo: caminante.apodo || "",
    cedula: caminante.cedula || "",
    edad: caminante.edad || "",
    genero: caminante.genero || "",
    estado_civil: caminante.estado_civil || "",
    email: caminante.email || "",
    telefono: caminante.telefono || "",
    direccion: caminante.direccion || "",
    parroquia: caminante.parroquia || "",
    padrino_madrina: caminante.padrino_madrina || "",
    telefono_padrino: caminante.telefono_padrino || "",
    contacto_emergencia: caminante.contacto_emergencia || "",
    telefono_emergencia: caminante.telefono_emergencia || "",
    rol_en_mesa: caminante.rol_en_mesa || "Caminante",
    numero_mesa: caminante.numero_mesa || "",
    numero_habitacion: caminante.numero_habitacion || "",
    talla_camisa: caminante.talla_camisa || "",
    tipo_sangre: caminante.tipo_sangre || "",
    necesidades_medicas: caminante.necesidades_medicas || "",
    fecha_nacimiento: caminante.fecha_nacimiento || "",
    numero_retiro: caminante.numero_retiro || "",
    peso_kg: caminante.peso_kg || "",
    talla_cm: caminante.talla_cm || "",
    condicion_fisica: caminante.condicion_fisica || "Ninguna",
    estado: caminante.estado || "Pendiente",
    notas: caminante.notas || "",
    bautismo: caminante.bautismo || false,
    comunion: caminante.comunion || false,
    confirmacion: caminante.confirmacion || false,
    matrimonio: caminante.matrimonio || false,
    equipo_id: caminante.equipo_id || "",
    comunidad_id: caminante.comunidad_id || "",
    comunidad_nombre: caminante.comunidad_nombre || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Caminante.list(),
      base44.entities.ConfigRetiro.list(),
      base44.entities.Comunidad?.list?.() || Promise.resolve([])
    ]).then(([caminantes, configs, comunidadesRes]) => {
      if (Array.isArray(comunidadesRes)) {
        setComunidades(comunidadesRes);
      }
      const mapa = {};
      caminantes
        .filter(c => c.id !== caminante.id && c.id !== caminante._id)
        .forEach(c => { if (c.numero_ficha) mapa[c.numero_ficha] = c.nombre; });
      setFichasOcupadas(mapa);
      setTotalFichasDisponible(configs?.[0]?.total_fichas || 100);
      const edicion = configs?.[0]?.edicion;
      if (edicion && !form.numero_retiro) setForm(prev => ({ ...prev, numero_retiro: String(edicion) }));
    }).catch(() => {});
  }, [caminante]);

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return "";
    const hoy = new Date();
    const cumpleanos = new Date(fechaNac);
    let edadCalculada = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edadCalculada--;
    }
    return edadCalculada >= 0 ? edadCalculada : "";
  };

  const validarFicha = (num) => {
    if (!num) { setErrorFicha(""); return true; }
    const n = Number(num);
    if (isNaN(n) || n < 1) { setErrorFicha("Ingresa un número de ficha válido."); return false; }
    if (totalFichasDisponible > 0 && n > totalFichasDisponible) {
      setErrorFicha(`La ficha máxima disponible es #${totalFichasDisponible}.`);
      return false;
    }
    if (fichasOcupadas[n]) { setErrorFicha(`Ficha #${n} asignada a: ${fichasOcupadas[n]}`); return false; }
    setErrorFicha("");
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;
    
    if (name === "telefono" || name === "telefono_padrino" || name === "telefono_emergencia") finalValue = formatTelefono(value);

    if (name === "equipo_id") {
       const com = comunidades.find(c => String(c.id) === String(value));
       setForm(prev => ({ 
         ...prev, 
         equipo_id: value, 
         comunidad_id: value, 
         comunidad_nombre: com ? com.nombre : "" 
       }));
       return;
    }

    if (name === "numero_ficha") {
      validarFicha(value);
    }

    if (name === "fecha_nacimiento") {
      const nuevaEdad = calcularEdad(value);
      setForm(prev => ({
        ...prev,
        [name]: finalValue,
        edad: nuevaEdad !== "" ? nuevaEdad : prev.edad
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const buildPayload = () => ({
    nombre: String(form.nombre).trim(),
    apodo: form.apodo ? String(form.apodo).trim() : "",
    cedula: form.cedula ? String(form.cedula).trim() : "",
    edad: form.edad && form.edad !== "" ? Number(form.edad) : null,
    genero: form.genero || "",
    estado_civil: form.estado_civil || "",
    email: form.email ? String(form.email).trim() : "",
    telefono: form.telefono ? String(form.telefono).trim() : "",
    direccion: form.direccion ? String(form.direccion).trim() : "",
    parroquia: form.parroquia ? String(form.parroquia).trim() : "",
    padrino_madrina: form.padrino_madrina ? String(form.padrino_madrina).trim() : "",
    telefono_padrino: form.telefono_padrino ? String(form.telefono_padrino).trim() : "",
    contacto_emergencia: form.contacto_emergencia ? String(form.contacto_emergencia).trim() : "",
    telefono_emergencia: form.telefono_emergencia ? String(form.telefono_emergencia).trim() : "",
    rol_en_mesa: form.rol_en_mesa || "Caminante",
    numero_ficha: form.numero_ficha && form.numero_ficha !== "" ? Number(form.numero_ficha) : null,
    numero_mesa: form.numero_mesa && form.numero_mesa !== "" ? Number(form.numero_mesa) : null,
    numero_habitacion: form.numero_habitacion && form.numero_habitacion !== "" ? Number(form.numero_habitacion) : null,
    numero_retiro: form.numero_retiro && form.numero_retiro !== "" ? Number(form.numero_retiro) : null,
    talla_camisa: form.talla_camisa || "",
    tipo_sangre: form.tipo_sangre || "",
    necesidades_medicas: form.necesidades_medicas ? String(form.necesidades_medicas).trim() : "",
    fecha_nacimiento: form.fecha_nacimiento || "",
    peso_kg: form.peso_kg && form.peso_kg !== "" ? Number(form.peso_kg) : null,
    talla_cm: form.talla_cm && form.talla_cm !== "" ? Number(form.talla_cm) : null,
    condicion_fisica: form.condicion_fisica || "Ninguna",
    estado: form.estado || "Pendiente",
    notas: form.notas ? String(form.notas).trim() : "",
    bautismo: Boolean(form.bautismo),
    comunion: Boolean(form.comunion),
    confirmacion: Boolean(form.confirmacion),
    matrimonio: Boolean(form.matrimonio),
    equipo_id: form.equipo_id || null,
    comunidad_id: form.comunidad_id || null,
    comunidad_nombre: form.comunidad_nombre || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.numero_ficha && !validarFicha(form.numero_ficha)) {
      toast.error(errorFicha || "Número de ficha no válido.");
      return;
    }

    const cambioEstado = form.estado !== estadoAnterior;

    // Cambio a Confirmado → flujo de cobro con autorización + recibo (lo maneja el padre)
    if (cambioEstado && form.estado === "Confirmado") {
      if (onConfirmarConAutorizacion) {
        onConfirmarConAutorizacion(buildPayload());
      } else {
        setShowCodigo(true);
      }
      return;
    }

    // Otro cambio de estado (ej. Cancelado) → pedir código y guardar normalmente
    if (cambioEstado && form.estado !== "Pendiente") {
      setShowCodigo(true);
      return;
    }

    guardarCaminante();
  };

  const guardarCaminante = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const payload = buildPayload();

      const idCaminante = caminante.id || caminante._id;
      
      if (!idCaminante) {
        throw new Error("No se detectó un ID válido para el registro de este caminante.");
      }

      await base44.entities.Caminante.update(idCaminante, payload);

      // 🛡️ Registrar en la Bitácora de Auditoría
      registrarAccionAuditoria({
        accion: "MODIFICACION",
        modulo: "Caminantes",
        detalle: `Modificada ficha de caminante ${payload.nombre}`,
        entidad: "Caminante",
        entidad_id: idCaminante,
        datos_previos: caminante,
        datos_nuevos: payload
      });
      
      toast.success("¡Cambios guardados con éxito!");
      if (onGuardado) onGuardado(); 
      if (onClose) onClose();    
    } catch (error) {
      console.error("Error crítico detallado en Base44:", error);
      
      const mensajeServer = error?.response?.data?.message 
        || error?.response?.data?.error 
        || error?.message 
        || "Error indefinido en la API";
        
      alert(`Error al guardar en Base44:\n${mensajeServer}`);
      toast.error(`No se pudo actualizar: ${mensajeServer}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <AnimatedModal>
      <div className="flex items-center justify-between bg-amber-700 text-white px-5 py-4 rounded-t-xl">
          <h2 className="text-lg font-bold">Editar Caminante</h2>
          <button type="button" onClick={onClose} className="hover:opacity-75 transition-opacity">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-3">
            <label className="text-sm font-semibold text-amber-800">Número de Ficha</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-amber-700">#</span>
              <input
                type="number"
                name="numero_ficha"
                value={form.numero_ficha}
                onChange={handleChange}
                placeholder={`1 - ${totalFichasDisponible || "..."}`}
                min="1"
                max={totalFichasDisponible || undefined}
                className={`w-32 border rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 ${errorFicha ? "border-red-400 bg-red-50 dark:bg-red-950 dark:text-zinc-100 focus:ring-red-400" : "border-amber-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:ring-amber-400"}`}
              />
              <span className="text-xs text-amber-500">
                {totalFichasDisponible > 0 ? `(fichas 1 - ${totalFichasDisponible})` : ""}
              </span>
            </div>
            {errorFicha && <p className="text-red-600 text-xs font-semibold mt-1">{errorFicha}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Nombre Completo *" name="nombre" value={form.nombre} onChange={handleChange} />
            <Field label="Apodo" name="apodo" value={form.apodo} onChange={handleChange} placeholder="Nombre con el que se le conoce" />
            <Field label="Cédula" name="cedula" value={form.cedula} onChange={handleChange} placeholder="000-0000000-0" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fecha de Nacimiento" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} type="date" />
            <Field label="Edad" name="edad" value={form.edad} onChange={handleChange} type="number" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Género" name="genero" value={form.genero} onChange={handleChange} options={GENEROS} />
            <SelectField label="Estado Civil" name="estado_civil" value={form.estado_civil} onChange={handleChange} options={ESTADOS_CIVILES} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} />
            <Field label="Correo Electrónico" name="email" value={form.email} onChange={handleChange} />
          </div>

          <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Parroquia" name="parroquia" value={form.parroquia} onChange={handleChange} />
            <Field label="Padrino / Madrina" name="padrino_madrina" value={form.padrino_madrina} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono del Padrino / Madrina" name="telefono_padrino" value={form.telefono_padrino} onChange={handleChange} placeholder="809-555-1234" />
            <div></div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg p-4 space-y-3">
            <label className="block text-sm font-bold text-amber-900 dark:text-amber-200">Contacto de Emergencia</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre del Contacto" name="contacto_emergencia" value={form.contacto_emergencia} onChange={handleChange} placeholder="Nombre completo" />
              <Field label="Teléfono de Emergencia" name="telefono_emergencia" value={form.telefono_emergencia} onChange={handleChange} placeholder="809-555-1234" />
            </div>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900 rounded-lg p-4">
            <label className="block text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">Sacramentos Recibidos</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-sm text-amber-950 dark:text-amber-100 font-medium cursor-pointer">
                <input type="checkbox" name="bautismo" checked={form.bautismo} onChange={handleChange} className="w-4 h-4 rounded text-amber-700 focus:ring-amber-400 border-amber-300" />
                Bautismo
              </label>
              <label className="flex items-center gap-2 text-sm text-amber-950 dark:text-amber-100 font-medium cursor-pointer">
                <input type="checkbox" name="confirmacion" checked={form.confirmacion} onChange={handleChange} className="w-4 h-4 rounded text-amber-700 focus:ring-amber-400 border-amber-300" />
                Confirmación
              </label>
              <label className="flex items-center gap-2 text-sm text-amber-950 dark:text-amber-100 font-medium cursor-pointer">
                <input type="checkbox" name="comunion" checked={form.comunion} onChange={handleChange} className="w-4 h-4 rounded text-amber-700 focus:ring-amber-400 border-amber-300" />
                1ra Comunión
              </label>
              <label className="flex items-center gap-2 text-sm text-amber-950 dark:text-amber-100 font-medium cursor-pointer">
                <input type="checkbox" name="matrimonio" checked={form.matrimonio} onChange={handleChange} className="w-4 h-4 rounded text-amber-700 focus:ring-amber-400 border-amber-300" />
                Matrimonio
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <SelectField label="Rol en Mesa" name="rol_en_mesa" value={form.rol_en_mesa} onChange={handleChange} options={ROLES_MESA} />
             <div>
               <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">No. Retiro</label>
               <div className="w-full border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-200">
                 {form.numero_retiro ? `Retiro #${form.numero_retiro}` : "Sin asignar"}
               </div>
               <p className="text-xs text-amber-500 mt-1">Definido en Configuración</p>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Field label="No. Mesa" name="numero_mesa" value={form.numero_mesa} onChange={handleChange} type="number" placeholder="Se asigna tras pago" />
             <Field label="No. Habitación" name="numero_habitacion" value={form.numero_habitacion} onChange={handleChange} type="number" placeholder="Se asigna tras pago" />
           </div>

          <SelectField label="Estado" name="estado" value={form.estado} onChange={handleChange} options={ESTADOS} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Talla de Camisa" name="talla_camisa" value={form.talla_camisa} onChange={handleChange} options={TALLAS} />
            <SelectField label="Tipo de Sangre" name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange} options={TIPOS_SANGRE} />
            <SelectField label="Condición Física" name="condicion_fisica" value={form.condicion_fisica} onChange={handleChange} options={CONDICION_FISICA} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Peso (kg)" name="peso_kg" value={form.peso_kg} onChange={handleChange} type="number" placeholder="Ej: 70" />
            <Field label="Estatura (cm)" name="talla_cm" value={form.talla_cm} onChange={handleChange} type="number" placeholder="Ej: 170" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Necesidades Médicas</label>
            <textarea
              name="necesidades_medicas"
              value={form.necesidades_medicas}
              onChange={handleChange}
              rows={2}
              placeholder="Alergias, condiciones médicas..."
              className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* === ASIGNACIÓN DE COMUNIDAD / RETIRO Y DESVINCULACIÓN === */}
          <div className="pt-2 border-t border-amber-100 dark:border-zinc-700">
            <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
              ⛪ Comunidad / Retiro Asignado
            </label>
            <div className="bg-amber-50/80 dark:bg-zinc-800 border border-amber-200 dark:border-zinc-700 p-3 rounded-xl space-y-1.5">
              <select
                name="equipo_id"
                value={form.equipo_id || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-amber-300 dark:border-zinc-600 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
              >
                <option value="">🚫 DESVINCULAR DE ESTA COMUNIDAD (Sacar del grupo)</option>
                {comunidades.map(c => (
                  <option key={c.id} value={c.id}>
                    ⛪ {c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-amber-800 dark:text-amber-300 italic">
                * Si eliges "DESVINCULAR", este caminante será retirado de esta comunidad y dejará de aparecer en este grupo/retiro.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Notas</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows={2}
              className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900 text-sm font-medium">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>

    </AnimatedModal>
    {showCodigo && (
      <CodigoAutorizacionModal
        titulo={`Autorizar cambio a ${form.estado}`}
        onClose={() => setShowCodigo(false)}
        onAceptar={(e) => { 
          if(e) { e.preventDefault(); e.stopPropagation(); }
          setShowCodigo(false); 
          guardarCaminante(); 
        }}
      />
    )}
    </>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">{label}</label>
      <MobileSelect
        name={name}
        value={value}
        onChange={(val) => onChange({ target: { name, value: val } })}
        options={options}
        placeholder="Seleccionar..."
        className="w-full border border-amber-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}