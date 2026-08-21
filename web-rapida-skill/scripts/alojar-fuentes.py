#!/usr/bin/env python3
"""Baja las tipografías de Google Fonts a tu propio dominio y las recorta.

POR QUÉ. Un enlace a fonts.googleapis.com cuesta dos viajes de ida y vuelta
antes de que el navegador pueda pintar un titular:

  1. la hoja de estilo de Google, que bloquea el render;
  2. y solo entonces los .woff2, desde fonts.gstatic.com, un segundo dominio
     con su propio DNS y su propio TLS.

Sirviéndolas desde tu dominio desaparecen los dos: llegan por la conexión que
ya está abierta. Y de paso, el subconjunto quita los caracteres que tu sitio
nunca escribe.

USO
    python3 alojar-fuentes.py "https://fonts.googleapis.com/css2?family=..." ./public/assets
    python3 alojar-fuentes.py "URL" ./public/assets --sin-subconjunto

La URL es exactamente la que tienes en tu <link rel="stylesheet">.

QUÉ DEJA
    assets/fonts/*.woff2   los archivos
    assets/fonts.css       las reglas @font-face apuntando a ellos

Y TÚ TIENES QUE
    1. cambiar el <link> de Google por  <link rel="stylesheet" href="assets/fonts.css">
    2. precargar la fuente del titular, que suele ser el elemento LCP:
       <link rel="preload" href="assets/fonts/....woff2" as="font" type="font/woff2" crossorigin>
    3. si tu servidor cachea /assets/* como immutable, subir el ?v= de fonts.css

EL RIESGO DEL SUBCONJUNTO. Un carácter fuera del rango se pinta con la
tipografía de respaldo, sin error ni aviso en consola. El rango por defecto
cubre ASCII, todo Latin-1 —el español entero: á é í ó ú ü ñ ¿ ¡— y la
puntuación tipográfica. Si vas a escribir en otro idioma, usa --sin-subconjunto.

REQUISITOS
    pip install fonttools brotli
"""

import argparse, os, re, sys, urllib.request

UA_MODERNO = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')

# Generoso a propósito: mucho más de lo que un sitio en español escribe, y aun
# así una fracción del set latin completo de Google.
RANGO = ','.join([
    'U+0020-007E',   # ASCII imprimible
    'U+00A0-00FF',   # Latin-1: acentos del español, ¿ ¡ « » © ® ° ×
    'U+0131', 'U+0152-0153', 'U+02C6', 'U+02DA', 'U+02DC',
    'U+2013-2014',   # – —
    'U+2018-201A', 'U+201C-201E',
    'U+2020-2022', 'U+2026', 'U+2030', 'U+2039-203A',
    'U+20A1', 'U+20AC',   # ₡ €
    'U+2122', 'U+2190-2193', 'U+2212', 'U+2215', 'U+25CF', 'U+2713',
    'U+FEFF', 'U+FFFD',
])

# Solo estos: el resto (cirílico, griego, vietnamita) no lo escribe un sitio en
# español, y con unicode-range el navegador nunca los pediría igualmente.
#
# Al recortar se queda solo `latin`, porque el rango de arriba cabe entero
# dentro de él: recortar `latin-ext` con ese rango deja un archivo de menos de
# un kilobyte que no aporta ningún glifo nuevo. Sin recortar sí se conservan
# los dos, y unicode-range decide cuál baja el navegador.
SUBSETS_RECORTANDO = ('latin',)
SUBSETS_COMPLETOS  = ('latin', 'latin-ext')


def bajar_css(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA_MODERNO})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8')


