import { MessageCircle, ExternalLink } from "lucide-react";

export default function WhatsAppJoinButton({ link }) {
  if (!link) return null;
  return (
    <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-green-600" />
        <p className="text-green-800 text-sm font-bold">Únete al grupo de WhatsApp</p>
      </div>
      <p className="text-green-700 text-xs mb-3 leading-relaxed">
        Ingresa al grupo oficial para recibir las comunicaciones y coordinaciones del retiro.
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Unirme al grupo
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    </div>
  );
}