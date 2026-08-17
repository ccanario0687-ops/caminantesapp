import { useState } from "react";
import { Plus, X, GripVertical, Users } from "lucide-react";

const ROLES_DEFAULT_SERVIDORES = [
  "Coordinador", "Sub-Rector", "Jefe de Servidores", "Servidor de Mesa",
  "Músico", "Cocina", "Logística", "Otro"
];

const ROLES_DEFAULT_CAMINANTES = [
  "Caminante", "Líder de Mesa"
];

export default function RolesRetiro({ form, onChange }) {
  const rolesServidores = form.roles_servidores
    ? (typeof form.roles_servidores === "string" ? JSON.parse(form.roles_servidores) : form.roles_servidores)
    : ROLES_DEFAULT_SERVIDORES;

  const rolesCaminantes = form.roles_caminantes
    ? (typeof form.roles_caminantes === "string" ? JSON.parse(form.roles_caminantes) : form.roles_caminantes)
    : ROLES_DEFAULT_CAMINANTES;

  const [nuevoServidor, setNuevoServidor] = useState("");
  const [nuevoCaminante, setNuevoCaminante] = useState("");

  const updateRolesServidores = (roles) => {
    onChange("roles_servidores", JSON.stringify(roles));
  };

  const updateRolesCaminantes = (roles) => {
    onChange("roles_caminantes", JSON.stringify(roles));
  };

  const agregarServidor = () => {
    const v = nuevoServidor.trim();
    if (!v || rolesServidores.includes(v)) return;
    updateRolesServidores([...rolesServidores, v]);
    setNuevoServidor("");
  };

  const agregarCaminante = () => {
    const v = nuevoCaminante.trim();
    if (!v || rolesCaminantes.includes(v)) return;
    updateRolesCaminantes([...rolesCaminantes, v]);
    setNuevoCaminante("");
  };

  const quitarServidor = (rol) => updateRolesServidores(rolesServidores.filter(r => r !== rol));
  const quitarCaminante = (rol) => updateRolesCaminantes(rolesCaminantes.filter(r => r !== rol));

  const restaurarServidores = () => updateRolesServidores(ROLES_DEFAULT_SERVIDORES);
  const restaurarCaminantes = () => updateRolesCaminantes(ROLES_DEFAULT_CAMINANTES);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Roles de Servidores */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Roles de Servidores
          </label>
          <button type="button" onClick={restaurarServidores}
            className="text-xs text-amber-500 hover:text-amber-700 underline">
            Restaurar predeterminados
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] bg-amber-50 rounded-lg p-2 border border-amber-100">
          {rolesServidores.map(rol => (
            <span key={rol} className="flex items-center gap-1 bg-white border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
              {rol}
              <button type="button" onClick={() => quitarServidor(rol)}
                className="text-amber-400 hover:text-red-500 ml-0.5 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {rolesServidores.length === 0 && (
            <p className="text-xs text-amber-400 italic">Sin roles definidos</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoServidor}
            onChange={e => setNuevoServidor(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregarServidor())}
            placeholder="Nuevo rol de servidor..."
            className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button type="button" onClick={agregarServidor}
            className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Roles de Caminantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Roles de Caminantes
          </label>
          <button type="button" onClick={restaurarCaminantes}
            className="text-xs text-amber-500 hover:text-amber-700 underline">
            Restaurar predeterminados
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 min-h-[40px] bg-amber-50 rounded-lg p-2 border border-amber-100">
          {rolesCaminantes.map(rol => (
            <span key={rol} className="flex items-center gap-1 bg-white border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
              {rol}
              <button type="button" onClick={() => quitarCaminante(rol)}
                className="text-amber-400 hover:text-red-500 ml-0.5 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {rolesCaminantes.length === 0 && (
            <p className="text-xs text-amber-400 italic">Sin roles definidos</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoCaminante}
            onChange={e => setNuevoCaminante(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), agregarCaminante())}
            placeholder="Nuevo rol de caminante..."
            className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button type="button" onClick={agregarCaminante}
            className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}