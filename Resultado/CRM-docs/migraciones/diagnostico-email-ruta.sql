-- Migración: envío de la ruta por correo
-- Proyecto: abdi-platform (zmlslhftqjljhvetmbya)
-- Ejecutar una vez en el editor SQL de Supabase.
--
-- Marca cuándo salió el correo con la ruta. No es solo un dato de auditoría:
-- es el candado que evita mandarlo dos veces. El Worker reserva la fila con
-- un UPDATE condicionado a que esta columna siga nula, así que dos análisis
-- de la misma sesión no pueden ganar los dos.

alter table public.diagnostic_sessions
  add column if not exists ruta_email_enviada_at timestamptz;

comment on column public.diagnostic_sessions.ruta_email_enviada_at is
  'Cuándo se envió la ruta al correo del lead. Nulo = no se ha enviado. Lo escribe el Worker antes de llamar a Resend y lo limpia si el envío falla.';

-- Para revisar de un vistazo a quién le falta el correo: solo interesan las
-- sesiones que dejaron dirección, que son una fracción del total.
create index if not exists diagnostic_sessions_ruta_email_idx
  on public.diagnostic_sessions (created_at desc)
  where lead_email is not null and ruta_email_enviada_at is null;

-- La columna la escribe el Worker con la service role key, que se salta RLS.
-- anon no la necesita y no se le abre: dejarla fuera evita que una llave
-- pública pueda marcar un correo como enviado y silenciarlo.
