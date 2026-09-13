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

  // --- Dashboard anclado (receta, no el valor resuelto -- ver constitution.md 3.2) ---
  await pool.query(
    `insert into dashboard_widgets (id, usuario_id, componente, tool, parametros, mensaje_agente, orden) values
       ('widget-1', 'demo-user', 'RastreadorMetas', 'mostrarProgresoMeta', '{"metaId":"meta-1"}'::jsonb, '¡Vas por muy buen camino!', 1)
     on conflict (id) do nothing`,
  );

  // --- Banca personal ---
  // cuentas va antes que transacciones: transacciones.cuenta_id la referencia.
  // cuenta-1 arranca en 0 -- el trigger trg_actualizar_saldo_cuenta lo va
  // sumando solo conforme se insertan sus transacciones de abajo (termina
  // en 14696 = -85 + 15000 - 219). No hay que mantenerlo sincronizado a
  // mano (así se nos fue una vez: quedó en 14915, copiado del mock viejo).
  // cuenta-2 no tiene transacciones en este seed, así que su saldo se
  // queda tal cual se declara aquí.
  await pool.query(
    `insert into cuentas (id, usuario_id, tipo, alias, saldo) values
       ('cuenta-1', 'demo-user', 'debito', 'Cuenta principal', 0),
       ('cuenta-2', 'demo-user', 'ahorro', 'Ahorro', 5000)
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into metas (id, usuario_id, titulo, monto_actual, monto_objetivo) values
       ('meta-1', 'demo-user', 'Fondo de emergencia', 6200, 10000),
       ('meta-2', 'demo-user', 'Vacaciones diciembre', 3000, 10000)
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into transacciones (id, usuario_id, cuenta_id, descripcion, monto, categoria, fecha) values
       ('tx-1', 'demo-user', 'cuenta-1', 'Café Starbucks', -85, 'comida', now() - interval '1 day'),
       ('tx-2', 'demo-user', 'cuenta-1', 'Depósito nómina', 15000, 'ingreso', now() - interval '3 day'),
       ('tx-3', 'demo-user', 'cuenta-1', 'Netflix', -219, 'suscripciones', now() - interval '5 day')
     on conflict (id) do nothing`,
  );

  // --- Inversiones ---
  await pool.query(
    `insert into perfiles_inversion (usuario_id, tolerancia_riesgo, horizonte_anios) values
       ('demo-user', 'moderado', 5)
     on conflict (usuario_id) do nothing`,
  );

  await pool.query(
    `insert into instrumentos (id, nombre, tipo, riesgo, rendimiento_anual_estimado) values
       ('inst-1', 'Fondo Banorte Renta Variable', 'fondo', 'alto', 11.5),
       ('inst-2', 'CETES 28 días', 'cetes', 'bajo', 10.8),
       ('inst-3', 'ETF S&P 500', 'etf', 'medio', 9.2)
     on conflict (id) do nothing`,
  );

  // cantidades pensadas para que el monto invertido sea coherente con el
  // resto del perfil demo (saldo ~14,700, nómina 15,000/mes) -- no montos
  // gigantes desproporcionados.
  await pool.query(
    `insert into posiciones_portafolio (id, usuario_id, instrumento_id, cantidad, precio_promedio) values
       ('pos-1', 'demo-user', 'inst-1', 100, 25.50),
       ('pos-2', 'demo-user', 'inst-2', 500, 10.00)
     on conflict (id) do nothing`,
  );

  // --- Crédito (mismos números que el ejemplo de la portada del brief) ---
  await pool.query(
    `insert into productos_credito (id, tipo, nombre, tasa_referencia, monto_maximo, plazo_maximo_meses, descripcion) values
       ('prod-personal', 'personal', 'Crédito Personal Banorte', 32.4, 300000, 48, 'Sin garantía, para cualquier fin'),
       ('prod-hipotecario', 'hipotecario', 'Crédito Hipotecario Banorte', 11.8, 5000000, 240, 'Para compra de vivienda'),
       ('prod-automotriz', 'automotriz', 'Crédito Automotriz Banorte', 14.5, 800000, 60, 'Para compra de auto nuevo o seminuevo'),
       ('prod-tarjeta', 'tarjeta', 'Tarjeta de Crédito Banorte', 32.4, 200000, 1, 'Línea revolvente, sin plazo fijo')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into tarjetas_credito (id, usuario_id, alias, limite_credito, saldo_actual, tasa_anual) values
       ('tarjeta-1', 'demo-user', 'Tarjeta Oro', 20000, 18400, 32.4)
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into solicitudes_credito (id, usuario_id, tipo, monto_solicitado, estatus) values
       ('sol-1', 'demo-user', 'personal', 15000, 'pendiente')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into planes_pago (id, tarjeta_id, plazo_meses, cat, pago_mensual) values
       ('plan-1', 'tarjeta-1', 12, 32.4, 1690),
       ('plan-2', 'tarjeta-1', 18, 34.1, 1215),
       ('plan-3', 'tarjeta-1', 24, 36.0, 980)
     on conflict (id) do nothing`,
  );

  // --- Pagos ---
  await pool.query(
    `insert into contactos_pago (id, usuario_id, nombre, clabe) values
       ('contacto-1', 'demo-user', 'María López', '012180012345678901')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into transferencias (id, usuario_id, contacto_id, tipo, monto, concepto, estatus, fecha) values
       ('transferencia-1', 'demo-user', 'contacto-1', 'enviada', 500, 'Renta', 'completada', now() - interval '2 day'),
       ('transferencia-2', 'demo-user', 'contacto-1', 'recibida', 300, 'Pago compartido', 'completada', now() - interval '1 day')
     on conflict (id) do nothing`,
  );

  // --- Seguros ---
  await pool.query(
    `insert into polizas_seguro (id, usuario_id, tipo, cobertura, prima_mensual, vigencia_fin, estatus) values
       ('poliza-1', 'demo-user', 'auto', 'Cobertura amplia', 850, '2027-06-30', 'activa'),
       ('poliza-2', 'demo-user', 'vida', 'Cobertura básica', 400, '2027-01-15', 'cotizada')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into siniestros (id, poliza_id, descripcion, monto_reclamado, estatus, fecha) values
       ('siniestro-1', 'poliza-1', 'Choque leve en estacionamiento', 12000, 'en_revision', now() - interval '4 day')
     on conflict (id) do nothing`,
  );

  // --- Educación financiera ---
  await pool.query(
    `insert into diagnosticos_financieros (id, usuario_id, puntaje, fecha) values
       ('diag-1', 'demo-user', 72, now() - interval '10 day')
     on conflict (id) do nothing`,
  );

  await pool.query(
    `insert into habitos_financieros (id, usuario_id, habito, racha_dias) values
       ('habito-1', 'demo-user', 'Ahorro automático semanal', 6),
       ('habito-2', 'demo-user', 'Revisar gastos cada domingo', 3)
     on conflict (id) do nothing`,
  );

  console.log('✅ Esquema aplicado y datos de prueba insertados (6 dominios del brief).');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error al sembrar la base de datos:', err);
  process.exit(1);
});
