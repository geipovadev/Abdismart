#!/usr/bin/env python3
"""Mide una web con Lighthouse, pero con un instrumento que no miente.

EL PROBLEMA QUE RESUELVE. Medir una carpeta local con un servidor estático
normal da resultados falsos: en 127.0.0.1 cada archivo llega en un milisegundo,
y el modelo de Lighthouse premia eso. En un caso real medimos 91 puntos en
local y 63 en producción, con los mismos archivos. Con esa diferencia se toman
decisiones equivocadas: dos optimizaciones se descartaron por "no mejorar nada"
cuando el instrumento era el que no las veía.

La diferencia es el viaje de ida y vuelta. Tu servidor real tarda 200-300 ms en
contestar; el local, cero. Y como una página pide veinte o treinta archivos, ese
retraso se multiplica.

Por eso este script sirve la carpeta con un retraso artificial por petición. Con
250 ms reprodujo 63 puntos contra los 67 reales: ya se puede confiar en él.

USO

    python3 medir.py ./public                 # carpeta local, 250 ms de RTT
    python3 medir.py ./public --rtt 300       # otro retraso
    python3 medir.py https://tusitio.com      # directo contra producción
    python3 medir.py ./public --escritorio    # perfil de escritorio
    python3 medir.py ./antes ./despues        # A/B entre dos carpetas

SIEMPRE TRES CORRIDAS. Lighthouse varía entre ejecuciones. Una sola medición no
distingue una mejora de 2 puntos del ruido. Se toma la mediana.

REQUISITOS
    node y npx          (viene con Node.js)
    Google Chrome instalado
La primera vez descarga Lighthouse con npx; puede tardar un minuto.
"""

import argparse, gzip, http.server, json, mimetypes, os, shutil, socket
import socketserver, statistics, subprocess, sys, tempfile, threading, time

COMPRIMIBLE = ('.html', '.css', '.js', '.json', '.svg', '.txt', '.xml')

METRICAS = [
    ('first-contentful-paint',  'FCP',         's'),
    ('largest-contentful-paint','LCP',         's'),
    ('total-blocking-time',     'TBT',         'ms'),
    ('cumulative-layout-shift', 'CLS',         ''),
    ('speed-index',             'Speed Index', 's'),
]


def puerto_libre():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def cabeceras_de(raiz):
    """Lee _headers si existe. Netlify y Cloudflare lo aplican en producción;
    si no se replica aquí, se mide sin la CSP ni la caché reales y el número
    sale mejor de lo que será."""
    ruta = os.path.join(raiz, '_headers')
    if not os.path.isfile(ruta):
        return {}
    try:
        bloque = open(ruta, encoding='utf-8').read().split('/*', 1)[1].split('\n\n')[0]
    except (IndexError, UnicodeDecodeError):
        return {}
    out = {}
    for linea in bloque.splitlines():
        linea = linea.strip()
        if not linea or ':' not in linea or linea.startswith('#'):
            continue
        k, v = linea.split(':', 1)
        # HSTS rompería el http local: el navegador forzaría https y no habría.
        if k.strip().lower() == 'strict-transport-security':
            continue
        out[k.strip()] = v.strip()
    return out


