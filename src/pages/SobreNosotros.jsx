import { Link } from "react-router-dom";
import MobileTopBar from "@/components/MobileTopBar";
import {
  Mail, Phone, MessageCircle, Clock, ShieldCheck, Heart, BookOpen,
  ClipboardList, Users, UserCheck, Shuffle, Printer, DollarSign, Truck,
  Calendar, Mic2, Cross, Briefcase, Archive, UsersRound, ClipboardCheck,
  Layers, Info
} from "lucide-react";

// ====== Contactos de soporte técnico (edita estos valores) ======
const SOPORTE = {
  responsable: "Coordinación de Soporte Técnico",
  email: "ccanario0687@gmail.com",
  telefono: "+1 829-885-2377",
  whatsapp: "+1 829-930-8358",
  horario: "Lunes a Viernes · 9:00 AM - 6:00 PM",
  respuesta: "Tiempo de respuesta estimado: 24 a 48 horas",
};

// ====== Información del sistema ======
const SISTEMA = {
  nombre: "Sistema de Gestión Emaús",
  pasaje: "Lucas 24, 13-35",
  version: "1.0",
  plataforma: "Web · Computadora y Móvil",
};

const MODULOS = [
  { icon: ClipboardList, nombre: "Inscripciones" },
  { icon: Users, nombre: "Caminantes" },
  { icon: UserCheck, nombre: "Servidores" },
  { icon: UsersRound, nombre: "Equipos" },
  { icon: Shuffle, nombre: "Distribución" },
  { icon: ClipboardCheck, nombre: "Control de Entrada" },
  { icon: Printer, nombre: "Impresiones" },
  { icon: Layers, nombre: "Distintivos" },
  { icon: DollarSign, nombre: "Finanzas" },
  { icon: Briefcase, nombre: "Presupuesto" },
  { icon: Truck, nombre: "Suplidores" },
  { icon: Calendar, nombre: "Programación" },
  { icon: Mic2, nombre: "Charlistas" },
  { icon: Cross, nombre: "Sacerdotes" },
  { icon: BookOpen, nombre: "Biblioteca" },
  { icon: Archive, nombre: "Historial" },
];

function TarjetaContacto({ icon: Icon, etiqueta, valor, href, accent }) {
  return (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-4 bg-white rounded-xl border border-amber-100 p-4 hover:border-amber-300 hover:shadow-sm transition-all"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">{etiqueta}</p>
        <p className="text-sm font-bold text-gray-800 truncate">{valor}</p>
      </div>
    </a>
  );
}

export default function SobreNosotros() {
  const whatsappLink = `https://wa.me/${SOPORTE.whatsapp.replace(/[^0-9]/g, "")}`;
  const telLink = `tel:${SOPORTE.telefono.replace(/\s/g, "")}`;
  const mailLink = `mailto:${SOPORTE.email}`;

  return (
    <div className="min-h-screen bg-amber-50 pb-12">
      <MobileTopBar title="Sobre Nosotros" />

      <div className="max-w-4xl mx-auto px-4">

        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-800 via-amber-700 to-amber-600 text-white rounded-2xl p-6 md:p-8 shadow-lg mt-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-2xl shrink-0">✝</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">Hermandad de Emaús</h1>
              <p className="text-amber-200 text-sm">{SISTEMA.pasaje}</p>
            </div>
          </div>
          <p className="text-amber-50 text-sm md:text-base leading-relaxed">
            {SISTEMA.nombre} es una plataforma diseñada para facilitar la organización
            completa de los Retiros de Emaús: desde la inscripción de los participantes
            hasta la distribución de mesas y habitaciones, finanzas, programación,
            biblioteca e impresión de documentos.
          </p>
        </div>

        {/* Misión / Visión */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-amber-700" />
              <h2 className="font-bold text-amber-900">Nuestra Misión</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Acompañar a cada caminante en su encuentro de fe, brindando al equipo
              organizador las herramientas necesarias para gestionar el retiro de
              forma ordenada, eficiente y con calidez humana.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
              <h2 className="font-bold text-amber-900">Nuestra Visión</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Que cada comunidad y hermandad cuente con un sistema confiable,
              accesible desde cualquier dispositivo, que permita enfocar los
              esfuerzos en lo espiritual y no en lo administrativo.
            </p>
          </div>
        </div>

        {/* Módulos del sistema */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-700" />
            Módulos del Sistema
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MODULOS.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.nombre} className="bg-white rounded-xl border border-amber-100 p-3 flex flex-col items-center gap-2 text-center shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-amber-700" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{m.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soporte técnico */}
        <div className="mt-6 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="bg-amber-700 text-white px-5 py-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            <h2 className="font-bold text-base">Soporte Técnico</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-600 mb-4">
              {SOPORTE.responsable}. Si tienes dudas, errores en el sistema o necesitas
              ayuda con algún módulo, comunícate por cualquiera de estos medios:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <TarjetaContacto icon={Mail} etiqueta="Correo" valor={SOPORTE.email} href={mailLink} accent="bg-blue-600" />
              <TarjetaContacto icon={Phone} etiqueta="Teléfono" valor={SOPORTE.telefono} href={telLink} accent="bg-green-600" />
              <TarjetaContacto icon={MessageCircle} etiqueta="WhatsApp" valor={SOPORTE.whatsapp} href={whatsappLink} accent="bg-emerald-600" />
              <TarjetaContacto icon={Clock} etiqueta="Horario" valor={SOPORTE.horario} accent="bg-amber-700" />
            </div>
            <p className="text-xs text-amber-600 mt-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {SOPORTE.respuesta}
            </p>
          </div>
        </div>

        {/* Información del sistema */}
        <div className="mt-6 bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-700" />
            Información del Sistema
          </h2>
          <dl className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div className="flex justify-between sm:block">
              <dt className="text-amber-600 font-semibold">Producto</dt>
              <dd className="text-gray-800 font-medium">{SISTEMA.nombre}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-amber-600 font-semibold">Versión</dt>
              <dd className="text-gray-800 font-medium">{SISTEMA.version}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-amber-600 font-semibold">Plataforma</dt>
              <dd className="text-gray-800 font-medium">{SISTEMA.plataforma}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-amber-600 font-semibold">Fundamento</dt>
              <dd className="text-gray-800 font-medium">{SISTEMA.pasaje}</dd>
            </div>
          </dl>
        </div>

        {/* Enlace a Ayuda */}
        <div className="mt-6 text-center bg-gradient-to-r from-amber-50 to-white rounded-2xl border border-amber-100 p-5 shadow-sm">
          <p className="text-amber-800 font-semibold mb-1">¿Necesitas aprender a usar el sistema?</p>
          <p className="text-sm text-gray-500 mb-3">Visita nuestro Centro de Ayuda con guías paso a paso de cada módulo.</p>
          <Link
            to="/ayuda"
            className="inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow"
          >
            <BookOpen className="w-4 h-4" />
            Ir al Centro de Ayuda
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-amber-600 flex items-center justify-center gap-1.5">
            Hecho con <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> para la Hermandad de Emaús
          </p>
        </div>
      </div>
    </div>
  );
}