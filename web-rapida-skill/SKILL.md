---
name: web-rapida
description: "Mide y mejora el rendimiento y el SEO técnico de un sitio web, con un método que evita las trampas de medición más comunes. Úsala cuando alguien quiera subir su puntuación de PageSpeed o Lighthouse, arreglar el LCP, el CLS o el TBT, resolver una web lenta en móvil, auditar canonical, sitemap, robots.txt, Open Graph o datos estructurados, optimizar imágenes y tipografías, o sacar Google Tag Manager y el píxel de Meta del navegador. También cuando la puntuación local y la real no coinciden."
---

# /web-rapida

Sube el rendimiento y el SEO de un sitio, con mediciones en las que se puede
confiar.

Este método salió de un caso real: una landing pasó de **63 a 83 en móvil** y
de **86 a 98 en escritorio**, con el LCP bajando de 11,7 s a 3,7 s y el CLS de
0,041 a 0. Los números que aparecen abajo son de ese trabajo.

---

## La regla que lo gobierna todo

**Medir mal es peor que no medir.**

En ese caso, el sitio daba **91 puntos en local y 63 en producción**, con los
archivos idénticos. Con el instrumento malo se probaron dos optimizaciones,
las dos salieron planas, y una se descartó por inútil. No lo era: el
instrumento no la veía.

La diferencia era el viaje de ida y vuelta. Un servidor local contesta en un
milisegundo; el real tardaba 250. Una página pide veinte o treinta archivos, y
ese retraso se multiplica.

Antes de tocar una línea de código, hay que tener un instrumento que reproduzca
la puntuación real. Sin eso, todo lo demás es adivinar.

---

## El proceso

### Paso 1 · Construir el instrumento

```bash
python3 scripts/medir.py ./ruta/a/tu/sitio
```

Sirve la carpeta con 250 ms de retraso por petición, gzip y las cabeceras de
tu `_headers` si existe. Corre Lighthouse tres veces y da la mediana.

**Comprobar que el instrumento vale**: mide también producción y compara.

```bash
python3 scripts/medir.py https://tusitio.com
```

Si las dos puntuaciones quedan a menos de 5 puntos, ya se puede trabajar. Si
no, ajusta `--rtt` hasta que se acerquen: mira el TTFB real de tu sitio en la
pestaña de red del navegador y usa ese número.

> **Tres corridas, siempre.** Lighthouse varía. Una sola medición no distingue
> una mejora de 2 puntos del ruido.

### Paso 2 · Anotar la línea base

Guarda las cinco métricas antes de tocar nada. Sin esto no se puede demostrar
después que algo mejoró, ni detectar que algo empeoró.

### Paso 3 · Buscar dónde están los puntos, no dónde parece

Lighthouse reparte así la nota:

| Métrica | Peso | Qué mide |
|---|---|---|
| TBT | 30% | cuánto tiempo el navegador está bloqueado y no responde |
| LCP | 25% | cuándo aparece el elemento más grande |
| CLS | 25% | cuánto se mueve la página mientras carga |
| FCP | 10% | cuándo aparece lo primero |
| Speed Index | 10% | a qué ritmo se va llenando la pantalla |

**Mira primero la métrica con peso alto y puntuación baja.** Optimizar el FCP
cuando el problema es el LCP es trabajar para ganar dos puntos.

### Paso 4 · Atacar en orden de impacto medido

Este es el orden que salió de medir cada causa por separado. No es teoría:

| Causa | Lo que costaba | Ver |
|---|---|---|
| Etiquetas de terceros (GTM, gtag, píxel) | **15 puntos**, 4,4 s de LCP | `references/terceros.md` |
| Elemento LCP inestable | **20 puntos**, LCP de 11,7 s a 2,5 s | `references/lcp-inestable.md` |
| Imágenes sin optimizar | 3,2 MB → 51 KB | `scripts/convertir-imagenes.py` |
| Trabajo de disposición innecesario | hilo principal −47% | `references/rendimiento.md` |
| Tipografías de Google | 2 viajes antes de pintar | `scripts/alojar-fuentes.py` |
| Peticiones que bloquean el render | ~1 viaje cada una | `references/rendimiento.md` |

