#!/usr/bin/env python3
"""Audita el SEO técnico de un sitio estático, sin conectarse a nada.

Revisa lo que un buscador mira primero y lo que más veces se olvida. No inventa
recomendaciones: cada aviso dice qué falta y por qué importa.

USO
    python3 auditar-seo.py ./public
    python3 auditar-seo.py ./public --dominio https://tusitio.com

Sin --dominio no puede comprobar que los canonical apunten al sitio correcto,
que es uno de los errores más caros: un canonical con el dominio de otro
—o con el de una plantilla— le dice a Google que la página buena es otra.
"""

import argparse, glob, json, os, re, sys
from urllib.parse import urlparse

# ── utilidades ────────────────────────────────────────────────────

def sin_ruido(html):
    """Quita script, style y comentarios: lo que queda es lo que se lee."""
    h = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
    h = re.sub(r'<style.*?</style>', ' ', h, flags=re.S | re.I)
    return re.sub(r'<!--.*?-->', ' ', h, flags=re.S)


def texto(t):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t)).strip()


def meta(html, attr, valor):
    m = re.search(rf'<meta\s+{attr}=["\']{re.escape(valor)}["\'][^>]*content=["\']([^"\']*)["\']', html, re.I)
    if m: return m.group(1)
    m = re.search(rf'<meta[^>]*content=["\']([^"\']*)["\'][^>]*{attr}=["\']{re.escape(valor)}["\']', html, re.I)
    return m.group(1) if m else None


class Informe:
    def __init__(self):
        self.errores, self.avisos, self.bien = [], [], []
    def error(self, pagina, que, porque):
        self.errores.append((pagina, que, porque))
    def aviso(self, pagina, que, porque):
        self.avisos.append((pagina, que, porque))
    def ok(self, que):
        self.bien.append(que)


# ── revisiones por página ─────────────────────────────────────────

def revisar_pagina(ruta, html, dominio, inf, titulos, descripciones):
    p = os.path.basename(ruta)
    limpio = sin_ruido(html)

    # <title>
    t = re.search(r'<title>(.*?)</title>', html, re.S | re.I)
    if not t:
        inf.error(p, 'sin <title>', 'es lo primero que muestra Google y lo que más pesa para el clic')
    else:
        tt = texto(t.group(1))
        if len(tt) < 15:
            inf.aviso(p, f'title muy corto ({len(tt)})', 'desaprovecha espacio en el resultado de búsqueda')
        elif len(tt) > 60:
            inf.aviso(p, f'title de {len(tt)} caracteres', 'Google recorta alrededor de los 60 y se pierde el final')
        titulos.setdefault(tt, []).append(p)

    # descripción
    d = meta(html, 'name', 'description')
    if not d:
        inf.error(p, 'sin meta description', 'Google inventa el resumen con texto suelto de la página')
    else:
        if len(d) < 70:
            inf.aviso(p, f'description corta ({len(d)})', 'de 120 a 160 caracteres aprovecha todo el espacio')
        elif len(d) > 165:
            inf.aviso(p, f'description de {len(d)} caracteres', 'se corta a la mitad de una frase')
        descripciones.setdefault(d, []).append(p)

    # un solo h1
    h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', limpio, re.S | re.I)
    vacios = [x for x in h1 if not texto(x)]
    if not h1:
        inf.error(p, 'sin h1', 'es el encabezado que dice de qué trata la página')
    elif len(h1) > 1:
        inf.error(p, f'{len(h1)} etiquetas h1', 'un solo h1 por página: varios diluyen el tema principal')
    if vacios:
        inf.error(p, 'h1 vacío en el HTML',
                  'si lo rellena JavaScript, un rastreador puede ver el encabezado en blanco')

    noindex = (meta(html, 'name', 'robots') or '').lower()
    es_noindex = 'noindex' in noindex

    # canonical
    can = re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']*)["\']', html, re.I)
    if not can:
        (inf.aviso if es_noindex else inf.error)(
            p, 'sin canonical',
            'sin ella, la misma página con y sin barra, con utm_ o en otro dominio se ve como copias distintas')
    else:
        u = can.group(1)
        if not u.startswith('http'):
            inf.error(p, 'canonical relativa', 'tiene que ser una URL absoluta con https y dominio')
        elif 'TUDOMINIO' in u.upper() or 'EXAMPLE.COM' in u.upper():
            inf.error(p, f'canonical de plantilla: {u}', 'apunta a un dominio que no es tuyo')
        elif dominio and urlparse(u).netloc != urlparse(dominio).netloc:
            inf.error(p, f'canonical a otro dominio: {u}', 'le dice a Google que la página buena está en otro sitio')
        if u.endswith('.html'):
            inf.aviso(p, 'canonical termina en .html',
                      'si el servidor sirve URL limpias, esta redirige y desperdicia rastreo')

    # Open Graph
    if not es_noindex:
        if not meta(html, 'property', 'og:image'):
            inf.error(p, 'sin og:image',
                      'al compartir el enlace en WhatsApp o Facebook sale sin imagen y casi nadie lo abre')
        for req in ('og:title', 'og:description', 'og:url'):
            if not meta(html, 'property', req):
                inf.aviso(p, f'sin {req}', 'la tarjeta al compartir queda incompleta')

    # idioma
    if not re.search(r'<html[^>]*\blang=', html, re.I):
        inf.error(p, 'sin lang en <html>', 'los buscadores y los lectores de pantalla no saben en qué idioma está')

    # viewport
    if not meta(html, 'name', 'viewport'):
        inf.error(p, 'sin meta viewport', 'la página no se adapta al móvil y Google la penaliza')

    # imágenes sin alt
    imgs = re.findall(r'<img[^>]*>', limpio, re.I)
    sin_alt = [i for i in imgs if not re.search(r'\balt=', i, re.I)]
    if sin_alt:
        inf.error(p, f'{len(sin_alt)} de {len(imgs)} imágenes sin alt',
                  'sin alt no se entienden con lector de pantalla ni aparecen en Google Imágenes')

    # datos estructurados
    for bloque in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        try:
            json.loads(bloque)
        except json.JSONDecodeError as e:
            inf.error(p, f'JSON-LD inválido: {e}', 'Google lo descarta entero y no da resultados enriquecidos')

    return es_noindex


