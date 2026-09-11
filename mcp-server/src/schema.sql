-- Esquema mínimo para el hackathon. Ajustar/normalizar según lo que exponga
-- el core bancario real; esto es lo que necesita el catálogo de LEGO actual.

create table if not exists usuarios (
  id text primary key,
  nombre text not null
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
  descripcion text not null,
  monto numeric not null,
  categoria text,
  fecha timestamptz not null default now()
);

create index if not exists idx_metas_usuario on metas(usuario_id);
create index if not exists idx_transacciones_usuario on transacciones(usuario_id, fecha desc);
