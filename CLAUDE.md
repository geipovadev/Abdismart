# CLAUDE.md — Workspace Abdi

## Qué es este proyecto

Espacio de trabajo para diseñar y lanzar **Abdi**, una plataforma self-service con IA que crea webs y landing pages profesionales para pequeños negocios de Latinoamérica en 48 horas. El operador es un solopreneur apoyado en IA. El modelo es setup fee único + suscripción mensual.

---

## Estructura del workspace

```
Abdi/
├── Contexto/          # Fuente de verdad del proyecto. Leer antes de generar cualquier output.
│   ├── Abdi - Contexto Completo.txt      # Producto, modelo, personas, roadmap, KPIs, stack
│   └── Abdi - Tono de Comunicacion.txt   # Voz de marca, reglas de estilo, tono por persona y canal
└── Resultado/         # Outputs finales organizados por tipo de entregable
    ├── Landing/       # Landing page y componentes web
    └── CRM/           # Sistema CRM y flujos de cliente
```

---

## Reglas de trabajo

1. **Leer contexto antes de generar.** Antes de cualquier output, revisar los archivos en `Contexto/` relevantes para la tarea. No generar material de marca sin conocer el producto, las personas y el tono.

2. **No inventar detalles.** Si falta información concreta (precio, copy específico, flujo técnico), trabajar con lo disponible. No rellenar con elementos arbitrarios ni promesas que no están en el contexto.

3. **Respetar el tono de marca.** Abdi tiene una voz definida y estricta. Aplicar las reglas del archivo de tono sin excepción. Ver sección "Tono" más abajo.

4. **Contexto y resultado separados.** Los archivos en `Contexto/` son referencia, no se modifican. Los outputs van en `Resultado/` en la subcarpeta que corresponda.

5. **Claro, práctico, natural, profesional.** Sin textos inflados, promesas exageradas ni frases genéricas. Si suena a plantilla, se reescribe.

---

## Resumen del producto

**Propuesta de valor:** Webs profesionales en 48 horas para pequeños negocios de LATAM. Todo incluido: dominio, hosting, SEO básico, soporte en español por WhatsApp, editor self-service e integraciones locales (Mercado Pago, WhatsApp Business, CFDI).

**Diferencial clave:** SLA 48h cumplido (nadie más en LATAM lo garantiza), IA + revisión humana obligatoria (no es automatización pura), soporte en español, integraciones nativas LATAM.

**Modelo:** Setup fee (USD 499–1.899 según plan) + suscripción mensual (USD 39–149). El setup paga la adquisición; la mensualidad construye MRR.

**Mercado:** Pequeños negocios en México (primero), Colombia, Argentina. Verticales prioritarios: restaurantes, consultorios médicos/estéticos, bufetes legales, retail local, servicios (fitness, belleza, educación).

**Stack técnico:** Framer o Webflow (builder), Claude Sonnet (IA principal), Supabase (DB/auth), n8n (automatización), Cloudflare (hosting/DNS), Stripe + Mercado Pago (pagos), WhatsApp Business API (soporte), Cal.com (agenda), Postmark (email).

---

## Tres personas objetivo

### María Gutiérrez — Restaurante (primario)
- Dueña-operadora, técnica baja, vive en WhatsApp e Instagram.
- Busca: tranquilidad. Alguien que se encargue, sin complicaciones.
- Trigger: competidor con mejor web, recomendación de conocido.
- Registro: tuteo cálido, directo, sin tecnicismos. "De negocio a negocio."
- Frase ancla: *"Tú cocinas. Nosotros te ponemos online."*
- Sí: "listo", "sin rollos", "te entregamos", "en 48h", "por WhatsApp".
- No: "optimización", "funnel", "CTR", "SaaS", "dashboard".

### Dr. Andrés Morales — Consultorio (secundario)
- Médico general, técnica media, alta aversión al riesgo.
- Busca: autoridad. Verse serio, no moderno a la fuerza. Privacidad protegida.
- Registro: formal pero no acartonado. Vocabulario preciso. "Usted" en primer contacto.
- Frase ancla: *"La web que inspira la misma confianza que usted en persona."*
- Sí: "profesionalismo", "confianza", "privacidad", "agenda", "sobrio".
- No: "disruptivo", "viral", "trendy", "cool".

### Valeria Ríos — Bufete legal (premium)
- Socia fundadora, técnica media-alta, sensible al prestigio.
- Busca: prestigio. Web a la altura de los honorarios. Proceso que respeta confidencialidad.
- Registro: editorial, casi de revista. "Ustedes" o "tú" según confianza establecida.
- Frase ancla: *"La presencia digital que su firma merece."*
- Sí: "firma", "socios", "trayectoria", "editorial", "sobriedad", "expertise".
- **NUNCA con Valeria:** mencionar "48 horas" (suena barato) ni "IA" ni "plantilla". Se vende "calidad editorial + entrega en 2 semanas".

