import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { pool } from './db.js';

/**
 * Servidor MCP de Mosaico. Expone datos financieros (Postgres) como "tools"
 * MCP estándar. Deliberadamente NO sabe nada de React, Tailwind ni del
 * catálogo de bloques de LEGO — solo datos. La decisión de qué componente
 * usar con estos datos vive en app/api/chat/route.ts (Next.js).
 */
const server = new McpServer({
  name: 'mosaico-mcp-server',
  version: '0.1.0',
});

server.tool(
  'get_metas',
  'Obtiene las metas de ahorro del usuario junto con su porcentaje de avance. Por defecto no incluye las archivadas.',
  {
    userId: z.string().describe('Id del usuario'),
    incluirArchivadas: z.boolean().default(false).describe('Si es true, incluye también las metas archivadas'),
  },
  async ({ userId, incluirArchivadas }) => {
    const { rows } = await pool.query(
      `select id, titulo, monto_actual, monto_objetivo, estatus,
              round((monto_actual::numeric / monto_objetivo) * 100) as porcentaje
       from metas
       where usuario_id = $1
         and (estatus <> 'archivada' or $2)
       order by porcentaje asc`,
      [userId, incluirArchivadas],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'crear_meta',
  'Crea una nueva meta de ahorro para el usuario.',
  {
    userId: z.string().describe('Id del usuario'),
    titulo: z.string().describe('Nombre de la meta, ej. "Fondo de emergencia"'),
    montoObjetivo: z.number().positive().describe('Monto a alcanzar'),
    montoInicial: z.number().min(0).default(0).describe('Con cuánto arranca la meta, si ya tenía algo ahorrado'),
  },
  async ({ userId, titulo, montoObjetivo, montoInicial }) => {
    const { rows } = await pool.query(
      `insert into metas (id, usuario_id, titulo, monto_actual, monto_objetivo)
       values ('meta-' || gen_random_uuid(), $1, $2, $3, $4)
       returning id, titulo, monto_actual, monto_objetivo, estatus`,
      [userId, titulo, montoInicial, montoObjetivo],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'aportar_a_meta',
  'Suma un aporte al monto actual de una meta activa. Si con el aporte se alcanza o supera el objetivo, la marca como completada.',
  {
    metaId: z.string().describe('Id de la meta'),
    monto: z.number().positive().describe('Cantidad a aportar'),
  },
  async ({ metaId, monto }) => {
    const { rows } = await pool.query(
      `update metas
       set monto_actual = monto_actual + $2,
           estatus = case when monto_actual + $2 >= monto_objetivo then 'completada' else estatus end
       where id = $1 and estatus = 'activa'
       returning id, titulo, monto_actual, monto_objetivo, estatus`,
      [metaId, monto],
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Meta no encontrada o no está activa.' }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'archivar_meta',
  'Archiva una meta (borrado lógico -- deja de aparecer en get_metas, pero no se borra su historial).',
  {
    metaId: z.string().describe('Id de la meta'),
  },
  async ({ metaId }) => {
    const { rows } = await pool.query(
      `update metas set estatus = 'archivada' where id = $1
       returning id, titulo, monto_actual, monto_objetivo, estatus`,
      [metaId],
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Meta no encontrada.' }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'get_transacciones',
  'Obtiene las transacciones del usuario, opcionalmente filtradas por categoría y/o rango de fechas.',
  {
    userId: z.string().describe('Id del usuario'),
    limite: z.number().int().positive().max(50).default(10),
    categoria: z.string().optional().describe('Filtra solo transacciones de esta categoría, ej. "comida"'),
    desde: z.string().optional().describe('Fecha mínima (ISO 8601), inclusive'),
    hasta: z.string().optional().describe('Fecha máxima (ISO 8601), inclusive'),
  },
  async ({ userId, limite, categoria, desde, hasta }) => {
    const condiciones = ['usuario_id = $1'];
    const valores: unknown[] = [userId];

    if (categoria) {
      valores.push(categoria);
      condiciones.push(`categoria = $${valores.length}`);
    }
    if (desde) {
      valores.push(desde);
      condiciones.push(`fecha >= $${valores.length}`);
    }
    if (hasta) {
      valores.push(hasta);
      condiciones.push(`fecha <= $${valores.length}`);
    }

    valores.push(limite);
    const { rows } = await pool.query(
      `select id, descripcion, monto, categoria, fecha
       from transacciones
       where ${condiciones.join(' and ')}
       order by fecha desc
       limit $${valores.length}`,
      valores,
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_saldo',
  'Calcula el saldo actual del usuario a partir de sus transacciones.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select coalesce(sum(monto), 0) as saldo
       from transacciones
       where usuario_id = $1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify({ saldo: rows[0].saldo }) }],
    };
  },
);

// --- Banca personal (extra) ---

server.tool(
  'get_cuentas',
  'Obtiene las cuentas bancarias del usuario (débito, ahorro, nómina) con su saldo.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, tipo, alias, saldo
       from cuentas
       where usuario_id = $1
       order by tipo`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'crear_transaccion',
  'Registra un movimiento (gasto o ingreso) en una cuenta del usuario. El saldo de la cuenta se actualiza solo (trigger).',
  {
    userId: z.string().describe('Id del usuario'),
    cuentaId: z.string().describe('Id de la cuenta donde se registra (debe pertenecer al usuario)'),
    descripcion: z.string().describe('Descripción del movimiento, ej. "Café Starbucks"'),
    monto: z.number().describe('Monto con signo: negativo para gasto, positivo para ingreso'),
    categoria: z.string().optional().describe('Categoría del movimiento, ej. "comida", "ingreso"'),
  },
  async ({ userId, cuentaId, descripcion, monto, categoria }) => {
    const cuenta = await pool.query(`select id from cuentas where id = $1 and usuario_id = $2`, [
      cuentaId,
      userId,
    ]);

    if (cuenta.rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Cuenta no encontrada o no pertenece al usuario.' }) }],
      };
    }

    const { rows } = await pool.query(
      `insert into transacciones (id, usuario_id, cuenta_id, descripcion, monto, categoria)
       values ('tx-' || gen_random_uuid(), $1, $2, $3, $4, $5)
       returning id, descripcion, monto, categoria, fecha`,
      [userId, cuentaId, descripcion, monto, categoria ?? null],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

// --- Inversiones ---

server.tool(
  'get_instrumentos',
  'Obtiene el catálogo de instrumentos de inversión disponibles (no solo los que ya tiene el usuario) -- para simular "si invierto en X".',
  {
    tipo: z.enum(['accion', 'fondo', 'cetes', 'etf']).optional().describe('Filtra por tipo de instrumento'),
    riesgo: z.enum(['bajo', 'medio', 'alto']).optional().describe('Filtra por nivel de riesgo'),
  },
  async ({ tipo, riesgo }) => {
    const condiciones = ['true'];
    const valores: unknown[] = [];

    if (tipo) {
      valores.push(tipo);
      condiciones.push(`tipo = $${valores.length}`);
    }
    if (riesgo) {
      valores.push(riesgo);
      condiciones.push(`riesgo = $${valores.length}`);
    }

    const { rows } = await pool.query(
      `select id, nombre, tipo, riesgo, rendimiento_anual_estimado
       from instrumentos
       where ${condiciones.join(' and ')}
       order by rendimiento_anual_estimado desc`,
      valores,
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_perfil_inversion',
  'Obtiene el perfil de inversión del usuario: tolerancia al riesgo y horizonte en años.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select tolerancia_riesgo, horizonte_anios
       from perfiles_inversion
       where usuario_id = $1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0] ?? null) }],
    };
  },
);

server.tool(
  'actualizar_perfil_inversion',
  'Crea o actualiza el perfil de inversión del usuario (tolerancia al riesgo y horizonte).',
  {
    userId: z.string().describe('Id del usuario'),
    toleranciaRiesgo: z.enum(['conservador', 'moderado', 'agresivo']),
    horizonteAnios: z.number().int().positive(),
  },
  async ({ userId, toleranciaRiesgo, horizonteAnios }) => {
    const { rows } = await pool.query(
      `insert into perfiles_inversion (usuario_id, tolerancia_riesgo, horizonte_anios)
       values ($1, $2, $3)
       on conflict (usuario_id) do update
         set tolerancia_riesgo = excluded.tolerancia_riesgo,
             horizonte_anios = excluded.horizonte_anios
       returning tolerancia_riesgo, horizonte_anios`,
      [userId, toleranciaRiesgo, horizonteAnios],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'get_portafolio',
  'Obtiene las posiciones de inversión del usuario: instrumento, cantidad, precio promedio y valor invertido. Por defecto no incluye las vendidas.',
  {
    userId: z.string().describe('Id del usuario'),
    incluirVendidas: z.boolean().default(false).describe('Si es true, incluye también posiciones ya vendidas por completo'),
  },
  async ({ userId, incluirVendidas }) => {
    const { rows } = await pool.query(
      `select p.id, i.nombre, i.tipo, i.riesgo, i.rendimiento_anual_estimado,
              p.cantidad, p.precio_promedio, p.activa,
              (p.cantidad * p.precio_promedio) as valor_invertido
       from posiciones_portafolio p
       join instrumentos i on i.id = p.instrumento_id
       where p.usuario_id = $1
         and (p.activa or $2)
       order by valor_invertido desc`,
      [userId, incluirVendidas],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'comprar_posicion',
  'Compra un instrumento: si el usuario ya tiene una posición activa en ese instrumento, promedia el precio; si no, crea una posición nueva.',
  {
    userId: z.string().describe('Id del usuario'),
    instrumentoId: z.string().describe('Id del instrumento (ver get_instrumentos)'),
    cantidad: z.number().positive().describe('Cantidad de unidades a comprar'),
    precioCompra: z.number().positive().describe('Precio por unidad al que se compra'),
  },
  async ({ userId, instrumentoId, cantidad, precioCompra }) => {
    const existente = await pool.query(
      `select id, cantidad, precio_promedio from posiciones_portafolio
       where usuario_id = $1 and instrumento_id = $2 and activa`,
      [userId, instrumentoId],
    );

    if (existente.rows.length > 0) {
      const pos = existente.rows[0];
      const cantidadVieja = Number(pos.cantidad);
      const precioViejo = Number(pos.precio_promedio);
      const cantidadNueva = cantidadVieja + cantidad;
      const precioPromedioNuevo = (cantidadVieja * precioViejo + cantidad * precioCompra) / cantidadNueva;

      const { rows } = await pool.query(
        `update posiciones_portafolio set cantidad = $2, precio_promedio = $3
         where id = $1
         returning id, cantidad, precio_promedio, activa`,
        [pos.id, cantidadNueva, precioPromedioNuevo],
      );

      return {
        content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
      };
    }

    const { rows } = await pool.query(
      `insert into posiciones_portafolio (id, usuario_id, instrumento_id, cantidad, precio_promedio)
       values ('pos-' || gen_random_uuid(), $1, $2, $3, $4)
       returning id, cantidad, precio_promedio, activa`,
      [userId, instrumentoId, cantidad, precioCompra],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'vender_posicion',
  'Vende una posición, total o parcialmente. Si no se especifica cantidad, o la cantidad cubre toda la posición, la marca como vendida (borrado lógico).',
  {
    posicionId: z.string().describe('Id de la posición'),
    cantidad: z.number().positive().optional().describe('Cantidad a vender. Si no se especifica, se vende toda la posición.'),
  },
  async ({ posicionId, cantidad }) => {
    const existente = await pool.query(
      `select cantidad from posiciones_portafolio where id = $1 and activa`,
      [posicionId],
    );

    if (existente.rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Posición no encontrada o ya está vendida.' }) }],
      };
    }

    const cantidadActual = Number(existente.rows[0].cantidad);
    const cantidadAVender = cantidad ?? cantidadActual;

    if (cantidadAVender > cantidadActual) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'No se puede vender más de lo que se tiene.' }) }],
      };
    }

    if (cantidadAVender === cantidadActual) {
      const { rows } = await pool.query(
        `update posiciones_portafolio set activa = false where id = $1
         returning id, cantidad, precio_promedio, activa`,
        [posicionId],
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
      };
    }

    const { rows } = await pool.query(
      `update posiciones_portafolio set cantidad = cantidad - $2 where id = $1
       returning id, cantidad, precio_promedio, activa`,
      [posicionId, cantidadAVender],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

// --- Crédito ---

server.tool(
  'get_tarjetas_credito',
  'Obtiene las tarjetas de crédito del usuario: límite, saldo usado y tasa anual.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, alias, limite_credito, saldo_actual, tasa_anual
       from tarjetas_credito
       where usuario_id = $1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_planes_pago',
  'Obtiene los planes de pago/reestructura disponibles para una tarjeta de crédito, a distintos plazos.',
  {
    tarjetaId: z.string().describe('Id de la tarjeta de crédito'),
  },
  async ({ tarjetaId }) => {
    const { rows } = await pool.query(
      `select id, plazo_meses, cat, pago_mensual
       from planes_pago
       where tarjeta_id = $1
       order by plazo_meses asc`,
      [tarjetaId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_solicitudes_credito',
  'Obtiene las solicitudes de crédito del usuario y su estatus (pendiente/aprobado/rechazado).',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, tipo, monto_solicitado, estatus, fecha
       from solicitudes_credito
       where usuario_id = $1
       order by fecha desc`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'crear_solicitud_credito',
  'Crea una nueva solicitud de crédito para el usuario, en estatus pendiente.',
  {
    userId: z.string().describe('Id del usuario'),
    tipo: z.enum(['personal', 'hipotecario', 'automotriz', 'tarjeta']),
    montoSolicitado: z.number().positive(),
  },
  async ({ userId, tipo, montoSolicitado }) => {
    const { rows } = await pool.query(
      `insert into solicitudes_credito (id, usuario_id, tipo, monto_solicitado)
       values ('sol-' || gen_random_uuid(), $1, $2, $3)
       returning id, tipo, monto_solicitado, estatus, fecha`,
      [userId, tipo, montoSolicitado],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'cancelar_solicitud_credito',
  'Cancela una solicitud de crédito que sigue pendiente (borrado lógico -- una ya aprobada/rechazada no se puede cancelar).',
  {
    solicitudId: z.string().describe('Id de la solicitud'),
  },
  async ({ solicitudId }) => {
    const { rows } = await pool.query(
      `update solicitudes_credito set estatus = 'cancelada'
       where id = $1 and estatus = 'pendiente'
       returning id, tipo, monto_solicitado, estatus, fecha`,
      [solicitudId],
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Solicitud no encontrada o ya no está pendiente.' }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

// --- Pagos ---

server.tool(
  'get_contactos_pago',
  'Obtiene los contactos de pago guardados del usuario. Por defecto no incluye los desactivados.',
  {
    userId: z.string().describe('Id del usuario'),
    incluirInactivos: z.boolean().default(false).describe('Si es true, incluye también los contactos desactivados'),
  },
  async ({ userId, incluirInactivos }) => {
    const { rows } = await pool.query(
      `select id, nombre, clabe, activo
       from contactos_pago
       where usuario_id = $1
         and (activo or $2)`,
      [userId, incluirInactivos],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'crear_contacto_pago',
  'Guarda un nuevo contacto de pago para el usuario.',
  {
    userId: z.string().describe('Id del usuario'),
    nombre: z.string().describe('Nombre del contacto'),
    clabe: z.string().optional().describe('CLABE interbancaria del contacto, si se conoce'),
  },
  async ({ userId, nombre, clabe }) => {
    const { rows } = await pool.query(
      `insert into contactos_pago (id, usuario_id, nombre, clabe)
       values ('contacto-' || gen_random_uuid(), $1, $2, $3)
       returning id, nombre, clabe, activo`,
      [userId, nombre, clabe ?? null],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'desactivar_contacto_pago',
  'Desactiva un contacto de pago (borrado lógico -- deja de aparecer en get_contactos_pago, pero transferencias pasadas lo siguen referenciando).',
  {
    contactoId: z.string().describe('Id del contacto'),
  },
  async ({ contactoId }) => {
    const { rows } = await pool.query(
      `update contactos_pago set activo = false where id = $1
       returning id, nombre, clabe, activo`,
      [contactoId],
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Contacto no encontrado.' }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'get_transferencias',
  'Obtiene las transferencias del usuario, enviadas y recibidas (cobros), opcionalmente filtradas por tipo y/o estatus.',
  {
    userId: z.string().describe('Id del usuario'),
    limite: z.number().int().positive().max(50).default(10),
    tipo: z.enum(['enviada', 'recibida']).optional().describe('Filtra solo transferencias enviadas o solo recibidas (cobros)'),
    estatus: z.enum(['pendiente', 'completada', 'fallida', 'cancelada']).optional().describe('Filtra por estatus de la transferencia'),
  },
  async ({ userId, limite, tipo, estatus }) => {
    const condiciones = ['t.usuario_id = $1'];
    const valores: unknown[] = [userId];

    if (tipo) {
      valores.push(tipo);
      condiciones.push(`t.tipo = $${valores.length}`);
    }
    if (estatus) {
      valores.push(estatus);
      condiciones.push(`t.estatus = $${valores.length}`);
    }

    valores.push(limite);
    const { rows } = await pool.query(
      `select t.id, t.tipo, t.monto, t.concepto, t.estatus, t.fecha, c.nombre as contacto
       from transferencias t
       left join contactos_pago c on c.id = t.contacto_id
       where ${condiciones.join(' and ')}
       order by t.fecha desc
       limit $${valores.length}`,
      valores,
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'crear_transferencia',
  'Registra una transferencia del usuario hacia uno de sus contactos de pago guardados.',
  {
    userId: z.string().describe('Id del usuario'),
    contactoId: z.string().describe('Id del contacto de pago (debe pertenecer al usuario)'),
    monto: z.number().positive().describe('Monto a transferir'),
    concepto: z.string().optional().describe('Concepto/motivo de la transferencia'),
    tipo: z.enum(['enviada', 'recibida']).default('enviada').describe('"recibida" es un cobro'),
  },
  async ({ userId, contactoId, monto, concepto, tipo }) => {
    const contacto = await pool.query(
      `select id from contactos_pago where id = $1 and usuario_id = $2 and activo`,
      [contactoId, userId],
    );

    if (contacto.rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Contacto no encontrado, inactivo, o no pertenece al usuario.' }) }],
      };
    }

    const { rows } = await pool.query(
      `insert into transferencias (id, usuario_id, contacto_id, tipo, monto, concepto, estatus)
       values ('transferencia-' || gen_random_uuid(), $1, $2, $3, $4, $5, 'completada')
       returning id, tipo, monto, concepto, estatus, fecha`,
      [userId, contactoId, tipo, monto, concepto ?? null],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

server.tool(
  'cancelar_transferencia',
  'Cancela una transferencia que sigue pendiente (borrado lógico -- una transferencia ya completada no se puede cancelar).',
  {
    transferenciaId: z.string().describe('Id de la transferencia'),
  },
  async ({ transferenciaId }) => {
    const { rows } = await pool.query(
      `update transferencias set estatus = 'cancelada'
       where id = $1 and estatus = 'pendiente'
       returning id, tipo, monto, concepto, estatus, fecha`,
      [transferenciaId],
    );

    if (rows.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Transferencia no encontrada o ya no está pendiente.' }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0]) }],
    };
  },
);

// --- Seguros ---

server.tool(
  'get_polizas_seguro',
  'Obtiene las pólizas de seguro del usuario, activas y cotizadas.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, tipo, cobertura, prima_mensual, vigencia_fin, estatus
       from polizas_seguro
       where usuario_id = $1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_siniestros',
  'Obtiene los siniestros/reclamos del usuario sobre sus pólizas de seguro.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select s.id, s.descripcion, s.monto_reclamado, s.estatus, s.fecha, p.tipo as tipo_poliza
       from siniestros s
       join polizas_seguro p on p.id = s.poliza_id
       where p.usuario_id = $1
       order by s.fecha desc`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

// --- Educación financiera ---

server.tool(
  'get_diagnostico_financiero',
  'Obtiene el diagnóstico financiero más reciente del usuario (puntaje de 0 a 100).',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select puntaje, fecha
       from diagnosticos_financieros
       where usuario_id = $1
       order by fecha desc
       limit 1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows[0] ?? null) }],
    };
  },
);

server.tool(
  'get_habitos_financieros',
  'Obtiene los hábitos financieros del usuario y su racha de días.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, habito, racha_dias
       from habitos_financieros
       where usuario_id = $1
       order by racha_dias desc`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

// Nuevo dato financiero -> nueva `server.tool(...)` aquí. No agregar nada
// relacionado a UI/props de componentes en este archivo.

const transport = new StdioServerTransport();
await server.connect(transport);
