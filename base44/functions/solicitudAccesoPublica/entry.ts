import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Validación mínima
    if (!body.nombre_comunidad || !body.email || !body.nombre_contacto) {
      return Response.json({ error: 'Faltan campos requeridos: nombre_comunidad, nombre_contacto, email' }, { status: 400 });
    }

    // Evitar duplicados: una sola solicitud pendiente por email
    const existentes = await base44.asServiceRole.entities.SolicitudAcceso.filter({ email: body.email.trim().toLowerCase() });
    const yaPendiente = existentes.some(s => s.estado === 'Pendiente' || s.estado === 'En Contacto');
    if (yaPendiente) {
      return Response.json({ ok: false, duplicado: true, mensaje: 'Ya tienes una solicitud en revisión con este correo. Te contactaremos pronto.' });
    }

    // Limpiar campos vacíos
    const datos = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== '' && v !== null) datos[k] = v;
    }
    datos.email = (datos.email || '').trim().toLowerCase();
    datos.estado = 'Pendiente';

    const solicitud = await base44.asServiceRole.entities.SolicitudAcceso.create(datos);
    return Response.json({ ok: true, id: solicitud.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});