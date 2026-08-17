import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import { Star, MessageSquare, ThumbsUp, Heart, Sparkles, PieChart, BarChart3, Users, Award, Download, Printer } from "lucide-react";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import MobileTopBar from "@/components/MobileTopBar";
import SelectorComunidad from "@/components/SelectorComunidad";

export default function ReporteEvaluaciones() {
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  useEffect(() => {
    const cargarEvaluaciones = async () => {
      setLoading(true);
      try {
        let list = [];
        if (base44.entities.EvaluacionRetiro?.list) {
          list = await base44.entities.EvaluacionRetiro.list();
        }
        if (!list || list.length === 0) {
          const raw = localStorage.getItem("emaus_evaluaciones");
          list = raw ? JSON.parse(raw) : [];
        }

        const filtradas = (list || []).filter(e => 
          !equipoIdActivo || 
          e.equipo_id === equipoIdActivo || 
          e.retiro_id === equipoIdActivo
        );

        setEvaluaciones(filtradas);
      } catch (err) {
        const raw = localStorage.getItem("emaus_evaluaciones");
        setEvaluaciones(raw ? JSON.parse(raw) : []);
      } finally {
        setLoading(false);
      }
    };

    cargarEvaluaciones();
  }, [equipoIdActivo]);

  const total = evaluaciones.length;

  const promedio = (key) => {
    if (total === 0) return 0;
    const suma = evaluaciones.reduce((acc, e) => acc + Number(e[key] || 5), 0);
    return (suma / total).toFixed(1);
  };

  const promGeneral = promedio("evaluacion_general");
  const promCharlas = promedio("evaluacion_charlas");
  const promComida = promedio("evaluacion_comida");
  const promAlojamiento = promedio("evaluacion_alojamiento");
  const promServidores = promedio("evaluacion_servidores");

  const porcentajeRecomienda = total > 0
    ? Math.round((evaluaciones.filter(e => e.recomienda === "Sí, totalmente").length / total) * 100)
    : 100;

  const testimonios = evaluaciones.filter(e => e.testimonio && e.testimonio.trim() !== "");
  const sugerencias = evaluaciones.filter(e => e.sugerencias && e.sugerencias.trim() !== "");

  return (
    <div className="pb-12 font-sans text-slate-800">
      <MobileTopBar title="Reporte de Evaluaciones" />

      <div className="mb-4">
        <SelectorComunidad />
      </div>

      {/* HEADER DE METRICAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-amber-950 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-700" /> Reporte Gráfico de Satisfacción Post-Retiro
          </h1>
          <p className="text-xs text-amber-700 font-medium">
            Resultados anónimos evaluados por caminantes y servidores para {comunidadActual?.nombre || "la comunidad activa"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-3.5 py-1.5 rounded-full">
            📊 Total Evaluaciones: {total}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-amber-700 font-semibold">Cargando reporte...</div>
      ) : total === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-amber-200 text-center text-gray-500 shadow-sm">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-black text-amber-950">Aún no hay evaluaciones registradas</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Comparte el enlace del formulario de evaluación anónima con tus caminantes al finalizar el retiro para recibir su opinión.
          </p>
          <a
            href="/evaluacion"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 px-5 py-2.5 bg-amber-900 text-white font-black text-xs rounded-xl shadow-md hover:bg-amber-950 transition"
          >
            🔗 Ver Formulario Público de Evaluación
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TARJETAS KPI DE METRICAS PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-3xl p-5 shadow-xl border border-amber-800 relative overflow-hidden">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-200 block mb-1">Satisfacción General</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{promGeneral}</span>
                <span className="text-amber-300 text-sm font-bold">/ 5.0 ⭐</span>
              </div>
              <p className="text-[11px] text-amber-200 mt-2 font-medium">Promedio ponderado de experiencia</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 block mb-1">Recomendación (NPS)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-green-700">{porcentajeRecomienda}%</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">Recomiendan el retiro totalmente</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 block mb-1">Charlas & Espiritualidad</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-amber-900">{promCharlas}</span>
                <span className="text-amber-500 text-sm font-bold">/ 5.0 ⭐</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">Valoración de momentos espirituales</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 block mb-1">Servicio de la Hermandad</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-blue-900">{promServidores}</span>
                <span className="text-blue-500 text-sm font-bold">/ 5.0 ⭐</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">Calidad de servicio de los hermanos</p>
            </div>

          </div>

          {/* DESGLOSE GRÁFICO POR ÁREAS */}
          <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200 space-y-4">
            <h3 className="text-base font-black text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-3">
              <BarChart3 className="w-5 h-5 text-amber-700" /> Desglose Detallado por Áreas
            </h3>

            <div className="space-y-4">
              <BarraScore label="Experiencia General del Retiro" score={promGeneral} />
              <BarraScore label="Charlas y Contenido Espiritual" score={promCharlas} />
              <BarraScore label="Alimentos, Comida y Cocina" score={promComida} />
              <BarraScore label="Alojamiento e Instalaciones" score={promAlojamiento} />
              <BarraScore label="Trato y Atención de Servidores" score={promServidores} />
            </div>
          </div>

          {/* TESTIMONIOS ANÓNIMOS */}
          {testimonios.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200 space-y-4">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-3">
                <Heart className="w-5 h-5 text-red-500" /> Testimonios de Amor y Agradecimiento ({testimonios.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testimonios.map((t, idx) => (
                  <div key={idx} className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 relative">
                    <p className="text-xs text-amber-950 font-medium italic leading-relaxed">
                      "{t.testimonio}"
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-amber-700 border-t border-amber-200/60 pt-2">
                      <span>🕊️ {t.rol || "Caminante"} Anónimo</span>
                      <span>{t.evaluacion_general || 5} ⭐</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUGERENCIAS DE MEJORA */}
          {sugerencias.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200 space-y-4">
              <h3 className="text-base font-black text-amber-950 flex items-center gap-2 border-b border-amber-100 pb-3">
                <Sparkles className="w-5 h-5 text-amber-600" /> Sugerencias de Mejora ({sugerencias.length})
              </h3>

              <div className="space-y-3">
                {sugerencias.map((s, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs font-medium text-gray-800">
                    💡 "{s.sugerencias}"
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function BarraScore({ label, score }) {
  const pct = Math.round((Number(score) / 5) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-gray-800">{label}</span>
        <span className="text-amber-900 font-black">{score} / 5.0 ⭐</span>
      </div>
      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-200">
        <div
          className="bg-gradient-to-r from-amber-700 to-yellow-500 h-full rounded-full transition-all duration-700 shadow-xs"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
