import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import confetti from "canvas-confetti";
import { 
  X, Cake, Send, Download, Copy, Printer, Sparkles, Heart, Church, 
  MessageCircle, Check, RefreshCw, Image as ImageIcon, Sliders, Palette, 
  Type, Move, ZoomIn, Eye, RotateCcw, Upload, Trash2 
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_LOGO_EMAUS = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";

// Fondos predefinidos Emaús
const FONDOS_PREDEFINIDOS = [
  { id: "jesus", nombre: "Rostro de Jesús", url: "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/ee196c230_jesus.jpg" },
  { id: "gold_sparks", nombre: "Destellos Dorados", url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80" },
  { id: "sunset", nombre: "Atardecer Místico", url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1000&q=80" },
  { id: "cross_sky", nombre: "Cielo & Luz", url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80" },
  { id: "flowers", nombre: "Flores Elegantes", url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1000&q=80" }
];

// Presets de degradados
const DEGRADADOS_PRESETS = [
  { id: "burgundy_gold", nombre: "Borgoña & Oro Emaús", css: "from-amber-950 via-red-950 to-amber-900", fromColor: "#450a0a", toColor: "#78350f" },
  { id: "mystic_purple", nombre: "Místico Noche", css: "from-slate-950 via-purple-950 to-slate-900", fromColor: "#020617", toColor: "#3b0764" },
  { id: "sunset_amber", nombre: "Atardecer Dorado", css: "from-amber-950 via-orange-950 to-red-950", fromColor: "#451a03", toColor: "#7f1d1d" },
  { id: "emerald_hope", nombre: "Verde Esperanza", css: "from-emerald-950 via-green-950 to-teal-950", fromColor: "#022c22", toColor: "#134e4a" },
  { id: "royal_blue", nombre: "Azul Celestial", css: "from-blue-950 via-indigo-950 to-slate-950", fromColor: "#172554", toColor: "#1e1b4b" }
];

// Citas bíblicas de cumpleaños
const CITAS_BIBLICAS = [
  { texto: "«El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti y tenga de ti misericordia.»", ref: "Números 6:24-25" },
  { texto: "«Este es el día que hizo el Señor; nos gozaremos y alegraremos en él.»", ref: "Salmo 118:24" },
  { texto: "«Porque yo sé los pensamientos que tengo acerca de vosotros, dice el Señor, pensamientos de paz y no de mal.»", ref: "Jeremías 29:11" },
  { texto: "«Doy gracias a mi Dios cada vez que me me acuerdo de ti, orando siempre con gozo.»", ref: "Filipenses 1:3-4" }
];

export default function ModalPostalCumpleanos({ persona, config, comunidadActual, onClose }) {
  const postalRef = useRef(null);
  const fileInputRef = useRef(null);
  const [descargando, setDescargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [tabActiva, setTabActiva] = useState("texto"); // 'texto', 'fondo', 'degradado', 'estilo'

  // Datos base
  const [nombrePersona, setNombrePersona] = useState(persona?.nombre || persona?.nombre_completo || "Hermano(a)");
  const [tipoPersona, setTipoPersona] = useState(persona?.tipo || persona?.tipo_registro || (persona?.rol ? "Servidor" : "Caminante"));
  const telefonoPersona = persona?.telefono ? String(persona.telefono).replace(/\D/g, "") : "";

  const nombreComunidad = 
    persona?.comunidad_nombre || 
    comunidadActual?.nombre || 
    config?.nombre_comunidad || 
    config?.nombre_retiro || 
    "Hermandad de Emaús";

  const logoEmausOriginal = 
    (config?.logo_url && config.logo_url.trim()) ? config.logo_url :
    (config?.logo_hombres_url && config.logo_hombres_url.trim()) ? config.logo_hombres_url :
    (config?.logo_mujeres_url && config.logo_mujeres_url.trim()) ? config.logo_mujeres_url :
    (comunidadActual?.logo_url && comunidadActual.logo_url.trim()) ? comunidadActual.logo_url :
    DEFAULT_LOGO_EMAUS;

  // ESTADOS DEL EDITOR
  const [mensajePersonalizado, setMensajePersonalizado] = useState(
    `En este día bendito en que celebras el don de tu vida, la Hermandad de Emaús se une en oración para dar gracias a Dios por tu caminar. Que el Señor de la Misericordia y la Santísima Virgen María derramen sobre ti y tu familia abundante salud, paz, gozo y infinitas bendiciones en tu vida espiritual y personal. ¡Que cumplas muchos años más guiado por la luz del Resucitado!`
  );

  const [citaSeleccionada, setCitaSeleccionada] = useState(CITAS_BIBLICAS[0]);

  // FOTO DE FONDO Y AJUSTES
  const [fotoFondoUrl, setFotoFondoUrl] = useState(""); // URL personalizada o seleccionada
  const [posicionX, setPosicionX] = useState(50); // 0 a 100%
  const [posicionY, setPosicionY] = useState(50); // 0 a 100%
  const [zoomImagen, setZoomImagen] = useState(100); // 100 a 250%
  const [desenfoqueFondo, setDesenfoqueFondo] = useState(0); // 0 a 10px
  const [opacidadFoto, setOpacidadFoto] = useState(60); // 0 a 100%

  // DEGRADADO Y COLORES
  const [degradadoPreset, setDegradadoPreset] = useState(DEGRADADOS_PRESETS[0]);
  const [opacidadDegradado, setOpacidadDegradado] = useState(85); // 0 a 100%
  const [colorSolidoFondo, setColorSolidoFondo] = useState("#2a0800");

  // TIPOGRAFÍA Y ESTILO VISUAL
  const [familiaFuente, setFamiliaFuente] = useState("serif"); // 'serif', 'sans', 'cursive', 'cinzel'
  const [colorTextoTitulo, setColorTextoTitulo] = useState("dorado"); // 'dorado', 'blanco', 'rosa', 'ambar'
  const [estiloBorde, setEstiloBorde] = useState("doble_dorado"); // 'doble_dorado', 'neon', 'clasico', 'minimal'
  const [posicionLogo, setPosicionLogo] = useState("arriba"); // 'arriba', 'fondo', 'oculto'

  // Confetti al cargar
  useEffect(() => {
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  }, []);

  // Manejo de carga de foto personalizada por usuario
  const handleUploadFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFotoFondoUrl(evt.target.result);
      toast.success("Foto de fondo cargada exitosamente.");
    };
    reader.readAsDataURL(file);
  };

  // Formatear mensaje para WhatsApp
  const obtenerTextoWhatsApp = () => {
    return `🎂 *¡FELIZ CUMPLEAÑOS EN CRISTO!* 🎉\n\n` +
      `Querido(a) *${nombrePersona}* (${tipoPersona} de Emaús),\n\n` +
      `⛪ *${nombreComunidad}*\n\n` +
      `${mensajePersonalizado}\n\n` +
      `✝ *${citaSeleccionada.texto}* (${citaSeleccionada.ref})\n\n` +
      `🔥 *¡Jesucristo ha resucitado... En verdad ha resucitado!* ❤️`;
  };

  const handleEnviarWhatsApp = () => {
    const texto = encodeURIComponent(obtenerTextoWhatsApp());
    const targetUrl = telefonoPersona 
      ? `https://wa.me/${telefonoPersona.length === 10 ? '1' + telefonoPersona : telefonoPersona}?text=${texto}`
      : `https://wa.me/?text=${texto}`;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    toast.success("Abriendo WhatsApp para enviar la felicitación...");
  };

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(obtenerTextoWhatsApp());
    setCopiado(true);
    toast.success("Felicitación copiada al portapapeles");
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleDescargarImagen = async () => {
    if (!postalRef.current) return;
    setDescargando(true);
    try {
      const canvas = await html2canvas(postalRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: colorSolidoFondo
      });
      const link = document.createElement("a");
      link.download = `Postal_Cumpleanos_${nombrePersona.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("🎉 ¡Postal de Cumpleaños descargada exitosamente!");
    } catch (e) {
      toast.error("No se pudo generar la imagen de la postal.");
    } finally {
      setDescargando(false);
    }
  };

  // Restablecer valores de diseño
  const handleRestablecerDiseno = () => {
    setFotoFondoUrl("");
    setPosicionX(50);
    setPosicionY(50);
    setZoomImagen(100);
    setDesenfoqueFondo(0);
    setOpacidadFoto(60);
    setDegradadoPreset(DEGRADADOS_PRESETS[0]);
    setOpacidadDegradado(85);
    setFamiliaFuente("serif");
    setColorTextoTitulo("dorado");
    setEstiloBorde("doble_dorado");
    setPosicionLogo("arriba");
    toast.info("Diseño de tarjeta restablecido.");
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden text-white my-4 flex flex-col max-h-[94vh]">
        
        {/* CABECERA */}
        <div className="bg-gradient-to-r from-amber-950 via-red-950 to-amber-900 px-5 py-4 flex items-center justify-between border-b border-amber-500/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow">
              <Cake className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 font-black text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                  Estudio Editor de Tarjeta Emaús
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-0.5" style={{ fontFamily: "Georgia, serif" }}>
                Diseñar Tarjeta de Felicitación · {nombrePersona}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestablecerDiseno}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              title="Restablecer valores de diseño"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restablecer
            </button>

            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: ESTUDIO DE EDICIÓN Y PREVISUALIZACIÓN */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          
          {/* PANEL IZQUIERDO: HERRAMIENTAS Y PESTAÑAS DE EDICIÓN */}
          <div className="lg:col-span-6 flex flex-col bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            
            {/* BARRA DE PESTAÑAS */}
            <div className="grid grid-cols-4 bg-slate-900 border-b border-slate-800 p-1 text-xs font-bold">
              <button
                onClick={() => setTabActiva("texto")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
                  tabActiva === "texto" ? "bg-amber-600 text-slate-950 font-black shadow" : "text-slate-400 hover:text-amber-200"
                }`}
              >
                <Type className="w-3.5 h-3.5" /> Texto
              </button>
              <button
                onClick={() => setTabActiva("fondo")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
                  tabActiva === "fondo" ? "bg-amber-600 text-slate-950 font-black shadow" : "text-slate-400 hover:text-amber-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Foto
              </button>
              <button
                onClick={() => setTabActiva("degradado")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
                  tabActiva === "degradado" ? "bg-amber-600 text-slate-950 font-black shadow" : "text-slate-400 hover:text-amber-200"
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> Colores
              </button>
              <button
                onClick={() => setTabActiva("estilo")}
                className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
                  tabActiva === "estilo" ? "bg-amber-600 text-slate-950 font-black shadow" : "text-slate-400 hover:text-amber-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Estilos
              </button>
            </div>

            {/* CONTENIDO DE PESTAÑAS */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* PESTAÑA 1: MENSAJE Y TEXTOS */}
              {tabActiva === "texto" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-1">Nombre del Cumpleañero</label>
                    <input
                      type="text"
                      value={nombrePersona}
                      onChange={(e) => setNombrePersona(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-1">Rol / Subtítulo</label>
                    <input
                      type="text"
                      value={tipoPersona}
                      onChange={(e) => setTipoPersona(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-1">Mensaje de Felicitación</label>
                    <textarea
                      value={mensajePersonalizado}
                      onChange={(e) => setMensajePersonalizado(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-amber-100 leading-relaxed focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-1.5">Cita Bíblica de Bendición</label>
                    <div className="space-y-2">
                      {CITAS_BIBLICAS.map((c, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCitaSeleccionada(c)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            citaSeleccionada.ref === c.ref ? "bg-amber-950/80 border-amber-400 text-amber-200" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <p className="font-serif italic text-[11px]">{c.texto}</p>
                          <p className="text-[10px] font-bold text-amber-400 mt-0.5">{c.ref}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: FOTO DE FONDO Y CONTROLES DE POSICIÓN/ZOOM */}
              {tabActiva === "fondo" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Subir Foto de Fondo Personalizada</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        <Upload className="w-4 h-4" /> Subir Imagen desde Dispositivo
                      </button>
                      {fotoFondoUrl && (
                        <button
                          type="button"
                          onClick={() => setFotoFondoUrl("")}
                          className="p-2.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 rounded-xl transition"
                          title="Quitar foto de fondo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Temas y Fondos Predefinidos</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FONDOS_PREDEFINIDOS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFotoFondoUrl(f.url)}
                          className={`relative rounded-xl overflow-hidden border-2 h-16 transition group ${
                            fotoFondoUrl === f.url ? "border-amber-400 ring-2 ring-amber-500/50" : "border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                            <span className="text-[9px] font-black text-white truncate drop-shadow">{f.nombre}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {fotoFondoUrl && (
                    <div className="space-y-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                      <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block border-b border-slate-800 pb-1">
                        ⚙️ Ajustes de Imagen
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-300 font-bold block mb-1">Posición Horizontal (X: {posicionX}%)</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={posicionX}
                            onChange={(e) => setPosicionX(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-300 font-bold block mb-1">Posición Vertical (Y: {posicionY}%)</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={posicionY}
                            onChange={(e) => setPosicionY(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-300 font-bold block mb-1">Zoom / Escala ({zoomImagen}%)</label>
                          <input
                            type="range"
                            min="100"
                            max="250"
                            value={zoomImagen}
                            onChange={(e) => setZoomImagen(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-300 font-bold block mb-1">Visibilidad Foto ({opacidadFoto}%)</label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={opacidadFoto}
                            onChange={(e) => setOpacidadFoto(Number(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 3: DEGRADADOS Y COLORES */}
              {tabActiva === "degradado" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Paletas de Degradado Profesional</label>
                    <div className="space-y-2">
                      {DEGRADADOS_PRESETS.map((deg) => (
                        <button
                          key={deg.id}
                          type="button"
                          onClick={() => setDegradadoPreset(deg)}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                            degradadoPreset.id === deg.id ? "border-amber-400 ring-2 ring-amber-500/40 bg-slate-900" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                          }`}
                        >
                          <span className="font-bold text-slate-200">{deg.nombre}</span>
                          <div className={`w-20 h-5 rounded-lg bg-gradient-to-r ${deg.css} border border-white/20`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-300 font-bold block mb-1">Intensidad Capa Degradado ({opacidadDegradado}%)</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={opacidadDegradado}
                      onChange={(e) => setOpacidadDegradado(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: ESTILOS Y TIPOGRAFÍA */}
              {tabActiva === "estilo" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Estilo de Fuente</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFamiliaFuente("serif")}
                        className={`p-2.5 rounded-xl border font-serif text-sm transition ${
                          familiaFuente === "serif" ? "bg-amber-950 border-amber-400 text-amber-200" : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        Serif Clásica (Georgia)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFamiliaFuente("sans")}
                        className={`p-2.5 rounded-xl border font-sans text-xs font-bold transition ${
                          familiaFuente === "sans" ? "bg-amber-950 border-amber-400 text-amber-200" : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}
                      >
                        Moderna Bold (Sans)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Color del Título</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "dorado", label: "Dorado", css: "text-amber-300" },
                        { id: "blanco", label: "Blanco", css: "text-white" },
                        { id: "rosa", label: "Rosa", css: "text-pink-300" },
                        { id: "ambar", label: "Ámbar", css: "text-yellow-400" }
                      ].map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setColorTextoTitulo(col.id)}
                          className={`p-2 rounded-xl border font-black text-center text-xs transition ${
                            colorTextoTitulo === col.id ? "border-amber-400 bg-slate-900" : "border-slate-800 bg-slate-950"
                          } ${col.css}`}
                        >
                          {col.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2">Estilo de Borde Marco</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEstiloBorde("doble_dorado")}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          estiloBorde === "doble_dorado" ? "bg-amber-950 border-amber-400 text-amber-200" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        Doble Marco Dorado
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstiloBorde("neon")}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          estiloBorde === "neon" ? "bg-amber-950 border-amber-400 text-amber-200" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        Marco Neón Místico
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* BOTONES DE ACCIÓN PERMANENTES */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2 shrink-0">
              <button
                onClick={handleEnviarWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg transition border border-emerald-400/30 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>💬 Enviar Felicitación por WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDescargarImagen}
                  disabled={descargando}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition border border-amber-400/40 shadow cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{descargando ? "Generando..." : "Descargar Imagen HD"}</span>
                </button>

                <button
                  onClick={handleCopiarTexto}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 shadow cursor-pointer"
                >
                  {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiado ? "¡Copiado!" : "Copiar Texto"}</span>
                </button>
              </div>
            </div>

          </div>

          {/* PANEL DERECHO: PREVISUALIZACIÓN EN TIEMPO REAL DE LA TARJETA POSTAL */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            
            <div
              ref={postalRef}
              className={`w-full max-w-[460px] rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center select-none ${
                estiloBorde === "doble_dorado" ? "border-4 border-amber-400/90" : "border-2 border-amber-300"
              }`}
              style={{
                backgroundColor: colorSolidoFondo,
                boxShadow: estiloBorde === "neon" 
                  ? "0 0 35px rgba(245, 158, 11, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.8)"
                  : "0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.6)"
              }}
            >
              {/* FOTO DE FONDO AJUSTABLE */}
              {fotoFondoUrl && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={fotoFondoUrl}
                    alt="Fondo Postal"
                    className="w-full h-full object-cover transition-all"
                    style={{
                      objectPosition: `${posicionX}% ${posicionY}%`,
                      transform: `scale(${zoomImagen / 100})`,
                      filter: `blur(${desenfoqueFondo}px)`,
                      opacity: opacidadFoto / 100
                    }}
                  />
                </div>
              )}

              {/* CAPA DE DEGRADADO SOBREPUESTO */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${degradadoPreset.css} pointer-events-none`}
                style={{ opacity: opacidadDegradado / 100 }}
              />

              {/* CONTENIDO INTERIOR */}
              <div className="relative z-10">
                
                {/* LOGO EMAÚS */}
                {posicionLogo === "arriba" && (
                  <div className="flex flex-col items-center mb-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-400/90 p-1 bg-gradient-to-b from-amber-400/20 to-black/40 shadow-xl shadow-amber-500/20 flex items-center justify-center mb-1.5">
                      <img
                        src={logoEmausOriginal}
                        alt="Logo Emaús"
                        className="w-full h-full object-contain rounded-full bg-white/10 p-0.5"
                        onError={(e) => { e.target.src = DEFAULT_LOGO_EMAUS; }}
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 drop-shadow">
                      HERMANDAD DE EMAÚS
                    </span>
                    <span className="text-xs font-semibold text-amber-200/90 mt-0.5">
                      ⛪ {nombreComunidad}
                    </span>
                  </div>
                )}

                {/* TÍTULO PRINCIPAL */}
                <div className="my-3">
                  <h3
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      colorTextoTitulo === "blanco" ? "text-white" :
                      colorTextoTitulo === "rosa" ? "text-pink-300" :
                      colorTextoTitulo === "ambar" ? "text-yellow-300" :
                      "text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400"
                    }`}
                    style={{ fontFamily: familiaFuente === "serif" ? "Georgia, serif" : "sans-serif" }}
                  >
                    ¡Feliz Cumpleaños! 🎉
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-200/90 mt-1">
                    Bendiciones en tu día especial
                  </p>
                </div>

                {/* TARJETA DEL CUMPLEAÑERO */}
                <div className="my-3 bg-gradient-to-r from-amber-900/60 via-red-900/60 to-amber-900/60 border border-amber-400/40 rounded-2xl p-3.5 shadow-lg backdrop-blur-md">
                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    {nombrePersona}
                  </h4>
                  <span className="inline-block mt-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] px-3 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider">
                    🎂 {tipoPersona} de Emaús
                  </span>
                </div>

                {/* MENSAJE PERSONALIZADO */}
                <div className="my-3 bg-black/45 backdrop-blur-md border border-amber-400/30 rounded-2xl p-4 sm:p-5 shadow-inner">
                  <p className={`text-xs sm:text-sm text-amber-100 leading-relaxed italic text-center drop-shadow-sm ${familiaFuente === 'serif' ? 'font-serif' : 'font-sans'}`}>
                    "{mensajePersonalizado}"
                  </p>
                </div>

                {/* CITA BÍBLICA Y LEMA */}
                <div className="mt-3 pt-3 border-t border-amber-400/30 text-[11px] text-amber-200/90 space-y-1 font-serif">
                  <p className="italic">
                    {citaSeleccionada.texto}
                  </p>
                  <p className="font-bold text-amber-400 text-[10px] uppercase tracking-wider">
                    — {citaSeleccionada.ref}
                  </p>
                  <p className="text-xs font-black text-yellow-300 tracking-widest uppercase mt-2 pt-1 border-t border-amber-500/20">
                    ✝ ¡Jesucristo ha resucitado... En verdad ha resucitado! 🔥
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
