/* Medición: lo único que queda en el navegador.
 *
 * Sustituye a Google Tag Manager y a gtag.js —294 KiB de JavaScript de Google
 * que se ejecutaban antes del primer pintado—. Este archivo manda un aviso al
 * Worker del propio dominio y el Worker habla con Meta y con Google servidor a
 * servidor. Ver src/medicion.js.
 *
 * EL PÍXEL DE META SÍ ESTÁ, PERO NO AL CARGAR. Hace falta para las campañas:
 * la Conversions API sola empareja peor, porque le faltan las señales que el
 * píxel recoge del navegador. El problema es que cargarlo de entrada cuesta 12
 * puntos de Lighthouse en móvil —105 KiB desde otro dominio y la evaluación de
 * scripts pasa de 43 a 282 ms—.
 *
 * Así que arranca a la primera señal de interés: un toque, una tecla, un
 * scroll. El razonamiento es que quien convierte necesariamente interactúa
 * antes —nadie llena un formulario sin tocar la pantalla—, así que la calidad
 * de emparejamiento se conserva justo donde importa. Y quien se va sin tocar
 * nada igual queda medido, porque el Worker ya mandó su PageView por CAPI.
 * Medido: 81 puntos con el píxel diferido, 81 sin píxel, 69 con el píxel al
 * cargar.
 *
 * Si algún día hace falta el píxel desde el primer momento —por ejemplo para
 * públicos de remarketing más completos—, basta llamar a `cargarPixel()` sin
 * esperar la interacción. Cuesta esos 12 puntos.
 *
 * LOS DOS CAMINOS COMPARTEN EL event_id. El píxel manda el evento y el Worker
 * manda el mismo, con el mismo id, y Meta descarta el duplicado. Sin eso cada
 * conversión se contaría dos veces y las campañas se leerían el doble de
 * buenas de lo que son.
 *
 * Nada sale mientras no haya consentimiento, y el píxel ni siquiera se
 * descarga sin permiso de publicidad.
 */
(function (global) {
  'use strict';

  // Ruta relativa: el Worker sirve la landing y la API en el mismo dominio,
  // así que no hay DNS ni TLS extra ni preflight de CORS.
  var ENDPOINT = '/api/medicion';
  var PIXEL_ID = '2728168144250754';

  var pendientes = [];
  var consentimiento = null;   // null = la persona todavía no respondió
  var pixelPedido = false;
  var interactuado = false;
  // El id de la vista de página. Lo comparten el aviso al Worker y el píxel,
  // que la manda cuando arranca; así Meta descarta el duplicado.
  var idVista = '';

  function nuevoId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'abdi-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* ── El píxel ─────────────────────────────────────────────── */

  function cargarPixel() {
    if (pixelPedido) return;
    if (!consentimiento || consentimiento.publicidad !== true) return;
    pixelPedido = true;

    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (global, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    global.fbq('init', PIXEL_ID);

    // La vista de página ya salió por el Worker con este id. El píxel manda la
    // suya con el mismo, y Meta se queda con una sola.
    if (idVista) global.fbq('track', 'PageView', {}, { eventID: idVista });
  }

  // Solo los eventos que Meta reconoce por nombre. Los demás salen únicamente
  // por el Worker; inventar nombres aquí ensucia el panel de Meta con eventos
  // que después no se pueden borrar.
  var NOMBRE_META = {
    vista: 'PageView',
    lead: 'Lead',
    contacto: 'Contact',
    ver_servicio: 'ViewContent',
    registro: 'CompleteRegistration',
    agenda: 'Schedule'
  };

  function alPixel(evento, datos, id) {
    if (typeof global.fbq !== 'function') return;
    var nombre = NOMBRE_META[evento];
    if (!nombre) return;
    try { global.fbq('track', nombre, datos || {}, { eventID: id }); } catch (e) {}
  }

  /* ── El aviso al Worker ───────────────────────────────────── */

  function enviar(evento, datos, persona, id) {
    if (!consentimiento || (!consentimiento.medicion && !consentimiento.publicidad)) return;

    datos = datos || {};
    persona = persona || {};

    var cuerpo = {
      evento: evento,
      event_id: id,
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

    // El píxel solo si ya está cargado. La vista de página no se manda aquí:
    // la dispara cargarPixel() cuando arranca, con el id que ya se usó.
    if (consentimiento.publicidad && evento !== 'vista') alPixel(evento, datos, id);
  }

  // Antes de que la persona responda al banner no se manda nada, pero tampoco
  // se pierde: la vista de página queda en cola y sale en cuanto acepte.
  function track(evento, datos, persona) {
    var id = nuevoId();
    if (evento === 'vista') idVista = id;
    if (consentimiento === null) {
      if (pendientes.length < 10) pendientes.push([evento, datos, persona, id]);
      return id;
    }
    enviar(evento, datos, persona, id);
    return id;
  }

  function setConsent(medicion, publicidad) {
    consentimiento = { medicion: medicion === true, publicidad: publicidad === true };
    var cola = pendientes;
    pendientes = [];
    for (var i = 0; i < cola.length; i++) enviar(cola[i][0], cola[i][1], cola[i][2], cola[i][3]);
    // Si la persona ya había interactuado antes de aceptar —lo normal, porque
    // aceptar es un clic—, el píxel arranca aquí.
    if (interactuado) cargarPixel();
  }

  global.AbdiMedicion = { track: track, setConsent: setConsent, cargarPixel: cargarPixel };

  /* ── Arranque ─────────────────────────────────────────────── */

  // La vista de página se encola de inmediato, antes de saber si hay permiso.
  track('vista');

  // cookies.js puede haber corrido antes que este archivo —el orden entre los
  // dos no está garantizado— y en ese caso dejó la respuesta esperando aquí.
  var pendiente = global.__abdiConsentPendiente;
  if (pendiente && typeof pendiente === 'object') {
    setConsent(pendiente.medicion, pendiente.publicidad);
  }

  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
    addEventListener(ev, function () {
      interactuado = true;
      cargarPixel();
    }, { once: true, passive: true });
  });
})(window);
