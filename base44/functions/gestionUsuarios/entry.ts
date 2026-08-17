import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_CREATOR_EMAIL = 'ccanario0687@gmail.com';

function generateEquipoId() {
  return 'equipo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function ensureEquipoId(base44: any, user: any) {
  if (user.equipo_id) return user.equipo_id;
  const nuevoEquipoId = generateEquipoId();
  await base44.asServiceRole.entities.User.update(user.id, { equipo_id: nuevoEquipoId });
  return nuevoEquipoId;
}

function isAppCreator(user: any) {
  return user.email === APP_CREATOR_EMAIL;
}

function hasApprovalPermission(user: any) {
  if (!user) return false;
  if (user.role === 'admin' || user.email === APP_CREATOR_EMAIL || user.es_creador === true || user.es_admin === true) return true;
  let p = user.permisos_modulos;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch { p = {}; }
  }
  if (p && (p.solicitudes === 'edicion' || p.solicitudes === true || p.usuarios === 'edicion' || p.usuarios === true)) {
    return true;
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { 
      action, userId, data, email, username, role, 
      equipo_id: equipoIdParam, nombre_equipo,
      nombre, adminEmail
    } = body;

    // Permitir a cualquier usuario autenticado actualizar su propio código/PIN de autorización
    if (action === 'updateSelf') {
      if (!data) return Response.json({ error: 'Datos requeridos' }, { status: 400 });
      const updateObj: any = {};
      if (data.codigo_autorizacion !== undefined) updateObj.codigo_autorizacion = String(data.codigo_autorizacion).trim();

      const todos = await base44.asServiceRole.entities.User.list();
      const miUsuario = todos.find((u: any) => u.email === user.email || u.id === user.id);
      if (miUsuario) {
        await base44.asServiceRole.entities.User.update(miUsuario.id, updateObj);
      }
      return Response.json({ ok: true, success: true });
    }

    if (!hasApprovalPermission(user)) {
      return Response.json({ error: 'Acceso denegado. Se requiere rol de administrador o permiso de aprobación de usuarios.' }, { status: 403 });
    }

    if (action === 'assignTeamId') {
      const equipoId = await ensureEquipoId(base44, user);
      return Response.json({ ok: true, equipo_id: equipoId });
    }

    if (action === 'list') {
      const todos = await base44.asServiceRole.entities.User.list();

      if (isAppCreator(user)) {
        const equipos: any = {};
        todos.forEach((u: any) => {
          const eid = u.equipo_id || '__sin_equipo__';
          if (!equipos[eid]) equipos[eid] = [];
          equipos[eid].push(u);
        });
        return Response.json({ ok: true, usuarios: todos, equipos, es_creador: true });
      }

      const equipoId = await ensureEquipoId(base44, user);
      const usuarios = todos.filter((u: any) =>
        u.equipo_id === equipoId ||
        (!u.equipo_id && u.role !== 'admin')
      );
      
      if (!usuarios.find((u: any) => u.id === user.id)) {
        const adminUser = todos.find((u: any) => u.id === user.id);
        if (adminUser) usuarios.unshift(adminUser);
      }
      return Response.json({ ok: true, usuarios, equipo_id: equipoId, es_creador: false });
    }

    if (action === 'listEquipos') {
      const todos = await base44.asServiceRole.entities.User.list();
      const mapaEquipos: any = {};
      todos.forEach((u: any) => {
        if (u.equipo_id && u.equipo_id !== '__sin_equipo__') {
          if (!mapaEquipos[u.equipo_id]) {
            mapaEquipos[u.equipo_id] = {
              equipo_id: u.equipo_id,
              nombre: u.nombre_equipo || u.equipo_id,
              admin_email: u.role === 'admin' ? u.email : null,
              miembros: 0,
            };
          }
          mapaEquipos[u.equipo_id].miembros++;
          if (u.role === 'admin' && !mapaEquipos[u.equipo_id].admin_email) {
            mapaEquipos[u.equipo_id].admin_email = u.email;
          }
        }
      });
      return Response.json({ ok: true, equipos: Object.values(mapaEquipos) });
    }

    if (action === 'setupNewUser') {
      if (!email) return Response.json({ error: 'Email requerido' }, { status: 400 });

      const todos = await base44.asServiceRole.entities.User.list();
      const nuevo = todos.find((u: any) => u.email === email);

      if (nuevo) {
        const updateData: any = {};
        if (username) updateData.username = username.toUpperCase();

        if (role === 'admin') {
          updateData.equipo_id = generateEquipoId();
          if (nombre_equipo) updateData.nombre_equipo = nombre_equipo;
        } else {
          if (equipoIdParam) {
            updateData.equipo_id = equipoIdParam;
          } else {
            updateData.equipo_id = await ensureEquipoId(base44, user);
          }
        }

        await base44.asServiceRole.entities.User.update(nuevo.id, updateData);
        return Response.json({ ok: true, equipo_id: updateData.equipo_id, userId: nuevo.id });
      }

      return Response.json({ ok: true, pendiente: true });
    }

    if (action === 'claimUser') {
      if (!userId) return Response.json({ error: 'userId requerido' }, { status: 400 });

      const todos = await base44.asServiceRole.entities.User.list();
      const objetivo = todos.find((u: any) => u.id === userId);
      if (!objetivo) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

      const equipoId = await ensureEquipoId(base44, user);

      if (!isAppCreator(user)) {
        if (objetivo.equipo_id && objetivo.equipo_id !== equipoId) {
          return Response.json({ error: 'No tienes permiso para reclamar este usuario' }, { status: 403 });
        }
        await base44.asServiceRole.entities.User.update(userId, { equipo_id: equipoId });
        return Response.json({ ok: true });
      }

      await base44.asServiceRole.entities.User.update(userId, { equipo_id: equipoIdParam || equipoId });
      return Response.json({ ok: true });
    }

    if (action === 'update' && userId) {
      if (!data) return Response.json({ error: 'Data requerida' }, { status: 400 });

      const todos = await base44.asServiceRole.entities.User.list();
      const objetivo = todos.find((u: any) => u.id === userId);
      if (!objetivo) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

      if (!isAppCreator(user)) {
        const equipoId = await ensureEquipoId(base44, user);
        if (objetivo.equipo_id && objetivo.equipo_id !== equipoId) {
          return Response.json({ error: 'No tienes permiso para modificar este usuario' }, { status: 403 });
        }
      }

      const updateData: any = {};
      if (data.role !== undefined && isAppCreator(user)) updateData.role = data.role;
      if (data.permisos_modulos !== undefined) updateData.permisos_modulos = data.permisos_modulos;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.codigo_autorizacion !== undefined) updateData.codigo_autorizacion = data.codigo_autorizacion;
      if (data.equipo_id !== undefined && isAppCreator(user)) updateData.equipo_id = data.equipo_id;
      if (data.nombre_equipo !== undefined && isAppCreator(user)) updateData.nombre_equipo = data.nombre_equipo;

      await base44.asServiceRole.entities.User.update(userId, updateData);
      return Response.json({ ok: true });
    }

    if (action === 'crearComunidad') {
      if (!isAppCreator(user)) {
        return Response.json({ error: 'Solo el creador de la plataforma puede crear nuevas comunidades.' }, { status: 403 });
      }

      const nombreComunidad = (nombre || '').trim();
      const emailAdmin = (adminEmail || user.email || '').trim().toLowerCase();

      if (!nombreComunidad) {
        return Response.json({ error: 'El nombre de la comunidad es obligatorio' }, { status: 400 });
      }

      const nuevoEquipoId = generateEquipoId();

      try {
        await base44.asServiceRole.users.inviteUser(emailAdmin, 'admin');
      } catch (_e) {}

      const todos = await base44.asServiceRole.entities.User.list();
      const existente = todos.find((u: any) => (u.email || '').toLowerCase() === emailAdmin);

      if (existente) {
        await base44.asServiceRole.entities.User.update(existente.id, {
          equipo_id: nuevoEquipoId,
          nombre_equipo: nombreComunidad,
          role: 'admin',
        });
      }

      return Response.json({ 
        ok: true, 
        equipo_id: nuevoEquipoId, 
        nombre_equipo: nombreComunidad,
        message: `Comunidad "${nombreComunidad}" creada exitosamente`
      });
    }

    if (action === 'provisionarComunidad') {
      if (!isAppCreator(user)) {
        return Response.json({ error: 'Solo el administrador de la plataforma puede provisionar comunidades.' }, { status: 403 });
      }
      const solicitudId = body.solicitud_id;
      if (!solicitudId) return Response.json({ error: 'solicitud_id requerido' }, { status: 400 });

      const solicitud = await base44.asServiceRole.entities.SolicitudAcceso.get(solicitudId);
      if (!solicitud) return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 });

      const emailContacto = (solicitud.email || '').trim().toLowerCase();
      if (!emailContacto) return Response.json({ error: 'La solicitud no tiene email de contacto' }, { status: 400 });

      const equipoId = generateEquipoId();
      const nombreEquipo = (solicitud.nombre_comunidad || `Comunidad ${solicitud.pais || ''}`).trim();

      try {
        await base44.asServiceRole.users.inviteUser(emailContacto, 'admin');
      } catch (_e) {}

      const todos = await base44.asServiceRole.entities.User.list();
      const existente = todos.find((u: any) => (u.email || '').toLowerCase() === emailContacto);
      if (existente) {
        await base44.asServiceRole.entities.User.update(existente.id, {
          equipo_id: equipoId,
          nombre_equipo: nombreEquipo,
          role: 'admin',
        });
      }

      const notasPrevias = solicitud.notas_admin || '';
      const nuevaNota = `Equipo creado: ${equipoId} (${nombreEquipo})`;
      await base44.asServiceRole.entities.SolicitudAcceso.update(solicitudId, {
        estado: 'Aprobado',
        notas_admin: [notasPrevias, nuevaNota].filter(Boolean).join('\n'),
      });

      return Response.json({ ok: true, equipo_id: equipoId, nombre_equipo: nombreEquipo, invitado: !existente });
    }

    if (action === 'autoReclamarEquipo') {
      if (user.equipo_id) return Response.json({ ok: true, equipo_id: user.equipo_id, ya_tenia: true });

      const emailNorm = (user.email || '').trim().toLowerCase();
      if (!emailNorm) return Response.json({ ok: true, sin_equipo: true });

      const solicitudes = await base44.asServiceRole.entities.SolicitudAcceso.filter({ estado: 'Aprobado' });
      const match = solicitudes.find((s: any) =>
        (s.email || '').trim().toLowerCase() === emailNorm &&
        (s.notas_admin || '').includes('Equipo creado:')
      );
      if (!match) return Response.json({ ok: true, sin_equipo: true });

      const m = (match.notas_admin || '').match(/Equipo creado: ([^\s(]+)/);
      if (!m) return Response.json({ ok: true, sin_equipo: true });

      const equipoId = m[1];
      await base44.asServiceRole.entities.User.update(user.id, {
        equipo_id: equipoId,
        nombre_equipo: match.nombre_comunidad || equipoId,
      });

      return Response.json({ ok: true, equipo_id: equipoId, reclamado: true });
    }

    if (action === 'renombrarEquipo') {
      if (!isAppCreator(user)) {
        return Response.json({ error: 'Solo el administrador de la plataforma puede renombrar comunidades.' }, { status: 403 });
      }
      const equipoId = body.equipo_id;
      const nombreEquipo = (body.nombre_equipo || '').trim();
      if (!equipoId || !nombreEquipo) return Response.json({ error: 'equipo_id y nombre_equipo requeridos' }, { status: 400 });

      const todos = await base44.asServiceRole.entities.User.list();
      const miembros = todos.filter((u: any) => u.equipo_id === equipoId);
      for (const m of miembros) {
        await base44.asServiceRole.entities.User.update(m.id, { nombre_equipo: nombreEquipo });
      }
      return Response.json({ ok: true, actualizados: miembros.length });
    }

    return Response.json({ error: 'Accion no valida' }, { status: 400 });

  } catch (error: any) {
    console.error("Error en gestionUsuarios:", error);
    return Response.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
});