# Abdismart

Plataforma que crea webs profesionales para pequeños negocios de **Costa Rica en 48 horas**.
Dominio, hosting, SEO básico y soporte en español incluidos.

Operado por **Grupo Abdi S.R.L.**

---

## Estructura

```
Abdi/
├── Contexto/          # Fuente de verdad. Leer antes de generar cualquier output.
│   ├── Abdi - Contexto Completo.txt      # Producto, modelo, personas, roadmap, KPIs
│   └── Abdi - Tono de Comunicacion.txt   # Voz de marca y reglas de estilo
└── Resultado/
    ├── Landing/       # Landing page pública
    ├── CRM/           # Journey del cliente y acceso al CRM
    ├── Ejemplos/      # Webs de muestra por vertical
    └── Instagram/     # Piezas de contenido
```

## Landing

HTML estático, sin build ni dependencias. Sistema visual **"Monolito"**: modo claro y
oscuro, fuentes de Google Fonts y un único archivo por página.

| Archivo | Qué es |
|---|---|
| `Resultado/Landing/index.html` | Landing principal |
| `Resultado/Landing/empezar.html` | Formulario de contratación, 10 preguntas paso a paso |
| `Resultado/Landing/terminos.html` | Términos y condiciones (ley costarricense) |
| `Resultado/Landing/assets/` | Logotipo en sus dos versiones de color |

Para verla en local:

```bash
python3 -m http.server 5501 --directory Resultado/Landing
```

## Despliegue

**Cloudflare Workers (Static Assets)**, conectado a este repositorio. Se eligió
Cloudflare porque despliega desde repos privados en el plan gratuito, cosa que
GitHub Pages no hace.

Toda la configuración vive en [`wrangler.jsonc`](wrangler.jsonc), en la raíz. Lo
importante es `assets.directory`, que apunta a `Resultado/Landing`: la landing no
está en la raíz del repo y sin eso el deploy falla con *"Could not detect a
directory containing static files"*.

No hay proceso de build. Son archivos estáticos que se sirven tal cual y todas
las rutas internas son relativas, así que esa carpeta funciona como raíz del sitio.

```bash
npx wrangler deploy        # despliegue manual
```

`Resultado/Landing/_headers` define las cabeceras de seguridad y de caché. Solo
tiene efecto en Cloudflare, no en el servidor local.

Fuera del sitio publicado queda todo lo que esté afuera de `Resultado/Landing/`
— incluido `Resultado/CRM/`, que no debe ser público.

## Base de datos

Supabase. Las migraciones se aplican a mano desde el editor SQL del proyecto:

| Archivo | Estado |
|---|---|
| `Resultado/Landing/supabase-waitlist.sql` | Tablas `waitlist` y `page_views` con RLS |
| `Resultado/Landing/supabase-respuestas.sql` | Columna `respuestas` para el formulario largo |

La `anon key` que aparece en los HTML es pública por diseño: el acceso está limitado
por RLS, que solo permite `INSERT` a usuarios anónimos.

## Pendientes antes de publicar

- [ ] Reemplazar los testimonios de marcador en `index.html` por citas reales
- [ ] Revisión de `terminos.html` por un abogado costarricense
- [ ] Completar cédula jurídica, domicilio social y horario en `terminos.html`
- [ ] Redactar el aviso de privacidad (Ley 8968) — el footer aún apunta a `#`
- [ ] Aplicar `supabase-respuestas.sql` antes de publicar `empezar.html`

## Convenciones

Las reglas de trabajo, el tono de marca y la identidad visual están en
[`CLAUDE.md`](CLAUDE.md). Todo output nuevo debe respetarlas.

## Secretos

Este repositorio no contiene credenciales. Los archivos `.env` están en `.gitignore`
y nunca deben subirse.
