# Abdismart

Plataforma que crea webs profesionales para pequeños negocios de **Costa Rica en 48 horas**.
Dominio, hosting, SEO básico y soporte en español incluidos.

Operado por **Grupo Abdi S.R.L.**

---

## Estructura

```
Abdi/
├── Contexto/          # NO versionado — solo local (ver nota abajo)
└── Resultado/
    ├── Landing/       # Landing page pública
    ├── CRM/           # Journey del cliente y acceso al CRM
    ├── Ejemplos/      # Webs de muestra por vertical
    └── Instagram/     # Piezas de contenido
```

> **`Contexto/` no está en este repositorio.** Contiene la documentación de
> negocio —economía unitaria, roadmap y metas de MRR— y el repo es público, así
> que vive solo en local y está en `.gitignore`. Quien trabaje en el proyecto
> necesita esa carpeta: pídela por los canales internos.

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

El sitio se publica desde **`Resultado/Landing/`**, que no es la raíz del
repositorio. Cada plataforma necesita que se le indique, o sirve el README y
devuelve 404 en la portada.

| Plataforma | Configuración | Ajuste clave |
|---|---|---|
| Cloudflare Workers | [`wrangler.jsonc`](wrangler.jsonc) | `assets.directory` |
| Netlify | [`netlify.toml`](netlify.toml) | `build.publish` |

Ambos archivos conviven sin conflicto: cada plataforma lee el suyo e ignora el
otro, y los dos apuntan a la misma carpeta.

No hay proceso de build. Son archivos estáticos que se sirven tal cual y todas
las rutas internas son relativas, así que esa carpeta funciona como raíz del sitio.

```bash
npx wrangler deploy        # despliegue manual en Cloudflare
```

`Resultado/Landing/_headers` define las cabeceras de seguridad y de caché.
Cloudflare y Netlify lo leen igual; el servidor local no.

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
