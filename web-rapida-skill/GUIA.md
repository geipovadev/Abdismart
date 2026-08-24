# Guía de uso · web-rapida

Cómo instalar y usar la skill para optimizar el rendimiento y el SEO de una
landing page. Pensada para alguien que tiene un sitio y quiere mejorarlo, no
para un experto en rendimiento web.

Tiempo: **20 minutos** la primera vez, contando la instalación.

---

## Qué vas a conseguir

Esta guía viene de un caso real. Una landing pasó de esto:

| | antes | después |
|---|---|---|
| Rendimiento en móvil | 63 | **84** |
| Rendimiento en escritorio | 86 | **99** |
| SEO | — | **100** |
| Accesibilidad | — | **100** |
| Tiempo hasta ver el titular | 11,7 s | **3,7 s** |
| Salto de contenido (CLS) | 0,041 | **0** |

Todas las cifras de la skill vienen de ahí. Ninguna es una estimación.

**Sé realista con el móvil.** Si tu landing carga Google Tag Manager y el píxel
de Facebook, el techo está cerca de 70 puntos, y no es culpa de tu código: son
400 KB de JavaScript ajeno ejecutándose antes de que la página pinte nada. Hay
salida, pero es una decisión de negocio. Más abajo se explica.

---

## Paso 0 · Comprueba que tienes lo necesario

Abre una terminal y pega esto:

```bash
node --version && npx --version && python3 --version
```

Deberías ver tres números de versión. Si alguno falla:

| Falta | Cómo instalarlo |
|---|---|
| `node` o `npx` | descarga Node.js desde <https://nodejs.org> (versión LTS) |
| `python3` | en Mac ya viene. En Windows, desde <https://python.org> marcando «Add to PATH» |

Y necesitas **Google Chrome** instalado. No hace falta abrirlo.

> **En Windows**, si `python3` no funciona prueba `python`. Y usa la terminal de
> **PowerShell** o **Git Bash**, no el símbolo del sistema antiguo.

**No hace falta instalar nada más para empezar.** Los dos scripts principales
—el que mide y el que audita el SEO— funcionan solo con Python. Los otros dos
piden librerías, pero eso se ve más adelante y solo si los vas a usar.

---

## Paso 1 · Instalar la skill

Copia la carpeta `web-rapida-skill` a la carpeta de skills de Claude Code.

**Opción A — para ti, en todos tus proyectos** (la recomendada):

```bash
mkdir -p ~/.claude/skills
cp -r web-rapida-skill ~/.claude/skills/web-rapida
```

**Opción B — solo para un proyecto**, y así viaja en git con el repositorio:

```bash
mkdir -p .claude/skills
cp -r web-rapida-skill .claude/skills/web-rapida
```

Comprueba que quedó bien:

```bash
ls ~/.claude/skills/web-rapida
```

Tienes que ver `SKILL.md`, `README.md`, `GUIA.md`, `scripts/` y `references/`.

### Comprobar que Claude la ve

Abre Claude Code en la carpeta de tu proyecto y escribe:

```
/web-rapida
```

Si aparece en la lista, está instalada. También se activa sola cuando le
escribes cosas como «mi web va lenta en móvil» o «revisa el SEO de mi landing».

---

## Paso 2 · La primera medición

Este es el paso que más gente se salta, y es el que decide si todo lo demás
sirve para algo.

Sitúate en la carpeta de tu proyecto y localiza **la carpeta que se publica**:
la que contiene tu `index.html`. Suele llamarse `public`, `dist`, `build`,
`site` o ser la raíz del proyecto.

```bash
python3 ~/.claude/skills/web-rapida/scripts/medir.py ./public
```

La primera vez descarga Lighthouse y tarda un par de minutos. Verás algo así:

```
  sirviendo ./public con 250 ms de retraso por petición
  midiendo public (móvil, 3 corridas)…

  categoría                     public
  ────────────────────────────────────
  Rendimiento                       63
  SEO                               82
  Accesibilidad                     71
  Prácticas rec.                    92

  FCP                            4.2 s
  LCP                            8.3 s
  TBT                           152 ms
  CLS                            0.041
  Speed Index                    5.4 s

  public: corridas 64, 63, 60
```

**Apunta estos números.** Son tu línea base. Sin ellos no podrás demostrar
después que algo mejoró, ni darte cuenta de que algo empeoró.

### Por qué el script añade un retraso

Porque medir en tu computadora **miente**. Un servidor local contesta en un
milisegundo; el real tarda 200 o 300. Y como una página pide veinte o treinta
archivos, ese retraso se multiplica.

En el caso real, el mismo sitio daba **91 puntos en local y 63 en producción**,
con los archivos idénticos. Con esa diferencia se probaron dos mejoras, las dos
parecieron inútiles, y una se descartó. No lo era: valía 20 puntos.

