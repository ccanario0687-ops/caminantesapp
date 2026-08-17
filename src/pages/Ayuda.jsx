import { useState } from "react";
import { Link } from "react-router-dom";
import BackArrow from "@/components/BackArrow";
import {
  ArrowLeft, Search, ChevronDown, ChevronUp, BookOpen, Printer, Users, UserCheck,
  Settings, Shuffle, ClipboardList, DollarSign, Truck, Calendar, Mic2, Cross,
  Archive, Briefcase, UsersRound, ClipboardCheck, UserCog, Key, Smartphone, Info, Tv
} from "lucide-react";
import PantallaEnVivo from "./PantallaEnVivo";
import { useComunidad } from "@/lib/ComunidadContext";
import { generarManualUsuarioPDF } from "@/utils/generarManualPDF";

const SECCIONES = [
  {
    id: "caminantes",
    icon: Users,
    titulo: "Caminantes",
    color: "amber",
    preguntas: [
      {
        q: "¿Cómo registro un nuevo caminante?",
        a: `Desde el Dashboard, haz clic en "Registrar Caminante". Completa los campos del formulario: nombre (obligatorio), edad, género, teléfono, correo, parroquia, padrino/madrina, rol en mesa, número de mesa y retiro. Haz clic en "Guardar Caminante" al terminar.`
      },
      {
        q: "¿Cómo edito la información de un caminante?",
        a: `Ve a "Ver Caminantes" desde el Dashboard. Busca al caminante por nombre, parroquia o padrino usando la barra de búsqueda. Haz clic en el ícono del lápiz ✏️ en la fila del caminante. Modifica los campos necesarios y guarda los cambios.`
      },
      {
        q: "¿Cómo cambio el estado de un caminante?",
        a: `Edita el caminante (ícono lápiz ✏️ en la lista). En el campo "Estado" selecciona: Pendiente, Confirmado o Cancelado. Solo los caminantes "Confirmados" aparecen en la distribución automática de mesas y habitaciones.`
      },
      {
        q: "¿Cómo asigno a un caminante como Líder de Mesa?",
        a: `Edita el caminante y en el campo "Rol en Mesa" selecciona "Líder de Mesa". Los líderes se distribuyen separados del resto, con habitaciones exclusivas para ellos, y aparecen destacados con corona 👑 en los reportes.`
      },
      {
        q: "¿Cómo elimino un caminante?",
        a: `En la lista de caminantes, haz clic en el ícono de papelera 🗑️ en la fila correspondiente. Se pedirá confirmación antes de eliminar. Esta acción no se puede deshacer.`
      },
      {
        q: "¿Cómo asigno número de habitación manualmente?",
        a: `Edita el caminante y completa el campo "No. Habitación". También puedes usar la Distribución Automática desde el menú principal, que asigna habitaciones evitando que compañeros de mesa compartan cuarto.`
      },
    ]
  },
  {
    id: "servidores",
    icon: UserCheck,
    titulo: "Servidores",
    color: "blue",
    preguntas: [
      {
        q: "¿Cómo agrego un servidor?",
        a: `Ve a "Ver Servidores" desde el Dashboard y haz clic en "Nuevo". Completa nombre, rol (Rector, Sub-Rector, Servidor de Mesa, Músico, etc.), parroquia, teléfono y número de retiro. Guarda los cambios.`
      },
      {
        q: "¿Cómo edito o elimino un servidor?",
        a: `En la lista de servidores, usa el ícono ✏️ para editar o 🗑️ para eliminar. Puedes cambiar su rol, mesa asignada, estado y demás información desde el modal de edición.`
      },
      {
        q: "¿Cómo genero el reporte de servidores por equipo?",
        a: `En la página de Servidores, haz clic en "Reporte por Equipo". Se mostrará un listado agrupado por rol (Rector, Músicos, Cocina, etc.) con columnas alineadas, listo para imprimir. Usa el botón "Imprimir Reporte" o Ctrl+P.`
      },
    ]
  },
  {
    id: "inscripciones",
    icon: ClipboardList,
    titulo: "Inscripciones Remotas",
    color: "indigo",
    preguntas: [
      {
        q: "¿Cómo funciona la inscripción remota?",
        a: `Las personas interesadas completan un formulario público en el enlace /inscripcion (caminante o servidor). Los datos llegan al panel de Inscripciones con estado "Pendiente". Desde ahí el coordinador revisa, aprueba o rechaza cada solicitud.`
      },
      {
        q: "¿Cómo apruebo o rechazo una inscripción?",
        a: `Ve a "Inscripciones" desde el menú. Filtra por estado (Pendiente / Aprobado / Rechazado). Haz clic en una solicitud para ver el detalle. Usa "Aprobar e Integrar" para crear automáticamente el caminante o servidor en el sistema (con ficha y número de retiro asignados), o "Rechazar" para denegarla.`
      },
      {
        q: "¿Cómo comparto el enlace de inscripción pública?",
        a: `En el panel de Inscripciones usa el botón de enlace (parte superior) para copiar la URL pública y enviarla por WhatsApp, correo o redes. Cualquier persona con el enlace puede llenar el formulario.`
      },
      {
        q: "¿Qué pasa si apruebo por error?",
        a: `Al aprobar se crea el participante en el sistema con estado "Confirmado". Si necesitas revertirlo, elimina el registro creado desde la lista de Caminantes o Servidores y marca la inscripción como "Rechazada" desde el panel.`
      },
    ]
  },
  {
    id: "distribucion",
    icon: Shuffle,
    titulo: "Distribución de Mesas y Habitaciones",
    color: "purple",
    preguntas: [
      {
        q: "¿Cómo funciona la distribución automática?",
        a: `La distribución separa automáticamente los Líderes de Mesa del resto. Los líderes van a habitaciones exclusivas. Los caminantes regulares se mezclan evitando que compañeros de mesa compartan habitación. El algoritmo hace hasta 300 intentos para minimizar conflictos.`
      },
      {
        q: "¿Cómo guardo la distribución generada?",
        a: `Después de hacer clic en "Generar Distribución" y revisar el resultado, haz clic en "Guardar". Esto actualiza el número de mesa y habitación en el registro de cada caminante. Esta información luego aparece en reportes, gafetes y fichas.`
      },
      {
        q: "¿Puedo configurar el número de mesas o habitaciones?",
        a: `Sí. En la página de Distribución, haz clic en "Configurar" (esquina superior derecha). Puedes ajustar: total de mesas, personas por mesa, líderes por mesa, habitaciones para líderes, habitaciones para caminantes y capacidad de cada una.`
      },
    ]
  },
  {
    id: "impresiones",
    icon: Printer,
    titulo: "Impresiones, Gafetes y Reportes",
    color: "green",
    preguntas: [
      {
        q: "¿Qué tipos de documentos puedo imprimir?",
        a: `Desde la sección "Impresiones" puedes generar:\n• Gafete personal – identificación de cada participante\n• Gafete para Maleta – etiqueta para equipaje\n• Gafete para Carpeta – etiqueta de la carpeta del retiro\n• Gafete para Cama – cartel para identificar la cama\n• Carta – carta de bienvenida personalizada\n• Ficha – hoja con todos los datos del participante`
      },
      {
        q: "¿Cómo imprimo los gafetes de caminantes o servidores?",
        a: `Ve a "Impresiones" desde el Dashboard. Selecciona "Impresión Caminantes" o "Impresión Servidores". Filtra por retiro si es necesario. Elige el tipo de documento (gafete, carta, ficha, etc.). Haz clic en "Imprimir" o presiona Ctrl+P. Se generarán todos los documentos automáticamente en A4.`
      },
      {
        q: "¿Cómo imprimo los distintivos de habitación?",
        a: `Ve a "Distintivos Habitación" desde el Dashboard. Filtra por retiro. Haz clic en "Imprimir Todo". Se generará una página A4 por habitación con el número grande y los nombres de los ocupantes.`
      },
      {
        q: "¿Cómo imprimo los reportes de mesas, parroquias o tallas?",
        a: `Ve a "Reportes" desde el Dashboard. Selecciona el retiro y el tipo de reporte (Por Mesa, Por Parroquia, Por Talla de Camisa, Por Género, Por Edad, Sacramentos, etc.). Haz clic en "Imprimir" o usa Ctrl+P. Cada grupo aparecerá con encabezado del retiro en la impresión.`
      },
      {
        q: "¿Qué información aparece en la Ficha del participante?",
        a: `La Ficha incluye: nombre, edad, género, teléfono, parroquia, padrino/madrina, mesa, habitación, talla de camisa, tipo de sangre, necesidades médicas y notas. Para servidores incluye su rol en lugar de algunos campos.`
      },
      {
        q: "¿Puedo personalizar el logo que aparece en los documentos?",
        a: `Sí. Ve a "Configuración" desde el Dashboard y en la sección "Logo del Retiro" sube la imagen deseada. Este logo aparecerá automáticamente en gafetes, fichas, cartas y distintivos de habitación.`
      },
    ]
  },
  {
    id: "finanzas",
    icon: DollarSign,
    titulo: "Finanzas",
    color: "teal",
    preguntas: [
      {
        q: "¿Cómo registro el pago de una ficha?",
        a: `Ve a "Finanzas" y usa "Cobro de Cuotas". Selecciona el caminante o servidor, marca la ficha como "Pagada" y se genera automáticamente un movimiento de ingreso. También puedes editar el pago directamente desde la lista.`
      },
      {
        q: "¿Cómo registro un gasto o donación?",
        a: `En "Finanzas" usa "Otro Movimiento". Elige el tipo (gasto, donación, ingreso), escribe la descripción y el monto. El sistema actualiza automáticamente el balance del retiro.`
      },
      {
        q: "¿Cómo configuro el precio de la ficha?",
        a: `En "Finanzas", botón "Configurar Precios". Define el precio para caminantes y servidores. Estos precios se usan al registrar los pagos y al calcular el total esperado.`
      },
    ]
  },
  {
    id: "suplidores",
    icon: Truck,
    titulo: "Suplidores",
    color: "orange",
    preguntas: [
      {
        q: "¿Cómo registro un suplidor?",
        a: `Ve a "Suplidores" y haz clic en "Nuevo". Completa nombre, contacto, teléfono, provincia, renglón (alimentos, logística, imprenta, etc.) y el producto o servicio que ofrece. Guarda los cambios.`
      },
      {
        q: "¿Para qué sirve el directorio de suplidores?",
        a: `Centraliza los contactos de empresas y personas que abastecen el retiro (comida, transporte, sonido, imprenta, uniformes). Puedes imprimir el directorio o el detalle de un suplidor para llevarlo a las reuniones de compras.`
      },
    ]
  },
  {
    id: "programacion",
    icon: Calendar,
    titulo: "Programación",
    color: "cyan",
    preguntas: [
      {
        q: "¿Cómo creo la agenda del retiro?",
        a: `En "Programación", pulsa "Nueva Actividad". Indica fecha, hora de inicio/fin (el tiempo se calcula solo) y agrega una o varias actividades para ese horario, cada una con su responsable y equipo. Las actividades se agrupan por día.`
      },
      {
        q: "¿Cómo asigno los moderadores del día?",
        a: `Debajo de cada día en la programación encontrarás los turnos Mañana, Tarde y Noche. Escribe el nombre del moderador de cada turno y guarda; aparecerá en el encabezado del día y en la impresión.`
      },
      {
        q: "¿Puedo imprimir el programa completo?",
        a: `Sí. Usa "Imprimir Programa" para generar un documento A4 apaisado con todas las actividades agrupadas por día, horarios, responsables, equipos y moderadores.`
      },
    ]
  },
  {
    id: "charlistas",
    icon: Mic2,
    titulo: "Charlistas",
    color: "pink",
    preguntas: [
      {
        q: "¿Cómo registro un charlista?",
        a: `Ve a "Charlistas" y "Nuevo". Completa nombre, profesión, temas, contacto, fecha y hora de la charla. Define el estado (Confirmado / Pendiente).`
      },
      {
        q: "¿Puedo imprimir la ficha de un charlista?",
        a: `Sí. En la lista de charlistas usa el ícono de impresión para generar una ficha con los datos y la información de la charla.`
      },
    ]
  },
  {
    id: "sacerdotes",
    icon: Cross,
    titulo: "Sacerdotes",
    color: "rose",
    preguntas: [
      {
        q: "¿Cómo registro un sacerdote?",
        a: `En "Sacerdotes" haz clic en "Nuevo". Completa nombre, parroquia, rol (Celebrante, Concelebrante, Predicador), fecha y hora de participación, y estado de confirmación.`
      },
      {
        q: "¿Puedo imprimir el listado de sacerdotes?",
        a: `Sí. Usa el botón de impresión para generar un reporte con todos los sacerdotes y sus roles asignados para el retiro.`
      },
    ]
  },
  {
    id: "presupuesto",
    icon: Briefcase,
    titulo: "Presupuesto",
    color: "lime",
    preguntas: [
      {
        q: "¿Cómo creo un presupuesto del retiro?",
        a: `En "Presupuesto" crea un nuevo presupuesto asociado al retiro. Luego agrega ítems por categoría (alimentos, materiales, uniformes, logística, etc.) con cantidad, costo unitario y lo que ya tienes en existencia.`
      },
      {
        q: "¿Qué calcula el presupuesto?",
        a: `Calcula automáticamente el total presupuestado, el valor de lo que ya existe y el dinero adicional requerido. También puedes vincular menús para estimar costos de comida según el número de inscritos.`
      },
      {
        q: "¿Cómo marco un ítem como ya comprado?",
        a: `En el detalle del presupuesto, marca la casilla "Completado" del ítem. Así llevas control de lo adquirido y lo pendiente.`
      },
    ]
  },
  {
    id: "biblioteca",
    icon: BookOpen,
    titulo: "Biblioteca Emaús",
    color: "violet",
    preguntas: [
      {
        q: "¿Qué encuentro en la Biblioteca?",
        a: `Canciones (con letra), pistas de canciones, materiales de Palanca, historia de Emaús, el pasaje de Lucas 24:13-35 y otros documentos del retiro. Todo centralizado y accesible para el equipo.`
      },
      {
        q: "¿Cómo agrego un recurso?",
        a: `En "Biblioteca" usa "Nuevo recurso". Elige la categoría, escribe el título y descripción, y sube un archivo o pega un enlace externo. Para canciones puedes incluir la letra.`
      },
    ]
  },
  {
    id: "equipos",
    icon: UsersRound,
    titulo: "Equipos del Retiro",
    color: "fuchsia",
    preguntas: [
      {
        q: "¿Cómo organizo los equipos de trabajo?",
        a: `En "Equipos del Retiro" ves los servidores agrupados por equipo de trabajo (Cocina, Música, Logística, Mesa, etc.). Puedes asignar servidores a un equipo y nombrar un líder de equipo.`
      },
      {
        q: "¿Puedo imprimir el listado por equipo?",
        a: `Sí. Desde "Equipos" genera un reporte imprimible con cada equipo, sus integrantes y el líder destacado.`
      },
    ]
  },
  {
    id: "entrada",
    icon: ClipboardCheck,
    titulo: "Control de Entrada",
    color: "green",
    preguntas: [
      {
        q: "¿Cómo marco la llegada de un caminante?",
        a: `En "Control de Entrada" toca el nombre del caminante (o la fila) para marcarlo como Presente. Se registra automáticamente la hora de llegada. Vuelve a tocar para desmarcar.`
      },
      {
        q: "¿Puedo filtrar por retiro o por estado?",
        a: `Sí. Filtra por número de retiro y por Presentes / Pendientes. También verás una barra de progreso con el porcentaje de asistencia.`
      },
    ]
  },
  {
    id: "usuarios",
    icon: UserCog,
    titulo: "Usuarios y Permisos",
    color: "gray",
    preguntas: [
      {
        q: "¿Cómo invito a un nuevo usuario?",
        a: `Ve a "Usuarios del Sistema" (solo administradores). Usa "Invitar usuario", ingresa el correo y el rol (admin o usuario). La persona recibirá una invitación para unirse.`
      },
      {
        q: "¿Cómo asigno permisos por módulo?",
        a: `Edita un usuario y, en "Permisos por módulo", elige para cada módulo: Sin acceso, Solo lectura o Edición. Los usuarios solo verán los módulos con permiso y verán un candado 🔒 en los de solo lectura.`
      },
      {
        q: "¿Qué es una comunidad o equipo?",
        a: `Cada comunidad o hermandad es un equipo aislado: sus caminantes, servidores y datos son privados para ese grupo. El administrador de plataforma puede ver todas las comunidades; los usuarios normales solo ven la suya.`
      },
    ]
  },
  {
    id: "cuenta",
    icon: Key,
    titulo: "Mi Cuenta",
    color: "amber",
    preguntas: [
      {
        q: "¿Cómo cambio mi contraseña?",
        a: `Ve a "Cambiar Contraseña" en el menú. Ingresa tu contraseña actual y la nueva dos veces. Si la olvidas, contacta al administrador para reiniciar tu acceso.`
      },
      {
        q: "¿Puedo cambiar mi correo o nombre?",
        a: `El correo y nombre de usuario los gestiona el administrador. Si necesitas actualizarlos, solicítalo al administrador del sistema.`
      },
    ]
  },
  {
    id: "movil",
    icon: Smartphone,
    titulo: "Uso desde el Móvil",
    color: "blue",
    preguntas: [
      {
        q: "¿Funciona sin conexión a internet?",
        a: `Sí. La app guarda los cambios localmente cuando no hay conexión (indicador "Offline") y los sincroniza automáticamente al recuperar la conexión. Verás un ícono de Online/Offline en cada módulo.`
      },
      {
        q: "¿Cómo actualizo los datos en el móvil?",
        a: `Desliza el dedo hacia abajo desde la parte superior de la lista (pull-to-refresh) para recargar los datos. También puedes usar el botón de actualizar.`
      },
      {
        q: "¿Por qué no puedo imprimir desde el celular?",
        a: `La impresión está optimizada para computadora. En móviles, al intentar imprimir verás un aviso recomendando hacerlo desde una PC para mejor calidad y formato A4.`
      },
    ]
  },
  {
    id: "configuracion",
    icon: Settings,
    titulo: "Configuración del Retiro",
    color: "gray",
    preguntas: [
      {
        q: "¿Cómo cambio el nombre o edición del retiro?",
        a: `Ve a "Configuración" desde el Dashboard. En "Identidad del Retiro" modifica el nombre, edición/número, provincia, lugar y fechas. Guarda los cambios. Esta información aparece en todos los documentos impresos.`
      },
      {
        q: "¿Cómo inicio un nuevo retiro limpiando todos los datos?",
        a: `En el Dashboard, haz clic en el botón rojo "Nuevo Retiro". Se mostrará una advertencia. Ingresa el código de autorización. Luego ingresa el número del nuevo retiro. Esto eliminará TODOS los caminantes y servidores actuales y no se puede deshacer. Asegúrate de haber impreso todos los reportes primero.`
      },
      {
        q: "¿Cómo personalizo la portada pública?",
        a: `Ve a "Configuración" y luego a "Portada Pública". Puedes cambiar título, subtítulo, versículo, colores del gradiente, foto de fondo, foto circular y el texto del botón de ingreso.`
      },
      {
        q: "¿Cómo agrego el teléfono de contacto del rector?",
        a: `Ve a "Configuración" y en la sección "Contacto" completa los campos "Rector Responsable" y "Teléfono de Contacto". Esta información está disponible para el equipo organizador.`
      },
    ]
  },
  {
    id: "sistema",
    icon: Info,
    titulo: "Sobre el Sistema",
    color: "indigo",
    preguntas: [
      {
        q: "¿Qué es el Sistema de Gestión Emaús?",
        a: `Es una plataforma diseñada para organizar los Retiros de Emaús: inscripciones, caminantes, servidores, distribución de mesas y habitaciones, finanzas, programación, biblioteca, impresiones y más. Todo desde un solo lugar, accesible desde computadora o móvil.`
      },
      {
        q: "¿Dónde encuentro los contactos de soporte?",
        a: `Visita la sección "Sobre Nosotros" en el menú. Ahí encontrarás los datos de contacto del soporte técnico, horario de atención e información general del sistema.`
      },
    ]
  },
];

