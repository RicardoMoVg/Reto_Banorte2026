-- Esquema para el hackathon, cubriendo las 6 categorías del brief
-- ("Territorio: servicios y productos financieros"): banca personal,
-- inversiones, crédito, pagos, seguros, educación financiera. No todas
-- tienen tools de MCP ni UI todavía -- el equipo elige cuál(es) usar de
-- verdad en la demo (ver constitution.md sección 1: "un problema pequeño,
-- resuelto completo" vale más que cubrir las 6 a medias).
--
-- Convención: ids como `text` (no serial/uuid) para que el seed pueda usar
-- valores legibles ("meta-1", "tarjeta-1"); montos en `numeric`; fechas en
-- `timestamptz`; estados como `text` con `check` en vez de tipos ENUM de
-- Postgres, para mantenerlo simple.

-- ============================================================
-- Compartido
-- ============================================================

create table if not exists usuarios (
  id text primary key,
  nombre text not null
);

-- Dashboard "anclado" del usuario (Paso 5, pendiente en el cliente). Guarda
-- la RECETA para regenerar un bloque -- nunca el valor numérico resuelto
-- (ver constitution.md 3.2): qué componente, qué tool de a2ui-tools.ts, y
-- con qué parámetros. Al rehidratar, el backend llama esa tool directo
-- (sin pasar por el modelo) para traer el dato fresco del MCP.
create table if not exists dashboard_widgets (
  id text primary key,
  usuario_id text not null references usuarios(id),
  componente text not null, -- nombre en el catálogo del cliente, ej. 'RastreadorMetas'
  tool text not null,       -- tool de server/lib/ai/a2ui-tools.ts a re-ejecutar, ej. 'mostrarProgresoMeta'
  parametros jsonb not null default '{}', -- argumentos que el modelo hubiera elegido, ej. {"metaId":"meta-1"}
  mensaje_agente text,      -- texto de contexto -- este sí se congela, no es un dato financiero
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- 1. Banca personal — cuentas, movimientos, control de gasto
-- ============================================================

create table if not exists cuentas (
  id text primary key,
  usuario_id text not null references usuarios(id),
  tipo text not null check (tipo in ('debito', 'ahorro', 'nomina')),
  alias text not null,
  saldo numeric not null default 0
);

create table if not exists metas (
  id text primary key,
  usuario_id text not null references usuarios(id),
  titulo text not null,
  monto_actual numeric not null default 0,
  monto_objetivo numeric not null check (monto_objetivo > 0)
);

create table if not exists transacciones (
  id text primary key,
  usuario_id text not null references usuarios(id),
  cuenta_id text references cuentas(id),
  descripcion text not null,
  monto numeric not null,
  categoria text,
  fecha timestamptz not null default now()
);

-- ============================================================
-- 2. Inversiones — perfilamiento, portafolios, simulación
-- ============================================================

create table if not exists perfiles_inversion (
  usuario_id text primary key references usuarios(id),
  tolerancia_riesgo text not null check (tolerancia_riesgo in ('conservador', 'moderado', 'agresivo')),
  horizonte_anios integer not null check (horizonte_anios > 0)
);

create table if not exists instrumentos (
  id text primary key,
  nombre text not null,
  tipo text not null check (tipo in ('accion', 'fondo', 'cetes', 'etf')),
  riesgo text not null check (riesgo in ('bajo', 'medio', 'alto')),
  rendimiento_anual_estimado numeric not null -- % anual, para poder simular ("si invierto X...")
);

create table if not exists posiciones_portafolio (
  id text primary key,
  usuario_id text not null references usuarios(id),
  instrumento_id text not null references instrumentos(id),
  cantidad numeric not null check (cantidad > 0),
  precio_promedio numeric not null check (precio_promedio > 0)
);

-- ============================================================
-- 3. Crédito — precalificación, amortización, refinanciamiento
-- ============================================================

create table if not exists tarjetas_credito (
  id text primary key,
  usuario_id text not null references usuarios(id),
  alias text not null,
  limite_credito numeric not null check (limite_credito > 0),
  saldo_actual numeric not null default 0,
  tasa_anual numeric not null -- % anual, usado para CAT
);

create table if not exists solicitudes_credito (
  id text primary key,
  usuario_id text not null references usuarios(id),
  tipo text not null check (tipo in ('personal', 'hipotecario', 'automotriz', 'tarjeta')),
  monto_solicitado numeric not null check (monto_solicitado > 0),
  estatus text not null default 'pendiente' check (estatus in ('pendiente', 'aprobado', 'rechazado')),
  fecha timestamptz not null default now()
);

-- Un plan de pago/refinanciamiento posible para una tarjeta (ej. el
-- ejemplo de la portada del PDF: "reestructura tu saldo a 12/18/24 meses").
create table if not exists planes_pago (
  id text primary key,
  tarjeta_id text not null references tarjetas_credito(id),
  plazo_meses integer not null check (plazo_meses > 0),
  cat numeric not null,
  pago_mensual numeric not null check (pago_mensual > 0)
);

-- ============================================================
-- 4. Pagos — transferencias, cobros, conciliación
-- ============================================================

create table if not exists contactos_pago (
  id text primary key,
  usuario_id text not null references usuarios(id),
  nombre text not null,
  clabe text
);

create table if not exists transferencias (
  id text primary key,
  usuario_id text not null references usuarios(id),
  contacto_id text references contactos_pago(id),
  tipo text not null default 'enviada' check (tipo in ('enviada', 'recibida')), -- 'recibida' = cobro
  monto numeric not null check (monto > 0),
  concepto text,
  estatus text not null default 'completada' check (estatus in ('pendiente', 'completada', 'fallida')),
  fecha timestamptz not null default now()
);

-- ============================================================
-- 5. Seguros — cotización, coberturas, siniestros
-- ============================================================

create table if not exists polizas_seguro (
  id text primary key,
  usuario_id text not null references usuarios(id),
  tipo text not null check (tipo in ('auto', 'vida', 'gmm', 'hogar')),
  cobertura text not null,
  prima_mensual numeric not null check (prima_mensual > 0),
  vigencia_fin date not null,
  estatus text not null default 'activa' check (estatus in ('cotizada', 'activa', 'vencida'))
);

create table if not exists siniestros (
  id text primary key,
  poliza_id text not null references polizas_seguro(id),
  descripcion text not null,
  monto_reclamado numeric,
  estatus text not null default 'en_revision' check (estatus in ('en_revision', 'aprobado', 'rechazado', 'pagado')),
  fecha timestamptz not null default now()
);

-- ============================================================
-- 6. Educación financiera — diagnóstico, metas, hábitos
-- ============================================================
-- (las "metas" ya están en la sección de banca personal, arriba)

create table if not exists diagnosticos_financieros (
  id text primary key,
  usuario_id text not null references usuarios(id),
  puntaje integer not null check (puntaje between 0 and 100),
  fecha timestamptz not null default now()
);

create table if not exists habitos_financieros (
  id text primary key,
  usuario_id text not null references usuarios(id),
  habito text not null,
  racha_dias integer not null default 0 check (racha_dias >= 0)
);

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_cuentas_usuario on cuentas(usuario_id);
create index if not exists idx_metas_usuario on metas(usuario_id);
create index if not exists idx_transacciones_usuario on transacciones(usuario_id, fecha desc);
create index if not exists idx_transacciones_cuenta on transacciones(cuenta_id);
create index if not exists idx_posiciones_usuario on posiciones_portafolio(usuario_id);
create index if not exists idx_tarjetas_usuario on tarjetas_credito(usuario_id);
create index if not exists idx_solicitudes_usuario on solicitudes_credito(usuario_id);
create index if not exists idx_planes_pago_tarjeta on planes_pago(tarjeta_id);
create index if not exists idx_contactos_usuario on contactos_pago(usuario_id);
create index if not exists idx_transferencias_usuario on transferencias(usuario_id, fecha desc);
create index if not exists idx_polizas_usuario on polizas_seguro(usuario_id);
create index if not exists idx_siniestros_poliza on siniestros(poliza_id);
create index if not exists idx_diagnosticos_usuario on diagnosticos_financieros(usuario_id);
create index if not exists idx_habitos_usuario on habitos_financieros(usuario_id);
create index if not exists idx_dashboard_widgets_usuario on dashboard_widgets(usuario_id, orden);
