import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (body.getConfig === true) {
      const cfgs = await base44.asServiceRole.entities.ConfigRetiro.list();
      return Response.json(
        { config: cfgs && cfgs.length > 0 ? cfgs[0] : null },
        { headers: corsHeaders }
      );
    }

    if (body.nombre) {
      const datos = { ...body, estado: 'Pendiente', created_date: new Date().toISOString() };
      const inscripcion = await base44.asServiceRole.entities.InscripcionRemota.create(datos);
      return Response.json({ ok: true, id: inscripcion.id }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Parámetros inválidos' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});