const colorMap = {
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-700", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-700", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-700", text: "text-indigo-800", badge: "bg-indigo-100 text-indigo-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-700", text: "text-purple-800", badge: "bg-purple-100 text-purple-700" },
  green: { bg: "bg-green-50", border: "border-green-200", icon: "bg-green-700", text: "text-green-800", badge: "bg-green-100 text-green-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "bg-teal-700", text: "text-teal-800", badge: "bg-teal-100 text-teal-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "bg-orange-700", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", icon: "bg-cyan-700", text: "text-cyan-800", badge: "bg-cyan-100 text-cyan-700" },
  pink: { bg: "bg-pink-50", border: "border-pink-200", icon: "bg-pink-700", text: "text-pink-800", badge: "bg-pink-100 text-pink-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", icon: "bg-rose-700", text: "text-rose-800", badge: "bg-rose-100 text-rose-700" },
  lime: { bg: "bg-lime-50", border: "border-lime-200", icon: "bg-lime-700", text: "text-lime-800", badge: "bg-lime-100 text-lime-700" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", icon: "bg-slate-700", text: "text-slate-800", badge: "bg-slate-100 text-slate-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-700", text: "text-violet-800", badge: "bg-violet-100 text-violet-700" },
  fuchsia: { bg: "bg-fuchsia-50", border: "border-fuchsia-200", icon: "bg-fuchsia-700", text: "text-fuchsia-800", badge: "bg-fuchsia-100 text-fuchsia-700" },
  gray: { bg: "bg-gray-50", border: "border-gray-200", icon: "bg-gray-700", text: "text-gray-800", badge: "bg-gray-100 text-gray-700" },
};

function Accordion({ pregunta, respuesta }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-gray-100 rounded-lg overflow-hidden transition-all ${open ? "shadow-sm" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-white hover:bg-amber-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800 pr-4">{pregunta}</span>
        {open ? <ChevronUp className="w-4 h-4 text-amber-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{respuesta}</p>
        </div>
      )}
    </div>
  );
}

export default function Ayuda() {
  const { comunidadActual } = useComunidad();
  const [busqueda, setBusqueda] = useState("");
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [modoTV, setModoTV] = useState(false);

  const filtradas = SECCIONES.map(s => ({
    ...s,
    preguntas: s.preguntas.filter(p =>
      !busqueda ||
      p.q.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.a.toLowerCase().includes(busqueda.toLowerCase())
    )
  })).filter(s => s.preguntas.length > 0);

  if (modoTV) {
    return (
      <div className="min-h-screen bg-slate-950 p-4">
        <button
          onClick={() => setModoTV(false)}
          className="mb-4 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Centro de Ayuda
        </button>
        <PantallaEnVivo />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 font-sans">
      {/* BANNER DESTACADO DE PANTALLA EN VIVO / TV BASTIDORES */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white px-6 py-6 border-b border-amber-500/30 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Tv className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">Herramienta de Control en Vivo</span>
              <h2 className="text-lg font-black text-white">Pantalla de Conteo en Vivo (TV / Cocina)</h2>
              <p className="text-xs text-amber-200/80 font-medium">Reloj en vivo, contador de tiempo, desviación del retiro y alertas de cocina por mesa.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModoTV(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition shadow-lg flex items-center gap-2"
            >
              <Tv className="w-4 h-4" /> Ver Integrado
            </button>
            <button
              onClick={() => window.open(`${window.location.origin}/pantalla-envivo`, "_blank", "noopener,noreferrer")}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-black text-xs border border-slate-700 transition flex items-center gap-2 hover:scale-105"
            >
              📺 Abrir en TV
            </button>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-8 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <BackArrow />
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-amber-300" />
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Centro de Ayuda y Manual del Sistema</h1>
                  <p className="text-amber-200 text-xs mt-0.5">Encuentra respuestas sobre la gestión de retiros, finanzas, impresiones y distribución.</p>
                </div>
              </div>
            </div>

            {/* BOTÓN OFICIAL DE DESCARGA DEL MANUAL EN PDF */}
            <button
              type="button"
              onClick={() => generarManualUsuarioPDF(comunidadActual)}
              className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 px-5 py-3 rounded-2xl font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2.5 border border-yellow-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Descargar Manual de Usuario Completo en PDF multi-páginas"
            >
              <Printer className="w-4 h-4 text-amber-950" />
              <span>📥 Descargar Manual Completo (PDF)</span>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-3 w-4 h-4 text-amber-400" />
            <input
              type="text"
              placeholder="Buscar una pregunta o módulo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-400/60 bg-amber-950/40 text-white placeholder-amber-300/80 focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Categorías rápidas */}
        {!busqueda && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {SECCIONES.map(s => {
              const Icon = s.icon;
              const c = colorMap[s.color];
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSeccionActiva(seccionActiva === s.id ? null : s.id);
                    setTimeout(() => {
                      document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 100);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                    seccionActiva === s.id
                      ? `${c.bg} ${c.border} shadow-md`
                      : "bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{s.titulo}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Secciones de preguntas */}
        <div className="space-y-6">
          {filtradas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No se encontraron resultados para "<strong>{busqueda}</strong>"</p>
            </div>
          )}

          {filtradas.map(s => {
            const Icon = s.icon;
            const c = colorMap[s.color];
            return (
              <div key={s.id} id={`sec-${s.id}`} className={`bg-white rounded-xl border ${c.border} shadow-sm overflow-hidden`}>
                <div className={`${c.bg} px-5 py-4 flex items-center gap-3 border-b ${c.border}`}>
                  <div className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h2 className={`font-bold text-base ${c.text}`}>{s.titulo}</h2>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>
                    {s.preguntas.length} pregunta{s.preguntas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {s.preguntas.map((p, i) => (
                    <Accordion key={i} pregunta={p.q} respuesta={p.a} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <p className="text-amber-800 font-semibold mb-1">¿No encontraste lo que buscabas?</p>
          <p className="text-sm text-gray-500">Comunícate con el soporte técnico desde la sección{" "}
            <Link to="/sobre-nosotros" className="text-amber-700 font-semibold underline hover:text-amber-800">Sobre Nosotros</Link>{" "}
            para obtener ayuda adicional.
          </p>
        </div>
      </div>
    </div>
  );
}