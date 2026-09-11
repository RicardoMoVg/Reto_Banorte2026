import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);

  await pool.query(
    `insert into usuarios (id, nombre) values ('demo-user', 'Usuario Demo')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into metas (id, usuario_id, titulo, monto_actual, monto_objetivo) values
       ('meta-1', 'demo-user', 'Fondo de emergencia', 6200, 10000),
       ('meta-2', 'demo-user', 'Vacaciones diciembre', 3000, 10000)
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into transacciones (id, usuario_id, descripcion, monto, categoria, fecha) values
       ('tx-1', 'demo-user', 'Café Starbucks', -85, 'comida', now() - interval '1 day'),
       ('tx-2', 'demo-user', 'Depósito nómina', 15000, 'ingreso', now() - interval '3 day'),
       ('tx-3', 'demo-user', 'Netflix', -219, 'suscripciones', now() - interval '5 day')
     on conflict (id) do nothing`,
  );

  console.log('✅ Esquema aplicado y datos de prueba insertados.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error al sembrar la base de datos:', err);
  process.exit(1);
});
