# abdismart.com: de Netlify a Cloudflare

Estado: **hecho.** Verificado el 19/08/2026, 20:15 UTC: los nameservers son de Cloudflare
y el dominio lo sirve el Worker. El inventario de este documento se hizo el 19/08/2026 y
el corte se ejecutó después; la fecha exacta del cambio de nameservers no quedó anotada.
Alcance: **solo la landing**. `crm.abdismart.com` se quedó en Netlify.

---

## Por qué

Netlify bloqueó el despliegue de producción: `Skipped due to account credit usage
exceeded`. El despliegue directo por CLI también responde `Forbidden`.

El Worker de Cloudflare ya servía esa misma carpeta —`wrangler.jsonc` apunta a
`Resultado/Landing`—, así que solo le faltaba el dominio.

---

## Cómo quedó

`abdismart.com` lo sirve el Worker, landing y API juntas. Un solo comando publica:

```bash
npx wrangler deploy
```

Comprobado así:

```bash
dig +short NS abdismart.com
# frank.ns.cloudflare.com. / kenia.ns.cloudflare.com.

curl -sI https://abdismart.com/diagnostico.html | head -1
# HTTP/2 307   → location: /diagnostico
```

Ese 307 es la prueba de que responde el Worker: es su `html_handling:
auto-trailing-slash`. Netlify no hacía eso.

---

## Lo que hay que recordar

**El dominio está conectado desde el panel, no desde `wrangler.jsonc`.** No hay `routes`
declaradas. Un `deploy` no lo desconecta, pero el enlace no es reproducible desde el
repositorio: si algún día se recrea el Worker, el dominio no vuelve solo. Para dejarlo en
el repositorio habría que añadir:

```jsonc
"routes": [
  { "pattern": "abdismart.com",     "custom_domain": true },
  { "pattern": "www.abdismart.com", "custom_domain": true }
]
```

**No agregues eso si la zona no existe**: el despliegue falla y te quedás sin poder
publicar el Worker.

**`_headers` sí lo aplica Workers static assets.** Era la duda razonable —es un archivo
de Netlify— y funciona: la CSP y las cabeceras de seguridad salen en producción, y la
regla `/assets/*` **entra en las subcarpetas**, así que cubre `assets/fonts/`. Verificado
con `wrangler dev` y contra el dominio.

**La URL buena pasa a ser la corta.** `/diagnostico.html` responde 307 hacia
`/diagnostico`. Los enlaces viejos siguen funcionando, y el `canonical` de
`diagnostico.html` ya apuntaba a la corta.

**`netlify.toml` se queda.** Apunta a la misma carpeta y no molesta. Es parte de la vuelta
atrás.

---

## Qué quedó pendiente

### 1 · La landing llama a la API por el dominio ajeno

`diagnostico.html`, `assets/meta-eventos.js` y `assets/preview-builder.js` siguen usando
la URL absoluta `https://abdismart.geiner-porras-mb.workers.dev`. Ahora es el mismo Worker
el que sirve `abdismart.com`, y las rutas ya responden ahí:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS \
  -H 'Origin: https://abdismart.com' -H 'Access-Control-Request-Method: POST' \
  https://abdismart.com/api/agent/chat
# 204
```

Pasarlas a rutas relativas ahorra un DNS más un TLS a un segundo dominio, y el preflight
de CORS: unos 260 ms en la primera llamada. `assets/agent-widget.js` elige el destino
según el `hostname`, y ahí hay que revisar antes el contrato de la skill empaquetada, que
se instala en dominios de clientes.

### 2 · Tres cosas que la CSP bloquea en producción

Se ven en la consola del navegador, y **dos ya pasaban antes de migrar**:

| Bloqueado | Qué es | Desde cuándo |
|---|---|---|
| `static.cloudflareinsights.com/beacon.min.js` | Cloudflare Web Analytics, que Cloudflare inyecta solo | **Nuevo**: apareció con la migración |
| `capi-automation.s3.us-east-2.amazonaws.com/…/clientParamBuilder.bundle.js` | Constructor de parámetros de la Conversions API de Meta, lo carga una plantilla de GTM | Ya pasaba antes |
| `od-….on.aws/events` y `….run.app/events` | Endpoints que pide el contenedor de GTM | Ya pasaba antes |

Hay que decidir uno por uno: o se agrega el dominio a la CSP en
`Resultado/Landing/_headers`, o se apaga la herramienta. Hoy ninguna de las tres funciona.
El beacon de Cloudflare, además, se puede apagar desde el panel y evitar el permiso.

### 3 · El SPF duplicado

La raíz tiene dos registros `v=spf1`, y según el RFC 7208 eso obliga al receptor a
devolver `permerror`. Ya pasaba antes de migrar; el archivo de zona los replicó tal cual
para no mezclar dos cambios. Sigue pendiente.

### 4 · El CRM

Sigue en Netlify, que está bloqueado: no se puede volver a desplegar hasta resolver el
crédito. El sitio ya publicado se sigue sirviendo.

---

## Si hay que volver atrás

Mientras el sitio de Netlify siga existiendo, volver es devolver los nameservers a NS1.
**No borres el sitio de Netlify** hasta que pase una semana sin incidencias. La zona de
Netlify quedó intacta: nada de esto la modificó.

---

## Verificación completa

```bash
# La web responde desde Cloudflare
curl -sI https://abdismart.com | grep -iE "^(server|cf-ray)"

# El correo sigue en pie
dig +short MX abdismart.com          # mx1 y mx2.privateemail.com
dig +short TXT resend._domainkey.abdismart.com
dig +short TXT send.abdismart.com

# El CRM sigue en Netlify
curl -s -o /dev/null -w "%{http_code}\n" https://crm.abdismart.com/login.html

# n8n, que antes no resolvía por ser un túnel de Cloudflare, ya debería
dig +short n8n.abdismart.com
```

Y una prueba real de envío: completar un diagnóstico dejando correo y comprobar que llega.
Eso ejercita Resend de punta a punta.

---

## El archivo de zona

`abdismart.com.zone` se conserva: son los 18 registros reales exportados de Netlify antes
de mudar, generados desde su API. Sirve como referencia de cómo estaba el DNS, y como
punto de partida si hay que reconstruirlo.

Estado del proxy que se aplicó al importar:

| Registro | Proxy | Por qué |
|---|---|---|
| `crm` | DNS only (gris) | Va a Netlify; proxiarlo rompe su certificado |
| `app` | DNS only | Va a Vercel |
| `soporte` | DNS only | Tracking de enlaces de Resend |
| `send` | DNS only | Es correo, no web |
| `n8n` | Proxiado (naranja) | Es un túnel de Cloudflare, lo necesita |

Los MX y TXT no llevan proxy.
