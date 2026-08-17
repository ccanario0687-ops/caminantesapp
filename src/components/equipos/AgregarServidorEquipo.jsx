import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { UserPlus, Search, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";

const ROLES = [
  "Coordinador", "Sub-Rector", "Jefe de Servidores", "Servidor de Mesa",
  "Músico", "Cocina", "Logística", "Otro",
];

export default function AgregarServidorEquipo({
  equipo,
  numeroRetiro,
  servidores,
  rolesConfigurados,
  onAgregado,
}) {
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [tab, setTab] = useState("existente"); // "existente" | "nuevo"
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario nuevo servidor
  const [form, setForm] = useState({
    nombre: "",
    rol: "",
    genero: "",
    telefono: "",
    parroquia: "",
  });

  const sinEquipo = useMemo(
    () => servidores.filter(s =>
      (!s.equipo_trabajo || s.equipo_trabajo.trim() === "") &&
      (!numeroRetiro || !s.numero_retiro || String(s.numero_retiro) === String(numeroRetiro))
    ),
    [servidores, numeroRetiro]
  );

  const filtrados = sinEquipo.filter(s =>
    !busqueda || s.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const limpiar = () => {
    setForm({ nombre: "", rol: "", genero: "", telefono: "", parroquia: "" });
    setBusqueda("");
    setTab("existente");
  };

  const cerrar = () => { limpiar(); setAbierto(false); };

  const asignarExistente = async (s) => {
    setGuardando(true);
    try {
      const cambios = {
        equipo_trabajo: equipo,
        equipo_id: user?.equipo_id || null,
      };

      const entidadNombre = s._origenEntidad || "Servidor";
      let exito = false;

      if (base44.entities[entidadNombre]?.update) {
        try {
          await base44.entities[entidadNombre].update(s.id, cambios);
          exito = true;
        } catch {}
      }

      if (!exito) {
        const fallbacks = ["Servidor", "Servidores", "Caminante", "InscripcionRemota"].filter(e => e !== entidadNombre);
        for (const ent of fallbacks) {
          if (base44.entities[ent]?.update) {
            try {
              await base44.entities[ent].update(s.id, cambios);
              exito = true;
              break;
            } catch {}
          }
        }
      }

      // Persistir localmente
      try {
        const locServidores = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
        const idxS = locServidores.findIndex(x => String(x.id) === String(s.id));
        if (idxS !== -1) {
          locServidores[idxS] = { ...locServidores[idxS], ...cambios };
          localStorage.setItem("emaus_servidores", JSON.stringify(locServidores));
        }

        const locCaminantes = JSON.parse(localStorage.getItem("emaus_caminantes") || "[]");
        const idxC = locCaminantes.findIndex(x => String(x.id) === String(s.id));
        if (idxC !== -1) {
          locCaminantes[idxC] = { ...locCaminantes[idxC], ...cambios };
          localStorage.setItem("emaus_caminantes", JSON.stringify(locCaminantes));
        }
        exito = true;
      } catch {}

      toast.success(`${s.nombre} agregado a ${equipo}`);
      onAgregado?.();
      cerrar();
    } catch {
      toast.error("Error al agregar el servidor");
    }
    setGuardando(false);
  };

  const crearNuevo = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    try {
      const nuevoServ = {
        id: Date.now(),
        nombre: form.nombre.trim(),
        rol: form.rol || undefined,
        genero: form.genero || undefined,
        telefono: form.telefono || undefined,
        parroquia: form.parroquia || undefined,
        equipo_trabajo: equipo,
        numero_retiro: numeroRetiro ? Number(numeroRetiro) : undefined,
        estado: "Confirmado",
        equipo_id: user?.equipo_id || null,
        created_at: new Date().toISOString()
      };

      if (base44.entities.Servidor?.create) {
        await base44.entities.Servidor.create(nuevoServ).catch(() => {});
      }

      // Guardar localmente
      const locServidores = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
      locServidores.push(nuevoServ);
      localStorage.setItem("emaus_servidores", JSON.stringify(locServidores));

      toast.success("Servidor agregado al equipo");
      onAgregado?.();
      cerrar();
    } catch (err) {
      toast.error("Error al crear el servidor: " + (err?.message || ""));
    }
    setGuardando(false);
  };

  const rolesOpts = rolesConfigurados?.length ? rolesConfigurados : ROLES;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-xs bg-white border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" /> Agregar servidor
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl shrink-0">
              <h2 className="font-bold flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4" /> Agregar a: {equipo}
              </h2>
              <button onClick={cerrar} className="hover:opacity-75"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-5 pt-3 shrink-0">
              <div className="flex gap-2 bg-amber-50 p-1 rounded-lg">
                <button
                  onClick={() => setTab("existente")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "existente" ? "bg-amber-700 text-white" : "text-amber-700"}`}
                >
                  Existente
                </button>
                <button
                  onClick={() => setTab("nuevo")}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "nuevo" ? "bg-amber-700 text-white" : "text-amber-700"}`}
                >
                  Nuevo
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {tab === "existente" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                    <input
                      type="text" placeholder="Buscar servidor sin equipo..."
                      value={busqueda} onChange={e => setBusqueda(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  {filtrados.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">
                      No hay servidores sin equipo{numeroRetiro ? ` en el Retiro #${numeroRetiro}` : ""}.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filtrados.map(s => (
                        <button
                          key={s.id} onClick={() => asignarExistente(s)} disabled={guardando}
                          className="w-full flex items-center justify-between gap-3 border border-amber-100 hover:border-amber-300 hover:bg-amber-50 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.nombre}</p>
                            <p className="text-xs text-gray-500">{s.rol || "Sin rol"}{s.parroquia ? ` · ${s.parroquia}` : ""}</p>
                          </div>
                          <Check className="w-4 h-4 text-amber-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={crearNuevo} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1">Nombre *</label>
                    <input type="text" value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">Rol</label>
                      <MobileSelect
                        value={form.rol}
                        onChange={(v) => setForm(f => ({ ...f, rol: v }))}
                        options={[{ value: "", label: "Sin rol" }, ...rolesOpts.map(r => ({ value: r, label: r }))]}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">Género</label>
                      <MobileSelect
                        value={form.genero}
                        onChange={(v) => setForm(f => ({ ...f, genero: v }))}
                        options={[{ value: "", label: "—" }, { value: "Masculino", label: "Masculino" }, { value: "Femenino", label: "Femenino" }]}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">Teléfono</label>
                      <input type="text" value={form.telefono}
                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1">Parroquia</label>
                      <input type="text" value={form.parroquia}
                        onChange={e => setForm(f => ({ ...f, parroquia: e.target.value }))}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Se asignará al equipo <strong>{equipo}</strong>
                    {numeroRetiro ? ` · Retiro #${numeroRetiro}` : ""} con estado <strong>Confirmado</strong>.
                  </p>
                  <div className="flex justify-end gap-3 pt-1 sticky bottom-0 bg-white -mx-5 px-5 pb-1">
                    <button type="button" onClick={cerrar}
                      className="px-4 py-2 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-50">
                      Cancelar
                    </button>
                    <button type="submit" disabled={guardando}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                      {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Crear
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}