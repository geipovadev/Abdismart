// Envío de la ruta al correo de quien terminó el diagnóstico.
//
// Lo dispara el mismo clic de «Ver mi ruta»: el navegador pide el análisis y
// el Worker, al resolverlo, manda el correo en segundo plano. Se hace aquí y
// no en el navegador por dos razones. El destinatario sale de la fila que ya
// está en Supabase, nunca del cuerpo de la petición, así que el endpoint no
// sirve para mandarle correo a un tercero. Y el correo sale con el análisis
// ya redactado, que es lo que hace que valga la pena guardarlo.

const RESEND_URL = 'https://api.resend.com/emails';
const REMITENTE_POR_DEFECTO = 'Abdismart <hola@abdismart.com>';
const CAL_URL = 'https://cal.com/geiner-porras-aj8irz/abdismart';
const WHATSAPP_URL = 'https://wa.me/50689814520';

// `finish()` guarda la fila y pide el análisis sin esperar a que el guardado
// termine. En el camino rápido —sin OpenAI— la respuesta vuelve antes que el
// PATCH, así que se reintenta la lectura en vez de dar la fila por vacía.
const ESPERAS_MS = [0, 1200, 2500];

const COLOR = { verde: '#c6ff3d', amarillo: '#ffbc57', rojo: '#ff6b6b' };
const ETIQUETA_NIVEL = {
  verde: 'Base sólida',
  amarillo: 'Atención despareja',
  rojo: 'Se te están yendo consultas'
};

const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,monospace";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function color(nivel) { return COLOR[nivel] || COLOR.amarillo; }

function areaMasDebil(areas) {
  return lista(areas).slice().sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0))[0] || null;
}

function notaMarcador(result, nivel) {
  const peor = areaMasDebil(result?.areas);
  if (!peor || nivel === 'verde') return '';
  return `Lo que más pesa hoy: ${String(peor.name || '').toLowerCase()}, ${Number(peor.score) || 0} de 100.`;
}

function lista(value) { return Array.isArray(value) ? value : []; }

function primerNombre(nombre) {
  const limpio = String(nombre || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>]/g, '')
    .trim();
  const primero = limpio ? limpio.split(/\s+/)[0].slice(0, 40) : '';
  // Sin una sola letra no es un nombre: mejor saludar sin él que saludar mal.
  return /\p{L}/u.test(primero) ? primero : '';
}

// El diagnóstico no pregunta el nombre del negocio, solo su tipo. Sale del
// bloque de preguntas y respuestas, que ya guarda la etiqueta legible.
function tipoDeNegocio(result) {
  const fila = lista(result?.qa).find(item => item?.id === 'business_type');
  const valor = String(fila?.a || '').trim();
  return valor && valor !== 'Sin responder' ? valor : '';
}

// ── Piezas del correo ──────────────────────────────────────────────────
// Todo va en tablas con estilos en línea: es lo único que sobrevive igual
// en Gmail, Outlook y Apple Mail.

function tarjeta(contenido, extra = '') {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#171a20;border:1px solid #262a33;border-radius:14px${extra}"><tr><td style="padding:22px 24px">${contenido}</td></tr></table>`;
}

function seccion(titulo) {
  return `<p style="margin:0 0 10px;font:11px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#a6abb8">${esc(titulo)}</p>`;
}

function filaArea(area, ultima) {
  const tono = color(area.level);
  const margen = ultima ? '' : 'margin-bottom:16px;';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${margen}">
    <tr>
      <td style="font:14px/1.4 ${SANS};color:#f4f5f7;padding-bottom:7px">${esc(area.name)}</td>
      <td align="right" style="font:12px/1.4 ${MONO};color:${tono};padding-bottom:7px">${Number(area.score) || 0}</td>
    </tr>
    <tr><td colspan="2">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="height:5px;background:#262a33;border-radius:4px">
        <tr><td width="${Math.max(2, Math.min(100, Number(area.score) || 0))}%" style="background:${tono};font-size:0;line-height:5px;border-radius:4px">&nbsp;</td><td style="font-size:0;line-height:5px">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>`;
}

function bloqueFuga(leak, nota) {
  const borde = leak.impact === 'alto' ? COLOR.rojo : COLOR.amarillo;
  const evidencia = lista(leak.evidence)
    .map(item => `<p style="margin:0 0 5px;font:12.5px/1.5 ${MONO};color:#a6abb8">— ${esc(item)}</p>`)
    .join('');
  const cierre = nota
    ? `<p style="margin:7px 0 0;font:14.5px/1.6 ${SANS};color:#f4f5f7">${esc(nota)}</p>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#171a20;border:1px solid #262a33;border-left:3px solid ${borde};border-radius:12px;margin-bottom:10px">
    <tr><td style="padding:19px 22px">
      <p style="margin:0 0 9px;font:600 16px/1.4 ${SANS};color:#f4f5f7">${esc(leak.title)}</p>
      ${evidencia}${cierre}
    </td></tr>
  </table>`;
}

function bloquePaso(paso, nota, indice, ultimo) {
  const detalle = nota || paso.how || paso.desc || '';
  const margen = ultimo ? '' : 'margin-bottom:18px;';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${margen}">
    <tr>
      <td width="30" valign="top" style="width:30px;font:600 13px/1.5 ${MONO};color:#c6ff3d">${String(indice + 1).padStart(2, '0')}</td>
      <td valign="top">
        <p style="margin:0 0 5px;font:600 15.5px/1.45 ${SANS};color:#f4f5f7">${esc(paso.title)}</p>
        ${detalle ? `<p style="margin:0;font:14.5px/1.6 ${SANS};color:#a6abb8">${esc(detalle)}</p>` : ''}
      </td>
    </tr>
  </table>`;
}

