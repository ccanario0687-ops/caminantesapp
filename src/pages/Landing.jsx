import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Star, Loader2, ChevronDown } from "lucide-react";

const PLANES = [
  {
    id: "Gratuito",
    nombre: "Gratuito",
    precio: "RD$0",
    periodo: "siempre",
    descripcion: "Para comunidades pequeñas que están comenzando.",
    destacado: false,
    modulos: [
      "Registro de hasta 30 caminantes",
      "1 usuario administrador",
      "Caminantes y Servidores",
      "Reportes básicos",
      "Soporte por email",
    ],
    noIncluye: ["Finanzas", "Presupuesto", "Distribución automática", "Múltiples usuarios"],
  },
  {
    id: "Básico",
    nombre: "Básico",
    precio: "RD$1,500",
    periodo: "/ mes",
    descripcion: "Para hermandades activas con retiros regulares.",
    destacado: true,
    modulos: [
      "Caminantes ilimitados",
      "Hasta 5 usuarios",
      "Todos los módulos del plan Gratuito",
      "Finanzas y Presupuesto",
      "Distribución de mesas y habitaciones",
      "Impresiones y gafetes",
      "Programación de actividades",
      "Soporte prioritario",
    ],
    noIncluye: ["Múltiples equipos/parroquias", "API access"],
  },
  {
    id: "Premium",
    nombre: "Premium",
    precio: "RD$3,500",
    periodo: "/ mes",
    descripcion: "Para diócesis o múltiples comunidades.",
    destacado: false,
    modulos: [
      "Todo lo del plan Básico",
      "Usuarios ilimitados",
      "Múltiples equipos/parroquias",
      "Gestión de suplidores",
      "Biblioteca digital",
      "Historial de retiros",
      "Control de entrada",
      "Soporte dedicado 24/7",
    ],
    noIncluye: [],
  },
];

const FAQS = [
  { q: "¿Puedo cambiar de plan después?", a: "Sí, puedes actualizar o bajar tu plan en cualquier momento. Los cambios aplican al siguiente ciclo de facturación." },
  { q: "¿Qué pasa con mis datos si cancelo?", a: "Tus datos se conservan por 90 días después de cancelar. Puedes exportarlos en cualquier momento." },
  { q: "¿El plan Gratuito tiene límite de tiempo?", a: "No, el plan Gratuito es permanente. Solo tiene límite en la cantidad de caminantes (30) y usuarios (1)." },
  { q: "¿Ofrecen descuento para instituciones religiosas?", a: "Sí, contáctanos y evaluamos descuentos especiales para diócesis y parroquias sin fines de lucro." },
];

const PORTADA_DEFAULTS = {
  titulo: "Hermandad de Emaús",
  subtitulo: "Lucas 24, 13-35",
  versiculo: "¿No ardía nuestro corazón mientras nos hablaba en el camino y nos explicaba las Escrituras?",
  versiculo_referencia: "Lucas 24, 32",
  foto_fondo_url: "",
  foto_principal_url: "https://images.unsplash.com/photo-1548625149-720fb8b2e8f4?w=600&q=80",
  color_fondo_inicio: "#5c1a00",
  color_fondo_medio: "#8B1a1a",
  color_fondo_fin: "#b8860b",
  color_titulo: "#ffffff",
  color_subtitulo: "#fcd34d",
  color_boton: "#f59e0b",
  texto_boton: "Ingresar al Sistema",
  mostrar_imagen_circular: true,
};

