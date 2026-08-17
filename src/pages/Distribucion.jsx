import { useEffect, useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import BackArrow from "@/components/BackArrow";
import SelectorComunidad from "@/components/SelectorComunidad";
import { Shuffle, Save, Users, Home, Settings2, BedDouble, Heart, Printer, Wifi, WifiOff, Pencil, AlertTriangle, DoorOpen, Plus, Trash2, RotateCcw, Building2, Check, LayoutGrid, Sparkles, Download, Upload, Palette, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import useOffline from "@/hooks/useOffline";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import { registrarAccionAuditoria } from "@/utils/auditLogger";

const COLORES_MESA = [
  { value: "rosado", label: "Rosa Pastel", bg: "bg-pink-500", hex: "#ec4899" },
  { value: "violeta", label: "Lavanda / Púrpura", bg: "bg-purple-600", hex: "#9333ea" },
  { value: "fucsia", label: "Fucsia Vibrante", bg: "bg-fuchsia-600", hex: "#c026d3" },
  { value: "verde", label: "Menta / Esmeralda", bg: "bg-emerald-600", hex: "#059669" },
  { value: "turquesa", label: "Turquesa", bg: "bg-teal-500", hex: "#14b8a6" },
  { value: "naranja", label: "Coral / Naranja", bg: "bg-orange-500", hex: "#f97316" },
  { value: "amarillo", label: "Amarillo Dorado", bg: "bg-amber-500", hex: "#f59e0b" },
  { value: "azul", label: "Azul Cielo", bg: "bg-sky-600", hex: "#0284c7" },
  { value: "rojo", label: "Rojo Carmín", bg: "bg-rose-600", hex: "#e11d48" },
];

const descargarBackup = (tipo, datos) => {
  try {
    const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const nombreArchivo = `backup_distribucion_${tipo}_${fecha}.json`;
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`✅ Backup descargado: ${nombreArchivo}`);
  } catch (e) {
    console.error("Error al descargar backup", e);
    toast.error("No se pudo descargar el archivo de backup");
  }
};

const restaurarDesdeArchivo = (tipo, setGruposMesa, setHabLideres, setHabRegulares, setHabServidores) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const datos = JSON.parse(event.target.result);
        if (tipo === 'caminantes') {
          if (datos.gruposMesa) setGruposMesa(datos.gruposMesa);
          if (datos.habLideres) setHabLideres(datos.habLideres);
          if (datos.habRegulares) setHabRegulares(datos.habRegulares);
          toast.success("✅ Distribución de caminantes restaurada desde archivo");
        } else {
          if (datos.habServidores) setHabServidores(datos.habServidores);
          toast.success("✅ Distribución de servidores restaurada desde archivo");
        }
      } catch (err) {
        toast.error("El archivo no tiene un formato válido");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

function distribuirMesas(lideres, caminantesRegulares, totalMesas, capacidadMesa, lideresPerMesa, esRetiroMujeres = false) {
  const numMesas = Math.max(1, totalMesas || 1);
  const grupos = Array.from({ length: numMesas }, (_, i) => ({
    numero: i + 1,
    miembros: [],
    capacidadMaxima: capacidadMesa,
    sobrecargada: false,
    nombre_personalizado: esRetiroMujeres ? `Mesa ${i + 1}` : "",
    color_mesa: esRetiroMujeres ? COLORES_MESA[i % COLORES_MESA.length].value : ""
  }));

  const shuffledLideres = [...lideres].sort(() => Math.random() - 0.5);
  shuffledLideres.forEach((lider, idx) => {
    const mesaIdx = idx % numMesas;
    grupos[mesaIdx].miembros.push({ ...lider, _esLider: true });
  });

  const sorted = [...caminantesRegulares].sort((a, b) => (a.edad || 30) - (b.edad || 30));
  sorted.forEach((c) => {
    let mesaConEspacio = grupos.find(g => g.miembros.length < g.capacidadMaxima);
    if (mesaConEspacio) {
      mesaConEspacio.miembros.push(c);
    } else {
      const ultimaMesa = grupos[grupos.length - 1];
      ultimaMesa.miembros.push(c);
      ultimaMesa.sobrecargada = true;
    }
  });

  grupos.forEach(g => {
    if (g.miembros.length > g.capacidadMaxima) g.sobrecargada = true;
  });

  return { grupos, mesasSobrecargadasCount: grupos.filter(g => g.sobrecargada).length };
}

function esPrimerPiso(c) {
  if (c.edad >= 65) return true;
  if (c.condicion_fisica && c.condicion_fisica !== "Ninguna") return true;
  if (c.peso_kg && c.talla_cm) {
    const imc = c.peso_kg / Math.pow(c.talla_cm / 100, 2);
    if (imc > 30) return true;
  }
  return false;
}

function distribuirHabitacionesEnLista(lideres, caminantesRegulares, gruposMesa, listaHabLideres, listaHabRegulares) {
  const habLideres = (listaHabLideres || []).map(h => ({ ...h, miembros: [], sobrecargada: false }));
  const shuffledLideres = [...lideres].sort(() => Math.random() - 0.5);

  let lideresIdx = 0;
  for (let i = 0; i < habLideres.length; i++) {
    const miembros = shuffledLideres.slice(lideresIdx, lideresIdx + habLideres[i].capacidadMaxima);
    habLideres[i].miembros = miembros;
    lideresIdx += habLideres[i].capacidadMaxima;
  }

  if (lideresIdx < shuffledLideres.length) {
    const restantes = shuffledLideres.slice(lideresIdx);
    if (habLideres.length > 0) {
      habLideres[habLideres.length - 1].miembros.push(...restantes);
      habLideres[habLideres.length - 1].sobrecargada = true;
    }
  }

  const mapaPorMesa = new Map();
  caminantesRegulares.forEach(c => {
    const mesaId = c._mesaAsignada || 'sin_mesa';
    if (!mapaPorMesa.has(mesaId)) mapaPorMesa.set(mesaId, []);
    mapaPorMesa.get(mesaId).push(c);
  });

  const colaAsignacion = [];
  let hayMas = true;
  let indice = 0;
  while (hayMas) {
    hayMas = false;
    for (const [mesaId, personas] of mapaPorMesa.entries()) {
      if (indice < personas.length) {
        colaAsignacion.push(personas[indice]);
        hayMas = true;
      }
    }
    indice++;
  }

  const habsPrimerPiso = (listaHabRegulares || []).filter(h => h.nivelPiso === 1).map(h => ({ ...h, miembros: [], sobrecargada: false }));
  const habsOtrosPisos = (listaHabRegulares || []).filter(h => h.nivelPiso !== 1).map(h => ({ ...h, miembros: [], sobrecargada: false }));
  const todasHabs = [...habsPrimerPiso, ...habsOtrosPisos];

  const primerPiso = colaAsignacion.filter(esPrimerPiso);
  const otrosPisos = colaAsignacion.filter(c => !esPrimerPiso(c));

  const asignarAGrupoDeHabs = (personas, habsDisponibles) => {
    for (const persona of personas) {
      let asignado = false;
      let mejorHab = null;
      let minCoincidencias = 999;

      for (const hab of habsDisponibles) {
        if (hab.miembros.length < hab.capacidadMaxima) {
          const coincidencias = hab.miembros.filter(m => (m._mesaAsignada || 'sin_mesa') === (persona._mesaAsignada || 'sin_mesa')).length;
          if (coincidencias === 0) {
            mejorHab = hab;
            break;
          } else if (coincidencias < minCoincidencias) {
            minCoincidencias = coincidencias;
            mejorHab = hab;
          }
        }
      }

      if (mejorHab) {
        mejorHab.miembros.push(persona);
        asignado = true;
      } else {
        for (const hab of todasHabs) {
          if (hab.miembros.length < hab.capacidadMaxima) {
            hab.miembros.push(persona);
            asignado = true;
            break;
          }
        }
      }

      if (!asignado && todasHabs.length > 0) {
        todasHabs[todasHabs.length - 1].miembros.push(persona);
        todasHabs[todasHabs.length - 1].sobrecargada = true;
      }
    }
  };

  asignarAGrupoDeHabs(primerPiso, habsPrimerPiso.length > 0 ? habsPrimerPiso : todasHabs);
  asignarAGrupoDeHabs(otrosPisos, todasHabs);

  const habRegularesFinales = (listaHabRegulares || []).map(h => {
    const encontrada = todasHabs.find(th => th.id === h.id);
    return encontrada ? encontrada : { ...h, miembros: [], sobrecargada: false };
  });

  todasHabs.forEach(th => {
    if (!habRegularesFinales.find(h => h.id === th.id)) habRegularesFinales.push(th);
  });

  return {
    habLideres,
    habRegulares: habRegularesFinales,
    habsSobrecargadas: habLideres.filter(h => h.sobrecargada).length + habRegularesFinales.filter(h => h.sobrecargada).length
  };
}

function distribuirHabitacionesServidoresEnLista(servidores, listaHab) {
  const shuffled = [...servidores].sort(() => Math.random() - 0.5);
  let idx = 0;
  return listaHab.map(hab => {
    const miembros = shuffled.slice(idx, idx + hab.capacidadMaxima);
    idx += hab.capacidadMaxima;
    return { ...hab, miembros, sobrecargada: miembros.length > hab.capacidadMaxima };
  });
}

function guardarEnStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
}

function cargarDeStorage(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) { return defaultValue; }
}

function generarHabitacionesBase(total, capacidad, inicio, niveles, habPorNivel) {
  const habs = [];
  for (let i = 0; i < total; i++) {
    const nivel = Math.floor(i / habPorNivel) + 1;
    habs.push({
      id: `${Date.now()}_${i}`,
      numero: inicio + i,
      capacidadMaxima: capacidad,
      nivelPiso: nivel,
      miembros: [],
      sobrecargada: false,
    });
  }
  return habs;
}

function generarHabitacionesServidoresBase(total, capacidad, inicio) {
  const habs = [];
  for (let i = 0; i < total; i++) {
    habs.push({
      id: `serv_${Date.now()}_${i}`,
      numero: inicio + i,
      capacidadMaxima: capacidad,
      nivelPiso: 1,
      miembros: [],
      sobrecargada: false,
    });
  }
  return habs;
}

