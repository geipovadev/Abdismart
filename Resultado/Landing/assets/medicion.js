/* Medición: lo único que queda en el navegador.
 *
 * Sustituye a Google Tag Manager, gtag.js y el píxel de Meta —400 KiB de
 * JavaScript de terceros que se ejecutaban antes del primer pintado—. Este
 * archivo manda un aviso al Worker del propio dominio y el Worker habla con
 * Meta y con Google servidor a servidor. Ver src/medicion.js.
 *
 * Qué se manda: el evento, la URL, el título, el referente y —solo cuando la
 * persona llenó un formulario— sus datos de contacto. Nada más. Los utm_ y el
 * fbclid los lee el servidor de la URL que se le pasa.
 *
 * Qué NO se manda: nada, mientras no haya consentimiento. El aviso lleva la
 * respuesta del banner y el Worker la vuelve a comprobar antes de reenviar.
 *
 * Las cookies de identidad las pone el Worker, no este archivo: van HttpOnly
 * para que ningún script las pueda leer. Por eso el fetch va con
 * `credentials: 'same-origin'`, o no viajarían.
 */
(function (global) {
  'use strict';

  // Ruta relativa: el Worker sirve la landing y la API en el mismo dominio,
  // así que no hay DNS ni TLS extra ni preflight de CORS.
  var ENDPOINT = '/api/medicion';

  var pendientes = [];
  var consentimiento = null;   // null = la persona todavía no respondió

  function enviar(evento, datos, persona) {
    if (!consentimiento || (!consentimiento.medicion && !consentimiento.publicidad)) return;

    datos = datos || {};
    persona = persona || {};

    var cuerpo = {
      evento: evento,
      medicion: consentimiento.medicion === true,
      publicidad: consentimiento.publicidad === true,
      url: location.href,
      titulo: document.title,
      referrer: document.referrer || '',
      datos: datos,
      nombre: persona.name || '',
      email: persona.email || '',
      telefono: persona.phone || '',
      ciudad: persona.city || ''
    };

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
        // Sin esto las cookies HttpOnly del Worker no viajan y cada visita
        // parecería una persona distinta.
        credentials: 'same-origin',
        // Muchos de estos eventos ocurren justo antes de cambiar de página.
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // Antes de que la persona responda al banner no se manda nada, pero tampoco
  // se pierde: la vista de página queda en cola y sale en cuanto acepte.
  function track(evento, datos, persona) {
    if (consentimiento === null) {
      if (pendientes.length < 10) pendientes.push([evento, datos, persona]);
      return;
    }
    enviar(evento, datos, persona);
  }

  function setConsent(medicion, publicidad) {
    consentimiento = { medicion: medicion === true, publicidad: publicidad === true };
    var cola = pendientes;
    pendientes = [];
    for (var i = 0; i < cola.length; i++) enviar(cola[i][0], cola[i][1], cola[i][2]);
  }

  global.AbdiMedicion = { track: track, setConsent: setConsent };

  // La vista de página se encola de inmediato, antes de saber si hay permiso.
  track('vista');

  // cookies.js puede haber corrido antes que este archivo —el orden entre los
  // dos no está garantizado— y en ese caso dejó la respuesta esperando aquí.
  var pendiente = global.__abdiConsentPendiente;
  if (pendiente && typeof pendiente === 'object') {
    setConsent(pendiente.medicion, pendiente.publicidad);
  }
})(window);
