#!/usr/bin/env python3
"""Convierte imágenes a WebP al tamaño en que de verdad se ven.

EL ERROR QUE CORRIGE. Casi siempre las fotos se suben tal como salieron del
banco de imágenes o de la cámara. En un caso real había un PNG de 1,7 MB y
1122x1402 px que se pintaba en un recuadro de 135 px de alto. El navegador
bajaba el archivo entero y encima gastaba CPU decodificándolo, todo para
mostrarlo diez veces más pequeño.

Dos cambios a la vez:
  · el formato. Una foto en PNG pesa varias veces lo que en WebP.
  · el tamaño. Nadie necesita 1400 px para un recuadro de 200.

En ese caso, 3,2 MB pasaron a 51 KB. Es la optimización que más bytes ahorra
por menos esfuerzo.

USO
    python3 convertir-imagenes.py ./public/assets                  # informe, no toca nada
    python3 convertir-imagenes.py ./public/assets --aplicar        # convierte
    python3 convertir-imagenes.py ./public/assets --aplicar --ancho 900

CÓMO SABER EL TAMAÑO REAL. Abre la página, clic derecho sobre la imagen,
Inspeccionar, y mira las dimensiones que muestra el navegador. Multiplica por 2
para pantallas retina. Ese es el ancho que hay que pasar en --ancho.

DESPUÉS DE CONVERTIR hay que cambiar las referencias en el HTML y el CSS. El
script imprime la lista. Y ojo con las que usan las plantillas de correo: ahí
WebP no es fiable, conviene dejar el original.

REQUISITOS
    pip install pillow
"""

import argparse, os, sys

try:
    from PIL import Image
except ImportError:
    print('  falta Pillow. Instálalo con:  pip install pillow', file=sys.stderr)
    sys.exit(1)

EXT = ('.png', '.jpg', '.jpeg')
# Por debajo de esto no compensa: el ahorro es de bytes sueltos y se pierde
# la compatibilidad del original.
MINIMO_BYTES = 20 * 1024


def convertir(origen, ancho_max, calidad, aplicar):
    im = Image.open(origen)
    antes = os.path.getsize(origen)
    w, h = im.size

    destino = os.path.splitext(origen)[0] + '.webp'
    nuevo_tam = im.size
    if ancho_max and w > ancho_max:
        nuevo_tam = (ancho_max, round(h * ancho_max / w))

    if not aplicar:
        return dict(origen=origen, antes=antes, despues=None, de=(w, h), a=nuevo_tam)

    copia = im.copy()
    if nuevo_tam != im.size:
        copia.thumbnail(nuevo_tam, Image.LANCZOS)
    # Las que tienen transparencia se guardan con ella; el resto en RGB, que
    # comprime algo mejor.
    if copia.mode in ('RGBA', 'LA', 'P'):
        copia = copia.convert('RGBA')
    else:
        copia = copia.convert('RGB')
    copia.save(destino, 'WEBP', quality=calidad, method=6)
    return dict(origen=origen, destino=destino, antes=antes,
                despues=os.path.getsize(destino), de=(w, h), a=copia.size)


def main():
    ap = argparse.ArgumentParser(description='Convierte imágenes a WebP al tamaño real de uso.')
    ap.add_argument('carpeta')
    ap.add_argument('--ancho', type=int, default=0,
                    help='ancho máximo en px. 0 = conservar el original (solo cambia el formato)')
    ap.add_argument('--calidad', type=int, default=80, help='calidad WebP, 1-100 (por defecto 80)')
    ap.add_argument('--aplicar', action='store_true', help='sin esto solo informa, no escribe nada')
    args = ap.parse_args()

    candidatas = []
    for raiz, _, ficheros in os.walk(args.carpeta):
        for f in ficheros:
            if f.lower().endswith(EXT):
                ruta = os.path.join(raiz, f)
                if os.path.getsize(ruta) >= MINIMO_BYTES:
                    candidatas.append(ruta)

    if not candidatas:
        print(f'  nada que convertir en {args.carpeta} (se ignoran las de menos de 20 KB)')
        return 0

    if not args.aplicar:
        print(f'\n  {len(candidatas)} imágenes candidatas. Nada se ha modificado.\n')

    total_antes = total_despues = 0
    hechas = []
    for ruta in sorted(candidatas, key=os.path.getsize, reverse=True):
        r = convertir(ruta, args.ancho, args.calidad, args.aplicar)
        total_antes += r['antes']
        nombre = os.path.relpath(ruta, args.carpeta)
        if args.aplicar:
            total_despues += r['despues']
            ahorro = 100 - r['despues'] * 100 / r['antes']
            print(f"  {nombre:44} {r['antes']/1024:7.0f} → {r['despues']/1024:6.0f} KB   "
                  f"{r['de'][0]}x{r['de'][1]} → {r['a'][0]}x{r['a'][1]}   ({ahorro:.0f}% menos)")
            hechas.append((nombre, os.path.basename(r['destino'])))
        else:
            print(f"  {nombre:44} {r['antes']/1024:7.0f} KB   {r['de'][0]}x{r['de'][1]}")

    if args.aplicar:
        print(f'\n  {total_antes/1024/1024:.2f} MB → {total_despues/1024/1024:.2f} MB '
              f'({100-total_despues*100/total_antes:.0f}% menos)')
        print('\n  FALTA CAMBIAR LAS REFERENCIAS en tu HTML y CSS:')
        for viejo, nuevo in hechas:
            print(f'    {os.path.basename(viejo)}  →  {nuevo}')
        print('\n  Los originales NO se borran. Bórralos solo cuando hayas comprobado')
        print('  que nada los usa, incluidas las plantillas de correo, donde WebP falla.')
    else:
        print(f'\n  total actual: {total_antes/1024/1024:.2f} MB')
        print('  añade --aplicar para convertir, y --ancho N para redimensionar')
    return 0


if __name__ == '__main__':
    sys.exit(main())
