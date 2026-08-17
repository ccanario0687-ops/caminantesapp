/**
 * Helper para formateo y automatización de notificaciones por WhatsApp y Correo Electrónico
 */

export function limpiarTelefono(tel) {
  if (!tel) return "";
  let limpio = String(tel).replace(/\D/g, "");
  // Si inicia con 809, 829, 849 (Rep. Dom.), agregar código de país 1
  if (limpio.length === 10 && (limpio.startsWith("809") || limpio.startsWith("829") || limpio.startsWith("849"))) {
    limpio = "1" + limpio;
  }
  return limpio;
}

export function generarMensajeBienvenida({ persona, config, fichaNum, urlBoleta }) {
  const nombre = (persona?.nombre || persona?.nombre_completo || "Participante").trim();
  const esServidor = (persona?.tipo || persona?.rol || "").toLowerCase().includes("servid") || persona?.es_servidor;
  const rolTexto = esServidor ? "SERVIDOR(A)" : "CAMINANTE";
  const numFicha = fichaNum || persona?.numero_ficha || persona?.ficha || "1";
  
  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";
  const parroquia = persona?.parroquia || config?.lugar || "";
  const cedula = persona?.cedula || "";
  const telefono = persona?.telefono || "";
  const mesa = persona?.numero_mesa || persona?.mesa || "";
  const hab = persona?.numero_habitacion || persona?.habitacion || "";
  const estado = persona?.estado || "Aprobado";

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  const queryParams = new URLSearchParams({
    nombre: nombre,
    cedula: cedula,
    telefono: telefono,
    ficha: numFicha,
    parroquia: parroquia,
    rol: rolTexto,
    estado: estado,
    ...(mesa ? { mesa } : {}),
    ...(hab ? { hab } : {})
  }).toString();

  const linkPaseDigital = urlBoleta || `${appBaseUrl}/boleta?${queryParams}`;

  let msj = `¡Gloria a Dios! ✝️\n\n`;
  msj += `*¡Hola, ${nombre}!*\n`;
  msj += `Tu inscripción para el *${nombreRetiro} ${edicion}* ha sido *APROBADA EXITOSAMENTE* 🎉\n\n`;
  msj += `📋 *DETALLES DE TU REGISTRO:*\n`;
  msj += `• *Rol:* ${rolTexto}\n`;
  msj += `• *N° de Ficha / Registro:* #${numFicha}\n`;
  if (parroquia) msj += `• *Parroquia / Comunidad:* ${parroquia}\n`;
  msj += `\n📲 *TU PASE DIGITAL CON CÓDIGO QR:*\n`;
  msj += `Puedes consultar tu boleta y código QR de acceso aquí:\n${linkPaseDigital}\n\n`;
  msj += `Por favor, conserva esta información para el control de entrada el día del retiro.\n\n`;
  msj += `_¡Jesucristo ha resucitado! ¡En verdad resucitó!_ 🙏`;

  return msj;
}

export function construirLinkWhatsApp(telefono, mensaje) {
  const telLimpio = limpiarTelefono(telefono);
  if (!telLimpio) return null;
  return `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`;
}

export function construirLinkEmail({ email, asunto, cuerpo }) {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