export default function Landing() {
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [form, setForm] = useState({ nombre_comunidad: "", nombre_contacto: "", email: "", telefono: "", pais: "República Dominicana", ciudad: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errores, setErrores] = useState({});
  const [faqAbierto, setFaqAbierto] = useState(null);
  const [portada, setPortada] = useState(PORTADA_DEFAULTS);

  useEffect(() => {
    base44.entities.ConfigPortada.list()
      .then(data => { if (data?.length > 0) setPortada({ ...PORTADA_DEFAULTS, ...data[0] }); })
      .catch(() => {});
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrores(e => ({ ...e, [k]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre_comunidad.trim()) e.nombre_comunidad = "Requerido";
    if (!form.nombre_contacto.trim()) e.nombre_contacto = "Requerido";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Email inválido";
    return e;
  };

  const [errorEnvio, setErrorEnvio] = useState(null);

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setErrorEnvio(null);
    const errs = validar();
    if (Object.keys(errs).length > 0) { setErrores(errs); return; }
    setEnviando(true);
    try {
      const res = await base44.functions.invoke("solicitudAccesoPublica", {
        ...form,
        plan_solicitado: planSeleccionado || "Gratuito",
      });
      if (res?.data?.ok) {
        setEnviado(true);
      } else if (res?.data?.duplicado) {
        setErrorEnvio(res.data.mensaje || "Ya existe una solicitud con este correo.");
      } else {
        setErrorEnvio(res?.data?.error || "Ocurrió un error al enviar la solicitud.");
      }
    } catch (err) {
      setErrorEnvio(err?.message || "Ocurrió un error al enviar la solicitud.");
    }
    setEnviando(false);
  };

  const inp = "w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";
  const lbl = "block text-sm font-semibold text-amber-800 mb-1";

  return (
    <div className="min-h-screen bg-white">
      {/* PORTADA (igual a la portada de Emaús) */}
      {(() => {
        const bgStyle = portada.foto_fondo_url
          ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${portada.foto_fondo_url})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: `linear-gradient(160deg, ${portada.color_fondo_inicio} 0%, ${portada.color_fondo_medio} 40%, ${portada.color_fondo_fin} 100%)` };
        return (
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center" style={bgStyle}>
            <div className="w-full max-w-2xl">
              {portada.mostrar_imagen_circular !== false && portada.foto_principal_url && (
                <div className="mb-6 relative">
                  <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-amber-300 shadow-2xl mx-auto">
                    <img src={portada.foto_principal_url} alt="Imagen principal" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">✝ Emaús</div>
                </div>
              )}
              <h1 className="text-3xl sm:text-5xl font-bold mb-1 drop-shadow-lg" style={{ fontFamily: "Georgia, serif", color: portada.color_titulo }}>
                {portada.titulo}
              </h1>
              <p className="tracking-widest uppercase text-xs mb-4" style={{ color: portada.color_subtitulo }}>
                {portada.subtitulo}
              </p>
              {portada.versiculo && (
                <div className="bg-white/10 border border-amber-300/40 rounded-2xl px-6 py-4 max-w-lg mx-auto mb-6">
                  <p className="text-amber-100 text-sm italic leading-relaxed">"{portada.versiculo}"</p>
                  {portada.versiculo_referencia && <p className="text-amber-400 text-xs mt-2">— {portada.versiculo_referencia}</p>}
                </div>
              )}
              <p className="text-white/90 text-base max-w-xl mx-auto mb-8">
                Sistema completo para administrar retiros Emaús — caminantes, servidores, finanzas, impresiones y mucho más. Diseñado para hermandades de toda Latinoamérica.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => document.getElementById("planes").scrollIntoView({ behavior: "smooth" })}
                  className="font-bold text-base px-8 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 text-white hover:opacity-90"
                  style={{ backgroundColor: portada.color_boton }}>
                  Ver Planes y Precios
                </button>
                <a href="/" className="bg-white/20 hover:bg-white/30 border border-white/40 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all flex items-center justify-center">
                  {portada.texto_boton}
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CARACTERÍSTICAS */}
      <div className="py-16 px-4 bg-amber-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-amber-900 text-center mb-2" style={{ fontFamily: "Georgia, serif" }}>Todo lo que necesitas para tu retiro</h2>
          <p className="text-amber-600 text-center mb-10 text-sm">Una plataforma completa, fácil de usar, pensada para hermandades Emaús</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "👥", titulo: "Caminantes", desc: "Registro completo con ficha, mesa, habitación y más" },
              { emoji: "🙏", titulo: "Servidores", desc: "Gestión de roles y equipos de trabajo" },
              { emoji: "💰", titulo: "Finanzas", desc: "Control de cuotas, gastos e ingresos" },
              { emoji: "🖨️", titulo: "Impresiones", desc: "Gafetes, tarjetas y distintivos listos para imprimir" },
              { emoji: "📅", titulo: "Programación", desc: "Agenda de actividades del retiro" },
              { emoji: "📊", titulo: "Reportes", desc: "Estadísticas y reportes detallados" },
              { emoji: "🏠", titulo: "Distribución", desc: "Asignación inteligente de mesas y habitaciones" },
              { emoji: "📚", titulo: "Biblioteca", desc: "Recursos digitales, canciones y materiales" },
            ].map(f => (
              <div key={f.titulo} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 text-center">
                <div className="text-3xl mb-2">{f.emoji}</div>
                <h3 className="font-bold text-amber-900 text-sm mb-1">{f.titulo}</h3>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLANES */}
      <div id="planes" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-amber-900 text-center mb-2" style={{ fontFamily: "Georgia, serif" }}>Planes y Precios</h2>
          <p className="text-amber-600 text-center mb-10 text-sm">Elige el plan que mejor se adapta a tu comunidad</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANES.map(plan => (
              <div key={plan.id}
                className={`rounded-2xl border-2 p-6 relative flex flex-col transition-all ${plan.destacado ? "border-amber-500 shadow-xl shadow-amber-100" : "border-amber-100 shadow-sm"}`}>
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Más Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-amber-900 mb-1">{plan.nombre}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-amber-800">{plan.precio}</span>
                    <span className="text-amber-500 text-sm">{plan.periodo}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{plan.descripcion}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.modulos.map(m => (
                    <li key={m} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {m}
                    </li>
                  ))}
                  {plan.noIncluye.map(m => (
                    <li key={m} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                      <span className="w-4 h-4 shrink-0 text-center">✗</span>
                      {m}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { setPlanSeleccionado(plan.id); document.getElementById("solicitud").scrollIntoView({ behavior: "smooth" }); }}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.destacado ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"}`}>
                  Solicitar {plan.nombre}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-12 px-4 bg-amber-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-amber-900 text-center mb-8" style={{ fontFamily: "Georgia, serif" }}>Preguntas Frecuentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}>
                  <span className="font-semibold text-amber-900 text-sm">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform ${faqAbierto === i ? "rotate-180" : ""}`} />
                </button>
                {faqAbierto === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FORMULARIO DE SOLICITUD */}
      <div id="solicitud" className="py-16 px-4">
        <div className="max-w-xl mx-auto">
          {enviado ? (
            <div className="text-center bg-green-50 border border-green-200 rounded-2xl p-10">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-800 mb-2">¡Solicitud Enviada!</h2>
              <p className="text-green-700 mb-4">Hemos recibido tu solicitud para el plan <strong>{planSeleccionado || "Gratuito"}</strong>. Nos pondremos en contacto contigo pronto.</p>
              <button onClick={() => { setEnviado(false); setForm({ nombre_comunidad: "", nombre_contacto: "", email: "", telefono: "", pais: "República Dominicana", ciudad: "", mensaje: "" }); }}
                className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-amber-700">
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-amber-900 text-center mb-2" style={{ fontFamily: "Georgia, serif" }}>Solicita Acceso</h2>
              <p className="text-amber-600 text-center mb-8 text-sm">
                {planSeleccionado ? `Plan seleccionado: ${planSeleccionado}` : "Completa el formulario y te contactaremos"}
              </p>
              <form onSubmit={handleSolicitar} className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm space-y-4">
                {/* Selector de plan */}
                <div>
                  <label className={lbl}>Plan de interés</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLANES.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => setPlanSeleccionado(p.id)}
                        className={`py-2 rounded-lg border text-sm font-semibold transition-all ${planSeleccionado === p.id ? "bg-amber-700 text-white border-amber-700" : "bg-white border-amber-200 text-amber-800 hover:border-amber-400"}`}>
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={lbl}>Nombre de la comunidad / hermandad *</label>
                    <input className={`${inp} ${errores.nombre_comunidad ? "border-red-400" : ""}`}
                      value={form.nombre_comunidad} onChange={e => set("nombre_comunidad", e.target.value)}
                      placeholder="Ej: Hermandad Emaús Santiago" />
                    {errores.nombre_comunidad && <p className="text-red-500 text-xs mt-1">{errores.nombre_comunidad}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Nombre del coordinador *</label>
                    <input className={`${inp} ${errores.nombre_contacto ? "border-red-400" : ""}`}
                      value={form.nombre_contacto} onChange={e => set("nombre_contacto", e.target.value)} />
                    {errores.nombre_contacto && <p className="text-red-500 text-xs mt-1">{errores.nombre_contacto}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Email *</label>
                    <input type="email" className={`${inp} ${errores.email ? "border-red-400" : ""}`}
                      value={form.email} onChange={e => set("email", e.target.value)} />
                    {errores.email && <p className="text-red-500 text-xs mt-1">{errores.email}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Teléfono</label>
                    <input className={inp} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="809-000-0000" />
                  </div>
                  <div>
                    <label className={lbl}>País</label>
                    <input className={inp} value={form.pais} onChange={e => set("pais", e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={lbl}>Mensaje (opcional)</label>
                    <textarea className={inp} rows={2} value={form.mensaje} onChange={e => set("mensaje", e.target.value)}
                      placeholder="Cuéntanos sobre tu comunidad..." />
                  </div>
                </div>
                {errorEnvio && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center">
                    ⚠️ {errorEnvio}
                  </div>
                )}
                <button type="submit" disabled={enviando}
                  className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3.5 rounded-xl font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {enviando ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : "Enviar Solicitud de Acceso"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center py-8 px-4 border-t border-amber-100">
        <p className="text-amber-700 font-semibold text-sm">Sistema de Gestión Emaús</p>
        <p className="text-gray-400 text-xs mt-1">Lucas 24, 13-35 · Para hermandades de toda Latinoamérica</p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/" className="text-amber-600 hover:underline text-xs font-medium">Ingresar al Sistema</a>
          <a href="/inscripcion" className="text-amber-600 hover:underline text-xs font-medium">Inscripción Retiro</a>
        </div>
      </div>
    </div>
  );
}