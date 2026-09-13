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
  'Obtiene las metas de ahorro del usuario junto con su porcentaje de avance.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, titulo, monto_actual, monto_objetivo,
              round((monto_actual::numeric / monto_objetivo) * 100) as porcentaje
       from metas
       where usuario_id = $1
       order by porcentaje asc`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_transacciones',
  'Obtiene las transacciones más recientes del usuario.',
  {
    userId: z.string().describe('Id del usuario'),
    limite: z.number().int().positive().max(50).default(10),
  },
  async ({ userId, limite }) => {
    const { rows } = await pool.query(
      `select id, descripcion, monto, categoria, fecha
       from transacciones
       where usuario_id = $1
       order by fecha desc
       limit $2`,
      [userId, limite],
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

// --- Inversiones ---

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
  'get_portafolio',
  'Obtiene las posiciones de inversión del usuario: instrumento, cantidad, precio promedio y valor invertido.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select p.id, i.nombre, i.tipo, i.riesgo, i.rendimiento_anual_estimado,
              p.cantidad, p.precio_promedio,
              (p.cantidad * p.precio_promedio) as valor_invertido
       from posiciones_portafolio p
       join instrumentos i on i.id = p.instrumento_id
       where p.usuario_id = $1
       order by valor_invertido desc`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
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

// --- Pagos ---

server.tool(
  'get_contactos_pago',
  'Obtiene los contactos de pago guardados del usuario.',
  {
    userId: z.string().describe('Id del usuario'),
  },
  async ({ userId }) => {
    const { rows } = await pool.query(
      `select id, nombre, clabe
       from contactos_pago
       where usuario_id = $1`,
      [userId],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    };
  },
);

server.tool(
  'get_transferencias',
  'Obtiene las transferencias recientes del usuario, enviadas y recibidas (cobros).',
  {
    userId: z.string().describe('Id del usuario'),
    limite: z.number().int().positive().max(50).default(10),
  },
  async ({ userId, limite }) => {
    const { rows } = await pool.query(
      `select t.id, t.tipo, t.monto, t.concepto, t.estatus, t.fecha, c.nombre as contacto
       from transferencias t
       left join contactos_pago c on c.id = t.contacto_id
       where t.usuario_id = $1
       order by t.fecha desc
       limit $2`,
      [userId, limite],
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(rows) }],
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