// ── El correo ──────────────────────────────────────────────────────────

export function construirCorreo(fila, analisis) {
  const result = fila?.result || {};
  const nombre = primerNombre(fila?.lead_name);
  const negocio = tipoDeNegocio(result);
  const marcador = Number(result.overall_score) || 0;
  const nivel = COLOR[result.overall_level] ? result.overall_level : 'amarillo';
  const tono = color(nivel);

  const frases = lista(analisis?.analysis).filter(Boolean);
  const parrafos = frases.length
    ? frases.map((frase, i) => `<p style="margin:0 0 ${i === frases.length - 1 ? '0' : '9px'};font:15px/1.6 ${SANS};color:${i === 0 ? '#f4f5f7' : '#a6abb8'}">${esc(frase)}</p>`).join('')
    : `<p style="margin:0;font:15px/1.6 ${SANS};color:#f4f5f7">${esc(result.summary || 'Esta es la foto de tu operación digital hoy.')}</p>`;

  const areas = lista(result.areas);
  const leaks = lista(result.leaks);
  const notasFuga = lista(analisis?.leak_notes);
  const pasos = lista(result.plans?.arranque).length ? lista(result.plans.arranque) : lista(result.roadmap);
  const notasPaso = lista(analisis?.step_notes);

  const bridge = String(analisis?.bridge || '').trim()
    || 'Si quieres, revisamos juntos esta ruta en una llamada de 30 minutos y decides qué conviene primero.';

  const nota = notaMarcador(result, nivel);
  const saludo = nombre ? `${esc(nombre)}, esta es tu ruta.` : 'Esta es tu ruta.';
  const bajada = [negocio, 'Lo que sigue sale de tus propias respuestas. Guárdalo, es tuyo.']
    .filter(Boolean).join('. ');

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${saludo}</title>
<style>
  @media only screen and (max-width:620px){
    .wrap{width:100%!important}
    .pad{padding-left:22px!important;padding-right:22px!important}
    .big{font-size:40px!important}
    .h1{font-size:26px!important}
    .stack{display:block!important;width:100%!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0b0d;color:#f4f5f7;-webkit-font-smoothing:antialiased">
<div style="display:none;font-size:1px;color:#0a0b0d;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Tu marcador es ${marcador} de 100. Adentro están las fugas que más te cuestan consultas y los primeros pasos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0b0d">
<tr><td align="center" style="padding:28px 12px 44px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">

  <tr><td class="pad" style="padding:0 34px 26px">
    <img src="https://abdismart.com/assets/logo-abdismart-dark.png" width="132" alt="Abdismart" style="display:block;border:0;height:auto;width:132px">
  </td></tr>

  <tr><td class="pad" style="padding:0 34px 24px">
    <p style="margin:0 0 10px;font:11px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#c6ff3d">Tu diagnóstico</p>
    <h1 class="h1" style="margin:0 0 12px;font:600 30px/1.15 ${SANS};letter-spacing:-.02em;color:#f4f5f7">${saludo}</h1>
    <p style="margin:0;font:15px/1.6 ${SANS};color:#a6abb8">${esc(bajada)}</p>
  </td></tr>

  <tr><td class="pad" style="padding:0 34px 16px">
    ${tarjeta(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" width="150" valign="top" style="width:150px;padding-bottom:6px">
        <p class="big" style="margin:0;font:600 52px/1 ${SANS};color:${tono};letter-spacing:-.03em">${marcador}</p>
        <p style="margin:4px 0 0;font:11px/1 ${MONO};color:#a6abb8">DE 100</p>
      </td>
      <td class="stack" valign="top">
        <p style="margin:0 0 8px;font:11px/1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${tono}">${esc(ETIQUETA_NIVEL[nivel])}</p>
        ${nota ? `<p style="margin:0 0 9px;font:600 15px/1.6 ${SANS};color:#f4f5f7">${esc(nota)}</p>` : ''}
        ${parrafos}
      </td>
    </tr></table>`)}
  </td></tr>

  ${areas.length ? `<tr><td class="pad" style="padding:18px 34px 6px">${seccion('Área por área')}</td></tr>
  <tr><td class="pad" style="padding:0 34px 16px">
    ${tarjeta(areas.map((area, i) => filaArea(area, i === areas.length - 1)).join(''))}
  </td></tr>` : ''}

  ${leaks.length ? `<tr><td class="pad" style="padding:18px 34px 6px">${seccion('Dónde se te van las consultas')}</td></tr>
  <tr><td class="pad" style="padding:0 34px 6px">
    ${leaks.map((leak, i) => bloqueFuga(leak, notasFuga[i])).join('')}
  </td></tr>` : ''}

  ${pasos.length ? `<tr><td class="pad" style="padding:18px 34px 6px">${seccion('Por dónde empezar')}</td></tr>
  <tr><td class="pad" style="padding:0 34px 16px">
    ${tarjeta(pasos.map((paso, i) => bloquePaso(paso, notasPaso[i], i, i === pasos.length - 1)).join(''))}
  </td></tr>` : ''}

  <tr><td class="pad" style="padding:18px 34px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#12160f;border:1px solid rgba(198,255,61,.24);border-radius:14px">
      <tr><td style="padding:24px 24px 26px" align="center">
        <p style="margin:0 0 8px;font:11px/1 ${MONO};letter-spacing:.12em;text-transform:uppercase;color:#c6ff3d">Lo que más te conviene ahora</p>
        <p style="margin:0 0 10px;font:600 21px/1.3 ${SANS};color:#f4f5f7">${esc(result.package?.label || 'Tu siguiente paso')}</p>
        <p style="margin:0 0 20px;font:14.5px/1.6 ${SANS};color:#a6abb8">${esc(bridge)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
          <tr><td align="center" bgcolor="#c6ff3d" style="border-radius:10px">
            <a href="${CAL_URL}" style="display:inline-block;padding:14px 30px;font:600 15px/1 ${SANS};color:#0a0b0d;text-decoration:none;border-radius:10px">Agendar la llamada</a>
          </td></tr>
        </table>
        <p style="margin:14px 0 0;font:11px/1.5 ${MONO};letter-spacing:.06em;color:#c6ff3d">Programa fundador · Solo 7 lugares. Tu tarifa de fundador no aumenta.</p>
        <p style="margin:10px 0 0;font:13.5px/1.5 ${SANS};color:#a6abb8">¿Prefieres escribir? <a href="${WHATSAPP_URL}" style="color:#a6abb8">Contáctanos por WhatsApp</a></p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="pad" style="padding:30px 34px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border-top:1px solid #262a33;padding-top:20px">
        <p style="margin:0 0 7px;font:13px/1.6 ${SANS};color:#a6abb8">Recibes esto porque pediste tu diagnóstico en abdismart.com. Tus respuestas no se comparten con nadie más.</p>
        <p style="margin:0;font:13px/1.6 ${SANS};color:#a6abb8">Abdismart · Grupo Abdi S.R.L. · Costa Rica · <a href="mailto:hola@abdismart.com" style="color:#a6abb8">hola@abdismart.com</a></p>
      </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  // Texto plano de verdad, no el HTML pelado: hay clientes que solo muestran
  // esta parte, y en filtros de spam un correo sin ella pesa peor.
  const texto = [
    saludo.replace(/<[^>]+>/g, ''),
    bajada,
    '',
    `Tu marcador: ${marcador} de 100 — ${ETIQUETA_NIVEL[nivel]}`,
    nota,
    frases.length ? frases.join(' ') : (result.summary || ''),
    '',
    areas.length ? 'ÁREA POR ÁREA' : '',
    ...areas.map(area => `- ${area.name}: ${area.score}`),
    '',
    leaks.length ? 'DÓNDE SE TE VAN LAS CONSULTAS' : '',
    ...leaks.map((leak, i) => [
      `- ${leak.title}`,
      ...lista(leak.evidence).map(item => `    ${item}`),
      notasFuga[i] ? `    ${notasFuga[i]}` : ''
    ].filter(Boolean).join('\n')),
    '',
    pasos.length ? 'POR DÓNDE EMPEZAR' : '',
    ...pasos.map((paso, i) => `${i + 1}. ${paso.title}${notasPaso[i] || paso.how || paso.desc ? ' — ' + (notasPaso[i] || paso.how || paso.desc) : ''}`),
    '',
    result.package?.label ? `Lo que más te conviene ahora: ${result.package.label}` : '',
    bridge,
    'Programa fundador · Solo 7 lugares. Tu tarifa de fundador no aumenta.',
    `Agendar la llamada: ${CAL_URL}`,
    `WhatsApp: ${WHATSAPP_URL}`,
    '',
    'Recibes esto porque pediste tu diagnóstico en abdismart.com.',
    'Abdismart · Grupo Abdi S.R.L. · Costa Rica · hola@abdismart.com'
  ].filter(linea => linea !== null && linea !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');

  return {
    subject: nombre ? `${nombre}, esta es tu ruta` : 'Esta es tu ruta',
    html,
    text: texto
  };
}

// ── Envío ──────────────────────────────────────────────────────────────

// Mismo helper que en preview.js y diagnostico.js: cada módulo lleva el suyo
// para no depender de la carga de otro.
async function supabaseRequest(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
}

const dormir = ms => (ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve());

async function leerSesion(env, sessionId) {
  const campos = 'id,lead_name,lead_email,result,ai_analysis,ruta_email_enviada_at';
  const response = await supabaseRequest(env, `diagnostic_sessions?id=eq.${sessionId}&select=${campos}`);
  if (!response?.ok) return null;
  const filas = await response.json();
  return Array.isArray(filas) && filas.length ? filas[0] : null;
}

// El PATCH condicional es el candado: si otra ejecución ya marcó la fila, el
// filtro `is.null` no encuentra nada y esta se retira sin mandar duplicado.
async function reservarEnvio(env, sessionId) {
  const response = await supabaseRequest(
    env,
    `diagnostic_sessions?id=eq.${sessionId}&ruta_email_enviada_at=is.null`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ ruta_email_enviada_at: new Date().toISOString() })
    }
  );
  if (!response?.ok) return false;
  const filas = await response.json();
  return Array.isArray(filas) && filas.length === 1;
}

async function liberarEnvio(env, sessionId) {
  await supabaseRequest(env, `diagnostic_sessions?id=eq.${sessionId}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ ruta_email_enviada_at: null })
  });
}

