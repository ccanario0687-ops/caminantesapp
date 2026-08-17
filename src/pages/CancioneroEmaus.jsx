import { useState, useEffect, useRef } from "react";
import { 
  Music, BookOpen, Search, Plus, Play, Pause, RotateCcw, 
  Eye, EyeOff, Sliders, ChevronRight, Sparkles, Heart, Cross, 
  Flame, Sun, Church, Volume2, ArrowUp, ArrowDown, Edit3, Trash2, X, Check, Copy, Share2
} from "lucide-react";
import { transponerTextoCancion } from "@/utils/chordTransposer";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";

const MOMENTOS = [
  "Todos",
  "Acogida y Bienvenida",
  "Charlas y Testimonios",
  "Cenas Temáticas y Palancas",
  "Hora Santa y Capilla",
  "Misa de Clausura",
  "Misal & Oraciones"
];

const CANCIONES_INICIALES = [
  {
    id: "emaus-01",
    titulo: "Caminante de Emaús",
    momento: "Charlas y Testimonios",
    tono_original: "Re",
    autor: "Pastoral de Emaús",
    contenido: `[Re]Por la calzada de Emaús
[Sim]un peregrino iba conmigo,
[Sol]no le conocí al caminar,
[La7]ahora sí en la fracción del pan.

[Re]Van tres días que murió
[Sim]el Nazareno en la cruz,
[Sol]las mujeres de mañana
[La7]nos dijeron que él vive.

[Re]¡Qué necios y tardos de corazón!
[Sim]para entender lo que dijeron los profetas.
[Sol]¿No era necesario que sufriera
[La7]el Cristo para entrar en su gloria?

Coro:
[Re]¡Quédate con nosotros!
[Sim]la tarde está cayendo,
[Sol]quédate con nosotros,
[La7]Señor, que se hace noche. [Re]`
  },
  {
    id: "emaus-02",
    titulo: "Nadie Te Ama Como Yo",
    momento: "Hora Santa y Capilla",
    tono_original: "Do",
    autor: "Martín Valverde",
    contenido: `[Do]Cuánto he esperado este mo[Lam]mento,
cuánto he espe[Fa]rado que estuvieras a[Sol]quí.
[Do]Cuánto he esperado que me ha[Lam]blaras,
cuánto he espe[Fa]rado que vinieras a [Sol]mí.

Yo sé bien lo que has vi[Do]vido,
[Lam]yo sé bien por qué has llo[Fa]rado;
yo sé bien lo que has su[Sol]frido
pues de tu lado no me he ido.[Do]

Coro:
Pues nadie te [Lam]ama como yo,
[Fa]nadie te ama como [Sol]yo;
mira la [Do]cruz, esa es mi más grande pro[Lam]basa,
nadie te [Fa]ama como yo.[Sol]

Pues nadie te [Do]ama como yo,
[Lam]nadie te ama como [Sol]yo;
mira la [Do]cruz, fue por ti, fue porque te [Lam]amo,
nadie te [Fa]ama [Sol]como yo.[Do]`
  },
  {
    id: "emaus-03",
    titulo: "Pescador de Hombres",
    momento: "Misa de Clausura",
    tono_original: "Re",
    autor: "Cesáreo Gabaráin",
    contenido: `[Re]Tú has venido a la o[La7]rilla,
[Sim]no has buscado ni a sa[Sol]bios ni a ri[La7]cos;
[Re]tan sólo [La7]quieres que [Re]yo te [Sol]siga.[Re]

Coro:
[Sol]Señor, me has mirado a los [Re]ojos,
sonri[La7]endo has dicho mi [Re]nombre.[Re7]
[Sol]En la arena he dejado mi [Re]barca,
junto a [La7]ti buscaré otro [Re]mar.

[Re]Tú sabes bien lo que [La7]tengo,
[Sim]en mi barca no hay [Sol]oro ni es[La7]padas;
[Re]tan sólo [La7]redes y [Re]mi tra[Sol]bajo.[Re]`
  },
  {
    id: "emaus-04",
    titulo: "Sumérgeme",
    momento: "Hora Santa y Capilla",
    tono_original: "Do",
    autor: "Jesús Adrián Romero",
    contenido: `[Do]Cansado del ca[Mim]mino, sediento de [Lam]ti.
Un de[Fa]sierto he cruzado, sin [Rem]fuerzas he que[Sol]dado,
vengo a [Do]ti.

[Do]Luché como un sol[Mim]dado, y a veces ga[Lam]né,
pero hoy [Fa]vengo cansado, vengo a [Rem]ti rendido a tus [Sol]pies.

Coro:
Sumér[Do]geme en el río de tu espe[Mim]ranza,
necesito a[Lam]gua fresca para mi [Fa]alma.
Sumér[Do]geme en el fuego de tu es[Mim]píritu,
sumér[Fa]geme, [Sol]sumérgeme, Se[Do]ñor.`
  },
  {
    id: "emaus-05",
    titulo: "Jesús Amigo",
    momento: "Hora Santa y Capilla",
    tono_original: "Sol",
    autor: "Jésed",
    contenido: `[Sol]Hoy te quiero con[Do]tar, Jesús a[Sol]migo,
que contigo me [Re]siento tan fe[Sol]liz.
Ya no tengo te[Do]mor a nada a[Sol]hora,
porque sé que tú e[Re]stás dentro de [Sol]mí.

Coro:
[Sol]Gracias, Se[Do]ñor, por ser mi a[Sol]migo,
gracias por [Re]darme de tu [Sol]pan.
Gracias por [Do]esta bella ho[Sol]stia,
donde conmigo tú e[Re]stás. [Sol]`
  },
  {
    id: "emaus-06",
    titulo: "Jesucristo Me Dejó Inquieto",
    momento: "Acogida y Bienvenida",
    tono_original: "Mi",
    autor: "Cancionero Emaús",
    contenido: `[Mi]Jesucristo me dejó in[Si7]quieto,
su palabra me fascinó;
[Mi]su mensaje me llegó al cora[Si7]zón
y mi vida transfor[Mi]mó.

[Mi]Amar como él a[Si7]mó,
sentir como él sin[Mi]tió,
[Mi]ver como él mi[Si7]ró,
Jesús me ensha[Mi]ñó.`
  },
  {
    id: "emaus-07",
    titulo: "Resucitó",
    momento: "Misa de Clausura",
    tono_original: "Lam",
    autor: "Kiko Argüello",
    contenido: `[Lam]Resucitó, resu[Rem]citó,
resu[Lam]citó, a[Mi7]lelu[Lam]ya.

[Rem]Aleluya, a[Lam]leluya,
a[Mi7]leluya, resu[Lam]citó.`
  },
  {
    id: "emaus-08",
    titulo: "Lectura del Evangelio de Emaús (Lucas 24:13-35)",
    momento: "Misal & Oraciones",
    tono_original: "-",
    autor: "San Lucas Evangelista",
    contenido: `Aquel mismo día, dos de los discípulos iban caminando a una aldea llamada Emaús, distante unos doce kilómetros de Jerusalén. Iban conversando sobre todo lo que había sucedido.

Mientras conversaban y discutían, Jesús en persona se les acercó y se puso a caminar con ellos. Pero sus ojos estaban encandilados y no podían reconocerlo.

Él les dijo: «¿De qué van conversando por el camino?» Ellos se detuvieron, con el rostro triste...

Al llegar cerca de la aldea adonde iban, él hizo ademán de seguir adelante. Pero ellos le insistieron diciendo: «Quédate con nosotros, porque atardece y el día va de caída.»

Y entró para quedarse con ellos. Sentado a la mesa con ellos, tomó el pan, pronunció la bendición, lo partió y se lo dio. A ellos se les abrieron los ojos y lo reconocieron.`
  }
];