function Stat({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-slate-100"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MesaEditable({ mesa, onActualizar, onEliminar, puedeEliminar, esRetiroMujeres }) {
  const handleChange = (campo, valor) => onActualizar({ ...mesa, [campo]: valor });
  const colorSeleccionado = COLORES_MESA.find(c => c.value === mesa.color_mesa) || COLORES_MESA[0];

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${mesa.sobrecargada ? "ring-2 ring-red-500 border-red-300" : "border-slate-200"}`}>
      <div className={`px-3 py-2 border-b flex justify-between items-center ${mesa.sobrecargada ? "bg-red-50 border-red-200" : esRetiroMujeres ? `${colorSeleccionado.bg} text-white` : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span className="text-sm font-semibold">
            {esRetiroMujeres && mesa.nombre_personalizado ? mesa.nombre_personalizado : `Mesa ${mesa.numero}`}
          </span>
        </div>
        {puedeEliminar && (
          <button onClick={onEliminar} className={`hover:opacity-75 p-0.5 rounded transition-colors ${esRetiroMujeres ? "text-white" : "text-slate-400 hover:text-red-600"}`} title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        {esRetiroMujeres && (
          <>
            <div>
              <label className="block text-[10px] text-slate-500 font-medium mb-1 uppercase tracking-wide">Nombre de Mesa</label>
              <input
                type="text"
                value={mesa.nombre_personalizado || ""}
                onChange={e => handleChange("nombre_personalizado", e.target.value)}
                placeholder={`Mesa ${mesa.numero}`}
                className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-medium mb-1 uppercase tracking-wide">Color de Mesa</label>
              <select
                value={mesa.color_mesa || ""}
                onChange={e => handleChange("color_mesa", e.target.value)}
                className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
              >
                {COLORES_MESA.map(color => (
                  <option key={color.value} value={color.value}>{color.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">NÚMERO</label>
            <input type="number" value={mesa.numero} onChange={e => handleChange("numero", Number(e.target.value))}
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">CAPACIDAD</label>
            <input type="number" min="1" max="20" value={mesa.capacidadMaxima || 8} onChange={e => handleChange("capacidadMaxima", Math.max(1, Number(e.target.value)))}
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className={`text-xs font-bold ${mesa.sobrecargada ? "text-red-600 animate-pulse" : "text-slate-500"}`}>
            {mesa.miembros?.length || 0} / {mesa.capacidadMaxima || 8} personas
          </span>
        </div>
        {mesa.sobrecargada && (
          <div className="bg-red-100 border-t border-red-200 px-3 py-2 flex items-center gap-2 text-red-700 text-xs font-bold rounded-b-lg">
            <AlertTriangle className="w-4 h-4" />
            SOBRECARGADA
          </div>
        )}
      </div>
    </div>
  );
}

function HabitacionEditable({ hab, color, onActualizar, onEliminar, puedeEliminar, tieneConflicto = false }) {
  const colorMap = {
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  };
  const c = colorMap[color] || colorMap.blue;
  const isOverloaded = hab.sobrecargada || hab.miembros?.length > hab.capacidadMaxima;
  const alertaRoja = isOverloaded || tieneConflicto;
  const handleChange = (campo, valor) => onActualizar({ ...hab, [campo]: valor });

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${alertaRoja ? "ring-2 ring-red-500 border-red-300" : c.border}`}>
      <div className={`${alertaRoja ? "bg-red-600 text-white" : c.bg} px-3 py-2 border-b flex justify-between items-center`}>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${alertaRoja ? "text-white" : c.text}`}>Hab. {hab.numero}</span>
        </div>
        {puedeEliminar && (
          <button onClick={onEliminar} className="text-white/80 hover:text-white p-0.5 rounded transition-colors" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">NÚMERO</label>
            <input type="number" value={hab.numero} onChange={e => handleChange("numero", Number(e.target.value))}
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">CAPACIDAD</label>
            <input type="number" min="1" max="20" value={hab.capacidadMaxima} onChange={e => handleChange("capacidadMaxima", Math.max(1, Number(e.target.value)))}
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 font-medium mb-1">PISO</label>
            <input type="number" min="1" max="20" value={hab.nivelPiso} onChange={e => handleChange("nivelPiso", Math.max(1, Number(e.target.value)))}
              className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className={`text-xs font-bold ${alertaRoja ? "text-red-600 animate-pulse" : "text-slate-500"}`}>
            {hab.miembros?.length || 0} / {hab.capacidadMaxima}
          </span>
          {hab.nivelPiso === 1 && <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">1er piso</span>}
        </div>
        {alertaRoja && (
          <div className="bg-red-100 border-t border-red-200 px-3 py-2 flex items-center gap-2 text-red-700 text-xs font-bold rounded-b-lg">
            <AlertTriangle className="w-4 h-4" />
            {isOverloaded ? "SOBRECARGADA" : "CONFLICTO MESA"}
          </div>
        )}
      </div>
    </div>
  );
}

function GrupoCard({ titulo, miembros, color, esLideres, nivelPiso, editando, destinos, numeroGrupo, onMove, capacidadMaxima, idsEnConflicto = [], esRetiroMujeres = false, colorMesa = "", onReubicarUno }) {
  const esMesa = color === "amber";
  const lideresDelGrupo = esMesa ? miembros.filter(m => m._esLider || m.rol_en_mesa === "Líder de Mesa") : [];
  const miembrosLista = esMesa ? miembros.filter(m => !m._esLider && m.rol_en_mesa !== "Líder de Mesa") : miembros;

  const tieneAlertaConflicto = miembros.some(m => idsEnConflicto.includes(m.id));
  const sobreCapacidad = capacidadMaxima && miembros.length > capacidadMaxima;
  const alertaRojaGrave = sobreCapacidad || (tieneAlertaConflicto && !esMesa);

  const colorMap = {
    amber: { head: "bg-slate-800", border: "border-slate-200", tag: "bg-slate-100 text-slate-700" },
    blue: { head: "bg-blue-700", border: "border-blue-200", tag: "bg-blue-100 text-blue-700" },
    purple: { head: "bg-purple-700", border: "border-purple-200", tag: "bg-purple-100 text-purple-700" },
  };

  let c = colorMap[color] || colorMap.amber;
  if (esRetiroMujeres && esMesa && colorMesa) {
    const colorPersonalizado = COLORES_MESA.find(col => col.value === colorMesa);
    if (colorPersonalizado) {
      c = { head: colorPersonalizado.bg, border: "border-slate-200", tag: "bg-white text-slate-700" };
    }
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${alertaRojaGrave ? "ring-2 ring-red-500 border-red-300" : c.border}`}>
      <div className={`${alertaRojaGrave ? "bg-red-600 animate-pulse text-white" : c.head} text-white px-4 py-3 shadow-xs flex items-center justify-between`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{titulo}</h3>
            {nivelPiso === 1 && <span className="text-xs bg-emerald-500/80 px-1.5 py-0.5 rounded font-bold">1er piso</span>}
            {nivelPiso > 1 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-bold">Piso {nivelPiso}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs opacity-90">
            <span className={`px-2 py-0.5 rounded font-bold ${alertaRojaGrave ? "bg-white text-red-700" : "bg-white/20"}`}>
              {miembros.length}{capacidadMaxima ? `/${capacidadMaxima}` : ""} personas
            </span>
          </div>
        </div>

        {alertaRojaGrave && onReubicarUno && (
          <button onClick={() => onReubicarUno(miembros[0])} className="bg-white text-red-900 px-2 py-1 rounded text-[10px] font-extrabold hover:bg-red-50 shrink-0">
            Reubicar Auto
          </button>
        )}
      </div>

      {lideresDelGrupo.length > 0 && (
        <div className="bg-slate-100 px-4 py-2 flex flex-wrap gap-1.5 border-b border-slate-200">
          {lideresDelGrupo.map(l => (
            <span key={l.id} className="flex items-center gap-1 bg-amber-200 text-amber-900 rounded px-2 py-0.5 text-xs font-bold">
              👑 {l.nombre}
            </span>
          ))}
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {miembrosLista.map(m => {
          const prioritario = (m.edad >= 65) || (m.condicion_fisica && m.condicion_fisica !== "Ninguna");
          const estaEnConflicto = idsEnConflicto.includes(m.id);
          return (
            <li key={m.id} className={`px-4 py-2.5 flex justify-between items-center gap-2 transition-colors ${estaEnConflicto ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
              <span className={`text-sm flex items-center gap-2 min-w-0 ${estaEnConflicto ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                {prioritario && <span className="text-emerald-600 text-xs">★</span>}
                {estaEnConflicto && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />}
                <span className="truncate font-medium">{m.nombre}</span>
              </span>
              {editando && destinos ? (
                <select value={numeroGrupo} onChange={e => onMove(m, e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400">
                  {destinos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.tag}`}>{m.edad ? `${m.edad} a.` : "-"}</span>
              )}
            </li>
          );
        })}
      </ul>
      {alertaRojaGrave && (
        <div className="bg-red-100 border-t border-red-200 px-4 py-2 flex items-center gap-2 text-red-700 text-xs font-bold">
          <AlertTriangle className="w-4 h-4" />
          {sobreCapacidad ? "SOBRECARGADA (CAPACIDAD EXCEDIDA)" : "CONFLICTO DE MESA EN HABITACIÓN"}
        </div>
      )}
    </div>
  );
}

function GrupoCardServidor({ titulo, miembros, nivelPiso, editando, destinos, numeroGrupo, onMove, capacidadMaxima }) {
  const sobreCapacidad = capacidadMaxima && miembros.length > capacidadMaxima;
  return (
    <div className={`bg-white rounded-lg border border-emerald-200 shadow-sm overflow-hidden ${sobreCapacidad ? "ring-2 ring-red-500 border-red-300" : ""}`}>
      <div className={`${sobreCapacidad ? "bg-red-600" : "bg-emerald-700"} text-white px-4 py-3`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{titulo}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs opacity-90">
              <span className={`px-2 py-0.5 rounded font-bold ${sobreCapacidad ? "bg-white text-red-700 animate-pulse" : "bg-white/20"}`}>
                {miembros.length}{capacidadMaxima ? `/${capacidadMaxima}` : ""} personas
              </span>
              {nivelPiso > 0 && <span>Piso {nivelPiso}</span>}
            </div>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {miembros.map(m => (
          <li key={m.id} className="px-4 py-2.5 flex justify-between items-center gap-2 hover:bg-slate-50 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 font-medium truncate">{m.nombre}</p>
              <p className="text-xs text-slate-500 truncate">{m.rol || "Sin rol"} · {m.parroquia || "—"}</p>
            </div>
            {editando && destinos ? (
              <select value={numeroGrupo} onChange={e => onMove(m, e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-400">
                {destinos.map(d => <option key={d} value={d}>Hab. {d}</option>)}
              </select>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{m.rol || "Servidor"}</span>
            )}
          </li>
        ))}
      </ul>
      {sobreCapacidad && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2 flex items-center gap-2 text-red-700 text-xs font-bold">
          <AlertTriangle className="w-4 h-4" />
          SOBRECARGADA
        </div>
      )}
    </div>
  );
}

function ModalConfirmacion({ abierto, onCerrar, onConfirmar, titulo, mensaje, detalles, color = "amber" }) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />{titulo}
          </h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-slate-600 mb-3">{mensaje}</p>
          {detalles && detalles.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-slate-200">
              <ul className="text-xs text-slate-600 space-y-1">
                {detalles.map((d, i) => (<li key={i} className="flex items-start gap-2"><span className="text-slate-400 shrink-0">•</span><span>{d}</span></li>))}
              </ul>
            </div>
          )}
        </div>
        <div className="px-6 py-3 bg-slate-50 flex justify-end gap-2 border-t border-slate-200">
          <button onClick={onCerrar} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
          <button onClick={onConfirmar} className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function BarraProgreso({ progreso, mensaje, errores }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200"><h3 className="text-lg font-semibold text-slate-800">Guardando distribución...</h3></div>
        <div className="px-6 py-5">
          <div className="mb-3 flex justify-between text-xs text-slate-600">
            <span>{mensaje}</span><span className="font-semibold">{progreso}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-slate-800 h-full transition-all duration-300" style={{ width: `${progreso}%` }} />
          </div>
          {errores.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-red-700 mb-1">Errores ({errores.length}):</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {errores.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                {errores.length > 5 && <li>...y {errores.length - 5} más</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelAsignacionEquipos({ servidores, habitaciones, onAsignar }) {
  const equiposMap = {};
  servidores.forEach(s => {
    const eq = s.equipo || s.nombre_equipo || "Sin Equipo";
    if (!equiposMap[eq]) equiposMap[eq] = [];
    equiposMap[eq].push(s);
  });
  const equipos = Object.entries(equiposMap).map(([nombre, miembros]) => ({ nombre, miembros }));
  const [habsInput, setHabsInput] = useState({});

  const handleAsignar = (equipoNombre) => {
    const input = habsInput[equipoNombre] || "";
    const habs = input.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    if (habs.length === 0) return toast.error("Ingresa al menos un número de habitación");
    onAsignar(equipoNombre, habs);
    setHabsInput(prev => ({ ...prev, [equipoNombre]: "" }));
  };

  if (equipos.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No hay servidores registrados.</p>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-emerald-600" /> Asignar Habitaciones por Equipo
      </h3>
      <div className="space-y-3">
        {equipos.map(eq => (
          <div key={eq.nombre} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800 truncate">{eq.nombre}</p>
              <p className="text-xs text-slate-500">{eq.miembros.length} servidores</p>
            </div>
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Ej: 101, 102"
                value={habsInput[eq.nombre] || ""}
                onChange={(e) => setHabsInput(prev => ({ ...prev, [eq.nombre]: e.target.value }))}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={() => handleAsignar(eq.nombre)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0"
              >
                Asignar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelConfiguracionCaminantes({ cfg, onChange, onGenerarHabitaciones }) {
  const numerosStr = (cfg.numerosDeMesa || "1, 2, 3, 4, 5, 6, 7, 8");
  const totalMesasCalculado = numerosStr.split(',').filter(n => n.trim() !== '').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configuración inicial para Caminantes</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="col-span-2 md:col-span-4 lg:col-span-4 border-r border-slate-200 pr-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Mesas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-600 mb-1">Números de Mesa (separados por coma)</label>
              <input type="text" placeholder="Ej: 1, 2, 3, 5, 8, 10" value={numerosStr}
                onChange={e => onChange("numerosDeMesa", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              <p className="text-[10px] text-slate-500 mt-1">Total de mesas configuradas: <strong>{totalMesasCalculado}</strong></p>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Personas por mesa</label>
              <input type="number" min="2" value={cfg.capacidadMesa} onChange={e => onChange("capacidadMesa", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Líderes por mesa</label>
              <select value={cfg.lideresPerMesa} onChange={e => onChange("lideresPerMesa", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value={1}>1 líder</option><option value={2}>2 líderes</option>
              </select>
            </div>
          </div>
        </div>
        <div className="col-span-2 md:col-span-4 lg:col-span-4 pl-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Generar Habitaciones Base</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-600 mb-1">Hab. líderes</label>
              <input type="number" min="0" value={cfg.totalHabLideres} onChange={e => onChange("totalHabLideres", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Cap. líderes</label>
              <input type="number" min="1" value={cfg.capacidadHabLider} onChange={e => onChange("capacidadHabLider", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Inicio núm. líderes</label>
              <input type="number" min="1" value={cfg.inicioHabLideres} onChange={e => onChange("inicioHabLideres", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Hab. caminantes</label>
              <input type="number" min="0" value={cfg.totalHabRegulares} onChange={e => onChange("totalHabRegulares", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Cap. caminantes</label>
              <input type="number" min="1" value={cfg.capacidadHabRegular} onChange={e => onChange("capacidadHabRegular", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Inicio núm. caminantes</label>
              <input type="number" min="1" value={cfg.inicioHabRegulares} onChange={e => onChange("inicioHabRegulares", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Pisos</label>
              <input type="number" min="1" max="20" value={cfg.pisosEdificio} onChange={e => onChange("pisosEdificio", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div><label className="block text-xs text-slate-600 mb-1">Hab/piso</label>
              <input type="number" min="1" value={cfg.habPorPiso} onChange={e => onChange("habPorPiso", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          </div>
          <button onClick={onGenerarHabitaciones} className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Building2 className="w-4 h-4" />Generar Habitaciones Base
          </button>
          <p className="text-xs text-slate-500 mt-2">⚠️ Esto reiniciará las habitaciones y limpiará las mesas asignadas.</p>
        </div>
      </div>
    </div>
  );
}

function PanelConfiguracionServidores({ cfg, onChange, onGenerarHabitaciones }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Configuración inicial para Servidores</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><label className="block text-xs text-slate-600 mb-1">Total de habitaciones</label>
          <input type="number" min="1" value={cfg.totalHabServidores} onChange={e => onChange("totalHabServidores", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div><label className="block text-xs text-slate-600 mb-1">Personas por habitación</label>
          <input type="number" min="1" value={cfg.capacidadHabServidor} onChange={e => onChange("capacidadHabServidor", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div><label className="block text-xs text-slate-600 mb-1">Numeración empieza en</label>
          <input type="number" min="1" value={cfg.inicioHabServidor} onChange={e => onChange("inicioHabServidor", Number(e.target.value))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="flex items-end">
          <button onClick={onGenerarHabitaciones} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Building2 className="w-4 h-4" />Generar Habitaciones
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">⚠️ Esto reiniciará las habitaciones de servidores.</p>
    </div>
  );
}

function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function imprimirDistribucionCaminantes(tab, gruposMesa, habLideres, habRegulares, configRetiro, esRetiroMujeres = false) {
  const hoy = new Date().toLocaleDateString("es-DO");
  const titulos = { mesas: "Distribución de Mesas", habitaciones: "Distribución de Habitaciones" };
  const titulo = titulos[tab] || "Distribución";
  const estilosBase = `
    @page { size: 8.5in 11in portrait; margin: 0.5in 0.5in; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background: white; margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    .grid1 { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .card { break-inside: avoid; border-radius: 4px; overflow: hidden; border: 1px solid #d1d5db; }
    .card-head { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: white; }
    .card-head .title { font-size: 12px; font-weight: 800; letter-spacing: 0.3px; }
    .card-head .meta { font-size: 9px; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th { padding: 4px 6px; text-align: left; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; color: #111; border-bottom: 2px solid #1e293b; background: #f8fafc; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; color: #111; vertical-align: middle; }
    thead th:nth-child(1), tbody td:nth-child(1) { width: 4%; text-align: center; }
    thead th:nth-child(2), tbody td:nth-child(2) { width: 32%; }
    thead th:nth-child(3), tbody td:nth-child(3) { width: 16%; }
    thead th:nth-child(4), tbody td:nth-child(4) { width: 12%; text-align: center; }
    thead th:nth-child(5), tbody td:nth-child(5) { width: 12%; text-align: center; }
    thead th:nth-child(6), tbody td:nth-child(6) { width: 12%; text-align: center; }
    thead th:nth-child(7), tbody td:nth-child(7) { width: 12%; text-align: center; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 3px solid #1e293b; margin-bottom: 12px; }
    .page-footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 8px; color: #555; }
  `;
  const infoRetiro = configRetiro ? `${escHtml(configRetiro.nombre_retiro || "")}${configRetiro.edicion ? ` · ${escHtml(configRetiro.edicion)}` : ""}` : "";

  let contenido = "";
  if (tab === "mesas") {
    contenido = `<div class="grid1">${gruposMesa.map(mesa => {
      const lideresMesa = mesa.miembros.filter(m => m._esLider || m.rol_en_mesa === "Líder de Mesa");
      const regulares = mesa.miembros.filter(m => !m._esLider && m.rol_en_mesa !== "Líder de Mesa");
      const lideresHTML = lideresMesa.map(l => `<span style="font-size:9px;font-weight:700;margin-right:6px">👑 ${escHtml(l.nombre)}</span>`).join("");
      const sobrecargaHTML = mesa.sobrecargada ? `<div style="color: #dc2626; font-weight: bold; font-size: 9px; margin-top: 2px;">⚠️ SOBRECARGADA</div>` : "";

      let estiloBorde = "border-left: 4px solid #1e293b;";
      let estiloTitulo = "color: #111;";
      if (esRetiroMujeres && mesa.color_mesa) {
        const colorObj = COLORES_MESA.find(c => c.value === mesa.color_mesa);
        if (colorObj) {
          estiloBorde = `border-left: 4px solid ${colorObj.hex}; background: ${colorObj.hex}15;`;
          estiloTitulo = `color: ${colorObj.hex};`;
        }
      }
      if (mesa.sobrecargada) {
        estiloBorde = "border-left: 4px solid #dc2626; background: #fef2f2;";
        estiloTitulo = "color: #dc2626;";
      }

      const filas = regulares.map((m, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500">${escHtml(m.nombre)}</td>
        <td>${escHtml(m.numero_habitacion || "—")}</td>
        <td>${m.edad ? m.edad + " a." : "—"}</td>
        <td>${m.peso_kg ? m.peso_kg + " kg" : "—"}</td>
        <td>${m.talla_cm ? m.talla_cm + " cm" : "—"}</td>
        <td>${escHtml(m.talla_camisa || "—")}</td>
      </tr>`).join("");

      const tituloMesa = esRetiroMujeres && mesa.nombre_personalizado ? mesa.nombre_personalizado : `Mesa ${mesa.numero}`;

      return `<div class="card" style="${estiloBorde}"><div class="card-head" style="${estiloBorde} border-bottom: 1px solid #e5e7eb;"><div><div class="title" style="${estiloTitulo}">${tituloMesa}</div><div style="font-size:9px;color:#333;margin-top:2px">${lideresHTML}</div>${sobrecargaHTML}</div><div class="meta" style="color: ${mesa.sobrecargada ? '#dc2626' : '#555'}; font-weight: ${mesa.sobrecargada ? 'bold' : 'normal'}">${mesa.miembros.length} participantes</div></div><table><thead><tr><th>#</th><th>Nombre</th><th>Hab.</th><th>Edad</th><th>Peso</th><th>Altura</th><th>Size</th></tr></thead><tbody>${filas}</tbody></table></div>`;
    }).join("")}</div>`;
  } else {
    const habs = [...habLideres, ...habRegulares];
    contenido = `<div class="grid1">${habs.map(hab => {
      const pisoLabel = hab.nivelPiso === 1 ? " · 1er Piso" : hab.nivelPiso > 1 ? ` · Piso ${hab.nivelPiso}` : "";
      const sobrecargaHTML = hab.sobrecargada ? `<div style="color: #dc2626; font-weight: bold; font-size: 9px; margin-top: 2px;">⚠️ SOBRECARGADA</div>` : "";
      const estiloBorde = hab.sobrecargada ? "border-left: 4px solid #dc2626; background: #fef2f2;" : "border-left: 4px solid #1e293b;";
      const estiloTitulo = hab.sobrecargada ? "color: #dc2626;" : "color: #111;";

      const filas = hab.miembros.map((m, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500">${escHtml(m.nombre)}</td>
        <td>${escHtml(m.numero_mesa || "—")}</td>
        <td>${m.edad ? m.edad + " a." : "—"}</td>
        <td>${m.peso_kg ? m.peso_kg + " kg" : "—"}</td>
        <td>${m.talla_cm ? m.talla_cm + " cm" : "—"}</td>
        <td>${escHtml(m.talla_camisa || "—")}</td>
      </tr>`).join("");

      return `<div class="card" style="${estiloBorde}"><div class="card-head" style="${estiloBorde} border-bottom: 1px solid #e5e7eb;"><div><div class="title" style="${estiloTitulo}">Habitación ${hab.numero}${pisoLabel}</div>${sobrecargaHTML}</div><div class="meta" style="color: ${hab.sobrecargada ? '#dc2626' : '#555'}; font-weight: ${hab.sobrecargada ? 'bold' : 'normal'}">${hab.miembros.length} personas</div></div><table><thead><tr><th>#</th><th>Nombre</th><th>Mesa</th><th>Edad</th><th>Peso</th><th>Altura</th><th>Size</th></tr></thead><tbody>${filas}</tbody></table></div>`;
    }).join("")}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>${estilosBase}</style></head><body>
    <div class="page-header"><div><p style="font-size:18px;font-weight:800;margin:0;color:#111">✝️ Retiro de Emaús</p>${infoRetiro ? `<p style="font-size:10px;color:#333;margin:3px 0 0">${infoRetiro}</p>` : ""}</div>
    <div style="text-align:right"><p style="font-size:14px;font-weight:700;color:#111;margin:0">${titulo}</p><p style="font-size:9px;color:#555;margin:4px 0 0">${hoy}</p></div></div>
    ${contenido}
    <div class="page-footer"><span>✝️ Sistema de Gestión — Retiro de Emaús</span><span>Generado el ${hoy}</span></div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
  </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

function imprimirDistribucionServidores(habServidores, configRetiro) {
  const hoy = new Date().toLocaleDateString("es-DO");
  const estilosBase = `
    @page { size: 8.5in 11in portrait; margin: 0.6in 0.75in; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; margin: 0; padding: 0; }
    * { box-sizing: border-box; }
    .grid1 { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .card { break-inside: avoid; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
    .card-head { padding: 9px 14px; border-left: 5px solid #047857; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: white; }
    .card-head .title { font-size: 13px; font-weight: 800; color: #111; letter-spacing: 0.3px; }
    .card-head .meta { font-size: 10px; color: #555; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { padding: 6px 12px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #111; border-bottom: 2px solid #047857; background: #f8fafc; }
    tbody td { padding: 6px 12px; border-bottom: 1px solid #e5e7eb; color: #111; vertical-align: middle; }
    thead th:nth-child(1), tbody td:nth-child(1) { width: 5%; text-align: center; }
    thead th:nth-child(2), tbody td:nth-child(2) { width: 40%; }
    thead th:nth-child(3), tbody td:nth-child(3) { width: 25%; }
    thead th:nth-child(4), tbody td:nth-child(4) { width: 30%; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #047857; margin-bottom: 20px; }
    .page-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9px; color: #555; }
  `;
  const infoRetiro = configRetiro ? `${escHtml(configRetiro.nombre_retiro || "")}${configRetiro.edicion ? ` · ${escHtml(configRetiro.edicion)}` : ""}` : "";
  const cards = habServidores.map(hab => {
    const pisoLabel = hab.nivelPiso > 1 ? ` · Piso ${hab.nivelPiso}` : "";
    const sobrecargaHTML = hab.sobrecargada ? `<div style="color: #dc2626; font-weight: bold; font-size: 11px; margin-top: 4px;">⚠️ SOBRECARGADA</div>` : "";
    const estiloBorde = hab.sobrecargada ? "border-left: 5px solid #dc2626; background: #fef2f2;" : "border-left: 5px solid #047857;";
    const estiloTitulo = hab.sobrecargada ? "color: #dc2626;" : "color: #111;";

    const filas = hab.miembros.map((m, i) => `<tr><td>${i + 1}</td><td style="font-weight:500">${escHtml(m.nombre)}</td><td>${escHtml(m.rol || "—")}</td><td>${escHtml(m.parroquia || "—")}</td></tr>`).join("");
    return `<div class="card" style="${estiloBorde}"><div class="card-head" style="${estiloBorde}"><div><div class="title" style="${estiloTitulo}">Habitación ${hab.numero}${pisoLabel}</div>${sobrecargaHTML}</div><div class="meta" style="color: ${hab.sobrecargada ? '#dc2626' : '#555'}; font-weight: ${hab.sobrecargada ? 'bold' : 'normal'}">${hab.miembros.length} servidores</div></div><table><thead><tr><th>#</th><th>Nombre</th><th>Rol</th><th>Parroquia</th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distribución de Servidores</title><style>${estilosBase}</style></head><body>
    <div class="page-header"><div><p style="font-size:22px;font-weight:800;margin:0;color:#111">✝️ Retiro de Emaús</p>${infoRetiro ? `<p style="font-size:11px;color:#333;margin:4px 0 0">${infoRetiro}</p>` : ""}</div>
    <div style="text-align:right"><p style="font-size:16px;font-weight:700;color:#111;margin:0">Distribución de Servidores</p><p style="font-size:10px;color:#555;margin:5px 0 0">${hoy}</p></div></div>
    <div class="grid1">${cards}</div>
    <div class="page-footer"><span>✝️ Sistema de Gestión — Retiro de Emaús</span><span>Generado el ${hoy}</span></div>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
  </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

function imprimirDistintivosPuertas(tipo, data, configRetiro) {
  const hoy = new Date().toLocaleDateString("es-DO");
  const infoRetiro = configRetiro ? `${escHtml(configRetiro.nombre_retiro || "")}${configRetiro.edicion ? ` · ${escHtml(configRetiro.edicion)}` : ""}` : "";
  let habs = [];

  if (tipo === "caminantes") habs = [...data.habLideres, ...data.habRegulares];
  else if (tipo === "servidores") habs = data.habServidores;

  const paginas = habs.map(hab => {
    const esLider = hab.esLideres;
    const pisoTexto = hab.nivelPiso === 1 ? "PRIMER PISO" : `PISO ${hab.nivelPiso || 1}`;
    const tipoTexto = esLider ? "" : (tipo === "servidores" ? "SERVIDORES" : "CAMINANTES");
    const sobrecargaTexto = hab.sobrecargada ? " ⚠️ SOBRECARGADA" : "";
    const colorBorde = hab.sobrecargada ? "#dc2626" : (esLider ? "#9333ea" : (tipo === "servidores" ? "#047857" : "#2563eb"));

    const listaNombres = hab.miembros.map(m => {
      return `<div class="nombre-item ${hab.sobrecargada ? 'sobrecargada' : ''}">
        <span class="icono"></span>
        <span>${escHtml(m.nombre)}</span>
      </div>`;
    }).join("");

    return `
      <div class="page-distintivo" style="border-color: ${colorBorde};">
        <div class="distintivo-header">✝️ RETIRO DE EMAÚS ${infoRetiro ? `· ${infoRetiro}` : ""}</div>
        <div class="distintivo-titulo" style="color: ${colorBorde};">HABITACIÓN ${hab.numero}${sobrecargaTexto}</div>
        <div class="distintivo-piso">${pisoTexto} ${tipoTexto ? `· ${tipoTexto}` : ""}</div>
        <div class="distintivo-nombres">${listaNombres}</div>
        <div class="distintivo-footer">Generado el ${hoy} · Sistema de Gestión Emaús</div>
      </div>
    `;
  }).join("");

  const estilos = `
    @page { size: 8.5in 11in portrait; margin: 0.3in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial Black', Arial, sans-serif; background: white; }
    .page-distintivo { width: 100%; height: 10.4in; page-break-after: always; display: flex; flex-direction: column; border: 8px solid #ccc; padding: 0.4in; position: relative; text-align: center; }
    .page-distintivo:last-child { page-break-after: auto; }
    .distintivo-header { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 0.2in; font-family: Arial, sans-serif; font-weight: 600; }
    .distintivo-titulo { font-size: 72px; font-weight: 900; margin: 0.1in 0; line-height: 1.1; letter-spacing: -2px; }
    .distintivo-piso { font-size: 22px; font-weight: 700; color: #555; margin-bottom: 0.4in; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; }
    .distintivo-nombres { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; text-align: left; padding: 0 0.4in; }
    .nombre-item { font-size: 32px; font-weight: 700; color: #111; display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #eee; padding-bottom: 12px; font-family: Arial, sans-serif; }
    .nombre-item.sobrecargada { color: #dc2626; }
    .nombre-item .icono { font-size: 28px; min-width: 40px; text-align: center; }
    .distintivo-footer { font-size: 12px; color: #888; margin-top: 0.3in; border-top: 3px solid #eee; padding-top: 12px; font-family: Arial, sans-serif; font-weight: normal; letter-spacing: 1px; }
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Distintivos de Puertas</title><style>${estilos}</style></head><body>
    ${paginas}
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
  </body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

export default function Distribucion() {
  const { records: todosCaminantes, loading: loadingCams, online: onlineCams } = useOffline("Caminante");
  const { records: todosServidores, loading: loadingServs, online: onlineServs, update: updateServ } = useOffline("Servidor");

  const [configRetiro, setConfigRetiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();
  
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const storageSuffix = equipoIdActivo ? `_${equipoIdActivo}` : "";

  const STORAGE_KEYS = {
    distribucionCaminantes: `distribucion_caminantes_v5${storageSuffix}`,
    distribucionServidores: `distribucion_servidores_v5${storageSuffix}`,
    configCaminantes: `config_caminantes_v5${storageSuffix}`,
    configServidores: `config_servidores_v5${storageSuffix}`,
  };

  const online = onlineCams && onlineServs;
  const esRetiroMujeres = configRetiro?.tipo_retiro === "Retiro Mujeres";

  const [mainTab, setMainTab] = useState("caminantes");
  const [subTabCaminantes, setSubTabCaminantes] = useState("mesas");

  const [cfgCaminantes, setCfgCaminantes] = useState(() => {
    const stored = cargarDeStorage(STORAGE_KEYS.configCaminantes, null);
    const defaults = {
      numerosDeMesa: "1, 2, 3, 4, 5, 6, 7, 8",
      capacidadMesa: 8, lideresPerMesa: 1,
      totalHabLideres: 2, capacidadHabLider: 4, inicioHabLideres: 1,
      totalHabRegulares: 10, capacidadHabRegular: 4, inicioHabRegulares: 3,
      pisosEdificio: 2, habPorPiso: 5,
    };
    if (!stored) return defaults;
    return { ...defaults, ...stored, numerosDeMesa: stored.numerosDeMesa || defaults.numerosDeMesa };
  });

  const [cfgServidores, setCfgServidores] = useState(() => cargarDeStorage(STORAGE_KEYS.configServidores, {
    totalHabServidores: 5, capacidadHabServidor: 4, inicioHabServidor: 100,
  }));

  const [habLideres, setHabLideres] = useState(() => cargarDeStorage(STORAGE_KEYS.distribucionCaminantes, null)?.habLideres || []);
  const [habRegulares, setHabRegulares] = useState(() => cargarDeStorage(STORAGE_KEYS.distribucionCaminantes, null)?.habRegulares || []);
  const [habServidores, setHabServidores] = useState(() => cargarDeStorage(STORAGE_KEYS.distribucionServidores, null)?.habServidores || []);
  const [gruposMesa, setGruposMesa] = useState(() => cargarDeStorage(STORAGE_KEYS.distribucionCaminantes, null)?.gruposMesa || []);

  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarConfigServidores, setMostrarConfigServidores] = useState(false);
  const [mostrarAsignacionEquipos, setMostrarAsignacionEquipos] = useState(false);
  const [distribuyendo, setDistribuyendo] = useState(false);
  const [distribuyendoServidores, setDistribuyendoServidores] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editandoServidores, setEditandoServidores] = useState(false);
  const [mostrarHabitaciones, setMostrarHabitaciones] = useState(false);
  const [mostrarGestionMesas, setMostrarGestionMesas] = useState(false);
  const [mostrarHabitacionesServidores, setMostrarHabitacionesServidores] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(null);
  const [progresoGuardado, setProgresoGuardado] = useState(null);

  useEffect(() => {
    const distCam = cargarDeStorage(STORAGE_KEYS.distribucionCaminantes, null);
    const distServ = cargarDeStorage(STORAGE_KEYS.distribucionServidores, null);

    setGruposMesa(distCam?.gruposMesa || []);
    setHabLideres(distCam?.habLideres || []);
    setHabRegulares(distCam?.habRegulares || []);
    setHabServidores(distServ?.habServidores || []);
  }, [comunidadActual]);

  useEffect(() => { guardarEnStorage(STORAGE_KEYS.distribucionCaminantes, { gruposMesa, habLideres, habRegulares }); }, [gruposMesa, habLideres, habRegulares, comunidadActual]);
  useEffect(() => { guardarEnStorage(STORAGE_KEYS.distribucionServidores, { habServidores }); }, [habServidores, comunidadActual]);
  useEffect(() => { guardarEnStorage(STORAGE_KEYS.configCaminantes, cfgCaminantes); }, [cfgCaminantes, comunidadActual]);
  useEffect(() => { guardarEnStorage(STORAGE_KEYS.configServidores, cfgServidores); }, [cfgServidores, comunidadActual]);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      const match = (cfgs || []).find(c => 
        !equipoIdActivo || 
        c.equipo_id === equipoIdActivo || 
        c.comunidad_id === equipoIdActivo || 
        c.retiro_id === equipoIdActivo
      ) || cfgs?.[0];

      if (match) {
        setConfigRetiro(match);
        setCfgCaminantes(prev => ({
          ...prev,
          capacidadMesa: match.capacidad_mesa || prev.capacidadMesa,
          totalHabRegulares: match.total_habitaciones || prev.totalHabRegulares,
          capacidadHabRegular: match.capacidad_habitacion || prev.capacidadHabRegular,
          pisosEdificio: match.niveles_edificio || prev.pisosEdificio,
          habPorPiso: match.habitaciones_por_nivel || prev.habPorPiso,
        }));
      }
    }).catch(() => {});
  }, [equipoIdActivo]);

  useEffect(() => {
    if (!loadingCams && !loadingServs) setLoading(false);
  }, [loadingCams, loadingServs, todosCaminantes, todosServidores]);

  const caminantesActivos = (todosCaminantes || []).filter(c => 
    !equipoIdActivo || 
    c.equipo_id === equipoIdActivo || 
    c.comunidad_id === equipoIdActivo || 
    c.retiro_id === equipoIdActivo
  );

  const servidoresActivos = (todosServidores || []).filter(s => 
    !equipoIdActivo || 
    s.equipo_id === equipoIdActivo || 
    s.comunidad_id === equipoIdActivo || 
    s.retiro_id === equipoIdActivo
  );

  const lideres = caminantesActivos.filter(c => c.rol_en_mesa?.toLowerCase().includes("líder") || c.rol_en_mesa?.toLowerCase().includes("lider"));
  const regulares = caminantesActivos.filter(c => !(c.rol_en_mesa?.toLowerCase().includes("líder") || c.rol_en_mesa?.toLowerCase().includes("lider")));

  const handleCfgCaminantesChange = (key, value) => setCfgCaminantes(prev => ({ ...prev, [key]: value }));
  const handleCfgServidoresChange = (key, value) => setCfgServidores(prev => ({ ...prev, [key]: value }));

  const getNumerosDeMesa = () => {
    const str = cfgCaminantes?.numerosDeMesa || "1, 2, 3, 4, 5, 6, 7, 8";
    return str.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  };

  const generarHabitacionesCaminantes = () => {
    if (!window.confirm("⚠️ ¿Estás seguro de generar nuevas habitaciones base?\n\nEsto reiniciará las habitaciones actuales y limpiará la distribución de mesas asignada.")) return;
    const nuevasHabLideres = generarHabitacionesBase(cfgCaminantes.totalHabLideres, cfgCaminantes.capacidadHabLider, cfgCaminantes.inicioHabLideres || 1, cfgCaminantes.pisosEdificio, cfgCaminantes.habPorPiso);
    const nuevasHabRegulares = generarHabitacionesBase(cfgCaminantes.totalHabRegulares, cfgCaminantes.capacidadHabRegular, cfgCaminantes.inicioHabRegulares || (cfgCaminantes.inicioHabLideres + cfgCaminantes.totalHabLideres), cfgCaminantes.pisosEdificio, cfgCaminantes.habPorPiso);
    setHabLideres(nuevasHabLideres);
    setHabRegulares(nuevasHabRegulares);
    setGruposMesa([]);
    toast.success(`Habitaciones generadas: ${nuevasHabLideres.length} líderes + ${nuevasHabRegulares.length} caminantes`);
  };

  const generarHabitacionesServidores = () => {
    if (!window.confirm("⚠️ ¿Estás seguro de generar nuevas habitaciones de servidores?\n\nEsto reiniciará las asignaciones.")) return;
    const nuevasHab = generarHabitacionesServidoresBase(cfgServidores.totalHabServidores, cfgServidores.capacidadHabServidor, cfgServidores.inicioHabServidor);
    setHabServidores(nuevasHab);
    toast.success(`${nuevasHab.length} habitaciones de servidores generadas`);
  };

  const agregarMesa = () => {
    const maxNum = gruposMesa.reduce((m, mesa) => Math.max(m, mesa.numero), 0);
    const nuevaMesa = {
      numero: maxNum + 1,
      miembros: [],
      capacidadMaxima: cfgCaminantes.capacidadMesa,
      sobrecargada: false
    };

    if (esRetiroMujeres) {
      nuevaMesa.nombre_personalizado = `Mesa ${maxNum + 1}`;
      nuevaMesa.color_mesa = COLORES_MESA[(gruposMesa.length) % COLORES_MESA.length].value;
    }

    setGruposMesa(prev => [...prev, nuevaMesa]);
  };

  const actualizarMesa = (mesaActualizada) => setGruposMesa(prev => prev.map(m => m.numero === mesaActualizada.numero ? mesaActualizada : m));
  const eliminarMesa = (numero) => {
    setGruposMesa(prev => prev.filter(m => m.numero !== numero));
    toast.info("Mesa eliminada. Los participantes quedaron sin asignar.");
  };

  const agregarHabLider = () => {
    const maxNum = habLideres.reduce((m, h) => Math.max(m, h.numero), 0);
    setHabLideres(prev => [...prev, { id: `lid_${Date.now()}`, numero: maxNum + 1, capacidadMaxima: cfgCaminantes.capacidadHabLider, nivelPiso: 1, miembros: [], sobrecargada: false }]);
  };
  const agregarHabRegular = () => {
    const maxNum = habRegulares.reduce((m, h) => Math.max(m, h.numero), 0);
    setHabRegulares(prev => [...prev, { id: `reg_${Date.now()}`, numero: maxNum + 1, capacidadMaxima: cfgCaminantes.capacidadHabRegular, nivelPiso: 1, miembros: [], sobrecargada: false }]);
  };
  const agregarHabServidor = () => {
    const maxNum = habServidores.reduce((m, h) => Math.max(m, h.numero), 0);
    setHabServidores(prev => [...prev, { id: `serv_${Date.now()}`, numero: maxNum + 1, capacidadMaxima: cfgServidores.capacidadHabServidor, nivelPiso: 1, miembros: [], sobrecargada: false }]);
  };

  const actualizarHabLider = (hab) => setHabLideres(prev => prev.map(h => h.id === hab.id ? hab : h));
  const actualizarHabRegular = (hab) => setHabRegulares(prev => prev.map(h => h.id === hab.id ? hab : h));
  const actualizarHabServidor = (hab) => setHabServidores(prev => prev.map(h => h.id === hab.id ? hab : h));

  const eliminarHabLider = (id) => setHabLideres(prev => prev.filter(h => h.id !== id));
  const eliminarHabRegular = (id) => setHabRegulares(prev => prev.filter(h => h.id !== id));
  const eliminarHabServidor = (id) => setHabServidores(prev => prev.filter(h => h.id !== id));

  const mesasDestinos = getNumerosDeMesa();
  const habLideresDestinos = habLideres.map(h => h.numero);
  const habRegularesDestinos = habRegulares.map(h => h.numero);
  const habServidoresDestinos = habServidores.map(h => h.numero);

  const moverEnMesa = (persona, destino) => {
    const dest = Number(destino);
    setGruposMesa(prev => {
      let grupos = prev.map(g => ({ ...g, miembros: g.miembros.filter(m => m.id !== persona.id) }));
      const existente = grupos.find(g => g.numero === dest);
      if (existente) existente.miembros = [...existente.miembros, persona];
      else grupos.push({ numero: dest, miembros: [persona], capacidadMaxima: cfgCaminantes.capacidadMesa, sobrecargada: false });
      return grupos;
    });
  };

  const moverEnHab = (persona, destino, esLideres) => {
    const dest = Number(destino);
    const setter = esLideres ? setHabLideres : setHabRegulares;
    setter(prev => {
      let grupos = prev.map(g => ({ ...g, miembros: g.miembros.filter(m => m.id !== persona.id) }));
      const existente = grupos.find(g => g.numero === dest);
      if (existente) existente.miembros = [...existente.miembros, persona];
      else grupos.push({ id: `new_${Date.now()}`, numero: dest, capacidadMaxima: esLideres ? cfgCaminantes.capacidadHabLider : cfgCaminantes.capacidadHabRegular, nivelPiso: 1, miembros: [persona], esLideres, sobrecargada: false });
      return grupos;
    });
  };

  const handleDistribuirCaminantes = () => {
    if (caminantesActivos.length === 0) {
      toast.error("No hay caminantes registrados en esta comunidad.");
      return;
    }
    if (habLideres.length === 0 && habRegulares.length === 0) {
      toast.error("Primero genera o configura las habitaciones.");
      return;
    }

    if (gruposMesa.length > 0 || habLideres.some(h => h.miembros?.length > 0)) {
      if (!window.confirm("⚠️ ¿Estás seguro de generar una nueva distribución?\n\nEsto reemplazará la distribución actual.")) return;
    }

    setDistribuyendo(true);
    const numerosMesa = getNumerosDeMesa();
    if (numerosMesa.length === 0) { toast.error("Configura al menos un número de mesa."); setDistribuyendo(false); return; }

    const { grupos: mesas, mesasSobrecargadasCount } = distribuirMesas(lideres, regulares, numerosMesa.length, cfgCaminantes.capacidadMesa, cfgCaminantes.lideresPerMesa, esRetiroMujeres);

    const mesasNumeradas = mesas.map((m, i) => ({ ...m, numero: m.numero, capacidadMaxima: m.capacidadMaxima }));
    const regularesConMesa = regulares.map(c => {
      const mesaAsignada = mesasNumeradas.find(m => m.miembros.some(m2 => m2.id === c.id));
      return { ...c, _mesaAsignada: mesaAsignada?.numero };
    });

    const { habLideres: hl, habRegulares: hr, habsSobrecargadas } = distribuirHabitacionesEnLista(lideres, regularesConMesa, mesasNumeradas, habLideres, habRegulares);

    setGruposMesa(mesasNumeradas);
    setHabLideres(hl);
    setHabRegulares(hr);
    setDistribuyendo(false);

    guardarEnStorage(STORAGE_KEYS.distribucionCaminantes, { gruposMesa: mesasNumeradas, habLideres: hl, habRegulares: hr });
    window.dispatchEvent(new Event("distribucionActualizada"));

    const datosBackup = { gruposMesa: mesasNumeradas, habLideres: hl, habRegulares: hr, timestamp: Date.now() };
    descargarBackup('caminantes', datosBackup);

    if (mesasSobrecargadasCount > 0 || habsSobrecargadas > 0) {
      toast.warning(`Distribución completada, pero hay ${mesasSobrecargadasCount} mesa(s) y ${habsSobrecargadas} habitación(es) SOBRECARGADAS.`);
    } else {
      toast.success(`✅ Distribución exitosa: ${mesasNumeradas.length} mesas, ${hl.length + hr.length} habitaciones.`);
    }
  };

  const moverEnHabServidor = (persona, destino) => {
    const dest = Number(destino);
    setHabServidores(prev => {
      let grupos = prev.map(g => ({ ...g, miembros: g.miembros.filter(m => m.id !== persona.id) }));
      const existente = grupos.find(g => g.numero === dest);
      if (existente) existente.miembros = [...existente.miembros, persona];
      else grupos.push({ id: `serv_new_${Date.now()}`, numero: dest, capacidadMaxima: cfgServidores.capacidadHabServidor, nivelPiso: 1, miembros: [persona], sobrecargada: false });
      return grupos.filter(g => g.miembros.length > 0).sort((a, b) => a.numero - b.numero);
    });
  };

  const asignarEquipoAHabitaciones = (equipoNombre, numerosHabs) => {
    const servidoresDelEquipo = servidoresActivos.filter(s => (s.equipo || s.nombre_equipo || "Sin Equipo") === equipoNombre);
    if (servidoresDelEquipo.length === 0) return;
    let nuevasHabs = habServidores.map(h => ({ ...h, miembros: h.miembros.filter(m => !servidoresDelEquipo.some(s => s.id === m.id)) }));
    let servidorIdx = 0;
    numerosHabs.forEach(numHab => {
      const hab = nuevasHabs.find(h => h.numero === numHab);
      if (hab) {
        while (servidorIdx < servidoresDelEquipo.length && hab.miembros.length < hab.capacidadMaxima) {
          hab.miembros.push(servidoresDelEquipo[servidorIdx]);
          servidorIdx++;
        }
      }
    });
    if (servidorIdx < servidoresDelEquipo.length) toast.warning(`Capacidad excedida. ${servidoresDelEquipo.length - servidorIdx} servidores no pudieron ser asignados.`);
    else toast.success(`Equipo "${equipoNombre}" asignado a ${numerosHabs.length} habitación(es).`);
    setHabServidores(nuevasHabs);
  };

  const handleDistribuirServidores = () => {
    if (servidoresActivos.length === 0) { toast.error("No hay servidores registrados en esta comunidad."); return; }
    if (habServidores.length === 0) { toast.error("Primero genera o configura las habitaciones."); return; }
    if (habServidores.some(h => h.miembros?.length > 0)) {
      if (!window.confirm("⚠️ ¿Estás seguro de generar una nueva distribución aleatoria?")) return;
    }
    setDistribuyendoServidores(true);
    const habs = distribuirHabitacionesServidoresEnLista(servidoresActivos, habServidores);
    setHabServidores(habs);
    setDistribuyendoServidores(false);

    descargarBackup('servidores', { habServidores: habs, timestamp: Date.now() });
    toast.success(`Distribución aleatoria generada: ${habs.length} habitaciones.`);
  };

  const conflictos = useMemo(() => {
    const listaConflictos = [];
    const todasHabs = [...habLideres, ...habRegulares];
    gruposMesa.forEach(mesa => {
      todasHabs.forEach(hab => {
        const enMesaYHab = mesa.miembros.filter(mMesa => hab.miembros.some(mHab => mHab.id === mMesa.id));
        if (enMesaYHab.length >= 2) {
          listaConflictos.push({ mesaNumero: mesa.numero, habNumero: hab.numero, caminantes: enMesaYHab, ids: enMesaYHab.map(c => c.id) });
        }
      });
    });
    return listaConflictos;
  }, [gruposMesa, habLideres, habRegulares]);

  const todosIdsEnConflicto = useMemo(() => {
    const ids = new Set();
    conflictos.forEach(c => c.ids.forEach(id => ids.add(id)));
    return Array.from(ids);
  }, [conflictos]);

  const resolverConflictosInteligentemente = () => {
    let nuevosGruposMesa = JSON.parse(JSON.stringify(gruposMesa));
    let nuevasHabLideres = JSON.parse(JSON.stringify(habLideres));
    let nuevasHabRegulares = JSON.parse(JSON.stringify(habRegulares));

    let intentos = 0;
    const maxIntentos = 500;

    const esLider = (c) => c.rol_en_mesa?.toLowerCase().includes("líder") || c.rol_en_mesa?.toLowerCase().includes("lider");

    while (intentos < maxIntentos) {
      intentos++;
      let conflictoActual = null;

      for (const hab of [...nuevasHabLideres, ...nuevasHabRegulares]) {
        for (const mesa of nuevosGruposMesa) {
          const enAmbos = hab.miembros.filter(mHab =>
            mesa.miembros.some(mMesa => mMesa.id === mHab.id)
          );
          if (enAmbos.length >= 2) {
            conflictoActual = { hab, mesa, caminantes: enAmbos };
            break;
          }
        }
        if (conflictoActual) break;
      }

      if (!conflictoActual) {
        setGruposMesa(nuevosGruposMesa);
        setHabLideres(nuevasHabLideres);
        setHabRegulares(nuevasHabRegulares);
        toast.success("✨ ¡Distribución Inteligente aplicada! Todos los conflictos resueltos.");
        return;
      }

      const caminanteAMover = conflictoActual.caminantes.find(c => !esLider(c)) || conflictoActual.caminantes[0];
      const esLiderAMover = esLider(caminanteAMover);
      const habsDisponibles = esLiderAMover ? nuevasHabLideres : nuevasHabRegulares;

      const habOrigen = habsDisponibles.find(h => h.miembros.some(m => m.id === caminanteAMover.id)) ||
        [...nuevasHabLideres, ...nuevasHabRegulares].find(h => h.miembros.some(m => m.id === caminanteAMover.id));

      if (habOrigen) {
        habOrigen.miembros = habOrigen.miembros.filter(m => m.id !== caminanteAMover.id);
      }

      const mesaDelCaminante = nuevosGruposMesa.find(m => m.miembros.some(m => m.id === caminanteAMover.id));
      const idsDeSuMesa = new Set(mesaDelCaminante ? mesaDelCaminante.miembros.map(m => m.id) : []);

      let mejorCandidato = null;
      let menorCoincidencia = 999;

      for (const h of habsDisponibles) {
        if (h.miembros.length < h.capacidadMaxima) {
          const coincidencias = h.miembros.filter(m => idsDeSuMesa.has(m.id)).length;
          if (coincidencias === 0) {
            mejorCandidato = h;
            break;
          } else if (coincidencias < menorCoincidencia) {
            menorCoincidencia = coincidencias;
            mejorCandidato = h;
          }
        }
      }

      if (mejorCandidato) {
        mejorCandidato.miembros.push(caminanteAMover);
      } else {
        toast.error("No hay suficiente capacidad en las habitaciones para resolver los conflictos automáticamente.");
        setGruposMesa(nuevosGruposMesa);
        setHabLideres(nuevasHabLideres);
        setHabRegulares(nuevasHabRegulares);
        return;
      }
    }

    toast.warning("Se alcanzó el límite de intentos. Algunos conflictos podrían persistir por falta de capacidad.");
    setGruposMesa(nuevosGruposMesa);
    setHabLideres(nuevasHabLideres);
    setHabRegulares(nuevasHabRegulares);
  };

  const reubicarUnoDeConflicto = (caminanteId, caminante) => {
    const esLiderCaminante = caminante.rol_en_mesa?.toLowerCase().includes("líder") || caminante.rol_en_mesa?.toLowerCase().includes("lider");
    const mesaDelCaminante = gruposMesa.find(m => m.miembros.some(m => m.id === caminanteId));
    const idsDeSuMesa = new Set(mesaDelCaminante ? mesaDelCaminante.miembros.map(m => m.id) : []);
    const habs = esLiderCaminante ? habLideres : habRegulares;

    let mejorCandidato = null;
    let menorCoincidencia = 999;

    for (const h of habs) {
      if (h.miembros.length < h.capacidadMaxima) {
        const coincidencias = h.miembros.filter(m => idsDeSuMesa.has(m.id)).length;
        if (coincidencias === 0) {
          mejorCandidato = h;
          break;
        } else if (coincidencias < menorCoincidencia) {
          menorCoincidencia = coincidencias;
          mejorCandidato = h;
        }
      }
    }

    if (mejorCandidato) {
      setHabLideres(prev => prev.map(h => {
        if (h.miembros.some(m => m.id === caminanteId)) {
          return { ...h, miembros: h.miembros.filter(m => m.id !== caminanteId) };
        }
        if (h.id === mejorCandidato.id && esLiderCaminante) {
          return { ...h, miembros: [...h.miembros, caminante] };
        }
        return h;
      }));

      setHabRegulares(prev => prev.map(h => {
        if (h.miembros.some(m => m.id === caminanteId)) {
          return { ...h, miembros: h.miembros.filter(m => m.id !== caminanteId) };
        }
        if (h.id === mejorCandidato.id && !esLiderCaminante) {
          return { ...h, miembros: [...h.miembros, caminante] };
        }
        return h;
      }));

      toast.success(`✅ ${caminante.nombre} reubicado a la Habitación ${mejorCandidato.numero}`);
    } else {
      toast.error("No hay habitaciones con capacidad disponible.");
    }
  };

  const validarDistribucionCaminantes = () => {
    const errores = [], advertencias = [], detalles = [];
    const idsEnMesas = new Map();
    gruposMesa.forEach(mesa => {
      mesa.miembros.forEach(m => {
        if (idsEnMesas.has(m.id)) errores.push(`Duplicado en mesas: ${m.nombre}`);
        idsEnMesas.set(m.id, mesa.numero);
      });
    });
    const idsEnHabs = new Map();
    [...habLideres, ...habRegulares].forEach(hab => {
      hab.miembros.forEach(m => {
        if (idsEnHabs.has(m.id)) errores.push(`Duplicado en habitaciones: ${m.nombre}`);
        idsEnHabs.set(m.id, hab.numero);
      });
      if (hab.capacidadMaxima && hab.miembros.length > hab.capacidadMaxima) {
        advertencias.push(`Hab. ${hab.numero}: ${hab.miembros.length}/${hab.capacidadMaxima} (sobre capacidad)`);
      }
    });
    if (conflictos.length > 0) {
      errores.push(`Conflicto: ${conflictos.length} grupo(s) coinciden en mesa y habitación.`);
      conflictos.forEach(c => detalles.push(`Mesa ${c.mesaNumero} y Hab. ${c.habNumero}: ${c.caminantes.map(x => x.nombre).join(', ')}`));
    }
    if (advertencias.length > 0) detalles.push(...advertencias);
    if (errores.length > 0) detalles.push(...errores);
    return { valido: errores.length === 0, errores, advertencias, detalles };
  };

  const solicitarGuardadoCaminantes = () => {
    const validacion = validarDistribucionCaminantes();
    if (!validacion.valido) {
      toast.error("Hay errores críticos que deben resolverse antes de guardar.");
      setModalConfirmar({ tipo: "error", titulo: "Errores detectados", mensaje: "No se puede guardar:", detalles: validacion.detalles });
      return;
    }
    setModalConfirmar({ tipo: "caminantes", titulo: "Confirmar guardado", mensaje: `Se actualizarán los registros y se descargará un archivo de backup.`, detalles: validacion.detalles.length > 0 ? validacion.detalles : undefined });
  };

  const validarDistribucionServidores = () => {
    const errores = [], advertencias = [], detalles = [];
    const idsEnHabs = new Map();
    habServidores.forEach(hab => {
      hab.miembros.forEach(m => {
        if (idsEnHabs.has(m.id)) errores.push(`Duplicado: ${m.nombre}`);
        idsEnHabs.set(m.id, hab.numero);
      });
      if (hab.capacidadMaxima && hab.miembros.length > hab.capacidadMaxima) advertencias.push(`Hab. ${hab.numero}: sobre capacidad`);
    });
    if (advertencias.length > 0) detalles.push(...advertencias);
    if (errores.length > 0) detalles.push(...errores);
    return { valido: errores.length === 0, errores, advertencias, detalles };
  };

  const solicitarGuardadoServidores = () => {
    const validacion = validarDistribucionServidores();
    if (!validacion.valido) {
      toast.error("Hay errores críticos.");
      setModalConfirmar({ tipo: "error", titulo: "Errores detectados", mensaje: "No se puede guardar:", detalles: validacion.detalles });
      return;
    }
    setModalConfirmar({ tipo: "servidores", titulo: "Confirmar guardado", mensaje: `Se actualizarán los registros y se descargará un archivo de backup.`, detalles: validacion.detalles.length > 0 ? validacion.detalles : undefined });
  };

  const confirmarGuardado = async () => {
    const tipo = modalConfirmar?.tipo;
    setModalConfirmar(null);
    if (tipo === "caminantes") await ejecutarGuardadoCaminantes();
    else if (tipo === "servidores") await ejecutarGuardadoServidores();
  };

  const ejecutarGuardadoCaminantes = async () => {
    setProgresoGuardado({ progreso: 0, mensaje: "Preparando actualizaciones...", errores: [] });
    const updates = [];
    gruposMesa.forEach(mesa => { mesa.miembros.forEach(c => updates.push({ id: c.id, data: { numero_mesa: mesa.numero, mesa: mesa.numero, mesa_nombre: mesa.nombre_personalizado || `Mesa ${mesa.numero}` }, nombre: c.nombre })); });
    [...habLideres, ...habRegulares].forEach(hab => {
      hab.miembros.forEach(c => {
        const existente = updates.find(u => u.id === c.id);
        if (existente) {
          existente.data.numero_habitacion = hab.numero;
          existente.data.habitacion = hab.numero;
          existente.data.piso = hab.nivelPiso;
        } else {
          updates.push({ id: c.id, data: { numero_habitacion: hab.numero, habitacion: hab.numero, piso: hab.nivelPiso }, nombre: c.nombre });
        }
      });
    });

    const total = updates.length;
    const errores = [];
    const MAX_REINTENTOS = 3;
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      const progreso = Math.round(((i + 1) / total) * 100);
      setProgresoGuardado({ progreso, mensaje: `Actualizando ${i + 1} de ${total}: ${u.nombre || u.id}`, errores: [...errores] });
      let exito = false, intento = 0;
      while (!exito && intento < MAX_REINTENTOS) {
        try { await base44.entities.Caminante.update(u.id, u.data); exito = true; } catch (err) {
          intento++;
          if (intento >= MAX_REINTENTOS) errores.push(`${u.nombre || u.id}: ${err.message || "Error"}`);
          else await new Promise(r => setTimeout(r, 500 * Math.pow(2, intento - 1)));
        }
      }
      if (i < updates.length - 1) await new Promise(r => setTimeout(r, 100));
    }
    setProgresoGuardado(null);
    if (errores.length === 0) {
      toast.success(`Distribución guardada en base de datos (${total} registros)`);
      registrarAccionAuditoria({
        usuario: user,
        accion: "MODIFICACION",
        modulo: "Distribución",
        detalle: `Guardada la distribución de mesas y habitaciones para ${total} caminantes`,
        entidad: "Caminante"
      });
      const datosBackup = { gruposMesa, habLideres, habRegulares, timestamp: Date.now() };
      descargarBackup('caminantes_guardado', datosBackup);
      window.dispatchEvent(new CustomEvent('distribucion-actualizada'));
    } else {
      toast.error(`Guardado parcial: ${total - errores.length}/${total} exitosos`);
    }
  };

  const ejecutarGuardadoServidores = async () => {
    setProgresoGuardado({ progreso: 0, mensaje: "Preparando actualizaciones...", errores: [] });
    const updates = habServidores.flatMap(hab => hab.miembros.map(s => ({ id: s.id, data: { numero_habitacion: hab.numero, habitacion: hab.numero, piso: hab.nivelPiso }, nombre: s.nombre })));
    const total = updates.length;
    const errores = [];
    const MAX_REINTENTOS = 3;
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      const progreso = Math.round(((i + 1) / total) * 100);
      setProgresoGuardado({ progreso, mensaje: `Actualizando ${i + 1} de ${total}: ${u.nombre || u.id}`, errores: [...errores] });
      let exito = false, intento = 0;
      while (!exito && intento < MAX_REINTENTOS) {
        try { await updateServ(u.id, u.data); exito = true; } catch (err) {
          intento++;
          if (intento >= MAX_REINTENTOS) errores.push(`${u.nombre || u.id}: ${err.message || "Error"}`);
          else await new Promise(r => setTimeout(r, 500 * Math.pow(2, intento - 1)));
        }
      }
      if (i < updates.length - 1) await new Promise(r => setTimeout(r, 100));
    }
    setProgresoGuardado(null);
    if (errores.length === 0) {
      toast.success(`Distribución guardada en base de datos (${total} registros)`);
      descargarBackup('servidores_guardado', { habServidores, timestamp: Date.now() });
      window.dispatchEvent(new CustomEvent('distribucion-actualizada'));
    } else {
      toast.error(`Guardado parcial: ${total - errores.length}/${total} exitosos`);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-600 font-semibold text-sm">Cargando módulos de distribución...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto pt-4 px-6">
        <SelectorComunidad />
      </div>

      <div className="bg-white border-b border-slate-200 mt-2">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackArrow />
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Distribución de Retiro</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {online ? <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold"><Wifi className="w-3 h-3" /> Online</span> : <span className="flex items-center gap-1 text-xs text-slate-500"><WifiOff className="w-3 h-3" /> Offline</span>}
                  {esRetiroMujeres && (
                    <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">
                      <Palette className="w-3 h-3" /> Retiro Mujeres (Mesas de Colores)
                    </span>
                  )}
                  <span className="text-xs text-amber-700 font-medium">Comunidad: {comunidadActual?.nombre || "General"}</span>
                </div>
              </div>
            </div>
            <button onClick={() => { toast.info("Sincronizando con la base de datos..."); window.location.reload(); }} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Sincronizar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-slate-200 w-fit">
          <button onClick={() => setMainTab("caminantes")} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === "caminantes" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <Users className="w-4 h-4" /> Caminantes ({caminantesActivos.length})
          </button>
          <button onClick={() => setMainTab("servidores")} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${mainTab === "servidores" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <Heart className="w-4 h-4" /> Servidores ({servidoresActivos.length})
          </button>
        </div>

        {mainTab === "caminantes" && (
          <div>
            {mostrarConfig && <PanelConfiguracionCaminantes cfg={cfgCaminantes} onChange={handleCfgCaminantesChange} onGenerarHabitaciones={generarHabitacionesCaminantes} />}

            {conflictos.length > 0 && (
              <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-6 shadow-md animate-pulse">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <AlertTriangle className="w-7 h-7 text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1 w-full">
                    <h3 className="text-base font-extrabold text-red-900">⚠️ ALERTA ROJA: CONFLICTO DE MESA EN HABITACIONES DETECTADO</h3>
                    <p className="text-xs text-red-700 mt-1 mb-3 font-semibold">Se detectaron {conflictos.length} grupo(s) coincidiendo en mesa y habitación. Puedes resolverlo de manera manual o automática.</p>
                    <button onClick={resolverConflictosInteligentemente} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md mb-4">
                      <Sparkles className="w-4 h-4" /> Resolver Automáticamente
                    </button>
                    <div className="space-y-2">
                      {conflictos.map((conf, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div>
                            <p className="text-xs font-bold text-slate-900">Mesa #{conf.mesaNumero} y Habitación #{conf.habNumero}</p>
                            <p className="text-xs text-red-600 font-bold mt-0.5">Coinciden: {conf.caminantes.map(c => c.nombre).join(', ')}</p>
                          </div>
                          <button onClick={() => reubicarUnoDeConflicto(conf.caminantes[0].id, conf.caminantes[0])} className="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
                            <Shuffle className="w-3.5 h-3.5 text-red-600" /> Reubicar a {conf.caminantes[0].nombre.split(' ')[0]}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Stat label="Caminantes" value={caminantesActivos.length} icon={<Users className="w-4 h-4" />} />
                <Stat label="Líderes" value={lideres.length} icon={<Users className="w-4 h-4" />} />
                <Stat label="Regulares" value={regulares.length} icon={<Users className="w-4 h-4" />} />
                <Stat label="Mesas" value={getNumerosDeMesa().length} icon={<LayoutGrid className="w-4 h-4" />} />
                <Stat label="Habitaciones" value={habLideres.length + habRegulares.length} icon={<BedDouble className="w-4 h-4" />} />
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <strong>📊 Diagnóstico de carga:</strong> <strong>{caminantesActivos.length}</strong> caminantes en <strong>{comunidadActual?.nombre || "esta comunidad"}</strong>.
              </div>

              <div className="flex gap-2 flex-wrap pt-4 border-t border-slate-200">
                <button onClick={() => setMostrarConfig(!mostrarConfig)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Settings2 className="w-4 h-4" /> Configurar
                </button>
                <button onClick={() => setMostrarGestionMesas(!mostrarGestionMesas)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mostrarGestionMesas ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}>
                  <LayoutGrid className="w-4 h-4" />{mostrarGestionMesas ? "Ocultar Mesas" : "Gestionar Mesas"}
                </button>
                <button onClick={() => setMostrarHabitaciones(!mostrarHabitaciones)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mostrarHabitaciones ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}>
                  <BedDouble className="w-4 h-4" />{mostrarHabitaciones ? "Ocultar Hab." : "Gestionar Hab."}
                </button>
                <button onClick={handleDistribuirCaminantes} disabled={distribuyendo} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                  <Shuffle className="w-4 h-4" />{distribuyendo ? "Distribuyendo..." : "Generar Distribución"}
                </button>
                {(gruposMesa.length > 0 || habLideres.length > 0 || habRegulares.length > 0) && (
                  <>
                    <button onClick={() => setEditando(v => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editando ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}>
                      <Pencil className="w-4 h-4" />{editando ? "Terminar Edición" : "Editar Manual"}
                    </button>
                    <button onClick={solicitarGuardadoCaminantes} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Save className="w-4 h-4" /> Guardar
                    </button>
                    <button onClick={() => descargarBackup('caminantes_manual', { gruposMesa, habLideres, habRegulares, timestamp: Date.now() })} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Download className="w-4 h-4" /> Backup
                    </button>
                    <button onClick={() => restaurarDesdeArchivo('caminantes', setGruposMesa, setHabLideres, setHabRegulares, setHabServidores)} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Upload className="w-4 h-4" /> Restaurar
                    </button>
                  </>
                )}
              </div>
            </div>

            {mostrarGestionMesas && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-slate-600" /> Gestión de Mesas ({gruposMesa.length})</h3>
                  <button onClick={agregarMesa} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Agregar Mesa
                  </button>
                </div>
                {esRetiroMujeres && (
                  <p className="text-xs text-pink-700 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2 font-medium">
                    <Palette className="w-3.5 h-3.5 shrink-0" /> Modo Retiro Mujeres activo: puedes cambiar el color y nombre de cada mesa.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {gruposMesa.map(mesa => (<MesaEditable key={mesa.numero} mesa={mesa} onActualizar={actualizarMesa} onEliminar={() => eliminarMesa(mesa.numero)} puedeEliminar={true} esRetiroMujeres={esRetiroMujeres} />))}
                </div>
              </div>
            )}

            {mostrarHabitaciones && (
              <div className="space-y-6 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><BedDouble className="w-4 h-4 text-purple-600" /> Habitaciones de Líderes ({habLideres.length})</h3>
                    <button onClick={agregarHabLider} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                  </div>
                  {habLideres.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">No hay habitaciones de líderes.</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {habLideres.map(hab => {
                        const tieneConflicto = hab.miembros.some(m => todosIdsEnConflicto.includes(m.id));
                        return <HabitacionEditable key={hab.id} hab={hab} color="purple" onActualizar={actualizarHabLider} onEliminar={() => eliminarHabLider(hab.id)} puedeEliminar={true} tieneConflicto={tieneConflicto} />;
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Home className="w-4 h-4 text-blue-600" /> Habitaciones de Caminantes ({habRegulares.length})</h3>
                    <button onClick={agregarHabRegular} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                  </div>
                  {habRegulares.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">No hay habitaciones de caminantes.</p> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {habRegulares.map(hab => {
                        const tieneConflicto = hab.miembros.some(m => todosIdsEnConflicto.includes(m.id));
                        return <HabitacionEditable key={hab.id} hab={hab} color="blue" onActualizar={actualizarHabRegular} onEliminar={() => eliminarHabRegular(hab.id)} puedeEliminar={true} tieneConflicto={tieneConflicto} />;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(gruposMesa.length > 0 || habLideres.some(h => h.miembros?.length > 0) || habRegulares.some(h => h.miembros?.length > 0)) && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <TabBtn active={subTabCaminantes === "mesas"} onClick={() => setSubTabCaminantes("mesas")} icon={<Users className="w-4 h-4" />} label="Mesas" count={gruposMesa.length} />
                  <TabBtn active={subTabCaminantes === "habitaciones"} onClick={() => setSubTabCaminantes("habitaciones")} icon={<BedDouble className="w-4 h-4" />} label="Habitaciones" count={habLideres.length + habRegulares.length} />
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => imprimirDistribucionCaminantes(subTabCaminantes, gruposMesa, habLideres, habRegulares, configRetiro, esRetiroMujeres)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                    <button onClick={() => imprimirDistintivosPuertas("caminantes", { habLideres, habRegulares }, configRetiro)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                      <DoorOpen className="w-4 h-4" /> Distintivos
                    </button>
                  </div>
                </div>

                {subTabCaminantes === "mesas" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gruposMesa.map(mesa => (
                      <GrupoCard
                        key={mesa.numero}
                        titulo={esRetiroMujeres && mesa.nombre_personalizado ? mesa.nombre_personalizado : `Mesa ${mesa.numero}`}
                        miembros={mesa.miembros}
                        color="amber"
                        editando={editando}
                        destinos={mesasDestinos}
                        numeroGrupo={mesa.numero}
                        onMove={(m, d) => moverEnMesa(m, d)}
                        capacidadMaxima={mesa.capacidadMaxima || cfgCaminantes.capacidadMesa}
                        idsEnConflicto={todosIdsEnConflicto}
                        esRetiroMujeres={esRetiroMujeres}
                        colorMesa={mesa.color_mesa}
                      />
                    ))}
                  </div>
                )}

                {subTabCaminantes === "habitaciones" && (
                  <div className="space-y-6">
                    {habLideres.length > 0 && (
                      <div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2 text-sm text-purple-700 font-semibold"><BedDouble className="w-4 h-4 shrink-0" />Habitaciones de Líderes</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {habLideres.map(hab => (
                            <GrupoCard 
                              key={hab.numero} 
                              titulo={`Habitación ${hab.numero}`} 
                              miembros={hab.miembros} 
                              color="purple" 
                              esLideres={true} 
                              nivelPiso={hab.nivelPiso} 
                              editando={editando} 
                              destinos={habLideresDestinos} 
                              numeroGrupo={hab.numero} 
                              onMove={(m, d) => moverEnHab(m, d, true)} 
                              capacidadMaxima={hab.capacidadMaxima} 
                              idsEnConflicto={todosIdsEnConflicto} 
                              onReubicarUno={(c) => reubicarUnoDeConflicto(c.id, c)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex items-center gap-2 text-sm text-blue-700 font-semibold"><Home className="w-4 h-4 shrink-0" />Habitaciones de Caminantes Regulares</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {habRegulares.map(hab => (
                          <GrupoCard 
                            key={hab.numero} 
                            titulo={`Habitación ${hab.numero}`} 
                            miembros={hab.miembros} 
                            color="blue" 
                            nivelPiso={hab.nivelPiso} 
                            editando={editando} 
                            destinos={habRegularesDestinos} 
                            numeroGrupo={hab.numero} 
                            onMove={(m, d) => moverEnHab(m, d, false)} 
                            capacidadMaxima={hab.capacidadMaxima} 
                            idsEnConflicto={todosIdsEnConflicto} 
                            onReubicarUno={(c) => reubicarUnoDeConflicto(c.id, c)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {gruposMesa.length === 0 && habLideres.every(h => !h.miembros?.length) && habRegulares.every(h => !h.miembros?.length) && (
              <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
                <Shuffle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium text-slate-600">Presiona "Generar Distribución" para comenzar</p>
              </div>
            )}
          </div>
        )}

        {mainTab === "servidores" && (
          <div>
            {mostrarConfigServidores && <PanelConfiguracionServidores cfg={cfgServidores} onChange={handleCfgServidoresChange} onGenerarHabitaciones={generarHabitacionesServidores} />}
            {mostrarAsignacionEquipos && <PanelAsignacionEquipos servidores={servidoresActivos} habitaciones={habServidores} onAsignar={asignarEquipoAHabitaciones} />}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <Stat label="Total Servidores" value={servidoresActivos.length} icon={<Heart className="w-4 h-4" />} />
                <Stat label="Habitaciones" value={habServidores.length} icon={<BedDouble className="w-4 h-4" />} />
                <Stat label="Capacidad total" value={habServidores.reduce((s, h) => s + (h.capacidadMaxima || 0), 0)} icon={<Users className="w-4 h-4" />} />
              </div>
              <div className="flex gap-2 flex-wrap pt-4 border-t border-slate-200">
                <button onClick={() => setMostrarConfigServidores(!mostrarConfigServidores)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Settings2 className="w-4 h-4" /> Configurar</button>
                <button onClick={() => setMostrarAsignacionEquipos(!mostrarAsignacionEquipos)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mostrarAsignacionEquipos ? "bg-emerald-700 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}><Users className="w-4 h-4" />{mostrarAsignacionEquipos ? "Ocultar Equipos" : "Asignar por Equipo"}</button>
                <button onClick={() => setMostrarHabitacionesServidores(!mostrarHabitacionesServidores)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mostrarHabitacionesServidores ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}><BedDouble className="w-4 h-4" />{mostrarHabitacionesServidores ? "Ocultar Hab." : "Gestionar Hab."}</button>
                <button onClick={handleDistribuirServidores} disabled={distribuyendoServidores} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"><Shuffle className="w-4 h-4" />{distribuyendoServidores ? "Distribuyendo..." : "Distribución Aleatoria"}</button>
                {habServidores.length > 0 && (
                  <>
                    <button onClick={() => setEditandoServidores(v => !v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editandoServidores ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}><Pencil className="w-4 h-4" />{editandoServidores ? "Terminar Edición" : "Editar Manual"}</button>
                    <button onClick={solicitarGuardadoServidores} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Save className="w-4 h-4" /> Guardar</button>
                    <button onClick={() => descargarBackup('servidores_manual', { habServidores, timestamp: Date.now() })} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Download className="w-4 h-4" /> Backup
                    </button>
                    <button onClick={() => restaurarDesdeArchivo('servidores', setGruposMesa, setHabLideres, setHabRegulares, setHabServidores)} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                      <Upload className="w-4 h-4" /> Restaurar
                    </button>
                  </>
                )}
              </div>
            </div>

            {mostrarHabitacionesServidores && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><BedDouble className="w-4 h-4 text-emerald-600" /> Habitaciones de Servidores ({habServidores.length})</h3>
                  <button onClick={agregarHabServidor} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                </div>
                {habServidores.length === 0 ? <p className="text-xs text-slate-500 text-center py-6">No hay habitaciones.</p> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {habServidores.map(hab => (<HabitacionEditable key={hab.id} hab={hab} color="green" onActualizar={actualizarHabServidor} onEliminar={() => eliminarHabServidor(hab.id)} puedeEliminar={true} />))}
                  </div>
                )}
              </div>
            )}

            {habServidores.some(h => h.miembros?.length > 0) && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-end mb-2">
                  <button onClick={() => imprimirDistribucionServidores(habServidores, configRetiro)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"><Printer className="w-4 h-4" /> Imprimir</button>
                  <button onClick={() => imprimirDistintivosPuertas("servidores", { habServidores }, configRetiro)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"><DoorOpen className="w-4 h-4" /> Distintivos</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {habServidores.map(hab => (<GrupoCardServidor key={hab.numero} titulo={`Habitación ${hab.numero}`} miembros={hab.miembros} nivelPiso={hab.nivelPiso} editando={editandoServidores} destinos={habServidoresDestinos} numeroGrupo={hab.numero} onMove={moverEnHabServidor} capacidadMaxima={hab.capacidadMaxima} />))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {modalConfirmar && (
        <ModalConfirmacion abierto={true} onCerrar={() => setModalConfirmar(null)} onConfirmar={modalConfirmar.tipo === "error" ? () => setModalConfirmar(null) : confirmarGuardado} titulo={modalConfirmar.titulo} mensaje={modalConfirmar.mensaje} detalles={modalConfirmar.detalles} color={modalConfirmar.tipo === "error" ? "red" : "amber"} />
      )}
      {progresoGuardado && <BarraProgreso progreso={progresoGuardado.progreso} mensaje={progresoGuardado.mensaje} errores={progresoGuardado.errores} />}
    </div>
  );
}