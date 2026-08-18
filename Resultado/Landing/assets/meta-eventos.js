/* Eventos de conversión hacia Meta, por los dos caminos a la vez.
 *
 * El píxel del navegador se pierde con bloqueadores, con Safari y con quien
 * rechace cookies. Por eso el mismo evento sale también desde el Worker, que
 * no depende del navegador. Los dos llevan el MISMO id: Meta descarta el
 * duplicado y se queda con el que llegue.
 *
 * Uso:
 *   AbdiMeta.track('Lead', { content_name: 'diagnostico' }, { name, email, phone });
 *
 * Este archivo lo comparten las nueve páginas. Antes cada una tenía su copia
 * de la llamada al píxel, y eso ya había producido diferencias entre ellas.
 */
(function (global) {
  'use strict';

  var WORKER = 'https://abdismart.geiner-porras-mb.workers.dev';

  // Arranca en falso y solo lo levanta el aviso de cookies. Si este archivo
  // carga antes que cookies.js, la decisión ya tomada queda esperando en
  // __abdiConsentPendiente y se recoge aquí.
  var consent = global.__abdiConsentPendiente === true;

  function setConsent(valor) { consent = valor === true; }

  // Un id por evento, compartido entre el píxel y el servidor. Si los dos
  // caminos mandaran ids distintos, cada conversión se contaría dos veces y
  // las campañas se leerían el doble de buenas de lo que son.
  function nuevoId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'abdi-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Las pone el propio píxel de Meta. Mejoran mucho el emparejamiento, y sin
  // ellas el evento del servidor depende solo de la IP y del correo.
  function cookie(nombre) {
    var hit = document.cookie.split('; ').find(function (c) { return c.indexOf(nombre + '=') === 0; });
    return hit ? hit.slice(nombre.length + 1) : '';
  }

  function track(evento, datos, persona) {
    var id = nuevoId();
    datos = datos || {};
    persona = persona || {};

    // Camino 1 · el navegador. Solo si el píxel llegó a cargar.
    if (typeof global.fbq === 'function' && consent) {
      try { global.fbq('track', evento, datos, { eventID: id }); } catch (e) {}
    }

    // Camino 2 · el servidor. Sale siempre que haya consentimiento; el
    // Worker vuelve a comprobarlo antes de reenviarlo a Meta.
    if (!consent) return id;

    var cuerpo = {
      consent: true,
      event_name: evento,
      event_id: id,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc'),
      custom_data: datos,
      name: persona.name || '',
      email: persona.email || '',
      phone: persona.phone || '',
      city: persona.city || ''
    };

    // `keepalive` para que el envío sobreviva a la navegación: muchos de
    // estos eventos ocurren justo antes de cambiar de página.
    try {
      fetch(WORKER + '/api/meta/conversion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}

    return id;
  }

  global.AbdiMeta = { track: track, setConsent: setConsent };
})(window);
