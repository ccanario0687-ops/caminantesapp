import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import BackArrow from "@/components/BackArrow";
import SelectorComunidad from "@/components/SelectorComunidad";
import { Printer, Users, Heart, Church, Droplets, Shirt, BedDouble, Hash, Crown, Camera, FileText, Wifi, WifiOff, Download, Phone, Minus, Plus, X, Upload, RefreshCw, Image as ImageIcon, SlidersHorizontal, Award } from "lucide-react";
import { toast } from "sonner";
import useOffline from "@/hooks/useOffline";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import ReporteEvaluaciones from "./ReporteEvaluaciones";

const REPORTES = [
  { id: "edades", label: "Por Rango de Edad", icon: Users },
  { id: "parroquia", label: "Por Parroquia", icon: Church },
  { id: "talla", label: "Por Talla de Camisa", icon: Shirt },
  { id: "sangre", label: "Por Tipo de Sangre", icon: Droplets },
  { id: "medicas", label: "Necesidades Médicas", icon: Heart },
  { id: "mesa", label: "Por Mesa", icon: Hash },
  { id: "contacto_mesa", label: "Contacto de Mesa", icon: Phone },
  { id: "habitacion", label: "Por Habitación", icon: BedDouble },
  { id: "foto_grupal", label: "Fotografía Grupal", icon: Camera },
  { id: "evaluaciones", label: "Evaluaciones & Satisfacción", icon: Award },
];

