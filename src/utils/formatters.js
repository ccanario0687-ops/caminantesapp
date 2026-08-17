/**
 * Formatea un número de teléfono dominicano al formato 809-930-8358
 * Acepta: 8099308358, 809 930 8358, (809) 930-8358, etc.
 */
export function formatTelefono(value) {
  // Solo dígitos
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Formatea una cédula dominicana al formato 001-1791209-7
 * Acepta: 00117912097, 001-1791209-7, etc.
 */
export function formatCedula(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10, 11)}`;
}

export function toTitleCase(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/(^|\s|\-|\.)([a-záéíóúñü])/g, (m, sep, char) => sep + char.toUpperCase());
}

export function formatMonto(monto) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto || 0);
}

/**
 * Convierte cualquier fecha (cadena YYYY-MM-DD, ISO o Date) a un objeto Date
 * parseándolo en mediodía local (12:00:00) para evitar el desplazamiento de zona horaria UTC-4 que restaba 1 día.
 */
export function parseFechaSegura(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date) return isNaN(fecha.getTime()) ? null : fecha;

  const str = String(fecha).trim();
  if (!str) return null;

  // Caso 1: YYYY-MM-DD (Ej: "2026-09-11")
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0); // 12:00 PM local
  }

  // Caso 2: ISO con T00:00:00 o T... UTC
  if (str.includes("T00:00:00") || (str.includes("T") && str.endsWith("Z"))) {
    const soloFecha = str.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
      const [y, m, d] = soloFecha.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
  }

  // Caso 3: Empieza por YYYY-MM-DD
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    const soloFecha = str.slice(0, 10);
    const [y, m, d] = soloFecha.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatea una fecha de manera segura sin restar 1 día por desfasaje UTC
 */
export function formatFecha(fecha, incluirAnio = false) {
  if (!fecha) return "";
  try {
    const d = parseFechaSegura(fecha);
    if (!d) return String(fecha);
    const opts = { day: "numeric", month: "long" };
    if (incluirAnio) opts.year = "numeric";
    return d.toLocaleDateString("es-DO", opts);
  } catch {
    return String(fecha);
  }
}