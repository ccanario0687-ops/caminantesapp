import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Verify authorization: only cron triggers with the correct secret may run this.
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    if (!cronSecret || providedSecret !== cronSecret) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${mes}-${dia}`;

    // Obtener todos los caminantes y servidores
    const [caminantes, servidores] = await Promise.all([
      base44.asServiceRole.entities.Caminante.list(),
      base44.asServiceRole.entities.Servidor.list()
    ]);

    const cumpleaneros = [];

    // Buscar caminantes que cumplen hoy
    for (const c of caminantes) {
      if (!c.fecha_nacimiento) continue;
      const partes = c.fecha_nacimiento.split('-');
      if (partes.length < 3) continue;
      const md = `${partes[1]}-${partes[2]}`;
      if (md === hoyStr) {
        cumpleaneros.push({
          nombre: c.nombre,
          tipo: 'Caminante',
          email: c.email,
          fecha_nacimiento: c.fecha_nacimiento
        });
      }
    }

    // Buscar servidores que cumplen hoy
    for (const s of servidores) {
      if (!s.fecha_nacimiento) continue;
      const partes = s.fecha_nacimiento.split('-');
      if (partes.length < 3) continue;
      const md = `${partes[1]}-${partes[2]}`;
      if (md === hoyStr) {
        cumpleaneros.push({
          nombre: s.nombre,
          tipo: 'Servidor',
          email: s.email,
          fecha_nacimiento: s.fecha_nacimiento
        });
      }
    }

    // Enviar correos de felicitación
    const enviados = [];
    for (const cp of cumpleaneros) {
      if (cp.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: cp.email,
            subject: `🎂 ¡Feliz Cumpleaños, ${cp.nombre}! - Hermandad de Emaús`,
            body: `
              <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
                <div style="text-align:center;margin-bottom:20px">
                  <h1 style="color:#8B1a1a">✝ Hermandad de Emaús</h1>
                </div>
                <div style="background:#fff8e1;border:2px solid #fcd34d;border-radius:12px;padding:20px;text-align:center">
                  <p style="font-size:40px;margin:0">🎂</p>
                  <h2 style="color:#8B1a1a;margin:10px 0">¡Feliz Cumpleaños, ${cp.nombre}!</h2>
                  <p style="color:#5c1a00;font-size:14px;line-height:1.6">
                    Que el Señor te bendiga en este día tan especial. La Hermandad de Emaús te desea un año lleno de paz, amor y bendiciones.
                  </p>
                  <p style="color:#b8860b;font-style:italic;margin-top:15px">
                    "Éste es el día que hizo el Señor; regocijémonos y alegrémonos en él." — Salmo 118, 24
                  </p>
                </div>
                <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px">
                  Hermandad de Emaús · Lucas 24, 13-35
                </p>
              </div>
            `
          });
          enviados.push({ nombre: cp.nombre, tipo: cp.tipo, email: cp.email });
        } catch (e) {
          console.log('Error enviando email a ' + cp.email, e.message);
        }
      }
    }

    return Response.json({
      ok: true,
      fecha: hoy.toISOString().split('T')[0],
      total_cumpleaneros: cumpleaneros.length,
      cumpleaneros,
      correos_enviados: enviados.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});