function normalizarTexto(texto) {
  if (!texto) return "SIN ASIGNAR";
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

function agrupar(caminantes, campo) {
  const acc = {};
  const displayNames = {};
  caminantes.forEach(c => {
    const rawValue = c[campo];
    const key = rawValue ? normalizarTexto(rawValue) : "SIN ASIGNAR";
    const displayName = rawValue || "Sin asignar";
    if (!displayNames[key]) displayNames[key] = displayName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
  });
  const result = {};
  Object.keys(acc).forEach(key => { result[displayNames[key]] = acc[key]; });
  return result;
}

function agruparEdad(caminantes) {
  const rangos = { "18-25": [], "26-35": [], "36-45": [], "46-55": [], "56-65": [], "65+": [], "Sin dato": [] };
  caminantes.forEach(c => {
    const e = c.edad;
    if (!e) rangos["Sin dato"].push(c);
    else if (e <= 25) rangos["18-25"].push(c);
    else if (e <= 35) rangos["26-35"].push(c);
    else if (e <= 45) rangos["36-45"].push(c);
    else if (e <= 55) rangos["46-55"].push(c);
    else if (e <= 65) rangos["56-65"].push(c);
    else rangos["65+"].push(c);
  });
  return rangos;
}

function EncabezadoRetiro({ config, filtroRetiro, titulo, total, nombreComunidad }) {
  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Retiro #${config.edicion}` : (filtroRetiro ? `Retiro #${filtroRetiro}` : "");
  return (
    <div className="mb-3 pb-2 border-b-2 border-amber-300 print:mb-2 print:pb-1">
      <div className="flex items-start gap-3">
        {config?.logo_url ? (
          <img src={config.logo_url} alt="Logo" className="h-12 w-auto object-contain print:h-10" />
        ) : (
          <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-800 font-bold text-xs print:h-10 print:w-10 border border-amber-200">
            EMAÚS
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-amber-900 print:text-base">{nombreRetiro}</h1>
            {edicion && <span className="text-sm text-amber-700 font-medium print:text-xs">{edicion}</span>}
            {nombreComunidad && <span className="text-xs text-amber-800 font-bold print:text-[10px] bg-amber-200/60 px-2 py-0.5 rounded">Comunidad: {nombreComunidad}</span>}
          </div>
          {(config?.lugar || config?.fecha_inicio || config?.fecha_fin) && (
            <p className="text-xs text-gray-600 print:text-[10px]">
              {config?.lugar && <span>{config.lugar}</span>}
              {config?.lugar && (config.fecha_inicio || config.fecha_fin) && " · "}
              {config.fecha_inicio && new Date(config.fecha_inicio + "T12:00:00").toLocaleDateString("es-ES")}
              {config.fecha_inicio && config.fecha_fin && " — "}
              {config.fecha_fin && new Date(config.fecha_fin + "T12:00:00").toLocaleDateString("es-ES")}
            </p>
          )}
          <h2 className="text-sm font-semibold text-gray-800 mt-0.5 print:text-xs">{titulo}</h2>
        </div>
        <div className="text-right text-[10px] text-gray-500 print:text-[9px]">
          <div className="font-bold text-amber-700 text-xs print:text-[10px]">{total} caminante(s)</div>
          {config?.coordinador && <div>Coord.: {config.coordinador}</div>}
          {config?.sub_coordinador && <div>Sub-Coord.: {config.sub_coordinador}</div>}
          <div>{new Date().toLocaleDateString("es-ES")}</div>
        </div>
      </div>
    </div>
  );
}

const PRINT_STYLES = `
  @media print {
    @page { size: A4 portrait; margin: 10mm 12mm; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 10px; background: white !important; color: black !important; line-height: 1.15 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    button, nav, aside, header, footer, [data-sidebar], [class*="sidebar"], .print-hide { display: none !important; }
    .print\\:hidden { display: none !important; }
    .hidden.print\\:block { display: block !important; }
    body > *, #root, [id="root"] > *, main, [class*="layout"] {
      padding: 0 !important; margin: 0 !important; background: white !important; border: none !important; box-shadow: none !important;
    }
    table { border-collapse: collapse; width: 100%; font-size: 10px; margin-bottom: 4px; table-layout: fixed !important; }
    th { background-color: #fef3c7 !important; color: #78350f !important; padding: 3px 5px !important; text-align: left !important; vertical-align: middle !important; font-size: 9px !important; font-weight: bold !important; border: 1px solid #fde68a !important; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2 !important; }
    td { padding: 2px 5px !important; border: 1px solid #e5e7eb !important; font-size: 10px !important; color: #000000 !important; text-align: left !important; vertical-align: middle !important; line-height: 1.15 !important; word-wrap: break-word; overflow-wrap: break-word; }
    tr:nth-child(even) td { background-color: #fffbf0 !important; }
    .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
    .total-final { border-top: 2px solid #000 !important; margin-top: 8px !important; padding-top: 4px !important; font-weight: bold !important; font-size: 11px !important; }
  }
`;

const PRINT_STYLES_HORIZONTAL = `
  @media print {
    @page { size: letter landscape; margin: 6mm 8mm; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white !important; color: black !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    button, nav, aside, header, footer, [data-sidebar], [class*="sidebar"], .print-hide { display: none !important; }
    .print\\:hidden { display: none !important; }
    .hidden.print\\:block { display: block !important; }
    body > *, #root, [id="root"] > *, main {
      padding: 0 !important; margin: 0 !important; background: white !important; border: none !important; box-shadow: none !important;
    }
    .contacto-header {
      display: flex !important; align-items: center !important; justify-content: space-between !important;
      border-bottom: 1.5px solid #78350f !important; padding-bottom: 3px !important; margin-bottom: 4px !important;
    }
    .contacto-header-left { display: flex !important; align-items: center !important; gap: 6px !important; }
    .contacto-header-logo { height: 24px !important; width: auto !important; object-fit: contain !important; }
    .contacto-header-title { font-size: 12px !important; font-weight: 900 !important; color: #78350f !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; margin: 0 !important; line-height: 1 !important; }
    .contacto-header-sub { font-size: 8px !important; color: #92400e !important; font-weight: 600 !important; margin: 0 !important; line-height: 1.1 !important; }
    .contacto-header-info { font-size: 7px !important; color: #6b7280 !important; margin: 1px 0 0 0 !important; line-height: 1.1 !important; }
    .contacto-header-right { text-align: right !important; }
    .contacto-header-report { font-size: 10px !important; font-weight: 800 !important; color: #78350f !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; margin: 0 !important; line-height: 1 !important; }
    .contacto-grid { display: grid !important; gap: 3px !important; width: 100% !important; }
    .contacto-grid.cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
    .contacto-grid.cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
    .contacto-grid.cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
    .contacto-grid.cols-5 { grid-template-columns: repeat(5, 1fr) !important; }
    .contacto-grid.cols-6 { grid-template-columns: repeat(6, 1fr) !important; }
    .mesa-card { border: 0.5px solid #9ca3af !important; border-radius: 2px !important; overflow: hidden !important; background: white !important; page-break-inside: avoid !important; }
    .mesa-card-header { background-color: #78350f !important; color: #ffffff !important; padding: 1.5px 4px !important; font-size: 7.5px !important; font-weight: bold !important; text-transform: uppercase !important; display: flex !important; justify-content: space-between !important; align-items: center !important; line-height: 1.1 !important; }
    .mesa-card-header .mesa-num { letter-spacing: 0.3px !important; }
    .mesa-card-header .mesa-count { font-size: 6.5px !important; font-weight: normal !important; opacity: 0.85 !important; }
    .mesa-table { border-collapse: collapse !important; width: 100% !important; font-size: 7px !important; margin: 0 !important; }
    .mesa-table th { background-color: #fef3c7 !important; color: #78350f !important; padding: 1px 3px !important; text-align: left !important; font-size: 6.5px !important; font-weight: bold !important; text-transform: uppercase !important; border: 0.5px solid #fde68a !important; line-height: 1.05 !important; }
    .mesa-table td { padding: 0.8px 3px !important; border: 0.5px solid #d1d5db !important; font-size: 7px !important; line-height: 1.05 !important; vertical-align: middle !important; word-break: break-word !important; }
    .mesa-table tr.lider-row td { background-color: #fef3c7 !important; font-weight: bold !important; }
    .mesa-table tr:nth-child(even):not(.lider-row) td { background-color: #fafafa !important; }
    .crown-icon { color: #b45309 !important; font-size: 7px !important; margin-right: 1px !important; }
  }
`;

export default function Reportes() {
  const { records: todosCaminantes, loading, online } = useOffline("Caminante");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();
  
  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const [config, setConfig] = useState(null);
  const [reporteActivo, setReporteActivo] = useState("edades");
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [distribucion, setDistribucion] = useState(null);
  const [personasPorFila, setPersonasPorFila] = useState(20);
  const [mostrarFotoGrupal, setMostrarFotoGrupal] = useState(false);
  const printRef = useRef();

  // 🔒 AISLAMIENTO MULTI-TENANT DE CAMINANTES
  const caminantes = (todosCaminantes || []).filter(c => 
    !equipoIdActivo || 
    c.equipo_id === equipoIdActivo || 
    c.comunidad_id === equipoIdActivo || 
    c.retiro_id === equipoIdActivo
  );

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setConfig(cfgs[0]);
        setFiltroRetiro(cfgs[0].edicion ? String(cfgs[0].edicion) : "");
      }
    }).catch(() => {});
    
    const cargarDistribucion = () => {
      try {
        const storageSuffix = equipoIdActivo ? `_${equipoIdActivo}` : "";
        const distData = localStorage.getItem(`distribucion_caminantes_v5${storageSuffix}`) || localStorage.getItem("distribucion_caminantes_v5");
        if (distData) {
          setDistribucion(JSON.parse(distData));
        } else {
          setDistribucion(null);
        }
      } catch (e) {
        console.error("Error cargando distribución", e);
      }
    };

    cargarDistribucion();
    window.addEventListener("distribucionActualizada", cargarDistribucion);
    window.addEventListener("storage", cargarDistribucion);

    return () => {
      window.removeEventListener("distribucionActualizada", cargarDistribucion);
      window.removeEventListener("storage", cargarDistribucion);
    };
  }, [equipoIdActivo]);

  const numRetiro = filtroRetiro && !isNaN(Number(filtroRetiro)) ? Number(filtroRetiro) : null;
  const filtrados = numRetiro !== null
    ? caminantes.filter(c => c.numero_retiro === numRetiro)
    : caminantes;

  const getDatos = () => {
    if ((reporteActivo === "mesa" || reporteActivo === "habitacion" || reporteActivo === "contacto_mesa") && distribucion && filtrados.length > 0) {
      const caminantesMap = new Map(filtrados.map(c => [String(c.id), c]));
      
      if ((reporteActivo === "mesa" || reporteActivo === "contacto_mesa") && distribucion.gruposMesa && distribucion.gruposMesa.length > 0) {
        const acc = {};
        distribucion.gruposMesa.forEach(mesa => {
          const miembrosFiltrados = mesa.miembros
            .filter(m => caminantesMap.has(String(m.id)))
            .map(m => {
              const caminanteCompleto = caminantesMap.get(String(m.id));
              return {
                ...caminanteCompleto,
                _esLider: m._esLider || caminanteCompleto.rol_en_mesa === "Líder de Mesa",
                rol_en_mesa: m.rol_en_mesa || caminanteCompleto.rol_en_mesa,
                numero_mesa: mesa.numero,
              };
            });
          if (miembrosFiltrados.length > 0) acc[String(mesa.numero)] = miembrosFiltrados;
        });
        if (Object.keys(acc).length > 0) return acc;
      }
      
      if (reporteActivo === "habitacion" && (distribucion.habLideres?.length > 0 || distribucion.habRegulares?.length > 0)) {
        const acc = {};
        [...(distribucion.habLideres || []), ...(distribucion.habRegulares || [])].forEach(hab => {
          const miembrosFiltrados = hab.miembros
            .filter(m => caminantesMap.has(String(m.id)))
            .map(m => {
              const caminanteCompleto = caminantesMap.get(String(m.id));
              return {
                ...caminanteCompleto,
                _esLider: m._esLider || caminanteCompleto.rol_en_mesa === "Líder de Mesa",
                rol_en_mesa: m.rol_en_mesa || caminanteCompleto.rol_en_mesa,
                numero_habitacion: hab.numero,
                _esHabLider: hab.esLideres || false,
              };
            });
          if (miembrosFiltrados.length > 0) acc[String(hab.numero)] = miembrosFiltrados;
        });
        if (Object.keys(acc).length > 0) return acc;
      }
    }

    switch (reporteActivo) {
      case "edades": return agruparEdad(filtrados);
      case "parroquia": {
        const filtradosSinLM = filtrados.filter(c => c.rol_en_mesa !== "Líder de Mesa" && !c._esLider);
        return agrupar(filtradosSinLM, "parroquia");
      }
      case "talla": {
        const filtradosSinLM = filtrados.filter(c => c.rol_en_mesa !== "Líder de Mesa" && !c._esLider);
        return agrupar(filtradosSinLM, "talla_camisa");
      }
      case "sangre": return agrupar(filtrados, "tipo_sangre");
      case "mesa": return agrupar(filtrados, "numero_mesa");
      case "contacto_mesa": return agrupar(filtrados, "numero_mesa");
      case "habitacion": return agrupar(filtrados, "numero_habitacion");
      case "medicas": {
        const conNecesidad = filtrados.filter(c => c.necesidades_medicas && c.necesidades_medicas.trim() !== "");
        return { "Con necesidades médicas": conNecesidad };
      }
      case "foto_grupal": return null;
      default: return {};
    }
  };

  const datos = getDatos();
  const reporte = REPORTES.find(r => r.id === reporteActivo);
  
  const totalReporte = datos 
    ? Object.values(datos).reduce((acc, miembros) => acc + (miembros ? miembros.length : 0), 0)
    : filtrados.length;

  const exportarAExcel = () => {
    if (!datos) {
      alert("La exportación a Excel no está disponible para este reporte.");
      return;
    }

    const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
    const edicion = config?.edicion ? `Edición #${config.edicion}` : (filtroRetiro ? `Retiro #${filtroRetiro}` : "");
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Reporte</title>
      <style>
        h1 { font-size: 14pt; font-weight: bold; color: #92400e; margin: 0 0 4px 0; }
        h2 { font-size: 11pt; color: #78350f; margin: 0 0 6px 0; }
        p { font-size: 9pt; color: #555; margin: 1px 0; }
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin-top: 4px; }
        th { background-color: #fef3c7; color: #78350f; font-weight: bold; padding: 4px 6px; text-align: left; font-size: 10pt; border: 1px solid #fde68a; text-transform: uppercase; }
        td { border: 1px solid #e5e7eb; padding: 3px 6px; font-size: 10pt; text-align: left; color: #000000; }
        .grupo-header { background-color: #fef3c7; color: #78350f; font-weight: bold; font-size: 11pt; padding: 6px 8px; border-bottom: 2px solid #f59e0b; }
        .lider { font-weight: bold; background-color: #fef3c7; }
        .total-final { border-top: 2px solid #000; margin-top: 10px; font-weight: bold; font-size: 11pt; }
      </style>
      </head><body>
      <h1>${nombreRetiro}</h1>
      ${edicion ? `<h2>${edicion}</h2>` : ''}
      <p><b>Comunidad:</b> ${comunidadActual?.nombre || 'General'} | <b>Reporte:</b> ${reporte?.label} | <b>Total:</b> ${totalReporte} caminantes | <b>Fecha:</b> ${new Date().toLocaleDateString("es-ES")}</p>
      <br>
    `;

    const grupos = Object.entries(datos).filter(([, miembros]) => miembros && miembros.length > 0);
    const gruposOrdenados = (reporteActivo === "mesa" || reporteActivo === "contacto_mesa" || reporteActivo === "habitacion" || reporteActivo === "talla")
      ? [...grupos].sort(([a], [b]) => Number(a) - Number(b))
      : grupos;

    gruposOrdenados.forEach(([grupo, miembros]) => {
      const tituloGrupo = grupo === "undefined" || grupo === "null" ? "Sin asignar" : grupo;
      const prefijo = reporteActivo === "mesa" || reporteActivo === "contacto_mesa" ? "MESA" : reporteActivo === "habitacion" ? "HABITACIÓN" : reporteActivo === "talla" ? "TALLA" : "";
      
      html += `<table><tr><td colspan="10" class="grupo-header">${prefijo} ${tituloGrupo}</td></tr>`;
      
      let headers = "<tr><th>Nombre</th>";
      if (reporteActivo === "contacto_mesa") {
        headers += "<th>Teléfono</th><th>Parroquia</th>";
      } else if (reporteActivo === "medicas") headers += "<th>Edad</th><th>Mesa</th><th>Hab.</th><th>Necesidad Médica</th>";
      else if (reporteActivo === "talla") headers += "<th>Talla</th>";
      else if (reporteActivo === "mesa") headers += "<th>Edad</th><th>Peso</th><th>Altura</th><th>Size</th><th>Hab.</th><th>Rol</th><th>Parroquia</th><th>Teléfono</th>";
      else if (reporteActivo === "habitacion") headers += "<th>Edad</th><th>Peso</th><th>Altura</th><th>Size</th><th>Mesa</th><th>Parroquia</th><th>Teléfono</th>";
      else if (reporteActivo === "parroquia") headers += "<th>Edad</th><th>Teléfono</th><th>Mesa</th><th>Habitación</th>";
      else headers += "<th>Edad</th><th>Parroquia</th><th>Mesa</th><th>Habitación</th>";
      headers += "</tr>";
      html += headers;

      let miembrosAMostrar = (reporteActivo === "talla" || reporteActivo === "parroquia") 
        ? miembros.filter(m => m.rol_en_mesa !== "Líder de Mesa" && !m._esLider) 
        : miembros;
      
      if (reporteActivo === "mesa" || reporteActivo === "contacto_mesa") {
        miembrosAMostrar = [...miembrosAMostrar].sort((a, b) => {
          const aEsLider = (a.rol_en_mesa === "Líder de Mesa" || a._esLider) ? 0 : 1;
          const bEsLider = (b.rol_en_mesa === "Líder de Mesa" || b._esLider) ? 0 : 1;
          return aEsLider - bEsLider;
        });
      }
      
      miembrosAMostrar.forEach(c => {
        const esLider = (reporteActivo === "mesa" || reporteActivo === "contacto_mesa") && (c.rol_en_mesa === "Líder de Mesa" || c._esLider);
        html += `<tr class="${esLider ? 'lider' : ''}">`;
        html += `<td>${esLider ? '👑 ' : ''}${c.nombre}</td>`;
        
        if (reporteActivo === "contacto_mesa") {
          html += `<td>${c.telefono || '-'}</td><td>${c.parroquia || '-'}</td>`;
        } else if (reporteActivo === "medicas") html += `<td>${c.edad || '-'}</td><td>${c.numero_mesa || '-'}</td><td>${c.numero_habitacion || '-'}</td><td>${c.necesidades_medicas || '-'}</td>`;
        else if (reporteActivo === "talla") html += `<td>${c.talla_camisa || '-'}</td>`;
        else if (reporteActivo === "mesa") html += `<td>${c.edad || '-'}</td><td>${c.peso_kg || '-'}</td><td>${c.talla_cm || '-'}</td><td>${c.talla_camisa || '-'}</td><td>${c.numero_habitacion || '-'}</td><td>${(c.rol_en_mesa === "Líder de Mesa" || c._esLider) ? "Líder" : "Caminante"}</td><td>${c.parroquia || '-'}</td><td>${c.telefono || '-'}</td>`;
        else if (reporteActivo === "habitacion") html += `<td>${c.edad || '-'}</td><td>${c.peso_kg || '-'}</td><td>${c.talla_cm || '-'}</td><td>${c.talla_camisa || '-'}</td><td>${c.numero_mesa || '-'}</td><td>${c.parroquia || '-'}</td><td>${c.telefono || '-'}</td>`;
        else if (reporteActivo === "parroquia") html += `<td>${c.edad || '-'}</td><td>${c.telefono || '-'}</td><td>${c.numero_mesa || '-'}</td><td>${c.numero_habitacion || '-'}</td>`;
        else html += `<td>${c.edad || '-'}</td><td>${c.parroquia || '-'}</td><td>${c.numero_mesa || '-'}</td><td>${c.numero_habitacion || '-'}</td>`;
        
        html += `</tr>`;
      });
      
      html += `</table>`;
    });

    html += `
      <table class="total-final">
        <tr>
          <td style="text-align: right; padding-right: 10px;">TOTAL DE CAMINANTES:</td>
          <td style="font-weight: bold;">${totalReporte}</td>
        </tr>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${reporteActivo}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen bg-amber-50 flex items-center justify-center"><p className="text-amber-600">Cargando...</p></div>;

  const esHorizontal = reporteActivo === "contacto_mesa";

  return (
    <div className="min-h-screen bg-amber-50 print:bg-white pb-12">
      <style>{esHorizontal ? PRINT_STYLES_HORIZONTAL : PRINT_STYLES}</style>

      {/* Selector de Comunidad Superior */}
      <div className="max-w-6xl mx-auto pt-4 px-5 print:hidden">
        <SelectorComunidad />
      </div>
      
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-5 py-4 shadow-lg print:hidden mt-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackArrow />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">Reportes de Retiro</h1>
                {online ? (
                  <span className="flex items-center gap-1 text-xs text-green-300 bg-green-800/40 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-800/40 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <p className="text-amber-200 text-xs">Genera e imprime reportes para {comunidadActual?.nombre || "la comunidad activa"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {reporteActivo === "foto_grupal" && (
              <button onClick={() => setMostrarFotoGrupal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow">
                <ImageIcon className="w-3.5 h-3.5" /> Crear Fotografía
              </button>
            )}
            <button onClick={exportarAExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow" disabled={reporteActivo === "foto_grupal"}>
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 py-4 print:px-0 print:py-0">
        <div className="flex gap-3 print:hidden">
          <div className="w-48 shrink-0">
            <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden sticky top-3">
              {REPORTES.map(r => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => setReporteActivo(r.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left border-b border-amber-50 transition-colors ${reporteActivo === r.id ? "bg-amber-700 text-white font-semibold" : "text-amber-800 hover:bg-amber-50"}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1" ref={printRef}>
            {reporteActivo === "evaluaciones"
              ? <ReporteEvaluaciones />
              : reporteActivo === "foto_grupal"
                ? <ReporteFotoGrupal caminantes={filtrados} config={config} personasPorFila={personasPorFila} setPersonasPorFila={setPersonasPorFila} onAbrirModal={() => setMostrarFotoGrupal(true)} />
                : reporteActivo === "contacto_mesa"
                  ? <ReporteContactoMesa datos={datos} config={config} filtroRetiro={filtroRetiro} total={totalReporte} nombreComunidad={comunidadActual?.nombre} />
                  : <ReporteContenido datos={datos} reporteActivo={reporteActivo} total={totalReporte} nombreComunidad={comunidadActual?.nombre} />
            }
          </div>
        </div>

        <div className="hidden print:block">
          {reporteActivo === "evaluaciones"
            ? <ReporteEvaluaciones />
            : reporteActivo === "foto_grupal"
              ? <ReporteFotoGrupalPrint caminantes={filtrados} config={config} filtroRetiro={filtroRetiro} personasPorFila={personasPorFila} />
              : reporteActivo === "contacto_mesa"
                ? <ReporteContactoMesa datos={datos} config={config} filtroRetiro={filtroRetiro} total={totalReporte} impresion nombreComunidad={comunidadActual?.nombre} />
                : <ReporteContenido datos={datos} reporteActivo={reporteActivo} config={config} filtroRetiro={filtroRetiro} titulo={reporte?.label} total={totalReporte} impresion nombreComunidad={comunidadActual?.nombre} />
          }
        </div>
      </div>

      {mostrarFotoGrupal && (
        <FotografiaGrupalModal equipoIdActivo={equipoIdActivo} onClose={() => setMostrarFotoGrupal(false)} />
      )}
    </div>
  );
}

function ReporteContactoMesa({ datos, config, filtroRetiro, total, impresion, nombreComunidad }) {
  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Retiro #${config.edicion}` : (filtroRetiro ? `Retiro #${filtroRetiro}` : "");
  
  const grupos = Object.entries(datos).filter(([, miembros]) => miembros && miembros.length > 0);
  const gruposOrdenados = [...grupos].sort(([a], [b]) => Number(a) - Number(b));
  const numMesas = gruposOrdenados.length;

  let numColumnas = 2;
  if (numMesas > 20) numColumnas = 6;
  else if (numMesas > 15) numColumnas = 5;
  else if (numMesas > 10) numColumnas = 4;
  else if (numMesas > 5) numColumnas = 3;

  return (
    <div className="space-y-3 print:space-y-0">
      {impresion ? (
        <div className="contacto-header">
          <div className="contacto-header-left">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="contacto-header-logo" />
            ) : (
              <div className="h-6 w-6 bg-amber-100 rounded flex items-center justify-center text-amber-800 font-bold text-[8px] border border-amber-200">
                E
              </div>
            )}
            <div>
              <h1 className="contacto-header-title">{nombreRetiro}</h1>
              {edicion && <p className="contacto-header-sub">{edicion}</p>}
              {(config?.lugar || config?.fecha_inicio) && (
                <p className="contacto-header-info">
                  {config?.lugar && <span>{config.lugar}</span>}
                  {config?.lugar && config?.fecha_inicio && " · "}
                  {config?.fecha_inicio && new Date(config.fecha_inicio + "T12:00:00").toLocaleDateString("es-ES")}
                  {config?.fecha_inicio && config?.fecha_fin && " — "}
                  {config?.fecha_fin && new Date(config.fecha_fin + "T12:00:00").toLocaleDateString("es-ES")}
                </p>
              )}
            </div>
          </div>
          <div className="contacto-header-right">
            <h2 className="contacto-header-report">Contacto de Mesa</h2>
            <p className="contacto-header-info">
              Comunidad: {nombreComunidad || "General"} · {numMesas} {numMesas === 1 ? 'mesa' : 'mesas'} · {total} caminantes · {new Date().toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-700 text-white p-2 rounded-lg">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">Contacto de Mesa</h3>
                <p className="text-xs text-amber-700">Formato horizontal · {numMesas} mesas · {total} caminantes · Comunidad: {nombreComunidad || "General"}</p>
              </div>
            </div>
            <div className="text-right text-xs text-amber-700">
              <div className="font-semibold">Vista previa</div>
              <div>Impresión: 1 hoja horizontal</div>
            </div>
          </div>
        </div>
      )}

      <div className={
        impresion 
          ? `contacto-grid cols-${numColumnas}` 
          : `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`
      }>
        {gruposOrdenados.map(([grupo, miembros]) => {
          const miembrosOrdenados = [...miembros].sort((a, b) => {
            const aEsLider = (a.rol_en_mesa === "Líder de Mesa" || a._esLider) ? 0 : 1;
            const bEsLider = (b.rol_en_mesa === "Líder de Mesa" || b._esLider) ? 0 : 1;
            return aEsLider - bEsLider;
          });

          const lider = miembrosOrdenados.find(m => m.rol_en_mesa === "Líder de Mesa" || m._esLider);

          return (
            <div 
              key={grupo} 
              className={impresion ? "mesa-card" : "bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden"}
            >
              <div className={
                impresion 
                  ? "mesa-card-header" 
                  : "bg-gradient-to-r from-amber-700 to-amber-600 text-white px-3 py-1.5 flex justify-between items-center"
              }>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="mesa-num font-bold">MESA {grupo}</span>
                  {lider && !impresion && (
                    <span className="text-xs opacity-90 truncate">· {lider.nombre}</span>
                  )}
                </div>
                <span className="mesa-count whitespace-nowrap ml-2">
                  {miembrosOrdenados.length} pers.
                </span>
              </div>

              <table className={impresion ? "mesa-table" : "w-full text-xs"}>
                <colgroup>
                  <col style={{ width: "50%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "22%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 bg-amber-50 text-amber-900 font-bold border-b border-amber-200 uppercase text-[10px] tracking-wide">
                      Nombre
                    </th>
                    <th className="text-left px-2 py-1 bg-amber-50 text-amber-900 font-bold border-b border-amber-200 uppercase text-[10px] tracking-wide">
                      Teléfono
                    </th>
                    <th className="text-left px-2 py-1 bg-amber-50 text-amber-900 font-bold border-b border-amber-200 uppercase text-[10px] tracking-wide">
                      Parroquia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {miembrosOrdenados.map((c) => {
                    const esLider = c.rol_en_mesa === "Líder de Mesa" || c._esLider;
                    return (
                      <tr key={c.id} className={esLider ? "lider-row" : ""}>
                        <td className="px-2 py-1 border-b border-gray-100">
                          <div className="flex items-center gap-1">
                            {esLider && <span className="crown-icon">👑</span>}
                            <span className={esLider ? "font-bold text-amber-900" : "text-gray-800"}>
                              {c.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1 border-b border-gray-100">
                          <span className="text-gray-700 font-medium">
                            {c.telefono || <span className="text-gray-400 italic">—</span>}
                          </span>
                        </td>
                        <td className="px-2 py-1 border-b border-gray-100">
                          <span className="text-gray-600 text-[10px]">
                            {c.parroquia || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {!impresion && (
        <div className="mt-4 pt-3 border-t-2 border-amber-300 flex justify-end items-center gap-3">
          <span className="text-sm font-bold text-amber-900 uppercase tracking-wide">
            Total de Caminantes:
          </span>
          <span className="text-xl font-black text-amber-700">{total}</span>
        </div>
      )}
    </div>
  );
}

function ordenarParaFoto(caminantes) {
  const prioridad = (c) => {
    if (c.edad >= 65) return true;
    if (c.condicion_fisica && c.condicion_fisica !== "Ninguna") return true;
    if (c.peso_kg && c.talla_cm) {
      const imc = c.peso_kg / Math.pow(c.talla_cm / 100, 2);
      if (imc > 30) return true;
    }
    return false;
  };
  const primera = caminantes.filter(prioridad).sort((a, b) => (a.talla_cm || 160) - (b.talla_cm || 160));
  const resto = caminantes.filter(c => !prioridad(c)).sort((a, b) => (a.talla_cm || 160) - (b.talla_cm || 160));
  return [...primera, ...resto];
}

function dividirFilas(lista, porFila = 20) {
  const filas = [];
  for (let i = 0; i < lista.length; i += porFila) {
    filas.push(lista.slice(i, i + porFila));
  }
  return filas;
}

function generarLeyenda(filas) {
  const nombres_fila = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA"];
  return filas.map((fila, i) =>
    `DE IZQUIERDA A DERECHA ${nombres_fila[i] || `FILA ${i + 1}`} FILA: ${fila.map(c => c.nombre).join(", ")}.`
  ).join("\n\n");
}

function ReporteFotoGrupal({ caminantes, config, personasPorFila, setPersonasPorFila, onAbrirModal }) {
  const ordenados = ordenarParaFoto(caminantes);
  const filas = dividirFilas(ordenados, personasPorFila);
  const nombres_fila = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA"];
  const [leyenda, setLeyenda] = useState(false);

  const textoLeyenda = generarLeyenda(filas);

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg border-2 border-purple-400 shadow-lg p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Crear Fotografía Grupal Oficial</h3>
              <p className="text-sm text-purple-100 mt-0.5">
                Genera la fotografía oficial del retiro con logo, título, leyenda automática y versículo
              </p>
            </div>
          </div>
          <button 
            onClick={onAbrirModal}
            className="flex items-center gap-2 bg-white text-purple-700 hover:bg-purple-50 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg"
          >
            <Camera className="w-4 h-4" /> Abrir Editor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" /> Distribución para Fotografía Grupal
          </h3>
          <button onClick={() => setLeyenda(!leyenda)}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded-lg text-xs font-medium">
            <FileText className="w-3 h-3" /> {leyenda ? "Ocultar" : "Generar"} Leyenda
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Personas por fila
              </label>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Ajusta cuántas personas irán en cada fila de la foto y la leyenda
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPersonasPorFila(Math.max(5, personasPorFila - 1))}
                disabled={personasPorFila <= 5}
                className="w-8 h-8 flex items-center justify-center bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4 text-amber-800" />
              </button>
              <input
                type="number"
                min="5"
                max="50"
                value={personasPorFila}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 5 && val <= 50) {
                    setPersonasPorFila(val);
                  }
                }}
                className="w-16 h-8 text-center text-sm font-bold border-2 border-amber-400 rounded-lg focus:outline-none focus:border-amber-600 bg-white text-amber-900"
              />
              <button
                onClick={() => setPersonasPorFila(Math.min(50, personasPorFila + 1))}
                disabled={personasPorFila >= 50}
                className="w-8 h-8 flex items-center justify-center bg-white border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4 text-amber-800" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-amber-700">
            <span><strong>{caminantes.length}</strong> caminantes</span>
            <span>·</span>
            <span><strong>{filas.length}</strong> {filas.length === 1 ? 'fila' : 'filas'}</span>
            <span>·</span>
            <span><strong>{personasPorFila}</strong> por fila</span>
          </div>
        </div>

        <div className="space-y-2">
          {filas.map((fila, fi) => (
            <div key={fi}>
              <p className="text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">
                {nombres_fila[fi] || `Fila ${fi + 1}`} FILA {fi === 0 ? "(Prioridad)" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fila.map((c, ci) => {
                  const esPrior = (c.edad >= 65) || (c.condicion_fisica && c.condicion_fisica !== "Ninguna");
                  return (
                    <div key={c.id} className={`flex flex-col items-center p-1.5 rounded border text-center w-16 ${esPrior && fi === 0 ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${esPrior && fi === 0 ? "bg-amber-600" : "bg-gray-400"}`}>
                        {ci + 1}
                      </div>
                      <p className="text-[9px] text-gray-700 leading-tight text-center mt-0.5">
                        {c.nombre.split(" ").slice(0, 2).join(" ")}
                      </p>
                      {c.talla_cm && <p className="text-gray-400" style={{ fontSize: "8px" }}>{c.talla_cm}cm</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {leyenda && (
        <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-3">
          <h4 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Leyenda Textual de Posiciones
          </h4>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2 text-[10px] text-amber-800">
            <strong>Configuración:</strong> {personasPorFila} personas por fila · {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
          </div>
          <pre className="bg-amber-50 rounded p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed border border-amber-100">
            {textoLeyenda}
          </pre>
          <button onClick={() => navigator.clipboard.writeText(textoLeyenda)}
            className="mt-1 text-[11px] text-amber-600 hover:text-amber-800 underline">
            Copiar al portapapeles
          </button>
        </div>
      )}
    </div>
  );
}

function ReporteFotoGrupalPrint({ caminantes, config, filtroRetiro, personasPorFila, nombreComunidad }) {
  const ordenados = ordenarParaFoto(caminantes);
  const filas = dividirFilas(ordenados, personasPorFila);
  const nombres_fila = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA"];
  
  const textoLeyenda = generarLeyenda(filas);

  return (
    <div>
      <EncabezadoRetiro config={config} filtroRetiro={filtroRetiro} titulo="Fotografía Grupal" total={caminantes.length} nombreComunidad={nombreComunidad} />
      <p className="text-[9px] text-gray-600 mb-2 italic">
        Configuración: {personasPorFila} personas por fila · {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
      </p>
      <div className="space-y-2">
        {filas.map((fila, fi) => (
          <div key={fi} className="print:break-inside-avoid">
            <p className="text-[10px] font-bold text-amber-700 mb-1 uppercase">{nombres_fila[fi] || `FILA ${fi + 1}`} FILA</p>
            <div className="flex flex-wrap gap-1">
              {fila.map((c, ci) => (
                <div key={c.id} className="flex flex-col items-center p-1 border border-gray-200 rounded text-center" style={{ width: "52px" }}>
                  <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center text-white text-[9px] font-bold">{ci + 1}</div>
                  <p style={{ fontSize: "7px", lineHeight: "1.1" }} className="text-gray-700 text-center">{c.nombre.split(" ").slice(0, 2).join(" ")}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-amber-200 pt-2 mt-2 print:break-inside-avoid">
        <p className="text-[10px] font-bold text-amber-700 mb-1">LEYENDA FOTOGRÁFICA:</p>
        <pre className="text-[9px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{textoLeyenda}</pre>
      </div>
    </div>
  );
}

function ReporteContenido({ datos, reporteActivo, config, filtroRetiro, titulo, total, impresion, nombreComunidad }) {
  const esMesa = reporteActivo === "mesa";
  const esHabitacion = reporteActivo === "habitacion";
  const esTalla = reporteActivo === "talla";
  const esMedicas = reporteActivo === "medicas";
  const esParroquia = reporteActivo === "parroquia";

  const grupos = Object.entries(datos).filter(([, miembros]) => miembros && miembros.length > 0);
  const gruposOrdenados = (esMesa || esHabitacion || esTalla)
    ? [...grupos].sort(([a], [b]) => Number(a) - Number(b))
    : grupos;

  const thClass = "text-left px-2 py-1.5 text-amber-900 font-bold border-b-2 border-amber-300 bg-amber-100 print:px-1.5 print:py-0.5 uppercase text-[10px] tracking-wide leading-tight";
  const thClassNombre = "text-left px-2 py-1.5 text-black font-bold border-b-2 border-amber-300 bg-amber-100 print:px-1.5 print:py-0.5 uppercase text-[10px] tracking-wide leading-tight";
  const tdClass = "px-2 py-1.5 text-black print:px-1.5 print:py-0.5 text-left align-middle text-[11px] print:text-[10px] leading-tight";
  const tdClassNombre = "px-2 py-1.5 text-black font-bold print:px-1.5 print:py-0.5 text-left align-middle text-[11px] print:text-[10px] leading-tight whitespace-normal break-words";

  const getColumnWidths = () => {
    if (esMedicas) return { nombre: '32%', edad: '8%', mesa: '8%', hab: '8%', necesidad: '44%' };
    if (esTalla) return { nombre: '75%', talla: '25%' };
    if (esMesa) return { nombre: '20%', edad: '6%', peso: '6%', altura: '6%', size: '8%', hab: '8%', rol: '10%', parroquia: '20%', telefono: '16%' };
    if (esHabitacion) return { nombre: '20%', edad: '6%', peso: '6%', altura: '6%', size: '8%', mesa: '10%', parroquia: '24%', telefono: '20%' };
    if (esParroquia) return { nombre: '32%', edad: '8%', telefono: '18%', mesa: '12%', hab: '30%' };
    return { nombre: '32%', edad: '8%', parroquia: '26%', mesa: '12%', hab: '22%' };
  };

  const widths = getColumnWidths();

  return (
    <div className="space-y-2 print:space-y-1.5">
      {impresion && (
        <EncabezadoRetiro config={config} filtroRetiro={filtroRetiro} titulo={titulo} total={total} nombreComunidad={nombreComunidad} />
      )}

      {gruposOrdenados.map(([grupo, miembros]) => {
        const tituloGrupo = grupo === "undefined" || grupo === "null" ? "Sin asignar" : grupo;

        let lider = null;
        let colider = null;
        if (esMesa || esTalla) {
          const lideres = miembros.filter(m => m.rol_en_mesa === "Líder de Mesa" || m._esLider);
          lider = lideres[0] || null;
          colider = lideres[1] || null;
        }

        const caminantesTalla = esTalla ? miembros.filter(m => m.rol_en_mesa !== "Líder de Mesa" && !m._esLider) : miembros;
        let miembrosAMostrar = esTalla ? caminantesTalla : miembros;

        if (esMesa) {
          miembrosAMostrar = [...miembrosAMostrar].sort((a, b) => {
            const aEsLider = (a.rol_en_mesa === "Líder de Mesa" || a._esLider) ? 0 : 1;
            const bEsLider = (b.rol_en_mesa === "Líder de Mesa" || b._esLider) ? 0 : 1;
            return aEsLider - bEsLider;
          });
        }

        return (
          <div key={grupo} className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden print:break-inside-avoid print:rounded-none print:border-0 print:shadow-none print:mb-1.5 grupo-impreso">
            <div className="bg-amber-100 text-amber-900 border-b-2 border-amber-300 px-3 py-1.5 print:bg-amber-100 print:text-amber-900 print:border-amber-300 print:py-1 print:px-2">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <h3 className="font-bold text-xs print:text-[11px] flex items-center gap-2">
                  {esMesa ? `MESA ${tituloGrupo}` : esHabitacion ? `HABITACIÓN ${tituloGrupo}` : esTalla ? `TALLA ${tituloGrupo}` : tituloGrupo.toUpperCase()}
                  {(esMesa || esTalla) && (lider || colider) && (
                    <span className="text-amber-800 font-normal text-[10px] print:text-[9px] ml-1">
                      {lider && `Líder: ${lider.nombre}`}
                      {lider && colider && " · "}
                      {colider && `Co-líder: ${colider.nombre}`}
                    </span>
                  )}
                </h3>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded print:bg-transparent print:text-amber-900 print:px-0 print:py-0">
                  {miembrosAMostrar.length} pers.
                </span>
              </div>
            </div>

            <table className="w-full text-xs print:text-[10px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: widths.nombre }} />
                {esMedicas && (<><col style={{ width: widths.edad }} /><col style={{ width: widths.mesa }} /><col style={{ width: widths.hab }} /><col style={{ width: widths.necesidad }} /></>)}
                {esTalla && <col style={{ width: widths.talla }} />}
                {esMesa && (<><col style={{ width: widths.edad }} /><col style={{ width: widths.peso }} /><col style={{ width: widths.altura }} /><col style={{ width: widths.size }} /><col style={{ width: widths.hab }} /><col style={{ width: widths.rol }} /><col style={{ width: widths.parroquia }} /><col style={{ width: widths.telefono }} /></>)}
                {esHabitacion && (<><col style={{ width: widths.edad }} /><col style={{ width: widths.peso }} /><col style={{ width: widths.altura }} /><col style={{ width: widths.size }} /><col style={{ width: widths.mesa }} /><col style={{ width: widths.parroquia }} /><col style={{ width: widths.telefono }} /></>)}
                {esParroquia && (<><col style={{ width: widths.edad }} /><col style={{ width: widths.telefono }} /><col style={{ width: widths.mesa }} /><col style={{ width: widths.hab }} /></>)}
                {!esMedicas && !esTalla && !esMesa && !esHabitacion && !esParroquia && (<><col style={{ width: widths.edad }} /><col style={{ width: widths.parroquia }} /><col style={{ width: widths.mesa }} /><col style={{ width: widths.hab }} /></>)}
              </colgroup>
              <thead>
                <tr>
                  <th className={thClassNombre}>Nombre</th>
                  {esMedicas ? (<><th className={thClass}>Edad</th><th className={thClass}>Mesa</th><th className={thClass}>Hab.</th><th className={thClass}>Necesidad</th></>)
                    : esTalla ? (<th className={thClass}>Talla</th>)
                    : esMesa ? (<><th className={thClass}>Edad</th><th className={thClass}>Peso</th><th className={thClass}>Altura</th><th className={thClass}>Size</th><th className={thClass}>Hab.</th><th className={thClass}>Rol</th><th className={thClass}>Parroquia</th><th className={thClass}>Teléfono</th></>)
                    : esHabitacion ? (<><th className={thClass}>Edad</th><th className={thClass}>Peso</th><th className={thClass}>Altura</th><th className={thClass}>Size</th><th className={thClass}>Mesa</th><th className={thClass}>Parroquia</th><th className={thClass}>Teléfono</th></>)
                    : esParroquia ? (<><th className={thClass}>Edad</th><th className={thClass}>Teléfono</th><th className={thClass}>Mesa</th><th className={thClass}>Habitación</th></>)
                    : (<><th className={thClass}>Edad</th><th className={thClass}>Parroquia</th><th className={thClass}>Mesa</th><th className={thClass}>Habitación</th></>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 print:divide-gray-200">
                {miembrosAMostrar.map((c, i) => {
                  const esLiderFila = esMesa && (c.rol_en_mesa === "Líder de Mesa" || c._esLider);
                  return (
                    <tr key={c.id} className={`${i % 2 === 0 ? "bg-white" : "bg-amber-50/40"} print:bg-white ${esLiderFila ? "font-semibold bg-amber-100/60 print:bg-amber-50" : ""}`}>
                      <td className={tdClassNombre}>
                        <span className="flex items-center gap-1.5">
                          {esLiderFila && <Crown className="w-3 h-3 text-amber-600 shrink-0" />}
                          <span>{c.nombre}</span>
                        </span>
                      </td>
                      {esMedicas ? (<><td className={tdClass}>{c.edad || "-"}</td><td className={tdClass}>{c.numero_mesa || "-"}</td><td className={tdClass}>{c.numero_habitacion || "-"}</td><td className={tdClass}>{c.necesidades_medicas || "-"}</td></>)
                        : esTalla ? (<td className={`${tdClass} font-bold`}>{c.talla_camisa || "-"}</td>)
                        : esMesa ? (<><td className={tdClass}>{c.edad || "-"}</td><td className={tdClass}>{c.peso_kg || "-"}</td><td className={tdClass}>{c.talla_cm || "-"}</td><td className={tdClass}>{c.talla_camisa || "-"}</td><td className={tdClass}>{c.numero_habitacion || "-"}</td><td className={tdClass}>{(c.rol_en_mesa === "Líder de Mesa" || c._esLider) ? "Líder" : "Caminante"}</td><td className={tdClass}>{c.parroquia || "-"}</td><td className={tdClass}>{c.telefono || "-"}</td></>)
                        : esHabitacion ? (<><td className={tdClass}>{c.edad || "-"}</td><td className={tdClass}>{c.peso_kg || "-"}</td><td className={tdClass}>{c.talla_cm || "-"}</td><td className={tdClass}>{c.talla_camisa || "-"}</td><td className={tdClass}>{c.numero_mesa || "-"}</td><td className={tdClass}>{c.parroquia || "-"}</td><td className={tdClass}>{c.telefono || "-"}</td></>)
                        : esParroquia ? (<><td className={tdClass}>{c.edad || "-"}</td><td className={tdClass}>{c.telefono || "-"}</td><td className={tdClass}>{c.numero_mesa || "-"}</td><td className={tdClass}>{c.numero_habitacion || "-"}</td></>)
                        : (<><td className={tdClass}>{c.edad || "-"}</td><td className={tdClass}>{c.parroquia || "-"}</td><td className={tdClass}>{c.numero_mesa || "-"}</td><td className={tdClass}>{c.numero_habitacion || "-"}</td></>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="mt-4 pt-3 border-t-2 border-amber-300 flex justify-end items-center gap-3 print:mt-2 print:pt-2 print:border-t-black total-final">
        <span className="text-sm font-bold text-amber-900 print:text-black uppercase tracking-wide">Total de Caminantes en este reporte:</span>
        <span className="text-xl font-black text-amber-700 print:text-black">{total}</span>
      </div>
    </div>
  );
}

const GRADIENT_PRESETS = [
  { id: "azul_oscuro", nombre: "Azul Noche", color: "#19195a" },
  { id: "negro", nombre: "Negro", color: "#000000" },
  { id: "vino", nombre: "Vino Tinto", color: "#5c1a1a" },
  { id: "ambar", nombre: "Ámbar", color: "#78350f" },
  { id: "verde", nombre: "Verde Bosque", color: "#14532d" },
  { id: "purpura", nombre: "Púrpura Real", color: "#581c87" },
  { id: "azul_marino", nombre: "Azul Marino", color: "#0c4a6e" },
  { id: "transparente", nombre: "Sin Degradado", color: "transparente" },
];

const W = 2400, H_FRENTE = 1800, H_DORSO = 1800, H = H_FRENTE + H_DORSO, FOOTER_H = 110;

function FotografiaGrupalModal({ equipoIdActivo, onClose }) {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [img, setImg] = useState(null);
  const [logoImg, setLogoImg] = useState(null);
  const [leyenda, setLeyenda] = useState("");
  const [caminantesDorso, setCaminantesDorso] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [cfg, setCfg] = useState({
    titulo: "RETIRO EMAÚS", subtitulo: "", lugar: "", parroquia: "",
    versiculo: "¡Jesucristo ha resucitado, En verdad resucitó! Lucas 24:13-35",
    firma: "",
    zoom: 100, panX: 0, panY: 0,
    logoPos: "left", logoSize: 220,
    tituloColor: "#ffee00", tituloSize: 62,
    leyendaSize: 30, leyendaBg: "#f2f2f2",
    footerSize: 46,
    photoH: 1150,
    dorsoTitulo: "DIRECTORIO DE CAMINANTES",
    dorsoMostrarTelefono: true,
    dorsoMostrarParroquia: true,
    dorsoFontSize: 28,
    dorsoBg: "#ffffff",
    gradColor: "#19195a",
    gradOpacity: 90,
  });

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(c => {
      if (c.length) {
        const r = c[0];
        setCfg(p => ({
          ...p,
          titulo: `${r.edicion ? r.edicion + "º" : ""} RETIRO EMAÚS ${r.tipo_retiro === "Retiro Mujeres" ? "MUJERES" : "HOMBRES"}`.trim(),
          subtitulo: r.eslogan || "",
          lugar: (r.provincia || "").toUpperCase(),
          parroquia: r.parroquia || "",
        }));
        if (r.logo_url) {
          const l = new Image();
          l.crossOrigin = "anonymous";
          l.onload = () => setLogoImg(l);
          l.onerror = () => {
            const l2 = new Image();
            l2.onload = () => setLogoImg(l2);
            l2.src = r.logo_url;
          };
          l.src = r.logo_url;
        }
      }
    }).catch(() => {});

    base44.entities.Caminante.list().then(cams => {
      const activos = (cams || []).filter(c => 
        c.estado !== "Cancelado" &&
        (!equipoIdActivo || c.equipo_id === equipoIdActivo || c.comunidad_id === equipoIdActivo || c.retiro_id === equipoIdActivo)
      );
      setCaminantesDorso(activos);
    }).catch(() => {});
  }, [equipoIdActivo]);

  useEffect(() => { draw(); }, [img, logoImg, leyenda, caminantesDorso, cfg]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        setImg(im);
        if (im.width < 1500) toast.warning("⚠️ Imagen de baja resolución. Se recomienda alta resolución.");
        else toast.success(`✅ Imagen cargada (${im.width}x${im.height}px)`);
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const generarLeyendaPosiciones = () => {
    setGenerando(true);
    try {
      const cams = caminantesDorso.length > 0 ? caminantesDorso : [];
      const activos = (cams || []).filter(c => c.estado !== "Cancelado");
      
      const prioridad = (c) => {
        if (c.edad >= 65) return true;
        if (c.condicion_fisica && c.condicion_fisica !== "Ninguna") return true;
        if (c.peso_kg && c.talla_cm) {
          const imc = c.peso_kg / Math.pow(c.talla_cm / 100, 2);
          if (imc > 30) return true;
        }
        return false;
      };
      
      const primera = activos.filter(prioridad).sort((a, b) => (a.talla_cm || 160) - (b.talla_cm || 160));
      const resto = activos.filter(c => !prioridad(c)).sort((a, b) => (a.talla_cm || 160) - (b.talla_cm || 160));
      const ordenados = [...primera, ...resto];
      
      const personasPorFila = 20;
      const filas = [];
      for (let i = 0; i < ordenados.length; i += personasPorFila) {
        filas.push(ordenados.slice(i, i + personasPorFila));
      }
      
      const texto = generarLeyenda(filas);
      
      setLeyenda(texto);
      toast.success(`✅ Leyenda de POSICIONES generada: ${filas.length} filas · ${activos.length} caminantes.`);
    } catch (e) {
      toast.error("No se pudo generar la leyenda: " + e.message);
    } finally { 
      setGenerando(false); 
    }
  };

  function drawLeyenda(ctx, size, x, yTop, maxW, dry, yOffset = 0) {
    const lh = size * 1.35;
    let penX = x, penY = yTop + size;
    ctx.fillStyle = "#111";
    ctx.textAlign = "left";
    const paras = leyenda.split("\n").filter(p => p.trim());
    paras.forEach(p => {
      const m = p.match(/^([^:]{3,60}:)\s*(.*)$/);
      const segs = m
        ? [{ t: m[1] + " ", f: `bold ${size}px Arial` }, { t: m[2], f: `${size}px Arial` }]
        : [{ t: p, f: `${size}px Arial` }];
      segs.forEach(seg => {
        ctx.font = seg.f;
        seg.t.split(/(\s+)/).forEach(w => {
          if (!w) return;
          const ww = ctx.measureText(w).width;
          if (penX + ww > x + maxW && penX > x && w.trim()) { penX = x; penY += lh; }
          if (!dry && w.trim()) ctx.fillText(w, penX, penY);
          if (w.trim() || penX > x) penX += ww;
        });
      });
      penX = x; penY += lh * 1.25;
    });
    return penY;
  }

  function hexToRgb(hex) {
    if (!hex || hex === "transparente") return { r: 0, g: 0, b: 0 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 25, g: 25, b: 90 };
  }

  function drawDorso(ctx) {
    const yStart = H_FRENTE;
    const margin = 50;
    const gapEntreColumnas = 20;

    const porMesa = {};
    caminantesDorso.forEach(c => {
      const m = c.numero_mesa || "Sin mesa";
      if (!porMesa[m]) porMesa[m] = [];
      porMesa[m].push(c);
    });

    const mesasOrdenadas = Object.keys(porMesa).sort((a, b) => {
      if (a === "Sin mesa") return 1;
      if (b === "Sin mesa") return -1;
      return (isNaN(a) ? 999 : +a) - (isNaN(b) ? 999 : +b);
    });

    const totalMesas = mesasOrdenadas.length;

    let numColumnas = 1;
    if (totalMesas > 12) numColumnas = 4;
    else if (totalMesas > 8) numColumnas = 3;
    else if (totalMesas > 4) numColumnas = 2;

    let fontSize = cfg.dorsoFontSize;
    if (numColumnas >= 4) fontSize = Math.min(fontSize, 20);
    else if (numColumnas >= 3) fontSize = Math.min(fontSize, 22);
    else if (numColumnas >= 2) fontSize = Math.min(fontSize, 24);

    const rowHeight = fontSize * 1.45;
    const headerRowHeight = fontSize * 1.7;
    const mesaHeaderHeight = fontSize * 1.6;

    ctx.fillStyle = cfg.dorsoBg;
    ctx.fillRect(0, yStart, W, H_DORSO);

    ctx.fillStyle = "#78350f";
    ctx.fillRect(0, yStart, W, 8);

    ctx.fillStyle = "#78350f";
    ctx.font = `bold 48px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(cfg.dorsoTitulo.toUpperCase(), W / 2, yStart + 80);

    ctx.font = `26px Arial`;
    ctx.fillStyle = "#92400e";
    ctx.fillText(`${cfg.titulo} · ${cfg.lugar || ""} ${cfg.parroquia ? "· " + cfg.parroquia : ""}`.trim(), W / 2, yStart + 120);

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, yStart + 145);
    ctx.lineTo(W - margin, yStart + 145);
    ctx.stroke();

    const totalWidth = W - margin * 2 - gapEntreColumnas * (numColumnas - 1);
    const colWidth = totalWidth / numColumnas;
    const mesasPorColumna = Math.ceil(totalMesas / numColumnas);
    const startY = yStart + 165;
    const maxY = yStart + H_DORSO - 120;

    for (let col = 0; col < numColumnas; col++) {
      const colX = margin + col * (colWidth + gapEntreColumnas);
      const inicio = col * mesasPorColumna;
      const fin = Math.min(inicio + mesasPorColumna, totalMesas);
      const mesasDeEstaColumna = mesasOrdenadas.slice(inicio, fin);

      if (mesasDeEstaColumna.length === 0) continue;

      let currentY = startY;

      mesasDeEstaColumna.forEach((mesaNum) => {
        const personas = porMesa[mesaNum].sort((a, b) => {
          const aLider = (a.rol_en_mesa === "Líder de Mesa" || a._esLider) ? 0 : 1;
          const bLider = (b.rol_en_mesa === "Líder de Mesa" || b._esLider) ? 0 : 1;
          if (aLider !== bLider) return aLider - bLider;
          return (Number(a.numero_ficha) || 0) - (Number(b.numero_ficha) || 0);
        });

        if (currentY + mesaHeaderHeight + rowHeight > maxY) return;

        ctx.fillStyle = "#78350f";
        ctx.fillRect(colX, currentY, colWidth, mesaHeaderHeight);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText(`MESA ${mesaNum}`, colX + 8, currentY + mesaHeaderHeight * 0.68, colWidth * 0.6);
        ctx.textAlign = "right";
        ctx.font = `${fontSize - 3}px Arial`;
        ctx.fillText(`${personas.length} pers.`, colX + colWidth - 8, currentY + mesaHeaderHeight * 0.68);
        ctx.textAlign = "left";
        currentY += mesaHeaderHeight;

        const intColW = [colWidth * 0.42, colWidth * 0.28, colWidth * 0.30];
        const intX1 = colX;
        const intX2 = colX + intColW[0];
        const intX3 = colX + intColW[0] + intColW[1];

        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(colX, currentY, colWidth, headerRowHeight * 0.8);
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(colX, currentY, colWidth, headerRowHeight * 0.8);

        ctx.fillStyle = "#78350f";
        ctx.font = `bold ${fontSize - 4}px Arial`;
        ctx.fillText("Nombre", intX1 + 6, currentY + headerRowHeight * 0.55, intColW[0] - 12);
        ctx.fillText("Teléfono", intX2 + 6, currentY + headerRowHeight * 0.55, intColW[1] - 12);
        ctx.fillText("Parroquia", intX3 + 6, currentY + headerRowHeight * 0.55, intColW[2] - 12);
        currentY += headerRowHeight * 0.8;

        personas.forEach((p, i) => {
          if (currentY + rowHeight > maxY) return;

          const esLider = p.rol_en_mesa === "Líder de Mesa" || p._esLider;

          ctx.fillStyle = i % 2 === 0 ? "#fff9ed" : "#ffffff";
          ctx.fillRect(colX, currentY, colWidth, rowHeight);

          ctx.strokeStyle = "#d1d5db";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(intX1, currentY, intColW[0], rowHeight);
          ctx.strokeRect(intX2, currentY, intColW[1], rowHeight);
          ctx.strokeRect(intX3, currentY, intColW[2], rowHeight);

          ctx.fillStyle = esLider ? "#78350f" : "#111";
          ctx.font = `${esLider ? "bold " : ""}${fontSize - 2}px Arial`;
          const nombre = `${esLider ? "👑 " : ""}${p.nombre || "-"}`;
          ctx.fillText(nombre, intX1 + 6, currentY + rowHeight * 0.65, intColW[0] - 12);

          if (cfg.dorsoMostrarTelefono) {
            ctx.fillStyle = "#374151";
            ctx.font = `${fontSize - 4}px Arial`;
            ctx.fillText(p.telefono || "-", intX2 + 6, currentY + rowHeight * 0.65, intColW[1] - 12);
          }

          if (cfg.dorsoMostrarParroquia) {
            ctx.fillStyle = "#374151";
            ctx.font = `${fontSize - 4}px Arial`;
            ctx.fillText(p.parroquia || "-", intX3 + 6, currentY + rowHeight * 0.65, intColW[2] - 12);
          }

          currentY += rowHeight;
        });

        currentY += 10;
      });
    }

    ctx.fillStyle = "#78350f";
    ctx.fillRect(0, yStart + H_DORSO - 100, W, 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = `italic bold ${cfg.footerSize - 6}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(cfg.versiculo, W / 2, yStart + H_DORSO - 45);
    ctx.font = `${fontSize - 6}px Arial`;
    ctx.fillText(`Total: ${caminantesDorso.length} caminantes · ${totalMesas} mesas · ${new Date().toLocaleDateString("es-ES")}`, W / 2, yStart + H_DORSO - 14);
    ctx.textAlign = "left";
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "left";
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = cfg.leyendaBg;
    ctx.fillRect(0, 0, W, H_FRENTE);

    const pr = { x: 60, y: 60, w: W - 120, h: cfg.photoH };

    ctx.fillStyle = "#cfcfcf";
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    if (img) {
      const scale = Math.max(pr.w / img.width, pr.h / img.height) * (cfg.zoom / 100);
      const dw = img.width * scale, dh = img.height * scale;
      const dx = pr.x + (pr.w - dw) / 2 + cfg.panX;
      const dy = pr.y + (pr.h - dh) / 2 + cfg.panY;
      ctx.save();
      ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, pr.h); ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#888";
      ctx.font = "bold 52px Arial";
      ctx.textAlign = "center";
      ctx.fillText("📷 Adjunta una imagen en alta resolución", W / 2, pr.y + pr.h / 2);
      ctx.textAlign = "left";
    }

    if (cfg.firma) {
      ctx.font = "italic 42px Georgia";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.textAlign = "right";
      ctx.fillText(cfg.firma, pr.x + pr.w - 30, pr.y + pr.h - 30);
      ctx.textAlign = "left";
    }

    if (cfg.gradColor !== "transparente") {
      const rgb = hexToRgb(cfg.gradColor);
      const opacity = (cfg.gradOpacity || 90) / 100;
      const grad = ctx.createLinearGradient(0, pr.y, 0, pr.y + 430);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.save();
      ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, 430); ctx.clip();
      ctx.fillStyle = grad;
      ctx.fillRect(pr.x, pr.y, pr.w, 430);
      ctx.restore();
    }

    const ls = cfg.logoSize;
    const logoX = cfg.logoPos === "right" ? pr.x + pr.w - ls - 50 : pr.x + 50;
    const logoY = pr.y + 40;
    if (cfg.logoPos !== "none" && logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + ls / 2, logoY + ls / 2, ls / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, ls, ls);
      ctx.restore();
    }

    const leftX = cfg.logoPos === "left" ? logoX + ls + 60 : pr.x + 60;
    ctx.fillStyle = cfg.tituloColor;
    ctx.font = `bold ${cfg.tituloSize}px Arial`;
    ctx.fillText(cfg.titulo, leftX, logoY + 80);
    ctx.font = `${Math.round(cfg.tituloSize * 0.82)}px Arial`;
    ctx.fillText(cfg.subtitulo, leftX, logoY + 80 + cfg.tituloSize + 24);

    if (cfg.lugar || cfg.parroquia) {
      const rx = cfg.logoPos === "right" ? logoX - 60 : pr.x + pr.w - 60;
      ctx.textAlign = "right";
      ctx.fillStyle = cfg.tituloColor;
      ctx.font = `bold ${cfg.tituloSize}px Arial`;
      ctx.fillText((cfg.lugar || "").split("").join(" "), rx, logoY + 80);
      ctx.font = `${Math.round(cfg.tituloSize * 0.72)}px Arial`;
      ctx.fillText(cfg.parroquia, rx, logoY + 80 + cfg.tituloSize + 24);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rx - ctx.measureText(cfg.lugar || "").width - 80, logoY + 30);
      ctx.lineTo(rx - ctx.measureText(cfg.lugar || "").width - 80, logoY + 200);
      ctx.stroke();
      ctx.textAlign = "left";
    }

    const leyTop = pr.y + pr.h + 40;
    const leyBottom = H_FRENTE - FOOTER_H - 20;
    let size = cfg.leyendaSize;
    let endY = drawLeyenda(ctx, size, 100, leyTop, W - 200, true);
    while (endY > leyBottom && size > 16) {
      size -= 2;
      endY = drawLeyenda(ctx, size, 100, leyTop, W - 200, true);
    }
    drawLeyenda(ctx, size, 100, leyTop, W - 200, false);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, H_FRENTE - FOOTER_H, W, FOOTER_H);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(60, H_FRENTE - FOOTER_H); ctx.lineTo(W - 60, H_FRENTE - FOOTER_H); ctx.stroke();
    ctx.font = `italic bold ${cfg.footerSize}px Arial`;
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.fillText(cfg.versiculo, W / 2, H_FRENTE - FOOTER_H / 2 + cfg.footerSize / 3);
    ctx.textAlign = "left";

    drawDorso(ctx);
  }

  const descargar = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotografia_grupal_completa_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Fotografía descargada (Frente + Dorso) en alta resolución (2400x3600).");
    }, "image/png");
  };

  const descargarSoloFrente = () => {
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = W;
    tempCanvas.height = H_FRENTE;
    const tctx = tempCanvas.getContext("2d");
    tctx.drawImage(canvas, 0, 0, W, H_FRENTE, 0, 0, W, H_FRENTE);
    tempCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotografia_FRENTE_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Frente descargado.");
    }, "image/png");
  };

  const descargarSoloDorso = () => {
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = W;
    tempCanvas.height = H_DORSO;
    const tctx = tempCanvas.getContext("2d");
    tctx.drawImage(canvas, 0, H_FRENTE, W, H_DORSO, 0, 0, W, H_DORSO);
    tempCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotografia_DORSO_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Dorso descargado.");
    }, "image/png");
  };

  const reset = () => setCfg(p => ({ 
    ...p, 
    zoom: 100, panX: 0, panY: 0, logoSize: 220, tituloSize: 62, 
    leyendaSize: 30, footerSize: 46, dorsoFontSize: 28,
    gradColor: "#19195a", gradOpacity: 90
  }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1400px] h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ImageIcon className="w-5 h-5" /> Fotografía Grupal del Retiro (Frente + Dorso)
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={descargarSoloFrente} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> Solo Frente
            </button>
            <button onClick={descargarSoloDorso} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-xs font-bold">
              <Download className="w-3.5 h-3.5" /> Solo Dorso
            </button>
            <button onClick={descargar} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold">
              <Download className="w-4 h-4" /> Descargar Completo (2 páginas)
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-slate-200 overflow-auto p-4">
            <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto rounded-lg shadow-lg" />
            <p className="text-xs text-center text-gray-600 mt-2">
              📄 Vista completa: Frente (arriba) + Dorso con directorio autoajustable (abajo).
            </p>
          </div>

          <div className="w-[380px] border-l border-gray-200 overflow-y-auto p-4 space-y-4 bg-white">
            <Section titulo="1. Imagen en alta resolución">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current.click()} className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                <Upload className="w-4 h-4" /> {img ? "Cambiar imagen" : "Adjuntar imagen"}
              </button>
            </Section>

            <Section titulo="2. Leyenda de POSICIONES (Frente)">
              <button 
                onClick={generarLeyendaPosiciones} 
                disabled={generando || caminantesDorso.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold mb-2 disabled:opacity-50 shadow"
              >
                <Users className="w-4 h-4" /> 
                {generando ? "Generando..." : "✨ Generar posiciones automáticamente"}
              </button>
              
              {caminantesDorso.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-2 text-[10px] text-purple-800">
                  👥 <strong>{caminantesDorso.length}</strong> caminantes disponibles · 
                  La leyenda se organizará por filas de izquierda a derecha
                </div>
              )}
              
              <textarea
                value={leyenda}
                onChange={e => setLeyenda(e.target.value)}
                rows={6}
                placeholder={"DE IZQUIERDA A DERECHA PRIMERA FILA: Juan Pérez, Juana Pérez...\n\nDE IZQUIERDA A DERECHA SEGUNDA FILA: Pedro Gómez, María López..."}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                ✏️ <strong>Editable.</strong> Esta es la leyenda que aparecerá debajo de la foto indicando las posiciones de cada persona en cada fila.
              </p>
            </Section>

            <Section titulo="3. Títulos y textos">
              <Input label="Título" value={cfg.titulo} onChange={v => set("titulo", v)} />
              <Input label="Subtítulo (lema)" value={cfg.subtitulo} onChange={v => set("subtitulo", v)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Lugar" value={cfg.lugar} onChange={v => set("lugar", v)} />
                <Input label="Parroquia" value={cfg.parroquia} onChange={v => set("parroquia", v)} />
              </div>
              <Input label="Firma (esquina de la foto)" value={cfg.firma} onChange={v => set("firma", v)} placeholder="Al Taller del Maestro" />
              <Input label="Versículo final" value={cfg.versiculo} onChange={v => set("versiculo", v)} />
            </Section>

            <Section titulo="4. 🎨 Configuración del DORSO">
              <Input label="Título del dorso" value={cfg.dorsoTitulo} onChange={v => set("dorsoTitulo", v)} />
              <div className="flex gap-4 items-center py-2">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={cfg.dorsoMostrarTelefono} onChange={e => set("dorsoMostrarTelefono", e.target.checked)} className="accent-amber-700" />
                  Mostrar teléfono
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={cfg.dorsoMostrarParroquia} onChange={e => set("dorsoMostrarParroquia", e.target.checked)} className="accent-amber-700" />
                  Mostrar parroquia
                </label>
              </div>
              <Slider label="Tamaño texto dorso" min={20} max={40} value={cfg.dorsoFontSize} onChange={v => set("dorsoFontSize", v)} />
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-800">
                📋 <strong>{caminantesDorso.length}</strong> caminantes cargados para el dorso.<br/>
                El diseño se autoajusta según la cantidad de mesas.
              </div>
            </Section>

            <Section titulo="5. Ajustes de diseño (Frente)">
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1.5">
                  🎨 Color del degradado superior
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {GRADIENT_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => set("gradColor", preset.color)}
                      title={preset.nombre}
                      className={`relative h-9 rounded-lg border-2 transition-all ${
                        cfg.gradColor === preset.color 
                          ? "border-amber-600 ring-2 ring-amber-300 scale-105" 
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={{ 
                        background: preset.color === "transparente" 
                          ? "linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%)" 
                          : preset.color,
                        backgroundSize: preset.color === "transparente" ? "8px 8px" : "auto"
                      }}
                    >
                      {cfg.gradColor === preset.color && (
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs drop-shadow-lg">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                {cfg.gradColor !== "transparente" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-medium text-gray-600 shrink-0">Color personalizado:</label>
                      <input
                        type="color"
                        value={cfg.gradColor}
                        onChange={e => set("gradColor", e.target.value)}
                        className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <Slider 
                      label={`Opacidad del degradado`} 
                      min={30} 
                      max={100} 
                      value={cfg.gradOpacity} 
                      onChange={v => set("gradOpacity", v)} 
                    />
                  </div>
                )}
                
                <p className="text-[10px] text-gray-500 mt-1.5">
                  💡 El degradado va de opaco (arriba) a transparente (abajo) para legibilidad del título.
                </p>
              </div>

              <Slider label="Tamaño de imagen (zoom)" min={50} max={250} value={cfg.zoom} onChange={v => set("zoom", v)} />
              <Slider label="Mover imagen ↔" min={-600} max={600} value={cfg.panX} onChange={v => set("panX", v)} />
              <Slider label="Mover imagen ↕" min={-400} max={400} value={cfg.panY} onChange={v => set("panY", v)} />
              <Slider label="Altura de la foto" min={800} max={1400} value={cfg.photoH} onChange={v => set("photoH", v)} />
              <Slider label="Tamaño del título" min={40} max={90} value={cfg.tituloSize} onChange={v => set("tituloSize", v)} />
              <Slider label="Tamaño del logo" min={120} max={340} value={cfg.logoSize} onChange={v => set("logoSize", v)} />
              <Slider label="Tamaño leyenda" min={20} max={44} value={cfg.leyendaSize} onChange={v => set("leyendaSize", v)} />
              <Slider label="Tamaño versículo" min={30} max={70} value={cfg.footerSize} onChange={v => set("footerSize", v)} />

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[10px] font-medium text-gray-600 block mb-1">Posición del logo</label>
                  <select value={cfg.logoPos} onChange={e => set("logoPos", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                    <option value="left">Izquierda</option>
                    <option value="right">Derecha</option>
                    <option value="none">Oculto</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-600 block mb-1">Color del título</label>
                  <select value={cfg.tituloColor} onChange={e => set("tituloColor", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs">
                    <option value="#ffee00">Amarillo</option>
                    <option value="#ffffff">Blanco</option>
                    <option value="#ff8800">Naranja</option>
                  </select>
                </div>
              </div>

              <button onClick={reset} className="w-full mt-3 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium">
                <RefreshCw className="w-3.5 h-3.5" /> Restablecer ajustes
              </button>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ titulo, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
        <SlidersHorizontal className="w-3 h-3" /> {titulo}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-600 block mb-1">{label}</label>
      <input type="text" value={value} placeholder={placeholder || ""} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );
}

function Slider({ label, min, max, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
        <span>{label}</span><span className="font-bold">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-amber-700" />
    </div>
  );
}