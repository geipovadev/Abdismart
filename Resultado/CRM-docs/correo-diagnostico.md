# La ruta del diagnóstico, por correo

Quien termina el diagnóstico y deja su correo recibe su ruta como email.
Es el mismo contenido que ve en pantalla: marcador, áreas, fugas con su
evidencia, primeros pasos y el paquete recomendado.

## Cuándo sale

Lo dispara el botón **«Ver mi ruta»**, pero no en el instante del clic.

El clic corre `finish()` en `diagnostico.html`, que guarda la sesión y pide
el análisis redactado al Worker. El correo sale al final de esa petición,
dentro de un `waitUntil`, cuando el texto ya está escrito. Son unos segundos
después del clic y nadie los nota: la persona ya está viendo su ruta.

Se manda por los cuatro caminos posibles del análisis —generado, respaldo,
sin llave de OpenAI y límite diario alcanzado—, así que un fallo de OpenAI
deja el correo sin las frases redactadas, nunca sin correo.

Si la persona no dejó correo, no pasa nada: el campo es opcional y no
dejarlo no es un error.

## Por qué el destinatario sale de la base

`enviarRutaPorCorreo` lee `lead_email` de la fila de `diagnostic_sessions`,
nunca del cuerpo de la petición. Si el destinatario viajara en el request,
el endpoint del análisis serviría para mandarle correo a cualquiera desde
un dominio verificado. Leyéndolo de la fila, solo puede escribirle a quien
dejó su dirección en esa sesión.

Por lo mismo, el nombre se limpia antes de usarlo: se le quitan saltos de
línea, caracteres de control y `<` `>`. En el cuerpo HTML todo pasa además
por escape de entidades. En el asunto escapar no serviría —se leerían las
entidades tal cual—, así que ahí lo que corresponde es limpiar en origen.

## Por qué no llega dos veces

La columna `ruta_email_enviada_at` es el candado. Antes de llamar a Resend,
el Worker hace un `UPDATE` condicionado a que siga nula: si otra ejecución
ya la marcó, esta se retira sin mandar nada. Si Resend rechaza el envío, la
marca se limpia para que un reintento posterior pueda mandarlo.

## Qué hace falta configurado

| Qué | Dónde | Valor |
|---|---|---|
| `RESEND_API_KEY` | Secreto del Worker | La llave de Resend |
| `DIAGNOSTICO_EMAIL_FROM` | Variable del Worker, opcional | Por defecto `Abdismart <hola@abdismart.com>` |
| `ruta_email_enviada_at` | Supabase | `migraciones/diagnostico-email-ruta.sql` |

```bash
npx wrangler secret put RESEND_API_KEY
```

El dominio `abdismart.com` ya está verificado en Resend. La Edge Function
`notify-lead` usa su propia llave: son dos envíos distintos —uno avisa al
equipo, este le escribe al cliente— y conviene que sigan separados.

## Si algo no llega

El Worker deja el motivo en los logs, sin adivinanzas:

| Evento | Qué pasó |
|---|---|
| `ruta_email_enviado` | Salió |
| `ruta_email_rechazado` | Resend devolvió error; incluye estado y detalle |
| `ruta_email_error` | No se pudo ni llamar a Resend |

Y los motivos que devuelve la función sin llegar a enviar: `sin_llave`,
`sin_supabase`, `sin_fila`, `sin_correo`, `sin_resultado`, `ya_enviado`.

Para ver a quién le falta:

```sql
select id, created_at, lead_name, lead_email
from public.diagnostic_sessions
where lead_email is not null and ruta_email_enviada_at is null
order by created_at desc;
```
