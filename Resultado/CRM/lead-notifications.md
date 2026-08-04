# Notificaciones de nuevos registros

## CRM y sonido

1. Ejecuta `lead-notifications.sql` en Supabase.
2. Abre el CRM y pulsa **Activar sonido**. El navegador recordará la preferencia.
3. Cuando llegue un `INSERT` a `waitlist`, el CRM mostrará una alerta, actualizará los contadores y reproducirá un tono de tres notas.
4. Si el navegador lo permite, también mostrará una notificación del sistema.

El sonido requiere que el usuario haya activado el botón al menos una vez, porque los navegadores bloquean audio automático sin interacción.

## Email fuera del CRM

La función `supabase/functions/notify-lead/index.ts` está preparada para Resend.

1. Despliega la función con Supabase CLI.
2. Configura estos secretos:

   ```text
   RESEND_API_KEY=re_...
   LEAD_NOTIFY_TO=geiner@abdismart.com
   LEAD_NOTIFY_FROM=Abdi <notificaciones@abdismart.com>
   ```

3. En Supabase crea un **Database Webhook** para `public.waitlist`, evento `INSERT`, apuntando a la URL de la función `notify-lead`.

Supabase ejecuta los Database Webhooks después del cambio de fila y de forma asíncrona. El email solo incluye un resumen mínimo; el detalle completo permanece en el CRM.