/**
 * Manda la ruta al correo que la persona dejó en el diagnóstico.
 *
 * Nunca lanza: corre dentro de un waitUntil y su fracaso no puede tocar la
 * respuesta que el navegador ya está esperando. Devuelve el motivo para que
 * quede en los logs y se pueda revisar sin adivinar.
 */
export async function enviarRutaPorCorreo(env, sessionId, analisisReciente) {
  if (!env.RESEND_API_KEY) return { enviado: false, motivo: 'sin_llave' };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { enviado: false, motivo: 'sin_supabase' };

  let fila = null;
  for (const espera of ESPERAS_MS) {
    await dormir(espera);
    fila = await leerSesion(env, sessionId);
    // El resultado es lo que se manda; sin él no hay correo que armar.
    if (fila?.lead_email && fila.result && Object.keys(fila.result).length) break;
  }

  if (!fila) return { enviado: false, motivo: 'sin_fila' };
  if (fila.ruta_email_enviada_at) return { enviado: false, motivo: 'ya_enviado' };

  // Dejar el correo es opcional y mucha gente no lo deja: no es un error.
  const destino = String(fila.lead_email || '').trim().toLowerCase();
  if (!destino || !EMAIL_RE.test(destino)) return { enviado: false, motivo: 'sin_correo' };
  if (!fila.result || !Object.keys(fila.result).length) return { enviado: false, motivo: 'sin_resultado' };

  if (!(await reservarEnvio(env, sessionId))) return { enviado: false, motivo: 'ya_enviado' };

  const analisis = analisisReciente || fila.ai_analysis || null;
  const correo = construirCorreo(fila, analisis);

  let response;
  try {
    response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: env.DIAGNOSTICO_EMAIL_FROM || REMITENTE_POR_DEFECTO,
        to: [destino],
        reply_to: 'hola@abdismart.com',
        subject: correo.subject,
        html: correo.html,
        text: correo.text
      })
    });
  } catch (error) {
    await liberarEnvio(env, sessionId);
    console.error(JSON.stringify({ event: 'ruta_email_error', session_id: sessionId, error: String(error?.message || error).slice(0, 200) }));
    return { enviado: false, motivo: 'error_red' };
  }

  if (!response.ok) {
    // Se libera la marca para que un reintento posterior pueda mandarlo.
    await liberarEnvio(env, sessionId);
    const detalle = await response.text().catch(() => '');
    console.error(JSON.stringify({
      event: 'ruta_email_rechazado', session_id: sessionId,
      status: response.status, detalle: detalle.slice(0, 200)
    }));
    return { enviado: false, motivo: 'rechazado' };
  }

  console.log(JSON.stringify({ event: 'ruta_email_enviado', session_id: sessionId }));
  return { enviado: true, motivo: 'ok' };
}
