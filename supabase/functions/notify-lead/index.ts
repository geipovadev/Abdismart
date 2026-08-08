const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };

function sourceLabel(record: Record<string, unknown>) {
  return record.origen_registro === 'agente_abdi' || record.utm_source === 'agente_web'
    ? 'Agente Abdi'
    : 'Brief del formulario';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: cors });
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('LEAD_NOTIFY_TO');
  const from = Deno.env.get('LEAD_NOTIFY_FROM');
  if (!apiKey || !to || !from) return new Response(JSON.stringify({ error: 'Notificación no configurada' }), { status: 503, headers: cors });

  const payload = await request.json();
  const record = payload.record || payload.new_record || {};
  const source = sourceLabel(record);
  const diagnosis = record.respuestas || {};
  const text = [
    `Fuente: ${source}`,
    `Nombre: ${record.nombre || '—'}`,
    `WhatsApp: ${record.whatsapp || '—'}`,
    `Negocio: ${record.negocio || diagnosis.negocio_nombre || '—'}`,
    source === 'Agente Abdi' ? `Problema: ${diagnosis.problema_detectado || '—'}` : `Ciudad: ${diagnosis.ciudad || '—'}`
  ].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: `Nuevo registro · ${source}`, text })
  });
  if (!response.ok) return new Response(JSON.stringify({ error: 'No se pudo enviar el email' }), { status: 502, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
