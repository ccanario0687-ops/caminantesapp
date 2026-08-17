import jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * Generador Completo del Manual de Usuario en PDF para el Sistema de Emaús.
 * Crea un documento PDF profesional de múltiples páginas con diseño elegante borgoña y dorado.
 */
export function generarManualUsuarioPDF(comunidadActual = null) {
  try {
    toast.info("Generando Manual de Usuario en PDF... Por favor espera un momento.");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    let currentY = 15;
    let pageNumber = 1;

    // Colores corporativos Emaús
    const COLOR_BURGUNDY = [139, 26, 26]; // #8B1A1A
    const COLOR_GOLD = [184, 134, 11];    // #B8860B
    const COLOR_DARK = [40, 30, 25];     // #281E19
    const COLOR_LIGHT = [253, 246, 227]; // #FDF6E3
    const COLOR_TEXT = [50, 50, 50];

    // Helper para agregar cabecera en cada página
    const addPageHeader = (title = "MANUAL DE USUARIO · SISTEMA DE REGISTRO EMAÚS") => {
      doc.setFillColor(...COLOR_BURGUNDY);
      doc.rect(0, 0, pageWidth, 12, "F");

      doc.setFillColor(...COLOR_GOLD);
      doc.rect(0, 12, pageWidth, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), margin, 8);

      const fechaHoy = new Date().toLocaleDateString("es-DO", {
        day: "numeric", month: "long", year: "numeric"
      });
      doc.text(fechaHoy, pageWidth - margin, 8, { align: "right" });
    };

    // Helper para agregar pie de página
    const addPageFooter = () => {
      doc.setFillColor(...COLOR_GOLD);
      doc.rect(0, pageHeight - 10, pageWidth, 0.5, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      
      const nomCom = comunidadActual?.nombre || "Hermandad de Emaús";
      doc.text(`Hermandad de Emaús · ${nomCom} · Lucas 24, 13-35`, margin, pageHeight - 5);
      doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: "right" });
    };

    const checkPageBreak = (neededHeight = 20) => {
      if (currentY + neededHeight > pageHeight - 18) {
        addPageFooter();
        doc.addPage();
        pageNumber++;
        addPageHeader();
        currentY = 22;
      }
    };

    // ==========================================
    // 📄 PÁGINA 1: PORTADA PROFESIONAL
    // ==========================================
    doc.setFillColor(...COLOR_BURGUNDY);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Fondo decorativo con líneas doradas
    doc.setDrawColor(...COLOR_GOLD);
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Título Principal de la Portada
    doc.setTextColor(255, 255, 255);
    doc.setFont("serif", "bold");
    doc.setFontSize(26);
    doc.text("HERMANDAD DE EMAÚS", pageWidth / 2, 55, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(253, 230, 138); // Dorado suave
    doc.text("LUCAS 24, 13-35 · REGISTRO Y GESTIÓN INTEGRAL DE RETIROS", pageWidth / 2, 64, { align: "center" });

    doc.setFillColor(...COLOR_GOLD);
    doc.rect(pageWidth / 2 - 35, 72, 70, 1.5, "F");

    // Recuadro del Título del Manual
    doc.setFillColor(40, 10, 10);
    doc.roundedRect(margin + 10, 90, contentWidth - 20, 45, 4, 4, "F");
    doc.setDrawColor(...COLOR_GOLD);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin + 10, 90, contentWidth - 20, 45, 4, 4, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("MANUAL DE USUARIO Y GUÍA TÉCNICA", pageWidth / 2, 107, { align: "center" });
    
    doc.setFontSize(11);
    doc.setTextColor(253, 230, 138);
    doc.text("Documentación Completa de Módulos y Funcionalidades", pageWidth / 2, 117, { align: "center" });

    // Cita Bíblica en Portada
    doc.setFont("serif", "italic");
    doc.setFontSize(10);
    doc.setTextColor(240, 240, 240);
    const cita1 = "«¿No ardía nuestro corazón en nosotros, mientras nos hablaba en el camino";
    const cita2 = "y cuando nos abría las Escrituras?»";
    doc.text(cita1, pageWidth / 2, 150, { align: "center" });
    doc.text(cita2, pageWidth / 2, 156, { align: "center" });

    // Cuadro Informativo de Metadatos
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 15, 185, contentWidth - 30, 60, 3, 3, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_BURGUNDY);
    doc.text("INFORMACIÓN DEL SISTEMA", pageWidth / 2, 197, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    const infoCom = comunidadActual?.nombre || "Comunidad Emaús General";
    const infoPar = comunidadActual?.parroquia || "Parroquia Emaús";
    
    doc.text(`• Comunidad Activa: ${infoCom}`, margin + 25, 208);
    doc.text(`• Parroquia / Diócesis: ${infoPar}`, margin + 25, 215);
    doc.text(`• Versión del Sistema: 2.0 (Edición Nube & Tiempo Real)`, margin + 25, 222);
    doc.text(`• Fecha de Emisión: ${new Date().toLocaleDateString("es-DO")}`, margin + 25, 229);
    doc.text(`• Desarrollado para la Hermandad de Emaús`, margin + 25, 236);

    // Lema Final
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(253, 230, 138);
    doc.text("¡JESUCRISTO HA RESUCITADO... EN VERDAD HA RESUCITADO!", pageWidth / 2, pageHeight - 22, { align: "center" });

    // ==========================================
    // 📄 PÁGINA 2: ÍNDICE DE MÓDULOS
    // ==========================================
    doc.addPage();
    pageNumber++;
    addPageHeader("ÍNDICE DE MÓDULOS Y CONTENIDO");
    currentY = 22;

    doc.setFont("serif", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...COLOR_BURGUNDY);
    doc.text("TABLA DE CONTENIDOS", margin, currentY);
    currentY += 8;

    doc.setDrawColor(...COLOR_GOLD);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    const modulosIndice = [
      { num: "01", titulo: "Dashboard Principal y Conteo Regresivo", desc: "Resumen ejecutivo, estadísticas reconciliadas, alertas de cumpleaños y postal." },
      { num: "02", titulo: "Inscripciones Remotas Online & Públicas", desc: "Formulario público, panel de aprobación con auditoría de fecha y usuario." },
      { num: "03", titulo: "Gestión de Caminantes y Cobro de Fichas", desc: "Registro, edición, emisión de recibos PDF, carnetización e impresión de fichas." },
      { num: "04", titulo: "Gestión de Servidores y Equipos de Trabajo", desc: "Asignación de roles, directorio telefónico, WhatsApp y felicitación de cumpleaños." },
      { num: "05", titulo: "Distribución Inteligente de Mesas y Habitaciones", desc: "Algoritmo de mezcla equilibrada, distintivos de cama y puertas de cabañas." },
      { num: "06", titulo: "Programación en Tiempo Real y Alertas de Cocina", desc: "Reloj de retiro, bloqueo de actividades realizadas, cálculo de desviación y alertas." },
      { num: "07", titulo: "Pantalla en Vivo (Modo TV / Proyección)", desc: "Modo salón para proyector gigante con progreso y avisos dinámicos." },
      { num: "08", titulo: "Control de Entrada (Check-in con Escáner QR)", desc: "Verificación de llegada instantánea con código de carnet y reporte de ausentes." },
      { num: "09", titulo: "Módulo de Finanzas, Presupuesto y Cobros", desc: "Presupuestos, ingresos, egresos, comprobantes y balance financiero." },
      { num: "10", titulo: "Suplidores, Charlistas, Sacerdotes y Recursos", desc: "Control de proveedores, temas de charlas, confesores y biblioteca." },
      { num: "11", titulo: "Reportes Consolidados, Impresiones e Historial", desc: "Reportes exportables a PDF/Excel e historial de retiros anteriores." },
      { num: "12", titulo: "Seguridad, Permisos y Configuración de Retiros", desc: "Administración de usuarios, roles por módulo y parámetros de la comunidad." }
    ];

    modulosIndice.forEach((m) => {
      checkPageBreak(16);

      doc.setFillColor(248, 245, 235);
      doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_BURGUNDY);
      doc.text(`${m.num}. ${m.titulo}`, margin + 4, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(m.desc, margin + 4, currentY + 11);

      currentY += 17;
    });

    // ==========================================
    // 📄 DETALLE COMPLETO DE CADA MÓDULO (SECCIONES DETALLADAS)
    // ==========================================

    const seccionesDetalladas = [
      {
        titulo: "MÓDULO 1: DASHBOARD PRINCIPAL Y ALERTAS DE CUMPLEAÑOS",
        icono: "📊",
        items: [
          { subtitle: "Visión General Reconciliada", text: "Muestra métricas exactas del retiro activo: caminantes confirmados, pendientes, cancelados, servidores pagos y presentes." },
          { subtitle: "Indicadores de Capacidad", text: "Calcula en tiempo real el porcentaje de fichas llenas (% Fichas) comparado con el límite total configurado." },
          { subtitle: "Conteo Regresivo por Comunidad", text: "Temporizador automático en días, horas, minutos y segundos hacia el inicio del próximo retiro programado." },
          { subtitle: "🎂 Alerta de Cumpleaños & Postal Emaús", text: "Detecta automáticamente los cumpleañeros del día. Incluye botón '🎁 Felicitar' para abrir el editor de Postal de Cumpleaños con el logo oficial de Emaús, mensaje editable y envío directo por WhatsApp o descarga en imagen PNG HD." }
        ]
      },
      {
        titulo: "MÓDULO 2: INSCRIPCIONES REMOTAS ONLINE & AUDITORÍA",
        icono: "📝",
        items: [
          { subtitle: "Formulario Público de Inscripción", text: "Permite a caminantes y servidores completarse vía enlace público desde cualquier celular o computadora." },
          { subtitle: "Panel de Revisión y Aprobación", text: "Las solicitudes llegan en estado 'Pendiente'. El coordinador puede revisar el detalle y presionar 'Aprobar e Integrar'." },
          { subtitle: "Auditoría de Aprobaciones", text: "Cada aprobación registra automáticamente en la base de datos el nombre del usuario, correo electrónico, fecha y hora exacta en que fue aceptada la solicitud." }
        ]
      },
      {
        titulo: "MÓDULO 3: GESTIÓN DE CAMINANTES Y COBRO DE FICHAS",
        icono: "👥",
        items: [
          { subtitle: "Registro Presencial Completo", text: "Campos de datos personales, teléfono, parroquia, padrino/madrina, contacto de emergencia y observaciones médicas." },
          { subtitle: "Cobro de Fichas con Recibo PDF", text: "Gestión de cobro presencial (Efectivo/Transferencia). Genera e imprime automáticamente un Recibo de Pago Oficial en PDF." },
          { subtitle: "Impresiones Individuales", text: "Impresión de Fichas de Control, Carnets de Identificación y Diplomas o Distintivos." }
        ]
      },
      {
        titulo: "MÓDULO 4: GESTIÓN DE SERVIDORES Y DIRECTORIO",
        icono: "❤️",
        items: [
          { subtitle: "Estructura de Equipos", text: "Clasificación por roles: Rector, Sub-Rector, Músicos, Cocina, Salón, Liturgia, Transporte, Apoyo, Capilla, Limpieza, etc." },
          { subtitle: "Directorio Telefónico & WhatsApp", text: "Directorio con botón de llamada rápida y mensajería directa vía WhatsApp." },
          { subtitle: "Felicitación de Servidores", text: "Integración directa de Postal de Cumpleaños para servidores registrados en la comunidad." }
        ]
      },
      {
        titulo: "MÓDULO 5: DISTRIBUCIÓN INTELIGENTE DE MESAS Y HABITACIONES",
        icono: "🔀",
        items: [
          { subtitle: "Algoritmo de Mezcla Equilibrada", text: "Distribuye caminantes por mesas y habitaciones garantizando que integrantes de una misma parroquia se integren con otros hermanos." },
          { subtitle: "Asignación de Líderes de Mesa", text: "Los líderes de mesa son separados y asignados a cuartos exclusivos." },
          { subtitle: "Distintivos de Cabaña y Cama", text: "Impresión de distintivos para puertas de habitación y etiquetas de camas." }
        ]
      },
      {
        titulo: "MÓDULO 6: PROGRAMACIÓN EN TIEMPO REAL Y ALERTAS DE COCINA",
        icono: "📅",
        items: [
          { subtitle: "Reloj de Retiro y Agenda", text: "Cronograma estructurado por día (Viernes, Sábado, Domingo) con horarios previstos y reales." },
          { subtitle: "🔒 Bloqueo de Actividades Realizadas", text: "Al dar por terminada una actividad, se registra su hora real y los campos quedan estrictamente bloqueados en color rojo. Incluye opción de desbloqueo exclusivo." },
          { subtitle: "Cálculo de Desviación Acumulada", text: "Calcula en minutos el avance o retraso acumulado del programa y proyecta la Hora Final de Cierre del Día." },
          { subtitle: "🍳 Alertas de Cocina Sincronizadas en la Nube", text: "La cocina puede solicitar tiempo adicional desde su tablet o celular. La solicitud viaja por la nube (Base44 ConfigRetiro) y suena de inmediato en la computadora de Salón." }
        ]
      },
      {
        titulo: "MÓDULO 7: PANTALLA EN VIVO (MODO TV / PROYECCIÓN)",
        icono: "📺",
        items: [
          { subtitle: "Proyección en Pantalla Gigante", text: "Diseñada para proyector o televisor en el salón. Muestra la comunidad activa, la actividad actual y la barra de avance." },
          { subtitle: "Sincronización Automática (1.5s)", text: "Actualización fluida en tiempo real conforme Salón marca las actividades como completadas." }
        ]
      },
      {
        titulo: "MÓDULO 8: CONTROL DE ENTRADA (CHECK-IN CON QR)",
        icono: "🚪",
        items: [
          { subtitle: "Escáner y Marcado de Llegada", text: "Permite escanear el carnet QR o buscar por cédula/nombre para marcar la llegada instantánea." },
          { subtitle: "Reporte de Asistencia en Vivo", text: "Muestra lista de presentes vs. ausentes con la hora exacta de ingreso registrado." }
        ]
      },
      {
        titulo: "MÓDULO 9: FINANZAS, PRESUPUESTO Y COMPROBANTES",
        icono: "💵",
        items: [
          { subtitle: "Presupuesto por Categorías", text: "Control de montos presupuestados vs. reales en Alimentación, Transporte, Distintivos, Casa de Retiro, etc." },
          { subtitle: "Ingresos y Egresos", text: "Registro de ingresos por fichas y donaciones, y egresos con comprobantes físicos adjuntos." },
          { subtitle: "Balance Financiero", text: "Resumen de utilidad neta del retiro y exportación de reportes contables." }
        ]
      },
      {
        titulo: "MÓDULO 10: SUPLIDORES, CHARLISTAS Y SACERDOTES",
        icono: "🚚",
        items: [
          { subtitle: "Catálogo de Suplidores", text: "Registro de proveedores con balances pendientes y pagos realizados." },
          { subtitle: "Charlistas y Sacerdotes", text: "Agenda de temas de charlas, horarios y directorio de sacerdotes confesores." }
        ]
      },
      {
        titulo: "MÓDULO 11: REPORTES, IMPRESIONES E HISTORIAL",
        icono: "🖨️",
        items: [
          { subtitle: "Reportes Consolidados", text: "Generación de listados completos de caminantes, servidores, parroquias y finanzas en PDF y Excel." },
          { subtitle: "Historial de Retiros", text: "Archivo histórico para consultar ediciones anteriores y comparar asistencias." }
        ]
      },
      {
        titulo: "MÓDULO 12: SEGURIDAD, PERMISOS Y CONFIGURACIÓN",
        icono: "⚙️",
        items: [
          { subtitle: "Gestión de Usuarios y Roles", text: "Control de permisos por módulo para Administradores, Coordinadores, Secretaría y Finanzas." },
          { subtitle: "Configuración del Retiro", text: "Personalización de nombre de retiro, parroquia, diócesis, total de fichas y logos oficiales." }
        ]
      }
    ];

    seccionesDetalladas.forEach((sec) => {
      doc.addPage();
      pageNumber++;
      addPageHeader(sec.titulo);
      currentY = 22;

      // Encabezado de la Sección
      doc.setFillColor(...COLOR_BURGUNDY);
      doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(`${sec.icono} ${sec.titulo}`, margin + 5, currentY + 8);

      currentY += 18;

      sec.items.forEach((item) => {
        checkPageBreak(25);

        doc.setFillColor(253, 248, 238);
        doc.setDrawColor(...COLOR_GOLD);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...COLOR_BURGUNDY);
        doc.text(`• ${item.subtitle}`, margin + 4, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_TEXT);
        
        const lines = doc.splitTextToSize(item.text, contentWidth - 10);
        doc.text(lines, margin + 4, currentY + 11);

        currentY += 24;
      });
    });

    // Agregar pie de página en todas las páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i > 1) {
        addPageFooter();
      }
    }

    // Descargar el archivo PDF
    const nomArchivo = `Manual_Usuario_Sistema_Emaus_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomArchivo);
    toast.success("📘 ¡Manual de Usuario en PDF descargado exitosamente!");

  } catch (error) {
    console.error("Error generando el Manual en PDF:", error);
    toast.error("Ocurrió un error al generar el Manual en PDF.");
  }
}
