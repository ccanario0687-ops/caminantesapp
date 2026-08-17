import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import { Star, CheckCircle, Send, Heart, Sparkles, MessageSquare, ThumbsUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EvaluacionRetiro() {
  const queryParams = new URLSearchParams(window.location.search);
  const retiroIdParam = queryParams.get("retiro_id") || queryParams.get("id") || queryParams.get("comunidad_id");

  const [config, setConfig] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    rol: "Caminante",
    evaluacion_general: 5,
    evaluacion_charlas: 5,
    evaluacion_comida: 5,
    evaluacion_alojamiento: 5,
    evaluacion_servidores: 5,
    recomienda: "Sí, totalmente",
    testimonio: "",
    sugerencias: ""
  });

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs && cfgs.length > 0) {
        const match = cfgs.find(c => String(c.equipo_id) === String(retiroIdParam) || String(c.id) === String(retiroIdParam)) || cfgs[0];
        setConfig(match);
      }
    }).catch(() => {});
  }, [retiroIdParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        ...form,
        retiro_id: retiroIdParam || config?.equipo_id || "general",
        equipo_id: config?.equipo_id || null,
        created_at: new Date().toISOString()
      };

      if (base44.entities.EvaluacionRetiro?.create) {
        await base44.entities.EvaluacionRetiro.create(payload);
      } else {
        // Fallback a localStorage
        const locales = JSON.parse(localStorage.getItem("emaus_evaluaciones") || "[]");
        locales.push(payload);
        localStorage.setItem("emaus_evaluaciones", JSON.stringify(locales));
      }

      setEnviado(true);
      toast.success("¡Muchas gracias por tu evaluación!");
    } catch (err) {
      // Fallback seguro a localStorage si la entidad no está migrada aún en backend
      const locales = JSON.parse(localStorage.getItem("emaus_evaluaciones") || "[]");
      locales.push(form);
      localStorage.setItem("emaus_evaluaciones", JSON.stringify(locales));
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const eslogan = config?.eslogan || "Lucas 24, 13-35";

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-amber-200 animate-in fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-300 shadow-md">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-amber-950 mb-2">¡Gracias Hermano(a)!</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-4 font-medium">
            Tu testimonio y evaluación anónima han sido recibidos con mucho amor. Dios siga guiando tu caminar.
          </p>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-900 text-xs font-bold space-y-1">
            <p className="text-sm font-black">✝ {nombreRetiro}</p>
            <p className="text-amber-600 font-normal italic">{eslogan}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-10 px-4">
      <div className="max-w-2xl mx-auto mb-8 text-center">
        {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 rounded-full bg-white shadow-md border border-amber-200" />}
        <h1 className="text-3xl font-black text-amber-950 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>✝ {nombreRetiro}</h1>
        {config?.edicion && <p className="text-amber-700 font-bold text-sm">Retiro #{config.edicion}</p>}
        <p className="text-amber-600 text-xs mt-1 uppercase tracking-widest font-semibold">{eslogan}</p>

        <div className="mt-4 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-amber-200 shadow-sm text-left">
          <h2 className="text-sm font-black text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" /> Encuesta de Retroalimentación Anónima
          </h2>
          <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
            Tus respuestas son totalmente anónimas y nos ayudan a mejorar la organización de los próximos retiros de Emaús.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        
        {/* ROL EN EL RETIRO */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200 space-y-3">
          <label className="block text-xs font-black uppercase text-amber-900 tracking-wider">¿Cuál fue tu rol en este retiro?</label>
          <div className="grid grid-cols-2 gap-3">
            {["Caminante", "Servidor"].map(r => (
              <button
                type="button"
                key={r}
                onClick={() => setForm(f => ({ ...f, rol: r }))}
                className={`py-3 rounded-xl text-xs font-black transition border shadow-xs ${
                  form.rol === r
                    ? "bg-amber-900 text-white border-amber-900 shadow-md"
                    : "bg-amber-50/50 text-amber-900 border-amber-200 hover:bg-amber-100"
                }`}
              >
                {r === "Caminante" ? "🚶 Caminante" : "🕊️ Servidor"}
              </button>
            ))}
          </div>
        </div>

        {/* CALIFICACIONES CON ESTRELLAS */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200 space-y-5">
          <h3 className="text-sm font-black text-amber-950 border-b border-amber-100 pb-2">Evaluación por Áreas</h3>
          
          <RatingStarItem
            titulo="1. Experiencia General del Retiro"
            valor={form.evaluacion_general}
            onChange={v => setForm(f => ({ ...f, evaluacion_general: v }))}
          />

          <RatingStarItem
            titulo="2. Charlas y Momentos Espirituales"
            valor={form.evaluacion_charlas}
            onChange={v => setForm(f => ({ ...f, evaluacion_charlas: v }))}
          />

          <RatingStarItem
            titulo="3. Alimentos, Comida y Atención de Cocina"
            valor={form.evaluacion_comida}
            onChange={v => setForm(f => ({ ...f, evaluacion_comida: v }))}
          />

          <RatingStarItem
            titulo="4. Alojamiento e Instalaciones"
            valor={form.evaluacion_alojamiento}
            onChange={v => setForm(f => ({ ...f, evaluacion_alojamiento: v }))}
          />

          <RatingStarItem
            titulo="5. Trato y Atención de los Servidores"
            valor={form.evaluacion_servidores}
            onChange={v => setForm(f => ({ ...f, evaluacion_servidores: v }))}
          />
        </div>

        {/* PREGUNTA DE RECOMENDACIÓN */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200 space-y-3">
          <label className="block text-xs font-black uppercase text-amber-900 tracking-wider">
            ¿Recomendarías vivir este retiro a un hermano o amigo?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["Sí, totalmente", "Quizás", "No"].map(op => (
              <button
                type="button"
                key={op}
                onClick={() => setForm(f => ({ ...f, recomienda: op }))}
                className={`py-2.5 px-2 rounded-xl text-xs font-black transition border ${
                  form.recomienda === op
                    ? "bg-green-700 text-white border-green-700 shadow-md"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-amber-50"
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* TESTIMONIO Y SUGERENCIAS */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-amber-900 tracking-wider mb-1">
              Testimonio o Mensaje de Agradecimiento (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="¿Qué significó este retiro en tu vida espiritualmente?..."
              value={form.testimonio}
              onChange={e => setForm(f => ({ ...f, testimonio: e.target.value }))}
              className="w-full border border-amber-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-amber-900 tracking-wider mb-1">
              Sugerencias de Mejora (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="¿Algún aspecto que sugieres mejorar para el próximo retiro?..."
              value={form.sugerencias}
              onChange={e => setForm(f => ({ ...f, sugerencias: e.target.value }))}
              className="w-full border border-amber-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* BOTÓN SUBMIT */}
        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-amber-900 hover:bg-amber-950 text-white py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {enviando ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar Evaluación Anónima</>}
        </button>
      </form>
    </div>
  );
}

function RatingStarItem({ titulo, valor, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-800">{titulo}</label>
        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
          {valor} / 5 ⭐
        </span>
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            type="button"
            key={star}
            onClick={() => onChange(star)}
            className="p-1 hover:scale-125 transition-transform"
          >
            <Star
              className={`w-7 h-7 ${
                star <= valor
                  ? "fill-amber-400 text-amber-500"
                  : "text-gray-300 fill-gray-100"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
