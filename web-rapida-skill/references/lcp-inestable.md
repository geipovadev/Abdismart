# Cuando el LCP no baja y el desglose no cuadra

El síntoma más desconcertante del rendimiento web, y uno de los más caros.

## Cómo se reconoce

Lighthouse se contradice consigo mismo:

- **«Desglose de LCP»** dice que el elemento se pinta a los 2,4 s, con nota
  perfecta.
- **La métrica LCP** dice 8,1 s.

Cuando esos dos números no cuadran, no es un fallo del informe. Es que el
candidato a LCP **se está invalidando**.

## Qué significa invalidar

El navegador va eligiendo cuál es el elemento más grande según pinta la página.
Si ese elemento **desaparece del DOM**, descarta el candidato y busca otro. Si
eso pasa una y otra vez, la métrica nunca se asienta y acaba registrando un
valor muy tardío.

## Cómo confirmarlo

El informe resumido no lo muestra. Hay que bajar al trace:

```bash
npx lighthouse https://tusitio.com --save-assets --output=json --output-path=t.json
```

```python
import json
t = json.load(open('t-0.trace.json'))
ev = t['traceEvents']
base = min(e['ts'] for e in ev if e.get('name') == 'navigationStart')
for e in ev:
    n = e.get('name', '')
    if 'LargestContentfulPaint' in n and ('Candidate' in n or 'Invalidate' in n):
        d = (e.get('args') or {}).get('data', {}) or {}
        tipo = 'CANDIDATO' if 'Candidate' in n else 'INVALIDA '
        print(f"{tipo} t={(e['ts']-base)/1000:8.0f} ms  size={d.get('size')}")
```

Un patrón así es el diagnóstico:

```
CANDIDATO t=    1525 ms  size=67461
INVALIDA  t=    1525 ms
CANDIDATO t=    2003 ms  size=67461
INVALIDA  t=    2003 ms
```

Candidato e invalidación en el mismo milisegundo, repetido.

## Las causas habituales

**1. Un titular con palabras que rotan.** Fue el caso real. Cada 2,6 segundos
el script hacía `innerHTML = ''` sobre el `<h1>` y lo reconstruía. Costaba
**20 puntos** y además casi todo el CLS, porque las palabras no medían lo mismo
y la línea se recomponía en cada cambio.

**2. Contenido que llega por JavaScript.** Si el texto del titular lo pinta un
script del final de la página, el navegador registra el candidato con el
contenido viejo y el script se lo quita de debajo. En local no se ve, porque
ahí el script corre antes del primer pintado. **En producción sí.**

**3. Un carrusel o una animación de entrada** que reemplaza el elemento más
grande de la primera pantalla.

**4. `opacity: 0` con una animación retrasada.** Un elemento transparente no
puede ser candidato a LCP. Si el hero arranca invisible esperando un `fadeUp`
con 0,22 s de retraso, no hay nada que medir hasta que la animación arranca.

## Cómo se arregla

**Regla: el elemento más grande de la primera pantalla no se toca después de
pintarse.**

Para el titular rotativo, la solución fue apilar todas las palabras en una
rejilla de una sola celda y cambiar solo dos clases CSS:

```css
.rotating-word { display: inline-grid; }   /* el hueco mide lo que la más larga */
.rot-word      { grid-area: 1 / 1; }       /* todas en la misma celda */
.char-el       { transform: translateY(110%); opacity: 0; transition: …; }
.rot-word.is-in  .char-el { transform: translateY(0);     opacity: 1; }
.rot-word.is-out .char-el { transform: translateY(-110%); opacity: 0; }
```

Tres cosas se arreglan de golpe:

- **el DOM no cambia**, así que no hay invalidación;
- **el hueco mide siempre lo mismo** —lo que la palabra más larga—, así que la
  línea no se recompone y el CLS se va a cero;
- **el escalón por letra es CSS**, no temporizadores. La versión con dos
  `setTimeout` por carácter dejaba la palabra invisible cuando el navegador los
  estrangulaba.

Para el hero que arrancaba en `opacity: 0`: animar **solo la transformación**.
Lo que se mueve está pintado desde el primer fotograma y puede contar como LCP.

```css
@keyframes slideUp { from { transform: translateY(22px); } to { transform: none; } }
```

## La verificación que hay que hacer

Con la pestaña en segundo plano el navegador **congela las transiciones CSS**.
Si el relevo ocurre ahí, la palabra entrante se queda a medio camino —invisible—
y al volver el titular se lee incompleto. Pasa de verdad: basta abrir el sitio
en una pestaña de fondo.

La red de seguridad:

```js
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) recolocarSinTransicion();
});
function cambiar() {
  if (document.hidden) return;   // no relevar mientras nadie mira
  …
}
```

## Y una advertencia sobre el instrumento

Esta causa **solo aparece con un instrumento realista**. Con un servidor local
instantáneo, el script corre antes del primer pintado y no hay nada que
invalidar: el problema se esconde.

Si mides en local y el LCP sale bien pero en producción no, esta es la primera
sospecha.