def servir(raiz, rtt_ms):
    """Sirve la carpeta con gzip, las cabeceras reales y un retraso por
    petición. Devuelve (url_base, funcion_para_apagar)."""
    raiz = os.path.abspath(raiz)
    cab = cabeceras_de(raiz)
    retraso = rtt_ms / 1000.0
    puerto = puerto_libre()

    class H(http.server.SimpleHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def __init__(self, *a, **k):
            super().__init__(*a, directory=raiz, **k)

        def log_message(self, *a):
            pass

        def _cabeceras_comunes(self):
            for k, v in cab.items():
                self.send_header(k, v)

        def do_POST(self):
            # Muchos sitios mandan un aviso de medición al cargar. Se responde
            # como lo haría el servidor real, con su latencia, para que el coste
            # aparezca en la medición.
            time.sleep(retraso)
            self.send_response(202)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', '2')
            self.end_headers()
            self.wfile.write(b'{}')

        def do_GET(self):
            time.sleep(retraso)
            ruta = self.translate_path(self.path.split('?')[0])
            if os.path.isdir(ruta):
                ruta = os.path.join(ruta, 'index.html')
            # URL limpias: /precios sirve precios.html, como hacen Netlify,
            # Cloudflare y Vercel.
            if not os.path.isfile(ruta) and os.path.isfile(ruta + '.html'):
                ruta += '.html'
            if not os.path.isfile(ruta):
                self.send_error(404)
                return

            datos = open(ruta, 'rb').read()
            ext = os.path.splitext(ruta)[1].lower()
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(ruta)[0] or 'application/octet-stream')
            self._cabeceras_comunes()
            if '/assets/' in self.path or '/static/' in self.path:
                self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            if ext in COMPRIMIBLE and 'gzip' in self.headers.get('Accept-Encoding', ''):
                datos = gzip.compress(datos, 6)
                self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)

    class S(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        daemon_threads = True

    srv = S(('127.0.0.1', puerto), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{puerto}', srv.shutdown


def buscar_chrome():
    for c in [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    ]:
        if os.path.exists(c):
            return c
    return shutil.which('google-chrome') or shutil.which('chromium') or ''


def correr_lighthouse(url, escritorio, salida):
    cmd = ['npx', '--yes', 'lighthouse', url,
           '--only-categories=performance,seo,accessibility,best-practices',
           '--output=json', f'--output-path={salida}', '--quiet',
           '--chrome-flags=--headless=new --no-sandbox']
    if escritorio:
        cmd.append('--preset=desktop')
    env = dict(os.environ)
    chrome = buscar_chrome()
    if chrome:
        env['CHROME_PATH'] = chrome
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if not os.path.exists(salida):
        print('  Lighthouse falló:', (r.stderr or r.stdout)[-500:], file=sys.stderr)
        return None
    return json.load(open(salida, encoding='utf-8'))


def medir(url, escritorio, corridas, etiqueta):
    print(f'  midiendo {etiqueta} ({"escritorio" if escritorio else "móvil"}, {corridas} corridas)…',
          flush=True)
    informes = []
    with tempfile.TemporaryDirectory() as tmp:
        for i in range(corridas):
            d = correr_lighthouse(url, escritorio, os.path.join(tmp, f'r{i}.json'))
            if d:
                informes.append(d)
    if not informes:
        return None
    med = lambda f: statistics.median([f(d) for d in informes])
    return {
        'categorias': {c: med(lambda d, c=c: d['categories'][c]['score'] * 100)
                       for c in ('performance', 'seo', 'accessibility', 'best-practices')},
        'metricas': {k: med(lambda d, k=k: d['audits'][k]['numericValue']) for k, _, _ in METRICAS},
        'puntuaciones': [d['categories']['performance']['score'] * 100 for d in informes],
        'informe': informes[0],
    }


def fmt(v, u):
    if u == 's':  return f'{v/1000:.1f} s'
    if u == 'ms': return f'{v:.0f} ms'
    return f'{v:.3f}'


def tabla(resultados):
    nombres = list(resultados)
    anchos = max(18, max(len(n) for n in nombres) + 2)
    cab = 'categoría'.ljust(18) + ''.join(n.rjust(anchos) for n in nombres)
    print('\n  ' + cab)
    print('  ' + '─' * len(cab))
    for c, lab in [('performance', 'Rendimiento'), ('seo', 'SEO'),
                   ('accessibility', 'Accesibilidad'), ('best-practices', 'Prácticas rec.')]:
        fila = lab.ljust(18) + ''.join(f"{resultados[n]['categorias'][c]:.0f}".rjust(anchos) for n in nombres)
        print('  ' + fila)
    print()
    for k, lab, u in METRICAS:
        fila = lab.ljust(18) + ''.join(fmt(resultados[n]['metricas'][k], u).rjust(anchos) for n in nombres)
        print('  ' + fila)
    print()
    for n in nombres:
        p = resultados[n]['puntuaciones']
        print(f"  {n}: corridas {', '.join(f'{x:.0f}' for x in p)}")


def pendientes(informe):
    """Lo que Lighthouse marca como fallo, en una lista corta y accionable."""
    out = []
    for cat in ('seo', 'accessibility', 'best-practices'):
        for ref in informe['categories'][cat]['auditRefs']:
            a = informe['audits'][ref['id']]
            if a.get('score') is not None and a['score'] < 1:
                out.append(f"[{cat}] {a['title']}")
    op = []
    for a in informe['audits'].values():
        det = a.get('details') or {}
        ms = det.get('overallSavingsMs') or 0
        by = det.get('overallSavingsBytes') or 0
        if a.get('score') is not None and a['score'] < 1 and (ms > 100 or by > 20000):
            op.append(f"[rendimiento] {a['title']} — {ms:.0f} ms, {by/1024:.0f} KiB")
    return out, op


def main():
    p = argparse.ArgumentParser(description='Mide una web con un instrumento realista.')
    p.add_argument('objetivo', help='carpeta local o URL')
    p.add_argument('comparar', nargs='?', help='segunda carpeta o URL, para un A/B')
    p.add_argument('--rtt', type=int, default=250, help='retraso por petición en ms (por defecto 250)')
    p.add_argument('--corridas', type=int, default=3, help='cuántas veces medir (por defecto 3)')
    p.add_argument('--escritorio', action='store_true', help='perfil de escritorio en vez de móvil')
    p.add_argument('--pagina', default='/', help='ruta a medir (por defecto /)')
    args = p.parse_args()

    apagar = []
    resultados = {}
    try:
        for objetivo in filter(None, [args.objetivo, args.comparar]):
            if objetivo.startswith('http'):
                url, etiqueta = objetivo, objetivo
            else:
                base, stop = servir(objetivo, args.rtt)
                apagar.append(stop)
                url = base.rstrip('/') + '/' + args.pagina.lstrip('/')
                etiqueta = os.path.basename(os.path.abspath(objetivo))
                print(f'  sirviendo {objetivo} con {args.rtt} ms de retraso por petición')
            r = medir(url, args.escritorio, args.corridas, etiqueta)
            if r:
                resultados[etiqueta] = r

        if not resultados:
            print('  no se pudo medir nada', file=sys.stderr)
            return 1

        tabla(resultados)

        ultimo = list(resultados.values())[-1]
        fallos, oportunidades = pendientes(ultimo['informe'])
        if fallos:
            print('\n  fallos de SEO, accesibilidad y prácticas:')
            for f in fallos[:12]:
                print('   ·', f)
        if oportunidades:
            print('\n  mayores oportunidades de rendimiento:')
            for o in oportunidades[:8]:
                print('   ·', o)
        if not fallos and not oportunidades:
            print('\n  sin fallos ni oportunidades grandes pendientes')
        return 0
    finally:
        for stop in apagar:
            stop()


if __name__ == '__main__':
    sys.exit(main())
