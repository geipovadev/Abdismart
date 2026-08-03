// Widget de referencia. Para producción, usa el bundle versionado del producto.
(() => {
  const script = document.currentScript;
  const endpoint = script?.dataset.endpoint || '/api/agent';
  const businessKey = script?.dataset.business || 'clinica-demo';
  const root = document.createElement('section');
  root.className = 'abdi-agent';
  root.innerHTML = '<button class="abdi-launcher" type="button">Hablar con Abdi</button><div class="abdi-panel" hidden><header>Abdi <button type="button" class="abdi-close">×</button></header><div class="abdi-messages"></div><form><input maxlength="600" placeholder="Escribe tu respuesta" required><button>Enviar</button></form></div>';
  document.body.append(root);
  const panel = root.querySelector('.abdi-panel'), messages = root.querySelector('.abdi-messages'), form = root.querySelector('form'), input = form.querySelector('input');
  const history = []; const diagnosis = {}; let turns = 0; let leadShown = false;
  const add = (text, role) => { const item = document.createElement('p'); item.className = role; item.textContent = text; messages.append(item); messages.scrollTop = messages.scrollHeight; };
  root.querySelector('.abdi-launcher').onclick = () => { panel.hidden = false; input.focus(); };
  root.querySelector('.abdi-close').onclick = () => { panel.hidden = true; };
  add('Hola, soy Abdi. Antes de recomendarte algo, quiero entender tu negocio. ¿Cómo te llamas?', 'bot');
  const showLead = () => { if (leadShown) return; leadShown = true; const lead = document.createElement('form'); lead.className = 'abdi-lead'; lead.innerHTML = '<strong>¿Quieres que revisemos tu caso?</strong><input name="nombre" placeholder="Tu nombre" required><input name="whatsapp" placeholder="Tu WhatsApp" inputmode="tel" required><button>Continuar por WhatsApp</button><small role="alert"></small>'; lead.onsubmit = async event => { event.preventDefault(); const button = lead.querySelector('button'), error = lead.querySelector('small'); button.disabled = true; button.textContent = 'Guardando…'; const response = await fetch(`${endpoint}/lead`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre: lead.nombre.value, whatsapp: lead.whatsapp.value, diagnosis, business_key: businessKey }) }); const data = await response.json(); if (!response.ok) { error.textContent = data.error || 'No pudimos guardar tus datos.'; button.disabled = false; button.textContent = 'Continuar por WhatsApp'; return; } lead.replaceChildren(document.createTextNode('Contacto guardado. Abriendo WhatsApp…')); location.href = data.whatsapp_url; }; messages.append(lead); };
  form.onsubmit = async event => { event.preventDefault(); const message = input.value.trim(); if (!message) return; input.value = ''; add(message, 'user'); const response = await fetch(`${endpoint}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history, turn_count: turns, business_key: businessKey }) }); const data = await response.json(); if (!response.ok) return add(data.error || 'No pude responder.', 'bot'); add(data.answer, 'bot'); ['business_type', 'specialty', 'problem_detected', 'impact', 'current_process', 'recommended_service'].forEach(key => { if (data[key]) diagnosis[key] = data[key]; }); history.push({ role: 'user', content: message }, { role: 'assistant', content: data.answer }); turns += 1; if (data.capture_contact) showLead(); };
})();
