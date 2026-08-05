(function () {
  'use strict';

  const STORAGE_KEY = 'abdi_preview_once_v1';
  const DRAFT_KEY = 'abdi_preview_brief_draft_v1';
  const SESSION_KEY = 'abdi_preview_session_v1';
  const goals = {
    whatsapp: ['WhatsApp', 'Recibir consultas directas'],
    cita: ['Citas', 'Facilitar solicitudes de cita'],
    precios: ['Precios', 'Responder consultas comerciales'],
    informacion: ['Información', 'Explicar servicios con claridad']
  };
  const palettes = {
    'clinical-green': ['Clínico natural', 'linear-gradient(135deg,#F6F7F2,#BDEB55)'],
    'calm-blue': ['Azul sereno', 'linear-gradient(135deg,#F4F8FA,#85D4EA)'],
    'warm-sand': ['Arena cálida', 'linear-gradient(135deg,#FBF7F0,#E8B779)']
  };
  const imageLibrary = {
    odontologia: 'assets/odontologa-clinica-robles.png',
    default: 'assets/servicios-recepcion-digital.png'
  };

  function id() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `preview-${Date.now()}-${String(Math.random()).slice(2)}`;
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = id();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  const state = {
    step: 0,
    business_name: '', specialty: '', city: '', services: ['', '', ''],
    goal: '', palette: 'clinical-green', logo: '', preview_id: '', content: null,
    leadAction: 'save'
  };

  function fallbackContent(draft) {
    const cta = { whatsapp: 'Consultar por WhatsApp', cita: 'Solicitar una cita', precios: 'Consultar precios', informacion: 'Conocer los servicios' }[draft.goal] || 'Solicitar información';
    return {
      hero: {
        eyebrow: `${draft.specialty} en ${draft.city}`,
        headline: `${draft.business_name}, atención profesional cerca de ti`,
        description: 'Conoce nuestros servicios, encuentra la información que necesitas y contáctanos de forma sencilla.',
        cta
      },
      services: draft.services.map(service => ({ title: service, description: `Información clara sobre ${service.toLowerCase()} y cómo solicitar el servicio.` })),
      trust_points: ['Información clara', `Atención en ${draft.city}`, 'Contacto directo'],
      faqs: [
        { question: '¿Cómo puedo solicitar información?', answer: 'Usa el botón de contacto para contarnos qué servicio necesitas.' },
        { question: '¿Dónde están ubicados?', answer: `Atendemos en ${draft.city}. Contáctanos para confirmar la ubicación y cómo llegar.` },
        { question: '¿Qué debo preparar?', answer: 'Escríbenos antes de tu visita para recibir los requisitos correspondientes.' }
      ],
      contact: { headline: '¿Necesitas más información?', cta }
    };
  }

  function draft() {
    return {
      session_id: sessionId,
      business_name: state.business_name.trim(), specialty: state.specialty.trim(), city: state.city.trim(),
      services: state.services.map(value => value.trim()), goal: state.goal, palette: state.palette
    };
  }

  function createBuilder() {
    const root = document.createElement('div');
    root.className = 'preview-builder';
    root.id = 'preview-builder';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Imagina tu web con Abdi');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <header class="preview-builder-topbar">
        <div class="preview-builder-brand"><img src="assets/logo-abdismart-dark.png" alt="Abdismart"><span>Imagina tu web</span></div>
        <button class="preview-builder-close" type="button" aria-label="Cerrar constructor">×</button>
      </header>
      <div class="preview-builder-body">
        <section class="preview-builder-form" aria-live="polite">
          <div class="preview-progress">${'<span></span>'.repeat(5)}</div>
          <div id="preview-step"></div>
          <p class="preview-error" id="preview-error" role="alert"></p>
          <div class="preview-actions">
            <button type="button" class="btn-ghost" id="preview-back">← Atrás</button>
            <button type="button" class="btn-primary" id="preview-next">Siguiente →</button>
          </div>
        </section>
        <section class="preview-builder-canvas">
          <div class="preview-canvas-empty" id="preview-empty"><div><strong>Tu página aparecerá aquí.</strong>Completa cinco pasos para verla tomar forma.</div></div>
          <div class="preview-loading" id="preview-loading"><div><div class="preview-loading-orbit"></div><p>Organizando tu información…</p></div></div>
          <div class="preview-result" id="preview-result">
            <div class="preview-result-toolbar">
              <div class="preview-result-label">VISTA PREVIA CREADA PARA <strong id="pv-result-name"></strong></div>
              <div class="preview-device-switch"><button type="button" class="on" data-device="desktop">Escritorio</button><button type="button" data-device="mobile">Móvil</button></div>
            </div>
            <article class="preview-site-frame" id="preview-site-frame" data-palette="clinical-green">
              <nav class="preview-site-nav"><div class="preview-site-brand" id="pv-brand"></div><div class="preview-site-navlinks">Servicios Nosotros Contacto</div></nav>
              <section class="preview-site-hero">
                <div><div class="preview-site-kicker" id="pv-eyebrow" contenteditable="true"></div><h1 class="preview-site-headline" id="pv-headline" contenteditable="true"></h1><p class="preview-site-desc" id="pv-description" contenteditable="true"></p><button class="preview-site-cta" id="pv-hero-cta" type="button"></button></div>
                <div class="preview-site-image" id="pv-image"></div>
              </section>
              <div class="preview-site-trust" id="pv-trust"></div>
              <section class="preview-site-services"><h2 class="preview-site-section-title">Nuestros servicios</h2><div class="preview-site-service-grid" id="pv-services"></div></section>
              <section class="preview-site-faq"><h2 class="preview-site-section-title">Preguntas frecuentes</h2><div id="pv-faqs"></div></section>
              <section class="preview-site-contact"><h3 id="pv-contact-title" contenteditable="true"></h3><button class="preview-site-cta" id="pv-contact-cta" type="button"></button></section>
            </article>
            <div class="preview-edit-controls">
              <select id="preview-local-palette" aria-label="Cambiar paleta"><option value="clinical-green">Clínico natural</option><option value="calm-blue">Azul sereno</option><option value="warm-sand">Arena cálida</option></select>
              <select id="preview-local-cta" aria-label="Cambiar llamado a la acción"><option>Consultar por WhatsApp</option><option>Solicitar una cita</option><option>Consultar precios</option><option>Conocer los servicios</option></select>
              <button type="button" id="preview-edit-back">← Volver a editar</button>
            </div>
            <div class="preview-conversion"><button class="btn-primary" type="button" data-preview-lead="save">Guardar mi propuesta</button><button class="btn-ghost" type="button" data-preview-lead="brief">Continuar con mi página →</button></div>
            <div class="preview-lead-panel" id="preview-lead-panel">
              <div class="preview-lead-grid">
                <input class="preview-field" id="preview-lead-name" placeholder="Tu nombre" autocomplete="name">
                <input class="preview-field" id="preview-lead-whatsapp" placeholder="WhatsApp" type="tel" autocomplete="tel">
                <input class="preview-field" id="preview-lead-email" placeholder="Email, opcional" type="email" autocomplete="email">
                <button class="btn-primary preview-lead-submit" id="preview-lead-submit" type="button">Guardar propuesta →</button>
              </div>
              <p class="preview-error" id="preview-lead-error" role="alert"></p>
            </div>
          </div>
        </section>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  const root = createBuilder();
  const stepHost = root.querySelector('#preview-step');
  const error = root.querySelector('#preview-error');
  const nextButton = root.querySelector('#preview-next');
  const backButton = root.querySelector('#preview-back');
  const loading = root.querySelector('#preview-loading');
  const result = root.querySelector('#preview-result');
  const empty = root.querySelector('#preview-empty');

  function openBuilder() {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('preview-builder-open');
    renderStep();
    sendEvent('preview_started');
  }

  function closeBuilder() {
    root.classList.remove('is-open', 'is-previewing');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('preview-builder-open');
  }

  document.querySelectorAll('[data-open-preview-builder]').forEach(button => button.addEventListener('click', openBuilder));
  root.querySelector('.preview-builder-close').addEventListener('click', closeBuilder);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && root.classList.contains('is-open')) closeBuilder(); });

  function fieldMarkup() {
    if (state.step === 0) return `<div class="preview-step-count">Paso 1 de 5 · Identidad</div><h2 class="preview-step-title">¿Cómo se llama tu negocio?</h2><p class="preview-step-help">Usaremos el nombre exactamente como lo escribas. Puedes añadir tu logo solo para esta vista previa.</p><label class="preview-field-label" for="pv-business">Nombre del negocio</label><input class="preview-field" id="pv-business" maxlength="100" placeholder="Laboratorio San José"><label class="preview-field-label" for="pv-logo" style="margin-top:16px">Logo, opcional</label><input class="preview-field" id="pv-logo" type="file" accept="image/png,image/jpeg,image/webp">`;
    if (state.step === 1) return `<div class="preview-step-count">Paso 2 de 5 · Contexto</div><h2 class="preview-step-title">¿Qué haces y dónde atiendes?</h2><p class="preview-step-help">Esto ayuda a presentar tu negocio con claridad y contexto local.</p><div class="preview-pair"><div><label class="preview-field-label" for="pv-specialty">Especialidad</label><select class="preview-select" id="pv-specialty"><option value="">Elige una opción</option><option>Consultorio médico</option><option>Clínica estética</option><option>Odontología</option><option>Psicología</option><option>Nutrición</option><option>Fisioterapia</option><option>Laboratorio clínico</option></select></div><div><label class="preview-field-label" for="pv-city">Ciudad</label><input class="preview-field" id="pv-city" maxlength="80" placeholder="Heredia"></div></div>`;
    if (state.step === 2) return `<div class="preview-step-count">Paso 3 de 5 · Servicios</div><h2 class="preview-step-title">¿Qué tres servicios quieres destacar?</h2><p class="preview-step-help">No agregaremos servicios que no nos indiques.</p><div class="preview-service-list">${[0,1,2].map(index => `<input class="preview-field pv-service" data-index="${index}" maxlength="80" placeholder="Servicio ${index + 1}">`).join('')}</div>`;
    if (state.step === 3) return `<div class="preview-step-count">Paso 4 de 5 · Objetivo</div><h2 class="preview-step-title">¿Qué quieres que haga el visitante?</h2><p class="preview-step-help">La página organizará todo alrededor de una acción principal.</p><div class="preview-choice-grid">${Object.entries(goals).map(([key,value]) => `<button type="button" class="preview-choice${state.goal === key ? ' is-selected' : ''}" data-goal="${key}">${value[0]}<small>${value[1]}</small></button>`).join('')}</div>`;
    return `<div class="preview-step-count">Paso 5 de 5 · Estilo</div><h2 class="preview-step-title">Elige una dirección visual.</h2><p class="preview-step-help">Podrás cambiarla después sin gastar otra generación.</p><div class="preview-palettes">${Object.entries(palettes).map(([key,value]) => `<button type="button" class="preview-palette${state.palette === key ? ' is-selected' : ''}" data-palette="${key}"><div class="preview-palette-swatch" style="background:${value[1]}"></div><b>${value[0]}</b></button>`).join('')}</div>`;
  }

  function renderStep() {
    stepHost.innerHTML = fieldMarkup();
    error.textContent = '';
    root.querySelectorAll('.preview-progress span').forEach((item,index) => item.classList.toggle('on', index <= state.step));
    backButton.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    nextButton.textContent = state.step === 4 ? 'Imaginar mi web →' : 'Siguiente →';
    if (state.step === 0) {
      stepHost.querySelector('#pv-business').value = state.business_name;
      stepHost.querySelector('#pv-logo').addEventListener('change', readLogo);
    }
    if (state.step === 1) { stepHost.querySelector('#pv-specialty').value = state.specialty; stepHost.querySelector('#pv-city').value = state.city; }
    if (state.step === 2) stepHost.querySelectorAll('.pv-service').forEach(input => { input.value = state.services[Number(input.dataset.index)] || ''; });
    stepHost.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => { state.goal = button.dataset.goal; renderStep(); }));
    stepHost.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => { state.palette = button.dataset.palette; renderStep(); }));
    stepHost.querySelector('input,select,button')?.focus();
  }

  function readLogo(event) {
    const file = event.target.files?.[0];
    if (!file || file.size > 1_500_000) { if (file) error.textContent = 'El logo debe pesar menos de 1,5 MB.'; return; }
    const reader = new FileReader();
    reader.onload = () => { state.logo = String(reader.result || ''); };
    reader.readAsDataURL(file);
  }

  function captureStep() {
    if (state.step === 0) state.business_name = stepHost.querySelector('#pv-business').value.trim();
    if (state.step === 1) { state.specialty = stepHost.querySelector('#pv-specialty').value; state.city = stepHost.querySelector('#pv-city').value.trim(); }
    if (state.step === 2) state.services = Array.from(stepHost.querySelectorAll('.pv-service')).map(input => input.value.trim());
  }

  function validateStep() {
    captureStep();
    if (state.step === 0 && state.business_name.length < 2) return 'Escribe el nombre de tu negocio.';
    if (state.step === 1 && (!state.specialty || state.city.length < 2)) return 'Elige una especialidad y escribe tu ciudad.';
    if (state.step === 2 && (state.services.some(item => item.length < 2) || new Set(state.services.map(item => item.toLowerCase())).size !== 3)) return 'Escribe tres servicios diferentes.';
    if (state.step === 3 && !state.goal) return 'Elige la acción principal de tu página.';
    return '';
  }

  nextButton.addEventListener('click', async () => {
    const message = validateStep();
    if (message) { error.textContent = message; return; }
    if (state.step < 4) { state.step += 1; renderStep(); return; }
    await generate();
  });
  backButton.addEventListener('click', () => { captureStep(); if (state.step > 0) { state.step -= 1; renderStep(); } });

  async function generate() {
    loading.classList.add('is-visible');
    nextButton.disabled = true;
    let payload;
    const cached = localStorage.getItem(STORAGE_KEY);
    try {
      if (cached) {
        const stored = JSON.parse(cached);
        payload = stored.payload || stored;
        if (stored.draft) Object.assign(state, stored.draft);
      }
      else if (location.protocol === 'file:') payload = { preview_id: id(), status: 'fallback', content: fallbackContent(draft()) };
      else {
        const response = await fetch('/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft()) });
        payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No pudimos generar la vista previa.');
      }
      if (!cached) localStorage.setItem(STORAGE_KEY, JSON.stringify({ payload, draft: draft() }));
      state.preview_id = payload.preview_id;
      state.content = payload.content;
      renderPreview();
      sendEvent('preview_generated', { status: payload.status || 'generated' });
    } catch (generationError) {
      state.preview_id = id();
      state.content = fallbackContent(draft());
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ payload: { preview_id: state.preview_id, status: 'fallback', content: state.content }, draft: draft() }));
      renderPreview();
      sendEvent('preview_failed', { reason: String(generationError.message || generationError).slice(0, 100) });
    } finally {
      loading.classList.remove('is-visible');
      nextButton.disabled = false;
    }
  }

  function addText(parent, tag, className, text, editable) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    if (editable) element.contentEditable = 'true';
    parent.appendChild(element);
  }

  function renderPreview() {
    const content = state.content;
    empty.style.display = 'none';
    result.classList.add('is-visible');
    root.classList.add('is-previewing');
    root.querySelector('#pv-result-name').textContent = state.business_name;
    const brand = root.querySelector('#pv-brand');
    brand.replaceChildren();
    if (state.logo) { const logo = document.createElement('img'); logo.src = state.logo; logo.alt = ''; logo.style.cssText = 'max-width:110px;max-height:30px;object-fit:contain'; brand.appendChild(logo); }
    else brand.textContent = state.business_name;
    root.querySelector('#pv-eyebrow').textContent = content.hero.eyebrow;
    root.querySelector('#pv-headline').textContent = content.hero.headline;
    root.querySelector('#pv-description').textContent = content.hero.description;
    root.querySelector('#pv-hero-cta').textContent = content.hero.cta;
    root.querySelector('#pv-contact-title').textContent = content.contact.headline;
    root.querySelector('#pv-contact-cta').textContent = content.contact.cta;
    const specialtyKey = /odont/i.test(state.specialty) ? 'odontologia' : 'default';
    root.querySelector('#pv-image').style.backgroundImage = `linear-gradient(rgba(20,30,28,.05),rgba(20,30,28,.15)),url("${imageLibrary[specialtyKey]}")`;
    const trust = root.querySelector('#pv-trust'); trust.replaceChildren();
    content.trust_points.forEach(text => addText(trust, 'span', '', text, true));
    const services = root.querySelector('#pv-services'); services.replaceChildren();
    content.services.forEach(item => { const card = document.createElement('article'); card.className = 'preview-site-service'; addText(card, 'b', '', item.title, true); addText(card, 'p', '', item.description, true); services.appendChild(card); });
    const faqs = root.querySelector('#pv-faqs'); faqs.replaceChildren();
    content.faqs.forEach(item => { const row = document.createElement('div'); row.className = 'preview-site-faq-item'; addText(row, 'b', '', item.question, true); addText(row, 'p', '', item.answer, true); faqs.appendChild(row); });
    const frame = root.querySelector('#preview-site-frame'); frame.dataset.palette = state.palette;
    root.querySelector('#preview-local-palette').value = state.palette;
    root.querySelector('#preview-local-cta').value = content.hero.cta;
  }

  root.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-device]').forEach(item => item.classList.toggle('on', item === button));
    result.classList.toggle('is-mobile', button.dataset.device === 'mobile');
  }));
  root.querySelector('#preview-local-palette').addEventListener('change', event => { state.palette = event.target.value; root.querySelector('#preview-site-frame').dataset.palette = state.palette; });
  root.querySelector('#preview-local-cta').addEventListener('change', event => { root.querySelector('#pv-hero-cta').textContent = event.target.value; root.querySelector('#pv-contact-cta').textContent = event.target.value; });
  root.querySelector('#preview-edit-back').addEventListener('click', () => { root.classList.remove('is-previewing'); state.step = 4; renderStep(); });
  root.querySelectorAll('#pv-hero-cta,#pv-contact-cta').forEach(button => button.addEventListener('click', () => { root.querySelector('#preview-lead-panel').classList.add('is-visible'); root.querySelector('#preview-lead-name').focus(); }));

  root.querySelectorAll('[data-preview-lead]').forEach(button => button.addEventListener('click', () => {
    state.leadAction = button.dataset.previewLead;
    const panel = root.querySelector('#preview-lead-panel');
    panel.classList.add('is-visible');
    root.querySelector('#preview-lead-submit').textContent = state.leadAction === 'brief' ? 'Guardar y continuar →' : 'Guardar propuesta →';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));

  root.querySelector('#preview-lead-submit').addEventListener('click', saveLead);
  async function saveLead() {
    const name = root.querySelector('#preview-lead-name').value.trim();
    const whatsapp = root.querySelector('#preview-lead-whatsapp').value.trim();
    const email = root.querySelector('#preview-lead-email').value.trim();
    const leadError = root.querySelector('#preview-lead-error');
    if (!name || whatsapp.replace(/\D/g, '').length < 8) { leadError.textContent = 'Escribe tu nombre y un WhatsApp válido.'; return; }
    const button = root.querySelector('#preview-lead-submit');
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      if (location.protocol !== 'file:') {
        const response = await fetch('/api/preview/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre: name, whatsapp, email, preview_id: state.preview_id, action: state.leadAction, draft: draft() }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No pudimos guardar la propuesta.');
      }
      sendEvent(state.leadAction === 'brief' ? 'preview_to_brief' : 'preview_saved');
      if (state.leadAction === 'brief') {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft(), nombre: name, whatsapp, email, preview_id: state.preview_id }));
        location.href = 'empezar.html';
      } else {
        button.textContent = 'Propuesta guardada ✓';
        leadError.textContent = 'Te contactaremos para revisar esta idea contigo.';
      }
    } catch (saveError) {
      button.disabled = false;
      button.textContent = state.leadAction === 'brief' ? 'Guardar y continuar →' : 'Guardar propuesta →';
      leadError.textContent = String(saveError.message || saveError);
    }
  }

  function sendEvent(event, metadata) {
    if (location.protocol === 'file:') return;
    fetch('/api/preview/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, preview_id: state.preview_id || null, session_id: sessionId, metadata: metadata || {} }), keepalive: true }).catch(() => {});
  }
})();