export default function CancioneroEmaus() {
  const [canciones, setCanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [momentoFiltro, setMomentoFiltro] = useState("Todos");
  const [cancionSeleccionada, setCancionSeleccionada] = useState(null);

  // Estados de Ajuste del Músico
  const [semitonos, setSemitonos] = useState(0);
  const [mostrarAcordes, setMostrarAcordes] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [velocidadScroll, setVelocidadScroll] = useState(1); // 1 = Lento, 2 = Medio, 3 = Rápido
  const [fontSize, setFontSize] = useState(16); // px

  // Estado del Modal de Nueva/Editar Canción
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formCancion, setFormCancion] = useState({
    titulo: "", momento: "Acogida y Bienvenida", tono_original: "Do", autor: "", contenido: ""
  });

  const cancionContainerRef = useRef(null);

  // Cargar Canciones desde DB y LocalStorage
  useEffect(() => {
    cargarCanciones();
  }, []);

  const cargarCanciones = async () => {
    setLoading(true);
    try {
      const dbCanciones = await base44.entities.Cancion?.list().catch(() => []) || [];
      const localCancionesStr = localStorage.getItem("emaus_cancionero_custom");
      const localCanciones = localCancionesStr ? JSON.parse(localCancionesStr) : [];

      // Fusionar canciones iniciales con DB y local
      const unificadas = [...CANCIONES_INICIALES];

      [...dbCanciones, ...localCanciones].forEach(c => {
        if (!unificadas.some(x => x.id === c.id || x.titulo.toLowerCase() === c.titulo.toLowerCase())) {
          unificadas.push(c);
        }
      });

      setCanciones(unificadas);
      if (unificadas.length > 0 && !cancionSeleccionada) {
        setCancionSeleccionada(unificadas[0]);
      }
    } catch (e) {
      console.error("Error al cargar canciones:", e);
      setCanciones(CANCIONES_INICIALES);
      setCancionSeleccionada(CANCIONES_INICIALES[0]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll loop para la lectura en vivo de músicos
  useEffect(() => {
    let interval = null;
    if (autoScroll && cancionContainerRef.current) {
      interval = setInterval(() => {
        if (cancionContainerRef.current) {
          cancionContainerRef.current.scrollTop += velocidadScroll;
        }
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [autoScroll, velocidadScroll]);

  // Filtrado de canciones por búsqueda y momento
  const cancionesFiltradas = canciones.filter(c => {
    const coincideMomento = momentoFiltro === "Todos" || c.momento === momentoFiltro;
    const q = busqueda.toLowerCase().trim();
    const coincideTexto = !q || c.titulo.toLowerCase().includes(q) || c.contenido.toLowerCase().includes(q);
    return coincideMomento && coincideTexto;
  });

  const handleGuardarCancion = async (e) => {
    e.preventDefault();
    if (!formCancion.titulo || !formCancion.contenido) {
      toast.error("Por favor completa el título y el contenido de la canción.");
      return;
    }

    try {
      const nueva = {
        id: editandoId || `custom-${Date.now()}`,
        ...formCancion
      };

      // Guardar en DB si está disponible
      await base44.entities.Cancion?.create(nueva).catch(() => null);

      // Guardar en localStorage
      const prevLocal = JSON.parse(localStorage.getItem("emaus_cancionero_custom") || "[]");
      const filtradoLocal = prevLocal.filter(x => x.id !== nueva.id);
      localStorage.setItem("emaus_cancionero_custom", JSON.stringify([...filtradoLocal, nueva]));

      toast.success(editandoId ? "Canción actualizada con éxito." : "Nueva canción agregada al Cancionero.");
      setModalAbierto(false);
      setEditandoId(null);
      setFormCancion({ titulo: "", momento: "Acogida y Bienvenida", tono_original: "Do", autor: "", contenido: "" });
      
      cargarCanciones();
      setCancionSeleccionada(nueva);
    } catch (err) {
      console.error("Error guardando canción:", err);
      toast.error("Error al guardar la canción.");
    }
  };

  const handleAbrirEditar = (cancion) => {
    setFormCancion({
      titulo: cancion.titulo,
      momento: cancion.momento || "Acogida y Bienvenida",
      tono_original: cancion.tono_original || "Do",
      autor: cancion.autor || "",
      contenido: cancion.contenido || ""
    });
    setEditandoId(cancion.id);
    setModalAbierto(true);
  };

  // Formatear texto para renderizado con o sin acordes
  const renderizarTextoMusica = () => {
    if (!cancionSeleccionada) return null;
    let texto = cancionSeleccionada.contenido || "";

    // 1. Transponer si hay semitonos aplicados
    if (semitonos !== 0) {
      texto = transponerTextoCancion(texto, semitonos);
    }

    // 2. Si no se desean mostrar acordes, limpiar corchetes [Acorde]
    if (!mostrarAcordes) {
      texto = texto.replace(/\[[^\]]+\]/g, "");
    }

    // Convertir marcas de corchetes en badges dorados de acordes
    const partes = texto.split(/(\[[^\]]+\])/g);

    return partes.map((parte, idx) => {
      if (parte.startsWith("[") && parte.endsWith("]")) {
        const acordeLimpio = parte.slice(1, -1);
        return (
          <span 
            key={idx}
            className="inline-block bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/40 font-mono text-xs mx-0.5 shadow-2xs select-none"
          >
            {acordeLimpio}
          </span>
        );
      }
      return <span key={idx}>{parte}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-4">
      
      {/* ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shrink-0">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Cancionero & Misal Digital <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-amber-200/80 font-medium">
              Acordes, transposición en tiempo real y misal litúrgico para el equipo de música
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditandoId(null);
            setFormCancion({ titulo: "", momento: "Acogida y Bienvenida", tono_original: "Do", autor: "", contenido: "" });
            setModalAbierto(true);
          }}
          className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Agregar Canción
        </button>
      </div>

      {/* BARRA DE FILTROS POR MOMENTO DEL RETIRO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {MOMENTOS.map((mom) => (
          <button
            key={mom}
            onClick={() => setMomentoFiltro(mom)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
              momentoFiltro === mom 
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105" 
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {mom === "Todos" ? "🎶 Todos los Momentos" : mom}
          </button>
        ))}
      </div>

      {/* CONTENIDO PRINCIPAL: LISTA LATERAL Y LECTOR DE MÚSICA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* LISTADO DE CANCIONES (COL 4) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3 max-h-[70vh] lg:max-h-[82vh] overflow-hidden shadow-xl">
          
          {/* BUSCADOR */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por título o letra..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* LISTA CON SCROLL */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {cancionesFiltradas.length > 0 ? (
              cancionesFiltradas.map((c) => {
                const seleccionada = cancionSeleccionada?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCancionSeleccionada(c);
                      setSemitonos(0);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      seleccionada 
                        ? "bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/60 text-white shadow-md" 
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs text-amber-200 truncate">{c.titulo}</h3>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {c.momento} {c.tono_original && `• Tono: ${c.tono_original}`}
                      </p>
                    </div>
                    {seleccionada && <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs font-medium">
                No se encontraron canciones en este momento.
              </div>
            )}
          </div>

        </div>

        {/* LECTOR E INTERFAZ DE MÚSICO Y ASAMBLEA (COL 8) */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-amber-500/20 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-2xl relative min-h-[500px]">
          
          {cancionSeleccionada ? (
            <>
              {/* BARRA DE HERRAMIENTAS TÁCTICAS PARA MÚSICOS */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
                
                {/* 1. Transposición de Acordes */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase px-1">Tono:</span>
                  <button
                    onClick={() => setSemitonos(prev => prev - 1)}
                    className="p-1 rounded hover:bg-slate-800 text-amber-400 font-extrabold cursor-pointer"
                    title="Bajar 1 Semitono"
                  >
                    -1
                  </button>
                  <span className="font-mono font-black text-amber-300 px-1 text-xs">
                    {semitonos === 0 ? "Original" : `${semitonos > 0 ? `+${semitonos}` : semitonos} semit.`}
                  </span>
                  <button
                    onClick={() => setSemitonos(prev => prev + 1)}
                    className="p-1 rounded hover:bg-slate-800 text-amber-400 font-extrabold cursor-pointer"
                    title="Subir 1 Semitono"
                  >
                    +1
                  </button>
                  {semitonos !== 0 && (
                    <button 
                      onClick={() => setSemitonos(0)} 
                      className="p-1 text-slate-500 hover:text-white"
                      title="Restablecer Tono"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 2. Alternar Acordes / Solo Letra */}
                <button
                  onClick={() => setMostrarAcordes(!mostrarAcordes)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border transition cursor-pointer text-xs ${
                    mostrarAcordes 
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/40" 
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {mostrarAcordes ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  {mostrarAcordes ? "Con Acordes" : "Solo Letra"}
                </button>

                {/* 3. Auto-Scroll Hands-Free */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 cursor-pointer ${
                      autoScroll ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>Auto-Scroll</span>
                  </button>

                  <select
                    value={velocidadScroll}
                    onChange={(e) => setVelocidadScroll(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-amber-300 font-mono focus:outline-none"
                  >
                    <option value={1}>Lento</option>
                    <option value={2}>Medio</option>
                    <option value={3}>Rápido</option>
                  </select>
                </div>

                {/* 4. Tamaño de Fuente */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                  >
                    A-
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(prev => Math.min(28, prev + 2))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
                  >
                    A+
                  </button>
                </div>

              </div>

              {/* ENCABEZADO DE LA CANCIÓN SELECCIONADA */}
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-amber-300 uppercase tracking-tight">
                    {cancionSeleccionada.titulo}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Momento: <span className="text-amber-200 font-bold">{cancionSeleccionada.momento}</span>
                    {cancionSeleccionada.autor && ` • Autor: ${cancionSeleccionada.autor}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAbrirEditar(cancionSeleccionada)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition cursor-pointer"
                    title="Editar Canción"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CONTENEDOR DE LECTURA DE CANCIÓN (CON AUTO-SCROLL) */}
              <div
                ref={cancionContainerRef}
                style={{ fontSize: `${fontSize}px` }}
                className="flex-1 overflow-y-auto max-h-[60vh] bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-text shadow-inner scroll-smooth"
              >
                {renderizarTextoMusica()}
              </div>

            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 p-8">
              <Music className="w-12 h-12 text-amber-500/40 mb-2" />
              <p className="text-sm font-bold text-slate-400">Selecciona una canción de la lista</p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL DE AGREGAR / EDITAR CANCIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95">
            
            <div className="bg-gradient-to-r from-amber-950 to-slate-900 p-4 flex items-center justify-between border-b border-amber-500/30">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                {editandoId ? "Editar Canción" : "Agregar Nueva Canción"}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarCancion} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Título de la Canción *</label>
                <input
                  type="text"
                  required
                  value={formCancion.titulo}
                  onChange={(e) => setFormCancion({ ...formCancion, titulo: e.target.value })}
                  placeholder="Ej: Jesucristo me dejó inquieto"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Momento del Retiro</label>
                  <select
                    value={formCancion.momento}
                    onChange={(e) => setFormCancion({ ...formCancion, momento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {MOMENTOS.filter(m => m !== "Todos").map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Tono Original</label>
                  <input
                    type="text"
                    value={formCancion.tono_original}
                    onChange={(e) => setFormCancion({ ...formCancion, tono_original: e.target.value })}
                    placeholder="Ej: Do, Re, Mim"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Letra y Acordes (Encierra los acordes entre corchetes [Do]) *</label>
                <textarea
                  required
                  rows={8}
                  value={formCancion.contenido}
                  onChange={(e) => setFormCancion({ ...formCancion, contenido: e.target.value })}
                  placeholder="Ej: [Do]Cuánto he esperado este mo[Lam]mento..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed shadow-inner"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Tip: Escribe los acordes entre corchetes como <code className="text-amber-300 font-bold">[Do]</code> o <code className="text-amber-300 font-bold">[Re]</code> para transposición automática.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-md transition"
                >
                  <Check className="w-4 h-4" /> Guardar Canción
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
