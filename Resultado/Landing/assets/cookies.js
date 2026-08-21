/* Aviso de cookies.
 *
 * Desde que la medición salió del navegador, este archivo tiene un solo
 * interlocutor: `AbdiMedicion`, en assets/medicion.js. Ya no hay Consent Mode
 * de Google ni `fbq('consent')` que avisar, porque Google Tag Manager, gtag.js
 * y el píxel de Meta ya no cargan.
 *
 * Eso simplifica una cosa que antes era delicada. Con las etiquetas de
 * terceros, el orden importaba: si este archivo llegaba después de Google Tag
 * Manager, el arranque de la visita ya se había medido sin permiso y Consent
 * Mode no podía retroceder. Ahora no hay carrera posible: medicion.js no manda
 * absolutamente nada mientras no haya respuesta —la deja en cola— y el Worker
 * la vuelve a comprobar antes de reenviar a Meta o a Google.
 *
 * Las dos respuestas van por separado hasta el servidor. Aceptar medición y
 * rechazar publicidad es un estado válido: GA4 recibe el evento marcado como
 * `non_personalized_ads` y Meta no recibe nada.
 */
(function (global, doc) {
  'use strict';

  var CLAVE = 'abdi-cookies';
  var VERSION = 1;              // subirlo vuelve a preguntar a todo el mundo
  var MESES_VALIDEZ = 6;        // pasado ese plazo se pregunta de nuevo

  /* ── Estado ─────────────────────────────────────────────────── */

  function leer() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (!guardado || guardado.v !== VERSION) return null;
      var meses = (Date.now() - new Date(guardado.fecha).getTime()) / (30 * 24 * 3600 * 1000);
      return meses > MESES_VALIDEZ ? null : guardado;
    } catch (e) { return null; }
  }

  function escribir(medicion, publicidad) {
    var estado = { v: VERSION, medicion: !!medicion, publicidad: !!publicidad, fecha: new Date().toISOString() };
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) {}
    return estado;
  }

  /* ── Declaración por defecto, antes de que cargue nada ───────── */

  // Ya no hay Consent Mode de Google ni `fbq('consent')` que avisar: Google Tag
  // Manager, gtag.js y el píxel de Meta salieron del navegador y ahora la
  // medición la hace el Worker. El estado por defecto sigue siendo «denegado»,
  // pero se aplica donde importa: AbdiMedicion no manda nada hasta que esta
  // persona responda, y el Worker lo vuelve a comprobar antes de reenviar.
  //
  // El almacenamiento de funcionalidad —modo claro u oscuro, borrador del
  // diagnóstico— no se pregunta: es almacenamiento que la persona pidió al
  // usar el sitio, y no se puede negar sin romperlo.

  var previo = leer();

  // Las dos respuestas viajan por separado hasta el Worker: se puede aceptar
  // medición y rechazar publicidad, y entonces GA4 recibe el evento pero Meta
  // no, y GA4 lo marca como `non_personalized_ads`.
  function aplicar(estado) {
    if (global.AbdiMedicion) {
      global.AbdiMedicion.setConsent(estado.medicion, estado.publicidad);
    } else {
      // medicion.js puede no haber cargado todavía. Se deja la respuesta
      // esperando y él la recoge al arrancar.
      global.__abdiConsentPendiente = { medicion: estado.medicion, publicidad: estado.publicidad };
    }
  }

  if (previo) aplicar(previo);

  /* ── El aviso ───────────────────────────────────────────────── */

  var CSS = [
    '.cc{position:fixed;left:20px;bottom:20px;z-index:9000;width:min(430px,calc(100vw - 40px));',
    'background:var(--graphite,#1C1F27);border:1px solid var(--edge,rgba(255,255,255,.07));border-radius:16px;',
    'padding:22px 22px 20px;box-shadow:0 18px 50px rgba(0,0,0,.45);font-size:14px;line-height:1.55;',
    'color:var(--fog,#A6ABB8)}',
    ':root[data-theme="light"] .cc{box-shadow:0 18px 50px rgba(10,11,13,.14)}',
    '.cc h2{font-size:16px;font-weight:600;color:var(--bone,#F4F5F7);margin:0 0 7px}',
    '.cc p{margin:0 0 16px}',
    '.cc a{color:var(--bone,#F4F5F7);text-decoration:underline;text-underline-offset:2px}',
    '.cc-row{display:flex;gap:9px}',
    '.cc-btn{flex:1;font:inherit;font-size:13.5px;font-weight:500;padding:11px 14px;border-radius:10px;',
    'cursor:pointer;border:1px solid var(--edge,rgba(255,255,255,.07));background:var(--surface-1,rgba(255,255,255,.04));',
    'color:var(--bone,#F4F5F7);transition:border-color .15s,background .15s}',
    '.cc-btn:hover{border-color:var(--lime-border,rgba(198,255,61,.18));background:var(--surface-2,rgba(255,255,255,.06))}',
    '.cc-btn:focus-visible,.cc-sw:focus-visible,.cc-link:focus-visible{outline:2px solid var(--lime,#C6FF3D);outline-offset:2px}',
    '.cc-link{display:block;width:100%;margin-top:11px;padding:4px;font:inherit;font-size:13px;',
    'color:var(--fog,#A6ABB8);background:none;border:0;cursor:pointer;text-align:center;',
    'text-decoration:underline;text-underline-offset:2px}',
    '.cc-link:hover{color:var(--bone,#F4F5F7)}',
    '.cc-cats{display:grid;gap:2px;margin-bottom:16px}',
    '.cc-cat{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--edge,rgba(255,255,255,.07))}',
    '.cc-cat:last-child{border-bottom:1px solid var(--edge,rgba(255,255,255,.07))}',
    '.cc-cat-txt{flex:1}',
    '.cc-cat-txt strong{display:block;font-size:13.5px;font-weight:500;color:var(--bone,#F4F5F7)}',
    '.cc-cat-txt span{font-size:12.5px;line-height:1.45;display:block;margin-top:2px}',
    '.cc-sw{flex:0 0 auto;margin-top:3px;width:38px;height:21px;padding:0;border-radius:99px;',
    'border:1px solid var(--edge,rgba(255,255,255,.07));background:var(--surface-2,rgba(255,255,255,.06));',
    'cursor:pointer;position:relative;transition:background .18s,border-color .18s}',
    '.cc-sw::after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;',
    'background:var(--fog,#A6ABB8);transition:transform .18s,background .18s}',
    '.cc-sw[aria-checked="true"]{background:var(--lime,#C6FF3D);border-color:var(--lime,#C6FF3D)}',
    '.cc-sw[aria-checked="true"]::after{transform:translateX(17px);background:var(--on-accent,#0A0B0D)}',
    ':root[data-theme="light"] .cc-sw[aria-checked="true"]{background:var(--accent,#4F7A00);border-color:var(--accent,#4F7A00)}',
    ':root[data-theme="light"] .cc-sw[aria-checked="true"]::after{background:#fff}',
    '.cc-sw[disabled]{opacity:.5;cursor:default}',
    '@media (max-width:520px){.cc{left:12px;right:12px;bottom:12px;width:auto;padding:19px 18px 17px}.cc-row{flex-direction:column}}',
    '@media (prefers-reduced-motion:reduce){.cc-btn,.cc-sw,.cc-sw::after{transition:none}}'
  ].join('');

  // Los dos botones principales van con el mismo estilo. Si rechazar cuesta
  // más que aceptar, el consentimiento deja de ser libre y no vale.
  var HTML = [
    '<div id="cc-simple">',
    '<h2 id="cc-h">Cookies y medición</h2>',
    '<p>Usamos cookies necesarias para que el sitio funcione, y herramientas de Google y Meta ',
    'para medir cómo van nuestras campañas. Puedes aceptarlas, rechazarlas o elegir cuáles. ',
    'Más detalle en la <a href="privacidad.html">política de privacidad</a>.</p>',
    '<div class="cc-row">',
    '<button class="cc-btn" type="button" data-cc="aceptar">Aceptar todo</button>',
    '<button class="cc-btn" type="button" data-cc="rechazar">Rechazar todo</button>',
    '</div>',
    '<button class="cc-link" type="button" data-cc="elegir">Elegir cuáles</button>',
    '</div>',
    '<div id="cc-detalle" hidden>',
    '<h2>Elige qué permites</h2>',
    '<div class="cc-cats">',
    '<div class="cc-cat"><div class="cc-cat-txt"><strong>Necesarias</strong>',
    '<span>El modo claro u oscuro que elegiste y el borrador del diagnóstico. No salen de tu dispositivo.</span></div>',
    '<button class="cc-sw" type="button" role="switch" aria-checked="true" aria-label="Necesarias, siempre activas" disabled></button></div>',
    '<div class="cc-cat"><div class="cc-cat-txt"><strong>Medición</strong>',
    '<span>Google Analytics. Nos dice qué páginas sirven y cuáles no.</span></div>',
    '<button class="cc-sw" type="button" role="switch" aria-checked="false" aria-label="Medición" data-cc-sw="medicion"></button></div>',
    '<div class="cc-cat"><div class="cc-cat-txt"><strong>Publicidad</strong>',
    '<span>Píxel de Meta. Mide el resultado de nuestros anuncios en Facebook e Instagram.</span></div>',
    '<button class="cc-sw" type="button" role="switch" aria-checked="false" aria-label="Publicidad" data-cc-sw="publicidad"></button></div>',
    '</div>',
    '<div class="cc-row">',
    '<button class="cc-btn" type="button" data-cc="guardar">Guardar</button>',
    '<button class="cc-btn" type="button" data-cc="rechazar">Rechazar todo</button>',
    '</div>',
    '</div>'
  ].join('');

  var aviso = null;

  function montar() {
    if (aviso) { aviso.hidden = false; return; }

    var estilo = doc.createElement('style');
    estilo.textContent = CSS;
    doc.head.appendChild(estilo);

    aviso = doc.createElement('aside');
    aviso.className = 'cc';
    aviso.id = 'cc';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-labelledby', 'cc-h');
    aviso.innerHTML = HTML;
    doc.body.appendChild(aviso);

    aviso.addEventListener('click', function (ev) {
      var sw = ev.target.getAttribute && ev.target.getAttribute('data-cc-sw');
      if (sw) {
        ev.target.setAttribute('aria-checked', ev.target.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
        return;
      }
      var accion = ev.target.getAttribute && ev.target.getAttribute('data-cc');
      if (!accion) return;

      if (accion === 'elegir') {
        doc.getElementById('cc-simple').hidden = true;
        doc.getElementById('cc-detalle').hidden = false;
        return;
      }
      if (accion === 'aceptar')  return decidir(true, true);
      if (accion === 'rechazar') return decidir(false, false);
      if (accion === 'guardar') {
        var marcado = function (nombre) {
          var b = aviso.querySelector('[data-cc-sw="' + nombre + '"]');
          return b && b.getAttribute('aria-checked') === 'true';
        };
        return decidir(marcado('medicion'), marcado('publicidad'));
      }
    });
  }

  function decidir(medicion, publicidad) {
    aplicar(escribir(medicion, publicidad));
    if (aviso) aviso.hidden = true;
  }

  function abrir() {
    montar();
    var simple = doc.getElementById('cc-simple');
    var detalle = doc.getElementById('cc-detalle');
    var guardado = leer();
    if (guardado) {
      // Al reabrirlo desde el pie, se entra directo al detalle con lo que
      // la persona ya había elegido: es lo que viene a cambiar.
      simple.hidden = true;
      detalle.hidden = false;
      aviso.querySelector('[data-cc-sw="medicion"]').setAttribute('aria-checked', String(!!guardado.medicion));
      aviso.querySelector('[data-cc-sw="publicidad"]').setAttribute('aria-checked', String(!!guardado.publicidad));
    } else {
      simple.hidden = false;
      detalle.hidden = true;
    }
  }

  function arrancar() {
    // Enlace «Preferencias de cookies» en cualquier parte de la página.
    doc.addEventListener('click', function (ev) {
      var enlace = ev.target.closest && ev.target.closest('[data-cookies-preferencias]');
      if (enlace) { ev.preventDefault(); abrir(); }
    });
    if (!leer()) abrir();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();

  global.AbdiCookies = { abrir: abrir, estado: leer };
})(window, document);
