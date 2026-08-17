import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.ConfigPortada.list();

    if (configs.length > 0) {
      return Response.json(configs[0]);
    }

    return Response.json(null);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});