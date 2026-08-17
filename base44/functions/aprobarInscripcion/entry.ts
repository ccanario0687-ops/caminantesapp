import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Solo los administradores pueden aprobar inscripciones' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { inscripcionId, equipo_id } = body;
    if (!inscripcionId) return Response.json({ error: 'inscripcionId es requerido' }, { status: 400 });

    const sr = base44.asServiceRole;
    const inscripcion = await sr.entities.InscripcionRemota.get(inscripcionId);
    if (!inscripcion) return Response.json({ error: 'Inscripción no encontrada' }, { status: 404 });

    if (inscripcion.estado === 'Aprobado') {
      return Response.json({ error: 'Esta inscripción ya fue aprobada' }, { status: 400 });
    }

    // Número de retiro: usar el de la inscripción o extraer dígitos de la edición configurada
    let numeroRetiro = inscripcion.numero_retiro;
    const cfgs = await sr.entities.ConfigRetiro.list();
    const cfg = cfgs.length > 0 ? cfgs[0] : null;
    if (cfg?.edicion) {
      const m = String(cfg.edicion).match(/\d+/);
      if (m) numeroRetiro = Number(m[0]);
    }

    // El equipo destino preserva el de la inscripción; si no tiene, usa el del admin que aprueba
    const targetEquipo = inscripcion.equipo_id || equipo_id || null;

    if (inscripcion.tipo === 'Caminante') {
      const esLiderMesa = (inscripcion.rol_en_mesa === 'Líder de Mesa');

      // Los líderes de mesa no consumen ficha (pago Pagado, sin número de ficha)
      if (esLiderMesa) {
        await sr.entities.Caminante.create({
          nombre: inscripcion.nombre,
          apodo: inscripcion.apodo,
          cedula: inscripcion.cedula,
          edad: inscripcion.edad,
          fecha_nacimiento: inscripcion.fecha_nacimiento,
          genero: inscripcion.genero,
          estado_civil: inscripcion.estado_civil,
          email: inscripcion.email,
          telefono: inscripcion.telefono,
          parroquia: inscripcion.parroquia,
          direccion: inscripcion.direccion,
          padrino_madrina: inscripcion.padrino_madrina,
          telefono_padrino: inscripcion.telefono_padrino,
          contacto_emergencia: inscripcion.contacto_emergencia,
          relacion_emergencia: inscripcion.relacion_emergencia,
          telefono_emergencia: inscripcion.telefono_emergencia,
          sacramento: inscripcion.sacramento,
          rol_en_mesa: inscripcion.rol_en_mesa || 'Caminante',
          bautismo: inscripcion.bautismo,
          confirmacion: inscripcion.confirmacion,
          comunion: inscripcion.comunion,
          matrimonio: inscripcion.matrimonio,
          peso_kg: inscripcion.peso_kg,
          talla_cm: inscripcion.talla_cm,
          talla_camisa: inscripcion.talla_camisa,
          tipo_sangre: inscripcion.tipo_sangre,
          necesidades_medicas: inscripcion.necesidades_medicas,
          condicion_fisica: inscripcion.condicion_fisica,
          numero_retiro: numeroRetiro,
          estado: 'Pendiente',
          pago_ficha: 'Pagado',
          equipo_id: targetEquipo,
        });

        await sr.entities.InscripcionRemota.update(inscripcionId, {
          estado: 'Aprobado',
          equipo_id: targetEquipo,
        });
        return Response.json({ ok: true, fichaAsignada: null, liderMesa: true });
      }

      // Caminante regular: asignar ficha disponible
      const todos = await sr.entities.Caminante.list();
      const totalFichas = cfg?.total_fichas || 100;
      const usadas = new Set(todos.map(c => c.numero_ficha).filter(Boolean));

      // Buscar la ficha disponible más baja (reutiliza fichas liberadas)
      let fichaAsignada = null;
      for (let i = 1; i <= totalFichas; i++) {
        if (!usadas.has(i)) { fichaAsignada = i; break; }
      }

      // Si no hay fichas disponibles → lista de espera
      if (!fichaAsignada) {
        await sr.entities.InscripcionRemota.update(inscripcionId, {
          estado: 'Lista de Espera',
          equipo_id: targetEquipo,
        });
        return Response.json({ ok: true, listaEspera: true });
      }

      await sr.entities.Caminante.create({
        nombre: inscripcion.nombre,
        apodo: inscripcion.apodo,
        cedula: inscripcion.cedula,
        edad: inscripcion.edad,
        fecha_nacimiento: inscripcion.fecha_nacimiento,
        genero: inscripcion.genero,
        estado_civil: inscripcion.estado_civil,
        email: inscripcion.email,
        telefono: inscripcion.telefono,
        parroquia: inscripcion.parroquia,
        direccion: inscripcion.direccion,
        padrino_madrina: inscripcion.padrino_madrina,
        telefono_padrino: inscripcion.telefono_padrino,
        contacto_emergencia: inscripcion.contacto_emergencia,
        relacion_emergencia: inscripcion.relacion_emergencia,
        telefono_emergencia: inscripcion.telefono_emergencia,
        sacramento: inscripcion.sacramento,
        rol_en_mesa: inscripcion.rol_en_mesa || 'Caminante',
        bautismo: inscripcion.bautismo,
        confirmacion: inscripcion.confirmacion,
        comunion: inscripcion.comunion,
        matrimonio: inscripcion.matrimonio,
        peso_kg: inscripcion.peso_kg,
        talla_cm: inscripcion.talla_cm,
        talla_camisa: inscripcion.talla_camisa,
        tipo_sangre: inscripcion.tipo_sangre,
        necesidades_medicas: inscripcion.necesidades_medicas,
        condicion_fisica: inscripcion.condicion_fisica,
        numero_retiro: numeroRetiro,
        numero_ficha: fichaAsignada,
        estado: 'Pendiente',
        pago_ficha: 'Pendiente',
        equipo_id: targetEquipo,
      });

      await sr.entities.InscripcionRemota.update(inscripcionId, {
        estado: 'Aprobado',
        numero_ficha: fichaAsignada,
        equipo_id: targetEquipo,
      });

      return Response.json({ ok: true, fichaAsignada });
    } else {
      await sr.entities.Servidor.create({
        nombre: inscripcion.nombre,
        edad: inscripcion.edad,
        genero: inscripcion.genero,
        telefono: inscripcion.telefono,
        parroquia: inscripcion.parroquia,
        rol: inscripcion.rol_servidor || 'Otro',
        numero_retiro: numeroRetiro,
        estado: 'Pendiente',
        equipo_id: targetEquipo,
      });

      await sr.entities.InscripcionRemota.update(inscripcionId, {
        estado: 'Aprobado',
        equipo_id: targetEquipo,
      });

      return Response.json({ ok: true, fichaAsignada: null, servidor: true });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});