### Paso 5 · Un cambio, una medición

Aplica **un** cambio. Mide. Compara con la línea base.

```bash
python3 scripts/medir.py ./antes ./despues
```

Si no mueve la aguja, revierte. Acumular cambios que no se midieron por
separado es cómo se acaba con código raro que nadie sabe si sirve para algo.

> En el caso real, dos hipótesis muy razonables salieron planas al medirlas. Se
> revirtieron. Una tercera, que parecía menor, valía 15 puntos.

### Paso 6 · El SEO técnico

```bash
python3 scripts/auditar-seo.py ./ruta/a/tu/sitio --dominio https://tusitio.com
```

Revisa lo que más se olvida y explica por qué importa cada cosa. En el caso
real encontró 17 problemas, entre ellos un `canonical` que todavía apuntaba a
`TUDOMINIO.com` y seis páginas sin `og:image`.

Detalle de cada punto en `references/seo.md`.

### Paso 7 · Verificar en producción

Desplegar y volver a medir. Lo local nunca es lo real.

Y comprobar que lo desplegado es lo que se probó:

```bash
curl -s https://tusitio.com/ | diff - ruta/a/index.html && echo "idénticos"
```

---

## Las cinco trampas

Cada una costó tiempo en el caso real.

**1. La caché `immutable`.** Si sirves `/assets/*` con `max-age=31536000,
immutable` y editas un archivo sin cambiarle el `?v=`, el navegador —y tus
pruebas— siguen con la versión vieja. Pasó tres veces. Comprueba siempre que lo
servido es lo que hay en disco:

```bash
curl -s https://tusitio.com/assets/app.js | diff - assets/app.js
```

**2. El informe resumido esconde el problema.** El desglose decía que el
titular se pintaba a los 2,4 s y la métrica marcaba 8,1 s. La causa solo se veía
en el trace: el candidato a LCP se invalidaba una y otra vez. Cuando los dos
números no cuadran, hay que bajar al trace.

**3. Simulado no es observado.** Lighthouse modela una red 4G lenta con CPU
cuatro veces más lento. Un LCP de 8 s simulados puede ser 2,5 s reales. Sirve
para comparar, no para decirle a un cliente cuánto tarda su web.

**4. La pestaña oculta no anima.** Al verificar animaciones desde una
herramienta automatizada, las transiciones CSS no avanzan porque el navegador
las congela. Se puede concluir que algo está roto cuando funciona bien.

**5. `content-visibility` cambia la disposición.** Implica `contain: layout`,
que corta el colapso de márgenes. Aplicado a `<section>` hizo crecer cada una
160 px. Va sobre el contenedor interno, y hay que medir el alto antes y después.

---

## Qué NO hacer

- **No persigas los 100 en móvil si cargas etiquetas de terceros.** Con 400 KiB
  de GTM y píxel, el techo está cerca de 70. No es tu código.
- **No borres la medición para ganar puntos** sin hablarlo con quien paga la
  publicidad. Hay una salida intermedia: `references/terceros.md`.
- **No optimices sin línea base.** Sin el antes, el después no significa nada.
- **No confíes en una sola corrida.**

---

## Referencias

| Archivo | Cuándo leerlo |
|---|---|
| `references/rendimiento.md` | catálogo de causas, con lo que costaba cada una |
| `references/lcp-inestable.md` | el LCP no baja y el desglose no cuadra |
| `references/terceros.md` | sacar GTM y el píxel del navegador sin perder medición |
| `references/seo.md` | cada punto de la auditoría y por qué importa |

## Scripts

| Script | Para qué |
|---|---|
| `scripts/medir.py` | medir con un instrumento realista, y comparar A/B |
| `scripts/auditar-seo.py` | auditoría de SEO técnico, sin conectarse a nada |
| `scripts/convertir-imagenes.py` | imágenes a WebP al tamaño real de uso |
| `scripts/alojar-fuentes.py` | Google Fonts a tu dominio, recortadas |

**Requisitos:** Node.js con `npx`, Google Chrome, y `pip install pillow
fonttools brotli` para los dos últimos scripts.
