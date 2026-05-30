-- RemitosApp — supabase/schema.sql
-- Correr en el SQL Editor de Supabase

-- ── Tablas ──────────────────────────────────────────

create table if not exists choferes (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  device_id  text unique not null,
  is_admin   boolean default false,
  created_at timestamptz default now()
);

create table if not exists remitos (
  id             uuid primary key default gen_random_uuid(),
  chofer_id      uuid references choferes(id) on delete cascade,
  fecha_carga    date not null,
  destino_ida    text not null,
  destino_vuelta text,
  litros         numeric(10,2),
  comentarios    text,
  pagado         boolean default false,
  fecha_pago     date,
  created_at     timestamptz default now()
);

create table if not exists remito_fotos (
  id          uuid primary key default gen_random_uuid(),
  remito_id   uuid references remitos(id) on delete cascade,
  storage_url text not null,
  created_at  timestamptz default now()
);

-- ── Índices ──────────────────────────────────────────

create index if not exists idx_choferes_device_id     on choferes(device_id);
create index if not exists idx_remitos_chofer_id       on remitos(chofer_id);
create index if not exists idx_remitos_pagado          on remitos(pagado);
create index if not exists idx_remitos_fecha_carga     on remitos(fecha_carga);
create index if not exists idx_remito_fotos_remito_id  on remito_fotos(remito_id);

-- ── RLS ───────────────────────────────────────────────
-- Herramienta interna: deshabilitar RLS para simplificar.
-- Si preferís mantenerlo, comentá las líneas "disable" y
-- descomentá las secciones "enable + policy" de abajo.

alter table choferes    disable row level security;
alter table remitos     disable row level security;
alter table remito_fotos disable row level security;

-- ── Alternativa: RLS permisivo (anon puede todo) ──────
-- alter table choferes enable row level security;
-- create policy "anon_all" on choferes for all to anon using (true) with check (true);
--
-- alter table remitos enable row level security;
-- create policy "anon_all" on remitos for all to anon using (true) with check (true);
--
-- alter table remito_fotos enable row level security;
-- create policy "anon_all" on remito_fotos for all to anon using (true) with check (true);
