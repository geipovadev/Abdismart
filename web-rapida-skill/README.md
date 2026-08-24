# web-rapida

Una skill de Claude Code para medir y mejorar el rendimiento y el SEO de un
sitio web, con un método que evita las trampas de medición más comunes.

Salió de un caso real. Una landing pasó de **63 a 83 puntos en móvil** y de
**86 a 98 en escritorio**. El LCP bajó de 11,7 s a 3,7 s y el CLS de 0,041 a 0.
Todas las cifras de la skill vienen de ahí: ninguna es una estimación.

---

## Qué hace distinto

Casi cualquier guía de rendimiento te dice que optimices imágenes y difieras
scripts. Esta empieza un paso antes, con el problema del que nadie habla:

> **Si mides en local, casi seguro estás midiendo mal.**

En ese caso el sitio daba **91 puntos en local y 63 en producción**, con los
archivos idénticos. Con el instrumento malo se probaron dos optimizaciones, las
dos salieron planas, y una se descartó por inútil. No lo era.

La skill trae un medidor que reproduce las condiciones reales, y un método para
comprobar que tu instrumento es de fiar antes de tomar decisiones con él.

---

> **¿Primera vez?** Empieza por **[GUIA.md](GUIA.md)**: instalación y uso paso a
> paso, con los comandos listos para copiar y una sección de problemas comunes.
> Este README es el resumen; la guía es el recorrido.

## Instalación

### 1 · Copiar la carpeta

**Solo para ti**, en cualquier proyecto:

```bash
mkdir -p ~/.claude/skills
cp -r web-rapida-skill ~/.claude/skills/web-rapida
```

**Para un proyecto y quien trabaje en él** (se puede versionar en git):

```bash
mkdir -p .claude/skills
cp -r web-rapida-skill .claude/skills/web-rapida
```

### 2 · Comprobar que Claude la ve

Abre Claude Code en el proyecto y escribe:

```
/web-rapida
```

Si aparece en la lista, está instalada. También se activa sola cuando le pides
cosas como «mi web va lenta en móvil» o «revisa el SEO».

### 3 · Instalar lo que necesitan los scripts

```bash
pip install pillow fonttools brotli
```

Y necesitas **Node.js** (para `npx`) y **Google Chrome**. Comprueba:

```bash
node --version && npx --version
```

La primera medición descarga Lighthouse con `npx`; puede tardar un minuto.

---

## Cómo usarla

### Lo más rápido

Abre Claude Code en la carpeta de tu proyecto y dile:

> Quiero mejorar el rendimiento y el SEO de mi sitio. Está en `./public` y en
> producción es `https://misitio.com`.

Claude carga la skill y sigue el proceso: mide, compara con producción para
validar el instrumento, diagnostica, propone en orden de impacto y verifica
cada cambio.

### Los scripts por separado

También funcionan solos, sin Claude:

```bash
# medir, con un instrumento realista
python3 ~/.claude/skills/web-rapida/scripts/medir.py ./public

# comparar con producción, para validar el instrumento
python3 ~/.claude/skills/web-rapida/scripts/medir.py https://misitio.com

# A/B entre dos versiones
python3 ~/.claude/skills/web-rapida/scripts/medir.py ./antes ./despues

# auditoría de SEO técnico
python3 ~/.claude/skills/web-rapida/scripts/auditar-seo.py ./public --dominio https://misitio.com

# imágenes (sin --aplicar solo informa)
python3 ~/.claude/skills/web-rapida/scripts/convertir-imagenes.py ./public/assets --aplicar --ancho 900

# tipografías de Google a tu dominio
python3 ~/.claude/skills/web-rapida/scripts/alojar-fuentes.py "https://fonts.googleapis.com/css2?family=..." ./public/assets
```

---

## El proceso, en corto

1. **Construir el instrumento** y comprobar que reproduce la puntuación real.
2. **Anotar la línea base** antes de tocar nada.
3. **Mirar dónde están los puntos.** TBT pesa 30%, LCP 25%, CLS 25%. Optimizar
   el FCP cuando el problema es el LCP es trabajar para ganar dos puntos.
4. **Atacar en orden de impacto medido**, no de intuición.
5. **Un cambio, una medición.** Si no mueve la aguja, revertir.
6. **Auditar el SEO técnico.**
7. **Desplegar y volver a medir.** Lo local nunca es lo real.

El detalle está en `SKILL.md`. Los porqués, en `references/`.

---

## Qué esperar de verdad

**Escritorio: 95-100 es alcanzable** en casi cualquier sitio estático.

**Móvil depende de las etiquetas de medición.** Con Google Tag Manager y el
píxel de Meta cargando, el techo está cerca de 70, y no es culpa de tu código:
son 400 KiB de JavaScript ajeno ejecutándose antes de que la página pinte nada.
Están medidos en 15 puntos.

Hay salida, y está en `references/terceros.md`. Pero es una decisión de negocio
—afecta a la atribución de campañas—, no una decisión técnica. La skill te da
los números para tomarla, no la toma por ti.

**Y ojo con las puntuaciones simuladas.** Lighthouse modela una red 4G lenta con
un móvil cuatro veces más lento. Un LCP de 8 segundos simulados puede ser 2,5
reales. Sirve para comparar tu antes con tu después, no para decirle a un
cliente cuánto tarda su web.

---

## Estructura

```
web-rapida/
├── SKILL.md                      el proceso, para Claude
├── GUIA.md                       instalación y uso paso a paso, para personas
├── guia-web.html                 la misma guía como página, para compartir
├── README.md                     esto
├── scripts/
│   ├── medir.py                  medidor con RTT realista y comparación A/B
│   ├── auditar-seo.py            auditoría de SEO técnico
│   ├── convertir-imagenes.py     imágenes a WebP al tamaño real
│   └── alojar-fuentes.py         Google Fonts a tu dominio, recortadas
└── references/
    ├── rendimiento.md            catálogo de causas con su coste medido
    ├── lcp-inestable.md          el LCP no baja y el desglose no cuadra
    ├── terceros.md               sacar GTM y el píxel sin quedarse a ciegas
    └── seo.md                    cada punto de la auditoría y su porqué
```

---

## Advertencias

- Los scripts **no modifican nada sin que se lo pidas**. `convertir-imagenes.py`
  informa por defecto y solo escribe con `--aplicar`, y nunca borra el original.
- `alojar-fuentes.py` recorta caracteres. Si vas a escribir en un idioma que no
  sea español o inglés, usa `--sin-subconjunto`.
- **Prueba en una rama**, no en producción. Y despliega solo después de medir.
- Si tu servidor cachea con `immutable`, **sube el `?v=` al editar un archivo**.
  Es la trampa que más veces se repite: editas, pruebas, y el navegador sigue
  con la versión vieja sin avisar.
