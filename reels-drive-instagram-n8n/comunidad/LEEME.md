# Para subir a la biblioteca de la comunidad

Cinco archivos y cuatro contadores. La diferencia con las guías anteriores es
que esta reparte **dos** descargas, no una.

## Dónde va cada archivo

| Archivo de aquí | Dónde va en el sitio |
|---|---|
| `reels-con-claude-n8n.html` | a la raíz, junto a `instagram-comentarios-n8n.html` |
| `content/reels-con-claude-n8n.md` | a `content/` |
| `descargas/flujo-reels-instagram.json` | a `descargas/` en la raíz |
| `descargas/reels-con-claude-SKILL.md` | a `descargas/` en la raíz |
| `estilos-hero.css` | al **final** de `styles.css` |
| `ficha-biblioteca.html` | su tarjeta va dentro de `comunidad.html` |

Después de tocar `styles.css`, **sube el `?v=`** del `<link>` en los HTML. Si no,
los navegadores que ya visitaron el sitio siguen con la hoja vieja y el hero
sale sin estilo. El HTML de esta guía ya viene con `?v=20260830-4`; el resto de
las páginas sigue en `-3` y hay que subirlas todas a la vez.

## Las dos descargas

El artículo enlaza el flujo de n8n **y** la skill de Claude Code. Son las dos
mitades del sistema: la skill arma el reel, el flujo lo publica. Si subes solo
una, el cierre del artículo queda con un enlace roto.

La skill es un `.md`. Comprueba que el servidor no lo sirva como `text/plain`
descargable en vez de abrirlo en el navegador — da igual cuál de las dos cosas
haga, pero conviene saber cuál para no prometer la otra.

## Por qué hace falta CSS nuevo

Cada guía de la biblioteca estrena su propio hero. Esta trae `reels-hero`,
construido con la misma estructura que `instagram-hero`: cambian el color —ámbar
en vez de rosa— y las dos letras de la marca de agua, `RE`.

## Los cuatro contadores

Están a mano en `comunidad.html` y hay que subirlos todos: la biblioteca pasa de
**8 recursos a 9**, y de **5 guías a 6**. Los cuatro están listados al final de
`ficha-biblioteca.html`, con el antes y el después.

> Esos números son los que tenía el sitio en vivo el **19 de noviembre de 2026**.
> Si subiste algo entre medio, vuelve a contarlos antes de pegar. El número de
> recurso de la ficha, `016`, sale del mismo conteo: el último publicado era el
> `015`.

## Lo que ya está resuelto

- El artículo **no lleva `<h1>`**: el título vive en el hero del HTML.
- La última sección se llama exactamente `## ¿Y ahora qué sigue?` porque el
  renderer busca ese identificador para envolver el cierre en la tarjeta de CTA.
- El índice lateral se genera solo a partir de los `##`. Son nueve.
- **Los dos enlaces de descarga empiezan con `./`.** El renderer solo acepta
  enlaces que arranquen con `http`, `mailto:`, `./`, `../` o que terminen en
  `.html`; cualquier otro lo reemplaza por `#` sin avisar.
- El tiempo de lectura del nav dice **12 MIN**, calculado con la misma medida
  que usa el resto de la biblioteca: 1.666 palabras a unas 135 por minuto.

## Comprueba las descargas después de subirlas

El sitio responde **200 con la portada** a cualquier ruta que no existe, en vez
de un 404. Un archivo mal subido no da error: da una página HTML con cara de
éxito, y quien la importe en n8n la verá vacía.

```bash
curl -sL -o /dev/null -w '%{content_type}\n' \
  https://comunidad.geinerporras.com/descargas/flujo-reels-instagram.json
```

Tiene que decir `application/json`. Si dice `text/html`, el archivo no está
donde crees. Repite la comprobación con el `.md` de la skill.

## Antes de publicar

El JSON del flujo no lleva token, ni ids de carpetas, ni nombre de cuenta: todo
son marcadores. La skill tampoco trae datos personales. Está comprobado por las
pruebas del repositorio, pero si los editas a mano, vuelve a mirar.

El artículo menciona que un error «costó dos días de publicaciones». Es cierto y
es mío; no hay nombres de clientes ni cifras de terceros en todo el texto.
