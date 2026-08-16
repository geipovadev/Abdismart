-- Migración: columna de respuestas del formulario "Empieza tu web" (empezar.html)
-- Proyecto: abdi-platform (zmlslhftqjljhvetmbya)
--
-- IMPORTANTE: correr esto ANTES de publicar empezar.html.
-- Sin esta columna, el insert del formulario falla con
-- "column respuestas of relation waitlist does not exist".
--
-- La columna es opcional, así que el formulario corto de la landing
-- (index.html, sección #contacto) sigue funcionando sin cambios.

alter table public.waitlist
  add column if not exists respuestas jsonb;

comment on column public.waitlist.respuestas is
  'Respuestas del brief corto de empezar.html: negocio_nombre, ciudad, presencia, servicios[], detalle, urgencia, origen.';

-- Las políticas de RLS que ya existen cubren esta columna:
-- anon inserta, authenticated lee y actualiza. No hace falta tocarlas.