---

## Tono de marca (reglas de aplicación inmediata)

**La voz es:** directa, técnica-ligera, cálida pero no cursi, segura, respetuosa.  
**La voz no es:** corporativa rancia, startup gringa traducida, influencer hypey, tech-geek, infantil con emojis.

**Reglas inamovibles:**
- El cliente es el héroe, nunca la IA. ✅ "Tu restaurante, online en 48 horas." ❌ "Nuestra IA generativa crea tu web."
- Números concretos, no adjetivos vacíos. "48h" > "rápido". "USD 499" > "accesible".
- Frases cortas. Una idea por frase. Si ocupa más de dos líneas, se parte.
- Sin jerga tech hacia el cliente: nada de "leverage", "stack", "pipeline", "KPI", "SaaS", "deliverable", "feedback".
- Sin emojis en voz de marca. En WhatsApp de soporte: uno solo, funcional (✅, 📎, 📅).
- Mayúsculas tipo oración, nunca tipo título inglés. "Webs listas en 48 horas", no "Webs Listas En 48 Horas".
- Exclamaciones: un signo, nunca doble o triple. Suspensivos: nunca.

**Vocabulario oficial:**
- Decimos "web" o "página web", no "sitio web".
- Decimos "48 horas", no "rápidamente".
- Decimos "mensualidad", no "membresía".
- Decimos "cliente", no "usuario" ni "user".
- Decimos "plantilla", no "template".
- Decimos "soporte", no "atención al cliente".

**Checklist antes de publicar cualquier pieza:**
- ¿Frase más larga < 25 palabras?
- ¿Hay al menos un número concreto?
- ¿El cliente es protagonista (no "nosotros" ni "IA")?
- ¿Se puede quitar alguna palabra sin perder sentido?
- ¿Hay jerga tech incomprensible para el cliente?
- ¿Tono coincide con la persona objetivo?
- ¿CTA es una sola acción clara?
- ¿Ningún "!!!", "..." ni emoji decorativo?
- ¿Lo leería un amigo sin que suene falso?

---

## Identidad visual (Sistema "Monolito")

**Paleta:**
- Onyx `#0A0B0D` — fondo principal dark
- Graphite `#1C1F27` — fondo elevado / cards
- Lime `#C6FF3D` — acento neón principal, CTAs, highlights
- Fog `#A6ABB8` — texto secundario
- Bone `#F4F5F7` — texto principal sobre oscuro

**Tipografía:**
- Display: Clash Display 500 (títulos, letterspace -0.02)
- Serif acento: Instrument Serif italic
- UI / cuerpo: General Sans 400/500
- Mono: JetBrains Mono (datos, flavor técnico)

**Estética:** Gradientes radiales sutiles verde lima sobre negro, grids técnicos decorativos, mucho espacio negativo, tipografía grande y contundente. Referencia: Linear, Framer, Vercel — aplicado a LATAM.

---

## KPIs de referencia

| Métrica | Objetivo |
|---|---|
| SLA 48h cumplido | > 95% |
| Churn mensual | < 4% |
| CAC blended | < USD 140 |
| LTV / CAC | > 4x |
| ARPU mensual | USD 62 |
| NPS post-entrega | > 50 |
| Payback período | < 3 meses |
| Break-even solopreneur | 22 clientes activos |

---

## Roadmap resumido (12 meses)

- **Semanas 1–3:** Branding, entidad legal, landing con waitlist, stack técnico.
- **Semanas 4–8:** MVP — briefing IA, 3 plantillas base (restaurante, clínica, retail), pagos, 10 clientes piloto.
- **Semanas 9–16:** Go-to-Market — contenido orgánico, partnerships, sistema referidos. Meta: 25 clientes · USD 2K MRR.
- **Mes 5–8:** Tracción — 5 verticales, primer hire, canal afiliados. Meta: 120 clientes · USD 10K MRR.
- **Mes 9–12:** Escala — white label, expansión regional, add-ons. Meta: 400 clientes · USD 40K MRR.

---

## Outputs esperados por carpeta

**`Resultado/Landing/`**
- HTML, componentes, copy, wireframes o documentación de la landing page de Abdi.
- Aplicar siempre el sistema "Monolito" y las reglas de tono.

**`Resultado/CRM/`**
- Flujos de cliente, configuración de herramientas, plantillas de comunicación o documentación del sistema CRM.
- Las 7 plantillas de WhatsApp/email del documento de tono son punto de partida para este módulo.