---

## Paso 3 · Validar tu instrumento

Si tu sitio ya está publicado, mide también producción:

```bash
python3 ~/.claude/skills/web-rapida/scripts/medir.py https://tusitio.com
```

**Compara las dos puntuaciones de rendimiento:**

| Diferencia | Qué significa |
|---|---|
| menos de 5 puntos | perfecto, ya puedes trabajar |
| más de 5 puntos | ajusta el retraso |

Para ajustarlo, mira cuánto tarda tu servidor en contestar: abre tu sitio en
Chrome, pulsa F12, pestaña **Red**, recarga, y mira el tiempo de la primera
petición (el documento HTML). Usa ese número:

```bash
python3 ~/.claude/skills/web-rapida/scripts/medir.py ./public --rtt 400
```

Sube o baja hasta que las dos puntuaciones se acerquen. **Ese es el momento en
que tu instrumento empieza a servir.**

> Si tu sitio todavía no está publicado, usa 250 ms. Es un valor razonable para
> un hosting normal.

---

## Paso 4 · Auditar el SEO

Esto es instantáneo y no toca nada:

```bash
python3 ~/.claude/skills/web-rapida/scripts/auditar-seo.py ./public --dominio https://tusitio.com
```

Cada problema viene con la razón detrás:

```
  ✗ index.html: sin canonical
    sin ella, la misma página con y sin barra, con utm_ o en otro dominio
    se ve como copias distintas

  ✗ index.html: sin og:image
    al compartir el enlace en WhatsApp o Facebook sale sin imagen y casi
    nadie lo abre
```

En el caso real encontró **17 problemas** en un sitio que llevaba meses
publicado, incluido un `canonical` que seguía apuntando a `TUDOMINIO.com`.

Los cinco que más daño hacen, y suelen faltar:

1. **`canonical`** — sin ella, la misma página se ve como varias copias que
   compiten entre sí.
2. **`og:image`** — sin imagen, tu enlace en WhatsApp sale como texto gris.
3. **Un solo `h1`** por página.
4. **`sitemap.xml`** declarado en `robots.txt`.
5. **`alt` en las imágenes.**

El detalle de cada punto está en `references/seo.md`.

---

## Paso 5 · Pedirle a Claude que lo arregle

Aquí es donde la skill hace el trabajo. Abre Claude Code en tu proyecto y
escríbele algo así:

> Quiero mejorar el rendimiento y el SEO de mi landing. Está en `./public` y en
> producción es `https://tusitio.com`. Ya medí: 63 en móvil, 86 en escritorio,
> LCP de 8,3 s. La auditoría de SEO encontró 17 problemas.

Claude carga la skill y sigue el método: diagnostica, propone en orden de
impacto y mide cada cambio.

### Si prefieres hacerlo tú

El orden importa. Esto es lo que costaba cada cosa, medido:

| Causa | Lo que costaba | Cómo se arregla |
|---|---|---|
| Etiquetas de terceros (GTM, píxel) | **15 puntos** | `references/terceros.md` |
| El elemento más grande se destruye | **hasta 20 puntos** | `references/lcp-inestable.md` |
| Imágenes sin optimizar | 3,2 MB → 51 KB | `convertir-imagenes.py` |
| Trabajo de disposición de más | hilo principal −47% | `references/rendimiento.md` |
| Tipografías de Google | 2 viajes antes de pintar | `alojar-fuentes.py` |

**Empieza por las imágenes.** Es lo que más bytes ahorra con menos riesgo:

```bash
# primero mira qué hay (no modifica nada)
python3 ~/.claude/skills/web-rapida/scripts/convertir-imagenes.py ./public/assets

# si te convence, convierte
pip install pillow
python3 ~/.claude/skills/web-rapida/scripts/convertir-imagenes.py ./public/assets --aplicar --ancho 900
```

**Para saber qué `--ancho` usar:** abre tu página, clic derecho sobre la imagen,
*Inspeccionar*, y mira las dimensiones que muestra el navegador. Multiplica por
2 para pantallas retina. Ese es tu ancho.

El script **no borra los originales**. Te imprime la lista de referencias que
tienes que cambiar en tu HTML y CSS.

---

## Paso 6 · Un cambio, una medición

**La regla que más tiempo ahorra.** Aplica **un** cambio, mide, compara.

```bash
python3 ~/.claude/skills/web-rapida/scripts/medir.py ./antes ./despues
```

Te da las dos columnas lado a lado. **Si no mueve la aguja, revierte.**

> En el caso real, dos hipótesis muy razonables salieron planas al medirlas y se
> revirtieron. Una tercera, que parecía menor, valía 15 puntos. Sin medir cada
> cambio por separado no hay forma de saberlo.

