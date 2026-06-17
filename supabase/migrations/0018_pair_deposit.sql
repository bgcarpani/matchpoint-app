-- v3 / Slice 6 — Seña (pago de inscripción de 1 jugador).
--
-- "Pendiente de seña" es un SUB-ESTADO de `accepted`, no un status nuevo: el enum
-- `pairs.status` (pending/accepted/rejected) sigue manejando cupo y generación de
-- zonas. La dimensión de pago es independiente y la lleva esta única columna.
--
-- Semántica:
--   status='accepted' + deposit_paid_at IS NULL     -> pendiente de seña
--   status='accepted' + deposit_paid_at IS NOT NULL -> seña recibida (registra el cuándo)
-- En pending/rejected la columna es irrelevante (queda null).
--
-- El pago ocurre 100% fuera de la app (transferencia / MP / efectivo); la app solo
-- lleva el ESTADO de la seña. Sin exposición pública: `public_pair_view` (0002)
-- selecciona columnas explícitas, así que esta columna no se filtra a anon. RLS la
-- cubre `pairs_all_owner` (organizer-only).

alter table pairs add column deposit_paid_at timestamptz;
