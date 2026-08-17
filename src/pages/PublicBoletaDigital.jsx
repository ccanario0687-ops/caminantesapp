import { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { 
  QrCode, Search, Download, Printer, Share2, CheckCircle2, 
  Clock, Footprints, HeartHandshake, User, Building2, MapPin, 
  ChevronLeft, Sparkles, AlertCircle, ArrowLeft, RefreshCw
} from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const generarQR = (texto, size = 260) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(texto)}&bgcolor=ffffff&color=78350f`;
};

export default function PublicBoletaDigital() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // Parámetros de URL
  const queryNombre = searchParams.get("nombre") || searchParams.get("n") || "";
  const queryCedula = searchParams.get("cedula") || searchParams.get("c") || "";
  const queryTel = searchParams.get("telefono") || searchParams.get("t") || "";
  const queryFicha = searchParams.get("ficha") || searchParams.get("f") || "";
  const queryParroquia = searchParams.get("parroquia") || searchParams.get("p") || "";
  const queryRol = searchParams.get("rol") || searchParams.get("r") || "";
  const queryEstado = searchParams.get("estado") || searchParams.get("e") || "";
  const queryMesa = searchParams.get("mesa") || searchParams.get("m") || "";
  const queryHab = searchParams.get("hab") || searchParams.get("h") || "";

  // Determinar si hay datos suficientes en URL para renderizado instantáneo
  const inicialDesdeURL = (queryNombre || queryCedula || queryTel || id) ? {
    id: id || "BOLETA",
    nombre: queryNombre || (id ? `Participante (${id})` : "Participante de Emaús"),
    cedula: queryCedula,
    telefono: queryTel,
    numero_ficha: queryFicha || "1",
    ficha: queryFicha || "1",
    parroquia: queryParroquia,
    rol: queryRol || "Caminante",
    tipo: queryRol || "Caminante",
    estado: queryEstado || "Aprobado",
    numero_mesa: queryMesa,
    numero_habitacion: queryHab
  } : null;

  const [busqueda, setBusqueda] = useState(queryCedula || queryTel || queryNombre || id || "");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState(inicialDesdeURL);
  const [config, setConfig] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [buscado, setBuscado] = useState(Boolean(inicialDesdeURL));

  const boletaRef = useRef(null);

  // Cargar configuración del retiro
  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs && cfgs.length > 0) setConfig(cfgs[0]);
    }).catch(() => null);
  }, []);

  // Enriquecer datos con la base de datos si es posible
  useEffect(() => {
    const q = id || queryCedula || queryTel || queryNombre;
    if (q) {
      consultarDB(q, true);
    }
  }, [id, queryCedula, queryTel, queryNombre]);

  const consultarDB = async (termino, silencioso = false) => {
    const q = (termino || busqueda).trim();
    if (!q) {
      if (!silencioso) toast.error("Ingresa una cédula, teléfono o nombre.");
      return;
    }

    if (!silencioso) setLoading(true);
    setBuscado(true);

    try {
      const cleanNum = q.replace(/\D/g, "");

      // 1. Consultar API Base44
      const [cams, servs, remotas] = await Promise.all([
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota.list().catch(() => []),
      ]);

      const coincide = (item) => {
        if (!item) return false;
        const itemId = String(item.id || item._id || "");
        const ced = String(item.cedula || "").replace(/\D/g, "");
        const tel = String(item.telefono || "").replace(/\D/g, "");
        const nom = String(item.nombre || "").toLowerCase();
        const fch = String(item.numero_ficha || item.ficha || "");

        if (q && itemId === q) return true;
        if (cleanNum && cleanNum.length >= 4 && (ced.includes(cleanNum) || tel.includes(cleanNum))) return true;
        if (queryFicha && fch === queryFicha) return true;
        if (q.length >= 3 && nom.includes(q.toLowerCase())) return true;
        return false;
      };

      const encCam = (cams || []).find(coincide);
      const encServ = (servs || []).find(coincide);
      const encRem = (remotas || []).find(coincide);

      const encontrado = encCam || encServ || encRem;

      if (encontrado) {
        setPersona(prev => ({
          ...(prev || {}),
          ...encontrado,
          nombre: encontrado.nombre || prev?.nombre,
          numero_ficha: encontrado.numero_ficha || encontrado.ficha || prev?.numero_ficha || "1",
          estado: encontrado.estado || prev?.estado || "Aprobado"
        }));
      } else if (!persona) {
        // Si no está en API pero se buscó manualmente, crear objeto fallback para no bloquear al usuario
        if (!silencioso) {
          setPersona({
            nombre: q.length > 5 && isNaN(q) ? q.toUpperCase() : "PARTICIPANTE REGISTRADO",
            cedula: !isNaN(cleanNum) && cleanNum.length >= 7 ? q : "",
            telefono: !isNaN(cleanNum) && cleanNum.length >= 7 ? q : "",
            numero_ficha: queryFicha || "1",
            estado: "Confirmado",
            rol: "Caminante"
          });
          toast.success("Boleta generada con los datos consultados.");
        }
      }
    } catch (e) {
      console.warn("Consulta API falló o no autorizada, manteniendo datos de boleta:", e);
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const handleDescargarImagen = async () => {
    if (!boletaRef.current) return;
    setDescargando(true);
    try {
      const canvas = await html2canvas(boletaRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const link = document.createElement("a");
      link.download = `Boleta_Emaus_${persona?.nombre ? persona.nombre.replace(/\s+/g, "_") : "Participante"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("¡Boleta digital descargada con éxito!");
    } catch (err) {
      console.error("Error al descargar boleta:", err);
      toast.error("No se pudo descargar la boleta. Intenta usar el botón de imprimir.");
    } finally {
      setDescargando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const numFicha = persona?.numero_ficha || persona?.ficha || queryFicha || "1";
  const esServidor = String(persona?.tipo || persona?.rol || "").toLowerCase().includes("servid") || persona?.es_servidor;
  const estado = persona?.estado || queryEstado || "Confirmado";

  const qrPayload = `EMAUS-PASS|${persona?.id || persona?._id || "REG"}|${persona?.cedula || ""}|FICHA-${numFicha}`;
  const qrUrl = generarQR(qrPayload, 260);

  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 flex flex-col items-center justify-start">
      
      {/* Botón de Retorno a la Inscripción */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 print:hidden">
        <Link 
          to="/inscripcion" 
          className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" /> Formularios de Inscripción
        </Link>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          Pase Digital Oficial
        </span>
      </div>

      {/* Buscador de Boleta por Cédula / Teléfono / Nombre */}
      <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-2xl mb-6 print:hidden">
        <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-amber-400" />
          Consulta tu Boleta Digital o Estado
        </h2>
        <form onSubmit={(e) => { e.preventDefault(); consultarDB(busqueda, false); }} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ingresa tu Cédula, Teléfono o Nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Consultar"}
          </button>
        </form>
      </div>

      {/* VISUALIZACIÓN DE LA BOLETA DIGITAL OFICIAL */}
      {persona ? (
        <div className="w-full max-w-md space-y-4">
          
          {/* BOTONES DE DESCARGA E IMPRESIÓN */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleDescargarImagen}
              disabled={descargando}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl transition cursor-pointer disabled:opacity-50 active:scale-95 border border-emerald-400/40"
            >
              <Download className="w-4 h-4" />
              {descargando ? "Generando PNG..." : "📥 Descargar Boleta (Imagen PNG)"}
            </button>

            <button
              onClick={handleImprimir}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Imprimir
            </button>
          </div>

          {/* TARJETA / BOLETA FÍSICA Y DIGITAL CON QR */}
          <div 
            ref={boletaRef}
            className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-500/50 relative font-sans select-none"
          >
            {/* Encabezado Rojo Vino / Dorado */}
            <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-red-900 text-white p-5 text-center relative border-b-2 border-amber-400">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono font-bold uppercase bg-black/40 px-2 py-0.5 rounded text-amber-200 border border-amber-500/40">
                  PASE DIGITAL OFICIAL · EMAÚS
                </span>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs ${
                  estado === "Aprobado" || estado === "Confirmado" ? "bg-emerald-500 text-white" : "bg-amber-400 text-amber-950"
                }`}>
                  {estado}
                </span>
              </div>

              <h1 className="text-xl font-black tracking-tight text-white uppercase leading-tight">
                {nombreRetiro}
              </h1>
              {edicion && (
                <p className="text-xs text-amber-200 font-serif italic mt-0.5">{edicion}</p>
              )}
            </div>

            {/* CUERPO DE LA BOLETA */}
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 bg-gradient-to-b from-amber-50/60 to-white">
              
              {/* Rol e Icono */}
              <div className="flex items-center gap-2 bg-amber-100/90 text-amber-950 px-3.5 py-1 rounded-full border border-amber-300 font-black text-xs shadow-2xs">
                {esServidor ? <HeartHandshake className="w-4 h-4 text-amber-800" /> : <Footprints className="w-4 h-4 text-amber-800" />}
                <span>{esServidor ? "SERVIDOR(A) DE EMAÚS" : "CAMINANTE DE EMAÚS"}</span>
              </div>

              {/* Nombre del Participante */}
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                  {persona.nombre || persona.nombre_completo}
                </h2>
                {persona.apodo && (
                  <p className="text-xs font-bold text-amber-800 italic mt-0.5">"{persona.apodo}"</p>
                )}
              </div>

              {/* Número de Ficha Gigante */}
              <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-red-950 text-white rounded-2xl px-6 py-3 shadow-xl border border-amber-400/60 w-full max-w-[250px]">
                <span className="text-[10px] font-mono font-bold text-amber-200 block uppercase tracking-widest">
                  NÚMERO DE FICHA
                </span>
                <span className="text-4xl font-black font-mono tracking-tight text-white leading-none">
                  #{numFicha}
                </span>
              </div>

              {/* Código QR Generado */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-600/40 shadow-md flex flex-col items-center my-1">
                <img 
                  src={qrUrl} 
                  alt="Código QR de Acceso" 
                  className="w-48 h-48 object-contain" 
                />
                <span className="text-[9px] font-mono font-black text-amber-950 mt-1.5 uppercase tracking-wider">
                  ESCANEAR EN CONTROL DE ENTRADA
                </span>
              </div>

              {/* Detalles Adicionales: Parroquia, Cédula, Mesa, Habitación */}
              <div className="w-full grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Parroquia</span>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {persona.parroquia || config?.lugar || "Sin parroquia"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cédula / Teléfono</span>
                  <span className="font-mono font-bold text-slate-800 text-xs block">
                    {persona.cedula || persona.telefono || "Registrado"}
                  </span>
                </div>

                {persona.numero_mesa && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Mesa Asignada</span>
                    <span className="font-bold text-amber-900 text-xs block">Mesa {persona.numero_mesa}</span>
                  </div>
                )}

                {persona.numero_habitacion && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Habitación</span>
                    <span className="font-bold text-amber-900 text-xs block">Hab. {persona.numero_habitacion}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-500 font-serif italic pt-1 border-t border-slate-200 w-full">
                "Caminando con fe y esperanza hacia el Resucitado" · Lucas 24:13-35
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 text-slate-300 p-8 rounded-2xl text-center max-w-md w-full shadow-2xl">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-base text-white">Consulta tu Boleta Digital</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa tu número de Cédula o Teléfono en el buscador arriba para generar y visualizar tu boleta oficial con código QR.
          </p>
        </div>
      )}

    </div>
  );
}