Acumular cambios sin medir es cómo se acaba con código raro que nadie sabe si
sirve para algo.

---

## Paso 7 · Publicar y volver a medir

Sube los cambios y mide producción otra vez. **Lo local nunca es lo real.**

Y comprueba que lo publicado es lo que probaste:

```bash
curl -s https://tusitio.com/ | diff - public/index.html && echo "idénticos"
```

Después, en **Google Search Console**:

1. Envía tu `sitemap.xml`.
2. Pide la indexación de la portada.

Y pasa tu URL por el **depurador de Facebook**
(<https://developers.facebook.com/tools/debug/>) para que refresque la imagen al
compartir. Se cachea varios días.

---

## Problemas comunes

### «Editué un archivo y no cambia nada»

**La trampa que más veces se repite.** Si tu hosting cachea con `immutable` y
editas un archivo sin cambiarle el `?v=`, el navegador —y tus pruebas— siguen
usando la versión vieja. Sin avisar.

Comprueba siempre que lo servido es lo que tienes en disco:

```bash
curl -s https://tusitio.com/assets/app.js | diff - public/assets/app.js
```

Si difieren, sube el número: `app.js?v=2`.

### «Lighthouse falla o no arranca»

Casi siempre es Chrome. Comprueba que está instalado y prueba:

```bash
npx --yes lighthouse --version
```

Si sigue fallando, el script imprime el error de Lighthouse: léelo, suele decir
exactamente qué falta.

### «La puntuación cambia cada vez que mido»

Es normal, Lighthouse varía. Por eso el script mide **tres veces** y toma la
mediana. Si ves 79, 84 y 81, tu puntuación es 81.

Una diferencia de 2 o 3 puntos entre mediciones **no es una mejora**. Es ruido.

### «Local da 90 y producción 60»

Tu instrumento no está calibrado. Vuelve al Paso 3 y ajusta `--rtt`. No tomes
ninguna decisión hasta que las dos se acerquen.

### «El SEO da 100 pero no aparezco en Google»

Son cosas distintas. La puntuación de SEO de Lighthouse mide que tu **HTML esté
bien puesto**: etiquetas, encabezados, enlaces rastreables. Es la condición
previa, no el posicionamiento.

Posicionar depende del contenido, de los enlaces que te apunten y de la
competencia. Esta skill se ocupa de que la parte técnica no te frene, que es lo
que sí está en tu mano.

### «Mi móvil no pasa de 70»

Mira si cargas Google Tag Manager, Google Analytics o el píxel de Facebook. Los
tres juntos están medidos en **15 puntos**.

No los quites sin más: pagan tus campañas. En `references/terceros.md` está la
salida completa, con dos opciones medidas. La más simple es cargar el píxel
**cuando la persona toque la pantalla** en vez de al abrir la página: cuesta
**0 puntos** y conserva la medición de quien convierte, porque nadie llena un
formulario sin tocar nada.

---

## Lo que esta skill NO hace

- **No escribe tu contenido.** El SEO técnico es la mitad; la otra es tener algo
  que valga la pena leer.
- **No decide por ti sobre la medición.** Te da los números para que decidas si
  sacrificas puntos por atribución de campañas.
- **No promete 100 en móvil.** Con etiquetas de terceros no es alcanzable, y
  cualquiera que te diga lo contrario no lo ha medido.
- **No toca producción.** Todo se prueba en local y publicas tú.

---

## Referencia rápida

```bash
S=~/.claude/skills/web-rapida/scripts

# medir en local, con instrumento realista
python3 $S/medir.py ./public

# medir producción, para validar el instrumento
python3 $S/medir.py https://tusitio.com

# escritorio en vez de móvil
python3 $S/medir.py ./public --escritorio

# comparar dos versiones
python3 $S/medir.py ./antes ./despues

# otra página, no la portada
python3 $S/medir.py ./public --pagina /precios

# auditar SEO
python3 $S/auditar-seo.py ./public --dominio https://tusitio.com

# imágenes: informe, y luego conversión
python3 $S/convertir-imagenes.py ./public/assets
python3 $S/convertir-imagenes.py ./public/assets --aplicar --ancho 900

# tipografías de Google a tu dominio
python3 $S/alojar-fuentes.py "https://fonts.googleapis.com/css2?family=..." ./public/assets
```

Y los documentos, cuando quieras entender el porqué:

| Archivo | Para qué |
|---|---|
| `SKILL.md` | el método completo, paso a paso |
| `references/rendimiento.md` | cada causa con su coste medido, y lo que NO funcionó |
| `references/lcp-inestable.md` | el LCP no baja y las cifras no cuadran |
| `references/terceros.md` | GTM y el píxel: cuánto cuestan y qué hacer |
| `references/seo.md` | cada punto de la auditoría y su razón |