# ── revisiones del sitio ──────────────────────────────────────────

def revisar_sitio(raiz, paginas, dominio, noindex, inf):
    # robots.txt
    if not os.path.isfile(os.path.join(raiz, 'robots.txt')):
        inf.aviso('sitio', 'sin robots.txt', 'no es obligatorio, pero es donde se declara el sitemap')
    else:
        r = open(os.path.join(raiz, 'robots.txt'), encoding='utf-8').read()
        if 'sitemap:' not in r.lower():
            inf.aviso('robots.txt', 'no declara el sitemap', 'es la forma más simple de que Google lo encuentre')
        if re.search(r'(?im)^\s*disallow:\s*/\s*$', r):
            inf.error('robots.txt', 'hay un "Disallow: /"', 'bloquea el sitio entero: revisa a qué user-agent aplica')

    # sitemap.xml
    sm = os.path.join(raiz, 'sitemap.xml')
    if not os.path.isfile(sm):
        inf.aviso('sitio', 'sin sitemap.xml', 'con pocas páginas Google se apaña, pero acelera el descubrimiento')
    else:
        contenido = open(sm, encoding='utf-8').read()
        if 'sitemaps.org/schemas/sitemap' not in contenido:
            inf.error('sitemap.xml', 'namespace incorrecto',
                      'tiene que ser http://www.sitemaps.org/schemas/sitemap/0.9 o el sitemap no vale')
        locs = re.findall(r'<loc>\s*([^<\s]+)\s*</loc>', contenido)
        if not locs:
            inf.error('sitemap.xml', 'sin ninguna URL', 'está vacío')
        for u in locs:
            nombre = os.path.basename(urlparse(u).path.rstrip('/')) or 'index'
            if f'{nombre}.html' in noindex:
                inf.error('sitemap.xml', f'incluye {u}, que lleva noindex',
                          'le pides a Google que rastree algo que luego le dices que ignore')
            if dominio and urlparse(u).netloc != urlparse(dominio).netloc:
                inf.error('sitemap.xml', f'{u} no es de tu dominio', 'Google ignora el sitemap entero')

    if dominio:
        indexables = [p for p in paginas if os.path.basename(p) not in noindex]
        if os.path.isfile(sm):
            locs = re.findall(r'<loc>\s*([^<\s]+)\s*</loc>', open(sm, encoding='utf-8').read())
            rutas = {urlparse(u).path.rstrip('/') or '/' for u in locs}
            for p in indexables:
                n = os.path.basename(p)
                esperada = '/' if n == 'index.html' else '/' + n[:-5]
                if esperada not in rutas:
                    inf.aviso('sitemap.xml', f'no incluye {n}', 'esa página tarda más en ser descubierta')


def main():
    ap = argparse.ArgumentParser(description='Audita el SEO técnico de un sitio estático.')
    ap.add_argument('carpeta')
    ap.add_argument('--dominio', help='https://tusitio.com — permite validar canonical y sitemap')
    args = ap.parse_args()

    raiz = os.path.abspath(args.carpeta)
    paginas = sorted(glob.glob(os.path.join(raiz, '*.html')))
    if not paginas:
        print(f'  no hay .html en {raiz}', file=sys.stderr)
        return 1

    inf = Informe()
    titulos, descripciones, noindex = {}, {}, set()

    for ruta in paginas:
        html = open(ruta, encoding='utf-8', errors='replace').read()
        if revisar_pagina(ruta, html, args.dominio, inf, titulos, descripciones):
            noindex.add(os.path.basename(ruta))

    for t, ps in titulos.items():
        if len(ps) > 1:
            inf.error(', '.join(ps), f'mismo title: "{t[:45]}…"',
                      'Google elige una y descarta las otras como duplicadas')
    for d, ps in descripciones.items():
        if len(ps) > 1:
            inf.aviso(', '.join(ps), 'misma meta description',
                      'cada página debería vender lo suyo')

    revisar_sitio(raiz, paginas, args.dominio, noindex, inf)

    print(f'\n  {len(paginas)} páginas revisadas en {raiz}')
    if noindex:
        print(f'  con noindex (no se les exige SEO): {", ".join(sorted(noindex))}')

    if inf.errores:
        print(f'\n  ── {len(inf.errores)} problemas ──')
        for pagina, que, porque in inf.errores:
            print(f'\n  ✗ {pagina}: {que}')
            print(f'    {porque}')
    if inf.avisos:
        print(f'\n  ── {len(inf.avisos)} mejoras posibles ──')
        for pagina, que, porque in inf.avisos:
            print(f'\n  · {pagina}: {que}')
            print(f'    {porque}')
    if not inf.errores and not inf.avisos:
        print('\n  sin problemas ni mejoras pendientes')

    return 1 if inf.errores else 0


if __name__ == '__main__':
    sys.exit(main())
