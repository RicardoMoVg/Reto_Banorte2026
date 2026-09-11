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

// Nuevo dato financiero -> nueva `server.tool(...)` aquí. No agregar nada
// relacionado a UI/props de componentes en este archivo.

const transport = new StdioServerTransport();
await server.connect(transport);
