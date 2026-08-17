import { useState, useEffect } from "react";
import { 
  X, MessageCircle, Mail, QrCode, CheckCircle, Copy, Check, ExternalLink, Send, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { generarMensajeBienvenida, construirLinkWhatsApp, construirLinkEmail } from "@/utils/whatsappHelper";

export default function ModalConfirmacionWhatsApp({ persona, config, fichaNum, onClose }) {
  const [mensaje, setMensaje] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (persona) {
      const msjGenerado = generarMensajeBienvenida({ persona, config, fichaNum });
      setMensaje(msjGenerado);
    }
  }, [persona, config, fichaNum]);

  if (!persona) return null;

  const nombre = persona.nombre || persona.nombre_completo || "Participante";
  const numFicha = fichaNum || persona.numero_ficha || persona.ficha || "1";
  const telefono = persona.telefono || "";
  const email = persona.email || "";

  const linkWa = construirLinkWhatsApp(telefono, mensaje);
  const linkMail = construirLinkEmail({
    email,
    asunto: `¡Inscripción Aprobada Ficha #${numFicha}! - Retiro de Emaús`,
    cuerpo: mensaje
  });

  const handleCopiar = () => {
    navigator.clipboard.writeText(mensaje);
    setCopiado(true);
    toast.success("Mensaje copiado al portapapeles");
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleEnviarWhatsApp = () => {
    if (linkWa) {
      window.open(linkWa, "_blank");
      toast.success("Abriendo WhatsApp para enviar mensaje...");
    } else {
      toast.error("El participante no tiene un número de teléfono válido registrado.");
    }
  };

  const handleEnviarEmail = () => {
    if (linkMail) {
      window.open(linkMail, "_blank");
      toast.success("Abriendo cliente de correo...");
    } else {
      toast.error("El participante no tiene un correo electrónico registrado.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-emerald-500/30 font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado Verde Éxito */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-300/40">
              <CheckCircle className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-1.5">
                ¡Inscripción Aprobada! <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-emerald-100 text-xs font-mono">Notificación automatizada por WhatsApp & Correo</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-emerald-700/60 text-emerald-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del Participante */}
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono">Participante Aprobado</span>
              <h3 className="font-extrabold text-slate-900 text-sm">{nombre}</h3>
              <p className="text-slate-600 font-medium">
                {telefono ? `📱 ${telefono}` : "⚠️ Sin teléfono"} • {email ? `✉️ ${email}` : "Sin correo"}
              </p>
            </div>
            <div className="bg-emerald-800 text-white font-mono font-black px-3 py-1.5 rounded-lg text-center shadow-xs shrink-0">
              <span className="text-[9px] block text-emerald-200 font-normal uppercase">Ficha</span>
              #{numFicha}
            </div>
          </div>

          {/* Editor/Vista Previa del Mensaje de WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Mensaje de Bienvenida Personalizado:
              </label>
              <button
                type="button"
                onClick={handleCopiar}
                className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
              >
                {copiado ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>

            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={8}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 leading-relaxed shadow-inner"
            />
          </div>

          {/* Acciones Directas de Envío */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleEnviarWhatsApp}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              Enviar por WhatsApp Instantáneo
            </button>

            {email && (
              <button
                onClick={handleEnviarEmail}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                Enviar Correo
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
