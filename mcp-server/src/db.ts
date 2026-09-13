import 'dotenv/config'; // carga mcp-server/.env -- sin esto, DATABASE_URL siempre es undefined
import { Pool } from 'pg';

/**
 * Pool único de Postgres para todo el servidor MCP.
 * DATABASE_URL debe apuntar a la instancia de Postgres del hackathon
 * (ver mcp-server/.env.example).
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