def main():
    ap = argparse.ArgumentParser(description='Aloja Google Fonts en tu dominio.')
    ap.add_argument('url', help='la URL de tu <link> de Google Fonts')
    ap.add_argument('destino', help='carpeta de assets, p. ej. ./public/assets')
    ap.add_argument('--sin-subconjunto', action='store_true',
                    help='no recortar caracteres (más peso, cero riesgo)')
    args = ap.parse_args()

    recortar = not args.sin_subconjunto
    if recortar:
        try:
            import fontTools, brotli  # noqa: F401
        except ImportError:
            print('  para recortar hacen falta fonttools y brotli:\n'
                  '    pip install fonttools brotli\n'
                  '  o usa --sin-subconjunto', file=sys.stderr)
            return 1

    destino = os.path.abspath(args.destino)
    carpeta = os.path.join(destino, 'fonts')
    os.makedirs(carpeta, exist_ok=True)

    print('  pidiendo la hoja de Google…')
    css = bajar_css(args.url)

    bloques = re.findall(r"/\* (\S+) \*/\s*(@font-face \{.*?\})", css, re.S)
    if not bloques:
        print('  no se reconoció el formato de la respuesta. ¿Es una URL de css2?', file=sys.stderr)
        return 1

    subsets = SUBSETS_RECORTANDO if recortar else SUBSETS_COMPLETOS
    elegidos = [(s, b) for s, b in bloques if s in subsets]
    print(f'  {len(bloques)} variantes en total, {len(elegidos)} en latin/latin-ext')

    reglas, antes_total, despues_total = [], 0, 0
    for subset, bloque in elegidos:
        fam    = re.search(r"font-family: '([^']+)'", bloque).group(1)
        estilo = re.search(r'font-style: (\S+);', bloque).group(1)
        peso   = re.search(r'font-weight: (\S+);', bloque).group(1)
        rango  = re.search(r'unicode-range: ([^;]+);', bloque)
        url    = re.search(r'url\((https://[^)]+)\)', bloque).group(1)

        nombre = f"{fam.lower().replace(' ', '-')}-{peso}-{estilo}-{subset}.woff2"
        ruta = os.path.join(carpeta, nombre)

        req = urllib.request.Request(url, headers={'User-Agent': UA_MODERNO})
        datos = urllib.request.urlopen(req, timeout=30).read()
        open(ruta, 'wb').write(datos)
        antes = len(datos)
        antes_total += antes

        if recortar:
            import subprocess
            r = subprocess.run([sys.executable, '-m', 'fontTools.subset', ruta,
                                f'--output-file={ruta}.tmp', f'--unicodes={RANGO}',
                                '--flavor=woff2', '--no-hinting', '--desubroutinize',
                                '--layout-features=kern,liga,clig,calt,ccmp,locl,mark,mkmk'],
                               capture_output=True, text=True)
            if r.returncode == 0 and os.path.exists(ruta + '.tmp'):
                os.replace(ruta + '.tmp', ruta)
        despues = os.path.getsize(ruta)
        despues_total += despues
        print(f'  {nombre:48} {antes/1024:6.1f} → {despues/1024:5.1f} KB')

        r = [f"@font-face {{", f"  font-family: '{fam}';", f"  font-style: {estilo};",
             f"  font-weight: {peso};", "  font-display: swap;",
             f"  src: url(fonts/{nombre}) format('woff2');"]
        if rango:
            r.append(f"  unicode-range: {rango.group(1)};")
        r.append('}')
        reglas.append(f'/* {fam} {peso} {estilo} · {subset} */\n' + '\n'.join(r))

    cabecera = f"""/* Tipografías servidas desde este dominio, no desde Google.
 *
 * Antes venían de fonts.googleapis.com, y eso costaba dos viajes antes de
 * poder pintar el titular: primero la hoja de estilo, que bloquea el render, y
 * solo entonces los .woff2 desde fonts.gstatic.com, otro dominio con su propio
 * DNS y su propio TLS.
 *
 * {'Recortadas a ASCII + Latin-1 + puntuación tipográfica.' if recortar else 'Sin recortar: incluyen todo el juego original.'}
 * {'Un carácter fuera de ese rango se pinta con la tipografía de respaldo, sin' if recortar else ''}
 * {'aviso ninguno. Para otro idioma, regenerar con --sin-subconjunto.' if recortar else ''}
 *
 * Generado con alojar-fuentes.py. Al cambiar una fuente hay que cambiar el
 * nombre del archivo, no solo su contenido, si el servidor cachea con
 * immutable.
 */

"""
    ruta_css = os.path.join(destino, 'fonts.css')
    open(ruta_css, 'w', encoding='utf-8').write(cabecera + '\n'.join(reglas) + '\n')

    print(f'\n  {antes_total/1024:.0f} KB → {despues_total/1024:.0f} KB en {len(elegidos)} archivos')
    print(f'  hoja escrita en {ruta_css}')
    print('\n  AHORA EN TU HTML:')
    print('    1. borra el <link> de fonts.googleapis.com y los preconnect')
    print('    2. pon:  <link rel="stylesheet" href="assets/fonts.css">')
    print('    3. precarga la fuente del titular (suele ser el elemento LCP):')
    # La del titular: peso 700 y subconjunto latin, que es el que baja de
    # verdad en un sitio en español.
    archivos = os.listdir(carpeta)
    principal = sorted(archivos, key=lambda n: ('latin-ext' in n, '700' not in n, n))[:1]
    if principal:
        print(f'       <link rel="preload" href="assets/fonts/{principal[0]}"')
        print('             as="font" type="font/woff2" crossorigin>')
    return 0


if __name__ == '__main__':
    sys.exit(main())
