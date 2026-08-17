import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const caminante = body?.data;

    // Only send if the caminante has an email
    if (!caminante?.email || !caminante?.nombre) {
      return Response.json({ skipped: true, reason: "No email or name provided" });
    }

    const nombreRetiro = caminante.numero_retiro ? `Retiro #${caminante.numero_retiro}` : "Retiro de Emaús";

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: caminante.email,
      from_name: "Retiro de Emaús",
      subject: `✝️ ¡Bienvenido(a) al ${nombreRetiro}, ${caminante.nombre}!`,
      body: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Georgia, serif; background: #fffbeb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #fde68a;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #78350f, #b45309); color: white; padding: 32px 24px; text-align: center;">
      <p style="font-size: 12px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 8px; opacity: 0.85;">Retiro de Emaús</p>
      <h1 style="font-size: 28px; margin: 0; font-weight: 900;">¡Bienvenido(a)!</h1>
      <p style="font-size: 14px; margin: 8px 0 0; opacity: 0.85;">${nombreRetiro}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 28px; color: #1c1917; line-height: 1.8;">
      <p style="font-size: 16px; margin: 0 0 16px;">Querido(a) <strong>${caminante.nombre}</strong>,</p>

      <p style="margin: 0 0 16px;">
        Con gran alegría te damos la bienvenida a este retiro. Tu registro ha sido recibido exitosamente y estamos muy felices de que formes parte de esta experiencia de encuentro con Dios.
      </p>

      <p style="margin: 0 0 24px;">
        Este fin de semana es un regalo especial para ti — un tiempo para pausar, escuchar y dejar que el Señor hable a tu corazón.
      </p>

      <!-- Info box -->
      <div style="background: #fffbeb; border: 2px solid #fde68a; border-radius: 10px; padding: 18px 22px; margin-bottom: 24px;">
        <p style="font-size: 12px; font-weight: bold; color: #92400e; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px;">📋 Tus datos de registro</p>
        <table style="width: 100%; font-size: 13px; color: #44403c;">
          <tr><td style="padding: 3px 0; color: #92400e; font-weight: bold; width: 130px;">Nombre</td><td>${caminante.nombre}</td></tr>
          ${caminante.parroquia ? `<tr><td style="padding: 3px 0; color: #92400e; font-weight: bold;">Parroquia</td><td>${caminante.parroquia}</td></tr>` : ""}
          ${caminante.numero_retiro ? `<tr><td style="padding: 3px 0; color: #92400e; font-weight: bold;">Retiro</td><td>#${caminante.numero_retiro}</td></tr>` : ""}
          ${caminante.padrino_madrina ? `<tr><td style="padding: 3px 0; color: #92400e; font-weight: bold;">Padrino/Madrina</td><td>${caminante.padrino_madrina}</td></tr>` : ""}
          <tr><td style="padding: 3px 0; color: #92400e; font-weight: bold;">Estado</td><td>${caminante.estado || "Pendiente"}</td></tr>
        </table>
      </div>

      <p style="margin: 0 0 8px;">
        Si tienes alguna pregunta, no dudes en comunicarte con el equipo organizador.
      </p>

      <p style="margin: 24px 0 0;">
        Con cariño en Cristo,<br />
        <strong>El Equipo de Emaús ✝️</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #fef3c7; border-top: 2px solid #fde68a; padding: 16px 24px; text-align: center; color: #92400e; font-size: 11px;">
      <p style="margin: 0;">Este correo fue enviado automáticamente al registrarte en el Retiro de Emaús.</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });

    return Response.json({ success: true, email: caminante.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});